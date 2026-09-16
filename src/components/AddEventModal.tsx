import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Save } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { Modal, Button, Input } from './ui';

interface AddEventModalProps {
  clientId: string;
  onClose: () => void;
}

export default function AddEventModal({ clientId, onClose }: AddEventModalProps) {
  const { toast } = useToast();
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDate) return;

    setIsSubmitting(true);
    try {
      const dateObj = new Date(eventDate);
      // Reset to start of day for consistency with calendar display
      dateObj.setHours(0, 0, 0, 0);

      await addDoc(collection(db, 'posts'), {
        clientId,
        title: eventName.trim(),
        description: '',
        postType: 'event',
        status: 'approved',
        scheduledDate: dateObj.getTime(),
        mediaUrls: [],
        updatedAt: Date.now(),
      });
      toast({ title: 'Událost přidána', variant: 'success' });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      toast({ title: 'Nepodařilo se přidat událost.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nová událost"
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Zrušit</Button>
          <Button variant="primary" fullWidth loading={isSubmitting} disabled={!eventName.trim() || !eventDate} icon={Save} onClick={handleSubmit}>
            Uložit událost
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="add-event-form">
        <Input
          label="Název události"
          required
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="Např. Firemní dovolená"
        />
        <Input
          label="Datum"
          type="date"
          required
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </form>
    </Modal>
  );
}
