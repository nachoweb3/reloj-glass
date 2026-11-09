# Reloj glass · @nacho_web3

Widget de escritorio para Windows: reloj grande con segundos y el handle `@nacho_web3` debajo, todo en
"cristal" sobre una ventana **transparente, sin fondo y sin marco**. Está hecho con Electron y vive al
nivel del escritorio: no se pone por encima de otras aplicaciones ni ocupa un hueco en la barra de tareas.

- Ventana arrastrable desde cualquier punto; la posición se recuerda entre arranques.
- Contraste automático: adapta contorno y halo al wallpaper que queda justo detrás.
- Aspecto configurable desde un `config.json` externo, sin tocar el código.
- Click derecho → **Cambiar nombre…** (o `F2`), **Ajustes…** (tamaño, color y fondo) y **Salir**.
  `Esc` también cierra el widget.
- Arranque automático al iniciar sesión en Windows (se puede quitar, ver más abajo).

---

## 1. Usar el widget ya compilado

Hay dos formas, y las dos funcionan sin Node ni `npm`:

### Instalador (recomendado para el día a día)

`dist\Reloj-glass-Setup-<version>.exe` (por ejemplo `Reloj-glass-Setup-1.0.0.exe`) abre un asistente en
español que instala el widget solo para tu usuario, sin pedir administrador:

