import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  DollarSign,
  Download,
  Filter,
  Clock,
  TrendingUp,
  AlertCircle,
  X,
  BarChart3,
  PieChart,
  Plus,
  Trash2,
  Send,
  Mail
} from 'lucide-react';
import type { BillableTimeEntry, Project, Organization } from '../types';
import './ProjectBillingReport.css';

interface InvoiceLineItem {
  id: string;
  description: string;
  amount: number;
}

interface ProjectBillingReportProps {
  onClose: () => void;
  asPage?: boolean;
  initialProjectId?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

interface UserSummary {
  userId: string;
  email: string;
  fullName: string | null;
  totalHours: number;
  averageRate: number;
  totalAmount: number;
  entriesWithoutRate: number;
  currency: string;
}

export function ProjectBillingReport({ onClose, asPage, initialProjectId, initialStartDate, initialEndDate }: ProjectBillingReportProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BillableTimeEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<BillableTimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Filter state
  const [startDate, setStartDate] = useState(() => {
    if (initialStartDate) return initialStartDate;
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    if (initialEndDate) return initialEndDate;
    return new Date().toISOString().split('T')[0];
  });
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId || '');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [showMissingRates, setShowMissingRates] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non-billable'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice line items & email
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([]);
  const [invoiceNote, setInvoiceNote] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, startDate, endDate, selectedProject, selectedOrg, selectedUser, billableFilter, searchQuery]);

  async function loadData() {
    setLoading(true);

    // Load billable time entries
    const { data: entriesData, error: entriesError } = await supabase
      .from('billable_time_entries')
      .select('*')
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`)
      .order('start_time', { ascending: false });

    if (entriesError) {
      console.error('Error loading billable entries:', entriesError);
    } else {
      setEntries(entriesData || []);
    }

    // Load projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('name');

    if (projectsError) {
      console.error('Error loading projects:', projectsError);
    } else {
      setProjects(projectsData || []);
    }

    // Load organizations
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (orgsError) {
      console.error('Error loading organizations:', orgsError);
    } else {
      setOrganizations(orgsData || []);
    }

    setLoading(false);
  }

  function applyFilters() {
    let filtered = entries.filter(entry => {
      const entryDate = new Date(entry.start_time).toISOString().split('T')[0];
      return entryDate >= startDate && entryDate <= endDate;
    });

    if (selectedProject) {
      filtered = filtered.filter(e => e.project_id === selectedProject);
    }

    if (selectedOrg) {
      filtered = filtered.filter(e => e.organization_id === selectedOrg);
    }

    if (selectedUser) {
      filtered = filtered.filter(e => e.user_id === selectedUser);
    }

    // Billable filter
    if (billableFilter === 'billable') {
      filtered = filtered.filter(e => e.hourly_rate !== null);
    } else if (billableFilter === 'non-billable') {
      filtered = filtered.filter(e => e.hourly_rate === null);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.description?.toLowerCase().includes(query) ||
        e.project_name?.toLowerCase().includes(query) ||
        e.full_name?.toLowerCase().includes(query) ||
        e.tags?.toLowerCase().includes(query)
      );
    }

    setFilteredEntries(filtered);
  }

  async function refreshData() {
    await loadData();
  }

  function calculateSummary() {
    const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const totalAmount = filteredEntries.reduce((sum, e) => sum + (e.billable_amount || 0), 0);
    const entriesWithRate = filteredEntries.filter(e => e.hourly_rate !== null);
    const entriesWithoutRate = filteredEntries.filter(e => e.hourly_rate === null);
    const averageRate = entriesWithRate.length > 0
      ? entriesWithRate.reduce((sum, e) => sum + (e.hourly_rate || 0), 0) / entriesWithRate.length
      : 0;
    
    // Billable vs non-billable stats
    const billableHours = entriesWithRate.reduce((sum, e) => sum + (e.hours || 0), 0);
    const nonBillableHours = entriesWithoutRate.reduce((sum, e) => sum + (e.hours || 0), 0);
    const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
    
    // Calculate potential lost revenue
    const hoursWithoutRate = nonBillableHours;
    const potentialRevenue = hoursWithoutRate * averageRate;

    return { 
      totalHours, 
      totalAmount, 
      averageRate, 
      entriesWithoutRate: entriesWithoutRate.length, 
      hoursWithoutRate, 
      potentialRevenue,
      billableHours,
      nonBillableHours,
      billablePercentage
    };
  }

  function calculateProjectBreakdown() {
    const projectMap = new Map<string, { name: string; hours: number; amount: number; color: string }>();
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    
    filteredEntries.forEach(entry => {
      const projectId = entry.project_id || 'no-project';
      const projectName = entry.project_name || 'No Project';
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          name: projectName,
          hours: 0,
          amount: 0,
          color: colors[projectMap.size % colors.length]
        });
      }
      
      const project = projectMap.get(projectId)!;
      project.hours += entry.hours || 0;
      project.amount += entry.billable_amount || 0;
    });
    
    return Array.from(projectMap.values()).sort((a, b) => b.amount - a.amount);
  }

  function setDatePreset(preset: string) {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'week':
        start.setDate(today.getDate() - today.getDay());
        end = today;
        break;
      case 'month':
        start.setDate(1);
        end = today;
        break;
      case 'last30':
        start.setDate(today.getDate() - 30);
        end = today;
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = today;
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }

  function calculateUserSummaries(): UserSummary[] {
    const userMap = new Map<string, UserSummary>();

    filteredEntries.forEach(entry => {
      if (!userMap.has(entry.user_id)) {
        userMap.set(entry.user_id, {
          userId: entry.user_id,
          email: entry.email,
          fullName: entry.full_name,
          totalHours: 0,
          averageRate: 0,
          totalAmount: 0,
          entriesWithoutRate: 0,
          currency: entry.currency || 'USD'
        });
      }

      const summary = userMap.get(entry.user_id)!;
      summary.totalHours += entry.hours || 0;
      summary.totalAmount += entry.billable_amount || 0;
      if (entry.hourly_rate === null) {
        summary.entriesWithoutRate += 1;
      }
    });

    // Calculate average rate for each user
    userMap.forEach(summary => {
      const userEntries = filteredEntries.filter(e => e.user_id === summary.userId && e.hourly_rate !== null);
      if (userEntries.length > 0) {
        summary.averageRate = userEntries.reduce((sum, e) => sum + (e.hourly_rate || 0), 0) / userEntries.length;
      }
    });

    return Array.from(userMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  function exportToCSV() {
    const summary = calculateSummary();
    const userSummaries = calculateUserSummaries();

    // Create CSV content
    let csv = 'Billable Time Report\n\n';
    csv += `Report Period:,${startDate} to ${endDate}\n`;
    csv += `Generated:,${new Date().toLocaleString()}\n\n`;

    csv += 'Summary\n';
    csv += `Total Hours,${summary.totalHours.toFixed(2)}\n`;
    csv += `Total Amount,${summary.totalAmount.toFixed(2)}\n`;
    csv += `Average Rate,${summary.averageRate.toFixed(2)}\n`;
    csv += `Entries Without Rate,${summary.entriesWithoutRate}\n\n`;

    csv += 'User Summary\n';
    csv += 'Name,Email,Hours,Avg Rate,Total Amount,Entries Without Rate,Currency\n';
    userSummaries.forEach(user => {
      csv += `"${user.fullName || 'N/A'}","${user.email}",${user.totalHours.toFixed(2)},${user.averageRate.toFixed(2)},${user.totalAmount.toFixed(2)},${user.entriesWithoutRate},"${user.currency}"\n`;
    });

    csv += '\nDetailed Entries\n';
    csv += 'Date,User,Project,Organization,Description,Hours,Rate,Currency,Rate Source,Amount\n';
    filteredEntries.forEach(entry => {
      const date = new Date(entry.start_time).toLocaleDateString();
      const name = entry.full_name || 'N/A';
      const project = entry.project_name || 'N/A';
      const org = entry.organization_name || 'N/A';
      const desc = (entry.description || 'N/A').replace(/"/g, '""');
      const rate = entry.hourly_rate?.toFixed(2) || 'N/A';
      const currency = entry.currency || 'N/A';
      const source = entry.rate_source || 'N/A';
      const amount = entry.billable_amount?.toFixed(2) || '0.00';

      csv += `"${date}","${name}","${project}","${org}","${desc}",${entry.hours.toFixed(2)},"${rate}","${currency}","${source}",${amount}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing-report-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function addLineItem() {
    setInvoiceLineItems(prev => [...prev, { id: crypto.randomUUID(), description: '', amount: 0 }]);
  }

  function updateLineItem(id: string, field: 'description' | 'amount', value: string | number) {
    setInvoiceLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function removeLineItem(id: string) {
    setInvoiceLineItems(prev => prev.filter(item => item.id !== id));
  }

  function addDiscountItem() {
    setInvoiceLineItems(prev => [...prev, { id: crypto.randomUUID(), description: 'Friend discount', amount: 0 }]);
  }

  async function sendInvoice() {
    if (!recipientEmail) return;
    setEmailStatus('sending');
    setEmailError('');

    const subtotal = summary.totalAmount;
    const lineItemsTotal = invoiceLineItems.reduce((sum, item) => sum + item.amount, 0);
    const invoiceTotal = subtotal + lineItemsTotal;

    const project = selectedProject ? projects.find(p => p.id === selectedProject) : null;
    const org = selectedOrg ? organizations.find(o => o.id === selectedOrg) : null;

    try {
      const { error } = await supabase.functions.invoke('send-invoice', {
        body: {
          recipientEmail,
          recipientName: recipientName || undefined,
          startDate,
          endDate,
          projectName: project?.name,
          orgName: org?.name,
          userSummaries: userSummaries.map(u => ({
            fullName: u.fullName,
            email: u.email,
            totalHours: u.totalHours,
            averageRate: u.averageRate,
            totalAmount: u.totalAmount,
            currency: u.currency,
          })),
          lineItems: invoiceLineItems,
          subtotal,
          lineItemsTotal,
          invoiceTotal,
          note: invoiceNote || undefined,
        },
      });

      if (error) throw new Error(error.message);
      setEmailStatus('sent');
    } catch (err) {
      setEmailStatus('error');
      setEmailError(err instanceof Error ? err.message : 'Failed to send email');
    }
  }

  const summary = calculateSummary();
  const userSummaries = calculateUserSummaries();
  const projectBreakdown = calculateProjectBreakdown();
  const invoiceLineItemsTotal = invoiceLineItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceTotal = summary.totalAmount + invoiceLineItemsTotal;
  const uniqueUsers = Array.from(new Set(entries.map(e => ({ id: e.user_id, email: e.email, name: e.full_name }))))
    .filter((user, index, self) => self.findIndex(u => u.id === user.id) === index);

  if (loading) {
    return (
      <div className="billing-modal-overlay">
        <div className="billing-loading">
          <div className="billing-spinner"></div>
        </div>
      </div>
    );
  }

  const pageContent = (
    <>
        <div className="billing-modal-content">
          {/* Active Filters Indicator */}
          {(initialProjectId || initialStartDate || initialEndDate) && (
            <div className="billing-filter-indicator">
              <strong>📊 Dashboard Filters Applied:</strong>
              {initialProjectId && projects.find(p => p.id === initialProjectId) && (
                <span style={{ marginLeft: '8px' }}>
                  Project: <strong>{projects.find(p => p.id === initialProjectId)?.name}</strong>
                </span>
              )}
              {initialStartDate && (
                <span style={{ marginLeft: '8px' }}>
                  From: <strong>{initialStartDate}</strong>
                </span>
              )}
              {initialEndDate && (
                <span style={{ marginLeft: '8px' }}>
                  To: <strong>{initialEndDate}</strong>
                </span>
              )}
            </div>
          )}

          {/* Date Range and Filters */}
          <div className="billing-filters">
            {/* Quick Date Presets */}
            <div style={{ marginBottom: '16px' }}>
              <label className="billing-filter-label" style={{ marginBottom: '8px', display: 'block' }}>
                Quick Date Range
              </label>
              <div className="billing-date-presets">
                <button onClick={() => setDatePreset('today')} className="billing-preset-button">Today</button>
                <button onClick={() => setDatePreset('week')} className="billing-preset-button">This Week</button>
                <button onClick={() => setDatePreset('month')} className="billing-preset-button">This Month</button>
                <button onClick={() => setDatePreset('last30')} className="billing-preset-button">Last 30 Days</button>
                <button onClick={() => setDatePreset('quarter')} className="billing-preset-button">This Quarter</button>
                <button onClick={() => setDatePreset('year')} className="billing-preset-button">This Year</button>
              </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '16px' }}>
              <label className="billing-filter-label" style={{ marginBottom: '8px', display: 'block' }}>
                Search Entries
              </label>
              <input
                type="text"
                placeholder="Search by description, project, person, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="billing-filter-input"
                style={{ width: '100%' }}
              />
              {searchQuery && (
                <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Found {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} matching "{searchQuery}"
                </p>
              )}
            </div>

            {/* Billable Filter Toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label className="billing-filter-label" style={{ marginBottom: '8px', display: 'block' }}>
                Entry Type
              </label>
              <div className="billing-toggle-group">
                <button 
                  onClick={() => setBillableFilter('all')}
                  className={`billing-toggle-button ${billableFilter === 'all' ? 'active' : ''}`}
                >
                  All Entries
                </button>
                <button 
                  onClick={() => setBillableFilter('billable')}
                  className={`billing-toggle-button ${billableFilter === 'billable' ? 'active' : ''}`}
                >
                  Billable Only
                </button>
                <button 
                  onClick={() => setBillableFilter('non-billable')}
                  className={`billing-toggle-button ${billableFilter === 'non-billable' ? 'active' : ''}`}
                >
                  Non-Billable Only
                </button>
              </div>
            </div>

            <div className="billing-filter-actions">
              <div className="billing-filter-group">
                <label className="billing-filter-label">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="billing-filter-input"
                />
              </div>
              <div className="billing-filter-group">
                <label className="billing-filter-label">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="billing-filter-input"
                />
              </div>
              <button
                onClick={refreshData}
                className="billing-button billing-button-primary"
              >
                Apply
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="billing-button billing-button-secondary"
              >
                <Filter size={16} />
                Filters
              </button>
              <button
                onClick={exportToCSV}
                className="billing-button billing-button-primary"
                style={{ marginLeft: 'auto' }}
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={() => setShowInvoice(true)}
                className="billing-button billing-button-primary"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
              >
                📄 Generate Invoice
              </button>
            </div>

            {/* Additional Filters */}
            {showFilters && (
              <div className="billing-collapsible-section" style={{ marginTop: '16px' }}>
                <div className="billing-filters-grid">
                  <div className="billing-filter-group">
                    <label className="billing-filter-label">
                      Project
                    </label>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="billing-filter-select"
                    >
                      <option value="">All Projects</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="billing-filter-group">
                    <label className="billing-filter-label">
                      Organization
                    </label>
                    <select
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="billing-filter-select"
                    >
                      <option value="">All Organizations</option>
                      {organizations.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="billing-filter-group">
                    <label className="billing-filter-label">
                      User
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="billing-filter-select"
                    >
                      <option value="">All Users</option>
                      {uniqueUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="billing-summary-cards">
            <div className="billing-summary-card hours">
              <div className="billing-summary-content">
                <p className="billing-summary-label">Total Hours</p>
                <p className="billing-summary-value">
                  {summary.totalHours.toFixed(2)}
                </p>
              </div>
              <div className="billing-summary-icon">
                <Clock size={40} />
              </div>
            </div>

            <div className="billing-summary-card amount">
              <div className="billing-summary-content">
                <p className="billing-summary-label">Total Amount</p>
                <p className="billing-summary-value">
                  ${summary.totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="billing-summary-icon">
                <DollarSign size={40} />
              </div>
            </div>

            <div className="billing-summary-card rate">
              <div className="billing-summary-content">
                <p className="billing-summary-label">Avg Rate</p>
                <p className="billing-summary-value">
                  ${summary.averageRate.toFixed(2)}/hr
                </p>
              </div>
              <div className="billing-summary-icon">
                <TrendingUp size={40} />
              </div>
            </div>

            <div className="billing-summary-card missing">
              <div className="billing-summary-content">
                <p className="billing-summary-label">Billable Rate</p>
                <p className="billing-summary-value">
                  {summary.billablePercentage.toFixed(0)}%
                </p>
                <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8, margin: 0 }}>
                  {summary.billableHours.toFixed(1)}h / {summary.nonBillableHours.toFixed(1)}h
                </p>
              </div>
              <div className="billing-summary-icon">
                <PieChart size={40} />
              </div>
            </div>
          </div>

          {/* Lost Revenue Alert */}
          {summary.potentialRevenue > 0 && (
            <div className="billing-alert" style={{ 
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderColor: '#f59e0b',
              marginBottom: '24px'
            }}>
              <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <h4 className="billing-alert-title" style={{ color: '#92400e' }}>
                  💰 Potential Lost Revenue
                </h4>
                <p className="billing-alert-message" style={{ color: '#78350f' }}>
                  You have <strong>{summary.hoursWithoutRate.toFixed(2)} hours</strong> without rates assigned. 
                  At your average rate, that's approximately <strong>${summary.potentialRevenue.toFixed(2)}</strong> in unbilled time.
                </p>
              </div>
            </div>
          )}

          {/* Project Breakdown Chart */}
          {projectBreakdown.length > 0 && (
            <div className="billing-section">
              <h3 className="billing-section-title">
                <BarChart3 size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                Revenue by Project
              </h3>
              <div className="billing-chart-container">
                {projectBreakdown.map((project, index) => {
                  const percentage = summary.totalAmount > 0 ? (project.amount / summary.totalAmount) * 100 : 0;
                  return (
                    <div key={index} className="billing-chart-item">
                      <div className="billing-chart-label">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div 
                            className="billing-chart-color" 
                            style={{ background: project.color }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                            {project.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {project.hours.toFixed(1)}h
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>
                            ${project.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="billing-chart-bar">
                        <div 
                          className="billing-chart-fill"
                          style={{ 
                            width: `${percentage}%`,
                            background: project.color 
                          }}
                        >
                          <span className="billing-chart-percentage">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Breakdown */}
          <div className="billing-section">
            <h3 className="billing-section-title">
              User Breakdown
            </h3>
            <div className="billing-table-container">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="align-right">Hours</th>
                    <th className="align-right">Avg Rate</th>
                    <th className="align-right">Total</th>
                    <th className="align-center">No Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {userSummaries.map((user) => (
                    <tr key={user.userId}>
                      <td>
                        <div className="billing-user-info">
                          <div className="billing-user-name">
                            {user.fullName || 'No name'}
                          </div>
                          <div className="billing-user-email">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="align-right">
                        {user.totalHours.toFixed(2)}
                      </td>
                      <td className="align-right">
                        {user.currency} {user.averageRate.toFixed(2)}
                      </td>
                      <td className="align-right" style={{ fontWeight: 600 }}>
                        {user.currency} {user.totalAmount.toFixed(2)}
                      </td>
                      <td className="align-center">
                        {user.entriesWithoutRate > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedUser(user.userId);
                              setShowMissingRates(true);
                            }}
                            className="billing-badge warning clickable"
                            style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
                            title="Click to view entries without rates"
                          >
                            <span className="billing-badge warning">
                              {user.entriesWithoutRate}
                            </span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Entries Without Rates Alert */}
          {summary.entriesWithoutRate > 0 && (
            <div className="billing-alert warning">
              <AlertCircle size={20} />
              <div style={{ flex: 1 }}>
                <h4 className="billing-alert-title">
                  Missing Rates Warning
                </h4>
                <p className="billing-alert-message">
                  {summary.entriesWithoutRate} time {summary.entriesWithoutRate === 1 ? 'entry' : 'entries'} without billable rates.
                  Set rates in Project Team Management to calculate accurate billing amounts.
                </p>
                <button
                  onClick={() => setShowMissingRates(true)}
                  className="billing-button billing-button-primary"
                  style={{ marginTop: '12px', fontSize: '13px', padding: '8px 16px' }}
                >
                  View Missing Rates
                </button>
              </div>
            </div>
          )}

          {/* View All Entries Button */}
          <div style={{ textAlign: 'center', paddingTop: '16px' }}>
            <button
              onClick={() => setShowAllEntries(true)}
              className="billing-button billing-button-primary"
            >
              <Clock size={16} />
              View All Time Entries
            </button>
          </div>
        </div>

        {/* All Entries Modal */}
        {showAllEntries && (
          <div className="billing-entries-modal">
            <div className="billing-entries-content">
              <div className="billing-modal-header">
                <h3>All Time Entries ({filteredEntries.length})</h3>
                <button onClick={() => setShowAllEntries(false)} className="billing-close-button">
                  <X size={20} />
                </button>
              </div>
              <div className="billing-entries-list">
                {filteredEntries.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No time entries found for the selected filters.
                  </p>
                ) : (
                  <div className="billing-table-container">
                    <table className="billing-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>User</th>
                          <th>Project</th>
                          <th>Organization</th>
                          <th>Description</th>
                          <th className="align-right">Hours</th>
                          <th className="align-right">Rate</th>
                          <th className="align-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {new Date(entry.start_time).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="billing-user-info">
                                <div className="billing-user-name">{entry.full_name || 'N/A'}</div>
                                <div className="billing-user-email">{entry.email}</div>
                              </div>
                            </td>
                            <td>{entry.project_name || 'N/A'}</td>
                            <td>{entry.organization_name || 'N/A'}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {entry.description || '-'}
                            </td>
                            <td className="align-right">{entry.hours.toFixed(2)}</td>
                            <td className="align-right">
                              {entry.hourly_rate !== null ? (
                                `${entry.currency} ${entry.hourly_rate.toFixed(2)}`
                              ) : (
                                <span className="billing-badge warning">No Rate</span>
                              )}
                            </td>
                            <td className="align-right" style={{ fontWeight: 600 }}>
                              {entry.currency} {entry.billable_amount?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Missing Rates Modal */}
        {showMissingRates && (
          <div className="billing-entries-modal">
            <div className="billing-entries-content">
              <div className="billing-modal-header">
                <div>
                  <h3>Entries Without Rates ({filteredEntries.filter(e => e.hourly_rate === null).length})</h3>
                  {selectedUser && (
                    <p style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
                      Filtered by user
                      <button
                        onClick={() => {
                          setSelectedUser('');
                          setShowMissingRates(false);
                        }}
                        style={{
                          marginLeft: '8px',
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          borderRadius: '4px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Clear Filter
                      </button>
                    </p>
                  )}
                </div>
                <button onClick={() => {
                  setShowMissingRates(false);
                  if (selectedUser) setSelectedUser('');
                }} className="billing-close-button">
                  <X size={20} />
                </button>
              </div>
              <div className="billing-entries-list">
                {filteredEntries.filter(e => e.hourly_rate === null).length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    All entries have rates assigned!
                  </p>
                ) : (
                  <div className="billing-table-container">
                    <table className="billing-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>User</th>
                          <th>Project</th>
                          <th>Organization</th>
                          <th>Description</th>
                          <th className="align-right">Hours</th>
                          <th>Rate Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.filter(e => e.hourly_rate === null).map((entry) => (
                          <tr key={entry.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {new Date(entry.start_time).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="billing-user-info">
                                <div className="billing-user-name">{entry.full_name || 'N/A'}</div>
                                <div className="billing-user-email">{entry.email}</div>
                              </div>
                            </td>
                            <td>{entry.project_name || 'N/A'}</td>
                            <td>{entry.organization_name || 'N/A'}</td>
                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {entry.description || '-'}
                            </td>
                            <td className="align-right">{entry.hours.toFixed(2)}</td>
                            <td>
                              <span className="billing-badge warning">
                                {entry.rate_source || 'No rate set'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoice && (
          <div className="billing-entries-modal">
            <div className="billing-entries-content" style={{ maxWidth: '960px' }}>
              <div className="billing-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
                <h3>Invoice</h3>
                <button onClick={() => setShowInvoice(false)} className="billing-close-button">
                  <X size={20} />
                </button>
              </div>
              <div className="billing-invoice-content">

                {/* Invoice Header */}
                <div className="billing-invoice-header">
                  <div>
                    <h1 style={{ margin: 0, fontSize: '32px', color: 'var(--text-color)' }}>INVOICE</h1>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
                      Invoice Date: {new Date().toLocaleDateString()}
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      Period: {startDate} to {endDate}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Due</p>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '40px', color: '#10b981', fontWeight: 800 }}>
                      ${invoiceTotal.toFixed(2)}
                    </h2>
                  </div>
                </div>

                {/* Recipient */}
                <div className="billing-invoice-section">
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                    Bill To
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Recipient Name</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={e => setRecipientName(e.target.value)}
                        placeholder="Friend's name"
                        className="billing-input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Recipient Email</label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="billing-input"
                      />
                    </div>
                  </div>
                  {(selectedProject || selectedOrg) && (
                    <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {selectedProject && projects.find(p => p.id === selectedProject)?.name}
                      {selectedOrg && organizations.find(o => o.id === selectedOrg) && ` · ${organizations.find(o => o.id === selectedOrg)?.name}`}
                    </p>
                  )}
                </div>

                {/* Time Entries Summary */}
                <div className="billing-invoice-section">
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                    Services
                  </h3>
                  <table className="billing-invoice-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Hours</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSummaries.map((user) => (
                        <tr key={user.userId}>
                          <td>
                            <strong>{user.fullName || 'Team Member'}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{user.totalHours.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {user.averageRate > 0 ? `${user.currency} ${user.averageRate.toFixed(2)}/hr` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {user.currency} {user.totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Additional Line Items */}
                <div className="billing-invoice-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                      Additional Line Items
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={addDiscountItem} className="billing-button billing-button-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        <DollarSign size={13} /> Add Discount
                      </button>
                      <button onClick={addLineItem} className="billing-button billing-button-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        <Plus size={13} /> Add Line Item
                      </button>
                    </div>
                  </div>

                  {invoiceLineItems.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                      No additional line items. Use "Add Discount" to apply a friend discount.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {invoiceLineItems.map(item => (
                        <div key={item.id} className="invoice-line-item-row">
                          <input
                            type="text"
                            value={item.description}
                            onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                            placeholder="Description (e.g. Friend discount)"
                            className="billing-input"
                            style={{ flex: 1 }}
                          />
                          <div style={{ position: 'relative', width: '140px' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '14px' }}>$</span>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={e => updateLineItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              step="0.01"
                              className="billing-input"
                              style={{ paddingLeft: '24px', width: '100%' }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', color: item.amount < 0 ? '#ef4444' : item.amount > 0 ? '#10b981' : 'var(--text-secondary)', minWidth: '80px', textAlign: 'right', fontWeight: 600 }}>
                            {item.amount < 0 ? '-' : item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
                          </span>
                          <button onClick={() => removeLineItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="billing-invoice-section">
                  <table className="billing-invoice-table">
                    <tbody>
                      {invoiceLineItems.length > 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '14px', padding: '8px' }}>Subtotal:</td>
                          <td style={{ textAlign: 'right', padding: '8px', color: 'var(--text-secondary)' }}>${summary.totalAmount.toFixed(2)}</td>
                        </tr>
                      )}
                      {invoiceLineItems.map(item => item.description && (
                        <tr key={item.id}>
                          <td colSpan={3} style={{ textAlign: 'right', color: item.amount < 0 ? '#ef4444' : 'var(--text-color)', fontSize: '14px', padding: '8px' }}>{item.description}:</td>
                          <td style={{ textAlign: 'right', padding: '8px', color: item.amount < 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                            {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, fontSize: '18px', padding: '16px 8px' }}>
                          Total Due:
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '22px', color: '#10b981', padding: '16px 8px' }}>
                          ${invoiceTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Note */}
                <div className="billing-invoice-section">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Note / Memo (optional)
                  </label>
                  <textarea
                    value={invoiceNote}
                    onChange={e => setInvoiceNote(e.target.value)}
                    placeholder="e.g. Thanks for being an awesome friend! Payment due within 30 days."
                    rows={2}
                    className="billing-input"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => window.print()}
                    className="billing-button billing-button-secondary"
                    style={{ minWidth: '160px' }}
                  >
                    🖨️ Print / Save PDF
                  </button>

                  <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={e => { setRecipientEmail(e.target.value); setEmailStatus('idle'); }}
                        placeholder="Send to email..."
                        className="billing-input"
                        style={{ paddingLeft: '32px', width: '100%' }}
                      />
                    </div>
                    <button
                      onClick={sendInvoice}
                      disabled={!recipientEmail || emailStatus === 'sending' || emailStatus === 'sent'}
                      className="billing-button billing-button-primary"
                      style={{ minWidth: '160px', opacity: (!recipientEmail || emailStatus === 'sending' || emailStatus === 'sent') ? 0.6 : 1 }}
                    >
                      {emailStatus === 'sending' ? (
                        <><div className="billing-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Sending…</>
                      ) : emailStatus === 'sent' ? (
                        '✓ Invoice Sent!'
                      ) : (
                        <><Send size={15} /> Send Invoice</>
                      )}
                    </button>
                  </div>
                </div>
                {emailStatus === 'error' && (
                  <p style={{ marginTop: '8px', fontSize: '13px', color: '#ef4444' }}>
                    <AlertCircle size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {emailError}
                  </p>
                )}
                {emailStatus === 'sent' && (
                  <p style={{ marginTop: '8px', fontSize: '13px', color: '#10b981' }}>
                    Invoice emailed to {recipientEmail}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );

  if (asPage) {
    return (
      <div className="billing-page">
        <div className="billing-page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DollarSign size={22} />
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Billing</h2>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.75 }}>{startDate} — {endDate}</p>
            </div>
          </div>
        </div>

        {/* Project Quick-Select */}
        {projects.length > 0 && (
          <div className="billing-project-strip">
            <button
              className={`billing-project-chip ${!selectedProject ? 'active' : ''}`}
              onClick={() => setSelectedProject('')}
            >
              All Projects
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                className={`billing-project-chip ${selectedProject === p.id ? 'active' : ''}`}
                onClick={() => setSelectedProject(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {pageContent}
      </div>
    );
  }

  return (
    <div className="billing-modal-overlay">
      <div className="billing-modal">
        <div className="billing-modal-header">
          <div>
            <h2><DollarSign size={24} /> Billing Report</h2>
            <p className="billing-modal-subtitle">{startDate} to {endDate}</p>
          </div>
          <button onClick={onClose} className="billing-close-button"><X size={20} /></button>
        </div>
        {pageContent}
        <div className="billing-modal-footer">
          <button onClick={onClose} className="billing-button billing-button-secondary" style={{ width: '100%' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
