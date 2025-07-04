// ===== MODAL FORMAL DE DETALLES DE PEDIDO =====
// Archivo: frontend/js/order-details-modal.js
// Versión: 2.0 - Diseño Formal y Profesional
// Este script debe agregarse DESPUÉS de cargar admin.js y los otros scripts

console.log('🔗 Integrando modal formal de detalles de pedido...');

// Asegurar que el modal existe en el DOM
function ensureOrderDetailsModal() {
    if (document.getElementById('orderDetailsModal')) {
        return; // Ya existe
    }
    
    console.log('🔧 Creando modal formal de detalles de pedido...');
    
    // Crear el HTML del modal
    const modalHTML = `
    <!-- Modal Formal de Detalles de Pedido -->
    <div id="orderDetailsModal" class="order-modal">
        <div class="order-modal-container">
            <!-- Header -->
            <div class="order-modal-header">
                <div class="order-header-content">
                    <div class="order-header-icon">📋</div>
                    <div class="order-header-text">
                        <h2 id="orderNumber">Pedido #ORD-2025001</h2>
                        <p id="orderDate">24 de junio, 2025</p>
                    </div>
                </div>
                <div class="order-status-badge status-hold" id="orderStatus">En Espera</div>
                <button class="order-close-btn" onclick="closeOrderModal()">✕</button>
            </div>

            <!-- Contenido -->
            <div class="order-modal-content">
                <!-- Información del Cliente -->
                <div class="order-section">
                    <h3 class="section-title">
                        <span class="section-icon">👤</span>
                        Información del Cliente
                    </h3>
                    <table class="client-info-table">
                        <tr>
                            <th>Cliente</th>
                            <td id="clientName">-</td>
                        </tr>
                        <tr>
                            <th>Teléfono</th>
                            <td id="clientPhone">-</td>
                        </tr>
                        <tr>
                            <th>Email</th>
                            <td id="clientEmail">-</td>
                        </tr>
                        <tr>
                            <th>Dirección</th>
                            <td id="clientAddress">-</td>
                        </tr>
                        <tr>
                            <th>vendedor</th>
                            <td id="employeeName">-</td>
                        </tr>
                        <tr>
                            <th>Fecha del Pedido</th>
                            <td id="orderCreatedAt">-</td>
                        </tr>
                    </table>
                </div>

                <!-- Productos -->
                <div class="order-section">
                    <h3 class="section-title">
                        <span class="section-icon">📦</span>
                        Productos del Pedido
                    </h3>
                    <table class="products-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Precio Unit.</th>
                                <th>Cantidad</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="productsTableBody">
                            <!-- Se llena dinámicamente -->
                        </tbody>
                    </table>

                    <div class="total-section">
                        <div class="total-label">Total del Pedido</div>
                        <span class="total-amount" id="orderTotal">$0.00</span>
                        <div class="total-description">Incluye todos los productos del pedido</div>
                    </div>
                </div>

                <!-- Fotografía -->
                <div class="order-section">
                    <h3 class="section-title">
                        <span class="section-icon">📷</span>
                        Fotografía del Pedido
                    </h3>
                    <div class="photo-section">
                        <div id="photoContainer">
                            <div class="no-photo">📷 No hay fotografía disponible para este pedido</div>
                        </div>
                    </div>
                </div>

                <!-- Ubicación -->
                <div class="order-section">
                    <h3 class="section-title">
                        <span class="section-icon">📍</span>
                        Ubicación del Pedido
                    </h3>
                    <div id="mapContainer" class="map-container">
                        📍 No hay información de ubicación disponible
                    </div>
                </div>

                <!-- Notas -->
                <div class="order-section">
                    <h3 class="section-title">
                        <span class="section-icon">📝</span>
                        Notas del vendedor
                    </h3>
                    <div class="notes-content" id="orderNotes">
                        <span class="no-notes">Sin notas adicionales</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="order-modal-footer">
                <div class="footer-info">
                    <span>🕒</span>
                    <span>Última actualización: <span id="lastUpdated">Ahora</span></span>
                </div>
                <div class="footer-actions">
                    <button class="modal-btn btn-secondary" onclick="closeOrderModal()">
                        ✕ Cerrar
                    </button>
                    <div id="orderActions">
                        <!-- Se llenan dinámicamente según el estado -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Agregar el modal al final del body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    console.log('✅ Modal formal de detalles de pedido creado');
}

// Crear los estilos CSS para el modal
function ensureOrderDetailsModalStyles() {
    if (document.getElementById('orderDetailsModalStyles')) {
        return; // Ya existen
    }
    
    const styles = document.createElement('style');
    styles.id = 'orderDetailsModalStyles';
    styles.textContent = `
        /* Variables CSS para el modal */
        :root {
            --modal-primary: #0d2975;
            --modal-success: #059669;
            --modal-warning: #d97706;
            --modal-danger: #dc2626;
            --modal-text: #1f2937;
            --modal-text-light: #6b7280;
            --modal-bg: #ffffff;
            --modal-border: #e5e7eb;
            --modal-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
            --modal-backdrop: rgba(0, 0, 0, 0.75);
        }

        /* Reset básico para el modal */
        .order-modal * {
            box-sizing: border-box;
        }

        /* Overlay del modal */
        .order-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: var(--modal-backdrop);
            backdrop-filter: blur(4px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 1rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .order-modal.show {
            display: flex;
            opacity: 1;
        }

        /* Contenedor principal del modal */
        .order-modal-container {
            background: var(--modal-bg);
            border-radius: 8px;
            box-shadow: var(--modal-shadow);
            width: 100%;
            max-width: 1200px;
            max-height: 95vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transform: scale(0.9) translateY(20px);
            transition: transform 0.3s ease;
            border: 1px solid var(--modal-border);
        }

        .order-modal.show .order-modal-container {
            transform: scale(1) translateY(0);
        }

        /* Header del modal */
        .order-modal-header {
            background: linear-gradient(135deg, var(--modal-primary), #1e40af);
            color: white;
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            border-bottom: 2px solid var(--modal-primary);
        }

        .order-header-content {
            display: flex;
            align-items: center;
            gap: 1rem;
            position: relative;
            z-index: 1;
        }

        .order-header-icon {
            background: rgba(255, 255, 255, 0.15);
            padding: 0.75rem;
            border-radius: 4px;
            font-size: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .order-header-text h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
        }

        .order-header-text p {
            margin: 0;
            opacity: 0.9;
            font-size: 0.875rem;
        }

        .order-status-badge {
            position: relative;
            z-index: 1;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .status-hold {
            background: rgba(251, 191, 36, 0.9);
            color: #92400e;
        }

        .status-confirmed {
            background: rgba(16, 185, 129, 0.9);
            color: #065f46;
        }

        .status-cancelled {
            background: rgba(239, 68, 68, 0.9);
            color: #991b1b;
        }

        .order-close-btn {
            position: relative;
            z-index: 1;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            transition: all 0.2s ease;
        }

        .order-close-btn:hover {
            background: rgba(255, 255, 255, 0.25);
        }

        /* Contenido principal */
        .order-modal-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        /* Secciones del contenido */
        .order-section {
            padding: 2rem;
            border-bottom: 1px solid var(--modal-border);
        }

        .order-section:last-child {
            border-bottom: none;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--modal-text);
        }

        .section-icon {
            background: var(--modal-primary);
            color: white;
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 1rem;
            border: 1px solid var(--modal-border);
        }

        /* Tabla de información del cliente */
        .client-info-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--modal-border);
        }

        .client-info-table th {
            background: #f8fafc;
            color: var(--modal-text);
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.875rem;
            border-bottom: 1px solid var(--modal-border);
            width: 30%;
        }

        .client-info-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--modal-border);
            color: var(--modal-text);
            font-weight: 500;
        }

        .client-info-table tr:last-child th,
        .client-info-table tr:last-child td {
            border-bottom: none;
        }

        .client-info-table tr:hover {
            background: #f8fafc;
        }

        /* Tabla de productos */
        .products-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--modal-border);
        }

        .products-table th {
            background: var(--modal-primary);
            color: white;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .products-table td {
            padding: 1rem;
            border-bottom: 1px solid var(--modal-border);
            vertical-align: middle;
        }

        .products-table tr:last-child td {
            border-bottom: none;
        }

        .products-table tr:hover {
            background: #f8fafc;
            transform: scale(1.01);
            transition: transform 0.2s ease;
        }

        .product-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .product-name {
            font-weight: 600;
            color: var(--modal-text);
            font-size: 0.95rem;
        }

        .product-details {
            font-size: 0.8rem;
            color: var(--modal-text-light);
        }

        .product-code {
            background: var(--modal-primary);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: 600;
            display: inline-block;
            margin-top: 0.25rem;
        }

        .quantity-badge {
            background: var(--modal-success);
            color: white;
            padding: 0.4rem 0.75rem;
            border-radius: 3px;
            font-weight: 600;
            text-align: center;
            min-width: 50px;
            font-size: 0.875rem;
        }

        .price-cell {
            font-weight: 700;
            color: var(--modal-primary);
            font-size: 1rem;
        }

        /* Resumen total */
        .total-section {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            padding: 1.5rem;
            text-align: center;
            border-radius: 4px;
            margin: 1.5rem 0;
            border: 1px solid var(--modal-border);
        }

        .total-label {
            font-size: 0.875rem;
            color: var(--modal-text-light);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .total-amount {
            font-size: 2.5rem;
            font-weight: 900;
            color: var(--modal-primary);
            display: block;
            margin-bottom: 0.5rem;
        }

        .total-description {
            font-size: 0.875rem;
            color: var(--modal-text-light);
        }

        /* Sección de foto */
        .photo-section {
            text-align: center;
        }

        .order-photo {
            max-width: 100%;
            max-height: 400px;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: transform 0.2s ease;
            border: 1px solid var(--modal-border);
        }

        .order-photo:hover {
            transform: scale(1.01);
        }

        .no-photo {
            background: #f3f4f6;
            color: var(--modal-text-light);
            padding: 2rem;
            border-radius: 4px;
            border: 1px dashed var(--modal-border);
            font-size: 1rem;
            text-align: center;
        }

        /* Mapa */
        .map-container {
            height: 300px;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--modal-text-light);
            font-size: 1rem;
            border: 1px solid var(--modal-border);
        }

        /* Notas */
        .notes-content {
            background: #f8fafc;
            padding: 1.25rem;
            border-radius: 4px;
            border: 1px solid var(--modal-border);
            font-size: 1rem;
            line-height: 1.6;
            color: var(--modal-text);
            white-space: pre-wrap;
            min-height: 80px;
        }

        .no-notes {
            color: var(--modal-text-light);
            font-style: italic;
        }

        /* Footer con acciones */
        .order-modal-footer {
            background: #f9fafb;
            padding: 1.5rem 2rem;
            border-top: 1px solid var(--modal-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }

        .footer-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--modal-text-light);
        }

        .footer-actions {
            display: flex;
            gap: 1rem;
        }

        .modal-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid transparent;
        }

        .btn-secondary {
            background: #6b7280;
            color: white;
        }

        .btn-secondary:hover {
            background: #4b5563;
            transform: translateY(-1px);
        }

        .btn-success {
            background: var(--modal-success);
            color: white;
        }

        .btn-success:hover {
            background: #047857;
            transform: translateY(-1px);
        }

        .btn-danger {
            background: var(--modal-danger);
            color: white;
        }

        .btn-danger:hover {
            background: #b91c1c;
            transform: translateY(-1px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .order-modal {
                padding: 0.5rem;
            }

            .order-modal-container {
                max-height: 100vh;
                border-radius: 0;
            }

            .order-modal-header {
                padding: 1rem 1.5rem;
            }

            .order-header-text h2 {
                font-size: 1.25rem;
            }

            .order-section {
                padding: 1.5rem;
            }

            .client-info-table th {
                width: 35%;
                font-size: 0.8rem;
                padding: 0.6rem 0.8rem;
            }

            .client-info-table td {
                padding: 0.6rem 0.8rem;
                font-size: 0.875rem;
            }

            .products-table {
                font-size: 0.875rem;
            }

            .products-table th,
            .products-table td {
                padding: 0.75rem 0.5rem;
            }

            .total-amount {
                font-size: 2rem;
            }

            .order-modal-footer {
                padding: 1rem 1.5rem;
                flex-direction: column;
                align-items: stretch;
                gap: 1rem;
            }

            .footer-actions {
                flex-direction: column;
            }

            .modal-btn {
                justify-content: center;
                width: 100%;
            }

            .map-container {
                height: 250px;
            }
        }

        /* Scrollbar personalizado */
        .order-modal-content::-webkit-scrollbar {
            width: 6px;
        }

        .order-modal-content::-webkit-scrollbar-track {
            background: #f1f5f9;
        }

        .order-modal-content::-webkit-scrollbar-thumb {
            background: var(--modal-primary);
            border-radius: 3px;
        }

        .order-modal-content::-webkit-scrollbar-thumb:hover {
            background: #052e5b;
        }
    `;
    
    document.head.appendChild(styles);
}

// Variables globales para el modal
let currentOrderData = null;

// Función principal para mostrar el modal con datos del pedido
function showOrderDetails(orderData) {
    console.log('🔍 Mostrando detalles del pedido:', orderData);
    
    currentOrderData = orderData;
    
    // Asegurar que el modal existe
    ensureOrderDetailsModal();
    ensureOrderDetailsModalStyles();
    
    const modal = document.getElementById('orderDetailsModal');
    
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }

    // Llenar información básica
    document.getElementById('orderNumber').textContent = `Pedido ${orderData.order_number || '#' + orderData.id}`;
    document.getElementById('orderDate').textContent = formatDate(orderData.created_at);
    
    // Estado del pedido
    const statusElement = document.getElementById('orderStatus');
    statusElement.className = `order-status-badge status-${orderData.status}`;
    statusElement.textContent = getStatusText(orderData.status);

    // Información del cliente
    document.getElementById('clientName').textContent = orderData.client_info?.name || 'No especificado';
    document.getElementById('clientPhone').textContent = orderData.client_info?.phone || 'No especificado';
    document.getElementById('clientEmail').textContent = orderData.client_info?.email || 'No especificado';
    document.getElementById('clientAddress').textContent = orderData.client_info?.address || 'No especificada';
    document.getElementById('employeeName').textContent = orderData.employee_name || orderData.employee_code || 'No especificado';
    document.getElementById('orderCreatedAt').textContent = formatDate(orderData.created_at);

    // Productos
    fillProductsTable(orderData.products || []);
    
    // Total
    document.getElementById('orderTotal').textContent = formatCurrency(orderData.total || 0);

    // Fotografía
    fillPhotoSection(orderData.photo_url);

    // Mapa
    fillMapSection(orderData.location);

    // Notas
    fillNotesSection(orderData.notes);

    // Acciones según el estado
    fillOrderActions(orderData);

    // Última actualización
    document.getElementById('lastUpdated').textContent = formatDate(new Date().toISOString());

    // Mostrar modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Función para cerrar el modal
function closeOrderModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        currentOrderData = null;
    }
}

// Llenar tabla de productos
function fillProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: #6b7280;">
                    📦 No hay productos en este pedido
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>
                <div class="product-info">
                    <div class="product-name">${product.name || 'Producto sin nombre'}</div>
                    <div class="product-details">${product.brand || ''} • ${product.viscosity || ''} • ${product.capacity || ''}</div>
                    <span class="product-code">${product.code || product.product_code || 'N/A'}</span>
                </div>
            </td>
            <td class="price-cell">${formatCurrency(product.price || 0)}</td>
            <td>
                <span class="quantity-badge">${product.quantity || 0}</span>
            </td>
            <td class="price-cell">${formatCurrency((product.price || 0) * (product.quantity || 0))}</td>
        </tr>
    `).join('');
}

