import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { Activity } from '../types';
import { handleFirestoreError, OperationType } from './firestore-errors';

const EVENT_TEXT: Record<Activity['type'], (a: Activity) => string> = {
  comment: (a) => `${a.clientName} přidal komentář k „${a.postTitle}"`,
  approved: (a) => `${a.clientName} schválil „${a.postTitle}"`,
  needs_revision: (a) => `${a.clientName} vyžaduje úpravu „${a.postTitle}"`,
  description_proposed: (a) => `${a.clientName} navrhl změnu popisku u „${a.postTitle}"`,
  sent_to_client: (a) => `Odesláno klientovi — „${a.postTitle}"`,
};

/** Single source of truth for the human-readable sentence describing an activity event. */
export const describeActivity = (a: Activity): string => (EVENT_TEXT[a.type] ?? (() => a.postTitle))(a);

export const logActivity = async (
  input: Omit<Activity, 'id' | 'createdAt' | 'readAt'> & { readAt?: number | null }
) => {
  try {
    const { readAt = null, ...rest } = input;
    await addDoc(collection(db, 'activity'), { ...rest, createdAt: Date.now(), readAt });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'activity');
    // Never rethrow — a failed activity log must not break the user's actual action.
  }
};
