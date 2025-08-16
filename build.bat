@echo off
echo 🔨 Construyendo aplicación Electron para Sistema de Inventario...
echo.

REM Verificar que Node.js esté instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado. Por favor, instala Node.js primero.
    pause
    exit /b 1
)

REM Verificar que npm esté instalado
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm no está instalado. Por favor, instala npm primero.
    pause
    exit /b 1
)

echo ✅ Node.js detectado: 
node --version
echo ✅ npm detectado: 
npm --version
echo.

REM ✅ VERIFICAR ESTRUCTURA DE ARCHIVOS CRÍTICOS
echo 🔍 Verificando archivos críticos...

if not exist "index.js" (
    echo ❌ Error: index.js no encontrado
    pause
    exit /b 1
)

REM ✅ CAMBIO IMPORTANTE: Verificar electron.cjs en lugar de electron.js
if not exist "electron.cjs" (
    echo ❌ Error: electron.cjs no encontrado
    echo 💡 Asegúrate de que el archivo principal se llame electron.cjs
    pause
    exit /b 1
)

if not exist "preload.js" (
    echo ❌ Error: preload.js no encontrado
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Error: directorio frontend no encontrado
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ❌ Error: package.json no encontrado
    pause
    exit /b 1
)

echo ✅ Todos los archivos críticos encontrados
echo.

REM ✅ VERIFICAR QUE EL MAIN EN PACKAGE.JSON SEA CORRECTO
echo 🔍 Verificando configuración de package.json...
findstr /C:"electron.cjs" package.json >nul
if %errorlevel% neq 0 (
    echo ❌ Error: package.json debe tener "main": "electron.cjs"
    echo 💡 Actualiza el campo main en package.json
    pause
    exit /b 1
)
echo ✅ Configuración de package.json correcta
echo.

REM ✅ LIMPIAR INSTALACIÓN ANTERIOR SI EXISTE
if exist "node_modules" (
    echo 🧹 Limpiando instalación anterior...
    rmdir /s /q "node_modules" 2>nul
)

if exist "dist" (
    echo 🧹 Limpiando construcción anterior...
    rmdir /s /q "dist" 2>nul
)

REM Instalar dependencias
echo 📦 Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias
    echo 💡 Intenta: npm cache clean --force && npm install
    pause
    exit /b 1
)

echo ✅ Dependencias instaladas correctamente
echo.

REM ✅ CREAR DIRECTORIO DE ASSETS CON ICONOS BÁSICOS
if not exist "assets" (
    echo 📁 Creando directorio de assets...
    mkdir assets
    
    REM ✅ CREAR ICONOS BÁSICOS (OPCIONAL - PUEDES REEMPLAZAR CON ICONOS REALES)
    echo 💡 Creando iconos placeholder básicos...
    echo. > assets\icon.ico
    echo. > assets\icon.icns
    echo. > assets\icon.png
    
    echo ⚠️ Iconos placeholder creados. Reemplaza con iconos reales para producción.
    echo.
)

REM ✅ VERIFICAR ARCHIVO .ENV
if not exist ".env" (
    echo ⚠️ Archivo .env no encontrado - creando uno básico...
    echo PORT=3000 > .env
    echo NODE_ENV=production >> .env
    echo # Agrega aquí tus variables de Supabase: >> .env
    echo # SUPABASE_URL=tu_url_aqui >> .env
    echo # SUPABASE_SERVICE_KEY=tu_key_aqui >> .env
    echo ✅ Archivo .env básico creado
    echo.
)

REM ✅ VERIFICAR QUE ELECTRON ESTÉ INSTALADO CORRECTAMENTE
echo 🔍 Verificando instalación de Electron...
npx electron --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Electron no está instalado correctamente
    echo 💡 Intentando reinstalar Electron...
    npm install electron --save-dev
    if %errorlevel% neq 0 (
        echo ❌ Error reinstalando Electron
        pause
        exit /b 1
    )
)

npx electron --version
echo ✅ Electron instalado correctamente
echo.

REM ✅ EJECUTAR PRUEBA RÁPIDA DEL SERVIDOR (OPCIONAL)
echo 🧪 Ejecutando prueba rápida del servidor...
timeout /t 2 /nobreak >nul
node index.js --test 2>nul &
timeout /t 3 /nobreak >nul
taskkill /f /im node.exe >nul 2>&1

echo ✅ Prueba del servidor completada
echo.

REM ✅ CONSTRUIR APLICACIÓN CON MEJORES PARÁMETROS
echo 🏗️ Construyendo aplicación para Windows...
echo 💡 Esto puede tomar varios minutos...
echo.

REM ✅ USAR CONFIGURACIÓN ESPECÍFICA PARA EVITAR PROBLEMAS DE FIRMADO
set CSC_IDENTITY_AUTO_DISCOVERY=false
set NODE_ENV=production

npx electron-builder --windows --config.compression=store --config.nsis.oneClick=false
if %errorlevel% neq 0 (
    echo ❌ Error en construcción
    echo.
    echo 💡 Posibles soluciones:
    echo    - Ejecutar como administrador
    echo    - Verificar que no hay antivirus bloqueando
    echo    - Limpiar cache: npm cache clean --force
    echo    - Reinstalar: npm run rebuild
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ ¡Construcción completada exitosamente!
echo.
echo 📦 Los archivos de distribución están en el directorio 'dist/'
echo.
echo 📁 Estructura generada:
if exist "dist\win-unpacked" (
    echo    ✅ dist\win-unpacked\ - Versión desempaquetada para testing
)
if exist "dist\*.exe" (
    echo    ✅ dist\*.exe - Instalador para distribución
)
echo.
echo 🚀 Para probar la aplicación:
echo    1. Ir a dist\win-unpacked\
echo    2. Ejecutar "Sistema de Inventario.exe"
echo.
echo 📦 Para instalar:
echo    1. Ejecutar el archivo .exe en dist\
echo    2. Seguir el asistente de instalación
echo.
echo 💡 Consejos para resolución de problemas:
echo    - Si la app no inicia, ejecuta desde cmd para ver errores
echo    - Verifica que el puerto 3000 no esté ocupado
echo    - Revisa los logs en el directorio de la aplicación
echo    - Si hay problemas de conexión, verifica el firewall/antivirus
echo.
echo 🎉 ¡Construcción finalizada!
echo.
pause