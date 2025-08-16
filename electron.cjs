const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Iniciando Sistema de Inventario...');

// Configuración básica
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const serverPort = process.env.PORT || 3000;

let mainWindow;
let serverProcess;

console.log(`📊 Configuración inicial:
- Modo desarrollo: ${isDev}
- Aplicación empaquetada: ${app.isPackaged}
- Puerto servidor: ${serverPort}
- Plataforma: ${process.platform}
- Process execPath: ${process.execPath}
- Process cwd: ${process.cwd()}
- __dirname: ${__dirname}`);

// ✅ CONFIGURAR RUTAS Y EJECUTABLE CORRECTO
let appPath, serverPath, nodeExecutable;

if (isDev) {
  appPath = __dirname;
  serverPath = path.join(__dirname, 'index.js');
  nodeExecutable = 'node';
} else {
  // ✅ RUTAS CORREGIDAS PARA PRODUCCIÓN
  appPath = path.join(process.resourcesPath, 'app.asar.unpacked');
  serverPath = path.join(appPath, 'index.js');
  
  // ✅ ESTRATEGIA MÚLTIPLE PARA ENCONTRAR NODE.EXE
  const fs = require('fs');
  const possibleNodePaths = [
    // 1. Usar el propio ejecutable de Electron (que incluye Node.js)
    process.execPath,
    // 2. Buscar node.exe en el directorio de la aplicación
    path.join(path.dirname(process.execPath), 'node.exe'),
    // 3. Buscar en resources
    path.join(process.resourcesPath, 'node.exe'),
    // 4. Buscar en app.asar.unpacked
    path.join(appPath, 'node.exe'),
    // 5. Usar node del sistema como último recurso
    'node'
  ];
  
  nodeExecutable = null;
  for (const nodePath of possibleNodePaths) {
    if (nodePath === process.execPath) {
      // Caso especial: usar Electron como Node.js
      nodeExecutable = process.execPath;
      console.log(`✅ Usando Electron como Node.js: ${nodeExecutable}`);
      break;
    } else if (fs.existsSync(nodePath)) {
      nodeExecutable = nodePath;
      console.log(`✅ Node.js encontrado en: ${nodeExecutable}`);
      break;
    }
  }
  
  if (!nodeExecutable) {
    nodeExecutable = 'node'; // Fallback final
    console.log('⚠️ Usando Node.js del sistema como fallback');
  }
}

console.log(`📁 Configuración final:
- Directorio app: ${appPath}
- Archivo servidor: ${serverPath}
- Ejecutable Node: ${nodeExecutable}`);

