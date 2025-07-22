// ===== MODAL FORMAL DE DETALLES DE PEDIDO CON HISTORIAL DE ABONOS =====
// Archivo: frontend/js/order-details-modal-enhanced.js
// Versión: 2.1 - Incluye historial de abonos integrado

console.log('🔗 Integrando modal de detalles de pedido con historial de abonos...');
// Variables globales para el modal
let currentOrderData = null;


// Asegurar que el modal existe en el DOM
function ensureOrderDetailsModal() {
    if (document.getElementById('orderDetailsModal')) {
        return; // Ya existe
    }
    
    console.log('🔧 Creando modal de detalles de pedido con historial de abonos...');
    
    // Crear el HTML del modal
    const modalHTML = `
    <!-- Modal Formal de Detalles de Pedido con Historial -->
    <div id="orderDetailsModal" class="order-modal">
        <div class="order-modal-container">
            <!-- Header -->
            <div class="order-modal-header">
                <div class="order-header-content">
                    <div class="order-header-text">
                        <h2 id="orderNumber">Pedido #ORD-2025001</h2>
                        <p id="orderDate">24 de junio, 2025</p>
                    </div>
                </div>
                <button class="order-close-btn" onclick="closeOrderModal()">✕</button>
            </div>

            <!-- Contenido -->
            <div class="order-modal-content">
                <!-- Información del Cliente -->
                <div class="order-section">
                    <h3 class="section-title">
                    
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
                            <th>Vendedor</th>
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

                <!-- NUEVA SECCIÓN: Estado de Pagos -->
                <div class="order-section">
                    <div class="payment-status-grid">
                        <div class="payment-info-card">
                            <div class="payment-info-label">Total del Pedido</div>
                            <div class="payment-info-amount" id="paymentTotalAmount">$0.00</div>
                        </div>
                        <div class="payment-info-card">
                            <div class="payment-info-label">Total Abonado</div>
                            <div class="payment-info-amount paid" id="paymentPaidAmount">$0.00</div>
                        </div>
                        <div class="payment-info-card">
                            <div class="payment-info-label">Saldo Pendiente</div>
                            <div class="payment-info-amount pending" id="paymentBalanceAmount">$0.00</div>
                        </div>
                        <div class="payment-info-card full-width">
                            <div class="payment-progress-container">
                                <div class="payment-progress-label">Progreso de Pago</div>
                                <div class="payment-progress-bar">
                                    <div class="payment-progress-fill" id="paymentProgressFill" style="width: 0%"></div>
                                </div>
                                <div class="payment-progress-text" id="paymentProgressText">0% pagado</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NUEVA SECCIÓN: Historial de Abonos -->
                <div class="order-section" id="paymentHistorySection">
                    <h3 class="section-title">
                
                        Historial de Abonos
                        <button class="btn-refresh" onclick="loadPaymentHistoryForOrder()" title="Actualizar historial">
                            🔄
                        </button>
                    </h3>
                    <div id="payment-history" class="payment-history-list">
                        <div class="loading">Cargando historial de abonos...</div>
                    </div>
                </div>

                <!-- Fotografía -->
                <div class="order-section">
                    <h3 class="section-title">
                
                        Fotografía del Pedido
                    </h3>
                    <div class="photo-section">
                        <div id="photoContainer">
                            <div class="no-photo">No hay fotografía disponible para este pedido</div>
                        </div>
                    </div>
                </div>

                <!-- Ubicación -->
                <div class="order-section">
                    <h3 class="section-title">
                    
                        Ubicación del Pedido
                    </h3>
                    <div id="mapContainer" class="map-container">
                        No hay información de ubicación disponible
                    </div>
                </div>

                <!-- Notas -->
                <div class="order-section">
                    <h3 class="section-title">
                    
                        Notas del Vendedor
                    </h3>
                    <div class="notes-content" id="orderNotes">
                        <span class="no-notes">Sin notas adicionales</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="order-modal-footer">
                <div class="footer-info">
            
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
    
    console.log('✅ Modal de detalles de pedido con historial creado');
}

// Crear los estilos CSS para el modal con historial
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

        .btn-refresh {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid #3b82f6;
            color: #3b82f6;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            margin-left: auto;
            transition: all 0.2s ease;
        }

        .btn-refresh:hover {
            background: #3b82f6;
            color: white;
        }

        /* ===== NUEVOS ESTILOS PARA PAGOS ===== */

        /* Grid de información de pagos */
        .payment-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }

        .payment-info-card {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid var(--modal-primary);
            text-align: center;
            transition: transform 0.2s ease;
        }

        .payment-info-card:hover {
            transform: translateY(-2px);
        }

        .payment-info-card.full-width {
            grid-column: 1 / -1;
        }

        .payment-info-label {
            font-size: 0.875rem;
            color: var(--modal-text-light);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }

        .payment-info-amount {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--modal-text);
        }

        .payment-info-amount.paid {
            color: var(--modal-success);
        }

        .payment-info-amount.pending {
            color: var(--modal-warning);
        }

        /* Barra de progreso de pagos */
        .payment-progress-container {
            text-align: center;
        }

        .payment-progress-label {
            font-size: 0.875rem;
            color: var(--modal-text-light);
            font-weight: 600;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .payment-progress-bar {
            background: #e5e7eb;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 0.5rem;
            position: relative;
        }

        .payment-progress-fill {
            background: linear-gradient(90deg, var(--modal-success), #10b981);
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
            position: relative;
        }

        .payment-progress-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        .payment-progress-text {
            font-size: 0.875rem;
            color: var(--modal-text);
            font-weight: 600;
        }

        /* Historial de abonos */
        .payment-history-list {
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid var(--modal-border);
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
        }

        .payment-item {
            padding: 1rem;
            border-bottom: 1px solid var(--modal-border);
            transition: background-color 0.2s ease;
        }

        .payment-item:last-child {
            border-bottom: none;
        }

        .payment-item:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .payment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .payment-amount {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--modal-success);
        }

        .payment-method {
            background: var(--modal-primary);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .payment-date {
            font-size: 0.875rem;
            color: var(--modal-text-light);
            font-weight: 500;
        }

        .payment-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
            color: var(--modal-text-light);
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .payment-notes {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-style: italic;
        }

        .no-payments {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 2rem;
            color: var(--modal-text-light);
            text-align: center;
        }

        .no-payments::before {
            content: '💰';
            font-size: 3rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: var(--modal-text-light);
            font-style: italic;
        }

        .loading::before {
            content: '⏳';
            margin-right: 0.5rem;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-message {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: var(--modal-danger);
            background: rgba(239, 68, 68, 0.1);
            border-radius: 4px;
            text-align: center;
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

        .btn-payment {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
        }

        .btn-payment:hover {
            background: linear-gradient(135deg, #1d4ed8, #1e40af);
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

            .payment-status-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .payment-header {
                flex-direction: column;
                align-items: flex-start;
            }

            .payment-details {
                flex-direction: column;
                align-items: flex-start;
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
        .order-modal-content::-webkit-scrollbar,
        .payment-history-list::-webkit-scrollbar {
            width: 6px;
        }

        .order-modal-content::-webkit-scrollbar-track,
        .payment-history-list::-webkit-scrollbar-track {
            background: #f1f5f9;
        }

        .order-modal-content::-webkit-scrollbar-thumb,
        .payment-history-list::-webkit-scrollbar-thumb {
            background: var(--modal-primary);
            border-radius: 3px;
        }

        .order-modal-content::-webkit-scrollbar-thumb:hover,
        .payment-history-list::-webkit-scrollbar-thumb:hover {
            background: #052e5b;
        }
    `;
    
    document.head.appendChild(styles);
}

