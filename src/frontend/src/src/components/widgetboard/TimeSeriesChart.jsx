import React, { useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useTheme } from '@mui/material/styles';
import { useAppTheme } from '../../styles/ThemeProvider';
import { alpha } from '@mui/material/styles';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const TimeSeriesChart = ({
  data,
  title,
  height = 350,
  showLegend = true,
  yAxisLabel,
  timeUnit = 'hour',
  fillArea = true,
  loading = false,
  error = null
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      mode: 'nearest',
      intersect: false
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeUnit,
          tooltipFormat: 'PPp',
          displayFormats: {
            millisecond: 'HH:mm:ss.SSS',
            second: 'HH:mm:ss',
            minute: 'HH:mm',
            hour: 'ha',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
            quarter: 'MMM yyyy',
            year: 'yyyy'
          }
        },
        grid: {
          display: true,
          drawBorder: false,
          color: alpha(theme.palette.divider, 0.1),
          z: 0,
          lineWidth: 1
        },
        ticks: {
          color: theme.palette.text.secondary,
          padding: 8,
          maxRotation: 0
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          color: alpha(theme.palette.divider, 0.1),
          drawBorder: false,
          lineWidth: 1,
          z: 0
        },
        ticks: {
          color: theme.palette.text.secondary,
          padding: 10
        },
        border: {
          display: false
        },
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          color: theme.palette.text.primary,
          font: {
            size: 12,
            weight: 'normal'
          },
          padding: { top: 0, bottom: 10 }
        }
      }
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        align: 'end',
        labels: {
          color: theme.palette.text.primary,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          boxWidth: 6,
          boxHeight: 6,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? alpha(theme.palette.background.paper, 0.9) : alpha('#fff', 0.9),
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        cornerRadius: 8,
        usePointStyle: true,
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        shadowBlur: 10,
        shadowColor: alpha(theme.palette.common.black, 0.1),
        shadowOffsetY: 4,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${typeof value === 'number' ? value.toFixed(2) : value}`;
          },
          labelColor: (context) => {
            return {
              backgroundColor: context.dataset.borderColor,
              borderColor: context.dataset.borderColor,
              borderWidth: 2,
              borderRadius: 4
            };
          }
        }
      }
    }
  }), [theme, timeUnit, yAxisLabel, showLegend, isDark]);

  const chartData = useMemo(() => ({
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      fill: fillArea,
      tension: 0.4,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBorderWidth: 2,
      pointBackgroundColor: '#fff',
      pointHoverBackgroundColor: dataset.borderColor,
      backgroundColor: alpha(dataset.backgroundColor || dataset.borderColor, 0.15)
    }))
  }), [data, fillArea]);

  if (loading) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress size={30} thickness={4} color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography color="error" variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height, position: 'relative', p: 1 }}>
      {title && (
        <Typography
          variant="subtitle1"
          sx={{
            position: 'absolute',
            top: theme.spacing(2),
            left: theme.spacing(2),
            zIndex: 2,
            fontWeight: 600
          }}
        >
          {title}
        </Typography>
      )}
      <Line data={chartData} options={chartOptions} />
    </Box>
  );
};

export default TimeSeriesChart; 