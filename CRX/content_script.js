console.log("AI Chat History Manager: Content script loaded.");

const CHAT_DATA_KEY = 'aiGroupChatData';
const PAGE_ID = 'ai-group-chat-project'; // The ID we added to the body

// Function to check if this is the target chat page
function isTargetPage() {
    return document.body && document.body.id === PAGE_ID;
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    if (!isTargetPage()) {
        // If not the target page, only respond to 'is_chat_page' requests maybe
        if (request.action === 'is_chat_page') {
            sendResponse({ isChatPage: false });
        } else {
            console.log("Content script: Not the target page, ignoring action:", request.action);
            // Optionally send a response indicating it's not the right page
            sendResponse({ error: "Not the AI chat project page." });
        }
        return true; // Indicate asynchronous response (optional here, but good practice)
    }

    // --- Actions for the target page ---
    switch (request.action) {
        case 'is_chat_page':
            sendResponse({ isChatPage: true });
            break;

        case 'get_chat_data':
            try {
                const rawData = localStorage.getItem(CHAT_DATA_KEY);
                const chatData = rawData ? JSON.parse(rawData) : { sessions: {}, activeSessionId: null };
                console.log("Content script: Sending chat data:", chatData);
                sendResponse({ success: true, data: chatData });
            } catch (error) {
                console.error("Content script: Error getting chat data:", error);
                sendResponse({ success: false, error: `Error reading localStorage: ${error.message}` });
            }
            break;

        case 'save_chat_data':
            try {
                if (request.data) {
                    localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(request.data));
                    console.log("Content script: Saved chat data.");
                    sendResponse({ success: true });
                    // Optional: Trigger a refresh in the main page's script if needed
                    // window.dispatchEvent(new CustomEvent('chatDataUpdated'));
                } else {
                    sendResponse({ success: false, error: "No data provided to save." });
                }
            } catch (error) {
                console.error("Content script: Error saving chat data:", error);
                sendResponse({ success: false, error: `Error writing to localStorage: ${error.message}` });
            }
            break;

        case 'delete_session':
            try {
                const sessionIdToDelete = request.sessionId;
                if (!sessionIdToDelete) {
                    sendResponse({ success: false, error: "No session ID provided for deletion." });
                    return true; // Keep channel open
                }

                const rawData = localStorage.getItem(CHAT_DATA_KEY);
                let chatData = rawData ? JSON.parse(rawData) : { sessions: {}, activeSessionId: null };

                if (chatData.sessions[sessionIdToDelete]) {
                    delete chatData.sessions[sessionIdToDelete];
                    console.log(`Content script: Deleted session ${sessionIdToDelete}`);

                    // If the deleted session was the active one, reset activeSessionId
                    if (chatData.activeSessionId === sessionIdToDelete) {
                        const remainingSessionIds = Object.keys(chatData.sessions);
                        chatData.activeSessionId = remainingSessionIds.length > 0 ? remainingSessionIds[0] : null;
                        console.log(`Content script: Reset active session ID to ${chatData.activeSessionId}`);
                    }

                    localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(chatData));
                    sendResponse({ success: true, newActiveSessionId: chatData.activeSessionId });
                     // Optional: Trigger refresh in main page
                     // window.dispatchEvent(new CustomEvent('chatDataUpdated'));
                } else {
                    sendResponse({ success: false, error: `Session ID ${sessionIdToDelete} not found.` });
                }
            } catch (error) {
                console.error("Content script: Error deleting session:", error);
                sendResponse({ success: false, error: `Error processing deletion: ${error.message}` });
            }
            break;

        // Renamed from 'import_data'
        case 'replace_chat_data':
             try {
                if (request.data && typeof request.data === 'object' && request.data !== null && typeof request.data.sessions === 'object') {
                    // Replace existing data entirely
                    localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(request.data));
                    console.log("Content script: Replaced chat data with imported data.");
                    sendResponse({ success: true });
                    // Optional: Trigger refresh in main page
                    // window.dispatchEvent(new CustomEvent('chatDataUpdated'));
                } else {
                    sendResponse({ success: false, error: "Invalid or missing data for replacement." });
                }
            } catch (error) {
                console.error("Content script: Error replacing chat data:", error);
                sendResponse({ success: false, error: `Error writing replaced data to localStorage: ${error.message}` });
            }
            break;

        case 'merge_chat_data':
            try {
                if (request.data && typeof request.data === 'object' && request.data !== null && typeof request.data.sessions === 'object') {
                    // Get existing data
                    const rawExistingData = localStorage.getItem(CHAT_DATA_KEY);
                    let existingChatData = rawExistingData ? JSON.parse(rawExistingData) : { sessions: {}, activeSessionId: null };

                    // Ensure existing sessions object exists
                    if (!existingChatData.sessions) {
                         existingChatData.sessions = {};
                    }

                    // Merge incoming sessions into existing sessions (incoming overwrites duplicates)
                    Object.assign(existingChatData.sessions, request.data.sessions);

                    // Optionally update activeSessionId if the imported data specified one?
                    // For simplicity, we keep the existing activeSessionId unless it becomes invalid.
                    if (!existingChatData.sessions[existingChatData.activeSessionId]) {
                         const remainingSessionIds = Object.keys(existingChatData.sessions);
                         existingChatData.activeSessionId = remainingSessionIds.length > 0 ? remainingSessionIds[0] : null;
                    }

                    // Save the merged data
                    localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(existingChatData));
                    console.log("Content script: Merged imported chat data.");
                    sendResponse({ success: true });
                     // Optional: Trigger refresh in main page
                     // window.dispatchEvent(new CustomEvent('chatDataUpdated'));
                } else {
                     sendResponse({ success: false, error: "Invalid or missing data for merging." });
                }
            } catch (error) {
                 console.error("Content script: Error merging chat data:", error);
                 sendResponse({ success: false, error: `Error processing merged data: ${error.message}` });
            }
            break;


        default:
            console.log("Content script: Unknown action:", request.action);
            sendResponse({ error: `Unknown action: ${request.action}` });
            break;
    }

    // Return true to indicate you wish to send a response asynchronously
    // This is important if any of your actions above are async (like fetching data)
    // Even if they are currently sync, it's good practice.
    return true;
});

console.log("AI Chat History Manager: Content script listener attached.");