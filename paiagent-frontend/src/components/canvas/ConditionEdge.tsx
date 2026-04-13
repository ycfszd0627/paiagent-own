import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from 'reactflow'

type ConditionEdgeData = {
  label?: string
}

export default function ConditionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<ConditionEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-md border border-border/80 bg-card/95 px-2 py-1 text-[10px] text-foreground shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
