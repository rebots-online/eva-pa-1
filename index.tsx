declare const chrome: any;

/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import type {LoreEntry} from './utils';
import './visual-3d';
import type {GdmLiveAudioVisuals3D} from './visual-3d';

interface AppState {
  isRecording: boolean;
  status: string;
  error: string;
  isSubscribed: boolean;
  usageCount: number;
  conversationHistory: LoreEntry[];
  persona: string;
}

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = 'Connecting to assistant...';
  @state() error = '';
  @state() isSubscribed = false;
  @state() usageCount = 0;
  @state() conversationHistory: LoreEntry[] = [];
  @state() isMenuOpen = false;
  @state() inputFrequencyData: Uint8Array | null = null;
  @state() outputFrequencyData: Uint8Array | null = null;
  @state() persona = 'Eva';

  private readonly usageLimit = 2;
  private visuals: GdmLiveAudioVisuals3D | null = null;

  static styles = css`
    :host {
      --accent-color-1: #d16ba5;
      --accent-color-2: #86a8e7;
      --text-color: #ffffff;
      --background-color-transparent: rgba(255, 255, 255, 0.1);
      --background-color-hover: rgba(255, 255, 255, 0.2);
      --error-color: #ff8a80;
    }

    .header {
      position: absolute;
      top: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: var(--text-color);
      text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }

    .header h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 600;
    }

    .header p {
      margin: 5px 0 0;
      font-size: 1.1rem;
      opacity: 0.9;
    }

    #status {
      position: absolute;
      bottom: 20vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: var(--text-color);
      padding: 0 20px;
      text-shadow: 0 0 5px black;
    }

    #status .error {
      color: var(--error-color);
      font-weight: bold;
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 10px;
    }

    .controls button {
      outline: none;
      border: 1px solid var(--background-color-transparent);
      color: var(--text-color);
      border-radius: 12px;
      background: var(--background-color-transparent);
      width: 64px;
      height: 64px;
      cursor: pointer;
      font-size: 24px;
      padding: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }

    .controls button:hover {
      background: var(--background-color-hover);
    }

    .controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .controls button.hidden {
      display: none;
    }

    /* Freemium UI */
    .freemium-controls {
      position: absolute;
      top: 15vh;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: var(--background-color-transparent);
      padding: 10px 20px;
      border-radius: 15px;
      color: var(--text-color);
      text-align: center;
      backdrop-filter: blur(5px);
    }

    .subscription-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: bold;
    }

    .usage-text {
      font-size: 0.9rem;
      margin: 5px 0 0;
      opacity: 0.9;
    }

    /* Toggle Switch CSS */
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.4s;
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: '';
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--accent-color-2);
    }
    input:checked + .slider:before {
      transform: translateX(26px);
    }

    /* Lore Panel */
    .lore-panel {
      position: absolute;
      right: 20px;
      top: 25vh;
      bottom: 10vh;
      width: 300px;
      background: var(--background-color-transparent);
      border-radius: 15px;
      z-index: 5;
      color: var(--text-color);
      padding: 15px;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(5px);
    }

    .lore-panel h3 {
      margin: 0 0 10px;
      text-align: center;
      font-weight: 600;
    }

    .history {
      flex: 1;
      overflow-y: auto;
      font-size: 0.9rem;
    }

    .history-entry {
      margin-bottom: 8px;
      line-height: 1.4;
      padding-left: 1em;
      text-indent: -1em;
    }

    /* Copyright Footer */
    .copyright-footer {
      position: absolute;
      bottom: 10px;
      left: 0;
      right: 0;
      text-align: center;
      color: var(--text-color);
      opacity: 0.6;
      font-size: 0.8rem;
      z-index: 10;
    }

    /* Hamburger Menu */
    .menu-toggle {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 20;
      background: none;
      border: none;
      cursor: pointer;
      padding: 10px;
      width: 48px;
      height: 48px;
    }

    .side-menu {
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      height: 100%;
      background: rgba(30, 30, 40, 0.9);
      backdrop-filter: blur(10px);
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
      z-index: 15;
      padding: 60px 20px 20px;
      color: var(--text-color);
    }

    .side-menu.open {
      transform: translateX(0);
    }

    .side-menu h3 {
      margin: 0 0 15px;
      font-size: 1.5rem;
      border-bottom: 1px solid var(--background-color-transparent);
      padding-bottom: 10px;
    }

    .side-menu ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .side-menu li {
      margin-bottom: 10px;
    }

    .side-menu a {
      color: var(--text-color);
      text-decoration: none;
      font-size: 1.1rem;
      padding: 10px;
      display: block;
      border-radius: 8px;
      transition: background-color 0.2s;
    }

    .side-menu a.active,
    .side-menu a:hover {
      background-color: var(--background-color-hover);
    }
  `;

  constructor() {
    super();
    // Listen for state updates from the background script
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message: any) => {
        if (message.type === 'STATE_UPDATE') {
          this.handleStateUpdate(message.state);
        }
        if (message.type === 'FREQUENCY_DATA_UPDATE') {
          if (this.visuals) {
            this.visuals.inputData = message.inputData;
            this.visuals.outputData = message.outputData;
          }
        }
      });
    }

    // Request initial state
    if (chrome.runtime) {
      chrome.runtime.sendMessage({type: 'GET_STATE'});
    }
  }

  firstUpdated() {
    this.visuals = this.shadowRoot?.querySelector('gdm-live-audio-visuals-3d') as GdmLiveAudioVisuals3D | null;
    this.initializeBilling();
  }

  private async initializeBilling() {
    try {
      // Initialize billing service and check subscription status
      const { initialize, getCustomerInfo } = await import('./src/billing-service');
      
      const userId = 'user_' + (await this.getUserId()); // Get stable user ID
      
      await initialize(userId);
      
      const customerInfo = await getCustomerInfo();
      
      // Check if user has active subscription
      const isSubscribed = customerInfo.entitlements?.active?.['pro_access'] !== undefined;
      
      // Update local state
      this.isSubscribed = isSubscribed;
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'SET_SUBSCRIBED',
        isSubscribed: isSubscribed,
      });
    } catch (error) {
      console.error('Error initializing billing:', error);
      // Continue without billing if initialization fails
    }
  }

  private async getUserId(): Promise<string> {
    // Use Chrome extension ID as stable user ID
    if (chrome.runtime && chrome.runtime.id) {
      return chrome.runtime.id;
    }
    // Fallback to stored ID or generated
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = Date.now().toString();
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  private handleStateUpdate(state: AppState) {
    this.isRecording = state.isRecording;
    this.status = state.status;
    this.error = state.error;
    this.isSubscribed = state.isSubscribed;
    this.usageCount = state.usageCount;
    this.conversationHistory = state.conversationHistory;
    this.persona = state.persona;
  }

  private startRecording() {
    chrome.runtime.sendMessage({type: 'START_RECORDING'});
  }

  private stopRecording() {
    chrome.runtime.sendMessage({type: 'STOP_RECORDING'});
  }

  private reset() {
    chrome.runtime.sendMessage({type: 'RESET_SESSION'});
  }

  private async handleSubscriptionToggle(e: Event) {
    const target = e.target as HTMLInputElement;
    
    if (target.checked) {
      // User wants to subscribe - initiate RevenueCat purchase flow
      this.initiateSubscriptionPurchase();
    } else {
      // User wants to unsubscribe - handle cancellation
      this.handleUnsubscription();
    }
  }

  private async initiateSubscriptionPurchase() {
    try {
      // Import the billing service
      const { initialize, getOfferings, purchasePackage } = await import('./src/billing-service');
      
      // Generate a unique user ID (could be Chrome extension ID or a generated UUID)
      const userId = 'user_' + Date.now(); // Replace with actual user ID logic
      
      // Initialize RevenueCat
      await initialize(userId);
      
      // Get available offerings
      const offerings = await getOfferings();
      
      // Find the subscription package (assuming first available package)
      const subscriptionPackage = offerings?.current?.availablePackages?.[0];
      
      if (subscriptionPackage) {
        // Initiate purchase
        const customerInfo = await purchasePackage(subscriptionPackage);
        
        // Check if user is now subscribed
        const isSubscribed = customerInfo.entitlements?.active?.['pro_access'] !== undefined;
        
        // Update local state and notify background script
        this.isSubscribed = isSubscribed;
        chrome.runtime.sendMessage({
          type: 'SET_SUBSCRIBED',
          isSubscribed: isSubscribed,
        });
        
        if (!isSubscribed) {
          throw new Error('Subscription not activated');
        }
      } else {
        throw new Error('No subscription packages available');
      }
    } catch (error) {
      console.error('Error initiating subscription:', error);
      this.error = 'Failed to initiate subscription. Please try again.';
      
      // Reset the toggle if purchase fails
      const toggle = this.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (toggle) toggle.checked = false;
    }
  }

  private async handleUnsubscription() {
    // For now, just update the state
    // In a real implementation, you might want to handle cancellation through RevenueCat
    chrome.runtime.sendMessage({
      type: 'SET_SUBSCRIBED',
      isSubscribed: false,
    });
  }

  private toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  render() {
    const canRecord = this.isSubscribed || this.usageCount < this.usageLimit;
    const menuClasses = {
      'side-menu': true,
      open: this.isMenuOpen,
    };

    return html`
      <div>
        <header class="header">
          <h1>${this.persona}: Executive Voice Assistant</h1>
          <p>Your AI assistant for browsing, forms, and notes.</p>
        </header>

        <button
          class="menu-toggle"
          @click=${this.toggleMenu}
          aria-label="Toggle Menu">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="32px"
            viewBox="0 -960 960 960"
            width="32px"
            fill="currentColor"
            style="color: white">
            <path
              d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
          </svg>
        </button>

        <nav class=${classMap(menuClasses)}>
          <h3>AI Tools</h3>
          <ul>
            <li>
              <a href="#" class="active">Executive Voice Assistant</a>
            </li>
            <li><a href="#">Classify/Coursify</a></li>
            <li><a href="#">Help/Instructions</a></li>
          </ul>
        </nav>

        <div class="freemium-controls">
          <div class="subscription-toggle">
            <span>Free Tier</span>
            <label class="switch">
              <input
                type="checkbox"
                .checked=${this.isSubscribed}
                @change=${this.handleSubscriptionToggle} />
              <span class="slider"></span>
            </label>
            <span>Subscribed</span>
          </div>
          ${!this.isSubscribed
            ? html`<p class="usage-text">
                ${this.usageLimit - this.usageCount > 0
                  ? `You have ${this.usageLimit - this.usageCount} free uses left today.`
                  : 'No free uses left. Subscribe for more.'}
              </p>`
            : html`<p class="usage-text">Unlimited usage enabled.</p>`}
        </div>

        <div class="controls">
          <button
            id="resetButton"
            @click=${this.reset}
            ?disabled=${this.isRecording}
            aria-label="Reset Session">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="40px"
              viewBox="0 -960 960 960"
              width="40px"
              fill="currentColor">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
          <button
            id="startButton"
            @click=${this.startRecording}
            class=${this.isRecording ? 'hidden' : ''}
            ?disabled=${!canRecord}
            aria-label="Start Recording">
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#c80000"
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="50" />
            </svg>
          </button>
          <button
            id="stopButton"
            @click=${this.stopRecording}
            class=${!this.isRecording ? 'hidden' : ''}
            aria-label="Stop Recording">
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#ffffff"
              xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="70" height="70" rx="15" />
            </svg>
          </button>
        </div>

        <div id="status">
          <p>${this.isRecording ? '🔴 Recording...' : this.status}</p>
          ${this.error ? html`<p class="error">${this.error}</p>` : ''}
        </div>

        ${this.isSubscribed && this.conversationHistory.length > 0
          ? html`
              <div class="lore-panel">
                <h3>Curated Lore</h3>
                <div class="history">
                  ${this.conversationHistory
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map(
                      (entry) => html`
                        <div class="history-entry">- ${entry.fact}</div>
                      `,
                    )}
                </div>
              </div>
            `
          : ''}

        <footer class="copyright-footer">
          <p>Copyright (C) 2025 Robin L. M. Cheung, MBA</p>
        </footer>

        <gdm-live-audio-visuals-3d></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}