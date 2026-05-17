import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
    },
    actual: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Not Started', 'On Track', 'Completed'],
      default: 'On Track',
    },
    quarter: {
      type: String,
      required: true,
    },
    completionDate: {
      type: Date,
    },
    progressScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement;
