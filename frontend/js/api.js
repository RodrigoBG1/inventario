// Funciones para interactuar con la API - VERSIÓN CORREGIDA SIN DUPLICACIONES

console.log('🔗 API Base URL (api.js):', window.API_BASE_URL);

// Función para obtener el token
function getToken() {
    return localStorage.getItem('token');
}

// Función para obtener datos del usuario
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

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
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${window.API_BASE_URL}${endpoint}`, {
            ...config,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 API Response:', response.status, response.statusText);
        
        // Obtener el texto de la respuesta primero
        const responseText = await response.text();
        console.log('📄 Response text:', responseText);
        
        // Intentar parsear como JSON
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Error parsing JSON:', parseError);
            console.error('📄 Raw response:', responseText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Si la respuesta es exitosa pero no es JSON válido
            data = { success: true, raw_response: responseText };
        }
        
        if (!response.ok) {
            const errorMessage = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
            console.error('❌ API Error Response:', data);
            throw new Error(errorMessage);
        }
        
        console.log('📄 API Data received:', endpoint, 'type:', typeof data);
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
    console.log('📦 Obteniendo productos (con soporte para subalmacén)...');
    
    try {
        const user = getUser();
        const response = await apiRequest('/api/products');
        
        // Si es empleado, la respuesta puede incluir información del subalmacén
        if (user?.role === 'employee' && response.substore_info) {
            console.log('👤 Empleado - productos del subalmacén:', response.products?.length || 0);
            console.log('🚛 Info del viaje:', response.substore_info.trip?.trip_number);
            return response;
        }
        
        // Si es admin o respuesta estándar, devolver productos normalmente
        console.log('👑 Admin - productos del almacén principal:', Array.isArray(response) ? response.length : 'formato no estándar');
        return Array.isArray(response) ? response : response.products || [];
        
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        throw error;
    }
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

// Obtener viajes (trips)
async function getTrips(status = null, employeeId = null) {
    console.log('🚛 Obteniendo viajes:', { status, employeeId });
    
    try {
        let url = '/api/trips';
        const params = new URLSearchParams();
        
        if (status) params.append('status', status);
        if (employeeId) params.append('employee_id', employeeId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await apiRequest(url);
        console.log('✅ Viajes obtenidos:', response?.length || 0);
        return response;
        
    } catch (error) {
        console.error('❌ Error obteniendo viajes:', error);
        throw error;
    }
}

async function createTrip(tripData) {
    console.log('🚛 Creando viaje:', tripData);
    
    try {
        const response = await apiRequest('/api/trips', {
            method: 'POST',
            body: JSON.stringify(tripData)
        });
        
        console.log('✅ Viaje creado:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Error creando viaje:', error);
        throw error;
    }
}

// Finalizar viaje
async function completeTrip(tripId, returnProducts = []) {
    console.log('🏁 Finalizando viaje:', { tripId, returnProducts });
    
    try {
        const response = await apiRequest(`/api/trips/${tripId}/complete`, {
            method: 'PUT',
            body: JSON.stringify({ return_products: returnProducts })
        });
        
        console.log('✅ Viaje finalizado:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Error finalizando viaje:', error);
        throw error;
    }
}

// Obtener inventario de subalmacén por viaje
async function getTripInventory(tripId) {
    console.log('📦 Obteniendo inventario del viaje:', tripId);
    
    try {
        const response = await apiRequest(`/api/trips/${tripId}/inventory`);
        console.log('✅ Inventario del viaje obtenido:', response?.length || 0);
        return response;
        
    } catch (error) {
        console.error('❌ Error obteniendo inventario del viaje:', error);
        throw error;
    }
}

// ===== FUNCIONES DE REPORTES PARA SUBALMACENES =====

// Resumen de viajes activos
async function getActiveTripsReport() {
    console.log('📊 Obteniendo reporte de viajes activos...');
    
    try {
        const response = await apiRequest('/api/reports/active-trips');
        console.log('✅ Reporte de viajes activos obtenido:', response?.length || 0);
        return response;
        
    } catch (error) {
        console.error('❌ Error obteniendo reporte de viajes activos:', error);
        throw error;
    }
}

// Reporte detallado de inventario por viajes
async function getTripInventoryReport() {
    console.log('📊 Obteniendo reporte de inventario por viajes...');
    
    try {
        const response = await apiRequest('/api/reports/trip-inventory');
        console.log('✅ Reporte de inventario por viajes obtenido:', response?.length || 0);
        return response;
        
    } catch (error) {
        console.error('❌ Error obteniendo reporte de inventario por viajes:', error);
        throw error;
    }
}

// ===== FUNCIONES DE DEBUGGING =====

// Debug de trips
async function debugTrips() {
    console.log('🔍 Debug de trips...');
    
    try {
        const response = await apiRequest('/api/trips-debug');
        console.log('✅ Debug de trips:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Error en debug de trips:', error);
        throw error;
    }
}

// Test de conectividad para subalmacenes
async function testSubstoreConnectivity() {
    console.log('🌐 Testeando conectividad de subalmacenes...');
    
    try {
        // Test endpoint de trips
        const tripsTest = await fetch(`${window.API_BASE_URL}/api/trips`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        console.log('🚛 Test trips endpoint:', tripsTest.status);
        
        // Test endpoint de estado de subalmacén
        const substoreTest = await fetch(`${window.API_BASE_URL}/api/employee/substore-status`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        console.log('📦 Test substore endpoint:', substoreTest.status);
        
        return {
            trips_available: tripsTest.status !== 404,
            substore_available: substoreTest.status !== 404,
            trips_status: tripsTest.status,
            substore_status: substoreTest.status
        };
        
    } catch (error) {
        console.error('❌ Error testeando conectividad:', error);
        return {
            trips_available: false,
            substore_available: false,
            error: error.message
        };
    }
}

function showNoSubstoreNotification() {
    showNotification(
        'No tienes un subalmacén activo. Contacta al administrador para que te asigne productos.',
        'warning'
    );
}

// Mostrar notificación de éxito para pedidos desde subalmacén
function showSubstoreOrderSuccess(orderNumber, tripNumber) {
    showNotification(
        `Pedido ${orderNumber} creado desde subalmacén ${tripNumber}`,
        'success'
    );
}

// Mostrar notificación de stock insuficiente en subalmacén
function showSubstoreStockWarning(productName, available, requested) {
    showNotification(
        `Stock insuficiente en subalmacén para ${productName}. Disponible: ${available}, solicitado: ${requested}`,
        'warning'
    );
}

// ===== HACER FUNCIONES GLOBALES =====

// Nuevas funciones para subalmacén
if (!window.getEmployeeSubstoreStatus) {
    window.getEmployeeSubstoreStatus = getEmployeeSubstoreStatus;
    window.getEmployeeSubstoreProducts = getEmployeeSubstoreProducts;
    window.getEmployeeSubstoreSales = getEmployeeSubstoreSales;
    window.confirmOrderFromSubstore = confirmOrderFromSubstore;
    
    // Funciones de trips
    window.getTrips = getTrips;
    window.createTrip = createTrip;
    window.completeTrip = completeTrip;
    window.getTripInventory = getTripInventory;
    
    // Reportes
    window.getActiveTripsReport = getActiveTripsReport;
    window.getTripInventoryReport = getTripInventoryReport;
    
    // Debug y testing
    window.debugTrips = debugTrips;
    window.testSubstoreConnectivity = testSubstoreConnectivity;
    
    // Notificaciones específicas
    window.showNoSubstoreNotification = showNoSubstoreNotification;
    window.showSubstoreOrderSuccess = showSubstoreOrderSuccess;
    window.showSubstoreStockWarning = showSubstoreStockWarning;
}

// ===== VERIFICACIÓN DE SUBALMACÉN AL CARGAR =====
document.addEventListener('DOMContentLoaded', async function() {
    // Solo verificar si estamos en páginas de empleado
    if (window.location.pathname.includes('/employee/')) {
        try {
            const user = getUser();
            if (user && user.role === 'employee') {
                console.log('👤 Usuario empleado detectado, verificando conectividad de subalmacén...');
                
                const connectivity = await testSubstoreConnectivity();
                console.log('🌐 Conectividad de subalmacén:', connectivity);
                
                if (!connectivity.trips_available || !connectivity.substore_available) {
                    console.warn('⚠️ Algunos endpoints de subalmacén no están disponibles');
                    if (window.location.pathname.includes('orders.html')) {
                        showNotification(
                            'Algunos servicios de subalmacén no están disponibles. Contacta al administrador.',
                            'warning'
                        );
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error verificando subalmacén:', error);
        }
    }
});

console.log('✅ API de subalmacén configurada correctamente');

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
    console.log('📤 createOrder llamado con:', orderData);
    
    try {
        const response = await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        console.log('✅ createOrder respuesta exitosa:', response);
        return response;
        
    } catch (error) {
        console.error('❌ createOrder error:', error);
        throw error;
    }
}


// Función para obtener estado del subalmacén del empleado
async function getEmployeeSubstoreStatus() {
    console.log('🔍 Obteniendo estado del subalmacén del empleado...');
    
    try {
        const response = await apiRequest('/api/employee/substore-status');
        console.log('✅ Estado del subalmacén obtenido:', response);
        return response;
    } catch (error) {
        console.error('❌ Error obteniendo estado del subalmacén:', error);
        throw error;
    }
}

// Función para obtener productos del subalmacén del empleado
async function getEmployeeSubstoreProducts() {
    console.log('📦 Obteniendo productos del subalmacén...');
    
    try {
        const response = await apiRequest('/api/substore/products');
        console.log('✅ Productos del subalmacén obtenidos:', response);
        return response;
    } catch (error) {
        console.error('❌ Error obteniendo productos del subalmacén:', error);
        throw error;
    }
}

// Función para obtener ventas del subalmacén del empleado
async function getEmployeeSubstoreSales() {
    console.log('💰 Obteniendo ventas del subalmacén...');
    
    try {
        const response = await apiRequest('/api/employee/substore-sales');
        console.log('✅ Ventas del subalmacén obtenidas:', response);
        return response;
    } catch (error) {
        console.error('❌ Error obteniendo ventas del subalmacén:', error);
        throw error;
    }
}

// ===== FUNCIONES DE CONFIRMACIÓN CORREGIDAS =====

// Confirm Order - CORREGIDO
async function confirmOrder(orderId, paymentInfo) {
    console.log('🔄 confirmOrder() llamado con:', { orderId, paymentInfo });
    
    // Validar parámetros
    if (!orderId) {
        throw new Error('ID de pedido requerido');
    }
    
    if (!paymentInfo || !paymentInfo.method) {
        throw new Error('Información de pago requerida');
    }
    
    // Construir la URL del endpoint
    const endpoint = `/api/orders/${orderId}/confirm`;
    console.log('📤 Enviando confirmación a:', endpoint);
    
    try {
        const result = await apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({ payment_info: paymentInfo })
        });
        
        console.log('✅ Pedido confirmado exitosamente:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error en confirmOrder:', error);
        
        // Agregar información de debugging específica
        if (error.message.includes('404')) {
            console.error('🔍 Debugging info:');
            console.error('- Endpoint intentado:', `${window.API_BASE_URL}${endpoint}`);
            console.error('- Order ID:', orderId);
            console.error('- Token exists:', !!getToken());
            console.error('- User:', getUser());
            
            throw new Error(`Endpoint no encontrado: ${endpoint}. Verifica que el servidor esté ejecutándose y que la ruta exista.`);
        }
        
        throw error;
    }
}

async function confirmOrderFromSubstore(orderId, tripId, paymentInfo) {
    console.log('🔄 Confirmando pedido desde subalmacén:', { orderId, tripId, paymentInfo });
    
    try {
        const response = await apiRequest(`/api/orders/${orderId}/confirm-substore`, {
            method: 'PUT',
            body: JSON.stringify({ 
                trip_id: tripId, 
                payment_info: paymentInfo 
            })
        });
        
        console.log('✅ Pedido confirmado desde subalmacén:', response);
        return response;
        
    } catch (error) {
        console.error('❌ Error confirmando pedido desde subalmacén:', error);
        throw error;
    }
}


// Cancel Order - CORREGIDO
async function cancelOrder(orderId, reason) {
    console.log('🔄 cancelOrder() llamado con:', { orderId, reason });
    
    // Validar parámetros
    if (!orderId) {
        throw new Error('ID de pedido requerido');
    }
    
    // Construir la URL del endpoint
    const endpoint = `/api/orders/${orderId}/cancel`;
    console.log('📤 Enviando cancelación a:', endpoint);
    
    try {
        const result = await apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({ reason: reason || 'Cancelado por administrador' })
        });
        
        console.log('✅ Pedido cancelado exitosamente:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error en cancelOrder:', error);
        
        // Agregar información de debugging específica
        if (error.message.includes('404')) {
            console.error('🔍 Debugging info:');
            console.error('- Endpoint intentado:', `${window.API_BASE_URL}${endpoint}`);
            console.error('- Order ID:', orderId);
            console.error('- Token exists:', !!getToken());
            
            throw new Error(`Endpoint no encontrado: ${endpoint}. Verifica que el servidor esté ejecutándose y que la ruta exista.`);
        }
        
        throw error;
    }
}

// Get Order Details
async function getOrderDetails(orderId) {
    if (!orderId) {
        throw new Error('ID de pedido requerido');
    }
    
    return await apiRequest(`/api/orders/${orderId}`);
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

// ===== FUNCIÓN DE DEBUGGING PARA ENDPOINTS =====
async function debugApiEndpoints() {
    console.log('🔍 Iniciando debug de endpoints de la API...');
    
    const endpoints = [
        { method: 'GET', path: '/test', description: 'Test básico' },
        { method: 'GET', path: '/api/status', description: 'Estado de la API' },
        { method: 'GET', path: '/api/products', description: 'Obtener productos' },
        { method: 'GET', path: '/api/orders', description: 'Obtener pedidos' },
        { method: 'PUT', path: '/api/orders/1/confirm', description: 'Confirmar pedido (test)' },
        { method: 'PUT', path: '/api/orders/1/cancel', description: 'Cancelar pedido (test)' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🔄 Probando ${endpoint.method} ${endpoint.path}...`);
            
            if (endpoint.method === 'GET') {
                await fetch(`${window.API_BASE_URL}${endpoint.path}`, {
                    method: 'HEAD', // Solo verificar si existe
                    headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}
                });
                console.log(`✅ ${endpoint.description}: Disponible`);
            } else {
                // Para métodos PUT/POST, solo verificar que no devuelva 404 método no permitido
                const response = await fetch(`${window.API_BASE_URL}${endpoint.path}`, {
                    method: 'OPTIONS',
                    headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}
                });
                
                if (response.status !== 404) {
                    console.log(`✅ ${endpoint.description}: Endpoint existe`);
                } else {
                    console.log(`❌ ${endpoint.description}: No encontrado (404)`);
                }
            }
            
        } catch (error) {
            console.log(`❌ ${endpoint.description}: Error - ${error.message}`);
        }
    }
    
    console.log('🔍 Debug de endpoints completado');
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

