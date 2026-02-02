
import { SyncMessage } from '../types';

type MessageCallback = (msg: SyncMessage) => void;

class SyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MessageCallback> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('devsync-realtime');
        this.channel.onmessage = (event) => {
          const msg: SyncMessage = event.data;
          this.listeners.forEach(callback => callback(msg));
        };
      } catch (e) {
        console.warn('SyncService: BroadcastChannel failed to initialize', e);
      }
    } else {
      console.warn('SyncService: BroadcastChannel is not supported in this environment');
    }
  }

  subscribe(callback: MessageCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  broadcast(message: SyncMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.error('Failed to broadcast sync message', e);
      }
    }
  }
}

export const syncService = new SyncService();
