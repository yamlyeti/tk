import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, TimeEntry } from '../types';
import './CommandPalette.css';

export type View = 'tracker' | 'projects' | 'dashboard' | 'users' | 'profile' | 'approvals' | 'organizations' | 'billing' | 'issues' | 'invoices';

interface CommandPaletteProps {
  projects: Project[];
  onNavigate: (view: View, focus?: { entryId?: string; projectId?: string }) => void;
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'tracker', label: '⏱️ Time Tracker' },
  { id: 'projects', label: '📁 Projects' },
  { id: 'organizations', label: '🏢 Organizations' },
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'users', label: '👥 Users' },
  { id: 'approvals', label: '✅ Approvals' },
  { id: 'profile', label: '👤 Profile' },
  { id: 'issues', label: '🎫 Issues' },
  { id: 'invoices', label: '🧾 Invoices' },
  { id: 'billing', label: '💰 Billing' },
];

type Item =
  | { kind: 'view'; id: View; label: string }
  | { kind: 'project'; id: string; label: string }
  | { kind: 'entry'; id: string; label: string; sublabel: string };

export function CommandPalette({ projects, onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    supabase
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(50)
      .then(({ data }) => setEntries(data || []));
  }, [open]);

  const q = query.trim().toLowerCase();

  const matchedViews = q ? VIEWS.filter((v) => v.label.toLowerCase().includes(q)) : VIEWS;
  const matchedProjects = q ? projects.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6) : [];
  const matchedEntries = q
    ? entries
        .filter((e) => e.description.toLowerCase().includes(q) || (e.tags && e.tags.toLowerCase().includes(q)))
        .slice(0, 6)
    : [];

  const items: Item[] = [
    ...matchedViews.map((v) => ({ kind: 'view' as const, id: v.id, label: v.label })),
    ...matchedProjects.map((p) => ({ kind: 'project' as const, id: p.id, label: `📁 ${p.name}` })),
    ...matchedEntries.map((e) => ({
      kind: 'entry' as const,
      id: e.id,
      label: e.description,
      sublabel: [e.tags, new Date(e.start_time).toLocaleDateString()].filter(Boolean).join(' · '),
    })),
  ];

  const select = (item: Item) => {
    if (item.kind === 'view') onNavigate(item.id);
    else if (item.kind === 'project') onNavigate('dashboard', { projectId: item.id });
    else onNavigate('tracker', { entryId: item.id });
    setOpen(false);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[activeIndex]) select(items[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk-modal" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cmdk-input"
          placeholder="Jump to a view, project, or entry…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
        />
        <div className="cmdk-list">
          {items.length === 0 && <div className="cmdk-empty">No matches</div>}
          {items.map((item, index) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className={`cmdk-item ${index === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(item)}
            >
              <span className="cmdk-item-label">{item.label}</span>
              {item.kind === 'entry' && <span className="cmdk-item-sublabel">{item.sublabel}</span>}
            </button>
          ))}
        </div>
        <div className="cmdk-footer">
          <span>
            <kbd>↑↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> select
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
