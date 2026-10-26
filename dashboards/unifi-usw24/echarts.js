const frames = context.panel.data.series || [];

const values = (field) => {
  if (!field || !field.values) return [];
  if (typeof field.values.toArray === 'function') return field.values.toArray();
  if (field.values.buffer) return field.values.buffer;
  return Array.from(field.values);
};

const metric = {};
let firmware = '—';
let state = 'unknown';
let rangeStart;
let rangeStop;

for (const frame of frames) {
  const startField = frame.fields.find((field) => field.name === '_start');
  const stopField = frame.fields.find((field) => field.name === '_stop');
  rangeStart ??= values(startField)[0];
  rangeStop ??= values(stopField)[0];
  const timeField =
    frame.fields.find((field) => field.name === '_time') ||
    frame.fields.find((field) => field.name === 'Time') ||
    frame.fields.find((field) => field.type === 'time');
  const valueField =
    frame.fields.find((field) => field.name === '_value') ||
    frame.fields.find((field) => field.name === 'Value') ||
    frame.fields.find(
      (field) =>
        field.type !== 'time' &&
        !['_field', '_measurement', 'domain'].includes(field.name)
    );
  if (!valueField) continue;

  const entityId = valueField.labels?.entity_id;
  const fieldValues = values(valueField);
  if (entityId) {
    metric[entityId] = {
      times: values(timeField),
      values: fieldValues,
      latest: fieldValues.filter((value) => value !== null && value !== undefined).at(-1),
    };
  }

  if (entityId === deviceConfig.entities.firmware && fieldValues.length) {
    firmware = String(fieldValues.at(-1));
  }
  if (entityId === deviceConfig.entities.state && fieldValues.length) {
    state = String(fieldValues.at(-1));
  }
}

const rx = metric[deviceConfig.entities.uplinkRx] || { times: [], values: [], latest: 0 };
const tx = metric[deviceConfig.entities.uplinkTx] || { times: [], values: [], latest: 0 };
const cpu = Number(metric[deviceConfig.entities.cpu]?.latest || 0);
const memory = Number(metric[deviceConfig.entities.memory]?.latest || 0);
const clients = Number(metric[deviceConfig.entities.clients]?.latest || 0);
const linkSpeed = Number(metric[deviceConfig.entities.linkSpeed]?.latest || 0);
const uptimeSeconds = Number(metric[deviceConfig.entities.uptime]?.latest || 0);

const W = context.panel.chart.getWidth();
const H = context.panel.chart.getHeight();
const pad = 16;
const gap = 14;
const leftWidth = Math.max(440, Math.floor((W - pad * 2 - gap) * 0.57));
const rightX = pad + leftWidth + gap;
const rightWidth = W - rightX - pad;
const smallGap = 12;
const compact = H < 420;
const smallWidth = compact
  ? Math.floor((rightWidth - smallGap * 2) / 3)
  : Math.floor((rightWidth - smallGap) / 2);
const smallHeight = compact
  ? Math.floor((H - pad * 2 - smallGap) / 2)
  : Math.floor((H - pad * 2 - smallGap * 2) / 3);

const colors = {
  background: '#03071A',
  card: '#08133F',
  cardAlt: '#0A174B',
  border: '#173C9A',
  primary: '#4B7CFF',
  secondary: '#7EA5FF',
  cyan: '#58C7FF',
  text: '#F4F7FF',
  muted: '#7188C3',
  green: '#4FE3A4',
};

const text = (x, y, value, size, color = colors.text, weight = 500, align = 'left') => ({
  type: 'text',
  silent: true,
  style: {
    x,
    y,
    text: String(value),
    fill: color,
    font: `${weight} ${size}px "Segoe UI", sans-serif`,
    textAlign: align,
    textVerticalAlign: 'middle',
  },
});

