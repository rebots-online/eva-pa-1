declare const chrome: any;

// This is the background service worker.
// It is the central hub for the extension.

let offscreenDocumentPath: string | null = null;

// State management
let state = {
  isRecording: false,
  status: 'Initializing...',
  error: '',
  isSubscribed: false,
  usageCount: 0,
  conversationHistory: [],
  persona: 'Eva',
};

// Function to update state and notify all clients (popup, full tab)
const updateState = (newState: any) => {
  state = {...state, ...newState};
  chrome.runtime.sendMessage({type: 'STATE_UPDATE', state, target: 'popup'}, () => {
    if (chrome.runtime.lastError) {
      console.warn(`Error sending STATE_UPDATE to popup:`, chrome.runtime.lastError.message);
    }
  });
  console.log('State updated:', state);
};

// Load initial state from storage
const loadInitialState = async () => {
  const {isSubscribed, usageData} = await chrome.storage.local.get([
    'isSubscribed',
    'usageData',
  ]);
  const today = new Date().toISOString().split('T')[0];
  let currentUsage = 0;
  if (usageData && usageData.date === today) {
    currentUsage = usageData.count;
  }
  updateState({
    isSubscribed: !!isSubscribed,
    usageCount: currentUsage,
    status: 'Ready to assist.',
  });
};

// Function to manage the offscreen document
async function getOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts.length > 0) {
    return existingContexts[0];
  }

  if (offscreenDocumentPath) {
    await chrome.offscreen.closeDocument().catch(() => {});
  }

  offscreenDocumentPath = 'offscreen.html';
  await chrome.offscreen.createDocument({
    url: offscreenDocumentPath,
    reasons: ['USER_MEDIA'],
    justification: 'Required for microphone access and audio playback.',
  });
}

// Message handling
chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === 'GET_STATE') {
    sendResponse(state);
    return;
  }

  // Forward messages to the offscreen document
  if (
    message.target === 'offscreen' &&
    (message.type === 'START_RECORDING' ||
      message.type === 'STOP_RECORDING' ||
      message.type === 'RESET_SESSION')
  ) {
    const sendMessageToOffscreen = async () => {
      await getOffscreenDocument();
      try {
        await chrome.runtime.sendMessage(message);
      } catch (error) {
        // If the offscreen document isn't ready, retry after a short delay
        if (error.message.includes('Receiving end does not exist')) {
          setTimeout(sendMessageToOffscreen, 100);
        } else {
          console.error('Error sending message to offscreen document:', error);
        }
      }
    };
    sendMessageToOffscreen();
    return true; // Keep message channel open for async response
  }

  // Handle state changes from offscreen document
  if (message.type === 'OFFSCREEN_STATE_UPDATE') {
    updateState(message.state);
    return;
  }

  // Handle subscription state changes from UI
  if (message.type === 'SET_SUBSCRIBED') {
    chrome.storage.local.set({isSubscribed: message.isSubscribed});
    updateState({isSubscribed: message.isSubscribed});
    // Tell offscreen to reset and reload with new subscription status
    getOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({type: 'RESET_SESSION'}, () => {
        if (chrome.runtime.lastError) {
          console.warn(`Error sending RESET_SESSION to offscreen document:`, chrome.runtime.lastError.message);
        }
      });
    });
  }

  // 1️⃣  Patch begins here – safer forward of frequency updates
  if (message.type === 'FREQUENCY_DATA_UPDATE') {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        // We “ping” first to see if the tab cares;
        // if the tab doesn’t answer, we skip the heavy update.
        chrome.tabs.sendMessage(
          tab.id!,
          { type: 'PING' },
          (pong) => {
            if (chrome.runtime.lastError) {
              // No content script in this tab – nothing to do.
              console.debug(
                `[background] Tab ${tab.id} not listening (${chrome.runtime.lastError.message})`
              );
              return;
            }
            if (pong?.readyForFreq) {
              chrome.tabs.sendMessage(tab.id!, message, () => {
                if (chrome.runtime.lastError) {
                  console.debug(
                    `[background] Follow-up update failed in tab ${tab.id}:`,
                    chrome.runtime.lastError.message,
                  );
                }
              });
            }
          }
        );
      });
    });
    return true; // keep channel open for async sendResponse if needed
  }
  // 1️⃣  Patch ends here

  return true;
});

// Open full tab view
chrome.action.onClicked.addListener(() => {
  // This is a fallback in case the popup is disabled or fails.
  // The primary action is defined in manifest.json to open popup.html
});

chrome.tabs.onActivated.addListener(() => {
  // Can be used to interact with tabs in the future
});

// Initial load
loadInitialState();