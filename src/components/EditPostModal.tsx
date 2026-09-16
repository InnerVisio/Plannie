import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Link as LinkIcon, Save } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { Post } from '../types';
import { Modal, Button, Input, Textarea, Select } from './ui';

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
}

const KNOWN_OPTIONS: Post['postType'][] = ['post', 'video', 'event'];

export default function EditPostModal({ post, onClose }: EditPostModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(post.title);

  const initialDate = new Date(post.scheduledDate);
  const defaultDateStr = new Date(initialDate.getTime() - initialDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [scheduledDate, setScheduledDate] = useState(defaultDateStr);
  const [postType, setPostType] = useState<Post['postType']>(post.postType);
  const [description, setDescription] = useState(post.description || '');
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.mediaUrls?.length ? post.mediaUrls : ['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If the post's existing type isn't one of the three editable options (e.g. 'carousel',
  // 'image', 'reel' created elsewhere), keep it as a fourth option so saving doesn't
  // silently overwrite it with whatever the <select> happened to default to.
  const needsExtraOption = !KNOWN_OPTIONS.includes(post.postType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledDate) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        title,
        description,
        postType,
        mediaUrls: mediaUrls.filter((url) => url.trim() !== ''),
        scheduledDate: new Date(scheduledDate).getTime(),
        updatedAt: Date.now(),
      });
      toast({ title: 'Příspěvek upraven', variant: 'success' });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
      toast({ title: 'Nepodařilo se upravit příspěvek.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Upravit příspěvek"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Zrušit</Button>
          <Button variant="primary" fullWidth loading={isSubmitting} icon={Save} onClick={handleSubmit}>
            Uložit příspěvek
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" id="edit-post-form">
        <Input label="Název příspěvku" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="např. Spuštění letní kolekce" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Naplánované datum a čas"
            type="datetime-local"
            required
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
          <Select label="Typ příspěvku" value={postType} onChange={(e) => setPostType(e.target.value as Post['postType'])}>
            <option value="post">Obrázek / Příspěvek</option>
            <option value="video">Video / Reel</option>
            <option value="event">Událost v kalendáři</option>
            {needsExtraOption && <option value={post.postType}>{post.postType}</option>}
          </Select>
        </div>

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
      </form>
    </Modal>
  );
}
