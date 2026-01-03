import { useEffect, useState } from 'react';
import './KeyboardShortcuts.css';

interface ShortcutHandler {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description: string;
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutHandler[];
}

export function KeyboardShortcuts({ shortcuts }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help with Ctrl+/
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Close help with Escape
      if (e.key === 'Escape' && showHelp) {
        e.preventDefault();
        setShowHelp(false);
        return;
      }

      // Check if we should handle this shortcut
      const shouldHandle = shortcuts.some(shortcut => {
        const keyMatches = shortcut.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || shortcut.ctrlKey === e.ctrlKey;
        const altMatches = shortcut.altKey === undefined || shortcut.altKey === e.altKey;
        return keyMatches && ctrlMatches && altMatches;
      });

      if (!shouldHandle) return;

      // Find and execute the matching shortcut
      shortcuts.forEach(shortcut => {
        const keyMatches = shortcut.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || shortcut.ctrlKey === e.ctrlKey;
        const altMatches = shortcut.altKey === undefined || shortcut.altKey === e.altKey;

        if (keyMatches && ctrlMatches && altMatches) {
          e.preventDefault();
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, showHelp]);

  const formatShortcut = (shortcut: ShortcutHandler) => {
    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    keys.push(shortcut.key.toUpperCase());
    return keys.join('+');
  };

  if (!showHelp) return null;

  return (
    <div className="shortcuts-overlay" onClick={() => setShowHelp(false)}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button onClick={() => setShowHelp(false)} className="shortcuts-close">×</button>
        </div>
        <div className="shortcuts-list">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <kbd className="shortcut-key">{formatShortcut(shortcut)}</kbd>
              <span className="shortcut-description">{shortcut.description}</span>
            </div>
          ))}
          <div className="shortcut-item">
            <kbd className="shortcut-key">Ctrl+/</kbd>
            <span className="shortcut-description">Show This Help</span>
          </div>
          <div className="shortcut-item">
            <kbd className="shortcut-key">Esc</kbd>
            <span className="shortcut-description">Close/Cancel</span>
          </div>
        </div>
        <div className="shortcuts-footer">
          Press <kbd>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
