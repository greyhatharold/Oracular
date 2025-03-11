import { createTheme, Theme, ThemeOptions, alpha } from '@mui/material/styles';
import { colors, typography, spacing, shadows, transitions, breakpoints, borderRadius, zIndex } from './tokens';

// Augment the Theme and ThemeOptions to include custom properties
declare module '@mui/material/styles' {
  interface Theme {
    borderRadius: typeof borderRadius;
  }
  interface ThemeOptions {
    borderRadius?: typeof borderRadius;
  }
  interface Duration {
    fastest: number;
    fast: number;
    normal: number;
    slow: number;
    slowest: number;
  }
  interface Palette {
    neutral?: {
      [key: string | number]: string;
    };
  }
  interface PaletteOptions {
    neutral?: {
      [key: string | number]: string;
    };
  }
}

// Extend button variants
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    glass: true;
  }
}

// Create theme configuration
const createCustomTheme = (mode: 'light' | 'dark'): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
      primary: colors.primary,
      secondary: colors.secondary,
      error: colors.error,
      warning: colors.warning,
      info: colors.info,
      success: colors.success,
      neutral: colors.neutral,
      background: {
        default: isDark ? colors.neutral[900] : colors.neutral[50],
        paper: isDark ? colors.neutral[850] : colors.neutral[0],
      },
      text: {
        primary: isDark ? colors.neutral[100] : colors.neutral[900],
        secondary: isDark ? colors.neutral[300] : colors.neutral[600],
        disabled: isDark ? colors.neutral[500] : colors.neutral[400],
      },
      divider: isDark ? colors.neutral[700] : colors.neutral[200],
      action: {
        active: isDark ? colors.neutral[100] : colors.neutral[900],
        hover: isDark ? `rgba(255, 255, 255, 0.08)` : `rgba(0, 0, 0, 0.04)`,
        selected: isDark ? `rgba(255, 255, 255, 0.16)` : `rgba(0, 0, 0, 0.08)`,
        disabled: isDark ? colors.neutral[500] : colors.neutral[400],
        disabledBackground: isDark ? colors.neutral[700] : colors.neutral[200],
        focus: isDark ? `rgba(255, 255, 255, 0.12)` : `rgba(0, 0, 0, 0.12)`,
      },
    },
    typography: {
      fontFamily: typography.fontFamily.primary,
      h1: {
        fontSize: typography.fontSizes['5xl'],
        fontWeight: typography.fontWeights.bold,
        lineHeight: typography.lineHeights.tight,
        letterSpacing: typography.letterSpacing.tight,
      },
      h2: {
        fontSize: typography.fontSizes['4xl'],
        fontWeight: typography.fontWeights.bold,
        lineHeight: typography.lineHeights.tight,
        letterSpacing: typography.letterSpacing.tight,
      },
      h3: {
        fontSize: typography.fontSizes['3xl'],
        fontWeight: typography.fontWeights.semibold,
        lineHeight: typography.lineHeights.snug,
      },
      h4: {
        fontSize: typography.fontSizes['2xl'],
        fontWeight: typography.fontWeights.semibold,
        lineHeight: typography.lineHeights.snug,
      },
      h5: {
        fontSize: typography.fontSizes.xl,
        fontWeight: typography.fontWeights.semibold,
        lineHeight: typography.lineHeights.normal,
      },
      h6: {
        fontSize: typography.fontSizes.lg,
        fontWeight: typography.fontWeights.semibold,
        lineHeight: typography.lineHeights.normal,
      },
      body1: {
        fontSize: typography.fontSizes.base,
        lineHeight: typography.lineHeights.relaxed,
      },
      body2: {
        fontSize: typography.fontSizes.sm,
        lineHeight: typography.lineHeights.relaxed,
      },
      button: {
        fontSize: typography.fontSizes.sm,
        fontWeight: typography.fontWeights.medium,
        textTransform: 'none',
      },
      caption: {
        fontSize: typography.fontSizes.xs,
        lineHeight: typography.lineHeights.normal,
      },
    },
    spacing: (factor: number) => `${spacing[factor as keyof typeof spacing] || factor * 0.25}rem`,
    breakpoints: {
      values: breakpoints,
    },
    shape: {
      borderRadius: Number(borderRadius.sm.replace('rem', '')) * 16,
    },
    borderRadius,
    shadows: [
      'none',
      shadows.xs,
      shadows.sm,
      shadows.md,
      shadows.lg,
      shadows.xl,
      shadows['2xl'],
      shadows.inner,
      shadows.lg,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
      shadows.xl,
    ] as Theme['shadows'],
    transitions: {
      easing: transitions.easing,
      duration: transitions.duration,
    },
    zIndex,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@media (prefers-color-scheme: dark)': {
            'html, body': {
              backgroundColor: colors.neutral[900],
              color: colors.neutral[100],
            },
          },
          '*': {
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
          },
          html: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            height: '100%',
            width: '100%',
          },
          body: {
            height: '100%',
            width: '100%',
          },
          '#root': {
            height: '100%',
            width: '100%',
          },
          'input[type=number]': {
            MozAppearance: 'textfield',
            '&::-webkit-outer-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
            '&::-webkit-inner-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
          },
          img: {
            maxWidth: '100%',
            height: 'auto',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            padding: `${spacing[2]} ${spacing[4]}`,
            fontWeight: typography.fontWeights.medium,
            boxShadow: 'none',
            ':hover': {
              boxShadow: shadows.sm,
            },
          },
          contained: {
            '&.Mui-disabled': {
              backgroundColor: isDark ? colors.neutral[800] : colors.neutral[200],
              color: isDark ? colors.neutral[600] : colors.neutral[400],
            },
          },
          outlined: {
            borderWidth: '1.5px',
            '&:hover': {
              borderWidth: '1.5px',
            },
          },
          sizeLarge: {
            padding: `${spacing[3]} ${spacing[6]}`,
            fontSize: typography.fontSizes.base,
          },
          sizeSmall: {
            padding: `${spacing[1]} ${spacing[3]}`,
            fontSize: typography.fontSizes.xs,
          },
        },
        variants: [
          {
            props: { variant: 'glass' },
            style: {
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              color: isDark ? colors.neutral[100] : colors.neutral[900],
              boxShadow: shadows.sm,
              '&:hover': {
                backgroundColor: isDark 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(255, 255, 255, 0.95)',
                boxShadow: shadows.md,
              },
            },
          },
        ],
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.xl,
            boxShadow: shadows.sm,
            border: `1px solid ${isDark ? colors.neutral[800] : colors.neutral[200]}`,
            overflow: 'visible',
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: spacing[4],
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: spacing[4],
            '&:last-child': {
              paddingBottom: spacing[4],
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            fontWeight: typography.fontWeights.medium,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? colors.neutral[500] : colors.neutral[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary.main,
              borderWidth: 2,
            },
          },
          notchedOutline: {
            borderColor: isDark ? colors.neutral[700] : colors.neutral[300],
            transition: 'border-color 0.2s ease-in-out',
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            marginBottom: spacing[1],
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isDark ? colors.neutral[800] : colors.neutral[200]}`,
          },
          head: {
            fontWeight: typography.fontWeights.semibold,
            backgroundColor: isDark ? colors.neutral[850] : colors.neutral[50],
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: borderRadius.xl,
            boxShadow: shadows.xl,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? colors.neutral[800] : colors.neutral[200],
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: colors.primary.main,
            textDecoration: 'none',
            fontWeight: typography.fontWeights.medium,
            '&:hover': {
              textDecoration: 'underline',
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(colors.primary.main, 0.2) : alpha(colors.primary.main, 0.1),
              '&:hover': {
                backgroundColor: isDark ? alpha(colors.primary.main, 0.3) : alpha(colors.primary.main, 0.2),
              },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: borderRadius.md,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  };
};

export const lightTheme = createTheme(createCustomTheme('light'));
export const darkTheme = createTheme(createCustomTheme('dark')); 