// Funciones específicas para el panel de administrador - VERSIÓN COMPLETA CORREGIDA

console.log('🔧 admin.js cargado correctamente');

// Variables globales
let products = [];
let employees = [];
let orders = [];
let sales = [];
let currentEditingProduct = null;

// Función para verificar autenticación (para cualquier usuario)
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        console.log('❌ No hay token o usuario, redirigiendo al login');
        window.location.href = '/';
        return null;
    }
    
    try {
        return JSON.parse(user);
    } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return null;
    }
}

// Función para verificar si el usuario es admin (SOLO para páginas de admin)
function requireAdmin() {
    const user = checkAuth();
    if (!user) return false;
    
    if (user.role !== 'admin') {
        alert('Acceso denegado. Se requieren permisos de administrador.');
        window.location.href = '/';
        return false;
    }
    return true;
}

// Función para verificar si el usuario puede acceder (admin O empleado)
function requireAuth() {
    const user = checkAuth();
    if (!user) return false;
    
    // Permitir acceso a tanto admin como empleado
    if (user.role !== 'admin' && user.role !== 'employee') {
        alert('Acceso denegado. Sesión inválida.');
        window.location.href = '/';
        return false;
    }
    return true;
}

// ===== FUNCIONES DE CONFIRMACIÓN DE PEDIDOS (CORREGIDAS) =====

// Función corregida para confirmar pedido
async function confirmOrderModal(orderId) {
    console.log('🔄 Iniciando confirmación de pedido:', orderId);
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        console.error('❌ Pedido no encontrado:', orderId);
        if (window.showNotification) {
            window.showNotification('Pedido no encontrado', 'error');
        }
        return;
    }
    
    // ✅ CORRECCIÓN: Declarar paymentMethod ANTES de usarlo
    let paymentMethod;
    
    try {
        // Mostrar modal de confirmación personalizado
        paymentMethod = prompt(`¿Confirmar el pedido ${order.order_number}?\n\nIngresa el método de pago:\n- efectivo\n- tarjeta\n- transferencia`, 'efectivo');
        
        if (!paymentMethod) {
            console.log('❌ Confirmación cancelada por el usuario');
            return;
        }
        
        // ✅ CORRECCIÓN: Crear paymentInfo DESPUÉS de obtener paymentMethod
        const paymentInfo = {
            method: paymentMethod.toLowerCase().trim(),
            amount: order.total,
            confirmed_at: new Date().toISOString(),
            confirmed_by: 'admin'
        };
        
        console.log('📤 Enviando confirmación de pedido con datos:', paymentInfo);
        
        // Verificar que la función confirmOrder existe
        if (typeof window.confirmOrder !== 'function') {
            console.error('❌ Función confirmOrder no está disponible');
            if (window.showNotification) {
                window.showNotification('Error: Función de confirmación no disponible', 'error');
            }
            return;
        }
        
        const result = await window.confirmOrder(orderId, paymentInfo);
        
        console.log('✅ Pedido confirmado exitosamente:', result);
        
        if (window.showNotification) {
            window.showNotification('Pedido confirmado exitosamente', 'success');
        }
        
        // Mostrar mensaje de éxito detallado
        alert(`✅ PEDIDO CONFIRMADO EXITOSAMENTE

📋 Número: ${order.order_number}
👤 Cliente: ${order.client_info?.name || 'Sin cliente'}
💰 Total: $${order.total}
💳 Método de pago: ${paymentMethod}
📅 Confirmado: ${new Date().toLocaleString()}

El pedido ha sido procesado correctamente.`);
        
        // Recargar la página de pedidos
        await loadOrdersPage();
        
    } catch (error) {
        console.error('❌ Error confirmando pedido:', error);
        
        let errorMessage = 'Error al confirmar pedido';
        
        // Mensajes de error más específicos
        if (error.message.includes('404')) {
            errorMessage = `Endpoint no encontrado. 

🔧 POSIBLES SOLUCIONES:
1. Verificar que el servidor esté funcionando
2. Comprobar que la ruta existe en el servidor
3. Reiniciar el servidor
4. Verificar la configuración de rutas

URL intentada: ${window.API_BASE_URL}/api/orders/${orderId}/confirm`;
        } else if (error.message.includes('401')) {
            errorMessage = 'No autorizado. Tu sesión puede haber expirado. Intenta hacer login nuevamente.';
        } else if (error.message.includes('403')) {
            errorMessage = 'Sin permisos de administrador para esta acción.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Error interno del servidor. Contacta al administrador del sistema.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        if (window.showNotification) {
            window.showNotification(errorMessage, 'error');
        }
        
        // Mostrar información adicional para debugging
        console.log('🔍 Información de debugging:');
        console.log('- Order ID:', orderId);
        console.log('- API Base URL:', window.API_BASE_URL);
        console.log('- User token exists:', !!localStorage.getItem('token'));
        console.log('- User:', getUser());
        console.log('- Payment info was:', paymentInfo || 'undefined');
        
        // Mostrar error al usuario con opción de debug
        const showDebugInfo = confirm(`❌ Error al confirmar el pedido:

${errorMessage}

¿Quieres ver información de debugging para reportar el problema?`);
        
        if (showDebugInfo) {
            const debugInfo = `
INFORMACIÓN DE DEBUG:
====================
- Fecha: ${new Date().toISOString()}
- Usuario: ${getUser()?.name} (${getUser()?.role})
- Order ID: ${orderId}
- API URL: ${window.API_BASE_URL}
- Error: ${error.message}
- Token: ${localStorage.getItem('token') ? 'Presente' : 'Ausente'}

Copia esta información para reportar el problema.`;
            
            alert(debugInfo);
        }
    }
}

