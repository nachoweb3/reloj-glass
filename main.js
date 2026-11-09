const { app, BrowserWindow, Menu, screen, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const { sampleWallpaperRegion } = require('./contrast');
const nameStore = require('./name-store');
const settingsStore = require('./settings-store');

const DEFAULT_SIZE = { width: 380, height: 210 };
const CONFIG_NAME = 'config.json';

function bundledConfigPath() {
  return path.join(__dirname, CONFIG_NAME);
}

// En el .exe empaquetado el config se busca junto al ejecutable y, si no está,
// en %APPDATA%, para poder editarlo sin descomprimir nada.
function resolveConfigPath() {
  const bundled = bundledConfigPath();
  if (!app.isPackaged) return bundled;

  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const candidates = [
    portableDir ? path.join(portableDir, CONFIG_NAME) : null,
    path.join(path.dirname(process.execPath), CONFIG_NAME)
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  try {
    const userConfig = path.join(app.getPath('userData'), CONFIG_NAME);
    if (!fs.existsSync(userConfig)) {
      fs.mkdirSync(path.dirname(userConfig), { recursive: true });
      fs.copyFileSync(bundled, userConfig);
    }
    return userConfig;
  } catch (error) {
    console.error(`No se pudo preparar ${CONFIG_NAME} editable (${error.message}); uso el integrado.`);
    return bundled;
  }
}

function readConfig() {
  const configPath = resolveConfigPath();
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(`${configPath} ilegible (${error.message}); uso los valores por defecto.`);
    return {};
  }
}

const config = readConfig();
const WIDTH = Number(config.size && config.size.width) || DEFAULT_SIZE.width;
const HEIGHT = Number(config.size && config.size.height) || DEFAULT_SIZE.height;

// Modo automatico de contraste (ver bloque "auto" en config.json).
const AUTO = config.auto && typeof config.auto === 'object' ? config.auto : {};
const AUTO_ENABLED = AUTO.enabled !== false;
const AUTO_INTERVAL_MS = Math.max(5, Number(AUTO.pollSeconds) || 20) * 1000;

let win = null;
let autoTimer = null;
let autoMoveTimer = null;
let lastAutoPreset = '';

const statePath = () => path.join(app.getPath('userData'), 'widget-state.json');

function defaultPosition() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + workArea.width - WIDTH - 56,
    y: workArea.y + 64
  };
}

function loadPosition() {
  try {
    const state = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
      return { x: Math.round(state.x), y: Math.round(state.y) };
    }
  } catch {
    /* primer arranque: aún no hay estado guardado */
  }
  return defaultPosition();
}

function savePosition() {
  if (!win || win.isDestroyed()) return;
  try {
    const [x, y] = win.getPosition();
    fs.writeFileSync(statePath(), JSON.stringify({ x, y }), 'utf8');
  } catch {
    /* recordar la posición es opcional */
  }
}

