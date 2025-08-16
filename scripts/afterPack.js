// scripts/afterPack.js
// Script que se ejecuta después del empaquetado para verificar la estructura

const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  console.log('🔧 Ejecutando script afterPack...');
  console.log('Platform:', context.electronPlatformName);
  console.log('Arch:', context.arch);
  console.log('Output dir:', context.appOutDir);
  
  try {
    // Verificar que los archivos críticos estén en el lugar correcto
    const appPath = context.appOutDir;
    const resourcesPath = path.join(appPath, 'resources');
    const unpackedPath = path.join(resourcesPath, 'app.asar.unpacked');
    
    console.log('📁 Verificando estructura de archivos...');
    
    // Archivos que deben estar desempaquetados
    const requiredFiles = [
      'index.js',
      '.env',
      'frontend'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(unpackedPath, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      } else {
        console.log(`✅ ${file} encontrado en ubicación correcta`);
      }
    }
    
    if (missingFiles.length > 0) {
      console.error('❌ Archivos faltantes en app.asar.unpacked:', missingFiles);
      throw new Error('Archivos críticos no fueron desempaquetados correctamente');
    }
    
    // Verificar que el archivo principal de Electron esté presente
    const mainFile = path.join(resourcesPath, 'app.asar');
    if (fs.existsSync(mainFile)) {
      console.log('✅ app.asar creado correctamente');
    } else {
      console.warn('⚠️ app.asar no encontrado - verificar configuración');
    }
    
    // Crear archivo de información para debugging
    const debugInfo = {
      buildTime: new Date().toISOString(),
      platform: context.electronPlatformName,
      arch: context.arch,
      electronVersion: context.electronVersion,
      files: {
        asar: fs.existsSync(mainFile),
        unpacked: requiredFiles.map(file => ({
          name: file,
          exists: fs.existsSync(path.join(unpackedPath, file))
        }))
      }
    };
    
    fs.writeFileSync(
      path.join(appPath, 'build-info.json'), 
      JSON.stringify(debugInfo, null, 2)
    );
    
    console.log('✅ afterPack completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en afterPack:', error);
    throw error;
  }
};