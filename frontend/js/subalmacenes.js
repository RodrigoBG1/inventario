// ===== GESTIÓN DE SUBALMACENES PERMANENTES =====

console.log('🚛 Subalmacenes.js cargado - Sistema Permanente');

// Variables globales
let allTrips = [];
let allEmployees = [];
let allProducts = [];
let selectedProducts = [];
let currentTripForProducts = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Inicializando gestión de subalmacenes permanentes...');
    
    // Verificar que estamos en la página correcta
    if (!window.location.pathname.includes('subalmacenes.html')) {
        return;
    }
    
    // Verificar autenticación y permisos de admin
    const user = checkAuth();
    if (!user || user.role !== 'admin') {
        alert('Acceso denegado. Se requieren permisos de administrador.');
        window.location.href = '/';
        return;
    }
    
    // Mostrar nombre del usuario
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = user.name;
    }
    
    // Cargar datos iniciales
    initializeSubalmacenes();
});

async function initializeSubalmacenes() {
    try {
        console.log('🔄 Cargando datos iniciales de subalmacenes permanentes...');
        
        // Cargar datos en paralelo con manejo de errores individual
        const results = await Promise.allSettled([
            getTripsAPI().catch(error => {
                console.error('❌ Error cargando trips:', error);
                return [];
            }),
            getEmployees().catch(error => {
                console.error('❌ Error cargando employees:', error);
                return [];
            }),
            getProducts().catch(error => {
                console.error('❌ Error cargando products:', error);
                return [];
            })
        ]);
        
        // Procesar resultados
        const [tripsResult, employeesResult, productsResult] = results;
        
        allTrips = tripsResult.status === 'fulfilled' ? tripsResult.value : [];
        allEmployees = employeesResult.status === 'fulfilled' ? employeesResult.value : [];
        allProducts = productsResult.status === 'fulfilled' ? productsResult.value : [];
        
        console.log('✅ Datos cargados:', {
            trips: allTrips.length,
            employees: allEmployees.length,
            products: allProducts.length
        });
        
        // Llenar selectores
        populateEmployeeSelectors();
        populateProductSelector();
        
        // Mostrar viajes
        displayTrips();
        
        if (window.showNotification) {
            window.showNotification('Subalmacenes cargados correctamente', 'success');
        }
        
        console.log('✅ Subalmacenes inicializados correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico cargando subalmacenes:', error);
        
        // Mostrar error detallado
        document.getElementById('trips-container').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                <h3>❌ Error al cargar datos</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px; text-align: left;">
                    <strong>Información de debugging:</strong><br>
                    • API URL: ${window.API_BASE_URL}<br>
                    • Token: ${localStorage.getItem('token') ? 'Presente' : 'Ausente'}<br>
                    • Usuario: ${JSON.parse(localStorage.getItem('user') || '{}')?.name || 'Desconocido'}<br>
                    • Página: ${window.location.pathname}
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button onclick="initializeSubalmacenes()" class="btn btn-primary">
                        🔄 Reintentar
                    </button>
                    <button onclick="testBasicConnectivity()" class="btn btn-warning">
                        🌐 Test Conexión
                    </button>
                </div>
            </div>
        `;
        
        if (window.showNotification) {
            window.showNotification('Error al cargar subalmacenes: ' + error.message, 'error');
        }
    }
}

// ===== FUNCIONES DE API PARA SUBALMACENES PERMANENTES =====
async function getTripsAPI(status = null, employeeId = null) {
    console.log('🔍 getTripsAPI llamado con:', { status, employeeId });
    
    try {
        let url = `${window.API_BASE_URL}/api/trips`;
        const params = new URLSearchParams();
        
        // Solo obtener viajes activos para el sistema permanente
        if (status) params.append('status', status);
        if (employeeId) params.append('employee_id', employeeId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('📡 Haciendo petición a:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('📡 Respuesta recibida:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ Error data:', errorData);
            } catch (e) {
                console.error('❌ No se pudo parsear error JSON');
            }
            throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Datos recibidos:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Error en getTripsAPI:', error);
        throw error;
    }
}

async function addProductToTripAPI(tripId, productData) {
    console.log('➕ addProductToTripAPI llamado con:', { tripId, productData });
    
    try {
        const url = `${window.API_BASE_URL}/api/trips/${tripId}/add-product`;
        console.log('📡 POST a:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(productData)
        });
        
        console.log('📡 Respuesta addProduct:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ Error data:', errorData);
            } catch (e) {
                console.error('❌ No se pudo parsear error JSON');
            }
            throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Producto agregado al viaje:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error adding product to trip:', error);
        throw error;
    }
}

async function removeProductFromTripAPI(tripId, productId) {
    console.log('➖ removeProductFromTripAPI llamado con:', { tripId, productId });
    
    try {
        const url = `${window.API_BASE_URL}/api/trips/${tripId}/remove-product`;
        console.log('📡 DELETE a:', url);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ product_id: productId })
        });
        
        console.log('📡 Respuesta removeProduct:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ Error data:', errorData);
            } catch (e) {
                console.error('❌ No se pudo parsear error JSON');
            }
            throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Producto removido del viaje:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error removing product from trip:', error);
        throw error;
    }
}

async function createTripAPI(tripData) {
    console.log('🚛 createTripAPI llamado con:', tripData);
    
    try {
        const url = `${window.API_BASE_URL}/api/trips`;
        console.log('📡 POST a:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                ...tripData,
                is_permanent: true, // Marcar como permanente
                status: 'active'
            })
        });
        
        console.log('📡 Respuesta createTrip:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ Error data:', errorData);
            } catch (e) {
                console.error('❌ No se pudo parsear error JSON');
            }
            throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Trip permanente creado:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error creating permanent trip:', error);
        throw error;
    }
}

async function getTripInventoryAPI(tripId) {
    console.log('📦 getTripInventoryAPI llamado con:', tripId);
    
    try {
        const url = `${window.API_BASE_URL}/api/trips/${tripId}/inventory`;
        console.log('📡 GET a:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        console.log('📡 Respuesta inventory:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error('❌ Error data:', errorData);
            } catch (e) {
                console.error('❌ No se pudo parsear error JSON');
            }
            throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Inventory obtenido:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error getting trip inventory:', error);
        throw error;
    }
}

// ===== MOSTRAR VIAJES PERMANENTES =====
function displayTrips() {
    const container = document.getElementById('trips-container');
    
    if (!allTrips || allTrips.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--secondary-color);">
                <h3>No hay subalmacenes activos</h3>
                <p>Crea el primer subalmacén para comenzar a gestionar inventarios móviles</p>
                <button onclick="openNewTripModal()" class="btn btn-primary">
                    Crear Primer Subalmacén
                </button>
            </div>
        `;
        return;
    }
    
    // Filtrar viajes activos (permanentes)
    const activeTrips = allTrips.filter(trip => trip.status === 'active');
    
    if (activeTrips.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--secondary-color);">
                <h3>🔍 No hay subalmacenes activos</h3>
                <button onclick="openNewTripModal()" class="btn btn-primary">
                    ➕ Crear Subalmacén
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activeTrips.map(trip => createTripCard(trip)).join('');
    
    console.log('✅ Subalmacenes mostrados:', activeTrips.length);
}

