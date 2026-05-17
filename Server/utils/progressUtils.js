const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

export const computeProgressScore = (goal, actualAchievement, completionDate = null, plannedTarget = undefined) => {
  const planned = toNumber(plannedTarget ?? goal?.target);
  const actual = toNumber(actualAchievement);

  if (goal?.uom === 'Zero-based') {
    return actual === 0 ? 100 : 0;
  }

  if (goal?.uom === 'Timeline') {
    if (!goal?.deadline || !completionDate) return 0;
    return new Date(completionDate) <= new Date(goal.deadline) ? 100 : 0;
  }

  if (goal?.metricDirection === 'Max') {
    if (actual <= 0) return 0;
    return clampScore((planned / actual) * 100);
  }

  if (planned <= 0) return 0;
  return clampScore((actual / planned) * 100);
};
