export const chartColors = {
  primary: '#6b6447',
  secondary: '#524d39',
  accent: '#f4f1e8',
  contentBg: '#8b8670',
  collaborativeBg: '#a39f94',
  dark: '#1a1a1a',
  success: '#10b981',
  warning: '#f59e0b',
};

export const normalizeFeatureImportance = (features) => {
  const values = Object.values(features || {});
  const total = values.reduce((sum, value) => sum + value, 0) || 1;

  return Object.entries(features || {})
    .map(([key, value]) => ({
      name: key,
      value,
      percentage: ((value / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);
};
