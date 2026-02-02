
import { db, UserSchema } from './db';
import { User } from '../types';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE = process.env.REACT_APP_API_URL || process.env.API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE}/api/auth`;

const TOKEN_KEY = 'devsync_jwt';
const SESSION_KEY = 'devsync_session'; // For offline mode
const MODE_KEY = 'devsync_mode'; // 'server' or 'local'

export const getMode = (): 'server' | 'local' => {
  return (localStorage.getItem(MODE_KEY) as 'server' | 'local') || 'local';
};

export const setMode = (mode: 'server' | 'local') => {
  localStorage.setItem(MODE_KEY, mode);
  window.location.reload();
};

export const authService = {
  async register(email: string, password: string, name: string): Promise<User> {
    if (getMode() === 'local') {
      const existing = await db.users.findOne({ email });
      if (existing) throw new Error('Email already registered');
      
      const newUser: UserSchema = {
        id: Math.random().toString(36).substring(2, 10),
        email, name, passwordHash: btoa(password), createdAt: Date.now()
      };
      await db.users.insertOne(newUser);
      const user = { id: newUser.id, email: newUser.email, name: newUser.name };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return user;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(error.message || 'Registration failed');
      }
      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error(`Cannot connect to server at ${API_BASE}. Ensure backend is running or switch to Offline Mode.`);
      }
      throw err;
    }
  },

  async login(email: string, password: string): Promise<User> {
    if (getMode() === 'local') {
      const user = await db.users.findOne({ email });
      if (!user || user.passwordHash !== btoa(password)) throw new Error('Invalid credentials');
      const sessionUser = { id: user.id, email: user.email, name: user.name };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(error.message || 'Login failed');
      }
      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error(`Cannot connect to server at ${API_BASE}. Ensure backend is running or switch to Offline Mode.`);
      }
      throw err;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (getMode() === 'local') {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return await response.json();
    } catch {
      // If server is down during session check, just return null (logged out)
      // but don't clear token immediately in case it's a temporary glitch
      return null;
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
};
