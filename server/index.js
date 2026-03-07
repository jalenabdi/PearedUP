import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pearedup';
const VERIFICATION_TTL_MINUTES = Number(process.env.VERIFICATION_TTL_MINUTES || 15);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);

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

    return res.json({ message: 'Login successful.' });
  } catch {
    return res.status(500).json({ message: 'Failed to log in.' });
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
