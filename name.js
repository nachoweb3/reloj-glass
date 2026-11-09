const input = document.getElementById('name');
const errorEl = document.getElementById('error');
const saveBtn = document.getElementById('save');
const cancelBtn = document.getElementById('cancel');

const close = () => window.widgetName.close();

async function load() {
  try {
    const current = await window.widgetName.get();
    input.value = current || '';
  } catch {
    /* si falla la lectura se empieza vacío */
  }
  input.focus();
  input.select();
}

async function save() {
  errorEl.textContent = '';
  saveBtn.disabled = true;

  try {
    const result = await window.widgetName.save(input.value);
    if (result && result.ok) {
      close();
      return;
    }
    errorEl.textContent = (result && result.error) || 'No se pudo guardar el nombre.';
  } catch {
    errorEl.textContent = 'No se pudo guardar el nombre.';
  }

  saveBtn.disabled = false;
  input.focus();
}

saveBtn.addEventListener('click', save);
cancelBtn.addEventListener('click', close);

input.addEventListener('input', () => {
  errorEl.textContent = '';
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    save();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
});

load();
