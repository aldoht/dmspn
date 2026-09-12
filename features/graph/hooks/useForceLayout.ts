import { useMemo } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
} from "d3-force";

type SimNode = { id: string; x?: number; y?: number };
type SimLink = { source: string; target: string };

const NODE_WIDTH = 260;
const NODE_HEIGHT = 90;
const COLLIDE_RADIUS = Math.hypot(NODE_WIDTH, NODE_HEIGHT) / 2 + 60;

export function useForceLayout(
  nodeIds: string[],
  links: { source: string; target: string }[],
) {
  return useMemo(() => {
    const simNodes: SimNode[] = nodeIds.map((id) => ({ id }));
    const simLinks: SimLink[] = links.map((l) => ({ ...l }));

    const simulation = forceSimulation(simNodes)
      .force("charge", forceManyBody().strength(-1000))
      .force(
        "link",
        forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(280),
      )
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(COLLIDE_RADIUS))
      .stop();

    for (let i = 0; i < 500; i++) simulation.tick();

    const positions = new Map<string, { x: number; y: number }>();
    simNodes.forEach((n) => {
      positions.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
    });

    return positions;
  }, [nodeIds, links]);
}
