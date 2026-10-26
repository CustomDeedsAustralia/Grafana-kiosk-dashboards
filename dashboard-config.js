const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[2] === '' || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const value = (name, fallback) => process.env[name]?.trim() || fallback;
const numberValue = (name, fallback) => {
  const parsed = Number(value(name, fallback));
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`);
  return parsed;
};

module.exports = {
  datasource: {
    type: 'influxdb',
    uid: value('INFLUXDB_DATASOURCE_UID', 'replace-with-your-influxdb-datasource-uid'),
  },
  bucket: value('INFLUXDB_BUCKET', 'homeassistant'),
  timezone: value('DASHBOARD_TIMEZONE', 'UTC'),

  unifi: {
    dashboardUid: value('UNIFI_DASHBOARD_UID', 'kiosk-unifi-switch'),
    deviceName: value('UNIFI_DEVICE_NAME', 'UniFi Switch'),
    uplinkLabel: value('UNIFI_UPLINK_LABEL', 'UPLINK PORT'),
    hardwareRevision: value('UNIFI_HARDWARE_REVISION', 'N/A'),
    macAddress: value('UNIFI_MAC_ADDRESS', '00:00:00:00:00:00'),
    model: value('UNIFI_MODEL', 'Unknown model'),
    entities: {
      uplinkRx: value('UNIFI_UPLINK_RX_ENTITY', 'unifi_switch_uplink_rx'),
      uplinkTx: value('UNIFI_UPLINK_TX_ENTITY', 'unifi_switch_uplink_tx'),
      cpu: value('UNIFI_CPU_ENTITY', 'unifi_switch_cpu_utilisation'),
      memory: value('UNIFI_MEMORY_ENTITY', 'unifi_switch_memory_utilisation'),
      clients: value('UNIFI_CLIENTS_ENTITY', 'unifi_switch_clients'),
      linkSpeed: value('UNIFI_LINK_SPEED_ENTITY', 'unifi_switch_uplink_speed'),
      state: value('UNIFI_STATE_ENTITY', 'unifi_switch_state'),
      uptime: value('UNIFI_UPTIME_ENTITY', 'unifi_switch_uptime'),
      firmware: value('UNIFI_FIRMWARE_ENTITY', 'unifi_switch_firmware'),
    },
  },

  energy: {
    solarGenerationEntity: value('ENERGY_SOLAR_GENERATION_ENTITY', 'solar_generation_daily'),
    gridExportEntity: value('ENERGY_GRID_EXPORT_ENTITY', 'grid_export_daily'),
    gridImportEntity: value('ENERGY_GRID_IMPORT_ENTITY', 'grid_import_daily'),
  },

  computerRoom: {
    rackPowerEntity: value('ROOM_RACK_POWER_ENTITY', 'rack_power'),
    rackEnergyTodayEntity: value('ROOM_RACK_ENERGY_TODAY_ENTITY', 'rack_energy_today'),
    temperatureEntity: value('ROOM_TEMPERATURE_ENTITY', 'rack_temperature'),
    humidityEntity: value('ROOM_HUMIDITY_ENTITY', 'rack_humidity'),
    upsLoadEntity: value('ROOM_UPS_LOAD_ENTITY', 'ups_load'),
    powerWarning: numberValue('ROOM_POWER_WARNING_WATTS', 200),
    powerCritical: numberValue('ROOM_POWER_CRITICAL_WATTS', 350),
  },
};
