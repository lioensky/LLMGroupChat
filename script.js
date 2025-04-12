document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const aiStatusDiv = document.getElementById('ai-status');
    const aiButtonsDiv = document.getElementById('ai-buttons');
    const sessionSelect = document.getElementById('chat-session-select');
    // Image related elements
    const attachImageButton = document.getElementById('attach-image-button');
    const imageInput = document.getElementById('image-input');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const imagePreview = document.getElementById('image-preview');
    const removeImageButton = document.getElementById('remove-image-button');

    // --- Configuration ---
    // config is loaded globally from config.js
    const activeModels = config.getActiveModels();
    let currentAiIndex = 0; // For sequentialQueue mode
    let aiTurnOrder = []; // For shuffledQueue and randomSubsetQueue modes

    // --- State ---
    let allChatData = { sessions: {}, activeSessionId: null }; // Holds all sessions and the active one
    let chatHistory = []; // Represents the history of the *active* session
    let activeSessionId = null; // ID of the currently active session
    let isAiResponding = false;
    let selectedImageBase64 = null; // To store the selected image data

    // --- Constants ---
    const CHAT_DATA_KEY = 'aiGroupChatData'; // New key for all data

    // --- Initialization ---
    // --- Initialization ---
    loadAllChatData(); // Load all session data
    initializeSessions(); // Ensure at least one session exists and set active
    populateSessionSelect(); // Populate the dropdown
    switchSession(activeSessionId); // Load and display the active session
    updateAiStatus();
    setupAiButtons(); // Setup buttons for ButtonSend mode visibility control
    adjustTextareaHeight(); // Initial adjustment

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    newChatButton.addEventListener('click', createNewSession);
    sessionSelect.addEventListener('change', (e) => switchSession(e.target.value));
    attachImageButton.addEventListener('click', () => imageInput.click()); // Trigger file input
    imageInput.addEventListener('change', handleImageSelection); // Handle file selection
    removeImageButton.addEventListener('click', removeSelectedImage); // Handle image removal
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    messageInput.addEventListener('input', adjustTextareaHeight);


    // --- Functions ---

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

        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        senderElement.textContent = sender;
        messageElement.appendChild(senderElement);

        const contentWrapper = document.createElement('div'); // Wrapper for text and image
        contentWrapper.classList.add('content-wrapper');

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
            contentElement.classList.add('content');
            contentElement.textContent = textContent || ''; // Use textContent for safety

             if (isLoading) {
                 const loadingIndicator = document.createElement('span');
                 loadingIndicator.classList.add('loading-indicator');
                 contentElement.appendChild(loadingIndicator);
                 messageElement.dataset.loadingId = sender; // Mark loading message by sender
             }
            contentWrapper.appendChild(contentElement);
        }


        messageElement.appendChild(contentWrapper);
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


            // Update text content
            contentElement.textContent = textContent;

            // Handle loading indicator
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
        const userName = config.User_Name || "User";
        appendMessage(userName, messageContent, true);

        // 3. Add to history and save
        chatHistory.push({ role: 'user', name: userName, content: messageContent });
        saveChatHistory();

        // 4. Clear input, image selection, and readjust height
        messageInput.value = '';
        removeSelectedImage(); // Clear image state and preview
        adjustTextareaHeight();

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
        if (isAiResponding && config.AI_CHAT_MODE !== 'ButtonSend') {
             console.log("AI response cycle already in progress.");
             return; // Avoid overlapping triggers unless it's button mode
        }
        isAiResponding = true; // Set flag
        setUiResponding(true); // Disable input/buttons

        const mode = config.AI_CHAT_MODE;

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
    }

     /** Enable/disable UI elements during AI response */
    function setUiResponding(isResponding) {
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


    /** Construct prompt and call the AI API */
    /** Construct prompt and call the AI API (handles multimodal) */
    async function callAiApi(model, retryCount = 0) {
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

            // --- Temporarily disabling tool addition for debugging ---
            // if (model.Websearch === true) {
            //      console.log(`Websearch enabled for ${model.Name}, adding google_search tool.`);
            //      requestBody.tools = [
            //          {
            //              type: "function",
            //              function: {
            //                  name: "google_search",
            //                  description: "Perform a Google search to find information on the web.",
            //                  parameters: {
            //                      type: "object",
            //                      properties: {
            //                          query: {
            //                              type: "string",
            //                              description: "The search query string."
            //                          }
            //                      },
            //                      required: ["query"]
            //                  }
            //              }
            //          }
            //      ];
            //      // Let the model decide when to use the tool
            //      requestBody.tool_choice = "auto";
            // }
            // --- End of temporarily disabled block ---


            const response = await fetch(`${config.API_URl}/v1/chat/completions`, {
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
                updateLoadingMessage(model.Name, accumulatedResponse, true); // isFinalUpdate = true

                // Add final AI response to history and save
                chatHistory.push({ role: 'assistant', name: model.Name, content: { text: accumulatedResponse } });
                saveChatHistory();

            } else {
                // Process non-streamed response
                const responseData = await response.json();
                const fullContent = responseData.choices?.[0]?.message?.content || "未能获取响应内容";

                // Update UI once with the full response
                updateLoadingMessage(model.Name, fullContent, true); // isFinalUpdate = true

                // Add final AI response to history and save
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

}); // End DOMContentLoaded