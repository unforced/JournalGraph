import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as d3 from 'd3';

interface Entity {
  uuid: string;
  name: string;
  type: string;
  summary?: string;
}

interface SubgraphNode {
  id: string;
  type: string;
  label: string;
  isCenter?: boolean;
  summary?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SubgraphEdge {
  source: string;
  target: string;
  type: string;
  fact?: string;
}

interface D3SubgraphEdge extends Omit<SubgraphEdge, 'source' | 'target'> {
  source: SubgraphNode;
  target: SubgraphNode;
}

interface SubgraphData {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
}

interface EntityDetailPanelProps {
  entity: Entity | null;
  isOpen: boolean;
  onClose: () => void;
  onEntityClick?: (entity: Entity) => void;
}

export function EntityDetailPanel({
  entity,
  isOpen,
  onClose,
  onEntityClick,
}: EntityDetailPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [subgraphData, setSubgraphData] = useState<SubgraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<Entity[]>([]);

  // Fetch subgraph data when entity changes
  useEffect(() => {
    if (!entity || !isOpen) {
      setSubgraphData(null);
      return;
    }

    // Add to navigation history when it's a new entity (not going back)
    if (
      navigationHistory.length === 0 ||
      navigationHistory[navigationHistory.length - 1]?.uuid !== entity.uuid
    ) {
      setNavigationHistory((prev) => [...prev, entity]);
    }

    const fetchSubgraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `http://localhost:8001/api/query/entity/${entity.uuid}/subgraph`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch subgraph');
        }
        const data = await response.json();
        setSubgraphData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSubgraph();
  }, [entity, isOpen]);

  // Render D3 subgraph
  useEffect(() => {
    if (!svgRef.current || !subgraphData || !isOpen) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400;
    const height = 300;

    const container = svg.attr('width', width).attr('height', height).append('g');

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Create force simulation
    const simulation = d3
      .forceSimulation<SubgraphNode>(subgraphData.nodes)
      .force(
        'link',
        d3
          .forceLink<SubgraphNode, D3SubgraphEdge>(subgraphData.edges as any)
          .id((d) => d.id)
          .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create edges
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(subgraphData.edges)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Create edge labels
    const linkLabel = container
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(subgraphData.edges)
      .enter()
      .append('text')
      .text((d: SubgraphEdge) => d.type)
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle');

    // Create nodes
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(subgraphData.nodes)
      .enter()
      .append('g')
      .style('cursor', (d: SubgraphNode) => (d.isCenter ? 'default' : 'pointer'))
      .on('click', (_event: MouseEvent, d: SubgraphNode) => {
        // Don't navigate if clicking the center node
        if (!d.isCenter) {
          // Find the full entity data from the subgraph
          const clickedEntity: Entity = {
            uuid: d.id,
            name: d.label,
            type: d.type,
            summary: subgraphData.nodes.find((n) => n.id === d.id)?.summary,
          };
          // Update the entity prop which will trigger a re-fetch
          onEntityClick?.(clickedEntity);
        }
      })
      .call(
        d3
          .drag<SVGGElement, SubgraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', (d: SubgraphNode) => (d.isCenter ? 25 : 20))
      .attr('fill', (d: SubgraphNode) => colorScale(d.type))
      .attr('stroke', (d: SubgraphNode) => (d.isCenter ? '#ff6b6b' : '#fff'))
      .attr('stroke-width', (d: SubgraphNode) => (d.isCenter ? 4 : 2))
      .style('transition', 'all 0.2s')
      .on('mouseover', function (this: SVGCircleElement, _event: MouseEvent, d: SubgraphNode) {
        if (!d.isCenter) {
          d3.select(this).attr('stroke', '#3b82f6').attr('stroke-width', 3);
        }
      })
      .on('mouseout', function (this: SVGCircleElement, _event: MouseEvent, d: SubgraphNode) {
        if (!d.isCenter) {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
        }
      });

    // Add labels to nodes
    node
      .append('text')
      .text((d: SubgraphNode) => d.label)
      .attr('x', 0)
      .attr('y', (d: SubgraphNode) => (d.isCenter ? 35 : 30))
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', (d: SubgraphNode) => (d.isCenter ? 'bold' : 'normal'))
      .attr('fill', '#333');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d: SubgraphNode) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, SubgraphNode, SubgraphNode>,
      d: SubgraphNode
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGGElement, SubgraphNode, SubgraphNode>,
      d: SubgraphNode
    ) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGGElement, SubgraphNode, SubgraphNode>,
      d: SubgraphNode
    ) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [subgraphData, isOpen]);

  // Handle navigation back
  const handleGoBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current
      const previousEntity = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      onEntityClick?.(previousEntity);
    }
  };

  // Clear history when panel closes
  useEffect(() => {
    if (!isOpen) {
      setNavigationHistory([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {navigationHistory.length > 1 && (
            <button
              onClick={handleGoBack}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold">Entity Details</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation breadcrumb */}
      {navigationHistory.length > 1 && (
        <div className="px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-1 text-xs text-gray-600 overflow-x-auto">
            {navigationHistory.map((item, index) => (
              <div key={item.uuid} className="flex items-center">
                {index > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
                <span
                  className={
                    index === navigationHistory.length - 1 ? 'font-medium text-gray-900' : ''
                  }
                >
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Info */}
      {entity && (
        <div className="p-4 border-b">
          <h3 className="font-medium text-lg">{entity.name}</h3>
          <p className="text-sm text-gray-600">{entity.type}</p>
          {entity.summary && <p className="mt-2 text-sm text-gray-700">{entity.summary}</p>}
        </div>
      )}

      {/* Subgraph Visualization */}
      <div className="flex-1 p-4">
        <h4 className="text-sm font-medium mb-2">Connected Entities</h4>
        {loading && (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-gray-500">Loading connections...</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        )}
        {!loading && !error && subgraphData && (
          <div className="border rounded-lg overflow-hidden">
            <svg ref={svgRef} className="w-full"></svg>
          </div>
        )}
      </div>

      {/* Relationships List */}
      {subgraphData && subgraphData.edges.length > 0 && (
        <div className="p-4 border-t max-h-[200px] overflow-y-auto">
          <h4 className="text-sm font-medium mb-2">Relationships</h4>
          <ul className="space-y-2">
            {subgraphData.edges.map((edge, index) => {
              const sourceNode = subgraphData.nodes.find(
                (n) => n.id === (edge as any).source?.id || edge.source
              );
              const targetNode = subgraphData.nodes.find(
                (n) => n.id === (edge as any).target?.id || edge.target
              );
              return (
                <li key={index} className="text-sm">
                  <span className="font-medium">{sourceNode?.label}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="text-blue-600">{edge.type}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="font-medium">{targetNode?.label}</span>
                  {edge.fact && <p className="text-xs text-gray-600 mt-1">{edge.fact}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
