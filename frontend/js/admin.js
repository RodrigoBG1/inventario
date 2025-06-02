// Funciones específicas para el panel de administrador

console.log('🔧 admin.js cargado correctamente');

// Variables globales
let products = [];
let employees = [];
let orders = [];
let sales = [];
let currentEditingProduct = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM cargado, iniciando admin panel...');
    
    // Verificar que sea admin
    if (!requireAdmin()) return;
    
    // Cargar datos iniciales según la página
    const currentPage = window.location.pathname;
    console.log('📄 Página actual:', currentPage);
    
    if (currentPage.includes('dashboard.html')) {
        console.log('📊 Cargando dashboard...');
        // Esperar un poco para que las funciones de API estén disponibles
        setTimeout(loadDashboardData, 1000);
    } else if (currentPage.includes('products.html')) {
        setTimeout(loadProductsPage, 1000);
    } else if (currentPage.includes('employees.html')) {
        setTimeout(loadEmployeesPage, 1000);
    } else if (currentPage.includes('orders.html')) {
        setTimeout(loadOrdersPage, 1000);
    } else if (currentPage.includes('reports.html')) {
        setTimeout(loadReportsPage, 1000);
    }
});

// ===== DASHBOARD =====
async function loadDashboardData() {
    console.log('📊 loadDashboardData() iniciando...');
    
    try {
        // Verificar que las funciones estén disponibles
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

function updateDashboardStats() {
    console.log('📊 Actualizando estadísticas del dashboard...');
    
    // Total de productos
    const totalProductsElement = document.getElementById('total-products');
    if (totalProductsElement) {
        totalProductsElement.textContent = products.length;
        console.log('📦 Total productos:', products.length);
    } else {
        console.warn('⚠️ Elemento total-products no encontrado');
    }
    
    // Pedidos pendientes
    const pendingOrders = orders.filter(order => order.status === 'hold').length;
    const pendingOrdersElement = document.getElementById('pending-orders');
    if (pendingOrdersElement) {
        pendingOrdersElement.textContent = pendingOrders;
        console.log('📋 Pedidos pendientes:', pendingOrders);
    } else {
        console.warn('⚠️ Elemento pending-orders no encontrado');
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
        console.log('💰 Ventas del mes:', monthlySales);
    } else {
        console.warn('⚠️ Elemento monthly-sales no encontrado');
    }
    
    // Empleados activos
    const activeEmployees = employees.filter(emp => emp.role === 'employee').length;
    const activeEmployeesElement = document.getElementById('active-employees');
    if (activeEmployeesElement) {
        activeEmployeesElement.textContent = activeEmployees;
        console.log('👥 Empleados activos:', activeEmployees);
    } else {
        console.warn('⚠️ Elemento active-employees no encontrado');
    }
}

function updateRecentOrders() {
    const tbody = document.querySelector('#recent-orders-table tbody');
    if (!tbody) {
        console.warn('⚠️ Tabla recent-orders-table no encontrada');
        return;
    }
    
    console.log('📋 Actualizando pedidos recientes...');
    
    // Ordenar por fecha más reciente
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
    if (!tbody) {
        console.warn('⚠️ Tabla low-stock-table no encontrada');
        return;
    }
    
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
        // Editar producto
        const product = products.find(p => p.id === productId);
        title.textContent = 'Editar Producto';
        fillProductForm(product);
        currentEditingProduct = productId;
    } else {
        // Nuevo producto
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

// ===== PEDIDOS =====
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
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="viewOrderDetails(${order.id})">
                        👁️ Ver
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function confirmOrderModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    
    if (confirm(`¿Confirmar el pedido ${order.order_number}?`)) {
        try {
            const paymentInfo = {
                method: 'efectivo',
                amount: order.total,
                confirmed_at: new Date().toISOString()
            };
            
            await window.confirmOrder(orderId, paymentInfo);
            if (window.showNotification) {
                window.showNotification('Pedido confirmado exitosamente', 'success');
            }
            loadOrdersPage();
        } catch (error) {
            console.error('Error confirming order:', error);
            if (window.showNotification) {
                window.showNotification('Error al confirmar pedido: ' + error.message, 'error');
            }
        }
    }
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