// Función corregida para cancelar pedido
async function cancelOrderModal(orderId) {
    console.log('🚫 Iniciando cancelación de pedido:', orderId);
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        console.error('❌ Pedido no encontrado:', orderId);
        if (window.showNotification) {
            window.showNotification('Pedido no encontrado', 'error');
        }
        return;
    }
    
    const reason = prompt(`¿Cancelar el pedido ${order.order_number}?\n\nIngresa el motivo de cancelación:`, 'Cancelado por administrador');
    
    if (!reason) {
        console.log('❌ Cancelación cancelada por el usuario');
        return;
    }
    
    try {
        console.log('📤 Enviando cancelación de pedido...');
        
        if (typeof window.cancelOrder !== 'function') {
            console.error('❌ Función cancelOrder no está disponible');
            if (window.showNotification) {
                window.showNotification('Error: Función de cancelación no disponible', 'error');
            }
            return;
        }
        
        const result = await window.cancelOrder(orderId, reason);
        
        console.log('✅ Pedido cancelado exitosamente:', result);
        
        if (window.showNotification) {
            window.showNotification('Pedido cancelado exitosamente', 'success');
        }
        
        // Mostrar confirmación
        alert(`🚫 PEDIDO CANCELADO

📋 Número: ${order.order_number}
📝 Motivo: ${reason}
📅 Cancelado: ${new Date().toLocaleString()}

El pedido ha sido cancelado correctamente.`);
        
        // Recargar la página de pedidos
        await loadOrdersPage();
        
    } catch (error) {
        console.error('❌ Error cancelando pedido:', error);
        
        if (window.showNotification) {
            window.showNotification('Error al cancelar pedido: ' + error.message, 'error');
        }
        
        alert(`❌ Error al cancelar el pedido:

${error.message}

Verifica tu conexión e intenta nuevamente.`);
    }
}

