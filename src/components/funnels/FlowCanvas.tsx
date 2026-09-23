import React from "react";
import { ArrowRight, Link2, Move, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

export interface FlowCanvasNode {
  id: string;
  title: string;
  subtitle?: string;
  kind?: string;
  x: number;
  y: number;
  badge?: string;
  metrics?: Array<{ label: string; value: string }>;
  tone?: "indigo" | "emerald" | "amber" | "rose" | "slate";
}

export interface FlowCanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  branchKey?: string;
}

interface FlowCanvasProps {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];
  editable?: boolean;
  selectedNodeId?: string | null;
  connectingFrom?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, x: number, y: number) => void;
  onMoveNodeCommit?: (nodeId: string, x: number, y: number) => void;
  onStartConnection?: (nodeId: string) => void;
  onCompleteConnection?: (sourceId: string, targetId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  className?: string;
}

const NODE_WIDTH = 244;
const NODE_HEIGHT = 148;
const toneClasses: Record<string, string> = {
  indigo: "border-indigo-200 bg-indigo-50/40",
  emerald: "border-emerald-200 bg-emerald-50/40",
  amber: "border-amber-200 bg-amber-50/40",
  rose: "border-rose-200 bg-rose-50/40",
  slate: "border-slate-200 bg-white",
};

export function FlowCanvas({
  nodes,
  edges,
  editable = false,
  selectedNodeId,
  connectingFrom,
  onSelectNode,
  onMoveNode,
  onMoveNodeCommit,
  onStartConnection,
  onCompleteConnection,
  onDeleteEdge,
  className,
}: FlowCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number; lastX: number; lastY: number } | null>(null);

  const nodeMap = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const bounds = React.useMemo(() => {
    const width = Math.max(1100, ...nodes.map((node) => node.x + NODE_WIDTH + 180));
    const height = Math.max(720, ...nodes.map((node) => node.y + NODE_HEIGHT + 180));
    return { width, height };
  }, [nodes]);

  const startDrag = (event: React.PointerEvent, node: FlowCanvasNode) => {
    if (!editable || !canvasRef.current) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      id: node.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left + canvasRef.current.scrollLeft - node.x,
      offsetY: event.clientY - rect.top + canvasRef.current.scrollTop - node.y,
      lastX: node.x,
      lastY: node.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !canvasRef.current || drag.pointerId !== event.pointerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(24, event.clientX - rect.left + canvasRef.current.scrollLeft - drag.offsetX);
    const y = Math.max(24, event.clientY - rect.top + canvasRef.current.scrollTop - drag.offsetY);
    drag.lastX = Math.round(x);
    drag.lastY = Math.round(y);
    onMoveNode?.(drag.id, drag.lastX, drag.lastY);
  };

  const finishDrag = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    onMoveNodeCommit?.(drag.id, drag.lastX, drag.lastY);
  };

  return (
    <div
      ref={canvasRef}
      className={cn("relative min-h-[650px] overflow-auto rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_1px_1px,#cbd5e1_1px,transparent_0)] bg-[length:24px_24px]", className)}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div className="relative" style={{ width: bounds.width, height: bounds.height }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);
            if (!source || !target) return null;
            const x1 = source.x + NODE_WIDTH;
            const y1 = source.y + NODE_HEIGHT / 2;
            const x2 = target.x;
            const y2 = target.y + NODE_HEIGHT / 2;
            const bend = Math.max(80, Math.abs(x2 - x1) * 0.45);
            const d = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
            return <path key={edge.id} d={d} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#flow-arrow)" />;
          })}
        </svg>

        {edges.map((edge) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;
          const left = (source.x + NODE_WIDTH + target.x) / 2 - 44;
          const top = (source.y + target.y) / 2 + NODE_HEIGHT / 2 - 16;
          return (
            <div key={`${edge.id}-label`} className="absolute z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 shadow-sm" style={{ left, top }}>
              <ArrowRight className="h-3 w-3" />
              <span className="max-w-24 truncate">{edge.label || edge.branchKey || "Next"}</span>
              {editable && onDeleteEdge ? (
                <button type="button" aria-label="Delete connection" onClick={() => onDeleteEdge(edge.id)} className="ml-1 rounded-full p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          );
        })}

        {nodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const connecting = node.id === connectingFrom;
          return (
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (connectingFrom && connectingFrom !== node.id && editable) {
                  onCompleteConnection?.(connectingFrom, node.id);
                } else {
                  onSelectNode?.(node.id);
                }
              }}
              onPointerDown={(event) => startDrag(event, node)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelectNode?.(node.id);
              }}
              className={cn(
                "absolute z-20 cursor-pointer select-none rounded-3xl border-2 p-5 shadow-sm transition-[box-shadow,border-color] duration-150",
                toneClasses[node.tone || "slate"],
                selected && "border-indigo-500 shadow-xl shadow-indigo-100",
                connecting && "border-violet-500 ring-4 ring-violet-100",
                editable && "cursor-grab active:cursor-grabbing",
              )}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{node.kind || "Step"}</p>
                  <h3 className="mt-1 truncate text-base font-black text-slate-950">{node.title}</h3>
                  {node.subtitle ? <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">{node.subtitle}</p> : null}
                </div>
                <Move className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
              {node.badge ? <span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-sm">{node.badge}</span> : null}
              {node.metrics?.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/70 pt-3">
                  {node.metrics.slice(0, 4).map((metric) => (
                    <div key={metric.label}>
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{metric.label}</p>
                      <p className="text-sm font-black text-slate-900">{metric.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {editable && onStartConnection ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartConnection(node.id);
                  }}
                  className={cn("absolute -right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md hover:bg-indigo-600", connecting && "bg-violet-600")}
                  aria-label={connecting ? "Cancel connection" : `Connect from ${node.title}`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
