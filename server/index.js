import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import ClassMessage from './models/ClassMessage.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pearedup';
const VERIFICATION_TTL_MINUTES = Number(process.env.VERIFICATION_TTL_MINUTES || 15);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CHAT_PROVIDER = process.env.CHAT_PROVIDER || 'nebula-first';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 0);
const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || 220);
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX || 2048);
const OLLAMA_NUM_THREAD = Number(process.env.OLLAMA_NUM_THREAD || 8);
const NEBULA_API_KEY = process.env.NEBULA_API_KEY || '';
const NEBULA_GENERATIVE_API_KEY = process.env.NEBULA_GENERATIVE_API_KEY || NEBULA_API_KEY;
const NEBULA_DATA_API_KEY = process.env.NEBULA_DATA_API_KEY || NEBULA_API_KEY;
const NEBULA_MODEL = process.env.NEBULA_MODEL || 'gemini-2.0-flash';
const NEBULA_URL =
  process.env.NEBULA_URL || `https://generativelanguage.googleapis.com/v1beta/models/${NEBULA_MODEL}:generateContent`;
const NEBULA_TIMEOUT_MS = Number(process.env.NEBULA_TIMEOUT_MS || 10000);
const NEBULA_METHOD = (process.env.NEBULA_METHOD || 'POST').toUpperCase();
const NEBULA_DATA_BASE_URL = process.env.NEBULA_DATA_BASE_URL || 'https://api.utdnebula.com';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const optionalAuthenticate = (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    req.userId = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
  } catch {
    req.userId = null;
  }
  next();
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isUtdEmail = (email) => String(email || '').toLowerCase().endsWith('@utdallas.edu');
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const createVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

const detectClassFromSyllabus = (courseTitle = '', rawText = '') => {
  const text = `${courseTitle} ${rawText}`.toLowerCase();
  if (!text.trim()) return '';
  if (/computer science|programming|python|java|javascript|data structure|algorithm|software/.test(text)) return 'Computer Science';
  if (/calculus|algebra|geometry|statistics|trigonometry|math/.test(text)) return 'Mathematics';
  if (/biology|genetics|anatomy|physiology|ecology|cell/.test(text)) return 'Biology';
  if (/chemistry|organic chemistry|stoichiometry|molecule|reaction/.test(text)) return 'Chemistry';
  if (/physics|mechanics|thermodynamics|electromagnet|kinematics/.test(text)) return 'Physics';
  if (/economics|microeconomics|macroeconomics|finance|accounting/.test(text)) return 'Economics';
  if (/history|historical|civilization|war studies/.test(text)) return 'History';
  if (/english|literature|composition|creative writing/.test(text)) return 'English';
  return '';
};

const toClassKey = (value = '') => String(value || '').trim().toLowerCase();

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return transporter;
}

