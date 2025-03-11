import React from 'react';
import { Box, Typography, useTheme, alpha, IconButton } from '@mui/material';
import OracleDesigner from '../components/oracle/OracleDesigner';
import { PageHeader } from '../components/ui';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ChatIcon from '@mui/icons-material/Chat';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { OracleSpecification } from '../components/oracle/types';

interface OracleProps {}

const Oracle: React.FC<OracleProps> = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [specification, setSpecification] = React.useState<OracleSpecification | undefined>(undefined);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  const handleSpecificationUpdate = (newSpec: OracleSpecification) => {
    setSpecification(newSpec);
  };

  const handleReturn = () => {
    navigate(-1);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        background: 'linear-gradient(145deg, #1a1f2c 0%, #2d364d 100%)',
        position: 'relative',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '16px',
        padding: '16px',
        paddingTop: '80px',
        boxSizing: 'border-box',
      }}
    >
      {/* Return Button */}
      <IconButton
        onClick={handleReturn}
        sx={{
          position: 'fixed',
          top: '24px',
          left: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          zIndex: 2,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      {/* Enhanced Dynamic Light Effects */}
      <Box
        sx={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(ellipse at center, 
              rgba(114,167,255,0.15) 0%, 
              rgba(114,167,255,0.08) 30%,
              rgba(114,167,255,0.03) 50%,
              rgba(114,167,255,0) 70%)
          `,
          transform: 'rotate(-12deg)',
          pointerEvents: 'none',
          animation: 'pulse 10s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': { opacity: 0.3, transform: 'rotate(-12deg) scale(1)' },
            '50%': { opacity: 0.6, transform: 'rotate(-12deg) scale(1.05)' },
            '100%': { opacity: 0.3, transform: 'rotate(-12deg) scale(1)' },
          },
          zIndex: 0,
        }}
      />

      {/* Chat Container */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          height: 'calc(100vh - 96px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          }}
        >
          <ChatIcon 
            sx={{ 
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.9)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }} 
          />
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: 'white',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Oracle Designer Chat
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginTop: '4px',
              }}
            >
              Design and configure your oracle through natural conversation
            </Typography>
          </Box>
        </Box>

        {/* Main Chat Area */}
        <Box
          sx={{
            flex: 1,
            borderRadius: '24px',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': {
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
              transform: 'translateY(-2px)',
              transition: 'all 0.3s ease-in-out',
            },
          }}
        >
          <OracleDesigner
            initialSpecification={specification}
            onSpecificationUpdate={handleSpecificationUpdate}
            className="h-full w-full"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Oracle;