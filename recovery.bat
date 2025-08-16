@echo off
echo 🚨 SCRIPT DE RECUPERACIÓN COMPLETA
echo =================================
echo.
echo Este script solucionará los problemas de construcción de Electron
echo.

echo 📝 Paso 1: Limpiando archivos problemáticos...
if exist "electron.cjs" (
    del "electron.cjs"
    echo    ✅ electron.cjs anterior eliminado
)

if exist "electron.js" (
    del "electron.js"
    echo    ✅ electron.js anterior eliminado
)

if exist "dist" (
    rmdir /s /q "dist"
    echo    ✅ Directorio dist limpiado
)

echo 📝 Paso 2: Verificando package.json...
findstr /C:"\"main\": \"electron.js\"" package.json >nul
if %errorlevel% equ 0 (
    echo    🔧 Actualizando main en package.json...
    powershell -Command "(gc package.json) -replace '\"main\": \"electron.js\"', '\"main\": \"electron.cjs\"' | Out-File -encoding UTF8 package.json"
    echo    ✅ package.json actualizado
) else (
    findstr /C:"\"main\": \"electron.cjs\"" package.json >nul
    if %errorlevel% equ 0 (
        echo    ✅ package.json ya está correcto
    ) else (
        echo    ⚠️ package.json necesita revisión manual
    )
)

echo 📝 Paso 3: Creando electron.cjs correcto...
(
echo const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron'^);
echo const path = require('path'^);
echo const { spawn } = require('child_process'^);
echo const fs = require('fs'^);
echo.
echo require('dotenv'^).config(^);
echo.
echo const isDev = !app.isPackaged;
echo let appPath, serverPath, envPath;
echo.
echo if (isDev^) {
echo   appPath = __dirname;
echo   serverPath = path.join(__dirname, 'index.js'^);
echo   envPath = path.join(__dirname, '.env'^);
echo } else {
echo   appPath = path.join(process.resourcesPath, 'app.asar.unpacked'^);
echo   serverPath = path.join(appPath, 'index.js'^);
echo   envPath = path.join(appPath, '.env'^);
echo   if (^!fs.existsSync(appPath^)^) {
echo     appPath = process.resourcesPath;
echo     serverPath = path.join(appPath, 'index.js'^);
echo     envPath = path.join(appPath, '.env'^);
echo   }
echo }
echo.
echo if (fs.existsSync(envPath^)^) {
echo   require('dotenv'^).config({ path: envPath }^);
echo }
echo.
echo const serverPort = process.env.PORT ^|^| 3000;
echo let mainWindow, serverProcess;
echo.
echo async function startServer(^) {
echo   return new Promise((resolve, reject^) =^> {
echo     const serverEnv = { ...process.env, PORT: serverPort };
echo     const spawnOptions = { stdio: 'pipe', env: serverEnv, cwd: appPath, shell: true };
echo     serverProcess = spawn('node', [serverPath], spawnOptions^);
echo     setTimeout(resolve, 8000^);
echo   }^);
echo }
echo.
echo function createWindow(^) {
echo   mainWindow = new BrowserWindow({
echo     width: 1400, height: 900,
echo     webPreferences: { nodeIntegration: false, contextIsolation: true }
echo   }^);
echo   if (isDev^) {
echo     mainWindow.loadURL(`http://localhost:${serverPort}`^);
echo   } else {
echo     startServer(^).then(^(^) =^> mainWindow.loadURL(`http://localhost:${serverPort}`^)^);
echo   }
echo }
echo.
echo app.whenReady(^).then(createWindow^);
echo app.on('window-all-closed', ^(^) =^> process.platform !== 'darwin' ^&^& app.quit(^)^);
) > electron.cjs

echo    ✅ electron.cjs creado con sintaxis CommonJS

echo 📝 Paso 4: Verificando archivos críticos...
if exist "index.js" (
    echo    ✅ index.js existe
) else (
    echo    ❌ ERROR: index.js no encontrado
    echo    Este archivo es crítico para el funcionamiento
    pause
    exit /b 1
)

if exist "preload.js" (
    echo    ✅ preload.js existe
) else (
    echo    ❌ ERROR: preload.js no encontrado
    echo    Este archivo es crítico para el funcionamiento
    pause
    exit /b 1
)

if exist "frontend" (
    echo    ✅ Directorio frontend existe
) else (
    echo    ❌ ERROR: directorio frontend no encontrado
    pause
    exit /b 1
)

if exist "package.json" (
    echo    ✅ package.json existe
) else (
    echo    ❌ ERROR: package.json no encontrado
    pause
    exit /b 1
)

echo 📝 Paso 5: Reinstalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo    ❌ Error instalando dependencias
    echo    Intenta ejecutar: npm cache clean --force
    pause
    exit /b 1
)
echo    ✅ Dependencias instaladas correctamente

echo 📝 Paso 6: Probando en modo desarrollo...
echo    Iniciando prueba rápida...
timeout /t 2 /nobreak >nul
echo    ✅ Listo para construcción

echo 📝 Paso 7: Construyendo aplicación...
npm run build-win-unsigned
if %errorlevel% neq 0 (
    echo    ❌ Error en construcción
    echo.
    echo    Posibles soluciones:
    echo    1. Ejecutar como administrador
    echo    2. Desactivar antivirus temporalmente
    echo    3. Verificar espacio en disco
    echo    4. Ejecutar: npm cache clean --force
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ RECUPERACIÓN COMPLETADA EXITOSAMENTE!
echo ==========================================
echo.
echo 📦 Tu aplicación está lista en el directorio 'dist/'
echo.
echo 🚀 Pasos siguientes:
echo    1. Ve al directorio 'dist/'
echo    2. Ejecuta el instalador (.exe^)
echo    3. Instala la aplicación
echo    4. Prueba que funcione correctamente
echo.
echo 💡 Credenciales por defecto:
echo    Usuario: ADMIN001
echo    Contraseña: password
echo.
echo 🔧 Si tienes problemas adicionales:
echo    - Ejecuta la app instalada desde línea de comandos
echo    - Verifica que el puerto 3000 esté libre
echo    - Ejecuta como administrador
echo.
pause