async function sendVerificationEmail(email, code) {
  const mailer = getTransporter();

  if (!mailer) {
    throw new Error('Email service is not configured. Set SMTP env vars.');
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your PearedUp verification code',
    text: `Your PearedUp verification code is ${code}. It expires in ${VERIFICATION_TTL_MINUTES} minutes.`
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/sections/search', authenticate, async (req, res) => {
  if (!NEBULA_DATA_API_KEY) {
    return res.status(500).json({ message: 'Nebula API key is not configured.' });
  }

  try {
    const nebulaGet = async (url) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-api-key': NEBULA_DATA_API_KEY
        },
        signal: AbortSignal.timeout(NEBULA_TIMEOUT_MS)
      });

      const data = await response.json().catch(() => ({}));
      return { response, data };
    };

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null && item !== '') {
            params.append(key, String(item));
          }
        }
      } else {
        params.append(key, String(value));
      }
    }

    const subjectPrefix = String(req.query?.['course_details.subject_prefix'] || '').trim().toUpperCase();
    const courseNumber = String(req.query?.['course_details.course_number'] || '').trim();
    const sectionNumber = String(req.query?.section_number || '').trim();
    const offsetValue = String(req.query?.offset || '').trim() || '0';
    let rows = [];
    let responseMeta = {};

    // Prefer course->sections endpoint when department + course number are provided.
    if (subjectPrefix && courseNumber) {
      const courseSectionParams = new URLSearchParams();
      courseSectionParams.set('subject_prefix', subjectPrefix);
      courseSectionParams.set('course_number', courseNumber);
      courseSectionParams.set('former_offset', offsetValue);
      courseSectionParams.set('latter_offset', '0');
      const courseSectionUrl = `${NEBULA_DATA_BASE_URL}/course/sections?${courseSectionParams.toString()}`;
      const { response: courseSectionResponse, data: courseSectionData } = await nebulaGet(courseSectionUrl);
      if (courseSectionResponse.ok) {
        rows = Array.isArray(courseSectionData?.data) ? courseSectionData.data : [];
        responseMeta = courseSectionData || {};
      }
    }

    // Fallback to direct section query path.
    if (rows.length === 0) {
      const directUrl = `${NEBULA_DATA_BASE_URL}/section${params.toString() ? `?${params.toString()}` : ''}`;
      const { response, data } = await nebulaGet(directUrl);
      if (!response.ok) {
        return res.status(response.status).json({
          message: data?.message || 'Failed to fetch sections from Nebula.',
          status: data?.status || response.status
        });
      }
      rows = Array.isArray(data?.data) ? data.data : [];
      responseMeta = data || {};
    }

    // Fallback for course filtering if direct section query returns no rows.
    if (rows.length === 0 && subjectPrefix && courseNumber) {
      const courseParams = new URLSearchParams();
      courseParams.set('subject_prefix', subjectPrefix);
      courseParams.set('course_number', courseNumber);
      const courseUrl = `${NEBULA_DATA_BASE_URL}/course?${courseParams.toString()}`;
      const { response: courseResponse, data: courseData } = await nebulaGet(courseUrl);

      if (courseResponse.ok) {
        const courses = Array.isArray(courseData?.data) ? courseData.data : [];
        const courseRefs = [...new Set(courses.map((course) => String(course?._id || '').trim()).filter(Boolean))];
        if (courseRefs.length > 0) {
          const fallbackRows = [];
          for (const courseRef of courseRefs) {
            const fallbackParams = new URLSearchParams();
            fallbackParams.set('course_reference', courseRef);
            if (offsetValue) fallbackParams.set('offset', offsetValue);
            const sectionUrl = `${NEBULA_DATA_BASE_URL}/section?${fallbackParams.toString()}`;
            const { response: sectionResponse, data: sectionData } = await nebulaGet(sectionUrl);
            if (!sectionResponse.ok) continue;
            const sectionRows = Array.isArray(sectionData?.data) ? sectionData.data : [];
            fallbackRows.push(...sectionRows);
          }
          rows = fallbackRows;
        }
      }
    }

    if (sectionNumber) {
      rows = rows.filter((section) => String(section?.section_number || '').trim() === sectionNumber);
    }

    const seenSectionKeys = new Set();
    rows = rows.filter((section) => {
      const key = section?._id || `${section?.section_number || ''}-${section?.internal_class_number || ''}`;
      if (!key || seenSectionKeys.has(key)) return false;
      seenSectionKeys.add(key);
      return true;
    });

    const objectIdPattern = /^[a-fA-F0-9]{24}$/;

    const enrichedData = rows.map((section) => {
      const professorNamesFromDetails = (Array.isArray(section?.professor_details) ? section.professor_details : [])
        .map((prof) => [prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim())
        .filter(Boolean);

      const professorNamesFromIds = (Array.isArray(section?.professors) ? section.professors : [])
        .filter((value) => typeof value === 'string' && !objectIdPattern.test(value));

      const professorNames = [...new Set([...professorNamesFromDetails, ...professorNamesFromIds])];

      return {
        ...section,
        professor_names: professorNames
      };
    });

    await Promise.all(
      enrichedData.map(async (section) => {
        if (Array.isArray(section.professor_names) && section.professor_names.length > 0) return;
        if (!section?._id) return;
        try {
          const professorsUrl = `${NEBULA_DATA_BASE_URL}/section/${encodeURIComponent(section._id)}/professors`;
          const professorsResponse = await fetch(professorsUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'x-api-key': NEBULA_DATA_API_KEY
            },
            signal: AbortSignal.timeout(NEBULA_TIMEOUT_MS)
          });
          if (!professorsResponse.ok) return;
          const professorsData = await professorsResponse.json().catch(() => ({}));
          const professorRows = Array.isArray(professorsData?.data) ? professorsData.data : [];
          const names = professorRows
            .map((prof) => [prof?.first_name, prof?.last_name].filter(Boolean).join(' ').trim())
            .filter(Boolean);
          if (names.length > 0) {
            section.professor_names = [...new Set(names)];
          }
        } catch {
          // Keep section data even if professor enrichment fails.
        }
      })
    );

    return res.json({
      ...responseMeta,
      data: enrichedData
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Nebula sections request timed out.' });
    }
    return res.status(500).json({ message: 'Failed to fetch sections.' });
  }
});

