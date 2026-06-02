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

export interface CostCategoryBreakdown {
  category: string;
  label: string;
  totalCostUsd: number;
  byokCostUsd: number;
  companyCostUsd: number;
  calls: number;
  byokCalls: number;
  companyCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CostCategoryTimeline {
  date: string;
  category: string;
  label: string;
  totalCostUsd: number;
  byokCostUsd: number;
  companyCostUsd: number;
  calls: number;
}

export interface AIUsageReportRecord {
  id: string;
  userId?: string | null;
  userName: string;
  roleName: string;
  pipeline: string;
  category: string;
  categoryLabel: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  isAdminKey: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AIUsageAuditTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AIUsageAuditFilterOption {
  label: string;
  value: string;
}

export interface AIUsageAuditReport {
  records: PagedResult<AIUsageReportRecord>;
  totals: AIUsageAuditTotals;
  categories: AIUsageAuditFilterOption[];
  providers: AIUsageAuditFilterOption[];
  roles: AIUsageAuditFilterOption[];
  users: AIUsageAuditFilterOption[];
}

export interface AIUsageAuditReportParams {
  startDate?: string;
  endDate?: string;
  targetUserId?: string;
  roleName?: string;
  category?: string;
  provider?: string;
  origin?: string;
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CombinedAdminReport {
  totalCombinedCost: number;
  byokCost: number;
  companyCost: number;
  records: AiCostRecord[];
  usageTotalCostUsd?: number;
  usageByokCostUsd?: number;
  usageCompanyCostUsd?: number;
  categoryBreakdown?: CostCategoryBreakdown[];
  categoryTimeline?: CostCategoryTimeline[];
  usageRecords?: AIUsageReportRecord[];
}