function createTripCard(trip) {
    const inventory = trip.substore_inventory || [];
    
    // Calcular estadísticas
    const stats = {
        totalProducts: inventory.length,
        totalCurrent: inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0),
        totalSold: inventory.reduce((sum, item) => sum + (item.sold_quantity || 0), 0),
        totalValue: inventory.reduce((sum, item) => sum + ((item.current_quantity || 0) * (item.price || 0)), 0),
        soldValue: inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.price || 0)), 0)
    };
    
    return `
        <div class="trip-card">
            <div class="trip-header">
                <div class="trip-info">
                    <h3> ${trip.trip_number}</h3>
                    <div class="trip-meta">
                         ${trip.employee_name} (${trip.employee_code}) • 
                         Desde ${formatDate(trip.start_date || trip.created_at)}
                        ${trip.notes ? ` •  ${trip.notes}` : ''}
                    </div>
                </div>
                <div class="trip-status status-active">
                    🟢 Activo
                </div>
            </div>
            
            <div class="trip-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.totalProducts}</span>
                    <span class="stat-label">Tipos de Producto</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.totalCurrent}</span>
                    <span class="stat-label">En Stock</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.totalSold}</span>
                    <span class="stat-label">Vendidos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${formatCurrency(stats.totalValue)}</span>
                    <span class="stat-label">Valor Stock</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${formatCurrency(stats.soldValue)}</span>
                    <span class="stat-label">Total Vendido</span>
                </div>
            </div>
            
            ${inventory.length > 0 ? `
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Actual</th>
                            <th>Vendido</th>
                            <th>Precio</th>
                            <th>Valor</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.map(item => `
                            <tr>
                                <td>
                                    <strong>${item.product_code}</strong><br>
                                    <small>${item.product_name}</small>
                                </td>
                                <td class="${getQuantityClass(item.current_quantity)}">
                                    ${item.current_quantity || 0}
                                </td>
                                <td>${item.sold_quantity || 0}</td>
                                <td>${formatCurrency(item.price || 0)}</td>
                                <td>${formatCurrency((item.current_quantity || 0) * (item.price || 0))}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning" onclick="addMoreProduct(${trip.id}, ${item.product_id})" title="Agregar más cantidad">
                                        ➕
                                    </button>
                                    ${(item.current_quantity || 0) === 0 ? `
                                        <button class="btn btn-sm btn-danger" onclick="removeProductFromTrip(${trip.id}, ${item.product_id})" title="Quitar producto sin stock">
                                            🗑️
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div style="text-align: center; padding: 1rem; color: var(--secondary-color); font-style: italic;">
                    📦 No hay productos cargados en este subalmacén
                </div>
            `}
            
            <div class="trip-actions">
                <button class="btn btn-sm btn-primary" onclick="viewTripDetails(${trip.id})">
                    Ver Detalles
                </button>
                <button class="btn btn-sm btn-success" onclick="openAddProductModal(${trip.id})">
                    Agregar Producto
                </button>
                <button class="btn btn-sm btn-secondary" onclick="downloadTripReport(${trip.id})">
                    Reporte
                </button>
            </div>
        </div>
    `;
}

