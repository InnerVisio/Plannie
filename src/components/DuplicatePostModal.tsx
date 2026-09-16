import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { addDays } from 'date-fns';
import { db } from '../firebase';
import type { Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { Modal, Button, Input } from './ui';

interface DuplicatePostModalProps {
  post: Post;
  onClose: () => void;
  onDuplicated: () => void;
}

const toLocalInputValue = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function DuplicatePostModal({ post, onClose, onDuplicated }: DuplicatePostModalProps) {
  const { toast } = useToast();
  const [scheduledDate, setScheduledDate] = useState(() =>
    toLocalInputValue(addDays(new Date(post.scheduledDate), 7))
  );
  const [copyMedia, setCopyMedia] = useState(true);
  const [copyDescription, setCopyDescription] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!scheduledDate) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        clientId: post.clientId,
        title: post.title,
        postType: post.postType,
        description: copyDescription ? post.description || '' : '',
        mediaUrls: copyMedia ? post.mediaUrls ?? [] : [],
        scheduledDate: new Date(scheduledDate).getTime(),
        status: 'draft',
        updatedAt: Date.now(),
      });
      toast({ title: 'Příspěvek duplikován', variant: 'success' });
      onDuplicated();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      toast({ title: 'Nepodařilo se duplikovat příspěvek.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Duplikovat příspěvek"
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Zrušit</Button>
          <Button variant="primary" fullWidth loading={isSubmitting} onClick={handleConfirm}>
            Duplikovat
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Naplánované datum a čas"
          type="datetime-local"
          required
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={copyMedia}
            onChange={(e) => setCopyMedia(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm font-medium text-secondary">Zkopírovat i odkazy na média</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={copyDescription}
            onChange={(e) => setCopyDescription(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm font-medium text-secondary">Zkopírovat popisek</span>
        </label>
      </div>
    </Modal>
  );
}
