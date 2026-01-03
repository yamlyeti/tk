import { useState, useEffect } from 'react';
import './PomodoroTimer.css';

interface PomodoroSettings {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  sessionsUntilLongBreak: number;
}

interface PomodoroTimerProps {
  onComplete?: (type: 'work' | 'break') => void;
}

export function PomodoroTimer({ onComplete }: PomodoroTimerProps) {
  const [settings, setSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [currentPhase, setCurrentPhase] = useState<'work' | 'break' | 'longBreak'>('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      setTimeLeft(parsed.workDuration * 60);
    }
  }, []);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handlePhaseComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handlePhaseComplete = () => {
    setIsRunning(false);
    
    // Play notification sound (browser notification)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Complete!', {
        body: currentPhase === 'work' 
          ? 'Time for a break!' 
          : 'Break over! Ready to focus?',
        icon: '/favicon.ico',
      });
    }

    if (onComplete) {
      onComplete(currentPhase === 'work' ? 'work' : 'break');
    }

    if (currentPhase === 'work') {
      setSessionsCompleted((prev) => prev + 1);
      const nextSessions = sessionsCompleted + 1;
      
      if (nextSessions % settings.sessionsUntilLongBreak === 0) {
        setCurrentPhase('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
      } else {
        setCurrentPhase('break');
        setTimeLeft(settings.breakDuration * 60);
      }
    } else {
      setCurrentPhase('work');
      setTimeLeft(settings.workDuration * 60);
    }
  };

  const startTimer = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (currentPhase === 'work') {
      setTimeLeft(settings.workDuration * 60);
    } else if (currentPhase === 'break') {
      setTimeLeft(settings.breakDuration * 60);
    } else {
      setTimeLeft(settings.longBreakDuration * 60);
    }
  };

  const skipPhase = () => {
    setTimeLeft(0);
  };

  const saveSettings = () => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    setTimeLeft(settings.workDuration * 60);
    setCurrentPhase('work');
    setIsRunning(false);
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseEmoji = () => {
    if (currentPhase === 'work') return '💼';
    if (currentPhase === 'longBreak') return '🌟';
    return '☕';
  };

  const getPhaseLabel = () => {
    if (currentPhase === 'work') return 'Focus Time';
    if (currentPhase === 'longBreak') return 'Long Break';
    return 'Short Break';
  };

  const progress = currentPhase === 'work'
    ? ((settings.workDuration * 60 - timeLeft) / (settings.workDuration * 60)) * 100
    : currentPhase === 'break'
    ? ((settings.breakDuration * 60 - timeLeft) / (settings.breakDuration * 60)) * 100
    : ((settings.longBreakDuration * 60 - timeLeft) / (settings.longBreakDuration * 60)) * 100;

  return (
    <div className="pomodoro-container">
      <div className="pomodoro-card">
        <div className="drag-handle">⋮⋮</div>
        <div className="pomodoro-header">
          <h3>🍅 Pomodoro Timer</h3>
          <button onClick={() => setShowSettings(!showSettings)} className="pomodoro-settings-btn">
            {showSettings ? '✕' : '⚙️'}
          </button>
        </div>

        {showSettings ? (
          <div className="pomodoro-settings">
            <div className="setting-group">
              <label>Work Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workDuration}
                onChange={(e) => setSettings({ ...settings, workDuration: Number(e.target.value) })}
              />
            </div>
            <div className="setting-group">
              <label>Short Break (minutes)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.breakDuration}
                onChange={(e) => setSettings({ ...settings, breakDuration: Number(e.target.value) })}
              />
            </div>
            <div className="setting-group">
              <label>Long Break (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakDuration}
                onChange={(e) => setSettings({ ...settings, longBreakDuration: Number(e.target.value) })}
              />
            </div>
            <div className="setting-group">
              <label>Sessions Until Long Break</label>
              <input
                type="number"
                min="2"
                max="10"
                value={settings.sessionsUntilLongBreak}
                onChange={(e) => setSettings({ ...settings, sessionsUntilLongBreak: Number(e.target.value) })}
              />
            </div>
            <button onClick={saveSettings} className="save-pomodoro-btn">
              💾 Save Settings
            </button>
          </div>
        ) : (
          <>
            <div className="pomodoro-display">
              <div className="phase-indicator">
                <span className="phase-emoji">{getPhaseEmoji()}</span>
                <span className="phase-label">{getPhaseLabel()}</span>
              </div>
              
              <div className="pomodoro-time">{formatTime(timeLeft)}</div>
              
              <div className="pomodoro-progress-ring">
                <svg width="200" height="200">
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#f0f0f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke={currentPhase === 'work' ? '#1976d2' : '#4caf50'}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                </svg>
              </div>

              <div className="sessions-counter">
                🍅 {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} completed
              </div>
            </div>

            <div className="pomodoro-controls">
              {!isRunning ? (
                <button onClick={startTimer} className="pomodoro-start">
                  ▶ Start
                </button>
              ) : (
                <button onClick={pauseTimer} className="pomodoro-pause">
                  ⏸ Pause
                </button>
              )}
              <button onClick={resetTimer} className="pomodoro-reset">
                🔄 Reset
              </button>
              <button onClick={skipPhase} className="pomodoro-skip">
                ⏭ Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
