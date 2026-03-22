export interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface Chat {
  id: number;
  type: 'direct' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ChatDetail {
  chat: Chat;
  members: User[];
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  sender_display_name: string;
  content: string | null;
  reply_to_id: number | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  _clientId?: string;
}

export interface Attachment {
  id: number;
  message_id: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  thumbnail_path: string | null;
  created_at: string;
}

export interface Invite {
  id: number;
  code: string;
  created_by: number;
  used_by: number | null;
  expires_at: string;
  created_at: string;
}

// WebSocket event types
export interface WsEvent<T = unknown> {
  type: string;
  payload: T;
}

export interface WsMessageNew {
  id: number;
  chat_id: number;
  sender_id: number;
  sender_name: string;
  content: string | null;
  reply_to_id: number | null;
  attachments: Attachment[];
  created_at: string;
  client_id: string;
}

export interface WsMessageAck {
  client_id: string;
  message_id: number;
}

export interface WsTypingUpdate {
  chat_id: number;
  user_id: number;
  is_typing: boolean;
}

export interface WsReadUpdate {
  chat_id: number;
  user_id: number;
  last_read_msg_id: number;
}

export interface WsPresenceUpdate {
  user_id: number;
  status: 'online' | 'offline';
}

export interface WsMessageUpdated {
  id: number;
  chat_id: number;
  content: string;
  updated_at: string;
}

export interface WsMessageDeleted {
  id: number;
  chat_id: number;
}
