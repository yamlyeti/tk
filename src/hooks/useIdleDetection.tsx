import { useEffect, useState, useCallback } from 'react';
import './IdleDetection.css';

interface IdleDetectionSettings {
  enabled: boolean;
  idleThresholdMinutes: number; // minutes of inactivity before pausing
}

interface IdleDetectionProps {
  isTimerActive: boolean;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
}

export function useIdleDetection({ isTimerActive, onPauseTimer, onResumeTimer }: IdleDetectionProps) {
  const [settings, setSettings] = useState<IdleDetectionSettings>({
    enabled: true,
    idleThresholdMinutes: 5,
  });
  
  const [isIdle, setIsIdle] = useState(false);
  const [idleStart, setIdleStart] = useState<number | null>(null);
  const [showIdleDialog, setShowIdleDialog] = useState(false);
  const [idleDuration, setIdleDuration] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('idleDetection');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (isIdle && idleStart) {
      // User is back
      const idleTime = Math.floor((Date.now() - idleStart) / 1000);
      setIdleDuration(idleTime);
      setShowIdleDialog(true);
    }
    setIsIdle(false);
    setIdleStart(null);
  }, [isIdle, idleStart]);

  const markAsIdle = useCallback(() => {
    if (!isIdle && isTimerActive && settings.enabled) {
      setIsIdle(true);
      setIdleStart(Date.now());
      onPauseTimer();
    }
  }, [isIdle, isTimerActive, settings.enabled, onPauseTimer]);

  useEffect(() => {
    if (!isTimerActive || !settings.enabled) {
      return;
    }

    let idleTimeout: number;
    const thresholdMs = settings.idleThresholdMinutes * 60 * 1000;

    const handleActivity = () => {
      resetIdleTimer();
      clearTimeout(idleTimeout);
      idleTimeout = window.setTimeout(markAsIdle, thresholdMs);
    };

    // Set initial timeout
    idleTimeout = window.setTimeout(markAsIdle, thresholdMs);

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearTimeout(idleTimeout);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isTimerActive, settings, markAsIdle, resetIdleTimer]);

  const handleKeepTime = () => {
    onResumeTimer();
    setShowIdleDialog(false);
  };

  const handleDiscardTime = () => {
    // Timer is already paused, just close dialog
    setShowIdleDialog(false);
  };

  const updateSettings = (newSettings: IdleDetectionSettings) => {
    setSettings(newSettings);
    localStorage.setItem('idleDetection', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings,
    showIdleDialog,
    idleDuration,
    handleKeepTime,
    handleDiscardTime,
  };
}

interface IdleDialogProps {
  show: boolean;
  idleDuration: number;
  onKeepTime: () => void;
  onDiscardTime: () => void;
}

export function IdleDialog({ show, idleDuration, onKeepTime, onDiscardTime }: IdleDialogProps) {
  if (!show) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="idle-overlay">
      <div className="idle-dialog">
        <div className="idle-icon">😴</div>
        <h2>You Were Idle</h2>
        <p>
          You were inactive for <strong>{formatDuration(idleDuration)}</strong>.
        </p>
        <p>The timer was automatically paused. What would you like to do?</p>
        <div className="idle-actions">
          <button onClick={onKeepTime} className="idle-keep-btn">
            ✓ Keep Time & Resume
          </button>
          <button onClick={onDiscardTime} className="idle-discard-btn">
            ✕ Stay Paused
          </button>
        </div>
        <div className="idle-note">
          Tip: You can adjust idle detection settings in the timer section.
        </div>
      </div>
    </div>
  );
}

export function IdleDetectionSettings() {
  const [settings, setSettings] = useState<IdleDetectionSettings>({
    enabled: true,
    idleThresholdMinutes: 5,
  });

  useEffect(() => {
    const saved = localStorage.getItem('idleDetection');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('idleDetection', JSON.stringify(settings));
  };

  return (
    <div className="idle-detection-settings">
      <h4>😴 Idle Detection</h4>
      
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => {
              const newSettings = { ...settings, enabled: e.target.checked };
              setSettings(newSettings);
              saveSettings();
            }}
          />
          Auto-pause timer when idle
        </label>
      </div>

      {settings.enabled && (
        <div className="setting-row">
          <label>
            Idle threshold (minutes):
            <input
              type="number"
              min="1"
              max="60"
              value={settings.idleThresholdMinutes}
              onChange={(e) => {
                const newSettings = { ...settings, idleThresholdMinutes: Number(e.target.value) };
                setSettings(newSettings);
                saveSettings();
              }}
              style={{ marginLeft: '8px', width: '80px' }}
            />
          </label>
          <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>
            Timer will pause after this many minutes of inactivity
          </small>
        </div>
      )}
    </div>
  );
}
