<script lang="ts">
import { defineComponent, computed, h } from 'vue';
import { format } from 'date-fns';

export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartDatum {
  date: Date;
  value: number;
}

export interface PieChartDatum {
  label: string;
  value: number;
  color: string;
}

function formatDate(date: Date): string {
  return format(date, 'MM-dd');
}

export const BarChart = defineComponent({
  name: 'BarChart',
  props: {
    data: { type: Array as () => BarChartDatum[], required: true },
    height: { type: Number, default: 200 },
  },
  setup(props) {
    const maxValue = computed(() => {
      if (props.data.length === 0) return 1;
      return Math.max(...props.data.map((d) => d.value), 1);
    });

    return () =>
      h(
        'div',
        { class: 'panel-border rounded-lg p-4 bg-console-900/60' },
        [
          h(
            'div',
            { class: 'space-y-3' },
            props.data.map((d, index) =>
              h(
                'div',
                {
                  key: index,
                  class: 'flex items-center gap-3',
                },
                [
                  h(
                    'div',
                    { class: 'w-24 text-xs font-mono text-console-300 truncate shrink-0' },
                    d.label,
                  ),
                  h(
                    'div',
                    {
                      class:
                        'flex-1 h-6 bg-console-700/50 rounded-md overflow-hidden relative',
                    },
                    [
                      h('div', {
                        class: 'h-full rounded-md transition-all duration-700 ease-out',
                        style: {
                          width: `${(d.value / maxValue.value) * 100}%`,
                          backgroundColor: d.color || '#00D4AA',
                          boxShadow: d.color
                            ? `0 0 10px ${d.color}40`
                            : '0 0 10px rgba(0,212,170,0.25)',
                        },
                      }),
                    ],
                  ),
                  h(
                    'div',
                    {
                      class:
                        'w-16 text-right text-xs font-mono font-bold text-console-100 tabular-nums shrink-0',
                    },
                    String(d.value),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
  },
});

export const LineChart = defineComponent({
  name: 'LineChart',
  props: {
    data: { type: Array as () => LineChartDatum[], required: true },
    color: { type: String, default: '#00D4AA' },
    height: { type: Number, default: 200 },
    showArea: { type: Boolean, default: true },
  },
  setup(props) {
    const lineMaxValue = computed(() => {
      if (props.data.length === 0) return 1;
      return Math.max(...props.data.map((d) => d.value), 1);
    });

    const lineMinValue = computed(() => {
      if (props.data.length === 0) return 0;
      return Math.min(...props.data.map((d) => d.value), 0);
    });

    const lineRange = computed(() => {
      return lineMaxValue.value - lineMinValue.value || 1;
    });

    const points = computed(() => {
      const padding = 20;
      const count = props.data.length;
      if (count === 0) return [] as { x: number; y: number; datum: LineChartDatum }[];
      const innerHeight = props.height - padding * 2;
      const step = count > 1 ? (count * 60 - padding * 2) / (count - 1) : 0;
      return props.data.map((d, i) => {
        const x = padding + i * step;
        const normalized = (d.value - lineMinValue.value) / lineRange.value;
        const y = padding + (1 - normalized) * innerHeight;
        return { x, y, datum: d };
      });
    });

    const linePath = computed(() => {
      if (points.value.length === 0) return '';
      return points.value
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');
    });

    const areaPath = computed(() => {
      if (points.value.length === 0) return '';
      const padding = 20;
      const first = points.value[0];
      const last = points.value[points.value.length - 1];
      const baseLine = props.height - padding;
      return (
        `M ${first.x.toFixed(2)} ${baseLine} ` +
        points.value.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
        ` L ${last.x.toFixed(2)} ${baseLine} Z`
      );
    });

    const svgWidth = computed(() => {
      return props.data.length > 0 ? props.data.length * 60 : 100;
    });

    const viewBox = computed(() => `0 0 ${svgWidth.value} ${props.height}`);

    return () =>
      h(
        'div',
        {
          class:
            'panel-border rounded-lg p-4 bg-console-900/60 overflow-x-auto',
        },
        [
          h(
            'svg',
            {
              viewBox: viewBox.value,
              style: {
                height: `${props.height}px`,
                width: '100%',
                minWidth: `${svgWidth.value}px`,
              },
              xmlns: 'http://www.w3.org/2000/svg',
              preserveAspectRatio: 'none',
            },
            [
              h('defs', [
                h('linearGradient', {
                  id: 'lineAreaGradient',
                  x1: '0',
                  y1: '0',
                  x2: '0',
                  y2: '1',
                }, [
                  h('stop', {
                    offset: '0%',
                    'stop-color': props.color,
                    'stop-opacity': '0.3',
                  }),
                  h('stop', {
                    offset: '100%',
                    'stop-color': props.color,
                    'stop-opacity': '0',
                  }),
                ]),
              ]),
              ...[0, 1, 2, 3, 4].map((i) =>
                h('line', {
                  key: `grid-${i}`,
                  x1: 20,
                  y1: 20 + ((props.height - 40) / 4) * i,
                  x2: svgWidth.value - 20,
                  y2: 20 + ((props.height - 40) / 4) * i,
                  stroke: 'rgba(255,255,255,0.05)',
                  'stroke-width': '1',
                }),
              ),
              props.showArea && points.value.length > 0
                ? h('path', {
                    d: areaPath.value,
                    fill: 'url(#lineAreaGradient)',
                  })
                : null,
              points.value.length > 0
                ? h('path', {
                    d: linePath.value,
                    fill: 'none',
                    stroke: props.color,
                    'stroke-width': '2',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    style: { filter: `drop-shadow(0 0 4px ${props.color}80)` },
                  })
                : null,
              ...points.value.map((p, i) =>
                h('g', { key: `point-${i}` }, [
                  h('circle', {
                    cx: p.x,
                    cy: p.y,
                    r: 3.5,
                    fill: '#0f172a',
                    stroke: props.color,
                    'stroke-width': '2',
                  }),
                  h(
                    'text',
                    {
                      x: p.x,
                      y: props.height - 4,
                      'text-anchor': 'middle',
                      'font-size': '9',
                      'font-family': 'monospace',
                      fill: 'currentColor',
                      class: 'text-console-400',
                    },
                    formatDate(p.datum.date),
                  ),
                  h(
                    'text',
                    {
                      x: p.x,
                      y: p.y - 8,
                      'text-anchor': 'middle',
                      'font-size': '10',
                      'font-family': 'monospace',
                      'font-weight': 'bold',
                      fill: 'currentColor',
                      class: 'text-console-200',
                    },
                    String(p.datum.value),
                  ),
                ]),
              ),
            ],
          ),
        ],
      );
  },
});

export const PieChart = defineComponent({
  name: 'PieChart',
  props: {
    data: { type: Array as () => PieChartDatum[], required: true },
    size: { type: Number, default: 200 },
    donut: { type: Boolean, default: false },
  },
  setup(props) {
    const pieTotal = computed(() => {
      return props.data.reduce((sum, d) => sum + d.value, 0) || 1;
    });

    interface PieSegment {
      path: string;
      color: string;
      label: string;
      value: number;
      percentage: number;
      labelX: number;
      labelY: number;
    }

    const pieSegments = computed<PieSegment[]>(() => {
      const size = props.size;
      const radius = size / 2;
      const cx = radius;
      const cy = radius;
      const innerRadius = props.donut ? radius * 0.6 : 0;
      let startAngle = -Math.PI / 2;

      return props.data.map((d) => {
        const percentage = d.value / pieTotal.value;
        const angle = percentage * Math.PI * 2;
        const endAngle = startAngle + angle;

        const x1 = cx + radius * Math.cos(startAngle);
        const y1 = cy + radius * Math.sin(startAngle);
        const x2 = cx + radius * Math.cos(endAngle);
        const y2 = cy + radius * Math.sin(endAngle);
        const largeArc = angle > Math.PI ? 1 : 0;

        let path: string;

        if (percentage >= 0.999) {
          if (props.donut) {
            path = `
              M ${cx} ${cy - radius}
              A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}
              L ${cx - 0.01} ${cy - innerRadius}
              A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}
              Z
            `;
          } else {
            path = `
              M ${cx} ${cy - radius}
              A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}
              Z
            `;
          }
        } else {
          if (props.donut) {
            const xi1 = cx + innerRadius * Math.cos(startAngle);
            const yi1 = cy + innerRadius * Math.sin(startAngle);
            const xi2 = cx + innerRadius * Math.cos(endAngle);
            const yi2 = cy + innerRadius * Math.sin(endAngle);
            path = `
              M ${x1.toFixed(4)} ${y1.toFixed(4)}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)}
              L ${xi2.toFixed(4)} ${yi2.toFixed(4)}
              A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${xi1.toFixed(4)} ${yi1.toFixed(4)}
              Z
            `;
          } else {
            path = `
              M ${cx} ${cy}
              L ${x1.toFixed(4)} ${y1.toFixed(4)}
              A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(4)} ${y2.toFixed(4)}
              Z
            `;
          }
        }

        const midAngle = startAngle + angle / 2;
        const labelRadius = (radius + innerRadius) / 2;
        const labelX = cx + labelRadius * Math.cos(midAngle);
        const labelY = cy + labelRadius * Math.sin(midAngle);

        startAngle = endAngle;

        return {
          path,
          color: d.color,
          label: d.label,
          value: d.value,
          percentage: Math.round(percentage * 100),
          labelX,
          labelY,
        };
      });
    });

    return () =>
      h(
        'div',
        { class: 'panel-border rounded-lg p-4 bg-console-900/60' },
        [
          h(
            'div',
            { class: 'flex items-center gap-6' },
            [
              h(
                'svg',
                {
                  width: props.size,
                  height: props.size,
                  xmlns: 'http://www.w3.org/2000/svg',
                },
                pieSegments.value.map((seg, i) =>
                  h('g', { key: i }, [
                    h('path', {
                      d: seg.path,
                      fill: seg.color,
                      stroke: '#0f172a',
                      'stroke-width': '1.5',
                      style: { filter: `drop-shadow(0 0 6px ${seg.color}40)` },
                    }),
                    props.donut && seg.percentage >= 5
                      ? h(
                          'text',
                          {
                            x: seg.labelX,
                            y: seg.labelY,
                            'text-anchor': 'middle',
                            'dominant-baseline': 'middle',
                            fill: 'white',
                            'font-size': '11',
                            'font-family': 'monospace',
                            'font-weight': 'bold',
                          },
                          `${seg.percentage}%`,
                        )
                      : null,
                  ]),
                ),
              ),
              h(
                'div',
                { class: 'flex-1 space-y-2 min-w-0' },
                pieSegments.value.map((seg, i) =>
                  h(
                    'div',
                    {
                      key: `legend-${i}`,
                      class:
                        'flex items-center justify-between gap-3 text-xs font-mono',
                    },
                    [
                      h(
                        'div',
                        { class: 'flex items-center gap-2 min-w-0' },
                        [
                          h('span', {
                            class: 'w-3 h-3 rounded shrink-0',
                            style: {
                              backgroundColor: seg.color,
                              boxShadow: `0 0 6px ${seg.color}60`,
                            },
                          }),
                          h(
                            'span',
                            {
                              class: 'text-console-200 truncate',
                            },
                            seg.label,
                          ),
                        ],
                      ),
                      h(
                        'div',
                        { class: 'flex items-center gap-2 shrink-0' },
                        [
                          h(
                            'span',
                            {
                              class:
                                'text-console-100 font-bold tabular-nums',
                            },
                            String(seg.value),
                          ),
                          h(
                            'span',
                            {
                              class:
                                'text-console-400 w-10 text-right tabular-nums',
                            },
                            `${seg.percentage}%`,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      );
  },
});
</script>
