import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema(
  {
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
    },
    quarter: {
      type: String,
      required: true,
    },
    plannedTarget: {
      type: Number,
      default: 0,
    },
    actualAchievement: {
      type: Number,
      default: 0,
    },
    completionDate: {
      type: Date,
    },
    progressScore: {
      type: Number,
      default: 0,
    },
    comment: {
      type: String,
      trim: true,
    },
    managerComment: {
      type: String,
      trim: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    checkinDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const CheckIn = mongoose.model('CheckIn', checkInSchema);

export default CheckIn;
