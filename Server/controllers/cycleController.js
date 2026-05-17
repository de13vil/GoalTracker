import CycleSettings from '../models/CycleSettings.js';

export const getCycleSettings = async (req, res) => {
  try {
    const settings = await CycleSettings.findOne({ isActive: true }).sort({ updatedAt: -1 });
    if (!settings) {
      return res.json({
        settings: {
          phase1Months: [4, 5],
          q1Months: [6, 7, 8],
          q2Months: [9, 10, 11],
          q3Months: [0, 1],
          q4Months: [2, 3],
        },
      });
    }

    return res.json({ settings });
  } catch (error) {
    console.error('Get cycle settings error:', error);
    return res.status(500).json({ message: 'Server error while loading cycle settings' });
  }
};

export const upsertCycleSettings = async (req, res) => {
  try {
    const { phase1Months, q1Months, q2Months, q3Months, q4Months } = req.body;

    const settings = await CycleSettings.findOneAndUpdate(
      { isActive: true },
      {
        phase1Months,
        q1Months,
        q2Months,
        q3Months,
        q4Months,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Cycle settings updated', settings });
  } catch (error) {
    console.error('Update cycle settings error:', error);
    return res.status(500).json({ message: 'Server error while updating cycle settings' });
  }
};
