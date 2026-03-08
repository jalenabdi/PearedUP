import { useState, useEffect, useRef } from 'react';
import logo from '../PearedUP-logo.png';
import cometPear from '../Comet-Zoro-Pear.png';

const DEPARTMENT_OPTIONS = [
  'ACCT', 'AHST', 'ARTS', 'BBS', 'BCOM', 'BIOL', 'BLAW', 'CE', 'CHEM', 'CS', 'CRIM',
  'DANC', 'ECON', 'ECE', 'ED', 'ENGR', 'FIN', 'GEOG', 'GOVT', 'HIST', 'HLTH', 'ISNS',
  'ITSS', 'LIT', 'MATH', 'MECH', 'MKT', 'MUSI', 'NURS', 'OPRE', 'PHIL', 'PHYS', 'PSY',
  'SE', 'SOC', 'SPAN'
];

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
  const [chatAttachments, setChatAttachments] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Hey, I am Gala. Ask me anything about your studying and classes.', provider: 'ready' }
  ]);
  const [sectionNumberQuery, setSectionNumberQuery] = useState('');
  const [subjectPrefixQuery, setSubjectPrefixQuery] = useState('');
  const [courseNumberQuery, setCourseNumberQuery] = useState('');
  const [professorLastNameQuery, setProfessorLastNameQuery] = useState('');
  const [sectionOffset, setSectionOffset] = useState('0');
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [sectionResults, setSectionResults] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsError, setClubsError] = useState('');
  const [clubResults, setClubResults] = useState([]);
  const [syllabusCourseTitle, setSyllabusCourseTitle] = useState('');
  const [syllabusInstructor, setSyllabusInstructor] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [syllabusDetectedClass, setSyllabusDetectedClass] = useState('');
  const [syllabusDetectionStatus, setSyllabusDetectionStatus] = useState('not-started');
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [syllabusMessage, setSyllabusMessage] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectClassmates, setConnectClassmates] = useState([]);
  const [connectMessages, setConnectMessages] = useState([]);
  const [connectInput, setConnectInput] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [motionPref, setMotionPref] = useState(localStorage.getItem('motion-pref') || 'smooth');
  const [dashboardStyle, setDashboardStyle] = useState(localStorage.getItem('dashboard-style') || 'glow');
  const [uiDensity, setUiDensity] = useState(localStorage.getItem('ui-density') || 'comfortable');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const chatEndRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const pearCenterRef = useRef(null);
  const pearAngleRef = useRef(0);
  const profileMenuRef = useRef(null);

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
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
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
    setProfileMenuOpen(false);
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
  const dashboardDetectedClass = user?.syllabusFoundation?.detectedClass || syllabusDetectedClass || 'Not detected yet';
  const dashboardDetectionStatus = user?.syllabusFoundation?.detectionStatus || syllabusDetectionStatus;

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProfileMenuOpen(false);
    switchView('home');
  };

  const handleUpdateMajor = async (majorValue) => {
    if (!token) return;
    const normalized = String(majorValue || '').trim().toUpperCase();
    try {
      await postJson('/api/profile', { major: normalized }, { Authorization: `Bearer ${token}` });
      setUser((previous) => previous ? { ...previous, major: normalized } : previous);
    } catch {
      // Keep UI responsive even if profile write fails.
    }
  };

  const rankClubsByMajor = (clubs, major) => {
    const normalizedMajor = String(major || '').trim().toLowerCase();
    return [...clubs].sort((a, b) => {
      const getScore = (club) => {
        if (!normalizedMajor) return 0;
        const haystack = [
          club?.name,
          club?.description,
          ...(Array.isArray(club?.tags) ? club.tags : [])
        ].join(' ').toLowerCase();
        if (!haystack) return 0;
        if (haystack.includes(normalizedMajor)) return 3;
        if (normalizedMajor === 'cs' && /(coding|code|software|computer|hack|program)/.test(haystack)) return 2;
        if (normalizedMajor === 'ece' && /(electrical|hardware|robot|embedded|circuit)/.test(haystack)) return 2;
        if (normalizedMajor === 'math' && /(math|analysis|actuary|statistics)/.test(haystack)) return 2;
        return 1;
      };
      return getScore(b) - getScore(a);
    });
  };

  const loadClubs = async () => {
    if (!token) return;
    setClubsLoading(true);
    setClubsError('');
    try {
      const major = String(user?.major || subjectPrefixQuery || '').trim().toUpperCase();
      const q = major || 'student';
      const data = await getJson(`/api/clubs/search?q=${encodeURIComponent(q)}`, { Authorization: `Bearer ${token}` });
      const clubs = Array.isArray(data?.data) ? data.data : [];
      setClubResults(rankClubsByMajor(clubs, major));
    } catch (error) {
      setClubResults([]);
      setClubsError(error.message || 'Failed to load clubs.');
    } finally {
      setClubsLoading(false);
    }
  };

  const getProviderLabel = (_provider) => 'Gala';

  const handleAttachFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 4);
    const next = await Promise.all(files.map(async (file) => {
      const isText = file.type.startsWith('text/') || /\.(txt|md|csv|json|js|ts|jsx|tsx)$/i.test(file.name);
      let textSnippet = '';
      if (isText) {
        try {
          const raw = await file.text();
          textSnippet = raw.slice(0, 1800);
        } catch {
          textSnippet = '';
        }
      }
      return {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        textSnippet
      };
    }));
    setChatAttachments(next);
    event.target.value = '';
  };

  const removeAttachment = (name) => {
    setChatAttachments((previous) => previous.filter((item) => item.name !== name));
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    if (!deletePassword.trim()) {
      setDeleteMessage('Enter your password to confirm account deletion.');
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;
    setDeletingAccount(true);
    setDeleteMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await postJson('/api/auth/delete-account', { password: deletePassword }, headers);
      setDeletePassword('');
      handleLogout();
    } catch (error) {
      setDeleteMessage(error.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) {
      return;
    }

    const userMessage = {
      role: 'user',
      text: trimmed,
      attachments: chatAttachments.map((item) => item.name)
    };
    setChatHistory((previous) => [...previous, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const data = await postJson('/api/chat', { message: trimmed, attachments: chatAttachments }, headers);

      setChatHistory((previous) => [
        ...previous,
        {
          role: 'assistant',
          text: data.reply || 'No reply from model.',
          provider: data.provider || 'gala'
        }
      ]);
      setChatAttachments([]);
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
    const professorLastName = professorLastNameQuery.trim().toLowerCase();
    const offset = sectionOffset.trim() || '0';

    if (!subjectPrefix || !courseNumber) {
      setSectionError('Department and course number are required. Section # and professor are optional filters.');
      setSectionResults([]);
      return;
    }

    setSectionLoading(true);
    setSectionError('');

    try {
      if (subjectPrefix && subjectPrefix !== String(user?.major || '').toUpperCase()) {
        handleUpdateMajor(subjectPrefix);
      }
      const queryParts = new URLSearchParams();
      if (sectionNumber) queryParts.set('section_number', sectionNumber);
      if (subjectPrefix) queryParts.set('course_details.subject_prefix', subjectPrefix);
      if (courseNumber) queryParts.set('course_details.course_number', courseNumber);
      queryParts.set('offset', offset);

      const data = await getJson(
        `/api/sections/search?${queryParts.toString()}`,
        { Authorization: `Bearer ${token}` }
      );
      const rows = Array.isArray(data?.data) ? data.data : [];
      const filteredRows = professorLastName
        ? rows.filter((section) => getProfessorNames(section).toLowerCase().includes(professorLastName))
        : rows;
      setSectionResults(filteredRows);
      if (filteredRows.length === 0) {
        setSectionError('No matching sections found.');
      }
    } catch (error) {
      setSectionResults([]);
      setSectionError(error.message || 'Failed to fetch sections.');
    } finally {
      setSectionLoading(false);
    }
  };

  const loadSyllabusFoundation = async () => {
    if (!token) return;
    setSyllabusLoading(true);
    setSyllabusMessage('');
    try {
      const data = await getJson('/api/syllabus/foundation', { Authorization: `Bearer ${token}` });
      const foundation = data?.foundation || {};
      setSyllabusCourseTitle(foundation.courseTitle || '');
      setSyllabusInstructor(foundation.instructor || '');
      setSyllabusText(foundation.rawText || '');
      setSyllabusDetectedClass(foundation.detectedClass || '');
      setSyllabusDetectionStatus(foundation.detectionStatus || 'not-started');
      setUser((previous) => {
        if (!previous) return previous;
        return { ...previous, syllabusFoundation: foundation };
      });
    } catch (error) {
      setSyllabusMessage(error.message || 'Failed to load syllabus foundation.');
    } finally {
      setSyllabusLoading(false);
    }
  };

  const saveSyllabusFoundation = async () => {
    if (!token) {
      setSyllabusMessage('Please log in again.');
      return;
    }
    if (!syllabusCourseTitle.trim() && !syllabusText.trim()) {
      setSyllabusMessage('Please add a course title or syllabus text.');
      return;
    }

    setSyllabusLoading(true);
    setSyllabusMessage('');
    try {
      const data = await postJson(
        '/api/syllabus/foundation',
        {
          courseTitle: syllabusCourseTitle,
          instructor: syllabusInstructor,
          rawText: syllabusText
        },
        { Authorization: `Bearer ${token}` }
      );
      const foundation = data?.foundation || {};
      setSyllabusDetectedClass(foundation.detectedClass || '');
      setSyllabusDetectionStatus(foundation.detectionStatus || 'not-started');
      setUser((previous) => {
        if (!previous) return previous;
        return { ...previous, syllabusFoundation: foundation };
      });
      setSyllabusMessage(data?.message || 'Syllabus foundation saved.');
    } catch (error) {
      setSyllabusMessage(error.message || 'Failed to save syllabus foundation.');
    } finally {
      setSyllabusLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'syllabus' && token) {
      loadSyllabusFoundation();
    }
  }, [view, token]);

  const loadConnectData = async () => {
    if (!token) {
      return;
    }
    setConnectLoading(true);
    setConnectError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [classmatesResponse, messagesResponse] = await Promise.all([
        getJson('/api/connect/classmates', headers),
        getJson('/api/connect/messages', headers)
      ]);

      setConnectClassmates(Array.isArray(classmatesResponse?.classmates) ? classmatesResponse.classmates : []);
      setConnectMessages(Array.isArray(messagesResponse?.messages) ? messagesResponse.messages : []);
    } catch (error) {
      setConnectError(error.message || 'Failed to load connect data.');
      setConnectClassmates([]);
      setConnectMessages([]);
    } finally {
      setConnectLoading(false);
    }
  };

  const sendConnectMessage = async () => {
    const trimmed = connectInput.trim();
    if (!trimmed || !token) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const data = await postJson('/api/connect/messages', { text: trimmed }, headers);
      if (data?.messageItem) {
        setConnectMessages((previous) => [...previous, data.messageItem]);
      }
      setConnectInput('');
    } catch (error) {
      setConnectError(error.message || 'Failed to send message.');
    }
  };

  useEffect(() => {
    if (view !== 'connect' || !token) {
      return;
    }

    loadConnectData();
    const intervalId = window.setInterval(() => {
      loadConnectData();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [view, token]);

  useEffect(() => {
    if (view === 'clubs' && token) {
      loadClubs();
    }
  }, [view, token, user?.major]);

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

  const profileMenu = (
    <div className="profile-menu-wrap" ref={profileMenuRef}>
      <button
        type="button"
        className="ghost-btn profile-trigger"
        onClick={() => setProfileMenuOpen((current) => !current)}
      >
        Profile
      </button>
      {profileMenuOpen && (
        <div className="profile-menu">
          <button
            type="button"
            className="profile-menu-item"
            onClick={() => {
              setProfileMenuOpen(false);
              switchView('settings');
            }}
          >
            Profile Settings
          </button>
          <button
            type="button"
            className="profile-menu-item logout-item"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );

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
            <div className="dashboard-top-right">
              <div className="dashboard-status-card">
                <p><strong>Status:</strong> {dashboardDetectionStatus === 'detected' ? 'Class Detected' : 'Awaiting Syllabus'}</p>
                <p><strong>Class:</strong> {dashboardDetectedClass}</p>
                <p><strong>Major:</strong> {user?.major || 'Not set'}</p>
              </div>
              {profileMenu}
            </div>
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
              onClick={() => switchView('connect')}
            >
              <div className="btn-icon">🤝</div>
              <h3>Connect</h3>
              <p>Find your best study match</p>
            </button>
            <button
              className="feature-btn pos-right tone-amber"
              onClick={() => switchView('syllabus')}
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
              onClick={() => switchView('clubs')}
            >
              <div className="btn-icon">🏛️</div>
              <h3>Clubs</h3>
              <p>Find clubs by your major</p>
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
            <div className="top-right-controls">
              <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
                Back
              </button>
              {profileMenu}
            </div>
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

            <div className="settings-row">
              <div>
                <h3>Major</h3>
                <p className="muted">Used to rank clubs and personalize recommendations.</p>
              </div>
              <div className="settings-options">
                <select
                  className="major-select"
                  value={String(user?.major || '')}
                  onChange={(event) => handleUpdateMajor(event.target.value)}
                >
                  <option value="">Select major/department</option>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="settings-row danger-row">
              <div>
                <h3>Delete Account</h3>
                <p className="muted">This removes your account and class chat messages permanently.</p>
              </div>
              <div className="settings-options delete-account-controls">
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
                <button
                  type="button"
                  className="ghost-btn delete-btn"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                >
                  {deletingAccount ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
            {deleteMessage && <p className="section-error">{deleteMessage}</p>}
          </section>
        </main>
      </div>
    );
  }

  if (view === 'clubs') {
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
            <div className="top-right-controls">
              <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
                Back
              </button>
              {profileMenu}
            </div>
          </nav>
        </header>

        <main className="connect-main">
          <section className="panel settings-card clubs-card">
            <p className="eyebrow">Campus Clubs</p>
            <h2>Clubs For {user?.major || 'Your Major'}</h2>
            <p className="muted">Results are ranked by your major profile. Update major in Profile Settings or by searching sections.</p>
            <div className="clubs-refresh-row">
              <button className="primary-btn" type="button" onClick={loadClubs} disabled={clubsLoading}>
                {clubsLoading ? 'Refreshing...' : 'Refresh Clubs'}
              </button>
            </div>
            {clubsError && <p className="section-error">{clubsError}</p>}
            <div className="clubs-grid">
              {clubsLoading ? (
                <p className="muted">Loading clubs...</p>
              ) : clubResults.length === 0 ? (
                <p className="muted">No clubs found yet for this major search.</p>
              ) : (
                clubResults.map((club) => (
                  <article key={club.id || club.slug || club.name} className="club-item">
                    <h3>{club.name || 'Club'}</h3>
                    <p>{club.description || 'No description available.'}</p>
                    {Array.isArray(club.tags) && club.tags.length > 0 && (
                      <p className="muted">Tags: {club.tags.join(', ')}</p>
                    )}
                    {Array.isArray(club.contacts) && club.contacts.length > 0 && (
                      <div className="section-links">
                        {club.contacts.slice(0, 3).map((contact, index) => (
                          contact?.url
                            ? <a key={`${contact.platform || 'link'}-${index}`} href={contact.url} target="_blank" rel="noreferrer">{contact.platform || 'Contact'}</a>
                            : null
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'connect') {
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
            <div className="top-right-controls">
              <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
                Back
              </button>
              {profileMenu}
            </div>
          </nav>
        </header>

        <main className="connect-main">
          <section className="panel connect-card">
            <p className="eyebrow">Class Connect</p>
            <h2>People In Your Class</h2>
            <p className="muted">Detected class: <strong>{dashboardDetectedClass}</strong></p>

            {connectError && <p className="connect-error">{connectError}</p>}

            <div className="connect-layout">
              <aside className="connect-classmates">
                <h3>Classmates</h3>
                {connectLoading ? (
                  <p className="muted">Loading classmates...</p>
                ) : connectClassmates.length === 0 ? (
                  <p className="muted">No classmates found yet for this class.</p>
                ) : (
                  <ul>
                    {connectClassmates.map((mate) => (
                      <li key={mate._id || mate.email}>
                        <span>{mate.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className="connect-chat">
                <h3>Class Chat</h3>
                <div className="connect-messages">
                  {connectMessages.length === 0 ? (
                    <p className="muted">No messages yet. Start the conversation.</p>
                  ) : (
                    connectMessages.map((item) => (
                      <article key={item._id} className={`connect-message ${item.senderId === user?._id ? 'mine' : ''}`}>
                        <p className="connect-message-meta">{item.senderEmail || 'Student'}</p>
                        <p>{item.text}</p>
                      </article>
                    ))
                  )}
                </div>

                <div className="connect-input-row">
                  <input
                    type="text"
                    placeholder="Send a message to your class..."
                    value={connectInput}
                    onChange={(event) => setConnectInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        sendConnectMessage();
                      }
                    }}
                  />
                  <button className="primary-btn" onClick={sendConnectMessage} disabled={!connectInput.trim()}>
                    Send
                  </button>
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'syllabus') {
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
            <div className="top-right-controls">
              <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
                Back
              </button>
              {profileMenu}
            </div>
          </nav>
        </header>

        <main className="syllabus-main">
          <section className="panel syllabus-card">
            <p className="eyebrow">Syllabus Foundation</p>
            <h2>Set Up Class Detection</h2>
            <p className="muted">Add your course title and syllabus text. We will detect the class and show it on your dashboard.</p>

            <div className="syllabus-grid">
              <label>
                Course Title
                <input
                  type="text"
                  placeholder="CS 1337 - Computer Science I"
                  value={syllabusCourseTitle}
                  onChange={(event) => setSyllabusCourseTitle(event.target.value)}
                />
              </label>
              <label>
                Instructor
                <input
                  type="text"
                  placeholder="Professor name"
                  value={syllabusInstructor}
                  onChange={(event) => setSyllabusInstructor(event.target.value)}
                />
              </label>
            </div>

            <label className="syllabus-text-label">
              Syllabus Text
              <textarea
                rows={10}
                placeholder="Paste syllabus highlights, topics, and schedule here..."
                value={syllabusText}
                onChange={(event) => setSyllabusText(event.target.value)}
              />
            </label>

            <div className="syllabus-row">
              <span className={`syllabus-badge ${syllabusDetectionStatus}`}>
                {syllabusDetectionStatus === 'detected' ? `Detected: ${syllabusDetectedClass}` : 'No class detected yet'}
              </span>
              <button className="primary-btn" onClick={saveSyllabusFoundation} disabled={syllabusLoading}>
                {syllabusLoading ? 'Saving...' : 'Save Syllabus'}
              </button>
            </div>

            {syllabusMessage && <p className="syllabus-message">{syllabusMessage}</p>}
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
            <div className="top-right-controls">
              <button className="ghost-btn" onClick={() => switchView('student-welcome')}>
                Back
              </button>
              {profileMenu}
            </div>
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
              <span className="metric-pill">Gala Smart Routing: Nebula + Ollama</span>
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
                  {entry.role === 'user' && Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                    <p className="chat-attachments-text">Attached: {entry.attachments.join(', ')}</p>
                  )}
                  {entry.role === 'assistant' && entry.provider && (
                    <span className={`provider-tag ${entry.provider}`}>{getProviderLabel(entry.provider)}</span>
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
              <label className="ghost-btn attach-btn" htmlFor="chat-attach-input">
                Attach
              </label>
              <input id="chat-attach-input" type="file" multiple onChange={handleAttachFiles} className="hidden-file-input" />
              <button className="primary-btn" onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>
                Send
              </button>
            </div>
            {chatAttachments.length > 0 && (
              <div className="attachment-chip-row">
                {chatAttachments.map((item) => (
                  <button key={item.name} type="button" className="attachment-chip" onClick={() => removeAttachment(item.name)}>
                    {item.name} ✕
                  </button>
                ))}
              </div>
            )}

            <div className="section-search-card">
              <img src={cometPear} alt="Comet Zoro Pear" className="section-comet-pear" />
              <p className="eyebrow">Nebula Sections</p>
              <h3>Find Class & Syllabus Info</h3>
              <p className="section-helper">
                Department and course number are required. Section # and professor are optional and help refine results.
              </p>
              <div className="offset-guide">
                <span className="offset-chip">Offset Tip</span>
                <span><strong>0</strong> = first page of results, <strong>10</strong> = skip first 10 matches.</span>
              </div>
              <div className="section-search-controls">
                <select
                  value={subjectPrefixQuery}
                  onChange={(event) => setSubjectPrefixQuery(event.target.value)}
                >
                  <option value="">Department / Major (select)</option>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Course number (e.g. 1337)"
                  value={courseNumberQuery}
                  onChange={(event) => setCourseNumberQuery(event.target.value)}
                />
                <div className="optional-pair">
                  <input
                    type="text"
                    placeholder="Section # (optional, e.g. 001)"
                    value={sectionNumberQuery}
                    onChange={(event) => setSectionNumberQuery(event.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Professor last name (optional)"
                    value={professorLastNameQuery}
                    onChange={(event) => setProfessorLastNameQuery(event.target.value)}
                  />
                </div>
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
