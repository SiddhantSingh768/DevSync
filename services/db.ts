
import { User, Document } from '../types';

// Simulate network delay for realism
const DELAY_MS = 600;

const delay = <T>(data: T): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), DELAY_MS));
};

// Generic MongoDB-like Collection
class Collection<T extends { id: string }> {
  constructor(private name: string) {}

  private get key() {
    return `devsync_db_${this.name}`;
  }

  private load(): T[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private save(data: T[]) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }

  async find(query: Partial<T> = {}): Promise<T[]> {
    const data = this.load();
    const results = data.filter(item => {
      return Object.entries(query).every(([key, value]) => {
        return (item as any)[key] === value;
      });
    });
    return delay(results);
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    const data = this.load();
    const item = data.find(item => {
      return Object.entries(query).every(([key, value]) => {
        return (item as any)[key] === value;
      });
    });
    return delay(item || null);
  }

  async insertOne(doc: T): Promise<T> {
    const data = this.load();
    data.push(doc);
    this.save(data);
    return delay(doc);
  }

  async updateOne(query: Partial<T>, update: Partial<T>): Promise<T | null> {
    const data = this.load();
    const index = data.findIndex(item => {
      return Object.entries(query).every(([key, value]) => {
        return (item as any)[key] === value;
      });
    });

    if (index === -1) return delay(null);

    const updatedItem = { ...data[index], ...update };
    data[index] = updatedItem;
    this.save(data);
    
    // Notify app of changes
    if (this.name === 'documents') {
      window.dispatchEvent(new CustomEvent('devsync_docs_changed'));
    }
    
    return delay(updatedItem);
  }

  async deleteOne(query: Partial<T>): Promise<boolean> {
    let data = this.load();
    const initialLength = data.length;
    
    data = data.filter(item => {
      return !Object.entries(query).every(([key, value]) => {
        return (item as any)[key] === value;
      });
    });

    if (data.length !== initialLength) {
      this.save(data);
      if (this.name === 'documents') {
        window.dispatchEvent(new CustomEvent('devsync_docs_changed'));
      }
      return delay(true);
    }
    
    return delay(false);
  }
}

// Database schema extensions
export interface UserSchema extends User {
  passwordHash: string; // In a real DB, this is hashed
  createdAt: number;
}

export interface DocumentSchema extends Document {}

export const db = {
  users: new Collection<UserSchema>('users'),
  documents: new Collection<DocumentSchema>('documents')
};
