// --- Configuration Files ---
const availableConfigs = [
    { name: "默认配置", file: "config_default.js" },
    { name: "闲聊模式", file: "config1.js" },
    { name: "夜伽模式", file: "config2.js" }
];
const CONFIG_STORAGE_KEY = 'selectedConfigFile';

// --- Global config variable ---
let config = null;

// --- Global Regex Definitions (Compile once) ---
const DAILY_NOTE_REGEX_SOURCE = "<<<DailyNoteStart>>>[\\s\\S]*?<<<DailyNoteEnd>>>";
const TOOL_USE_REGEX_SOURCE = "<<<\\[TOOL_REQUEST\\]>>>[\\s\\S]*?<<<\\[END_TOOL_REQUEST\\]>>>";
const COMBINED_SPECIAL_BLOCK_REGEX = new RegExp(`(${DAILY_NOTE_REGEX_SOURCE})|(${TOOL_USE_REGEX_SOURCE})`, 'g');
const TOOL_NAME_INNER_REGEX = /tool_name:「始」([^「」]+)「末」/;

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const aiStatusDiv = document.getElementById('ai-status');
    const aiButtonsDiv = document.getElementById('ai-buttons');
    const sessionSelect = document.getElementById('chat-session-select');
    const configSelect = document.getElementById('config-select');
    const attachImageButton = document.getElementById('attach-image-button');
    const imageInput = document.getElementById('image-input');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const imagePreview = document.getElementById('image-preview');
    const removeImageButton = document.getElementById('remove-image-button');
    const floatingAiStatusWindow = document.getElementById('floating-ai-status-window');
    const currentRoundAisContainer = document.getElementById('current-round-ais');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // --- Constants ---
    const DARK_MODE_STORAGE_KEY = 'darkModeEnabled';
    const CHAT_DATA_KEY = 'aiGroupChatData';
    const MUTED_AI_KEY = 'persistentlyMutedAiNames';

    // --- State ---
    let activeModels = [];
    // let currentAiIndex = 0; // currentAiIndex seems unused, consider removing if not needed
    // let aiTurnOrder = []; // aiTurnOrder seems unused, consider removing if not needed
    let allChatData = { sessions: {}, activeSessionId: null };
    let chatHistory = [];
    let activeSessionId = null;
    let isAiResponding = false;
    let selectedImageBase64 = null;
    let excludedAiForNextRound = new Set();
    let persistentlyMutedAiNames = new Set();
    let aiOptedOutLastRound = new Set();
    let isAtAllTriggered = false;
    

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
        document.body.classList.toggle('night-mode', isEnabled);
        localStorage.setItem(DARK_MODE_STORAGE_KEY, isEnabled);
    }

    const savedDarkModePreference = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    applyDarkMode(savedDarkModePreference === 'true'); // Default to false (light mode) if null

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            applyDarkMode(!document.body.classList.contains('night-mode'));
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


    // --- Functions ---
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
        alert(`配置已更改为 ${availableConfigs.find(c=>c.file === newConfigFile)?.name || newConfigFile}. 页面将重新加载以应用更改。`);
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
        // currentAiIndex = 0; // Reset if used elsewhere, or remove if truly unused
        // aiTurnOrder = []; // Reset if used elsewhere, or remove if truly unused

        loadAllChatData();
        initializeSessions();
        populateSessionSelect();
        if (activeSessionId && allChatData.sessions[activeSessionId]) { // Check session exists
             switchSession(activeSessionId);
        } else if (Object.keys(allChatData.sessions).length > 0) { // If active is invalid, switch to first
            const firstSessionId = Object.keys(allChatData.sessions)[0];
            console.warn(`No valid active session ID, switching to first available: ${firstSessionId}`);
            switchSession(firstSessionId);
        } else { // No sessions at all
             console.warn("No active session ID found and no sessions exist. Creating new session.");
             createNewSession();
        }

        updateAiStatus();
        setupAiButtons();
        adjustTextareaHeight();
        updateFloatingAiWindow(activeModels);
        loadMutedAiNames();
        setRandomBackground();
        setBodyBackground();
        console.log("Application initialized.");
    }

    function adjustTextareaHeight() {
        messageInput.style.height = 'auto';
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight, 10);
        const newHeight = Math.min(messageInput.scrollHeight, maxHeight);
        messageInput.style.height = `${newHeight}px`;
    }

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
                    console.error("Loaded chat data is invalid, resetting.");
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
                persistentlyMutedAiNames = Array.isArray(namesArray) ? new Set(namesArray) : new Set();
                if(!Array.isArray(namesArray)) console.error("Invalid muted AI data in localStorage.");
            } catch (error) {
                console.error("Error parsing muted AI names from localStorage:", error);
                persistentlyMutedAiNames = new Set();
            }
        } else {
            persistentlyMutedAiNames = new Set();
        }
         console.log("Loaded persistently muted AI names:", Array.from(persistentlyMutedAiNames));
    }

    function saveMutedAiNames() {
        try {
            localStorage.setItem(MUTED_AI_KEY, JSON.stringify(Array.from(persistentlyMutedAiNames)));
        } catch (error) {
            console.error("Error saving muted AI names to localStorage:", error);
        }
    }

    function resetChatData() {
        allChatData = { sessions: {}, activeSessionId: null };
        activeSessionId = null;
        chatHistory = [];
    }

    function initializeSessions() {
        if (Object.keys(allChatData.sessions).length === 0) {
            console.log("No sessions found, creating initial session.");
            createNewSession(false); 
        } else if (!activeSessionId || !allChatData.sessions[activeSessionId]) {
            activeSessionId = Object.keys(allChatData.sessions)[0];
            allChatData.activeSessionId = activeSessionId;
            console.log(`Active session ID was invalid, set to first available: ${activeSessionId}`);
            saveAllChatData();
        }
        activeSessionId = allChatData.activeSessionId; // Ensure global activeSessionId is current
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
            console.error(`Attempted to switch to invalid session ID: ${sessionId}`);
             const firstSessionId = Object.keys(allChatData.sessions)[0];
             if (firstSessionId) {
                 console.log(`Switching to first available session: ${firstSessionId}`);
                 sessionId = firstSessionId;
             } else {
                 createNewSession(); // This will also switch
                 return;
             }
        }

        console.log(`Switching to session: ${sessionId}`);
        activeSessionId = sessionId;
        chatHistory = allChatData.sessions[activeSessionId].history ? [...allChatData.sessions[activeSessionId].history] : [];
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

        console.log(`Creating new session: ${newSessionName} (${newSessionId})`);
        allChatData.sessions[newSessionId] = { name: newSessionName, history: [] };

        if (switchToNew) {
             activeSessionId = newSessionId;
             chatHistory = [];
             allChatData.activeSessionId = activeSessionId; // Ensure this is set before save
             saveAllChatData(); // Save new session and active ID
             populateSessionSelect(); // Update dropdown
             switchSession(newSessionId); // Officially switch (will call displayChatHistory)
        } else {
             saveAllChatData(); // Just save, active session logic handled by caller (e.g. init)
        }
    }

    function saveChatHistory() {
        if (activeSessionId && allChatData.sessions[activeSessionId]) {
            allChatData.sessions[activeSessionId].history = chatHistory;
            saveAllChatData();
        } else {
            console.error("Cannot save history: No active session ID or session data found.");
        }
    }

    function displayChatHistory() {
        chatMessages.innerHTML = '';
        if (Array.isArray(chatHistory)) {
             chatHistory.forEach(msg => {
                 const messageContent = msg.content || {};
                 appendMessage(msg.name, messageContent, msg.role === 'user');
             });
        } else {
             console.error("chatHistory is not an array during display:", chatHistory);
             chatHistory = [];
        }
    }

    function appendMessage(sender, contentData, isUser, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', isUser ? 'user-message' : 'ai-message');

        const avatarElement = document.createElement('img');
        avatarElement.classList.add('avatar');
        const imageDir = 'image/';
        const defaultUserAvatar = imageDir + 'default-user.png';
        const defaultAiAvatar = imageDir + 'default-ai.png';
        let avatarSrc = isUser ? (config?.UserAvatar ? imageDir + config.UserAvatar : defaultUserAvatar)
                               : (config?.models?.find(model => model.Name === sender)?.Avatar ? imageDir + config.models.find(model => model.Name === sender).Avatar : defaultAiAvatar);
        avatarElement.src = avatarSrc;
        avatarElement.alt = `${sender} 头像`;
        avatarElement.onerror = () => {
            console.warn(`Failed to load avatar: ${avatarSrc}. Using default.`);
            avatarElement.src = isUser ? defaultUserAvatar : defaultAiAvatar;
        };

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
            imgElement.style.cssText = 'max-width: 200px; max-height: 200px; display: block; margin-top: 5px; border-radius: 4px;';
            contentWrapper.appendChild(imgElement);
        }

        if (textContent || isLoading) {
            const contentElement = document.createElement('div');
            contentElement.classList.add('content');
            
            let highlightedText = highlightMentions(textContent || '');
            const preprocessedText = highlightedText.replace(/~~/g, '\\~\\~');
            let finalHtml = '';
            let lastIndex = 0;
            const canParseMarkdown = typeof marked !== 'undefined' && marked;

            if (!preprocessedText && !isLoading) { // Handle empty text explicitly
                finalHtml = "";
            } else {
                preprocessedText.replace(COMBINED_SPECIAL_BLOCK_REGEX, (match, dailyNoteFullMatch, toolUseFullMatch, index) => {
                    const beforeText = preprocessedText.slice(lastIndex, index);
                    if (beforeText) {
                        finalHtml += canParseMarkdown ? marked.parse(beforeText) : beforeText.replace(/\n/g, '<br>');
                    }

                    if (dailyNoteFullMatch) {
                        const noteContent = dailyNoteFullMatch.replace('<<<DailyNoteStart>>>', '').replace('<<<DailyNoteEnd>>>', '');
                        const maidMatch = noteContent.match(/Maid:\s*([^\n]*)/);
                        const dateMatch = noteContent.match(/Date:\s*([^\n]*)/);
                        const contentMatch = noteContent.match(/Content:\s*([\s\S]*)/);
                        let formattedContent = '';
                        if (maidMatch && dateMatch && contentMatch) {
                            const maid = maidMatch[1].trim();
                            const date = dateMatch[1].trim();
                            const content = contentMatch[1].trim();
                            formattedContent = `DailyNote: ${maid} - ${date}<br>${content.replace(/\n/g, '<br>')}`;
                        } else {
                            formattedContent = noteContent.replace(/\n/g, '<br>');
                        }
                        finalHtml += `<div class="daily-note-bubble">${formattedContent}</div>`;
                    } else if (toolUseFullMatch) {
                        const toolContent = toolUseFullMatch.replace('<<<[TOOL_REQUEST]>>>', '').replace('<<<[END_TOOL_REQUEST]>>>', '');
                        const toolNameMatchResult = toolContent.match(TOOL_NAME_INNER_REGEX);
                        let formattedContent = 'ToolUse: Unknown';
                        if (toolNameMatchResult && toolNameMatchResult[1]) {
                            formattedContent = `ToolUse: ${toolNameMatchResult[1].trim()}`;
                        }
                        finalHtml += `<div class="tool-use-bubble">${formattedContent}</div>`;
                    }
                    lastIndex = index + match.length;
                    return match; 
                });

                const remainingText = preprocessedText.slice(lastIndex);
                if (remainingText) {
                    finalHtml += canParseMarkdown ? marked.parse(remainingText) : remainingText.replace(/\n/g, '<br>');
                }
                
                // Fallback: if preprocessedText was not just whitespace, and finalHtml is empty,
                // AND no special blocks were involved (meaning pure markdown was parsed to empty by marked.parse)
                // then use basic line break conversion.
                if (preprocessedText.trim() && !finalHtml.trim() && !COMBINED_SPECIAL_BLOCK_REGEX.test(preprocessedText)) {
                     finalHtml = preprocessedText.replace(/\n/g, '<br>');
                }
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
                 } else {
                     console.error("Could not find content wrapper for loading message:", sender);
                     return;
                 }
            }

            let highlightedText = highlightMentions(textContent || '');
            const preprocessedText = highlightedText.replace(/~~/g, '\\~\\~');
            let finalHtml = '';
            let lastIndex = 0;
            const canParseMarkdown = typeof marked !== 'undefined' && marked;

            if (!preprocessedText && !isFinalUpdate) { // Handle empty text for stream unless final
                finalHtml = "";
            } else {
                preprocessedText.replace(COMBINED_SPECIAL_BLOCK_REGEX, (match, dailyNoteFullMatch, toolUseFullMatch, index) => {
                    const beforeText = preprocessedText.slice(lastIndex, index);
                    if (beforeText) {
                        finalHtml += canParseMarkdown ? marked.parse(beforeText) : beforeText.replace(/\n/g, '<br>');
                    }

                    if (dailyNoteFullMatch) {
                        const noteContent = dailyNoteFullMatch.replace('<<<DailyNoteStart>>>', '').replace('<<<DailyNoteEnd>>>', '');
                        const maidMatch = noteContent.match(/Maid:\s*([^\n]*)/);
                        const dateMatch = noteContent.match(/Date:\s*([^\n]*)/);
                        const contentMatch = noteContent.match(/Content:\s*([\s\S]*)/);
                        let formattedContent = '';
                        if (maidMatch && dateMatch && contentMatch) {
                            const maid = maidMatch[1].trim();
                            const date = dateMatch[1].trim();
                            const content = contentMatch[1].trim();
                            formattedContent = `DailyNote: ${maid} - ${date}<br>${content.replace(/\n/g, '<br>')}`;
                        } else {
                            formattedContent = noteContent.replace(/\n/g, '<br>');
                        }
                        finalHtml += `<div class="daily-note-bubble">${formattedContent}</div>`;
                    } else if (toolUseFullMatch) {
                        const toolContent = toolUseFullMatch.replace('<<<[TOOL_REQUEST]>>>', '').replace('<<<[END_TOOL_REQUEST]>>>', '');
                        const toolNameMatchResult = toolContent.match(TOOL_NAME_INNER_REGEX);
                        let formattedContent = 'ToolUse: Unknown';
                        if (toolNameMatchResult && toolNameMatchResult[1]) {
                            formattedContent = `ToolUse: ${toolNameMatchResult[1].trim()}`;
                        }
                        finalHtml += `<div class="tool-use-bubble">${formattedContent}</div>`;
                    }
                    lastIndex = index + match.length;
                    return match;
                });

                const remainingText = preprocessedText.slice(lastIndex);
                if (remainingText) {
                    finalHtml += canParseMarkdown ? marked.parse(remainingText) : remainingText.replace(/\n/g, '<br>');
                }
                
                if (preprocessedText.trim() && !finalHtml.trim() && !COMBINED_SPECIAL_BLOCK_REGEX.test(preprocessedText)) {
                     finalHtml = preprocessedText.replace(/\n/g, '<br>');
                }
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
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                delete loadingMessage.dataset.loadingId;
            }

        } else if (!isFinalUpdate) {
            console.error(`Loading message for ${sender} not found during stream update.`);
        } else {
            console.warn(`Loading message for ${sender} not found for final update. Appending as new message.`);
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
        if (isAiResponding) {
            console.log("AI is already responding.");
            return;
        }
        const model = activeModels[modelIndex];
        if (model) {
            console.log(`Inviting ${model.Name} to respond.`);
            isAiResponding = true;
            setUiResponding(true);
            callAiApi(model);
        } else {
            console.error(`Invalid model index: ${modelIndex}`);
        }
    }

    async function triggerAiResponse() {
        if (!config) {
            console.error("Cannot trigger AI response: Config not loaded yet.");
            return;
        }
        if (isAiResponding && config.AI_CHAT_MODE !== 'ButtonSend') {
            console.log("AI response cycle already in progress.");
            return;
        }
        isAiResponding = true;
        setUiResponding(true);

        const mode = config.AI_CHAT_MODE;
        let potentialSpeakers = [];

        switch (mode) {
            case 'sequentialQueue': potentialSpeakers = [...activeModels]; break;
            case 'shuffledQueue':
                potentialSpeakers = activeModels.map((_, i) => i).sort(() => Math.random() - 0.5).map(i => activeModels[i]);
                break;
            case 'randomSubsetQueue':
                const subsetSize = Math.floor(Math.random() * activeModels.length) + 1;
                potentialSpeakers = activeModels.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, subsetSize).map(i => activeModels[i]);
                break;
            case 'NatureRandom': potentialSpeakers = determineNatureRandomSpeakers(); break;
            case 'ButtonSend':
                isAiResponding = false; setUiResponding(false); return;
            default:
                console.error(`Unknown AI_CHAT_MODE: ${mode}`);
                isAiResponding = false; setUiResponding(false); updateFloatingAiWindow([]); return;
        }

        let actualSpeakers;
        if (isAtAllTriggered) {
            console.log("@所有人 is active: Forcing all non-muted/non-excluded AIs to respond.");
            actualSpeakers = activeModels.filter(m => !excludedAiForNextRound.has(m.Name) && !persistentlyMutedAiNames.has(m.Name));
        } else {
            actualSpeakers = potentialSpeakers.filter(m => !excludedAiForNextRound.has(m.Name) && !persistentlyMutedAiNames.has(m.Name) && !aiOptedOutLastRound.has(m.Name));
        }

        console.log(`Potential speakers (mode-based): ${potentialSpeakers.map(m => m.Name).join(', ')}`);
        if (excludedAiForNextRound.size > 0 || persistentlyMutedAiNames.size > 0 || aiOptedOutLastRound.size > 0 || isAtAllTriggered) {
             console.log(`Excluding (user, next round only): ${Array.from(excludedAiForNextRound).join(', ') || 'None'}`);
             console.log(`Muted (user, persistently): ${Array.from(persistentlyMutedAiNames).join(', ') || 'None'}`);
             console.log(`Opted Out (AI, last round): ${Array.from(aiOptedOutLastRound).join(', ') || 'None'}`);
        }
        console.log(`Actual speakers: ${actualSpeakers.map(m => m.Name).join(', ')}`);
        
        excludedAiForNextRound.clear();
        aiOptedOutLastRound.clear(); 

        updateFloatingAiWindow(activeModels, actualSpeakers);
        if (actualSpeakers.length === 0) {
            console.log("No AI speakers left after exclusion.");
        } else {
            for (const model of actualSpeakers) {
                if (model) { 
                    console.log(`--- Calling AI: ${model.Name} ---`);
                    await callAiApi(model);
                } else {
                    console.error(`Found invalid model entry in actualSpeakers.`);
                }
            }
        }

        isAiResponding = false;
        setUiResponding(false);
        isAtAllTriggered = false; 
        updateFloatingAiWindow(activeModels); // Update to show all as active again
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

    function determineNatureRandomSpeakers() {
        const isFirstTurn = chatHistory.length === 1 && chatHistory[0].role === 'user';
        let lastRoundMessages = [];

        if (isFirstTurn) {
            console.log("NatureRandom: Handling first turn, based on user's first message.");
            lastRoundMessages = [chatHistory[0]]; 
        } else {
            let lastUserMessageIndex = -1;
            for (let i = chatHistory.length - 1; i >= 0; i--) { // Start from very end
                if (chatHistory[i].role === 'user') {
                    lastUserMessageIndex = i;
                    break;
                }
            }
            // If no user message found (e.g. only AI messages), or only one message (which is user, handled by isFirstTurn)
            // then consider all messages since the last user message (or all if no user message)
            if (lastUserMessageIndex !== -1) {
                 lastRoundMessages = chatHistory.slice(lastUserMessageIndex);
            } else {
                 // This case means either history is empty (not possible if we're here after a user message)
                 // or all messages are from AI after the initial user message.
                 // Or it's the very first message which is user (covered by isFirstTurn).
                 // If history has items, but no user message (e.g. after a ButtonSend AI response),
                 // we should analyze based on the last AI's response or the whole recent history.
                 // For simplicity, if no *recent* user message, analyze based on the last few messages.
                 console.warn("NatureRandom: No recent user message found. Analyzing last few messages or full history if short.");
                 lastRoundMessages = chatHistory.slice(-5); // Analyze last 5 messages or all if fewer
            }
        }
        
        const allIndividualTags = new Set();
        activeModels.forEach(model => {
            if (model.Tag && typeof model.Tag === 'string') {
                model.Tag.split(',').map(tag => tag.trim()).filter(tag => tag).forEach(tag => allIndividualTags.add(tag)); 
            }
        });

        if (allIndividualTags.size === 0) {
             console.warn("NatureRandom: No valid individual tags. Falling back to random subset.");
             const subsetSize = Math.max(1, Math.floor(Math.random() * activeModels.length)); // Ensure at least 1
             return activeModels.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, subsetSize).map(i => activeModels[i]);
        }

        const escapedIndividualTags = Array.from(allIndividualTags).map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const tagRegex = new RegExp(`(?:@(?:${escapedIndividualTags.join('|')})|@所有人)(?![\\w-])`, 'g'); // Match @tag or @所有人

        const mentionedTagsInUser = new Set();
        const mentionedTagsInAi = new Set();
        let atAllInUser = false;

        lastRoundMessages.forEach(msg => {
            const text = msg.content?.text;
            if (text) {
                const matches = [...text.matchAll(tagRegex)]; // Get all matches with their values
                if (matches.length > 0) {
                    const uniqueMatchesInMsg = new Set(matches.map(m => m[0])); // m[0] is the full match
                    if (msg.role === 'user') {
                        uniqueMatchesInMsg.forEach(tag => {
                            if (tag === '@所有人') atAllInUser = true;
                            else mentionedTagsInUser.add(tag.substring(1)); // Store tag without '@'
                        });
                    } else { 
                        uniqueMatchesInMsg.forEach(tag => {
                             if (tag !== '@所有人') mentionedTagsInAi.add(tag.substring(1)); // Store tag without '@'
                        });
                    }
                }
            }
        });
        
        if (atAllInUser) {
            console.log("NatureRandom: @所有人 detected in user message. All non-muted AIs will speak.");
            return activeModels.filter(model => !persistentlyMutedAiNames.has(model.Name) && !excludedAiForNextRound.has(model.Name));
        }

        const nextSpeakers = new Set(); // Use a Set to avoid duplicates

        const modelHasMentionedTag = (model, mentionedTagSet) => {
            if (!model.Tag || typeof model.Tag !== 'string') return false;
            const modelTags = model.Tag.split(',').map(t => t.trim()).filter(t => t);
            return modelTags.some(tag => mentionedTagSet.has(tag));
        };

        activeModels.forEach(model => {
            if (modelHasMentionedTag(model, mentionedTagsInUser)) {
                nextSpeakers.add(model);
            }
        });

        activeModels.forEach(model => {
            if (!nextSpeakers.has(model) && modelHasMentionedTag(model, mentionedTagsInAi)) {
                nextSpeakers.add(model);
            }
        });
        
        // If specific mentions result in speakers, use them. Otherwise, consider random.
        if (nextSpeakers.size > 0) {
            return Array.from(nextSpeakers);
        }

        // Fallback: If no direct mentions, apply random chance based on AI_LIST or activeModels.length
        const mentionProbability = 1 / (config.AI_LIST || activeModels.length || 1);
        activeModels.forEach(model => {
            if (Math.random() < mentionProbability) {
                nextSpeakers.add(model);
            }
        });

        if (nextSpeakers.size === 0 && activeModels.length > 0) {
             console.log("NatureRandom: No speakers selected by mention or probability, forcing one random speaker.");
             const randomIndex = Math.floor(Math.random() * activeModels.length);
             nextSpeakers.add(activeModels[randomIndex]);
        }
        return Array.from(nextSpeakers);
    }

    function highlightMentions(text) {
        if (!text || typeof text !== 'string' || !config || !config.models) return text; 

        const allIndividualTags = new Set();
        activeModels.forEach(model => {
            if (model.Tag && typeof model.Tag === 'string') {
                model.Tag.split(',').map(tag => tag.trim()).filter(tag => tag).forEach(tag => allIndividualTags.add(tag)); 
            }
        });

        const escapedIndividualTags = Array.from(allIndividualTags).map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Ensure @所有人 is matched as a whole word. Other @tags are also matched as whole words.
        const tagPatternPart = escapedIndividualTags.length > 0 ? `|@(?:${escapedIndividualTags.join('|')})\\b` : '';
        const mentionRegex = new RegExp(`(@所有人\\b${tagPatternPart})`, 'g');
        
        return text.replace(mentionRegex, (match) => `<span class="mention-highlight">${match}</span>`);
    }

    async function callAiApi(model, retryCount = 0) {
        if (!config || !model) {
             console.error("Cannot call API: Config or model not available.", {configExists: !!config, modelExists: !!model});
             setUiResponding(false); isAiResponding = false; return;
        }

        const retryText = retryCount > 0 ? `(重试 ${retryCount}/${config.MaxRetries || 2})` : '';
        console.log(`Calling API for: ${model.Name} ${retryText}`);
        if (retryCount === 0) {
            appendMessage(model.Name, {text:'...'}, false, true);
        } else {
            updateLoadingMessage(model.Name, `重新连接中${retryText}...`, false);
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
            let messagePart = null;

            if (content.image && model.Image) {
                 messagePart = [];
                 const textPart = content.text ? senderPrefix + content.text : senderPrefix + "[图片]";
                 messagePart.push({ type: "text", text: textPart });
                 messagePart.push({ type: "image_url", image_url: { url: content.image } });
            } else if (content.text) {
                 messagePart = senderPrefix + content.text;
            } else if (content.image && !model.Image) {
                 messagePart = senderPrefix + "[图片]";
            }
            if (messagePart) {
                apiMessage.content = messagePart;
                messages.push(apiMessage);
            }
        });

        if (model.InvitePrompts && model.InvitePrompts.trim()) {
            messages.push({ role: 'user', content: model.InvitePrompts });
        }

        if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'system')) {
             console.error("No valid messages to send to the API for " + model.Name);
             updateLoadingMessage(model.Name, "错误：没有有效内容发送给 AI。", true);
             // Let triggerAiResponse handle isAiResponding and setUiResponding for non-button modes
             if (config.AI_CHAT_MODE === 'ButtonSend') { isAiResponding = false; setUiResponding(false); }
             return;
        }

        try {
            const requestBody = {
                model: model.Model, messages: messages,
                max_tokens: model.Outputtoken || 1500,
                temperature: model.Temperature || 0.7,
                stream: config.StreamingOutput
            };
            if (model.Websearch === true) {
                 requestBody.tools = [{ type: "function", function: { name: "google_search", description: "Perform a Google search.", parameters: { type: "object", properties: { query: { type: "string", description: "Search query."}}, required: ["query"]}}}];
                 requestBody.tool_choice = "auto";
            }

            const apiUrl = config.API_URl || ""; 
            if (!apiUrl) {
                console.error("API URL is not defined."); updateLoadingMessage(model.Name, "错误：API URL 未定义。", true); return; 
            }

            const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.API_Key}`},
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout((config.API_Timeout || 30) * 1000) 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`API Error for ${model.Name}: ${response.status}`, errorData);
                const maxRetries = config.MaxRetries || 2;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1) )); // Exponential backoff basic
                    return callAiApi(model, retryCount + 1);
                }
                updateLoadingMessage(model.Name, `错误: ${errorData.error?.message || errorData.message || response.statusText} (已重试${retryCount}次)`, true);
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorData.error?.message || errorData.message || response.statusText}` } });
                saveChatHistory();
                return; 
            }

            if (config.StreamingOutput && response.body) {
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
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataString = line.substring(6).trim();
                            if (dataString === '[DONE]') { buffer = '[DONE]'; break; }
                            try {
                                const chunk = JSON.parse(dataString);
                                const choice = chunk.choices?.[0];
                                if (choice?.delta?.content) {
                                    accumulatedResponse += choice.delta.content;
                                    updateLoadingMessage(model.Name, accumulatedResponse + "...", false); 
                                }
                                if (choice?.delta?.tool_calls) console.log(`[STREAM TOOL CALLS - ${model.Name}]:`, choice.delta.tool_calls);
                                if (choice?.finish_reason) console.log(`[STREAM FINISH REASON - ${model.Name}]: ${choice.finish_reason}`);
                            } catch (e) { console.error(`[STREAM PARSE ERROR - ${model.Name}]: "${dataString}"`, e); }
                        }
                    }
                    if (buffer === '[DONE]') break;
                }
                let finalResponseText = accumulatedResponse;
                if (finalResponseText.includes('[[QuitGroup]]')) {
                     aiOptedOutLastRound.add(model.Name);
                     finalResponseText = finalResponseText.replace('[[QuitGroup]]', '').trim();
                }
                updateLoadingMessage(model.Name, finalResponseText, true); 
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: finalResponseText } });
            } else {
                const responseData = await response.json();
                let fullContent = responseData.choices?.[0]?.message?.content || "未能获取响应内容";
                if (responseData.choices?.[0]?.message?.tool_calls) console.log(`[NON-STREAM TOOL_CALLS - ${model.Name}]:`, responseData.choices[0].message.tool_calls);
                if (fullContent.includes('[[QuitGroup]]')) {
                     aiOptedOutLastRound.add(model.Name);
                     fullContent = fullContent.replace('[[QuitGroup]]', '').trim();
                }
                updateLoadingMessage(model.Name, fullContent, true); 
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: fullContent } });
            }
            saveChatHistory();
        } catch (error) {
            console.error(`Error calling API for ${model.Name} (Attempt ${retryCount}):`, error);
            const maxRetries = config.MaxRetries || 2;
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return callAiApi(model, retryCount + 1);
            }
            let errMsg = error.name === 'TimeoutError' ? "API 请求超时" : "API 连接失败或发生错误";
            updateLoadingMessage(model.Name, `错误: ${errMsg} (已重试${retryCount}次)`, true); 
            chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errMsg}` } });
            saveChatHistory(); 
        } finally {
             if (config.AI_CHAT_MODE === 'ButtonSend') { isAiResponding = false; setUiResponding(false); }
        }
    }

    function updateFloatingAiWindow(allModels, speakingModels = null) { 
        if (!floatingAiStatusWindow || !currentRoundAisContainer) return; 
        currentRoundAisContainer.innerHTML = ''; 
        if (!allModels || allModels.length === 0) {
            floatingAiStatusWindow.style.display = 'none'; return;
        }
        floatingAiStatusWindow.style.display = 'block'; 
        const speakingModelNames = speakingModels ? new Set(speakingModels.map(m => m.Name)) : null;

        allModels.forEach(model => { 
            const itemDiv = document.createElement('div'); itemDiv.classList.add('ai-status-item');
            const img = document.createElement('img');
            const imageDir = 'image/'; const defaultAiAvatar = imageDir + 'default-ai.png';
            img.src = model.Avatar ? imageDir + model.Avatar : defaultAiAvatar;
            img.alt = model.Name; img.onerror = () => { img.src = defaultAiAvatar; }; 
            img.classList.toggle('inactive-avatar', speakingModelNames && !speakingModelNames.has(model.Name));
            
            const nameSpan = document.createElement('span'); nameSpan.textContent = model.Name;
            const buttonsContainer = document.createElement('div'); buttonsContainer.style.display = 'flex'; 
            const muteBtn = document.createElement('button'); muteBtn.classList.add('mute-ai-btn');
            muteBtn.textContent = '!'; muteBtn.dataset.aiName = model.Name;
            muteBtn.classList.toggle('muted', persistentlyMutedAiNames.has(model.Name));
            muteBtn.title = persistentlyMutedAiNames.has(model.Name) ? `取消对 ${model.Name} 的持续禁言` : `持续禁言 ${model.Name}`;
            muteBtn.addEventListener('click', (e) => {
                const aiName = e.target.dataset.aiName;
                if (persistentlyMutedAiNames.has(aiName)) persistentlyMutedAiNames.delete(aiName);
                else persistentlyMutedAiNames.add(aiName);
                saveMutedAiNames(); updateFloatingAiWindow(allModels, speakingModels); // Redraw to update title/class
            });

            const closeBtn = document.createElement('button'); closeBtn.classList.add('close-ai-btn');
            closeBtn.textContent = 'X'; closeBtn.dataset.aiName = model.Name; 
            const isExcluded = excludedAiForNextRound.has(model.Name) || aiOptedOutLastRound.has(model.Name);
            closeBtn.classList.toggle('excluded-next-round', isExcluded);
            closeBtn.title = isExcluded ? `${model.Name} 将在下一轮跳过` : `标记 ${model.Name} 下一轮不发言`;
            closeBtn.addEventListener('click', (e) => {
                const aiName = e.target.dataset.aiName;
                if (excludedAiForNextRound.has(aiName)) excludedAiForNextRound.delete(aiName);
                else excludedAiForNextRound.add(aiName);
                updateFloatingAiWindow(allModels, speakingModels); // Redraw to update title/class
            });

            buttonsContainer.append(muteBtn, closeBtn); 
            itemDiv.append(img, nameSpan, buttonsContainer); 
            currentRoundAisContainer.appendChild(itemDiv);
        });
    }
}); // End DOMContentLoaded

function setRandomBackground() { // Moved outside DOMContentLoaded to be globally accessible if needed
    const chatMessagesDiv = document.getElementById('chat-messages');
    if (!chatMessagesDiv) return; 
    const imageDir = 'image/'; 
    const phoneImages = ['Phone餐厅.png', 'phone街头.png', 'Phone客厅.png', 'Phone书房.png', 'Phone卧室.png'];
    const winImages = ['Win餐厅.png', 'Win晨间卧室.png', 'Win厨房.png', 'Win书房.png', 'Win浴室.png'];
    let selectedImageList = window.innerWidth <= 768 ? phoneImages : winImages;
    console.log(`Using ${window.innerWidth <= 768 ? "Phone" : "Win"} background images.`);

    if (selectedImageList.length > 0) {
        const randomIndex = Math.floor(Math.random() * selectedImageList.length);
        const randomImageFile = selectedImageList[randomIndex];
        const subDir = (selectedImageList === phoneImages) ? 'Phone/' : 'Win/';
        const imageUrl = imageDir + subDir + randomImageFile; 
        console.log(`Setting background to: ${imageUrl}`);
        chatMessagesDiv.style.backgroundImage = `url('${imageUrl}')`;
    } else {
        console.warn("No background images found for the current resolution.");
        chatMessagesDiv.style.backgroundImage = 'none'; 
    }
}

function setBodyBackground() { // Moved outside DOMContentLoaded
    const imageDir = 'image/Wallpaper/'; 
    const wallpaperImages = [
        'ComfyUI_134901_177920272026190_00001.png', 'ComfyUI_135039_177581081695754_00003.png',
        'ComfyUI_135246_390494183581112_00005.png', 'ComfyUI_135334_868574652531835_00006.png'
    ];
    if (wallpaperImages.length > 0) {
        const randomIndex = Math.floor(Math.random() * wallpaperImages.length);
        const imageUrl = imageDir + wallpaperImages[randomIndex];
        console.log(`Setting body background to: ${imageUrl}`);
        document.body.style.cssText = `background-image: url('${imageUrl}'); background-size: cover; background-position: center center; background-repeat: no-repeat; background-attachment: fixed;`;
    } else {
        console.warn("No wallpaper images found.");
        document.body.style.backgroundImage = 'none'; 
    }
}
