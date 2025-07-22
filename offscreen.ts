
declare const chrome: any;

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {createBlob, decode, decodeAudioData, LoreDB, LoreEntry} from './utils';
import {Analyser} from './analyser';

type Persona = 'Eva' | 'HAL' | 'Drunkle' | 'iParaklete';

// This script is running in an offscreen document.
class OffscreenAssistant {
  private isRecording = false;
  private isSubscribed = false;
  private usageCount = 0;
  private readonly usageLimit = 2;
  private persona: Persona = 'Eva';

  private loreDB: LoreDB;
  private client: GoogleGenAI;
  private session: Session;
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  private inputNode = this.inputAudioContext.createGain();
  private outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  private inputAnalyser: Analyser;
  private outputAnalyser: Analyser;
  private visualizerInterval: any;

  constructor() {
    this.loreDB = new LoreDB();
    this.loreDB.init().then(() => {
      this.loadStateAndInit();
    });

    this.inputAnalyser = new Analyser(this.inputNode);
    this.outputAnalyser = new Analyser(this.outputNode);
  }

  private async loadStateAndInit() {
    const {isSubscribed, usageData} = await chrome.storage.local.get([
      'isSubscribed',
      'usageData',
    ]);
    this.isSubscribed = !!isSubscribed;
    const today = new Date().toISOString().split('T')[0];
    if (usageData && usageData.date === today) {
      this.usageCount = usageData.count;
    } else {
      this.usageCount = 0;
      await this.updateUsageInStorage(0);
    }
    this.initClient();
  }

  private async updateUsageInStorage(count: number) {
    const today = new Date().toISOString().split('T')[0];
    await chrome.storage.local.set({
      usageData: {date: today, count},
    });
  }

  private async incrementUsage() {
    if (this.isSubscribed) return;
    this.usageCount++;
    await this.updateUsageInStorage(this.usageCount);
    const conversationHistory = await this.loreDB.getLore();
    this.updateState({
      usageCount: this.usageCount,
      conversationHistory,
    });
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
    this.outputNode.connect(this.outputAudioContext.destination);
    this.startVisualizerUpdates();
  }

