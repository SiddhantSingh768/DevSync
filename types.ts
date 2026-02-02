
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  updatedAt: number;
  createdAt: number;
  isPrivate: boolean;
}

export interface SyncMessage {
  type: 'update' | 'presence' | 'request_sync' | 'sync_response';
  docId: string;
  userId: string;
  userName: string;
  content?: string;
  title?: string;
  isPrivate?: boolean;
  timestamp?: number;
}

export enum AppRoute {
  AUTH = 'auth',
  DASHBOARD = 'dashboard',
  EDITOR = 'editor'
}
