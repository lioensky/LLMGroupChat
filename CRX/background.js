console.log("AI Chat History Manager: Background service worker started.");

const PAGE_ID = 'ai-group-chat-project'; // Must match content_script.js and index.html

// Helper function to find the target chat tab
async function findChatTab() {
    // Query for tabs that might be the chat page.
    // We can't directly query for the body ID from here,
    // so we query all tabs and ask the content script.
    // Optimization: Could query based on title or URL pattern if known.
    const tabs = await chrome.tabs.query({
        // Example optimization: query based on title if it's consistent
        // title: "AI 群聊室"
    });

    for (const tab of tabs) {
        try {
            // Send a message to the content script of each tab to check its identity
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'is_chat_page' });
            // Check if response exists and indicates it's the chat page
            if (response && response.isChatPage) {
                console.log(`Background: Found chat tab: ${tab.id}`);
                return tab; // Return the first matching tab found
            }
        } catch (error) {
            // This error often means the content script isn't injected or active on that tab,
            // or the tab is protected (e.g., chrome:// pages). Ignore these errors.
            if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
                // console.log(`Background: Could not connect to tab ${tab.id}, likely not the target or inaccessible.`);
            } else {
                console.error(`Background: Error checking tab ${tab.id}:`, error);
            }
        }
    }
    console.log("Background: No active chat tab found.");
    return null; // No matching tab found
}

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received message:", request);

    // Handle requests that the background script can process directly
    if (request.action === 'find_chat_tab_id') {
        findChatTab().then(tab => {
            sendResponse({ tabId: tab ? tab.id : null });
        }).catch(error => {
             console.error("Background: Error finding chat tab:", error);
             sendResponse({ tabId: null, error: error.message });
        });
        return true; // Indicate asynchronous response
    }

    // Forward other requests to the content script of the target tab
    if (request.targetTabId) {
        const targetTabId = request.targetTabId;
        // Remove targetTabId from the request before forwarding
        const messageToSend = { ...request };
        delete messageToSend.targetTabId;

        console.log(`Background: Forwarding message to tab ${targetTabId}:`, messageToSend);
        chrome.tabs.sendMessage(targetTabId, messageToSend)
            .then(response => {
                console.log("Background: Received response from content script:", response);
                sendResponse(response); // Forward response back to popup
            })
            .catch(error => {
                console.error(`Background: Error sending message to tab ${targetTabId} or receiving response:`, error);
                 // Handle cases where the tab might have closed or content script failed
                 let errorMessage = `Error communicating with content script: ${error.message}`;
                 if (error.message.includes("Could not establish connection") || error.message.includes("Receiving end does not exist")) {
                     errorMessage = "无法连接到聊天页面。页面可能已关闭或未加载完成。";
                 }
                sendResponse({ success: false, error: errorMessage });
            });
        return true; // Indicate asynchronous response
    } else {
         // Handle cases where no targetTabId is provided for actions needing it
         if (['get_chat_data', 'save_chat_data', 'delete_session', 'import_data'].includes(request.action)) {
             console.error("Background: No targetTabId provided for action:", request.action);
             sendResponse({ success: false, error: "Target tab ID not specified." });
         }
         // If it's not an action requiring a tab, maybe handle it here or ignore
    }

    // Return true for async responses if any path leads to one
    // return true; // Already handled above
});

console.log("AI Chat History Manager: Background listeners attached.");