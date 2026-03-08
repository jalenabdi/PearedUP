import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: ''
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    verificationCodeHash: {
      type: String,
      default: undefined
    },
    verificationExpiresAt: {
      type: Date,
      default: undefined
    },
    userType: {
      type: String,
      enum: ['student', 'non-student'],
      default: undefined
    },
    syllabusFoundation: {
      courseTitle: { type: String, default: '' },
      instructor: { type: String, default: '' },
      rawText: { type: String, default: '' },
      detectedClass: { type: String, default: '' },
      detectionStatus: {
        type: String,
        enum: ['not-started', 'detected'],
        default: 'not-started'
      },
      lastUpdatedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
