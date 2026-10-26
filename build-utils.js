const fs = require('fs');
const path = require('path');

const fluxString = (value) =>
  `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

const writeDashboard = (directory, dashboard, message) => {
  const payload = { dashboard, overwrite: true, message };
  const outputPath = path.join(directory, 'dashboard.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Built ${path.relative(process.cwd(), outputPath)}`);
  return payload;
};

module.exports = { fluxString, writeDashboard };
