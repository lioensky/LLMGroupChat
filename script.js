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
    let currentAiIndex = 0;
    let aiTurnOrder = [];

    // --- State ---
    let allChatData = { sessions: {}, activeSessionId: null }; // Holds all sessions and the active one
    let chatHistory = []; // Represents the history of the *active* session
    let activeSessionId = null; // ID of the currently active session
    let isAiResponding = false;
    let selectedImageBase64 = null; // To store the selected image data
    let excludedAiForNextRound = new Set(); // Stores names of AIs to exclude in the *next* round (single round)
    let persistentlyMutedAiNames = new Set(); // Stores names of AIs persistently muted
    let aiOptedOutLastRound = new Set(); // Stores names of AIs that included [[QuitGroup]] in their last response
    let isAtAllTriggered = false; // Flag for "@所有人" command
    
    // --- Constants ---
    const CHAT_DATA_KEY = 'aiGroupChatData';
    const MUTED_AI_KEY = 'persistentlyMutedAiNames'; // Key for localStorage

    // --- Marked.js Configuration ---
    // Configure marked to handle line breaks and use GitHub Flavored Markdown
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true, // Convert GFM line breaks into <br> tags
            gfm: true      // Enable GitHub Flavored Markdown (includes breaks)
        });
        console.log("marked.js configured.");
    } else {
        console.error("marked.js library not loaded. Markdown rendering will be disabled.");
    }

    // --- Initialization ---
    // 1. Setup Config Selector FIRST
    populateConfigSelect();
    const selectedConfigFile = localStorage.getItem(CONFIG_STORAGE_KEY) || availableConfigs[0].file; // Default to first config
    configSelect.value = selectedConfigFile; // Set dropdown to stored/default value

    // 2. Add listener for config changes
    configSelect.addEventListener('change', handleConfigChange);

    // 3. Load the selected config and then initialize the rest of the app
    loadConfigAndInitialize(selectedConfigFile);