// Función principal para mostrar el modal con datos del pedido
function showOrderDetails(orderData) {
    console.log('🔍 Mostrando detalles del pedido con historial de abonos:', orderData);
    
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
    const orderNumberEl = document.getElementById('orderNumber');
    const orderDateEl = document.getElementById('orderDate');
    
    if (orderNumberEl) {
        orderNumberEl.textContent = `Pedido ${orderData.order_number || '#' + orderData.id}`;
    }
    
    if (orderDateEl) {
        orderDateEl.textContent = formatDate(orderData.created_at);
    }
    
    // Estado del pedido - CON VALIDACIÓN DEFENSIVA
    const statusElement = document.getElementById('orderStatus');
    if (statusElement) {
        statusElement.className = `order-status-badge status-${orderData.status}`;
        statusElement.textContent = getStatusText(orderData.status);
    } else {
        console.warn('⚠️ Elemento orderStatus no encontrado, saltando actualización de estado');
    }

    // Información del cliente - CON VALIDACIONES
    const clientElements = {
        clientName: document.getElementById('clientName'),
        clientPhone: document.getElementById('clientPhone'),
        clientEmail: document.getElementById('clientEmail'),
        clientAddress: document.getElementById('clientAddress'),
        employeeName: document.getElementById('employeeName'),
        orderCreatedAt: document.getElementById('orderCreatedAt')
    };

    if (clientElements.clientName) {
        clientElements.clientName.textContent = orderData.client_info?.name || 'No especificado';
    }
    if (clientElements.clientPhone) {
        clientElements.clientPhone.textContent = orderData.client_info?.phone || 'No especificado';
    }
    if (clientElements.clientEmail) {
        clientElements.clientEmail.textContent = orderData.client_info?.email || 'No especificado';
    }
    if (clientElements.clientAddress) {
        clientElements.clientAddress.textContent = orderData.client_info?.address || 'No especificada';
    }
    if (clientElements.employeeName) {
        clientElements.employeeName.textContent = orderData.employee_name || orderData.employee_code || 'No especificado';
    }
    if (clientElements.orderCreatedAt) {
        clientElements.orderCreatedAt.textContent = formatDate(orderData.created_at);
    }

    // Productos
    fillProductsTable(orderData.products || []);
    
    // Total
    const orderTotalEl = document.getElementById('orderTotal');
    if (orderTotalEl) {
        orderTotalEl.textContent = formatCurrency(orderData.total || 0);
    }

    // Estado de Pagos
    fillPaymentStatus(orderData);

    // Historial de Abonos
    loadPaymentHistoryForOrder();

    // Fotografía
    fillPhotoSection(orderData.photo_url);

    // Mapa
    fillMapSection(orderData.location);

    // Notas
    fillNotesSection(orderData.notes);

    // Acciones según el estado
    fillOrderActions(orderData);

    // Última actualización
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = formatDate(new Date().toISOString());
    }

    // Mostrar modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Función para llenar el estado de pagos
