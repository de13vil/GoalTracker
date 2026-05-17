import CycleSettings from '../models/CycleSettings.js';

const defaultCycle = {
  phase1Months: [4, 5],
  q1Months: [6, 7, 8],
  q2Months: [9, 10, 11],
  q3Months: [0, 1],
  q4Months: [2, 3],
};

export const getCycleSettings = async () => {
  const settings = await CycleSettings.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
  return settings || defaultCycle;
};

export const isGoalSettingWindowOpen = async () => {
  const settings = await getCycleSettings();
  const month = new Date().getMonth();
  return settings.phase1Months.includes(month);
};

export const isQuarterWindowOpen = async (quarter) => {
  const settings = await getCycleSettings();
  const month = new Date().getMonth();

  if (quarter === 'Q1') return settings.q1Months.includes(month);
  if (quarter === 'Q2') return settings.q2Months.includes(month);
  if (quarter === 'Q3') return settings.q3Months.includes(month);
  if (quarter === 'Q4') return settings.q4Months.includes(month);
  return false;
};