const card = (x, y, width, height, title, children = []) => ({
  type: 'group',
  left: x,
  top: y,
  silent: true,
  children: [
    {
      type: 'rect',
      shape: { x: 0, y: 0, width, height, r: 18 },
      style: {
        fill: colors.card,
        stroke: colors.border,
        lineWidth: 1,
        shadowBlur: 18,
        shadowColor: 'rgba(0, 18, 75, 0.55)',
      },
    },
    text(22, 31, title, 15, colors.text, 700),
    {
      type: 'circle',
      shape: { cx: width - 26, cy: 29, r: 9 },
      style: { fill: 'transparent', stroke: colors.primary, lineWidth: 2 },
    },
    text(width - 26, 29, 'i', 11, colors.secondary, 700, 'center'),
    ...children,
  ],
});

const bar = (x, y, width, value, color) => [
  {
    type: 'rect',
    shape: { x, y, width, height: 7, r: 4 },
    style: { fill: '#101D4F' },
  },
  {
    type: 'rect',
    shape: { x, y, width: Math.max(0, Math.min(width, width * value / 100)), height: 7, r: 4 },
    style: { fill: color },
  },
];

const days = Math.floor(uptimeSeconds / 86400);
const hours = Math.floor((uptimeSeconds % 86400) / 3600);
const minutes = Math.floor((uptimeSeconds % 3600) / 60);
const seconds = Math.floor(uptimeSeconds % 60);
const stateOk = state.toLowerCase() === 'connected';

const infoY = pad;
const healthX = rightX;
const utilizationX = rightX + smallWidth + smallGap;
const row2Y = pad + smallHeight + smallGap;
const row3Y = row2Y + smallHeight + smallGap;
const uptimeWidth = compact ? smallWidth * 2 + smallGap : rightWidth;
const hardwareX = compact ? rightX + (smallWidth + smallGap) * 2 : healthX;
const hardwareY = compact ? row2Y : row3Y;
const versionX = compact ? rightX + (smallWidth + smallGap) * 2 : utilizationX;
const versionY = compact ? infoY : row3Y;

const graphics = [
  {
    type: 'rect',
    left: 0,
    top: 0,
    shape: { width: W, height: H },
    style: { fill: colors.background },
    silent: true,
  },
  card(pad, pad, leftWidth, H - pad * 2, `${deviceConfig.uplinkLabel} WAN UPLINK`, [
    text(28, 83, 'Internet Utilisation Today', 14, colors.muted, 700),
    text(leftWidth - 200, 49, '▲', 20, colors.cyan, 700),
    text(leftWidth - 168, 49, `${Number(tx.latest || 0).toFixed(1)}`, 34, colors.text, 700),
    text(leftWidth - 73, 51, 'Mbps', 16, colors.secondary, 500),
    text(leftWidth - 200, 89, '▼', 20, colors.primary, 700),
    text(leftWidth - 168, 89, `${Number(rx.latest || 0).toFixed(1)}`, 34, colors.text, 700),
    text(leftWidth - 73, 91, 'Mbps', 16, colors.secondary, 500),
  ]),
  card(healthX, infoY, smallWidth, smallHeight, 'STATUS', [
    text(smallWidth / 2, smallHeight * 0.48, stateOk ? 'CONNECTED' : state.toUpperCase(), 22, stateOk ? colors.green : '#FF6B77', 700, 'center'),
    text(smallWidth / 2, smallHeight * 0.70, `${clients} CLIENTS`, 14, colors.secondary, 600, 'center'),
    text(smallWidth / 2, smallHeight * 0.84, `${linkSpeed.toFixed(0)} Mbps UPLINK`, 12, colors.muted, 500, 'center'),
  ]),
  card(utilizationX, infoY, smallWidth, smallHeight, 'UTILISATION', [
    text(20, smallHeight * 0.45, 'CPU', 12, colors.muted, 700),
    text(smallWidth - 20, smallHeight * 0.45, `${cpu.toFixed(1)}%`, 16, colors.text, 700, 'right'),
    ...bar(20, smallHeight * 0.56, smallWidth - 40, cpu, colors.cyan),
    text(20, smallHeight * 0.73, 'MEMORY', 12, colors.muted, 700),
    text(smallWidth - 20, smallHeight * 0.73, `${memory.toFixed(1)}%`, 16, colors.text, 700, 'right'),
    ...bar(20, smallHeight * 0.84, smallWidth - 40, memory, colors.primary),
  ]),
  card(healthX, row2Y, uptimeWidth, smallHeight, 'UPTIME', [
    ...[
      [days, 'DAYS'],
      [hours, 'HRS'],
      [minutes, 'MINS'],
      [seconds, 'SECS'],
    ].flatMap(([value, label], index) => {
      const x = uptimeWidth * (index + 0.5) / 4;
      return [
        text(x, smallHeight * 0.54, String(value).padStart(2, '0'), 25, colors.primary, 700, 'center'),
        text(x, smallHeight * 0.76, label, 10, colors.muted, 700, 'center'),
      ];
    }),
  ]),
  card(hardwareX, hardwareY, smallWidth, smallHeight, 'HARDWARE', [
    text(18, smallHeight * 0.45, 'Board Revision', 12, colors.muted, 500),
    text(smallWidth - 18, smallHeight * 0.45, deviceConfig.hardwareRevision, 15, colors.secondary, 700, 'right'),
    text(smallWidth / 2, smallHeight * 0.68, deviceConfig.macAddress, 15, colors.primary, 700, 'center'),
    text(smallWidth / 2, smallHeight * 0.84, deviceConfig.model, 11, colors.muted, 600, 'center'),
  ]),
  card(versionX, versionY, smallWidth, smallHeight, 'VERSION', [
    text(smallWidth / 2, smallHeight * 0.48, deviceConfig.deviceName, 15, colors.secondary, 600, 'center'),
    text(smallWidth / 2, smallHeight * 0.72, firmware, 24, colors.primary, 700, 'center'),
  ]),
];

