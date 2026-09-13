import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function TransaccionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature: (data?.curvature as number) ?? 0.25,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${
              labelY + ((data?.labelOffsetY as number) ?? 0)
            }px)`,
            pointerEvents: "all",
          }}
          className="whitespace-nowrap rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text-primary shadow-sm"
        >
          {data?.label as string}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
