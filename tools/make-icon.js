// Genera el icono del widget (dial de cristal) y sus derivados:
//   build/icon.png  (1024x1024, fuente de electron-builder)
//   build/icon.ico  (16..256, misma estetica del widget: cristal, contorno y halo)
//   assets/icon.png (256x256, icono de la ventana)
// Se ejecuta con el Electron del proyecto: node_modules\electron\dist\electron.exe tools\make-icon.js
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_BUILD = path.join(ROOT, 'build');
const OUT_ASSETS = path.join(ROOT, 'assets');
const SIZE = 1024;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

// Mismo lenguaje visual que styles.css: degradado de cristal vertical
// (brillante arriba, transparente en el medio, brillante abajo), trazo
// blanco, halo y destello de cuatro puntas.
const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="glass" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.3" stop-color="#e6feff"/>
      <stop offset="0.49" stop-color="#8cecff"/>
      <stop offset="0.56" stop-color="#54dcf8"/>
      <stop offset="0.72" stop-color="#bdf6ff"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="hand" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#bff6ff"/>
    </linearGradient>
    <radialGradient id="inner" cx="0.5" cy="0.4" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.62" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="512" cy="512" r="291" fill="url(#inner)"/>
  <circle cx="512" cy="512" r="318" fill="none" stroke="url(#glass)" stroke-width="54"/>
  <g stroke="url(#hand)" stroke-linecap="round" fill="none">
    <line x1="512" y1="512" x2="382" y2="437" stroke-width="40"/>
    <line x1="512" y1="512" x2="713" y2="396" stroke-width="26"/>
  </g>
  <circle cx="512" cy="512" r="24" fill="#ffffff"/>
  <g transform="translate(725,175) scale(0.82)" fill="#eafeff" opacity="0.95">
    <path d="M55 0 L64.9 45.1 L110 55 L64.9 64.9 L55 110 L45.1 64.9 L0 55 L45.1 45.1 Z"/>
  </g>
</svg>`;

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; overflow: hidden; }
  .wrap {
    width: ${SIZE}px; height: ${SIZE}px;
    filter:
      drop-shadow(0 0 34px rgba(56, 232, 255, 0.5))
      drop-shadow(0 0 6px rgba(0, 0, 0, 0.55))
      drop-shadow(0 16px 28px rgba(0, 0, 0, 0.32));
  }
  svg { display: block; }
</style></head><body><div class="wrap">${SVG}</div></body></html>`;

function icoFromPngs(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dirs = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0);
    dir.writeUInt8(size >= 256 ? 0 : size, 1);
    dir.writeUInt8(0, 2); // colores de paleta
    dir.writeUInt8(0, 3); // reservado
    dir.writeUInt16LE(1, 4); // planos
    dir.writeUInt16LE(32, 6); // bits por pixel
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += png.length;
    dirs.push(dir);
  }

  return Buffer.concat([header, ...dirs, ...entries.map((entry) => entry.png)]);
}

async function main() {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    useContentSize: true,
    webPreferences: { backgroundThrottling: false }
  });
  win.setContentSize(SIZE, SIZE);

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`);
  await new Promise((resolve) => setTimeout(resolve, 700));

  const png = (await win.webContents.capturePage()).toPNG();
  const image = nativeImage.createFromBuffer(png);
  const { width, height } = image.getSize();
  if (width !== SIZE || height !== SIZE) {
    throw new Error(`tamano inesperado de la captura: ${width}x${height}`);
  }

  const bitmap = image.toBitmap();
  let transparent = 0;
  for (let i = 3; i < bitmap.length; i += 4) if (bitmap[i] === 0) transparent++;
  const ratio = (transparent / (bitmap.length / 4)) * 100;
  if (ratio < 35) {
    throw new Error(`la captura no es transparente (${ratio.toFixed(1)}% de pixeles con alfa 0)`);
  }

  fs.mkdirSync(OUT_BUILD, { recursive: true });
  fs.mkdirSync(OUT_ASSETS, { recursive: true });
  fs.writeFileSync(path.join(OUT_BUILD, 'icon.png'), png);

  const entries = ICO_SIZES.map((size) => ({
    size,
    png: image.resize({ width: size, height: size, quality: 'best' }).toPNG()
  }));
  fs.writeFileSync(path.join(OUT_BUILD, 'icon.ico'), icoFromPngs(entries));

  fs.writeFileSync(
    path.join(OUT_ASSETS, 'icon.png'),
    image.resize({ width: 256, height: 256, quality: 'best' }).toPNG()
  );

  console.log(`captura ${width}x${height}, alfa 0: ${ratio.toFixed(1)}%`);
  console.log(`ico con tamanos: ${ICO_SIZES.join(', ')}`);
  console.log('escrito: build/icon.png, build/icon.ico, assets/icon.png');
}

app.disableHardwareAcceleration();
app
  .whenReady()
  .then(main)
  .then(() => app.exit(0))
  .catch((error) => {
    console.error(`No se pudo generar el icono: ${error && error.message}`);
    app.exit(1);
  });
