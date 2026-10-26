const config = require('../../dashboard-config');
const { fluxString, writeDashboard } = require('../../build-utils');

const root = __dirname;
const { datasource, bucket, timezone, computerRoom: room } = config;
const q = fluxString;
const target = (query) => ({
  refId: 'A',
  datasource,
  queryType: 'flux',
  query,
});

const statOptions = (graphMode) => ({
  reduceOptions: { calcs: ['lastNotNull'], fields: '' },
  orientation: 'auto',
  textMode: 'value',
  colorMode: 'value',
  graphMode,
  justifyMode: 'center',
});

const dashboard = {
  uid: 'kiosk-computer-room',
  title: 'Kiosk — Computer Room',
  tags: ['kiosk', 'computer-room'],
  timezone,
  refresh: '30s',
  time: { from: 'now-12h', to: 'now' },
  timepicker: { hidden: true },
  graphTooltip: 0,
  schemaVersion: 42,
  panels: [
    {
      id: 2,
      type: 'stat',
      title: 'Rack power',
      description: 'Current power consumption of the configured rack power sensor.',
      gridPos: { h: 8, w: 5, x: 0, y: 0 },
      datasource,
      targets: [
        target(`import "timezone"

option location = timezone.location(name: ${q(timezone)})

from(bucket: ${q(bucket)})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._field == "value")
  |> filter(fn: (r) => r.domain == "sensor")
  |> filter(fn: (r) => r.entity_id == ${q(room.rackPowerEntity)})
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> group(columns: ["_field"])`),
      ],
      fieldConfig: {
        defaults: {
          unit: 'watt',
          decimals: 0,
          color: { mode: 'thresholds' },
          thresholds: {
            mode: 'absolute',
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: room.powerWarning },
              { color: 'red', value: room.powerCritical },
            ],
          },
        },
        overrides: [],
      },
      options: statOptions('area'),
    },
    {
      id: 3,
      type: 'stat',
      title: 'Energy today',
      gridPos: { h: 8, w: 5, x: 5, y: 0 },
      datasource,
      targets: [
        target(`import "timezone"

option location = timezone.location(name: ${q(timezone)})

from(bucket: ${q(bucket)})
  |> range(start: -2h)
  |> filter(fn: (r) => r._field == "value")
  |> filter(fn: (r) => r.domain == "sensor")
  |> filter(fn: (r) => r.entity_id == ${q(room.rackEnergyTodayEntity)})
  |> last()
  |> group(columns: ["_field"])`),
      ],
      fieldConfig: {
        defaults: {
          unit: 'kwatth',
          decimals: 2,
          color: { mode: 'fixed', fixedColor: '#E02F44' },
        },
        overrides: [],
      },
      options: statOptions('none'),
    },
    {
      id: 1,
      type: 'timeseries',
      title: 'Rack environment & UPS',
      gridPos: { h: 8, w: 14, x: 10, y: 0 },
      datasource,
      targets: [
        target(`import "timezone"

option location = timezone.location(name: ${q(timezone)})

from(bucket: ${q(bucket)})
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._field == "value")
  |> filter(fn: (r) => r.domain == "sensor")
  |> filter(fn: (r) =>
    r.entity_id == ${q(room.temperatureEntity)} or
    r.entity_id == ${q(room.humidityEntity)} or
    r.entity_id == ${q(room.upsLoadEntity)} or
    r.entity_id == ${q(room.rackPowerEntity)}
  )
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> map(fn: (r) => ({
    r with
    _field:
      if r.entity_id == ${q(room.temperatureEntity)} then "°C Rack temp"
      else if r.entity_id == ${q(room.humidityEntity)} then "% Rack humidity"
      else if r.entity_id == ${q(room.upsLoadEntity)} then "% UPS load"
      else if r.entity_id == ${q(room.rackPowerEntity)} then "W Rack power"
      else r.entity_id
  }))
  |> group(columns: ["_field"])
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> yield(name: "computer_room_rack")`),
      ],
      fieldConfig: {
        defaults: {
          custom: {
            drawStyle: 'line',
            lineWidth: 2,
            fillOpacity: 12,
            showPoints: 'never',
            spanNulls: true,
            axisGridShow: false,
          },
          color: { mode: 'palette-classic' },
        },
        overrides: [
          {
            matcher: { id: 'byName', options: '°C Rack temp' },
            properties: [
              { id: 'unit', value: 'celsius' },
              { id: 'color', value: { mode: 'fixed', fixedColor: 'orange' } },
              { id: 'custom.axisPlacement', value: 'left' },
            ],
          },
          {
            matcher: { id: 'byName', options: '% Rack humidity' },
            properties: [
              { id: 'unit', value: 'percent' },
              { id: 'color', value: { mode: 'fixed', fixedColor: 'blue' } },
              { id: 'custom.axisPlacement', value: 'right' },
              { id: 'min', value: 0 },
              { id: 'max', value: 100 },
            ],
          },
          {
            matcher: { id: 'byName', options: '% UPS load' },
            properties: [
              { id: 'unit', value: 'percent' },
              { id: 'color', value: { mode: 'fixed', fixedColor: 'green' } },
              { id: 'custom.axisPlacement', value: 'right' },
              { id: 'min', value: 0 },
              { id: 'max', value: 100 },
            ],
          },
          {
            matcher: { id: 'byName', options: 'W Rack power' },
            properties: [
              { id: 'unit', value: 'watt' },
              { id: 'color', value: { mode: 'fixed', fixedColor: 'purple' } },
              { id: 'custom.axisPlacement', value: 'right' },
              { id: 'min', value: 0 },
              { id: 'custom.fillOpacity', value: 0 },
              { id: 'custom.lineWidth', value: 2 },
            ],
          },
        ],
      },
      options: {
        legend: {
          displayMode: 'list',
          placement: 'bottom',
          showLegend: true,
          calcs: ['lastNotNull'],
        },
        tooltip: { mode: 'multi', sort: 'none' },
      },
    },
  ],
};

writeDashboard(root, dashboard, 'Build configurable computer-room kiosk dashboard');
