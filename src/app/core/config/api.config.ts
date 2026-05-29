import { environment } from '../../../environments/environment';

export const API_ENDPOINTS = {
  DASHBOARD: 'dashboard',
  JOBS: 'jobs',
  MEDIA: 'media',
  MEMORY: 'memory',
  SETTINGS: 'settings',
  DRIVE: 'drive',
  TRENDS: 'trends',
  STATS: 'stats',
} as const;

export const BASE_API_URL = environment.apiUrl;
