// Funciones específicas para el panel de vendedors - VERSIÓN CORREGIDA

console.log('📋 employee.js cargado - versión no conflictiva');

// Variables globales SOLO para páginas que NO sean orders.html
let employeeProducts = [];
let employeeMySales = [];
let employeeCurrentLocation = null;

// Verificar si estamos en la página de orders para evitar conflictos
const isOrdersPage = window.location.pathname.includes('orders.html');

// NO ejecutar nada si estamos en orders.html
if (!isOrdersPage) {
    console.log('📋 Inicializando employee.js para página:', window.location.pathname);
    
    // Inicialización SOLO para páginas que no sean orders
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📋 DOM cargado, iniciando panel vendedor...');
        
        const currentPage = window.location.pathname;
        console.log('📄 Página actual:', currentPage);
        
        // Verificar autenticación
        const user = checkAuth();
        if (!user) return;
        
        // Cargar datos según la página
        if (currentPage.includes('dashboard.html')) {
            console.log('📊 Cargando dashboard vendedor...');
            setTimeout(loadEmployeeDashboard, 1000);
        } else if (currentPage.includes('sales.html')) {
            console.log('💰 Cargando página de ventas...');
            setTimeout(loadSalesPage, 1000);
        }
        // NO manejar orders.html aquí
    });
} else {
    console.log('⏭️ Saltando inicialización de employee.js - estamos en orders.html');
}

