import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import {
  Receipt,
  Plus,
  ArrowLeft,
  Printer,
  Mail,
  CheckCircle2,
  Ban,
  Trash2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  Organization,
  Project,
  Issue,
  BillableTimeEntry,
} from '../types';
import './Issues.css';
import './Invoices.css';

interface DraftLineItem {
  id: string;
  type: 'time' | 'issue' | 'custom';
  description: string;
  quantity: number | null;
  rate: number | null;
  amount: number;
  issue_id?: string | null;
}

interface InvoiceProjectOption {
  id: string;
  name: string;
  organization_id?: string | null;
  hoursInPeriod: number;
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
};

export function Invoices() {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'builder' | 'detail'>('list');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailLineItems, setDetailLineItems] = useState<InvoiceLineItem[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  // Builder state
  const [orgId, setOrgId] = useState('');
  const [orgProjects, setOrgProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [periodStart, setPeriodStart] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [includeTime, setIncludeTime] = useState(true);
  const [timeEntries, setTimeEntries] = useState<BillableTimeEntry[]>([]);
  const [unbilledIssues, setUnbilledIssues] = useState<Issue[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<{ id: string; description: string; amount: number }[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [builderError, setBuilderError] = useState('');

  useEffect(() => {
    if (user) loadBase();
  }, [user]);

  async function loadProjects() {
    const { data, error } = await supabase.from('projects').select('*').order('name');
    if (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
    setProjects(data || []);
    return data || [];
  }

  async function loadBase() {
    setLoading(true);
    const [invRes, orgsRes, projRes] = await Promise.all([
      supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
      supabase.from('organizations').select('*').order('name'),
      supabase.from('projects').select('*').order('name'),
    ]);
    if (invRes.error) console.error(invRes.error);
    else setInvoices(invRes.data || []);
    if (orgsRes.error) console.error(orgsRes.error);
    else setOrganizations(orgsRes.data || []);
    if (projRes.error) console.error('Failed to load projects:', projRes.error);
    else setProjects(projRes.data || []);
    setLoading(false);
  }

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [organizations]);

  // When a customer is selected, load their org's projects directly.
  // Also merge in hours from billable time for the selected period.
  const invoiceProjects = useMemo(() => {
    const byId = new Map<string, InvoiceProjectOption>();
    const baseList = orgId && orgProjects.length > 0 ? orgProjects : projects;

    baseList.forEach((p) => {
      byId.set(p.id, { id: p.id, name: p.name, organization_id: p.organization_id, hoursInPeriod: 0 });
    });

    timeEntries.forEach((e) => {
      if (!e.project_id) return;
      const existing = byId.get(e.project_id);
      const hours = (existing?.hoursInPeriod ?? 0) + (e.hours || 0);
      if (existing) {
        existing.hoursInPeriod = hours;
      } else {
        byId.set(e.project_id, {
          id: e.project_id,
          name: e.project_name || `Project ${e.project_id.slice(0, 8)}`,
          organization_id: e.organization_id,
          hoursInPeriod: e.hours || 0,
        });
      }
    });

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orgId, orgProjects, projects, timeEntries]);

  const totalHoursInPeriod = useMemo(
    () => timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0),
    [timeEntries]
  );

  // --- Builder: load org projects when customer changes ---
  useEffect(() => {
    if (view !== 'builder' || !orgId) {
      setOrgProjects([]);
      return;
    }
    loadOrgProjects(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, orgId]);

  // --- Builder: load time entries whenever period or customer changes ---
  useEffect(() => {
    if (view !== 'builder') {
      setTimeEntries([]);
      return;
    }
    loadTimeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, orgId, periodStart, periodEnd]);

  // --- Builder: load org-specific issues when customer changes ---
  useEffect(() => {
    if (view !== 'builder' || !orgId) {
      setUnbilledIssues([]);
      setSelectedIssueIds(new Set());
      return;
    }
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, orgId]);

  // Select all org projects when customer is picked
  useEffect(() => {
    if (view !== 'builder' || orgProjects.length === 0) return;
    setSelectedProjectIds(new Set(orgProjects.map((p) => p.id)));
  }, [orgId, orgProjects, view]);

  async function loadOrgProjects(organizationId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    if (error) {
      console.error('Failed to load org projects:', error);
      setOrgProjects([]);
      return [];
    }
    setOrgProjects(data || []);
    return data || [];
  }

  function entryInPeriod(startTime: string) {
    const d = new Date(startTime).toISOString().split('T')[0];
    return d >= periodStart && d <= periodEnd;
  }

  async function loadTimeEntries() {
    let projectIds: string[] = [];
    if (orgId) {
      const { data: orgProjs, error: orgProjError } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId);
      if (orgProjError) {
        console.error('Failed to load org project ids:', orgProjError);
        setTimeEntries([]);
        return;
      }
      projectIds = orgProjs?.map((p) => p.id) ?? [];
      if (projectIds.length === 0) {
        setTimeEntries([]);
        return;
      }
    }

    let rawQuery = supabase
      .from('time_entries')
      .select('*')
      .not('duration', 'is', null)
      .not('end_time', 'is', null);
    let billableQuery = supabase.from('billable_time_entries').select('*');

    if (projectIds.length > 0) {
      rawQuery = rawQuery.in('project_id', projectIds);
      billableQuery = billableQuery.in('project_id', projectIds);
    }

    const [rawRes, billableRes] = await Promise.all([
      rawQuery.order('start_time', { ascending: false }),
      billableQuery.order('start_time', { ascending: false }),
    ]);

    if (rawRes.error) {
      console.error('Failed to load time entries:', rawRes.error);
      setTimeEntries([]);
      return;
    }
    if (billableRes.error) console.error('Failed to load billable time:', billableRes.error);

    const billableById = new Map((billableRes.data || []).map((b) => [b.id, b]));
    const nameByProjectId = new Map(orgProjects.map((p) => [p.id, p.name]));
    projects.forEach((p) => nameByProjectId.set(p.id, p.name));

    const merged: BillableTimeEntry[] = (rawRes.data || [])
      .filter((e) => entryInPeriod(e.start_time))
      .map((e) => {
        const billable = billableById.get(e.id);
        if (billable) return billable;
        const hours = Math.round(((e.duration || 0) / 3600) * 100) / 100;
        return {
          ...e,
          email: '',
          full_name: null,
          project_name: e.project_id ? nameByProjectId.get(e.project_id) ?? null : null,
          organization_id: orgId || null,
          organization_name: orgId ? orgNameById.get(orgId) ?? null : null,
          hours,
          hourly_rate: null,
          currency: 'USD',
          rate_source: null,
          billable_amount: 0,
        };
      });

    setTimeEntries(merged);
  }

  async function loadIssues() {
    const { data: issuesData, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'resolved')
      .is('invoice_id', null)
      .neq('billing_type', 'unbilled')
      .not('quoted_amount', 'is', null);
    if (issuesError) console.error(issuesError);
    else {
      setUnbilledIssues(issuesData || []);
      setSelectedIssueIds(new Set((issuesData || []).map((i) => i.id)));
    }
  }

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    timeEntries.forEach((e) => {
      if (e.project_id && e.project_name) map.set(e.project_id, e.project_name);
    });
    invoiceProjects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects, timeEntries, invoiceProjects]);

  const filteredTimeEntries = useMemo(
    () => timeEntries.filter((e) => e.project_id && selectedProjectIds.has(e.project_id)),
    [timeEntries, selectedProjectIds]
  );

  const filteredIssues = useMemo(
    () => unbilledIssues.filter((i) => !i.project_id || selectedProjectIds.has(i.project_id)),
    [unbilledIssues, selectedProjectIds]
  );

  const timeProjectSummaries = useMemo(() => {
    type UserAgg = { fullName: string | null; email: string; hours: number; amount: number; currency: string; rateSum: number; rateCount: number };
    const projectMap = new Map<string, { projectName: string; users: Map<string, UserAgg> }>();

    filteredTimeEntries.forEach((e) => {
      const pid = e.project_id!;
      if (!projectMap.has(pid)) {
        projectMap.set(pid, { projectName: e.project_name || projectNameById.get(pid) || 'Unknown project', users: new Map() });
      }
      const proj = projectMap.get(pid)!;
      if (!proj.users.has(e.user_id)) {
        proj.users.set(e.user_id, {
          fullName: e.full_name,
          email: e.email,
          hours: 0,
          amount: 0,
          currency: e.currency || 'USD',
          rateSum: 0,
          rateCount: 0,
        });
      }
      const s = proj.users.get(e.user_id)!;
      s.hours += e.hours || 0;
      s.amount += e.billable_amount || 0;
      if (e.hourly_rate != null) {
        s.rateSum += e.hourly_rate;
        s.rateCount += 1;
      }
    });

    return Array.from(projectMap.entries())
      .map(([projectId, { projectName, users }]) => ({
        projectId,
        projectName,
        users: Array.from(users.entries())
          .map(([userId, s]) => ({
            userId,
            fullName: s.fullName,
            email: s.email,
            hours: s.hours,
            amount: s.amount,
            currency: s.currency,
            avgRate: s.rateCount > 0 ? s.rateSum / s.rateCount : 0,
          }))
          .sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email)),
        subtotal: Array.from(users.values()).reduce((sum, s) => sum + s.amount, 0),
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [filteredTimeEntries, projectNameById]);

  const timeLineCount = useMemo(
    () => timeProjectSummaries.reduce((sum, p) => sum + p.users.filter((u) => u.amount > 0).length, 0),
    [timeProjectSummaries]
  );

  const draftLineItems: DraftLineItem[] = useMemo(() => {
    const items: DraftLineItem[] = [];
    if (includeTime) {
      timeProjectSummaries.forEach((proj) => {
        proj.users.forEach((s) => {
          if (s.amount <= 0) return;
          items.push({
            id: `time-${proj.projectId}-${s.userId}`,
            type: 'time',
            description: `${proj.projectName} — ${s.fullName || s.email} — ${s.hours.toFixed(2)}h`,
            quantity: s.hours,
            rate: s.avgRate,
            amount: s.amount,
          });
        });
      });
    }
    filteredIssues.forEach((issue) => {
      if (!selectedIssueIds.has(issue.id) || issue.quoted_amount == null) return;
      const projName = issue.project_id ? projectNameById.get(issue.project_id) : null;
      items.push({
        id: `issue-${issue.id}`,
        type: 'issue',
        description: projName ? `${projName} — ${issue.title}` : issue.title,
        quantity: null,
        rate: null,
        amount: issue.quoted_amount,
        issue_id: issue.id,
      });
    });
    customItems.forEach((c) => {
      if (!c.description.trim()) return;
      items.push({ id: c.id, type: 'custom', description: c.description, quantity: null, rate: null, amount: c.amount });
    });
    return items;
  }, [includeTime, timeProjectSummaries, filteredIssues, selectedIssueIds, customItems, projectNameById]);

  const draftTotal = draftLineItems.reduce((sum, i) => sum + i.amount, 0);

  function toggleProject(id: string) {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleIssue(id: string) {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomItem() {
    setCustomItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', amount: 0 }]);
  }

  function addDiscountItem() {
    setCustomItems((prev) => [...prev, { id: crypto.randomUUID(), description: 'Discount', amount: 0 }]);
  }

  function updateCustomItem(id: string, field: 'description' | 'amount', value: string | number) {
    setCustomItems((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function removeCustomItem(id: string) {
    setCustomItems((prev) => prev.filter((c) => c.id !== id));
  }

  async function openBuilder() {
    setOrgId(organizations[0]?.id || '');
    setRecipientName('');
    setRecipientEmail('');
    setDueDate('');
    setNote('');
    setCustomItems([]);
    setBuilderError('');
    setSelectedProjectIds(new Set());
    setView('builder');
    await loadProjects();
  }

  async function handleSaveInvoice(andPrint: boolean) {
    if (!user) return;
    if (!orgId && !recipientName.trim() && !recipientEmail.trim()) {
      setBuilderError('Pick a customer or enter recipient name/email.');
      return;
    }
    if (selectedProjectIds.size === 0) {
      setBuilderError('Select at least one project to include.');
      return;
    }
    if (draftLineItems.length === 0) {
      setBuilderError('Add at least one line item (time entries, issues, or a custom item).');
      return;
    }

    setSaving(true);
    setBuilderError('');

    const total = draftTotal;
    const { data: invoiceRow, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId || null,
        project_id: selectedProjectIds.size === 1 ? [...selectedProjectIds][0] : null,
        status: 'draft',
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate || null,
        recipient_name: recipientName.trim() || null,
        recipient_email: recipientEmail.trim() || null,
        subtotal: total,
        total,
        note: note.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError || !invoiceRow) {
      setBuilderError(invoiceError?.message || 'Failed to create invoice');
      setSaving(false);
      return;
    }

    const lineItemRows = draftLineItems.map((item, idx) => ({
      invoice_id: invoiceRow.id,
      issue_id: item.issue_id || null,
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      sort_order: idx,
    }));

    const { error: lineItemsError } = await supabase.from('invoice_line_items').insert(lineItemRows);
    if (lineItemsError) {
      setBuilderError(lineItemsError.message);
      setSaving(false);
      return;
    }

    const billedIssueIds = draftLineItems.filter((i) => i.issue_id).map((i) => i.issue_id as string);
    if (billedIssueIds.length > 0) {
      await supabase.from('issues').update({ status: 'billed', invoice_id: invoiceRow.id }).in('id', billedIssueIds);
    }

    setSaving(false);
    await loadBase();
    await openDetail(invoiceRow.id, andPrint);
  }

  async function openDetail(invoiceId: string, autoPrint = false) {
    const { data: inv, error: invError } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
    if (invError || !inv) {
      alert('Failed to load invoice');
      return;
    }
    const { data: items, error: itemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order');
    if (itemsError) console.error(itemsError);

    setDetailInvoice(inv);
    setDetailLineItems(items || []);
    setEmailStatus('idle');
    setEmailError('');
    setView('detail');

    if (autoPrint) {
      setTimeout(() => window.print(), 300);
    }
  }

  async function markStatus(status: InvoiceStatus) {
    if (!detailInvoice) return;
    const updates: Partial<Invoice> = { status };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    const { error } = await supabase.from('invoices').update(updates).eq('id', detailInvoice.id);
    if (error) {
      alert('Failed to update invoice: ' + error.message);
      return;
    }
    setDetailInvoice({ ...detailInvoice, ...updates });
    loadBase();
  }

  async function sendInvoiceEmail() {
    if (!detailInvoice || !detailInvoice.recipient_email) return;
    setSendingEmail(true);
    setEmailStatus('idle');
    setEmailError('');

    try {
      const { error } = await supabase.functions.invoke('send-invoice', {
        body: {
          recipientEmail: detailInvoice.recipient_email,
          recipientName: detailInvoice.recipient_name || undefined,
          startDate: detailInvoice.period_start || detailInvoice.issue_date,
          endDate: detailInvoice.period_end || detailInvoice.issue_date,
          orgName: detailInvoice.organization_id ? orgNameById.get(detailInvoice.organization_id) : undefined,
          userSummaries: [],
          lineItems: detailLineItems.map((li) => ({ id: li.id, description: li.description, amount: li.amount })),
          subtotal: detailInvoice.subtotal,
          lineItemsTotal: detailInvoice.total,
          invoiceTotal: detailInvoice.total,
          note: detailInvoice.note || undefined,
        },
      });
      if (error) throw new Error(error.message);
      setEmailStatus('sent');
      await markStatus('sent');
    } catch (err) {
      setEmailStatus('error');
      setEmailError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSendingEmail(false);
    }
  }

  async function deleteInvoice(invoice: Invoice) {
    if (invoice.status !== 'draft') {
      alert('Only draft invoices can be deleted. Void a sent/paid invoice instead.');
      return;
    }
    const confirmed = window.confirm(`Delete draft invoice ${invoice.invoice_number}? Any billed issues will become unbilled again.`);
    if (!confirmed) return;

    await supabase.from('issues').update({ status: 'resolved', invoice_id: null }).eq('invoice_id', invoice.id);
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
    if (error) {
      alert('Failed to delete invoice: ' + error.message);
      return;
    }
    loadBase();
  }

  if (loading) {
    return (
      <div className="invoices-page">
        <div className="invoices-loading">Loading invoices…</div>
      </div>
    );
  }

  // ---------------- LIST VIEW ----------------
  if (view === 'list') {
    return (
      <div className="invoices-page">
        <div className="invoices-header no-print">
          <div>
            <h2>
              <Receipt size={22} /> Invoices
            </h2>
            <p className="invoices-subtitle">Persisted invoices — mix hourly time and flat-fee issues, print or email, track paid status.</p>
          </div>
          <button className="invoices-btn invoices-btn-primary" onClick={openBuilder} disabled={organizations.length === 0}>
            <Plus size={16} /> New Invoice
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="invoices-empty">
            <Receipt size={48} />
            <h3>No invoices yet</h3>
            <p>Create one from resolved issues or hourly time entries.</p>
          </div>
        ) : (
          <div className="invoices-table-wrap">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="align-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} onClick={() => openDetail(inv.id)}>
                    <td>{inv.invoice_number}</td>
                    <td>{inv.organization_id ? orgNameById.get(inv.organization_id) || '—' : '—'}</td>
                    <td>{new Date(inv.issue_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`invoice-status-badge status-${inv.status}`}>{STATUS_LABEL[inv.status]}</span>
                    </td>
                    <td className="align-right">
                      {inv.currency} {inv.total.toFixed(2)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {inv.status === 'draft' && (
                        <button className="invoices-icon-btn" title="Delete draft" onClick={() => deleteInvoice(inv)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ---------------- BUILDER VIEW ----------------
  if (view === 'builder') {
    return (
      <div className="invoices-page">
        <div className="invoices-header no-print">
          <button className="invoices-btn invoices-btn-secondary" onClick={() => setView('list')}>
            <ArrowLeft size={16} /> Back
          </button>
          <h2 style={{ marginLeft: 12 }}>New Invoice</h2>
        </div>

        <div className="invoice-builder">
          <div className="invoice-builder-section">
            <div className="issues-form-row">
              <div className="issues-form-group">
                <label>Customer</label>
                <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                  <option value="">No customer / bill manually…</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="issues-form-row">
              <div className="issues-form-group">
                <label>Period start</label>
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="issues-form-group">
                <label>Period end</label>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <div className="issues-form-group">
                <label>Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="issues-form-row">
              <div className="issues-form-group">
                <label>Recipient name</label>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Customer contact" />
              </div>
              <div className="issues-form-group">
                <label>Recipient email</label>
                <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="billing@customer.com" />
              </div>
            </div>
          </div>

          <div className="invoice-builder-section">
                <h4>Projects to include</h4>
                <p className="invoices-subtitle" style={{ margin: '0 0 8px' }}>
                  {orgId
                    ? `All projects linked to ${orgNameById.get(orgId) || 'this customer'}. Uncheck any you don't want on this invoice.`
                    : 'Select a customer above to load their projects, or pick from all projects below.'}
                </p>
                {!orgId && invoiceProjects.length === 0 && (
                  <p className="invoices-subtitle">Select a customer to load their projects.</p>
                )}
                {orgId && orgProjects.length === 0 && (
                  <p className="invoices-subtitle">
                    No projects linked to this customer yet. Assign projects on the Organizations tab.
                  </p>
                )}
                {invoiceProjects.length > 0 && totalHoursInPeriod === 0 && (
                  <p className="invoices-subtitle invoices-period-hint">
                    No time logged between {periodStart} and {periodEnd}. Widen the period (e.g. start of year) to include your tracked hours.
                  </p>
                )}
                {invoiceProjects.length === 0 ? null : (
                  <div className="invoice-builder-issue-list">
                    {invoiceProjects.map((p) => (
                      <label key={p.id} className="invoice-builder-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.has(p.id)}
                          onChange={() => toggleProject(p.id)}
                        />
                        <span style={{ flex: 1 }}>
                          {p.name}
                          {p.hoursInPeriod > 0 && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--primary-color)', fontWeight: 600 }}>
                              {p.hoursInPeriod.toFixed(1)}h
                            </span>
                          )}
                          {p.organization_id && orgNameById.get(p.organization_id) && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                              ({orgNameById.get(p.organization_id)})
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="invoice-builder-section">
                <label className="invoice-builder-checkbox">
                  <input type="checkbox" checked={includeTime} onChange={(e) => setIncludeTime(e.target.checked)} />
                  Include hourly time ({selectedProjectIds.size} {selectedProjectIds.size === 1 ? 'project' : 'projects'}, {timeLineCount} {timeLineCount === 1 ? 'line' : 'lines'})
                </label>
                {includeTime && timeProjectSummaries.length > 0 && (
                  <table className="invoice-builder-table">
                    <thead>
                      <tr>
                        <th>Project / Person</th>
                        <th className="align-right">Hours</th>
                        <th className="align-right">Rate</th>
                        <th className="align-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeProjectSummaries.map((proj) => (
                        <Fragment key={proj.projectId}>
                          <tr className="invoice-builder-project-row">
                            <td colSpan={3}><strong>{proj.projectName}</strong></td>
                            <td className="align-right"><strong>{proj.users[0]?.currency || 'USD'} {proj.subtotal.toFixed(2)}</strong></td>
                          </tr>
                          {proj.users.map((s) => (
                            <tr key={`${proj.projectId}-${s.userId}`}>
                              <td style={{ paddingLeft: 20 }}>{s.fullName || s.email}</td>
                              <td className="align-right">{s.hours.toFixed(2)}h</td>
                              <td className="align-right">{s.currency} {s.avgRate.toFixed(2)}/hr</td>
                              <td className="align-right">{s.currency} {s.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
                {includeTime && selectedProjectIds.size > 0 && timeProjectSummaries.length === 0 && (
                  <p className="invoices-subtitle" style={{ margin: '8px 0 0' }}>No billable time for the selected projects in this period.</p>
                )}
              </div>

              {orgId ? (
                <div className="invoice-builder-section">
                  <h4>Unbilled resolved issues</h4>
                  {filteredIssues.length === 0 ? (
                    <p className="invoices-subtitle">No unbilled, resolved, quoted issues for the selected projects.</p>
                  ) : (
                    <div className="invoice-builder-issue-list">
                      {filteredIssues.map((issue) => (
                        <label key={issue.id} className="invoice-builder-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedIssueIds.has(issue.id)}
                            onChange={() => toggleIssue(issue.id)}
                          />
                          <span style={{ flex: 1 }}>
                            {issue.project_id ? `${projectNameById.get(issue.project_id) || 'Project'} — ` : ''}
                            {issue.title}
                          </span>
                          <span style={{ fontWeight: 600 }}>{issue.currency} {issue.quoted_amount?.toFixed(2)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="invoice-builder-section">
                  <h4>Unbilled resolved issues</h4>
                  <p className="invoices-subtitle">Select a customer above to include flat-fee issues.</p>
                </div>
              )}

              <div className="invoice-builder-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>Custom line items & discounts</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="invoices-btn invoices-btn-secondary" onClick={addDiscountItem}>
                      <DollarSign size={14} /> Add Discount
                    </button>
                    <button className="invoices-btn invoices-btn-secondary" onClick={addCustomItem}>
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>
                </div>
                {customItems.length === 0 ? (
                  <p className="invoices-subtitle" style={{ margin: 0 }}>
                    No custom items yet. Use negative amounts for discounts (e.g. -50.00).
                  </p>
                ) : (
                  customItems.map((item) => (
                    <div key={item.id} className="invoice-builder-custom-row">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                        placeholder="Description (e.g. Discount)"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateCustomItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className={item.amount < 0 ? 'invoice-amount-negative' : ''}
                      />
                      <span className={`invoice-amount-preview ${item.amount < 0 ? 'negative' : item.amount > 0 ? 'positive' : ''}`}>
                        {item.amount < 0 ? '-' : item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
                      </span>
                      <button onClick={() => removeCustomItem(item.id)} aria-label="Remove line item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="invoice-builder-section">
                <div className="issues-form-group">
                  <label>Note / memo</label>
                  <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Payment terms, thanks, etc." />
                </div>
              </div>

              <div className="invoice-builder-total">
                <span>Total</span>
                <strong>${draftTotal.toFixed(2)}</strong>
              </div>

              {builderError && (
                <div className="issues-form-error">
                  <AlertCircle size={14} /> {builderError}
                </div>
              )}

          <div className="invoice-builder-actions">
            <button className="invoices-btn invoices-btn-secondary" onClick={() => handleSaveInvoice(false)} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button className="invoices-btn invoices-btn-primary" onClick={() => handleSaveInvoice(true)} disabled={saving}>
              <Printer size={14} /> Save & Print
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- DETAIL / PRINT VIEW ----------------
  if (view === 'detail' && detailInvoice) {
    const inv = detailInvoice;
    return (
      <div className="invoices-page">
        <div className="invoices-header no-print">
          <button className="invoices-btn invoices-btn-secondary" onClick={() => setView('list')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button className="invoices-btn invoices-btn-secondary" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
            {inv.status !== 'paid' && inv.status !== 'void' && (
              <button className="invoices-btn invoices-btn-secondary" onClick={sendInvoiceEmail} disabled={!inv.recipient_email || sendingEmail}>
                <Mail size={14} /> {sendingEmail ? 'Sending…' : 'Email'}
              </button>
            )}
            {inv.status !== 'paid' && inv.status !== 'void' && (
              <button className="invoices-btn invoices-btn-primary" onClick={() => markStatus('paid')}>
                <CheckCircle2 size={14} /> Mark Paid
              </button>
            )}
            {inv.status !== 'void' && inv.status !== 'paid' && (
              <button className="invoices-btn invoices-btn-danger" onClick={() => markStatus('void')}>
                <Ban size={14} /> Void
              </button>
            )}
          </div>
        </div>

        {emailStatus === 'sent' && <p className="invoices-email-status success no-print">Emailed to {inv.recipient_email}</p>}
        {emailStatus === 'error' && <p className="invoices-email-status error no-print">{emailError}</p>}

        <div className="invoice-print-sheet">
          <div className="invoice-print-brand-bar">
            <h1>INVOICE</h1>
          </div>
          <div className="invoice-print-body">
          <div className="invoice-print-header">
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>{inv.invoice_number}</p>
              <p>Date: {new Date(inv.issue_date).toLocaleDateString()}</p>
              {inv.due_date && <p>Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
              {(inv.period_start || inv.period_end) && (
                <p>Period: {inv.period_start} to {inv.period_end}</p>
              )}
            </div>
            <div className="invoice-print-total">
              <span>Total Due</span>
              <strong>{inv.currency} {inv.total.toFixed(2)}</strong>
              <span className={`invoice-status-badge status-${inv.status}`}>{STATUS_LABEL[inv.status]}</span>
            </div>
          </div>

          <div className="invoice-print-billto">
            <h4>Bill To</h4>
            <p>{inv.recipient_name || (inv.organization_id ? orgNameById.get(inv.organization_id) : '') || '—'}</p>
            {inv.recipient_email && <p>{inv.recipient_email}</p>}
            {inv.organization_id && <p>{orgNameById.get(inv.organization_id)}</p>}
          </div>

          <table className="invoice-print-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="align-right">Qty</th>
                <th className="align-right">Rate</th>
                <th className="align-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {detailLineItems.map((li) => (
                <tr key={li.id} className={li.amount < 0 ? 'invoice-line-negative' : ''}>
                  <td>{li.description}</td>
                  <td className="align-right">{li.quantity != null ? li.quantity.toFixed(2) : '—'}</td>
                  <td className="align-right">{li.rate != null ? li.rate.toFixed(2) : '—'}</td>
                  <td className="align-right">
                    {li.amount < 0 ? '-' : ''}{inv.currency} {Math.abs(li.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total Due</td>
                <td className="align-right">{inv.currency} {inv.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {inv.note && (
            <div className="invoice-print-note">
              <strong>Note:</strong> {inv.note}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Invoices;
