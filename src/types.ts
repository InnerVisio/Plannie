export interface Client {
  id: string;
  name: string;
  shareableLinkId: string;
  googleDriveLink: string;
  isActive: boolean;
  createdAt: number;
  logoUrl?: string;
  brandColor?: string;
}

export interface Post {
  id: string;
  clientId: string;
  title: string;
  description: string;
  postType: 'video' | 'image' | 'carousel' | 'reel' | 'post' | 'event';
  status: 'draft' | 'client_review' | 'approved' | 'scheduled' | 'needs_revision' | 'published';
  scheduledDate: number;
  mediaUrls: string[];
  updatedAt: number;
  requiresAction?: boolean;
  pendingDescription?: string;
  comments?: {
    text: string;
    role: 'client' | 'agency';
    createdAt: number;
  }[];
}

export interface Comment {
  id: string;
  postId: string;
  clientId: string;        // may be missing on older documents — fall back through postId
  text: string;
  authorName: string;
  authorType: 'admin' | 'client';
  createdAt: number;
  resolvedAt?: number | null;   // null/absent = unresolved
}

export interface CustomEvent {
  id: string;
  clientId: string;
  name: string;
  date: number;
}

export interface AnalyticsReport {
  id: string;
  clientId: string;
  title: string;
  pdfUrl: string;
  createdAt: number;
}

export interface Activity {
  id: string;
  clientId: string;
  clientName: string;      // denormalized so the feed renders without a join
  postId: string;
  postTitle: string;       // denormalized — survives post deletion
  type: 'comment' | 'approved' | 'needs_revision' | 'description_proposed' | 'sent_to_client';
  actor: 'client' | 'agency';
  preview?: string;        // first ~120 chars of a comment, for 'comment' type
  createdAt: number;
  readAt?: number | null;  // null/absent = unread
}
