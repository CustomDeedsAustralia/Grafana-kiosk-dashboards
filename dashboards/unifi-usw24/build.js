const fs = require('fs');
const path = require('path');
const config = require('../../dashboard-config');
const { fluxString, writeDashboard } = require('../../build-utils');

const root = __dirname;
const { datasource, bucket, timezone, unifi } = config;
const q = fluxString;
const source = fs.readFileSync(path.join(root, 'echarts.js'), 'utf8');
const getOption = `const deviceConfig = ${JSON.stringify(unifi)};\n${source}`;

const target = (refId, query) => ({
  refId,
  datasource,
  queryType: 'flux',
  query,
});

const dashboard = {
  uid: unifi.dashboardUid,
  title: `Kiosk — ${unifi.deviceName}`,
  description: 'UniFi display-inspired switch telemetry dashboard.',
  tags: ['kiosk', 'unifi', 'ubiquiti', 'network'],
  timezone,
  refresh: '10s',
  time: { from: 'now/d', to: 'now' },
  timepicker: { hidden: true },
  graphTooltip: 0,
  schemaVersion: 42,
  panels: [
    {
      id: 1,
      type: 'volkovlabs-echarts-panel',
      pluginVersion: '7.2.5',
      title: '',
      description: 'Live switch telemetry. The throughput graph uses only the configured uplink RX and TX entities.',
      transparent: true,
      gridPos: { h: 8, w: 24, x: 0, y: 0 },
      datasource,
      targets: [
        target(
          'A',
          `from(bucket: ${q(bucket)})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._field == "value")
  |> filter(fn: (r) => r.domain == "sensor")
  |> filter(fn: (r) =>
    r.entity_id == ${q(unifi.entities.uplinkRx)} or
    r.entity_id == ${q(unifi.entities.uplinkTx)}
  )
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
  |> group(columns: ["entity_id"])`
        ),
        target(
          'B',
          `from(bucket: ${q(bucket)})
  |> range(start: -1h)
  |> filter(fn: (r) => r._field == "value")
  |> filter(fn: (r) => r.domain == "sensor")
  |> filter(fn: (r) =>
    r.entity_id == ${q(unifi.entities.cpu)} or
    r.entity_id == ${q(unifi.entities.memory)} or
    r.entity_id == ${q(unifi.entities.clients)} or
    r.entity_id == ${q(unifi.entities.linkSpeed)}
  )
  |> group(columns: ["entity_id"])
  |> last()`
        ),
        target(
          'C',
          `from(bucket: ${q(bucket)})
  |> range(start: -365d)
  |> filter(fn: (r) => r.entity_id == ${q(unifi.entities.state)} and r._field == "state")
  |> group(columns: ["entity_id"])
  |> last()`
        ),
        target(
          'D',
          `from(bucket: ${q(bucket)})
  |> range(start: -365d)
  |> filter(fn: (r) => r.entity_id == ${q(unifi.entities.uptime)} and r._field == "state")
  |> group(columns: ["entity_id"])
  |> last()
  |> map(fn: (r) => ({
    r with
    _value: float(v: uint(v: now()) - uint(v: time(v: r._value))) / 1000000000.0
  }))`
        ),
        target(
          'E',
          `from(bucket: ${q(bucket)})
  |> range(start: -365d)
  |> filter(fn: (r) =>
    r.entity_id == ${q(unifi.entities.firmware)} and
    r._field == "installed_version_str"
  )
  |> group(columns: ["entity_id"])
  |> last()`
        ),
      ],
      fieldConfig: { defaults: {}, overrides: [] },
      options: {
        renderer: 'canvas',
        map: 'none',
        editorMode: 'code',
        editor: { format: 'auto' },
        themeEditor: { name: 'default', config: '{}' },
        getOption,
        visualEditor: { dataset: [], series: [], code: 'return {};' },
        baidu: { key: '', callback: 'bmapReady' },
        gaode: { key: '', plugin: 'AMap.Scale,AMap.ToolBar' },
        google: { key: '', callback: 'gmapReady' },
      },
    },
  ],
};

writeDashboard(root, dashboard, 'Build configurable UniFi switch kiosk dashboard');
