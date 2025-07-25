import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { type Entity } from './EntityHighlighter';

interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

interface MiniGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNodeId: string | null;
  onNodeClick?: (nodeId: string) => void;
  entities: Entity[];
}

// Entity type to color mapping (matching EntityHighlighter)
const ENTITY_COLORS: Record<string, string> = {
  Person: '#3B82F6', // blue-500
  Project: '#10B981', // green-500
  Concept: '#8B5CF6', // purple-500
  Event: '#F97316', // orange-500
  Task: '#EAB308', // yellow-500
  Entity: '#6B7280', // gray-500
  Episodic: '#EC4899', // pink-500
};

export function MiniGraph({
  nodes,
  edges,
  highlightedNodeId,
  onNodeClick,
  entities,
}: MiniGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create container for zoom
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create arrow markers for directed edges
    const defs = svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-10 -10 20 20')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M-5,-5 L5,0 L-5,5')
      .attr('fill', '#64748B');

    // Process data for D3
    const d3Nodes = nodes.map((n) => ({ ...n, x: width / 2, y: height / 2 }));
    const d3Edges = edges.map((e) => ({ ...e }));

    // Create force simulation
    const simulation = d3
      .forceSimulation(d3Nodes)
      .force(
        'link',
        d3
          .forceLink<any, any>(d3Edges)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = container
      .append('g')
      .selectAll('line')
      .data(d3Edges)
      .join('line')
      .attr('stroke', '#94A3B8')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Create link labels
    const linkLabel = container
      .append('g')
      .selectAll('text')
      .data(d3Edges)
      .join('text')
      .attr('font-size', 10)
      .attr('fill', '#64748B')
      .attr('text-anchor', 'middle')
      .text((d) => d.type);

    // Create nodes
    const node = container
      .append('g')
      .selectAll('circle')
      .data(d3Nodes)
      .join('circle')
      .attr('r', (d) => {
        // Make highlighted node larger
        return d.id === highlightedNodeId ? 25 : 20;
      })
      .attr('fill', (d) => ENTITY_COLORS[d.type] || ENTITY_COLORS.Entity)
      .attr('stroke', (d) => {
        // Add stroke to highlighted node
        return d.id === highlightedNodeId ? '#000' : '#fff';
      })
      .attr('stroke-width', (d) => {
        return d.id === highlightedNodeId ? 3 : 2;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d.id);
      })
      .call(
        d3
          .drag<SVGCircleElement, (typeof d3Nodes)[0], any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      );

    // Create node labels
    const nodeLabel = container
      .append('g')
      .selectAll('text')
      .data(d3Nodes)
      .join('text')
      .attr('font-size', 12)
      .attr('font-weight', (d) => (d.id === highlightedNodeId ? 'bold' : 'normal'))
      .attr('text-anchor', 'middle')
      .attr('dy', -25)
      .text((d) => d.label)
      .style('pointer-events', 'none');

    // Add tooltips
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('padding', '8px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    node
      .on('mouseover', (event, d) => {
        const entity = entities.find((e) => e.uuid === d.id);
        if (entity?.summary) {
          tooltip
            .style('opacity', 1)
            .html(`<strong>${d.label}</strong><br/>${entity.summary}`)
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY - 10 + 'px');
        }
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as any).x)
        .attr('y1', (d) => (d.source as any).y)
        .attr('x2', (d) => (d.target as any).x)
        .attr('y2', (d) => (d.target as any).y);

      linkLabel
        .attr('x', (d) => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('y', (d) => ((d.source as any).y + (d.target as any).y) / 2);

      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);

      nodeLabel.attr('x', (d) => d.x!).attr('y', (d) => d.y!);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Update highlighting when prop changes
    node
      .transition()
      .duration(300)
      .attr('r', (d) => (d.id === highlightedNodeId ? 25 : 20))
      .attr('stroke', (d) => (d.id === highlightedNodeId ? '#000' : '#fff'))
      .attr('stroke-width', (d) => (d.id === highlightedNodeId ? 3 : 2));

    nodeLabel
      .transition()
      .duration(300)
      .attr('font-weight', (d) => (d.id === highlightedNodeId ? 'bold' : 'normal'));

    // Cleanup
    return () => {
      tooltip.remove();
      simulation.stop();
    };
  }, [nodes, edges, highlightedNodeId, onNodeClick, entities]);

  return (
    <div className="h-full w-full p-4">
      <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Entry Knowledge Graph</h3>
          <p className="text-xs text-gray-500 mt-1">
            Showing entities and relationships from this journal entry
          </p>
        </div>
        <svg ref={svgRef} className="w-full" style={{ height: 'calc(100% - 80px)' }} />
      </div>
    </div>
  );
}
