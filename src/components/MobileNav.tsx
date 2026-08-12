import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { View } from './CommandPalette';
import './MobileNav.css';

interface MobileNavProps {
  view: View;
  onNavigate: (view: View) => void;
  userEmail?: string;
  onAddTime: () => void;
  onSignOut: () => void;
}

const PRIMARY: { id: View; label: string; icon: ReactNode }[] = [
  {
    id: 'tracker',
    label: 'Tracker',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2M9 2h6" />
      </svg>
    ),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    ),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 20V10M12 20V4M20 20v-6" />
      </svg>
    ),
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 15h3" />
      </svg>
    ),
  },
];

const MENU_VIEWS: { id: View; label: string }[] = [
  { id: 'organizations', label: 'Organizations' },
  { id: 'users', label: 'Users' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'profile', label: 'Profile' },
];

export function MobileNav({ view, onNavigate, userEmail, onAddTime, onSignOut }: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const isMenuViewActive = MENU_VIEWS.some((v) => v.id === view);

  return (
    <>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {PRIMARY.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-nav-item ${isMenuViewActive ? 'active' : ''}`}
          onClick={() => setMenuOpen(true)}
        >
          <span className="mobile-nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </span>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            {userEmail && <div className="mobile-sheet-email">{userEmail}</div>}
            <div className="mobile-sheet-list">
              {MENU_VIEWS.map((v) => (
                <button
                  key={v.id}
                  className={`mobile-sheet-item ${view === v.id ? 'active' : ''}`}
                  onClick={() => {
                    onNavigate(v.id);
                    setMenuOpen(false);
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="mobile-sheet-divider" />
            <div className="mobile-sheet-list">
              <button
                className="mobile-sheet-item"
                onClick={() => {
                  onAddTime();
                  setMenuOpen(false);
                }}
              >
                + Add Time
              </button>
              <button
                className="mobile-sheet-item mobile-sheet-item--danger"
                onClick={() => {
                  onSignOut();
                  setMenuOpen(false);
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