function getQuantityClass(quantity) {
    if (!quantity || quantity === 0) return 'quantity-danger';
    if (quantity <= 5) return 'quantity-warning';
    return '';
}

// ===== FILTROS =====
function populateEmployeeSelectors() {
    console.log('👥 Poblando selectores de empleados...');
    
    const employeeFilter = document.getElementById('employee-filter');
    const tripEmployee = document.getElementById('trip-employee');
    
    // Filtrar solo empleados (no admins)
    const employees = allEmployees.filter(emp => emp.role === 'employee');
    
    console.log('👥 Empleados encontrados:', employees.length);
    
    if (employees.length === 0) {
        console.warn('⚠️ No hay empleados disponibles');
        
        // Mostrar mensaje en los selectores
        const noEmployeesOption = '<option value="">No hay empleados disponibles</option>';
        
        if (employeeFilter) {
            employeeFilter.innerHTML = '<option value="">Todos</option>' + noEmployeesOption;
        }
        
        if (tripEmployee) {
            tripEmployee.innerHTML = noEmployeesOption;
        }
        
        return;
    }
    
    const employeeOptions = employees
        .map(emp => `<option value="${emp.id}">${emp.name} (${emp.employee_code})</option>`)
        .join('');
    
    if (employeeFilter) {
        employeeFilter.innerHTML = '<option value="">Todos</option>' + employeeOptions;
        console.log('✅ Employee filter poblado');
    }
    
    if (tripEmployee) {
        tripEmployee.innerHTML = '<option value="">Seleccionar empleado...</option>' + employeeOptions;
        console.log('✅ Trip employee selector poblado');
    }
}

function populateProductSelector() {
    console.log('📦 Poblando selector de productos...');
    
    const productSelect = document.getElementById('product-select');
    if (!productSelect) {
        console.warn('⚠️ Selector de productos no encontrado');
        return;
    }
    
    // Filtrar productos con stock
    const productsWithStock = allProducts.filter(product => product.stock > 0);
    
    console.log('📦 Productos con stock:', productsWithStock.length, 'de', allProducts.length);
    
    if (productsWithStock.length === 0) {
        productSelect.innerHTML = '<option value="">No hay productos con stock disponible</option>';
        console.warn('⚠️ No hay productos con stock');
        return;
    }
    
    const productOptions = productsWithStock
        .map(product => `
            <option value="${product.id}" data-code="${product.code}" data-name="${product.name}" data-stock="${product.stock}" data-price="${product.price}">
                ${product.code} - ${product.name} (Stock: ${product.stock})
            </option>
        `)
        .join('');
    
    productSelect.innerHTML = '<option value="">Seleccionar producto...</option>' + productOptions;
    console.log('✅ Product selector poblado');
}

