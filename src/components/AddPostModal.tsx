import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Loader2, Save, Calendar, Type, FileText, Link as LinkIcon, Film } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AddPostModalProps {
  clientId: string;
  onClose: () => void;
  initialDate?: Date;
}

export default function AddPostModal({ clientId, onClose, initialDate }: AddPostModalProps) {
  const [title, setTitle] = useState('');
  
  // Format initial date for datetime-local input (YYYY-MM-DDTHH:mm)
  const defaultDateStr = initialDate 
    ? new Date(initialDate.getTime() - initialDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : '';
    
  const [scheduledDate, setScheduledDate] = useState(defaultDateStr);
  const [postType, setPostType] = useState<'video' | 'post'>('post');
  const [description, setDescription] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledDate) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        title,
        description,
        postType,
        mediaUrls: driveLink ? [driveLink] : [],
        status: 'client_review',
        scheduledDate: new Date(scheduledDate).getTime(),
        updatedAt: Date.now(),
        clientId
      });
      
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      alert("Nepodařilo se uložit příspěvek. Zkontrolujte prosím svá oprávnění.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Naplánovat nový příspěvek</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <Type className="w-4 h-4 text-slate-400" />
              Název příspěvku
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="např. Spuštění letní kolekce"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date & Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Naplánované datum a čas
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Post Type */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
                <Film className="w-4 h-4 text-slate-400" />
                Typ příspěvku
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as 'video' | 'post')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="post">Obrázek / Příspěvek</option>
                <option value="video">Video / Reel</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              Popisek příspěvku
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              placeholder="Zde napište popisek k příspěvku..."
            />
          </div>

          {/* Google Drive Link */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
              <LinkIcon className="w-4 h-4 text-slate-400" />
              Odkaz na média na Google Disku
            </label>
            <input
              type="text"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              placeholder="https://drive.google.com/..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Uložit příspěvek
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