return {
  backgroundColor: colors.background,
  animationDuration: 450,
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#09143B',
    borderColor: colors.border,
    textStyle: { color: colors.text },
    valueFormatter: (value) => `${Number(value).toFixed(2)} Mbps`,
  },
  grid: {
    left: pad + 28,
    top: compact ? 145 : 166,
    width: leftWidth - 56,
    height: compact ? Math.max(55, H - 205) : Math.max(100, H - 238),
    containLabel: false,
  },
  xAxis: {
    type: 'time',
    min: rangeStart,
    max: rangeStop,
    boundaryGap: false,
    axisLine: { lineStyle: { color: '#284383' } },
    axisLabel: {
      show: true,
      color: colors.muted,
      hideOverlap: true,
      formatter: {
        hour: '{HH}:{mm}',
        minute: '{HH}:{mm}',
      },
    },
    axisTick: { show: false },
    splitLine: { show: false },
  },
  yAxis: [
    {
      type: 'value',
      name: 'Download Mbps',
      position: 'left',
      nameGap: 8,
      min: 0,
      max: ({ max }) => Math.max(1, max * 1.15),
      nameTextStyle: { color: colors.primary, fontSize: 10, fontWeight: 600, align: 'left' },
      axisLabel: {
        show: true,
        inside: true,
        color: colors.primary,
        fontSize: 9,
        formatter: (value) => Number(value).toFixed(value < 10 ? 1 : 0),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: '#142452', opacity: 0.45 } },
    },
    {
      type: 'value',
      name: 'Upload Mbps',
      position: 'right',
      nameGap: 8,
      min: 0,
      max: ({ max }) => Math.max(1, max * 1.15),
      nameTextStyle: { color: colors.cyan, fontSize: 10, fontWeight: 600, align: 'right' },
      axisLabel: {
        show: true,
        inside: true,
        color: colors.cyan,
        fontSize: 9,
        formatter: (value) => Number(value).toFixed(value < 10 ? 1 : 0),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      id: 'port24-download',
      name: 'Download',
      type: 'line',
      yAxisIndex: 0,
      data: rx.times.map((time, index) => [time, rx.values[index]]),
      showSymbol: false,
      smooth: 0.28,
      lineStyle: { width: 3, color: colors.primary },
      z: 3,
    },
    {
      id: 'port24-upload',
      name: 'Upload',
      type: 'line',
      yAxisIndex: 1,
      data: tx.times.map((time, index) => [time, tx.values[index]]),
      showSymbol: false,
      smooth: 0.28,
      lineStyle: { width: 3, color: colors.cyan },
      z: 2,
    },
  ],
  graphic: graphics,
};