// Llenar sección de foto
function fillPhotoSection(photoUrl) {
    const container = document.getElementById('photoContainer');
    
    if (photoUrl && photoUrl.trim() !== '') {
        container.innerHTML = `
            <img src="${photoUrl}" alt="Foto del pedido" class="order-photo" onclick="openPhotoFullscreen('${photoUrl}')">
        `;
    } else {
        container.innerHTML = `
            <div class="no-photo">📷 No hay fotografía disponible para este pedido</div>
        `;
    }
}

// Llenar sección del mapa
function fillMapSection(location) {
    const container = document.getElementById('mapContainer');
    
    if (location && location.latitude && location.longitude) {
        const lat = location.latitude;
        const lng = location.longitude;
        const accuracy = location.accuracy || 'N/A';
        
        container.innerHTML = `
            <iframe 
                src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}"
                width="100%" 
                height="100%" 
                style="border:0;" 
                allowfullscreen="" 
                loading="lazy">
            </iframe>
        `;
        
        // Agregar información de ubicación debajo del mapa
        container.insertAdjacentHTML('afterend', `
            <div style="margin-top: 1rem;">
                <table class="client-info-table">
                    <tr>
                        <th>Latitud</th>
                        <td>${lat.toFixed(6)}</td>
                    </tr>
                    <tr>
                        <th>Longitud</th>
                        <td>${lng.toFixed(6)}</td>
                    </tr>
                    <tr>
                        <th>Precisión</th>
                        <td>${accuracy}m</td>
                    </tr>
                    <tr>
                        <th>Ver en Mapa</th>
                        <td>
                            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color: var(--modal-primary); text-decoration: none; font-weight: 600;">
                                🗺️ Abrir en Google Maps
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
        `);
    } else {
        container.innerHTML = `📍 No hay información de ubicación disponible`;
    }
}