app.get('/api/clubs/search', authenticate, async (req, res) => {
  if (!NEBULA_DATA_API_KEY) {
    return res.status(500).json({ message: 'Nebula API key is not configured.' });
  }

  try {
    const q = String(req.query?.q || '').trim();
    if (!q) {
      return res.status(400).json({ message: 'Query is required.' });
    }

    const params = new URLSearchParams({ q });
    const url = `${NEBULA_DATA_BASE_URL}/club/search?${params.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': NEBULA_DATA_API_KEY
      },
      signal: AbortSignal.timeout(NEBULA_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.message || 'Failed to fetch clubs from Nebula.',
        status: data?.status || response.status
      });
    }

    return res.json(data);
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Nebula clubs request timed out.' });
    }
    return res.status(500).json({ message: 'Failed to fetch clubs.' });
  }
});

app.get('/api/clubs/:id', authenticate, async (req, res) => {
  if (!NEBULA_DATA_API_KEY) {
    return res.status(500).json({ message: 'Nebula API key is not configured.' });
  }

  try {
    const id = String(req.params?.id || '').trim();
    if (!id) {
      return res.status(400).json({ message: 'Club id is required.' });
    }

    const url = `${NEBULA_DATA_BASE_URL}/club/${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': NEBULA_DATA_API_KEY
      },
      signal: AbortSignal.timeout(NEBULA_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.message || 'Failed to fetch club details from Nebula.',
        status: data?.status || response.status
      });
    }

    return res.json(data);
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Nebula club request timed out.' });
    }
    return res.status(500).json({ message: 'Failed to fetch club.' });
  }
});

async function generateWithNebula(prompt) {
  if (!NEBULA_GENERATIVE_API_KEY) {
    throw new Error('Nebula API key is not configured.');
  }

  const options = {
    method: NEBULA_METHOD,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NEBULA_GENERATIVE_API_KEY,
      'x-goog-api-key': NEBULA_GENERATIVE_API_KEY
    },
    signal: AbortSignal.timeout(NEBULA_TIMEOUT_MS)
  };

  if (NEBULA_METHOD !== 'GET') {
    options.body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 220
      }
    });
  }

  const response = await fetch(NEBULA_URL, options);

  const data = await response.json().catch(() => ({}));
  const reply =
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() ||
    data?.reply ||
    data?.message ||
    (typeof data === 'string' ? data : '');
  if (!response.ok || !reply) {
    const apiMessage = data?.error?.message || 'Nebula request failed.';
    const apiStatus = data?.error?.status || '';
    const err = new Error(apiMessage);
    err.provider = 'nebula';
    err.statusCode = response.status;
    err.apiStatus = apiStatus;
    throw err;
  }

  return reply;
}

async function generateWithOllama(prompt) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      keep_alive: '15m',
      options: {
        num_predict: OLLAMA_NUM_PREDICT,
        num_ctx: OLLAMA_NUM_CTX,
        num_thread: OLLAMA_NUM_THREAD,
        temperature: 0.4,
        top_p: 0.9
      }
    })
  };

  if (OLLAMA_TIMEOUT_MS > 0) {
    requestOptions.signal = AbortSignal.timeout(OLLAMA_TIMEOUT_MS);
  }

  const ollamaResponse = await fetch(OLLAMA_URL, requestOptions);

  const data = await ollamaResponse.json().catch(() => ({}));
  if (!ollamaResponse.ok || !data.response) {
    throw new Error('Ollama request failed.');
  }

  return data.response;
}

