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
  text: string;
  authorName: string;
  authorType: 'admin' | 'client';
  createdAt: number;
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
