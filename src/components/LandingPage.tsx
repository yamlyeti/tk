import './LandingPage.css';

type LandingPageProps = {
  onSignIn: () => void;
};

const FEATURES = [
  {
    icon: '⏱️',
    title: 'Timer that gets it right',
    body: 'Start, stop, pause, and resume — paused time is automatically excluded from the total, however many times you step away.',
  },
  {
    icon: '✏️',
    title: 'Fix it after the fact',
    body: 'Forgot to start the timer? Add a manual entry by duration or time range, or edit start/end on anything already logged.',
  },
  {
    icon: '🏷️',
    title: 'Tags that learn',
    body: 'Autocomplete suggests tags from what you’ve actually used before, so naming stays consistent across entries.',
  },
  {
    icon: '🎯',
    title: 'Goals & Pomodoro',
    body: 'Daily and weekly targets with progress bars, plus a built-in Pomodoro timer — reorder or collapse them to fit your flow.',
  },
  {
    icon: '🏢',
    title: 'Organizations & teams',
    body: 'Group projects under an organization with owner/admin/member roles, and assign specific people to specific projects.',
  },
  {
    icon: '💰',
    title: 'Billing, built in',
    body: 'Billable vs. non-billable time, per-project rates, an invoice builder with custom line items, and one-click email send.',
  },
  {
    icon: '📊',
    title: 'Reports that hold up',
    body: 'Overview, by project, by tag, by day — quick date filters, CSV export, and a real dashboard, not a spreadsheet dump.',
  },
  {
    icon: '📱',
    title: 'Installable everywhere',
    body: 'Add to home screen on iOS or Android. Works offline as a PWA, black-and-gold icon and all.',
  },
] as const;

function HeroDemo() {
  return (
    <div className="landing-demo" aria-hidden="true">
      <div className="landing-demo__chrome">
        <span className="landing-demo__dot" />
        <span className="landing-demo__dot" />
        <span className="landing-demo__dot landing-demo__dot--gold" />
        <span className="landing-demo__url">tk</span>
      </div>
      <div className="landing-demo__body">
        <aside className="landing-demo__sidebar">
          <div className="landing-demo__logo-row">
            <img src="/tk-icon.svg" alt="" width={20} height={20} style={{ borderRadius: 5 }} />
            <span>tk</span>
          </div>
          <div className="landing-demo__nav landing-demo__nav--active">⏱️ Time Tracker</div>
          <div className="landing-demo__nav">📁 Projects</div>
          <div className="landing-demo__nav">📊 Dashboard</div>
          <div className="landing-demo__nav">💰 Billing</div>
        </aside>
        <div className="landing-demo__main">
          <div className="landing-demo__header">
            <span className="landing-demo__title">Today</span>
            <span className="landing-demo__badge">3h 42m</span>
          </div>
          <div className="landing-demo__quickadd">Client meeting — #Acme @billable</div>
          <ul className="landing-demo__tasks">
            <li className="landing-demo__task landing-demo__task--done">
              <span className="landing-demo__check landing-demo__check--done" />
              <span>Sprint planning</span>
            </li>
            <li className="landing-demo__task landing-demo__task--focus">
              <span className="landing-demo__check" />
              <span>Client meeting</span>
              <span className="landing-demo__chip">running</span>
            </li>
            <li className="landing-demo__task">
              <span className="landing-demo__check" />
              <span>Invoice review</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="landing-demo__shine" />
    </div>
  );
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div className="landing">
      <div className="landing-glow landing-glow--left" />
      <div className="landing-glow landing-glow--right" />
      <div className="landing-glow landing-glow--center" />

      <header className="landing-header">
        <div className="landing-header__brand">
          <img src="/tk-icon.svg" alt="tk" width={36} height={36} style={{ borderRadius: 9 }} />
          <span className="landing-header__wordmark">tk</span>
        </div>
        <button type="button" className="landing-btn landing-btn--ghost" onClick={onSignIn}>
          Sign in
        </button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <p className="landing-eyebrow">Time, tracked.</p>
            <h1 className="landing-hero__title">
              One calm workspace for time, projects, and billing.
            </h1>
            <p className="landing-hero__lead">
              tk keeps your timer, your projects, and your invoices in sync — track it once,
              report on it any way you need, get paid for it without a spreadsheet.
            </p>
            <div className="landing-hero__actions">
              <button type="button" className="landing-btn landing-btn--primary" onClick={onSignIn}>
                Sign in to your workspace
              </button>
              <a className="landing-btn landing-btn--outline" href="#features">
                See what it does
              </a>
            </div>
            <p className="landing-hero__note">
              New here? Request access on the next screen — reviewed before you're in.
            </p>
          </div>
          <HeroDemo />
        </section>

        <section id="features" className="landing-features">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Everything in one place</p>
            <h2>Built for people who bill their time.</h2>
          </div>
          <div className="landing-features__grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-card__icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <img src="/tk-icon.svg" alt="tk" width={56} height={56} className="landing-cta__logo" style={{ borderRadius: 14 }} />
          <h2>Ready to see your workspace?</h2>
          <p>Already have access? Sign in with the email your admin approved.</p>
          <button type="button" className="landing-btn landing-btn--primary landing-btn--lg" onClick={onSignIn}>
            Sign in
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <span>tk — Time, tracked.</span>
        <div className="landing-footer__links">
          <a href="https://github.com/yamlyeti/tk" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
