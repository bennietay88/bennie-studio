export function countMonthlyUpdateAllowance(
  requests: Array<{ allowance_period?: string | null; status?: string | null; consumes_allowance?: boolean | null }>,
  period: string,
) {
  return requests.filter((request) =>
    request.allowance_period === period &&
    request.consumes_allowance !== false &&
    !["draft", "declined", "cancelled"].includes(String(request.status || "")),
  ).length;
}

export function canSubmitMonthlyUpdateRequest({
  loading,
  allowance,
  used,
}: {
  loading: boolean;
  allowance: number;
  used: number;
}) {
  return !loading && Number.isFinite(allowance) && allowance > 0 && used < allowance;
}
