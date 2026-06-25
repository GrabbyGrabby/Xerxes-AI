export interface LocalConversation {
  id: string;
  title: string;
  created_at: string;
  user_id: string | null;
  guest_id: string | null;
  last_updated?: string;
}

export interface LocalMessage {
  id?: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  model_id?: string;
  tool_calls?: any;
  created_at: string;
}

const DB_NAME = 'xerxes_ai_local_db';
const DB_VERSION = 1;

class IndexedDbHelper {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is only available in the browser'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        this.dbPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('guest_id', 'guest_id', { unique: false });
          convStore.createIndex('user_id', 'user_id', { unique: false });
          convStore.createIndex('last_updated', 'last_updated', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // Save or update a conversation
  async saveConversation(conv: LocalConversation): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        
        const data = {
          ...conv,
          last_updated: conv.last_updated || new Date().toISOString()
        };

        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to save conversation locally:', e);
    }
  }

  // Get all conversations for a specific guest/user
  async getAllConversations(guestId: string | null, userId: string | null): Promise<LocalConversation[]> {
    try {
      const db = await this.getDB();
      return new Promise<LocalConversation[]>((resolve, reject) => {
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const request = store.getAll();

        request.onsuccess = () => {
          let list = request.result as LocalConversation[];
          // Filter locally
          if (userId) {
            list = list.filter(c => c.user_id === userId);
          } else if (guestId) {
            list = list.filter(c => c.guest_id === guestId);
          } else {
            // Unauthenticated/no guest id filter (fallback)
            list = list.filter(c => !c.user_id && !c.guest_id);
          }

          // Sort by last_updated desc, then created_at desc
          list.sort((a, b) => {
            const timeA = new Date(a.last_updated || a.created_at).getTime();
            const timeB = new Date(b.last_updated || b.created_at).getTime();
            return timeB - timeA;
          });

          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to load local conversations:', e);
      return [];
    }
  }

  // Get a single conversation by ID
  async getConversation(id: string): Promise<LocalConversation | null> {
    try {
      const db = await this.getDB();
      return new Promise<LocalConversation | null>((resolve, reject) => {
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to get local conversation:', e);
      return null;
    }
  }

  // Delete a conversation and all its messages
  async deleteConversation(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      // First delete conversation
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Then delete all messages inside it
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        const index = store.index('conversation_id');
        const request = index.openCursor(IDBKeyRange.only(id));

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to delete local conversation:', e);
    }
  }

  // Save a message
  async saveMessage(msg: LocalMessage): Promise<void> {
    try {
      const db = await this.getDB();
      // Update last_updated timestamp on the parent conversation
      this.touchConversation(msg.conversation_id);

      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        
        const request = store.add({
          conversation_id: msg.conversation_id,
          role: msg.role,
          content: msg.content,
          model_id: msg.model_id,
          tool_calls: msg.tool_calls ? JSON.parse(JSON.stringify(msg.tool_calls)) : null,
          created_at: msg.created_at || new Date().toISOString()
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to save local message:', e);
    }
  }

  // Helper to update last_updated of conversation
  private async touchConversation(conversationId: string) {
    const conv = await this.getConversation(conversationId);
    if (conv) {
      conv.last_updated = new Date().toISOString();
      await this.saveConversation(conv);
    }
  }

  // Get all messages for a specific conversation
  async getMessages(conversationId: string): Promise<LocalMessage[]> {
    try {
      const db = await this.getDB();
      return new Promise<LocalMessage[]>((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const index = store.index('conversation_id');
        const request = index.getAll(IDBKeyRange.only(conversationId));

        request.onsuccess = () => {
          const list = request.result as LocalMessage[];
          // Sort by auto-increment ID to maintain exact order of insertion
          list.sort((a, b) => (a.id || 0) - (b.id || 0));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Failed to load local messages:', e);
      return [];
    }
  }

  // Bulk save conversations (for cloud sync down to local)
  async bulkSaveConversations(convs: LocalConversation[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');

        convs.forEach(conv => {
          store.put(conv);
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('Failed bulk saving conversations:', e);
    }
  }

  // Bulk save messages (for cloud sync down to local)
  async bulkSaveMessages(conversationId: string, msgs: LocalMessage[]): Promise<void> {
    try {
      const db = await this.getDB();
      
      // Clear existing messages for this conversation first to prevent duplicates during sync
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        const index = store.index('conversation_id');
        const request = index.openCursor(IDBKeyRange.only(conversationId));

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      // Write new messages
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        msgs.forEach(msg => {
          store.add({
            conversation_id: conversationId,
            role: msg.role,
            content: msg.content,
            model_id: msg.model_id,
            tool_calls: msg.tool_calls ? JSON.parse(JSON.stringify(msg.tool_calls)) : null,
            created_at: msg.created_at || new Date().toISOString()
          });
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('Failed bulk saving messages:', e);
    }
  }
}

export const localDb = new IndexedDbHelper();
