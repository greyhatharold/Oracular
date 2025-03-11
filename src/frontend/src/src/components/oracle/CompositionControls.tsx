import React, { useState, useRef, useEffect, ReactElement } from 'react';
import { OracleSpecification } from './types';
import { Box, IconButton, TextField, Tooltip, Paper, Typography, Chip, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DataObjectIcon from '@mui/icons-material/DataObject';
import UpdateIcon from '@mui/icons-material/Update';
import SecurityIcon from '@mui/icons-material/Security';
import CalculateIcon from '@mui/icons-material/Calculate';
import { motion, AnimatePresence } from 'framer-motion';

interface CompositionControlsProps {
  onSubmit: (content: string) => void;
  isLoading: boolean;
  currentSpecification: OracleSpecification | null;
}

interface SuggestionCategory {
  id: string;
  title: string;
  icon: ReactElement;
  suggestions: Suggestion[];
}

interface Suggestion {
  text: string;
  description: string;
  category: string;
  priority?: number;
}

const MotionBox = motion(Box);
const MotionChip = motion(Chip);
const MotionTypography = motion(Typography);

const CompositionControls: React.FC<CompositionControlsProps> = ({
  onSubmit,
  isLoading,
  currentSpecification,
}) => {
  const [content, setContent] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const generateSuggestions = (text: string): Suggestion[] => {
    const baseSuggestions: Suggestion[] = [
      {
        category: 'data',
        text: 'What data sources should be used for this oracle?',
        description: 'Define the data providers and APIs',
        priority: 1
      },
      {
        category: 'data',
        text: 'How should the data be validated before processing?',
        description: 'Set up data validation rules and quality checks',
        priority: 2
      },
      {
        category: 'update',
        text: 'What is the required update frequency?',
        description: 'Specify how often the oracle should update',
        priority: 1
      },
      {
        category: 'update',
        text: 'Should updates be triggered by events or time-based?',
        description: 'Define the update trigger mechanism',
        priority: 2
      },
      {
        category: 'security',
        text: 'What security measures should be implemented?',
        description: 'Define security protocols and access controls',
        priority: 1
      },
      {
        category: 'security',
        text: 'How should data tampering be prevented?',
        description: 'Implement data integrity measures',
        priority: 2
      },
      {
        category: 'aggregation',
        text: 'How should multiple data sources be aggregated?',
        description: 'Define the data aggregation strategy',
        priority: 1
      },
      {
        category: 'aggregation',
        text: 'What should happen if a data source fails?',
        description: 'Define fallback and error handling strategies',
        priority: 2
      }
    ];

    // Add contextual suggestions based on current specification
    if (currentSpecification) {
      if (!currentSpecification.data_sources.length) {
        baseSuggestions.unshift({
          category: 'data',
          text: 'Configure primary data sources',
          description: 'No data sources defined yet',
          priority: 0
        });
      }
      
      if (currentSpecification.confidence_score < 0.7) {
        const lowConfidenceComponents = [];
        
        if (currentSpecification.aggregation.confidence === 'low') {
          baseSuggestions.unshift({
            category: 'aggregation',
            text: 'Improve aggregation method confidence',
            description: 'Current confidence is low',
            priority: 0
          });
        }
        if (currentSpecification.update_behavior.confidence === 'low') {
          baseSuggestions.unshift({
            category: 'update',
            text: 'Clarify update frequency requirements',
            description: 'Current confidence is low',
            priority: 0
          });
        }
      }
    }

    return baseSuggestions;
  };

  const suggestionCategories: SuggestionCategory[] = [
    {
      id: 'data',
      title: 'Data Sources',
      icon: <DataObjectIcon /> as ReactElement,
      suggestions: suggestions.filter(s => s.category === 'data')
    },
    {
      id: 'update',
      title: 'Update Behavior',
      icon: <UpdateIcon /> as ReactElement,
      suggestions: suggestions.filter(s => s.category === 'update')
    },
    {
      id: 'security',
      title: 'Security',
      icon: <SecurityIcon /> as ReactElement,
      suggestions: suggestions.filter(s => s.category === 'security')
    },
    {
      id: 'aggregation',
      title: 'Aggregation',
      icon: <CalculateIcon /> as ReactElement,
      suggestions: suggestions.filter(s => s.category === 'aggregation')
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions) return;

      const currentCategorySuggestions = activeCategory
        ? suggestions.filter(s => s.category === activeCategory)
        : suggestions;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < currentCategorySuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : currentCategorySuggestions.length - 1
          );
          break;
        case 'Enter':
          if (selectedIndex >= 0 && !e.shiftKey) {
            e.preventDefault();
            handleSuggestionClick(currentCategorySuggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, selectedIndex, suggestions, activeCategory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Update suggestions based on new content
    setSuggestions(generateSuggestions(newContent));
  };

  const handleFocus = () => {
    setSuggestions(generateSuggestions(content));
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setContent(suggestion.text);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isLoading) {
      onSubmit(content.trim());
      setContent('');
      setShowSuggestions(false);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <form onSubmit={handleSubmit}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-end',
            position: 'relative',
          }}
        >
          <TextField
            multiline
            maxRows={4}
            inputRef={textareaRef}
            value={content}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder="Design your oracle..."
            disabled={isLoading}
            fullWidth
            variant="standard"
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '12px 16px',
                paddingRight: '100px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                },
              },
              '& .MuiInputBase-input': {
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                '&::placeholder': {
                  color: 'rgba(255, 255, 255, 0.5)',
                  opacity: 1,
                },
              },
              '& .MuiInput-underline:before': {
                display: 'none',
              },
              '& .MuiInput-underline:after': {
                display: 'none',
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              display: 'flex',
              gap: 1,
            }}
          >
            <Tooltip title="Send Message">
              <IconButton
                type="submit"
                disabled={!content.trim() || isLoading}
                size="small"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: 'rgba(255, 255, 255, 0.9)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              >
                <SendIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </form>

      <AnimatePresence mode="wait">
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 1,
              }
            }}
            exit={{ 
              opacity: 0, 
              y: 10, 
              scale: 0.96,
              transition: {
                duration: 0.2,
                ease: "easeOut"
              }
            }}
            transition={{ duration: 0.3 }}
            ref={suggestionsRef}
          >
            <Paper
              sx={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                mb: 1,
                backgroundColor: 'rgba(30, 41, 59, 0.98)',
                backdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 16px 48px rgba(0, 0, 0, 0.2)',
                WebkitBackfaceVisibility: 'hidden',
                MozBackfaceVisibility: 'hidden',
                backfaceVisibility: 'hidden',
                transform: 'translate3d(0, 0, 0)',
                perspective: 1000,
              }}
            >
              {/* Categories */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.1
                    }
                  }
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    p: 2,
                    pb: 1,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    overflowX: 'auto',
                    '&::-webkit-scrollbar': {
                      height: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                    },
                  }}
                >
                  <MotionChip
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    label="All"
                    onClick={() => setActiveCategory(null)}
                    sx={{
                      backgroundColor: !activeCategory ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                  {suggestionCategories.map(category => (
                    <MotionChip
                      key={category.id}
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      icon={category.icon}
                      label={category.title}
                      onClick={() => setActiveCategory(category.id)}
                      sx={{
                        backgroundColor: activeCategory === category.id ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  ))}
                </Box>
              </motion.div>

              {/* Suggestions */}
              <MotionBox 
                sx={{ maxHeight: '400px', overflowY: 'auto' }}
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.2
                    }
                  }
                }}
              >
                {suggestionCategories
                  .filter(category => !activeCategory || category.id === activeCategory)
                  .map(category => (
                    <MotionBox
                      key={category.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                    >
                      {category.suggestions.length > 0 && (
                        <>
                          <Box
                            sx={{
                              p: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              color: 'rgba(255, 255, 255, 0.7)',
                            }}
                          >
                            {category.icon}
                            <MotionTypography
                              variant="subtitle2"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {category.title}
                            </MotionTypography>
                          </Box>
                          {category.suggestions
                            .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                            .map((suggestion, index) => (
                              <MotionBox
                                key={index}
                                variants={{
                                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                                  visible: { 
                                    opacity: 1, 
                                    y: 0, 
                                    scale: 1,
                                    transition: {
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 30,
                                    }
                                  }
                                }}
                                whileHover={{ 
                                  scale: 1.02,
                                  transition: { duration: 0.2 }
                                }}
                                onClick={() => handleSuggestionClick(suggestion)}
                                sx={{
                                  p: 2,
                                  cursor: 'pointer',
                                  backgroundColor: selectedIndex === index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  },
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1,
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                              >
                                <MotionTypography
                                  variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    visible: { opacity: 1, y: 0 }
                                  }}
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                  }}
                                >
                                  {suggestion.text}
                                </MotionTypography>
                                <MotionTypography
                                  variants={{
                                    hidden: { opacity: 0, y: 5 },
                                    visible: { opacity: 1, y: 0 }
                                  }}
                                  sx={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {suggestion.description}
                                </MotionTypography>
                              </MotionBox>
                            ))}
                        </>
                      )}
                    </MotionBox>
                  ))}
              </MotionBox>

              {/* Keyboard Navigation Help */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    gap: 2,
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <KeyboardArrowUpIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                    <KeyboardArrowDownIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.5)' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      to navigate
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Enter to select
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Esc to close
                  </Typography>
                </Box>
              </motion.div>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default CompositionControls; 