import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import {
  Ticket,
  Plus,
  X,
  Check,
  Trash2,
  AlertCircle,
  Wrench,
  CheckCircle2,
  Receipt,
  Archive,
} from 'lucide-react';
import type { Issue, IssueStatus, IssuePriority, IssueBillingType, Organization, Project } from '../types';
import './Issues.css';

const STATUS_META: Record<IssueStatus, { label: string; icon: ReactNode; className: string }> = {
  open: { label: 'Open', icon: <AlertCircle size={14} />, className: 'status-open' },
  in_progress: { label: 'In Progress', icon: <Wrench size={14} />, className: 'status-in-progress' },
  resolved: { label: 'Resolved', icon: <CheckCircle2 size={14} />, className: 'status-resolved' },
  billed: { label: 'Billed', icon: <Receipt size={14} />, className: 'status-billed' },
  closed: { label: 'Closed', icon: <Archive size={14} />, className: 'status-closed' },
};

const PRIORITY_META: Record<IssuePriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'priority-low' },
  medium: { label: 'Medium', className: 'priority-medium' },
  high: { label: 'High', className: 'priority-high' },
  urgent: { label: 'Urgent', className: 'priority-urgent' },
};

const STATUS_ORDER: IssueStatus[] = ['open', 'in_progress', 'resolved', 'billed', 'closed'];

interface FormState {
  organization_id: string;
  project_id: string;
  title: string;
  description: string;
  reported_by: string;
  priority: IssuePriority;
  status: IssueStatus;
  resolution_notes: string;
  remaining_work: string;
  quoted_amount: string;
  currency: string;
  billing_type: IssueBillingType;
}

const EMPTY_FORM: FormState = {
  organization_id: '',
  project_id: '',
  title: '',
  description: '',
  reported_by: '',
  priority: 'medium',
  status: 'open',
  resolution_notes: '',
  remaining_work: '',
  quoted_amount: '',
  currency: 'USD',
  billing_type: 'flat',
};