app.post('/api/chat', optionalAuthenticate, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  const loweredMessage = message.toLowerCase();

  if (!message) {
    return res.status(400).json({ message: 'Message required.' });
  }

  if (loweredMessage.includes('how do i get a gf')) {
    return res.json({ reply: "😂 HAHA don't make me laugh!" });
  }

  if (loweredMessage.includes('tell me a joke')) {
    return res.json({ reply: 'Your life' });
  }

  const attachmentContext = attachments
    .slice(0, 5)
    .map((item) => {
      const name = String(item?.name || 'file').slice(0, 120);
      const type = String(item?.type || 'unknown').slice(0, 60);
      const snippet = String(item?.textSnippet || '').slice(0, 1800).trim();
      return `Attachment: ${name} (${type})${snippet ? `\nContent snippet:\n${snippet}` : ''}`;
    })
    .join('\n\n');
  const prompt = `You are Gala, a friendly AI assistant. Answer briefly and clearly.\n${attachmentContext ? `${attachmentContext}\n\n` : ''}User: ${message}\nGala:`;
  const providers =
    CHAT_PROVIDER === 'nebula-only'
      ? ['nebula']
      : CHAT_PROVIDER === 'nebula-first'
        ? ['nebula', 'ollama']
        : CHAT_PROVIDER === 'ollama-only'
          ? ['ollama']
          : ['ollama', 'nebula'];

  let lastError = 'No provider configured.';
  let nebulaFailure = '';
  const providerErrors = {};
  try {
    for (const provider of providers) {
      try {
        const reply =
          provider === 'nebula' ? await generateWithNebula(prompt) : await generateWithOllama(prompt);
        const payload = { reply, provider: 'gala', engine: provider };
        if (provider === 'ollama' && nebulaFailure) {
          payload.fallbackFrom = 'nebula';
          payload.fallbackReason = nebulaFailure;
        }
        return res.json(payload);
      } catch (error) {
        lastError = error.message || `${provider} failed`;
        providerErrors[provider] = lastError;
        if (provider === 'nebula') {
          nebulaFailure = lastError;
          console.warn('Nebula failed, fallback to Ollama:', lastError);
        }
      }
    }
    return res.status(502).json({
      message: 'All chat providers failed.',
      detail: providerErrors
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Gala timed out. Increase timeout or try again.' });
    }
    console.error('Ollama error:', error.message);
    return res.status(500).json({ message: 'Something went wrong.' });
  }
});

