// Configuración centralizada de la aplicación

// Detectar API Base URL correctamente - SOLO se declara aquí
if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = (() => {
    // En desarrollo local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // Para Render y otros deployments - usar el mismo origen
    return window.location.origin;
  })();
}

console.log('🔗 API Base URL configurada:', window.API_BASE_URL);

// Otras configuraciones globales
window.APP_CONFIG = {
  API_BASE_URL: window.API_BASE_URL,
  API_TIMEOUT: 15000,
  JWT_STORAGE_KEY: 'token',
  USER_STORAGE_KEY: 'user'
};