import { useState, useRef, useCallback, type FormEvent, type DragEvent } from 'react';
import { useChatStore } from '../stores/chatStore';

interface Props {
  chatId: number;
}

export default function MessageInput({ chatId }: Props) {
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const uploadFile = useChatStore((s) => s.uploadFile);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(chatId, text.trim());
    setText('');
    sendTyping(chatId, false);
  };

  const handleInput = (value: string) => {
    setText(value);
    if (value.trim()) {
      sendTyping(chatId, true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        sendTyping(chatId, false);
      }, 3000);
    } else {
      sendTyping(chatId, false);
    }
  };

  const handleFile = useCallback(
    (file: File) => {
      uploadFile(chatId, file);
    },
    [chatId, uploadFile],
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form
      className={`message-input ${dragOver ? 'drag-over' : ''}`}
      onSubmit={handleSubmit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <button
        type="button"
        className="btn-icon attach-btn"
        onClick={() => fileInputRef.current?.click()}
        title="Attach file"
      >
        📎
      </button>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelect}
      />
      <input
        type="text"
        className="message-text-input"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => handleInput(e.target.value)}
        autoFocus
      />
      <button type="submit" className="btn-send" disabled={!text.trim()}>
        Send
      </button>
    </form>
  );
}
