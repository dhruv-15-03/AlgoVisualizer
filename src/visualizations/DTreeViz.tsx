import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TraceEvent, DTreeNode } from '@/types/trace';
import type { Dataset } from '@/types/dataset';
import { colorFor } from '@/lib/utils';

interface DTreeVizProps {
  dataset: Dataset;
  events: TraceEvent[];
  currentStep: number;
}

interface NodeData extends DTreeNode {
  splitFeature?: number;
  splitFeatureName?: string;
  splitThreshold?: number;
  isLeaf?: boolean;
  leafPrediction?: number | null;
  children?: NodeData[];
}

function buildTree(events: TraceEvent[], upTo: number): NodeData | null {
  const nodes = new Map<string, NodeData>();
  let root: NodeData | null = null;

  for (let i = 0; i <= upTo && i < events.length; i += 1) {
    const e = events[i];
    if (e.type === 'dtree:open') {
      const n: NodeData = { ...e.node, children: [] };
      nodes.set(n.id, n);
      if (n.parentId == null) root = n;
    } else if (e.type === 'dtree:split') {
      const parent = nodes.get(e.nodeId);
      if (!parent) continue;
      parent.splitFeature = e.feature;
      parent.splitFeatureName = e.featureName;
      parent.splitThreshold = e.threshold;
      const left: NodeData = { ...e.leftChild, children: [] };
      const right: NodeData = { ...e.rightChild, children: [] };
      nodes.set(left.id, left);
      nodes.set(right.id, right);
      parent.children = [left, right];
    } else if (e.type === 'dtree:leaf') {
      const n = nodes.get(e.nodeId);
      if (n) {
        n.isLeaf = true;
        n.leafPrediction = e.prediction;
      }
    }
  }

  // Mark any node without children that hasn't been split yet as "pending".
  // We render those too — they show up before being split.
  return root;
}

export function DTreeViz({ events, currentStep }: DTreeVizProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const root = useMemo(
    () => buildTree(events, currentStep),
    [events, currentStep],
  );

  const layout = useMemo(() => {
    if (!root || size.w === 0 || size.h === 0) return null;
    const padding = { top: 24, right: 24, bottom: 24, left: 24 };
    const innerW = size.w - padding.left - padding.right;
    const innerH = size.h - padding.top - padding.bottom;
    const hierarchy = d3.hierarchy<NodeData>(root, (d) => d.children);
    const treeLayout = d3.tree<NodeData>().size([innerW, innerH]);
    treeLayout(hierarchy);
    return { hierarchy, padding };
  }, [root, size.w, size.h]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto">
      {layout && size.w > 0 && (
        <svg width={size.w} height={size.h}>
          <g transform={`translate(${layout.padding.left},${layout.padding.top})`}>
            {layout.hierarchy.links().map((link, i) => {
              const sx = (link.source as d3.HierarchyPointNode<NodeData>).x;
              const sy = (link.source as d3.HierarchyPointNode<NodeData>).y;
              const tx = (link.target as d3.HierarchyPointNode<NodeData>).x;
              const ty = (link.target as d3.HierarchyPointNode<NodeData>).y;
              const isLeft = link.target.data.branch === 'left';
              const midY = (sy + ty) / 2;
              return (
                <g key={i}>
                  <path
                    d={`M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={1.5}
                  />
                  <text
                    x={(sx + tx) / 2}
                    y={midY - 4}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={9}
                    fontFamily="JetBrains Mono"
                  >
                    {isLeft ? '≤' : '>'}
                  </text>
                </g>
              );
            })}
            {layout.hierarchy.descendants().map((n) => {
              const p = n as d3.HierarchyPointNode<NodeData>;
              const data = p.data;
              const samples = data.sampleIndices.length;
              const counts = Object.entries(data.classCounts);
              const isLeaf = data.isLeaf;
              const pred = data.leafPrediction;
              const fill = isLeaf
                ? colorFor(typeof pred === 'number' ? pred : 0)
                : '#1e293b';
              return (
                <g key={data.id} transform={`translate(${p.x},${p.y})`}>
                  <rect
                    x={-48}
                    y={-22}
                    width={96}
                    height={44}
                    rx={6}
                    fill={fill}
                    fillOpacity={isLeaf ? 0.85 : 1}
                    stroke="#475569"
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={-6}
                    textAnchor="middle"
                    fill={isLeaf ? '#0f172a' : '#e2e8f0'}
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    fontWeight="600"
                  >
                    {data.splitFeatureName && !isLeaf
                      ? `${data.splitFeatureName} ≤ ${data.splitThreshold?.toFixed(2)}`
                      : isLeaf
                        ? `Class ${pred}`
                        : `Node ${data.id}`}
                  </text>
                  <text
                    x={0}
                    y={8}
                    textAnchor="middle"
                    fill={isLeaf ? '#0f172a' : '#94a3b8'}
                    fontSize={9}
                    fontFamily="JetBrains Mono"
                  >
                    n={samples} · gini={data.gini.toFixed(2)}
                  </text>
                  <text
                    x={0}
                    y={18}
                    textAnchor="middle"
                    fill={isLeaf ? '#0f172a' : '#64748b'}
                    fontSize={8}
                    fontFamily="JetBrains Mono"
                  >
                    {counts.map(([c, v]) => `${c}:${v}`).join(' ')}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
