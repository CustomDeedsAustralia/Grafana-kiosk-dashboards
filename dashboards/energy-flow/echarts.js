const frame = context.panel.data.series[0];
if (!frame) {
  return { title: { text: 'No data', left: 'center', top: 'middle' } };
}

const fieldValues = (name) => {
  const field = frame.fields.find((f) => f.name === name);
  if (!field || !field.values) {
    return [];
  }
  if (typeof field.values.toArray === 'function') {
    return field.values.toArray();
  }
  if (field.values.buffer) {
    return field.values.buffer;
  }
  return Array.from(field.values);
};

const sources = fieldValues('source');
const targets = fieldValues('target');
const values = fieldValues('_value');

const SOLAR_GREEN = '#36872D';
const GRID_ORANGE = '#FF9830';

const nodeNames = [...new Set([...sources, ...targets])];
const nodeColor = {
  Solar: SOLAR_GREEN,
  Grid: GRID_ORANGE,
  Home: '#5794F2',
};

const nodes = nodeNames.map((name) => ({
  name,
  itemStyle: { color: nodeColor[name] || '#8F8F8F' },
}));

const links = sources.map((source, i) => ({
  source,
  target: targets[i],
  value: values[i],
  lineStyle: {
    color: source === 'Solar' ? SOLAR_GREEN : source === 'Grid' ? GRID_ORANGE : '#999999',
    opacity: 0.55,
  },
}));

return {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    triggerOn: 'mousemove',
    formatter: (params) => {
      if (params.dataType === 'edge') {
        return (
          params.data.source +
          ' -> ' +
          params.data.target +
          '<br/>' +
          Number(params.data.value).toFixed(1) +
          ' kWh'
        );
      }
      return params.name;
    },
  },
  series: [
    {
      type: 'sankey',
      layout: 'none',
      orient: 'horizontal',
      top: '6%',
      bottom: '6%',
      left: '1%',
      right: '10%',
      nodeWidth: 26,
      nodeGap: 14,
      draggable: false,
      emphasis: { focus: 'adjacency' },
      label: { fontSize: 16, color: 'inherit' },
      data: nodes,
      links: links,
      lineStyle: { curveness: 0.5 },
    },
  ],
};
