import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry, Project, BillableTimeEntry } from '../types';
import { ProjectBillingReport } from './ProjectBillingReport';
import './Dashboard.css';

interface TagStats {
  tag: string;
  entries: number;
  duration: number;
  percentage: number;
}

interface ProjectStats {
  project: Project;
  entries: number;
  duration: number;
  percentage: number;
  averagePerEntry: number;
}

interface DailyStats {
  date: string;
  entries: number;
  duration: number;
}

export const Dashboard = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'overview' | 'projects' | 'tags' | 'daily' | 'billing' | 'export'>('overview');

  // Billing state
  const [billableEntries, setBillableEntries] = useState<BillableTimeEntry[]>([]);
  const [showBillingReport, setShowBillingReport] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchProjects();
    fetchBillableEntries();
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false });
    setEntries(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    setProjects(data || []);
  };

  const fetchBillableEntries = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('billable_time_entries')
      .select('*')
      .gte('start_time', today.toISOString())
      .order('start_time', { ascending: false });
    setBillableEntries(data || []);
  };

  const filteredEntries = entries.filter((e) => {
    if (!e.end_time) return false; // Only completed entries
    
    const matchesProject = !filterProject || e.project_id === filterProject;
    const matchesTag = !filterTag || (e.tags && e.tags.toLowerCase().includes(filterTag.toLowerCase()));
    
    let matchesDate = true;
    if (startDate || endDate) {
      const entryDate = new Date(e.start_time);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (entryDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (entryDate > end) matchesDate = false;
      }
    }
    
    return matchesProject && matchesTag && matchesDate;
  });

  // Calculate overall stats
  const totalDuration = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalEntries = filteredEntries.length;
  const averageDuration = totalEntries > 0 ? totalDuration / totalEntries : 0;
  
  // Get unique dates
  const uniqueDates = new Set(filteredEntries.map(e => 
    new Date(e.start_time).toLocaleDateString()
  ));
  const daysTracked = uniqueDates.size;
  const averagePerDay = daysTracked > 0 ? totalDuration / daysTracked : 0;

  // Calculate project stats
  const projectStats: ProjectStats[] = projects
    .map(project => {
      const projectEntries = filteredEntries.filter(e => e.project_id === project.id);
      const projectDuration = projectEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      return {
        project,
        entries: projectEntries.length,
        duration: projectDuration,
        percentage: totalDuration > 0 ? (projectDuration / totalDuration) * 100 : 0,
        averagePerEntry: projectEntries.length > 0 ? projectDuration / projectEntries.length : 0,
      };
    })
    .filter(stat => stat.entries > 0)
    .sort((a, b) => b.duration - a.duration);

  // Calculate tag stats
  const tagStatsMap = new Map<string, { entries: number; duration: number }>();
  filteredEntries.forEach(entry => {
    if (entry.tags) {
      entry.tags.split(',').forEach(tag => {
        const trimmedTag = tag.trim();
        if (trimmedTag) {
          const existing = tagStatsMap.get(trimmedTag) || { entries: 0, duration: 0 };
          tagStatsMap.set(trimmedTag, {
            entries: existing.entries + 1,
            duration: existing.duration + (entry.duration || 0),
          });
        }
      });
    }
  });

  const tagStats: TagStats[] = Array.from(tagStatsMap.entries())
    .map(([tag, stats]) => ({
      tag,
      entries: stats.entries,
      duration: stats.duration,
      percentage: totalDuration > 0 ? (stats.duration / totalDuration) * 100 : 0,
    }))
    .sort((a, b) => b.duration - a.duration);

  // Calculate daily stats
  const dailyStatsMap = new Map<string, { entries: number; duration: number }>();
  filteredEntries.forEach(entry => {
    const date = new Date(entry.start_time).toLocaleDateString();
    const existing = dailyStatsMap.get(date) || { entries: 0, duration: 0 };
    dailyStatsMap.set(date, {
      entries: existing.entries + 1,
      duration: existing.duration + (entry.duration || 0),
    });
  });

  const dailyStats: DailyStats[] = Array.from(dailyStatsMap.entries())
    .map(([date, stats]) => ({
      date,
      entries: stats.entries,
      duration: stats.duration,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate today's billing stats
  const todayBillableHours = billableEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const todayBillableAmount = billableEntries.reduce((sum, e) => sum + (e.billable_amount || 0), 0);
  const todayEntriesWithoutRate = billableEntries.filter(e => e.hourly_rate === null).length;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatTimeDetailed = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Project', 'Tags', 'Start Time', 'End Time', 'Duration (hours)'];
    const rows = filteredEntries.map(entry => [
      new Date(entry.start_time).toLocaleDateString(),
      entry.description,
      projects.find(p => p.id === entry.project_id)?.name || 'No Project',
      entry.tags || '',
      new Date(entry.start_time).toLocaleString(),
      entry.end_time ? new Date(entry.end_time).toLocaleString() : '',
      ((entry.duration || 0) / 3600).toFixed(2),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-tracking-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickDateRange = (range: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (range) {
      case 'today':
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(yesterday.toISOString().split('T')[0]);
        setEndDate(yesterday.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setStartDate(monthAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>📊 Dashboard & Reports</h2>
        <button onClick={exportToCSV} className="export-button" disabled={filteredEntries.length === 0}>
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="dashboard-filters">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Project</label>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Tag</label>
            <input
              type="text"
              placeholder="Filter by tag"
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="quick-filters">
          <button onClick={() => setQuickDateRange('today')}>Today</button>
          <button onClick={() => setQuickDateRange('yesterday')}>Yesterday</button>
          <button onClick={() => setQuickDateRange('week')}>Last 7 Days</button>
          <button onClick={() => setQuickDateRange('month')}>Last 30 Days</button>
          <button onClick={() => setQuickDateRange('all')}>All Time</button>
        </div>
        
        {(filterProject || filterTag || startDate || endDate) && (
          <button 
            onClick={() => {
              setFilterProject('');
              setFilterTag('');
              setStartDate('');
              setEndDate('');
            }}
            className="clear-filters-button"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Report Type Selector */}
      <div className="report-selector">
        <button
          className={reportType === 'overview' ? 'active' : ''}
          onClick={() => setReportType('overview')}
        >
          📊 Overview
        </button>
        <button
          className={reportType === 'projects' ? 'active' : ''}
          onClick={() => setReportType('projects')}
        >
          📁 By Project
        </button>
        <button
          className={reportType === 'tags' ? 'active' : ''}
          onClick={() => setReportType('tags')}
        >
          🏷️ By Tag
        </button>
        <button
          className={reportType === 'daily' ? 'active' : ''}
          onClick={() => setReportType('daily')}
        >
          📅 By Day
        </button>
        <button
          className={reportType === 'billing' ? 'active' : ''}
          onClick={() => setReportType('billing')}
        >
          💰 Billing
        </button>
      </div>

      {/* Overview Report */}
      {reportType === 'overview' && (
        <>
          <div className="dashboard-summary">
            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setReportType('daily')} title="Click to view daily breakdown">
              <div className="summary-icon">⏱️</div>
              <div className="summary-content">
                <div className="summary-label">Total Time</div>
                <div className="summary-value">{formatTime(totalDuration)}</div>
              </div>
            </div>
            
            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setReportType('daily')} title="Click to view all entries">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-label">Total Entries</div>
                <div className="summary-value">{totalEntries}</div>
              </div>
            </div>
            
            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setReportType('daily')} title="Click to view daily breakdown">
              <div className="summary-icon">📅</div>
              <div className="summary-content">
                <div className="summary-label">Days Tracked</div>
                <div className="summary-value">{daysTracked}</div>
              </div>
            </div>

            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setReportType('daily')} title="Click to view daily averages">
              <div className="summary-icon">⏳</div>
              <div className="summary-content">
                <div className="summary-label">Avg Per Day</div>
                <div className="summary-value">{formatTime(Math.round(averagePerDay))}</div>
              </div>
            </div>

            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setReportType('daily')} title="Click to view entry details">
              <div className="summary-icon">📈</div>
              <div className="summary-content">
                <div className="summary-label">Avg Per Entry</div>
                <div className="summary-value">{formatTime(Math.round(averageDuration))}</div>
              </div>
            </div>

            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setReportType('projects')} title="Click to view projects breakdown">
              <div className="summary-icon">📁</div>
              <div className="summary-content">
                <div className="summary-label">Active Projects</div>
                <div className="summary-value">{projectStats.length}</div>
              </div>
            </div>

            <div className="summary-card" style={{ cursor: 'pointer' }} onClick={() => setShowBillingReport(true)} title="Click to open billing report">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <div className="summary-label">Today's Billing</div>
                <div className="summary-value">${todayBillableAmount.toFixed(2)}</div>
                <div className="summary-sublabel">{todayBillableHours.toFixed(2)} hrs</div>
              </div>
            </div>
          </div>

          {/* Billing Alert */}
          {todayEntriesWithoutRate > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              color: '#856404'
            }}>
              <strong>⚠️ Missing Rates:</strong> {todayEntriesWithoutRate} time {todayEntriesWithoutRate === 1 ? 'entry' : 'entries'} from today without billable rates.
              <button
                onClick={() => setShowBillingReport(true)}
                style={{
                  marginLeft: '10px',
                  padding: '4px 12px',
                  backgroundColor: '#ffc107',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                View Billing Report
              </button>
            </div>
          )}

          {/* Top Projects Preview */}
          {projectStats.length > 0 && (
            <div className="preview-section">
              <h3>Top Projects</h3>
              <div className="preview-list">
                {projectStats.slice(0, 5).map(stat => (
                  <div key={stat.project.id} className="preview-item">
                    <div className="preview-info">
                      <span className="preview-name">{stat.project.name}</span>
                      <span className="preview-time">{formatTime(stat.duration)}</span>
                    </div>
                    <div className="preview-bar">
                      <div 
                        className="preview-bar-fill" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <span className="preview-percentage">{stat.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Tags Preview */}
          {tagStats.length > 0 && (
            <div className="preview-section">
              <h3>Top Tags</h3>
              <div className="preview-list">
                {tagStats.slice(0, 5).map(stat => (
                  <div key={stat.tag} className="preview-item">
                    <div className="preview-info">
                      <span className="preview-name">{stat.tag}</span>
                      <span className="preview-time">{formatTime(stat.duration)}</span>
                    </div>
                    <div className="preview-bar">
                      <div 
                        className="preview-bar-fill" 
                        style={{ width: `${stat.percentage}%` }}
                      ></div>
                    </div>
                    <span className="preview-percentage">{stat.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Projects Report */}
      {reportType === 'projects' && (
        <div className="report-section">
          <h3>Time by Project</h3>
          {projectStats.length === 0 ? (
            <p className="no-data">No project data for selected filters</p>
          ) : (
            <div className="stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Entries</th>
                    <th>Total Time</th>
                    <th>Avg Per Entry</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projectStats.map(stat => (
                    <tr key={stat.project.id}>
                      <td className="project-name">{stat.project.name}</td>
                      <td>{stat.entries}</td>
                      <td className="time-cell">{formatTimeDetailed(stat.duration)}</td>
                      <td>{formatTime(Math.round(stat.averagePerEntry))}</td>
                      <td>
                        <div className="percentage-cell">
                          <span>{stat.percentage.toFixed(1)}%</span>
                          <div className="mini-bar">
                            <div 
                              className="mini-bar-fill" 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tags Report */}
      {reportType === 'tags' && (
        <div className="report-section">
          <h3>Time by Tag</h3>
          {tagStats.length === 0 ? (
            <p className="no-data">No tag data for selected filters</p>
          ) : (
            <div className="stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Entries</th>
                    <th>Total Time</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tagStats.map(stat => (
                    <tr key={stat.tag}>
                      <td className="tag-name">
                        <span className="tag-badge">{stat.tag}</span>
                      </td>
                      <td>{stat.entries}</td>
                      <td className="time-cell">{formatTimeDetailed(stat.duration)}</td>
                      <td>
                        <div className="percentage-cell">
                          <span>{stat.percentage.toFixed(1)}%</span>
                          <div className="mini-bar">
                            <div 
                              className="mini-bar-fill" 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Daily Report */}
      {reportType === 'daily' && (
        <div className="report-section">
          <h3>Time by Day</h3>
          {dailyStats.length === 0 ? (
            <p className="no-data">No daily data for selected filters</p>
          ) : (
            <div className="stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entries</th>
                    <th>Total Time</th>
                    <th>Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map(stat => (
                    <tr key={stat.date}>
                      <td className="date-cell">{stat.date}</td>
                      <td>{stat.entries}</td>
                      <td className="time-cell">{formatTimeDetailed(stat.duration)}</td>
                      <td>
                        <div className="daily-bar">
                          <div
                            className="daily-bar-fill"
                            style={{
                              width: `${(stat.duration / Math.max(...dailyStats.map(s => s.duration))) * 100}%`
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Billing Report */}
      {reportType === 'billing' && (
        <div className="report-section">
          <h3>Billing Overview</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#e8f4f8',
              borderRadius: '8px',
              border: '1px solid #b8dae6'
            }}>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Today's Hours</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0066cc' }}>
                {todayBillableHours.toFixed(2)}
              </div>
            </div>
            <div style={{
              padding: '20px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              border: '1px solid #a5d6a7'
            }}>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Today's Amount</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>
                ${todayBillableAmount.toFixed(2)}
              </div>
            </div>
            <div style={{
              padding: '20px',
              backgroundColor: todayEntriesWithoutRate > 0 ? '#fff3e0' : '#e8f5e9',
              borderRadius: '8px',
              border: todayEntriesWithoutRate > 0 ? '1px solid #ffb74d' : '1px solid #a5d6a7'
            }}>
              <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>Entries Without Rate</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: todayEntriesWithoutRate > 0 ? '#f57c00' : '#2e7d32' }}>
                {todayEntriesWithoutRate}
              </div>
            </div>
          </div>

          <div style={{
            padding: '24px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h4 style={{ marginBottom: '16px' }}>Full Billing Report</h4>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              View detailed billing reports with date range filters, user breakdowns, and export options.
            </p>
            <button
              onClick={() => setShowBillingReport(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Open Billing Report
            </button>
          </div>

          {todayEntriesWithoutRate > 0 && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              color: '#856404'
            }}>
              <h4 style={{ marginTop: 0 }}>⚠️ Action Required</h4>
              <p>
                {todayEntriesWithoutRate} time {todayEntriesWithoutRate === 1 ? 'entry' : 'entries'} from today {todayEntriesWithoutRate === 1 ? 'is' : 'are'} missing billable rates.
                Set rates in Project Team Management to ensure accurate billing calculations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Billing Report Modal */}
      {showBillingReport && (
        <ProjectBillingReport 
          onClose={() => setShowBillingReport(false)}
          initialProjectId={filterProject}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      )}
    </div>
  );
};
