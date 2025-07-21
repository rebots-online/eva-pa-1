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
  chrome.runtime.sendMessage({type: 'STATE_UPDATE', state});
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
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === 'GET_STATE') {
    sendResponse(state);
    return;
  }

  // Forward messages to the offscreen document
  if (
    message.type === 'START_RECORDING' ||
    message.type === 'STOP_RECORDING' ||
    message.type === 'RESET_SESSION'
  ) {
    getOffscreenDocument().then(() => {
      chrome.runtime.sendMessage(message);
    });
    return true; // Keep message channel open for async response
  }

  // Handle state changes from offscreen document
  if (message.type === 'OFFSCREEN_STATE_UPDATE') {
    updateState(message.state);
  }

  // Handle subscription state changes from UI
  if (message.type === 'SET_SUBSCRIBED') {
    chrome.storage.local.set({isSubscribed: message.isSubscribed});
    updateState({isSubscribed: message.isSubscribed});
    // Tell offscreen to reset and reload with new subscription status
    getOffscreenDocument().then(() => {
      chrome.runtime.sendMessage({type: 'RESET_SESSION'});
    });
  }

  // Handle frequency data for visualizer
  if (message.type === 'FREQUENCY_DATA_UPDATE') {
    // Forward to any listening tabs
    chrome.runtime.sendMessage(message);
  }

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