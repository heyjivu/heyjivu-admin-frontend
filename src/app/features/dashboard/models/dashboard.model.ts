export interface DashboardStats {
  videosProcessed: number;
  shortsGenerated: number;
  postsPublished: number;
  errors: number;
  connectedPlatforms: string[];
  smartVideosGenerated: number;
  smartVideosInProgress: number;
  totalSmartVideoCost: number;
}

export interface PipelineStatusSummary {
  lastRun: string | null;
  nextRun: string | null;
  activeJobs: number;
  isRunning: boolean;
}


export interface AiCostRecord {
  id: string;
  jobId: string;
  userId: string;
  reportType: number; // 0=Company, 1=BYOK
  pipelineStage: number; // 0=VideoProcessing, 1=PostGeneration, etc.
  aiProvider: string;
  modelName: string;
  tokensUsed: number;
  calculatedCostUsd: number;
  roleName?: string;
  createdAt: string;
}

export interface CombinedAdminReport {
  totalCombinedCost: number;
  byokCost: number;
  companyCost: number;
  records: AiCostRecord[];
}
