import { useEffect, useState } from 'react';

interface NotificationSettings {
  enabled: boolean;
  milestones: number[]; // in minutes
  reminderInterval: number; // in minutes
  sound: boolean;
}

interface TimerNotificationsProps {
  isTimerActive: boolean;
  elapsedSeconds: number;
}

export function useTimerNotifications({ isTimerActive, elapsedSeconds }: TimerNotificationsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    milestones: [30, 60, 120, 240], // 30min, 1hr, 2hr, 4hr
    reminderInterval: 60, // remind every hour
    sound: true,
  });
  
  const [notifiedMilestones, setNotifiedMilestones] = useState<Set<number>>(new Set());
  const [lastReminder, setLastReminder] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('timerNotifications');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!isTimerActive || !settings.enabled) {
      setNotifiedMilestones(new Set());
      setLastReminder(0);
      return;
    }

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Check milestones
    settings.milestones.forEach((milestone) => {
      if (elapsedMinutes >= milestone && !notifiedMilestones.has(milestone)) {
        sendNotification(
          'Timer Milestone! ⏱️',
          `You've been working for ${formatDuration(milestone)}!`,
          'milestone'
        );
        setNotifiedMilestones((prev) => new Set(prev).add(milestone));
      }
    });

    // Check reminder interval
    if (
      settings.reminderInterval > 0 &&
      elapsedMinutes > 0 &&
      elapsedMinutes % settings.reminderInterval === 0 &&
      elapsedMinutes !== lastReminder
    ) {
      sendNotification(
        'Timer Still Running ⏰',
        `Current time: ${formatDuration(elapsedMinutes)}. Don't forget to stop when done!`,
        'reminder'
      );
      setLastReminder(elapsedMinutes);
    }
  }, [isTimerActive, elapsedSeconds, settings.enabled, settings.milestones, settings.reminderInterval, settings.sound]);

  const sendNotification = (title: string, body: string, type: 'milestone' | 'reminder') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `timer-${type}`,
        requireInteraction: false,
      });

      // Play sound if enabled
      if (settings.sound) {
        playNotificationSound();
      }

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  };

  const playNotificationSound = () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const updateSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem('timerNotifications', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings,
  };
}