function virtualDesktopBounds() {
  const displays = screen.getAllDisplays();
  if (!displays.length) return null;

  const left = Math.min(...displays.map((display) => display.bounds.x));
  const top = Math.min(...displays.map((display) => display.bounds.y));
  const right = Math.max(...displays.map((display) => display.bounds.x + display.bounds.width));
  const bottom = Math.max(...displays.map((display) => display.bounds.y + display.bounds.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
}

function applyAutoContrast() {
  if (!AUTO_ENABLED || !win || win.isDestroyed()) return;
  if (!win.webContents || win.webContents.isDestroyed()) return;

  let result = null;
  try {
    const windowRect = win.getBounds();
    const display = screen.getDisplayMatching(windowRect);
    result = sampleWallpaperRegion({
      windowRect,
      monitorBounds: display.bounds,
      virtualBounds: virtualDesktopBounds()
    });
  } catch (error) {
    // Sin acceso al wallpaper se mantiene lo que diga config.json.
    return;
  }

  if (!result || !result.preset) return;

  const payload = JSON.stringify(result.preset);
  if (payload === lastAutoPreset) return;
  lastAutoPreset = payload;

  win.webContents
    .executeJavaScript(`window.applyWidgetContrast && window.applyWidgetContrast(${payload});`)
    .catch(() => {});
}

function currentHandle() {
  return nameStore.handleFromConfig(config);
}

// Guarda el nombre en el mismo config.json que se edita a mano y lo aplica en
// caliente, para no tener que reiniciar el widget.
function saveHandleName(raw) {
  const result = nameStore.saveHandleName(resolveConfigPath(), raw);
  if (!result.ok) return result;

  if (!config.handle || typeof config.handle !== 'object') config.handle = {};
  config.handle.text = result.text;

  if (win && !win.isDestroyed()) {
    win.webContents
      .executeJavaScript(
        `window.applyWidgetName && window.applyWidgetName(${JSON.stringify(result.text)});`
      )
      .catch(() => {});
  }

  return result;
}

function saveSettings(patch) {
  const result = settingsStore.applySettings(resolveConfigPath(), patch);
  if (!result.ok) return result;

  config.size = { ...result.settings.size };
  if (!config.colors || typeof config.colors !== 'object') config.colors = {};
  config.colors.accent = result.settings.accent;
  if (!config.panel || typeof config.panel !== 'object') config.panel = {};
  config.panel.opacity = result.settings.opacity;

  if (win && !win.isDestroyed()) {
    const bounds = win.getBounds();
    win.setBounds(
      {
        x: bounds.x,
        y: bounds.y,
        width: result.settings.size.width,
        height: result.settings.size.height
      },
      false
    );
    savePosition();

    // Tamaño, color y fondo se aplican al momento, sin reiniciar el widget.
    win.webContents
      .executeJavaScript(
        `window.applyWidgetConfig && window.applyWidgetConfig(${JSON.stringify(config)});`
      )
      .catch(() => {});
    applyAutoContrast();
  }

  return result;
}

// Ventanitas de edición: mismo cristal, centradas sobre el reloj.
function createEditorWindow(fileName, width, height) {
  const anchor = win && !win.isDestroyed() ? win.getBounds() : null;
  const area = (anchor ? screen.getDisplayMatching(anchor) : screen.getPrimaryDisplay()).workArea;
  const wantedX = anchor
    ? anchor.x + Math.round((anchor.width - width) / 2)
    : area.x + Math.round((area.width - width) / 2);
  const wantedY = anchor
    ? anchor.y + Math.round((anchor.height - height) / 2)
    : area.y + Math.round((area.height - height) / 2);

  const editor = new BrowserWindow({
    width,
    height,
    x: Math.min(Math.max(wantedX, area.x + 8), area.x + area.width - width - 8),
    y: Math.min(Math.max(wantedY, area.y + 8), area.y + area.height - height - 8),
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  editor.loadFile(path.join(__dirname, fileName));
  editor.once('ready-to-show', () => {
    if (editor.isDestroyed()) return;
    editor.show();
    editor.focus();
  });

  return editor;
}

let nameWindow = null;
let settingsWindow = null;

function openNameEditor() {
  if (nameWindow && !nameWindow.isDestroyed()) {
    nameWindow.show();
    nameWindow.focus();
    return;
  }

  nameWindow = createEditorWindow('name.html', 320, 186);
  nameWindow.on('closed', () => {
    nameWindow = null;
  });
}

function openSettingsEditor() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = createEditorWindow('settings.html', 340, 320);
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function registerBridges() {
  ipcMain.handle('widget:get-name', () => currentHandle());
  ipcMain.handle('widget:set-name', (event, value) => saveHandleName(value));
  ipcMain.handle('widget:close-editor', () => {
    if (nameWindow && !nameWindow.isDestroyed()) nameWindow.close();
  });

  ipcMain.handle('widget:get-settings', () => settingsStore.currentSettings(config));
  ipcMain.handle('widget:set-settings', (event, patch) => saveSettings(patch));
  ipcMain.handle('widget:close-settings', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
  });
}

function openContextMenu() {
  Menu.buildFromTemplate([
    { label: 'Cambiar nombre…', click: () => openNameEditor() },
    { label: 'Ajustes…', click: () => openSettingsEditor() },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ]).popup({
    window: win
  });
}

function enableStartup() {
  // Arranque automático al iniciar sesión en Windows (HKCU, sin permisos de admin).
  const settings = { openAtLogin: true, name: 'glass-clock-widget' };

  if (!app.isPackaged) {
    // En desarrollo hay que apuntar al binario de Electron y pasarle la carpeta del widget.
    settings.path = process.execPath;
    settings.args = [app.getAppPath()];
  } else if (process.env.PORTABLE_EXECUTABLE_FILE) {
    // Versión portable: se descomprime en una carpeta temporal nueva en cada
    // arranque, así que el inicio automático debe apuntar al .exe portable real.
    settings.path = process.env.PORTABLE_EXECUTABLE_FILE;
  }

  app.setLoginItemSettings(settings);
}

function createWindow() {
  const { x, y } = loadPosition();

  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x,
    y,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // Vive en el escritorio: nunca por encima de otras aplicaciones.
    alwaysOnTop: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.setAlwaysOnTop(false);
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));

  // El propio renderer traduce config.json a variables CSS.
  win.webContents.once('did-finish-load', () => {
    win.webContents
      .executeJavaScript(
        `window.applyWidgetConfig && window.applyWidgetConfig(${JSON.stringify(config)});`
      )
      .catch(() => {});

    applyAutoContrast();
    if (AUTO_ENABLED) {
      autoTimer = setInterval(applyAutoContrast, AUTO_INTERVAL_MS);
    }
  });

  win.once('ready-to-show', () => {
    // Aparece sin robar el foco a lo que estés haciendo.
    win.showInactive();
  });

  win.on('moved', () => {
    savePosition();
    // Al moverse cambia el trozo de wallpaper de detras: se revisa al soltar.
    clearTimeout(autoMoveTimer);
    autoMoveTimer = setTimeout(applyAutoContrast, 300);
  });

  win.on('closed', () => {
    win = null;
    clearInterval(autoTimer);
    clearTimeout(autoMoveTimer);
    autoTimer = null;
  });

  win.webContents.on('context-menu', openContextMenu);

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'Escape') {
      app.quit();
    } else if (input.key === 'F2') {
      event.preventDefault();
      openNameEditor();
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.nachoweb3.glassclock');
  Menu.setApplicationMenu(null);
  registerBridges();
  enableStartup();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
