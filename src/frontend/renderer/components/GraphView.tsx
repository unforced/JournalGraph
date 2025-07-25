import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as d3 from 'd3';
import { Loader2, AlertCircle } from 'lucide-react';
import { EntityDetailPanel } from './EntityDetailPanel';
import type { Entity } from './EntityHighlighter';

interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: {
    summary?: string;
    created_at?: string;
  };
  // D3 force simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: {
    fact?: string;
    created_at?: string;
  };
}

interface D3GraphEdge extends Omit<GraphEdge, 'source' | 'target'> {
  source: GraphNode;
  target: GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const location = useLocation();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const highlightEntityId = (location.state as { highlightEntityId?: string })?.highlightEntityId;

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/query/graph');
        if (!response.ok) {
          throw new Error(`Failed to fetch graph data: ${response.statusText}`);
        }
        const graphData = await response.json();
        setData(graphData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load graph');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  // Render D3 graph
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous graph
    svg.selectAll('*').remove();

    // Create a map for quick node lookup
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    // Transform edges to use node objects instead of IDs
    const links: D3GraphEdge[] = data.edges.map((e) => ({
      ...e,
      source: (nodeMap.get(e.source) || { id: e.source }) as GraphNode,
      target: (nodeMap.get(e.target) || { id: e.target }) as GraphNode,
    }));

    // Color scale for node types
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, D3GraphEdge>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create container for zoom
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        container.attr('transform', event.transform.toString());
      });

    svg.call(zoom as any);

    // Create links
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Create link labels
    const linkLabel = container
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links)
      .enter()
      .append('text')
      .text((d: D3GraphEdge) => d.type)
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle');

    // Create nodes
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d: GraphNode) => {
        // Open the entity detail panel
        const entity: Entity = {
          uuid: d.id,
          name: d.label,
          type: d.type,
          summary: d.properties.summary,
        };
        setSelectedEntity(entity);
        setIsPanelOpen(true);
      })
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d: GraphNode) => colorScale(d.type))
      .attr('stroke', (d: GraphNode) => (highlightEntityId === d.id ? '#ff6b6b' : '#fff'))
      .attr('stroke-width', (d: GraphNode) => (highlightEntityId === d.id ? 4 : 2))
      .attr('class', (d: GraphNode) => (highlightEntityId === d.id ? 'highlighted-node' : ''));

    // Add labels to nodes
    node
      .append('text')
      .text((d: GraphNode) => d.label)
      .attr('x', 0)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333');

    // Add tooltips
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    node
      .on('mouseover', (event: MouseEvent, d: GraphNode) => {
        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip
          .html(
            `
        <strong>${d.label}</strong><br/>
        Type: ${d.type}<br/>
        ${d.properties.summary ? `Summary: ${d.properties.summary}` : ''}
      `
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: D3GraphEdge) => d.source.x || 0)
        .attr('y1', (d: D3GraphEdge) => d.source.y || 0)
        .attr('x2', (d: D3GraphEdge) => d.target.x || 0)
        .attr('y2', (d: D3GraphEdge) => d.target.y || 0);

      linkLabel
        .attr('x', (d: D3GraphEdge) => ((d.source.x || 0) + (d.target.x || 0)) / 2)
        .attr('y', (d: D3GraphEdge) => ((d.source.y || 0) + (d.target.y || 0)) / 2);

      node.attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Center on highlighted node if present
    if (highlightEntityId) {
      const highlightedNode = data.nodes.find((n) => n.id === highlightEntityId);
      if (highlightedNode && highlightedNode.x && highlightedNode.y) {
        const transform = d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(1.5)
          .translate(-highlightedNode.x, -highlightedNode.y);

        svg
          .transition()
          .duration(750)
          .call(zoom.transform as any, transform);
      }
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [data, highlightEntityId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Yet</h3>
          <p className="text-sm text-gray-600">
            Import your journal entries to see the knowledge graph
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-md z-10">
        <p className="text-sm font-medium text-gray-700">
          {data.nodes.length} nodes, {data.edges.length} relationships
        </p>
        <p className="text-xs text-gray-500 mt-1">Drag to move nodes, scroll to zoom</p>
      </div>
      <svg ref={svgRef} className="w-full h-full" />

      <EntityDetailPanel
        entity={selectedEntity}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedEntity(null);
        }}
        onEntityClick={(newEntity) => {
          setSelectedEntity(newEntity);
        }}
      />
    </div>
  );
}