function fillPaymentStatus(orderData) {
    const total = parseFloat(orderData.total) || 0;
    const paidAmount = parseFloat(orderData.paid_amount) || 0;
    const balance = Math.max(0, total - paidAmount);
    const paymentPercentage = total > 0 ? (paidAmount / total * 100) : 0;

    // Actualizar los montos
    document.getElementById('paymentTotalAmount').textContent = formatCurrency(total);
    document.getElementById('paymentPaidAmount').textContent = formatCurrency(paidAmount);
    document.getElementById('paymentBalanceAmount').textContent = formatCurrency(balance);

    // Actualizar la barra de progreso
    const progressFill = document.getElementById('paymentProgressFill');
    const progressText = document.getElementById('paymentProgressText');
    
    progressFill.style.width = `${Math.min(paymentPercentage, 100)}%`;
    progressText.textContent = `${paymentPercentage.toFixed(1)}% pagado`;

    // Cambiar color de la barra según el porcentaje
    if (paymentPercentage >= 100) {
        progressFill.style.background = 'linear-gradient(90deg, #059669, #10b981)';
    } else if (paymentPercentage >= 50) {
        progressFill.style.background = 'linear-gradient(90deg, #d97706, #f59e0b)';
    } else {
        progressFill.style.background = 'linear-gradient(90deg, #dc2626, #ef4444)';
    }

    console.log('💰 Estado de pagos actualizado:', {
        total: total,
        paid: paidAmount,
        balance: balance,
        percentage: paymentPercentage
    });
}

