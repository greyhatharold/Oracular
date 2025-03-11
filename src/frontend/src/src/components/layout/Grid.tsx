import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface GridProps extends BoxProps {
  columns?: number | string | { [key: string]: number | string };
  rows?: number | string;
  gap?: number | string;
  columnGap?: number | string;
  rowGap?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'stretch';
  children: ReactNode;
}

interface GridStyles {
  display: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gap: string | number;
  columnGap?: string | number;
  rowGap?: string | number;
  alignItems: string;
  justifyItems: string;
  width: string;
  [key: string]: any; // For media queries
}

const StyledGrid = styled(Box)<GridProps>(({ 
  theme, 
  columns = 12, 
  rows, 
  gap = 2,
  columnGap,
  rowGap,
  align = 'stretch',
  justify = 'stretch'
}) => {
  // Handle responsive columns
  const getGridTemplateColumns = () => {
    if (typeof columns === 'number') {
      return { gridTemplateColumns: `repeat(${columns}, 1fr)` };
    }
    if (typeof columns === 'string') {
      return { gridTemplateColumns: columns };
    }
    // Handle breakpoint object
    const mediaQueries = Object.entries(columns).reduce<Record<string, { gridTemplateColumns: string }>>((acc, [breakpoint, value]) => {
      const breakpointValue = theme.breakpoints.values[breakpoint as keyof typeof theme.breakpoints.values];
      if (breakpointValue !== undefined) {
        acc[`@media (min-width: ${breakpointValue}px)`] = {
          gridTemplateColumns: typeof value === 'number' ? `repeat(${value}, 1fr)` : value,
        };
      }
      return acc;
    }, {});

    return {
      gridTemplateColumns: 'repeat(1, 1fr)', // Default for mobile
      ...mediaQueries,
    };
  };

  const styles: GridStyles = {
    display: 'grid',
    ...getGridTemplateColumns(),
    ...(rows && { gridTemplateRows: typeof rows === 'number' ? `repeat(${rows}, 1fr)` : rows }),
    gap: theme.spacing(gap),
    ...(columnGap !== undefined && { columnGap: theme.spacing(columnGap) }),
    ...(rowGap !== undefined && { rowGap: theme.spacing(rowGap) }),
    alignItems: align === 'start' ? 'flex-start' : 
                align === 'end' ? 'flex-end' : 
                align === 'center' ? 'center' : 
                'stretch',
    justifyItems: justify === 'start' ? 'flex-start' :
                  justify === 'end' ? 'flex-end' :
                  justify === 'center' ? 'center' :
                  'stretch',
    width: '100%',
  };

  return styles;
}) as React.ComponentType<GridProps>;

interface GridItemProps extends BoxProps {
  colSpan?: number | { [key: string]: number };
  rowSpan?: number;
  children: ReactNode;
}

interface GridItemStyles {
  gridColumn?: string;
  gridRow: string;
  [key: string]: any; // For media queries
}

const StyledGridItem = styled(Box)<GridItemProps>(({ theme, colSpan = 1, rowSpan = 1 }) => {
  // Handle responsive column spans
  const getGridColumn = () => {
    if (typeof colSpan === 'number') {
      return { gridColumn: `span ${colSpan}` };
    }
    // Handle breakpoint object
    const mediaQueries = Object.entries(colSpan).reduce<Record<string, { gridColumn: string }>>((acc, [breakpoint, value]) => {
      const breakpointValue = theme.breakpoints.values[breakpoint as keyof typeof theme.breakpoints.values];
      if (breakpointValue !== undefined) {
        acc[`@media (min-width: ${breakpointValue}px)`] = {
          gridColumn: `span ${value}`,
        };
      }
      return acc;
    }, {});

    return {
      gridColumn: 'span 1', // Default for mobile
      ...mediaQueries,
    };
  };

  const styles: GridItemStyles = {
    ...getGridColumn(),
    gridRow: `span ${rowSpan}`,
  };

  return styles;
}) as React.ComponentType<GridItemProps>;

export const Grid = ({ children, ...props }: GridProps) => {
  return (
    <StyledGrid {...props}>
      {children}
    </StyledGrid>
  );
};

export const GridItem = ({ children, ...props }: GridItemProps) => {
  return (
    <StyledGridItem {...props}>
      {children}
    </StyledGridItem>
  );
};

const GridComponents = {
  Grid,
  GridItem,
};

export default GridComponents; 