// Llenar sección de notas
function fillNotesSection(notes) {
    const container = document.getElementById('orderNotes');
    
    if (notes && notes.trim() !== '') {
        container.innerHTML = notes.trim();
        container.classList.remove('no-notes');
    } else {
        container.innerHTML = '<span class="no-notes">Sin notas adicionales</span>';
    }
}

// Llenar acciones según el estado del pedido
function fillOrderActions(orderData) {
    const container = document.getElementById('orderActions');
    const status = orderData.status;
    
    if (status === 'hold') {
        container.innerHTML = `
            <button class="modal-btn btn-success" onclick="confirmOrderFromModal(${orderData.id})">
                ✅ Confirmar Pedido
            </button>
            <button class="modal-btn btn-danger" onclick="cancelOrderFromModal(${orderData.id})">
                ❌ Cancelar Pedido
            </button>
        `;
    } else if (status === 'confirmed') {
        container.innerHTML = `
            <button class="modal-btn btn-secondary" onclick="printOrder(${orderData.id})">
                Imprimir
            </button>
        `;
    } else {
        container.innerHTML = '';
    }
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return 'No especificada';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'hold': 'En Espera',
        'confirmed': 'Confirmado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// Función para abrir foto en pantalla completa
function openPhotoFullscreen(photoUrl) {
    const fullscreenModal = document.createElement('div');
    fullscreenModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20000;
        cursor: pointer;
    `;
    
    fullscreenModal.innerHTML = `
        <img src="${photoUrl}" style="max-width: 95%; max-height: 95%; border-radius: 8px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
        <button onclick="this.parentElement.remove(); document.body.style.overflow = 'hidden';" style="position: absolute; top: 20px; right: 20px; background: rgba(255, 255, 255, 0.9); border: none; padding: 10px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; width: 40px; height: 40px;">✕</button>
    `;
    
    fullscreenModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
            document.body.style.overflow = 'hidden';
        }
    });
    
    document.body.appendChild(fullscreenModal);
}

// Funciones para acciones de pedidos
function confirmOrderFromModal(orderId) {
    closeOrderModal();
    if (typeof confirmOrderModal === 'function') {
        confirmOrderModal(orderId);
    } else if (typeof window.confirmOrderModal === 'function') {
        window.confirmOrderModal(orderId);
    } else {
        console.error('Función confirmOrderModal no encontrada');
        alert('Error: Función de confirmación no disponible');
    }
}

function cancelOrderFromModal(orderId) {
    closeOrderModal();
    if (typeof cancelOrderModal === 'function') {
        cancelOrderModal(orderId);
    } else if (typeof window.cancelOrderModal === 'function') {
        window.cancelOrderModal(orderId);
    } else {
        console.error('Función cancelOrderModal no encontrada');
        alert('Error: Función de cancelación no disponible');
    }
}

function printOrder(orderId) {
    if (!currentOrderData) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pedido ${currentOrderData.order_number}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    color: #1f2937;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 2px solid #0d2975; 
                    padding-bottom: 20px; 
                }
                .header h1 {
                    color: #0d2975;
                    margin-bottom: 10px;
                }
                .section { 
                    margin: 20px 0; 
                }
                .section h3 { 
                    background: #f8fafc; 
                    color: #0d2975;
                    padding: 10px; 
                    margin: 10px 0;
                    border-left: 4px solid #0d2975;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 10px 0; 
                }
                th, td { 
                    border: 1px solid #e5e7eb; 
                    padding: 8px; 
                    text-align: left; 
                }
                th { 
                    background: #f8fafc;
                    color: #0d2975;
                    font-weight: 600;
                }
                .total { 
                    font-size: 1.2em; 
                    font-weight: bold; 
                    text-align: right; 
                    margin: 20px 0;
                    color: #0d2975;
                }
                .status {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status-hold { background: #fef3c7; color: #92400e; }
                .status-confirmed { background: #d1fae5; color: #065f46; }
                .status-cancelled { background: #fee2e2; color: #991b1b; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Sistema de Aceites</h1>
                <h2>Pedido ${currentOrderData.order_number}</h2>
                <p>Fecha: ${formatDate(currentOrderData.created_at)}</p>
                <p>Estado: <span class="status status-${currentOrderData.status}">${getStatusText(currentOrderData.status)}</span></p>
            </div>
            
            <div class="section">
                <h3>Información del Cliente</h3>
                <table>
                    <tr><th>Nombre:</th><td>${currentOrderData.client_info?.name || 'N/A'}</td></tr>
                    <tr><th>Teléfono:</th><td>${currentOrderData.client_info?.phone || 'N/A'}</td></tr>
                    <tr><th>Dirección:</th><td>${currentOrderData.client_info?.address || 'N/A'}</td></tr>
                    <tr><th>Email:</th><td>${currentOrderData.client_info?.email || 'N/A'}</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h3>Productos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Precio</th>
                            <th>Cantidad</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(currentOrderData.products || []).map(product => `
                            <tr>
                                <td>${product.code || product.product_code || 'N/A'}</td>
                                <td>${product.name || 'N/A'}</td>
                                <td>${formatCurrency(product.price || 0)}</td>
                                <td>${product.quantity || 0}</td>
                                <td>${formatCurrency((product.price || 0) * (product.quantity || 0))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">Total: ${formatCurrency(currentOrderData.total || 0)}</div>
            </div>
            
            ${currentOrderData.notes ? `
            <div class="section">
                <h3>Notas</h3>
                <p>${currentOrderData.notes}</p>
            </div>
            ` : ''}
            
            <div class="section">
                <h3>Información Adicional</h3>
                <table>
                    <tr><th>vendedor:</th><td>${currentOrderData.employee_name || currentOrderData.employee_code || 'N/A'}</td></tr>
                    ${currentOrderData.location ? `<tr><th>Ubicación:</th><td>${currentOrderData.location.latitude.toFixed(6)}, ${currentOrderData.location.longitude.toFixed(6)}</td></tr>` : ''}
                    <tr><th>Fecha de Impresión:</th><td>${formatDate(new Date().toISOString())}</td></tr>
                </table>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ===== INTEGRACIÓN CON EL SISTEMA EXISTENTE =====

// Reemplazar la función viewOrderDetails original
if (typeof window.originalViewOrderDetails === 'undefined') {
    // Guardar la función original si existe
    window.originalViewOrderDetails = window.viewOrderDetails || null;
}

// Nueva función viewOrderDetails que usa el modal mejorado
function viewOrderDetails(orderId) {
    console.log('🔄 viewOrderDetails llamado con ID:', orderId);
    
    // Buscar el pedido en los datos existentes
    let orderData = null;
    
    // Intentar obtener de window.adminOrders (si está disponible)
    if (window.adminOrders && Array.isArray(window.adminOrders)) {
        orderData = window.adminOrders.find(o => o.id === parseInt(orderId));
    }
    
    // Si no se encuentra, intentar obtener de las variables globales de admin.js
    if (!orderData && typeof orders !== 'undefined' && Array.isArray(orders)) {
        orderData = orders.find(o => o.id === parseInt(orderId));
    }
    
    // Si aún no se encuentra, hacer una petición a la API
    if (!orderData) {
        console.log('📡 Pedido no encontrado en memoria, obteniendo de la API...');
        fetchOrderDetails(orderId);
        return;
    }
    
    // Mostrar el modal con los datos encontrados
    showOrderDetails(orderData);
}

// Función para obtener detalles del pedido de la API
async function fetchOrderDetails(orderId) {
    try {
        if (typeof window.getOrderDetails === 'function') {
            const orderData = await window.getOrderDetails(orderId);
            showOrderDetails(orderData);
        } else {
            // Fallback: usar la API directamente
            const response = await fetch(`${window.API_BASE_URL}/api/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const orderData = await response.json();
            showOrderDetails(orderData);
        }
    } catch (error) {
        console.error('❌ Error obteniendo detalles del pedido:', error);
        
        if (window.showNotification) {
            window.showNotification('Error al cargar detalles del pedido: ' + error.message, 'error');
        } else {
            alert('Error al cargar detalles del pedido: ' + error.message);
        }
    }
}

// Eventos globales para cerrar el modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('orderDetailsModal');
        if (modal && modal.classList.contains('show')) {
            closeOrderModal();
        }
    }
});

document.addEventListener('click', function(e) {
    const modal = document.getElementById('orderDetailsModal');
    if (e.target === modal) {
        closeOrderModal();
    }
});

// Hacer funciones globales para que sean accesibles
window.showOrderDetails = showOrderDetails;
window.closeOrderModal = closeOrderModal;
window.viewOrderDetails = viewOrderDetails;
window.openPhotoFullscreen = openPhotoFullscreen;
window.confirmOrderFromModal = confirmOrderFromModal;
window.cancelOrderFromModal = cancelOrderFromModal;
window.printOrder = printOrder;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para que se carguen otros scripts
    setTimeout(() => {
        ensureOrderDetailsModal();
        ensureOrderDetailsModalStyles();
        console.log('✅ Modal formal de detalles de pedido integrado correctamente');
    }, 1000);
});

console.log('✅ Integración del modal formal de detalles de pedido cargada');