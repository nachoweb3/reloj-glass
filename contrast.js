'use strict';

// Adapta el contraste del widget al wallpaper que tiene detras.
// Lee del registro la ruta del wallpaper y su estilo de ajuste, calcula que
// trozo de la imagen cae bajo la ventana y elige un preset de contorno/halo
// segun el brillo de esa zona. No captura la pantalla: solo lee el archivo.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { nativeImage } = require('electron');

const DESKTOP_KEY = 'HKCU\\Control Panel\\Desktop';
const COLORS_KEY = 'HKCU\\Control Panel\\Colors';

const COLUMNS = 5;
const ROWS = 3;
const SAMPLE_WIDTH = 160;
const SOURCE_CACHE_MS = 60 * 1000;

// Presets: contorno y halo para cada tipo de fondo.
// oscuro = mucho halo y contorno fino; claro = contorno grueso y halo casi nulo.
const PRESETS = {
  oscuro: {
    clockStroke: 1.6,
    handleStroke: 1.3,
    strokeOpacity: 46,
    clockGlowOpacity: 100,
    handleGlowOpacity: 96
  },
  mixto: {
    clockStroke: 2.1,
    handleStroke: 1.7,
    strokeOpacity: 62,
    clockGlowOpacity: 68,
    handleGlowOpacity: 70
  },
  claro: {
    clockStroke: 2.7,
    handleStroke: 2.2,
    strokeOpacity: 82,
    clockGlowOpacity: 22,
    handleGlowOpacity: 22
  }
};

// Umbrales sobre el brillo maximo de la zona (luminancia relativa 0-1).
const LIMITS = { oscuro: 0.2, claro: 0.5 };

function luminance(r, g, b) {
  const channel = (value) => {
    const scaled = Math.min(255, Math.max(0, Number(value))) / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function pickContrastPreset(maxLuminance) {
  const value = Number(maxLuminance);
  let name = 'mixto';
  if (Number.isFinite(value)) {
    if (value < LIMITS.oscuro) name = 'oscuro';
    else if (value >= LIMITS.claro) name = 'claro';
  }
  return { name, ...PRESETS[name] };
}

function readRegistryValue(keyPath, name) {
  try {
    const output = execFileSync('reg', ['query', keyPath, '/v', name], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000
    });
    const line = output.split(/\r?\n/).find((row) => row.includes('REG_') && row.includes(name));
    if (!line) return null;
    const marker = line.indexOf('REG_');
    const value = line.slice(marker).replace(/^REG_[A-Z_]+\s+/, '').trim();
    return value || null;
  } catch {
    return null;
  }
}

function backgroundLuminance() {
  const raw = readRegistryValue(COLORS_KEY, 'Background');
  if (!raw) return 0;
  const parts = raw.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((value) => !Number.isFinite(value))) return 0;
  return luminance(parts[0], parts[1], parts[2]);
}

function readWallpaperSource() {
  const registryPath = readRegistryValue(DESKTOP_KEY, 'Wallpaper');
  const cleaned = registryPath ? registryPath.replace(/^"|"$/g, '').trim() : '';
  let imagePath = cleaned && fs.existsSync(cleaned) ? cleaned : null;

  if (!imagePath) {
    // Presentación de diapositivas: Windows reescribe este archivo en cada cambio.
    const transcoded = path.join(
      process.env.APPDATA || '',
      'Microsoft',
      'Windows',
      'Themes',
      'TranscodedWallpaper'
    );
    if (fs.existsSync(transcoded)) imagePath = transcoded;
  }

  // WallpaperStyle: 0 centrar, 2 estirar, 6 ajustar, 10 rellenar, 22 expandir.
  const styleValue = readRegistryValue(DESKTOP_KEY, 'WallpaperStyle');
  const style = styleValue === null ? 10 : Number(styleValue);
  const tileValue = readRegistryValue(DESKTOP_KEY, 'TileWallpaper');

  return {
    imagePath,
    style: Number.isFinite(style) ? style : 10,
    tile: tileValue === null ? false : Number(tileValue) === 1,
    backgroundLum: backgroundLuminance()
  };
}

let cachedWallpaper = null;
let cachedAt = 0;

function wallpaperSource() {
  if (cachedWallpaper && Date.now() - cachedAt < SOURCE_CACHE_MS) return cachedWallpaper;
  cachedWallpaper = readWallpaperSource();
  cachedAt = Date.now();
  return cachedWallpaper;
}

