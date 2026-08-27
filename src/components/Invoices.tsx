import { useState, useEffect, useMemo } from 'react';
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
  const [projectId, setProjectId] = useState('');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
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
    loadBase();
  }, []);

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
    if (projRes.error) console.error(projRes.error);
    else setProjects(projRes.data || []);
    setLoading(false);
  }

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    organizations.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [organizations]);

  const projectsForOrg = useMemo(() => projects.filter((p) => p.organization_id === orgId), [projects, orgId]);

  // --- Builder: load candidate time entries + unbilled issues when org/period changes ---
  useEffect(() => {
    if (view !== 'builder' || !orgId) {
      setTimeEntries([]);
      setUnbilledIssues([]);
      setSelectedIssueIds(new Set());
      return;
    }
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, orgId, projectId, periodStart, periodEnd]);

  async function loadCandidates() {
    let entriesQuery = supabase
      .from('billable_time_entries')
      .select('*')
      .eq('organization_id', orgId)
      .gte('start_time', `${periodStart}T00:00:00`)
      .lte('start_time', `${periodEnd}T23:59:59`);
    if (projectId) entriesQuery = entriesQuery.eq('project_id', projectId);

    const { data: entries, error: entriesError } = await entriesQuery;
    if (entriesError) console.error(entriesError);
    else setTimeEntries(entries || []);

    let issuesQuery = supabase
      .from('issues')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'resolved')
      .is('invoice_id', null)
      .neq('billing_type', 'unbilled')
      .not('quoted_amount', 'is', null);
    if (projectId) issuesQuery = issuesQuery.eq('project_id', projectId);

    const { data: issuesData, error: issuesError } = await issuesQuery;
    if (issuesError) console.error(issuesError);
    else {
      setUnbilledIssues(issuesData || []);
      setSelectedIssueIds(new Set((issuesData || []).map((i) => i.id)));
    }
  }

  const timeUserSummaries = useMemo(() => {
    const map = new Map<string, { fullName: string | null; email: string; hours: number; amount: number; currency: string; rateSum: number; rateCount: number }>();
    timeEntries.forEach((e) => {
      if (!map.has(e.user_id)) {
        map.set(e.user_id, { fullName: e.full_name, email: e.email, hours: 0, amount: 0, currency: e.currency || 'USD', rateSum: 0, rateCount: 0 });
      }
      const s = map.get(e.user_id)!;
      s.hours += e.hours || 0;
      s.amount += e.billable_amount || 0;
      if (e.hourly_rate != null) {
        s.rateSum += e.hourly_rate;
        s.rateCount += 1;
      }
    });
    return Array.from(map.entries()).map(([userId, s]) => ({
      userId,
      fullName: s.fullName,
      email: s.email,
      hours: s.hours,
      amount: s.amount,
      currency: s.currency,
      avgRate: s.rateCount > 0 ? s.rateSum / s.rateCount : 0,
    }));
  }, [timeEntries]);

  const draftLineItems: DraftLineItem[] = useMemo(() => {
    const items: DraftLineItem[] = [];
    if (includeTime) {
      timeUserSummaries.forEach((s) => {
        if (s.amount <= 0) return;
        items.push({
          id: `time-${s.userId}`,
          type: 'time',
          description: `${s.fullName || s.email} — ${s.hours.toFixed(2)}h`,
          quantity: s.hours,
          rate: s.avgRate,
          amount: s.amount,
        });
      });
    }
    unbilledIssues.forEach((issue) => {
      if (!selectedIssueIds.has(issue.id) || issue.quoted_amount == null) return;
      items.push({
        id: `issue-${issue.id}`,
        type: 'issue',
        description: issue.title,
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
  }, [includeTime, timeUserSummaries, unbilledIssues, selectedIssueIds, customItems]);

  const draftTotal = draftLineItems.reduce((sum, i) => sum + i.amount, 0);

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

  function updateCustomItem(id: string, field: 'description' | 'amount', value: string | number) {
    setCustomItems((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function removeCustomItem(id: string) {
    setCustomItems((prev) => prev.filter((c) => c.id !== id));
  }

  function openBuilder() {
    setOrgId(organizations[0]?.id || '');
    setProjectId('');
    setRecipientName('');
    setRecipientEmail('');
    setDueDate('');
    setNote('');
    setCustomItems([]);
    setBuilderError('');
    setView('builder');
  }

  async function handleSaveInvoice(andPrint: boolean) {
    if (!user) return;
    if (!orgId) {
      setBuilderError('Pick a customer.');
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
        organization_id: orgId,
        project_id: projectId || null,
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
                <label>Customer *</label>
                <select value={orgId} onChange={(e) => { setOrgId(e.target.value); setProjectId(''); }}>
                  <option value="">Select customer…</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="issues-form-group">
                <label>Project (optional)</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!orgId}>
                  <option value="">All projects</option>
                  {projectsForOrg.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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

          {orgId && (
            <>
              <div className="invoice-builder-section">
                <label className="invoice-builder-checkbox">
                  <input type="checkbox" checked={includeTime} onChange={(e) => setIncludeTime(e.target.checked)} />
                  Include hourly time entries for this period ({timeUserSummaries.length} {timeUserSummaries.length === 1 ? 'person' : 'people'})
                </label>
                {includeTime && timeUserSummaries.length > 0 && (
                  <table className="invoice-builder-table">
                    <tbody>
                      {timeUserSummaries.map((s) => (
                        <tr key={s.userId}>
                          <td>{s.fullName || s.email}</td>
                          <td className="align-right">{s.hours.toFixed(2)}h</td>
                          <td className="align-right">{s.currency} {s.avgRate.toFixed(2)}/hr</td>
                          <td className="align-right">{s.currency} {s.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="invoice-builder-section">
                <h4>Unbilled resolved issues</h4>
                {unbilledIssues.length === 0 ? (
                  <p className="invoices-subtitle">No unbilled, resolved, quoted issues for this customer/period.</p>
                ) : (
                  <div className="invoice-builder-issue-list">
                    {unbilledIssues.map((issue) => (
                      <label key={issue.id} className="invoice-builder-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIssueIds.has(issue.id)}
                          onChange={() => toggleIssue(issue.id)}
                        />
                        <span style={{ flex: 1 }}>{issue.title}</span>
                        <span style={{ fontWeight: 600 }}>{issue.currency} {issue.quoted_amount?.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="invoice-builder-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>Custom line items</h4>
                  <button className="invoices-btn invoices-btn-secondary" onClick={addCustomItem}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                {customItems.map((item) => (
                  <div key={item.id} className="invoice-builder-custom-row">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateCustomItem(item.id, 'description', e.target.value)}
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateCustomItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <button onClick={() => removeCustomItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
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
            </>
          )}
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
          <div className="invoice-print-header">
            <div>
              <h1>INVOICE</h1>
              <p>{inv.invoice_number}</p>
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
                <tr key={li.id}>
                  <td>{li.description}</td>
                  <td className="align-right">{li.quantity != null ? li.quantity.toFixed(2) : '—'}</td>
                  <td className="align-right">{li.rate != null ? li.rate.toFixed(2) : '—'}</td>
                  <td className="align-right">{li.amount.toFixed(2)}</td>
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
    );
  }

  return null;
}
