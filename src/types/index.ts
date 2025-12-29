export interface TimeEntry {
  id: string;
  user_id: string;
  description: string;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}
