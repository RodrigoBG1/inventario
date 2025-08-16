// scripts/beforePack.js
// Script que se ejecuta antes del empaquetado para verificar prerequisitos

const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  console.log('🔧 Ejecutando script beforePack...');
  console.log('Platform:', context.electronPlatformName);
  console.log('App directory:', context.appDir);
  
  try {
    // Verificar que los archivos críticos existen antes del empaquetado
    const criticalFiles = [
      'electron.cjs',
      'index.js', 
      'preload.js',
      'package.json'
    ];
    
    console.log('📁 Verificando archivos críticos...');
    
    for (const file of criticalFiles) {
      const filePath = path.join(context.appDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo crítico no encontrado: ${file}`);
      }
      console.log(`✅ ${file} verificado`);
    }
    
    // Verificar directorio frontend
    const frontendPath = path.join(context.appDir, 'frontend');
    if (!fs.existsSync(frontendPath)) {
      throw new Error('Directorio frontend no encontrado');
    }
    console.log('✅ Directorio frontend verificado');
    
    // Verificar que package.json tiene la configuración correcta
    const packagePath = path.join(context.appDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (packageJson.main !== 'electron.cjs') {
      console.warn('⚠️ package.json main debería ser "electron.cjs"');
    }
    
    if (packageJson.type !== 'module') {
      console.warn('⚠️ package.json type debería ser "module"');
    }
    
    // Verificar archivo .env
    const envPath = path.join(context.appDir, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('📝 Creando archivo .env básico...');
      const defaultEnv = `PORT=3000
NODE_ENV=production
# Agregar variables de Supabase aquí:
# SUPABASE_URL=your_url_here
# SUPABASE_SERVICE_KEY=your_key_here
# JWT_SECRET=your_jwt_secret_here
`;
      fs.writeFileSync(envPath, defaultEnv);
      console.log('✅ Archivo .env creado');
    } else {
      console.log('✅ Archivo .env encontrado');
    }
    
    // Crear directorio assets si no existe
    const assetsPath = path.join(context.appDir, 'assets');
    if (!fs.existsSync(assetsPath)) {
      console.log('📁 Creando directorio assets...');
      fs.mkdirSync(assetsPath, { recursive: true });
      
      // Crear iconos placeholder básicos si no existen
      const iconFiles = ['icon.ico', 'icon.icns', 'icon.png'];
      iconFiles.forEach(iconFile => {
        const iconPath = path.join(assetsPath, iconFile);
        if (!fs.existsSync(iconPath)) {
          // Crear archivo placeholder vacío
          fs.writeFileSync(iconPath, '');
          console.log(`📄 Creado placeholder: ${iconFile}`);
        }
      });
    }
    
    console.log('✅ beforePack completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en beforePack:', error.message);
    throw error;
  }
};