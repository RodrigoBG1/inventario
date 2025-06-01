// Funciones específicas para el panel de administrador

// Variables globales
let products = [];
let employees = [];
let orders = [];
let sales = [];
let currentEditingProduct = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que sea admin
    if (!requireAdmin()) return;
    
    // Cargar datos iniciales según la página
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard.html')) {
        loadDashboardData();
    } else if (currentPage.includes('products.html')) {
        loadProductsPage();
    } else if (currentPage.includes('employees.html')) {
        loadEmployeesPage();
    } else if (currentPage.includes('orders.html')) {
        loadOrdersPage();
    } else if (currentPage.includes('reports.html')) {
        loadReportsPage();
    }
});

// ===== DASHBOARD =====
async function loadDashboardData() {
    try {
        // Cargar todos los datos necesarios
        const [productsData, ordersData, salesData, employeesData] = await Promise.all([
            getProducts(),
            getOrders(),
            getSales(),
            getEmployees()
        ]);
        
        products = productsData;
        orders = ordersData;
        sales = salesData;
        employees = employeesData;
        
        // Actualizar estadísticas
        updateDashboardStats();
        updateRecentOrders();
        updateLowStock();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error al cargar el dashboard', 'error');
    }
}

function updateDashboardStats() {
    // Total de productos
    document.getElementById('total-products').textContent = products.length;
    
    // Pedidos pendientes
    const pendingOrders = orders.filter(order => order.status === 'hold').length;
    document.getElementById('pending-orders').textContent = pendingOrders;
    
    // Ventas del mes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySales = sales
        .filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((total, sale) => total + sale.total, 0);
    
    document.getElementById('monthly-sales').textContent = formatCurrency(monthlySales);
    
    // Empleados activos
    const activeEmployees = employees.filter(emp => emp.role === 'employee').length;
    document.getElementById('active-employees').textContent = activeEmployees;
}

function updateRecentOrders() {
    const tbody = document.querySelector('#recent-orders-table tbody');
    if (!tbody) return;
    
    // Ordenar por fecha más reciente
    const recentOrders = orders
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    tbody.innerHTML = recentOrders.map(order => `
        <tr>
            <td>${order.order_number}</td>
            <td>${order.employee_code}</td>
            <td>${formatCurrency(order.total)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${formatDate(order.created_at)}</td>
        </tr>
    `).join('');
}

function updateLowStock() {
    const tbody = document.querySelector('#low-stock-table tbody');
    if (!tbody) return;
    
    const lowStockProducts = products.filter(product => product.stock < 10);
    
    tbody.innerHTML = lowStockProducts.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td><span class="stock-warning">${product.stock}</span></td>
        </tr>
    `).join('');
}

// ===== PRODUCTOS =====
async function loadProductsPage() {
    try {
        products = await getProducts();
        displayProducts();
        loadBrandFilter();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error al cargar productos', 'error');
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
            <td>${formatCurrency(product.price)}</td>
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
            <td>${formatCurrency(product.price)}</td>
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
            await deleteProduct(productId);
            showNotification('Producto eliminado exitosamente', 'success');
            loadProductsPage();
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error al eliminar producto', 'error');
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
                    await updateProduct(currentEditingProduct, formData);
                    showNotification('Producto actualizado exitosamente', 'success');
                } else {
                    await createProduct(formData);
                    showNotification('Producto creado exitosamente', 'success');
                }
                
                closeProductModal();
                loadProductsPage();
            } catch (error) {
                console.error('Error saving product:', error);
                showNotification('Error al guardar producto', 'error');
            }
        });
    }
});

// ===== EMPLEADOS =====
async function loadEmployeesPage() {
    try {
        employees = await getEmployees();
        displayEmployees();
    } catch (error) {
        console.error('Error loading employees:', error);
        showNotification('Error al cargar empleados', 'error');
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
            <td>${formatDate(employee.created_at)}</td>
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
        orders = await getOrders();
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error al cargar pedidos', 'error');
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
            <td>${formatCurrency(order.total)}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${formatDate(order.created_at)}</td>
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
            
            await confirmOrder(orderId, paymentInfo);
            showNotification('Pedido confirmado exitosamente', 'success');
            loadOrdersPage();
        } catch (error) {
            console.error('Error confirming order:', error);
            showNotification('Error al confirmar pedido', 'error');
        }
    }
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    
    // Crear modal simple para mostrar detalles
    const details = `
        <strong>Pedido:</strong> ${order.order_number}<br>
        <strong>Cliente:</strong> ${order.client_info?.name || 'Sin cliente'}<br>
        <strong>Teléfono:</strong> ${order.client_info?.phone || 'N/A'}<br>
        <strong>Total:</strong> ${formatCurrency(order.total)}<br>
        <strong>Notas:</strong> ${order.notes || 'Sin notas'}<br>
        <strong>Productos:</strong><br>
        ${order.products?.map(p => `- ${p.name} (${p.quantity})`).join('<br>') || 'Sin productos'}
    `;
    
    alert(details.replace(/<br>/g, '\n').replace(/<strong>|<\/strong>/g, ''));
}

// ===== REPORTES =====
async function loadReportsPage() {
    try {
        const [salesByEmp, inventoryData] = await Promise.all([
            getSalesByEmployee(),
            getInventoryReport()
        ]);
        
        displaySalesByEmployee(salesByEmp);
        displayInventoryReport(inventoryData);
    } catch (error) {
        console.error('Error loading reports:', error);
        showNotification('Error al cargar reportes', 'error');
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
                    <span>${formatCurrency(empData.total_amount)}</span>
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

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    const modal = document.getElementById('product-modal');
    if (event.target === modal) {
        closeProductModal();
    }
}