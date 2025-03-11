import React, { ReactNode, createContext, useContext, useMemo, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Global, css } from '@emotion/react';
import { lightTheme, darkTheme } from './theme/index';
import { darkMode, oledDarkMode } from './utils';

type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorMode: 'system',
  setColorMode: () => {},
  isDark: false,
});

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider = ({ children }: ThemeProviderProps) => {
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    const savedMode = localStorage.getItem('colorMode') as ColorMode;
    return savedMode || 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('colorMode', colorMode);
  }, [colorMode]);

  const isDark = useMemo(() => 
    colorMode === 'system' ? systemIsDark : colorMode === 'dark',
    [colorMode, systemIsDark]
  );

  const theme = useMemo(() => 
    isDark ? darkTheme : lightTheme,
    [isDark]
  );

  const contextValue = useMemo(() => ({
    colorMode,
    setColorMode,
    isDark,
  }), [colorMode, isDark]);

  const globalStyles = css`
    :root {
      color-scheme: ${isDark ? 'dark' : 'light'};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body, #root {
      height: 100%;
      width: 100%;
    }
    body {
      font-family: ${theme.typography.fontFamily};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: ${theme.palette.background.default};
      color: ${theme.palette.text.primary};
      line-height: 1.5;
      ${isDark && darkMode(theme)}
      ${isDark && oledDarkMode(theme)}
    }
    input[type=number] {
      -moz-appearance: textfield;
      padding: ${theme.spacing(1.5)};
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }
    img, picture, video, canvas, svg {
      display: block;
      max-width: 100%;
      margin-bottom: ${theme.spacing(2)};
    }
    p {
      margin-bottom: ${theme.spacing(2)};
      overflow-wrap: break-word;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: ${theme.spacing(3)} 0 ${theme.spacing(2)};
      line-height: 1.2;
      overflow-wrap: break-word;
      &:first-child {
        margin-top: 0;
      }
    }
    h1 { margin-bottom: ${theme.spacing(3)}; }
    h2 { margin-bottom: ${theme.spacing(2.5)}; }
    
    a {
      color: inherit;
      text-decoration: none;
      padding: ${theme.spacing(0.5)} 0;
    }
    button {
      font-family: inherit;
      padding: ${theme.spacing(1)} ${theme.spacing(2)};
    }
    input, optgroup, select, textarea {
      font-family: inherit;
      padding: ${theme.spacing(1.5)};
      margin-bottom: ${theme.spacing(2)};
    }
    
    /* Improved container spacing */
    .MuiContainer-root {
      padding-left: ${theme.spacing(3)};
      padding-right: ${theme.spacing(3)};
      margin-bottom: ${theme.spacing(4)};
    }
    
    /* Card spacing */
    .MuiCard-root {
      margin-bottom: ${theme.spacing(3)};
      padding: ${theme.spacing(2)};
    }
    
    /* List spacing */
    .MuiList-root {
      padding-top: ${theme.spacing(1)};
      padding-bottom: ${theme.spacing(1)};
    }
    
    /* Dialog spacing */
    .MuiDialog-paper {
      padding: ${theme.spacing(3)};
    }
    
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    @supports (container-type: inline-size) {
      @container {
        container-type: inline-size;
      }
    }
  `;

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Global styles={globalStyles} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 