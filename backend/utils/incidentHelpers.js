const GRAVITY_MAP = {
  Faible: 'Mineur',
  Mineur: 'Mineur',
  Moyen: 'Modéré',
  Modere: 'Modéré',
  'Modéré': 'Modéré',
  Haut: 'Grave',
  Grave: 'Grave',
  Critique: 'Critique',
};

function normalizeGravity(value) {
  const key = String(value || '').trim();
  return GRAVITY_MAP[key] || key || 'Mineur';
}

function parseProjectId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseIncidentImagesField(images, imageUrl) {
  let list = images;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.startsWith('/') || list.startsWith('http') ? [list] : [];
    }
  }
  if (!Array.isArray(list)) list = [];
  const paths = list.filter((p) => typeof p === 'string' && p.length > 0);
  if (!paths.length && imageUrl) return [imageUrl];
  return paths;
}

function serializeIncidentForApi(plain) {
  const images = parseIncidentImagesField(plain.images, plain.imageUrl);
  return {
    ...plain,
    images,
    imageUrl: plain.imageUrl || images[0] || null,
  };
}

module.exports = {
  GRAVITY_MAP,
  normalizeGravity,
  parseProjectId,
  parseIncidentImagesField,
  serializeIncidentForApi,
};
