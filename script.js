// --- Configuration Files ---
const availableConfigs = [
    { name: "默认配置", file: "config_default.js" },
    { name: "配置 1", file: "config1.js" },
    { name: "配置 2", file: "config2.js" }
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

    // Note: Other initializations (loadAllChatData, etc.) are moved into initializeApplication()

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    newChatButton.addEventListener('click', createNewSession);
    sessionSelect.addEventListener('change', (e) => switchSession(e.target.value));
    // Config change listener is added during initialization
    attachImageButton.addEventListener('click', () => imageInput.click()); // Trigger file input
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
        // Format: YYYY/MM/DD HH:MM:SS (adjust locale and options as needed)
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
        // We might keep it as a wrapper for clarity or remove it.
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
            // Use innerHTML and marked.parse to render Markdown
            // Highlight mentions before parsing Markdown
            const highlightedText = highlightMentions(textContent || '');
            if (typeof marked !== 'undefined') {
                // Use innerHTML for parsed Markdown which now includes the highlight spans
                contentElement.innerHTML = marked.parse(highlightedText);
            } else {
                // Fallback: Directly set innerHTML if marked is not loaded,
                // as highlightMentions already returns HTML.
                // Still replace newlines for basic formatting.
                contentElement.innerHTML = highlightedText.replace(/\n/g, '<br>');
            }


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


            // Update text content using marked.parse
            if (typeof marked !== 'undefined') {
                 // Highlight mentions before parsing Markdown
                 const highlightedText = highlightMentions(textContent || '');
                 if (typeof marked !== 'undefined') {
                     // Use innerHTML for parsed Markdown which now includes the highlight spans
                     contentElement.innerHTML = marked.parse(highlightedText);
                 } else {
                     // Fallback: Directly set innerHTML if marked is not loaded,
                     // as highlightMentions already returns HTML.
                     // Still replace newlines for basic formatting.
                     contentElement.innerHTML = highlightedText.replace(/\n/g, '<br>');
                 }
            }


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
            console.error(`Loading message for ${sender} not found for final update. Appending.`);
            // Append final content (assuming text only from AI for now)
            appendMessage(sender, { text: textContent }, false);
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
            // Add visual indicator for next AI in sequential mode? (Optional)
            // if (config.AI_CHAT_MODE === 'sequentialQueue' && index === currentAiIndex) {
            //     statusSpan.style.fontWeight = 'bold';
            // }
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
                // ButtonSend is handled differently, no automatic speakers here.
                // We still need to reset the UI and flag if no button was clicked.
                isAiResponding = false;
                setUiResponding(false);
                // Keep the window populated in ButtonSend mode, remove the clearing line:
                // updateFloatingAiWindow([]);
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
            actualSpeakers = activeModels.filter(model => // Start from all active models for @all
                !excludedAiForNextRound.has(model.Name) && // Still respect user's single-round exclusion
                !persistentlyMutedAiNames.has(model.Name)    // Still respect user's persistent mute
                // Ignore aiOptedOutLastRound for @all
            );
            console.log(`@所有人 speakers (after mute/exclude filter): ${actualSpeakers.map(m => m.Name).join(', ')}`);
        } else {
            // Normal filtering logic
            actualSpeakers = potentialSpeakers.filter(model =>
                !excludedAiForNextRound.has(model.Name) && // Filter based on single-round user exclusion
                !persistentlyMutedAiNames.has(model.Name) && // Filter based on persistent user mute
                !aiOptedOutLastRound.has(model.Name)         // Filter based on AI opt-out from last round
            );
        }

        console.log(`Potential speakers (mode-based): ${potentialSpeakers.map(m => m.Name).join(', ')}`);
        if (excludedAiForNextRound.size > 0 || persistentlyMutedAiNames.size > 0 || aiOptedOutLastRound.size > 0 || isAtAllTriggered) { // Added isAtAllTriggered here for logging context
             const excludedThisRound = Array.from(excludedAiForNextRound);
             const mutedPersistently = Array.from(persistentlyMutedAiNames);
             const optedOutLastRound = Array.from(aiOptedOutLastRound);
             console.log(`Excluding (user, next round only): ${excludedThisRound.length > 0 ? excludedThisRound.join(', ') : 'None'}`);
             console.log(`Muted (user, persistently): ${mutedPersistently.length > 0 ? mutedPersistently.join(', ') : 'None'}`);
             console.log(`Opted Out (AI, last round): ${optedOutLastRound.length > 0 ? optedOutLastRound.join(', ') : 'None'}`);
             console.log(`Actual speakers: ${actualSpeakers.map(m => m.Name).join(', ')}`);
        }

        // 3. IMPORTANT: Clear the SINGLE-ROUND exclusion lists (user & AI) for the *next* round immediately after filtering
        excludedAiForNextRound.clear();
        aiOptedOutLastRound.clear(); // Clear AI opt-out list for the next cycle
        // NOTE: persistentlyMutedAiNames is NOT cleared here.

        // 4. Update floating window to show who IS speaking this round (grey out others)
        updateFloatingAiWindow(activeModels, actualSpeakers);
        // 5. Call API for ACTUAL speakers
        if (actualSpeakers.length === 0) {
            console.log("No AI speakers left after exclusion.");
            // Optionally display a message indicating no one is responding this round
        } else {
            // Use a simple loop for sequential execution based on the mode's original intent
            // (e.g., sequentialQueue respects order, shuffledQueue respects its generated order)
            for (const model of actualSpeakers) {
                if (model) { // Double check model validity
                    console.log(`--- Calling AI: ${model.Name} ---`);
                    await callAiApi(model);
                } else {
                    console.error(`Found invalid model entry in actualSpeakers.`);
                }
            }
        }

        // 6. Reset flag and UI state after the response cycle completes
        isAiResponding = false;
        setUiResponding(false);
        isAtAllTriggered = false; // Reset the @all flag after the cycle
        // Update floating window status AFTER responses are done & temporary exclusions cleared
        // This shows the state for the *next* round's potential exclusions
        // Ensure the window reflects the state for the next round, showing all active models
        // Ensure the window reflects the state for the next round, showing all active models and resetting greying
        updateFloatingAiWindow(activeModels);

        /* --- Old switch logic removed, replaced by steps above ---
        switch (mode) {
            case 'sequentialQueue':
                console.log("Sequential Queue: All AIs responding in order.");
                const initialIndex = 0;
                for (let i = 0; i < activeModels.length; i++) {
                    const modelIndex = (initialIndex + i) % activeModels.length;
                    if(activeModels[modelIndex]) {
                         // --- DEBUGGING START ---
                         console.log(`--- Calling AI ${i+1}: ${activeModels[modelIndex].Name} ---`);
                         // Log history *before* this AI is called. Use slice() for a shallow copy
                         // to avoid potential issues if the object is mutated elsewhere unexpectedly.
                         console.log("Current chatHistory before call:", JSON.stringify(chatHistory.slice(), null, 2));
                         // --- DEBUGGING END ---
                         await callAiApi(activeModels[modelIndex]);
                         // --- DEBUGGING START ---
                         // Log history *after* this AI call completes and history should be updated
                         console.log(`Current chatHistory after call for ${activeModels[modelIndex].Name}:`, JSON.stringify(chatHistory.slice(), null, 2));
                         // --- DEBUGGING END ---
                    } else {
                         console.error(`Sequential Queue: Invalid model index ${modelIndex}`);
                    }
                }
                // currentAiIndex = 0; // Reset index for next user turn (already handled by initialIndex=0)
                break;

            case 'shuffledQueue':
                 console.log("Shuffled Queue: All AIs responding in random order this turn.");
                 // Generate a new shuffled order of indices for *this turn*
                 const shuffledIndicesThisTurn = activeModels.map((_, index) => index).sort(() => Math.random() - 0.5);

                 // Call all active models sequentially according to the shuffled order
                 for (const modelIndex of shuffledIndicesThisTurn) {
                     if(activeModels[modelIndex]) {
                          // --- DEBUGGING START (Optional, can be removed later) ---
                          console.log(`--- Calling AI (Shuffled): ${activeModels[modelIndex].Name} ---`);
                          console.log("Current chatHistory before call:", JSON.stringify(chatHistory.slice(), null, 2));
                          // --- DEBUGGING END ---
                          await callAiApi(activeModels[modelIndex]);
                           // --- DEBUGGING START (Optional) ---
                          console.log(`Current chatHistory after call for ${activeModels[modelIndex].Name}:`, JSON.stringify(chatHistory.slice(), null, 2));
                          // --- DEBUGGING END ---
                     } else {
                          console.error(`Shuffled Queue: Invalid model index ${modelIndex}`);
                     }
                 }
                 break;

            case 'randomSubsetQueue':
                // Decide how many AIs respond (e.g., 1 to all active AIs)
                const subsetSize = Math.floor(Math.random() * activeModels.length) + 1;
                // Get random indices without repetition
                const shuffledIndices = activeModels.map((_, index) => index).sort(() => Math.random() - 0.5);
                const subsetIndices = shuffledIndices.slice(0, subsetSize);

                console.log(`Random subset: ${subsetIndices.map(i => activeModels[i].Name).join(', ')}`);

                // Call APIs sequentially for the subset (could be parallelized with Promise.all for faster responses)
                for (const index of subsetIndices) {
                    await callAiApi(activeModels[index]);
                    // Optional: Add a small delay between subset responses if needed
                    // await new Promise(resolve => setTimeout(resolve, 200));
                }
                break;

            case 'ButtonSend':
                // In ButtonSend mode, AI response is triggered by button clicks (handleAiButtonSend)
                // No automatic triggering here, just re-enable UI if no AI was explicitly called yet.
                 isAiResponding = false; // Reset flag as no automatic call happens
                 setUiResponding(false);
                break;

            case 'NatureRandom':
                console.log("NatureRandom Mode: Determining next speakers based on last round.");
                console.log("NatureRandom Mode: Determining next speakers based on last round.");
                // determineNatureRandomSpeakers now handles the first turn correctly.
                const speakers = determineNatureRandomSpeakers(); // Now returns only the array

                console.log(`NatureRandom speakers determined: ${speakers.map(m => m.Name).join(', ')}`);
                for (const model of speakers) {
                    await callAiApi(model);
                }
                break;


            default:
                console.error(`Unknown AI_CHAT_MODE: ${config.AI_CHAT_MODE}`);
                isAiResponding = false; // Reset flag on error
                setUiResponding(false);
        }

         // Reset flag and UI state after the response cycle completes for auto modes
         if (mode !== 'ButtonSend') {
            isAiResponding = false;
            setUiResponding(false);
         }
        */
    }

     /** Enable/disable UI elements during AI response */
    function setUiResponding(isResponding) {
        if (!config) return; // Don't try to access config if not loaded
        messageInput.disabled = isResponding;
        sendButton.disabled = isResponding;
        // Disable AI buttons in ButtonSend mode as well
        if (config.AI_CHAT_MODE === 'ButtonSend') {
            aiButtonsDiv.querySelectorAll('button').forEach(button => {
                button.disabled = isResponding;
            });
        }
        // Optionally add a visual cue, like changing button text or adding a spinner
        sendButton.textContent = isResponding ? "思考中..." : "发送";
    }

    /**
     * Helper function for NatureRandom mode to determine speakers for the next round.
     * Handles the first turn logic internally.
     * @returns {Array<Object>} An array of AI model objects that should speak.
     */
    function determineNatureRandomSpeakers() {
        const isFirstTurn = chatHistory.length === 1; // Check if it's the very first user message
        let lastRoundMessages = [];

        if (isFirstTurn) {
            console.log("NatureRandom: Handling first turn.");
            lastRoundMessages = [chatHistory[0]]; // Only the user's first message
        } else {
            // Find the start index of the last round (last user message)
            let lastUserMessageIndex = -1;
            // Start search from second-to-last message to find the beginning of the *previous* round
            for (let i = chatHistory.length - 2; i >= 0; i--) {
                if (chatHistory[i].role === 'user') {
                    lastUserMessageIndex = i;
                    break;
                }
            }

            if (lastUserMessageIndex === -1 && chatHistory.length > 1) {
                 // This case means there's history, but no user message before the last AI responses.
                 // Analyze the entire history up to this point.
                 console.warn("NatureRandom: Could not find previous user message, analyzing entire history for mentions.");
                 lastRoundMessages = chatHistory.slice(0, chatHistory.length);
            } else if (lastUserMessageIndex !== -1) {
                 // Get messages from the last user message onwards
                 lastRoundMessages = chatHistory.slice(lastUserMessageIndex);
            } else {
                 // This should only happen if chatHistory has 0 or 1 message, handled by isFirstTurn
                 console.warn("NatureRandom: Unexpected state in determining last round messages.");
                 lastRoundMessages = chatHistory.slice(0); // Analyze what we have
            }
        }

        // 2. Extract Tags and create Regex (Moved down slightly)

        // 3. Extract Tags and create Regex
        const aiTags = activeModels.map(m => m.Tag).filter(tag => tag); // Get tags from active models
        if (aiTags.length === 0) {
             console.warn("NatureRandom: No tags found in active models. Falling back to random subset.");
             // Fallback: Select a random subset if no tags are defined
             const subsetSize = Math.floor(Math.random() * activeModels.length) + 1;
             const shuffledIndices = activeModels.map((_, index) => index).sort(() => Math.random() - 0.5);
             const subsetIndices = shuffledIndices.slice(0, subsetSize);
             return subsetIndices.map(index => activeModels[index]);
        }
        // Escape special regex characters in tags just in case
        const escapedTags = aiTags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const tagRegex = new RegExp(`(${escapedTags.join('|')})`, 'g'); // Match any of the tags

        // 4. Find mentioned tags
        const userMentionedTags = new Set();
        const aiMentionedTags = new Set();

        lastRoundMessages.forEach(msg => {
            const text = msg.content?.text;
            if (text) {
                const matches = text.match(tagRegex);
                if (matches) {
                    const uniqueMatchesInMsg = new Set(matches); // Unique tags mentioned in this specific message
                    if (msg.role === 'user') {
                        uniqueMatchesInMsg.forEach(tag => userMentionedTags.add(tag));
                    } else { // AI message
                        uniqueMatchesInMsg.forEach(tag => aiMentionedTags.add(tag));
                    }
                }
            }
        });

        // 5. Determine next speakers
        const nextSpeakers = [];
        const mentionedSpeakers = new Set(); // Keep track of who is already added

        // Priority 1: User mentioned (add in order found, or fixed order?) Let's use config order for consistency.
        activeModels.forEach(model => {
            if (model.Tag && userMentionedTags.has(model.Tag)) {
                nextSpeakers.push(model);
                mentionedSpeakers.add(model.Name); // Track by Name to avoid duplicates
            }
        });

        // Priority 2: AI mentioned (add if not already added)
        activeModels.forEach(model => {
            if (model.Tag && aiMentionedTags.has(model.Tag) && !mentionedSpeakers.has(model.Name)) {
                nextSpeakers.push(model);
                mentionedSpeakers.add(model.Name);
            }
        });

        // Priority 3: Random chance for unmentioned
        const mentionProbability = 1 / (config.AI_LIST || activeModels.length); // Use AI_LIST as per user spec
        activeModels.forEach(model => {
            if (!mentionedSpeakers.has(model.Name)) {
                if (Math.random() < mentionProbability) {
                    nextSpeakers.push(model);
                    // No need to add to mentionedSpeakers here, already checked
                }
            }
        });

        // --- Ensure at least one speaker if no mentions/probability hits (for any turn) ---
        if (nextSpeakers.length === 0 && activeModels.length > 0) {
             console.log("NatureRandom: No speakers selected, forcing one random speaker.");
             const randomIndex = Math.floor(Math.random() * activeModels.length);
             nextSpeakers.push(activeModels[randomIndex]);
        }
        // --- End of guarantee ---

        return nextSpeakers; // Return just the array of speakers
    }



    /** Highlight @mentions in text content */
    function highlightMentions(text) {
        if (!text || typeof text !== 'string' || !config || !config.models) {
            return text; // Return original text if invalid input or config not ready
        }

        // 1. Get all valid tags from config, filter out empty/null tags
        const validTags = config.models.map(m => m.Tag).filter(tag => tag && typeof tag === 'string' && tag.trim() !== '');

        // 2. Escape special regex characters in tags
        const escapedTags = validTags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // 3. Create the regex pattern: @所有人 OR @tag1 OR @tag2 ...
        // Ensure tags are included only if the list is not empty
        const tagPatternPart = escapedTags.length > 0 ? `|@(?:${escapedTags.join('|')})` : '';
        const mentionRegex = new RegExp(`(@所有人${tagPatternPart})(?![\\w-])`, 'g'); // Match mentions not followed by more word chars/hyphen

        // 4. Replace matches with highlighted span
        // Using a function in replace allows checking if the match is valid before wrapping
        return text.replace(mentionRegex, (match) => {
             // Optional: Add extra validation here if needed, e.g., check against a dynamic list
             return `<span class="mention-highlight">${match}</span>`;
        });
    }

    /** Construct prompt and call the AI API */
    /** Construct prompt and call the AI API (handles multimodal) */
    async function callAiApi(model, retryCount = 0) {
        if (!config) {
             console.error("Cannot call API: Config not loaded yet.");
             setUiResponding(false); // Re-enable UI if we can't proceed
             isAiResponding = false;
             return;
        }
        if (!model) {
            console.error("Attempted to call API with an invalid model.");
            // Reset state if necessary, depending on the mode
            if (config.AI_CHAT_MODE !== 'ButtonSend') {
                 isAiResponding = false;
                 setUiResponding(false);
            }
            return;
        }

        // 显示重试信息（如果是重试的话）
        const retryText = retryCount > 0 ? `(重试 ${retryCount}/2)` : '';
        console.log(`Calling API for: ${model.Name} ${retryText}`);
        if (retryCount > 0) {
            updateLoadingMessage(model.Name, `重新连接中${retryText}...`, false);
        } else {
            appendMessage(model.Name, '...', false, true); // 首次尝试时显示加载指示器
        }

        // 已在函数开始处处理了加载指示器和日志

        // 1. Construct System Prompt
        // Replace placeholder for time - consider a more robust templating method if needed
        const currentTime = new Date().toLocaleString('zh-CN');
        const groupPrompt = (config.GroupPrompt || "").replace("{{Date::time}}", currentTime);
        const systemPromptContent = `${config.USER_Prompt || ""}\n${groupPrompt}`;

        // 2. Construct Messages Array (including history and potential image)
        //    Handles the new message format: { role, name, content: { text?, image? } }
        const messages = [];

        // Add System Prompt first (Correct declaration is above)
        // const currentTime = new Date().toLocaleString('zh-CN'); // Redundant
        // const groupPrompt = (config.GroupPrompt || "").replace("{{Date::time}}", currentTime); // Redundant
        // const systemPromptContent = `${config.USER_Prompt || ""}\n${groupPrompt}`; // Redundant
        if (systemPromptContent.trim()) {
            messages.push({ role: 'system', content: systemPromptContent });
        }

        // Process chat history for API format, adding "的发言:" prefix
        chatHistory.forEach(msg => {
            const apiMessage = { role: msg.role === 'user' ? 'user' : 'assistant', name: msg.name }; // Add name field to API message
            const content = msg.content || {}; // Ensure content exists
            // Construct the prefix exactly as requested: "SenderName的发言: "
            const senderName = msg.name || (msg.role === 'user' ? config.User_Name || 'User' : 'AI'); // Use configured User_Name
            const senderPrefix = `${senderName}: `; // Use colon and space as separator

            // OpenAI Vision format requires content to be an array for multimodal
            if (content.image && model.Image) { // Send image only if model supports it
                 apiMessage.content = [];
                 // Add text part with prefix, or just prefix + placeholder if no text
                 const textPart = content.text ? senderPrefix + content.text : senderPrefix + "[图片]";
                 apiMessage.content.push({ type: "text", text: textPart });
                 // Add image part
                 apiMessage.content.push({
                     type: "image_url",
                     image_url: { url: content.image } // Send base64 data URI
                 });
            } else if (content.text) {
                 // Send only text (with prefix) if no image, or if model doesn't support images
                 apiMessage.content = senderPrefix + content.text;
            } else if (content.image && !model.Image) {
                 // If there's an image but the model doesn't support it, send placeholder text with prefix
                 apiMessage.content = senderPrefix + "[图片]";
            }
             else {
                 // Skip message if it has no text and no image content
                 console.warn("Skipping history message with no text or image content:", msg);
                 return; // Continue to next history item
            }
             messages.push(apiMessage);
        });


        // Add the AI's specific system prompt as a final user message (as requested)
        // Note: This is added *after* the history processing
        if (model.SystemPrompts && model.SystemPrompts.trim()) {
             // Check if the last message was the user message we just added from history.
             // If the last message was complex (image + text), we might need to adjust
             // how this system prompt is appended, but for now, adding as separate user message.
            messages.push({ role: 'user', content: model.SystemPrompts });
        }

        // --- The old historyString logic is replaced by the loop above ---
        // const historyString = chatHistory.map(msg => `${msg.name}: ${msg.content.text || '[Image]'}`).join('\n'); // Example adaptation

        // 3. Make API Call (using the constructed messages array)
        //    The 'messages' variable is now prepared above, replacing the old logic.
        if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'system')) {
             console.error("No valid messages to send to the API.");
             updateLoadingMessage(model.Name, "错误：没有有效内容发送给 AI。", true);
             // Reset state only if NOT in ButtonSend mode
             if (config.AI_CHAT_MODE !== 'ButtonSend') {
                 isAiResponding = false;
                 setUiResponding(false);
             } else {
                 isAiResponding = false; // Reset flag for this specific call
                 setUiResponding(false); // Re-enable buttons
             }
             return;
        }

        // Add the AI's specific system prompt as a final user message (as requested)
        if (model.SystemPrompts && model.SystemPrompts.trim()) {
            messages.push({ role: 'user', content: model.SystemPrompts });
        }


        // 4. Make API Call (using fetch with streaming)
        try {
            // Prepare the base request body
            const requestBody = {
                model: model.Model,
                messages: messages,
                max_tokens: model.Outputtoken || 1500,
                temperature: model.Temperature || 0.7,
                stream: config.StreamingOutput // 根据配置决定是否流式输出
            };

            // Add google_search tool if Websearch is enabled for the model
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
                 // Let the model decide when to use the tool
                 requestBody.tool_choice = "auto";
            }


            const apiUrl = config.API_URl || ""; // Ensure API_URl exists
            if (!apiUrl) {
                console.error("API URL is not defined in the config.");
                appendMessage("System", { text: "错误：API URL 未在配置中定义。" }, false);
                setUiResponding(false);
                isAiResponding = false;
                return; // Stop if URL is missing
            }
            const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.API_Key}`
                },
                body: JSON.stringify(requestBody), // Use the prepared request body
                signal: AbortSignal.timeout(config.API_Timeout * 1000) // Add timeout
            });

            if (!response.ok) {
                // Handle HTTP errors (e.g., 4xx, 5xx)
                const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to parse error JSON
                console.error(`API Error for ${model.Name}: ${response.status}`, errorData);

                // 实现HTTP错误的重试逻辑，最多重试2次
                if (retryCount < 2) {
                    console.log(`Retrying API call for ${model.Name} after HTTP error ${response.status}, attempt ${retryCount + 1}/2`);
                    // 短暂延迟后重试
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return await callAiApi(model, retryCount + 1);
                }

                // 所有重试都失败后，显示错误信息
                updateLoadingMessage(model.Name, `错误: ${errorData.message || response.statusText} (已重试${retryCount}次)`, true);
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorData.message || response.statusText} (已重试${retryCount}次)` } });
                saveChatHistory();
                // Reset state only if NOT in ButtonSend mode, as user might retry
                 if (config.AI_CHAT_MODE !== 'ButtonSend') {
                    isAiResponding = false;
                    setUiResponding(false);
                 } else {
                     // In button send, allow user to try another AI
                     isAiResponding = false; // Reset flag for this specific call
                     setUiResponding(false); // Re-enable buttons
                 }
                return; // Stop processing for this AI
            }

            if (config.StreamingOutput) {
                // Process the stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedResponse = "";
                let buffer = ""; // Buffer for incomplete chunks

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Process line by line (SSE format: data: {...}\n\n)
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep the potentially incomplete last line

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataString = line.substring(6).trim();
                            if (dataString === '[DONE]') {
                                // Explicitly break inner loop, outer loop will break on next read()
                                break;
                            }
                            try {
                                const chunk = JSON.parse(dataString);
                                if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
                                    const contentPiece = chunk.choices[0].delta.content;
                                    if (contentPiece) { // Ensure contentPiece is not null/undefined
                                        accumulatedResponse += contentPiece;
                                        // Update the UI incrementally
                                        updateLoadingMessage(model.Name, accumulatedResponse + "...", false); // isFinalUpdate = false
                                    }
                                }
                            } catch (error) {
                                console.error('Error parsing stream chunk:', error, 'Data:', dataString);
                            }
                        }
                    }
                     // Check if [DONE] was processed in the inner loop
                     if (buffer.includes('[DONE]') || lines.some(l => l.includes('[DONE]'))) {
                         break;
                     }
                }
                 // Final update after stream ends
                 let finalResponseText = accumulatedResponse;
                 // Check for AI opt-out tag
                 if (finalResponseText.endsWith('[[QuitGroup]]')) {
                     console.log(`${model.Name} opted out for the next round.`);
                     aiOptedOutLastRound.add(model.Name);
                     // Remove the tag before displaying/saving
                     finalResponseText = finalResponseText.slice(0, -'[[QuitGroup]]'.length).trim();
                 }
                updateLoadingMessage(model.Name, finalResponseText, true); // isFinalUpdate = true

                // Add final AI response (without tag) to history and save
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: finalResponseText } });
                saveChatHistory();

            } else {
                // Process non-streamed response
                const responseData = await response.json();
                let fullContent = responseData.choices?.[0]?.message?.content || "未能获取响应内容";

                 // Check for AI opt-out tag
                 if (fullContent.endsWith('[[QuitGroup]]')) {
                     console.log(`${model.Name} opted out for the next round.`);
                     aiOptedOutLastRound.add(model.Name);
                     // Remove the tag before displaying/saving
                     fullContent = fullContent.slice(0, -'[[QuitGroup]]'.length).trim();
                 }

                // Update UI once with the full response (without tag)
                updateLoadingMessage(model.Name, fullContent, true); // isFinalUpdate = true

                // Add final AI response (without tag) to history and save
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: fullContent } });
                saveChatHistory();
            }
        } catch (error) {
            console.error(`Error calling API for ${model.Name}:`, error);
            // 实现重试逻辑，最多重试2次
            if (retryCount < 2) {
                console.log(`Retrying API call for ${model.Name}, attempt ${retryCount + 1}/2`);
                // 短暂延迟后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await callAiApi(model, retryCount + 1);
            }

            // 所有重试都失败后，显示错误信息
            let errorMessage = "API 请求失败";
            if (error.name === 'TimeoutError') {
                errorMessage = "API 请求超时";
            } else if (error instanceof TypeError) {
                // Network error, CORS, etc.
                errorMessage = "网络错误或无法连接到 API";
            }
            updateLoadingMessage(model.Name, `错误: ${errorMessage} (已重试${retryCount}次)`);
            // Add error message to the *current* session's history
            chatHistory.push({ role: 'assistant', name: model.Name, content: { text: `错误: ${errorMessage} (已重试${retryCount}次)` } });
            // Save the updated history for the active session
            saveChatHistory(); // This now saves the active session within allChatData
        } finally {
             // Reset responding state *only* if not in ButtonSend mode OR if it was the last AI in a sequence/subset
             // In ButtonSend, the user might click another button immediately.
             // In other modes, the triggerAiResponse function handles the final reset.
             if (config.AI_CHAT_MODE === 'ButtonSend') {
                 isAiResponding = false; // Reset flag for this specific call
                 setUiResponding(false); // Re-enable buttons
             }
             // Note: The main reset for other modes happens *after* the loop/sequence in triggerAiResponse
        }
    }

    /** Update the floating AI status window to show all active models and their status, greying out non-speakers */
    function updateFloatingAiWindow(allModels, speakingModels = null) { // Added speakingModels parameter
        if (!floatingAiStatusWindow || !currentRoundAisContainer) return; // Guard if elements don't exist

        currentRoundAisContainer.innerHTML = ''; // Clear previous items

        // Hide window only if there are no active models at all
        if (!allModels || allModels.length === 0) {
            floatingAiStatusWindow.style.display = 'none';
            return;
        }

        floatingAiStatusWindow.style.display = 'block'; // Show the window

        // Create a Set of speaking model names for efficient lookup, if provided
        const speakingModelNames = speakingModels ? new Set(speakingModels.map(m => m.Name)) : null;

        allModels.forEach(model => { // Iterate over ALL active models
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('ai-status-item');

            // Avatar
            const img = document.createElement('img');
            const imageDir = 'image/';
            const defaultAiAvatar = imageDir + 'default-ai.png';
            img.src = model.Avatar ? imageDir + model.Avatar : defaultAiAvatar;
            img.alt = model.Name;
            img.onerror = () => { img.src = defaultAiAvatar; }; // Fallback
            // Add/remove inactive class based on whether the model is speaking this round
            if (speakingModelNames && !speakingModelNames.has(model.Name)) {
                img.classList.add('inactive-avatar');
            } else {
                img.classList.remove('inactive-avatar'); // Ensure active state if speaking or if speakingModels is null
            }

            // Name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = model.Name;

            // --- Buttons Container ---
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex'; // Align buttons horizontally

            // Mute Button (Persistent)
            const muteBtn = document.createElement('button');
            muteBtn.classList.add('mute-ai-btn');
            muteBtn.textContent = '!';
            muteBtn.dataset.aiName = model.Name;

            // Set initial state and title based on persistent mute status
            if (persistentlyMutedAiNames.has(model.Name)) {
                muteBtn.classList.add('muted');
                muteBtn.title = `点击取消对 ${model.Name} 的持续禁言`;
            } else {
                muteBtn.title = `点击持续禁言 ${model.Name}`;
            }

            // Add click listener to toggle persistent mute
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
                    saveMutedAiNames(); // Save the updated mute list
                }
            });

            // Close Button (Single Round Exclusion Indicator/Trigger)
            const closeBtn = document.createElement('button');
            closeBtn.classList.add('close-ai-btn');
            closeBtn.textContent = 'X';
            closeBtn.dataset.aiName = model.Name; // Store name to identify AI

            // Set initial state and title based on *next round* exclusion status
            const isExcludedNextRound = excludedAiForNextRound.has(model.Name) || aiOptedOutLastRound.has(model.Name);
            if (isExcludedNextRound) {
                closeBtn.classList.add('excluded-next-round');
                closeBtn.title = `${model.Name} 将在下一轮被跳过`;
            } else {
                 closeBtn.classList.remove('excluded-next-round'); // Ensure class is removed if not excluded
                 closeBtn.title = `点击标记 ${model.Name} 在下一轮不发言`;
            }

            // Add click listener to MARK AI for exclusion in the next round
            closeBtn.addEventListener('click', (e) => {
                const aiNameToExclude = e.target.dataset.aiName;
                const button = e.target;
                if (aiNameToExclude) {
                    // Toggle exclusion for next round by user click
                    if (excludedAiForNextRound.has(aiNameToExclude)) {
                        // If already marked by user, unmark it
                        excludedAiForNextRound.delete(aiNameToExclude);
                        button.classList.remove('excluded-next-round');
                        button.title = `点击标记 ${aiNameToExclude} 在下一轮不发言`;
                        console.log(`User un-marked ${aiNameToExclude} for exclusion next round.`);
                    } else {
                        // Mark for exclusion
                        excludedAiForNextRound.add(aiNameToExclude);
                        button.classList.add('excluded-next-round');
                        button.title = `${aiNameToExclude} 已被标记，将在下一轮被跳过`;
                        console.log(`User marked ${aiNameToExclude} for exclusion next round.`);
                    }
                    // Note: aiOptedOutLastRound is handled separately based on AI response
                }
            });

            buttonsContainer.appendChild(muteBtn); // Add mute button first
            buttonsContainer.appendChild(closeBtn); // Add close button second

            itemDiv.appendChild(img);
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(buttonsContainer); // Add the container with both buttons
            currentRoundAisContainer.appendChild(itemDiv);
        });
    }

}); // End DOMContentLoaded


    /** Sets a random background image for the chat messages area based on screen width */
    function setRandomBackground() {
        const chatMessagesDiv = document.getElementById('chat-messages');
        if (!chatMessagesDiv) return; // Exit if element not found

        const imageDir = 'image/'; // Base directory for images

        // Define image lists (ensure filenames match exactly, including case)
        const phoneImages = [
            'Phone餐厅.png',
            'phone街头.png', // Note lowercase 'p'
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

        // Check screen width (using 768px breakpoint from CSS media query)
        if (window.innerWidth <= 768) {
            selectedImageList = phoneImages;
            console.log("Using Phone background images.");
        } else {
            selectedImageList = winImages;
            console.log("Using Win background images.");
        }

        // Select a random image from the chosen list
        if (selectedImageList.length > 0) {
            const randomIndex = Math.floor(Math.random() * selectedImageList.length);
            const randomImageFile = selectedImageList[randomIndex];
            // Determine the correct subdirectory based on the selected list
            const subDir = (selectedImageList === phoneImages) ? 'Phone/' : 'Win/';
            const imageUrl = imageDir + subDir + randomImageFile; // Include the subdirectory

            console.log(`Setting background to: ${imageUrl}`);
            chatMessagesDiv.style.backgroundImage = `url('${imageUrl}')`;
        } else {
            console.warn("No background images found for the current resolution.");
            chatMessagesDiv.style.backgroundImage = 'none'; // Fallback to no background
        }
    }

    /** Sets a random background image for the main body */
    function setBodyBackground() {
        const imageDir = 'image/Wallpaper/'; // Wallpaper directory
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
            // Add styles for better background display
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed'; // Fix background during scroll
        } else {
            console.warn("No wallpaper images found.");
            document.body.style.backgroundImage = 'none'; // Fallback
        }
    }
