/**
 * Rolling average computation helpers.
 * Uses simple-statistics for statistical functions.
 */
import {
  quantile,
  standardDeviation as ssStdDev,
  linearRegression,
  mean,
} from 'simple-statistics';

/** Compute an N-period moving average over a series. Returns series of same length as input. */
export function rollingAverage(values: number[], window: number): number[] {
  if (values.length === 0) return [];
  if (window <= 0) throw new Error('window must be > 0');
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

/**
 * Compute requested percentile values from a numeric array.
 * @param values  Array of numbers
 * @param quantiles  Percentiles as fractions e.g. [0.25, 0.5, 0.75, 0.95]
 */
export function percentiles(values: number[], quantiles: number[]): number[] {
  if (values.length === 0) return quantiles.map(() => 0);
  const sorted = [...values].sort((a, b) => a - b);
  return quantiles.map((q) => quantile(sorted, q));
}

/**
 * Linear regression slope over a time-indexed series.
 * Positive = improving over time; negative = declining.
 */
export function slope(series: number[]): number {
  if (series.length < 2) return 0;
  const points: [number, number][] = series.map((v, i) => [i, v]);
  const result = linearRegression(points);
  return result.m;
}

/** Population standard deviation. Returns 0 for empty or single-element arrays. */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  return ssStdDev(values);
}

/**
 * Bucket a numeric array into N equal-width bins.
 * Returns at most bucketCount buckets (fewer if all values are equal).
 */
export function histogram(
  values: number[],
  bucketCount: number,
): { min: number; max: number; count: number }[] {
  if (values.length === 0) return [];
  if (bucketCount <= 0) throw new Error('bucketCount must be > 0');

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (minVal === maxVal) {
    return [{ min: minVal, max: maxVal, count: values.length }];
  }

  const width = (maxVal - minVal) / bucketCount;
  const buckets: { min: number; max: number; count: number }[] = Array.from(
    { length: bucketCount },
    (_, i) => ({
      min: minVal + i * width,
      max: minVal + (i + 1) * width,
      count: 0,
    }),
  );

  for (const v of values) {
    // Clamp last bucket to include max value
    const idx = Math.min(
      Math.floor((v - minVal) / width),
      bucketCount - 1,
    );
    buckets[idx]!.count++;
  }

  return buckets;
}

/** Compute population mean. Returns 0 for empty array. */
export function populationMean(values: number[]): number {
  if (values.length === 0) return 0;
  return mean(values);
}
