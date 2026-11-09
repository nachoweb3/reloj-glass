const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

const pad = (value) => String(value).padStart(2, '0');

function render() {
  const now = new Date();

  hoursEl.textContent = pad(now.getHours());
  minutesEl.textContent = pad(now.getMinutes());
  secondsEl.textContent = pad(now.getSeconds());

  // Se re-sincroniza con el reloj del sistema en cada segundo.
  setTimeout(render, 1000 - now.getMilliseconds());
}

render();
