export type SocialPostStatus = 
  | 'Draft' 
  | 'Generating' 
  | 'PendingReview' 
  | 'Scheduled' 
  | 'Published' 
  | 'Failed'
  | 'Pending' 
  | 'Approved' 
  | 'Rejected'; 

export type SocialPostType = 'PhotoCarousel' | 'SocialShort' | 'ShortVideo' | 'SimplePost';

export interface SocialPostMedia {
  id: string;
  socialPostId: string;
  driveFileId: string;
  fileName: string;
  order: number;
  source: 'LocalUpload' | 'StockSearch' | 'AiGenerated';
  mediaType: 'Image' | 'Video';
  resolution: string;
}

export interface SocialPost {
  id: string;
  userId?: string;
  topic?: string;
  caption?: string;
  hooksJson?: string;
  hashtagsJson?: string;
  status: SocialPostStatus;
  type?: SocialPostType;
  scheduledAt?: string;
  publishedAt?: string;
  driveFolderId?: string;
  platformTargets?: string;
  errorMessage?: string;
  jobId?: string;
  createdAt: string;
  media?: SocialPostMedia[];
  
  // From social.model.ts
  title?: string;
  folderId?: string;
  platform?: string;
  isShort?: boolean;
  posts?: boolean;
  trendMatchScore?: number;
  suggestedTitle?: string;
  suggestedDescription?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  isMadeForKids?: boolean;
  publishedVideoId?: string;
  streamUrl?: string;
  historyFolderId?: string;
  historyVideoFileId?: string;
}

export function parseHooks(post: SocialPost): string[] {
  if (!post.hooksJson) return [];
  try { return JSON.parse(post.hooksJson); } catch { return []; }
}

export interface ReadyVideo {
  folderId: string;
  title: string;
  description?: string;
  videoPath?: string;
  createdAt: Date;
  hasMetadata: boolean;
}
