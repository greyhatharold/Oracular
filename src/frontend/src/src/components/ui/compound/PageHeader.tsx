import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  useTheme,
  Divider,
  SxProps,
  Theme,
  alpha,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAppTheme } from '../../../styles/ThemeProvider';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  icon?: ReactNode;
  sx?: SxProps<Theme>;
  divider?: boolean;
}

/**
 * A standardized page header component with title, subtitle, breadcrumbs, and action buttons.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  icon,
  sx,
  divider = true,
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();

  return (
    <Box sx={{ mb: 4, ...sx }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 2 }}
        >
          <Link
            component={RouterLink}
            to="/"
            color="inherit"
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              textDecoration: 'none',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
            Home
          </Link>
          
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            
            return isLast ? (
              <Typography
                key={index}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 500,
                }}
              >
                {item.icon && <Box sx={{ mr: 0.5, display: 'flex' }}>{item.icon}</Box>}
                {item.label}
              </Typography>
            ) : (
              <Link
                key={index}
                component={RouterLink}
                to={item.href || '#'}
                color="inherit"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                {item.icon && <Box sx={{ mr: 0.5, display: 'flex' }}>{item.icon}</Box>}
                {item.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Header Content */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
          mb: divider ? 3 : 0,
          mt: breadcrumbs && breadcrumbs.length > 0 ? 1 : 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {icon && (
            <Box 
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.1),
                color: theme.palette.primary.main,
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.borderRadius.lg,
              }}
            >
              {icon}
            </Box>
          )}
          
          <Box>
            <Typography variant="h4" component="h1" fontWeight={700}>
              {title}
            </Typography>
            {subtitle && (
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {actions && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {divider && <Divider sx={{ mt: 3 }} />}
    </Box>
  );
};

export default PageHeader; 