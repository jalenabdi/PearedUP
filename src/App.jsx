import { useState, useEffect, useRef } from 'react';
import logo from '../PearedUP-logo.png';

const heroContent = {
  heroTitle: 'Drop your syllabus and get paired with people learning the same thing.',
  heroBody:
    'Match by coursework and shared deadlines, train with an AI mentor, and earn smart-score points you can spend on cosmetics.'
};

async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export default function App() {
  const [view, setView] = useState('home');
  const [authMode, setAuthMode] = useState('signup');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [signupStep, setSignupStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [pearAngle, setPearAngle] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Hey, I am Gala. Ask me anything about your studying and classes.', provider: 'ready' }
  ]);
  const [sectionNumberQuery, setSectionNumberQuery] = useState('');
  const [sectionOffset, setSectionOffset] = useState('0');
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [sectionResults, setSectionResults] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (token) {
      // Check if user is logged in
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            if (!data.user.userType) {
              setView('user-type');
            } else {
              setView('student-welcome');
            }
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const resetAuthFeedback = () => {
    setMessage('');
  };

  const sendVerificationCode = async () => {
    if (!isValidEmail(email)) {
      setMessage('Enter a valid email first so we can verify it.');
      return;
    }

    setMessage('');

    try {
      const data = await postJson('/api/auth/request-verification', { email: email.trim().toLowerCase() });
      setSignupStep(2);
      setMessage(data.message || 'Verification code sent.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setMessage('Enter the verification code.');
      return;
    }

    setMessage('');

    try {
      const data = await postJson('/api/auth/verify-email', {
        email: email.trim().toLowerCase(),
        code: verificationCode.trim()
      });
      setSignupStep(3);
      setMessage(data.message || 'Email verified successfully.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAuthSubmit = async () => {
    if (!isValidEmail(email)) {
      setMessage('Please enter a valid email.');
      return;
    }

    if (!password) {
      setMessage('Please enter your password.');
      return;
    }

    if (authMode === 'signup') {
      if (password.length < 8) {
        setMessage('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return;
      }
      if (signupStep < 3) {
        setMessage('Complete email verification first.');
        return;
      }
    }

    setMessage('');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const data = await postJson(endpoint, {
        email: email.trim().toLowerCase(),
        password
      });
      setMessage(data.message || (authMode === 'login' ? 'Login successful.' : 'Account created.'));
      if (authMode === 'login' && data.token) {
        localStorage.setItem('token', data.token);
        const userFromResponse = data.user || { email, userType: data.userType };
        const userType = userFromResponse?.userType;
        setToken(data.token);
        setUser(userFromResponse);
        if (!userType) {
          setView('user-type');
        } else {
          setView('student-welcome');
        }
      } else if (authMode === 'signup') {
        setAuthMode('login');
        setSignupStep(1);
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleSetUserType = async (type) => {
    try {
      const data = await postJson('/api/auth/set-user-type', { userType: type }, { Authorization: `Bearer ${token}` });
      setUser((previous) => ({ ...previous, ...(data.user || {}), userType: type }));
      setView('student-welcome');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleAuthMode = () => {
    const nextMode = authMode === 'login' ? 'signup' : 'login';
    setAuthMode(nextMode);
    setSignupStep(1);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    resetAuthFeedback();
  };

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || !token || chatLoading) {
      return;
    }

    const userMessage = { role: 'user', text: trimmed };
    setChatHistory((previous) => [...previous, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const data = await postJson(
        '/api/chat',
        { message: trimmed },
        { Authorization: `Bearer ${token}` }
      );

      setChatHistory((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: data.reply || 'No reply from model.',
          provider: data.fallbackFrom ? `${data.provider}-fallback` : (data.provider || 'unknown')
        }
      ]);
    } catch (error) {
      setChatHistory((previous) => [
        ...previous,
        { role: 'assistant', text: error.message || 'Something went wrong.', provider: 'error' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickPrompt = (text) => {
    setChatInput(text);
  };

  const handleSectionSearch = async () => {
    const query = sectionNumberQuery.trim();
    const offset = sectionOffset.trim() || '0';

    if (!query) {
      setSectionError('Enter a section number first.');
      setSectionResults([]);
      return;
    }

    setSectionLoading(true);
    setSectionError('');

    try {
      const data = await getJson(
        `/api/sections/search?section_number=${encodeURIComponent(query)}&offset=${encodeURIComponent(offset)}`,
        { Authorization: `Bearer ${token}` }
      );
      const rows = Array.isArray(data?.data) ? data.data : [];
      setSectionResults(rows);
      if (rows.length === 0) {
        setSectionError('No matching sections found.');
      }
    } catch (error) {
      setSectionResults([]);
      setSectionError(error.message || 'Failed to fetch sections.');
    } finally {
      setSectionLoading(false);
    }
  };

  if (view === 'user-type') {
    return (
      <div className="page-shell auth-shell">
        <main className="auth-page">
          <section className="panel auth-card user-type-card">
            <p className="eyebrow">Welcome!</p>
            <h2>Are you a student?</h2>
            <p className="muted">This helps us personalize your experience.</p>
            <div className="cta-row centered">
              <button className="primary-btn" onClick={() => handleSetUserType('student')}>
                Student
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'student-welcome') {
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
            <button
              className="ghost-btn"
              onClick={() => {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
                setView('home');
              }}
            >
              Logout
            </button>
          </nav>
        </header>
        <main className="welcome-main">
          <h2>Welcome back, {user?.email ? user.email.split('@')[0] : 'Student'}!</h2>
          <p>What would you like to do today?</p>
          <div className="button-grid">
            <button
              className="feature-btn"
              onMouseEnter={() => setPearAngle(0)}
              onMouseLeave={() => setPearAngle(0)}
              onClick={() => alert('Connect feature coming soon!')}
            >
              <div className="btn-icon">🤝</div>
              <h3>Connect</h3>
              <p>Find study partners</p>
            </button>
            <button
              className="feature-btn"
              onMouseEnter={() => setPearAngle(90)}
              onMouseLeave={() => setPearAngle(0)}
              onClick={() => alert('Syllabus uploader coming soon!')}
            >
              <div className="btn-icon">📄</div>
              <h3>Syllabus PDF Uploader</h3>
              <p>Upload your course materials</p>
            </button>
            <button
              className="feature-btn"
              onMouseEnter={() => setPearAngle(180)}
              onMouseLeave={() => setPearAngle(0)}
              onClick={() => setView('chatbot')}
            >
              <div className="btn-icon">🤖</div>
              <h3>Chat Bot</h3>
              <p>Get AI assistance</p>
            </button>
            <button
              className="feature-btn"
              onMouseEnter={() => setPearAngle(270)}
              onMouseLeave={() => setPearAngle(0)}
              onClick={() => alert('Settings coming soon!')}
            >
              <div className="btn-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Manage your account</p>
            </button>
            <div className="button-center-pear" aria-hidden="true">
              <span className="pear-glyph" style={{ transform: `rotate(${pearAngle}deg)` }}>🍐</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'chatbot') {
    return (
      <div className="page-shell">
        <header className="hero">
          <nav className="top-nav">
            <div className="brand">
              <img src={logo} alt="PearedUp logo" className="logo-img" />
              <div>
                <h1>PearedUp</h1>
              </div>
            </div>
            <button className="ghost-btn" onClick={() => setView('student-welcome')}>
              Back
            </button>
          </nav>
        </header>

        <main className="chat-main">
          <section className="panel chat-panel">
            <p className="eyebrow">AI Mentor</p>
            <h2>Gala Chatbot</h2>
            <div className="chat-top-row">
              <p className="chat-subtext">Faster answers, cleaner help, and study-focused replies.</p>
              <div className="pear-balloon-wrap" aria-hidden="true">
                <span className="pear-balloon-string"></span>
                <span className="pear-balloon"></span>
                <span className="pear-face">🍐</span>
              </div>
            </div>
            <div className="chat-metrics">
              <span className="metric-pill">Dual Engine: Nebula + Ollama</span>
              <span className="metric-pill">Hit Enter to send fast</span>
            </div>
            <div className="quick-prompts">
              <button type="button" className="ghost-btn quick-btn" onClick={() => quickPrompt('Help me plan my study schedule for this week.')}>
                Study Plan
              </button>
              <button type="button" className="ghost-btn quick-btn" onClick={() => quickPrompt('Quiz me on biology cell structure with 5 questions.')}>
                Quick Quiz
              </button>
              <button type="button" className="ghost-btn quick-btn" onClick={() => quickPrompt('Summarize my chapter into key points.')}>
                Summarize
              </button>
            </div>
            <div className="chat-history">
              {chatHistory.map((entry, index) => (
                <div key={`${entry.role}-${index}`} className={`chat-bubble ${entry.role}`}>
                  {entry.text}
                  {entry.role === 'assistant' && entry.provider && (
                    <span className={`provider-tag ${entry.provider}`}>{entry.provider}</span>
                  )}
                </div>
              ))}
              {chatLoading && <div className="chat-bubble assistant">Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input-row">
              <input
                type="text"
                placeholder="Ask Gala anything..."
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                disabled={chatLoading}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    sendChatMessage();
                  }
                }}
              />
              <button className="primary-btn" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                Send
              </button>
            </div>

            <div className="section-search-card">
              <p className="eyebrow">Nebula Sections</p>
              <h3>Find Class Sections</h3>
              <div className="section-search-controls">
                <input
                  type="text"
                  placeholder="Section number (e.g. 001)"
                  value={sectionNumberQuery}
                  onChange={(event) => setSectionNumberQuery(event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Offset"
                  value={sectionOffset}
                  onChange={(event) => setSectionOffset(event.target.value)}
                />
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSectionSearch}
                  disabled={sectionLoading}
                >
                  {sectionLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {sectionError && <p className="section-error">{sectionError}</p>}

              {sectionResults.length > 0 && (
                <div className="section-results">
                  {sectionResults.map((section) => (
                    <article key={section._id || `${section.section_number}-${section.internal_class_number}`} className="section-item">
                      <p><strong>Section:</strong> {section.section_number || 'N/A'}</p>
                      <p><strong>Class #:</strong> {section.internal_class_number || 'N/A'}</p>
                      <p><strong>Mode:</strong> {section.instruction_mode || 'N/A'}</p>
                      <p><strong>Session:</strong> {section.academic_session?.name || 'N/A'}</p>
                      <p><strong>Syllabus:</strong> {section.syllabus_uri ? <a href={section.syllabus_uri} target="_blank" rel="noreferrer">Open link</a> : 'N/A'}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="page-shell auth-shell">
        <main className="auth-page">
          <section className="panel auth-card">
            <p className="eyebrow">{authMode === 'login' ? 'Welcome Back' : signupStep === 1 ? 'Create Account' : signupStep === 2 ? 'Verify Email' : 'Set Password'}</p>
            <h2>{authMode === 'login' ? 'Log in to PearedUp' : signupStep === 1 ? 'Enter your email' : signupStep === 2 ? 'Enter verification code' : 'Create password'}</h2>
            <p className="muted">
              {authMode === 'login'
                ? 'Continue your study groups, mentoring sessions, and smart-score progress.'
                : signupStep === 1
                ? 'We\'ll send a verification code to your email.'
                : signupStep === 2
                ? 'Check your email for the 6-digit code.'
                : 'Choose a strong password for your account.'}
            </p>

            {message && <p className="message">{message}</p>}

            <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
              {signupStep === 1 || authMode === 'login' ? (
                <div>
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              ) : null}

              {signupStep === 2 ? (
                <div>
                  <label htmlFor="code">Verification Code</label>
                  <input id="code" type="text" placeholder="123456" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
                </div>
              ) : null}

              {(signupStep === 3 || authMode === 'login') ? (
                <div>
                  <label htmlFor="password">Password</label>
                  <input id="password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {signupStep === 3 && (
                    <>
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <input id="confirmPassword" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </>
                  )}
                </div>
              ) : null}

              <button type="button" className="primary-btn wide" onClick={authMode === 'login' ? handleAuthSubmit : signupStep === 1 ? sendVerificationCode : signupStep === 2 ? handleVerifyCode : handleAuthSubmit}>
                {authMode === 'login' ? 'Log In' : signupStep === 1 ? 'Send Code' : signupStep === 2 ? 'Verify' : 'Create Account'}
              </button>
            </form>

            <div className="auth-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={toggleAuthMode}
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
