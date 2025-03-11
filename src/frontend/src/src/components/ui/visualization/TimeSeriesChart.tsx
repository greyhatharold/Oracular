import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Box, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TimeSeriesChartProps } from '../types';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ChartContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  backgroundColor: theme.palette.mode === 'light' 
    ? COLORS.light.background.primary 
    : COLORS.dark.background.primary,
  borderRadius: 8,
  padding: SPACING.md,
}));

const formatTime = (timestamp: number, timeUnit: string): string => {
  const date = new Date(timestamp);
  switch (timeUnit) {
    case 'minute':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'hour':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'day':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case 'week':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleString();
  }
};

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  yAxisLabel,
  timeUnit = 'hour',
  areaFill = true,
  className,
  style,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    return {
      labels: sortedData.map(d => formatTime(d.timestamp, timeUnit)),
      datasets: [{
        label: yAxisLabel || 'Value',
        data: sortedData.map(d => d.value),
        borderColor: COLORS.primary[500],
        backgroundColor: areaFill 
          ? `${COLORS.primary[500]}33` // 20% opacity
          : 'transparent',
        fill: areaFill,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      }],
    };
  }, [data, timeUnit, yAxisLabel, areaFill]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          font: {
            family: TYPOGRAPHY.fontFamily.primary,
            size: parseInt(TYPOGRAPHY.size.sm),
          },
          color: isDarkMode ? COLORS.dark.text.primary : COLORS.light.text.primary,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDarkMode ? COLORS.dark.background.elevated : COLORS.light.background.primary,
        titleColor: isDarkMode ? COLORS.dark.text.primary : COLORS.light.text.primary,
        bodyColor: isDarkMode ? COLORS.dark.text.secondary : COLORS.light.text.secondary,
        borderColor: isDarkMode ? COLORS.dark.divider : COLORS.light.divider,
        borderWidth: 1,
        padding: SPACING.sm,
        titleFont: {
          family: TYPOGRAPHY.fontFamily.primary,
          size: parseInt(TYPOGRAPHY.size.sm),
          weight: TYPOGRAPHY.weight.medium,
        },
        bodyFont: {
          family: TYPOGRAPHY.fontFamily.primary,
          size: parseInt(TYPOGRAPHY.size.sm),
        },
        callbacks: {
          title: (tooltipItems: any[]) => {
            return tooltipItems[0].label;
          },
          label: (context: any) => {
            return `${yAxisLabel || 'Value'}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: isDarkMode ? COLORS.dark.divider : COLORS.light.divider,
        },
        ticks: {
          font: {
            family: TYPOGRAPHY.fontFamily.primary,
            size: parseInt(TYPOGRAPHY.size.sm),
          },
          color: isDarkMode ? COLORS.dark.text.secondary : COLORS.light.text.secondary,
        },
      },
      y: {
        grid: {
          color: isDarkMode ? COLORS.dark.divider : COLORS.light.divider,
        },
        ticks: {
          font: {
            family: TYPOGRAPHY.fontFamily.primary,
            size: parseInt(TYPOGRAPHY.size.sm),
          },
          color: isDarkMode ? COLORS.dark.text.secondary : COLORS.light.text.secondary,
        },
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel || '',
          font: {
            family: TYPOGRAPHY.fontFamily.primary,
            size: parseInt(TYPOGRAPHY.size.sm),
            weight: TYPOGRAPHY.weight.medium,
          },
          color: isDarkMode ? COLORS.dark.text.primary : COLORS.light.text.primary,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }), [showLegend, yAxisLabel, isDarkMode]);

  return (
    <ChartContainer 
      className={className} 
      style={style}
      height={height}
    >
      <Line data={chartData} options={options} height={height} />
    </ChartContainer>
  );
};

export default TimeSeriesChart; 