export function Issues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | IssueStatus>('all');
  const [orgFilter, setOrgFilter] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [issuesRes, orgsRes, projectsRes] = await Promise.all([
      supabase.from('issues').select('*').order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').order('name'),
      supabase.from('projects').select('*').order('name'),
    ]);

    if (issuesRes.error) console.error('Error loading issues:', issuesRes.error);
    else setIssues(issuesRes.data || []);

    if (orgsRes.error) console.error('Error loading organizations:', orgsRes.error);
    else setOrganizations(orgsRes.data || []);

    if (projectsRes.error) console.error('Error loading projects:', projectsRes.error);
    else setProjects(projectsRes.data || []);

    setLoading(false);
  }

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
      if (orgFilter && issue.organization_id !== orgFilter) return false;
      return true;
    });
  }, [issues, statusFilter, orgFilter]);

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [organizations]);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const projectsForOrg = useMemo(() => {
    return projects.filter((p) => p.organization_id === form.organization_id);
  }, [projects, form.organization_id]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: issues.length };
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    issues.forEach((i) => (c[i.status] = (c[i.status] || 0) + 1));
    return c;
  }, [issues]);

  function openCreate() {
    setEditingIssue(null);
    setForm({ ...EMPTY_FORM, organization_id: orgFilter || organizations[0]?.id || '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(issue: Issue) {
    setEditingIssue(issue);
    setForm({
      organization_id: issue.organization_id,
      project_id: issue.project_id || '',
      title: issue.title,
      description: issue.description || '',
      reported_by: issue.reported_by || '',
      priority: issue.priority,
      status: issue.status,
      resolution_notes: issue.resolution_notes || '',
      remaining_work: issue.remaining_work || '',
      quoted_amount: issue.quoted_amount != null ? String(issue.quoted_amount) : '',
      currency: issue.currency,
      billing_type: issue.billing_type,
    });
    setError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingIssue(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function handleSave() {
    if (!user) return;
    if (!form.organization_id) {
      setError('Pick a customer (organization) this issue belongs to.');
      return;
    }
    if (!form.title.trim()) {
      setError('Give the issue a title.');
      return;
    }

    setSaving(true);
    setError('');

    const quotedAmount = form.quoted_amount.trim() === '' ? null : parseFloat(form.quoted_amount);

    const payload = {
      organization_id: form.organization_id,
      project_id: form.project_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      reported_by: form.reported_by.trim() || null,
      priority: form.priority,
      status: form.status,
      resolution_notes: form.resolution_notes.trim() || null,
      remaining_work: form.remaining_work.trim() || null,
      quoted_amount: quotedAmount,
      currency: form.currency,
      billing_type: form.billing_type,
      resolved_at:
        form.status === 'resolved' || form.status === 'billed' || form.status === 'closed'
          ? editingIssue?.resolved_at || new Date().toISOString()
          : null,
    };

    if (editingIssue) {
      const { error: updateError } = await supabase.from('issues').update(payload).eq('id', editingIssue.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('issues').insert({
        ...payload,
        created_by: user.id,
      });
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeModal();
    loadData();
  }

  async function handleDelete(issue: Issue) {
    const confirmed = window.confirm(`Delete "${issue.title}"? This cannot be undone.`);
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from('issues').delete().eq('id', issue.id);
    if (deleteError) {
      alert('Failed to delete issue: ' + deleteError.message);
      return;
    }
    loadData();
  }

  async function quickSetStatus(issue: Issue, status: IssueStatus) {
    const resolved_at =
      status === 'resolved' || status === 'billed' || status === 'closed'
        ? issue.resolved_at || new Date().toISOString()
        : null;
    const { error: updateError } = await supabase
      .from('issues')
      .update({ status, resolved_at })
      .eq('id', issue.id);
    if (updateError) {
      alert('Failed to update status: ' + updateError.message);
      return;
    }
    loadData();
  }

  if (loading) {
    return (
      <div className="issues-page">
        <div className="issues-loading">Loading issues…</div>
      </div>
    );
  }

  return (
    <div className="issues-page">
      <div className="issues-header">
        <div>
          <h2>
            <Ticket size={22} /> Issues
          </h2>
          <p className="issues-subtitle">Log what a customer brought you, track the fix, and quote what it costs.</p>
        </div>
        <button className="issues-btn issues-btn-primary" onClick={openCreate} disabled={organizations.length === 0}>
          <Plus size={16} /> New Issue
        </button>
      </div>

      {organizations.length === 0 && (
        <div className="issues-alert">
          <AlertCircle size={18} />
          <span>Create an organization first (that's your "customer") before logging issues.</span>
        </div>
      )}

      <div className="issues-filters">
        <div className="issues-status-tabs">
          <button
            className={statusFilter === 'all' ? 'active' : ''}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="issues-count">{counts.all}</span>
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={statusFilter === s ? 'active' : ''}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_META[s].icon} {STATUS_META[s].label} <span className="issues-count">{counts[s] || 0}</span>
            </button>
          ))}
        </div>
        <select className="issues-org-select" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
          <option value="">All Customers</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {filteredIssues.length === 0 ? (
        <div className="issues-empty">
          <Ticket size={48} />
          <h3>No issues here</h3>
          <p>Nothing matches these filters yet.</p>
        </div>
      ) : (
        <div className="issues-list">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="issue-card" onClick={() => openEdit(issue)}>
              <div className="issue-card-main">
                <div className="issue-card-title-row">
                  <span className={`issue-badge ${STATUS_META[issue.status].className}`}>
                    {STATUS_META[issue.status].icon} {STATUS_META[issue.status].label}
                  </span>
                  <span className={`issue-badge ${PRIORITY_META[issue.priority].className}`}>
                    {PRIORITY_META[issue.priority].label}
                  </span>
                  <h3 className="issue-title">{issue.title}</h3>
                </div>
                {issue.description && <p className="issue-description">{issue.description}</p>}
                <div className="issue-meta">
                  <span>{orgNameById.get(issue.organization_id) || 'Unknown customer'}</span>
                  {issue.project_id && projectNameById.get(issue.project_id) && (
                    <span>· {projectNameById.get(issue.project_id)}</span>
                  )}
                  {issue.reported_by && <span>· Reported by {issue.reported_by}</span>}
                  <span>· {new Date(issue.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="issue-card-side">
                {issue.quoted_amount != null && issue.billing_type !== 'unbilled' && (
                  <div className="issue-amount">
                    {issue.currency} {issue.quoted_amount.toFixed(2)}
                  </div>
                )}
                <div className="issue-card-actions" onClick={(e) => e.stopPropagation()}>
                  {issue.status === 'open' && (
                    <button title="Start work" onClick={() => quickSetStatus(issue, 'in_progress')}>
                      <Wrench size={14} />
                    </button>
                  )}
                  {issue.status === 'in_progress' && (
                    <button title="Mark resolved" onClick={() => quickSetStatus(issue, 'resolved')}>
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                  <button title="Delete" className="issue-delete-btn" onClick={() => handleDelete(issue)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="issues-modal-overlay" onClick={closeModal}>
          <div className="issues-modal" onClick={(e) => e.stopPropagation()}>
            <div className="issues-modal-header">
              <h3>{editingIssue ? 'Edit Issue' : 'New Issue'}</h3>
              <button className="issues-close-btn" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="issues-modal-body">
              <div className="issues-form-row">
                <div className="issues-form-group">
                  <label>Customer *</label>
                  <select
                    value={form.organization_id}
                    onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value, project_id: '' }))}
                  >
                    <option value="">Select customer…</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="issues-form-group">
                  <label>Project (optional)</label>
                  <select
                    value={form.project_id}
                    onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                    disabled={!form.organization_id}
                  >
                    <option value="">No specific project</option>
                    {projectsForOrg.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="issues-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Checkout page throws 500 on mobile"
                  autoFocus
                />
              </div>

              <div className="issues-form-group">
                <label>Baseline — what did the customer report?</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What's broken, from the customer's point of view"
                />
              </div>

              <div className="issues-form-row">
                <div className="issues-form-group">
                  <label>Reported by</label>
                  <input
                    type="text"
                    value={form.reported_by}
                    onChange={(e) => setForm((f) => ({ ...f, reported_by: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
                <div className="issues-form-group">
                  <label>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as IssuePriority }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="issues-form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as IssueStatus }))}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s} disabled={s === 'billed'}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="issues-form-group">
                <label>Resolution notes — what was fixed?</label>
                <textarea
                  rows={2}
                  value={form.resolution_notes}
                  onChange={(e) => setForm((f) => ({ ...f, resolution_notes: e.target.value }))}
                  placeholder="What you actually did to fix it"
                />
              </div>

              <div className="issues-form-group">
                <label>Remaining work — what still needs to be fixed?</label>
                <textarea
                  rows={2}
                  value={form.remaining_work}
                  onChange={(e) => setForm((f) => ({ ...f, remaining_work: e.target.value }))}
                  placeholder="Leave blank if fully resolved"
                />
              </div>

              <div className="issues-form-row">
                <div className="issues-form-group">
                  <label>Quoted cost to fix</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.quoted_amount}
                    onChange={(e) => setForm((f) => ({ ...f, quoted_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="issues-form-group">
                  <label>Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    maxLength={3}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="issues-form-group">
                  <label>Billing</label>
                  <select
                    value={form.billing_type}
                    onChange={(e) => setForm((f) => ({ ...f, billing_type: e.target.value as IssueBillingType }))}
                  >
                    <option value="flat">Flat fee</option>
                    <option value="hourly">Hourly (bill via time entries)</option>
                    <option value="unbilled">Unbilled</option>
                  </select>
                </div>
              </div>

              {editingIssue?.status === 'billed' && (
                <div className="issues-billed-note">
                  <Receipt size={14} /> This issue has already been billed on an invoice.
                </div>
              )}

              {error && (
                <div className="issues-form-error">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>

            <div className="issues-modal-footer">
              {editingIssue && (
                <button
                  className="issues-btn issues-btn-danger"
                  onClick={() => {
                    closeModal();
                    handleDelete(editingIssue);
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button className="issues-btn issues-btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="issues-btn issues-btn-primary" onClick={handleSave} disabled={saving}>
                <Check size={16} /> {saving ? 'Saving…' : editingIssue ? 'Save Changes' : 'Create Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
