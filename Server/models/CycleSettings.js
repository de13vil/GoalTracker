import mongoose from 'mongoose';

const cycleSettingsSchema = new mongoose.Schema(
  {
    phase1Months: { type: [Number], default: [4, 5] },
    q1Months: { type: [Number], default: [6, 7, 8] },
    q2Months: { type: [Number], default: [9, 10, 11] },
    q3Months: { type: [Number], default: [0, 1] },
    q4Months: { type: [Number], default: [2, 3] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const CycleSettings = mongoose.model('CycleSettings', cycleSettingsSchema);

export default CycleSettings;
