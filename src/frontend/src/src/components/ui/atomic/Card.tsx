import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  IconButton,
  Box,
  CardProps as MuiCardProps,
  Skeleton,
  Chip,
  useTheme,
  Menu,
  MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface CustomCardProps extends Omit<MuiCardProps, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  showMoreOptions?: boolean;
  onMoreOptionsClick?: () => void;
  actions?: React.ReactNode;
  noPadding?: boolean;
  loading?: boolean;
  cardStyle?: 'default' | 'outlined' | 'elevated';
  tags?: Array<{ label: string; color?: string }>;
  hoverEffect?: boolean;
  contentHeight?: string | number;
  children: React.ReactNode;
}

const StyledCard = styled(MuiCard)<{ 
  $cardStyle?: string; 
  $hoverEffect?: boolean;
}>(({ theme, $cardStyle, $hoverEffect }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  ...$cardStyle === 'elevated' && {
    boxShadow: theme.shadows[3],
  },
  ...$cardStyle === 'outlined' && {
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
  },
  ...($hoverEffect && {
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[4],
      '&::after': {
        opacity: 1,
      },
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      boxShadow: `0 4px 20px ${theme.palette.mode === 'dark' 
        ? 'rgba(0, 0, 0, 0.5)' 
        : 'rgba(0, 0, 0, 0.1)'}`,
      borderRadius: 'inherit',
      opacity: 0,
      transition: 'opacity 0.2s ease-in-out',
      pointerEvents: 'none',
    },
  }),
}));

const StyledCardContent = styled(CardContent)<{ 
  $noPadding?: boolean;
  $contentHeight?: string | number;
}>(({ theme, $noPadding, $contentHeight }) => ({
  flexGrow: 1,
  padding: $noPadding ? 0 : theme.spacing(2),
  height: $contentHeight,
  overflow: $contentHeight ? 'auto' : 'visible',
  '&:last-child': {
    paddingBottom: $noPadding ? 0 : theme.spacing(2),
  },
}));

const TagsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  padding: theme.spacing(0, 2, 1),
}));

export const Card: React.FC<CustomCardProps> = ({
  title,
  subtitle,
  headerAction,
  showMoreOptions = false,
  onMoreOptionsClick,
  actions,
  children,
  noPadding = false,
  loading = false,
  cardStyle = 'default',
  tags,
  hoverEffect = true,
  contentHeight,
  ...props
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <StyledCard $cardStyle={cardStyle} $hoverEffect={false} {...props}>
        <CardHeader
          title={<Skeleton height={24} width="60%" />}
          subheader={<Skeleton height={20} width="40%" />}
        />
        <StyledCardContent $noPadding={noPadding} $contentHeight={contentHeight}>
          <Skeleton height={100} />
          <Skeleton height={20} width="80%" />
          <Skeleton height={20} width="60%" />
        </StyledCardContent>
      </StyledCard>
    );
  }

  return (
    <StyledCard $cardStyle={cardStyle} $hoverEffect={hoverEffect} {...props}>
      {(title || subtitle || headerAction || showMoreOptions) && (
        <CardHeader
          title={
            title && (
              <Typography variant="h6" component="div">
                {title}
              </Typography>
            )
          }
          subheader={subtitle}
          action={
            <Box>
              {headerAction}
              {showMoreOptions && (
                <IconButton 
                  onClick={onMoreOptionsClick} 
                  size="small"
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <MoreVertIcon />
                </IconButton>
              )}
            </Box>
          }
        />
      )}
      <StyledCardContent $noPadding={noPadding} $contentHeight={contentHeight}>
        {children}
      </StyledCardContent>
      {tags && tags.length > 0 && (
        <TagsContainer>
          {tags.map((tag, index) => (
            <Chip
              key={index}
              label={tag.label}
              size="small"
              color={tag.color as any || "default"}
              variant="outlined"
            />
          ))}
        </TagsContainer>
      )}
      {actions && <CardActions>{actions}</CardActions>}
    </StyledCard>
  );
};

export default Card; 