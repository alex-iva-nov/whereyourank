export const computeDurationMs = (startedAt: number): number => {
  const delta = Date.now() - startedAt;
  return delta > 0 ? delta : 0;
};

export const computeErrorRate = (rowsTotal: number, rowsFailed: number): number => {
  if (rowsTotal <= 0) return 0;
  return Number((rowsFailed / rowsTotal).toFixed(4));
};
