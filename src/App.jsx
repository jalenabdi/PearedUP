import { useState, useEffect, useRef } from 'react';
import logo from '../PearedUP-logo.png';
import cometPear from '../Comet-Zoro-Pear.png';

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
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
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
  const [subjectPrefixQuery, setSubjectPrefixQuery] = useState('');
  const [courseNumberQuery, setCourseNumberQuery] = useState('');
  const [professorLastNameQuery, setProfessorLastNameQuery] = useState('');
  const [instructionModeQuery, setInstructionModeQuery] = useState('');
  const [sectionOffset, setSectionOffset] = useState('0');
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [sectionResults, setSectionResults] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [motionPref, setMotionPref] = useState(localStorage.getItem('motion-pref') || 'smooth');
  const [dashboardStyle, setDashboardStyle] = useState(localStorage.getItem('dashboard-style') || 'glow');
  const [uiDensity, setUiDensity] = useState(localStorage.getItem('ui-density') || 'comfortable');
  const chatEndRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const pearCenterRef = useRef(null);
  const pearAngleRef = useRef(0);

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-motion', motionPref);
    localStorage.setItem('motion-pref', motionPref);
  }, [motionPref]);

  useEffect(() => {
    document.documentElement.setAttribute('data-dashboard-style', dashboardStyle);
    localStorage.setItem('dashboard-style', dashboardStyle);
  }, [dashboardStyle]);

  useEffect(() => {
    document.documentElement.setAttribute('data-ui-density', uiDensity);
    localStorage.setItem('ui-density', uiDensity);
  }, [uiDensity]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (view !== 'student-welcome') {
      return;
    }

    const handlePointerMove = (event) => {
      const center = pearCenterRef.current;
      if (!center) {
        return;
      }

      const rect = center.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radians = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const targetDegrees = ((radians * 180) / Math.PI + 90 + 360) % 360;

      // Keep angle continuous to avoid a full-spin jump at the 0/360 seam.
      let delta = targetDegrees - (pearAngleRef.current % 360);
      if (delta > 180) {
        delta -= 360;
      } else if (delta < -180) {
        delta += 360;
      }

      const nextAngle = pearAngleRef.current + delta;
      pearAngleRef.current = nextAngle;
      setPearAngle(nextAngle);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [view]);

  const switchView = (nextView) => {
    if (nextView === view) {
      return;
    }
    setIsViewTransitioning(true);
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setView(nextView);
      setIsViewTransitioning(false);
    }, 180);
  };

  const shellClass = `page-shell ${isViewTransitioning ? 'page-transition-out' : 'page-transition-in'}`;

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
          switchView('user-type');
        } else {
          switchView('student-welcome');
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
      switchView('student-welcome');
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
    if (!trimmed || chatLoading) {
      return;
    }

    const userMessage = { role: 'user', text: trimmed };
    setChatHistory((previous) => [...previous, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const data = await postJson('/api/chat', { message: trimmed }, headers);

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
    const sectionNumber = sectionNumberQuery.trim();
    const subjectPrefix = subjectPrefixQuery.trim().toUpperCase();
    const courseNumber = courseNumberQuery.trim();
    const professorLastName = professorLastNameQuery.trim();
    const instructionMode = instructionModeQuery.trim();
    const offset = sectionOffset.trim() || '0';

    if (!sectionNumber && !subjectPrefix && !courseNumber && !professorLastName) {
      setSectionError('Enter at least one search field (section, course, or professor).');
      setSectionResults([]);
      return;
    }

    setSectionLoading(true);
    setSectionError('');

    try {
      const queryParts = new URLSearchParams();
      if (sectionNumber) queryParts.set('section_number', sectionNumber);
      if (subjectPrefix) queryParts.set('course_details.subject_prefix', subjectPrefix);
      if (courseNumber) queryParts.set('course_details.course_number', courseNumber);
      if (professorLastName) queryParts.set('professor_details.last_name', professorLastName);
      if (instructionMode) queryParts.set('instruction_mode', instructionMode);
      queryParts.set('offset', offset);

      const data = await getJson(
        `/api/sections/search?${queryParts.toString()}`,
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

  const getCourseHeader = (section) => {
    const course = section?.course_details?.[0];
    if (!course) return section.section_number || 'Section';
    const code = [course.subject_prefix, course.course_number].filter(Boolean).join(' ');
    return code ? `${code} - ${section.section_number || 'Section'}` : (section.section_number || 'Section');
  };

  const getCourseTitle = (section) => {
    const course = section?.course_details?.[0];
    return course?.title || 'No course title available';
  };

  const getSectionDescription = (section) => {
    const parts = [];
    const attributes = String(section?.attributes || '').trim();
    const sessionStart = section?.academic_session?.start_date;
    const sessionEnd = section?.academic_session?.end_date;
    if (attributes) parts.push(attributes);
    if (sessionStart || sessionEnd) parts.push(`Session: ${sessionStart || 'TBA'} to ${sessionEnd || 'TBA'}`);
    if (parts.length === 0) return 'No additional description available.';
    return parts.join(' • ');
  };

  const getProfessorNames = (section) => {
    if (Array.isArray(section?.professor_names) && section.professor_names.length > 0) {
      return section.professor_names.join(', ');
    }

    const details = Array.isArray(section?.professor_details) ? section.professor_details : [];
    if (details.length > 0) {
      return details
        .map((prof) => [prof.first_name, prof.last_name].filter(Boolean).join(' ').trim())
        .filter(Boolean)
        .join(', ');
    }
    return 'Professor info unavailable';
  };

  const getMeetingSummary = (section) => {
    const meeting = Array.isArray(section?.meetings) ? section.meetings[0] : null;
    if (!meeting) return 'N/A';
    const days = Array.isArray(meeting.meeting_days) ? meeting.meeting_days.join(', ') : 'N/A';
    const time = [meeting.start_time, meeting.end_time].filter(Boolean).join(' - ') || 'Time TBA';
    const location = [meeting?.location?.building, meeting?.location?.room].filter(Boolean).join(' ') || 'Location TBA';
    return `${days} | ${time} | ${location}`;
  };

  const getMapHref = (section) => {
    const explicit = section?.meetings?.[0]?.location?.map_uri;
    if (explicit) return explicit;
    const building = section?.meetings?.[0]?.location?.building;
    const room = section?.meetings?.[0]?.location?.room;
    if (!building && !room) return '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([building, room, 'UT Dallas'].filter(Boolean).join(' '))}`;
  };

  if (view === 'user-type') {
    return (
      <div className={`${shellClass} auth-shell`}>
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
      <div className={shellClass}>
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
                switchView('home');
              }}
            >
              Logout
            </button>
          </nav>
        </header>
        <main className="welcome-main">
          <img src={cometPear} alt="" aria-hidden="true" className="welcome-bg-comet welcome-bg-comet-left" />
          <img src={cometPear} alt="" aria-hidden="true" className="welcome-bg-comet welcome-bg-comet-right" />
          <section className="dashboard-hero">
            <p className="eyebrow">Student Dashboard</p>
            <h2>Welcome back, {user?.email ? user.email.split('@')[0] : 'Student'}!</h2>
            <p>Pick a lane and keep your momentum going.</p>
            <div className="dashboard-meta">
              <span className="meta-chip">Focus Mode: Active</span>
              <span className="meta-chip">AI Mentor: Ready</span>
              <span className="meta-chip">Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
              <span className="meta-chip">Motion: {motionPref === 'smooth' ? 'Smooth' : 'Reduced'}</span>
            </div>
          </section>

          <div className="button-grid" role="group" aria-label="Dashboard actions">
            <div className="dashboard-orb" aria-hidden="true"></div>
            <button
              className="feature-btn pos-top tone-mint"
              onClick={() => alert('Connect feature coming soon!')}
            >
              <div className="btn-icon">🤝</div>
              <h3>Connect</h3>
              <p>Find your best study match</p>
            </button>
            <button
              className="feature-btn pos-right tone-amber"
              onClick={() => alert('Syllabus uploader coming soon!')}
            >
              <div className="btn-icon">📄</div>
              <h3>Syllabus PDF Uploader</h3>
              <p>Drop your course doc and map it</p>
            </button>
            <button
              className="feature-btn pos-bottom tone-coral"
              onClick={() => switchView('chatbot')}
            >
              <div className="btn-icon">🤖</div>
              <h3>Chat Bot</h3>
              <p>Ask Gala for fast help</p>
            </button>
            <button
              className="feature-btn pos-left tone-sky"
              onClick={() => switchView('settings')}
            >
              <div className="btn-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Adjust your workspace vibe</p>
            </button>
            <div className="button-center-pear" aria-hidden="true" ref={pearCenterRef}>
              <span className="pear-glyph" style={{ transform: `rotate(${pearAngle}deg)` }}>🍐</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className={shellClass}>
        <header className="hero">
          <nav className="top-nav">
            <div className="brand">
              <img src={logo} alt="PearedUp logo" className="logo-img" />
              <div>
                <h1>PearedUp</h1>
              </div>
            </div>
            <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
              Back
            </button>
          </nav>
        </header>

        <main className="settings-main">
          <section className="panel settings-card">
            <img src={cometPear} alt="Comet Zoro Pear" className="settings-comet-pear" />
            <p className="eyebrow">Preferences</p>
            <h2>Settings</h2>
            <p className="muted">Control how your dashboard looks.</p>

            <div className="settings-row">
              <div>
                <h3>Appearance</h3>
                <p className="muted">Switch between dark and light mode with a smooth transition.</p>
              </div>
              <button
                type="button"
                className={`theme-toggle ${theme === 'light' ? 'light' : 'dark'}`}
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle dark and light mode"
              >
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            </div>

            <div className="settings-row">
              <div>
                <h3>Dashboard Style</h3>
                <p className="muted">Choose between a vivid glow look or a cleaner minimal canvas.</p>
              </div>
              <div className="settings-options">
                <button
                  type="button"
                  className={`option-btn ${dashboardStyle === 'glow' ? 'active' : ''}`}
                  onClick={() => setDashboardStyle('glow')}
                >
                  Glow
                </button>
                <button
                  type="button"
                  className={`option-btn ${dashboardStyle === 'minimal' ? 'active' : ''}`}
                  onClick={() => setDashboardStyle('minimal')}
                >
                  Minimal
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <h3>Motion</h3>
                <p className="muted">Control animation intensity across transitions and hover effects.</p>
              </div>
              <div className="settings-options">
                <button
                  type="button"
                  className={`option-btn ${motionPref === 'smooth' ? 'active' : ''}`}
                  onClick={() => setMotionPref('smooth')}
                >
                  Smooth
                </button>
                <button
                  type="button"
                  className={`option-btn ${motionPref === 'reduced' ? 'active' : ''}`}
                  onClick={() => setMotionPref('reduced')}
                >
                  Reduced
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <h3>UI Density</h3>
                <p className="muted">Adjust spacing and action button size for your preferred layout.</p>
              </div>
              <div className="settings-options">
                <button
                  type="button"
                  className={`option-btn ${uiDensity === 'comfortable' ? 'active' : ''}`}
                  onClick={() => setUiDensity('comfortable')}
                >
                  Comfortable
                </button>
                <button
                  type="button"
                  className={`option-btn ${uiDensity === 'compact' ? 'active' : ''}`}
                  onClick={() => setUiDensity('compact')}
                >
                  Compact
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'chatbot') {
    return (
      <div className={shellClass}>
        <header className="hero">
          <nav className="top-nav">
            <div className="brand">
              <img src={logo} alt="PearedUp logo" className="logo-img" />
              <div>
                <h1>PearedUp</h1>
              </div>
            </div>
            <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
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
            <div className="chat-pear-banner">
              <img src={cometPear} alt="Comet Zoro Pear" className="chat-comet-pear" />
              <p>Comet mode active for peak study energy.</p>
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
              <img src={cometPear} alt="Comet Zoro Pear" className="section-comet-pear" />
              <p className="eyebrow">Nebula Sections</p>
              <h3>Find Class & Syllabus Info</h3>
              <p className="section-helper">
                Search by section number, course code, or professor last name. Use any mix of fields.
              </p>
              <div className="offset-guide">
                <span className="offset-chip">Offset Tip</span>
                <span><strong>0</strong> = first page of results, <strong>10</strong> = skip first 10 matches.</span>
              </div>
              <div className="section-search-controls">
                <input
                  type="text"
                  placeholder="Section number (e.g. 001)"
                  value={sectionNumberQuery}
                  onChange={(event) => setSectionNumberQuery(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Subject (e.g. CS)"
                  value={subjectPrefixQuery}
                  onChange={(event) => setSubjectPrefixQuery(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Course number (e.g. 1337)"
                  value={courseNumberQuery}
                  onChange={(event) => setCourseNumberQuery(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Professor last name"
                  value={professorLastNameQuery}
                  onChange={(event) => setProfessorLastNameQuery(event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Instruction mode (optional)"
                  value={instructionModeQuery}
                  onChange={(event) => setInstructionModeQuery(event.target.value)}
                />
                <div className="offset-field">
                  <input
                    type="number"
                    min="0"
                    placeholder="Offset"
                    value={sectionOffset}
                    onChange={(event) => setSectionOffset(event.target.value)}
                  />
                  <p>Use 0 for first results; increase to paginate.</p>
                </div>
                <button
                  type="button"
                  className="primary-btn section-search-btn"
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
                      <h4>{getCourseHeader(section)}</h4>
                      <p className="section-title">{getCourseTitle(section)}</p>
                      <p className="section-description">{getSectionDescription(section)}</p>
                      <div className="section-meta-grid">
                        <p><strong>Class #:</strong> {section.internal_class_number || 'N/A'}</p>
                        <p><strong>Mode:</strong> {section.instruction_mode || 'N/A'}</p>
                        <p><strong>Session:</strong> {section.academic_session?.name || 'N/A'}</p>
                        <p><strong>Professors:</strong> {getProfessorNames(section)}</p>
                      </div>
                      <p><strong>Meetings:</strong> {getMeetingSummary(section)}</p>
                        <p><strong>Core Flags:</strong> {Array.isArray(section.core_flags) && section.core_flags.length ? section.core_flags.join(', ') : 'N/A'}</p>
                      <div className="section-links">
                        {section.syllabus_uri ? <a href={section.syllabus_uri} target="_blank" rel="noreferrer">Syllabus</a> : <span>Syllabus N/A</span>}
                        {getMapHref(section) ? <a href={getMapHref(section)} target="_blank" rel="noreferrer">Map</a> : <span>Map N/A</span>}
                      </div>
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
      <div className={`${shellClass} auth-shell`}>
        <main className="auth-page">
          <section className="panel auth-card">
            <img src={cometPear} alt="Comet Zoro Pear" className="auth-comet-pear" />
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
              <button type="button" className="ghost-btn" onClick={() => switchView('home')}>
                Back to Home
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={shellClass}>
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
            <div className="home-comet-pear-wrap">
              <img src={cometPear} alt="Comet Zoro Pear" className="home-comet-pear" />
            </div>
            <div className="cta-row">
              <button className="primary-btn" onClick={() => switchView('auth')}>
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