- Se instala en `%LOCALAPPDATA%\Programs\Reloj glass\`.
- Crea un acceso directo en el **escritorio** y otro en el **menú Inicio**.
- Al terminar lo abre, y el widget arranca desde el disco: es la vía más rápida al iniciar sesión.
- Para quitarlo: *Configuración → Aplicaciones → Aplicaciones instaladas → Reloj glass → Desinstalar*, o
  ejecuta `Uninstall Reloj glass.exe` de la carpeta de instalación. Tu config de `%APPDATA%` se conserva.

### Portable

`dist\Reloj-glass-<version>.exe` es un archivo único **autocontenido**: no necesita Node, ni `npm`, ni la
carpeta `node_modules`. Se puede copiar a cualquier carpeta y abrir con doble clic, pero cada arranque se
descomprime en una carpeta temporal, así que tarda unos segundos más y el arranque automático resulta más
lento.

> Ninguna de las dos versiones está firmada, así que la primera vez Windows puede mostrar SmartScreen
> ("Windows protegió tu PC"): *Más información* → *Ejecutar de todas formas*.

Si mueves el portable, ábrelo una vez desde su nueva ubicación para que el arranque automático quede
apuntando a la ruta correcta.

---

## 2. Compilar

Requisitos: Windows 10/11 x64 y Node.js 20 o superior. Solo para compilar y para la versión de desarrollo.

```bash
npm install          # instala Electron y electron-builder
npm run build        # genera dist\Reloj-glass-<version>.exe (portable)
```

Otros comandos:

| Comando | Resultado |
|---|---|
| `npm start` | Abre el widget en modo desarrollo (sin empaquetar) |
| `arrancar.bat` | Doble clic: arranca en desarrollo y, si falta, instala dependencias |
| `npm run build` | `dist\Reloj-glass-<version>.exe` (portable) y `dist\Reloj-glass-Setup-<version>.exe` (instalador) |
| `npm run build:dir` | `dist\win-unpacked\Reloj glass.exe` — sin comprimir, arranca más rápido |
| `npm run icon` | Regenera `build/icon.ico` y `assets/icon.png` desde `tools/make-icon.js` |

La configuración de empaquetado está en el bloque `build` de `package.json`:

- `productName: "Reloj glass"` → nombre del ejecutable y de la ventana.
- `asar: true` → el código va empaquetado en `app.asar`; solo entran los archivos listados en `files`.
- `portable.artifactName` → `Reloj-glass-<version>.exe`; la versión sale de `package.json`.
- `win.target` → los dos formatos: `portable` y `nsis`. Para compilar solo uno:
  `npx electron-builder --win nsis --x64 --publish never` (o `--win portable`).
- `nsis` → instalador por usuario (`perMachine: false`, sin elevación) y asistente en español
  (`installerLanguages: ["es_ES"]`), con `oneClick: false` para elegir carpeta, accesos directos de escritorio y menú Inicio (`shortcutName: "Reloj glass"`) y
  ejecución al terminar. `deleteAppDataOnUninstall: false` conserva tu config al desinstalar.
- `win.icon` → `build/icon.ico`, que genera `npm run icon` desde `tools/make-icon.js` con el Chromium de
  Electron (dial de cristal con halo y destello, el mismo lenguaje visual del widget). El PNG suelto
  (`assets/icon.png`) es el icono de la ventana.

Para publicar una versión nueva: sube `version` en `package.json` y vuelve a ejecutar `npm run build`.

### Versión de desarrollo

```bash
npm install
npm start
```

Funciona igual que el empaquetado, pero lee el `config.json` del proyecto (ver siguiente apartado).

---

## 3. Dónde queda el config

El archivo es `config.json`. Depende de cómo arranques el widget:

| Modo | Ruta del config |
|---|---|
| Desarrollo (`npm start`, `arrancar.bat`) | `<carpeta del proyecto>\config.json` |
| Versión empaquetada (instalada o portable) | `%APPDATA%\glass-clock-widget\config.json` |
| `.exe` con un `config.json` al lado | Ese mismo archivo (tiene prioridad) |

Al ejecutar la versión empaquetada por primera vez se copia el config integrado a
`C:\Users\<usuario>\AppData\Roaming\glass-clock-widget\config.json`. Ese es el archivo que debes editar:
**los cambios en el `config.json` del proyecto no afectan al `.exe` ya compilado**, porque el paquete lleva
su propia copia dentro.

También en esa carpeta (`%APPDATA%\glass-clock-widget\`) se guarda `widget-state.json` con la última
posición del widget. Bórralo para que vuelva a colocarse arriba a la derecha.

### Campos

Tamaños en píxeles (aceptan número o texto como `"2px"`), opacidades en porcentaje 0–100 (número o texto
como `"62%"`). Las claves que empiezan por `_nota` son comentarios y se ignoran.

| Bloque | Campo | Qué hace |
|---|---|---|
| `size` | `width`, `height` | Tamaño de la ventana en px (define el marco; el texto se centra dentro) |
| `font` | `family` | Tipografía del widget |
| `clock` | `fontSize`, `fontWeight`, `letterSpacing`, `secondsSize` | Hora y segundos |
| `handle` | `text` | Nombre o @handle que se muestra debajo del reloj (`"@nacho_web3"` por defecto) |
| `handle` | `fontSize`, `fontWeight`, `letterSpacing` | Tamaño y espaciado de ese nombre |
| `outline` | `clockWidth`, `handleWidth` | Grosor del contorno que separa las letras del wallpaper |
| `outline` | `opacity` | Intensidad de ese contorno (se mezcla con `colors.shadow`) |
| `glow` | `clockRadius`, `handleRadius` | Alcance del halo en px |
| `glow` | `clockOpacity`, `handleOpacity` | Intensidad del halo (se mezcla con `colors.glow`) |
| `auto` | `enabled` | Activa el contraste automático; `false` usa `outline`/`glow` tal cual |
| `auto` | `pollSeconds` | Cada cuántos segundos revisa el wallpaper (mínimo 5) |
| `colors` | `text`, `glow`, `shadow` | Color del cristal, del halo y del contorno/sombras |
| `colors` | `accent` | Neón del panel: borde, rejilla, esquinas, separador y segundos |
| `panel` | `opacity` | Opacidad del fondo de cristal (0–100). `0` deja el reloj suelto, sin panel |

Los cambios de tamaño, tipografía y colores se aplican **al reiniciar** el widget (ciérralo con `Esc` o
click derecho → *Salir* y vuelve a abrirlo). `auto.pollSeconds` sí se reevalúa en caliente.

### Aspecto

El widget es un panel de cristal ciberpunk en azul: fondo semitransparente con rejilla, aura que respira,
banda de luz que barre el panel, líneas tipo CRT, esquinas HUD y borde neón. La hora va en blanco con filo
cian y halo; los segundos, en un chip con marco. Todo el color sale de `colors.accent` (por defecto
`#38e8ff`) y `colors.text`/`colors.glow`/`colors.shadow`, sin tocar el CSS.

