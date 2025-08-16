#!/bin/bash

echo "🔨 Construyendo aplicación Electron para Sistema de Inventario..."

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor, instala Node.js primero."
    exit 1
fi

# Verificar que npm esté instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor, instala npm primero."
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"
echo "✅ npm $(npm --version) detectado"

# Limpiar instalaciones previas
echo "🧹 Limpiando instalaciones previas..."
rm -rf node_modules
rm -rf dist
rm -f package-lock.json

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar archivos críticos
echo "🔍 Verificando archivos críticos..."

if [ ! -f "electron.js" ]; then
    echo "❌ electron.js no encontrado"
    exit 1
fi

if [ ! -f "index.js" ]; then
    echo "❌ index.js no encontrado"
    exit 1
fi

if [ ! -f "preload.js" ]; then
    echo "❌ preload.js no encontrado"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ Directorio frontend no encontrado"
    exit 1
fi

echo "✅ Todos los archivos críticos encontrados"

# Crear directorio de assets si no existe
if [ ! -d "assets" ]; then
    echo "📁 Creando directorio de assets..."
    mkdir -p assets
    
    # Crear iconos placeholder
    echo "🎨 Creando iconos placeholder..."
    
    if command -v convert &> /dev/null; then
        # Si ImageMagick está instalado, crear iconos reales
        convert -size 256x256 xc:"#052e5b" -fill white -gravity center -pointsize 72 -annotate +0+0 "INV" assets/icon.png
        convert assets/icon.png -resize 32x32 assets/icon.ico
        if command -v png2icns &> /dev/null; then
            png2icns assets/icon.icns assets/icon.png
        else
            cp assets/icon.png assets/icon.icns
        fi
    else
        # Crear archivos placeholder
        touch assets/icon.png
        touch assets/icon.ico
        touch assets/icon.icns
        echo "⚠️  Iconos placeholder creados. Reemplaza con iconos reales para producción."
    fi
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado. Creando archivo .env de ejemplo..."
    cat > .env << EOF
# Configuración de la aplicación
NODE_ENV=production
PORT=3000
JWT_SECRET=aceites-motor-secret-key-2025

# Configuración de Supabase (opcional)
# SUPABASE_URL=tu_url_de_supabase
# SUPABASE_SERVICE_KEY=tu_service_key_de_supabase
EOF
    echo "✅ Archivo .env creado. Configura las variables según sea necesario."
fi

# Función para construir para plataforma específica
build_platform() {
    local platform=$1
    echo "🏗️  Construyendo para $platform..."
    
    # Limpiar caché de electron-builder
    npx electron-builder --help > /dev/null 2>&1
    
    case $platform in
        "windows")
            # Construir para Windows con configuración específica
            npx electron-builder --windows --config.compression=normal --config.nsis.oneClick=false
            ;;
        "mac")
            npx electron-builder --mac --config.compression=normal
            ;;
        "linux")
            npx electron-builder --linux --config.compression=normal
            ;;
        "all")
            echo "🌍 Construyendo para todas las plataformas..."
            npx electron-builder --windows --config.compression=normal --config.nsis.oneClick=false
            npx electron-builder --mac --config.compression=normal
            npx electron-builder --linux --config.compression=normal
            ;;
        *)
            echo "❌ Plataforma no reconocida: $platform"
            echo "Plataformas disponibles: windows, mac, linux, all"
            exit 1
            ;;
    esac
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo "Uso: $0 <plataforma>"
    echo "Plataformas disponibles: windows, mac, linux, all"
    echo ""
    echo "Ejemplos:"
    echo "  $0 windows    # Construir solo para Windows"
    echo "  $0 mac        # Construir solo para macOS"
    echo "  $0 linux      # Construir solo para Linux"
    echo "  $0 all        # Construir para todas las plataformas"
    exit 1
fi

# Pre-build: Verificar que la aplicación funciona
echo "🧪 Probando que la aplicación funciona..."
timeout 10s node index.js &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Servidor se inicia correctamente"
    kill $SERVER_PID
else
    echo "❌ Error: El servidor no se inicia correctamente"
    echo "Verifica que no haya errores en index.js"
    exit 1
fi

# Construir para la plataforma especificada
build_platform $1

echo ""
echo "✅ Construcción completada!"
echo "📦 Los archivos de distribución están en el directorio 'dist/'"
echo ""
echo "🔍 Archivos generados:"
ls -la dist/ 2>/dev/null || echo "No se encontró el directorio dist/"
echo ""
echo "Para instalar y ejecutar:"
echo "  - Windows: Ejecuta el archivo .exe en dist/"
echo "  - macOS: Abre el archivo .dmg en dist/"
echo "  - Linux: Ejecuta el archivo .AppImage en dist/"
echo ""
echo "📋 Notas importantes:"
echo "  - Asegúrate de que el archivo .env esté configurado correctamente"
echo "  - Los archivos del frontend deben estar en el directorio 'frontend/'"
echo "  - Verifica que no haya puertos ocupados en el sistema de destino"