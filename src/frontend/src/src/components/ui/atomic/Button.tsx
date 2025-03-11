import React from 'react';
import { styled } from '@mui/material/styles';
import { ButtonBase } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { ButtonProps } from '../types';
import { TYPOGRAPHY, SPACING, ANIMATION, BORDER_RADIUS } from '../constants';

const StyledButton = styled(ButtonBase, {
  shouldForwardProp: (prop) => 
    !['variant', 'color', 'size', 'fullWidth', 'loading'].includes(prop as string),
})<ButtonProps>(({ theme, variant = 'contained', color = 'primary', size = 'md', fullWidth, disabled }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  boxSizing: 'border-box',
  WebkitTapHighlightColor: 'transparent',
  outline: 0,
  border: 0,
  margin: 0,
  cursor: disabled ? 'default' : 'pointer',
  userSelect: 'none',
  verticalAlign: 'middle',
  appearance: 'none',
  textDecoration: 'none',
  fontFamily: TYPOGRAPHY.fontFamily.primary,
  fontWeight: TYPOGRAPHY.weight.medium,
  fontSize: TYPOGRAPHY.size[size],
  lineHeight: TYPOGRAPHY.lineHeight.normal,
  minWidth: fullWidth ? '100%' : 64,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  borderRadius: BORDER_RADIUS.md,
  transition: `all ${ANIMATION.duration.short}ms ${ANIMATION.easing.easeInOut}`,

  // Size variants
  ...(size === 'xs' && {
    padding: `${SPACING.xxs}px ${SPACING.xs}px`,
    fontSize: TYPOGRAPHY.size.xs,
  }),
  ...(size === 'sm' && {
    padding: `${SPACING.xs}px ${SPACING.sm}px`,
    fontSize: TYPOGRAPHY.size.sm,
  }),
  ...(size === 'lg' && {
    padding: `${SPACING.md}px ${SPACING.lg}px`,
    fontSize: TYPOGRAPHY.size.lg,
  }),
  ...(size === 'xl' && {
    padding: `${SPACING.lg}px ${SPACING.xl}px`,
    fontSize: TYPOGRAPHY.size.xl,
  }),

  // Variant styles
  ...(variant === 'contained' && {
    backgroundColor: theme.palette[color].main,
    color: theme.palette[color].contrastText,
    boxShadow: theme.shadows[2],
    '&:hover': {
      backgroundColor: theme.palette[color].dark,
      boxShadow: theme.shadows[4],
    },
    '&:active': {
      boxShadow: theme.shadows[8],
    },
    ...(disabled && {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
      boxShadow: 'none',
    }),
  }),

  ...(variant === 'outlined' && {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.palette[color].main}`,
    color: theme.palette[color].main,
    '&:hover': {
      backgroundColor: theme.palette[color].light + '1A', // 10% opacity
    },
    ...(disabled && {
      border: `1px solid ${theme.palette.action.disabled}`,
      color: theme.palette.action.disabled,
    }),
  }),

  ...(variant === 'text' && {
    backgroundColor: 'transparent',
    color: theme.palette[color].main,
    '&:hover': {
      backgroundColor: theme.palette[color].light + '1A', // 10% opacity
    },
    ...(disabled && {
      color: theme.palette.action.disabled,
    }),
  }),
}));

const LoadingWrapper = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});

const ContentWrapper = styled('div')<{ loading?: boolean }>(({ loading }) => ({
  display: 'flex',
  alignItems: 'center',
  visibility: loading ? 'hidden' : 'visible',
  '& > *:not(:first-child)': {
    marginLeft: SPACING.xs,
  },
}));

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    children,
    startIcon,
    endIcon,
    loading,
    disabled,
    onClick,
    ...rest
  } = props;

  const handleClick = () => {
    if (!loading && onClick) {
      onClick();
    }
  };

  return (
    <StyledButton
      ref={ref}
      disabled={disabled || loading}
      onClick={handleClick}
      {...rest}
    >
      {loading && (
        <LoadingWrapper>
          <CircularProgress
            size={20}
            color="inherit"
          />
        </LoadingWrapper>
      )}
      <ContentWrapper loading={loading}>
        {startIcon}
        {children}
        {endIcon}
      </ContentWrapper>
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button; 