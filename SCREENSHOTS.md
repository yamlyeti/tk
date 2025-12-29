# Application Screenshots

This document shows what the Time Keeping System looks like.

## Login/Signup Screen

```
┌────────────────────────────────────────────────────┐
│                                                    │
│     ╔═══════════════════════════════════════╗    │
│     ║                                       ║    │
│     ║     Time Keeping System              ║    │
│     ║     ────────────────────              ║    │
│     ║              Sign In                  ║    │
│     ║                                       ║    │
│     ║     Email                             ║    │
│     ║     [you@example.com            ]     ║    │
│     ║                                       ║    │
│     ║     Password                          ║    │
│     ║     [••••••••                   ]     ║    │
│     ║                                       ║    │
│     ║           [  Sign In  ]               ║    │
│     ║                                       ║    │
│     ║     Don't have an account? Sign Up    ║    │
│     ║                                       ║    │
│     ╚═══════════════════════════════════════╝    │
│                                                    │
│        (Purple to pink gradient background)       │
└────────────────────────────────────────────────────┘
```

## Main Time Tracker Interface (Desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  Time Keeping System              user@email.com  [Sign Out]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║                                                           ║ │
│  ║  [What are you working on?                    ] [Start]  ║ │
│  ║                                                           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ Time Entries                                              ║ │
│  ║ ────────────                                              ║ │
│  ║                                                           ║ │
│  ║  ┌─────────────────────────────────────────────────────┐ ║ │
│  ║  │ Writing documentation              [Delete]         │ ║ │
│  ║  │ Start: 12/29/2024, 12:00:00 PM                      │ ║ │
│  ║  │ End:   12/29/2024, 12:15:30 PM                      │ ║ │
│  ║  │ Duration: 00:15:30                                  │ ║ │
│  ║  └─────────────────────────────────────────────────────┘ ║ │
│  ║                                                           ║ │
│  ║  ┌─────────────────────────────────────────────────────┐ ║ │
│  ║  │ Code review                        [Delete]         │ ║ │
│  ║  │ Start: 12/29/2024, 11:30:00 AM                      │ ║ │
│  ║  │ End:   12/29/2024, 11:45:00 AM                      │ ║ │
│  ║  │ Duration: 00:15:00                                  │ ║ │
│  ║  └─────────────────────────────────────────────────────┘ ║ │
│  ║                                                           ║ │
│  ║  ┌─────────────────────────────────────────────────────┐ ║ │
│  ║  │ Team meeting                       [Delete]         │ ║ │
│  ║  │ Start: 12/29/2024, 10:00:00 AM                      │ ║ │
│  ║  │ End:   12/29/2024, 11:00:00 AM                      │ ║ │
│  ║  │ Duration: 01:00:00                                  │ ║ │
│  ║  └─────────────────────────────────────────────────────┘ ║ │
│  ║                                                           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Active Timer

```
┌──────────────────────────────────────────────────────────────────┐
│  Time Keeping System              user@email.com  [Sign Out]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║                                                           ║ │
│  ║  [What are you working on?                    ] DISABLED ║ │
│  ║                                                           ║ │
│  ║            00:05:42           [  Stop  ]                  ║ │
│  ║                                                           ║ │
│  ║  Working on: Debugging authentication bug                ║ │
│  ║                                                           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ Time Entries                                              ║ │
│  ║ ────────────                                              ║ │
│  ║  ... (previous entries)                                   ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────────────────┘

Note: Timer updates every second
```

## Mobile View (Responsive)

```
┌───────────────────────┐
│ Time Keeping System   │
│ user@email.com        │
│ [Sign Out]            │
├───────────────────────┤
│                       │
│ ╔═══════════════════╗ │
│ ║                   ║ │
│ ║ [What are you     ║ │
│ ║  working on?  ]   ║ │
│ ║                   ║ │
│ ║   [   Start   ]   ║ │
│ ║                   ║ │
│ ╚═══════════════════╝ │
│                       │
│ ╔═══════════════════╗ │
│ ║ Time Entries      ║ │
│ ║ ────────────      ║ │
│ ║                   ║ │
│ ║ ┌───────────────┐ ║ │
│ ║ │ Task name     │ ║ │
│ ║ │ [Delete]      │ ║ │
│ ║ │ Start: ...    │ ║ │
│ ║ │ End: ...      │ ║ │
│ ║ │ Duration: ... │ ║ │
│ ║ └───────────────┘ ║ │
│ ║                   ║ │
│ ╚═══════════════════╝ │
│                       │
└───────────────────────┘
```

## Error State

```
┌──────────────────────────────────────────────────────────────────┐
│  Time Keeping System              user@email.com  [Sign Out]    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║                                                           ║ │
│  ║  [What are you working on?                    ] [Start]  ║ │
│  ║                                                           ║ │
│  ║  ⚠ Error starting timer. Please make sure the            ║ │
│  ║     database is set up correctly.                    [×] ║ │
│  ║                                                           ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
└──────────────────────────────────────────────────────────────────┘
```

## Color Scheme

- **Background Gradient**: Purple (#667eea) to Pink (#764ba2)
- **Cards**: White (#ffffff) with subtle shadow
- **Primary Buttons**: Purple gradient
- **Stop Button**: Red (#dc3545)
- **Text**: Dark gray (#333) on white backgrounds
- **Success**: Blue (#667eea)
- **Error**: Red border on pink background

## Key UI Features

1. **Clean, Modern Design**: Minimalist interface with focus on functionality
2. **Responsive Layout**: Adapts smoothly from mobile to desktop
3. **Real-time Updates**: Timer counts up every second
4. **Visual Feedback**: Loading states, disabled states, error messages
5. **Accessible**: Clear labels, good contrast, keyboard-friendly
6. **Touch-Friendly**: Large tap targets for mobile users

## To See It Live

Follow the instructions in [TESTING_GUIDE.md](./TESTING_GUIDE.md) to run the application locally.
