import { css } from '@emotion/react';
import { Theme } from '@mui/material/styles';

// Flexbox utilities
export const flexCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const flexBetween = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const flexColumn = css`
  display: flex;
  flex-direction: column;
`;

// Text utilities
export const textEllipsis = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const lineClamp = (lines: number) => css`
  display: -webkit-box;
  -webkit-line-clamp: ${lines};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

// Spacing utilities
export const generateSpacing = (theme: Theme) => ({
  m: (value: number) => css`
    margin: ${theme.spacing(value)};
  `,
  mt: (value: number) => css`
    margin-top: ${theme.spacing(value)};
  `,
  mr: (value: number) => css`
    margin-right: ${theme.spacing(value)};
  `,
  mb: (value: number) => css`
    margin-bottom: ${theme.spacing(value)};
  `,
  ml: (value: number) => css`
    margin-left: ${theme.spacing(value)};
  `,
  mx: (value: number) => css`
    margin-left: ${theme.spacing(value)};
    margin-right: ${theme.spacing(value)};
  `,
  my: (value: number) => css`
    margin-top: ${theme.spacing(value)};
    margin-bottom: ${theme.spacing(value)};
  `,
  p: (value: number) => css`
    padding: ${theme.spacing(value)};
  `,
  pt: (value: number) => css`
    padding-top: ${theme.spacing(value)};
  `,
  pr: (value: number) => css`
    padding-right: ${theme.spacing(value)};
  `,
  pb: (value: number) => css`
    padding-bottom: ${theme.spacing(value)};
  `,
  pl: (value: number) => css`
    padding-left: ${theme.spacing(value)};
  `,
  px: (value: number) => css`
    padding-left: ${theme.spacing(value)};
    padding-right: ${theme.spacing(value)};
  `,
  py: (value: number) => css`
    padding-top: ${theme.spacing(value)};
    padding-bottom: ${theme.spacing(value)};
  `,
});

// Position utilities
export const absoluteFill = css`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

export const fixedFill = css`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

// Focus styles
export const focusRing = (theme: Theme) => css`
  outline: none;
  box-shadow: 0 0 0 2px ${theme.palette.primary.main};
  border-radius: ${theme.shape.borderRadius}px;
`;

// Transition utilities
export const transition = (theme: Theme, properties: string[], duration = 200) => css`
  transition: ${properties.map(prop => `${prop} ${duration}ms ${theme.transitions.easing.easeInOut}`).join(', ')};
`;

// Responsive utilities
export const hideOnMobile = (theme: Theme) => css`
  ${theme.breakpoints.down('sm')} {
    display: none;
  }
`;

export const showOnMobile = (theme: Theme) => css`
  display: none;
  ${theme.breakpoints.down('sm')} {
    display: block;
  }
`;

// Dark mode utilities
export const darkMode = (theme: Theme) => css`
  @media (prefers-color-scheme: dark) {
    background-color: ${theme.palette.background.default};
    color: ${theme.palette.text.primary};
  }
`;

// Accessibility utilities
export const visuallyHidden = css`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

// Animation utilities
export const fadeIn = css`
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  animation: fadeIn 200ms ease-in-out;
`;

export const slideIn = (direction: 'left' | 'right' | 'top' | 'bottom' = 'left', distance = '20px') => css`
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate${direction === 'left' || direction === 'right' ? 'X' : 'Y'}(${direction === 'right' || direction === 'bottom' ? distance : `-${distance}`});
    }
    to {
      opacity: 1;
      transform: translate${direction === 'left' || direction === 'right' ? 'X' : 'Y'}(0);
    }
  }
  animation: slideIn 200ms ease-in-out;
`;

// Container query utilities
export const containerQuery = (minWidth: number, styles: string) => css`
  @container (min-width: ${minWidth}px) {
    ${styles}
  }
`;

// Grid utilities
export const grid = (columns: number, gap: number, theme: Theme) => css`
  display: grid;
  grid-template-columns: repeat(${columns}, 1fr);
  gap: ${theme.spacing(gap)};
`;

export const gridColumn = (span: number) => css`
  grid-column: span ${span};
`;

// Shadow utilities
export const elevation = (level: 0 | 1 | 2 | 3 | 4, theme: Theme) => css`
  box-shadow: ${theme.shadows[level]};
`;

// Border utilities
export const roundedCorners = (theme: Theme) => css`
  border-radius: ${theme.shape.borderRadius}px;
`;

// Image utilities
export const aspectRatio = (ratio: number) => css`
  aspect-ratio: ${ratio};
  object-fit: cover;
`;

// Typography utilities
export const fontWeight = (weight: 300 | 400 | 500 | 600 | 700) => css`
  font-weight: ${weight};
`;

// Font size mapping to MUI's typography variants
export const fontSize = (size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl', theme: Theme) => {
  const sizeMap = {
    xs: theme.typography.caption.fontSize,
    sm: theme.typography.body2.fontSize,
    base: theme.typography.body1.fontSize,
    lg: theme.typography.h6.fontSize,
    xl: theme.typography.h5.fontSize,
    '2xl': theme.typography.h4.fontSize,
    '3xl': theme.typography.h3.fontSize,
    '4xl': theme.typography.h2.fontSize,
    '5xl': theme.typography.h1.fontSize,
  };
  return css`
    font-size: ${sizeMap[size]};
  `;
};

// OLED Dark Mode
export const oledDarkMode = (theme: Theme) => css`
  @media (prefers-color-scheme: dark) and (color-gamut: p3) {
    background-color: #000000;
    color: ${theme.palette.text.primary};
  }
`; 