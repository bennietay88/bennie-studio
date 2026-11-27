import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { Button } from "./button";

type Kind = "loading" | "empty" | "error" | "success";
export function WorkspaceState({ kind, title, description, actionLabel, onAction, compact = false }: {
  kind: Kind; title: string; description?: string; actionLabel?: string; onAction?: () => void; compact?: boolean;
}) {
  const Icon = { loading: Loader2, empty: Inbox, error: AlertCircle, success: CheckCircle2 }[kind];
  return <div className="bt-workspace-state" data-kind={kind} data-compact={compact} role={kind === "error" ? "alert" : "status"} aria-busy={kind === "loading" || undefined}>
    <Icon aria-hidden="true" className={kind === "loading" ? "h-5 w-5 shrink-0 motion-safe:animate-spin" : "h-5 w-5 shrink-0"}/>
    <div className="min-w-0 flex-1"><p className="font-semibold">{title}</p>{description && <p className="mt-1 text-sm">{description}</p>}</div>
    {actionLabel && onAction && <Button type="button" variant="outline" onClick={onAction}>{actionLabel}</Button>}
  </div>;
}
