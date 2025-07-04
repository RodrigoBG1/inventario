// Funciones específicas para el panel de administrador - VERSIÓN CORREGIDA SIN DUPLICACIONES

console.log('🔧 admin.js cargado correctamente');

// Variables globales - EVITAR REDECLARACIONES
if (typeof window.adminProducts === 'undefined') {
    window.adminProducts = [];
    window.adminEmployees = [];
    window.adminOrders = [];
    window.adminSales = [];
    window.currentEditingProduct = null;
}

// Usar referencias directas a las variables globales - SIN let/const/var
var products = window.adminProducts;
var employees = window.adminEmployees;
var orders = window.adminOrders;
var sales = window.adminSales;
var currentEditingProduct = window.currentEditingProduct;

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

// Función para verificar si el usuario puede acceder (admin O vendedor)
function requireAuth() {
    const user = checkAuth();
    if (!user) return false;
    
    // Permitir acceso a tanto admin como vendedor
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

 Número: ${order.order_number}
 Cliente: ${order.client_info?.name || 'Sin cliente'}
 Total: $${order.total}
 Método de pago: ${paymentMethod}
 Confirmado: ${new Date().toLocaleString()}

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

function injectAutoConfirmStyles() {
    if (!document.getElementById('auto-confirm-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'auto-confirm-styles';
        styleElement.textContent = autoConfirmStyles;
        document.head.appendChild(styleElement);
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
        // Páginas de vendedor solo requieren estar autenticado
        if (!requireAuth()) return;
    }
    
    // Cargar datos según la página
    if (currentPage.includes('dashboard.html')) {
        if (currentPage.includes('/admin/')) {
            console.log('📊 Cargando dashboard admin...');
            setTimeout(loadDashboardData, 1000);
        } else {
            console.log('📊 Cargando dashboard vendedor...');
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
        
        console.log('👥 Obteniendo vendedors...');
        const employeesData = await window.getEmployees();
        console.log('👥 vendedors obtenidos:', employeesData?.length || 0);
        
        console.log('📋 Obteniendo pedidos...');
        const ordersData = await window.getOrders();
        console.log('📋 Pedidos obtenidos:', ordersData?.length || 0);
        
        console.log('💰 Obteniendo ventas...');
        const salesData = await window.getSales();
        console.log('💰 Ventas obtenidas:', salesData?.length || 0);
        
        // Guardar datos globalmente y actualizar referencias
        window.adminProducts = productsData || [];
        window.adminEmployees = employeesData || [];
        window.adminOrders = ordersData || [];
        window.adminSales = salesData || [];
        
        // Actualizar referencias locales
        products = window.adminProducts;
        employees = window.adminEmployees;
        orders = window.adminOrders;
        sales = window.adminSales;
        
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

// ===== DASHBOARD vendedor =====
async function loadEmployeeDashboard() {
    console.log('📊 loadEmployeeDashboard() iniciando...');
    
    try {
        console.log('📋 Obteniendo mis pedidos...');
        const ordersData = await window.getOrders();
        console.log('📋 Mis pedidos obtenidos:', ordersData?.length || 0);
        
        console.log('💰 Obteniendo mis ventas...');
        const salesData = await window.getSales();
        console.log('💰 Mis ventas obtenidas:', salesData?.length || 0);
        
        // Guardar datos globalmente y actualizar referencias
        window.adminOrders = ordersData || [];
        window.adminSales = salesData || [];
        
        // Actualizar referencias locales
        orders = window.adminOrders;
        sales = window.adminSales;
        
        // Actualizar estadísticas del vendedor
        console.log('📊 Actualizando estadísticas del vendedor...');
        updateEmployeeStats();
        updateRecentActivity();
        
        console.log('✅ Dashboard del vendedor cargado exitosamente');
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

// ===== FUNCIONES DE vendedor =====
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
        monthlySalesElement.textContent = window.formatCurrency ? window.formatCurrency(monthlySales) : `${monthlySales}`;
    }
    
    // Calcular comisiones
    const user = getUser();
    const commissionRate = user?.commission_rate || 0.05;
    const commissions = monthlySales * commissionRate;
    
    const commissionsElement = document.getElementById('commissions');
    if (commissionsElement) {
        commissionsElement.textContent = window.formatCurrency ? window.formatCurrency(commissions) : `${commissions}`;
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
            subtitle: `${window.formatCurrency ? window.formatCurrency(order.total) : `${order.total}`} - ${order.status}`,
            date: order.created_at,
            icon: '📝'
        })),
        ...sales.map(sale => ({
            type: 'sale',
            title: `Venta ${sale.sale_number || sale.id}`,
            subtitle: `${window.formatCurrency ? window.formatCurrency(sale.total) : `${sale.total}`} - Confirmada`,
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
    console.log('📋 Cargando página de pedidos del vendedor...');
}

function loadSalesPage() {
    console.log('💰 Cargando página de ventas del vendedor...');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// ===== RESTO DE FUNCIONES ADMIN =====
function updateDashboardStats() {
    console.log('📊 Actualizando estadísticas del dashboard con nuevo sistema de pagos...');
    
    const totalProductsElement = document.getElementById('total-products');
    if (totalProductsElement) {
        totalProductsElement.textContent = products.length;
    }
    
    // ===== NUEVO: Contar pedidos por estado de pago =====
    const notPaidOrders = orders.filter(order => {
        const total = parseFloat(order.total) || 0;
        const paidAmount = parseFloat(order.paid_amount) || 0;
        const balance = total - paidAmount;
        return balance > 0; // No pagados (incluye parciales)
    }).length;
    
    const paidOrders = orders.filter(order => {
        const total = parseFloat(order.total) || 0;
        const paidAmount = parseFloat(order.paid_amount) || 0;
        const balance = total - paidAmount;
        return balance <= 0; // Pagados completamente
    }).length;
    
    const pendingOrdersElement = document.getElementById('pending-orders');
    if (pendingOrdersElement) {
        pendingOrdersElement.textContent = notPaidOrders;
        
        // Cambiar el título del card
        const cardTitle = pendingOrdersElement.closest('.stat-card').querySelector('h3');
        if (cardTitle) {
            if (notPaidOrders > 0) {
                cardTitle.innerHTML = `Pedidos Sin Pagar <small>(${paidOrders} pagados)</small>`;
            } else {
                cardTitle.innerHTML = `Todos Pagados <small>(${paidOrders} total)</small>`;
            }
        }
    }
    
    // Resto de estadísticas sin cambios
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
        monthlySalesElement.textContent = window.formatCurrency ? window.formatCurrency(monthlySales) : `${monthlySales}`;
    }
    
    const activeEmployees = employees.filter(emp => emp.role === 'employee').length;
    const activeEmployeesElement = document.getElementById('active-employees');
    if (activeEmployeesElement) {
        activeEmployeesElement.textContent = activeEmployees;
    }
    
    console.log('📊 Estadísticas actualizadas:', {
        productos: products.length,
        pedidos_no_pagados: notPaidOrders,
        pedidos_pagados: paidOrders,
        ventas_mes: monthlySales,
        vendedors_activos: activeEmployees
    });
}


function updateRecentOrders() {
    const tbody = document.querySelector('#recent-orders-table tbody');
    if (!tbody) return;
    
    console.log('📋 Actualizando pedidos recientes con nuevo sistema de estados...');
    
    const recentOrders = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    tbody.innerHTML = recentOrders.map(order => {
        const total = parseFloat(order.total) || 0;
        const paidAmount = parseFloat(order.paid_amount) || 0;
        const balance = total - paidAmount;
        const isPaid = balance <= 0;
        
        let statusBadge = '';
        if (isPaid) {
            statusBadge = `<span class="status-badge status-paid"> Pagado</span>`;
        } else {
            statusBadge = `<span class="status-badge status-not-paid"> Pendiente</span>`;
        }
        
        const inventoryIcon = order.inventory_source === 'substore' ? '' : '🏪';
        
        return `
            <tr>
                <td>
                    ${inventoryIcon} ${order.order_number}
                </td>
                <td>${order.employee_code}</td>
                <td>${window.formatCurrency ? window.formatCurrency(order.total) : `${order.total}`}</td>
                <td>${statusBadge}</td>
                <td>${window.formatDate ? window.formatDate(order.created_at) : order.created_at}</td>
            </tr>
        `;
    }).join('');
    
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
        window.adminProducts = await window.getProducts();
        products = window.adminProducts;
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
            <td>${window.formatCurrency ? window.formatCurrency(product.price) : `${product.price}`}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editProduct(${product.id})">
                         Editar
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteProductConfirm(${product.id})">
                        Elimin
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
            <td>${window.formatCurrency ? window.formatCurrency(product.price) : `${product.price}`}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editProduct(${product.id})">
                         Editar
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteProductConfirm(${product.id})">
                         Elimin
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
        currentEditingProduct = window.currentEditingProduct = productId;
    } else {
        title.textContent = 'Nuevo Producto';
        form.reset();
        currentEditingProduct = window.currentEditingProduct = null;
    }
    
    modal.style.display = 'block';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    currentEditingProduct = window.currentEditingProduct = null;
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

// ===== vendedorS =====
async function loadEmployeesPage() {
    try {
        window.adminEmployees = await window.getEmployees();
        employees = window.adminEmployees;
        displayEmployees();
    } catch (error) {
        console.error('Error loading employees:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar vendedors: ' + error.message, 'error');
        }
    }
}

function displayEmployees() {
    const tbody = document.querySelector('#employees-table tbody');
    if (!tbody) {
        console.error('Tabla de vendedors no encontrada');
        return;
    }
    
    console.log('📋 Mostrando vendedors:', employees.length);
    
    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
                    👥 No hay vendedors registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.employee_code}</td>
            <td>${employee.name}</td>
            <td>
                <span class="role-badge role-${employee.role}">
                    ${employee.role === 'admin' ? ' Admin' : ' vendedor'}
                </span>
            </td>
            <td>${Array.isArray(employee.routes) ? employee.routes.join(', ') : (employee.routes || 'Sin rutas')}</td>
            <td>${(employee.commission_rate * 100).toFixed(1)}%</td>
            <td>${window.formatDate ? window.formatDate(employee.created_at) : employee.created_at}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editEmployee(${employee.id})" title="Editar vendedor">
                         Editar
                    </button>
                    ${employee.role !== 'admin' ? `
                        <button class="btn btn-sm btn-danger" onclick="deleteEmployeeConfirm(${employee.id})" title="Eliminar vendedor">
                             Elimin
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

async function deleteEmployeeConfirm(employeeId) {
    const employee = employees.find(e => e.id === employeeId);
    
    if (!employee) {
        if (window.showNotification) {
            window.showNotification('vendedor no encontrado', 'error');
        }
        return;
    }
    
    if (employee.role === 'admin') {
        if (window.showNotification) {
            window.showNotification('No se puede eliminar un administrador', 'warning');
        }
        return;
    }
    
    if (confirm(`¿Estás seguro de eliminar al vendedor "${employee.name}"?\n\nEsta acción no se puede deshacer.`)) {
        try {
            console.log('🗑️ Eliminando vendedor:', employeeId);
            
            // Aquí iría la implementación de deleteEmployee si la necesitas
            if (window.showNotification) {
                window.showNotification('Función de eliminación pendiente de implementar', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error eliminando vendedor:', error);
            if (window.showNotification) {
                window.showNotification('Error eliminando vendedor: ' + error.message, 'error');
            }
        }
    }
}
// ===== PEDIDOS (CORREGIDO) =====
async function loadOrdersPage() {
    try {
        window.adminOrders = await window.getOrders();
        orders = window.adminOrders;
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar pedidos: ' + error.message, 'error');
        }
    }
}

function displayOrdersWithPayments() {
    const tbody = document.querySelector('#orders-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = orders.map(order => {
        // Calcular información de pagos
        const total = parseFloat(order.total) || 0;
        const paidAmount = parseFloat(order.paid_amount) || 0;
        const balance = total - paidAmount;
        const paymentPercentage = total > 0 ? (paidAmount / total * 100) : 0;
        
        // ===== NUEVO SISTEMA: Solo 2 estados =====
        const isPaid = balance <= 0; // Pagado completamente
        const isNotPaid = balance > 0; // No pagado (incluye parciales)
        
        // Determinar clase CSS y badge según el estado de pago
        const paymentStatusClass = isPaid ? 'payment-complete' : 'payment-pending';
        
        let statusBadge = '';
        let actionButtons = '';
        
        if (isPaid) {
            statusBadge = `<span class="status-badge status-paid"> Pagado</span>`;
            
            actionButtons = `
                <button class="btn btn-sm btn-primary" onclick="viewOrderDetails(${order.id})">
                    Ver
                </button>
                <button class="btn btn-sm btn-secondary" onclick="printOrder(${order.id})">
                    Imprimir
                </button>
            `;
        } else {
            statusBadge = `<span class="status-badge status-not-paid">⏳ No Pagado</span>`;
            
            actionButtons = `
                <button class="btn btn-sm btn-primary" onclick="viewOrderDetails(${order.id})">
                    Ver
                </button>
                <button class="btn btn-sm btn-success" onclick="openPaymentModal(${order.id})">
                    Abonar
                </button>
                <button class="btn btn-sm btn-delete" onclick="cancelOrderModal(${order.id})">
                    Cancelar
                </button>
            `;
        }
        
        // Indicador de fuente de inventario
        const inventorySource = order.inventory_source === 'substore' ? 
            `<small style="color: #059669;"> Subalmacén</small>` : 
            `<small style="color: #052e5b;"> Almacén Principal</small>`;
        
        return `
            <tr class="${isNotPaid ? 'order-requires-payment' : 'order-paid'}">
                <td>
                    <div>${order.order_number}</div>
                    ${inventorySource}
                </td>
                <td>${order.employee_code}</td>
                <td>${order.client_info?.name || 'Sin cliente'}</td>
                <td>
                    <div><strong>${window.formatCurrency ? window.formatCurrency(total) : `$${total.toFixed(2)}`}</strong></div>
                    <small>Abonado: ${window.formatCurrency ? window.formatCurrency(paidAmount) : `$${paidAmount.toFixed(2)}`}</small>
                </td>
                <td>
                    <div class="payment-status ${paymentStatusClass}">
                        <span class="balance-amount">${window.formatCurrency ? window.formatCurrency(balance) : `$${balance.toFixed(2)}`}</span>
                        <div class="payment-progress">
                            <div class="progress-bar" style="width: ${Math.min(paymentPercentage, 100)}%"></div>
                        </div>
                        <small>${paymentPercentage.toFixed(1)}% pagado</small>
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>${window.formatDate ? window.formatDate(order.created_at) : order.created_at}</td>
                <td>
                    <div class="action-buttons">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


function openPaymentModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        if (window.showNotification) {
            window.showNotification('Pedido no encontrado', 'error');
        }
        return;
    }
    
    const total = parseFloat(order.total) || 0;
    const paidAmount = parseFloat(order.paid_amount) || 0;
    const balance = total - paidAmount;
    
    // Crear modal si no existe
    if (!document.getElementById('payment-modal')) {
        createPaymentModal();
    }
    
    // Llenar información del pedido
    document.getElementById('payment-order-number').textContent = order.order_number;
    document.getElementById('payment-client-name').textContent = order.client_info?.name || 'Sin cliente';
    document.getElementById('payment-total').textContent = formatCurrency(total);
    document.getElementById('payment-paid').textContent = formatCurrency(paidAmount);
    document.getElementById('payment-balance').textContent = formatCurrency(balance);
    
    // Configurar formulario
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-amount').max = balance;
    document.getElementById('payment-method-select').value = 'efectivo';
    document.getElementById('payment-notes').value = '';
    
    // Configurar botón de envío
    const submitBtn = document.getElementById('submit-payment-btn');
    submitBtn.onclick = () => submitPayment(orderId);
    
    // Cargar historial de abonos
    loadPaymentHistory(orderId);
    
    // Mostrar modal
    document.getElementById('payment-modal').style.display = 'block';
}

function createPaymentModal() {
    const modalHTML = `
        <div id="payment-modal" class="modal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>💰 Gestión de Abonos</h3>
                    <span class="close" onclick="closePaymentModal()">&times;</span>
                </div>
                <div style="padding: 1.5rem;">
                    <!-- Información del Pedido -->
                    <div class="payment-info-section">
                        <h4>📋 Información del Pedido</h4>
                        <div class="payment-info-grid">
                            <div class="payment-info-item">
                                <label>Número:</label>
                                <span id="payment-order-number">-</span>
                            </div>
                            <div class="payment-info-item">
                                <label>Cliente:</label>
                                <span id="payment-client-name">-</span>
                            </div>
                            <div class="payment-info-item">
                                <label>Total:</label>
                                <span id="payment-total" class="amount-total">$0.00</span>
                            </div>
                            <div class="payment-info-item">
                                <label>Abonado:</label>
                                <span id="payment-paid" class="amount-paid">$0.00</span>
                            </div>
                            <div class="payment-info-item">
                                <label>Por Pagar:</label>
                                <span id="payment-balance" class="amount-balance">$0.00</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Formulario de Nuevo Abono -->
                    <div class="payment-form-section">
                        <h4>💳 Registrar Nuevo Abono</h4>
                        <form id="payment-form">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="payment-amount">Monto del Abono:</label>
                                    <input type="number" id="payment-amount" step="0.01" min="0" required
                                           placeholder="0.00" onchange="updatePaymentPreview()">
                                </div>
                                <div class="form-group">
                                    <label for="payment-method-select">Método de Pago:</label>
                                    <select id="payment-method-select">
                                        <option value="efectivo">💵 Efectivo</option>
                                        <option value="tarjeta">💳 Tarjeta</option>
                                        <option value="transferencia">🏦 Transferencia</option>
                                        <option value="cheque">📝 Cheque</option>
                                    </select>
                                </div>
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label for="payment-notes">Notas (Opcional):</label>
                                    <textarea id="payment-notes" rows="2" 
                                              placeholder="Referencia del pago, observaciones..."></textarea>
                                </div>
                            </div>
                            
                            <!-- Vista Previa del Abono -->
                            <div id="payment-preview" class="payment-preview" style="display: none;">
                                <h5>Vista Previa:</h5>
                                <div class="preview-grid">
                                    <div>Nuevo Total Abonado: <span id="preview-new-paid">$0.00</span></div>
                                    <div>Nuevo Saldo: <span id="preview-new-balance">$0.00</span></div>
                                    <div>Porcentaje Pagado: <span id="preview-percentage">0%</span></div>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <!-- Historial de Abonos -->
                    <div class="payment-history-section">
                        <h4>📋 Historial de Abonos</h4>
                        <div id="payment-history" class="payment-history-list">
                            <div class="loading">Cargando historial...</div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closePaymentModal()">
                        Cancelar
                    </button>
                    <button type="button" id="submit-payment-btn" class="btn btn-success">
                        💰 Registrar Abono
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function updatePaymentPreview() {
    const amount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const currentPaid = parseFloat(document.getElementById('payment-paid').textContent.replace(/[$,]/g, '')) || 0;
    const total = parseFloat(document.getElementById('payment-total').textContent.replace(/[$,]/g, '')) || 0;
    
    if (amount <= 0) {
        document.getElementById('payment-preview').style.display = 'none';
        return;
    }
    
    const newPaid = currentPaid + amount;
    const newBalance = Math.max(0, total - newPaid);
    const percentage = total > 0 ? (newPaid / total * 100) : 0;
    
    document.getElementById('preview-new-paid').textContent = formatCurrency(newPaid);
    document.getElementById('preview-new-balance').textContent = formatCurrency(newBalance);
    document.getElementById('preview-percentage').textContent = percentage.toFixed(1) + '%';
    
    document.getElementById('payment-preview').style.display = 'block';
}

async function submitPayment(orderId) {
    const amount = parseFloat(document.getElementById('payment-amount').value);
    const paymentMethod = document.getElementById('payment-method-select').value;
    const notes = document.getElementById('payment-notes').value.trim();
    
    if (!amount || amount <= 0) {
        if (window.showNotification) {
            window.showNotification('Ingresa un monto válido', 'warning');
        }
        return;
    }
    
    const submitBtn = document.getElementById('submit-payment-btn');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = '💰 Registrando...';
        
        const response = await fetch(`${window.API_BASE_URL}/api/orders/${orderId}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: paymentMethod,
                notes: notes
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error registrando abono');
        }
        
        const result = await response.json();
        
        if (window.showNotification) {
            window.showNotification('Abono registrado exitosamente', 'success');
        }
        
        // Actualizar la orden en memoria
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex >= 0 && result.order) {
            orders[orderIndex] = result.order;
        }
        
        // Actualizar la tabla de pedidos
        displayOrdersWithPayments();
        
        // Actualizar información en el modal
        document.getElementById('payment-paid').textContent = formatCurrency(result.order.paid_amount);
        document.getElementById('payment-balance').textContent = formatCurrency(result.order.balance);
        
        // Limpiar formulario
        document.getElementById('payment-form').reset();
        document.getElementById('payment-preview').style.display = 'none';
        
        // Recargar historial
        loadPaymentHistory(orderId);
        
    } catch (error) {
        console.error('Error registrando abono:', error);
        if (window.showNotification) {
            window.showNotification('Error: ' + error.message, 'error');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function loadPaymentHistory(orderId) {
    const container = document.getElementById('payment-history');
    
    try {
        container.innerHTML = '<div class="loading">Cargando historial...</div>';
        
        const response = await fetch(`${window.API_BASE_URL}/api/orders/${orderId}/payments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error cargando historial');
        }
        
        const payments = await response.json();
        
        if (payments.length === 0) {
            container.innerHTML = `
                <div class="no-payments">
                    💰 No hay abonos registrados para este pedido
                </div>
            `;
            return;
        }
        
        container.innerHTML = payments.map(payment => `
            <div class="payment-item">
                <div class="payment-header">
                    <span class="payment-amount">${formatCurrency(payment.amount)}</span>
                    <span class="payment-method">${getPaymentMethodIcon(payment.payment_method)} ${payment.payment_method}</span>
                    <span class="payment-date">${formatDate(payment.created_at)}</span>
                </div>
                <div class="payment-details">
                    <span>Por: ${payment.recorded_by_code}</span>
                    ${payment.notes ? `<span class="payment-notes">📝 ${payment.notes}</span>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando historial de pagos:', error);
        container.innerHTML = `
            <div class="error-message">
                ❌ Error cargando historial: ${error.message}
            </div>
        `;
    }
}

function getPaymentMethodIcon(method) {
    const icons = {
        'efectivo': '💵',
        'tarjeta': '💳',
        'transferencia': '🏦',
        'cheque': '📝'
    };
    return icons[method] || '💰';
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
function openEmployeeModal(employeeId = null) {
    console.log('🔄 Abriendo modal de vendedor:', employeeId);
    
    const modal = document.getElementById('employee-modal');
    const title = modal.querySelector('.modal-header h3');
    const form = document.getElementById('employee-form');
    
    if (!modal || !form) {
        console.error('Modal o formulario de vendedor no encontrado');
        if (window.showNotification) {
            window.showNotification('Error: Modal no encontrado', 'error');
        }
        return;
    }
    
    if (employeeId) {
        // Modo edición
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) {
            if (window.showNotification) {
                window.showNotification('vendedor no encontrado', 'error');
            }
            return;
        }
        
        title.textContent = 'Editar vendedor';
        fillEmployeeForm(employee);
        window.currentEditingEmployee = employeeId;
        
        // Deshabilitar el campo de código en modo edición
        const codeField = document.getElementById('employee-code');
        if (codeField) codeField.disabled = true;
        
    } else {
        // Modo creación
        title.textContent = 'Nuevo vendedor';
        form.reset();
        window.currentEditingEmployee = null;
        
        // Habilitar el campo de código
        const codeField = document.getElementById('employee-code');
        if (codeField) codeField.disabled = false;
        
        // Valores por defecto
        const roleField = document.getElementById('employee-role');
        const commissionField = document.getElementById('employee-commission');
        if (roleField) roleField.value = 'employee';
        if (commissionField) commissionField.value = '5';
    }
    
    modal.style.display = 'block';
}

function closeEmployeeModal() {
    const modal = document.getElementById('employee-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    window.currentEditingEmployee = null;
    
    // Re-habilitar el campo de código
    const codeField = document.getElementById('employee-code');
    if (codeField) codeField.disabled = false;
}

function fillEmployeeForm(employee) {
    console.log('📝 Llenando formulario con datos:', employee);
    
    const fields = {
        'employee-code': employee.employee_code,
        'employee-name': employee.name,
        'employee-role': employee.role,
        'employee-commission': (employee.commission_rate * 100).toString(),
        'employee-routes': Array.isArray(employee.routes) ? employee.routes.join(', ') : (employee.routes || '')
    };
    
    Object.entries(fields).forEach(([fieldId, value]) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        } else {
            console.warn('Campo no encontrado:', fieldId);
        }
    });
    
    // No llenar la contraseña por seguridad
    const passwordField = document.getElementById('employee-password');
    if (passwordField) {
        passwordField.value = '';
        passwordField.placeholder = 'Dejar vacío para mantener contraseña actual';
        passwordField.required = false;
    }
}

function editEmployee(employeeId) {
    console.log('✏️ Editando vendedor:', employeeId);
    openEmployeeModal(employeeId);
}

// Crear vendedor
async function createEmployee(employeeData) {
    if (!window.createEmployeeAPI) {
        console.error('Función createEmployeeAPI no disponible');
        throw new Error('API de vendedors no disponible');
    }
    
    return await window.createEmployeeAPI(employeeData);
}

// Actualizar vendedor
async function updateEmployee(id, employeeData) {
    if (!window.updateEmployeeAPI) {
        console.error('Función updateEmployeeAPI no disponible');
        throw new Error('API de vendedors no disponible');
    }
    
    return await window.updateEmployeeAPI(id, employeeData);
}
function filterOrders() {
    const statusFilter = document.getElementById('status-filter')?.value;
    const clientSearch = document.getElementById('client-search')?.value?.toLowerCase().trim();
    
    console.log('🔍 Filtrando pedidos:', { statusFilter, clientSearch });
    
    let filteredOrders = orders;
    
    // Filtro por estado de pago
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => {
            const total = parseFloat(order.total) || 0;
            const paidAmount = parseFloat(order.paid_amount) || 0;
            const balance = total - paidAmount;
            
            if (statusFilter === 'paid') {
                return balance <= 0; // Pagado completamente
            } else if (statusFilter === 'not_paid') {
                return balance > 0; // No pagado (incluye parciales)
            }
            return true;
        });
    }
    
    // Filtro por búsqueda de cliente
    if (clientSearch) {
        filteredOrders = filteredOrders.filter(order => {
            const clientName = order.client_info?.name?.toLowerCase() || '';
            const orderNumber = order.order_number?.toLowerCase() || '';
            const employeeCode = order.employee_code?.toLowerCase() || '';
            
            return clientName.includes(clientSearch) || 
                   orderNumber.includes(clientSearch) ||
                   employeeCode.includes(clientSearch);
        });
    }
    
    // Actualizar la tabla con los pedidos filtrados
    const originalOrders = orders;
    orders = filteredOrders;
    displayOrdersWithPayments();
    orders = originalOrders;
    
    console.log('✅ Filtros aplicados. Mostrando', filteredOrders.length, 'de', orders.length, 'pedidos');
    
    // Mostrar mensaje si no hay resultados
    if (filteredOrders.length === 0) {
        const tbody = document.querySelector('#orders-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">
                        🔍 No se encontraron pedidos que coincidan con los filtros aplicados
                        <div style="margin-top: 1rem;">
                            <button onclick="clearOrderFilters()" class="btn btn-secondary btn-sm">
                                Limpiar Filtros
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}

function clearOrderFilters() {
    const statusFilter = document.getElementById('status-filter');
    const clientSearch = document.getElementById('client-search');
    
    if (statusFilter) statusFilter.value = '';
    if (clientSearch) clientSearch.value = '';
    
    // Recargar todos los pedidos
    displayOrdersWithPayments();
    
    console.log('🧹 Filtros limpiados');
}

function setupOrderFilters() {
    console.log('🔧 Configurando filtros de pedidos...');
    
    // Event listener para filtro de estado
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterOrders);
    }
    
    // Event listener para búsqueda de cliente
    const clientSearch = document.getElementById('client-search');
    if (clientSearch) {
        clientSearch.addEventListener('input', debounce(filterOrders, 300));
    }
    
    console.log('✅ Filtros de pedidos configurados');
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
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
if (!window.confirmOrderModal) {
    window.confirmOrderModal = confirmOrderModal;
    window.cancelOrderModal = cancelOrderModal;
    window.viewOrderDetails = viewOrderDetails;
    window.createTestOrder = createTestOrder;
    window.openProductModal = openProductModal;
    window.closeProductModal = closeProductModal;
    window.editProduct = editProduct;
    window.deleteProductConfirm = deleteProductConfirm;
    window.filterProducts = filterProducts;
    window.openEmployeeModal = openEmployeeModal;
    window.closeEmployeeModal = closeEmployeeModal;
    window.editEmployee = editEmployee;
    window.filterOrders = filterOrders;
    window.updateReports = updateReports;
    window.closeConfirmModal = closeConfirmModal;
    window.injectAutoConfirmStyles = injectAutoConfirmStyles;
    window.filterOrders = filterOrders;
}

if (!window.filterOrders) {
    window.filterOrders = filterOrders;
    window.clearOrderFilters = clearOrderFilters;
    window.setupOrderFilters = setupOrderFilters;
    window.displayOrdersWithPayments = displayOrdersWithPayments;
    window.displayOrders = displayOrdersWithPayments; // Alias para compatibilidad
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
document.addEventListener('DOMContentLoaded', function() {
    // Solo ejecutar en la página de pedidos
    if (window.location.pathname.includes('orders.html') && window.location.pathname.includes('/admin/')) {
        setTimeout(() => {
            setupOrderFilters();
            console.log('✅ Sistema de filtros de pedidos inicializado');
        }, 1000);
    }
});
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

document.addEventListener('DOMContentLoaded', function() {
    // Inject styles
    injectAutoConfirmStyles();
    
    // Add filter options for auto-confirmed orders
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter && !statusFilter.querySelector('[value="auto-confirmed"]')) {
        const autoConfirmedOption = document.createElement('option');
        autoConfirmedOption.value = 'auto-confirmed';
        autoConfirmedOption.textContent = '⚡ Auto-confirmados';
        statusFilter.appendChild(autoConfirmedOption);
    }
    
    console.log('✅ Funcionalidad de auto-confirmación inicializada');
});

// ===== FUNCIONES ADICIONALES PARA VISTA DETALLADA DE PEDIDOS =====

// Función mejorada para mostrar detalles del pedido (NUEVA)
function viewOrderDetailsEnhanced(orderId) {
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        if (window.showNotification) {
            window.showNotification('Pedido no encontrado', 'error');
        }
        return;
    }
    
    console.log('📋 Mostrando detalles mejorados del pedido:', order);
    
    // Verificar si el modal ya existe, si no, crearlo
    ensureEnhancedOrderModalExists();
    
    // Mostrar el modal con los datos del pedido
    showEnhancedOrderModal(order);
}

// Función para asegurar que el modal mejorado existe en el DOM (NUEVA)
function ensureEnhancedOrderModalExists() {
    if (document.getElementById('enhancedOrderModal')) {
        return; // Ya existe
    }
    
    console.log('🔧 Creando modal mejorado de detalles de pedido...');
    
    // Crear los estilos CSS para el modal mejorado
    const modalCSS = document.createElement('style');
    modalCSS.id = 'enhancedOrderModalStyles';
    modalCSS.textContent = `
        .enhanced-order-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
        }

        .enhanced-modal-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 900px;
            max-height: 95vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: enhancedModalAppear 0.3s ease-out;
        }

        @keyframes enhancedModalAppear {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .enhanced-modal-header {
            background: linear-gradient(135deg, #052e5b, #3b82f6);
            color: white;
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .enhanced-modal-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.25rem;
            font-weight: 600;
        }

        .enhanced-order-status {
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .enhanced-status-hold {
            background: rgba(251, 191, 36, 0.2);
            color: #f59e0b;
            border: 1px solid #f59e0b;
        }

        .enhanced-status-confirmed {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid #10b981;
        }

        .enhanced-status-cancelled {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid #ef4444;
        }

        .enhanced-close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            transition: background-color 0.2s;
        }

        .enhanced-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .enhanced-modal-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        .enhanced-content-section {
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .enhanced-content-section:last-child {
            border-bottom: none;
        }

        .enhanced-section-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #334155;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .enhanced-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .enhanced-info-card {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #052e5b;
        }

        .enhanced-info-label {
            font-size: 0.875rem;
            color: #64748b;
            font-weight: 500;
            margin-bottom: 0.25rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .enhanced-info-value {
            font-size: 1rem;
            color: #334155;
            font-weight: 600;
        }

        .enhanced-products-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .enhanced-products-table th {
            background: #052e5b;
            color: white;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .enhanced-products-table td {
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
        }

        .enhanced-products-table tr:last-child td {
            border-bottom: none;
        }

        .enhanced-products-table tr:hover {
            background: #f8fafc;
        }

        .enhanced-product-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .enhanced-product-name {
            font-weight: 600;
            color: #334155;
        }

        .enhanced-product-details {
            font-size: 0.875rem;
            color: #64748b;
        }

        .enhanced-product-code {
            background: #052e5b;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            display: inline-block;
            margin-top: 0.25rem;
        }

        .enhanced-total-section {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            padding: 1.5rem;
            text-align: center;
            border-radius: 8px;
            margin: 1rem 0;
        }

        .enhanced-total-amount {
            font-size: 2rem;
            font-weight: 700;
            color: #052e5b;
            display: block;
        }

        .enhanced-total-label {
            font-size: 0.875rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }

        .enhanced-modal-actions {
            background: #f8fafc;
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #e2e8f0;
        }

        .enhanced-action-group {
            display: flex;
            gap: 1rem;
        }

        .enhanced-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }

        .enhanced-btn-success {
            background: #059669;
            color: white;
        }

        .enhanced-btn-success:hover {
            background: #047857;
        }

        .enhanced-btn-danger {
            background: #dc2626;
            color: white;
        }

        .enhanced-btn-danger:hover {
            background: #b91c1c;
        }

        .enhanced-btn-secondary {
            background: #64748b;
            color: white;
        }

        .enhanced-btn-secondary:hover {
            background: #475569;
        }

        @media (max-width: 768px) {
            .enhanced-modal-container {
                margin: 1rem;
                max-height: calc(100vh - 2rem);
            }

            .enhanced-modal-header {
                padding: 1rem;
            }

            .enhanced-modal-title {
                font-size: 1.125rem;
            }

            .enhanced-content-section {
                padding: 1rem;
            }

            .enhanced-info-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .enhanced-products-table {
                font-size: 0.875rem;
            }

            .enhanced-products-table th,
            .enhanced-products-table td {
                padding: 0.75rem 0.5rem;
            }

            .enhanced-modal-actions {
                padding: 1rem;
                flex-direction: column;
                gap: 1rem;
            }

            .enhanced-action-group {
                width: 100%;
                justify-content: center;
            }

            .enhanced-btn {
                flex: 1;
                justify-content: center;
            }

            .enhanced-total-amount {
                font-size: 1.5rem;
            }
        }
    `;
    
    document.head.appendChild(modalCSS);
    
    // Crear el HTML del modal mejorado
    const modalHTML = `
    <!-- Modal mejorado de detalle de pedido -->
    <div id="enhancedOrderModal" class="enhanced-order-modal" style="display: none;">
        <div class="enhanced-modal-container">
            <!-- Header -->
            <div class="enhanced-modal-header">
                <div class="enhanced-modal-title">
                    <span>📋</span>
                    <span>Pedido <span id="enhancedOrderNumber">#ORD-2025001</span></span>
                    <div class="enhanced-order-status enhanced-status-hold" id="enhancedOrderStatus">En Espera</div>
                </div>
                <button class="enhanced-close-btn" onclick="closeEnhancedOrderModal()">&times;</button>
            </div>

            <!-- Contenido -->
            <div class="enhanced-modal-content">
                <!-- Información General -->
                <div class="enhanced-content-section">
                    <h3 class="enhanced-section-title">
                        <span>ℹ️</span>
                        Información General
                    </h3>
                    <div class="enhanced-info-grid">
                        <div class="enhanced-info-card">
                            <div class="enhanced-info-label">vendedor</div>
                            <div class="enhanced-info-value" id="enhancedEmployeeInfo">-</div>
                        </div>
                        <div class="enhanced-info-card">
                            <div class="enhanced-info-label">Cliente</div>
                            <div class="enhanced-info-value" id="enhancedClientInfo">-</div>
                        </div>
                        <div class="enhanced-info-card">
                            <div class="enhanced-info-label">Teléfono</div>
                            <div class="enhanced-info-value" id="enhancedClientPhone">-</div>
                        </div>
                        <div class="enhanced-info-card">
                            <div class="enhanced-info-label">Fecha</div>
                            <div class="enhanced-info-value" id="enhancedOrderDate">-</div>
                        </div>
                        <div class="enhanced-info-card">
                            <div class="enhanced-info-label">Dirección</div>
                            <div class="enhanced-info-value" id="enhancedClientAddress">-</div>
                        </div>
                        <div class="enhanced-info-card">
                            <div class="enhanced-info-label">Email</div>
                            <div class="enhanced-info-value" id="enhancedClientEmail">-</div>
                        </div>
                    </div>
                </div>

                <!-- Productos -->
                <div class="enhanced-content-section">
                    <h3 class="enhanced-section-title">
                        <span>📦</span>
                        Productos del Pedido
                    </h3>
                    <table class="enhanced-products-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Precio Unit.</th>
                                <th>Cantidad</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody id="enhancedProductsTableBody">
                        </tbody>
                    </table>

                    <div class="enhanced-total-section">
                        <div class="enhanced-total-label">Total del Pedido</div>
                        <span class="enhanced-total-amount" id="enhancedOrderTotal">$0.00</span>
                    </div>
                </div>

                <!-- Notas -->
                <div class="enhanced-content-section">
                    <h3 class="enhanced-section-title">
                        <span>📝</span>
                        Notas Adicionales
                    </h3>
                    <div class="enhanced-info-card">
                        <div class="enhanced-info-value" id="enhancedOrderNotes">Sin notas adicionales</div>
                    </div>
                </div>
            </div>

            <!-- Acciones -->
            <div class="enhanced-modal-actions">
                <div class="enhanced-action-group">
                    <button class="enhanced-btn enhanced-btn-secondary" onclick="closeEnhancedOrderModal()">
                        ✖️ Cerrar
                    </button>
                </div>
                <div class="enhanced-action-group" id="enhancedOrderActions">
                    <button class="enhanced-btn enhanced-btn-success" onclick="confirmOrderFromEnhancedModal()">
                        ✅ Confirmar Pedido
                    </button>
                    <button class="enhanced-btn enhanced-btn-danger" onclick="cancelOrderFromEnhancedModal()">
                        ❌ Cancelar Pedido
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar eventos
    setupEnhancedModalEvents();
    
    console.log('✅ Modal mejorado de detalles de pedido creado');
}

// Función para configurar los eventos del modal mejorado (NUEVA)
function setupEnhancedModalEvents() {
    const modal = document.getElementById('enhancedOrderModal');
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEnhancedOrderModal();
            }
        });
    }
    
    // Cerrar con ESC (no interfiere con otros modales)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const enhancedModal = document.getElementById('enhancedOrderModal');
            
            if (enhancedModal && enhancedModal.style.display === 'flex') {
                closeEnhancedOrderModal();
            }
        }
    });
}

const autoConfirmStyles = `
/* Auto-confirmation status badges */
.status-auto-confirmed {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: 1px solid #047857;
    position: relative;
    overflow: hidden;
}

.status-auto-confirmed::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}

/* Highlight rows that require admin action */
.order-requires-action {
    background: linear-gradient(90deg, #fef3c7, #ffffff);
    border-left: 4px solid #f59e0b;
}

.order-requires-action:hover {
    background: linear-gradient(90deg, #fde68a, #f9fafb);
}

/* Inventory source indicators */
.inventory-source-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 0.25rem;
}

.source-substore {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
}

.source-main-store {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #3b82f6;
}

/* Enhanced action buttons */
.action-buttons {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
}

.btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
}

.btn-confirm {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.btn-confirm:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4);
}

.btn-delete {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

.btn-delete:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4);
}

.btn-primary {
    background: linear-gradient(135deg, #3b82f6, #052e5b);
    color: white;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
    background: linear-gradient(135deg, #052e5b, #052e5b);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

/* Dashboard stats update for auto-confirmed orders */
.auto-confirm-stat {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border-left: 4px solid #10b981;
}

.auto-confirm-stat .stat-number {
    color: #059669;
}

.pending-confirm-stat {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-left: 4px solid #f59e0b;
}

.pending-confirm-stat .stat-number {
    color: #d97706;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
    .action-buttons {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .btn-sm {
        width: 100%;
        justify-content: center;
    }
    
    .order-requires-action {
        border-left: 2px solid #f59e0b;
    }
}
`;

// Función principal para mostrar el modal mejorado con datos (NUEVA)
function showEnhancedOrderModal(order) {
    console.log('📋 Mostrando modal mejorado con datos:', order);
    
    // Llenar información básica
    document.getElementById('enhancedOrderNumber').textContent = order.order_number || `#${order.id}`;
    document.getElementById('enhancedEmployeeInfo').textContent = `${order.employee_name || order.employee_code || 'N/A'}`;
    document.getElementById('enhancedClientInfo').textContent = order.client_info?.name || 'Sin cliente';
    document.getElementById('enhancedClientPhone').textContent = order.client_info?.phone || 'No especificado';
    document.getElementById('enhancedClientAddress').textContent = order.client_info?.address || 'No especificada';
    document.getElementById('enhancedClientEmail').textContent = order.client_info?.email || 'No especificado';
    document.getElementById('enhancedOrderDate').textContent = window.formatDate ? window.formatDate(order.created_at) : order.created_at;
    document.getElementById('enhancedOrderNotes').textContent = order.notes || 'Sin notas adicionales';
    document.getElementById('enhancedOrderTotal').textContent = window.formatCurrency ? window.formatCurrency(order.total) : `${order.total}`;

    // Status
    const statusElement = document.getElementById('enhancedOrderStatus');
    statusElement.className = `enhanced-order-status enhanced-status-${order.status}`;
    statusElement.textContent = getEnhancedStatusText(order.status);

    // Llenar tabla de productos
    const tbody = document.getElementById('enhancedProductsTableBody');
    if (order.products && order.products.length > 0) {
        tbody.innerHTML = order.products.map(product => `
            <tr>
                <td>
                    <div class="enhanced-product-info">
                        <div class="enhanced-product-name">${product.name || 'Producto sin nombre'}</div>
                        <div class="enhanced-product-details">${product.brand || ''} • ${product.viscosity || ''} • ${product.capacity || ''}</div>
                        <div class="enhanced-product-code">${product.code || product.product_code || 'N/A'}</div>
                    </div>
                </td>
                <td class="enhanced-price-column">${window.formatCurrency ? window.formatCurrency(product.price) : `${product.price}`}</td>
                <td class="enhanced-text-center">
                    <div class="enhanced-quantity-badge">${product.quantity}</div>
                </td>
                <td class="enhanced-price-column enhanced-subtotal">${window.formatCurrency ? window.formatCurrency(product.price * product.quantity) : `${(product.price * product.quantity).toFixed(2)}`}</td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="enhanced-no-content">
                    📦 No hay productos en este pedido
                </td>
            </tr>
        `;
    }

    // Mostrar/ocultar acciones según el estado
    const actionsContainer = document.getElementById('enhancedOrderActions');
    if (order.status === 'hold') {
        actionsContainer.style.display = 'flex';
        window.currentEnhancedOrderId = order.id;
    } else {
        actionsContainer.style.display = 'none';
    }

    // Mostrar modal
    document.getElementById('enhancedOrderModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Función para cerrar el modal mejorado (NUEVA)
function closeEnhancedOrderModal() {
    const modal = document.getElementById('enhancedOrderModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        window.currentEnhancedOrderId = null;
    }
}

// Funciones para las acciones del modal mejorado (NUEVAS)
function confirmOrderFromEnhancedModal() {
    if (window.currentEnhancedOrderId) {
        closeEnhancedOrderModal();
        // Usar la función existente de confirmación
        if (typeof confirmOrderModal === 'function') {
            confirmOrderModal(window.currentEnhancedOrderId);
        } else {
            console.error('Función confirmOrderModal no encontrada');
        }
    }
}

function cancelOrderFromEnhancedModal() {
    if (window.currentEnhancedOrderId) {
        closeEnhancedOrderModal();
        // Usar la función existente de cancelación
        if (typeof cancelOrderModal === 'function') {
            cancelOrderModal(window.currentEnhancedOrderId);
        } else {
            console.error('Función cancelOrderModal no encontrada');
        }
    }
}

// Función helper para obtener texto del estado (NUEVA)
function getEnhancedStatusText(status) {
    const statusMap = {
        'hold': 'En Espera',
        'confirmed': 'Confirmado', 
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// SOBRESCRIBIR SOLO la función viewOrderDetails original para usar la nueva vista
// Guardar la función original por si acaso - SOLO SI NO EXISTE
if (typeof window.originalViewOrderDetails === 'undefined') {
    window.originalViewOrderDetails = window.viewOrderDetails;
}

// Nueva función viewOrderDetails que usa la vista mejorada
if (!window.viewOrderDetailsEnhanced) {
    window.viewOrderDetails = function(orderId) {
        console.log('🔄 Usando vista mejorada para pedido:', orderId);
        viewOrderDetailsEnhanced(orderId);
    };
}


// Inicializar cuando se cargue la página de pedidos
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    if (currentPage.includes('orders.html') && currentPage.includes('/admin/')) {
        // Esperar un poco para que se carguen otros scripts
        setTimeout(() => {
            ensureEnhancedOrderModalExists();
            console.log('✅ Vista detallada de pedidos inicializada correctamente');
        }, 2000);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Event listener para el formulario de vendedors
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            console.log('📝 Procesando formulario de vendedor...');
            
            // Obtener datos del formulario
            const formData = {
                employee_code: document.getElementById('employee-code').value.trim(),
                name: document.getElementById('employee-name').value.trim(),
                role: document.getElementById('employee-role').value,
                commission_rate: parseFloat(document.getElementById('employee-commission').value) / 100,
                routes: document.getElementById('employee-routes').value
                    .split(',')
                    .map(route => route.trim())
                    .filter(route => route.length > 0)
            };
            
            // Agregar contraseña solo si se proporcionó
            const password = document.getElementById('employee-password').value.trim();
            if (password) {
                formData.password = password;
            }
            
            // Validaciones
            if (!formData.employee_code || !formData.name) {
                if (window.showNotification) {
                    window.showNotification('Código y nombre son requeridos', 'warning');
                }
                return;
            }
            
            if (formData.commission_rate < 0 || formData.commission_rate > 1) {
                if (window.showNotification) {
                    window.showNotification('La comisión debe estar entre 0% y 100%', 'warning');
                }
                return;
            }
            
            // Deshabilitar botón mientras se procesa
            const submitBtn = employeeForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Procesando...';
            
            try {
                let result;
                
                if (window.currentEditingEmployee) {
                    console.log('📝 Actualizando vendedor existente...');
                    result = await updateEmployee(window.currentEditingEmployee, formData);
                    
                    if (window.showNotification) {
                        window.showNotification('vendedor actualizado exitosamente', 'success');
                    }
                } else {
                    console.log('📝 Creando nuevo vendedor...');
                    
                    // Para crear, la contraseña es requerida
                    if (!password) {
                        if (window.showNotification) {
                            window.showNotification('La contraseña es requerida para nuevos vendedors', 'warning');
                        }
                        return;
                    }
                    
                    result = await createEmployee(formData);
                    
                    if (window.showNotification) {
                        window.showNotification('vendedor creado exitosamente', 'success');
                    }
                }
                
                console.log('✅ vendedor procesado:', result);
                
                // Cerrar modal y recargar lista
                closeEmployeeModal();
                await loadEmployeesPage();
                
            } catch (error) {
                console.error('❌ Error procesando vendedor:', error);
                
                if (window.showNotification) {
                    window.showNotification('Error: ' + error.message, 'error');
                }
            } finally {
                // Re-habilitar botón
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

console.log('✅ Admin.js completo cargado correctamente');

// Hacer las nuevas funciones globales
if (!window.viewOrderDetailsEnhanced) {
    window.viewOrderDetailsEnhanced = viewOrderDetailsEnhanced;
    window.ensureEnhancedOrderModalExists = ensureEnhancedOrderModalExists;
    window.showEnhancedOrderModal = showEnhancedOrderModal;
    window.closeEnhancedOrderModal = closeEnhancedOrderModal;
    window.confirmOrderFromEnhancedModal = confirmOrderFromEnhancedModal;
    window.cancelOrderFromEnhancedModal = cancelOrderFromEnhancedModal;
    window.getEnhancedStatusText = getEnhancedStatusText;
    window.displayOrders = displayOrdersWithPayments;
    window.openPaymentModal = openPaymentModal;
    window.closePaymentModal = closePaymentModal;
    window.updatePaymentPreview = updatePaymentPreview;
    window.submitPayment = submitPayment;
    window.loadPaymentHistory = loadPaymentHistory;
    window.getPaymentMethodIcon = getPaymentMethodIcon;
}
