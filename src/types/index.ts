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

export interface ProjectRate {
  id: string;
  project_id: string;
  user_id: string;
  hourly_rate: number;
  currency: string;
  effective_date: string;
  end_date: string | null;
  notes?: string | null;
  set_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationDefaultRate {
  id: string;
  organization_id: string;
  user_id: string;
  hourly_rate: number;
  currency: string;
  effective_date: string;
  end_date: string | null;
  notes?: string | null;
  set_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveRate {
  hourly_rate: number;
  currency: string;
  rate_source: 'project' | 'organization';
}

export interface CurrentProjectRate {
  id: string;
  project_id: string | null;
  project_name: string | null;
  organization_id: string | null;
  user_id: string;
  hourly_rate: number;
  currency: string;
  effective_date: string;
  notes: string | null;
  set_by: string;
  created_at: string;
  rate_source: 'project' | 'organization';
}

export interface BillableTimeEntry extends TimeEntry {
  email: string;
  full_name: string | null;
  project_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  hours: number;
  hourly_rate: number | null;
  currency: string | null;
  rate_source: 'project' | 'organization' | null;
  billable_amount: number | null;
}

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'billed' | 'closed';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';
export type IssueBillingType = 'flat' | 'hourly' | 'unbilled';

export interface Issue {
  id: string;
  organization_id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  reported_by?: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  resolution_notes?: string | null;
  remaining_work?: string | null;
  quoted_amount: number | null;
  currency: string;
  billing_type: IssueBillingType;
  invoice_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export interface Invoice {
  id: string;
  invoice_number: string;
  organization_id: string | null;
  project_id?: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  subtotal: number;
  total: number;
  currency: string;
  note?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceLineItemType = 'time' | 'issue' | 'custom';

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  issue_id?: string | null;
  type: InvoiceLineItemType;
  description: string;
  quantity?: number | null;
  rate?: number | null;
  amount: number;
  sort_order: number;
  created_at: string;
}
