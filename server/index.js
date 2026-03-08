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
const OLLAMA_NUM_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || 512);
const NEBULA_API_KEY = process.env.NEBULA_API_KEY || '';
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

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const createVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

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
  if (!NEBULA_API_KEY) {
    return res.status(500).json({ message: 'Nebula API key is not configured.' });
  }

  try {
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

    const url = `${NEBULA_DATA_BASE_URL}/section${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': NEBULA_API_KEY
      },
      signal: AbortSignal.timeout(NEBULA_TIMEOUT_MS)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.message || 'Failed to fetch sections from Nebula.',
        status: data?.status || response.status
      });
    }

    return res.json(data);
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return res.status(504).json({ message: 'Nebula sections request timed out.' });
    }
    return res.status(500).json({ message: 'Failed to fetch sections.' });
  }
});

async function generateWithNebula(prompt) {
  if (!NEBULA_API_KEY) {
    throw new Error('Nebula API key is not configured.');
  }

  const options = {
    method: NEBULA_METHOD,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NEBULA_API_KEY,
      'x-goog-api-key': NEBULA_API_KEY
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

app.post('/api/chat', authenticate, async (req, res) => {
  const message = String(req.body?.message || '').trim();
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

  const prompt = `You are Gala, a friendly AI assistant. Answer clearly.\nUser: ${message}\nGala:`;
  const providers =
    CHAT_PROVIDER === 'ollama-only'
      ? ['ollama']
      : CHAT_PROVIDER === 'nebula-only'
        ? ['nebula']
        : ['nebula', 'ollama'];

  let lastError = 'No provider configured.';
  let nebulaFailure = '';
  const providerErrors = {};
  try {
    for (const provider of providers) {
      try {
        const reply =
          provider === 'nebula' ? await generateWithNebula(prompt) : await generateWithOllama(prompt);
        const payload = { reply, provider };
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

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email userType');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch {
    return res.status(500).json({ message: 'Failed to get user' });
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
