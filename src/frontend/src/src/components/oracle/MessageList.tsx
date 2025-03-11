import React from 'react';
import { Message } from './types';
import { Box, Typography, Avatar, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, error }) => {
  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'user':
        return <PersonIcon />;
      case 'system':
        return <SmartToyIcon />;
      case 'specification':
        return <SettingsIcon />;
      case 'clarification':
        return <HelpIcon />;
      case 'explanation':
        return <InfoIcon />;
      default:
        return <SmartToyIcon />;
    }
  };

  const getMessageStyle = (type: Message['type']) => {
    const baseStyles = {
      borderRadius: '16px',
      p: 2,
      mb: 2,
      maxWidth: '85%',
      position: 'relative',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    };

    switch (type) {
      case 'user':
        return {
          ...baseStyles,
          ml: 'auto',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderTopRightRadius: '4px',
        };
      case 'system':
        return {
          ...baseStyles,
          mr: 'auto',
          backgroundColor: 'rgba(45, 212, 191, 0.2)',
          borderTopLeftRadius: '4px',
        };
      case 'specification':
        return {
          ...baseStyles,
          mx: 'auto',
          width: '100%',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          borderRadius: '12px',
        };
      case 'clarification':
        return {
          ...baseStyles,
          mr: 'auto',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderTopLeftRadius: '4px',
        };
      case 'explanation':
        return {
          ...baseStyles,
          mr: 'auto',
          backgroundColor: 'rgba(45, 212, 191, 0.1)',
          borderTopLeftRadius: '4px',
        };
      default:
        return baseStyles;
    }
  };

  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'specification':
        return (
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
              Oracle Specification
            </Typography>
            <Box
              component="pre"
              sx={{
                width: '100%',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)',
                p: 2,
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                '&::-webkit-scrollbar': {
                  width: '6px',
                  height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                },
              }}
            >
              {JSON.stringify(message.content, null, 2)}
            </Box>
          </Box>
        );
      case 'clarification':
        return (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
              Clarification Questions
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {Array.isArray(message.content) && message.content.map((question, index) => (
                <Typography
                  key={index}
                  component="li"
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    mb: 0.5,
                    '&:last-child': { mb: 0 },
                  }}
                >
                  {question}
                </Typography>
              ))}
            </Box>
          </Box>
        );
      case 'explanation':
        return (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
              Explanations
            </Typography>
            {typeof message.content === 'object' && Object.entries(message.content).map(([key, value]) => (
              <Box key={key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5 }}>
                  {key.replace('_', ' ')}
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {Array.isArray(value) && value.map((explanation, index) => (
                    <Typography
                      key={index}
                      component="li"
                      variant="body2"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        mb: 0.5,
                        '&:last-child': { mb: 0 },
                      }}
                    >
                      {explanation}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        );
      default:
        return (
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <AnimatePresence>
        {messages.map(message => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                mb: 3,
                ...(message.type === 'user' && {
                  flexDirection: 'row-reverse',
                }),
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: message.type === 'user' ? 'primary.main' : 'secondary.main',
                  mr: message.type === 'user' ? 0 : 1,
                  ml: message.type === 'user' ? 1 : 0,
                }}
              >
                {getMessageIcon(message.type)}
              </Avatar>
              <Box sx={getMessageStyle(message.type)}>
                {renderMessageContent(message)}
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: -20,
                    [message.type === 'user' ? 'right' : 'left']: 0,
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
          }}
        >
          <CircularProgress size={24} sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
        </Box>
      )}
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(239, 68, 68, 0.9)' }}>
              {error}
            </Typography>
          </Box>
        </motion.div>
      )}
    </Box>
  );
};

export default MessageList; 