function filterTripsData() {
    const employeeFilter = document.getElementById('employee-filter')?.value;
    
    return allTrips.filter(trip => {
        if (trip.status !== 'active') return false; // Solo mostrar activos
        if (employeeFilter && trip.employee_id !== parseInt(employeeFilter)) return false;
        return true;
    });
}

function filterTrips() {
    displayTrips();
}

function clearFilters() {
    document.getElementById('employee-filter').value = '';
    displayTrips();
}

// ===== MODAL NUEVO SUBALMACÉN =====
function openNewTripModal() {
    selectedProducts = [];
    updateSelectedProductsDisplay();
    document.getElementById('new-trip-modal').style.display = 'flex';
}

function closeNewTripModal() {
    document.getElementById('new-trip-modal').style.display = 'none';
    document.getElementById('new-trip-form').reset();
    selectedProducts = [];
}

function addProductToTrip() {
    const productSelect = document.getElementById('product-select');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    
    if (!selectedOption.value) {
        if (window.showNotification) {
            window.showNotification('Selecciona un producto', 'warning');
        }
        return;
    }
    
    const productId = parseInt(selectedOption.value);
    
    // Verificar si ya está agregado
    if (selectedProducts.find(p => p.product_id === productId)) {
        if (window.showNotification) {
            window.showNotification('El producto ya está agregado', 'warning');
        }
        return;
    }
    
    const product = {
        product_id: productId,
        code: selectedOption.dataset.code,
        name: selectedOption.dataset.name,
        stock: parseInt(selectedOption.dataset.stock),
        price: parseFloat(selectedOption.dataset.price),
        quantity: 1
    };
    
    selectedProducts.push(product);
    updateSelectedProductsDisplay();
    
    // Reset selector
    productSelect.selectedIndex = 0;
}