// ✅ FUNCIÓN PARA INICIAR SERVIDOR CON ELECTRON COMO NODE.JS
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Iniciando servidor Express...');
    
    // Verificar que el archivo del servidor existe
    const fs = require('fs');
    if (!fs.existsSync(serverPath)) {
      const error = new Error(`Archivo del servidor no encontrado: ${serverPath}`);
      console.error('❌', error.message);
      return reject(error);
    }
    
    console.log('✅ Archivo del servidor encontrado');
    
    // ✅ CONFIGURAR VARIABLES DE ENTORNO
    const serverEnv = {
      ...process.env,
      PORT: serverPort,
      NODE_ENV: 'production',
      NODE_PATH: path.join(appPath, 'node_modules'),
      ELECTRON_RUN_AS_NODE: '1' // ✅ CLAVE: Ejecutar Electron como Node.js
    };
    
    console.log('🔧 Variables de entorno configuradas:');
    console.log('- ELECTRON_RUN_AS_NODE: 1');
    console.log('- NODE_PATH:', serverEnv.NODE_PATH);
    console.log('- Working directory:', appPath);
    
    // ✅ CONFIGURAR ARGUMENTOS PARA ELECTRON COMO NODE.JS
    let spawnCommand, spawnArgs, spawnOptions;
    
    if (nodeExecutable === process.execPath) {
      // ✅ USAR ELECTRON COMO NODE.JS
      spawnCommand = process.execPath;
      spawnArgs = [serverPath]; // Solo el archivo a ejecutar
      spawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: serverEnv,
        cwd: appPath,
        detached: false
      };
      console.log(`🚀 Ejecutando Electron como Node.js: ${spawnCommand} ${spawnArgs.join(' ')}`);
    } else {
      // ✅ USAR NODE.JS TRADICIONAL
      spawnCommand = nodeExecutable;
      spawnArgs = [serverPath];
      spawnOptions = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: serverEnv,
        cwd: appPath,
        detached: false
      };
      console.log(`🚀 Ejecutando Node.js tradicional: ${spawnCommand} ${spawnArgs.join(' ')}`);
    }
    
    try {
      serverProcess = spawn(spawnCommand, spawnArgs, spawnOptions);
    } catch (spawnError) {
      console.error('💥 Error al crear proceso del servidor:', spawnError);
      return reject(spawnError);
    }
    
    let serverReady = false;
    let startupOutput = [];
    let hasError = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput.push(`STDOUT: ${output}`);
      console.log(`📡 Servidor stdout: ${output.trim()}`);
      
      // ✅ DETECTAR CUANDO EL SERVIDOR ESTÁ LISTO
      if ((output.includes(`puerto ${serverPort}`) || 
           output.includes('listening') || 
           output.includes('started') ||
           output.includes('Servidor iniciado')) && !serverReady && !hasError) {
        serverReady = true;
        console.log('✅ Servidor listo - resolviendo promesa');
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      startupOutput.push(`STDERR: ${errorOutput}`);
      console.error(`❌ Servidor stderr: ${errorOutput.trim()}`);
      
      // ✅ IDENTIFICAR ERRORES CRÍTICOS
      if (!hasError && (
          errorOutput.includes('Cannot find module') || 
          errorOutput.includes('MODULE_NOT_FOUND') ||
          errorOutput.includes('EADDRINUSE') ||
          (errorOutput.includes('Error:') && errorOutput.includes('at '))
      )) {
        hasError = true;
        console.error('💥 Error crítico detectado:', errorOutput);
        if (!serverReady) {
          reject(new Error(`Error del servidor: ${errorOutput.trim()}`));
        }
      }
    });
    
    serverProcess.on('error', (error) => {
      hasError = true;
      console.error('💥 Error del proceso del servidor:', error);
      console.log('📋 Output capturado:', startupOutput.join('\n'));
      if (!serverReady) {
        reject(error);
      }
    });
    
    serverProcess.on('close', (code, signal) => {
      console.log(`🔴 Servidor terminado con código ${code}, señal: ${signal}`);
      
      if (!serverReady && !hasError && code !== 0) {
        console.log('📋 Output completo del servidor:', startupOutput.join('\n'));
        reject(new Error(`Servidor falló con código ${code}. Output: ${startupOutput.slice(-5).join('\n')}`));
      }
    });
    
    // ✅ TIMEOUT Y VERIFICACIÓN DE CONECTIVIDAD
    setTimeout(() => {
      if (!serverReady && !hasError) {
        console.log('⏰ Timeout después de 12 segundos, verificando conectividad...');
        
        // ✅ VERIFICAR SI EL SERVIDOR RESPONDE AUNQUE NO HAYAMOS DETECTADO EL MENSAJE
        const http = require('http');
        const req = http.get(`http://localhost:${serverPort}`, (res) => {
          console.log('✅ Servidor responde a HTTP - considerando como exitoso');
          if (!serverReady) {
            serverReady = true;
            resolve();
          }
        });
        
        req.on('error', (err) => {
          console.error('❌ Servidor no responde a HTTP:', err.message);
          console.log('📋 Output del servidor hasta ahora:', startupOutput.join('\n'));
          if (!serverReady) {
            reject(new Error(`Timeout del servidor (12s). Último output: ${startupOutput.slice(-3).join('\n')}`));
          }
        });
        
        req.setTimeout(3000, () => {
          req.destroy();
        });
      }
    }, 12000);
  });
}

// ✅ FUNCIÓN PARA CREAR LA VENTANA PRINCIPAL
function createWindow() {
  console.log('🖥️ Creando ventana principal...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: false,
    title: 'Sistema de Inventario'
  });

  createMenu();

  if (isDev) {
    console.log('🔧 Modo desarrollo: cargando localhost...');
    mainWindow.loadURL(`http://localhost:${serverPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    console.log('🚀 Modo producción: iniciando servidor...');
    
    showLoadingPage();
    
    startServer()
      .then(() => {
        console.log('✅ Servidor iniciado, cargando aplicación...');
        return mainWindow.loadURL(`http://localhost:${serverPort}`);
      })
      .then(() => {
        console.log('✅ Aplicación cargada exitosamente');
      })
      .catch(err => {
        console.error('💥 Error durante inicio:', err);
        showErrorPage(err);
      });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Aplicación visible');
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode !== -3) {
      console.error(`❌ Error cargando aplicación: ${errorCode} - ${errorDescription}`);
      showErrorPage(new Error(`${errorCode}: ${errorDescription}`));
    }
  });
}