// sx/sy = px de pantalla por px de imagen; offX/offY = desplazamiento en pantalla.
function buildTransform(image, style, tile, area) {
  let sx = 1;
  let sy = 1;
  let offX = 0;
  let offY = 0;
  let wrap = false;
  const areaWidth = area.width;
  const areaHeight = area.height;

  if (style === 2) {
    sx = image.width / areaWidth;
    sy = image.height / areaHeight;
  } else if (style === 6) {
    const scale = Math.min(areaWidth / image.width, areaHeight / image.height);
    sx = 1 / scale;
    sy = 1 / scale;
    offX = (areaWidth - image.width * scale) / 2;
    offY = (areaHeight - image.height * scale) / 2;
  } else if (style === 10 || style === 22) {
    const scale = Math.max(areaWidth / image.width, areaHeight / image.height);
    sx = 1 / scale;
    sy = 1 / scale;
    offX = (areaWidth - image.width * scale) / 2;
    offY = (areaHeight - image.height * scale) / 2;
  } else if (tile) {
    wrap = true;
  } else {
    offX = (areaWidth - image.width) / 2;
    offY = (areaHeight - image.height) / 2;
  }

  return { sx, sy, offX, offY, wrap };
}

function sampleLuminance(bitmap, size, image, transform, area, screenX, screenY, fallback) {
  let imageX = (screenX - area.x - transform.offX) / transform.sx;
  let imageY = (screenY - area.y - transform.offY) / transform.sy;

  if (transform.wrap) {
    imageX = ((imageX % image.width) + image.width) % image.width;
    imageY = ((imageY % image.height) + image.height) % image.height;
  } else if (imageX < 0 || imageY < 0 || imageX >= image.width || imageY >= image.height) {
    return fallback;
  }

  const centerX = Math.min(
    size.width - 1,
    Math.max(0, Math.round((imageX / image.width) * (size.width - 1)))
  );
  const centerY = Math.min(
    size.height - 1,
    Math.max(0, Math.round((imageY / image.height) * (size.height - 1)))
  );

  let total = 0;
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = Math.min(size.width - 1, Math.max(0, centerX + dx));
      const y = Math.min(size.height - 1, Math.max(0, centerY + dy));
      const index = (y * size.width + x) * 4;
      total += luminance(bitmap[index + 2], bitmap[index + 1], bitmap[index]);
      count += 1;
    }
  }

  return total / count;
}

function sampleWallpaperRegion({ windowRect, monitorBounds, virtualBounds, source } = {}) {
  const wallpaper = source || wallpaperSource();
  if (!wallpaper || !wallpaper.imagePath) return null;

  let image;
  try {
    image = nativeImage.createFromPath(wallpaper.imagePath);
  } catch {
    return null;
  }
  if (!image || image.isEmpty()) return null;

  const full = image.getSize();
  if (!full.width || !full.height) return null;

  const area = wallpaper.style === 22 ? virtualBounds || monitorBounds : monitorBounds;
  if (!area || !area.width || !area.height || !windowRect) return null;

  const small = image.resize({ width: Math.min(SAMPLE_WIDTH, full.width), quality: 'good' });
  const size = small.getSize();
  const bitmap = small.toBitmap();
  const transform = buildTransform(full, wallpaper.style, wallpaper.tile, area);
  const fallback = Number.isFinite(wallpaper.backgroundLum) ? wallpaper.backgroundLum : 0;

  const cells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const x = windowRect.x + ((column + 0.5) * windowRect.width) / COLUMNS;
      const y = windowRect.y + ((row + 0.5) * windowRect.height) / ROWS;
      cells.push(sampleLuminance(bitmap, size, full, transform, area, x, y, fallback));
    }
  }

  const maxLuminance = Math.max(...cells);
  const meanLuminance = cells.reduce((sum, value) => sum + value, 0) / cells.length;

  return {
    preset: pickContrastPreset(maxLuminance),
    maxLuminance,
    meanLuminance,
    imagePath: wallpaper.imagePath,
    style: wallpaper.style
  };
}

module.exports = {
  PRESETS,
  luminance,
  pickContrastPreset,
  readWallpaperSource,
  sampleWallpaperRegion
};
