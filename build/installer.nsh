; Personalizacion del instalador NSIS. electron-builder lo incluye automaticamente
; porque esta en build/installer.nsh (ver nsis.include en package.json).
;
; El widget se instala siempre por usuario (perMachine: false, allowElevation: false),
; asi que la pagina "Elegir opciones de instalacion" no ofrecia ninguna eleccion real:
; "Todos los usuarios" aparecia deshabilitado y con la nota "(must run as admin)"
; incrustada en ingles en la plantilla de electron-builder. Se salta la pagina.
!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    StrCpy $isForceCurrentInstall "1"
  !endif
!macroend

; Limpieza al desinstalar. El instalador de electron-builder borra programa, accesos
; directos y su clave de desinstalacion, pero no toca nada de lo que escribe la app.
!macro customUnInstall
  ; 1) Arranque automatico: sin esto quedaba un valor en HKCU\...\Run apuntando a un
  ;    ejecutable ya borrado (Windows lo intentaba lanzar en cada inicio de sesion).
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "glass-clock-widget"

  ; 2) Caches de Chromium que genera Electron al ejecutarse. No son datos del usuario:
  ;    config.json, config.backup.json y widget-state.json se conservan a proposito
  ;    (deleteAppDataOnUninstall: false) para que al reinstalar todo siga igual.
  RMDir /r "$APPDATA\glass-clock-widget\Cache"
  RMDir /r "$APPDATA\glass-clock-widget\Code Cache"
  RMDir /r "$APPDATA\glass-clock-widget\GPUCache"
  RMDir /r "$APPDATA\glass-clock-widget\GPUPersistentCache"
  RMDir /r "$APPDATA\glass-clock-widget\GrShaderCache"
  RMDir /r "$APPDATA\glass-clock-widget\ShaderCache"
  RMDir /r "$APPDATA\glass-clock-widget\DawnGraphiteCache"
  RMDir /r "$APPDATA\glass-clock-widget\DawnWebGPUCache"
  RMDir /r "$APPDATA\glass-clock-widget\blob_storage"
  RMDir /r "$APPDATA\glass-clock-widget\Local Storage"
  RMDir /r "$APPDATA\glass-clock-widget\Session Storage"
  RMDir /r "$APPDATA\glass-clock-widget\Network"
  RMDir /r "$APPDATA\glass-clock-widget\Shared Dictionary"
  RMDir /r "$APPDATA\glass-clock-widget\Extension State"
  RMDir /r "$APPDATA\glass-clock-widget\Service Worker"
  RMDir /r "$APPDATA\glass-clock-widget\Crashpad"
  Delete "$APPDATA\glass-clock-widget\DIPS"
  Delete "$APPDATA\glass-clock-widget\DIPS-wal"
  Delete "$APPDATA\glass-clock-widget\Local State"
  Delete "$APPDATA\glass-clock-widget\Preferences"
  Delete "$APPDATA\glass-clock-widget\declarative_performance_observer.db"
  Delete "$APPDATA\glass-clock-widget\declarative_performance_observer.db-journal"
!macroend