app.post('/api/auth/request-verification', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isUtdEmail(email)) {
      return res.status(400).json({ message: 'Only @utdallas.edu emails can sign up.' });
    }

    const code = createVerificationCode();
    const verificationCodeHash = hashCode(code);
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);

    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          emailVerified: false,
          verificationCodeHash,
          verificationExpiresAt
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendVerificationEmail(user.email, code);

    return res.json({ message: 'Verification code sent.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send verification code.' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();

    if (!isValidEmail(email) || !code) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const user = await User.findOne({ email });

    if (!user || !user.verificationCodeHash || !user.verificationExpiresAt) {
      return res.status(400).json({ message: 'Verification request not found. Send a new code.' });
    }

    if (new Date() > user.verificationExpiresAt) {
      return res.status(400).json({ message: 'Verification code expired. Send a new code.' });
    }

    if (hashCode(code) !== user.verificationCodeHash) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    user.emailVerified = true;
    user.verificationCodeHash = undefined;
    user.verificationExpiresAt = undefined;
    await user.save();

    return res.json({ message: 'Email verified successfully.' });
  } catch {
    return res.status(500).json({ message: 'Failed to verify email.' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (!isUtdEmail(email)) {
      return res.status(400).json({ message: 'Only @utdallas.edu emails can sign up.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const user = await User.findOne({ email });

    if (!user || !user.emailVerified) {
      return res.status(400).json({ message: 'Verify your email before creating an account.' });
    }

    if (user.passwordHash) {
      return res.status(409).json({ message: 'Account already exists. Please log in.' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    return res.status(201).json({ message: 'Account created successfully.' });
  } catch {
    return res.status(500).json({ message: 'Failed to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Verify your email before logging in.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ message: 'Login successful.', token, userType: user.userType });
  } catch {
    return res.status(500).json({ message: 'Failed to log in.' });
  }
});

app.post('/api/auth/set-user-type', authenticate, async (req, res) => {
  try {
    const userType = req.body.userType;
    if (!['student', 'non-student'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.userType = userType;
    await user.save();
    return res.json({ message: 'User type set successfully' });
  } catch {
    return res.status(500).json({ message: 'Failed to set user type' });
  }
});

app.get('/api/syllabus/foundation', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('syllabusFoundation');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({
      foundation: user.syllabusFoundation || {
        courseTitle: '',
        instructor: '',
        rawText: '',
        detectedClass: '',
        detectionStatus: 'not-started',
        lastUpdatedAt: null
      }
    });
  } catch {
    return res.status(500).json({ message: 'Failed to load syllabus foundation.' });
  }
});

app.post('/api/syllabus/foundation', authenticate, async (req, res) => {
  try {
    const courseTitle = String(req.body?.courseTitle || '').trim().slice(0, 140);
    const instructor = String(req.body?.instructor || '').trim().slice(0, 140);
    const rawText = String(req.body?.rawText || '').trim().slice(0, 20000);

    if (!courseTitle && !rawText) {
      return res.status(400).json({ message: 'Please provide course title or syllabus text.' });
    }

    const detectedClass = detectClassFromSyllabus(courseTitle, rawText);
    const detectionStatus = detectedClass ? 'detected' : 'not-started';

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.syllabusFoundation = {
      courseTitle,
      instructor,
      rawText,
      detectedClass,
      detectionStatus,
      lastUpdatedAt: new Date()
    };

    await user.save();
    return res.json({ message: 'Syllabus foundation saved.', foundation: user.syllabusFoundation });
  } catch {
    return res.status(500).json({ message: 'Failed to save syllabus foundation.' });
  }
});

app.get('/api/connect/classmates', authenticate, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('syllabusFoundation.detectedClass');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const detectedClass = String(me?.syllabusFoundation?.detectedClass || '').trim();
    if (!detectedClass) {
      return res.status(400).json({ message: 'No class detected yet. Save your syllabus first.' });
    }

    const classmates = await User.find({
      _id: { $ne: req.userId },
      userType: 'student',
      'syllabusFoundation.detectedClass': detectedClass
    }).select('email userType syllabusFoundation.detectedClass updatedAt');

    return res.json({ detectedClass, classmates });
  } catch {
    return res.status(500).json({ message: 'Failed to load classmates.' });
  }
});

app.get('/api/connect/messages', authenticate, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('syllabusFoundation.detectedClass');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const detectedClass = String(me?.syllabusFoundation?.detectedClass || '').trim();
    if (!detectedClass) {
      return res.status(400).json({ message: 'No class detected yet. Save your syllabus first.' });
    }

    const classKey = toClassKey(detectedClass);
    const messages = await ClassMessage.find({ classKey }).sort({ createdAt: 1 }).limit(120);
    return res.json({ detectedClass, messages });
  } catch {
    return res.status(500).json({ message: 'Failed to load class messages.' });
  }
});

app.post('/api/connect/messages', authenticate, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const me = await User.findById(req.userId).select('email syllabusFoundation.detectedClass');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const detectedClass = String(me?.syllabusFoundation?.detectedClass || '').trim();
    if (!detectedClass) {
      return res.status(400).json({ message: 'No class detected yet. Save your syllabus first.' });
    }

    const classKey = toClassKey(detectedClass);
    const messageItem = await ClassMessage.create({
      classKey,
      senderId: me._id,
      senderEmail: me.email,
      text: text.slice(0, 600)
    });

    return res.status(201).json({ messageItem });
  } catch {
    return res.status(500).json({ message: 'Failed to send class message.' });
  }
});

app.post('/api/profile', authenticate, async (req, res) => {
  try {
    const major = String(req.body?.major || '').trim().toUpperCase().slice(0, 20);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.major = major;
    await user.save();
    return res.json({ message: 'Profile updated.', major: user.major });
  } catch {
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
});

app.post('/api/auth/delete-account', authenticate, async (req, res) => {
  try {
    const password = String(req.body?.password || '');
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const user = await User.findById(req.userId).select('passwordHash');
    if (!user || !user.passwordHash) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    await ClassMessage.deleteMany({ senderId: req.userId });
    await User.findByIdAndDelete(req.userId);

    return res.json({ message: 'Account deleted.' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete account.' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email userType major syllabusFoundation');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch {
    return res.status(500).json({ message: 'Failed to get user' });
  }
});

app.delete('/api/auth/delete-account', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('_id');
    if (!user) return res.status(404).json({ message: 'User not found' });

    await ClassMessage.deleteMany({ senderId: user._id });
    await User.findByIdAndDelete(user._id);

    return res.json({ message: 'Account deleted successfully.' });
  } catch {
    return res.status(500).json({ message: 'Failed to delete account.' });
  }
});

async function start() {
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
