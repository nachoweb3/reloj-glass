// Convierte config.json en variables CSS. Lo que no venga en el archivo
// se queda con el valor por defecto definido en styles.css.
(function () {
  const toPx = (value) => (typeof value === 'number' ? `${value}px` : value);
  const toEm = (value) => (typeof value === 'number' ? `${value}em` : value);
  const toPercent = (value) => (typeof value === 'number' ? `${value}%` : value);

  const VARIABLES = {
    '--font-family': (config) => config.font && config.font.family,
    '--clock-size': (config) => config.clock && toPx(config.clock.fontSize),
    '--clock-weight': (config) => config.clock && config.clock.fontWeight,
    '--clock-tracking': (config) => config.clock && toEm(config.clock.letterSpacing),
    '--seconds-size': (config) => config.clock && toPx(config.clock.secondsSize),
    '--handle-size': (config) => config.handle && toPx(config.handle.fontSize),
    '--handle-weight': (config) => config.handle && config.handle.fontWeight,
    '--handle-tracking': (config) => config.handle && toEm(config.handle.letterSpacing),
    '--clock-stroke': (config) => config.outline && toPx(config.outline.clockWidth),
    '--handle-stroke': (config) => config.outline && toPx(config.outline.handleWidth),
    '--stroke-opacity': (config) => config.outline && toPercent(config.outline.opacity),
    '--clock-glow-size': (config) => config.glow && toPx(config.glow.clockRadius),
    '--clock-glow-opacity': (config) => config.glow && toPercent(config.glow.clockOpacity),
    '--handle-glow-size': (config) => config.glow && toPx(config.glow.handleRadius),
    '--handle-glow-opacity': (config) => config.glow && toPercent(config.glow.handleOpacity),
    '--text-color': (config) => config.colors && config.colors.text,
    '--glow-color': (config) => config.colors && config.colors.glow,
    '--shadow-color': (config) => config.colors && config.colors.shadow,
    '--accent': (config) => config.colors && config.colors.accent,
    '--panel-alpha': (config) =>
      config.panel && typeof config.panel.opacity === 'number'
        ? String(Math.min(100, Math.max(0, config.panel.opacity)) / 100)
        : null
  };

  // Modo automatico: main.js ajusta contorno y halo segun el wallpaper de detras.
  const CONTRAST_VARIABLES = {
    '--clock-stroke': (preset) =>
      Number.isFinite(preset.clockStroke) ? `${preset.clockStroke}px` : null,
    '--handle-stroke': (preset) =>
      Number.isFinite(preset.handleStroke) ? `${preset.handleStroke}px` : null,
    '--stroke-opacity': (preset) =>
      Number.isFinite(preset.strokeOpacity) ? `${preset.strokeOpacity}%` : null,
    '--clock-glow-opacity': (preset) =>
      Number.isFinite(preset.clockGlowOpacity) ? `${preset.clockGlowOpacity}%` : null,
    '--handle-glow-opacity': (preset) =>
      Number.isFinite(preset.handleGlowOpacity) ? `${preset.handleGlowOpacity}%` : null
  };

  window.applyWidgetContrast = function applyWidgetContrast(preset) {
    if (!preset || typeof preset !== 'object') return;

    const root = document.documentElement;
    const applied = {};

    Object.entries(CONTRAST_VARIABLES).forEach(([variable, pick]) => {
      const value = pick(preset);
      if (value === null) return;
      root.style.setProperty(variable, value);
      applied[variable] = value;
    });

    document.documentElement.dataset.contrast = preset.name || 'manual';
    return applied;
  };

  // Nombre bajo el reloj: config.handle.text y, si falta, el que trae el HTML.
  const DEFAULT_HANDLE = '@nacho_web3';

  function setHandleText(value) {
    const node = document.getElementById('handle');
    if (!node) return DEFAULT_HANDLE;

    const text = typeof value === 'string' ? value.trim() : '';
    node.textContent = text || DEFAULT_HANDLE;

    // Los nombres largos bajan de tamano para no salirse del panel.
    const length = node.textContent.length;
    node.classList.toggle('handle--md', length > 15 && length <= 22);
    node.classList.toggle('handle--sm', length > 22);

    return node.textContent;
  }

  // main.js la llama al guardar el nombre desde el menu del click derecho.
  window.applyWidgetName = function applyWidgetName(value) {
    return setHandleText(value);
  };

  window.applyWidgetConfig = function applyWidgetConfig(config) {
    if (config && config.panel && typeof config.panel.opacity === 'string') {
      const parsed = Number.parseFloat(config.panel.opacity);
      if (Number.isFinite(parsed)) config.panel.opacity = parsed;
    }
    if (!config || typeof config !== 'object') return;

    const root = document.documentElement;

    Object.entries(VARIABLES).forEach(([variable, pick]) => {
      const value = pick(config);
      if (value === undefined || value === null || value === '') return;
      root.style.setProperty(variable, String(value));
    });

    setHandleText(config.handle && config.handle.text);
  };
})();
