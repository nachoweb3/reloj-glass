const sizesEl = document.getElementById('sizes');
const colorsEl = document.getElementById('colors');
const customEl = document.getElementById('custom');
const opacityEl = document.getElementById('opacity');
const opacityValue = document.getElementById('opacity-value');
const dimsEl = document.getElementById('dims');
const errorEl = document.getElementById('error');
const saveBtn = document.getElementById('save');
const cancelBtn = document.getElementById('cancel');

let presets = {};
let current = { size: { width: 380, height: 210 }, accent: '#38e8ff', opacity: 62 };

const close = () => window.widgetSettings.close();

function paint() {
  const { width, height } = current.size;
  dimsEl.textContent = `${width} × ${height}`;

  sizesEl.querySelectorAll('.size').forEach((button) => {
    const preset = presets[button.dataset.size];
    const active = Boolean(preset && preset.width === width && preset.height === height);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  colorsEl.querySelectorAll('.swatch').forEach((button) => {
    const active = button.dataset.color.toLowerCase() === current.accent.toLowerCase();
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  customEl.value = current.accent;
  opacityEl.value = String(current.opacity);
  opacityValue.textContent = `${current.opacity}%`;
}

async function load() {
  try {
    const settings = await window.widgetSettings.get();
    if (settings) {
      if (settings.size) current.size = settings.size;
      if (settings.accent) current.accent = settings.accent;
      if (Number.isFinite(settings.opacity)) current.opacity = settings.opacity;
      presets = settings.presets || {};
    }
  } catch {
    /* si falla la lectura se muestran los valores por defecto */
  }
  paint();
}

sizesEl.addEventListener('click', (event) => {
  const button = event.target.closest('.size');
  if (!button) return;

  const preset = presets[button.dataset.size];
  if (!preset) return;

  current.size = { width: preset.width, height: preset.height };
  errorEl.textContent = '';
  paint();
});

colorsEl.addEventListener('click', (event) => {
  const button = event.target.closest('.swatch');
  if (!button) return;

  current.accent = button.dataset.color;
  errorEl.textContent = '';
  paint();
});

customEl.addEventListener('input', () => {
  const value = String(customEl.value || '');
  if (!/^#[0-9a-f]{6}$/i.test(value)) return;
  current.accent = value.toLowerCase();
  paint();
});

opacityEl.addEventListener('input', () => {
  current.opacity = Number(opacityEl.value);
  opacityValue.textContent = `${current.opacity}%`;
});

async function save() {
  errorEl.textContent = '';
  saveBtn.disabled = true;

  try {
    const result = await window.widgetSettings.save({
      size: current.size,
      accent: current.accent,
      opacity: current.opacity
    });

    if (result && result.ok) {
      close();
      return;
    }
    errorEl.textContent = (result && result.error) || 'No se pudieron guardar los ajustes.';
  } catch {
    errorEl.textContent = 'No se pudieron guardar los ajustes.';
  }

  saveBtn.disabled = false;
}

saveBtn.addEventListener('click', save);
cancelBtn.addEventListener('click', close);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  } else if (event.key === 'Enter' && event.target !== customEl) {
    event.preventDefault();
    save();
  }
});

load();