function updateSelectedProductsDisplay() {
    const container = document.getElementById('selected-products');
    
    if (selectedProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--secondary-color); font-style: italic;">
                No hay productos seleccionados
            </div>
        `;
        return;
    }
    
    container.innerHTML = selectedProducts.map((product, index) => `
        <div class="product-item">
            <div class="product-info">
                <strong>${product.code}</strong> - ${product.name}<br>
                <small>Stock disponible: ${product.stock}</small>
            </div>
            <div class="product-controls">
                <div class="quantity-control">
                    <label>Cantidad:</label>
                    <input type="number" class="quantity-input" 
                           min="1" max="${product.stock}" 
                           value="${product.quantity}"
                           onchange="updateProductQuantity(${index}, this.value)">
                </div>
                <button type="button" onclick="removeProductFromSelection(${index})" 
                        class="btn btn-sm btn-danger">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function updateProductQuantity(index, quantity) {
    const qty = parseInt(quantity);
    const product = selectedProducts[index];
    
    if (qty <= 0) {
        if (window.showNotification) {
            window.showNotification('La cantidad debe ser mayor a 0', 'warning');
        }
        return;
    }
    
    if (qty > product.stock) {
        if (window.showNotification) {
            window.showNotification(`Cantidad máxima disponible: ${product.stock}`, 'warning');
        }
        return;
    }
    
    selectedProducts[index].quantity = qty;
}

function removeProductFromSelection(index) {
    selectedProducts.splice(index, 1);
    updateSelectedProductsDisplay();
}

async function createTrip() {
    try {
        const employeeSelect = document.getElementById('trip-employee');
        const employeeId = employeeSelect.value;
        const notes = document.getElementById('trip-notes').value.trim();
        
        // Validaciones
        if (!employeeId) {
            if (window.showNotification) {
                window.showNotification('Selecciona un empleado', 'warning');
            }
            return;
        }
        
        if (selectedProducts.length === 0) {
            if (window.showNotification) {
                window.showNotification('Agrega al menos un producto', 'warning');
            }
            return;
        }
        
        // Obtener información del empleado
        const employee = allEmployees.find(emp => emp.id === parseInt(employeeId));
        if (!employee) {
            if (window.showNotification) {
                window.showNotification('Empleado no encontrado', 'error');
            }
            return;
        }
        
        // Preparar datos del viaje permanente
        const tripData = {
            employee_id: parseInt(employeeId),
            employee_code: employee.employee_code,
            notes: notes,
            products: selectedProducts.map(p => ({
                product_id: p.product_id,
                quantity: p.quantity,
                price: p.price
            }))
        };
        
        console.log('🚛 Creando subalmacén permanente:', tripData);
        
        // Deshabilitar botón
        const createBtn = document.querySelector('[onclick="createTrip()"]');
        const originalText = createBtn.textContent;
        createBtn.disabled = true;
        createBtn.textContent = '🔄 Creando...';
        
        try {
            const result = await createTripAPI(tripData);
            
            console.log('✅ Subalmacén permanente creado exitosamente:', result);
            
            if (window.showNotification) {
                window.showNotification('Subalmacén permanente creado exitosamente', 'success');
            }
            
            // Mostrar confirmación detallada
            alert(`✅ SUBALMACÉN PERMANENTE CREADO

 Número: ${result.trip.trip_number}
 Empleado: ${employee.name}
 Productos: ${selectedProducts.length}
 Notas: ${notes || 'Sin notas'}

Los productos han sido transferidos al subalmacén del empleado.
Este subalmacén permanecerá activo de forma permanente.`);
            
            // Cerrar modal y recargar
            closeNewTripModal();
            await loadTrips();
            
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = originalText;
        }
        
    } catch (error) {
        console.error('❌ Error creando subalmacén permanente:', error);
        
        if (window.showNotification) {
            window.showNotification('Error creando subalmacén: ' + error.message, 'error');
        }
        
        // Mostrar error detallado
        alert(`❌ Error al crear el subalmacén:

${error.message}

Verifica que:
- El empleado seleccionado existe
- Hay suficiente stock de todos los productos
- Tu conexión a internet funciona correctamente

Intenta nuevamente o contacta al administrador.`);
    }
}

// ===== MODAL AGREGAR PRODUCTO A SUBALMACÉN =====
function openAddProductModal(tripId) {
    currentTripForProducts = tripId;
    
    // Encontrar el trip
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) {
        if (window.showNotification) {
            window.showNotification('Subalmacén no encontrado', 'error');
        }
        return;
    }
    
    // Obtener productos que ya están en el subalmacén
    const currentInventory = trip.substore_inventory || [];
    const productsInTrip = currentInventory.map(item => item.product_id);
    
    // Filtrar productos disponibles (que no están en el subalmacén)
    const availableProducts = allProducts.filter(product => 
        product.stock > 0 && !productsInTrip.includes(product.id)
    );
    
    const container = document.getElementById('add-product-content');
    
    if (availableProducts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">
                <h4 style="color: #0369a1; margin-bottom: 1rem;">📦 No hay productos disponibles</h4>
                <p style="color: #0369a1;">Todos los productos con stock ya están en este subalmacén, o no hay stock disponible en el almacén principal.</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h4>Subalmacén: ${trip.trip_number}</h4>
                <p><strong>Empleado:</strong> ${trip.employee_name}</p>
                <p style="color: var(--secondary-color);">Selecciona un producto para agregar al subalmacén:</p>
            </div>
            
            <div class="form-group">
                <label for="add-product-select">Producto:</label>
                <select id="add-product-select">
                    <option value="">Seleccionar producto...</option>
                    ${availableProducts.map(product => `
                        <option value="${product.id}" data-code="${product.code}" data-name="${product.name}" data-stock="${product.stock}" data-price="${product.price}">
                            ${product.code} - ${product.name} (Stock: ${product.stock})
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label for="add-product-quantity">Cantidad a transferir:</label>
                <input type="number" id="add-product-quantity" min="1" value="1" 
                       placeholder="Cantidad">
            </div>
            
            <div class="form-group">
                <label for="add-product-price">Precio de venta:</label>
                <input type="number" id="add-product-price" step="0.01" min="0" 
                       placeholder="0.00">
            </div>
            
            <div style="background: #fef3c7; padding: 1rem; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 1.5rem;">
                <strong>📋 Nota:</strong> El producto se transferirá desde el almacén principal al subalmacén. 
                Asegúrate de que la cantidad sea correcta antes de confirmar.
            </div>
        `;
        
        // Event listener para actualizar precio automáticamente
        const productSelect = document.getElementById('add-product-select');
        const priceInput = document.getElementById('add-product-price');
        const quantityInput = document.getElementById('add-product-quantity');
        
        productSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption.value) {
                priceInput.value = selectedOption.dataset.price;
                quantityInput.max = selectedOption.dataset.stock;
            }
        });
    }
    
    document.getElementById('add-product-modal').style.display = 'flex';
}

