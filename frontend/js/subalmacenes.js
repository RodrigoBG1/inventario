// ===== GESTIÓN DE SUBALMACENES =====

console.log('🚛 Subalmacenes.js cargado');

// Variables globales
let allTrips = [];
let allEmployees = [];
let allProducts = [];
let selectedProducts = [];
let currentTripForCompletion = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Inicializando gestión de subalmacenes...');
    
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
        console.log('🔄 Cargando datos iniciales...');
        
        // Cargar datos en paralelo
        const [tripsData, employeesData, productsData] = await Promise.all([
            getTrips(),
            getEmployees(),
            getProducts()
        ]);
        
        allTrips = tripsData || [];
        allEmployees = employeesData || [];
        allProducts = productsData || [];
        
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
        
    } catch (error) {
        console.error('❌ Error cargando subalmacenes:', error);
        
        document.getElementById('trips-container').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                <h3>❌ Error al cargar datos</h3>
                <p>${error.message}</p>
                <button onclick="initializeSubalmacenes()" class="btn btn-primary">
                    🔄 Reintentar
                </button>
            </div>
        `;
        
        if (window.showNotification) {
            window.showNotification('Error al cargar subalmacenes: ' + error.message, 'error');
        }
    }
}

// ===== FUNCIONES DE API PARA SUBALMACENES =====
async function getTrips(status = null, employeeId = null) {
    try {
        let url = `${window.API_BASE_URL}/api/trips`;
        const params = new URLSearchParams();
        
        if (status) params.append('status', status);
        if (employeeId) params.append('employee_id', employeeId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo viajes:', error);
        throw error;
    }
}

async function createTripAPI(tripData) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/trips`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(tripData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error creando viaje:', error);
        throw error;
    }
}

async function completeTripAPI(tripId, returnProducts = []) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/trips/${tripId}/complete`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                return_products: returnProducts
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error completando viaje:', error);
        throw error;
    }
}

async function getTripInventory(tripId) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/trips/${tripId}/inventory`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error obteniendo inventario del viaje:', error);
        throw error;
    }
}

