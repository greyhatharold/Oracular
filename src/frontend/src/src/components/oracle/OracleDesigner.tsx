import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, OracleSpecification, OracleDesignerProps, ConversationState } from './types';
import MessageList from './MessageList';
import SpecificationView from './SpecificationView';
import CompositionControls from './CompositionControls';
import OracleVisualizer from './OracleVisualizer';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const OracleDesigner: React.FC<OracleDesignerProps> = ({
  initialSpecification,
  onSpecificationUpdate,
  className = '',
}) => {
  const theme = useTheme();
  const [state, setState] = useState<ConversationState>({
    messages: [],
    currentSpecification: initialSpecification || null,
    isLoading: false,
    error: null,
  });

  const [showSpecification, setShowSpecification] = useState(true);
  const [activeView, setActiveView] = useState<'details' | 'visual'>('details');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleMessageSubmit = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/oracle/design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          currentSpecification: state.currentSpecification,
        }),
      });

      if (!response.ok) throw new Error('Failed to process request');

      const data = await response.json();
      
      const systemMessages: Message[] = [
        {
          id: uuidv4(),
          type: 'system',
          content: data.processed_response.raw_response,
          timestamp: new Date().toISOString(),
        },
      ];

      if (data.specification) {
        systemMessages.push({
          id: uuidv4(),
          type: 'specification',
          content: data.specification,
          timestamp: new Date().toISOString(),
        });
      }

      if (data.clarifications?.length) {
        systemMessages.push({
          id: uuidv4(),
          type: 'clarification',
          content: data.clarifications,
          timestamp: new Date().toISOString(),
        });
      }

      if (data.explanations) {
        systemMessages.push({
          id: uuidv4(),
          type: 'explanation',
          content: data.explanations,
          timestamp: new Date().toISOString(),
        });
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, ...systemMessages],
        currentSpecification: data.specification || prev.currentSpecification,
        isLoading: false,
      }));

      if (onSpecificationUpdate && data.specification) {
        onSpecificationUpdate(data.specification);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  };

  const handleNodeSelect = (nodeId: string, nodeType: string) => {
    console.log(`Selected node: ${nodeId} of type ${nodeType}`);
  };

  const handleAnnotationAdd = (nodeId: string, annotation: string) => {
    console.log(`Added annotation to node ${nodeId}: ${annotation}`);
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        position: 'relative',
        backgroundColor: 'transparent',
      }}
    >
      {/* Main Chat Area */}
      <Box
        sx={{
          flex: showSpecification ? '1 1 60%' : '1 1 100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
        }}
      >
        {/* Messages Container */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 3,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
              },
            },
          }}
        >
          <MessageList 
            messages={state.messages}
            isLoading={state.isLoading}
            error={state.error}
          />
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            p: 3,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <CompositionControls
            onSubmit={handleMessageSubmit}
            isLoading={state.isLoading}
            currentSpecification={state.currentSpecification}
          />
        </Box>

        {/* Toggle Specification Button */}
        <Tooltip title={showSpecification ? "Hide Specification" : "Show Specification"}>
          <IconButton
            onClick={() => setShowSpecification(!showSpecification)}
            sx={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              zIndex: 10,
            }}
          >
            {showSpecification ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Specification Panel */}
      {showSpecification && (
        <Box
          sx={{
            width: '40%',
            height: '100%',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* View Toggle */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
              p: 2,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Tooltip title="View Details">
              <IconButton
                onClick={() => setActiveView('details')}
                sx={{
                  backgroundColor: activeView === 'details' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Visualize">
              <IconButton
                onClick={() => setActiveView('visual')}
                sx={{
                  backgroundColor: activeView === 'visual' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {activeView === 'details' ? (
              <SpecificationView
                specification={state.currentSpecification}
                messages={state.messages}
              />
            ) : (
              <OracleVisualizer
                specification={state.currentSpecification}
                messages={state.messages}
                onNodeSelect={handleNodeSelect}
                onAnnotationAdd={handleAnnotationAdd}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OracleDesigner; 