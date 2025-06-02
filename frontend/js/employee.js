// Funciones específicas para el panel de empleados

// Variables globales
let products = [];
let myOrders = [];
let mySales = [];
let currentLocation = null;
let orderProducts = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    const user = checkAuth();
    if (!user) return;
    
    // Cargar datos según la página
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard.html')) {
        loadEmployeeDashboard();
    } else if (currentPage.includes('orders.html')) {
        loadOrdersPage();
    } else if (currentPage.includes('sales.html')) {
        loadSalesPage();
    }
});

// ===== DASHBOARD EMPLEADO =====
async function loadEmployeeDashboard() {
    try {
        const [ordersData, salesData] = await Promise.all([
            getOrders(),
            getSales()
        ]);
        
        myOrders = ordersData;
        mySales = salesData;
        
        updateEmployeeStats();
        updateRecentActivity();
        
    } catch (error) {
        console.error('Error loading employee dashboard:', error);
        showNotification('Error al cargar el dashboard', 'error');
    }
}

function updateEmployeeStats() {
    // Pedidos de hoy
    const today = new Date().toDateString();
    const todayOrders = myOrders.filter(order => 
        new Date(order.created_at).toDateString() === today
    ).length;
    
    const todayOrdersElement = document.getElementById('today-orders');
    if (todayOrdersElement) {
        todayOrdersElement.textContent = todayOrders;
    }
    
    // Ventas del mes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlySales = mySales
        .filter(sale => {
            const saleDate = new Date(sale.created_at);
            return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((total, sale) => total + sale.total, 0);
    
    const monthlySalesElement = document.getElementById('monthly-sales');
    if (monthlySalesElement) {
        monthlySalesElement.textContent = formatCurrency(monthlySales);
    }
    
    // Calcular comisiones (ejemplo: 5% de las ventas)
    const user = getUser();
    const commissionRate = user?.commission_rate || 0.05;
    const commissions = monthlySales * commissionRate;
    
    const commissionsElement = document.getElementById('commissions');
    if (commissionsElement) {
        commissionsElement.textContent = formatCurrency(commissions);
    }
}

function updateRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;
    
    // Combinar órdenes y ventas para mostrar actividad reciente
    const recentActivity = [
        ...myOrders.map(order => ({
            type: 'order',
            title: `Pedido ${order.order_number}`,
            subtitle: `${formatCurrency(order.total)} - ${order.status}`,
            date: order.created_at,
            icon: '📝'
        })),
        ...mySales.map(sale => ({
            type: 'sale',
            title: `Venta ${sale.sale_number}`,
            subtitle: `${formatCurrency(sale.total)} - Confirmada`,
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
                <div class="activity-time">${formatDate(activity.date)}</div>
            </div>
        </div>
    `).join('');
}

// ===== GEOLOCALIZACIÓN =====
async function getCurrentLocationForEmployee() {
    const btn = document.getElementById('location-btn');
    
    if (!btn) {
        console.error('Botón de ubicación no encontrado');
        return;
    }
    
    try {
        btn.disabled = true;
        btn.textContent = '📍 Obteniendo...';
        
        const location = await getCurrentLocation();
        currentLocation = location;
        
        btn.textContent = '📍 Ubicación Obtenida';
        btn.style.backgroundColor = '#059669';
        
        showNotification('Ubicación obtenida exitosamente', 'success');
        
    } catch (error) {
        console.error('Error getting location:', error);
        btn.textContent = '📍 Error en Ubicación';
        btn.style.backgroundColor = '#dc2626';
        showNotification('Error al obtener ubicación: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

async function getCurrentLocationForOrder() {
    const btn = document.getElementById('location-btn');
    const status = document.getElementById('location-status');
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = '📍 Obteniendo...';
        }
        
        const location = await getCurrentLocation();
        currentLocation = location;
        
        if (btn) {
            btn.textContent = '📍 Ubicación Obtenida';
            btn.style.backgroundColor = '#059669';
        }
        
        if (status) {
            status.textContent = `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`;
        }
        
        showNotification('Ubicación obtenida exitosamente', 'success');
        
    } catch (error) {
        console.error('Error getting location:', error);
        
        if (btn) {
            btn.textContent = '📍 Error en Ubicación';
            btn.style.backgroundColor = '#dc2626';
        }
        
        if (status) {
            status.textContent = 'Error al obtener ubicación';
        }
        
        showNotification('Error al obtener ubicación: ' + error.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
        }
    }
}

// ===== CREAR PEDIDOS =====
async function loadOrdersPage() {
    try {
        products = await getProducts();
        loadProductSelect();
        setupOrderForm();
    } catch (error) {
        console.error('Error loading orders page:', error);
        showNotification('Error al cargar productos', 'error');
    }
}

function loadProductSelect() {
    const select = document.getElementById('product-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar producto...</option>' +
        products.map(product => 
            `<option value="${product.id}" data-price="${product.price}" data-name="${product.name}">
                ${product.code} - ${product.name} (${product.viscosity}) - ${formatCurrency(product.price)}
            </option>`
        ).join('');
}

function addProductToOrder() {
    const select = document.getElementById('product-select');
    const quantityInput = document.getElementById('product-quantity');
    
    if (!select || !quantityInput) {
        showNotification('Elementos del formulario no encontrados', 'error');
        return;
    }
    
    const productId = parseInt(select.value);
    const quantity = parseInt(quantityInput.value);
    
    if (!productId || !quantity || quantity <= 0) {
        showNotification('Selecciona un producto y cantidad válida', 'warning');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showNotification(`Stock insuficiente. Disponible: ${product.stock}`, 'warning');
        return;
    }
    
    // Verificar si el producto ya está en el pedido
    const existingIndex = orderProducts.findIndex(p => p.product_id === productId);
    
    if (existingIndex >= 0) {
        orderProducts[existingIndex].quantity += quantity;
    } else {
        orderProducts.push({
            product_id: productId,
            name: product.name,
            code: product.code,
            price: product.price,
            quantity: quantity
        });
    }
    
    updateOrderTable();
    
    // Limpiar selección
    select.value = '';
    quantityInput.value = '';
}

function updateOrderTable() {
    const tbody = document.querySelector('#order-products-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = orderProducts.map((product, index) => `
        <tr>
            <td>${product.code} - ${product.name}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.quantity}</td>
            <td>${formatCurrency(product.price * product.quantity)}</td>
            <td>
                <button class="remove-product" onclick="removeProductFromOrder(${index})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
    
    updateOrderTotal();
}

function removeProductFromOrder(index) {
    orderProducts.splice(index, 1);
    updateOrderTable();
}

function updateOrderTotal() {
    const total = orderProducts.reduce((sum, product) => 
        sum + (product.price * product.quantity), 0
    );
    
    const totalElement = document.getElementById('order-total');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }
}

function clearOrder() {
    if (confirm('¿Estás seguro de limpiar el pedido?')) {
        orderProducts = [];
        updateOrderTable();
        
        const form = document.getElementById('order-form');
        if (form) {
            form.reset();
        }
        
        currentLocation = null;
        
        const btn = document.getElementById('location-btn');
        const status = document.getElementById('location-status');
        
        if (btn) {
            btn.textContent = '📍 Obtener Ubicación';
            btn.style.backgroundColor = '#d97706';
        }
        
        if (status) {
            status.textContent = '';
        }
        
        showNotification('Pedido limpiado', 'success');
    }
}

function setupOrderForm() {
    const form = document.getElementById('order-form');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (orderProducts.length === 0) {
            showNotification('Agrega al menos un producto al pedido', 'warning');
            return;
        }
        
        const formData = {
            client_info: {
                name: document.getElementById('client-name')?.value || '',
                phone: document.getElementById('client-phone')?.value || '',
                address: document.getElementById('client-address')?.value || '',
                email: document.getElementById('client-email')?.value || ''
            },
            products: orderProducts,
            location: currentLocation,
            notes: document.getElementById('order-notes')?.value || '',
            total: orderProducts.reduce((sum, product) => 
                sum + (product.price * product.quantity), 0
            )
        };
        
        // Manejar foto si existe
        const photoFile = document.getElementById('order-photo')?.files[0];
        if (photoFile) {
            try {
                const photoBase64 = await handlePhotoUpload(photoFile);
                formData.photo_url = photoBase64;
            } catch (error) {
                console.error('Error uploading photo:', error);
                showNotification('Error al procesar la foto', 'warning');
            }
        }
        
        try {
            const newOrder = await createOrder(formData);
            showNotification('Pedido creado exitosamente', 'success');
            
            // Limpiar formulario
            form.reset();
            orderProducts = [];
            updateOrderTable();
            currentLocation = null;
            
            // Redirigir al dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error creating order:', error);
            showNotification('Error al crear pedido: ' + error.message, 'error');
        }
    });
    
    // Preview de foto
    const photoInput = document.getElementById('order-photo');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('photo-preview');
                    if (preview) {
                        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px; border-radius: 8px;">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// ===== MIS VENTAS =====
async function loadSalesPage() {
    try {
        mySales = await getSales();
        displayMySales();
        updateSalesSummary();
    } catch (error) {
        console.error('Error loading sales:', error);
        showNotification('Error al cargar ventas', 'error');
    }
}

function displayMySales() {
    const tbody = document.querySelector('#sales-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = mySales.map(sale => `
        <tr>
            <td>${sale.sale_number || sale.id}</td>
            <td>${sale.client_info?.name || 'Sin cliente'}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>${sale.payment_info?.method || 'N/A'}</td>
            <td>${formatDate(sale.created_at)}</td>
            <td>${formatCurrency((sale.total * (getUser()?.commission_rate || 0.05)))}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewSaleDetails(${sale.id})">
                    👁️ Ver
                </button>
            </td>
        </tr>
    `).join('');
}

function updateSalesSummary() {
    const totalSales = mySales.length;
    const totalAmount = mySales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Ventas de este mes
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyAmount = mySales
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
        'total-sales-amount': formatCurrency(totalAmount),
        'monthly-sales-amount': formatCurrency(monthlyAmount),
        'commission-amount': formatCurrency(commissionAmount)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function viewSaleDetails(saleId) {
    const sale = mySales.find(s => s.id === saleId);
    
    if (!sale) {
        showNotification('Venta no encontrada', 'error');
        return;
    }
    
    const details = `
        Venta: ${sale.sale_number || sale.id}
        Cliente: ${sale.client_info?.name || 'Sin cliente'}
        Total: ${formatCurrency(sale.total)}
        Método de Pago: ${sale.payment_info?.method || 'N/A'}
        Fecha: ${formatDate(sale.created_at)}
        
        Productos:
        ${sale.products?.map(p => `- ${p.name} (${p.quantity}) - ${formatCurrency(p.price * p.quantity)}`).join('\n') || 'Sin productos'}
    `;
    
    alert(details);
}

function filterSales() {
    // Esta función se puede implementar para filtrar las ventas
    loadSalesPage();
}

function closeSaleDetailsModal() {
    const modal = document.getElementById('sale-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===== UTILIDADES =====
function viewProducts() {
    // Mostrar modal o página con lista de productos disponibles
    if (products.length === 0) {
        showNotification('Cargando productos...', 'info');
        return;
    }
    
    const productsList = products.map(product => 
        `${product.code} - ${product.name} (${product.viscosity}) - Stock: ${product.stock} - ${formatCurrency(product.price)}`
    ).join('\n');
    
    alert(`Productos Disponibles:\n\n${productsList}`);
}