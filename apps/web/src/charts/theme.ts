/**
 * ECharts theme definitions — professional blue/white palette.
 * Registered at app startup via ThemeContext.
 */

const FONT_FAMILY = "'Inter', system-ui, -apple-system, sans-serif";

export const CHART_COLORS = [
  '#2563eb', // blue
  '#7c3aed', // violet
  '#d97706', // amber
  '#0891b2', // cyan
  '#be185d', // pink
  '#ea580c', // orange
  '#16a34a', // green
  '#6d28d9', // purple
];

function makeTheme(mode: 'dark' | 'light') {
  const light = mode === 'light';

  const textPrimary   = light ? '#0f1a2e' : '#e2e8f4';
  const textSecondary = light ? '#4a5568' : '#8a97b0';
  const borderColor   = light ? '#dde3ed' : '#2a3347';
  const borderSubtle  = light ? '#e8edf5' : '#1f2a3c';
  const surface3      = light ? '#f1f5f9' : '#232d42';
  const tooltipBorder = light ? '#dde3ed' : '#2a3347';

  return {
    color: CHART_COLORS,
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FONT_FAMILY, color: textPrimary },

    title: {
      textStyle: { color: textPrimary, fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 14 },
      subtextStyle: { color: textSecondary, fontFamily: FONT_FAMILY },
    },

    legend: {
      textStyle: { color: textSecondary, fontFamily: FONT_FAMILY, fontSize: 12 },
    },

    tooltip: {
      backgroundColor: light ? '#ffffff' : surface3,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: { color: textPrimary, fontFamily: FONT_FAMILY, fontSize: 12 },
      extraCssText: `border-radius: 8px; box-shadow: 0 4px 16px rgba(15,26,46,.12);`,
    },

    axisPointer: {
      lineStyle: { color: borderColor, width: 1 },
      crossStyle: { color: borderColor },
      label: { backgroundColor: surface3, borderColor: tooltipBorder, color: textPrimary },
    },

    categoryAxis: {
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { lineStyle: { color: borderColor } },
      axisLabel: { color: textSecondary, fontFamily: FONT_FAMILY, fontSize: 11 },
      splitLine: { lineStyle: { color: borderSubtle, opacity: 0.6 } },
    },

    valueAxis: {
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textSecondary, fontFamily: FONT_FAMILY, fontSize: 11 },
      splitLine: { lineStyle: { color: borderSubtle, opacity: 0.6 } },
    },

    grid: {
      borderColor,
    },

    line: {
      lineStyle: { width: 2 },
      symbolSize: 4,
      smooth: false,
    },

    bar: {
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
  };
}

export const lightTheme = makeTheme('light');
export const darkTheme  = makeTheme('dark');