// ✅ PANTALLA DE CARGA MEJORADA
function showLoadingPage() {
  const loadingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Iniciando Sistema de Inventario</title>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex; justify-content: center; align-items: center;
          height: 100vh; margin: 0; 
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
        }
        .loading-container { text-align: center; padding: 40px; }
        .spinner {
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%; width: 60px; height: 60px;
          animation: spin 1s linear infinite; margin: 30px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h1 { margin-bottom: 20px; font-weight: 300; font-size: 2.5rem; }
        p { opacity: 0.9; margin: 15px 0; font-size: 1.1rem; }
        .version { opacity: 0.7; font-size: 0.9rem; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="loading-container">
        <h1>🏭 Sistema de Inventario</h1>
        <div class="spinner"></div>
        <p>Iniciando servidor interno...</p>
        <p>Configurando base de datos...</p>
        <div class="version">Versión ${app.getVersion()} | Electron ${process.versions.electron}</div>
      </div>
    </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHtml)}`);
}

// ✅ PÁGINA DE ERROR DETALLADA
function showErrorPage(error) {
  const errorDetails = `
Error: ${error.message}

Configuración de depuración:
- Puerto: ${serverPort}
- Ruta servidor: ${serverPath}
- Ejecutable Node: ${nodeExecutable}
- Directorio: ${appPath}
- Modo: ${isDev ? 'Desarrollo' : 'Producción'}
- Electron execPath: ${process.execPath}
- Process cwd: ${process.cwd()}
  `;

  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Sistema de Inventario</title>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex; justify-content: center; align-items: center;
          min-height: 100vh; margin: 0; background: #f5f5f5; padding: 20px;
        }
        .error-container {
          text-align: center; background: white; padding: 40px;
          border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          max-width: 800px; width: 100%;
        }
        h1 { color: #d32f2f; margin-bottom: 20px; font-size: 2rem; }
        .error-details { 
          background: #f8f9fa; padding: 20px; border-radius: 8px;
          margin: 25px 0; font-family: 'Courier New', monospace; font-size: 13px;
          text-align: left; white-space: pre-wrap; max-height: 300px; overflow-y: auto;
          border: 1px solid #e9ecef;
        }
        button {
          background: #1976d2; color: white; border: none;
          padding: 14px 28px; border-radius: 6px; cursor: pointer;
          margin: 12px; font-size: 16px; font-weight: 500;
          transition: background-color 0.2s;
        }
        button:hover { background: #1565c0; }
        button.danger { background: #d32f2f; }
        button.danger:hover { background: #c62828; }
        .solutions { 
          text-align: left; margin: 25px 0; 
          background: #fff3cd; padding: 20px; border-radius: 8px;
          border: 1px solid #ffeaa7;
        }
        .solutions h3 { margin-top: 0; color: #856404; }
        .solutions ol { padding-left: 20px; }
        .solutions li { margin: 12px 0; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>❌ Error al iniciar el servidor</h1>
        <p><strong>El Sistema de Inventario no pudo iniciar el servidor interno.</strong></p>
        
        <div class="error-details">${errorDetails}</div>
        
        <div class="solutions">
          <h3>🔧 Soluciones paso a paso:</h3>
          <ol>
            <li><strong>Reiniciar:</strong> Cerrar completamente y abrir de nuevo la aplicación</li>
            <li><strong>Ejecutar como administrador:</strong> Click derecho → "Ejecutar como administrador"</li>
            <li><strong>Verificar puerto:</strong> Cerrar aplicaciones que usen el puerto ${serverPort}</li>
            <li><strong>Antivirus:</strong> Agregar excepción para esta aplicación</li>
            <li><strong>Windows Defender:</strong> Desactivar "Protección en tiempo real" temporalmente</li>
            <li><strong>Reinstalar:</strong> Desinstalar completamente y volver a instalar</li>
          </ol>
        </div>
        
        <button onclick="location.reload()">🔄 Reintentar</button>
        <button class="danger" onclick="require('electron').remote?.app.quit() || window.close()">❌ Cerrar</button>
      </div>
    </body>
    </html>
  `;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

// Función para crear menú básico
function createMenu() {
  const template = [
    {
      label: 'Sistema',
      submenu: [
        {
          label: 'Recargar aplicación',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Herramientas',
      submenu: [
        {
          label: 'Consola de desarrollador',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Eventos de la aplicación
app.whenReady().then(() => {
  console.log('🚀 Electron listo, creando ventana...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('🔴 Cerrando aplicación...');
  
  if (serverProcess) {
    console.log('🔴 Terminando servidor...');
    try {
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 2000);
    } catch (error) {
      console.error('Error terminando servidor:', error);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (error) {
      console.error('Error en limpieza:', error);
    }
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('show-message-box', async (event, options) => {
  if (mainWindow) {
    return await dialog.showMessageBox(mainWindow, options);
  }
  return { response: 0 };
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  if (mainWindow) {
    return await dialog.showSaveDialog(mainWindow, options);
  }
  return { canceled: true };
});

console.log('✅ Configuración de Electron completada');