// ===== DASHBOARD vendedor =====
async function loadEmployeeDashboard() {
    if (isOrdersPage) return; // Seguridad adicional
    
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
        employeeMySales = salesData || [];
        
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

function updateEmployeeStats() {
    if (isOrdersPage) return;
    
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
    const monthlySales = employeeMySales
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
    if (isOrdersPage) return;
    
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
        ...employeeMySales.map(sale => ({
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

// ===== GEOLOCALIZACIÓN PARA DASHBOARD =====
async function getCurrentLocationForEmployee() {
    if (isOrdersPage) return; // No ejecutar en orders.html
    
    const btn = document.getElementById('location-btn');
    
    if (!btn) {
        console.error('Botón de ubicación no encontrado');
        return;
    }
    
    try {
        btn.disabled = true;
        btn.textContent = '📍 Obteniendo...';
        
        const location = await getCurrentLocation();
        employeeCurrentLocation = location;
        
        btn.textContent = '📍 Ubicación Obtenida';
        btn.style.backgroundColor = '#059669';
        
        if (window.showNotification) {
            window.showNotification('Ubicación obtenida exitosamente', 'success');
        }
        
    } catch (error) {
        console.error('Error getting location:', error);
        btn.textContent = '📍 Error en Ubicación';
        btn.style.backgroundColor = '#dc2626';
        if (window.showNotification) {
            window.showNotification('Error al obtener ubicación: ' + error.message, 'error');
        }
    } finally {
        btn.disabled = false;
    }
}

// ===== MIS VENTAS =====
async function loadSalesPage() {
    if (isOrdersPage) return;
    
    console.log('💰 Cargando página de ventas del vendedor...');
    try {
        employeeMySales = await window.getSales();
        displayMySales();
        updateSalesSummary();
    } catch (error) {
        console.error('Error loading sales:', error);
        if (window.showNotification) {
            window.showNotification('Error al cargar ventas', 'error');
        }
    }
}

function displayMySales() {
    if (isOrdersPage) return;
    
    const tbody = document.querySelector('#sales-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = employeeMySales.map(sale => `
        <tr>
            <td>${sale.sale_number || sale.id}</td>
            <td>${sale.client_info?.name || 'Sin cliente'}</td>
            <td>${window.formatCurrency ? window.formatCurrency(sale.total) : `$${sale.total}`}</td>
            <td>${sale.payment_info?.method || 'N/A'}</td>
            <td>${window.formatDate ? window.formatDate(sale.created_at) : sale.created_at}</td>
            <td>${window.formatCurrency ? window.formatCurrency((sale.total * (getUser()?.commission_rate || 0.05))) : `$${(sale.total * 0.05).toFixed(2)}`}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewSaleDetails(${sale.id})">
                    Ver
                </button>
            </td>
        </tr>
    `).join('');
}

function updateSalesSummary() {
    if (isOrdersPage) return;
    
    const totalSales = employeeMySales.length;
    const totalAmount = employeeMySales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Ventas de este mes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyAmount = employeeMySales
        .filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((sum, sale) => sum + sale.total, 0);
    
    // Calcular comisiones
    const commissionRate = getUser()?.commission_rate || 0.05;
    const commissionAmount = totalAmount * commissionRate;
    
    const elements = {
        'total-sales-count': totalSales,
        'total-sales-amount': window.formatCurrency ? window.formatCurrency(totalAmount) : `$${totalAmount.toFixed(2)}`,
        'monthly-sales-amount': window.formatCurrency ? window.formatCurrency(monthlyAmount) : `$${monthlyAmount.toFixed(2)}`,
        'commission-amount': window.formatCurrency ? window.formatCurrency(commissionAmount) : `$${commissionAmount.toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function viewSaleDetails(saleId) {
    if (isOrdersPage) return;
    
    const sale = employeeMySales.find(s => s.id === saleId);
    
    if (!sale) {
        if (window.showNotification) {
            window.showNotification('Venta no encontrada', 'error');
        }
        return;
    }
    
    const details = `
        Venta: ${sale.sale_number || sale.id}
        Cliente: ${sale.client_info?.name || 'Sin cliente'}
        Total: ${window.formatCurrency ? window.formatCurrency(sale.total) : `$${sale.total}`}
        Método de Pago: ${sale.payment_info?.method || 'N/A'}
        Fecha: ${window.formatDate ? window.formatDate(sale.created_at) : sale.created_at}
        
        Productos:
        ${sale.products?.map(p => `- ${p.name} (${p.quantity}) - ${window.formatCurrency ? window.formatCurrency(p.price * p.quantity) : `$${(p.price * p.quantity).toFixed(2)}`}`).join('\n') || 'Sin productos'}
    `;
    
    alert(details);
}

function filterSales() {
    if (isOrdersPage) return;
    // Esta función se puede implementar para filtrar las ventas
    loadSalesPage();
}

function closeSaleDetailsModal() {
    if (isOrdersPage) return;
    const modal = document.getElementById('sale-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== UTILIDADES =====
function viewProducts() {
    if (isOrdersPage) return;
    // Mostrar modal o página con lista de productos disponibles
    if (employeeProducts.length === 0) {
        if (window.showNotification) {
            window.showNotification('Cargando productos...', 'info');
        }
        return;
    }
    
    const productsList = employeeProducts.map(product => 
        `${product.code} - ${product.name} (${product.viscosity}) - Stock: ${product.stock} - ${window.formatCurrency ? window.formatCurrency(product.price) : `$${product.price}`}`
    ).join('\n');
    
    alert(`Productos Disponibles:\n\n${productsList}`);
}

// HACER DISPONIBLES SOLO LAS FUNCIONES NECESARIAS Y SEGURAS
if (!isOrdersPage) {
    window.getCurrentLocationForEmployee = getCurrentLocationForEmployee;
    window.viewSaleDetails = viewSaleDetails;
    window.filterSales = filterSales;
    window.closeSaleDetailsModal = closeSaleDetailsModal;
    window.viewProducts = viewProducts;
    
    console.log('✅ employee.js funciones exportadas para:', window.location.pathname);
} else {
    console.log('🚫 employee.js NO exportó funciones - evitando conflictos en orders.html');
}

function addPriceOverrideStyles() {
    const styles = `
        <style>
        .price-override-btn {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-left: 0.5rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .price-override-btn:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .price-override-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }

        .price-override-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(3px);
        }

        .price-override-modal.show {
            display: flex;
        }

        .price-override-content {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: modalEnter 0.3s ease-out;
            max-height: 90vh;
            overflow-y: auto;
        }

        @keyframes modalEnter {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .price-override-header {
            text-align: center;
            margin-bottom: 1.5rem;
        }

        .price-override-title {
            color: #1f2937;
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
        }

        .price-override-subtitle {
            color: #6b7280;
            font-size: 0.9rem;
            margin: 0;
        }

        .price-info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.5rem;
        }

        .price-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        .price-item {
            text-align: center;
            padding: 0.75rem;
            border-radius: 6px;
        }

        .current-price {
            background: #dbeafe;
            border: 1px solid #93c5fd;
        }

        .new-price {
            background: #dcfce7;
            border: 1px solid #86efac;
        }

        .price-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.25rem;
        }

        .price-value {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
        }

        .price-presets {
            margin-bottom: 1rem;
        }

        .presets-label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .presets-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
        }

        .preset-btn {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 0.5rem;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }

        .preset-btn:hover {
            background: #e5e7eb;
            border-color: #9ca3af;
        }

        .preset-btn.active {
            background: #fef3c7;
            border-color: #f59e0b;
            color: #92400e;
        }

        .price-input-group {
            margin-bottom: 1rem;
        }

        .price-input-label {
            display: block;
            font-weight: 600;
            color: #374151;
            margin-bottom: 0.5rem;
        }

        .price-input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s;
            text-align: center;
            font-weight: 600;
        }

        .price-input:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .reason-input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.9rem;
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
        }

        .reason-input:focus {
            outline: none;
            border-color: #f59e0b;
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .price-validation {
            margin-top: 0.5rem;
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 0.8rem;
            display: none;
        }

        .price-validation.error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            display: block;
        }

        .price-validation.warning {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            color: #d97706;
            display: block;
        }

        .price-validation.success {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #059669;
            display: block;
        }

        .price-override-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 1.5rem;
        }

        .btn-cancel-override {
            background: #6b7280;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .btn-cancel-override:hover {
            background: #4b5563;
        }

        .btn-apply-override {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-apply-override:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
        }

        .btn-apply-override:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }

        .custom-price-indicator {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            margin-left: 0.5rem;
            display: inline-block;
        }

        @media (max-width: 480px) {
            .price-override-content {
                padding: 1.5rem;
                margin: 1rem;
            }

            .price-comparison {
                grid-template-columns: 1fr;
            }

            .presets-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .price-override-actions {
                flex-direction: column;
            }
        }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
}

