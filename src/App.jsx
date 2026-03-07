import { useState } from 'react';
import logo from '../PearedUP-logo.png';

const heroContent = {
  heroTitle: 'Drop your syllabus and get paired with people learning the same thing.',
  heroBody:
    'Match by coursework and shared deadlines, train with an AI mentor, and earn smart-score points you can spend on cosmetics.'
};

export default function App() {
  const [view, setView] = useState('home');
  const [authMode, setAuthMode] = useState('login');

  if (view === 'auth') {
    return (
      <div className="page-shell auth-shell">
        <main className="auth-page">
          <section className="panel auth-card">
            <p className="eyebrow">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</p>
            <h2>{authMode === 'login' ? 'Log in to PearedUp' : 'Create your PearedUp account'}</h2>
            <p className="muted">
              {authMode === 'login'
                ? 'Continue your study groups, mentoring sessions, and smart-score progress.'
                : 'Join your classmates and peers, find your learning matches, and start earning smart-score points.'}
            </p>

            <form className="auth-form">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@school.edu" />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="Enter password" />
              {authMode === 'signup' && (
                <>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input id="confirmPassword" type="password" placeholder="Confirm password" />
                </>
              )}
              <button type="button" className="primary-btn wide">
                {authMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              >
                {authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
              </button>
              <button type="button" className="ghost-btn" onClick={() => setView('home')}>
                Back to Home
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <nav className="top-nav">
          <div className="brand">
            <img src={logo} alt="PearedUp logo" className="logo-img" />
            <div>
              <p className="eyebrow"></p>
              <h1>PearedUp</h1>
            </div>
          </div>
        </nav>

        <div className="hero-grid hero-grid-single">
          <section>
            <p className="tag">Connect. Study. Level Up.</p>
            <h2>{heroContent.heroTitle}</h2>
            <p className="muted">{heroContent.heroBody}</p>
            <div className="cta-row">
              <button className="primary-btn" onClick={() => setView('auth')}>
                Get Started
              </button>
            </div>
          </section>
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

        <section className="info-section">
          <p className="eyebrow">Why PearedUp?</p>
          <h3>Transform your study experience</h3>
          <p>
            PearedUp goes beyond traditional study groups by intelligently matching you with peers who share your academic goals and challenges. Our AI-powered platform ensures you're not just studying with anyone—you're studying with the right people at the right time.
          </p>
          <ul>
            <li><strong>Personalized Matching:</strong> Upload your syllabus and get connected with classmates taking the same courses, facing similar deadlines, and learning at your pace.</li>
            <li><strong>AI-Powered Support:</strong> Get instant help from our integrated AI mentor that adapts to your learning style and provides tailored study plans.</li>
            <li><strong>Gamified Learning:</strong> Turn studying into an engaging experience with smart-score points, unlockable cosmetics, and achievement badges.</li>
            <li><strong>Secure & Private:</strong> Built with student privacy in mind, using university authentication to keep your academic data safe.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
