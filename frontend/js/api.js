// Funciones para interactuar con la API

// Detectar si estamos en desarrollo o producción
const API_BASE_URL = (() => {
    // En desarrollo local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Para Render y otros deployments - siempre usar el mismo origen
    return window.location.origin;
})();

console.log('🔗 API Base URL (api.js):', API_BASE_URL);

// Función genérica para hacer peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    // Solo agregar Authorization si hay token
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        console.log('🔄 API Request:', endpoint, config.method || 'GET');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...config,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 API Response:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📄 API Data received:', endpoint, 'items:', Array.isArray(data) ? data.length : 'object');
        return data;
        
    } catch (error) {
        console.error('💥 API Error:', endpoint, error);
        
        if (error.name === 'AbortError') {
            throw new Error('Timeout: El servidor no responde');
        }
        
        // Si es error 401, redirigir al login
        if (error.message.includes('401')) {
            console.log('🔑 Token expirado, redirigiendo al login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
            return;
        }
        
        throw error;
    }
}

// ===== PRODUCTOS =====
async function getProducts() {
    return await apiRequest('/api/products');
}

async function getProduct(id) {
    return await apiRequest(`/api/products/${id}`);
}

async function createProduct(productData) {
    return await apiRequest('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData)
    });
}

async function updateProduct(id, productData) {
    return await apiRequest(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
    });
}

async function deleteProduct(id) {
    return await apiRequest(`/api/products/${id}`, {
        method: 'DELETE'
    });
}

// ===== EMPLEADOS =====
async function getEmployees() {
    return await apiRequest('/api/employees');
}

async function createEmployee(employeeData) {
    return await apiRequest('/api/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData)
    });
}

// ===== PEDIDOS =====
async function getOrders() {
    return await apiRequest('/api/orders');
}

async function createOrder(orderData) {
    return await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
}

async function confirmOrder(orderId, paymentInfo) {
    return await apiRequest(`/api/orders/${orderId}/confirm`, {
        method: 'PUT',
        body: JSON.stringify({ payment_info: paymentInfo })
    });
}

// ===== VENTAS =====
async function getSales() {
    return await apiRequest('/api/sales');
}

// ===== REPORTES =====
async function getSalesByEmployee() {
    return await apiRequest('/api/reports/sales-by-employee');
}

async function getInventoryReport() {
    return await apiRequest('/api/reports/inventory');
}

// ===== STATUS API =====
async function checkApiStatus() {
    return await apiRequest('/api/status');
}

// ===== UTILIDADES =====

// Función para formatear moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

// Función para formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para obtener ubicación
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocalización no soportada'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
}

// Función para manejar subida de fotos
function handlePhotoUpload(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function() {
            reject(new Error('Error al leer el archivo'));
        };
        reader.readAsDataURL(file);
    });
}

// Función para mostrar notificaciones mejorada
function showNotification(message, type = 'success') {
    console.log(`📢 Notification [${type}]:`, message);
    
    // Remover notificaciones existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos inline para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    // Color según el tipo
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#059669';
            break;
        case 'error':
            notification.style.backgroundColor = '#dc2626';
            break;
        case 'warning':
            notification.style.backgroundColor = '#d97706';
            break;
        default:
            notification.style.backgroundColor = '#2563eb';
    }
    
    document.body.appendChild(notification);
    
    // Remover después de 5 segundos (más tiempo para errores)
    const timeout = type === 'error' ? 8000 : 4000;
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, timeout);
}

// CSS para animaciones de notificación
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);

// Verificar estado de la API al cargar
document.addEventListener('DOMContentLoaded', async function() {
    // Solo verificar la API si estamos en páginas que la necesitan
    if (window.location.pathname.includes('admin/') || 
        window.location.pathname.includes('employee/') ||
        window.location.pathname === '/') {
        
        try {
            console.log('🔍 Verificando estado de la API...');
            await checkApiStatus();
            console.log('✅ API conectada correctamente');
            showNotification('Conexión establecida con el servidor', 'success');
        } catch (error) {
            console.error('❌ Error conectando con la API:', error);
            showNotification(`Error de conexión: ${error.message}`, 'error');
        }
    }
});