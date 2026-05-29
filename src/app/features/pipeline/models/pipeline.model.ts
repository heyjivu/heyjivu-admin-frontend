export interface AdminPipelineJob {
  id: string;
  title: string;
  type: PipelineJobType;
  status: string;
  progress: number;
  errorMessage?: string;
  createdAt: string;
  userId: string;
  userName?: string;
  userEmail?: string;
}

export type PipelineJobType = 'Processing' | 'Trend' | 'SmartVideo' | 'SocialPost';

export interface AdminPipelineResponse {
  jobs: AdminPipelineJob[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PipelineStats {
  totalJobs: number;
  byStatus: Record<string, number>;
  byType?: Record<string, number>;
}