Si prefieres el aspecto antiguo, sin fondo, pon `panel.opacity` a `0`: se queda solo el reloj con su
contorno y su halo. Con `panel.opacity` bajo el wallpaper se ve a través del cristal; alto lo tapa más.

### Tu nombre

Lo que se muestra debajo del reloj sale de `handle.text`, así que cada persona puede poner el suyo.
Hay dos formas:

1. **Sin editores:** click derecho sobre el widget → **Cambiar nombre…** (o pulsa `F2`). Se abre una
   ventanita, escribes el nombre (hasta 28 caracteres), *Guardar* y se aplica al instante. Se guarda en el
   `config.json` que esté usando el widget, así que sobrevive a reinicios y a reinstalar.
2. **Editando el config:** cambia `handle.text` en `config.json` (por ejemplo `"@maria_dev"`) y reinicia
   el widget.

Si el nombre es largo, el widget le baja el tamaño solo para que no se salga del panel. Para dejarlo vacío
no hace falta nada: si borras `handle.text`, vuelve el valor por defecto `@nacho_web3`.

> Al desinstalar, `config.json` se conserva; por eso tu nombre sigue ahí si vuelves a instalarlo.

### Ajustes sin tocar el JSON

Click derecho → **Ajustes…** abre una ventana con lo que más se toca a diario:

- **Tamaño:** tres botones S / M / L (320×178, 380×210, 460×252). La ventana cambia al momento y
  mantiene la esquina superior izquierda donde estaba; el panel se reescala solo.
- **Color del neón:** seis colores de un clic (cian, violeta, verde, ámbar, rosa, rojo) y, a la derecha,
  un selector para cualquier otro color. Cambia bordes, rejilla, esquinas, segundos, halo y separador,
  porque todo sale de `colors.accent`.
- **Fondo:** control de 0 a 100 % para la opacidad del cristal (`panel.opacity`). `0` deja el reloj suelto,
  sin panel; subirlo tapa más el wallpaper.

*Guardar* escribe los tres valores en el `config.json` en uso y los aplica en caliente, sin reiniciar. Los
tamaños personalizados (por ejemplo un ancho raro puesto a mano) se respetan: el tamaño solo cambia si
pulsas S, M o L. El resto de ajustes siguen en el archivo, como antes.

### Contraste automático

Con `auto.enabled: true`, el widget lee la ruta y el estilo del wallpaper del registro de Windows, calcula
qué trozo de la imagen queda detrás de la ventana y muestrea esa zona. Según su brillo aplica uno de tres
presets: `oscuro` (mucho halo, contorno fino), `mixto` (equilibrado) o `claro` (contorno grueso, halo casi
nulo). No captura la pantalla: solo lee el archivo del wallpaper, así que no interfiere con otras ventanas.

Los umbrales y los valores de cada preset están en `contrast.js` (`LIMITS` y `PRESETS`).

---

## 4. Arranque automático en Windows

El widget se registra solo al arrancar, en la clave de usuario (no hace falta ser administrador):

```
HKCU\Software\Microsoft\Windows\CurrentVersion\Run   valor: glass-clock-widget
```

- Con la versión instalada, apunta a `%LOCALAPPDATA%\Programs\Reloj glass\Reloj glass.exe`.
- Con el portable, apunta al `.exe` portable que lanzaste.
- En desarrollo, apunta a `node_modules\electron\dist\electron.exe` con la carpeta del proyecto como
  argumento.