// ===== MOSTRAR VIAJES =====
function displayTrips() {
    const container = document.getElementById('trips-container');
    
    if (!allTrips || allTrips.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--secondary-color);">
                <h3>🚛 No hay viajes registrados</h3>
                <p>Crea el primer viaje para comenzar a gestionar subalmacenes</p>
                <button onclick="openNewTripModal()" class="btn btn-primary">
                    🚛 Crear Primer Viaje
                </button>
            </div>
        `;
        return;
    }
    
    // Filtrar viajes
    const filteredTrips = filterTripsData();
    
    if (filteredTrips.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--secondary-color);">
                <h3>🔍 No hay viajes que coincidan con los filtros</h3>
                <button onclick="clearFilters()" class="btn btn-secondary">
                    Limpiar Filtros
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTrips.map(trip => createTripCard(trip)).join('');
    
    console.log('✅ Viajes mostrados:', filteredTrips.length);
}

function createTripCard(trip) {
    const statusClass = trip.status === 'active' ? 'status-active' : 'status-completed';
    const inventory = trip.substore_inventory || [];
    
    // Calcular estadísticas
    const stats = {
        totalProducts: inventory.length,
        totalInitial: inventory.reduce((sum, item) => sum + (item.initial_quantity || 0), 0),
        totalCurrent: inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0),
        totalSold: inventory.reduce((sum, item) => sum + (item.sold_quantity || 0), 0),
        totalValue: inventory.reduce((sum, item) => sum + ((item.current_quantity || 0) * (item.price || 0)), 0),
        soldValue: inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.price || 0)), 0)
    };
    
    return `
        <div class="trip-card">
            <div class="trip-header">
                <div class="trip-info">
                    <h3>${trip.trip_number}</h3>
                    <div class="trip-meta">
                        👤 ${trip.employee_name} (${trip.employee_code}) • 
                        📅 ${formatDate(trip.start_date || trip.created_at)}
                        ${trip.notes ? ` • 📝 ${trip.notes}` : ''}
                    </div>
                </div>
                <div class="trip-status ${statusClass}">
                    ${trip.status === 'active' ? '🟢 Activo' : '🔵 Completado'}
                </div>
            </div>
            
            <div class="trip-stats">
                <div class="stat-item">
                    <span class="stat-value">${stats.totalProducts}</span>
                    <span class="stat-label">Productos</span>
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
                    <span class="stat-label">Valor Ventas</span>
                </div>
            </div>
            
            ${inventory.length > 0 ? `
                <table class="inventory-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Inicial</th>
                            <th>Actual</th>
                            <th>Vendido</th>
                            <th>Precio</th>
                            <th>Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.map(item => `
                            <tr>
                                <td>
                                    <strong>${item.product_code}</strong><br>
                                    <small>${item.product_name}</small>
                                </td>
                                <td>${item.initial_quantity || 0}</td>
                                <td class="${getQuantityClass(item.current_quantity, item.initial_quantity)}">
                                    ${item.current_quantity || 0}
                                </td>
                                <td>${item.sold_quantity || 0}</td>
                                <td>${formatCurrency(item.price || 0)}</td>
                                <td>${formatCurrency((item.current_quantity || 0) * (item.price || 0))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div style="text-align: center; padding: 1rem; color: var(--secondary-color); font-style: italic;">
                    📦 No hay productos cargados en este viaje
                </div>
            `}
            
            <div class="trip-actions">
                <button class="btn btn-sm btn-primary" onclick="viewTripDetails(${trip.id})">
                    👁️ Ver Detalles
                </button>
                ${trip.status === 'active' ? `
                    <button class="btn btn-sm btn-warning" onclick="openCompleteTripModal(${trip.id})">
                        🏁 Finalizar Viaje
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-secondary" onclick="downloadTripReport(${trip.id})">
                    📄 Reporte
                </button>
            </div>
        </div>
    `;
}

function getQuantityClass(current, initial) {
    if (!initial || initial === 0) return '';
    
    const percentage = (current / initial) * 100;
    
    if (percentage === 0) return 'quantity-danger';
    if (percentage <= 25) return 'quantity-warning';
    return '';
}

// ===== FILTROS =====
function populateEmployeeSelectors() {
    const employeeFilter = document.getElementById('employee-filter');
    const tripEmployee = document.getElementById('trip-employee');
    
    const employeeOptions = allEmployees
        .filter(emp => emp.role === 'employee')
        .map(emp => `<option value="${emp.id}">${emp.name} (${emp.employee_code})</option>`)
        .join('');
    
    if (employeeFilter) {
        employeeFilter.innerHTML = '<option value="">Todos</option>' + employeeOptions;
    }
    
    if (tripEmployee) {
        tripEmployee.innerHTML = '<option value="">Seleccionar empleado...</option>' + employeeOptions;
    }
}

function populateProductSelector() {
    const productSelect = document.getElementById('product-select');
    if (!productSelect) return;
    
    const productOptions = allProducts
        .filter(product => product.stock > 0)
        .map(product => `
            <option value="${product.id}" data-code="${product.code}" data-name="${product.name}" data-stock="${product.stock}" data-price="${product.price}">
                ${product.code} - ${product.name} (Stock: ${product.stock})
            </option>
        `)
        .join('');
    
    productSelect.innerHTML = '<option value="">Seleccionar producto...</option>' + productOptions;
}

function filterTripsData() {
    const statusFilter = document.getElementById('status-filter')?.value;
    const employeeFilter = document.getElementById('employee-filter')?.value;
    
    return allTrips.filter(trip => {
        if (statusFilter && trip.status !== statusFilter) return false;
        if (employeeFilter && trip.employee_id !== parseInt(employeeFilter)) return false;
        return true;
    });
}

function filterTrips() {
    displayTrips();
}

function clearFilters() {
    document.getElementById('status-filter').value = '';
    document.getElementById('employee-filter').value = '';
    displayTrips();
}

// ===== MODAL NUEVO VIAJE =====
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
                <button type="button" onclick="removeProductFromTrip(${index})" 
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

function removeProductFromTrip(index) {
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
        
        // Preparar datos del viaje
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
        
        console.log('🚛 Creando viaje:', tripData);
        
        // Deshabilitar botón
        const createBtn = document.querySelector('[onclick="createTrip()"]');
        const originalText = createBtn.textContent;
        createBtn.disabled = true;
        createBtn.textContent = '🔄 Creando...';
        
        try {
            const result = await createTripAPI(tripData);
            
            console.log('✅ Viaje creado exitosamente:', result);
            
            if (window.showNotification) {
                window.showNotification('Viaje creado exitosamente', 'success');
            }
            
            // Mostrar confirmación detallada
            alert(`✅ VIAJE CREADO EXITOSAMENTE

🚛 Número: ${result.trip.trip_number}
👤 Empleado: ${employee.name}
📦 Productos: ${selectedProducts.length}
📝 Notas: ${notes || 'Sin notas'}

Los productos han sido transferidos al subalmacén del empleado.`);
            
            // Cerrar modal y recargar
            closeNewTripModal();
            await loadTrips();
            
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = originalText;
        }
        
    } catch (error) {
        console.error('❌ Error creando viaje:', error);
        
        if (window.showNotification) {
            window.showNotification('Error creando viaje: ' + error.message, 'error');
        }
        
        // Mostrar error detallado
        alert(`❌ Error al crear el viaje:

${error.message}

Verifica que:
- El empleado seleccionado existe
- Hay suficiente stock de todos los productos
- Tu conexión a internet funciona correctamente

Intenta nuevamente o contacta al administrador.`);
    }
}

// ===== MODAL FINALIZAR VIAJE =====
async function openCompleteTripModal(tripId) {
    try {
        currentTripForCompletion = tripId;
        
        // Obtener inventario actual del viaje
        const inventory = await getTripInventory(tripId);
        const trip = allTrips.find(t => t.id === tripId);
        
        if (!trip) {
            if (window.showNotification) {
                window.showNotification('Viaje no encontrado', 'error');
            }
            return;
        }
        
        const container = document.getElementById('complete-trip-content');
        
        // Productos con stock restante
        const remainingProducts = inventory.filter(item => (item.current_quantity || 0) > 0);
        
        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h4>🚛 Viaje: ${trip.trip_number}</h4>
                <p><strong>Empleado:</strong> ${trip.employee_name}</p>
                <p><strong>Fecha inicio:</strong> ${formatDate(trip.start_date || trip.created_at)}</p>
            </div>
            
            ${remainingProducts.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h4>📦 Productos con stock restante</h4>
                    <p style="color: var(--secondary-color); margin-bottom: 1rem;">
                        Estos productos serán devueltos al almacén principal:
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 0.75rem; text-align: left; border: 1px solid var(--border-color);">Producto</th>
                                <th style="padding: 0.75rem; text-align: center; border: 1px solid var(--border-color);">Stock Actual</th>
                                <th style="padding: 0.75rem; text-align: center; border: 1px solid var(--border-color);">Devolver</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${remainingProducts.map(item => `
                                <tr>
                                    <td style="padding: 0.75rem; border: 1px solid var(--border-color);">
                                        <strong>${item.product_code}</strong><br>
                                        <small>${item.product_name}</small>
                                    </td>
                                    <td style="padding: 0.75rem; text-align: center; border: 1px solid var(--border-color);">
                                        ${item.current_quantity}
                                    </td>
                                    <td style="padding: 0.75rem; text-align: center; border: 1px solid var(--border-color);">
                                        <input type="number" 
                                               id="return-qty-${item.product_id}" 
                                               min="0" 
                                               max="${item.current_quantity}" 
                                               value="${item.current_quantity}"
                                               style="width: 80px; padding: 0.5rem; text-align: center; border: 1px solid var(--border-color); border-radius: 4px;">
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div style="text-align: center; padding: 2rem; background: #f0f9ff; border-radius: 8px; border: 1px solid #0ea5e9;">
                    <h4 style="color: #0369a1; margin-bottom: 1rem;">✅ Perfecto!</h4>
                    <p style="color: #0369a1;">Todos los productos han sido vendidos. No hay stock para devolver.</p>
                </div>
            `}
            
            <div style="background: #fef3c7; padding: 1rem; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 1.5rem;">
                <strong>⚠️ Importante:</strong> Al finalizar el viaje, no se podrán realizar más ventas desde este subalmacén.
                Los productos restantes se devolverán automáticamente al almacén principal.
            </div>
        `;
        
        document.getElementById('complete-trip-modal').style.display = 'flex';
        
    } catch (error) {
        console.error('❌ Error cargando datos para finalizar viaje:', error);
        if (window.showNotification) {
            window.showNotification('Error cargando datos del viaje', 'error');
        }
    }
}

function closeCompleteTripModal() {
    document.getElementById('complete-trip-modal').style.display = 'none';
    currentTripForCompletion = null;
}

async function confirmCompleteTrip() {
    if (!currentTripForCompletion) return;
    
    try {
        // Obtener productos a devolver
        const returnProducts = [];
        const inventory = await getTripInventory(currentTripForCompletion);
        
        inventory.forEach(item => {
            const returnQtyInput = document.getElementById(`return-qty-${item.product_id}`);
            if (returnQtyInput) {
                const returnQty = parseInt(returnQtyInput.value) || 0;
                if (returnQty > 0) {
                    returnProducts.push({
                        product_id: item.product_id,
                        quantity: returnQty
                    });
                }
            }
        });
        
        console.log('🏁 Finalizando viaje:', currentTripForCompletion, 'Productos a devolver:', returnProducts);
        
        // Deshabilitar botón
        const confirmBtn = document.querySelector('[onclick="confirmCompleteTrip()"]');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = '🔄 Finalizando...';
        
        try {
            const result = await completeTripAPI(currentTripForCompletion, returnProducts);
            
            console.log('✅ Viaje finalizado exitosamente:', result);
            
            if (window.showNotification) {
                window.showNotification('Viaje finalizado exitosamente', 'success');
            }
            
            // Mostrar confirmación
            alert(`✅ VIAJE FINALIZADO EXITOSAMENTE

🏁 El viaje ha sido completado
📦 Productos devueltos: ${returnProducts.length}
📅 Fecha de finalización: ${new Date().toLocaleString()}

Todos los productos restantes han sido devueltos al almacén principal.`);
            
            // Cerrar modal y recargar
            closeCompleteTripModal();
            await loadTrips();
            
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
        }
        
    } catch (error) {
        console.error('❌ Error finalizando viaje:', error);
        
        if (window.showNotification) {
            window.showNotification('Error finalizando viaje: ' + error.message, 'error');
        }
        
        alert(`❌ Error al finalizar el viaje:

${error.message}

Verifica tu conexión e intenta nuevamente.`);
    }
}

// ===== OTRAS FUNCIONES =====
async function loadTrips() {
    try {
        console.log('🔄 Recargando viajes...');
        
        const tripsData = await getTrips();
        allTrips = tripsData || [];
        
        displayTrips();
        
        console.log('✅ Viajes recargados:', allTrips.length);
        
    } catch (error) {
        console.error('❌ Error recargando viajes:', error);
        if (window.showNotification) {
            window.showNotification('Error al recargar viajes', 'error');
        }
    }
}

function viewTripDetails(tripId) {
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;
    
    const inventory = trip.substore_inventory || [];
    
    const details = `
DETALLES DEL VIAJE
==================

🚛 Número: ${trip.trip_number}
👤 Empleado: ${trip.employee_name} (${trip.employee_code})
📅 Inicio: ${formatDate(trip.start_date || trip.created_at)}
📅 Fin: ${trip.end_date ? formatDate(trip.end_date) : 'En curso'}
📝 Estado: ${trip.status === 'active' ? 'Activo' : 'Completado'}
📝 Notas: ${trip.notes || 'Sin notas'}

INVENTARIO:
===========
${inventory.length > 0 ? inventory.map(item => 
    `• ${item.product_code} - ${item.product_name}
  Inicial: ${item.initial_quantity || 0} | Actual: ${item.current_quantity || 0} | Vendido: ${item.sold_quantity || 0}`
).join('\n\n') : 'Sin productos'}

ESTADÍSTICAS:
=============
📦 Total productos: ${inventory.length}
📊 Total inicial: ${inventory.reduce((sum, item) => sum + (item.initial_quantity || 0), 0)}
📊 Total actual: ${inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0)}
📊 Total vendido: ${inventory.reduce((sum, item) => sum + (item.sold_quantity || 0), 0)}
💰 Valor actual: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.current_quantity || 0) * (item.price || 0)), 0))}
💰 Valor vendido: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.price || 0)), 0))}
    `;
    
    alert(details);
}

function downloadTripReport(tripId) {
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;
    
    const inventory = trip.substore_inventory || [];
    
    // Crear contenido del reporte
    const reportContent = `
REPORTE DE VIAJE - ${trip.trip_number}
=====================================

INFORMACIÓN GENERAL:
- Viaje: ${trip.trip_number}
- Empleado: ${trip.employee_name} (${trip.employee_code})
- Estado: ${trip.status === 'active' ? 'Activo' : 'Completado'}
- Fecha inicio: ${formatDate(trip.start_date || trip.created_at)}
- Fecha fin: ${trip.end_date ? formatDate(trip.end_date) : 'En curso'}
- Notas: ${trip.notes || 'Sin notas'}

INVENTARIO DETALLADO:
=====================
${inventory.map(item => `
Producto: ${item.product_code} - ${item.product_name}
- Cantidad inicial: ${item.initial_quantity || 0}
- Cantidad actual: ${item.current_quantity || 0}
- Cantidad vendida: ${item.sold_quantity || 0}
- Cantidad devuelta: ${item.returned_quantity || 0}
- Precio unitario: ${formatCurrency(item.price || 0)}
- Valor actual: ${formatCurrency((item.current_quantity || 0) * (item.price || 0))}
- Valor vendido: ${formatCurrency((item.sold_quantity || 0) * (item.price || 0))}
`).join('\n')}

RESUMEN FINANCIERO:
==================
- Total productos: ${inventory.length}
- Unidades iniciales: ${inventory.reduce((sum, item) => sum + (item.initial_quantity || 0), 0)}
- Unidades vendidas: ${inventory.reduce((sum, item) => sum + (item.sold_quantity || 0), 0)}
- Unidades restantes: ${inventory.reduce((sum, item) => sum + (item.current_quantity || 0), 0)}
- Valor total vendido: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.price || 0)), 0))}
- Valor stock restante: ${formatCurrency(inventory.reduce((sum, item) => sum + ((item.current_quantity || 0) * (item.price || 0)), 0))}

Reporte generado: ${new Date().toLocaleString()}
Sistema de Aceites - Gestión de Subalmacenes
    `.trim();
    
    // Descargar como archivo de texto
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_Viaje_${trip.trip_number}_${new Date().toISOString().split('T')[0]}.txt`;
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

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.openNewTripModal = openNewTripModal;
window.closeNewTripModal = closeNewTripModal;
window.addProductToTrip = addProductToTrip;
window.updateProductQuantity = updateProductQuantity;
window.removeProductFromTrip = removeProductFromTrip;
window.createTrip = createTrip;
window.openCompleteTripModal = openCompleteTripModal;
window.closeCompleteTripModal = closeCompleteTripModal;
window.confirmCompleteTrip = confirmCompleteTrip;
window.loadTrips = loadTrips;
window.viewTripDetails = viewTripDetails;
window.downloadTripReport = downloadTripReport;
window.filterTrips = filterTrips;
window.clearFilters = clearFilters;

console.log('✅ Subalmacenes.js inicializado correctamente');