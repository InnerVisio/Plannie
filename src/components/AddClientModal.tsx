import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useToast } from '../contexts/ToastContext';
import { Modal, Button, Input, Avatar } from './ui';
import { BRAND_COLORS, getBrandColor } from '../lib/brand';

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddClientModal({ open, onClose }: AddClientModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('slate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName('');
    setDriveLink('');
    setLogoUrl('');
    setBrandColor('slate');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const secureSlug = crypto.randomUUID();
      await addDoc(collection(db, 'clients'), {
        name: name.trim(),
        shareableLinkId: secureSlug,
        googleDriveLink: driveLink.trim(),
        logoUrl: logoUrl.trim(),
        brandColor,
        isActive: true,
        createdAt: Date.now(),
      });
      toast({ title: 'Klient přidán', variant: 'success' });
      reset();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
      toast({ title: 'Nepodařilo se přidat klienta.', variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nový klient"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Zrušit</Button>
          <Button variant="primary" loading={isSubmitting} disabled={!name.trim()} onClick={handleSubmit}>
            Přidat klienta
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" id="add-client-form">
        <div className="flex items-center gap-4">
          <Avatar src={logoUrl || undefined} name={name || 'Nový klient'} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold text-primary truncate">{name || 'Náhled klienta'}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: getBrandColor(brandColor) }} />
              <span className="text-xs text-secondary">Barevný akcent</span>
            </div>
          </div>
        </div>

        <Input label="Název klienta" required value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Acme s.r.o." />
        <Input label="Odkaz na Google Disk" type="url" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://drive.google.com/..." />
        <Input label="URL adresa loga" type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">Barevný akcent</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BRAND_COLORS).map(([id, hex]) => (
              <button
                key={id}
                type="button"
                onClick={() => setBrandColor(id)}
                aria-label={id}
                className={`w-8 h-8 shrink-0 rounded-full transition-all border-2 ${
                  brandColor === id ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
