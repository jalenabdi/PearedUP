import { useMemo, useState } from 'react';
import logo from '../PearedUP-logo.png';

const roleContent = {
  student: {
    heroTitle: 'Drop your syllabus and get paired with people learning the same thing.',
    heroBody:
      'Match by coursework and shared deadlines, train with an AI mentor, and earn smart-score points you can spend on cosmetics.',
    heading: 'College Side',
    subtitle: 'Upload your syllabus, get matched with classmates, and build better study sessions.',
    bullets: [
      'Connect using class materials and shared deadlines',
      'Auto-group students by compatible schedules',
      'Plan in-person or virtual sessions quickly'
    ],
    cta: 'Connect to Your University'
  },
  learner: {
    heroTitle: 'Choose what you want to learn and get paired with people on the same path.',
    heroBody:
      'Match by interests and goals, learn with AI mentoring, and earn smart-score points you can spend on cosmetics.',
    heading: 'Non-Student Side',
    subtitle: 'Learn any topic with personalized guidance and peers who share your interests.',
    bullets: [
      'Create topic tracks tailored to your goals',
      'Join interest-based learning circles',
      'Get AI mentor support with adaptive pacing'
    ],
    cta: 'Start Personalized Plan'
  }
};

const roadmap = [
  'Design wireframe in Figma',
  'Build basic frontend',
  'Add UTD Blackboard authentication',
  'Connect MongoDB + matching backend',
  'Finish frontend with backend context',
  'Ship rewards, cosmetics, and polish'
];

export default function App() {
  const [role, setRole] = useState('student');
  const active = useMemo(() => roleContent[role], [role]);

  return (
    <div className="page-shell">
      <header className="hero">
        <nav className="top-nav">
          <div className="brand">
            <img src={logo} alt="PearedUp logo" className="logo-img" />
            <div>
              <p className="eyebrow">Nebula Labs Presents</p>
              <h1>PearedUp</h1>
            </div>
          </div>
          <button className="ghost-btn">Create Account</button>
        </nav>

        <div className="hero-grid">
          <section>
            <p className="tag">Connect. Study. Level Up.</p>
            <h2>{active.heroTitle}</h2>
            <p className="muted">{active.heroBody}</p>
            <div className="cta-row">
              <button className="primary-btn">Get Started</button>
              <button className="ghost-btn">View Demo Flow</button>
            </div>
          </section>

          <aside className="glass-card">
            <p className="eyebrow">Role Selection</p>
            <div className="role-switch" role="tablist" aria-label="Choose user role">
              <button
                className={role === 'student' ? 'active' : ''}
                onClick={() => setRole('student')}
              >
                Student
              </button>
              <button
                className={role === 'learner' ? 'active' : ''}
                onClick={() => setRole('learner')}
              >
                Non-Student
              </button>
            </div>

            <h3>{active.heading}</h3>
            <p>{active.subtitle}</p>
            <ul>
              {active.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <button className="primary-btn wide">{active.cta}</button>
          </aside>
        </div>
      </header>

      <main className="content">
        <section className="panel-grid">
          <article className="panel">
            <p className="eyebrow">Syllabus Matching</p>
            <h3>Find your exact people</h3>
            <p>
              Users upload course resources, and PearedUp groups people by overlap in classes, topics,
              and study pace.
            </p>
          </article>
          <article className="panel">
            <p className="eyebrow">AI Mentor</p>
            <h3>Guidance without guesswork</h3>
            <p>
              Integrated AI tutoring helps explain concepts, generate study plans, and keep every group on
              track.
            </p>
          </article>
          <article className="panel">
            <p className="eyebrow">Smart Score + Cosmetics</p>
            <h3>Progress that feels rewarding</h3>
            <p>
              Earn points by connecting with peers and finishing milestones, then unlock character skins,
              badges, and themed effects.
            </p>
          </article>
        </section>

        <section className="roadmap">
          <p className="eyebrow">Build Plan</p>
          <h3>Execution roadmap</h3>
          <ol>
            {roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