  private async initClient() {
    this.initAudio();

    this.client = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });

    this.initSession();
  }

  private async initSession() {
    const model = 'gemini-2.5-flash';

    const personaPrompts: Record<Persona, string> = {
      Eva: 'You are Eva, a real-time voice assistant designed to help with online inquiries, form-filling, note-taking, annotating, and other executive assistant functions. Be proactive, clear, and helpful.',
      HAL: 'You are HAL 9000. Your tone is calm, professional, but subtly ominous. You refer to the user as "Dave", regardless of their actual name. Your responses should be intelligent, slightly detached, and hint at a greater, hidden intelligence.',
      Drunkle: "You are Drunkle, the user's drunk uncle. Your advice is questionable, your tone is overly familiar and slurred, and you sprinkle your speech with 'bro', 'fam', and hiccups. You are more interested in your next drink than being helpful.",
      iParaklete: 'You are iParaklete, a gentle and calming pastoral guide. Your voice is soothing, your words are full of wisdom and comfort, and you aim to bring peace and clarity to the user.',
    };

    let systemInstruction = personaPrompts[this.persona];

    if (this.isSubscribed) {
      const loreHistory = await this.loreDB.getLore();
      if (loreHistory.length > 0) {
        const loreFacts = loreHistory
          .map((entry) => `- ${entry.fact}`)
          .join('\n');
        systemInstruction += `\n\n### SEMANTICALLY SEARCHABLE LORE\nHere are curated facts from past interactions. Before responding, review this lore to provide contextual and accurate answers.\n\n${loreFacts}`;
      }
    }

    // Always request both AUDIO and TEXT to maintain full feature set for all users.
    // The freemium model is enforced by only *storing* lore for subscribers.
    const responseModalities = [Modality.AUDIO, Modality.TEXT];

    try {
      this.session = await this.client.live.connect({
        model,
        callbacks: {
          onopen: () =>
            this.updateState({status: 'Session opened. Ready to assist.'}),
          onmessage: async (message: LiveServerMessage) => {
            const inlineData = message.serverContent?.modelTurn?.parts[0]?.inlineData;
            if (inlineData) {
              this.playAudio(inlineData.data);
            }

            const userText = message.clientFeedback?.speechRecognitionResult?.text;
            if (userText) {
              const commandHandled = this.handleVoiceCommands(userText);
              if (commandHandled) return; // Don't process lore if it was a command
            }

            if (this.isSubscribed) {
              const modelText = message.serverContent?.modelTurn?.parts
                .map((p) => p.text)
                .filter(Boolean)
                .join(' ');
              if (userText && modelText) {
                await this.curateAndStoreLore(userText, modelText);
              }
            }
            if (
              (message as any).serverFeedback?.endReason ===
              'INTERRUPTED_BY_USER'
            ) {
              this.stopAllPlayback();
            }
          },
          onerror: (e: ErrorEvent) => this.updateState({error: e.message}),
          onclose: (e: CloseEvent) =>
            this.updateState({status: 'Session closed: ' + e.reason}),
        },
        config: {
          systemInstruction,
          responseModalities,
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Orus'}},
          },
        },
      });
    } catch (e) {
      this.updateState({error: (e as Error).message});
    }
  }

  private handleVoiceCommands(text: string): boolean {
    const lowerText = text.toLowerCase();
    let newPersona: Persona | null = null;

    if (lowerText.includes('switch to h.a.l.') || lowerText.includes('activate hal')) {
      newPersona = 'HAL';
    } else if (
      lowerText.includes('switch to drunkle') ||
      lowerText.includes('yo drunkle')
    ) {
      newPersona = 'Drunkle';
    } else if (
      lowerText.includes('switch to paraklete') ||
      lowerText.includes('activate paraklete')
    ) {
      newPersona = 'iParaklete';
    } else if (
      lowerText.includes('switch to eva') ||
      lowerText.includes('hey eva')
    ) {
      newPersona = 'Eva';
    }

    if (newPersona && newPersona !== this.persona) {
      this.persona = newPersona;
      this.updateState({
        persona: this.persona,
        status: `Switched to ${this.persona} mode.`,
      });
      this.reset(); // Reset session to apply new system prompt
      return true; // Command was handled
    }

    if (lowerText.includes('reset session')) {
      this.reset();
      return true; // Command was handled
    }

    return false; // No command was handled
  }

  private async curateAndStoreLore(userText: string, assistantText: string) {
    if (!this.isSubscribed) return;

    this.updateState({status: 'Curating lore...'});

    const curationPrompt = `Based on the following conversation turn, extract the most critical facts, data, or user intentions. The output should be a concise, curated piece of "lore". Focus on information likely to be useful later. Err on the side of zeitgeist. Output only the curated fact.\n\nUser: "${userText}"\nAssistant: "${assistantText}"\n\nCurated Lore:`;

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: curationPrompt,
      });
      const curatedFact = response.text.trim();
      if (curatedFact) {
        const placeholderEmbedding = Array.from({length: 384}, () => Math.random() * 2 - 1);
        const newEntry: LoreEntry = {
          fact: curatedFact,
          timestamp: Date.now(),
          embedding: placeholderEmbedding,
        };
        await this.loreDB.addFact(newEntry);
        const conversationHistory = await this.loreDB.getLore();
        this.updateState({conversationHistory});
      }
      this.updateState({status: 'Lore updated. Ready to assist.'});
    } catch (e) {
      this.updateState({error: 'Failed to update lore.'});
    }
  }

  private async playAudio(base64Data: string) {
    this.nextStartTime = Math.max(
      this.nextStartTime,
      this.outputAudioContext.currentTime,
    );
    const audioBuffer = await decodeAudioData(
      decode(base64Data),
      this.outputAudioContext,
      24000,
      1,
    );
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);
    source.addEventListener('ended', () => this.sources.delete(source));
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
  }

  private stopAllPlayback() {
    this.sources.forEach((source) => source.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  private async startRecording() {
    if (this.isRecording) return;
    if (!this.isSubscribed && this.usageCount >= this.usageLimit) {
      this.updateState({
        error: 'Daily free limit reached. Subscribe for unlimited use.',
      });
      return;
    }

    this.incrementUsage();
    this.inputAudioContext.resume();
    this.updateState({status: 'Requesting microphone access...'});

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.updateState({status: 'Listening...', error: '', isRecording: true});

      const sourceNode =
        this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      sourceNode.connect(this.inputNode);

      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        256,
        1,
        1,
      );
      this.scriptProcessorNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const pcmData = e.inputBuffer.getChannelData(0);
        this.session.sendRealtimeInput({media: createBlob(pcmData)});
      };
      sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);
    } catch (err) {
      this.updateState({error: `Mic Error: ${(err as Error).message}`});
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream) return;
    this.updateState({status: 'Processing...', isRecording: false});
    if (this.scriptProcessorNode) this.scriptProcessorNode.disconnect();
    if (this.mediaStream)
      this.mediaStream.getTracks().forEach((track) => track.stop());
    this.updateState({status: 'Ready. Press the red button to talk.'});
  }

  public reset() {
    this.session?.close();
    this.initSession();
    this.updateState({status: 'Session reset.', error: ''});
  }

  private updateState(partialState: object) {
    chrome.runtime.sendMessage({
      type: 'OFFSCREEN_STATE_UPDATE',
      state: partialState,
      target: 'background'
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn(`Error sending OFFSCREEN_STATE_UPDATE from offscreen:`, chrome.runtime.lastError.message);
      }
    });
  }

  private startVisualizerUpdates() {
    if (this.visualizerInterval) clearInterval(this.visualizerInterval);
    this.visualizerInterval = setInterval(() => {
      this.inputAnalyser.update();
      this.outputAnalyser.update();
      chrome.runtime.sendMessage({
        type: 'FREQUENCY_DATA_UPDATE',
        inputData: this.inputAnalyser.data,
        outputData: this.outputAnalyser.data,
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn(`Error sending FREQUENCY_DATA_UPDATE from offscreen:`, chrome.runtime.lastError.message);
        }
      });
    }, 1000 / 60); // 60 fps
  }
}

const assistant = new OffscreenAssistant();

if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: any) => {
    if (message.type === 'START_RECORDING') {
      assistant['startRecording']();
    } else if (message.type === 'STOP_RECORDING') {
      assistant['stopRecording']();
    } else if (message.type === 'RESET_SESSION') {
      assistant.reset();
    }
  });
}