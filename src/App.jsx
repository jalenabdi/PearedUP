import { useState } from 'react';
import logo from '../PearedUP-logo.png';

const heroContent = {
  heroTitle: 'Drop your syllabus and get paired with people learning the same thing.',
  heroBody:
    'Match by coursework and shared deadlines, train with an AI mentor, and earn smart-score points you can spend on cosmetics.'
};

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export default function App() {
  const [view, setView] = useState('home');
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const resetAuthFeedback = () => {
    setVerificationMessage('');
    setAuthMessage('');
  };

  const sendVerificationCode = async () => {
    if (!isValidEmail(email)) {
      setVerificationMessage('Enter a valid email first so we can verify it.');
      return;
    }

    setIsSendingCode(true);
    setVerificationMessage('');

    try {
      const data = await postJson('/api/auth/request-verification', { email: email.trim().toLowerCase() });
      setEmailVerified(false);
      setVerificationMessage(data.message || 'Verification code sent.');
    } catch (error) {
      setVerificationMessage(error.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!enteredCode.trim()) {
      setVerificationMessage('Enter the verification code.');
      return;
    }

    setIsVerifying(true);
    setVerificationMessage('');

    try {
      const data = await postJson('/api/auth/verify-email', {
        email: email.trim().toLowerCase(),
        code: enteredCode.trim()
      });
      setEmailVerified(true);
      setVerificationMessage(data.message || 'Email verified successfully.');
    } catch (error) {
      setEmailVerified(false);
      setVerificationMessage(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAuthSubmit = async () => {
    resetAuthFeedback();

    if (!isValidEmail(email)) {
      setAuthMessage('Please enter a valid email.');
      return;
    }

    if (!password) {
      setAuthMessage('Please enter your password.');
      return;
    }

    if (authMode === 'signup') {
      if (password.length < 8) {
        setAuthMessage('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthMessage('Passwords do not match.');
        return;
      }
      if (!emailVerified) {
        setAuthMessage('Verify your email before creating an account.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const data = await postJson(endpoint, {
        email: email.trim().toLowerCase(),
        password
      });
      setAuthMessage(data.message || (authMode === 'login' ? 'Login successful.' : 'Account created.'));
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAuthMode = () => {
    const nextMode = authMode === 'login' ? 'signup' : 'login';
    setAuthMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setEnteredCode('');
    setEmailVerified(false);
    resetAuthFeedback();

    if (nextMode === 'signup') {
      if (isValidEmail(email)) {
        sendVerificationCode();
      } else {
        setVerificationMessage('Enter your email, then click Send Code to verify before signup.');
      }
    }
  };

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

            <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {authMode === 'signup' && (
                <>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button type="button" className="ghost-btn" onClick={sendVerificationCode} disabled={isSendingCode}>
                    {isSendingCode ? 'Sending...' : 'Send Code'}
                  </button>
                  <label htmlFor="verificationCode">Verification Code</label>
                  <input
                    id="verificationCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={enteredCode}
                    onChange={(event) => setEnteredCode(event.target.value)}
                  />
                  <button type="button" className="ghost-btn" onClick={handleVerifyCode} disabled={isVerifying}>
                    {isVerifying ? 'Verifying...' : 'Verify Email'}
                  </button>
                  {verificationMessage && (
                    <p className={`verification-msg ${emailVerified ? 'success' : 'warning'}`}>
                      {verificationMessage}
                    </p>
                  )}
                </>
              )}
              {authMessage && <p className="auth-msg">{authMessage}</p>}
              <button
                type="button"
                className="primary-btn wide"
                onClick={handleAuthSubmit}
                disabled={isSubmitting || (authMode === 'signup' && !emailVerified)}
              >
                {isSubmitting ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-actions">
              <button type="button" className="ghost-btn" onClick={toggleAuthMode}>
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
            PearedUp goes beyond traditional study groups by intelligently matching you with peers who share your academic goals and challenges. Our AI-powered platform ensures you're not just studying with anyone-you're studying with the right people at the right time.
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
