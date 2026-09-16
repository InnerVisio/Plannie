import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { addDays, subDays, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { db } from '../firebase';
import type { Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { Modal, Button, Input } from './ui';

interface MovePostModalProps {
  post: Post;
  onClose: () => void;
}

const toLocalInputValue = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function MovePostModal({ post, onClose }: MovePostModalProps) {
  const { toast } = useToast();
  const [scheduledDate, setScheduledDate] = useState(() => toLocalInputValue(new Date(post.scheduledDate)));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyShift = (shiftDays: number) => {
    const current = new Date(scheduledDate);
    const shifted = shiftDays >= 0 ? addDays(current, shiftDays) : subDays(current, Math.abs(shiftDays));
    setScheduledDate(toLocalInputValue(shifted));
  };

  const handleConfirm = async () => {
    if (!scheduledDate) return;
    setIsSubmitting(true);
    try {
      const newDate = new Date(scheduledDate).getTime();
      await updateDoc(doc(db, 'posts', post.id), { scheduledDate: newDate, updatedAt: Date.now() });
      toast({
        title: `Přesunuto na ${format(newDate, "d. MMMM yyyy 'v' H:mm", { locale: cs })}`,
        variant: 'success',
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se přesunout příspěvek.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Přesunout příspěvek"
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Zrušit</Button>
          <Button variant="primary" fullWidth loading={isSubmitting} onClick={handleConfirm}>
            Přesunout
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nové datum a čas"
          type="datetime-local"
          required
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => applyShift(-1)}>-1 den</Button>
          <Button variant="secondary" size="sm" onClick={() => applyShift(1)}>+1 den</Button>
          <Button variant="secondary" size="sm" onClick={() => applyShift(7)}>+7 dní</Button>
        </div>
      </div>
    </Modal>
  );
}