// Función para mostrar notificaciones - VERSIÓN CORREGIDA
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
    
    // Remover después de 5 segundos
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

// CSS para animaciones de notificación - SOLO SI NO EXISTE
if (!document.getElementById('notification-styles')) {
    const notificationStylesElement = document.createElement('style');
    notificationStylesElement.id = 'notification-styles';
    notificationStylesElement.textContent = `
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
    document.head.appendChild(notificationStylesElement);
}

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
            
            // Debug adicional para administradores
            if (window.location.pathname.includes('admin/orders.html')) {
                console.log('🔧 Ejecutando debug adicional para página de órdenes...');
                setTimeout(debugApiEndpoints, 2000);
            }
            
        } catch (error) {
            console.error('❌ Error conectando con la API:', error);
            showNotification(`Error de conexión: ${error.message}`, 'error');
        }
    }
});
async function createEmployeeAPI(employeeData) {
    console.log('📤 Creando empleado:', employeeData);
    
    return await apiRequest('/api/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData)
    });
}

async function updateEmployeeAPI(id, employeeData) {
    console.log('📤 Actualizando empleado:', id, employeeData);
    
    return await apiRequest(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(employeeData)
    });
}

// Hacer las funciones globales
if (!window.createEmployeeAPI) {
    window.createEmployeeAPI = createEmployeeAPI;
    window.updateEmployeeAPI = updateEmployeeAPI;
}

// Hacer las funciones globales para que estén disponibles en admin.js - SOLO SI NO EXISTEN
if (!window.getProducts) {
    window.getProducts = getProducts;
    window.getEmployees = getEmployees;
    window.getOrders = getOrders;
    window.getSales = getSales;
    window.createProduct = createProduct;
    window.updateProduct = updateProduct;
    window.deleteProduct = deleteProduct;
    window.createOrder = createOrder;
    window.confirmOrder = confirmOrder;
    window.cancelOrder = cancelOrder;
    window.getOrderDetails = getOrderDetails;
    window.getSalesByEmployee = getSalesByEmployee;
    window.getInventoryReport = getInventoryReport;
    window.formatCurrency = formatCurrency;
    window.formatDate = formatDate;
    window.showNotification = showNotification;
    window.debugApiEndpoints = debugApiEndpoints;
}