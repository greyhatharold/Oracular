import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, Typography, CircularProgress, Chip, alpha, useTheme, Tooltip, IconButton } from '@mui/material';
import ForceGraph2D from 'react-force-graph-2d';
import { debounce } from 'lodash';
import { useAppTheme } from '../../styles/ThemeProvider';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HubIcon from '@mui/icons-material/Hub';
import { animated, useSpring } from 'react-spring';

const AnimatedBox = animated(Box);

const NetworkGraph = ({ 
  data: initialData, 
  height = 450, 
  width = '100%',
  loading = false,
  onRefresh,
  error = null
}) => {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const graphRef = useRef();
  const containerRef = useRef();
  const [graphData, setGraphData] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });

  // Animation for tooltip
  const tooltipAnimation = useSpring({
    opacity: hoveredNode ? 1 : 0,
    transform: hoveredNode ? 'scale(1)' : 'scale(0.9)',
    config: { tension: 300, friction: 20 }
  });

  // Prepare mock data if none is provided
  useEffect(() => {
    if (initialData) {
      setGraphData(initialData);
      return;
    }

    // Create mock data for demonstration
    const nodes = [
      { id: 'main', name: 'Main Oracle', type: 'main', status: 'active', latency: 45, version: '1.2.0' },
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `validator-${i + 1}`,
        name: `Validator ${i + 1}`,
        type: 'validator',
        status: Math.random() > 0.8 ? 'warning' : 'active',
        latency: Math.floor(Math.random() * 100 + 50),
        version: '1.2.0'
      })),
      ...Array.from({ length: 14 }, (_, i) => ({
        id: `node-${i + 1}`,
        name: `Node ${i + 1}`,
        type: 'node',
        status: i % 8 === 0 ? 'inactive' : i % 7 === 0 ? 'warning' : 'active',
        latency: Math.floor(Math.random() * 150 + 30),
        version: i % 5 === 0 ? '1.1.9' : '1.2.0'
      })),
    ];

    // Create links with varying strength
    const links = [];
    
    // Connect main to all validators
    nodes.filter(node => node.type === 'validator').forEach(node => {
      links.push({
        source: 'main',
        target: node.id,
        value: 3,
        status: node.status,
        transactions: Math.floor(Math.random() * 100)
      });
    });
    
    // Connect validators to some nodes
    nodes.filter(node => node.type === 'validator').forEach(validator => {
      const connectedNodes = nodes
        .filter(node => node.type === 'node')
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 5) + 2);
      
      connectedNodes.forEach(node => {
        links.push({
          source: validator.id,
          target: node.id,
          value: 1.5,
          status: Math.min(validator.status, node.status),
          transactions: Math.floor(Math.random() * 50)
        });
      });
    });
    
    // Connect some nodes to each other for mesh-like structure
    nodes.filter(node => node.type === 'node').forEach((node, idx) => {
      if (idx % 3 === 0) {
        const targetIdx = (idx + 1) % nodes.filter(n => n.type === 'node').length;
        const targetNode = nodes.filter(n => n.type === 'node')[targetIdx];
        links.push({
          source: node.id,
          target: targetNode.id,
          value: 1,
          status: 'active',
          transactions: Math.floor(Math.random() * 20)
        });
      }
    });

    setGraphData({ nodes, links });
  }, [initialData]);

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = debounce(() => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    }, 200);

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [height]);

  // Reset graph zoom when data changes
  useEffect(() => {
    if (graphRef.current && graphData) {
      // Add a null check before calling zoomToFit
      const zoomTimeout = setTimeout(() => {
        if (graphRef.current?.zoomToFit) {
          graphRef.current.zoomToFit(300, 40);
        }
      }, 500);
      
      return () => clearTimeout(zoomTimeout);
    }
  }, [graphData]);

  // Node color based on status
  const getNodeColor = useCallback((node) => {
    if (!node) return theme.palette.grey[400];
    
    switch (node.status) {
      case 'active':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'inactive':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[400];
    }
  }, [theme]);

  // Link color based on status
  const getLinkColor = useCallback((link) => {
    if (!link || !link.status) return alpha(theme.palette.grey[400], 0.5);
    
    switch (link.status) {
      case 'active':
        return alpha(theme.palette.success.main, 0.4);
      case 'warning':
        return alpha(theme.palette.warning.main, 0.4);
      case 'inactive':
        return alpha(theme.palette.error.main, 0.4);
      default:
        return alpha(theme.palette.grey[400], 0.4);
    }
  }, [theme]);

  // Node size based on type
  const getNodeSize = useCallback((node) => {
    if (!node) return 5;
    
    switch (node.type) {
      case 'main':
        return 14;
      case 'validator':
        return 10;
      default:
        return 6;
    }
  }, []);

  // Custom node render
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);
    const x = node.x;
    const y = node.y;
    
    // Node shadow
    ctx.shadowColor = alpha(isDark ? '#000' : '#333', 0.3);
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Background circle (outer)
    ctx.beginPath();
    ctx.arc(x, y, size + 2, 0, 2 * Math.PI);
    ctx.fillStyle = alpha(color, 0.2);
    ctx.fill();
    
    // Main circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Inner highlight
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = alpha('#fff', 0.3);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Label for main and validator nodes, or if zoomed in
    if (node.type !== 'node' || globalScale > 1.5) {
      const label = node.name;
      const fontSize = node.type === 'main' ? 12 : 10;
      
      ctx.font = `${fontSize}px ${theme.typography.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark ? theme.palette.grey[300] : theme.palette.grey[800];
      
      // Add background for text
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = alpha(isDark ? '#000' : '#fff', 0.7);
      ctx.fillRect(x - textWidth / 2 - 3, y + size + 4, textWidth + 6, fontSize + 4);
      
      // Draw text
      ctx.fillStyle = isDark ? theme.palette.grey[300] : theme.palette.grey[800];
      ctx.fillText(label, x, y + size + 10);
    }

    // Add status indicator dot for selected/hovered node
    if (node === selectedNode || node === hoveredNode) {
      ctx.beginPath();
      ctx.arc(x + size, y - size/2, size/3, 0, 2 * Math.PI);
      ctx.fillStyle = theme.palette.primary.main;
      ctx.fill();
    }
    
  }, [getNodeSize, getNodeColor, theme, selectedNode, hoveredNode, isDark]);

  // Custom link render
  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const start = link.source;
    const end = link.target;
    const color = getLinkColor(link);
    const lineWidth = link.value || 1;
    
    // Draw link
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    
    // Add a slight curve to the link
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only curve if distance is sufficient
    if (distance > 30) {
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      
      // Add slight curve
      const curveOffset = distance * 0.1;
      const cx = midX + curveOffset * (dy / distance);
      const cy = midY - curveOffset * (dx / distance);
      
      ctx.quadraticCurveTo(cx, cy, end.x, end.y);
    } else {
      ctx.lineTo(end.x, end.y);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Use dashed line for warning/inactive links
    if (link.status === 'warning' || link.status === 'inactive') {
      ctx.setLineDash([5, 3]);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw traffic particles on active links
    if (link.status === 'active' && globalScale > 0.6) {
      const particleSpeed = 0.01;
      const now = Date.now() * particleSpeed;
      const numParticles = Math.ceil(link.transactions / 20) || 1;
      
      for (let i = 0; i < numParticles; i++) {
        // Stagger particles along the line
        const t = ((now / 300) + (i / numParticles)) % 1;
        
        let x, y;
        if (distance > 30) {
          // For curved links - recalculate control points
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const curveOffset = distance * 0.1;
          const cx = midX + curveOffset * (dy / distance);
          const cy = midY - curveOffset * (dx / distance);
          
          // Calculate position along the curve using quadratic Bezier formula
          const t2 = Math.pow(1 - t, 2);
          const t22 = 2 * (1 - t) * t;
          const t3 = t * t;
          
          x = t2 * start.x + t22 * cx + t3 * end.x;
          y = t2 * start.y + t22 * cy + t3 * end.y;
        } else {
          // For straight links
          x = start.x + (end.x - start.x) * t;
          y = start.y + (end.y - start.y) * t;
        }
        
        ctx.beginPath();
        ctx.arc(x, y, lineWidth, 0, 2 * Math.PI);
        ctx.fillStyle = theme.palette.primary.main;
        ctx.fill();
      }
    }
  }, [getLinkColor, theme, isDark]);

  const handleNodeClick = useCallback(node => {
    setSelectedNode(prev => prev === node ? null : node);
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(2, 1000);
    }
  }, []);

  if (loading) {
    return (
      <Box sx={{ 
        height, 
        width, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Loading network data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        height, 
        width, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <Typography color="error" variant="subtitle1" fontWeight={500}>
          {error}
        </Typography>
        {onRefresh && (
          <IconButton onClick={onRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        )}
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        height,
        width,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1
      }}
    >
      {/* Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: theme.spacing(2), 
        right: theme.spacing(2), 
        zIndex: 10,
        display: 'flex',
        gap: theme.spacing(1)
      }}>
        <Tooltip title="Refresh">
          <IconButton 
            size="small" 
            onClick={onRefresh}
            sx={{ 
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(4px)',
              '&:hover': { backgroundColor: alpha(theme.palette.background.paper, 0.9) }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Filter nodes">
          <IconButton 
            size="small"
            sx={{ 
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(4px)',
              '&:hover': { backgroundColor: alpha(theme.palette.background.paper, 0.9) }
            }}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fullscreen">
          <IconButton 
            size="small"
            sx={{ 
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(4px)',
              '&:hover': { backgroundColor: alpha(theme.palette.background.paper, 0.9) }
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Legend */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: theme.spacing(2), 
        left: theme.spacing(2), 
        zIndex: 10,
        p: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(4px)',
        borderRadius: theme.shape.borderRadius,
        display: 'flex',
        gap: theme.spacing(1.5),
        flexDirection: 'column',
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
      }}>
        <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5 }}>
          Node Types:
        </Typography>
        <Box sx={{ display: 'flex', gap: theme.spacing(1), flexWrap: 'wrap' }}>
          <Chip 
            icon={<Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              bgcolor: theme.palette.primary.main,
              mr: -0.5
            }} />} 
            label="Main Oracle" 
            size="small" 
            sx={{ height: 22 }} 
            variant="outlined"
          />
          <Chip 
            icon={<Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: theme.palette.secondary.main,
              mr: -0.5 
            }} />} 
            label="Validator" 
            size="small" 
            sx={{ height: 22 }} 
            variant="outlined"
          />
          <Chip 
            icon={<Box sx={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              bgcolor: theme.palette.success.main,
              mr: -0.5 
            }} />} 
            label="Node" 
            size="small" 
            sx={{ height: 22 }} 
            variant="outlined"
          />
        </Box>
        <Typography variant="caption" fontWeight={600} sx={{ mt: 0.5, mb: 0.5 }}>
          Status:
        </Typography>
        <Box sx={{ display: 'flex', gap: theme.spacing(1), flexWrap: 'wrap' }}>
          <Chip 
            icon={<Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: theme.palette.success.main,
              mr: -0.5 
            }} />} 
            label="Active" 
            size="small" 
            sx={{ height: 22 }} 
            variant="outlined"
          />
          <Chip 
            icon={<Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: theme.palette.warning.main,
              mr: -0.5 
            }} />} 
            label="Warning" 
            size="small" 
            sx={{ height: 22 }} 
            variant="outlined"
          />
          <Chip 
            icon={<Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              bgcolor: theme.palette.error.main,
              mr: -0.5 
            }} />} 
            label="Inactive" 
            size="small" 
            sx={{ height: 22 }} 
            variant="outlined"
          />
        </Box>
      </Box>
      
      {/* Network Statistics */}
      {selectedNode ? (
        <Box sx={{ 
          position: 'absolute', 
          top: theme.spacing(2), 
          left: theme.spacing(2), 
          zIndex: 10,
          p: 2.5,
          backgroundColor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(8px)',
          borderRadius: theme.shape.borderRadius,
          maxWidth: 280,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.1)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: getNodeColor(selectedNode),
              mr: 1.5 
            }} />
            <Typography variant="subtitle1" fontWeight={600}>
              {selectedNode.name}
            </Typography>
            <IconButton 
              size="small" 
              sx={{ ml: 'auto', mt: -0.5, mr: -0.5 }}
              onClick={() => setSelectedNode(null)}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                Type:
              </Typography>
              <Chip 
                label={selectedNode.type} 
                size="small" 
                sx={{ height: 24, textTransform: 'capitalize' }} 
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                Status:
              </Typography>
              <Chip 
                label={selectedNode.status} 
                size="small" 
                color={
                  selectedNode.status === 'active' ? 'success' :
                  selectedNode.status === 'warning' ? 'warning' : 'error'
                }
                sx={{ height: 24, textTransform: 'capitalize' }} 
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                Latency:
              </Typography>
              <Typography variant="body2">
                {selectedNode.latency} ms
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                Version:
              </Typography>
              <Typography variant="body2">
                {selectedNode.version}
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ 
          position: 'absolute', 
          top: theme.spacing(2), 
          left: theme.spacing(2), 
          zIndex: 10,
          p: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(4px)',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1.5) }}>
            <HubIcon fontSize="small" color="primary" sx={{ opacity: 0.8 }} />
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {graphData?.nodes.length || 0} nodes active
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Click on a node for details
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      
      {/* Node tooltip */}
      {hoveredNode && !selectedNode && (
        <AnimatedBox 
          style={tooltipAnimation}
          sx={{
            position: 'absolute',
            top: hoveredNode.y + 40,
            left: hoveredNode.x,
            transform: 'translateX(-50%)',
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(8px)',
            borderRadius: theme.shape.borderRadius,
            p: 1.5,
            zIndex: 20,
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.15)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            pointerEvents: 'none',
            maxWidth: 200
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} textAlign="center">
            {hoveredNode.name}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: theme.spacing(1),
            mt: 1
          }}>
            <Chip 
              label={hoveredNode.status} 
              size="small" 
              color={
                hoveredNode.status === 'active' ? 'success' :
                hoveredNode.status === 'warning' ? 'warning' : 'error'
              }
              sx={{ height: 20, textTransform: 'capitalize' }} 
            />
            <Typography variant="caption" color="text.secondary">
              {hoveredNode.latency} ms
            </Typography>
          </Box>
        </AnimatedBox>
      )}

      {graphData && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          width={dimensions.width}
          height={dimensions.height}
          nodeRelSize={1}
          linkWidth={1}
          linkDirectionalParticles={0}
          nodeLabel={null} // Disable default tooltip
          backgroundColor={alpha(isDark ? '#000' : '#fff', 0)}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoveredNode}
          cooldownTicks={100}
          cooldownTime={3000}
        />
      )}
    </Box>
  );
};

export default NetworkGraph; 