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
    }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
