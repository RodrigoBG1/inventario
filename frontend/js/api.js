// Funciones para interactuar con la API

// Detectar si estamos en desarrollo o producción
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

// Función genérica para hacer peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error en la petición');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
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

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
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
    
    // Remover después de 3 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// CSS para animación de notificación
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
`;
document.head.appendChild(notificationStyles);

// Verificar estado de la API al cargar
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await checkApiStatus();
        console.log('API conectada correctamente');
    } catch (error) {
        console.error('Error conectando con la API:', error);
        showNotification('Error de conexión con el servidor', 'error');
    }
});