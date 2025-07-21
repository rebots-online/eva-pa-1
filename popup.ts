declare const chrome: any;

const statusEl = document.getElementById('status');
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const expandButton = document.getElementById('expandButton');

const usageLimit = 2;

function updateUI(state: any) {
  if (!statusEl || !recordButton || !stopButton) return;

  if (state.isRecording) {
    statusEl.innerHTML = `<p>🔴 Recording...</p>`;
    recordButton.classList.add('hidden');
    stopButton.classList.remove('hidden');
  } else {
    statusEl.innerHTML = `<p>${state.status}</p>`;
    recordButton.classList.remove('hidden');
    stopButton.classList.add('hidden');
  }

  if (state.error) {
    statusEl.innerHTML += `<p style="color: #ff8a80;">${state.error}</p>`;
  }

  const canRecord = state.isSubscribed || state.usageCount < usageLimit;
  recordButton.toggleAttribute('disabled', !canRecord);
  if (!canRecord && !state.isRecording) {
     statusEl.innerHTML = `<p>Daily limit reached. Expand view to subscribe.</p>`;
  }
}

recordButton?.addEventListener('click', () => {
  if (chrome.runtime) {
    chrome.runtime.sendMessage({type: 'START_RECORDING'});
  }
});

stopButton?.addEventListener('click', () => {
  if (chrome.runtime) {
    chrome.runtime.sendMessage({type: 'STOP_RECORDING'});
  }
});

expandButton?.addEventListener('click', () => {
  if (chrome.tabs) {
    chrome.tabs.create({url: 'index.html'});
  }
});

// Listen for state updates from the background script
if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: any) => {
    if (message.type === 'STATE_UPDATE') {
      updateUI(message.state);
    }
  });
}

// Request initial state when the popup opens
if (chrome.runtime) {
  chrome.runtime.sendMessage({type: 'GET_STATE'}, (state: any) => {
    if (chrome.runtime.lastError) {
      // Handle error, e.g., background script not ready
      if (statusEl) {
        statusEl.innerHTML = `<p>Error connecting to assistant.</p>`;
      }
    } else if (state) {
      updateUI(state);
    }
  });
}