// Función para cargar el historial de abonos
async function loadPaymentHistoryForOrder() {
    if (!currentOrderData) {
        console.error('No hay datos de pedido disponibles');
        return;
    }

    const container = document.getElementById('payment-history');
    const orderId = currentOrderData.id;
    
    try {
        container.innerHTML = '<div class="loading">Cargando historial de abonos...</div>';
        
        console.log('📋 Cargando historial de abonos para pedido:', orderId);
        
        const response = await fetch(`${window.API_BASE_URL}/api/orders/${orderId}/payments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const payments = await response.json();
        
        console.log('💰 Historial de abonos obtenido:', payments);
        
        if (payments.length === 0) {
            container.innerHTML = `
                <div class="no-payments">
                    <div>No hay abonos registrados para este pedido</div>
                    <small style="margin-top: 0.5rem; opacity: 0.7;">
                        Los abonos aparecerán aquí cuando se registren
                    </small>
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
                    <span>Registrado por: ${payment.recorded_by_code || 'Sistema'}</span>
                    ${payment.notes ? `<span class="payment-notes">📝 ${payment.notes}</span>` : ''}
                </div>
            </div>
        `).join('');
        
        console.log('✅ Historial de abonos mostrado correctamente');
        
    } catch (error) {
        console.error('❌ Error cargando historial de pagos:', error);
        container.innerHTML = `
            <div class="error-message">
                ❌ Error cargando historial: ${error.message}
                <div style="margin-top: 0.5rem;">
                    <button onclick="loadPaymentHistoryForOrder()" class="btn-refresh" style="font-size: 0.75rem;">
                        🔄 Reintentar
                    </button>
                </div>
            </div>
        `;
    }
}

// Función para obtener icono del método de pago
function getPaymentMethodIcon(method) {
    const icons = {
        'efectivo': '💵',
        'tarjeta': '💳',
        'transferencia': '🏦',
        'cheque': '📝'
    };
    return icons[method] || '💰';
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

    tbody.innerHTML = products.map(product => {
        // ===== CORRECCIÓN: Determinar precio unitario correctamente =====
        let unitPrice = 0;
        
        // Opción 1: Si el producto tiene unit_price (desde el pedido)
        if (product.unit_price !== undefined && product.unit_price !== null) {
            unitPrice = parseFloat(product.unit_price) || 0;
        }
        // Opción 2: Si el producto tiene price directo
        else if (product.price !== undefined && product.price !== null) {
            unitPrice = parseFloat(product.price) || 0;
        }
        // Opción 3: Si tiene line_total, calcular precio unitario
        else if (product.line_total && product.quantity) {
            unitPrice = (parseFloat(product.line_total) || 0) / (parseInt(product.quantity) || 1);
        }
        // Opción 4: Si tiene información de precios personalizados
        else if (product.custom_price_info && product.custom_price_info.custom_price) {
            unitPrice = parseFloat(product.custom_price_info.custom_price) || 0;
        }
        // Opción 5: Fallback a 0 si no se encuentra precio
        else {
            unitPrice = 0;
            console.warn('⚠️ No se pudo determinar precio para producto:', product.name || product.product_name);
        }
        
        const quantity = parseInt(product.quantity) || 0;
        const subtotal = unitPrice * quantity;
        
        // Log para debugging
        console.log('💰 Producto:', {
            name: product.name || product.product_name,
            unit_price: unitPrice,
            quantity: quantity,
            subtotal: subtotal,
            original_product: product
        });
        
        return `
            <tr>
                <td>
                    <div class="product-info">
                        <div class="product-name">${product.name || product.product_name || 'Producto sin nombre'}</div>
                        <div class="product-details">${product.brand || ''} • ${product.viscosity || ''} • ${product.capacity || ''}</div>
                        <span class="product-code">${product.code || product.product_code || 'N/A'}</span>
                        ${product.custom_price_info ? `
                            <div style="margin-top: 0.5rem;">
                                <span style="background: #232372ff; color: #fff8f8ff; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem;">
                                    Precio Personalizado
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="price-cell">
                    ${formatCurrency(unitPrice)}
                    ${product.custom_price_info ? `
                        <br><small style="color: #6b7280; text-decoration: line-through;">
                            Original: ${formatCurrency(product.custom_price_info.original_price || 0)}
                        </small>
                    ` : ''}
                </td>
                <td>
                    <span class="quantity-badge">${quantity}</span>
                </td>
                <td class="price-cell">${formatCurrency(subtotal)}</td>
            </tr>
        `;
    }).join('');
    
    console.log('✅ Tabla de productos llenada con precios corregidos');
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
// Llenar acciones según el estado del pedido - VERSIÓN MODIFICADA
function fillOrderActions(orderData) {
    const container = document.getElementById('orderActions');
    const status = orderData.status;
    const total = parseFloat(orderData.total) || 0;
    const paidAmount = parseFloat(orderData.paid_amount) || 0;
    const balance = total - paidAmount;
    
    let actions = '';
    
    if (status === 'hold') {
        // ===== MODIFICACIÓN: Agregar botón de imprimir también en estado "En Espera" =====
        actions = `
            <button class="modal-btn btn-secondary" onclick="printOrder(${orderData.id})">
                🖨️ Imprimir
            </button>
        `;
    } else if (status === 'confirmed') {
        // Mostrar botón de abono solo si hay saldo pendiente
        if (balance > 0) {
            actions = `
                <button class="modal-btn btn-payment" onclick="openPaymentModalFromOrderDetails(${orderData.id})">
                    💰 Registrar Abono
                </button>
                <button class="modal-btn btn-secondary" onclick="printOrder(${orderData.id})">
                    🖨️ Imprimir
                </button>
            `;
        } else {
            actions = `
                <button class="modal-btn btn-secondary" onclick="printOrder(${orderData.id})">
                    🖨️ Imprimir
                </button>
            `;
        }
    } else if (status === 'cancelled') {
        // Para pedidos cancelados, solo permitir imprimir
        actions = `
            <button class="modal-btn btn-secondary" onclick="printOrder(${orderData.id})">
                🖨️ Imprimir
            </button>
            <span style="color: var(--modal-danger); font-weight: 600; padding: 0.75rem;">
                ❌ Pedido Cancelado
            </span>
        `;
    }
    
    container.innerHTML = actions;
}

// ===== FUNCIÓN DE IMPRESIÓN MEJORADA PARA TODOS LOS ESTADOS =====
function printOrder(orderId) {
    if (!currentOrderData) {
        console.error('❌ No hay datos de pedido disponibles para imprimir');
        if (window.showNotification) {
            window.showNotification('Error: No hay datos del pedido para imprimir', 'error');
        }
        return;
    }
    
    console.log('🖨️ Imprimiendo pedido:', currentOrderData.order_number, 'Estado:', currentOrderData.status);
    
    // ===== FUNCIÓN HELPER PARA OBTENER PRECIO CORRECTO =====
    function getCorrectPrice(product) {
        // Misma lógica que en el modal
        if (product.unit_price !== undefined && product.unit_price !== null) {
            return parseFloat(product.unit_price) || 0;
        } else if (product.price !== undefined && product.price !== null) {
            return parseFloat(product.price) || 0;
        } else if (product.line_total && product.quantity) {
            return (parseFloat(product.line_total) || 0) / (parseInt(product.quantity) || 1);
        } else if (product.custom_price_info && product.custom_price_info.custom_price) {
            return parseFloat(product.custom_price_info.custom_price) || 0;
        }
        return 0;
    }
    
    // ===== FUNCIÓN HELPER PARA FORMATEAR MONEDA =====
    function formatCurrencyForPrint(amount) {
        if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }
    
    // ===== FUNCIÓN HELPER PARA FORMATEAR FECHAS =====
    function formatDateForPrint(dateString) {
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
    
    // ===== FUNCIÓN HELPER PARA OBTENER TEXTO Y COLOR DEL ESTADO =====
    function getStatusForPrint(status) {
        const statusMap = {
            'hold': { text: 'En Espera', color: '#d97706', background: '#fef3c7' },
            'confirmed': { text: 'Confirmado', color: '#059669', background: '#d1fae5' },
            'cancelled': { text: 'Cancelado', color: '#dc2626', background: '#fee2e2' }
        };
        return statusMap[status] || { text: status, color: '#6b7280', background: '#f3f4f6' };
    }
    
    const statusInfo = getStatusForPrint(currentOrderData.status);
    
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
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin: 10px 0;
                    background: ${statusInfo.background};
                    color: ${statusInfo.color};
                    border: 1px solid ${statusInfo.color};
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
                .payment-info {
                    background: #f0f9ff;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                    border-left: 4px solid #3b82f6;
                }
                .text-right { text-align: right; }
                .font-mono { font-family: 'Courier New', monospace; }
                
                /* Estilos específicos para estado en espera */
                .hold-notice {
                    background: #fef3c7;
                    border: 1px solid #d97706;
                    color: #92400e;
                    padding: 12px;
                    border-radius: 6px;
                    margin: 15px 0;
                    text-align: center;
                    font-weight: 600;
                }
                
                @media print {
                    body { margin: 0; padding: 15px; }
                    .section { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Pedido ${currentOrderData.order_number || '#' + currentOrderData.id}</h2>
                <div class="status-badge">${statusInfo.text}</div>
                <p>Fecha: ${formatDateForPrint(currentOrderData.created_at)}</p>
                ${currentOrderData.status === 'hold' ? `
                    <div class="hold-notice">
                        ⏳ Este pedido está pendiente de confirmación
                    </div>
                ` : ''}
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
                            <th class="text-right">Precio</th>
                            <th class="text-right">Cantidad</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(currentOrderData.products || []).map(product => {
                            const unitPrice = getCorrectPrice(product);
                            const quantity = parseInt(product.quantity) || 0;
                            const lineTotal = unitPrice * quantity;
                            
                            return `
                                <tr>
                                    <td class="font-mono">${product.code || product.product_code || 'N/A'}</td>
                                    <td>
                                        <strong>${product.name || product.product_name || 'N/A'}</strong>
                                        ${product.brand || product.viscosity || product.capacity ? 
                                            `<br><small style="color: #6b7280;">${[product.brand, product.viscosity, product.capacity].filter(Boolean).join(' • ')}</small>`
                                        : ''}
                                        ${product.custom_price_info ? '<br><small style="color: #d97706;">💰 Precio Personalizado</small>' : ''}
                                    </td>
                                    <td class="text-right">${formatCurrencyForPrint(unitPrice)}</td>
                                    <td class="text-right">${quantity}</td>
                                    <td class="text-right"><strong>${formatCurrencyForPrint(lineTotal)}</strong></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="total">Total: ${formatCurrencyForPrint(currentOrderData.total || 0)}</div>
            </div>
            
            <div class="payment-info">
                <h3>Información de Pagos</h3>
                <table>
                    <tr><th>Total del Pedido:</th><td class="text-right">${formatCurrencyForPrint(currentOrderData.total || 0)}</td></tr>
                    <tr><th>Total Abonado:</th><td class="text-right">${formatCurrencyForPrint(currentOrderData.paid_amount || 0)}</td></tr>
                    <tr><th>Saldo Pendiente:</th><td class="text-right"><strong>${formatCurrencyForPrint(Math.max(0, (currentOrderData.total || 0) - (currentOrderData.paid_amount || 0)))}</strong></td></tr>
                </table>
            </div>
            
            ${currentOrderData.notes ? `
            <div class="section">
                <h3>Notas</h3>
                <p style="background: #f8fafc; padding: 10px; border-radius: 4px; border-left: 3px solid #3b82f6;">${currentOrderData.notes}</p>
            </div>
            ` : ''}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Esperar un momento para que se cargue el contenido y luego imprimir
    setTimeout(() => {
        printWindow.print();
        console.log('✅ Ventana de impresión abierta para pedido:', currentOrderData.order_number);
    }, 500);
}

// Función para abrir el modal de pagos desde el detalle del pedido
function openPaymentModalFromOrderDetails(orderId) {
    // Cerrar el modal de detalles
    closeOrderModal();
    
    // Abrir el modal de pagos (usando la función existente)
    if (typeof openPaymentModal === 'function') {
        openPaymentModal(orderId);
    } else {
        console.error('Función openPaymentModal no encontrada');
        if (window.showNotification) {
            window.showNotification('Error: Modal de pagos no disponible', 'error');
        }
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
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
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
    
    // ===== FUNCIÓN HELPER PARA OBTENER PRECIO CORRECTO =====
    function getCorrectPrice(product) {
        // Misma lógica que en el modal
        if (product.unit_price !== undefined && product.unit_price !== null) {
            return parseFloat(product.unit_price) || 0;
        } else if (product.price !== undefined && product.price !== null) {
            return parseFloat(product.price) || 0;
        } else if (product.line_total && product.quantity) {
            return (parseFloat(product.line_total) || 0) / (parseInt(product.quantity) || 1);
        } else if (product.custom_price_info && product.custom_price_info.custom_price) {
            return parseFloat(product.custom_price_info.custom_price) || 0;
        }
        return 0;
    }
    
    // ===== FUNCIÓN HELPER PARA FORMATEAR MONEDA =====
    function formatCurrencyForPrint(amount) {
        if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }
    
    // ===== FUNCIÓN HELPER PARA FORMATEAR FECHAS =====
    function formatDateForPrint(dateString) {
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
                .payment-info {
                    background: #f0f9ff;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                    border-left: 4px solid #3b82f6;
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
                <h2>Pedido ${currentOrderData.order_number}</h2>
                <p>Fecha: ${formatDateForPrint(currentOrderData.created_at)}</p>
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
                        ${(currentOrderData.products || []).map(product => {
                            const unitPrice = getCorrectPrice(product);
                            const quantity = parseInt(product.quantity) || 0;
                            const lineTotal = unitPrice * quantity;
                            
                            return `
                                <tr>
                                    <td>${product.code || product.product_code || 'N/A'}</td>
                                    <td>${product.name || 'N/A'}</td>
                                    <td>${formatCurrencyForPrint(unitPrice)}</td>
                                    <td>${quantity}</td>
                                    <td>${formatCurrencyForPrint(lineTotal)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="total">Total: ${formatCurrencyForPrint(currentOrderData.total || 0)}</div>
            </div>
            
            <div class="payment-info">
                <h3>Información de Pagos</h3>
                <table>
                    <tr><th>Total del Pedido:</th><td>${formatCurrencyForPrint(currentOrderData.total || 0)}</td></tr>
                    <tr><th>Total Abonado:</th><td>${formatCurrencyForPrint(currentOrderData.paid_amount || 0)}</td></tr>
                    <tr><th>Saldo Pendiente:</th><td>${formatCurrencyForPrint(Math.max(0, (currentOrderData.total || 0) - (currentOrderData.paid_amount || 0)))}</td></tr>
                </table>
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
                    <tr><th>Vendedor:</th><td>${currentOrderData.employee_name || currentOrderData.employee_code || 'N/A'}</td></tr>
                    ${currentOrderData.location ? `<tr><th>Ubicación:</th><td>${currentOrderData.location.latitude.toFixed(6)}, ${currentOrderData.location.longitude.toFixed(6)}</td></tr>` : ''}
                    <tr><th>Fecha de Impresión:</th><td>${formatDateForPrint(new Date().toISOString())}</td></tr>
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

// ===== VERSIÓN ALTERNATIVA DE LA FUNCIÓN PRINCIPAL CON MÁS DEBUGGING =====
function fillProductsTableWithDebug(products) {
    console.log('🔄 Iniciando llenado de tabla de productos con debugging...');
    debugProductData(products);
    
    const tbody = document.getElementById('productsTableBody');
    
    if (!tbody) {
        console.error('❌ Elemento tbody no encontrado');
        return;
    }
    
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

    const processedProducts = products.map((product, index) => {
        // Estrategia más robusta para encontrar el precio
        const priceAttempts = [
            { source: 'unit_price', value: product.unit_price },
            { source: 'price', value: product.price },
            { source: 'custom_price', value: product.custom_price_info?.custom_price },
            { source: 'calculated_from_line_total', value: product.line_total && product.quantity ? (product.line_total / product.quantity) : null }
        ];
        
        let unitPrice = 0;
        let priceSource = 'none';
        
        for (const attempt of priceAttempts) {
            if (attempt.value !== undefined && attempt.value !== null && !isNaN(parseFloat(attempt.value))) {
                unitPrice = parseFloat(attempt.value);
                priceSource = attempt.source;
                break;
            }
        }
        
        const quantity = parseInt(product.quantity) || 0;
        const subtotal = unitPrice * quantity;
        
        console.log(`💰 Producto ${index + 1} procesado:`, {
            name: product.name || product.product_name,
            price_source: priceSource,
            unit_price: unitPrice,
            quantity: quantity,
            subtotal: subtotal
        });
        
        return {
            ...product,
            processed_unit_price: unitPrice,
            processed_quantity: quantity,
            processed_subtotal: subtotal,
            price_source: priceSource
        };
    });

    tbody.innerHTML = processedProducts.map(product => `
        <tr>
            <td>
                <div class="product-info">
                    <div class="product-name">${product.name || product.product_name || 'Producto sin nombre'}</div>
                    <div class="product-details">
                        ${product.brand || ''} 
                        ${product.viscosity ? `• ${product.viscosity}` : ''} 
                        ${product.capacity ? `• ${product.capacity}` : ''}
                    </div>
                    <span class="product-code">${product.code || product.product_code || 'N/A'}</span>
                    ${product.price_source === 'custom_price' ? `
                        <div style="margin-top: 0.5rem;">
                            <span style="background: #16457fff; color: #1f104aff; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem;">
                                Precio Personalizado
                            </span>
                        </div>
                    ` : ''}
                    ${product.price_source === 'none' ? `
                        <div style="margin-top: 0.5rem;">
                            <span style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem;">
                                Sin Precio
                            </span>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="price-cell">
                <strong>${formatCurrency(product.processed_unit_price)}</strong>
                ${product.custom_price_info && product.custom_price_info.original_price ? `
                    <br><small style="color: #6b7280; text-decoration: line-through;">
                        Orig: ${formatCurrency(product.custom_price_info.original_price)}
                    </small>
                ` : ''}
                <br><small style="color: #059669; font-size: 0.7rem;">
                    Fuente: ${product.price_source}
                </small>
            </td>
            <td style="text-align: center;">
                <span class="quantity-badge">${product.processed_quantity}</span>
            </td>
            <td class="price-cell">
                <strong>${formatCurrency(product.processed_subtotal)}</strong>
            </td>
        </tr>
    `).join('');
    
    console.log('✅ Tabla de productos completada con debugging');
}

// ===== ESTILOS CSS ADICIONALES PARA MEJORAR LA VISUALIZACIÓN =====
const additionalModalStyles = `
    .price-cell {
        text-align: right;
        font-weight: 600;
        color: var(--modal-primary);
    }
    
    .quantity-badge {
        background: var(--modal-success);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-weight: 600;
        display: inline-block;
        min-width: 60px;
        text-align: center;
    }
    
    .product-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .product-name {
        font-weight: 600;
        color: var(--modal-text);
        font-size: 1rem;
        line-height: 1.2;
    }
    
    .product-details {
        font-size: 0.875rem;
        color: var(--modal-text-light);
        line-height: 1.3;
    }
    
    .product-code {
        background: var(--modal-primary);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        display: inline-block;
        font-family: 'Courier New', monospace;
        letter-spacing: 0.5px;
    }
    
    .products-table td {
        vertical-align: top;
        padding: 1.25rem 1rem;
    }
    
    .products-table tr:hover {
        background: #f8fafc;
    }
`;

// ===== FUNCIÓN PARA INYECTAR ESTILOS ADICIONALES =====
function injectAdditionalModalStyles() {
    if (!document.getElementById('additionalModalStyles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'additionalModalStyles';
        styleElement.textContent = additionalModalStyles;
        document.head.appendChild(styleElement);
        console.log('✅ Estilos adicionales para modal inyectados');
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