// Función para debugging - crear pedido de prueba
async function createTestOrder() {
    if (!confirm('¿Crear un pedido de prueba para testing?')) {
        return;
    }
    
    try {
        const testOrderData = {
            client_info: {
                name: 'Cliente de Prueba',
                phone: '123456789',
                address: 'Dirección de prueba',
                email: 'test@test.com'
            },
            products: [
                {
                    product_id: 1,
                    name: 'Aceite de Prueba',
                    code: 'TEST001',
                    price: 25.99,
                    quantity: 1
                }
            ],
            total: 25.99,
            notes: 'Pedido creado para pruebas de confirmación'
        };
        
        const result = await window.createOrder(testOrderData);
        
        console.log('✅ Pedido de prueba creado:', result);
        
        if (window.showNotification) {
            window.showNotification(`Pedido de prueba creado: ${result.order_number}`, 'success');
        }
        
        alert(`✅ PEDIDO DE PRUEBA CREADO

📋 Número: ${result.order_number}
🆔 ID: ${result.id}
💰 Total: $${result.total}

Ahora puedes probar la confirmación con este pedido.`);
        
        // Recargar pedidos para mostrar el nuevo
        await loadOrdersPage();
        
    } catch (error) {
        console.error('❌ Error creando pedido de prueba:', error);
        
        if (window.showNotification) {
            window.showNotification('Error creando pedido de prueba: ' + error.message, 'error');
        }
    }
}

