// --- Configuration Files ---
const availableConfigs = [
    { name: "默认配置", file: "config_default.js" },
    { name: "闲聊模式", file: "config1.js" },
    { name: "夜伽模式", file: "config2.js" }
];
const CONFIG_STORAGE_KEY = 'selectedConfigFile';

// --- Global config variable ---
// This will be populated when the selected config file is loaded.
let config = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const aiStatusDiv = document.getElementById('ai-status');
    const aiButtonsDiv = document.getElementById('ai-buttons');
    const sessionSelect = document.getElementById('chat-session-select');
    const configSelect = document.getElementById('config-select'); // Get config selector
    // Image related elements
    const attachImageButton = document.getElementById('attach-image-button');
    const imageInput = document.getElementById('image-input');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const imagePreview = document.getElementById('image-preview');
    const removeImageButton = document.getElementById('remove-image-button');
    // Floating AI Status Window elements
    const floatingAiStatusWindow = document.getElementById('floating-ai-status-window');
    const currentRoundAisContainer = document.getElementById('current-round-ais');

    // Dark Mode elements
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const DARK_MODE_STORAGE_KEY = 'darkModeEnabled';
    // --- Configuration (These will be initialized AFTER config is loaded) ---
    let activeModels = [];
    // let currentAiIndex = 0; // Not used in NatureRandom or ButtonSend as much
    // let aiTurnOrder = []; // Not used in NatureRandom

    // --- State ---
    let allChatData = { sessions: {}, activeSessionId: null }; // Holds all sessions and the active one
    let chatHistory = []; // Represents the history of the *active* session
    let activeSessionId = null; // ID of the currently active session
    let isAiResponding = false;
    let selectedImageBase64 = null; // To store the selected image data

    // --- State for NatureRandom and exclusions ---
    let excludedAiForNextRound = new Set();      // Stores names of AIs user wants to exclude for the *immediate next* round (cleared after use)
    let persistentlyMutedAiNames = new Set();    // Stores names of AIs persistently muted by user
    let aiCurrentlyOptedOut = new Set();         // Stores names of AIs that included [[QuitGroup]] in their *most recent* response. Used to exclude them from the next turn.
    let isAtAllTriggered = false;                // Flag for "@所有人" command

    // --- Constants ---
    const CHAT_DATA_KEY = 'aiGroupChatData';
    const MUTED_AI_KEY = 'persistentlyMutedAiNames'; // Key for localStorage

    // --- Marked.js Configuration ---
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        console.log("marked.js configured.");
    } else {
        console.error("marked.js library not loaded. Markdown rendering will be disabled.");
    }

    // --- Initialization ---
    populateConfigSelect();
    const selectedConfigFile = localStorage.getItem(CONFIG_STORAGE_KEY) || availableConfigs[0].file;
    configSelect.value = selectedConfigFile;
    configSelect.addEventListener('change', handleConfigChange);
    loadConfigAndInitialize(selectedConfigFile);

    // --- Dark Mode Logic ---
    function applyDarkMode(isEnabled) {
        if (isEnabled) {
            document.body.classList.add('night-mode');
        } else {
            document.body.classList.remove('night-mode');
        }
        localStorage.setItem(DARK_MODE_STORAGE_KEY, isEnabled);
    }
    const savedDarkModePreference = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (savedDarkModePreference !== null) {
        applyDarkMode(savedDarkModePreference === 'true');
    } else {
        applyDarkMode(false);
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isEnabled = document.body.classList.contains('night-mode');
            applyDarkMode(!isEnabled);
        });
    } else {
        console.error("Dark mode toggle button not found!");
    }

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    newChatButton.addEventListener('click', createNewSession);
    sessionSelect.addEventListener('change', (e) => switchSession(e.target.value));
    imageInput.addEventListener('change', handleImageSelection);
    removeImageButton.addEventListener('click', removeSelectedImage);
    messageInput.addEventListener('keydown', (e) => {
        const isMobileWidth = window.innerWidth <= 768;
        if (e.key === 'Enter' && !e.shiftKey && !isMobileWidth) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    messageInput.addEventListener('input', adjustTextareaHeight);


    // --- Config Loading and Initialization Functions ---
    function populateConfigSelect() {
        availableConfigs.forEach(cfg => {
            const option = document.createElement('option');
            option.value = cfg.file;
            option.textContent = cfg.name;
            configSelect.appendChild(option);
        });
    }

    function handleConfigChange(event) {
        const newConfigFile = event.target.value;
        localStorage.setItem(CONFIG_STORAGE_KEY, newConfigFile);
        alert(`配置已更改为 ${availableConfigs.find(c => c.file === newConfigFile)?.name || newConfigFile}. 页面将重新加载以应用更改。`);
        location.reload();
    }

    function loadConfigAndInitialize(configFileName) {
        console.log(`Loading config: ${configFileName}`);
        const existingScript = document.querySelector('script[src^="config"]');
        if (existingScript) {
            existingScript.remove();
        }

        const script = document.createElement('script');
        script.src = configFileName;
        script.onload = () => {
            console.log(`Config ${configFileName} loaded successfully.`);
            if (typeof window.loadedConfig === 'object' && window.loadedConfig !== null) {
                config = window.loadedConfig;
                delete window.loadedConfig;
                console.log("Config object assigned successfully.");
                initializeApplication();
            } else {
                console.error(`Config object (window.loadedConfig) not found after loading ${configFileName}.`);
                alert(`错误：配置文件 ${configFileName} 加载成功，但未正确定义配置对象。`);
                if (configFileName !== availableConfigs[0].file) {
                    console.log("Attempting to load default config as fallback.");
                    localStorage.setItem(CONFIG_STORAGE_KEY, availableConfigs[0].file);
                    loadConfigAndInitialize(availableConfigs[0].file);
                } else {
                    alert("错误：无法加载默认配置文件。应用程序无法启动。");
                }
            }
        };
        script.onerror = () => {
            console.error(`Failed to load config file: ${configFileName}`);
            alert(`错误：无法加载配置文件 ${configFileName}。将尝试加载默认配置。`);
            if (configFileName !== availableConfigs[0].file) {
                localStorage.setItem(CONFIG_STORAGE_KEY, availableConfigs[0].file);
                loadConfigAndInitialize(availableConfigs[0].file);
            } else {
                alert("错误：无法加载默认配置文件。应用程序无法启动。");
            }
        };
        document.body.appendChild(script);
    }

    function initializeApplication() {
        console.log("Initializing application with loaded config...");
        activeModels = config.getActiveModels();
        // currentAiIndex = 0; // Reset for modes that use it

        loadAllChatData();
        initializeSessions();
        populateSessionSelect();
        if (activeSessionId) {
            switchSession(activeSessionId);
        } else {
            console.warn("No active session ID found after loading data.");
            if (Object.keys(allChatData.sessions).length === 0) {
                createNewSession();
            }
        }

        updateAiStatus();
        setupAiButtons();
        adjustTextareaHeight();
        loadMutedAiNames(); // Load persistent mute state *before* first window update
        updateFloatingAiWindow(activeModels); // Initialize floating window
        setRandomBackground();
        setBodyBackground();
        console.log("Application initialized.");
    }

    // --- Textarea Height Adjustment ---
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight, 10);
        const newHeight = Math.min(messageInput.scrollHeight, maxHeight);
        messageInput.style.height = `${newHeight}px`;
    }

    // --- Chat Data Management (Sessions, History, Mutes) ---
    function loadAllChatData() {
        const savedData = localStorage.getItem(CHAT_DATA_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && typeof parsedData.sessions === 'object' && parsedData.sessions !== null) {
                    allChatData = parsedData;
                    if (!allChatData.sessions[allChatData.activeSessionId]) {
                        allChatData.activeSessionId = Object.keys(allChatData.sessions)[0] || null;
                    }
                } else {
                    resetChatData();
                }
            } catch (error) {
                console.error("Error parsing chat data:", error);
                resetChatData();
            }
        } else {
            resetChatData();
        }
        activeSessionId = allChatData.activeSessionId;
    }

    function saveAllChatData() {
        try {
            if (activeSessionId && allChatData.sessions[activeSessionId]) {
                allChatData.sessions[activeSessionId].history = chatHistory;
            }
            allChatData.activeSessionId = activeSessionId;
            localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(allChatData));
        } catch (error) {
            console.error("Error saving chat data:", error);
        }
    }

    function loadMutedAiNames() {
        const savedMutedNames = localStorage.getItem(MUTED_AI_KEY);
        if (savedMutedNames) {
            try {
                const namesArray = JSON.parse(savedMutedNames);
                if (Array.isArray(namesArray)) {
                    persistentlyMutedAiNames = new Set(namesArray);
                } else {
                    persistentlyMutedAiNames = new Set();
                }
            } catch (error) {
                console.error("Error parsing muted AI names:", error);
                persistentlyMutedAiNames = new Set();
            }
        } else {
            persistentlyMutedAiNames = new Set();
        }
    }

    function saveMutedAiNames() {
        try {
            localStorage.setItem(MUTED_AI_KEY, JSON.stringify(Array.from(persistentlyMutedAiNames)));
        } catch (error) {
            console.error("Error saving muted AI names:", error);
        }
    }

    function resetChatData() {
        allChatData = { sessions: {}, activeSessionId: null };
        activeSessionId = null;
        chatHistory = [];
    }

    function initializeSessions() {
        if (Object.keys(allChatData.sessions).length === 0) {
            createNewSession(false);
        } else if (!activeSessionId || !allChatData.sessions[activeSessionId]) {
            activeSessionId = Object.keys(allChatData.sessions)[0];
            allChatData.activeSessionId = activeSessionId;
            saveAllChatData();
        }
        activeSessionId = allChatData.activeSessionId;
    }

    function generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    function populateSessionSelect() {
        sessionSelect.innerHTML = '';
        const sessionIds = Object.keys(allChatData.sessions);
        if (sessionIds.length === 0) {
            const option = document.createElement('option');
            option.textContent = "无聊天记录";
            option.disabled = true;
            sessionSelect.appendChild(option);
            return;
        }
        sessionIds.forEach(sessionId => {
            const session = allChatData.sessions[sessionId];
            const option = document.createElement('option');
            option.value = sessionId;
            option.textContent = session.name || `聊天 ${sessionId.substring(8, 12)}`;
            option.selected = sessionId === activeSessionId;
            sessionSelect.appendChild(option);
        });
    }

    function switchSession(sessionId) {
        if (!sessionId || !allChatData.sessions[sessionId]) {
            const firstSessionId = Object.keys(allChatData.sessions)[0];
            if (firstSessionId) sessionId = firstSessionId;
            else { createNewSession(); return; }
        }
        activeSessionId = sessionId;
        chatHistory = [...allChatData.sessions[activeSessionId].history];
        allChatData.activeSessionId = activeSessionId;
        displayChatHistory();
        saveAllChatData();
        sessionSelect.value = activeSessionId;
    }

    function createNewSession(switchToNew = true) {
        const newSessionId = generateSessionId();
        const now = new Date();
        const dateTimeString = now.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/\//g, '-');
        const newSessionName = `聊天 ${dateTimeString}`;

        allChatData.sessions[newSessionId] = { name: newSessionName, history: [] };
        if (switchToNew) {
            activeSessionId = newSessionId;
            chatHistory = [];
            allChatData.activeSessionId = activeSessionId;
            saveAllChatData();
            populateSessionSelect();
            switchSession(newSessionId);
        } else {
            saveAllChatData();
        }
    }

    function saveChatHistory() {
        if (activeSessionId && allChatData.sessions[activeSessionId]) {
            allChatData.sessions[activeSessionId].history = chatHistory;
            saveAllChatData();
        }
    }

    // --- Message Display Functions ---
    function displayChatHistory() {
        chatMessages.innerHTML = '';
        if (Array.isArray(chatHistory)) {
            chatHistory.forEach(msg => {
                const messageContent = msg.content || {};
                appendMessage(msg.name, messageContent, msg.role === 'user');
            });
        } else {
            chatHistory = [];
        }
    }

    function appendMessage(sender, contentData, isUser, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isUser ? 'user-message' : 'ai-message');

        const avatarElement = document.createElement('img');
        avatarElement.classList.add('avatar');
        let avatarSrc = '';
        const imageDir = 'image/';
        const defaultUserAvatar = imageDir + 'default-user.png';
        const defaultAiAvatar = imageDir + 'default-ai.png';

        if (isUser) {
            avatarSrc = config?.UserAvatar ? imageDir + config.UserAvatar : defaultUserAvatar;
        } else {
            const aiModel = config?.models?.find(model => model.Name === sender);
            avatarSrc = aiModel?.Avatar ? imageDir + aiModel.Avatar : defaultAiAvatar;
        }
        avatarElement.src = avatarSrc;
        avatarElement.alt = `${sender} 头像`;
        avatarElement.onerror = () => { avatarElement.src = isUser ? defaultUserAvatar : defaultAiAvatar; };

        const messageContentElement = document.createElement('div');
        messageContentElement.classList.add('message-content');
        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        senderElement.textContent = sender;
        messageContentElement.appendChild(senderElement);

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('content-wrapper');
        const textContent = (typeof contentData === 'string') ? contentData : contentData.text;
        const imageBase64 = (typeof contentData === 'object' && contentData.image) ? contentData.image : null;

        if (imageBase64) {
            const imgElement = document.createElement('img');
            imgElement.src = imageBase64;
            imgElement.alt = "用户图片";
            imgElement.style.maxWidth = '200px';
            imgElement.style.maxHeight = '200px';
            imgElement.style.display = 'block';
            imgElement.style.marginTop = '5px';
            imgElement.style.borderRadius = '4px';
            contentWrapper.appendChild(imgElement);
        }

        if (textContent || isLoading) {
            const contentElement = document.createElement('div');
            contentElement.classList.add('content');
            let highlightedText = highlightMentions(textContent || '');
            const preprocessedText = highlightedText.replace(/~~/g, '\\~\\~');
            const dailyNoteRegexSource = "<<<DailyNoteStart>>>[\\s\\S]*?<<<DailyNoteEnd>>>";
            const toolUseRegexSource = "<<<\\[TOOL_REQUEST\\]>>>[\\s\\S]*?<<<\\[END_TOOL_REQUEST\\]>>>";
            const toolNameInnerRegex = /tool_name:「始」([^「」]+)「末」/;
            let finalHtml = '';
            let lastIndex = 0;
            const combinedRegex = new RegExp(`(${dailyNoteRegexSource})|(${toolUseRegexSource})`, 'g');

            preprocessedText.replace(combinedRegex, (match, dailyNoteFullMatch, toolUseFullMatch, index) => {
                const beforeText = preprocessedText.slice(lastIndex, index);
                if (beforeText) finalHtml += (typeof marked !== 'undefined') ? marked.parse(beforeText) : beforeText.replace(/\n/g, '<br>');
                if (dailyNoteFullMatch) {
                    const noteContent = dailyNoteFullMatch.replace('<<<DailyNoteStart>>>', '').replace('<<<DailyNoteEnd>>>', '');
                    const maidMatch = noteContent.match(/Maid:\s*([^\n]*)/);
                    const dateMatch = noteContent.match(/Date:\s*([^\n]*)/);
                    const contentMatch = noteContent.match(/Content:\s*([\s\S]*)/);
                    let formattedContent = (maidMatch && dateMatch && contentMatch) ? `DailyNote: ${maidMatch[1].trim()} - ${dateMatch[1].trim()}<br>${contentMatch[1].trim().replace(/\n/g, '<br>')}` : noteContent.replace(/\n/g, '<br>');
                    finalHtml += `<div class="daily-note-bubble">${formattedContent}</div>`;
                } else if (toolUseFullMatch) {
                    const toolContent = toolUseFullMatch.replace('<<<[TOOL_REQUEST]>>>', '').replace('<<<[END_TOOL_REQUEST]>>>', '');
                    const toolNameMatchResult = toolContent.match(toolNameInnerRegex);
                    let formattedContent = `ToolUse: ${toolNameMatchResult && toolNameMatchResult[1] ? toolNameMatchResult[1].trim() : 'Unknown'}`;
                    finalHtml += `<div class="tool-use-bubble">${formattedContent}</div>`;
                }
                lastIndex = index + match.length;
                return match;
            });
            const afterText = preprocessedText.slice(lastIndex);
            if (afterText) finalHtml += (typeof marked !== 'undefined') ? marked.parse(afterText) : afterText.replace(/\n/g, '<br>');
            if (preprocessedText && !finalHtml.trim() && !combinedRegex.test(preprocessedText)) {
                finalHtml = (typeof marked !== 'undefined') ? marked.parse(preprocessedText) : preprocessedText.replace(/\n/g, '<br>');
            }
            contentElement.innerHTML = finalHtml;

            if (isLoading) {
                const loadingIndicator = document.createElement('span');
                loadingIndicator.classList.add('loading-indicator');
                contentElement.appendChild(loadingIndicator);
                messageElement.dataset.loadingId = sender;
            }
            contentWrapper.appendChild(contentElement);
        }
        messageContentElement.appendChild(contentWrapper);
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(messageContentElement);
        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

    function updateLoadingMessage(sender, textContent, isFinalUpdate = false) {
        const loadingMessage = chatMessages.querySelector(`.message[data-loading-id="${sender}"]`);
        if (loadingMessage) {
            let contentElement = loadingMessage.querySelector('.content-wrapper .content');
            if (!contentElement) {
                const contentWrapper = loadingMessage.querySelector('.content-wrapper');
                if (contentWrapper) {
                    contentElement = document.createElement('div');
                    contentElement.classList.add('content');
                    contentWrapper.appendChild(contentElement);
                } else { return; }
            }

            let highlightedText = highlightMentions(textContent || '');
            const preprocessedText = highlightedText.replace(/~~/g, '\\~\\~');
            const dailyNoteRegexSource = "<<<DailyNoteStart>>>[\\s\\S]*?<<<DailyNoteEnd>>>";
            const toolUseRegexSource = "<<<\\[TOOL_REQUEST\\]>>>[\\s\\S]*?<<<\\[END_TOOL_REQUEST\\]>>>";
            const toolNameInnerRegex = /tool_name:「始」([^「」]+)「末」/;
            let finalHtml = '';
            let lastIndex = 0;
            const combinedRegex = new RegExp(`(${dailyNoteRegexSource})|(${toolUseRegexSource})`, 'g');

            preprocessedText.replace(combinedRegex, (match, dailyNoteFullMatch, toolUseFullMatch, index) => {
                const beforeText = preprocessedText.slice(lastIndex, index);
                if (beforeText) finalHtml += (typeof marked !== 'undefined') ? marked.parse(beforeText) : beforeText.replace(/\n/g, '<br>');
                if (dailyNoteFullMatch) {
                    const noteContent = dailyNoteFullMatch.replace('<<<DailyNoteStart>>>', '').replace('<<<DailyNoteEnd>>>', '');
                    const maidMatch = noteContent.match(/Maid:\s*([^\n]*)/);
                    const dateMatch = noteContent.match(/Date:\s*([^\n]*)/);
                    const contentMatch = noteContent.match(/Content:\s*([\s\S]*)/);
                    let formattedContent = (maidMatch && dateMatch && contentMatch) ? `DailyNote: ${maidMatch[1].trim()} - ${dateMatch[1].trim()}<br>${contentMatch[1].trim().replace(/\n/g, '<br>')}` : noteContent.replace(/\n/g, '<br>');
                    finalHtml += `<div class="daily-note-bubble">${formattedContent}</div>`;
                } else if (toolUseFullMatch) {
                    const toolContent = toolUseFullMatch.replace('<<<[TOOL_REQUEST]>>>', '').replace('<<<[END_TOOL_REQUEST]>>>', '');
                    const toolNameMatchResult = toolContent.match(toolNameInnerRegex);
                    let formattedContent = `ToolUse: ${toolNameMatchResult && toolNameMatchResult[1] ? toolNameMatchResult[1].trim() : 'Unknown'}`;
                    finalHtml += `<div class="tool-use-bubble">${formattedContent}</div>`;
                }
                lastIndex = index + match.length;
                return match;
            });
            const afterText = preprocessedText.slice(lastIndex);
            if (afterText) finalHtml += (typeof marked !== 'undefined') ? marked.parse(afterText) : afterText.replace(/\n/g, '<br>');
            if (preprocessedText && !finalHtml.trim() && !combinedRegex.test(preprocessedText)) {
                 finalHtml = (typeof marked !== 'undefined') ? marked.parse(preprocessedText) : preprocessedText.replace(/\n/g, '<br>');
            }
            contentElement.innerHTML = finalHtml;

            let loadingIndicator = contentElement.querySelector('.loading-indicator');
            if (!isFinalUpdate) {
                if (!loadingIndicator) {
                    loadingIndicator = document.createElement('span');
                    loadingIndicator.classList.add('loading-indicator');
                    contentElement.appendChild(loadingIndicator);
                }
            } else {
                if (loadingIndicator) loadingIndicator.remove();
                delete loadingMessage.dataset.loadingId;
            }
        } else if (isFinalUpdate) {
            appendMessage(sender, { text: textContent }, false);
        }
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateAiStatus() {
        aiStatusDiv.innerHTML = '';
        activeModels.forEach((model, index) => {
            const statusSpan = document.createElement('span');
            statusSpan.textContent = `${index + 1}. ${model.Name}`;
            aiStatusDiv.appendChild(statusSpan);
        });
    }

    function setupAiButtons() {
        aiButtonsDiv.innerHTML = '';
        if (config.AI_CHAT_MODE === 'ButtonSend') {
            activeModels.forEach((model, index) => {
                const button = document.createElement('button');
                button.textContent = `邀请 ${model.Name} 发言`;
                button.dataset.modelIndex = index;
                button.addEventListener('click', () => handleAiButtonSend(index));
                aiButtonsDiv.appendChild(button);
            });
            aiButtonsDiv.style.display = 'flex';
        } else {
            aiButtonsDiv.style.display = 'none';
        }
    }

    // --- Image Handling ---
    function handleImageSelection(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImageBase64 = e.target.result;
                displayImagePreview(selectedImageBase64);
            }
            reader.readAsDataURL(file);
        } else {
            removeSelectedImage();
            if (file) alert("请选择一个图片文件。");
        }
        imageInput.value = null;
    }

    function displayImagePreview(base64Data) {
        imagePreview.src = base64Data;
        imagePreviewArea.style.display = 'block';
    }

    function removeSelectedImage() {
        selectedImageBase64 = null;
        imagePreview.src = '#';
        imagePreviewArea.style.display = 'none';
        imageInput.value = null;
    }

    // --- Message Sending and AI Response Trigger ---
    function handleSendMessage() {
        const messageText = messageInput.value.trim();
        if ((!messageText && !selectedImageBase64) || isAiResponding) return;

        const messageContent = {};
        if (messageText) messageContent.text = messageText;
        if (selectedImageBase64) messageContent.image = selectedImageBase64;

        const userName = config?.User_Name || "User";
        appendMessage(userName, messageContent, true);
        chatHistory.push({ role: 'user', name: userName, content: messageContent });
        saveChatHistory();

        messageInput.value = '';
        removeSelectedImage();
        adjustTextareaHeight();

        if (messageText.includes('@所有人')) {
            console.log("Detected '@所有人' command.");
            isAtAllTriggered = true;
        }
        triggerAiResponse();
    }

    function handleAiButtonSend(modelIndex) {
        if (isAiResponding) return;
        const model = activeModels[modelIndex];
        if (model) {
            isAiResponding = true;
            setUiResponding(true);
            // For ButtonSend, AI opt-out status might need specific handling if it's to be respected.
            // Current NatureRandom's aiCurrentlyOptedOut is separate.
            // Let's assume ButtonSend bypasses the [[QuitGroup]] opt-out for a direct invitation.
            const dummyAiNewlyOptedOutThisTurn = new Set(); // For callAiApi signature
            callAiApi(model, 0, dummyAiNewlyOptedOutThisTurn);
        }
    }

    function setUiResponding(isResponding) {
        if (!config) return;
        messageInput.disabled = isResponding;
        sendButton.disabled = isResponding;
        if (config.AI_CHAT_MODE === 'ButtonSend') {
            aiButtonsDiv.querySelectorAll('button').forEach(button => button.disabled = isResponding);
        }
        sendButton.textContent = isResponding ? "思考中..." : "发送";
    }

    /**
     * Main function to trigger AI responses based on the configured mode.
     * For NatureRandom, it orchestrates speaker selection and calls.
     */
    async function triggerAiResponse() {
        if (!config) {
            console.error("Cannot trigger AI response: Config not loaded yet.");
            return;
        }
        if (isAiResponding && config.AI_CHAT_MODE !== 'ButtonSend') { // Allow ButtonSend to interrupt/overlap if needed, or manage its own isAiResponding
            console.log("AI response cycle already in progress for non-ButtonSend mode.");
            return;
        }

        isAiResponding = true;
        setUiResponding(true);

        let actualSpeakers = [];
        const mode = config.AI_CHAT_MODE;

        // `aiCurrentlyOptedOut` (from previous turn) and `excludedAiForNextRound` (user command for this turn)
        // are used by determineNatureRandomSpeakers or the @所有人 filter.

        if (mode === 'NatureRandom') {
            if (isAtAllTriggered) { // Highest priority: @所有人
                console.log("@所有人 is active: Forcing all non-muted/non-excluded AIs to respond.");
                actualSpeakers = activeModels.filter(model =>
                    !persistentlyMutedAiNames.has(model.Name) &&
                    !excludedAiForNextRound.has(model.Name) &&
                    !aiCurrentlyOptedOut.has(model.Name)
                );
                console.log(`@所有人 speakers: ${actualSpeakers.map(m => m.Name).join(', ')}`);
            } else {
                // Determine speakers based on NatureRandom logic, passing all relevant exclusion sets
                actualSpeakers = determineNatureRandomSpeakers(
                    activeModels,
                    chatHistory,
                    config,
                    persistentlyMutedAiNames,
                    excludedAiForNextRound,
                    aiCurrentlyOptedOut
                );
            }
        } else if (mode === 'ButtonSend') {
            // ButtonSend is handled by its own event handler, no automatic speaker selection here.
            isAiResponding = false; // Reset flags as ButtonSend manages its own flow
            setUiResponding(false);
            updateFloatingAiWindow(activeModels); // Update UI
            return; // Exit early
        }
        // ... (other modes like sequentialQueue, shuffledQueue, randomSubsetQueue would go here) ...
        else {
            console.warn(`AI_CHAT_MODE "${mode}" is not fully implemented for automatic triggering beyond NatureRandom/ButtonSend in this version. Defaulting to no speakers.`);
            actualSpeakers = []; // Fallback for other modes not detailed here
        }


        console.log(`Actual speakers for this round (${mode}): ${actualSpeakers.map(m => m.Name).join(', ')}`);

        // User-defined exclusions were for the current turn's decision. Clear for the next user input.
        excludedAiForNextRound.clear();
        // This set will be populated by AIs that include [[QuitGroup]] in *this* turn's responses.
        const aiNewlyOptedOutThisTurn = new Set();

        updateFloatingAiWindow(activeModels, actualSpeakers); // Update UI based on who will speak

        if (actualSpeakers.length === 0) {
            console.log("No AI speakers selected for this round.");
        } else {
            for (const model of actualSpeakers) { // Iterate in the order determined
                if (model) {
                    console.log(`--- Calling AI: ${model.Name} ---`);
                    await callAiApi(model, 0, aiNewlyOptedOutThisTurn); // Pass the set to be populated
                } else {
                    console.error(`Found invalid model entry in actualSpeakers.`);
                }
            }
        }

        // After all AIs in this round have spoken (or tried to),
        // update `aiCurrentlyOptedOut` for the *next* AI response cycle.
        aiCurrentlyOptedOut = new Set([...aiNewlyOptedOutThisTurn]);

        isAiResponding = false;
        setUiResponding(false);
        isAtAllTriggered = false; // Reset @所有人 flag for the next user message
        updateFloatingAiWindow(activeModels); // Update floating window (e.g., to remove 'speaking' highlights)
    }


    /**
     * NatureRandom mode: Determines speakers based on message content and priorities.
     * This function implements the core logic as per user's specification.
     * @param {Array<Object>} currentActiveModels - All currently active AI models.
     * @param {Array<Object>} currentChatHistory - The current chat history.
     * @param {Object} currentConfig - The global configuration object.
     * @param {Set<string>} currentPersistentlyMutedAiNames - Set of persistently muted AI names.
     * @param {Set<string>} currentExcludedAiForNextRound - Set of AI names excluded by user for this specific turn.
     * @param {Set<string>} currentAiOptedOutLastTurn - Set of AI names that opted out in their previous turn.
     * @returns {Array<Object>} An array of AI model objects that should speak, in order.
     */
    function determineNatureRandomSpeakers(
        currentActiveModels,
        currentChatHistory,
        currentConfig,
        currentPersistentlyMutedAiNames,
        currentExcludedAiForNextRound,
        currentAiOptedOutLastTurn
    ) {
        // 1. Determine truly eligible models for this round's consideration
        const eligibleModels = currentActiveModels.filter(model =>
            !currentPersistentlyMutedAiNames.has(model.Name) &&
            !currentExcludedAiForNextRound.has(model.Name) &&
            !currentAiOptedOutLastTurn.has(model.Name)
        );

        if (eligibleModels.length === 0) {
            console.log("NatureRandom: No eligible models available for consideration.");
            return [];
        }

        let speakers = []; // Final ordered list of speakers
        const spokenThisTurnTracker = new Set(); // Tracks AI names added to 'speakers' to avoid duplicates and respect priorities

        // Get text from the last message (usually user's input, or AI's if it's a continuation that triggers others)
        // Get text from the last round of messages (user input + preceding AI responses in the same turn)
        let roundText = "";
        // Iterate backwards from the last message
        for (let i = currentChatHistory.length - 1; i >= 0; i--) {
            const msg = currentChatHistory[i];
            const msgContentText = (msg.content && msg.content.text) ? msg.content.text : "";

            if (msgContentText) {
                // Prepend message text to roundText. Add a space for separation.
                roundText = msgContentText + (roundText ? " " + roundText : "");
            }

            // Stop if we hit a user message that is NOT the very last message.
            // The very last message is the one that triggered this response cycle, so we include it.
            // Any user message before the last one marks the start of the previous round.
            if (msg.role === 'user' && i < currentChatHistory.length - 1) {
                break;
            }
        }

        // --- Priority: @角色标签 (e.g., @小克) ---
        // "被@的角色...必须发言。并且优先发言！"
        if (roundText) {
            eligibleModels.forEach(model => {
                if (roundText.includes(`@${model.Name}`)) { // Assumes model.Name is the "角色标签"
                    if (!spokenThisTurnTracker.has(model.Name)) {
                        speakers.push(model);
                        spokenThisTurnTracker.add(model.Name);
                    }
                }
            });
        }

        // --- Priority: Pure Text Keyword Mention (from model.Tag) ---
        // "拥有该关键词标签的角色...则必须发言。"
        if (roundText) {
            eligibleModels.forEach(model => {
                if (spokenThisTurnTracker.has(model.Name)) return; // Already added by @mention

                const tags = (model.Tag || "").split(',').map(t => t.trim()).filter(t => t);
                if (tags.some(tag => roundText.includes(tag))) {
                    speakers.push(model);
                    spokenThisTurnTracker.add(model.Name);
                }
            });
        }

        // --- Priority: Random Speaking for un-triggered, eligible AIs ---
        // "对于以上都未被触发...它们将以 1/AI_LIST 的概率随机选择发言。"
        const baseProbabilityCount = currentConfig.AI_LIST > 0 ? currentConfig.AI_LIST : eligibleModels.length;
        const probability = baseProbabilityCount > 0 ? (1 / baseProbabilityCount) : 0;

        if (probability > 0) {
            eligibleModels.forEach(model => {
                if (spokenThisTurnTracker.has(model.Name)) return; // Already chosen by mention or keyword

                if (Math.random() < probability) {
                    speakers.push(model);
                    spokenThisTurnTracker.add(model.Name);
                }
            });
        }

        // --- Priority: Final Fallback (Guaranteed Speaker) ---
        // "如果以上所有逻辑都没有选出任何AI发言，则从所有符合条件...的AI中随机选择一个发言。"
        if (speakers.length === 0 && eligibleModels.length > 0) {
            console.log("NatureRandom: Fallback - No speakers selected by priority logic, selecting one random eligible model.");
            // Select from `eligibleModels` which are already filtered for all conditions.
            const randomIndex = Math.floor(Math.random() * eligibleModels.length);
            const fallbackSpeaker = eligibleModels[randomIndex];
            speakers.push(fallbackSpeaker);
            // spokenThisTurnTracker.add(fallbackSpeaker.Name); // Not strictly necessary as it's the final addition
        }

        // The `speakers` array is built in priority order. Duplicates are prevented by `spokenThisTurnTracker`.
        console.log(`NatureRandom determined speakers: ${speakers.map(m => m.Name).join(', ')}`);
        return speakers;
    }


    /** Highlight @mentions in text content */
    function highlightMentions(text) {
        if (!text || typeof text !== 'string' || !config || !config.models) {
            return text;
        }

        const allIndividualTags = new Set();
        activeModels.forEach(model => { // Use activeModels for highlighting all potential mentions
            if (model.Tag && typeof model.Tag === 'string') {
                model.Tag.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
                    .forEach(tag => allIndividualTags.add(tag));
            }
            // Add model names themselves as potential @mention targets for highlighting
            allIndividualTags.add(model.Name);
        });


        const escapedIndividualTags = Array.from(allIndividualTags).map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Regex to match @所有人 or @<tag/name> ensuring it's a whole word mention
        const mentionRegex = new RegExp(`(@所有人|@(?:${escapedIndividualTags.join('|')}))(?![\\w-])`, 'g');


        return text.replace(mentionRegex, (match) => {
            return `<span class="mention-highlight">${match}</span>`;
        });
    }

    /** Construct prompt and call the AI API (handles multimodal) */
    async function callAiApi(model, retryCount = 0, aiNewlyOptedOutThisTurnRef) { // Added aiNewlyOptedOutThisTurnRef
        if (!config) {
            console.error("Cannot call API: Config not loaded yet.");
            if (config.AI_CHAT_MODE !== 'ButtonSend') { /*isAiResponding = false; setUiResponding(false);*/ } // Managed by triggerAiResponse
            else { isAiResponding = false; setUiResponding(false); }
            return;
        }
        if (!model) {
            console.error("Attempted to call API with an invalid model.");
            if (config.AI_CHAT_MODE !== 'ButtonSend') { /*isAiResponding = false; setUiResponding(false);*/ }
            else { isAiResponding = false; setUiResponding(false); }
            return;
        }

        const retryText = retryCount > 0 ? `(重试 ${retryCount}/2)` : '';
        if (retryCount > 0) {
            updateLoadingMessage(model.Name, `重新连接中${retryText}...`, false);
        } else {
            appendMessage(model.Name, { text: '...' }, false, true);
        }

        const messages = [];
        const currentTime = new Date().toLocaleString('zh-CN');
        const groupPrompt = (config.GroupPrompt || "").replace("{{Date::time}}", currentTime);
        let combinedSystemPrompt = `${config.USER_Prompt || ""}\n${groupPrompt}`;
        if (model.SystemPrompts && model.SystemPrompts.trim()) {
            combinedSystemPrompt += `\n${model.SystemPrompts}`;
        }
        if (combinedSystemPrompt.trim()) {
            messages.push({ role: 'system', content: combinedSystemPrompt });
        }

        chatHistory.forEach(msg => {
            const apiMessage = { role: msg.role === 'user' ? 'user' : 'assistant', name: msg.name };
            const content = msg.content || {};
            const senderName = msg.name || (msg.role === 'user' ? config.User_Name || 'User' : 'AI');
            const senderPrefix = `${senderName}: `;

            if (content.image && model.Image) {
                apiMessage.content = [];
                const textPart = content.text ? senderPrefix + content.text : senderPrefix + "[图片]";
                apiMessage.content.push({ type: "text", text: textPart });
                apiMessage.content.push({ type: "image_url", image_url: { url: content.image } });
            } else if (content.text) {
                apiMessage.content = senderPrefix + content.text;
            } else if (content.image && !model.Image) {
                apiMessage.content = senderPrefix + "[图片]";
            } else { return; } // Skip if no content
            messages.push(apiMessage);
        });

        if (model.InvitePrompts && model.InvitePrompts.trim()) {
            messages.push({ role: 'user', content: model.InvitePrompts });
        }

        if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'system')) {
            updateLoadingMessage(model.Name, "错误：没有有效内容发送给 AI。", true);
            if (config.AI_CHAT_MODE === 'ButtonSend') { isAiResponding = false; setUiResponding(false); }
            return;
        }

        try {
            const requestBody = {
                model: model.Model,
                messages: messages,
                max_tokens: model.Outputtoken || 1500,
                temperature: model.Temperature || 0.7,
                stream: config.StreamingOutput
            };
            if (model.Websearch === true) {
                requestBody.tools = [{ type: "function", function: { name: "google_search", description: "Perform a Google search.", parameters: { type: "object", properties: { query: { type: "string", description: "The search query." } }, required: ["query"] } } }];
                requestBody.tool_choice = "auto";
            }

            const apiUrl = config.API_URl || "";
            if (!apiUrl) {
                updateLoadingMessage(model.Name, "错误：API URL 未在配置中定义。", true);
                return;
            }
            const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.API_Key}` },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(config.API_Timeout * 1000)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                if (retryCount < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await callAiApi(model, retryCount + 1, aiNewlyOptedOutThisTurnRef); // Pass ref
                }
                updateLoadingMessage(model.Name, `错误: ${errorData.message || response.statusText} (已重试${retryCount}次)`, true);
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorData.message || response.statusText} (已重试${retryCount}次)` } });
                saveChatHistory();
                return;
            }

            if (config.StreamingOutput) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedResponse = "";
                let buffer = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    let breakOuterLoop = false;
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataString = line.substring(6).trim();
                            if (dataString === '[DONE]') { buffer = '[DONE]'; breakOuterLoop = true; break; }
                            try {
                                const chunk = JSON.parse(dataString);
                                let choice = chunk.choices && chunk.choices[0];
                                if (choice && choice.delta && choice.delta.content) {
                                    accumulatedResponse += choice.delta.content;
                                    updateLoadingMessage(model.Name, accumulatedResponse + "...", false);
                                }
                                // Handle finish_reason if necessary (e.g., tool_calls)
                            } catch (error) { console.error(`[STREAM ERROR - ${model.Name}] Parsing chunk. Data: "${dataString}". Error:`, error); }
                        }
                    }
                    if (breakOuterLoop || buffer === '[DONE]') break;
                }
                let finalResponseText = accumulatedResponse;
                if (finalResponseText.endsWith('[[QuitGroup]]')) {
                    console.log(`${model.Name} opted out for the next round.`);
                    if (aiNewlyOptedOutThisTurnRef) aiNewlyOptedOutThisTurnRef.add(model.Name); // Populate the passed set
                    finalResponseText = finalResponseText.slice(0, -'[[QuitGroup]]'.length).trim();
                }
                updateLoadingMessage(model.Name, finalResponseText, true);
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: finalResponseText } });
                saveChatHistory();
            } else { // Non-streaming
                const responseData = await response.json();
                let fullContent = responseData.choices?.[0]?.message?.content || "未能获取响应内容";
                if (fullContent.endsWith('[[QuitGroup]]')) {
                    console.log(`${model.Name} opted out for the next round.`);
                    if (aiNewlyOptedOutThisTurnRef) aiNewlyOptedOutThisTurnRef.add(model.Name); // Populate the passed set
                    fullContent = fullContent.slice(0, -'[[QuitGroup]]'.length).trim();
                }
                updateLoadingMessage(model.Name, fullContent, true);
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: fullContent } });
                saveChatHistory();
            }
        } catch (error) {
            if (retryCount < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await callAiApi(model, retryCount + 1, aiNewlyOptedOutThisTurnRef); // Pass ref
            }
            let errorMessage = (error.name === 'TimeoutError') ? "API 请求超时" : (error instanceof TypeError ? "网络错误或无法连接到 API" : "API 请求失败");
            updateLoadingMessage(model.Name, `错误: ${errorMessage} (已重试${retryCount}次)`, true);
            chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorMessage} (已重试${retryCount}次)` } });
            saveChatHistory();
        } finally {
            if (config.AI_CHAT_MODE === 'ButtonSend') {
                isAiResponding = false;
                setUiResponding(false);
            }
        }
    }

    /** Update the floating AI status window */
    function updateFloatingAiWindow(allModels, speakingModels = null) {
        if (!floatingAiStatusWindow || !currentRoundAisContainer) return;
        currentRoundAisContainer.innerHTML = '';
        if (!allModels || allModels.length === 0) {
            floatingAiStatusWindow.style.display = 'none';
            return;
        }
        floatingAiStatusWindow.style.display = 'block';
        const speakingModelNames = speakingModels ? new Set(speakingModels.map(m => m.Name)) : null;

        allModels.forEach(model => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('ai-status-item');
            const img = document.createElement('img');
            const imageDir = 'image/';
            const defaultAiAvatar = imageDir + 'default-ai.png';
            img.src = model.Avatar ? imageDir + model.Avatar : defaultAiAvatar;
            img.alt = model.Name;
            img.onerror = () => { img.src = defaultAiAvatar; };
            if (speakingModelNames && !speakingModelNames.has(model.Name)) {
                img.classList.add('inactive-avatar');
            } else {
                img.classList.remove('inactive-avatar');
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = model.Name;
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';

            const muteBtn = document.createElement('button');
            muteBtn.classList.add('mute-ai-btn');
            muteBtn.textContent = '!';
            muteBtn.dataset.aiName = model.Name;
            if (persistentlyMutedAiNames.has(model.Name)) {
                muteBtn.classList.add('muted');
                muteBtn.title = `点击取消对 ${model.Name} 的持续禁言`;
            } else {
                muteBtn.title = `点击持续禁言 ${model.Name}`;
            }
            muteBtn.addEventListener('click', (e) => {
                const aiNameToMute = e.target.dataset.aiName;
                if (aiNameToMute) {
                    if (persistentlyMutedAiNames.has(aiNameToMute)) {
                        persistentlyMutedAiNames.delete(aiNameToMute);
                        e.target.classList.remove('muted');
                        e.target.title = `点击持续禁言 ${aiNameToMute}`;
                    } else {
                        persistentlyMutedAiNames.add(aiNameToMute);
                        e.target.classList.add('muted');
                        e.target.title = `点击取消对 ${aiNameToMute} 的持续禁言`;
                    }
                    saveMutedAiNames();
                    updateFloatingAiWindow(activeModels, speakingModelNames ? Array.from(speakingModelNames).map(name => allModels.find(m => m.Name === name)).filter(Boolean) : null); // Refresh window to reflect mute state change potentially affecting eligibility display
                }
            });

            const closeBtn = document.createElement('button');
            closeBtn.classList.add('close-ai-btn');
            closeBtn.textContent = 'X';
            closeBtn.dataset.aiName = model.Name;
            // Check against `excludedAiForNextRound` for current visual state
            if (excludedAiForNextRound.has(model.Name)) {
                closeBtn.classList.add('excluded-next-round');
                closeBtn.title = `${model.Name} 已被标记，将在下一轮被跳过`;
            } else {
                closeBtn.classList.remove('excluded-next-round');
                closeBtn.title = `点击标记 ${model.Name} 在下一轮不发言`;
            }
            closeBtn.addEventListener('click', (e) => {
                const aiNameToExclude = e.target.dataset.aiName;
                const button = e.target;
                if (aiNameToExclude) {
                    if (excludedAiForNextRound.has(aiNameToExclude)) {
                        excludedAiForNextRound.delete(aiNameToExclude);
                        button.classList.remove('excluded-next-round');
                        button.title = `点击标记 ${aiNameToExclude} 在下一轮不发言`;
                    } else {
                        excludedAiForNextRound.add(aiNameToExclude);
                        button.classList.add('excluded-next-round');
                        button.title = `${aiNameToExclude} 已被标记，将在下一轮被跳过`;
                    }
                     // No need to save to localStorage, this is a per-round volatile exclusion
                }
            });

            buttonsContainer.appendChild(muteBtn);
            buttonsContainer.appendChild(closeBtn);
            itemDiv.appendChild(img);
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(buttonsContainer);
            currentRoundAisContainer.appendChild(itemDiv);
        });
    }

}); // End DOMContentLoaded


/** Sets a random background image for the chat messages area based on screen width */
function setRandomBackground() {
    const chatMessagesDiv = document.getElementById('chat-messages');
    if (!chatMessagesDiv) return;
    const imageDir = 'image/';
    const phoneImages = ['Phone餐厅.png', 'phone街头.png', 'Phone客厅.png', 'Phone书房.png', 'Phone卧室.png'];
    const winImages = ['Win餐厅.png', 'Win晨间卧室.png', 'Win厨房.png', 'Win书房.png', 'Win浴室.png'];
    let selectedImageList = (window.innerWidth <= 768) ? phoneImages : winImages;
    if (selectedImageList.length > 0) {
        const randomIndex = Math.floor(Math.random() * selectedImageList.length);
        const subDir = (selectedImageList === phoneImages) ? 'Phone/' : 'Win/';
        const imageUrl = imageDir + subDir + selectedImageList[randomIndex];
        chatMessagesDiv.style.backgroundImage = `url('${imageUrl}')`;
    } else {
        chatMessagesDiv.style.backgroundImage = 'none';
    }
}

/** Sets a random background image for the main body */
function setBodyBackground() {
    const imageDir = 'image/Wallpaper/';
    const wallpaperImages = [
        'ComfyUI_134901_177920272026190_00001.png', 'ComfyUI_135039_177581081695754_00003.png',
        'ComfyUI_135246_390494183581112_00005.png', 'ComfyUI_135334_868574652531835_00006.png'
    ];
    if (wallpaperImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * wallpaperImages.length);
        const imageUrl = imageDir + wallpaperImages[randomIndex];
        document.body.style.backgroundImage = `url('${imageUrl}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
    } else {
        document.body.style.backgroundImage = 'none';
    }
}
