import { AssistantConfig } from '../types';

const API_URL = "http://localhost:8000";
const STORAGE_KEYS = {
  CONFIG: 'assistant_config_saved',
  SESSIONS: 'assistant_sessions'
};

export interface TranscriptItem {
  role: string; 
  text: string; 
  timestamp: string;
}

export interface SessionData {
  id?: string;
  date: string; // ISO string
  duration: number; // seconds
  transcript: TranscriptItem[];
  summary?: string;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export const api = {
  async getConfig(): Promise<AssistantConfig | null> {
    try {
      const res = await fetch(`${API_URL}/api/config`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      // Sync successful fetch to local storage
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data));
      return data;
    } catch (e) {
      console.warn("Backend unreachable, loading config from local storage fallback.");
      const local = localStorage.getItem(STORAGE_KEYS.CONFIG);
      return local ? JSON.parse(local) : null;
    }
  },

  async saveConfig(config: AssistantConfig): Promise<void> {
    // Always save locally first to ensure data safety
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));

    try {
      await fetch(`${API_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (e) {
      console.warn("Backend unreachable, config saved to local storage only.");
    }
  },

  async getSessions(): Promise<SessionData[]> {
    try {
        const res = await fetch(`${API_URL}/api/sessions`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        // Sync successful fetch to local storage
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data));
        return data;
    } catch (e) {
        console.warn("Backend unreachable, loading sessions from local storage fallback.");
        const local = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        return local ? JSON.parse(local) : [];
    }
  },

  async saveSession(session: SessionData): Promise<void> {
      // Generate ID if missing
      if (!session.id) session.id = generateId();

      // Save locally
      const local = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const sessions: SessionData[] = local ? JSON.parse(local) : [];
      
      // Check if session exists (update) or is new (insert)
      const index = sessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        sessions[index] = session;
      } else {
        sessions.unshift(session); // Add to top
      }
      
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));

      try {
          await fetch(`${API_URL}/api/sessions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(session)
          });
      } catch (e) {
          console.warn("Backend unreachable, session saved to local storage only.");
      }
  }
};