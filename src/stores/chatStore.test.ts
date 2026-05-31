import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Chat, Message, WsEvent } from '../api/types';

// api() and the WebSocket client are mocked so the store can be exercised in
// isolation. wsState.handler captures the subscriber registered by
// initWsListeners so tests can dispatch synthetic WS events.
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
const wsState = vi.hoisted(() => ({
  handler: null as ((e: WsEvent) => void) | null,
}));

vi.mock('../api/http', () => ({ api: apiMock }));
vi.mock('../api/ws', () => ({
  wsClient: {
    subscribe: (cb: (e: WsEvent) => void) => {
      wsState.handler = cb;
      return () => {};
    },
    send: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));
vi.mock('./authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 10, display_name: 'Alex', username: 'alex' } }),
  },
}));

import { useChatStore } from './chatStore';

const groupChat: Chat = {
  id: 7,
  type: 'group',
  name: 'Team',
  avatar_url: null,
  created_at: 't',
  updated_at: 't',
};

function seedMessage(overrides: Partial<Message>): Message {
  return {
    id: 1,
    chat_id: 7,
    sender_id: 10,
    sender_display_name: 'Alex',
    content: null,
    reply_to_id: null,
    created_at: 't',
    updated_at: null,
    deleted_at: null,
    attachments: [],
    ...overrides,
  };
}

beforeEach(() => {
  apiMock.mockReset();
  wsState.handler = null;
  useChatStore.setState({
    chats: [],
    activeChatId: null,
    activeChatMembers: [],
    messages: {},
    typing: {},
    onlineUsers: new Set(),
    readReceipts: {},
    toasts: [],
    hasMore: {},
  });
});

describe('uploadFile', () => {
  it('inserts the uploaded message with its attachment and the sender name', async () => {
    apiMock.mockResolvedValueOnce({
      message: {
        id: 101,
        chat_id: 7,
        sender_id: 10,
        content: null,
        reply_to_id: null,
        created_at: '2026-05-31T00:00:00Z',
        updated_at: null,
      },
      attachment: {
        id: 55,
        message_id: 101,
        file_name: 'photo.jpg',
        file_size: 123,
        mime_type: 'image/jpeg',
        storage_path: 's',
        thumbnail_path: null,
        created_at: '2026-05-31T00:00:00Z',
      },
    });

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await useChatStore.getState().uploadFile(7, file);

    const msgs = useChatStore.getState().messages[7];
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ id: 101, sender_display_name: 'Alex', deleted_at: null });
    expect(msgs[0].attachments).toHaveLength(1);
    expect(msgs[0].attachments[0].id).toBe(55);
  });

  it('does not insert a duplicate when the message id is already present', async () => {
    useChatStore.setState({ messages: { 7: [seedMessage({ id: 101 })] } });
    apiMock.mockResolvedValueOnce({
      message: {
        id: 101,
        chat_id: 7,
        sender_id: 10,
        content: null,
        reply_to_id: null,
        created_at: 't',
        updated_at: null,
      },
      attachment: {
        id: 55,
        message_id: 101,
        file_name: 'photo.jpg',
        file_size: 1,
        mime_type: 'image/jpeg',
        storage_path: 's',
        thumbnail_path: null,
        created_at: 't',
      },
    });

    await useChatStore.getState().uploadFile(7, new File(['x'], 'photo.jpg'));

    expect(useChatStore.getState().messages[7]).toHaveLength(1);
  });
});

describe('message.new WebSocket handling', () => {
  function dispatchNew(payload: Record<string, unknown>) {
    wsState.handler!({ type: 'message.new', payload } as WsEvent);
  }

  it('dedupes a broadcast for a message already inserted from the upload response', () => {
    useChatStore.setState({
      chats: [groupChat],
      messages: {
        7: [
          seedMessage({
            id: 101,
            attachments: [
              {
                id: 55,
                message_id: 101,
                file_name: 'p.jpg',
                file_size: 1,
                mime_type: 'image/jpeg',
                storage_path: 's',
                thumbnail_path: null,
                created_at: 't',
              },
            ],
          }),
        ],
      },
    });
    const unsub = useChatStore.getState().initWsListeners();

    dispatchNew({
      id: 101,
      chat_id: 7,
      sender_id: 10,
      sender_name: 'Alex',
      content: null,
      reply_to_id: null,
      attachments: [],
      created_at: 't',
      client_id: '',
    });

    expect(useChatStore.getState().messages[7]).toHaveLength(1);
    unsub();
  });

  it('adds a genuinely new message and maps its attachments', () => {
    useChatStore.setState({ chats: [groupChat], messages: { 7: [] } });
    const unsub = useChatStore.getState().initWsListeners();

    dispatchNew({
      id: 202,
      chat_id: 7,
      sender_id: 11,
      sender_name: 'Bob',
      content: null,
      reply_to_id: null,
      attachments: [
        {
          id: 77,
          message_id: 202,
          file_name: 'report.pdf',
          file_size: 4096,
          mime_type: 'application/pdf',
          storage_path: 's',
          thumbnail_path: null,
          created_at: 't',
        },
      ],
      created_at: 't',
      client_id: '',
    });

    const msgs = useChatStore.getState().messages[7];
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe(202);
    expect(msgs[0].attachments).toHaveLength(1);
    expect(msgs[0].attachments[0].file_name).toBe('report.pdf');
    unsub();
  });
});
