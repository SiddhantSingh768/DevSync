
import { Document } from '../types';
import { authService, getMode } from './authService';
import { db } from './db';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE = process.env.REACT_APP_API_URL || process.env.API_URL || 'http://localhost:3001';
const API_URL = `${API_BASE}/api/documents`;

const getHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const docService = {
  async getDocuments(userId: string): Promise<Document[]> {
    if (getMode() === 'local') {
      const docs = await db.documents.find();
      return docs
        .filter(d => d.ownerId === userId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    const response = await fetch(API_URL, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch documents');
    return await response.json();
  },

  async getDocumentById(id: string): Promise<Document | null> {
    if (getMode() === 'local') {
      return await db.documents.findOne({ id });
    }

    const response = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch document');
    return await response.json();
  },

  async saveDocument(doc: Document): Promise<Document> {
    if (getMode() === 'local') {
      const existing = await db.documents.findOne({ id: doc.id });
      const updatedDoc = {
        ...doc,
        updatedAt: Date.now(),
        createdAt: doc.createdAt || Date.now()
      };
      if (existing) {
        await db.documents.updateOne({ id: doc.id }, updatedDoc);
      } else {
        await db.documents.insertOne(updatedDoc);
      }
      return updatedDoc;
    }

    const response = await fetch(`${API_URL}/${doc.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        title: doc.title,
        content: doc.content,
        isPrivate: doc.isPrivate
      })
    });
    if (!response.ok) throw new Error('Failed to save document');
    return await response.json();
  },

  async deleteDocument(id: string): Promise<void> {
    if (getMode() === 'local') {
      await db.documents.deleteOne({ id });
      return;
    }

    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete document');
  },

  async createDocument(userId: string, title: string = 'Untitled Doc'): Promise<Document> {
    if (getMode() === 'local') {
      const newDoc: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title,
        content: '# New Document\n\nStart writing your technical documentation here...',
        ownerId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPrivate: false
      };
      await db.documents.insertOne(newDoc);
      return newDoc;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        title,
        content: '# New Document\n\nStart writing your technical documentation here...'
      })
    });
    if (!response.ok) throw new Error('Failed to create document');
    return await response.json();
  }
};
