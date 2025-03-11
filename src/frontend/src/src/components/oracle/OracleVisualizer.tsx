import React, { useEffect, useRef, useState } from 'react';
import { OracleSpecification, Message } from './types';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';

interface OracleVisualizerProps {
  specification: OracleSpecification | null;
  messages: Message[];
  onNodeSelect?: (nodeId: string, nodeType: string) => void;
  onAnnotationAdd?: (nodeId: string, annotation: string) => void;
  className?: string;
}

interface VisualizationNode {
  id: string;
  type: 'source' | 'validation' | 'aggregation' | 'update' | 'oracle';
  label: string;
  confidence: string;
  details?: any;
}

interface VisualizationLink {
  source: string;
  target: string;
  type: string;
}

interface Annotation {
  nodeId: string;
  text: string;
  timestamp: string;
}

const OracleVisualizer: React.FC<OracleVisualizerProps> = ({
  specification,
  messages,
  onNodeSelect,
  onAnnotationAdd,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<VisualizationNode[]>([]);
  const [links, setLinks] = useState<VisualizationLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [viewMode, setViewMode] = useState<'flow' | 'tree' | 'network'>('flow');
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Transform specification into visualization data
  useEffect(() => {
    if (!specification) {
      setNodes([]);
      setLinks([]);
      return;
    }

    const newNodes: VisualizationNode[] = [];
    const newLinks: VisualizationLink[] = [];

    // Add oracle core node
    newNodes.push({
      id: 'oracle_core',
      type: 'oracle',
      label: specification.name,
      confidence: 'high',
      details: { description: specification.description }
    });

    // Add data sources
    specification.data_sources.forEach((source, index) => {
      const nodeId = `source_${index}`;
      newNodes.push({
        id: nodeId,
        type: 'source',
        label: source.name,
        confidence: source.confidence,
        details: source
      });
      newLinks.push({
        source: nodeId,
        target: 'oracle_core',
        type: 'data_flow'
      });
    });

    // Add validation nodes
    specification.validation.forEach((validation, index) => {
      const nodeId = `validation_${index}`;
      newNodes.push({
        id: nodeId,
        type: 'validation',
        label: validation.method,
        confidence: validation.confidence,
        details: validation
      });
      newLinks.push({
        source: 'oracle_core',
        target: nodeId,
        type: 'validation_flow'
      });
    });

    // Add aggregation node
    newNodes.push({
      id: 'aggregation',
      type: 'aggregation',
      label: specification.aggregation.method,
      confidence: specification.aggregation.confidence,
      details: specification.aggregation
    });
    newLinks.push({
      source: 'oracle_core',
      target: 'aggregation',
      type: 'aggregation_flow'
    });

    // Add update behavior node
    newNodes.push({
      id: 'update',
      type: 'update',
      label: specification.update_behavior.frequency,
      confidence: specification.update_behavior.confidence,
      details: specification.update_behavior
    });
    newLinks.push({
      source: 'oracle_core',
      target: 'update',
      type: 'update_flow'
    });

    setNodes(newNodes);
    setLinks(newLinks);
  }, [specification]);

  // Initialize and update D3 visualization
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous visualization
    svg.selectAll('*').remove();

    // Create simulation based on view mode
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-1000))
      .force('center', d3.forceCenter(width / 2, height / 2));

    if (viewMode === 'tree') {
      simulation.force('y', d3.forceY().strength(0.1));
    } else if (viewMode === 'network') {
      simulation.force('collide', d3.forceCollide(80));
    }

    // Create container for links
    const linkGroup = svg.append('g').attr('class', 'links');
    const linkElements = linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#4B5563')
      .attr('stroke-width', 2);

    // Create container for nodes
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, VisualizationNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded) as any);

    // Add node circles
    nodeElements
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d: VisualizationNode) => getNodeColor(d.type))
      .attr('stroke', (d: VisualizationNode) => getConfidenceColor(d.confidence))
      .attr('stroke-width', 3);

    // Add node labels
    nodeElements
      .append('text')
      .text((d: VisualizationNode) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', '12px');

    // Add data flow particles if enabled
    if (showDataFlow) {
      animateDataFlow(svg, links);
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeElements.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGGElement, VisualizationNode, unknown>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      const node = event.subject as d3.SimulationNodeDatum;
      node.fx = event.x;
      node.fy = event.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, VisualizationNode, unknown>) {
      const node = event.subject as d3.SimulationNodeDatum;
      node.fx = event.x;
      node.fy = event.y;
    }

    function dragEnded(event: d3.D3DragEvent<SVGGElement, VisualizationNode, unknown>) {
      if (!event.active) simulation.alphaTarget(0);
      const node = event.subject as d3.SimulationNodeDatum;
      node.fx = null;
      node.fy = null;
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, viewMode, showDataFlow]);

  // Helper functions
  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'source': return '#3B82F6';
      case 'validation': return '#10B981';
      case 'aggregation': return '#8B5CF6';
      case 'update': return '#F59E0B';
      case 'oracle': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence.toLowerCase()) {
      case 'high': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'low': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const animateDataFlow = (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, links: VisualizationLink[]) => {
    links.forEach(link => {
      const particleGroup = svg.append('g').attr('class', 'particles');
      
      function updateParticle() {
        const particle = particleGroup
          .append('circle')
          .attr('r', 3)
          .attr('fill', '#60A5FA')
          .attr('opacity', 0.7);

        particle
          .transition()
          .duration(2000)
          .attrTween('transform', () => (t: number) => {
            const source = d3.select(`[data-id="${link.source}"]`).node() as any;
            const target = d3.select(`[data-id="${link.target}"]`).node() as any;
            
            if (!source || !target) return '';
            
            const x = source.cx.baseVal.value * (1 - t) + target.cx.baseVal.value * t;
            const y = source.cy.baseVal.value * (1 - t) + target.cy.baseVal.value * t;
            
            return `translate(${x},${y})`;
          })
          .on('end', function() {
            d3.select(this).remove();
          });
      }

      setInterval(updateParticle, 200);
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Control Panel */}
      <div className="absolute top-4 right-4 space-y-2">
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as any)}
          className="bg-indigo-800 text-white rounded px-3 py-1"
        >
          <option value="flow">Flow Diagram</option>
          <option value="tree">Hierarchical Tree</option>
          <option value="network">Network Graph</option>
        </select>
        
        <button
          onClick={() => setShowDataFlow(!showDataFlow)}
          className={`block px-3 py-1 rounded ${showDataFlow ? 'bg-teal-600' : 'bg-indigo-800'}`}
        >
          {showDataFlow ? 'Hide Data Flow' : 'Show Data Flow'}
        </button>
        
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`block px-3 py-1 rounded ${compareMode ? 'bg-teal-600' : 'bg-indigo-800'}`}
        >
          {compareMode ? 'Exit Compare' : 'Compare Versions'}
        </button>
      </div>

      {/* Main Visualization */}
      <svg
        ref={svgRef}
        className="w-full h-full bg-indigo-900/50 rounded-lg"
        style={{ minHeight: '600px' }}
      />

      {/* Node Details Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute top-4 left-4 w-64 bg-indigo-800 rounded-lg p-4 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              {nodes.find(n => n.id === selectedNode)?.label}
            </h3>
            <pre className="text-sm text-white/70 overflow-auto max-h-48">
              {JSON.stringify(nodes.find(n => n.id === selectedNode)?.details, null, 2)}
            </pre>
            
            {/* Annotation Input */}
            <div className="mt-4">
              <input
                type="text"
                placeholder="Add annotation..."
                className="w-full bg-indigo-700 text-white rounded px-2 py-1"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && onAnnotationAdd) {
                    onAnnotationAdd(selectedNode, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OracleVisualizer; 