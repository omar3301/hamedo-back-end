import mongoose from 'mongoose';

const notificationJobSchema = new mongoose.Schema({
  // The order data needed to build the message
  order: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Job status
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed'],
    default: 'pending',
    index: true,
  },

  // Retry tracking
  attempts:  { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },

  // Next time to try (for exponential backoff)
  runAt: { type: Date, default: Date.now, index: true },

  // Error log
  lastError: { type: String, default: '' },
  errorLog:  [{ at: Date, message: String }],

}, { timestamps: true });

// Index for the worker query — find pending jobs that are ready to run
notificationJobSchema.index({ status: 1, runAt: 1 });

export default mongoose.model('NotificationJob', notificationJobSchema);
