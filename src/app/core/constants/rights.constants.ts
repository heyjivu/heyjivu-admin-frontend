export const Rights = {
  // App Rights
  Dashboard_View: 'Dashboard_View',
  Dashboard_Manage: 'Dashboard_Manage',
  
  VideoGen_View: 'VideoGen_View',
  VideoGen_Manage: 'VideoGen_Manage',
  
  Pipeline_View: 'Pipeline_View',
  Pipeline_Manage: 'Pipeline_Manage',
  
  PostGen_View: 'PostGen_View',
  PostGen_Manage: 'PostGen_Manage',
  
  Review_View: 'Review_View',
  Review_Manage: 'Review_Manage',
  
  Social_View: 'Social_View',
  Social_Manage: 'Social_Manage',
  
  Drive_View: 'Drive_View',
  Drive_Manage: 'Drive_Manage',
  
  Memory_View: 'Memory_View',
  Memory_Manage: 'Memory_Manage',
  
  Settings_View: 'Settings_View',
  Settings_Manage: 'Settings_Manage',
  
  // Admin Rights
  Admin_Metrics_View: 'Admin_Metrics_View',
  Admin_Metrics_Manage: 'Admin_Metrics_Manage',
  
  Admin_Users_View: 'Admin_Users_View',
  Admin_Users_Manage: 'Admin_Users_Manage',
  
  Admin_PlanUsers_View: 'Admin_PlanUsers_View',
  Admin_PlanUsers_Manage: 'Admin_PlanUsers_Manage',
  
  Admin_Payments_View: 'Admin_Payments_View',
  Admin_Payments_Manage: 'Admin_Payments_Manage',
  
  Admin_AIKeys_View: 'Admin_AIKeys_View',
  Admin_AIKeys_Manage: 'Admin_AIKeys_Manage',
  
  Admin_Config_View: 'Admin_Config_View',
  Admin_Config_Manage: 'Admin_Config_Manage'
} as const;

export type RightKey = (typeof Rights)[keyof typeof Rights];
