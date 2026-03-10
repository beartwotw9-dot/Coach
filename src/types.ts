export interface Goal {
  id: string;
  title: string;
  description?: string;
  progress: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

export interface Task {
  id: string;
  goalId?: string;
  title: string;
  status: 'todo' | 'done';
  priority: 'urgent' | 'easy' | 'normal';
  estimatedTime?: number;
  createdAt: string;
  completedAt?: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  url?: string;
  summary?: string;
  category: 'daily' | 'learning' | 'project' | 'other';
  createdAt: string;
}

export interface DailyLog {
  id: string;
  date: string;
  achievements: string[];
  feedback: string;
  mood?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string;
  createdAt: string;
}
