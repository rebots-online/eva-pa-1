/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {Blob} from '@google/genai';

function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }
  // Extract interleaved channels
  if (numChannels === 0) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i,
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
}

const DB_NAME = 'LoreDB';
const STORE_NAME = 'lore_store';
const DB_VERSION = 3; // Incremented version for new schema

export interface LoreEntry {
  fact: string;
  timestamp: number;
  embedding: number[];
}

export class LoreDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject('Error opening LoreDB');
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (db.objectStoreNames.contains('conversation')) {
          db.deleteObjectStore('conversation');
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {autoIncrement: true});
        }
      };
    });
  }

  private getStore(mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(STORE_NAME, mode);
    return transaction.objectStore(STORE_NAME);
  }

  async addFact(fact: LoreEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.add(fact);
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to add fact to lore');
    });
  }

  async getLore(): Promise<LoreEntry[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Failed to retrieve lore');
    });
  }

  async clearLore(): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to clear lore');
    });
  }
}

export {createBlob, decode, decodeAudioData, encode};