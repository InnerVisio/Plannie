import React, { useMemo, useState } from 'react';
import { collection, addDoc, doc, writeBatch } from 'firebase/firestore';
import { addWeeks, addMonths, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { db } from '../firebase';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { Modal, Button, Input, Textarea, Select } from './ui';

interface AddPostModalProps {
  clientId: string;
  onClose: () => void;
  initialDate?: Date;
}

type RecurrenceKey = 'none' | 'weekly' | 'biweekly' | 'monthly';

const MAX_OCCURRENCES = 12;

const nextDate = (base: Date, key: RecurrenceKey): Date => {
  switch (key) {
    case 'weekly': return addWeeks(base, 1);
    case 'biweekly': return addWeeks(base, 2);
    case 'monthly': return addMonths(base, 1);
    default: return base;
  }
};

export default function AddPostModal({ clientId, onClose, initialDate }: AddPostModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');

  // Format initial date for datetime-local input (YYYY-MM-DDTHH:mm)
  const defaultDateStr = initialDate
    ? new Date(initialDate.getTime() - initialDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : '';

  const [scheduledDate, setScheduledDate] = useState(defaultDateStr);
  const [postType, setPostType] = useState<'video' | 'post' | 'event'>('post');
  const [description, setDescription] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>(['']);
  const [sendImmediately, setSendImmediately] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceKey>('none');
  const [occurrenceCount, setOccurrenceCount] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEvent = postType === 'event';

  const recurrenceDates = useMemo(() => {
    if (recurrence === 'none' || !scheduledDate) return [];
    const count = Math.min(occurrenceCount, MAX_OCCURRENCES);
    const dates: Date[] = [];
    let current = new Date(scheduledDate);
    for (let i = 0; i < count; i++) {
      dates.push(current);
      current = nextDate(current, recurrence);
    }
    return dates;
  }, [recurrence, occurrenceCount, scheduledDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledDate) return;

    setIsSubmitting(true);
    try {
      const status = isEvent ? 'approved' : sendImmediately ? 'client_review' : 'draft';
      const cleanMediaUrls = mediaUrls.filter((url) => url.trim() !== '');

      if (recurrence !== 'none' && !isEvent && recurrenceDates.length > 1) {
        const batch = writeBatch(db);
        recurrenceDates.forEach((date) => {
          const ref = doc(collection(db, 'posts'));
          batch.set(ref, {
            title,
            description,
            postType,
            mediaUrls: cleanMediaUrls,
            status,
            scheduledDate: date.getTime(),
            updatedAt: Date.now(),
            clientId,
          });
        });
        await batch.commit();
        toast({ title: `Vytvořeno ${recurrenceDates.length} příspěvků`, variant: 'success' });
      } else {
        await addDoc(collection(db, 'posts'), {
          title,
          description,
          postType,
          mediaUrls: cleanMediaUrls,
          status,
          scheduledDate: new Date(scheduledDate).getTime(),
          updatedAt: Date.now(),
          clientId,
        });
        toast({ title: 'Příspěvek naplánován', variant: 'success' });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      toast({ title: 'Nepodařilo se uložit příspěvek.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Naplánovat nový příspěvek"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Zrušit</Button>
          <Button variant="primary" fullWidth loading={isSubmitting} icon={Plus} onClick={handleSubmit}>
            Uložit příspěvek
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="add-post-form">
        <Input label="Název příspěvku" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="např. Spuštění letní kolekce" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Naplánované datum a čas"
            type="datetime-local"
            required
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
          <Select label="Typ příspěvku" value={postType} onChange={(e) => setPostType(e.target.value as 'video' | 'post' | 'event')}>
            <option value="post">Obrázek / Příspěvek</option>
            <option value="video">Video / Reel</option>
            <option value="event">Událost v kalendáři</option>
          </Select>
        </div>

        {!isEvent && (
          <div className="space-y-3 p-3.5 rounded-[var(--radius-field)] bg-subtle border border-subtle-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Opakování"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceKey)}
              >
                <option value="none">Neopakovat</option>
                <option value="weekly">Každý týden</option>
                <option value="biweekly">Každé 2 týdny</option>
                <option value="monthly">Každý měsíc</option>
              </Select>
              {recurrence !== 'none' && (
                <Select
                  label="Počet opakování"
                  value={occurrenceCount}
                  onChange={(e) => setOccurrenceCount(Number(e.target.value))}
                >
                  {Array.from({ length: MAX_OCCURRENCES - 1 }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              )}
            </div>
            {recurrence !== 'none' && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {recurrenceDates.map((d, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-semibold text-secondary bg-surface border border-subtle-border rounded-full px-2 py-1"
                    >
                      {format(d, 'd. M.', { locale: cs })}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-secondary">Příspěvky se vytvoří jako samostatné koncepty.</p>
              </>
            )}
          </div>
        )}

        <Textarea
          label="Popisek příspěvku"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Zde napište popisek k příspěvku..."
        />

        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5" /> Odkazy na média
          </p>
          {mediaUrls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={url}
                onChange={(e) => {
                  const next = [...mediaUrls];
                  next[index] = e.target.value;
                  setMediaUrls(next);
                }}
                placeholder="https://drive.google.com/..."
              />
              {mediaUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== index))}
                  className="w-11 h-11 shrink-0 flex items-center justify-center text-muted hover:text-[var(--status-revision-fg)] hover:bg-[var(--status-revision-bg)] rounded-[var(--radius-field)] transition-colors"
                  aria-label="Odstranit odkaz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setMediaUrls([...mediaUrls, ''])}
            className="flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary px-2 py-1.5 rounded-lg hover:bg-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Přidat další odkaz
          </button>
        </div>

        {!isEvent && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendImmediately}
              onChange={(e) => setSendImmediately(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--accent)]"
            />
            <span className="text-sm font-medium text-secondary">Odeslat klientovi ihned</span>
          </label>
        )}
      </form>
    </Modal>
  );
}