function closeAddProductModal() {
    document.getElementById('add-product-modal').style.display = 'none';
    currentTripForProducts = null;
}

async function confirmAddProduct() {
    if (!currentTripForProducts) return;
    
    try {
        const productSelect = document.getElementById('add-product-select');
        const quantityInput = document.getElementById('add-product-quantity');
        const priceInput = document.getElementById('add-product-price');
        
        const productId = parseInt(productSelect.value);
        const quantity = parseInt(quantityInput.value);
        const price = parseFloat(priceInput.value);
        
        // Validaciones
        if (!productId) {
            if (window.showNotification) {
                window.showNotification('Selecciona un producto', 'warning');
            }
            return;
        }
        
        if (!quantity || quantity <= 0) {
            if (window.showNotification) {
                window.showNotification('Ingresa una cantidad válida', 'warning');
            }
            return;
        }
        
        if (!price || price <= 0) {
            if (window.showNotification) {
                window.showNotification('Ingresa un precio válido', 'warning');
            }
            return;
        }
        
        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const maxStock = parseInt(selectedOption.dataset.stock);
        
        if (quantity > maxStock) {
            if (window.showNotification) {
                window.showNotification(`Cantidad máxima disponible: ${maxStock}`, 'warning');
            }
            return;
        }
        
        console.log('➕ Agregando producto al subalmacén:', { 
            tripId: currentTripForProducts, 
            productId, 
            quantity, 
            price 
        });
        
        // Deshabilitar botón
        const confirmBtn = document.querySelector('[onclick="confirmAddProduct()"]');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = '🔄 Agregando...';
        
        try {
            const result = await addProductToTripAPI(currentTripForProducts, {
                product_id: productId,
                quantity: quantity,
                price: price
            });
            
            console.log('✅ Producto agregado exitosamente:', result);
            
            if (window.showNotification) {
                window.showNotification('Producto agregado al subalmacén exitosamente', 'success');
            }
            
            // Mostrar confirmación
            const productName = selectedOption.dataset.name;
            const productCode = selectedOption.dataset.code;
            
            alert(`✅ PRODUCTO AGREGADO AL SUBALMACÉN

 Producto: ${productCode} - ${productName}
 Cantidad: ${quantity}
 Precio: ${formatCurrency(price)}
 Total transferido: ${formatCurrency(price * quantity)}

El producto ha sido transferido al subalmacén correctamente.`);
            
            // Cerrar modal y recargar
            closeAddProductModal();
            await loadTrips();
            
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }
        
    } catch (error) {
        console.error('❌ Error agregando producto al subalmacén:', error);
        
        if (window.showNotification) {
            window.showNotification('Error agregando producto: ' + error.message, 'error');
        }
        
        alert(`❌ Error al agregar el producto:

${error.message}

Verifica tu conexión e intenta nuevamente.`);
    }
}

// ===== FUNCIONES ADICIONALES =====
async function addMoreProduct(tripId, productId) {
    // Encontrar el producto en el almacén principal
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        if (window.showNotification) {
            window.showNotification('Producto no encontrado', 'error');
        }
        return;
    }
    
    if (product.stock <= 0) {
        if (window.showNotification) {
            window.showNotification('No hay stock disponible en el almacén principal', 'warning');
        }
        return;
    }
    
    const quantity = prompt(`Agregar más cantidad de ${product.name}\n\nStock disponible en almacén principal: ${product.stock}\n\n¿Cuántas unidades agregar?`, '1');
    
    if (!quantity || parseInt(quantity) <= 0) {
        return;
    }
    
    const qty = parseInt(quantity);
    if (qty > product.stock) {
        if (window.showNotification) {
            window.showNotification(`Solo hay ${product.stock} unidades disponibles`, 'warning');
        }
        return;
    }
    
    try {
        const result = await addProductToTripAPI(tripId, {
            product_id: productId,
            quantity: qty,
            price: product.price
        });
        
        if (window.showNotification) {
            window.showNotification(`${qty} unidades agregadas exitosamente`, 'success');
        }
        
        await loadTrips();
        
    } catch (error) {
        console.error('❌ Error agregando más producto:', error);
        if (window.showNotification) {
            window.showNotification('Error: ' + error.message, 'error');
        }
    }
}