// --- Dark Mode Logic ---
    /** Apply or remove the night mode class based on state */
    function applyDarkMode(isEnabled) {
        if (isEnabled) {
            document.body.classList.add('night-mode');
        } else {
            document.body.classList.remove('night-mode');
        }
        // Save preference to localStorage
        localStorage.setItem(DARK_MODE_STORAGE_KEY, isEnabled);
    }

    // Check for saved preference on load
    const savedDarkModePreference = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (savedDarkModePreference !== null) {
        // Convert stored string ("true" or "false") to boolean
        applyDarkMode(savedDarkModePreference === 'true');
    } else {
        // Default to light mode if no preference is saved
        applyDarkMode(false);
    }

    // Add event listener to the dark mode toggle button
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isEnabled = document.body.classList.contains('night-mode');
            applyDarkMode(!isEnabled); // Toggle the state
        });
    } else {
        console.error("Dark mode toggle button not found!");
    }


    // --- Event Listeners ---

    // Note: Other initializations (loadAllChatData, etc.) are moved into initializeApplication()

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    newChatButton.addEventListener('click', createNewSession);
    sessionSelect.addEventListener('change', (e) => switchSession(e.target.value));
    // Config change listener is added during initialization
    // attachImageButton click listener removed, label 'for' attribute handles it now.
    imageInput.addEventListener('change', handleImageSelection); // Handle file selection
    removeImageButton.addEventListener('click', removeSelectedImage); // Handle image removal
    messageInput.addEventListener('keydown', (e) => {
        // Check if it's Enter key, not Shift+Enter, AND not on a mobile-like screen width
        const isMobileWidth = window.innerWidth <= 768; // Use a common breakpoint for mobile
        if (e.key === 'Enter' && !e.shiftKey && !isMobileWidth) {
            e.preventDefault(); // Prevent default newline on desktop when sending
            handleSendMessage();
        }
        // On mobile (isMobileWidth is true), Enter will just perform its default action (newline)
        // On desktop, Shift+Enter will also perform its default action (newline)
    });
    messageInput.addEventListener('input', adjustTextareaHeight);


    // --- Functions ---
    // --- Config Loading and Initialization Functions ---

    /** Populate the config select dropdown */
    function populateConfigSelect() {
        availableConfigs.forEach(cfg => {
            const option = document.createElement('option');
            option.value = cfg.file;
            option.textContent = cfg.name;
            configSelect.appendChild(option);
        });
    }

    /** Handle config selection change */
    function handleConfigChange(event) {
        const newConfigFile = event.target.value;
        localStorage.setItem(CONFIG_STORAGE_KEY, newConfigFile);
        alert(`配置已更改为 ${availableConfigs.find(c=>c.file === newConfigFile)?.name || newConfigFile}. 页面将重新加载以应用更改。`);
        location.reload(); // Reload the page to apply the new config
    }

    /** Load the specified config file and initialize the application */
    function loadConfigAndInitialize(configFileName) {
        console.log(`Loading config: ${configFileName}`);
        // Remove any existing config script tag to avoid conflicts
        const existingScript = document.querySelector('script[src^="config"]');
        if (existingScript) {
            existingScript.remove();
        }

        const script = document.createElement('script');
        script.src = configFileName; // Load the selected config file
        script.onload = () => {
            console.log(`Config ${configFileName} loaded successfully.`);
            // Check if the config file correctly assigned to window.loadedConfig
            if (typeof window.loadedConfig === 'object' && window.loadedConfig !== null) {
                // Assign the loaded config to our internal variable
                config = window.loadedConfig;
                // Clean up the temporary global variable
                delete window.loadedConfig;
                console.log("Config object assigned successfully.");
                // Proceed with application initialization that depends on 'config'
                initializeApplication();
            } else {
                // The config file loaded, but didn't define window.loadedConfig correctly
                console.error(`Config object (window.loadedConfig) not found after loading ${configFileName}. Check the file structure. It should assign an object to 'window.loadedConfig'.`);
                alert(`错误：配置文件 ${configFileName} 加载成功，但未正确定义配置对象。请检查文件内容。`);
                // Optionally try loading default as fallback
                if (configFileName !== availableConfigs[0].file) {
                     console.log("Attempting to load default config as fallback.");
                     localStorage.setItem(CONFIG_STORAGE_KEY, availableConfigs[0].file); // Reset storage to default
                     loadConfigAndInitialize(availableConfigs[0].file); // Try loading default
                } else {
                     alert("错误：无法加载默认配置文件。应用程序无法启动。");
                }
            }
        };
        script.onerror = () => {
            console.error(`Failed to load config file: ${configFileName}`);
            alert(`错误：无法加载配置文件 ${configFileName}。将尝试加载默认配置。`);
            // Fallback to default config if the selected one fails
            if (configFileName !== availableConfigs[0].file) {
                localStorage.setItem(CONFIG_STORAGE_KEY, availableConfigs[0].file); // Reset storage to default
                loadConfigAndInitialize(availableConfigs[0].file); // Try loading default
            } else {
                 alert("错误：无法加载默认配置文件。应用程序无法启动。");
            }
        };
        document.body.appendChild(script);
    }

     /** Initialize the main application components after config is loaded */
     function initializeApplication() {
        console.log("Initializing application with loaded config...");
        // Initialize parts that depend on the 'config' object
        activeModels = config.getActiveModels(); // Now safe to access config
        currentAiIndex = 0;
        aiTurnOrder = [];

        // Load chat data and setup UI elements that depend on config
        loadAllChatData();
        initializeSessions();
        populateSessionSelect();
        if (activeSessionId) { // Ensure activeSessionId is valid before switching
             switchSession(activeSessionId);
        } else {
             console.warn("No active session ID found after loading data. UI might be empty initially.");
             // Optionally create a new session if none exists after loading
             if (Object.keys(allChatData.sessions).length === 0) {
                 createNewSession(); // This will also switch to the new session
             }
        }

        updateAiStatus(); // Depends on activeModels
        setupAiButtons(); // Depends on config.AI_CHAT_MODE and activeModels
        adjustTextareaHeight(); // Initial adjustment for textarea
        updateFloatingAiWindow(activeModels); // Initialize floating window with all active models

        console.log("Application initialized.");
        loadMutedAiNames(); // Load persistent mute state
        updateFloatingAiWindow(activeModels); // Initialize floating window showing all models as active initially
        setRandomBackground(); // Set initial random background for chat messages
        setBodyBackground();   // Set initial random background for body
    }


    // --- Existing Functions (potentially modified) ---

    /** Dynamically adjust textarea height based on content */
    function adjustTextareaHeight() {
        messageInput.style.height = 'auto'; // Reset height
        // Set height based on scroll height, but limit by max-height from CSS
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight, 10);
        const newHeight = Math.min(messageInput.scrollHeight, maxHeight);
        messageInput.style.height = `${newHeight}px`;
    }

    /** Load all chat data (sessions and active ID) from localStorage */
    function loadAllChatData() {
        const savedData = localStorage.getItem(CHAT_DATA_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                // Basic validation
                if (parsedData && typeof parsedData.sessions === 'object' && parsedData.sessions !== null) {
                    allChatData = parsedData;
                    // Ensure activeSessionId is valid, otherwise reset it
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
             resetChatData(); // Initialize if no data found
        }
        // Set the global activeSessionId from the loaded data
        activeSessionId = allChatData.activeSessionId;
    }

     /** Save the entire chat data structure to localStorage */
    function saveAllChatData() {
        try {
            // Ensure the current chatHistory is saved into the active session before saving all data
            if (activeSessionId && allChatData.sessions[activeSessionId]) {
                 allChatData.sessions[activeSessionId].history = chatHistory;
            }
        
            allChatData.activeSessionId = activeSessionId; // Make sure the active ID is current
            localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(allChatData));
        } catch (error) {
            console.error("Error saving chat data:", error);
        }
    }

    /** Load persistently muted AI names from localStorage */
    function loadMutedAiNames() {
        const savedMutedNames = localStorage.getItem(MUTED_AI_KEY);
        if (savedMutedNames) {
            try {
                const namesArray = JSON.parse(savedMutedNames);
                if (Array.isArray(namesArray)) {
                    persistentlyMutedAiNames = new Set(namesArray);
                    console.log("Loaded persistently muted AI names:", Array.from(persistentlyMutedAiNames));
                } else {
                     console.error("Invalid muted AI data in localStorage, expected an array.");
                     persistentlyMutedAiNames = new Set(); // Reset if data is invalid
                }
            } catch (error) {
                console.error("Error parsing muted AI names from localStorage:", error);
                persistentlyMutedAiNames = new Set(); // Reset on error
            }
        } else {
            persistentlyMutedAiNames = new Set(); // Initialize empty if nothing saved
        }
    }

    /** Save persistently muted AI names to localStorage */
    function saveMutedAiNames() {
        try {
            const namesArray = Array.from(persistentlyMutedAiNames);
            localStorage.setItem(MUTED_AI_KEY, JSON.stringify(namesArray));
        } catch (error) {
            console.error("Error saving muted AI names to localStorage:", error);
        }
    }

    /** Reset chat data to default state */
    function resetChatData() {
        allChatData = { sessions: {}, activeSessionId: null };
        activeSessionId = null;
        chatHistory = [];
    }

    /** Ensure at least one session exists and set activeSessionId */
    function initializeSessions() {
        if (Object.keys(allChatData.sessions).length === 0) {
            // No sessions exist, create the first one
            console.log("No sessions found, creating initial session.");
            createNewSession(false); // Create without switching immediately if called during init
        } else if (!activeSessionId || !allChatData.sessions[activeSessionId]) {
            // Active ID is invalid or missing, set to the first available session
            activeSessionId = Object.keys(allChatData.sessions)[0];
            allChatData.activeSessionId = activeSessionId;
            console.log(`Active session ID was invalid, set to first available: ${activeSessionId}`);
            saveAllChatData(); // Save the correction
        }
        // Ensure activeSessionId is set globally
        activeSessionId = allChatData.activeSessionId;
    }

    /** Generate a unique session ID */
    function generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    /** Populate the session select dropdown */
    function populateSessionSelect() {
        sessionSelect.innerHTML = ''; // Clear existing options
        const sessionIds = Object.keys(allChatData.sessions);

        if (sessionIds.length === 0) {
             // Handle case with no sessions (e.g., disable select or show placeholder)
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
            option.textContent = session.name || `聊天 ${sessionId.substring(8, 12)}`; // Use name or part of ID
            option.selected = sessionId === activeSessionId; // Select the active one
            sessionSelect.appendChild(option);
        });
    }

     /** Switch to a different chat session */
    function switchSession(sessionId) {
        if (!sessionId || !allChatData.sessions[sessionId]) {
            console.error(`Attempted to switch to invalid session ID: ${sessionId}`);
             // Optionally switch to the first available session if the target is invalid
             const firstSessionId = Object.keys(allChatData.sessions)[0];
             if (firstSessionId) {
                 console.log(`Switching to first available session: ${firstSessionId}`);
                 sessionId = firstSessionId;
             } else {
                 // If truly no sessions exist (shouldn't happen after init), create one
                 createNewSession();
                 return; // createNewSession will handle the switch
             }
        }

        console.log(`Switching to session: ${sessionId}`);
        activeSessionId = sessionId;
        chatHistory = [...allChatData.sessions[activeSessionId].history]; // Load history (use spread for shallow copy)
        allChatData.activeSessionId = activeSessionId; // Update the master record

        displayChatHistory(); // Update the message display
        saveAllChatData(); // Save the change in active session and potentially loaded history

        // Update the dropdown selection visually
        sessionSelect.value = activeSessionId;
    }

    /** Create a new chat session */
    function createNewSession(switchToNew = true) {
        const newSessionId = generateSessionId();
        // Generate a more descriptive name using date and time
        const now = new Date();
        // Format: YY/MM/DD HH:MM:SS (adjust locale and options as needed)
        const dateTimeString = now.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/\//g, '-'); // Replace slashes for consistency if desired
        const newSessionName = `聊天 ${dateTimeString}`;

        console.log(`Creating new session: ${newSessionName} (${newSessionId})`);

        allChatData.sessions[newSessionId] = {
            name: newSessionName,
            history: [] // Start with empty history
        };

        if (switchToNew) {
             activeSessionId = newSessionId; // Set as active immediately
             chatHistory = []; // Clear current history view
             allChatData.activeSessionId = activeSessionId;
             saveAllChatData(); // Save the new session and active ID
             populateSessionSelect(); // Update dropdown to include the new session
             switchSession(newSessionId); // Officially switch and display
        } else {
             // If called during init, just save the new session data
             // The active session will be set/confirmed by initializeSessions
             saveAllChatData();
        }
    }

    // --- Modify existing functions to use active session ---

    /** Save chat history (now saves to the active session within allChatData) */
    function saveChatHistory() {
        // This function is now implicitly handled by saveAllChatData,
        // as long as chatHistory is updated before calling saveAllChatData.
        // For now, let's make it explicitly update the active session's history
        if (activeSessionId && allChatData.sessions[activeSessionId]) {
            allChatData.sessions[activeSessionId].history = chatHistory;
            saveAllChatData(); // Save the entire structure
        } else {
            console.error("Cannot save history: No active session ID or session data found.");
        }
    }

    /** Display the entire chat history in the UI */
    function displayChatHistory() {
        chatMessages.innerHTML = ''; // Clear existing messages
        // Ensure chatHistory is an array before iterating
        if (Array.isArray(chatHistory)) {
             chatHistory.forEach(msg => {
                 // Adapt to new message structure { name, role, content: { text?, image? } }
                 const messageContent = msg.content || {}; // Handle potential old format or missing content
                 appendMessage(msg.name, messageContent, msg.role === 'user');
             });
        } else {
             console.error("chatHistory is not an array during display:", chatHistory);
             chatHistory = []; // Reset if invalid
        }
    }

    /** Append a single message (potentially with image) to the chat UI */
    function appendMessage(sender, contentData, isUser, isLoading = false) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isUser ? 'user-message' : 'ai-message');

        // --- Avatar ---
        const avatarElement = document.createElement('img');
        avatarElement.classList.add('avatar');
        let avatarSrc = '';
        const imageDir = 'image/'; // Define image directory prefix
        const defaultUserAvatar = imageDir + 'default-user.png'; // Default user avatar path
        const defaultAiAvatar = imageDir + 'default-ai.png'; // Default AI avatar path

        if (isUser) {
            // Get user avatar filename from config, add prefix
            avatarSrc = config?.UserAvatar ? imageDir + config.UserAvatar : defaultUserAvatar;
        } else {
            // Find the AI model object by sender name
            const aiModel = config?.models?.find(model => model.Name === sender);
            // Get AI avatar filename from model object, add prefix
            avatarSrc = aiModel?.Avatar ? imageDir + aiModel.Avatar : defaultAiAvatar;
        }
        avatarElement.src = avatarSrc;
        avatarElement.alt = `${sender} 头像`;
        // Add error handling for broken images
        avatarElement.onerror = () => {
            console.warn(`Failed to load avatar: ${avatarSrc}. Using default.`);
            // Fallback to defined defaults on error
            avatarElement.src = isUser ? defaultUserAvatar : defaultAiAvatar;
        };

        // --- Message Content Bubble ---
        const messageContentElement = document.createElement('div');
        messageContentElement.classList.add('message-content');

        // --- Sender Name (inside the bubble) ---
        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        senderElement.textContent = sender;
        messageContentElement.appendChild(senderElement); // Sender goes inside the bubble now

        // --- Content Wrapper (for text and image, inside the bubble) ---
        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('content-wrapper'); // Keep this class if needed for styling

        // Handle potential old string format or new object format
        const textContent = (typeof contentData === 'string') ? contentData : contentData.text;
        const imageBase64 = (typeof contentData === 'object' && contentData.image) ? contentData.image : null;

        // Display image if present
        if (imageBase64) {
            const imgElement = document.createElement('img');
            imgElement.src = imageBase64;
            imgElement.alt = "用户图片";
            imgElement.style.maxWidth = '200px'; // Limit display size
            imgElement.style.maxHeight = '200px';
            imgElement.style.display = 'block';
            imgElement.style.marginTop = '5px';
            imgElement.style.borderRadius = '4px';
            contentWrapper.appendChild(imgElement);
        }

        // Display text content if present
        if (textContent || isLoading) {
            const contentElement = document.createElement('div');
            contentElement.classList.add('content'); // Keep this class if needed
            
            // --- MODIFICATION START ---
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
                if (beforeText) {
                    finalHtml += (typeof marked !== 'undefined') ? marked.parse(beforeText) : beforeText.replace(/\n/g, '<br>');
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
                    const toolNameMatchResult = toolContent.match(toolNameInnerRegex);
                    let formattedContent = 'ToolUse: Unknown';
                    if (toolNameMatchResult && toolNameMatchResult[1]) {
                        formattedContent = `ToolUse: ${toolNameMatchResult[1].trim()}`;
                    }
                    finalHtml += `<div class="tool-use-bubble">${formattedContent}</div>`;
                }
                lastIndex = index + match.length;
                return match; 
            });

            const afterText = preprocessedText.slice(lastIndex);
            if (afterText) {
                finalHtml += (typeof marked !== 'undefined') ? marked.parse(afterText) : afterText.replace(/\n/g, '<br>');
            }
            
            // If preprocessedText was empty or only contained special blocks that were fully processed,
            // finalHtml might be built correctly. If preprocessedText had content but no special blocks,
            // the loop wouldn't run, lastIndex would be 0, and afterText would be the whole preprocessedText.
            // This case is handled.
            // If preprocessedText is not empty AND finalHtml is empty (meaning no special blocks and afterText logic didn't run, which is unlikely with current afterText logic)
            // This check ensures that if for some reason the above logic results in an empty finalHtml for non-empty text, it gets parsed.
            if (preprocessedText && !finalHtml.trim() && !combinedRegex.test(preprocessedText)) { // Added a check to ensure we don't parse empty strings or if it was already handled
                 finalHtml = (typeof marked !== 'undefined') ? marked.parse(preprocessedText) : preprocessedText.replace(/\n/g, '<br>');
            }


            contentElement.innerHTML = finalHtml;
            // --- MODIFICATION END ---

             if (isLoading) {
                 const loadingIndicator = document.createElement('span');
                 loadingIndicator.classList.add('loading-indicator');
                 contentElement.appendChild(loadingIndicator);
                 // Keep track of loading state on the main message element, not just content
                 messageElement.dataset.loadingId = sender;
             }
            contentWrapper.appendChild(contentElement);
        }

        messageContentElement.appendChild(contentWrapper); // Add content wrapper to the bubble

        // --- Assemble Message Element ---
        // Order depends on user vs AI (CSS flex-direction handles visual order)
        messageElement.appendChild(avatarElement);
        messageElement.appendChild(messageContentElement);

        chatMessages.appendChild(messageElement);
        scrollToBottom();
    }

     /** Update a loading message with AI response content (handles text only for now) */
    function updateLoadingMessage(sender, textContent, isFinalUpdate = false) {
        const loadingMessage = chatMessages.querySelector(`.message[data-loading-id="${sender}"]`);
        if (loadingMessage) {
            // Find the text content element within the wrapper
            let contentElement = loadingMessage.querySelector('.content-wrapper .content');

            // If no text content element exists yet (e.g., first chunk), create it
            if (!contentElement) {
                 const contentWrapper = loadingMessage.querySelector('.content-wrapper');
                 if (contentWrapper) {
                     contentElement = document.createElement('div');
                     contentElement.classList.add('content');
                     contentWrapper.appendChild(contentElement);
                 } else {
                     console.error("Could not find content wrapper for loading message:", sender);
                     return; // Cannot update if wrapper is missing
                 }
            }

            // --- MODIFICATION START ---
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
                if (beforeText) {
                    finalHtml += (typeof marked !== 'undefined') ? marked.parse(beforeText) : beforeText.replace(/\n/g, '<br>');
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
                    const toolNameMatchResult = toolContent.match(toolNameInnerRegex);
                    let formattedContent = 'ToolUse: Unknown';
                    if (toolNameMatchResult && toolNameMatchResult[1]) {
                        formattedContent = `ToolUse: ${toolNameMatchResult[1].trim()}`;
                    }
                    finalHtml += `<div class="tool-use-bubble">${formattedContent}</div>`;
                }
                lastIndex = index + match.length;
                return match;
            });

            const afterText = preprocessedText.slice(lastIndex);
            if (afterText) {
                finalHtml += (typeof marked !== 'undefined') ? marked.parse(afterText) : afterText.replace(/\n/g, '<br>');
            }
            
            if (preprocessedText && !finalHtml.trim() && !combinedRegex.test(preprocessedText)) {
                 finalHtml = (typeof marked !== 'undefined') ? marked.parse(preprocessedText) : preprocessedText.replace(/\n/g, '<br>');
            }

            contentElement.innerHTML = finalHtml;
            // --- MODIFICATION END ---


            // Handle loading indicator - Append it AFTER parsing the content
            let loadingIndicator = contentElement.querySelector('.loading-indicator');
            if (!isFinalUpdate) {
                if (!loadingIndicator) {
                    loadingIndicator = document.createElement('span');
                    loadingIndicator.classList.add('loading-indicator');
                    // Append the indicator after the parsed HTML content
                    contentElement.appendChild(loadingIndicator);
                }
            } else {
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                delete loadingMessage.dataset.loadingId; // Remove marker only on final update
            }

        } else if (!isFinalUpdate) {
            console.error(`Loading message for ${sender} not found during stream update.`);
        } else {
            // Fallback: If loading message not found for final update, append as new message
            console.warn(`Loading message for ${sender} not found for final update. Appending as new message.`);
            // Append final content (assuming text only from AI for now)
            // Ensure this fallback also uses the new parsing logic if needed, though typically final AI responses are plain text.
            // For simplicity, keeping the original fallback here, but it could also call the new parsing logic.
            // appendMessage(sender, { text: textContent }, false); // This would re-run the full appendMessage.
            // Let's just update the content directly if the element was supposed to be there.
            // If it truly wasn't, then a new append might be needed, but that suggests a deeper issue.
            // The original fallback was:
            // appendMessage(sender, { text: textContent }, false);
            // This is probably fine, as it will go through the corrected appendMessage logic.
            // However, to avoid potential infinite loops or re-displaying, let's make it simpler:
            // If the loading message is gone, it means it was finalized or removed.
            // We should probably log this and not try to append again unless it's a brand new message.
            // The original code had a console.error and then appendMessage.
            // Let's stick to that pattern but be mindful.
             appendMessage(sender, { text: textContent }, false); // Re-evaluate if this is the best fallback.
        }
        scrollToBottom();
    }
    /** Scroll the chat messages div to the bottom */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /** Update the AI status display in the header */
    function updateAiStatus() {
        aiStatusDiv.innerHTML = ''; // Clear previous status
        activeModels.forEach((model, index) => {
            const statusSpan = document.createElement('span');
            statusSpan.textContent = `${index + 1}. ${model.Name}`;
            aiStatusDiv.appendChild(statusSpan);
        });
    }

    /** Setup AI buttons for ButtonSend mode */
    function setupAiButtons() {
        aiButtonsDiv.innerHTML = ''; // Clear previous buttons
        if (config.AI_CHAT_MODE === 'ButtonSend') {
            activeModels.forEach((model, index) => {
                const button = document.createElement('button');
                button.textContent = `邀请 ${model.Name} 发言`;
                button.dataset.modelIndex = index; // Store index (0-based)
                button.addEventListener('click', () => handleAiButtonSend(index));
                aiButtonsDiv.appendChild(button);
            });
            aiButtonsDiv.style.display = 'flex'; // Show the button area
        } else {
            aiButtonsDiv.style.display = 'none'; // Hide if not in ButtonSend mode
        }
    }

    /** Handle image file selection */
    function handleImageSelection(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImageBase64 = e.target.result; // Store base64 data
                displayImagePreview(selectedImageBase64);
            }
            reader.readAsDataURL(file);
        } else {
             // Reset if invalid file selected
             removeSelectedImage();
             if (file) { // Only alert if a file was actually selected but was wrong type
                 alert("请选择一个图片文件。");
             }
        }
         // Reset file input value so the same file can be selected again if removed
         imageInput.value = null;
    }

    /** Display the image preview */
    function displayImagePreview(base64Data) {
        imagePreview.src = base64Data;
        imagePreviewArea.style.display = 'block'; // Show the preview area
    }

    /** Remove the selected image and hide preview */
    function removeSelectedImage() {
        selectedImageBase64 = null;
        imagePreview.src = '#'; // Clear preview source
        imagePreviewArea.style.display = 'none'; // Hide the preview area
        imageInput.value = null; // Reset file input
    }


    /** Handle user sending a message (with potential image) */
    function handleSendMessage() {
        const messageText = messageInput.value.trim();

        // Require either text or an image to send
        if ((!messageText && !selectedImageBase64) || isAiResponding) {
            return;
        }

        // 1. Prepare message content object
        const messageContent = {};
        if (messageText) {
            messageContent.text = messageText;
        }
        if (selectedImageBase64) {
            messageContent.image = selectedImageBase64;
        }

        // 2. Display user message (with image if present)
        const userName = config?.User_Name || "User"; // Use optional chaining as config might be loading initially
        appendMessage(userName, messageContent, true);

        // 3. Add to history and save
        chatHistory.push({ role: 'user', name: userName, content: messageContent });
        saveChatHistory();

        // 4. Clear input, image selection, and readjust height
        messageInput.value = '';
        removeSelectedImage(); // Clear image state and preview
        adjustTextareaHeight();

        // Check for "@所有人" command
        if (messageText.includes('@所有人')) {
            console.log("Detected '@所有人' command.");
            isAtAllTriggered = true;
        }

        // 5. Trigger AI response(s)
        triggerAiResponse();
    }

    /** Handle inviting a specific AI in ButtonSend mode */
    function handleAiButtonSend(modelIndex) {
        if (isAiResponding) {
            console.log("AI is already responding.");
            return;
        }
        const model = activeModels[modelIndex];
        if (model) {
            console.log(`Inviting ${model.Name} to respond.`);
            isAiResponding = true; // Set flag
            setUiResponding(true);
            callAiApi(model); // Call API for the specific model
        } else {
            console.error(`Invalid model index: ${modelIndex}`);
        }
    }


    /** Determine which AI(s) should respond based on mode */
    async function triggerAiResponse() {
        if (!config) {
            console.error("Cannot trigger AI response: Config not loaded yet.");
            return;
        }
        if (isAiResponding && config.AI_CHAT_MODE !== 'ButtonSend') {
            console.log("AI response cycle already in progress.");
            return; // Avoid overlapping triggers unless it's button mode
        }
        isAiResponding = true; // Set flag
        setUiResponding(true); // Disable input/buttons

        const mode = config.AI_CHAT_MODE; // Now safe to access
        let potentialSpeakers = [];

        // 1. Determine POTENTIAL speakers based on mode
        switch (mode) {
            case 'sequentialQueue':
                potentialSpeakers = [...activeModels]; // All models in original order
                break;
            case 'shuffledQueue':
                // Generate a new shuffled order of indices for *this turn*
                const shuffledIndicesThisTurn = activeModels.map((_, index) => index).sort(() => Math.random() - 0.5);
                potentialSpeakers = shuffledIndicesThisTurn.map(index => activeModels[index]);
                break;
            case 'randomSubsetQueue':
                const subsetSize = Math.floor(Math.random() * activeModels.length) + 1;
                const shuffledIndices = activeModels.map((_, index) => index).sort(() => Math.random() - 0.5);
                const subsetIndices = shuffledIndices.slice(0, subsetSize);
                potentialSpeakers = subsetIndices.map(index => activeModels[index]);
                break;
            case 'NatureRandom':
                potentialSpeakers = determineNatureRandomSpeakers(); // This function returns the potential speakers directly
                break;
            case 'ButtonSend':
                isAiResponding = false;
                setUiResponding(false);
                return; // Exit early for ButtonSend
            default:
                console.error(`Unknown AI_CHAT_MODE: ${mode}`);
                isAiResponding = false; // Reset flag on error
                setUiResponding(false);
                updateFloatingAiWindow([]); // Clear window on error
                return;
        }

        // 2. Filter out excluded AIs for THIS round
        let actualSpeakers;
        if (isAtAllTriggered) {
            console.log("@所有人 is active: Forcing all non-muted/non-excluded AIs to respond.");
            actualSpeakers = activeModels.filter(model => 
                !excludedAiForNextRound.has(model.Name) && 
                !persistentlyMutedAiNames.has(model.Name)    
            );
            console.log(`@所有人 speakers (after mute/exclude filter): ${actualSpeakers.map(m => m.Name).join(', ')}`);
        } else {
            // Normal filtering logic
            actualSpeakers = potentialSpeakers.filter(model =>
                !excludedAiForNextRound.has(model.Name) && 
                !persistentlyMutedAiNames.has(model.Name) && 
                !aiOptedOutLastRound.has(model.Name)         
            );
        }

        console.log(`Potential speakers (mode-based): ${potentialSpeakers.map(m => m.Name).join(', ')}`);
        if (excludedAiForNextRound.size > 0 || persistentlyMutedAiNames.size > 0 || aiOptedOutLastRound.size > 0 || isAtAllTriggered) { 
             const excludedThisRound = Array.from(excludedAiForNextRound);
             const mutedPersistently = Array.from(persistentlyMutedAiNames);
             const optedOutLastRound = Array.from(aiOptedOutLastRound);
             console.log(`Excluding (user, next round only): ${excludedThisRound.length > 0 ? excludedThisRound.join(', ') : 'None'}`);
             console.log(`Muted (user, persistently): ${mutedPersistently.length > 0 ? mutedPersistently.join(', ') : 'None'}`);
             console.log(`Opted Out (AI, last round): ${optedOutLastRound.length > 0 ? optedOutLastRound.join(', ') : 'None'}`);
             console.log(`Actual speakers: ${actualSpeakers.map(m => m.Name).join(', ')}`);
        }

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
        updateFloatingAiWindow(activeModels);
    }

     /** Enable/disable UI elements during AI response */
    function setUiResponding(isResponding) {
        if (!config) return; 
        messageInput.disabled = isResponding;
        sendButton.disabled = isResponding;
        if (config.AI_CHAT_MODE === 'ButtonSend') {
            aiButtonsDiv.querySelectorAll('button').forEach(button => {
                button.disabled = isResponding;
            });
        }
        sendButton.textContent = isResponding ? "思考中..." : "发送";
    }

    /**
     * Helper function for NatureRandom mode to determine speakers for the next round.
     * Handles the first turn logic internally.
     * @returns {Array<Object>} An array of AI model objects that should speak.
     */
    function determineNatureRandomSpeakers() {
        const isFirstTurn = chatHistory.length === 1; 
        let lastRoundMessages = [];

        if (isFirstTurn) {
            console.log("NatureRandom: Handling first turn.");
            lastRoundMessages = [chatHistory[0]]; 
        } else {
            let lastUserMessageIndex = -1;
            for (let i = chatHistory.length - 2; i >= 0; i--) {
                if (chatHistory[i].role === 'user') {
                    lastUserMessageIndex = i;
                    break;
                }
            }

            if (lastUserMessageIndex === -1 && chatHistory.length > 1) {
                 console.warn("NatureRandom: Could not find previous user message, analyzing entire history for mentions.");
                 lastRoundMessages = chatHistory.slice(0, chatHistory.length);
            } else if (lastUserMessageIndex !== -1) {
                 lastRoundMessages = chatHistory.slice(lastUserMessageIndex);
            } else {
                 console.warn("NatureRandom: Unexpected state in determining last round messages.");
                 lastRoundMessages = chatHistory.slice(0); 
            }
        }

        const allIndividualTags = new Set();
        activeModels.forEach(model => {
            if (model.Tag && typeof model.Tag === 'string') {
                model.Tag.split(',') 
                         .map(tag => tag.trim()) 
                         .filter(tag => tag) 
                         .forEach(tag => allIndividualTags.add(tag)); 
            }
        });

        if (allIndividualTags.size === 0) {
             console.warn("NatureRandom: No valid individual tags found in active models. Falling back to random subset.");
             const subsetSize = Math.floor(Math.random() * activeModels.length) + 1;
             const shuffledIndices = activeModels.map((_, index) => index).sort(() => Math.random() - 0.5);
             const subsetIndices = shuffledIndices.slice(0, subsetSize);
             return subsetIndices.map(index => activeModels[index]);
        }

        const escapedIndividualTags = Array.from(allIndividualTags).map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const tagRegex = new RegExp(`(${escapedIndividualTags.join('|')})`, 'g'); 

        const userMentionedTags = new Set();
        const aiMentionedTags = new Set();

        lastRoundMessages.forEach(msg => {
            const text = msg.content?.text;
            if (text) {
                const matches = text.match(tagRegex);
                if (matches) {
                    const uniqueMatchesInMsg = new Set(matches); 
                    if (msg.role === 'user') {
                        uniqueMatchesInMsg.forEach(tag => userMentionedTags.add(tag));
                    } else { 
                        uniqueMatchesInMsg.forEach(tag => aiMentionedTags.add(tag));
                    }
                }
            }
        });

        const nextSpeakers = [];
        const mentionedSpeakers = new Set(); 

        const modelHasMentionedTag = (model, mentionedTagSet) => {
            if (!model.Tag || typeof model.Tag !== 'string') return false;
            const modelTags = model.Tag.split(',').map(t => t.trim()).filter(t => t);
            return modelTags.some(tag => mentionedTagSet.has(tag));
        };

        activeModels.forEach(model => {
            if (modelHasMentionedTag(model, userMentionedTags)) {
                nextSpeakers.push(model);
                mentionedSpeakers.add(model.Name); 
            }
        });

        activeModels.forEach(model => {
            if (!mentionedSpeakers.has(model.Name) && modelHasMentionedTag(model, aiMentionedTags)) {
                nextSpeakers.push(model);
                mentionedSpeakers.add(model.Name);
            }
        });

        const mentionProbability = 1 / (config.AI_LIST || activeModels.length); 
        activeModels.forEach(model => {
            if (!mentionedSpeakers.has(model.Name)) {
                if (Math.random() < mentionProbability) {
                    nextSpeakers.push(model);
                }
            }
        });

        if (nextSpeakers.length === 0 && activeModels.length > 0) {
             console.log("NatureRandom: No speakers selected, forcing one random speaker.");
             const randomIndex = Math.floor(Math.random() * activeModels.length);
             nextSpeakers.push(activeModels[randomIndex]);
        }

        return nextSpeakers; 
    }



    /** Highlight @mentions in text content */
    function highlightMentions(text) {
        if (!text || typeof text !== 'string' || !config || !config.models) {
            return text; 
        }

        const allIndividualTags = new Set();
        activeModels.forEach(model => {
            if (model.Tag && typeof model.Tag === 'string') {
                model.Tag.split(',') 
                         .map(tag => tag.trim()) 
                         .filter(tag => tag) 
                         .forEach(tag => allIndividualTags.add(tag)); 
            }
        });

        const escapedIndividualTags = Array.from(allIndividualTags).map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const tagPatternPart = escapedIndividualTags.length > 0 ? `|@(?:${escapedIndividualTags.join('|')})` : '';
        // Ensure @所有人 is treated as a whole word, and other tags are also whole words (preceded by @)
        const mentionRegex = new RegExp(`(@所有人${tagPatternPart})(?![\\w-])`, 'g');


        return text.replace(mentionRegex, (match) => {
            return `<span class="mention-highlight">${match}</span>`;
        });
    }

    /** Construct prompt and call the AI API (handles multimodal) */
    async function callAiApi(model, retryCount = 0) {
        if (!config) {
             console.error("Cannot call API: Config not loaded yet.");
             setUiResponding(false); 
             isAiResponding = false;
             return;
        }
        if (!model) {
            console.error("Attempted to call API with an invalid model.");
            if (config.AI_CHAT_MODE !== 'ButtonSend') {
                 isAiResponding = false;
                 setUiResponding(false);
            }
            return;
        }

        const retryText = retryCount > 0 ? `(重试 ${retryCount}/2)` : '';
        console.log(`Calling API for: ${model.Name} ${retryText}`);
        if (retryCount > 0) {
            updateLoadingMessage(model.Name, `重新连接中${retryText}...`, false);
        } else {
            appendMessage(model.Name, {text:'...'}, false, true);  // Ensure content is an object
        }

        const messages = [];
        const currentTime = new Date().toLocaleString('zh-CN');
        const groupPrompt = (config.GroupPrompt || "").replace("{{Date::time}}", currentTime);
        
        // Combine USER_Prompt, GroupPrompt, and model.SystemPrompts into a single system message
        let combinedSystemPrompt = `${config.USER_Prompt || ""}\n${groupPrompt}`;
        if (model.SystemPrompts && model.SystemPrompts.trim()) {
            combinedSystemPrompt += `\n${model.SystemPrompts}`;
        }

        if (combinedSystemPrompt.trim()) {
            messages.push({ role: 'system', content: combinedSystemPrompt });
        }

        // Add actual chat history messages
        chatHistory.forEach(msg => {
            const apiMessage = { role: msg.role === 'user' ? 'user' : 'assistant', name: msg.name };
            const content = msg.content || {};
            const senderName = msg.name || (msg.role === 'user' ? config.User_Name || 'User' : 'AI');
            const senderPrefix = `${senderName}: `;

            if (content.image && model.Image) { // Check if the current model supports images
                 apiMessage.content = [];
                 const textPart = content.text ? senderPrefix + content.text : senderPrefix + "[图片]";
                 apiMessage.content.push({ type: "text", text: textPart });
                 apiMessage.content.push({
                     type: "image_url",
                     image_url: { url: content.image } // Assuming content.image is base64 data URL
                 });
            } else if (content.text) {
                 apiMessage.content = senderPrefix + content.text;
            } else if (content.image && !model.Image) { // Model doesn't support image, send placeholder
                 apiMessage.content = senderPrefix + "[图片]"; // Send placeholder text
            }
             else {
                 // console.warn("Skipping history message with no text or image content:", msg);
                 return; // Skip if no content
             }
             messages.push(apiMessage);
        });


        // Add InvitePrompts as the final user message
        if (model.InvitePrompts && model.InvitePrompts.trim()) {
            messages.push({ role: 'user', content: model.InvitePrompts });
        }


        if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'system')) {
             console.error("No valid messages to send to the API.");
             updateLoadingMessage(model.Name, "错误：没有有效内容发送给 AI。", true);
             if (config.AI_CHAT_MODE !== 'ButtonSend') {
                 isAiResponding = false; // Should already be false if loop finishes
                 // setUiResponding(false); // This is handled after the loop in triggerAiResponse
             } else { // ButtonSend specific reset
                 isAiResponding = false;
                 setUiResponding(false);
             }
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
                 console.log(`Websearch enabled for ${model.Name}, adding google_search tool.`);
                 requestBody.tools = [
                     {
                         type: "function",
                         function: {
                             name: "google_search",
                             description: "Perform a Google search to find information on the web.",
                             parameters: {
                                 type: "object",
                                 properties: {
                                     query: {
                                         type: "string",
                                         description: "The search query string."
                                     }
                                 },
                                 required: ["query"]
                             }
                         }
                     }
                 ];
                 requestBody.tool_choice = "auto";
            }

            const apiUrl = config.API_URl || ""; 
            if (!apiUrl) {
                console.error("API URL is not defined in the config.");
                updateLoadingMessage(model.Name, "错误：API URL 未在配置中定义。", true); // Use updateLoadingMessage
                // appendMessage("System", { text: "错误：API URL 未在配置中定义。" }, false);
                // setUiResponding(false); // Handled by triggerAiResponse or button send logic
                // isAiResponding = false;
                return; 
            }
            const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.API_Key}`
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(config.API_Timeout * 1000) 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                console.error(`API Error for ${model.Name}: ${response.status}`, errorData);

                if (retryCount < 2) {
                    console.log(`Retrying API call for ${model.Name} after HTTP error ${response.status}, attempt ${retryCount + 1}/2`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
                    return await callAiApi(model, retryCount + 1); // Return the promise
                }

                updateLoadingMessage(model.Name, `错误: ${errorData.message || response.statusText} (已重试${retryCount}次)`, true);
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorData.message || response.statusText} (已重试${retryCount}次)` } });
                saveChatHistory();
                 // No direct isAiResponding = false here; let the calling context handle it.
                return; // Return to indicate failure after retries
            }

            if (config.StreamingOutput) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedResponse = "";
                let buffer = ""; 

                while (true) {
                    const { done, value } = await reader.read(); 
                    if (done) {
                        console.log(`[STREAM END - ${model.Name}] Stream reader reported 'done'. Final accumulated response: "${accumulatedResponse}"`);
                        break; 
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); 

                    let breakOuterLoop = false;
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataString = line.substring(6).trim();
                            if (dataString === '[DONE]') { 
                                console.log(`[STREAM END - ${model.Name}] Received 'data: [DONE]' signal. Final accumulated response before [DONE]: "${accumulatedResponse}"`);
                                buffer = '[DONE]'; 
                                breakOuterLoop = true; 
                                break; 
                            }
                            try {
                                const chunk = JSON.parse(dataString);
                                let choice = chunk.choices && chunk.choices[0];
                                if (choice) { 
                                    if (choice.delta) { 
                                        if (choice.delta.content) {
                                            const contentPiece = choice.delta.content;
                                            if (contentPiece) { 
                                                accumulatedResponse += contentPiece;
                                                updateLoadingMessage(model.Name, accumulatedResponse + "...", false); 
                                            }
                                        }
                                        if (choice.delta.tool_calls) {
                                            console.log(`[STREAM EVENT - ${model.Name}] AI signaled tool_calls:`, JSON.stringify(choice.delta.tool_calls), `| Current accumulated text: "${accumulatedResponse}"`);
                                        }
                                    } 
                                    if (choice.finish_reason) {
                                        console.log(`[STREAM EVENT - ${model.Name}] Finish reason in chunk: "${choice.finish_reason}". | Current accumulated text: "${accumulatedResponse}"`);
                                        if (choice.finish_reason === 'tool_calls') {
                                            console.log(`[STREAM INFO - ${model.Name}] AI indicates tool_calls are part of its turn. Stream MUST remain open for tool's output processing and subsequent AI generation. Client will continue listening.`);
                                        } else if (choice.finish_reason === 'stop') {
                                            console.log(`[STREAM INFO - ${model.Name}] AI indicates it has finished generating content for this turn. Expecting server to send 'data: [DONE]' signal soon.`);
                                        }
                                    }
                                } 
                            } catch (error) {
                                console.error(`[STREAM ERROR - ${model.Name}] Error parsing stream chunk. Data: "${dataString}". Error:`, error);
                            }
                        }
                    } 

                    if (breakOuterLoop || buffer === '[DONE]') { 
                        if(buffer==='[DONE]' && !breakOuterLoop) console.log(`[STREAM END - ${model.Name}] Outer loop breaking due to [DONE] signal processed from buffer. Final accumulated: "${accumulatedResponse}"`);
                        break; 
                    }
                } 

                 let finalResponseText = accumulatedResponse;
                 if (finalResponseText.endsWith('[[QuitGroup]]')) {
                     console.log(`${model.Name} opted out for the next round.`);
                     aiOptedOutLastRound.add(model.Name);
                     finalResponseText = finalResponseText.slice(0, -'[[QuitGroup]]'.length).trim();
                 }
                updateLoadingMessage(model.Name, finalResponseText, true); 

                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: finalResponseText } });
                saveChatHistory();

            } else {
                // Non-streaming response handling
                const responseData = await response.json();
                let fullContent = "";

                if (responseData.choices?.[0]?.message?.tool_calls) {
                    console.log(`[NON-STREAM DIAGNOSTIC - ${model.Name}] AI response includes tool_calls:`, JSON.stringify(responseData.choices[0].message.tool_calls));
                }
                
                fullContent = responseData.choices?.[0]?.message?.content || "未能获取响应内容";

                 if (fullContent.endsWith('[[QuitGroup]]')) {
                     console.log(`${model.Name} opted out for the next round.`);
                     aiOptedOutLastRound.add(model.Name);
                     fullContent = fullContent.slice(0, -'[[QuitGroup]]'.length).trim();
                 }

                updateLoadingMessage(model.Name, fullContent, true); 
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: fullContent } });
                saveChatHistory();
            }
        } catch (error) {
            console.error(`Error calling API for ${model.Name}:`, error);
            if (retryCount < 2) {
                console.log(`Retrying API call for ${model.Name}, attempt ${retryCount + 1}/2`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await callAiApi(model, retryCount + 1); // Return the promise
            }

            let errorMessage = "API 请求失败";
            if (error.name === 'TimeoutError') {
                errorMessage = "API 请求超时";
            } else if (error instanceof TypeError) { // Catch network errors specifically
                errorMessage = "网络错误或无法连接到 API";
            }
            updateLoadingMessage(model.Name, `错误: ${errorMessage} (已重试${retryCount}次)`, true); 
            chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorMessage} (已重试${retryCount}次)` } });
            saveChatHistory(); 
            // No direct isAiResponding = false here; let the calling context handle it.
        } finally {
             // This finally block ensures that for ButtonSend mode, UI is re-enabled
             // For other modes, isAiResponding is managed by triggerAiResponse loop
             if (config.AI_CHAT_MODE === 'ButtonSend') {
                 isAiResponding = false; 
                 setUiResponding(false); 
             }
        }
    }

    /** Update the floating AI status window to show all active models and their status, greying out non-speakers */
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
                        console.log(`Persistent mute removed for ${aiNameToMute}.`);
                    } else {
                        persistentlyMutedAiNames.add(aiNameToMute);
                        e.target.classList.add('muted');
                        e.target.title = `点击取消对 ${aiNameToMute} 的持续禁言`;
                        console.log(`Persistent mute added for ${aiNameToMute}.`);
                    }
                    saveMutedAiNames(); 
                }
            });

            const closeBtn = document.createElement('button');
            closeBtn.classList.add('close-ai-btn');
            closeBtn.textContent = 'X';
            closeBtn.dataset.aiName = model.Name; 

            const isExcludedNextRound = excludedAiForNextRound.has(model.Name) || aiOptedOutLastRound.has(model.Name);
            if (isExcludedNextRound) {
                closeBtn.classList.add('excluded-next-round');
                closeBtn.title = `${model.Name} 将在下一轮被跳过`;
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
                        console.log(`User un-marked ${aiNameToExclude} for exclusion next round.`);
                    } else {
                        excludedAiForNextRound.add(aiNameToExclude);
                        button.classList.add('excluded-next-round');
                        button.title = `${aiNameToExclude} 已被标记，将在下一轮被跳过`;
                        console.log(`User marked ${aiNameToExclude} for exclusion next round.`);
                    }
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

        const phoneImages = [
            'Phone餐厅.png',
            'phone街头.png', 
            'Phone客厅.png',
            'Phone书房.png',
            'Phone卧室.png'
        ];
        const winImages = [
            'Win餐厅.png',
            'Win晨间卧室.png',
            'Win厨房.png',
            'Win书房.png',
            'Win浴室.png'
        ];

        let selectedImageList;

        if (window.innerWidth <= 768) {
            selectedImageList = phoneImages;
            console.log("Using Phone background images.");
        } else {
            selectedImageList = winImages;
            console.log("Using Win background images.");
        }

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

    /** Sets a random background image for the main body */
    function setBodyBackground() {
        const imageDir = 'image/Wallpaper/'; 
        const wallpaperImages = [
            'ComfyUI_134901_177920272026190_00001.png',
            'ComfyUI_135039_177581081695754_00003.png',
            'ComfyUI_135246_390494183581112_00005.png',
            'ComfyUI_135334_868574652531835_00006.png'
        ];

        if (wallpaperImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * wallpaperImages.length);
            const randomImageFile = wallpaperImages[randomIndex];
            const imageUrl = imageDir + randomImageFile;

            console.log(`Setting body background to: ${imageUrl}`);
            document.body.style.backgroundImage = `url('${imageUrl}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed'; 
        } else {
            console.warn("No wallpaper images found.");
            document.body.style.backgroundImage = 'none'; 
        }
    }