### Comprobar si está activo

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name glass-clock-widget
```

### Desinstalarlo

Cualquiera de estas tres opciones lo quita:

```powershell
# PowerShell
Remove-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name glass-clock-widget
```

```bat
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v glass-clock-widget /f
```

O en **Administrador de tareas → Aplicaciones de inicio**, desactivar `glass-clock-widget`.

> **Importante:** el widget vuelve a registrar la entrada cada vez que arranca (`enableStartup()` en
> `main.js`). Para quitarlo de forma permanente: bórralo como arriba y no vuelvas a abrir el widget, o
> comenta la llamada a `enableStartup()` dentro de `app.whenReady()` en `main.js` y recompila.

---

## 5. Estructura del proyecto

```
main.js           ventana transparente, posición, arranque automático y config
contrast.js       lectura del wallpaper y elección del preset de contraste
config.js         traduce config.json a variables CSS
config.json       aspecto por defecto (editable)
index.html        marcado del widget
styles.css        tema glass: degradados, contorno, halo, destellos
renderer.js       reloj, resincronizado al segundo
name.html         ventanita para cambiar tu nombre
name.css          estilos de esa ventanita
name.js           guarda el nombre en config.json
name-store.js     normaliza y escribe el nombre en el config
settings.html     ventanita de ajustes (tamaño, color y fondo)
settings.css      estilos de la ventanita de ajustes
settings.js       guarda los ajustes y los aplica
settings-store.js validación y escritura de tamaño, color y opacidad
preload.js        puente seguro entre la ventanita y main.js
arrancar.bat      lanzador de doble clic para la versión de desarrollo
preview/          vista previa en navegador sobre un fondo de ejemplo
build/            icono del .exe y del instalador (icon.ico, icon.png)
assets/           icono de la ventana (icon.png)
tools/            generador del icono (make-icon.js)
dist/             salida de electron-builder (instalador, portable y win-unpacked)
```

Vista previa en el navegador (no es el widget real, sirve para ajustar el aspecto):

```bash
node preview/server.js
# http://127.0.0.1:4173/preview/demo.html
```

---

## 6. Desinstalar del todo

1. Cierra el widget (`Esc` o click derecho → *Salir*).
2. Quita el arranque automático (apartado 4).
3. Si lo instalaste con el instalador: *Configuración → Aplicaciones → Aplicaciones instaladas → Reloj
   glass → Desinstalar*. Eso borra programa y accesos directos.
4. Borra `%APPDATA%\glass-clock-widget\` (config, posición y cachés de Chromium).
5. Borra el `.exe` portable (o la carpeta `dist\`) y, si no lo usas más, la carpeta del proyecto.

El desinstalador también borra por su cuenta el valor de arranque automático (`glass-clock-widget` en
`HKCU\...\Run`) y las cachés de Chromium de `%APPDATA%\glass-clock-widget\`. Lo que **no** toca es tu
configuración: `config.json`, `config.backup.json` y `widget-state.json` se quedan por si reinstalas.

---

## 7. Problemas comunes

- **No se ve el reloj:** está al nivel del escritorio, así que cualquier ventana maximizada lo tapa. No se
  fuerza por encima de otras aplicaciones a propósito.
- **Sale el icono por defecto de Electron:** el `.exe` se compiló antes de crear `build/icon.ico`;
  ejecuta `npm run icon` y vuelve a compilar.
- **Dos relojes a la vez:** hay más de una copia abierta (instalada, portable o de desarrollo); cierra
  las que sobren.
- **Cambié el config y no pasa nada:** hay que reiniciar el widget, y el `.exe` usa el config de
  `%APPDATA%`, no el del proyecto.
- **El contorno no responde a `outline`/`glow`:** el modo automático (`auto.enabled`) los sobrescribe.