async function removeProductFromTrip(tripId, productId) {
    const trip = allTrips.find(t => t.id === tripId);
    const inventory = trip?.substore_inventory || [];
    const item = inventory.find(i => i.product_id === productId);
    
    if (!item) {
        if (window.showNotification) {
            window.showNotification('Producto no encontrado en el subalmacén', 'error');
        }
        return;
    }
    
    if (item.current_quantity > 0) {
        if (window.showNotification) {
            window.showNotification('No se puede quitar un producto que aún tiene stock', 'warning');
        }
        return;
    }
    
    if (!confirm(`¿Confirmar eliminación del producto "${item.product_name}" del subalmacén?\n\nEste producto ya no tiene stock disponible.`)) {
        return;
    }
    
    try {
        await removeProductFromTripAPI(tripId, productId);
        
        if (window.showNotification) {
            window.showNotification('Producto eliminado del subalmacén', 'success');
        }
        
        await loadTrips();
        
    } catch (error) {
        console.error('❌ Error removiendo producto:', error);
        if (window.showNotification) {
            window.showNotification('Error: ' + error.message, 'error');
        }
    }
}

async function loadTrips() {
    try {
        console.log('🔄 Recargando subalmacenes...');
        
        const tripsData = await getTripsAPI();
        allTrips = tripsData || [];
        
        displayTrips();
        
        console.log('✅ Subalmacenes recargados:', allTrips.length);
        
    } catch (error) {
        console.error('❌ Error recargando subalmacenes:', error);
        if (window.showNotification) {
            window.showNotification('Error al recargar subalmacenes', 'error');
        }
    }
}

function viewTripDetails(tripId) {
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;
    
    const inventory = trip.substore_inventory || [];
    
    const details = `
DETALLES DEL SUBALMACÉN PERMANENTE
==================================

Número: ${trip.trip_number}
Empleado: ${trip.employee_name} (${trip.employee_code})
Inicio: ${formatDate(trip.start_date || trip.created_at)}
Estado: Activo
Notas: ${trip.notes || 'Sin notas'}

INVENTARIO ACTUAL:
==================
${inventory.length > 0 ? inventory.map(item => 
    `• ${item.product_code} - ${item.product_name}
  Stock Actual: ${item.current_quantity || 0} | Total Vendido: ${item.sold_quantity || 0}
  Precio: ${formatCurrency(item.price || 0)} | Valor en Stock: ${formatCurrency((item.current_quantity || 0) * (item.price || 0))}`
).join('\n\n') : 'Sin productos'}

ESTADÍSTICAS:
=============
 Tipos de productos: ${inventory.length}
 Total en stock: ${inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0)}
 Total vendido: ${inventory.reduce((sum, item) => sum + (item.sold_quantity || 0), 0)}
 Valor actual: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.current_quantity || 0) * (item.price || 0)), 0))}
 Total vendido: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.price || 0)), 0))}

GESTIÓN:
========
- Este es un subalmacén permanente
- Los productos se agregan dinámicamente
- Cuando un producto se agota, se puede quitar del subalmacén
- Se pueden agregar más unidades de productos existentes
    `;
    
    alert(details);
}

