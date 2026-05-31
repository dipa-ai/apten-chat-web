import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Attachment } from '../api/types';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

// MessageBubble pulls in the chat store (and thus the WS/auth modules) through
// its imports; mock them so importing AttachmentView has no side effects.
vi.mock('../api/http', () => ({ api: apiMock }));
vi.mock('../api/ws', () => ({
  wsClient: { subscribe: () => () => {}, send: vi.fn(), connect: vi.fn() },
}));
vi.mock('../stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: null }) },
}));

import { AttachmentView } from './MessageBubble';

const imageAttachment: Attachment = {
  id: 55,
  message_id: 101,
  file_name: 'photo.jpg',
  file_size: 2048,
  mime_type: 'image/jpeg',
  storage_path: 's',
  thumbnail_path: 't',
  created_at: 't',
};

const fileAttachment: Attachment = {
  id: 56,
  message_id: 101,
  file_name: 'doc.pdf',
  file_size: 5000,
  mime_type: 'application/pdf',
  storage_path: 's',
  thumbnail_path: null,
  created_at: 't',
};

beforeEach(() => {
  apiMock.mockReset();
});

describe('AttachmentView', () => {
  it('loads an image thumbnail from the signed URL', async () => {
    apiMock.mockResolvedValueOnce({ url: 'https://storage/thumb.jpg' });

    render(<AttachmentView attachment={imageAttachment} />);

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'https://storage/thumb.jpg');
    expect(apiMock).toHaveBeenCalledWith('/api/files/55/thumb');
  });

  it('falls back to the file name when the thumbnail fails to load', async () => {
    apiMock.mockRejectedValueOnce(new Error('403'));

    render(<AttachmentView attachment={imageAttachment} />);

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('opens a non-image file via a signed URL on click', async () => {
    apiMock.mockResolvedValueOnce({ url: 'https://storage/doc.pdf' });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<AttachmentView attachment={fileAttachment} />);
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('4.9 KB')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://storage/doc.pdf',
        '_blank',
        'noopener,noreferrer',
      ),
    );
    expect(apiMock).toHaveBeenCalledWith('/api/files/56');
    openSpy.mockRestore();
  });
});
