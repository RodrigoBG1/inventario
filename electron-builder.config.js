// electron-builder.config.js
// Configuración separada para electron-builder

module.exports = {
  appId: "com.inventario.app",
  productName: "Sistema de Inventario",
  directories: {
    output: "dist",
    buildResources: "assets"
  },
  files: [
    "electron.js",
    "preload.js", 
    "index.js",
    ".env",
    "frontend/**/*",
    "package.json",
    // Incluir node_modules pero excluir archivos innecesarios
    "node_modules/**/*",
    "!node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!node_modules/*.d.ts",
    "!node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
  ],
  asarUnpack: [
    // Estos archivos DEBEN estar desempaquetados para que funcionen
    "index.js",
    ".env",
    "frontend/**/*",
    // Desempaquetar dependencias críticas
    "node_modules/@supabase/**/*",
    "node_modules/express/**/*",
    "node_modules/jsonwebtoken/**/*",
    "node_modules/cors/**/*",
    "node_modules/dotenv/**/*"
  ],
  // Configuración para Windows
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.ico"
  },
  // Configuración para macOS
  mac: {
    target: "dmg",
    icon: "assets/icon.icns",
    category: "public.app-category.business"
  },
  // Configuración para Linux
  linux: {
    target: "AppImage",
    icon: "assets/icon.png",
    category: "Office"
  },
  // Configuración del instalador NSIS (Windows)
  nsis: {
    oneClick: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    installerIcon: "assets/icon.ico",
    uninstallerIcon: "assets/icon.ico",
    installerHeaderIcon: "assets/icon.ico",
    deleteAppDataOnUninstall: false
  },
  // Configuración del DMG (macOS)
  dmg: {
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: "link",
        path: "/Applications"
      }
    ]
  },
  // Configuración de compresión
  compression: "normal",
  
  // Configuración de publicación (deshabilitada)
  publish: null,
  
  // Configuración adicional para debugging
  buildDependenciesFromSource: false,
  nodeGypRebuild: false,
  
  // Excluir archivos de desarrollo
  ignore: [
    "/node_modules/.cache",
    "/src",
    "/docs",
    "/.vscode",
    "/.idea",
    "/test",
    "**/.git",
    "**/*.log"
  ],
  
  // Configurar variables de entorno para el build
  env: {
    NODE_ENV: "production"
  },
  
  // Configuración para firmar la aplicación (opcional)
  // forceCodeSigning: false,
  
  // Afterpack hook para verificar el build
  afterPack: async (context) => {
    console.log('✅ Empaquetado completado para:', context.electronPlatformName);
    console.log('📁 Directorio de salida:', context.outDir);
  },
  
  // Beforepack hook para preparar archivos
  beforePack: async (context) => {
    console.log('🔧 Preparando empaquetado para:', context.electronPlatformName);
    
    // Verificar que los archivos críticos existen
    const fs = require('fs');
    const path = require('path');
    
    const criticalFiles = [
      'electron.js',
      'index.js',
      'preload.js',
      '.env'
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(context.appDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo crítico no encontrado: ${file}`);
      }
    }
    
    // Verificar directorio frontend
    const frontendPath = path.join(context.appDir, 'frontend');
    if (!fs.existsSync(frontendPath)) {
      throw new Error('Directorio frontend no encontrado');
    }
    
    console.log('✅ Verificación de archivos completada');
  }
};