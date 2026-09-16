import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import type { Post } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { pluralize } from '../lib/text';
import { Modal, Button, Input } from './ui';

interface BulkPublishModalProps {
  onClose: () => void;
}

/** Firestore batches cap at 500 writes — chunk comfortably under that. */
const BATCH_CHUNK_SIZE = 400;

export default function BulkPublishModal({ onClose }: BulkPublishModalProps) {
  const { toast } = useToast();
  const [dateStr, setDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isPublishing, setIsPublishing] = useState(false);
  const [candidates, setCandidates] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cutoff = useMemo(() => new Date(`${dateStr}T00:00:00`).getTime(), [dateStr]);

  // Query Firestore directly rather than reading useAgencyData's 6-month rolling window —
  // the whole point of this action is clearing a backlog that is likely older than that window.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'posts'), where('status', '==', 'approved'))
        );
        if (cancelled) return;
        setCandidates(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'posts');
        if (!cancelled) toast({ title: 'Nepodařilo se načíst příspěvky.', variant: 'error' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matching = useMemo(
    () => candidates.filter((p) => p.postType !== 'event' && p.scheduledDate < cutoff),
    [candidates, cutoff]
  );

  const handleConfirm = async () => {
    if (matching.length === 0) return;
    setIsPublishing(true);
    try {
      const updatedAt = Date.now();
      for (let i = 0; i < matching.length; i += BATCH_CHUNK_SIZE) {
        const chunk = matching.slice(i, i + BATCH_CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((post) => {
          batch.update(doc(db, 'posts', post.id), { status: 'published', updatedAt });
        });
        // eslint-disable-next-line no-await-in-loop -- chunks must commit sequentially, not in parallel
        await batch.commit();
      }
      toast({ title: `Označeno ${matching.length} příspěvků jako publikované`, variant: 'success' });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'posts');
      toast({ title: 'Nepodařilo se hromadně označit příspěvky.', variant: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Označit jako publikované"
      size="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPublishing}>Zrušit</Button>
          <Button
            variant="primary"
            icon={CheckCircle2}
            loading={isPublishing}
            disabled={isLoading || matching.length === 0}
            onClick={handleConfirm}
          >
            Označit ({matching.length})
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Označí všechny schválené příspěvky naplánované před zvoleným datem jako publikované. Koncepty, příspěvky
          čekající na klienta a příspěvky vyžadující úpravu se nikdy neoznačí — ty ještě nejsou hotové.
        </p>
        <Input
          type="date"
          label="Publikováno před datem"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
        />
        {isLoading ? (
          <p className="text-sm text-secondary flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Načítám příspěvky…
          </p>
        ) : (
          <p className="text-sm font-semibold text-primary">
            Bude označeno: {pluralize(matching.length, 'příspěvek', 'příspěvky', 'příspěvků')}
          </p>
        )}
      </div>
    </Modal>
  );
}
