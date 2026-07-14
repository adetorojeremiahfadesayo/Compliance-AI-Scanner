const DEFAULT_STATUS = 'pending';

function hashString(value) {
  let hash = 2166136261;
  const input = String(value);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function positionFor(id, index, total) {
  const hash = hashString(id);
  const count = Math.max(total, 1);
  const y = 1 - ((index + 0.5) / count) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = (hash % 6283) / 1000 + index * 2.399963;
  const depth = 2.45 + ((hash >>> 8) % 70) / 100;

  return [
    Number((Math.cos(theta) * radius * depth).toFixed(4)),
    Number((y * depth).toFixed(4)),
    Number((Math.sin(theta) * radius * depth).toFixed(4)),
  ];
}

function normalizeStatus(item) {
  return item.status || item.remediation_approval_status || DEFAULT_STATUS;
}

function makeNodes(items, kind, getId) {
  return items.map((item, index) => {
    const id = `${kind}-${getId(item, index)}`;
    return {
      id,
      kind,
      status: normalizeStatus(item),
      severity: item.priority || item.severity || null,
      position: positionFor(id, index, items.length),
      scale: item.priority === 'critical' ? 1.35 : 1,
    };
  });
}

function configurationItems(selections = {}) {
  return ['industry', 'country', 'codebase']
    .filter((key) => selections[key])
    .map((key) => ({ id: `${key}-${selections[key]}`, status: 'selected' }));
}

function connect(nodes) {
  return nodes.slice(1).map((node, index) => ({
    source: nodes[index].id,
    target: node.id,
  }));
}

export function buildSpatialModel({
  mode = 'analysis',
  projects = [],
  analyses = [],
  stages = [],
  findings = [],
  selections = {},
  focusId = null,
} = {}) {
  let nodes = [];

  if (mode === 'configuration') {
    const items = configurationItems(selections);
    nodes = makeNodes(items, 'selection', (item) => item.id);
  } else if (mode === 'evidence') {
    const stageNodes = makeNodes(stages, 'stage', (item, index) => item.stage || item.agent || item.id || index);
    const findingNodes = makeNodes(findings, 'finding', (item, index) => item.id || index);
    nodes = [...stageNodes, ...findingNodes].map((node, index, all) => ({
      ...node,
      position: positionFor(node.id, index, all.length),
    }));
  } else {
    const items = projects.length > 0 ? projects : analyses;
    const kind = projects.length > 0 ? 'project' : 'analysis';
    nodes = makeNodes(items, kind, (item, index) => item.id || item.name || index);
  }

  return {
    nodes,
    links: connect(nodes),
    focusId,
    intensity: nodes.length === 0 ? 0 : Math.min(1, 0.25 + nodes.length * 0.08),
  };
}
