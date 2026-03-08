import mongoose from 'mongoose';

const classMessageSchema = new mongoose.Schema(
  {
    classKey: {
      type: String,
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    senderEmail: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600
    }
  },
  { timestamps: true }
);

export default mongoose.model('ClassMessage', classMessageSchema);
