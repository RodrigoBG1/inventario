const { contextBridge, ipcRenderer } = require('electron');

// ✅ EXPONER APIs SEGURAS Y SIMPLIFICADAS
contextBridge.exposeInMainWorld('electronAPI', {
  // Información de la aplicación
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Diálogos básicos
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Información del sistema
  platform: process.platform,
  isElectron: true,
  
  // ✅ UTILIDADES BÁSICAS PARA INVENTARIO
  utils: {
    // Confirmación simple
    confirm: async (message, title = 'Confirmar') => {
      try {
        const result = await ipcRenderer.invoke('show-message-box', {
          type: 'question',
          buttons: ['Cancelar', 'Confirmar'],
          defaultId: 1,
          title: title,
          message: message
        });
        return result.response === 1;
      } catch (error) {
        console.error('Error en confirmación:', error);
        return false;
      }
    },
    
    // Alerta simple
    alert: async (message, title = 'Información', type = 'info') => {
      try {
        await ipcRenderer.invoke('show-message-box', {
          type: type,
          title: title,
          message: message,
          buttons: ['OK']
        });
      } catch (error) {
        console.error('Error en alerta:', error);
      }
    },
    
    // Estado de conexión
    isOnline: () => navigator.onLine,
    
    // Información del entorno (para debugging)
    getEnvironmentInfo: () => ({
      platform: process.platform,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      isElectron: true
    })
  }
});

// ✅ MEJORAR EXPERIENCIA DE USUARIO EN ELECTRON
window.addEventListener('DOMContentLoaded', () => {
  console.log('🖥️ Aplicación Electron cargada');
  
  // Agregar clase CSS para indicar que es Electron
  document.body.classList.add('electron-app');
  
  // ✅ ESTILOS MEJORADOS PARA ELECTRON
  const style = document.createElement('style');
  style.textContent = `
    .electron-app {
      user-select: none;
      -webkit-app-region: no-drag;
    }
    
    .electron-app input,
    .electron-app textarea,
    .electron-app [contenteditable],
    .electron-app select,
    .electron-app button {
      user-select: text;
      -webkit-app-region: no-drag;
    }
    
    /* Scrollbars personalizados para Electron */
    .electron-app ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    .electron-app ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    .electron-app ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    .electron-app ::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }
    
    /* Indicador de versión desktop */
    .electron-indicator {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: opacity 0.3s ease;
    }
    
    .electron-indicator.hidden {
      opacity: 0;
    }
    
    /* Mejoras específicas para formularios */
    .electron-app .form-control,
    .electron-app .btn {
      user-select: text;
    }
    
    /* Prevenir arrastre accidental de imágenes */
    .electron-app img {
      -webkit-user-drag: none;
      user-drag: none;
    }
  `;
  document.head.appendChild(style);
  
  // ✅ INDICADOR VISUAL MEJORADO
  const indicator = document.createElement('div');
  indicator.className = 'electron-indicator';
  indicator.innerHTML = '🖥️ Versión Desktop';
  document.body.appendChild(indicator);
  
  // Ocultar indicador gradualmente
  setTimeout(() => {
    indicator.classList.add('hidden');
    setTimeout(() => {
      indicator.remove();
    }, 300);
  }, 4000);
  
  // ✅ AGREGAR INFORMACIÓN DE DEBUG EN CONSOLA
  console.log('📊 Información del entorno:');
  console.log('- Plataforma:', process.platform);
  console.log('- Electron:', process.versions.electron);
  console.log('- Node.js:', process.versions.node);
  console.log('- Chrome:', process.versions.chrome);
});

// ✅ MANEJO MEJORADO DE ATAJOS DE TECLADO
window.addEventListener('keydown', (event) => {
  // Permitir atajos estándar de Electron pero prevenir otros problemáticos
  if (event.ctrlKey || event.metaKey) {
    switch (event.key.toLowerCase()) {
      case 'r':
        // Permitir recargar (ya manejado por el menú)
        break;
      case 'f5':
        // Permitir F5 para recargar
        break;
      case 'i':
        // Permitir DevTools (Ctrl+Shift+I)
        if (event.shiftKey) {
          break;
        }
        // Fallthrough para otros casos de Ctrl+I
      case 'w':
      case 't':
      case 'n':
        // Prevenir atajos de navegador que no aplican en Electron
        if (!event.shiftKey) {
          event.preventDefault();
        }
        break;
    }
  }
  
  // Prevenir F11 accidental (pantalla completa)
  if (event.key === 'F11') {
    event.preventDefault();
  }
});

// ✅ MEJORAR MANEJO DE FORMULARIOS
window.addEventListener('DOMContentLoaded', () => {
  // Agregar manejo automático de Enter en formularios
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
      const form = event.target.closest('form');
      if (form) {
        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn && !submitBtn.disabled) {
          event.preventDefault();
          submitBtn.click();
        }
      }
    }
  });
});

// ✅ API ESPECÍFICA PARA LA APLICACIÓN DE INVENTARIO
contextBridge.exposeInMainWorld('inventarioAPI', {
  // Confirmación para acciones críticas
  confirmCriticalAction: async (action, details = '') => {
    try {
      const message = `¿Estás seguro de que deseas ${action}?${details ? '\n\n' + details : ''}`;
      const result = await ipcRenderer.invoke('show-message-box', {
        type: 'warning',
        buttons: ['Cancelar', 'Confirmar'],
        defaultId: 0,
        title: 'Confirmar acción',
        message: message,
        detail: 'Esta acción no se puede deshacer.'
      });
      return result.response === 1;
    } catch (error) {
      console.error('Error en confirmación crítica:', error);
      return false;
    }
  },
  
  // Mostrar notificación nativa
  showNotification: (title, body, options = {}) => {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, ...options });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, ...options });
          }
        });
      }
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  },
  
  // Información de la aplicación
  getAppInfo: async () => {
    try {
      const version = await ipcRenderer.invoke('get-app-version');
      return {
        version,
        platform: process.platform,
        isElectron: true,
        electronVersion: process.versions.electron
      };
    } catch (error) {
      console.error('Error obteniendo info de la app:', error);
      return {
        version: 'unknown',
        platform: process.platform,
        isElectron: true,
        electronVersion: process.versions.electron
      };
    }
  }
});

// ✅ MANEJO DE ERRORES GLOBAL
window.addEventListener('error', (event) => {
  console.error('💥 Error global en Electron:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Promise rechazada en Electron:', event.reason);
});

console.log('✅ Preload script cargado correctamente para Sistema de Inventario');