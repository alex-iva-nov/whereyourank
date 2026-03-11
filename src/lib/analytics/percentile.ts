export const estimatePercentileFromAnchors = (
  value: number,
  anchors: { p10: number; p25: number; p50: number; p75: number; p90: number },
): number => {
  const { p10, p25, p50, p75, p90 } = anchors;

  const interpolate = (x: number, x0: number, x1: number, y0: number, y1: number): number => {
    if (x1 === x0) return y0;
    return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  };

  if (value <= p10) {
    return Math.max(0, interpolate(value, Math.min(p10 - 1, p10), p10, 1, 10));
  }

  if (value <= p25) {
    return interpolate(value, p10, p25, 10, 25);
  }

  if (value <= p50) {
    return interpolate(value, p25, p50, 25, 50);
  }

  if (value <= p75) {
    return interpolate(value, p50, p75, 50, 75);
  }

  if (value <= p90) {
    return interpolate(value, p75, p90, 75, 90);
  }

  return Math.min(99, interpolate(value, p90, Math.max(p90 + 1, value), 90, 99));
};

export const percentileToRankLabel = (percentile: number): string => {
  if (percentile < 20) return "low";
  if (percentile < 40) return "below_avg";
  if (percentile < 60) return "avg";
  if (percentile < 80) return "above_avg";
  return "high";
};
