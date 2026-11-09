const fs = require('fs');
const path = require('path');

// Nombre que se muestra bajo el reloj: lectura, normalización y guardado en el
// config.json que esté usando el widget (el de %APPDATA% o el del .exe portable).
const DEFAULT_HANDLE = '@nacho_web3';
const MAX_NAME_LENGTH = 28;

function normalizeName(raw) {
  return String(raw == null ? '' : raw)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

function handleFromConfig(config) {
  const value =
    config && config.handle && typeof config.handle.text === 'string'
      ? config.handle.text.trim()
      : '';
  return value || DEFAULT_HANDLE;
}

// Escribe handle.text conservando el resto del archivo (tamaños, colores, notas).
function saveHandleName(configPath, raw) {
  const text = normalizeName(raw);
  if (!text) return { ok: false, error: 'Escribe un nombre para el reloj.' };

  let data;
  try {
    data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    data = {};
  }
  if (!data.handle || typeof data.handle !== 'object') data.handle = {};
  data.handle.text = text;

  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } catch (error) {
    return { ok: false, error: `No se pudo guardar en ${configPath}: ${error.message}` };
  }

  return { ok: true, text };
}

module.exports = { DEFAULT_HANDLE, MAX_NAME_LENGTH, normalizeName, handleFromConfig, saveHandleName };
