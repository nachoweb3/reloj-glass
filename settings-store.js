const fs = require('fs');
const path = require('path');

// Ajustes que se pueden cambiar desde el menú del click derecho: tamaño de la
// ventana, color del neón (colors.accent) y opacidad del fondo (panel.opacity).
const SIZE_PRESETS = {
  pequeno: { width: 320, height: 178 },
  normal: { width: 380, height: 210 },
  grande: { width: 460, height: 252 }
};

const LIMITS = { minWidth: 260, maxWidth: 900, minHeight: 160, maxHeight: 600 };
const DEFAULT_ACCENT = '#38e8ff';
const DEFAULT_OPACITY = 62;

const HEX = /^#[0-9a-f]{6}$/i;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Math.round(value)));

function normalizeSize(size) {
  if (!size || typeof size !== 'object') return null;

  const width = Number(size.width);
  const height = Number(size.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

  return {
    width: clamp(width, LIMITS.minWidth, LIMITS.maxWidth),
    height: clamp(height, LIMITS.minHeight, LIMITS.maxHeight)
  };
}

function currentSettings(config) {
  const source = config && typeof config === 'object' ? config : {};
  const accent =
    source.colors && typeof source.colors.accent === 'string' && HEX.test(source.colors.accent)
      ? source.colors.accent.toLowerCase()
      : DEFAULT_ACCENT;
  const opacity = Number(source.panel && source.panel.opacity);

  return {
    size: normalizeSize(source.size) || { ...SIZE_PRESETS.normal },
    accent,
    opacity: Number.isFinite(opacity) ? clamp(opacity, 0, 100) : DEFAULT_OPACITY,
    presets: SIZE_PRESETS
  };
}

// Guarda solo lo que venga válido y conserva el resto del config (nombre,
// tipografía, contorno, halo, notas...).
function applySettings(configPath, patch) {
  const incoming = patch && typeof patch === 'object' ? patch : {};

  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    data = {};
  }

  const size = normalizeSize(incoming.size);
  if (size) {
    if (!data.size || typeof data.size !== 'object') data.size = {};
    data.size.width = size.width;
    data.size.height = size.height;
  }

  if (typeof incoming.accent === 'string' && HEX.test(incoming.accent)) {
    if (!data.colors || typeof data.colors !== 'object') data.colors = {};
    data.colors.accent = incoming.accent.toLowerCase();
  }

  const opacity = Number(incoming.opacity);
  if (Number.isFinite(opacity)) {
    if (!data.panel || typeof data.panel !== 'object') data.panel = {};
    data.panel.opacity = clamp(opacity, 0, 100);
  }

  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (error) {
    return { ok: false, error: `No se pudo guardar en ${configPath}: ${error.message}` };
  }

  return { ok: true, settings: currentSettings(data) };
}

module.exports = { SIZE_PRESETS, LIMITS, currentSettings, applySettings, normalizeSize };
