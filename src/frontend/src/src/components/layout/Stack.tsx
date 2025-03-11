import React from 'react';
import { styled } from '@mui/material/styles';
import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface StackProps extends BoxProps {
  direction?: 'row' | 'column';
  spacing?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  children: ReactNode;
}

const StyledStack = styled(Box)<StackProps>(({ theme, direction = 'column', spacing = 2, align = 'stretch', justify = 'start', wrap = false }) => ({
  display: 'flex',
  flexDirection: direction,
  gap: theme.spacing(spacing),
  alignItems: align === 'start' ? 'flex-start' : 
              align === 'end' ? 'flex-end' : 
              align === 'center' ? 'center' : 
              'stretch',
  justifyContent: justify === 'start' ? 'flex-start' :
                  justify === 'end' ? 'flex-end' :
                  justify === 'center' ? 'center' :
                  justify === 'between' ? 'space-between' :
                  justify === 'around' ? 'space-around' :
                  'space-evenly',
  flexWrap: wrap ? 'wrap' : 'nowrap',
  width: '100%',
})) as React.ComponentType<StackProps>;

export const Stack = ({ children, ...props }: StackProps) => {
  return (
    <StyledStack {...props}>
      {children}
    </StyledStack>
  );
};

export default Stack; 