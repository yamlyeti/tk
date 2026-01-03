export interface TimeEntry {
  id: string;
  user_id: string;
  project_id?: string;
  description: string;
  notes?: string | null;
  tags?: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  paused_duration?: number; // Total time paused in seconds
  is_paused?: boolean;
  pause_start_time?: string | null; // When current pause started
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  tags?: string;
  description?: string;
  github_link?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
}
