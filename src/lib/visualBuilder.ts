import type { WebsiteSection } from "../types";
export type BuilderAction =
  | { kind: "insert"; section: WebsiteSection; index: number }
  | { kind: "move"; id: string; index: number }
  | { kind: "duplicate"; id: string; newId: string }
  | { kind: "visibility"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "content"; id: string; patch: Record<string, unknown> };
export function applyBuilderAction(sections: readonly WebsiteSection[], action: BuilderAction): WebsiteSection[] {
  const next = [...sections];
  const bound = (index:number) => Math.max(0, Math.min(next.length, index));
  if (action.kind === "insert") {
    if (next.some(section => section.id === action.section.id)) return next;
    next.splice(bound(action.index), 0, action.section);
    return next;
  }
  const index = next.findIndex(section => section.id === action.id);
  if (index < 0) return next;
  const section = next[index];
  switch (action.kind) {
    case "move": {
      const target = bound(action.index);
      if (target === index || target === index+1) return next;
      next.splice(index,1);
      next.splice(target > index ? target-1 : target,0,section);
      break;
    }
    case "duplicate":
      if (!next.some(item => item.id === action.newId))
        next.splice(index+1,0,{...JSON.parse(JSON.stringify(section)),id:action.newId});
      break;
    case "visibility": next[index] = {...section,isVisible:section.isVisible === false}; break;
    case "remove": next.splice(index,1); break;
    case "content": next[index] = {...section,content:{...section.content,...action.patch}}; break;
  }
  return next;
}
export type BuilderChange = { pageId: string; before: WebsiteSection[]; after: WebsiteSection[] };
export function matchesBuilderSnapshot(actual: readonly WebsiteSection[], expected: readonly WebsiteSection[]) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}