function downloadTripReport(tripId) {
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;
    
    const inventory = trip.substore_inventory || [];
    
    // Crear contenido del reporte
    const reportContent = `
REPORTE DE SUBALMACÉN PERMANENTE - ${trip.trip_number}
====================================================

INFORMACIÓN GENERAL:
- Subalmacén: ${trip.trip_number}
- Empleado: ${trip.employee_name} (${trip.employee_code})
- Estado: Activo
- Fecha inicio: ${formatDate(trip.start_date || trip.created_at)}
- Notas: ${trip.notes || 'Sin notas'}

INVENTARIO DETALLADO:
=====================
${inventory.map(item => `
Producto: ${item.product_code} - ${item.product_name}
- Cantidad en stock: ${item.current_quantity || 0}
- Cantidad vendida: ${item.sold_quantity || 0}
- Precio unitario: ${formatCurrency(item.price || 0)}
- Valor en stock: ${formatCurrency((item.current_quantity || 0) * (item.price || 0))}
- Valor total vendido: ${formatCurrency((item.sold_quantity || 0) * (item.price || 0))}
`).join('\n')}

RESUMEN FINANCIERO:
==================
- Total tipos de productos: ${inventory.length}
- Unidades en stock: ${inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0)}
- Unidades vendidas: ${inventory.reduce((sum, item) => sum + (item.sold_quantity || 0), 0)}
- Valor total en stock: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.current_quantity || 0) * (item.price || 0)), 0))}
- Valor total vendido: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.price || 0)), 0))}

OBSERVACIONES:
==============
- Este es un subalmacén permanente que se mantiene activo de forma continua
- Los productos se pueden agregar y quitar dinámicamente según las necesidades
- Las ventas se descuentan automáticamente del inventario del subalmacén

Reporte generado: ${new Date().toLocaleString()}
Sistema de Aceites - Gestión de Subalmacenes Permanentes
    `.trim();
    
    // Descargar como archivo de texto
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Subalmacen_${trip.trip_number}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    if (window.showNotification) {
        window.showNotification('Reporte descargado exitosamente', 'success');
    }
}

// ===== FUNCIONES DE UTILIDAD =====
function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

async function testBasicConnectivity() {
    console.log('🌐 Testeando conectividad básica...');
    
    try {
        // Test 1: Verificar API base
        console.log('🔄 Test 1: API base...');
        const testResponse = await fetch(`${window.API_BASE_URL}/test`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ Test 1 exitoso:', testData.message);
        } else {
            console.log('❌ Test 1 falló:', testResponse.status, testResponse.statusText);
        }
        
        // Test 2: Verificar autenticación
        console.log('🔄 Test 2: Autenticación...');
        const authResponse = await fetch(`${window.API_BASE_URL}/api/products`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (authResponse.status === 401) {
            console.log('❌ Test 2: Token inválido o expirado');
            if (confirm('Tu sesión ha expirado. ¿Quieres ir al login?')) {
                window.location.href = '/';
            }
        } else if (authResponse.ok || authResponse.status === 200) {
            console.log('✅ Test 2: Autenticación válida');
        } else {
            console.log('⚠️ Test 2: Respuesta inesperada:', authResponse.status);
        }
        
        // Test 3: Verificar endpoint específico de trips
        console.log('🔄 Test 3: Endpoint de trips...');
        const tripsResponse = await fetch(`${window.API_BASE_URL}/api/trips`, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (tripsResponse.status === 404) {
            console.log('❌ Test 3: Endpoint /api/trips no existe');
            alert('❌ ERROR CRÍTICO:\n\nEl endpoint /api/trips no existe en el servidor.\n\nEsto indica que las rutas de subalmacenes no están configuradas correctamente en index.js.\n\nContacta al administrador del sistema.');
        } else if (tripsResponse.ok || tripsResponse.status === 200) {
            console.log('✅ Test 3: Endpoint de trips disponible');
        } else {
            console.log('⚠️ Test 3: Respuesta inesperada:', tripsResponse.status);
        }
        
        console.log('🌐 Test de conectividad completado');
        
    } catch (error) {
        console.error('❌ Error en test de conectividad:', error);
        alert(`❌ ERROR DE CONECTIVIDAD:\n\n${error.message}\n\nVerifica:\n1. Que el servidor esté funcionando\n2. Tu conexión a internet\n3. La configuración de la aplicación`);
    }
}

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.openNewTripModal = openNewTripModal;
window.closeNewTripModal = closeNewTripModal;
window.addProductToTrip = addProductToTrip;
window.updateProductQuantity = updateProductQuantity;
window.removeProductFromSelection = removeProductFromSelection;
window.createTrip = createTrip;
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.confirmAddProduct = confirmAddProduct;
window.addMoreProduct = addMoreProduct;
window.removeProductFromTrip = removeProductFromTrip;
window.loadTrips = loadTrips;
window.viewTripDetails = viewTripDetails;
window.downloadTripReport = downloadTripReport;
window.filterTrips = filterTrips;
window.clearFilters = clearFilters;
window.testBasicConnectivity = testBasicConnectivity;
window.initializeSubalmacenes = initializeSubalmacenes;

console.log('✅ Subalmacenes Permanentes.js inicializado correctamente');