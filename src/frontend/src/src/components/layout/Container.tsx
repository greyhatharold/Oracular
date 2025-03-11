import React from 'react';
import { styled } from '@mui/material/styles';
import { Container as MuiContainer, ContainerProps as MuiContainerProps } from '@mui/material';
import { ReactNode } from 'react';

interface ContainerProps extends MuiContainerProps {
  children: ReactNode;
}

const StyledContainer = styled(MuiContainer)<ContainerProps>(({ theme }) => ({
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  boxSizing: 'border-box',
  [theme.breakpoints.up('xs')]: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    maxWidth: '100%',
  },
  [theme.breakpoints.up('sm')]: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    maxWidth: '100%',
  },
  [theme.breakpoints.up('md')]: {
    maxWidth: '100%',
  },
  [theme.breakpoints.up('lg')]: {
    maxWidth: '100%',
  },
  [theme.breakpoints.up('xl')]: {
    maxWidth: '100%',
  },
  '&.MuiContainer-disableGutters': {
    paddingLeft: 0,
    paddingRight: 0,
  },
})) as React.ComponentType<ContainerProps>;

export const Container = ({ children, ...props }: ContainerProps) => {
  return (
    <StyledContainer {...props}>
      {children}
    </StyledContainer>
  );
};

export default Container; 