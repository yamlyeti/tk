import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Goals.css';

interface GoalSettings {
  dailyGoal: number; // in seconds
  weeklyGoal: number; // in seconds
}

export function Goals() {
  const [goals, setGoals] = useState<GoalSettings>({ dailyGoal: 28800, weeklyGoal: 144000 }); // 8h, 40h
  const [todayTime, setTodayTime] = useState(0);
  const [weekTime, setWeekTime] = useState(0);
  const [editing, setEditing] = useState(false);
  const [dailyHours, setDailyHours] = useState(8);
  const [weeklyHours, setWeeklyHours] = useState(40);

  useEffect(() => {
    loadGoals();
    calculateProgress();
  }, []);

  const loadGoals = () => {
    const saved = localStorage.getItem('timeGoals');
    if (saved) {
      const parsed = JSON.parse(saved);
      setGoals(parsed);
      setDailyHours(parsed.dailyGoal / 3600);
      setWeeklyHours(parsed.weeklyGoal / 3600);
    }
  };

  const calculateProgress = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekStartISO = weekStart.toISOString();

    // Get today's entries
    const { data: todayEntries } = await supabase
      .from('time_entries')
      .select('duration')
      .gte('start_time', todayStart)
      .not('duration', 'is', null);

    const todayTotal = todayEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
    setTodayTime(todayTotal);

    // Get this week's entries
    const { data: weekEntries } = await supabase
      .from('time_entries')
      .select('duration')
      .gte('start_time', weekStartISO)
      .not('duration', 'is', null);

    const weekTotal = weekEntries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0;
    setWeekTime(weekTotal);
  };

  const saveGoals = () => {
    const newGoals = {
      dailyGoal: dailyHours * 3600,
      weeklyGoal: weeklyHours * 3600,
    };
    setGoals(newGoals);
    localStorage.setItem('timeGoals', JSON.stringify(newGoals));
    setEditing(false);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const dailyProgress = (todayTime / goals.dailyGoal) * 100;
  const weeklyProgress = (weekTime / goals.weeklyGoal) * 100;

  const getDailyMessage = () => {
    const remaining = goals.dailyGoal - todayTime;
    if (dailyProgress >= 100) return "🎉 Daily goal achieved! Great work!";
    if (dailyProgress >= 75) return `🔥 Almost there! ${formatTime(remaining)} to go!`;
    if (dailyProgress >= 50) return `💪 Keep going! ${formatTime(remaining)} remaining`;
    if (dailyProgress >= 25) return `🎯 You're on track! ${formatTime(remaining)} to go`;
    return `📊 Goal: ${formatTime(goals.dailyGoal)}`;
  };

  const getWeeklyMessage = () => {
    const remaining = goals.weeklyGoal - weekTime;
    if (weeklyProgress >= 100) return "🏆 Weekly goal crushed!";
    if (weeklyProgress >= 75) return `🚀 Great week! ${formatTime(remaining)} to go!`;
    return `📅 Weekly progress: ${weeklyProgress.toFixed(0)}%`;
  };

  return (
    <div className="goals-container">
      <div className="goal-card">
        <div className="drag-handle">⋮⋮</div>
        <div className="goal-header">
          <h3>🎯 Today's Goal</h3>
          <button onClick={() => setEditing(!editing)} className="edit-goals-btn">
            {editing ? '✕' : '⚙️'}
          </button>
        </div>

        {editing ? (
          <div className="goals-editor">
            <div className="goal-input-group">
              <label>Daily Goal (hours)</label>
              <input
                type="number"
                min="1"
                max="24"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
              />
            </div>
            <div className="goal-input-group">
              <label>Weekly Goal (hours)</label>
              <input
                type="number"
                min="1"
                max="168"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
              />
            </div>
            <button onClick={saveGoals} className="save-goals-btn">
              💾 Save Goals
            </button>
          </div>
        ) : (
          <>
            <div className="goal-progress">
              <div className="goal-stats">
                <span className="goal-current">{formatTime(todayTime)}</span>
                <span className="goal-separator">/</span>
                <span className="goal-target">{formatTime(goals.dailyGoal)}</span>
                <span className="goal-percentage">({dailyProgress.toFixed(0)}%)</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill daily"
                  style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                ></div>
              </div>
              <div className="goal-message">{getDailyMessage()}</div>
            </div>

            <div className="goal-progress weekly">
              <h4>📅 This Week</h4>
              <div className="goal-stats">
                <span className="goal-current">{formatTime(weekTime)}</span>
                <span className="goal-separator">/</span>
                <span className="goal-target">{formatTime(goals.weeklyGoal)}</span>
                <span className="goal-percentage">({weeklyProgress.toFixed(0)}%)</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill weekly"
                  style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
                ></div>
              </div>
              <div className="goal-message">{getWeeklyMessage()}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
