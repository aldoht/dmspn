"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Graph from "graphology";
import { circular } from "graphology-layout";
import forceAtlas2 from "graphology-layout-forceatlas2";
import louvain from "graphology-communities-louvain";
import Sigma from "sigma";
import { EmpresaNode, TransaccionEdge } from "@/lib/types";

type GraphCanvasProps = {
  nodes: EmpresaNode[];
  edges: TransaccionEdge[];
  onNodeClick?: (nodeId: string) => void;
  onGroupClick?: (groupId: number, nodeIds: string[]) => void;
};

const GROUP_COLORS = [
  "#0F3D3E", // brand
  "#5B4B8A", // accent
  "#2C6E8E", // risk-low
  "#B7791F", // risk-medium
  "#2F6844", // risk-resolved
  "#C2410C", // risk-high
];

export function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  onGroupClick,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph();

    nodes.forEach((n) => {
      const label = n.label.length > 28 ? `${n.label.slice(0, 26)}…` : n.label;
      graph.addNode(n.id, { label, size: 8 });
    });

    edges.forEach((e) => {
      if (!graph.hasEdge(e.source, e.target)) {
        graph.addEdge(e.source, e.target, {
          weight: e.weight ?? 5,
          sospechosa: e.sospechosa ?? false,
        });
      }
    });

    circular.assign(graph);

    forceAtlas2.assign(graph, { iterations: 30 });

    louvain.assign(graph);

    graph.forEachNode((node, attrs) => {
      const community = (attrs.community as number) ?? 0;
      graph.setNodeAttribute(
        node,
        "color",
        GROUP_COLORS[community % GROUP_COLORS.length],
      );
    });

    graph.forEachEdge((edge, attrs) => {
      graph.setEdgeAttribute(
        edge,
        "color",
        attrs.sospechosa ? "#8E1F1F" : "#DDE1DE",
      );

      const weight = (attrs.weight as number) ?? 5;
      const baseSize = Math.min(1 + weight / 4, 15);
      graph.setEdgeAttribute(
        edge,
        "size",
        attrs.sospechosa ? baseSize + 1 : baseSize,
      );
    });

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelFont: "IBM Plex Sans, sans-serif",
      labelSize: 13,
      labelWeight: "600",
      labelColor: {
        color: resolvedTheme === "light" ? "#131A1F" : "#EDF1F0",
      },
      labelDensity: 0.7,
      labelGridCellSize: 100,
      labelRenderedSizeThreshold: 6,
    });

    if (onNodeClick) {
      sigma.on("clickNode", ({ node }) => onNodeClick(node));
    }

    if (onGroupClick) {
      sigma.on("clickNode", ({ node, event }) => {
        if (event.original.shiftKey) {
          const community = graph.getNodeAttribute(node, "community") as number;
          const groupNodeIds = graph
            .nodes()
            .filter(
              (n) => graph.getNodeAttribute(n, "community") === community,
            );
          onGroupClick(community, groupNodeIds);
        }
      });
    }

    return () => {
      sigma.kill();
    };
  }, [nodes, edges, onNodeClick, onGroupClick, resolvedTheme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
