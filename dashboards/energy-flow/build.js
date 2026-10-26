const fs = require('fs');
const path = require('path');
const config = require('../../dashboard-config');
const { writeDashboard } = require('../../build-utils');

const root = __dirname;
const getOption = fs.readFileSync(path.join(root, 'echarts.js'), 'utf8');
const template = fs.readFileSync(path.join(root, 'query.flux'), 'utf8');
const replacements = {
  TIMEZONE: config.timezone,
  BUCKET: config.bucket,
  SOLAR_GENERATION_ENTITY: config.energy.solarGenerationEntity,
  GRID_EXPORT_ENTITY: config.energy.gridExportEntity,
  GRID_IMPORT_ENTITY: config.energy.gridImportEntity,
};
const fluxQuery = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
  if (!(key in replacements)) throw new Error(`Missing template value: ${key}`);
  return String(replacements[key]).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
});

const dashboard = {
  uid: 'kiosk-energy-flow',
  title: 'Kiosk — Energy Flow',
  tags: ['kiosk', 'energy'],
  timezone: config.timezone,
  refresh: '1m',
  time: { from: 'now/d', to: 'now' },
  timepicker: { hidden: true },
  graphTooltip: 0,
  schemaVersion: 42,
  panels: [
    {
      id: 1,
      type: 'volkovlabs-echarts-panel',
      pluginVersion: '7.2.5',
      title: "Today's energy flow (kWh)",
      description: 'Solar to home, solar export, and grid import for the current day.',
      gridPos: { h: 8, w: 24, x: 0, y: 0 },
      datasource: config.datasource,
      targets: [
        {
          refId: 'A',
          datasource: config.datasource,
          query: fluxQuery,
          queryType: 'flux',
        },
      ],
      fieldConfig: { defaults: { unit: 'kwatth', decimals: 1 }, overrides: [] },
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

writeDashboard(root, dashboard, 'Build configurable energy-flow kiosk dashboard');
