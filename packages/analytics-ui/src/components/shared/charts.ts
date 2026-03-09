/**
 * Shared utility for rendering SVG line charts.
 * Usage: lineChart(container, data, { width, height, labels? })
 */

export interface LineChartDataset {
  values: number[];
  color: string;
  label: string;
}

export interface LineChartOptions {
  width?: number;
  height?: number;
  labels?: string[];
  yMin?: number;
  yMax?: number;
  padding?: number;
}

export function renderLineChart(
  container: HTMLElement,
  datasets: LineChartDataset[],
  opts: LineChartOptions = {},
): void {
  const W = (opts.width ?? container.clientWidth) || 600;
  const H = opts.height ?? 200;
  const PAD = opts.padding ?? 40;

  const allValues = datasets.flatMap((d) => d.values);
  if (allValues.length === 0) {
    container.innerHTML = '<p class="empty-chart">No data available</p>';
    return;
  }

  const yMin = opts.yMin ?? Math.min(...allValues);
  const yMax = opts.yMax ?? Math.max(...allValues);
  const yRange = yMax - yMin || 1;
  const maxLen = Math.max(...datasets.map((d) => d.values.length));

  const toX = (i: number) => PAD + (i / Math.max(maxLen - 1, 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - yMin) / yRange) * (H - PAD * 2);

  const lines = datasets
    .map((ds) => {
      const points = ds.values
        .map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
        .join(' ');
      return `<polyline points="${points}" fill="none" stroke="${ds.color}" stroke-width="2" stroke-linejoin="round"/>`;
    })
    .join('\n');

  // Y-axis labels (3 ticks)
  const yTicks = [yMin, (yMin + yMax) / 2, yMax]
    .map((v) => `<text x="${PAD - 5}" y="${toY(v).toFixed(1)}" text-anchor="end" class="chart-label">${v.toFixed(1)}</text>`)
    .join('\n');

  // X-axis labels (every ~10 points)
  const step = Math.max(1, Math.floor(maxLen / 5));
  const xTicks = Array.from({ length: maxLen }, (_, i) => i)
    .filter((i) => i % step === 0 || i === maxLen - 1)
    .map((i) => {
      const label = opts.labels?.[i] ?? String(i + 1);
      return `<text x="${toX(i).toFixed(1)}" y="${H - PAD + 14}" text-anchor="middle" class="chart-label">${label}</text>`;
    })
    .join('\n');

  // Legend
  const legend = datasets
    .map(
      (ds, i) =>
        `<g transform="translate(${PAD + i * 120}, ${H - 5})">
          <line x1="0" y1="-4" x2="20" y2="-4" stroke="${ds.color}" stroke-width="2"/>
          <text x="24" y="0" class="chart-label">${ds.label}</text>
        </g>`,
    )
    .join('\n');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H + 20}" width="100%" style="overflow:visible">
      <style>.chart-label { font: 11px system-ui; fill: #94a3b8; }</style>
      <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="#334155" stroke-width="1"/>
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#334155" stroke-width="1"/>
      ${yTicks}
      ${xTicks}
      ${lines}
      ${legend}
    </svg>`;
}

/** Render a horizontal bar chart */
export function renderBarChart(
  container: HTMLElement,
  items: { label: string; value: number; color?: string }[],
  opts: { maxValue?: number; height?: number } = {},
): void {
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-chart">No data available</p>';
    return;
  }
  const maxVal = opts.maxValue ?? Math.max(...items.map((i) => i.value), 1);

  const bars = items
    .map((item) => {
      const pct = ((item.value / maxVal) * 100).toFixed(1);
      const color = item.color ?? '#3b82f6';
      return `
        <div class="bar-row">
          <span class="bar-label">${item.label}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <span class="bar-value">${typeof item.value === 'number' && item.value % 1 !== 0 ? (item.value * 100).toFixed(1) + '%' : item.value}</span>
        </div>`;
    })
    .join('\n');

  container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

/** Render an SVG scatter plot */
export function renderScatterPlot(
  container: HTMLElement,
  points: { x: number; y: number; label?: string; color?: string }[],
  opts: {
    width?: number;
    height?: number;
    xLabel?: string;
    yLabel?: string;
    xMin?: number;
    xMax?: number;
    yMin?: number;
    yMax?: number;
    quadrantLabels?: [string, string, string, string]; // top-right, top-left, bottom-right, bottom-left
  } = {},
): void {
  const W = (opts.width ?? container.clientWidth) || 500;
  const H = opts.height ?? 300;
  const PAD = 50;

  if (points.length === 0) {
    container.innerHTML = '<p class="empty-chart">No data available</p>';
    return;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = opts.xMin ?? Math.min(...xs);
  const xMax = opts.xMax ?? Math.max(...xs);
  const yMin = opts.yMin ?? Math.min(...ys);
  const yMax = opts.yMax ?? Math.max(...ys);

  const toX = (v: number) => PAD + ((v - xMin) / (xMax - xMin || 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - yMin) / (yMax - yMin || 1)) * (H - PAD * 2);

  const midX = toX((xMin + xMax) / 2);
  const midY = toY((yMin + yMax) / 2);

  const dots = points
    .map(
      (p) =>
        `<circle cx="${toX(p.x).toFixed(1)}" cy="${toY(p.y).toFixed(1)}" r="4" fill="${p.color ?? '#3b82f6'}" opacity="0.7">
          ${p.label ? `<title>${p.label}</title>` : ''}
        </circle>`,
    )
    .join('\n');

  const quadrantLabels = opts.quadrantLabels
    ? `
      <text x="${(W - PAD + midX) / 2}" y="${(PAD + midY) / 2}" text-anchor="middle" class="chart-label quadrant">${opts.quadrantLabels[0]}</text>
      <text x="${(PAD + midX) / 2}" y="${(PAD + midY) / 2}" text-anchor="middle" class="chart-label quadrant">${opts.quadrantLabels[1]}</text>
      <text x="${(W - PAD + midX) / 2}" y="${(midY + H - PAD) / 2}" text-anchor="middle" class="chart-label quadrant">${opts.quadrantLabels[2]}</text>
      <text x="${(PAD + midX) / 2}" y="${(midY + H - PAD) / 2}" text-anchor="middle" class="chart-label quadrant">${opts.quadrantLabels[3]}</text>`
    : '';

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%">
      <style>
        .chart-label { font: 11px system-ui; fill: #94a3b8; }
        .chart-label.quadrant { fill: #475569; font-size: 10px; }
      </style>
      <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${H - PAD}" stroke="#334155"/>
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#334155"/>
      <line x1="${midX}" y1="${PAD}" x2="${midX}" y2="${H - PAD}" stroke="#1e293b" stroke-dasharray="4"/>
      <line x1="${PAD}" y1="${midY}" x2="${W - PAD}" y2="${midY}" stroke="#1e293b" stroke-dasharray="4"/>
      ${quadrantLabels}
      ${dots}
      ${opts.xLabel ? `<text x="${W / 2}" y="${H - 5}" text-anchor="middle" class="chart-label">${opts.xLabel}</text>` : ''}
      ${opts.yLabel ? `<text x="12" y="${H / 2}" text-anchor="middle" transform="rotate(-90, 12, ${H / 2})" class="chart-label">${opts.yLabel}</text>` : ''}
    </svg>`;
}
