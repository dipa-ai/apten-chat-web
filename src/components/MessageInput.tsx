import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useChatStore } from '../stores/chatStore';

interface Props {
  chatId: number;
}

const TYPING_IDLE_MS = 3000;
const MAX_TEXTAREA_HEIGHT = 160;

export default function MessageInput({ chatId }: Props) {
  const [text, setText] = useState('');
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const uploadFile = useChatStore((s) => s.uploadFile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTypingRef = useRef(false);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

  // Reset input when switching chats
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText('');
    if (isTypingRef.current) {
      sendTyping(chatId, false);
      isTypingRef.current = false;
    }
    clearTimeout(typingTimeout.current);
  }, [chatId, sendTyping]);

  // Ensure typing.stop is sent on unmount
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout.current);
      if (isTypingRef.current) {
        sendTyping(chatId, false);
        isTypingRef.current = false;
      }
    };
  }, [chatId, sendTyping]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(chatId, trimmed);
    setText('');
    if (isTypingRef.current) {
      sendTyping(chatId, false);
      isTypingRef.current = false;
    }
    clearTimeout(typingTimeout.current);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (value: string) => {
    setText(value);
    const hasText = value.trim().length > 0;

    if (hasText && !isTypingRef.current) {
      sendTyping(chatId, true);
      isTypingRef.current = true;
    }

    clearTimeout(typingTimeout.current);
    if (hasText) {
      typingTimeout.current = setTimeout(() => {
        if (isTypingRef.current) {
          sendTyping(chatId, false);
          isTypingRef.current = false;
        }
      }, TYPING_IDLE_MS);
    } else if (isTypingRef.current) {
      sendTyping(chatId, false);
      isTypingRef.current = false;
    }
  };

  const handleFile = useCallback(
    (file: File) => {
      uploadFile(chatId, file);
    },
    [chatId, uploadFile],
  );

  const handleFileSelect = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSend = text.trim().length > 0;

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="composer-shell">
        <button
          type="button"
          className="composer-icon attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          aria-label="Attach file"
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path
              d="M8 12l6-6a3 3 0 014.2 4.2l-9 9a4.5 4.5 0 01-6.4-6.4l8-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={handleFileSelect}
        />
        <textarea
          ref={textareaRef}
          className="message-text-input"
          placeholder="Message…"
          value={text}
          rows={1}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button
          type="submit"
          className={`composer-send ${canSend ? 'active' : ''}`}
          disabled={!canSend}
          aria-label="Send"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M3 10l14-7-6 14-2-6z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
