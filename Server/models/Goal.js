import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    thrustArea: {
      type: String,
      trim: true,
    },
    uom: {
      type: String,
      enum: ['Numeric', 'Percentage', 'Timeline', 'Zero-based'],
      default: 'Numeric',
    },
    metricDirection: {
      type: String,
      enum: ['Min', 'Max'],
      default: 'Min',
    },
    target: {
      type: Number,
      default: 0,
    },
    deadline: {
      type: Date,
    },
    weightage: {
      type: Number,
      required: true,
      min: 10,
      max: 100,
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
      default: 'Draft',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: Date,
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedGroupId: {
      type: String,
      index: true,
    },
    primaryOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readOnlySharedFields: {
      type: [String],
      default: ['title', 'target', 'uom', 'metricDirection', 'deadline'],
    },
  },
  { timestamps: true }
);

const Goal = mongoose.model('Goal', goalSchema);

export default Goal;
