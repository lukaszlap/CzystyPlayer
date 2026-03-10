// Auth Types - aligned with actual database schema
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  message: string;
}

// Conversation Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface Conversation {
  id: string;
  uuid: string;
  title: string;
  model?: string;
  messageCount: number;
  lastMessageAt?: Date;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: Date;
}

// Settings Types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  twoFactorEnabled: boolean;
}