// Función para debugging del servidor
async function debugServer() {
    try {
        console.log('🔍 Iniciando debug del servidor...');
        
        // 1. Test básico
        const testResponse = await fetch(`${window.API_BASE_URL}/test`);
        console.log('📡 Test endpoint:', testResponse.status);
        
        // 2. Test de rutas
        const routesResponse = await fetch(`${window.API_BASE_URL}/api/routes-debug`);
        const routesData = await routesResponse.json();
        console.log('📋 Rutas disponibles:', routesData);
        
        // 3. Test con autenticación
        const token = localStorage.getItem('token');
        if (token) {
            const ordersResponse = await fetch(`${window.API_BASE_URL}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('📦 Orders endpoint:', ordersResponse.status);
            
            // 4. Test de debug de orden específica
            const debugResponse = await fetch(`${window.API_BASE_URL}/api/orders/1/debug`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('🔍 Debug endpoint:', debugResponse.status);
            
            if (debugResponse.ok) {
                const debugData = await debugResponse.json();
                console.log('🔍 Debug data:', debugData);
            }
        }
        
        alert('✅ Debug completado. Revisa la consola para ver los resultados.');
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
        alert('❌ Error en debug: ' + error.message);
    }
}

// ===== RESTO DEL CÓDIGO SIN CAMBIOS =====

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM cargado, iniciando panel...');
    
    const currentPage = window.location.pathname;
    console.log('📄 Página actual:', currentPage);
    
    // Verificar autenticación según la página
    if (currentPage.includes('/admin/')) {
        // Páginas de admin requieren rol de administrador
        if (!requireAdmin()) return;
    } else if (currentPage.includes('/employee/')) {
        // Páginas de empleado solo requieren estar autenticado
        if (!requireAuth()) return;
    }
    
    // Cargar datos según la página
    if (currentPage.includes('dashboard.html')) {
        if (currentPage.includes('/admin/')) {
            console.log('📊 Cargando dashboard admin...');
            setTimeout(loadDashboardData, 1000);
        } else {
            console.log('📊 Cargando dashboard empleado...');
            setTimeout(loadEmployeeDashboard, 1000);
        }
    } else if (currentPage.includes('products.html')) {
        setTimeout(loadProductsPage, 1000);
    } else if (currentPage.includes('employees.html')) {
        setTimeout(loadEmployeesPage, 1000);
    } else if (currentPage.includes('orders.html')) {
        if (currentPage.includes('/admin/')) {
            setTimeout(loadOrdersPage, 1000);
        } else {
            setTimeout(loadEmployeeOrdersPage, 1000);
        }
    } else if (currentPage.includes('reports.html')) {
        setTimeout(loadReportsPage, 1000);
    } else if (currentPage.includes('sales.html')) {
        setTimeout(loadSalesPage, 1000);
    }
});

// ===== DASHBOARD ADMIN =====
async function loadDashboardData() {
    console.log('📊 loadDashboardData() iniciando...');
    
    try {
        if (typeof window.getProducts !== 'function') {
            console.error('❌ getProducts no está disponible');
            if (window.showNotification) {
                window.showNotification('Error: Funciones de API no disponibles', 'error');
            }
            return;
        }
        
        console.log('📦 Obteniendo productos...');
        const productsData = await window.getProducts();
        console.log('📦 Productos obtenidos:', productsData?.length || 0);
        
        console.log('👥 Obteniendo empleados...');
        const employeesData = await window.getEmployees();
        console.log('👥 Empleados obtenidos:', employeesData?.length || 0);
        
        console.log('📋 Obteniendo pedidos...');
        const ordersData = await window.getOrders();
        console.log('📋 Pedidos obtenidos:', ordersData?.length || 0);
        
        console.log('💰 Obteniendo ventas...');
        const salesData = await window.getSales();
        console.log('💰 Ventas obtenidas:', salesData?.length || 0);
        
        // Guardar datos globalmente
        products = productsData || [];
        employees = employeesData || [];
        orders = ordersData || [];
        sales = salesData || [];
        
        // Actualizar estadísticas
        console.log('📊 Actualizando estadísticas...');
        updateDashboardStats();
        updateRecentOrders();
        updateLowStock();
        
        console.log('✅ Dashboard cargado exitosamente');
        if (window.showNotification) {
            window.showNotification('Dashboard cargado correctamente', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar el dashboard: ' + error.message, 'error');
        }
    }
}

// ===== DASHBOARD EMPLEADO =====
async function loadEmployeeDashboard() {
    console.log('📊 loadEmployeeDashboard() iniciando...');
    
    try {
        console.log('📋 Obteniendo mis pedidos...');
        const ordersData = await window.getOrders();
        console.log('📋 Mis pedidos obtenidos:', ordersData?.length || 0);
        
        console.log('💰 Obteniendo mis ventas...');
        const salesData = await window.getSales();
        console.log('💰 Mis ventas obtenidas:', salesData?.length || 0);
        
        // Guardar datos globalmente
        orders = ordersData || [];
        sales = salesData || [];
        
        // Actualizar estadísticas del empleado
        console.log('📊 Actualizando estadísticas del empleado...');
        updateEmployeeStats();
        updateRecentActivity();
        
        console.log('✅ Dashboard del empleado cargado exitosamente');
        if (window.showNotification) {
            window.showNotification('Dashboard cargado correctamente', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading employee dashboard:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar el dashboard: ' + error.message, 'error');
        }
    }
}

// ===== FUNCIONES DE EMPLEADO =====
function updateEmployeeStats() {
    // Pedidos de hoy
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === today
    ).length;
    
    const todayOrdersElement = document.getElementById('today-orders');
    if (todayOrdersElement) {
        todayOrdersElement.textContent = todayOrders;
    }
    
    // Ventas del mes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySales = sales
        .filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((total, sale) => total + sale.total, 0);
    
    const monthlySalesElement = document.getElementById('monthly-sales');
    if (monthlySalesElement) {
        monthlySalesElement.textContent = window.formatCurrency ? window.formatCurrency(monthlySales) : `$${monthlySales}`;
    }
    
    // Calcular comisiones
    const user = getUser();
    const commissionRate = user?.commission_rate || 0.05;
    const commissions = monthlySales * commissionRate;
    
    const commissionsElement = document.getElementById('commissions');
    if (commissionsElement) {
        commissionsElement.textContent = window.formatCurrency ? window.formatCurrency(commissions) : `$${commissions}`;
    }
}

function updateRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;
    
    // Combinar órdenes y ventas para mostrar actividad reciente
    const recentActivity = [
        ...orders.map(order => ({
            type: 'order',
            title: `Pedido ${order.order_number}`,
            subtitle: `${window.formatCurrency ? window.formatCurrency(order.total) : `$${order.total}`} - ${order.status}`,
            date: order.created_at,
            icon: '📝'
        })),
        ...sales.map(sale => ({
            type: 'sale',
            title: `Venta ${sale.sale_number || sale.id}`,
            subtitle: `${window.formatCurrency ? window.formatCurrency(sale.total) : `$${sale.total}`} - Confirmada`,
            date: sale.created_at,
            icon: '💰'
        }))
    ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
    
    container.innerHTML = recentActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-subtitle">${activity.subtitle}</div>
                <div class="activity-time">${window.formatDate ? window.formatDate(activity.date) : activity.date}</div>
            </div>
        </div>
    `).join('');
}

function loadEmployeeOrdersPage() {
    console.log('📋 Cargando página de pedidos del empleado...');
}

function loadSalesPage() {
    console.log('💰 Cargando página de ventas del empleado...');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// ===== RESTO DE FUNCIONES ADMIN =====
function updateDashboardStats() {
    console.log('📊 Actualizando estadísticas del dashboard...');
    
    const totalProductsElement = document.getElementById('total-products');
    if (totalProductsElement) {
        totalProductsElement.textContent = products.length;
        console.log('📦 Total productos:', products.length);
    }
    
    const pendingOrders = orders.filter(order => order.status === 'hold').length;
    const pendingOrdersElement = document.getElementById('pending-orders');
    if (pendingOrdersElement) {
        pendingOrdersElement.textContent = pendingOrders;
        console.log('📋 Pedidos pendientes:', pendingOrders);
    }
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySales = sales
        .filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((total, sale) => total + sale.total, 0);
    
    const monthlySalesElement = document.getElementById('monthly-sales');
    if (monthlySalesElement) {
        monthlySalesElement.textContent = window.formatCurrency ? window.formatCurrency(monthlySales) : `$${monthlySales}`;
        console.log('💰 Ventas del mes:', monthlySales);
    }
    
    const activeEmployees = employees.filter(emp => emp.role === 'employee').length;
    const activeEmployeesElement = document.getElementById('active-employees');
    if (activeEmployeesElement) {
        activeEmployeesElement.textContent = activeEmployees;
        console.log('👥 Empleados activos:', activeEmployees);
    }
}

function updateRecentOrders() {
    const tbody = document.querySelector('#recent-orders-table tbody');
    if (!tbody) return;
    
    console.log('📋 Actualizando pedidos recientes...');
    
    const recentOrders = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    tbody.innerHTML = recentOrders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.employee_code}</td>
            <td>${window.formatCurrency ? window.formatCurrency(order.total) : `$${order.total}`}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${window.formatDate ? window.formatDate(order.created_at) : order.created_at}</td>
        </tr>
    `).join('');
    
    console.log('📋 Pedidos recientes actualizados:', recentOrders.length);
}

function updateLowStock() {
    const tbody = document.querySelector('#low-stock-table tbody');
    if (!tbody) return;
    
    console.log('📦 Actualizando productos con stock bajo...');
    
    const lowStockProducts = products.filter(product => product.stock < 10);
    
    tbody.innerHTML = lowStockProducts.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td><span class="stock-warning">${product.stock}</span></td>
        </tr>
    `).join('');
    
    console.log('📦 Productos con stock bajo:', lowStockProducts.length);
}

// ===== PRODUCTOS =====
async function loadProductsPage() {
    console.log('📦 Cargando página de productos...');
    try {
        products = await window.getProducts();
        displayProducts();
        loadBrandFilter();
        console.log('✅ Página de productos cargada');
    } catch (error) {
        console.error('❌ Error loading products page:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar productos: ' + error.message, 'error');
        }
    }
}

