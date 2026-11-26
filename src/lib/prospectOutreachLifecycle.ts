/** Read-only outreach stage evidence. Day labels designate the current sequence
 * stages; historical messages retain their original sending timestamps. */
export const PROSPECT_STAGE_EVIDENCE = ["cold", "stage1", "stage2", "stage3"] as const;
export const PROSPECT_STAGE_SELECT = "*,"
  + PROSPECT_STAGE_EVIDENCE.map(alias => alias + ":sales_messages!sales_messages_prospect_id_fkey(id)").join(",");
type Evidence = Partial<Record<(typeof PROSPECT_STAGE_EVIDENCE)[number], { id: string }[] | null>>;
export function prospectStageLabel(prospect: Evidence & {outreach_exhausted_at?: string | null; outreach_status?: string | null}): string {
  if (prospect.stage3?.length) return "Day 15 completed";
  if (prospect.stage2?.length) return "Day 8 completed";
  if (prospect.stage1?.length) return "Day 3 completed";
  if (prospect.cold?.length) return "Introduction sent";
  if (prospect.outreach_exhausted_at || prospect.cold === undefined) return "History unavailable";
  return ["not_started", "queued"].includes(String(prospect.outreach_status || "not_started")) ? "New" : "History unavailable";
}
/** Filter before pagination; drafts and failed deliveries cannot complete a stage. */
export function applyProspectStageEvidence(query: any) {
  for (const alias of PROSPECT_STAGE_EVIDENCE) {
    query = query.eq(alias + ".direction", "outbound").eq(alias + ".channel", "email")
      .is(alias + ".reply_to_message_id", null)
      .in(alias + ".status", ["sent", "delivered", "opened", "clicked"])
      .not(alias + ".sent_at", "is", null)
      .limit(1, { referencedTable: alias });
    if (alias !== "cold") query = query.eq(alias + ".provider_payload->>followUpStage", "FOLLOW_UP_" + alias.slice(-1) + "_OF_3");
  }
  return query;
}
export function filterProspectStage(query: any, filter: string) {
  if (filter === "new_prospects") return query.is("cold", null).in("outreach_status", ["not_started", "queued"]);
  if (filter === "introduction_sent") return query.not("cold", "is", null).is("stage1", null).is("stage2", null).is("stage3", null);
  if (filter === "day3_completed") return query.not("stage1", "is", null).is("stage2", null).is("stage3", null);
  if (filter === "day8_completed") return query.not("stage2", "is", null).is("stage3", null);
  if (filter === "day15_completed") return query.not("stage3", "is", null);
  return query;
}