function displayProducts() {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.brand}</td>
            <td>${product.viscosity}</td>
            <td>${product.capacity}</td>
            <td>${product.stock}</td>
            <td>${window.formatCurrency ? window.formatCurrency(product.price) : `$${product.price}`}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editProduct(${product.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteProductConfirm(${product.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadBrandFilter() {
    const select = document.getElementById('filter-brand');
    if (!select) return;
    
    const brands = [...new Set(products.map(p => p.brand))];
    
    select.innerHTML = '<option value="">Todas las marcas</option>' +
        brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
}

function filterProducts() {
    const searchTerm = document.getElementById('search-products').value.toLowerCase();
    const brandFilter = document.getElementById('filter-brand').value;
    
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            product.code.toLowerCase().includes(searchTerm);
        const matchesBrand = !brandFilter || product.brand === brandFilter;
        
        return matchesSearch && matchesBrand;
    });
    
    displayFilteredProducts(filteredProducts);
}

function displayFilteredProducts(filteredProducts) {
    const tbody = document.querySelector('#products-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = filteredProducts.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.brand}</td>
            <td>${product.viscosity}</td>
            <td>${product.capacity}</td>
            <td>${product.stock}</td>
            <td>${window.formatCurrency ? window.formatCurrency(product.price) : `$${product.price}`}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editProduct(${product.id})">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteProductConfirm(${product.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Modal de productos
function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    
    if (productId) {
        const product = products.find(p => p.id === productId);
        title.textContent = 'Editar Producto';
        fillProductForm(product);
        currentEditingProduct = productId;
    } else {
        title.textContent = 'Nuevo Producto';
        form.reset();
        currentEditingProduct = null;
    }
    
    modal.style.display = 'block';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    currentEditingProduct = null;
}

function fillProductForm(product) {
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-code').value = product.code;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-brand').value = product.brand;
    document.getElementById('product-viscosity').value = product.viscosity;
    document.getElementById('product-capacity').value = product.capacity;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-cost').value = product.cost;
}

function editProduct(productId) {
    openProductModal(productId);
}

async function deleteProductConfirm(productId) {
    const product = products.find(p => p.id === productId);
    
    if (confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`)) {
        try {
            await window.deleteProduct(productId);
            if (window.showNotification) {
                window.showNotification('Producto eliminado exitosamente', 'success');
            }
            loadProductsPage();
        } catch (error) {
            console.error('Error deleting product:', error);
            if (window.showNotification) {
                window.showNotification('Error al eliminar producto: ' + error.message, 'error');
            }
        }
    }
}

// Event listener para el formulario de productos
document.addEventListener('DOMContentLoaded', function() {
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                code: document.getElementById('product-code').value,
                name: document.getElementById('product-name').value,
                brand: document.getElementById('product-brand').value,
                viscosity: document.getElementById('product-viscosity').value,
                capacity: document.getElementById('product-capacity').value,
                stock: parseInt(document.getElementById('product-stock').value),
                price: parseFloat(document.getElementById('product-price').value),
                cost: parseFloat(document.getElementById('product-cost').value)
            };
            
            try {
                if (currentEditingProduct) {
                    await window.updateProduct(currentEditingProduct, formData);
                    if (window.showNotification) {
                        window.showNotification('Producto actualizado exitosamente', 'success');
                    }
                } else {
                    await window.createProduct(formData);
                    if (window.showNotification) {
                        window.showNotification('Producto creado exitosamente', 'success');
                    }
                }
                
                closeProductModal();
                loadProductsPage();
            } catch (error) {
                console.error('Error saving product:', error);
                if (window.showNotification) {
                    window.showNotification('Error al guardar producto: ' + error.message, 'error');
                }
            }
        });
    }
});

// ===== EMPLEADOS =====
async function loadEmployeesPage() {
    try {
        employees = await window.getEmployees();
        displayEmployees();
    } catch (error) {
        console.error('Error loading employees:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar empleados: ' + error.message, 'error');
        }
    }
}

function displayEmployees() {
    const tbody = document.querySelector('#employees-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.employee_code}</td>
            <td>${employee.name}</td>
            <td>${employee.role}</td>
            <td>${employee.routes?.join(', ') || 'Sin rutas'}</td>
            <td>${(employee.commission_rate * 100).toFixed(1)}%</td>
            <td>${window.formatDate ? window.formatDate(employee.created_at) : employee.created_at}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editEmployee(${employee.id})">
                        ✏️ Editar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== PEDIDOS (CORREGIDO) =====
async function loadOrdersPage() {
    try {
        orders = await window.getOrders();
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar pedidos: ' + error.message, 'error');
        }
    }
}

function displayOrders() {
    const tbody = document.querySelector('#orders-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.employee_code}</td>
            <td>${order.client_info?.name || 'Sin cliente'}</td>
            <td>${window.formatCurrency ? window.formatCurrency(order.total) : `${order.total}`}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${window.formatDate ? window.formatDate(order.created_at) : order.created_at}</td>
            <td>
                <div class="action-buttons">
                    ${order.status === 'hold' ? `
                        <button class="btn btn-sm btn-confirm" onclick="confirmOrderModal(${order.id})">
                            ✅ Confirmar
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="cancelOrderModal(${order.id})">
                            ❌ Cancelar
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="viewOrderDetails(${order.id})">
                        👁️ Ver
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    
    const details = `
        Pedido: ${order.order_number}
        Cliente: ${order.client_info?.name || 'Sin cliente'}
        Teléfono: ${order.client_info?.phone || 'N/A'}
        Total: ${window.formatCurrency ? window.formatCurrency(order.total) : `${order.total}`}
        Notas: ${order.notes || 'Sin notas'}
        Productos:
        ${order.products?.map(p => `- ${p.name} (${p.quantity})`).join('\n') || 'Sin productos'}
    `;
    
    alert(details.replace(/<br>/g, '\n').replace(/<strong>|<\/strong>/g, ''));
}

// ===== REPORTES =====
async function loadReportsPage() {
    try {
        const [salesByEmp, inventoryData] = await Promise.all([
            window.getSalesByEmployee(),
            window.getInventoryReport()
        ]);
        
        displaySalesByEmployee(salesByEmp);
        displayInventoryReport(inventoryData);
    } catch (error) {
        console.error('Error loading reports:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar reportes: ' + error.message, 'error');
        }
    }
}

function displaySalesByEmployee(salesData) {
    const container = document.getElementById('sales-by-employee');
    if (!container) return;
    
    container.innerHTML = salesData.map(empData => `
        <div class="employee-report">
            <h4>${empData.employee_code}</h4>
            <div class="employee-stats">
                <div class="employee-stat">
                    <span>Total Ventas:</span>
                    <span>${empData.total_sales}</span>
                </div>
                <div class="employee-stat">
                    <span>Monto Total:</span>
                    <span>${window.formatCurrency ? window.formatCurrency(empData.total_amount) : `${empData.total_amount}`}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function displayInventoryReport(inventoryData) {
    const container = document.getElementById('inventory-report');
    if (!container) return;
    
    const lowStockHtml = inventoryData.low_stock.map(product => `
        <div class="low-stock-item">
            <span>${product.code} - ${product.name}</span>
            <span class="stock-warning">Stock: ${product.stock}</span>
        </div>
    `).join('');
    
    container.innerHTML = `
        <h4>Productos con Stock Bajo</h4>
        ${lowStockHtml}
    `;
}

// Funciones que pueden ser llamadas desde los modales
function openEmployeeModal() {
    console.log('Abrir modal de empleado');
}

function closeEmployeeModal() {
    const modal = document.getElementById('employee-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function editEmployee(employeeId) {
    console.log('Editar empleado:', employeeId);
}

function filterOrders() {
    console.log('Filtrar pedidos');
}

function updateReports() {
    console.log('Actualizar reportes');
    loadReportsPage();
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    const productModal = document.getElementById('product-modal');
    const employeeModal = document.getElementById('employee-modal');
    const confirmModal = document.getElementById('confirm-modal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === employeeModal) {
        closeEmployeeModal();
    }
    if (event.target === confirmModal) {
        closeConfirmModal();
    }
}

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.confirmOrderModal = confirmOrderModal;
window.cancelOrderModal = cancelOrderModal;
window.viewOrderDetails = viewOrderDetails;
window.createTestOrder = createTestOrder;
window.debugServer = debugServer;

console.log('✅ Admin.js completo cargado correctamente');