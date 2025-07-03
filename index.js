import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

const app = express();

// Configuración básica
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration for Express 4.x
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In production, you might want to restrict origins
    if (process.env.NODE_ENV === 'production') {
      // Add your Render domain here
      const allowedOrigins = [
        origin,
        'https://your-app-name.onrender.com'
      ];
      const isAllowed = allowedOrigins.some(allowedOrigin => 
        origin.includes(allowedOrigin) || allowedOrigin === origin
      );
      return callback(null, isAllowed);
    } else {
      // Allow all origins in development
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "aceites-motor-secret-key-2025";

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

// Inicializar Supabase si las credenciales están disponibles
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase conectado correctamente');
  } catch (error) {
    console.error('❌ Error conectando Supabase:', error);
  }
} else {
  console.log('⚠️ Supabase no configurado - usando datos en memoria');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Configurada' : 'No configurada');
  console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Configurada' : 'No configurada');
}

// Base de datos de respaldo
const fallbackDatabase = {
  products: [
    {
      id: 1,
      code: "ACE001",
      name: "Aceite Motor 20W-50",
      brand: "Castrol",
      viscosity: "20W-50",
      capacity: "1L",
      stock: 50,
      price: 620.00, // Precio principal (cash_box) para compatibilidad
      cost: 18.50,
      // Nuevo sistema de precios múltiples
      prices: {
        cash_unit: 25.99,     // Contado - Pieza
        cash_box: 620.00,     // Contado - Caja (MOSTRADO)
        credit_unit: 27.50,   // Crédito 21 días - Pieza
        credit_box: 660.00    // Crédito 21 días - Caja
      },
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      code: "ACE002", 
      name: "Aceite Sintético 5W-30",
      brand: "Mobil 1",
      viscosity: "5W-30",
      capacity: "4L",
      stock: 25,
      price: 1079.00, // Precio principal (cash_box) para compatibilidad
      cost: 45.00,
      // Nuevo sistema de precios múltiples
      prices: {
        cash_unit: 89.99,
        cash_box: 1079.00,
        credit_unit: 95.50,
        credit_box: 1146.00
      },
      created_at: new Date().toISOString()
    }
  ],
  employees: [
    {
      id: 1,
      employee_code: "ADMIN001",
      name: "Administrador Principal",
      role: "admin",
      routes: [],
      commission_rate: 0,
      password: "password",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      employee_code: "EMP001", 
      name: "Juan Pérez",
      role: "employee",
      routes: ["Zona Norte", "Centro"],
      commission_rate: 0.05,
      password: "password",
      created_at: new Date().toISOString()
    }
  ],
  orders: [],
  sales: [],
  inventory_movements: []
};

// ===== FUNCIONES ACTUALIZADAS PARA MANEJAR MULTI-PRECIOS =====

// Función helper para migrar productos del sistema anterior al nuevo
function migrateProductPrices(product) {
  // Si el producto ya tiene el sistema de precios múltiples, devolverlo tal como está
  if (product.prices && typeof product.prices === 'object') {
    return {
      ...product,
      // Asegurar que el precio principal esté sincronizado
      price: product.prices.cash_box || product.price
    };
  }
  
  // Migrar del sistema anterior (un solo precio) al nuevo sistema
  const basePrice = product.price || 0;
  const migratedProduct = {
    ...product,
    prices: {
      cash_unit: Math.round((basePrice / 24) * 100) / 100, // Estimación: caja de 24 unidades
      cash_box: basePrice,
      credit_unit: Math.round((basePrice / 24 * 1.06) * 100) / 100, // 6% más para crédito
      credit_box: Math.round(basePrice * 1.06 * 100) / 100
    }
  };
  
  console.log(`🔄 Producto migrado a multi-precios: ${product.code}`);
  return migratedProduct;
}


// ===== NUEVA FUNCIÓN: ACTUALIZAR INVENTARIO =====
async function updateInventoryStock(products, operation = 'subtract', notes = '') {
  console.log(`📦 Actualizando inventario (${operation}):`, products);
  
  const movements = [];
  
  if (supabase) {
    try {
      // Usar transacción para asegurar consistencia
      for (const orderProduct of products) {
        const { product_id, quantity } = orderProduct;
        
        console.log(`🔄 Procesando producto ${product_id}: ${operation} ${quantity}`);
        
        // 1. Obtener stock actual
        const { data: currentProduct, error: getError } = await supabase
          .from('products')
          .select('id, code, name, stock')
          .eq('id', product_id)
          .single();
        
        if (getError) {
          console.error(`❌ Error obteniendo producto ${product_id}:`, getError);
          throw new Error(`Producto ${product_id} no encontrado: ${getError.message}`);
        }
        
        if (!currentProduct) {
          throw new Error(`Producto ${product_id} no existe`);
        }
        
        console.log(`📊 Stock actual de ${currentProduct.name}: ${currentProduct.stock}`);
        
        // 2. Calcular nuevo stock
        let newStock;
        if (operation === 'subtract') {
          newStock = currentProduct.stock - quantity;
          if (newStock < 0) {
            throw new Error(`Stock insuficiente para ${currentProduct.name}. Stock actual: ${currentProduct.stock}, solicitado: ${quantity}`);
          }
        } else if (operation === 'add') {
          newStock = currentProduct.stock + quantity;
        } else {
          throw new Error(`Operación de inventario inválida: ${operation}`);
        }
        
        console.log(`📊 Nuevo stock para ${currentProduct.name}: ${newStock}`);
        
        // 3. Actualizar stock en la base de datos
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', product_id)
          .select()
          .single();
        
        if (updateError) {
          console.error(`❌ Error actualizando stock del producto ${product_id}:`, updateError);
          throw new Error(`Error actualizando stock: ${updateError.message}`);
        }
        
        console.log(`✅ Stock actualizado para ${currentProduct.name}: ${currentProduct.stock} → ${newStock}`);
        
        // 4. Registrar movimiento de inventario
        const movement = {
          product_id: product_id,
          product_code: currentProduct.code,
          product_name: currentProduct.name,
          movement_type: operation === 'subtract' ? 'out' : 'in',
          quantity: quantity,
          previous_stock: currentProduct.stock,
          new_stock: newStock,
          reason: operation === 'subtract' ? 'sale' : 'restock',
          notes: notes,
          created_at: new Date().toISOString()
        };
        
        const { data: newMovement, error: movementError } = await supabase
          .from('inventory_movements')
          .insert([movement])
          .select()
          .single();
        
        if (movementError) {
          console.warn(`⚠️ Error registrando movimiento de inventario:`, movementError);
          // No fallar por esto, solo advertir
        } else {
          console.log(`📝 Movimiento registrado para ${currentProduct.name}`);
          movements.push(newMovement);
        }
      }
      
      console.log(`✅ Inventario actualizado exitosamente (Supabase)`);
      return { success: true, movements, database: 'supabase' };
      
    } catch (error) {
      console.error(`❌ Error actualizando inventario en Supabase:`, error);
      throw error; // Re-lanzar el error para manejarlo en la confirmación del pedido
    }
  } else {
    // Fallback: actualizar inventario en memoria
    console.log(`📦 Actualizando inventario en memoria...`);
    
    try {
      for (const orderProduct of products) {
        const { product_id, quantity } = orderProduct;
        
        // Buscar producto en memoria
        const productIndex = fallbackDatabase.products.findIndex(p => p.id === product_id);
        if (productIndex === -1) {
          throw new Error(`Producto ${product_id} no encontrado en inventario`);
        }
        
        const product = fallbackDatabase.products[productIndex];
        const previousStock = product.stock;
        
        // Calcular nuevo stock
        let newStock;
        if (operation === 'subtract') {
          newStock = previousStock - quantity;
          if (newStock < 0) {
            throw new Error(`Stock insuficiente para ${product.name}. Stock actual: ${previousStock}, solicitado: ${quantity}`);
          }
        } else if (operation === 'add') {
          newStock = previousStock + quantity;
        } else {
          throw new Error(`Operación de inventario inválida: ${operation}`);
        }
        
        // Actualizar stock
        fallbackDatabase.products[productIndex].stock = newStock;
        
        console.log(`✅ Stock actualizado para ${product.name}: ${previousStock} → ${newStock}`);
        
        // Registrar movimiento
        const movement = {
          id: fallbackDatabase.inventory_movements.length + 1,
          product_id: product_id,
          product_code: product.code,
          product_name: product.name,
          movement_type: operation === 'subtract' ? 'out' : 'in',
          quantity: quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: operation === 'subtract' ? 'sale' : 'restock',
          notes: notes,
          created_at: new Date().toISOString()
        };
        
        fallbackDatabase.inventory_movements.push(movement);
        movements.push(movement);
      }
      
      console.log(`✅ Inventario actualizado exitosamente (memoria)`);
      return { success: true, movements, database: 'memory' };
      
    } catch (error) {
      console.error(`❌ Error actualizando inventario en memoria:`, error);
      throw error;
    }
  }
}

// ===== FUNCIÓN PARA VERIFICAR STOCK DISPONIBLE =====
async function validateStockAvailability(products) {
  console.log(`🔍 Validando disponibilidad de stock para:`, products);
  
  const stockIssues = [];
  
  if (supabase) {
    try {
      for (const orderProduct of products) {
        const { product_id, quantity } = orderProduct;
        
        const { data: product, error } = await supabase
          .from('products')
          .select('id, code, name, stock')
          .eq('id', product_id)
          .single();
        
        if (error || !product) {
          stockIssues.push({
            product_id,
            issue: 'not_found',
            message: `Producto ${product_id} no encontrado`
          });
          continue;
        }
        
        if (product.stock < quantity) {
          stockIssues.push({
            product_id,
            product_name: product.name,
            issue: 'insufficient_stock',
            available: product.stock,
            requested: quantity,
            message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${quantity}`
          });
        }
      }
    } catch (error) {
      console.error('Error validando stock:', error);
      throw new Error('Error al validar disponibilidad de stock');
    }
  } else {
    // Validación en memoria
    for (const orderProduct of products) {
      const { product_id, quantity } = orderProduct;
      
      const product = fallbackDatabase.products.find(p => p.id === product_id);
      
      if (!product) {
        stockIssues.push({
          product_id,
          issue: 'not_found',
          message: `Producto ${product_id} no encontrado`
        });
        continue;
      }
      
      if (product.stock < quantity) {
        stockIssues.push({
          product_id,
          product_name: product.name,
          issue: 'insufficient_stock',
          available: product.stock,
          requested: quantity,
          message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${quantity}`
        });
      }
    }
  }
  
  if (stockIssues.length > 0) {
    console.log(`❌ Problemas de stock encontrados:`, stockIssues);
    return { valid: false, issues: stockIssues };
  }
  
  console.log(`✅ Stock disponible para todos los productos`);
  return { valid: true, issues: [] };
}

// Funciones helper para manejar Supabase o fallback (sin cambios)
async function getProducts() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Ensure backward compatibility - add prices if missing
      const productsWithPrices = (data || []).map(product => {
        if (!product.prices && product.price) {
          product.prices = {
            cash_unit: 0,
            cash_box: product.price,
            credit_unit: 0,
            credit_box: 0
          };
        }
        return product;
      });
      
      console.log('✅ Products loaded with price compatibility:', productsWithPrices.length);
      return productsWithPrices;
      
    } catch (error) {
      console.error('❌ Error getting products from Supabase:', error);
      return fallbackDatabase.products;
    }
  }
  return fallbackDatabase.products;
}

function getProductPrice(product, paymentMethod = 'cash', quantity = 1, unitType = 'unit') {
  // paymentMethod: 'cash' | 'credit'
  // quantity: número de unidades
  // unitType: 'unit' | 'box'
  
  if (!product.prices) {
    // Producto del sistema anterior
    return product.price || 0;
  }
  
  const priceKey = `${paymentMethod}_${unitType}`;
  const basePrice = product.prices[priceKey] || 0;
  
  console.log(`💰 Precio calculado para ${product.code}: ${paymentMethod} ${unitType} = $${basePrice} x ${quantity}`);
  
  return basePrice * quantity;
}

// ===== FUNCIÓN PARA CALCULAR PRECIOS EN PEDIDOS =====
function calculateOrderPricing(orderProducts, paymentMethod = 'cash') {
  let total = 0;
  const pricedProducts = [];
  
  for (const orderProduct of orderProducts) {
    // Buscar el producto completo
    const product = fallbackDatabase.products.find(p => p.id === orderProduct.product_id);
    
    if (!product) {
      console.warn(`⚠️ Producto no encontrado: ${orderProduct.product_id}`);
      continue;
    }
    
    // Determinar si es compra por unidad o caja
    // Por defecto, usar precio de caja para pedidos
    const unitType = orderProduct.unit_type || 'box';
    
    const unitPrice = getProductPrice(product, paymentMethod, 1, unitType);
    const lineTotal = unitPrice * orderProduct.quantity;
    
    total += lineTotal;
    
    pricedProducts.push({
      ...orderProduct,
      unit_price: unitPrice,
      line_total: lineTotal,
      pricing_method: `${paymentMethod}_${unitType}`,
      product_name: product.name,
      product_code: product.code
    });
  }
  
  return {
    products: pricedProducts,
    subtotal: total,
    total: total // Se pueden agregar impuestos aquí si es necesario
  };
}

async function getEmployees() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, name, role, routes, commission_rate, created_at');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting employees from Supabase:', error);
      return fallbackDatabase.employees.map(emp => {
        const { password, ...employeeData } = emp;
        return employeeData;
      });
    }
  }
  return fallbackDatabase.employees.map(emp => {
    const { password, ...employeeData } = emp;
    return employeeData;
  });
}

async function getEmployeeByCode(employee_code) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_code', employee_code)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting employee by code from Supabase:', error);
      return fallbackDatabase.employees.find(emp => emp.employee_code === employee_code);
    }
  }
  return fallbackDatabase.employees.find(emp => emp.employee_code === employee_code);
}

// Actualizar función createProduct para manejar multi-precios
async function createProduct(productData) {
  if (supabase) {
    try {
      // Prepare the data with prices compatibility
      const createData = { ...productData };
      
      // Handle prices field
      if (productData.prices) {
        createData.prices = productData.prices;
        createData.price = productData.prices.cash_box || productData.price || 0;
      } else if (productData.price) {
        createData.prices = {
          cash_unit: 0,
          cash_box: productData.price,
          credit_unit: 0,
          credit_box: 0
        };
      }
      
      console.log('🔄 Creating product with data:', createData);
      
      const { data, error } = await supabase
        .from('products')
        .insert([createData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase create error:', error);
        throw error;
      }
      
      console.log('✅ Product created in Supabase:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error creating product in Supabase:', error);
      
      // If it's a column not found error, fall back to old format
      if (error.code === 'PGRST204' && error.message.includes('prices')) {
        console.log('⚠️ Prices column not found, using old format...');
        
        const fallbackData = { ...productData };
        delete fallbackData.prices;
        
        const { data, error: fallbackError } = await supabase
          .from('products')
          .insert([fallbackData])
          .select()
          .single();
        
        if (fallbackError) throw fallbackError;
        
        console.log('✅ Product created using old format:', data);
        return data;
      }
      
      // Continue with fallback for other errors
      console.log('🔄 Falling back to memory database...');
    }
  }
  
  // Fallback: create in memory
  const newProduct = {
    id: fallbackDatabase.products.length + 1,
    ...productData,
    created_at: new Date().toISOString()
  };
  
  fallbackDatabase.products.push(newProduct);
  console.log('✅ Product created in memory:', newProduct);
  return newProduct;
}

async function updateProduct(id, productData) {
  if (supabase) {
    try {
      // Prepare the update data
      const updateData = { ...productData };
      
      // Handle backward compatibility for prices
      if (productData.prices) {
        // New multi-price system
        updateData.prices = productData.prices;
        // Also update the main price field for backward compatibility
        updateData.price = productData.prices.cash_box || productData.price || 0;
      } else if (productData.price) {
        // Old single price system - convert to new format
        updateData.prices = {
          cash_unit: 0,
          cash_box: productData.price,
          credit_unit: 0,
          credit_box: 0
        };
      }
      
      console.log('🔄 Updating product with data:', updateData);
      
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }
      
      console.log('✅ Product updated in Supabase:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error updating product in Supabase:', error);
      
      // If it's a column not found error, fall back to old format
      if (error.code === 'PGRST204' && error.message.includes('prices')) {
        console.log('⚠️ Prices column not found, using old format...');
        
        // Remove the prices field and try again with old format
        const fallbackData = { ...productData };
        delete fallbackData.prices;
        
        const { data, error: fallbackError } = await supabase
          .from('products')
          .update(fallbackData)
          .eq('id', id)
          .select()
          .single();
        
        if (fallbackError) throw fallbackError;
        
        console.log('✅ Product updated using old format:', data);
        return data;
      }
      
      // For other errors, continue with fallback to memory
      console.log('🔄 Falling back to memory database...');
    }
  }
  
  // Fallback: update in memory
  const index = fallbackDatabase.products.findIndex(p => p.id === parseInt(id));
  if (index === -1) throw new Error('Producto no encontrado');
  
  fallbackDatabase.products[index] = { 
    ...fallbackDatabase.products[index], 
    ...productData 
  };
  
  console.log('✅ Product updated in memory:', fallbackDatabase.products[index]);
  return fallbackDatabase.products[index];
}

async function deleteProduct(id) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { message: 'Producto eliminado' };
    } catch (error) {
      console.error('Error deleting product in Supabase:', error);
      // Fallback a memoria si falla Supabase
    }
  }
  
  const index = fallbackDatabase.products.findIndex(p => p.id === parseInt(id));
  if (index === -1) throw new Error('Producto no encontrado');
  
  fallbackDatabase.products.splice(index, 1);
  return { message: 'Producto eliminado' };
}

async function getOrders(employeeId = null, role = null) {
  if (supabase) {
    try {
      let query = supabase.from('orders').select('*');
      
      if (role !== 'admin' && employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting orders from Supabase:', error);
    }
  }
  
  let orders = fallbackDatabase.orders;
  if (role !== 'admin' && employeeId) {
    orders = orders.filter(order => order.employee_id === employeeId);
  }
  return orders;
}

async function createOrder(orderData) {
  console.log('🔄 Creating order with simplified payment status:', orderData);
  
  // Calcular balance de pagos
  const paymentBalance = calculatePaymentBalance(orderData.total, orderData.paid_amount || 0);
  
  // ===== NUEVO SISTEMA: Solo 2 estados =====
  // payment_status: 'paid' | 'not_paid'
  const paymentStatus = paymentBalance.is_fully_paid ? 'paid' : 'not_paid';
  
  // Preparar datos del pedido con información de pagos simplificada
  const orderWithPayments = {
    ...orderData,
    paid_amount: paymentBalance.paid_amount,
    balance: paymentBalance.balance,
    is_fully_paid: paymentBalance.is_fully_paid,
    payment_percentage: paymentBalance.payment_percentage,
    payment_status: paymentStatus, //  NUEVO: Solo 'paid' o 'not_paid'
    
    // Mantener compatibilidad con el sistema anterior
    status: paymentBalance.is_fully_paid ? 'confirmed' : 'hold',
    
    created_at: new Date().toISOString()
  };
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([orderWithPayments])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error creating order:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('✅ Order created with simplified payment status:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating order in Supabase:', error);
      throw error;
    }
  }
  
  // Fallback: create in memory
  const newOrder = {
    id: fallbackDatabase.orders.length + 1,
    ...orderWithPayments
  };
  
  fallbackDatabase.orders.push(newOrder);
  console.log('✅ Order created in memory with simplified payment status:', newOrder);
  return newOrder;
}

// Función para calcular el saldo por pagar
function calculatePaymentBalance(total, paid_amount = 0) {
  const totalAmount = parseFloat(total) || 0;
  const paidAmount = parseFloat(paid_amount) || 0;
  const balance = totalAmount - paidAmount;
  
  return {
    total: totalAmount,
    paid_amount: paidAmount,
    balance: Math.max(0, balance), // No permitir saldos negativos
    is_fully_paid: balance <= 0,
    payment_percentage: totalAmount > 0 ? (paidAmount / totalAmount * 100) : 0
  };
}

// Función para validar un abono
function validatePayment(total, current_paid, new_payment) {
  const totalAmount = parseFloat(total) || 0;
  const currentPaid = parseFloat(current_paid) || 0;
  const newPayment = parseFloat(new_payment) || 0;
  
  if (newPayment < 0) {
    throw new Error('El abono no puede ser negativo');
  }
  
  const totalPaid = currentPaid + newPayment;
  
  if (totalPaid > totalAmount) {
    throw new Error(`El abono excede el total. Máximo permitido: $${(totalAmount - currentPaid).toFixed(2)}`);
  }
  
  return {
    valid: true,
    new_total_paid: totalPaid,
    remaining_balance: totalAmount - totalPaid
  };
}

// Función para validar abono (ya existe pero agregamos validaciones extras)
function validatePaymentAmount(total, currentPaid, newPayment, allowOverpayment = false) {
  const totalAmount = parseFloat(total) || 0;
  const currentPaidAmount = parseFloat(currentPaid) || 0;
  const newPaymentAmount = parseFloat(newPayment) || 0;
  
  if (newPaymentAmount <= 0) {
    throw new Error('El monto del abono debe ser mayor a 0');
  }
  
  if (newPaymentAmount > 999999.99) {
    throw new Error('El monto del abono es demasiado grande');
  }
  
  const totalAfterPayment = currentPaidAmount + newPaymentAmount;
  
  if (!allowOverpayment && totalAfterPayment > totalAmount) {
    const maxAllowed = totalAmount - currentPaidAmount;
    throw new Error(`El abono excede el saldo pendiente. Máximo permitido: $${maxAllowed.toFixed(2)}`);
  }
  
  return {
    valid: true,
    new_total_paid: totalAfterPayment,
    remaining_balance: Math.max(0, totalAmount - totalAfterPayment),
    is_overpayment: totalAfterPayment > totalAmount,
    overpayment_amount: Math.max(0, totalAfterPayment - totalAmount)
  };
}

// Función para obtener el subalmacen activo de un empleado
async function getActiveEmployeeTrip(employeeId) {
  console.log('🔍 Buscando subalmacen activo para empleado:', employeeId);
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      console.log('✅ subalmacen activo encontrado en Supabase:', data?.trip_number);
      return data;
      
    } catch (error) {
      console.error('Error obteniendo subalmacen activo de Supabase:', error);
      // Continuar con fallback
    }
  }
  
  // Fallback: buscar en memoria
  const activeTrip = (fallbackDatabase.trips || [])
    .filter(trip => trip.employee_id === parseInt(employeeId) && trip.status === 'active')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  
  console.log('✅ subalmacen activo encontrado en memoria:', activeTrip?.trip_number);
  return activeTrip || null;
}

// Función para obtener productos disponibles en el subalmacén del empleado
async function getEmployeeSubstoreProducts(employeeId) {
  console.log('📦 Obteniendo productos del subalmacén para empleado:', employeeId);
  
  // 1. Obtener subalmacen activo del empleado
  const activeTrip = await getActiveEmployeeTrip(employeeId);
  
  if (!activeTrip) {
    console.log('⚠️ No hay subalmacen activo para el empleado');
    return {
      has_active_trip: false,
      trip: null,
      products: []
    };
  }
  
  // 2. Obtener inventario del subalmacén
  const inventory = await getSubstoreInventory(activeTrip.id);
  
  // 3. Filtrar solo productos con stock disponible
  const availableProducts = inventory.filter(item => item.current_quantity > 0);
  
  // 4. Obtener información completa de productos del almacén principal
  const allProducts = await getProducts();
  
  // 5. Combinar información del subalmacén con datos completos del producto
  const substoreProducts = availableProducts.map(substoreItem => {
    const mainProduct = allProducts.find(p => p.id === substoreItem.product_id);
    
    return {
      // Información del producto principal
      id: substoreItem.product_id,
      code: substoreItem.product_code,
      name: substoreItem.product_name,
      brand: mainProduct?.brand || 'N/A',
      viscosity: mainProduct?.viscosity || 'N/A',
      capacity: mainProduct?.capacity || 'N/A',
      cost: mainProduct?.cost || 0,
      
      // Stock del subalmacén (NO del almacén principal)
      stock: substoreItem.current_quantity,
      
      // Precios del producto principal
      price: substoreItem.price || mainProduct?.price || 0,
      prices: mainProduct?.prices || {
        cash_unit: 0,
        cash_box: substoreItem.price || mainProduct?.price || 0,
        credit_unit: 0,
        credit_box: 0
      },
      
      // Información del subalmacén
      substore_info: {
        trip_id: activeTrip.id,
        initial_quantity: substoreItem.initial_quantity,
        current_quantity: substoreItem.current_quantity,
        sold_quantity: substoreItem.sold_quantity,
        substore_price: substoreItem.price
      },
      
      created_at: mainProduct?.created_at || substoreItem.created_at
    };
  });
  
  console.log(`✅ Productos del subalmacén obtenidos: ${substoreProducts.length} disponibles de ${inventory.length} totales`);
  
  return {
    has_active_trip: true,
    trip: activeTrip,
    products: substoreProducts,
    inventory_summary: {
      total_products: inventory.length,
      available_products: substoreProducts.length,
      out_of_stock: inventory.length - substoreProducts.length
    }
  };
}

// Función helper para obtener pagos recientes de un empleado
async function getRecentPaymentsByEmployee(employeeId, limit = 5) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('order_payments')
        .select(`
          *,
          orders (
            order_number,
            client_info
          )
        `)
        .eq('recorded_by', employeeId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } else {
      // Fallback
      const payments = (fallbackDatabase.order_payments || [])
        .filter(payment => payment.recorded_by === employeeId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
      
      return payments.map(payment => {
        const order = fallbackDatabase.orders.find(o => o.id === payment.order_id);
        return {
          ...payment,
          order: order ? {
            order_number: order.order_number,
            client_info: order.client_info
          } : null
        };
      });
    }
  } catch (error) {
    console.error('Error obteniendo pagos recientes:', error);
    return [];
  }
}

async function getSales(employeeId = null, role = null) {
  if (supabase) {
    try {
      let query = supabase.from('sales').select('*');
      
      if (role !== 'admin' && employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting sales from Supabase:', error);
    }
  }
  
  let sales = fallbackDatabase.sales;
  if (role !== 'admin' && employeeId) {
    sales = sales.filter(sale => sale.employee_id === employeeId);
  }
  return sales;
}

// Middleware de autenticación
const auth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Solo administradores' });
  }
  next();
};

async function getTrips(status = null, employeeId = null) {
  console.log('🔍 getTrips llamado con:', { status, employeeId });
  
  if (supabase) {
    try {
      let query = supabase.from('trips').select(`
        *,
        substore_inventory (
          id, product_id, product_code, product_name, 
          initial_quantity, current_quantity, sold_quantity, 
          returned_quantity, price
        )
      `);
      
      if (status) query = query.eq('status', status);
      if (employeeId) query = query.eq('employee_id', employeeId);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error en Supabase getTrips:', error);
        throw error;
      }
      
      console.log('✅ Trips obtenidos de Supabase:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error getting trips from Supabase:', error);
      
      // Fallback a memoria si falla Supabase
      console.log('🔄 Usando fallback en memoria...');
    }
  }
  
  // Fallback: usar datos en memoria
  let trips = fallbackDatabase.trips || [];
  
  // Aplicar filtros
  if (status) {
    trips = trips.filter(trip => trip.status === status);
  }
  if (employeeId) {
    trips = trips.filter(trip => trip.employee_id === parseInt(employeeId));
  }
  
  // Agregar inventario de subalmacén a cada trip
  trips = trips.map(trip => ({
    ...trip,
    substore_inventory: (fallbackDatabase.substore_inventory || [])
      .filter(item => item.trip_id === trip.id)
  }));
  
  console.log('✅ Trips obtenidos de memoria:', trips.length);
  return trips;
}

// Crear subalmacen
async function createTrip(tripData) {
  console.log('🚛 Creando subalmacén permanente:', tripData);
  
  if (supabase) {
    try {
      // Crear el subalmacen permanente en Supabase
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          trip_number: tripData.trip_number,
          employee_id: tripData.employee_id,
          employee_code: tripData.employee_code,
          employee_name: tripData.employee_name,
          status: 'active',
          is_permanent: true, // Marcar como permanente
          notes: tripData.notes || '',
          start_date: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (tripError) {
        console.error('Error creando trip permanente en Supabase:', tripError);
        throw tripError;
      }
      
      console.log('✅ Subalmacén permanente creado en Supabase:', trip.trip_number);
      return trip;
    } catch (error) {
      console.error('❌ Error creating permanent trip in Supabase:', error);
      
      // Continuar con fallback si falla Supabase
      console.log('🔄 Usando fallback en memoria...');
    }
  }
  
  // Fallback: crear en memoria
  const newTrip = {
    id: (fallbackDatabase.trips?.length || 0) + 1,
    trip_number: tripData.trip_number,
    employee_id: tripData.employee_id,
    employee_code: tripData.employee_code,
    employee_name: tripData.employee_name,
    status: 'active',
    is_permanent: true, // Marcar como permanente
    notes: tripData.notes || '',
    start_date: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  if (!fallbackDatabase.trips) {
    fallbackDatabase.trips = [];
  }
  fallbackDatabase.trips.push(newTrip);
  console.log('✅ Subalmacén permanente creado en memoria:', newTrip.trip_number);
  return newTrip;
}

// Cargar productos al subalmacén
async function loadProductsToSubstore(tripId, products) {
  console.log('📦 Cargando productos al subalmacén:', { tripId, products });
  
  const loadedProducts = [];
  
  if (supabase) {
    try {
      // Procesar cada producto
      for (const product of products) {
        const { product_id, quantity, price } = product;
        
        // 1. Verificar stock disponible en almacén principal
        const { data: mainProduct, error: getError } = await supabase
          .from('products')
          .select('id, code, name, stock')
          .eq('id', product_id)
          .single();
        
        if (getError || !mainProduct) {
          throw new Error(`Producto ${product_id} no encontrado`);
        }
        
        if (mainProduct.stock < quantity) {
          throw new Error(`Stock insuficiente para ${mainProduct.name}. Disponible: ${mainProduct.stock}, solicitado: ${quantity}`);
        }
        
        // 2. Reducir stock del almacén principal
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: mainProduct.stock - quantity })
          .eq('id', product_id);
        
        if (updateError) throw updateError;
        
        // 3. Agregar al subalmacén
        const { data: substoreItem, error: substoreError } = await supabase
          .from('substore_inventory')
          .insert([{
            trip_id: tripId,
            product_id: product_id,
            product_code: mainProduct.code,
            product_name: mainProduct.name,
            initial_quantity: quantity,
            current_quantity: quantity,
            sold_quantity: 0,
            returned_quantity: 0,
            price: price || mainProduct.price || 0
          }])
          .select()
          .single();
        
        if (substoreError) throw substoreError;
        
        loadedProducts.push(substoreItem);
        console.log(`✅ Producto ${mainProduct.name} cargado al subalmacén`);
      }
      
      return { success: true, products: loadedProducts };
      
    } catch (error) {
      console.error('❌ Error cargando productos al subalmacén (Supabase):', error);
      
      // Continuar con fallback
      console.log('🔄 Usando fallback en memoria...');
    }
  }
  
  // Fallback: cargar en memoria
  for (const product of products) {
    const { product_id, quantity, price } = product;
    
    // Buscar producto en memoria
    const mainProduct = fallbackDatabase.products.find(p => p.id === product_id);
    if (!mainProduct) {
      throw new Error(`Producto ${product_id} no encontrado`);
    }
    
    if (mainProduct.stock < quantity) {
      throw new Error(`Stock insuficiente para ${mainProduct.name}. Disponible: ${mainProduct.stock}, solicitado: ${quantity}`);
    }
    
    // Reducir stock principal
    mainProduct.stock -= quantity;
    
    // Agregar al subalmacén
    const substoreItem = {
      id: (fallbackDatabase.substore_inventory?.length || 0) + 1,
      trip_id: tripId,
      product_id: product_id,
      product_code: mainProduct.code,
      product_name: mainProduct.name,
      initial_quantity: quantity,
      current_quantity: quantity,
      sold_quantity: 0,
      returned_quantity: 0,
      price: price || mainProduct.price || 0,
      created_at: new Date().toISOString()
    };
    
    fallbackDatabase.substore_inventory.push(substoreItem);
    loadedProducts.push(substoreItem);
    
    console.log(`✅ Producto ${mainProduct.name} cargado al subalmacén (memoria)`);
  }
  
  return { success: true, products: loadedProducts };
}

// Obtener inventario de subalmacén
async function getSubstoreInventory(tripId) {
  console.log('📦 getSubstoreInventory llamado para trip:', tripId);
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('substore_inventory')
        .select('*')
        .eq('trip_id', tripId)
        .order('product_code');
      
      if (error) {
        console.error('Error obteniendo inventario de Supabase:', error);
        throw error;
      }
      
      console.log('✅ Inventario obtenido de Supabase:', data?.length || 0, 'items');
      return data || [];
    } catch (error) {
      console.error('❌ Error getting substore inventory from Supabase:', error);
      
      // Continuar con fallback
      console.log('🔄 Usando fallback en memoria...');
    }
  }
  
  // Fallback: obtener de memoria
  const inventory = (fallbackDatabase.substore_inventory || [])
    .filter(item => item.trip_id === parseInt(tripId));
  
  console.log('✅ Inventario obtenido de memoria:', inventory.length, 'items');
  return inventory;
}

// Vender producto del subalmacén
async function sellFromSubstore(tripId, productId, quantity, saleData) {
  console.log('💰 Venta desde subalmacén permanente:', { tripId, productId, quantity });
  
  if (supabase) {
    try {
      // 1. Obtener item del subalmacén
      const { data: substoreItem, error: getError } = await supabase
        .from('substore_inventory')
        .select('*')
        .eq('trip_id', tripId)
        .eq('product_id', productId)
        .single();
      
      if (getError || !substoreItem) {
        throw new Error('Producto no encontrado en subalmacén');
      }
      
      if (substoreItem.current_quantity < quantity) {
        throw new Error(`Stock insuficiente en subalmacén. Disponible: ${substoreItem.current_quantity}`);
      }
      
      // 2. Actualizar inventario del subalmacén
      const newCurrentQuantity = substoreItem.current_quantity - quantity;
      const newSoldQuantity = substoreItem.sold_quantity + quantity;
      
      const { error: updateError } = await supabase
        .from('substore_inventory')
        .update({
          current_quantity: newCurrentQuantity,
          sold_quantity: newSoldQuantity
        })
        .eq('id', substoreItem.id);
      
      if (updateError) throw updateError;
      
      // 3. Si el producto se agotó completamente, verificar si se debe remover
      if (newCurrentQuantity === 0) {
        console.log(`📦 Producto ${substoreItem.product_name} se agotó en el subalmacén`);
        
        // Opcional: Auto-remover productos agotados después de cierto tiempo
        // Por ahora solo lo marcamos para revisión manual
        await supabase
          .from('substore_inventory')
          .update({
            out_of_stock_since: new Date().toISOString()
          })
          .eq('id', substoreItem.id);
      }
      
      // 4. Registrar movimiento del subalmacén
      await supabase
        .from('substore_movements')
        .insert([{
          trip_id: tripId,
          product_id: productId,
          product_code: substoreItem.product_code,
          product_name: substoreItem.product_name,
          movement_type: 'sale',
          quantity: quantity,
          previous_quantity: substoreItem.current_quantity,
          new_quantity: newCurrentQuantity,
          reference_id: saleData?.order_id || null,
          reference_type: 'sale',
          notes: `Venta - ${saleData?.client_info?.name || 'Cliente'}`,
          created_at: new Date().toISOString()
        }]);
      
      console.log(`✅ Venta registrada en subalmacén permanente`);
      return { success: true, product_depleted: newCurrentQuantity === 0 };
      
    } catch (error) {
      console.error('❌ Error en venta desde subalmacén permanente:', error);
      throw error;
    }
  } else {
    // Fallback en memoria
    const substoreItem = (fallbackDatabase.substore_inventory || [])
      .find(item => item.trip_id === tripId && item.product_id === productId);
    
    if (!substoreItem) {
      throw new Error('Producto no encontrado en subalmacén');
    }
    
    if (substoreItem.current_quantity < quantity) {
      throw new Error(`Stock insuficiente en subalmacén`);
    }
    
    substoreItem.current_quantity -= quantity;
    substoreItem.sold_quantity += quantity;
    
    // Marcar si se agotó
    if (substoreItem.current_quantity === 0) {
      substoreItem.out_of_stock_since = new Date().toISOString();
    }
    
    return { success: true, product_depleted: substoreItem.current_quantity === 0 };
  }
}

async function addProductToExistingTrip(tripId, productData) {
  console.log('➕ Agregando producto a subalmacén permanente:', { tripId, productData });
  
  const { product_id, quantity, price } = productData;
  
  if (supabase) {
    try {
      // 1. Verificar que el trip existe y está activo
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('status', 'active')
        .single();
      
      if (tripError || !trip) {
        throw new Error('Subalmacén no encontrado o no está activo');
      }
      
      // 2. Verificar stock disponible en almacén principal
      const { data: mainProduct, error: getError } = await supabase
        .from('products')
        .select('id, code, name, stock')
        .eq('id', product_id)
        .single();
      
      if (getError || !mainProduct) {
        throw new Error(`Producto ${product_id} no encontrado`);
      }
      
      if (mainProduct.stock < quantity) {
        throw new Error(`Stock insuficiente en almacén principal. Disponible: ${mainProduct.stock}, solicitado: ${quantity}`);
      }
      
      // 3. Verificar si el producto ya existe en el subalmacén
      const { data: existingItem, error: checkError } = await supabase
        .from('substore_inventory')
        .select('*')
        .eq('trip_id', tripId)
        .eq('product_id', product_id)
        .single();
      
      if (existingItem) {
        // Producto ya existe, agregar cantidad
        const newQuantity = existingItem.current_quantity + quantity;
        
        const { error: updateError } = await supabase
          .from('substore_inventory')
          .update({
            current_quantity: newQuantity,
            out_of_stock_since: null // Remover marca de agotado
          })
          .eq('id', existingItem.id);
        
        if (updateError) throw updateError;
        
        console.log(`✅ Cantidad agregada a producto existente: ${mainProduct.name} (+${quantity})`);
      } else {
        // Producto nuevo, crear entrada
        const { error: insertError } = await supabase
          .from('substore_inventory')
          .insert([{
            trip_id: tripId,
            product_id: product_id,
            product_code: mainProduct.code,
            product_name: mainProduct.name,
            initial_quantity: quantity,
            current_quantity: quantity,
            sold_quantity: 0,
            returned_quantity: 0,
            price: price || mainProduct.price || 0,
            created_at: new Date().toISOString()
          }]);
        
        if (insertError) throw insertError;
        
        console.log(`✅ Nuevo producto agregado al subalmacén: ${mainProduct.name}`);
      }
      
      // 4. Reducir stock del almacén principal
      const { error: reduceError } = await supabase
        .from('products')
        .update({ stock: mainProduct.stock - quantity })
        .eq('id', product_id);
      
      if (reduceError) throw reduceError;
      
      // 5. Registrar movimiento
      await supabase
        .from('substore_movements')
        .insert([{
          trip_id: tripId,
          product_id: product_id,
          product_code: mainProduct.code,
          product_name: mainProduct.name,
          movement_type: 'transfer_in',
          quantity: quantity,
          previous_quantity: existingItem?.current_quantity || 0,
          new_quantity: (existingItem?.current_quantity || 0) + quantity,
          reference_type: 'manual_add',
          notes: `Transferencia manual al subalmacén`,
          created_at: new Date().toISOString()
        }]);
      
      return { success: true, action: existingItem ? 'quantity_added' : 'product_added' };
      
    } catch (error) {
      console.error('❌ Error agregando producto al subalmacén:', error);
      throw error;
    }
  } else {
    // Fallback en memoria
    const trip = (fallbackDatabase.trips || []).find(t => t.id === tripId && t.status === 'active');
    if (!trip) {
      throw new Error('Subalmacén no encontrado o no está activo');
    }
    
    const mainProduct = fallbackDatabase.products.find(p => p.id === product_id);
    if (!mainProduct) {
      throw new Error(`Producto ${product_id} no encontrado`);
    }
    
    if (mainProduct.stock < quantity) {
      throw new Error(`Stock insuficiente en almacén principal`);
    }
    
    // Buscar si ya existe
    const existingItemIndex = (fallbackDatabase.substore_inventory || [])
      .findIndex(item => item.trip_id === tripId && item.product_id === product_id);
    
    if (existingItemIndex >= 0) {
      // Agregar cantidad
      fallbackDatabase.substore_inventory[existingItemIndex].current_quantity += quantity;
      fallbackDatabase.substore_inventory[existingItemIndex].out_of_stock_since = null;
    } else {
      // Crear nuevo
      const newItem = {
        id: (fallbackDatabase.substore_inventory?.length || 0) + 1,
        trip_id: tripId,
        product_id: product_id,
        product_code: mainProduct.code,
        product_name: mainProduct.name,
        initial_quantity: quantity,
        current_quantity: quantity,
        sold_quantity: 0,
        returned_quantity: 0,
        price: price || mainProduct.price || 0,
        created_at: new Date().toISOString()
      };
      
      if (!fallbackDatabase.substore_inventory) {
        fallbackDatabase.substore_inventory = [];
      }
      fallbackDatabase.substore_inventory.push(newItem);
    }
    
    // Reducir stock principal
    mainProduct.stock -= quantity;
    
    return { success: true, action: existingItemIndex >= 0 ? 'quantity_added' : 'product_added' };
  }
}

// Nueva función para remover producto del subalmacén
async function removeProductFromTrip(tripId, productId) {
  console.log('➖ Removiendo producto del subalmacén permanente:', { tripId, productId });
  
  if (supabase) {
    try {
      // 1. Obtener item del subalmacén
      const { data: substoreItem, error: getError } = await supabase
        .from('substore_inventory')
        .select('*')
        .eq('trip_id', tripId)
        .eq('product_id', productId)
        .single();
      
      if (getError || !substoreItem) {
        throw new Error('Producto no encontrado en el subalmacén');
      }
      
      // 2. Verificar que no tenga stock (solo se pueden remover productos agotados)
      if (substoreItem.current_quantity > 0) {
        throw new Error(`No se puede remover un producto con stock disponible (${substoreItem.current_quantity} unidades)`);
      }
      
      // 3. Obtener producto principal para devolución
      const { data: mainProduct, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;
      
      // 4. Si hay cantidad devuelta pendiente, devolverla al almacén principal
      if (substoreItem.returned_quantity > 0) {
        const { error: returnError } = await supabase
          .from('products')
          .update({ stock: mainProduct.stock + substoreItem.returned_quantity })
          .eq('id', productId);
        
        if (returnError) throw returnError;
      }
      
      // 5. Registrar movimiento de salida
      await supabase
        .from('substore_movements')
        .insert([{
          trip_id: tripId,
          product_id: productId,
          product_code: substoreItem.product_code,
          product_name: substoreItem.product_name,
          movement_type: 'removal',
          quantity: 0,
          previous_quantity: substoreItem.current_quantity,
          new_quantity: 0,
          reference_type: 'manual_removal',
          notes: `Producto removido del subalmacén (sin stock)`,
          created_at: new Date().toISOString()
        }]);
      
      // 6. Eliminar del subalmacén
      const { error: deleteError } = await supabase
        .from('substore_inventory')
        .delete()
        .eq('id', substoreItem.id);
      
      if (deleteError) throw deleteError;
      
      console.log(`✅ Producto ${substoreItem.product_name} removido del subalmacén`);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error removiendo producto del subalmacén:', error);
      throw error;
    }
  } else {
    // Fallback en memoria
    const itemIndex = (fallbackDatabase.substore_inventory || [])
      .findIndex(item => item.trip_id === tripId && item.product_id === productId);
    
    if (itemIndex === -1) {
      throw new Error('Producto no encontrado en el subalmacén');
    }
    
    const item = fallbackDatabase.substore_inventory[itemIndex];
    
    if (item.current_quantity > 0) {
      throw new Error(`No se puede remover un producto con stock disponible`);
    }
    
    // Devolver cantidad pendiente al almacén principal
    if (item.returned_quantity > 0) {
      const mainProduct = fallbackDatabase.products.find(p => p.id === productId);
      if (mainProduct) {
        mainProduct.stock += item.returned_quantity;
      }
    }
    
    // Remover del array
    fallbackDatabase.substore_inventory.splice(itemIndex, 1);
    
    return { success: true };
  }
}

// Actualizar función getTrips para incluir información de productos agotados
async function getTripsWithDepletedInfo(status = null, employeeId = null) {
  console.log('🔍 getTripsWithDepletedInfo llamado con:', { status, employeeId });
  
  if (supabase) {
    try {
      let query = supabase.from('trips').select(`
        *,
        substore_inventory (
          id, product_id, product_code, product_name, 
          initial_quantity, current_quantity, sold_quantity, 
          returned_quantity, price, out_of_stock_since
        )
      `);
      
      if (status) query = query.eq('status', status);
      if (employeeId) query = query.eq('employee_id', employeeId);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error en Supabase getTripsWithDepletedInfo:', error);
        throw error;
      }
      
      // Agregar información de productos agotados
      const tripsWithInfo = (data || []).map(trip => {
        const inventory = trip.substore_inventory || [];
        const depletedProducts = inventory.filter(item => item.current_quantity === 0);
        
        return {
          ...trip,
          depleted_products_count: depletedProducts.length,
          has_depleted_products: depletedProducts.length > 0,
          substore_inventory: inventory
        };
      });
      
      console.log('✅ Trips with depleted info obtenidos de Supabase:', tripsWithInfo?.length || 0);
      return tripsWithInfo;
    } catch (error) {
      console.error('❌ Error getting trips with depleted info from Supabase:', error);
      
      // Fallback a memoria si falla Supabase
      console.log('🔄 Usando fallback en memoria...');
    }
  }
  
  // Fallback: usar datos en memoria
  let trips = fallbackDatabase.trips || [];
  
  // Aplicar filtros
  if (status) {
    trips = trips.filter(trip => trip.status === status);
  }
  if (employeeId) {
    trips = trips.filter(trip => trip.employee_id === parseInt(employeeId));
  }
  
  // Agregar inventario de subalmacén a cada trip con información de agotados
  trips = trips.map(trip => {
    const inventory = (fallbackDatabase.substore_inventory || [])
      .filter(item => item.trip_id === trip.id);
    
    const depletedProducts = inventory.filter(item => item.current_quantity === 0);
    
    return {
      ...trip,
      depleted_products_count: depletedProducts.length,
      has_depleted_products: depletedProducts.length > 0,
      substore_inventory: inventory
    };
  });
  
  console.log('✅ Trips with depleted info obtenidos de memoria:', trips.length);
  return trips;
}


// Devolver productos al almacén principal
async function returnToMainStore(tripId, products) {
  console.log('🔄 Devolviendo productos al almacén principal:', { tripId, products });
  
  if (supabase) {
    try {
      for (const returnItem of products) {
        const { product_id, quantity } = returnItem;
        
        // 1. Obtener item del subalmacén
        const { data: substoreItem, error: getError } = await supabase
          .from('substore_inventory')
          .select('*')
          .eq('trip_id', tripId)
          .eq('product_id', product_id)
          .single();
        
        if (getError || !substoreItem) {
          throw new Error(`Producto ${product_id} no encontrado en subalmacén`);
        }
        
        if (substoreItem.current_quantity < quantity) {
          throw new Error(`Cantidad a devolver mayor que disponible en subalmacén`);
        }
        
        // 2. Actualizar subalmacén
        const { error: updateSubstoreError } = await supabase
          .from('substore_inventory')
          .update({
            current_quantity: substoreItem.current_quantity - quantity,
            returned_quantity: (substoreItem.returned_quantity || 0) + quantity
          })
          .eq('id', substoreItem.id);
        
        if (updateSubstoreError) throw updateSubstoreError;
        
        // 3. Actualizar almacén principal
        const { data: mainProduct, error: getMainError } = await supabase
          .from('products')
          .select('stock')
          .eq('id', product_id)
          .single();
        
        if (getMainError) throw getMainError;
        
        const { error: updateMainError } = await supabase
          .from('products')
          .update({ stock: mainProduct.stock + quantity })
          .eq('id', product_id);
        
        if (updateMainError) throw updateMainError;
        
        console.log(`✅ Producto ${substoreItem.product_name} devuelto al almacén principal`);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error devolviendo productos (Supabase):', error);
      throw error;
    }
  } else {
    // Fallback: devolver en memoria
    for (const returnItem of products) {
      const { product_id, quantity } = returnItem;
      
      const substoreItem = fallbackDatabase.substore_inventory.find(
        item => item.trip_id === parseInt(tripId) && item.product_id === product_id
      );
      
      const mainProduct = fallbackDatabase.products.find(p => p.id === product_id);
      
      if (!substoreItem || !mainProduct) {
        throw new Error(`Producto ${product_id} no encontrado`);
      }
      
      if (substoreItem.current_quantity < quantity) {
        throw new Error(`Cantidad a devolver mayor que disponible`);
      }
      
      substoreItem.current_quantity -= quantity;
      substoreItem.returned_quantity = (substoreItem.returned_quantity || 0) + quantity;
      mainProduct.stock += quantity;
      
      console.log(`✅ Producto ${substoreItem.product_name} devuelto al almacén principal (memoria)`);
    }
    
    return { success: true };
  }
}

// Finalizar subalmacen
async function completeTrip(tripId, returnProducts = []) {
  console.log('🏁 Finalizando subalmacen:', tripId, 'con productos:', returnProducts);
  
  try {
    // 1. Devolver productos si los hay
    if (returnProducts.length > 0) {
      await returnToMainStore(tripId, returnProducts);
    }
    
    // 2. Actualizar estado del subalmacen
    if (supabase) {
      const { error } = await supabase
        .from('trips')
        .update({
          status: 'completed',
          end_date: new Date().toISOString()
        })
        .eq('id', tripId);
      
      if (error) {
        console.error('Error actualizando trip en Supabase:', error);
        throw error;
      }
      
      console.log('✅ Trip finalizado en Supabase');
    } else {
      // Fallback: actualizar en memoria
      const trip = fallbackDatabase.trips.find(t => t.id === parseInt(tripId));
      if (trip) {
        trip.status = 'completed';
        trip.end_date = new Date().toISOString();
        console.log('✅ Trip finalizado en memoria');
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error finalizando subalmacen:', error);
    throw error;
  }
}
// PUT - Modificar la función de confirmación de pedidos para manejar productos agotados
async function confirmOrderFromSubstorePermanent(orderId, tripId, paymentInfo) {
  console.log('🔄 Confirmando pedido desde subalmacén permanente:', { orderId, tripId });
  
  try {
    // 1. Obtener el pedido
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        throw new Error('Pedido no encontrado');
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Pedido no encontrado');
      }
    }
    
    if (order.status === 'confirmed') {
      throw new Error('El pedido ya está confirmado');
    }
    
    // 2. Validar stock en subalmacén y procesar venta
    const depletedProducts = [];
    
    if (order.products && Array.isArray(order.products)) {
      for (const orderProduct of order.products) {
        const saleResult = await sellFromSubstore(tripId, orderProduct.product_id, orderProduct.quantity, {
          order_id: orderId,
          client_info: order.client_info
        });
        
        // Verificar si el producto se agotó
        if (saleResult.product_depleted) {
          depletedProducts.push(orderProduct.product_id);
        }
      }
    }
    
    // 3. Actualizar pedido
    if (supabase) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          trip_id: tripId,
          confirmed_at: new Date().toISOString(),
          payment_info: paymentInfo
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      order = updatedOrder;
    } else {
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      fallbackDatabase.orders[orderIndex] = {
        ...order,
        status: 'confirmed',
        trip_id: tripId,
        confirmed_at: new Date().toISOString(),
        payment_info: paymentInfo
      };
      order = fallbackDatabase.orders[orderIndex];
    }
    
    // 4. Crear venta
    const saleData = {
      order_id: orderId,
      trip_id: tripId,
      sale_number: `SALE-${Date.now()}`,
      employee_id: order.employee_id,
      employee_code: order.employee_code,
      client_info: order.client_info,
      products: order.products,
      total: order.total,
      payment_info: paymentInfo,
      location: order.location,
      notes: order.notes,
      created_at: new Date().toISOString()
    };
    
    let newSale = null;
    if (supabase) {
      const { data, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();
      
      if (!saleError) newSale = data;
    } else {
      newSale = {
        id: fallbackDatabase.sales.length + 1,
        ...saleData
      };
      fallbackDatabase.sales.push(newSale);
    }
    
    return { 
      order, 
      sale: newSale, 
      depleted_products: depletedProducts,
      depleted_count: depletedProducts.length
    };
    
  } catch (error) {
    console.error('❌ Error confirmando pedido desde subalmacén permanente:', error);
    throw error;
  }
}

// NUEVA función para confirmar pedido desde subalmacén
async function confirmOrderFromSubstore(orderId, tripId, paymentInfo) {
  console.log('🔄 Confirmando pedido desde subalmacén:', { orderId, tripId });
  
  try {
    // 1. Obtener el pedido
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        throw new Error('Pedido no encontrado');
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Pedido no encontrado');
      }
    }
    
    if (order.status === 'confirmed') {
      throw new Error('El pedido ya está confirmado');
    }
    
    // 2. Validar stock en subalmacén y procesar venta
    if (order.products && Array.isArray(order.products)) {
      for (const orderProduct of order.products) {
        await sellFromSubstore(tripId, orderProduct.product_id, orderProduct.quantity, {
          order_id: orderId,
          client_info: order.client_info
        });
      }
    }
    
    // 3. Actualizar pedido
    if (supabase) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          trip_id: tripId,
          confirmed_at: new Date().toISOString(),
          payment_info: paymentInfo
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      order = updatedOrder;
    } else {
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      fallbackDatabase.orders[orderIndex] = {
        ...order,
        status: 'confirmed',
        trip_id: tripId,
        confirmed_at: new Date().toISOString(),
        payment_info: paymentInfo
      };
      order = fallbackDatabase.orders[orderIndex];
    }
    
    // 4. Crear venta
    const saleData = {
      order_id: orderId,
      trip_id: tripId,
      sale_number: `SALE-${Date.now()}`,
      employee_id: order.employee_id,
      employee_code: order.employee_code,
      client_info: order.client_info,
      products: order.products,
      total: order.total,
      payment_info: paymentInfo,
      location: order.location,
      notes: order.notes,
      created_at: new Date().toISOString()
    };
    
    if (supabase) {
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();
      
      if (saleError) {
        console.warn('⚠️ Error creando venta:', saleError);
      }
      
      return { order, sale: newSale };
    } else {
      const newSale = {
        id: fallbackDatabase.sales.length + 1,
        ...saleData
      };
      fallbackDatabase.sales.push(newSale);
      return { order, sale: newSale };
    }
    
  } catch (error) {
    console.error('❌ Error confirmando pedido desde subalmacén:', error);
    throw error;
  }
}
// ========== ARCHIVOS ESTÁTICOS ==========
app.use(express.static(path.join(__dirname, 'frontend')));

// ========== RUTAS DE API ==========
// Test endpoint
app.get("/test", async (req, res) => {
  try {
    const products = await getProducts();
    const employees = await getEmployees();
    
    res.json({
      message: "API funcionando correctamente ✅",
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      database: {
        type: supabase ? 'Supabase (PostgreSQL)' : 'En memoria',
        connected: !!supabase,
        products: products.length,
        employees: employees.length
      },
      supabase: {
        url: supabaseUrl ? 'Configurada' : 'No configurada',
        status: supabase ? 'Conectado' : 'No disponible'
      },
      empleados: employees.map(emp => ({
        id: emp.id,
        employee_code: emp.employee_code,
        name: emp.name,
        role: emp.role
      }))
    });
  } catch (error) {
    console.error('Error in /test endpoint:', error);
    res.status(500).json({
      message: "Error en API",
      error: error.message,
      database: supabase ? 'Supabase (con error)' : 'En memoria'
    });
  }
});

// Status endpoint
app.get("/api/status", async (req, res) => {
  try {
    const products = await getProducts();
    const employees = await getEmployees();
    
    res.json({
      status: 'OK',
      version: '2.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: {
        type: supabase ? 'Supabase' : 'Fallback',
        connected: !!supabase,
        products: products.length,
        employees: employees.length
      }
    });
  } catch (error) {
    console.error('Error in /api/status endpoint:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Login endpoint
app.post("/auth/login", async (req, res) => {
  try {
    console.log("🔐 Login attempt:", req.body.employee_code);
    
    const { employee_code, password } = req.body;
    
    if (!employee_code || !password) {
      return res.status(400).json({ message: 'Faltan datos' });
    }
    
    const employee = await getEmployeeByCode(employee_code);
    
    if (!employee || employee.password !== password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { 
        id: employee.id, 
        employee_code: employee.employee_code, 
        role: employee.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log("✅ Login exitoso:", employee.name);

    res.json({ 
      token, 
      user: { 
        id: employee.id, 
        name: employee.name, 
        role: employee.role,
        employee_code: employee.employee_code,
        commission_rate: employee.commission_rate
      } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// API Routes - Productos
app.get("/api/products", auth, async (req, res) => {
  try {
    console.log('📦 GET /api/products - User:', req.user?.role, 'ID:', req.user?.id);
    
    if (req.user.role === 'admin') {
      // Administradores ven todos los productos del almacén principal
      const products = await getProducts();
      res.json(products);
    } else if (req.user.role === 'employee') {
      // Empleados ven solo productos de su subalmacén activo
      const substoreData = await getEmployeeSubstoreProducts(req.user.id);
      
      res.json({
        products: substoreData.products,
        substore_info: {
          has_active_trip: substoreData.has_active_trip,
          trip: substoreData.trip,
          inventory_summary: substoreData.inventory_summary
        }
      });
    } else {
      res.status(403).json({ message: 'Rol no autorizado' });
    }
    
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ 
      message: 'Error obteniendo productos', 
      error: error.message 
    });
  }
});

app.get("/api/substore/products", auth, async (req, res) => {
  try {
    console.log('📦 GET /api/substore/products - Empleado:', req.user?.id);
    
    if (req.user.role !== 'employee') {
      return res.status(403).json({ 
        message: 'Esta ruta es solo para empleados' 
      });
    }
    
    const substoreData = await getEmployeeSubstoreProducts(req.user.id);
    
    res.json(substoreData);
    
  } catch (error) {
    console.error('Error getting substore products:', error);
    res.status(500).json({ 
      message: 'Error obteniendo productos del subalmacén', 
      error: error.message 
    });
  }
});

app.get("/api/products/:id/pricing", auth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { payment_method = 'cash', unit_type = 'box', quantity = 1 } = req.query;
    
    console.log(`💰 Solicitud de precio para producto ${productId}:`, { payment_method, unit_type, quantity });
    
    // Buscar producto
    const products = await getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    // Calcular precio
    const price = getProductPrice(product, payment_method, parseInt(quantity), unit_type);
    
    res.json({
      product_id: productId,
      product_code: product.code,
      product_name: product.name,
      pricing: {
        payment_method,
        unit_type,
        quantity: parseInt(quantity),
        unit_price: price / parseInt(quantity),
        total_price: price
      },
      available_prices: product.prices || { legacy_price: product.price }
    });
    
  } catch (error) {
    console.error('Error getting product pricing:', error);
    res.status(500).json({ 
      message: 'Error obteniendo precios del producto', 
      error: error.message 
    });
  }
});

// ===== ENDPOINT PARA MIGRAR PRODUCTOS AL NUEVO SISTEMA =====
app.post("/api/products/migrate-pricing", auth, adminOnly, async (req, res) => {
  try {
    console.log('🔄 Iniciando migración de productos a sistema multi-precios...');
    
    const products = await getProducts();
    let migratedCount = 0;
    let alreadyMigratedCount = 0;
    
    for (const product of products) {
      if (product.prices && typeof product.prices === 'object') {
        alreadyMigratedCount++;
        continue;
      }
      
      // Migrar producto
      const migratedProduct = migrateProductPrices(product);
      
      try {
        await updateProduct(product.id, migratedProduct);
        migratedCount++;
        console.log(`✅ Producto migrado: ${product.code}`);
      } catch (error) {
        console.error(`❌ Error migrando producto ${product.code}:`, error);
      }
    }
    
    res.json({
      message: 'Migración completada',
      total_products: products.length,
      migrated: migratedCount,
      already_migrated: alreadyMigratedCount,
      errors: products.length - migratedCount - alreadyMigratedCount
    });
    
  } catch (error) {
    console.error('Error in migration:', error);
    res.status(500).json({ 
      message: 'Error en migración', 
      error: error.message 
    });
  }
});

app.post("/api/products/bulk-pricing", auth, async (req, res) => {
  try {
    const { product_ids, payment_method = 'cash', unit_type = 'box' } = req.body;
    
    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({ message: 'Se requiere un array de product_ids' });
    }
    
    console.log(`💰 Calculando precios masivos para ${product_ids.length} productos`);
    
    const products = await getProducts();
    const pricingResults = [];
    
    for (const productId of product_ids) {
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        pricingResults.push({
          product_id: productId,
          error: 'Producto no encontrado'
        });
        continue;
      }
      
      const price = getProductPrice(product, payment_method, 1, unit_type);
      
      pricingResults.push({
        product_id: productId,
        product_code: product.code,
        product_name: product.name,
        payment_method,
        unit_type,
        unit_price: price,
        available_prices: product.prices || { legacy_price: product.price }
      });
    }
    
    res.json({
      pricing_method: `${payment_method}_${unit_type}`,
      results: pricingResults,
      total_requested: product_ids.length,
      total_found: pricingResults.filter(r => !r.error).length
    });
    
  } catch (error) {
    console.error('Error in bulk pricing:', error);
    res.status(500).json({ 
      message: 'Error calculando precios masivos', 
      error: error.message 
    });
  }
});

app.post("/api/orders/:id/payments", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { amount, payment_method, notes } = req.body;
    
    console.log('💰 Adding payment to order:', { orderId, amount, payment_method });
    
    // Validaciones
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        message: 'El monto del abono debe ser mayor a 0' 
      });
    }
    
    // Obtener el pedido
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && order.employee_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permisos para agregar abonos a este pedido' 
      });
    }
    
    // Validar el abono
    const validation = validatePayment(order.total, order.paid_amount || 0, amount);
    
    // Calcular nuevo balance
    const newPaymentBalance = calculatePaymentBalance(order.total, validation.new_total_paid);
    
    // Crear registro del abono
    const paymentRecord = {
      order_id: orderId,
      amount: parseFloat(amount),
      payment_method: payment_method || 'efectivo',
      notes: notes || '',
      recorded_by: req.user.id,
      recorded_by_code: req.user.employee_code,
      created_at: new Date().toISOString()
    };
    
    // Actualizar pedido
    if (supabase) {
      // Actualizar pedido en Supabase
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          paid_amount: newPaymentBalance.paid_amount,
          balance: newPaymentBalance.balance,
          is_fully_paid: newPaymentBalance.is_fully_paid,
          payment_percentage: newPaymentBalance.payment_percentage,
          payment_status: newPaymentBalance.is_fully_paid ? 'paid' : 'partial',
          last_payment_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Registrar el abono
      const { data: newPayment, error: paymentError } = await supabase
        .from('order_payments')
        .insert([paymentRecord])
        .select()
        .single();
      
      if (paymentError) {
        console.warn('⚠️ Error registrando abono:', paymentError);
      }
      
      res.json({
        message: 'Abono registrado exitosamente',
        order: updatedOrder,
        payment: newPayment,
        payment_summary: newPaymentBalance
      });
      
    } else {
      // Fallback: actualizar en memoria
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      
      fallbackDatabase.orders[orderIndex] = {
        ...order,
        paid_amount: newPaymentBalance.paid_amount,
        balance: newPaymentBalance.balance,
        is_fully_paid: newPaymentBalance.is_fully_paid,
        payment_percentage: newPaymentBalance.payment_percentage,
        payment_status: newPaymentBalance.is_fully_paid ? 'paid' : 'partial',
        last_payment_at: new Date().toISOString()
      };
      
      // Registrar abono en memoria
      if (!fallbackDatabase.order_payments) {
        fallbackDatabase.order_payments = [];
      }
      
      const newPayment = {
        id: fallbackDatabase.order_payments.length + 1,
        ...paymentRecord
      };
      
      fallbackDatabase.order_payments.push(newPayment);
      
      res.json({
        message: 'Abono registrado exitosamente',
        order: fallbackDatabase.orders[orderIndex],
        payment: newPayment,
        payment_summary: newPaymentBalance
      });
    }
    
  } catch (error) {
    console.error('❌ Error adding payment to order:', error);
    res.status(500).json({ 
      message: 'Error registrando abono: ' + error.message,
      error: error.message 
    });
  }
});

// GET - Obtener historial de abonos de un pedido
app.get("/api/orders/:id/payments", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    console.log('📋 Getting payment history for order:', orderId);
    
    if (supabase) {
      const { data, error } = await supabase
        .from('order_payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data || []);
    } else {
      const payments = (fallbackDatabase.order_payments || [])
        .filter(payment => payment.order_id === orderId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      res.json(payments);
    }
    
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({ 
      message: 'Error obteniendo historial de abonos', 
      error: error.message 
    });
  }
});

// PUT - Actualizar información de contacto del cliente
app.put("/api/orders/:id/client-info", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { client_info } = req.body;
    
    console.log('📝 Actualizando información del cliente:', orderId);
    
    if (!client_info || !client_info.name) {
      return res.status(400).json({ 
        message: 'El nombre del cliente es requerido' 
      });
    }
    
    // Obtener la orden
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        return res.status(404).json({ message: 'Orden no encontrada' });
      }
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && order.employee_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar esta orden' 
      });
    }
    
    // Actualizar información del cliente
    const updatedClientInfo = {
      ...order.client_info,
      ...client_info
    };
    
    if (supabase) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ client_info: updatedClientInfo })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      res.json({
        message: 'Información del cliente actualizada',
        order: updatedOrder
      });
    } else {
      // Fallback: actualizar en memoria
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      fallbackDatabase.orders[orderIndex].client_info = updatedClientInfo;
      
      res.json({
        message: 'Información del cliente actualizada',
        order: fallbackDatabase.orders[orderIndex]
      });
    }
    
  } catch (error) {
    console.error('❌ Error actualizando información del cliente:', error);
    res.status(500).json({ 
      message: 'Error actualizando información del cliente', 
      error: error.message 
    });
  }
});

// PUT - Actualizar abono directo en pedido
app.put("/api/orders/:id/paid-amount", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { paid_amount } = req.body;
    
    console.log('💰 Updating paid amount for order:', { orderId, paid_amount });
    
    // Validaciones
    if (paid_amount < 0) {
      return res.status(400).json({ 
        message: 'El monto abonado no puede ser negativo' 
      });
    }
    
    // Obtener el pedido
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && order.employee_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar este pedido' 
      });
    }
    
    // Validar que no exceda el total
    if (paid_amount > order.total) {
      return res.status(400).json({ 
        message: `El abono no puede exceder el total del pedido ($${order.total})` 
      });
    }
    
    // Calcular nuevo balance
    const newPaymentBalance = calculatePaymentBalance(order.total, paid_amount);
    
    // Actualizar pedido
    if (supabase) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          paid_amount: newPaymentBalance.paid_amount,
          balance: newPaymentBalance.balance,
          is_fully_paid: newPaymentBalance.is_fully_paid,
          payment_percentage: newPaymentBalance.payment_percentage,
          payment_status: newPaymentBalance.is_fully_paid ? 'paid' : 'partial',
          last_payment_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      res.json({
        message: 'Abono actualizado exitosamente',
        order: updatedOrder,
        payment_summary: newPaymentBalance
      });
      
    } else {
      // Fallback: actualizar en memoria
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      
      fallbackDatabase.orders[orderIndex] = {
        ...order,
        paid_amount: newPaymentBalance.paid_amount,
        balance: newPaymentBalance.balance,
        is_fully_paid: newPaymentBalance.is_fully_paid,
        payment_percentage: newPaymentBalance.payment_percentage,
        payment_status: newPaymentBalance.is_fully_paid ? 'paid' : 'partial',
        last_payment_at: new Date().toISOString()
      };
      
      res.json({
        message: 'Abono actualizado exitosamente',
        order: fallbackDatabase.orders[orderIndex],
        payment_summary: newPaymentBalance
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating paid amount:', error);
    res.status(500).json({ 
      message: 'Error actualizando abono: ' + error.message,
      error: error.message 
    });
  }
});

// GET - Estadísticas de cobranza para empleado
app.get("/api/employee/collection-stats", auth, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Solo para empleados' });
    }
    
    const { period = 'month' } = req.query; // month, week, year
    
    console.log('📊 Calculando estadísticas de cobranza:', period);
    
    const orders = await getOrders(req.user.id, req.user.role);
    const confirmedOrders = orders.filter(o => o.status === 'confirmed');
    
    // Filtrar por período
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    const periodOrders = confirmedOrders.filter(order => 
      new Date(order.created_at) >= startDate
    );
    
    // Calcular métricas
    const totalSales = periodOrders.reduce((sum, order) => 
      sum + (parseFloat(order.total) || 0), 0
    );
    
    const totalCollected = periodOrders.reduce((sum, order) => 
      sum + (parseFloat(order.paid_amount) || 0), 0
    );
    
    const totalPending = totalSales - totalCollected;
    
    const collectionRate = totalSales > 0 ? (totalCollected / totalSales * 100) : 0;
    
    // Órdenes por estado de pago
    const fullyPaid = periodOrders.filter(order => {
      const balance = (parseFloat(order.total) || 0) - (parseFloat(order.paid_amount) || 0);
      return balance <= 0;
    }).length;
    
    const partiallyPaid = periodOrders.filter(order => {
      const total = parseFloat(order.total) || 0;
      const paid = parseFloat(order.paid_amount) || 0;
      return paid > 0 && paid < total;
    }).length;
    
    const unpaid = periodOrders.length - fullyPaid - partiallyPaid;
    
    res.json({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      metrics: {
        total_orders: periodOrders.length,
        total_sales: totalSales,
        total_collected: totalCollected,
        total_pending: totalPending,
        collection_rate: collectionRate
      },
      orders_by_payment_status: {
        fully_paid: fullyPaid,
        partially_paid: partiallyPaid,
        unpaid: unpaid
      },
      commission_info: {
        commission_rate: req.user.commission_rate || 0.05,
        estimated_commission: totalCollected * (req.user.commission_rate || 0.05)
      }
    });
    
  } catch (error) {
    console.error('❌ Error calculando estadísticas de cobranza:', error);
    res.status(500).json({ 
      message: 'Error al calcular estadísticas', 
      error: error.message 
    });
  }
});


app.post("/api/products", auth, adminOnly, async (req, res) => {
  try {
    const newProduct = await createProduct(req.body);
    res.json(newProduct);
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ message: 'Error creando producto', error: error.message });
  }
});

app.put("/api/products/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedProduct = await updateProduct(id, req.body);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error in PUT /api/products/:id:', error);
    res.status(500).json({ message: 'Error actualizando producto', error: error.message });
  }
});

app.delete("/api/products/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await deleteProduct(id);
    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/products/:id:', error);
    res.status(500).json({ message: 'Error eliminando producto', error: error.message });
  }
});

// API Routes - Empleados
app.get("/api/employees", auth, adminOnly, async (req, res) => {
  try {
    const employees = await getEmployees();
    res.json(employees);
  } catch (error) {
    console.error('Error in GET /api/employees:', error);
    res.status(500).json({ message: 'Error obteniendo empleados', error: error.message });
  }
});

// ========== API ROUTES - PEDIDOS (CON GESTIÓN DE INVENTARIO) ==========

// GET Orders - Lista de pedidos
app.get("/api/orders", auth, async (req, res) => {
  try {
    console.log('🔍 GET /api/orders with new filters - User:', req.user?.role);
    
    const { payment_status, client_search } = req.query;
    
    let orders = await getOrders(req.user.id, req.user.role);
    
    // ===== NUEVO: Aplicar filtros del lado del servidor =====
    
    // Filtro por estado de pago
    if (payment_status) {
      orders = orders.filter(order => {
        const total = parseFloat(order.total) || 0;
        const paidAmount = parseFloat(order.paid_amount) || 0;
        const balance = total - paidAmount;
        
        if (payment_status === 'paid') {
          return balance <= 0; // Pagado completamente
        } else if (payment_status === 'not_paid') {
          return balance > 0; // No pagado (incluye parciales)
        }
        return true;
      });
    }
    
    // Filtro por búsqueda de cliente
    if (client_search && client_search.trim()) {
      const searchTerm = client_search.toLowerCase().trim();
      orders = orders.filter(order => {
        const clientName = order.client_info?.name?.toLowerCase() || '';
        const orderNumber = order.order_number?.toLowerCase() || '';
        const employeeCode = order.employee_code?.toLowerCase() || '';
        
        return clientName.includes(searchTerm) || 
               orderNumber.includes(searchTerm) ||
               employeeCode.includes(searchTerm);
      });
    }
    
    // Agregar indicadores de estado simplificados
    orders = orders.map(order => {
      const total = parseFloat(order.total) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;
      const balance = total - paidAmount;
      
      return {
        ...order,
        payment_status: balance <= 0 ? 'paid' : 'not_paid',
        is_paid: balance <= 0,
        balance: balance,
        payment_percentage: total > 0 ? (paidAmount / total * 100) : 0,
        
        // Mantener campos para compatibilidad
        auto_confirmed: order.auto_confirmed || false,
        requires_admin_action: false // Ya no usamos este concepto
      };
    });
    
    console.log('✅ Orders filtered:', {
      total: orders.length,
      paid: orders.filter(o => o.payment_status === 'paid').length,
      not_paid: orders.filter(o => o.payment_status === 'not_paid').length
    });
    
    res.json(orders);
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    res.status(500).json({ message: 'Error obteniendo pedidos', error: error.message });
  }
});

// POST Orders - Crear nuevo pedido CON VALIDACIÓN DE STOCK
app.post("/api/orders", auth, async (req, res) => {
  try {
    console.log('🔍 POST /api/orders CORREGIDO - User:', req.user?.role, 'ID:', req.user?.id);
    
    const { products, payment_method = 'cash' } = req.body;
    
    // Validar que hay productos en el pedido
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        message: 'El pedido debe contener al menos un producto',
        error: 'invalid_products'
      });
    }
    
    let orderData;
    let inventorySource = 'main_store';
    let autoConfirm = false;
    let substoreData = null; // ✅ DECLARAR AQUÍ PARA AMBOS CASOS
    
    if (req.user.role === 'admin') {
      console.log('👑 Admin creando pedido desde almacén principal');
      
      const pricingResult = calculateOrderPricing(products, payment_method);
      const stockValidation = await validateStockAvailability(products);
      
      if (!stockValidation.valid) {
        return res.status(400).json({
          message: 'Stock insuficiente en almacén principal',
          error: 'insufficient_stock',
          stock_issues: stockValidation.issues
        });
      }
      
      orderData = {
        order_number: `ORD-${Date.now()}`,
        employee_id: req.user.id,
        employee_code: req.user.employee_code,
        status: 'hold',
        payment_method: payment_method,
        products: pricingResult.products,
        subtotal: pricingResult.subtotal,
        total: pricingResult.total,
        inventory_source: 'main_store',
        auto_confirmed: false,
        ...req.body
      };
      
      autoConfirm = false;
      
    } else if (req.user.role === 'employee') {
      console.log('👤 Empleado creando pedido con AUTO-CONFIRMACIÓN');
      
      try {
        // ✅ ASIGNAR substoreData AQUÍ
        substoreData = await getEmployeeSubstoreProducts(req.user.id);
        console.log('📦 Datos del subalmacén obtenidos:', {
          has_active_trip: substoreData.has_active_trip,
          products_count: substoreData.products.length
        });
      } catch (substoreError) {
        console.error('❌ Error obteniendo datos del subalmacén:', substoreError);
        return res.status(500).json({
          message: 'Error verificando subalmacén del empleado',
          error: 'substore_error',
          details: substoreError.message
        });
      }
      
      if (!substoreData.has_active_trip) {
        return res.status(400).json({
          message: 'No tienes un subalmacen activo. Contacta al administrador para que te asigne productos.',
          error: 'no_active_trip'
        });
      }

      // Validar stock en subalmacén
      const substoreStockIssues = [];
      const validatedProducts = [];
      
      for (const orderProduct of products) {
        const { product_id, quantity } = orderProduct;
        
        console.log(`🔍 Validando producto ${product_id}, cantidad: ${quantity}`);
        
        const substoreProduct = substoreData.products.find(p => p.id === product_id);
        
        if (!substoreProduct) {
          console.error(`❌ Producto ${product_id} no encontrado en subalmacén`);
          substoreStockIssues.push({
            product_id,
            issue: 'not_in_substore',
            message: `Producto ${product_id} no está disponible en tu subalmacén`
          });
          continue;
        }
        
        if (substoreProduct.stock < quantity) {
          console.error(`❌ Stock insuficiente para producto ${product_id}`);
          substoreStockIssues.push({
            product_id,
            product_name: substoreProduct.name,
            issue: 'insufficient_substore_stock',
            available: substoreProduct.stock,
            requested: quantity,
            message: `Stock insuficiente en subalmacén para ${substoreProduct.name}. Disponible: ${substoreProduct.stock}, solicitado: ${quantity}`
          });
          continue;
        }
        
        // Producto válido
        validatedProducts.push({
          ...orderProduct,
          product_name: substoreProduct.name,
          product_code: substoreProduct.code,
          unit_price: substoreProduct.substore_info?.substore_price || substoreProduct.price,
          line_total: (substoreProduct.substore_info?.substore_price || substoreProduct.price) * quantity,
          substore_info: substoreProduct.substore_info
        });
        
        console.log(`✅ Producto ${product_id} validado exitosamente`);
      }
      
      if (substoreStockIssues.length > 0) {
        console.error('❌ Problemas de stock encontrados:', substoreStockIssues);
        return res.status(400).json({
          message: 'Problemas de stock en subalmacén',
          error: 'insufficient_substore_stock',
          stock_issues: substoreStockIssues
        });
      }

      const subtotal = validatedProducts.reduce((sum, p) => sum + p.line_total, 0);
      
      orderData = {
        order_number: `ORD-${Date.now()}`,
        employee_id: req.user.id,
        employee_code: req.user.employee_code,
        trip_id: substoreData.trip.id,
        status: 'confirmed',
        payment_method: payment_method,
        products: validatedProducts,
        subtotal: subtotal,
        total: subtotal,
        inventory_source: 'substore',
        confirmed_at: new Date().toISOString(),
        auto_confirmed: true,
        ...req.body
      };
      
      inventorySource = 'substore';
      autoConfirm = true;
      
    } else {
      return res.status(403).json({ message: 'Rol no autorizado' });
    }

    try {
      // Crear el pedido
      const newOrder = await createOrder(orderData);
      
      console.log(`✅ Pedido creado desde ${inventorySource}:`, newOrder.id, autoConfirm ? '(AUTO-CONFIRMADO)' : '(PENDIENTE)');
      
      // Auto-confirmación para empleados
      let saleRecord = null;
      let inventoryUpdate = null;
      
      if (autoConfirm && req.user.role === 'employee') {
        console.log('🔄 Auto-confirmando pedido del empleado...');
        
        try {
          // Procesar venta desde subalmacén automáticamente
          if (orderData.products && Array.isArray(orderData.products)) {
            for (const orderProduct of orderData.products) {
              const { product_id, quantity } = orderProduct;
              
              console.log(`📦 Vendiendo automáticamente desde subalmacén: ${product_id} x ${quantity}`);
              
              await sellFromSubstore(orderData.trip_id, product_id, quantity, {
                order_id: newOrder.id,
                client_info: orderData.client_info
              });
            }
            
            inventoryUpdate = {
              type: 'substore_auto_confirmed',
              trip_id: orderData.trip_id,
              products_updated: orderData.products.length
            };
          }
          
          // Crear registro de venta automáticamente
          const saleData = {
            order_id: newOrder.id,
            trip_id: orderData.trip_id,
            sale_number: `SALE-${Date.now()}`,
            employee_id: newOrder.employee_id,
            employee_code: newOrder.employee_code,
            client_info: newOrder.client_info,
            products: newOrder.products,
            total: newOrder.total,
            payment_info: {
              method: payment_method,
              auto_confirmed: true,
              confirmed_at: new Date().toISOString()
            },
            inventory_source: 'substore', // ✅ AHORA ESTA COLUMNA EXISTE
            location: newOrder.location,
            notes: newOrder.notes,
            created_at: new Date().toISOString()
          };
          
          if (supabase) {
            const { data: newSale, error: saleError } = await supabase
              .from('sales')
              .insert([saleData])
              .select()
              .single();
            
            if (!saleError) {
              saleRecord = newSale;
              console.log('✅ Venta creada automáticamente:', newSale.sale_number);
            } else {
              console.warn('⚠️ Error creando venta automática:', saleError);
              // No fallar todo el proceso por esto
            }
          } else {
            saleRecord = {
              id: fallbackDatabase.sales.length + 1,
              ...saleData
            };
            fallbackDatabase.sales.push(saleRecord);
            console.log('✅ Venta creada automáticamente (memoria):', saleRecord.sale_number);
          }
          
        } catch (autoConfirmError) {
          console.error('❌ Error en auto-confirmación:', autoConfirmError);
          
          // Si falla la auto-confirmación, revertir el pedido a 'hold'
          if (supabase) {
            await supabase
              .from('orders')
              .update({ 
                status: 'hold',
                auto_confirmed: false,
                confirmed_at: null,
                auto_confirm_error: autoConfirmError.message
              })
              .eq('id', newOrder.id);
          } else {
            const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === newOrder.id);
            if (orderIndex >= 0) {
              fallbackDatabase.orders[orderIndex].status = 'hold';
              fallbackDatabase.orders[orderIndex].auto_confirmed = false;
              fallbackDatabase.orders[orderIndex].confirmed_at = null;
            }
          }
          
          return res.status(500).json({
            success: false,
            message: 'Error en auto-confirmación del pedido',
            error: autoConfirmError.message,
            order: newOrder,
            note: 'El pedido fue creado pero no pudo ser confirmado automáticamente'
          });
        }
      }
      
      // Preparar respuesta
      const response = {
        success: true,
        message: autoConfirm ? 'Pedido creado y confirmado automáticamente' : 'Pedido creado exitosamente',
        order: newOrder,
        sale: saleRecord,
        inventory_source: inventorySource,
        auto_confirmed: autoConfirm,
        inventory_update: inventoryUpdate,
        trip_info: inventorySource === 'substore' ? {
          trip_id: orderData.trip_id,
          trip_number: substoreData?.trip?.trip_number // ✅ AHORA substoreData ESTÁ DEFINIDO
        } : null
      };
      
      res.status(201).json(response);
      
    } catch (createError) {
      console.error('❌ Error creating order in database:', createError);
      
      return res.status(500).json({
        success: false,
        message: 'Error interno creando pedido',
        error: createError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error crítico en POST /api/orders:', error);
    console.error('❌ Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor', 
      error: error.message
    });
  }
});


app.get("/api/orders/stats", auth, async (req, res) => {
  try {
    console.log('📊 Getting order statistics with new payment system');
    
    let orders = await getOrders(req.user.id, req.user.role);
    
    // Calcular estadísticas por estado de pago
    const paidOrders = orders.filter(order => {
      const total = parseFloat(order.total) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;
      const balance = total - paidAmount;
      return balance <= 0;
    });
    
    const notPaidOrders = orders.filter(order => {
      const total = parseFloat(order.total) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;
      const balance = total - paidAmount;
      return balance > 0;
    });
    
    // Calcular totales financieros
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const pendingRevenue = notPaidOrders.reduce((sum, order) => {
      const total = parseFloat(order.total) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;
      return sum + (total - paidAmount);
    }, 0);
    
    const partiallyPaidOrders = notPaidOrders.filter(order => (parseFloat(order.paid_amount) || 0) > 0);
    
    const stats = {
      total_orders: orders.length,
      paid_orders: paidOrders.length,
      not_paid_orders: notPaidOrders.length,
      partially_paid_orders: partiallyPaidOrders.length,
      
      // Financieros
      total_revenue: totalRevenue,
      pending_revenue: pendingRevenue,
      collected_revenue: orders.reduce((sum, order) => sum + (parseFloat(order.paid_amount) || 0), 0),
      
      // Porcentajes
      paid_percentage: orders.length > 0 ? (paidOrders.length / orders.length * 100) : 0,
      collection_rate: totalRevenue > 0 ? (totalRevenue / (totalRevenue + pendingRevenue) * 100) : 0,
      
      // Por fuente de inventario
      main_store_orders: orders.filter(o => o.inventory_source !== 'substore').length,
      substore_orders: orders.filter(o => o.inventory_source === 'substore').length,
      
      last_updated: new Date().toISOString()
    };
    
    console.log('📊 Order statistics calculated:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('Error getting order statistics:', error);
    res.status(500).json({ 
      message: 'Error obteniendo estadísticas', 
      error: error.message 
    });
  }
});

app.get("/api/orders/search", auth, async (req, res) => {
  try {
    const { client_name, status } = req.query;
    
    console.log('🔍 Búsqueda de órdenes:', { client_name, status, employee: req.user.employee_code });
    
    if (!client_name || client_name.trim().length < 2) {
      return res.status(400).json({ 
        message: 'El nombre del cliente debe tener al menos 2 caracteres' 
      });
    }
    
    let orders = await getOrders(req.user.id, req.user.role);
    
    // Filtrar por nombre del cliente
    const filteredOrders = orders.filter(order => 
      order.client_info && 
      order.client_info.name && 
      order.client_info.name.toLowerCase().includes(client_name.toLowerCase().trim())
    );
    
    // Filtrar por estado si se especifica
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }
    
    // Agregar información de pagos calculada
    const ordersWithPayments = filteredOrders.map(order => {
      const total = parseFloat(order.total) || 0;
      const paidAmount = parseFloat(order.paid_amount) || 0;
      const balance = total - paidAmount;
      const paymentPercentage = total > 0 ? (paidAmount / total * 100) : 0;
      
      return {
        ...order,
        payment_summary: {
          total,
          paid_amount: paidAmount,
          balance,
          payment_percentage: paymentPercentage,
          is_fully_paid: balance <= 0,
          payment_status: balance <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending')
        }
      };
    });
    
    console.log('✅ Órdenes encontradas:', ordersWithPayments.length);
    
    res.json({
      search_term: client_name,
      total_found: ordersWithPayments.length,
      orders: ordersWithPayments
    });
    
  } catch (error) {
    console.error('❌ Error en búsqueda de órdenes:', error);
    res.status(500).json({ 
      message: 'Error al buscar órdenes', 
      error: error.message 
    });
  }
});

// PUT Confirm Order - CON GESTIÓN AUTOMÁTICA DE INVENTARIO
app.put("/api/orders/:id/confirm", auth, adminOnly, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { payment_info } = req.body;
    
    console.log(`🔄 CONFIRMAR PEDIDO CON NUEVO SISTEMA - Order ID: ${orderId}`);
    
    // Validaciones básicas
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ message: 'ID de pedido inválido' });
    }
    
    if (!payment_info || !payment_info.method) {
      return res.status(400).json({ message: 'Información de pago requerida' });
    }
    
    // Obtener el pedido
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
    }
    
    // ===== NUEVO: Verificar si ya está pagado =====
    const total = parseFloat(order.total) || 0;
    const currentPaid = parseFloat(order.paid_amount) || 0;
    const balance = total - currentPaid;
    
    if (balance <= 0) {
      return res.status(400).json({ 
        message: 'El pedido ya está completamente pagado',
        payment_status: 'paid',
        current_balance: balance
      });
    }
    
    console.log('📦 Fuente de inventario:', order.inventory_source || 'main_store');
    
    let inventoryUpdate = null;
    
    // Procesar según la fuente del inventario (sin cambios)
    if (order.inventory_source === 'substore' && order.trip_id) {
      console.log('🚛 Confirmando pedido desde subalmacén, trip:', order.trip_id);
      
      if (order.products && Array.isArray(order.products)) {
        for (const orderProduct of order.products) {
          const { product_id, quantity } = orderProduct;
          console.log(`📦 Vendiendo desde subalmacén: ${product_id} x ${quantity}`);
          await sellFromSubstore(order.trip_id, product_id, quantity, {
            order_id: orderId,
            client_info: order.client_info
          });
        }
        
        inventoryUpdate = {
          type: 'substore',
          trip_id: order.trip_id,
          products_updated: order.products.length
        };
      }
    } else {
      console.log('🏪 Confirmando pedido desde almacén principal');
      
      if (order.products && Array.isArray(order.products)) {
        const stockValidation = await validateStockAvailability(order.products);
        
        if (!stockValidation.valid) {
          return res.status(400).json({
            message: 'Stock insuficiente en almacén principal',
            error: 'insufficient_stock_on_confirm',
            stock_issues: stockValidation.issues
          });
        }
        
        inventoryUpdate = await updateInventoryStock(
          order.products, 
          'subtract', 
          `Venta - Pedido ${order.order_number} confirmado`
        );
      }
    }
    
    // ===== NUEVO: Marcar como pagado según el método de confirmación =====
    let newPaidAmount = currentPaid;
    let newPaymentStatus = 'not_paid';
    
    // Si se confirma manualmente, asumir que se paga completo
    if (payment_info.mark_as_paid !== false) {
      newPaidAmount = total;
      newPaymentStatus = 'paid';
    }
    
    const newBalance = total - newPaidAmount;
    
    // Actualizar estado del pedido
    const updateData = {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      payment_info: payment_info,
      
      // ===== NUEVO SISTEMA DE PAGOS =====
      paid_amount: newPaidAmount,
      balance: newBalance,
      is_fully_paid: newBalance <= 0,
      payment_status: newPaymentStatus,
      payment_percentage: total > 0 ? (newPaidAmount / total * 100) : 0
    };
    
    if (supabase) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      order = updatedOrder;
    } else {
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      fallbackDatabase.orders[orderIndex] = {
        ...order,
        ...updateData
      };
      order = fallbackDatabase.orders[orderIndex];
    }
    
    // Crear registro de venta (sin cambios)
    const saleData = {
      order_id: orderId,
      trip_id: order.trip_id || null,
      sale_number: `SALE-${Date.now()}`,
      employee_id: order.employee_id,
      employee_code: order.employee_code,
      client_info: order.client_info,
      products: order.products,
      total: order.total,
      payment_info: payment_info,
      inventory_source: order.inventory_source || 'main_store',
      location: order.location,
      notes: order.notes,
      created_at: new Date().toISOString()
    };
    
    let newSale = null;
    if (supabase) {
      const { data, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();
      
      if (!saleError) newSale = data;
    } else {
      newSale = {
        id: fallbackDatabase.sales.length + 1,
        ...saleData
      };
      fallbackDatabase.sales.push(newSale);
    }
    
    console.log(`✅ Pedido ${orderId} confirmado con nuevo sistema desde ${order.inventory_source || 'main_store'}`);
    console.log(`💰 Estado de pago: ${newPaymentStatus} (${newPaidAmount}/${total})`);
    
    res.json({ 
      message: 'Pedido confirmado exitosamente',
      order: order,
      sale: newSale,
      inventory_update: inventoryUpdate,
      inventory_source: order.inventory_source || 'main_store',
      payment_summary: {
        previous_paid: currentPaid,
        new_paid: newPaidAmount,
        total: total,
        balance: newBalance,
        status: newPaymentStatus
      }
    });
    
  } catch (error) {
    console.error('❌ ERROR en confirmación con nuevo sistema:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al confirmar pedido', 
      error: error.message
    });
  }
});

// PUT Cancel Order - Cancelar pedido (sin cambios en inventario)
app.put("/api/orders/:id/cancel", auth, adminOnly, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { reason } = req.body;
    
    console.log(`🚫 CANCELAR PEDIDO - DEBUG:`);
    console.log(`- Order ID: ${orderId}`);
    console.log(`- Motivo: ${reason}`);
    console.log(`- Usuario: ${req.user?.name}`);
    
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ message: 'ID de pedido inválido' });
    }
    
    if (supabase) {
      try {
        const { data: order, error: getError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (getError || !order) {
          return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        
        if (order.status === 'confirmed') {
          return res.status(400).json({ 
            message: 'No se puede cancelar un pedido ya confirmado. El inventario ya fue actualizado.',
            suggestion: 'Para revertir esta venta, contacte al administrador del sistema.'
          });
        }
        
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || 'Cancelado por administrador'
          })
          .eq('id', orderId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        console.log(`✅ Pedido ${orderId} cancelado exitosamente`);
        return res.json({ 
          message: 'Pedido cancelado exitosamente',
          order: updatedOrder
        });
        
      } catch (error) {
        console.error('Error en Supabase, usando fallback:', error);
      }
    }
    
    // Fallback
    const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    const order = fallbackDatabase.orders[orderIndex];
    if (order.status === 'confirmed') {
      return res.status(400).json({ 
        message: 'No se puede cancelar un pedido ya confirmado. El inventario ya fue actualizado.',
        suggestion: 'Para revertir esta venta, contacte al administrador del sistema.'
      });
    }
    
    fallbackDatabase.orders[orderIndex] = {
      ...order,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'Cancelado por administrador'
    };
    
    console.log(`✅ Pedido ${orderId} cancelado exitosamente (fallback)`);
    res.json({ 
      message: 'Pedido cancelado exitosamente',
      order: fallbackDatabase.orders[orderIndex]
    });
    
  } catch (error) {
    console.error('❌ Error cancelando pedido:', error);
    res.status(500).json({ 
      message: 'Error al cancelar pedido', 
      error: error.message 
    });
  }
});

app.put("/api/orders/:id/mark-paid", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { payment_method = 'efectivo', notes = '' } = req.body;
    
    console.log('💰 Marcando pedido como pagado completamente:', orderId);
    
    // Obtener el pedido
    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
      order = data;
    } else {
      order = fallbackDatabase.orders.find(o => o.id === orderId);
      if (!order) {
        return res.status(404).json({ message: 'Pedido no encontrado' });
      }
    }
    
    // Verificar permisos
    if (req.user.role !== 'admin' && order.employee_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permisos para modificar este pedido' 
      });
    }
    
    const total = parseFloat(order.total) || 0;
    const currentPaid = parseFloat(order.paid_amount) || 0;
    
    if (currentPaid >= total) {
      return res.status(400).json({ 
        message: 'El pedido ya está completamente pagado',
        current_status: 'paid'
      });
    }
    
    // Actualizar como pagado completamente
    const updateData = {
      paid_amount: total,
      balance: 0,
      is_fully_paid: true,
      payment_status: 'paid',
      payment_percentage: 100,
      last_payment_at: new Date().toISOString()
    };
    
    if (supabase) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      // Registrar el pago completo
      const paymentRecord = {
        order_id: orderId,
        amount: total - currentPaid,
        payment_method: payment_method,
        notes: notes || 'Marcado como pagado completamente',
        recorded_by: req.user.id,
        recorded_by_code: req.user.employee_code,
        created_at: new Date().toISOString()
      };
      
      await supabase
        .from('order_payments')
        .insert([paymentRecord]);
      
      res.json({
        message: 'Pedido marcado como pagado completamente',
        order: updatedOrder,
        payment_added: total - currentPaid
      });
      
    } else {
      // Fallback: actualizar en memoria
      const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
      
      fallbackDatabase.orders[orderIndex] = {
        ...order,
        ...updateData
      };
      
      res.json({
        message: 'Pedido marcado como pagado completamente',
        order: fallbackDatabase.orders[orderIndex],
        payment_added: total - currentPaid
      });
    }
    
  } catch (error) {
    console.error('❌ Error marking order as paid:', error);
    res.status(500).json({ 
      message: 'Error marcando como pagado: ' + error.message,
      error: error.message 
    });
  }
});

// GET Order Details - Obtener detalles de un pedido específico
app.get("/api/orders/:id", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    console.log(`🔍 GET ORDER DETAILS - ID: ${orderId}, Usuario: ${req.user?.name}`);
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          if (req.user.role !== 'admin' && data.employee_id !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permisos para ver este pedido' });
          }
          return res.json(data);
        }
      } catch (error) {
        console.error('Error obteniendo pedido de Supabase:', error);
      }
    }
    
    // Fallback
    const order = fallbackDatabase.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    if (req.user.role !== 'admin' && order.employee_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para ver este pedido' });
    }
    
    res.json(order);
    
  } catch (error) {
    console.error('Error obteniendo detalles del pedido:', error);
    res.status(500).json({ 
      message: 'Error al obtener detalles del pedido', 
      error: error.message 
    });
  }
});

// GET - Obtener resumen de pagos del empleado
app.get("/api/employee/payments-summary", auth, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Solo para empleados' });
    }
    
    console.log('📊 Obteniendo resumen de pagos para empleado:', req.user.employee_code);
    
    const orders = await getOrders(req.user.id, req.user.role);
    
    // Calcular estadísticas de pagos
    const totalOrders = orders.length;
    const confirmedOrders = orders.filter(o => o.status === 'confirmed');
    
    let totalSales = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let fullyPaidOrders = 0;
    let partialPaidOrders = 0;
    let unpaidOrders = 0;
    
    confirmedOrders.forEach(order => {
      const total = parseFloat(order.total) || 0;
      const paid = parseFloat(order.paid_amount) || 0;
      const balance = total - paid;
      
      totalSales += total;
      totalPaid += paid;
      totalPending += balance;
      
      if (balance <= 0) {
        fullyPaidOrders++;
      } else if (paid > 0) {
        partialPaidOrders++;
      } else {
        unpaidOrders++;
      }
    });
    
    const summary = {
      orders_summary: {
        total_orders: totalOrders,
        confirmed_orders: confirmedOrders.length,
        pending_orders: orders.filter(o => o.status === 'hold').length
      },
      payments_summary: {
        total_sales: totalSales,
        total_paid: totalPaid,
        total_pending: totalPending,
        collection_percentage: totalSales > 0 ? (totalPaid / totalSales * 100) : 0
      },
      orders_by_payment_status: {
        fully_paid: fullyPaidOrders,
        partially_paid: partialPaidOrders,
        unpaid: unpaidOrders
      },
      recent_payments: await getRecentPaymentsByEmployee(req.user.id)
    };
    
    res.json(summary);
    
  } catch (error) {
    console.error('❌ Error obteniendo resumen de pagos:', error);
    res.status(500).json({ 
      message: 'Error al obtener resumen de pagos', 
      error: error.message 
    });
  }
});

// GET - Obtener historial de abonos del empleado
app.get("/api/employee/payments-history", auth, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Solo para empleados' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    console.log('📋 Obteniendo historial de abonos para empleado:', req.user.employee_code);
    
    if (supabase) {
      // Obtener pagos donde el empleado fue quien los registró
      const { data, error } = await supabase
        .from('order_payments')
        .select(`
          *,
          orders (
            order_number,
            client_info,
            total
          )
        `)
        .eq('recorded_by', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      res.json({
        payments: data || [],
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: data?.length || 0
        }
      });
    } else {
      // Fallback: buscar en memoria
      const payments = (fallbackDatabase.order_payments || [])
        .filter(payment => payment.recorded_by === req.user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(offset, offset + limit);
      
      // Agregar información de la orden
      const paymentsWithOrders = payments.map(payment => {
        const order = fallbackDatabase.orders.find(o => o.id === payment.order_id);
        return {
          ...payment,
          order: order ? {
            order_number: order.order_number,
            client_info: order.client_info,
            total: order.total
          } : null
        };
      });
      
      res.json({
        payments: paymentsWithOrders,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: paymentsWithOrders.length
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo historial de abonos:', error);
    res.status(500).json({ 
      message: 'Error al obtener historial de abonos', 
      error: error.message 
    });
  }
});

app.get("/api/employee/substore-status", auth, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Solo para empleados' });
    }
    
    const substoreData = await getEmployeeSubstoreProducts(req.user.id);
    
    res.json({
      employee_id: req.user.id,
      employee_code: req.user.employee_code,
      has_active_trip: substoreData.has_active_trip,
      trip_info: substoreData.trip,
      inventory_summary: substoreData.inventory_summary,
      products_available: substoreData.products.length
    });
    
  } catch (error) {
    console.error('Error getting substore status:', error);
    res.status(500).json({ 
      message: 'Error obteniendo estado del subalmacén', 
      error: error.message 
    });
  }
});

// GET - Historial de ventas del empleado desde subalmacén
app.get("/api/employee/substore-sales", auth, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Solo para empleados' });
    }
    
    if (supabase) {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('employee_id', req.user.id)
        .eq('inventory_source', 'substore')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data || []);
    } else {
      const substoreSales = fallbackDatabase.sales
        .filter(sale => 
          sale.employee_id === req.user.id && 
          sale.inventory_source === 'substore'
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      res.json(substoreSales);
    }
    
  } catch (error) {
    console.error('Error getting substore sales:', error);
    res.status(500).json({ 
      message: 'Error obteniendo ventas del subalmacén', 
      error: error.message 
    });
  }
});

app.post("/api/employees", auth, adminOnly, async (req, res) => {
  try {
    console.log('🔄 POST /api/employees - Creando empleado:', req.body);
    
    const employeeData = {
      ...req.body,
      created_at: new Date().toISOString()
    };
    
    // Verificar que el código de empleado no exista
    const existingEmployee = await getEmployeeByCode(employeeData.employee_code);
    if (existingEmployee) {
      return res.status(400).json({ 
        message: 'El código de empleado ya existe' 
      });
    }
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .insert([employeeData])
          .select()
          .single();
        
        if (error) throw error;
        
        // No devolver la contraseña
        const { password, ...safeEmployee } = data;
        res.json(safeEmployee);
        return;
      } catch (error) {
        console.error('Error creating employee in Supabase:', error);
        // Continuar con fallback
      }
    }
    
    // Fallback: crear en memoria
    const newEmployee = {
      id: fallbackDatabase.employees.length + 1,
      ...employeeData
    };
    
    fallbackDatabase.employees.push(newEmployee);
    
    // No devolver la contraseña
    const { password, ...safeEmployee } = newEmployee;
    res.json(safeEmployee);
    
  } catch (error) {
    console.error('Error in POST /api/employees:', error);
    res.status(500).json({ 
      message: 'Error creando empleado', 
      error: error.message 
    });
  }
});

app.put("/api/employees/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('🔄 PUT /api/employees/:id - Actualizando empleado:', id, req.body);
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        
        // No devolver la contraseña
        const { password, ...safeEmployee } = data;
        res.json(safeEmployee);
        return;
      } catch (error) {
        console.error('Error updating employee in Supabase:', error);
        // Continuar con fallback
      }
    }
    
    // Fallback: actualizar en memoria
    const index = fallbackDatabase.employees.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    fallbackDatabase.employees[index] = {
      ...fallbackDatabase.employees[index],
      ...req.body
    };
    
    // No devolver la contraseña
    const { password, ...safeEmployee } = fallbackDatabase.employees[index];
    res.json(safeEmployee);
    
  } catch (error) {
    console.error('Error in PUT /api/employees/:id:', error);
    res.status(500).json({ 
      message: 'Error actualizando empleado', 
      error: error.message 
    });
  }
});

// GET Inventory Movements - Historial de movimientos
app.get("/api/inventory/movements", auth, adminOnly, async (req, res) => {
  try {
    console.log('📋 Obteniendo movimientos de inventario...');
    
    if (supabase) {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limitar a los últimos 100 movimientos
      
      if (error) throw error;
      
      res.json(data || []);
    } else {
      // Fallback: usar datos en memoria
      const movements = fallbackDatabase.inventory_movements
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 100);
      
      res.json(movements);
    }
  } catch (error) {
    console.error('Error obteniendo movimientos de inventario:', error);
    res.status(500).json({ 
      message: 'Error obteniendo movimientos de inventario', 
      error: error.message 
    });
  }
});

// POST Manual Stock Adjustment - Ajuste manual de inventario
app.post("/api/inventory/adjust", auth, adminOnly, async (req, res) => {
  try {
    const { product_id, quantity, operation, reason, notes } = req.body;
    
    console.log('🔧 Ajuste manual de inventario:', { product_id, quantity, operation, reason });
    
    // Validaciones
    if (!product_id || !quantity || !operation || !reason) {
      return res.status(400).json({
        message: 'Faltan campos requeridos: product_id, quantity, operation, reason'
      });
    }
    
    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        message: 'Operación debe ser "add" o "subtract"'
      });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({
        message: 'La cantidad debe ser mayor a 0'
      });
    }
    
    // Preparar datos para la actualización
    const adjustmentProducts = [{
      product_id: product_id,
      quantity: quantity
    }];
    
    const adjustmentNotes = `${notes || ''} - Ajuste manual por ${req.user.employee_code} (${reason})`.trim();
    
    // Realizar ajuste
    const result = await updateInventoryStock(adjustmentProducts, operation, adjustmentNotes);
    
    console.log('✅ Ajuste manual completado');
    
    res.json({
      message: 'Ajuste de inventario completado exitosamente',
      adjustment: {
        product_id,
        quantity,
        operation,
        reason,
        notes: adjustmentNotes,
        performed_by: req.user.employee_code,
        timestamp: new Date().toISOString()
      },
      inventory_update: result
    });
    
  } catch (error) {
    console.error('Error en ajuste manual de inventario:', error);
    res.status(500).json({
      message: 'Error realizando ajuste de inventario: ' + error.message,
      error: error.message
    });
  }
});
// ========== ROUTES - TRIPS/subalmacenS ==========

// GET - Obtener todos los subalmacens
app.get("/api/trips", auth, async (req, res) => {
  try {
    console.log('🔍 GET /api/trips - User:', req.user?.role);
    
    const { status, employee_id } = req.query;
    
    // Si no es admin, solo puede ver sus propios subalmacens
    const employeeFilter = req.user.role === 'admin' 
      ? (employee_id ? parseInt(employee_id) : null)
      : req.user.id;
    
    const trips = await getTrips(status, employeeFilter);
    
    console.log('✅ Enviando', trips.length, 'subalmacens al frontend');
    res.json(trips);
    
  } catch (error) {
    console.error('❌ Error in GET /api/trips:', error);
    res.status(500).json({ 
      message: 'Error obteniendo subalmacens', 
      error: error.message 
    });
  }
});

// GET - Obtener subalmacen específico
app.get("/api/trips/:id", auth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    console.log('🔍 GET /api/trips/:id - Trip:', tripId);
    
    if (supabase) {
      const { data: trip, error } = await supabase
        .from('trips')
        .select(`
          *,
          substore_inventory (*)
        `)
        .eq('id', tripId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (trip) {
        // Verificar permisos
        if (req.user.role !== 'admin' && trip.employee_id !== req.user.id) {
          return res.status(403).json({ message: 'No tienes permisos para ver este subalmacen' });
        }
        return res.json(trip);
      }
    }
    
    // Fallback
    const trip = (fallbackDatabase.trips || []).find(t => t.id === tripId);
    if (!trip) {
      return res.status(404).json({ message: 'subalmacen no encontrado' });
    }
    
    if (req.user.role !== 'admin' && trip.employee_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para ver este subalmacen' });
    }
    
    // Agregar inventario del subalmacén
    trip.substore_inventory = (fallbackDatabase.substore_inventory || [])
      .filter(item => item.trip_id === tripId);
    
    res.json(trip);
    
  } catch (error) {
    console.error('Error in GET /api/trips/:id:', error);
    res.status(500).json({ 
      message: 'Error obteniendo subalmacen', 
      error: error.message 
    });
  }
});

// POST - Crear nuevo subalmacen
app.post("/api/trips", auth, adminOnly, async (req, res) => {
  try {
    console.log('🔄 POST /api/trips - Creating trip:', req.body);
    
    const { employee_id, products, notes } = req.body;
    
    // Validaciones
    if (!employee_id) {
      return res.status(400).json({ 
        message: 'employee_id es requerido' 
      });
    }
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        message: 'Debe incluir al menos un producto en el subalmacen' 
      });
    }
    
    // Validar stock disponible ANTES de crear el subalmacen
    console.log('🔍 Validando stock disponible...');
    for (const product of products) {
      if (!product.product_id || !product.quantity || product.quantity <= 0) {
        return res.status(400).json({ 
          message: 'Todos los productos deben tener product_id y quantity válidos' 
        });
      }
    }
    
    const stockValidation = await validateStockAvailability(products);
    if (!stockValidation.valid) {
      return res.status(400).json({
        message: 'Stock insuficiente para algunos productos',
        error: 'insufficient_stock',
        stock_issues: stockValidation.issues
      });
    }
    
    // Obtener información del empleado
    const allEmployees = await getEmployees();
    const employee = allEmployees.find(e => e.id === parseInt(employee_id));
    
    if (!employee) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }
    
    // Crear datos del subalmacen
    const tripData = {
      trip_number: `TRIP-${Date.now()}`,
      employee_id: parseInt(employee_id),
      employee_code: employee.employee_code,
      employee_name: employee.name,
      notes: notes || ''
    };
    
    // Crear el subalmacen
    const newTrip = await createTrip(tripData);
    
    // Cargar productos al subalmacén
    const loadResult = await loadProductsToSubstore(newTrip.id, products);
    
    console.log('✅ subalmacen creado exitosamente:', newTrip.trip_number);
    
    res.json({
      message: 'subalmacen creado exitosamente',
      trip: newTrip,
      loaded_products: loadResult.products,
      inventory_update: loadResult
    });
    
  } catch (error) {
    console.error('❌ Error creating trip:', error);
    res.status(500).json({ 
      message: 'Error creando subalmacen', 
      error: error.message 
    });
  }
});

// PUT - Finalizar subalmacen
app.put("/api/trips/:id/complete", auth, adminOnly, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const { return_products } = req.body;
    
    console.log('🏁 Finalizando subalmacen:', tripId, 'con productos:', return_products);
    
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ message: 'ID de trip inválido' });
    }
    
    // Verificar que el trip existe
    const allTrips = await getTrips();
    const trip = allTrips.find(t => t.id === tripId);
    
    if (!trip) {
      return res.status(404).json({ message: 'subalmacen no encontrado' });
    }
    
    if (trip.status !== 'active') {
      return res.status(400).json({ message: 'El subalmacen ya está finalizado' });
    }
    
    const result = await completeTrip(tripId, return_products || []);
    
    console.log('✅ subalmacen finalizado exitosamente');
    
    res.json({
      message: 'subalmacen finalizado exitosamente',
      trip_id: tripId,
      returned_products: return_products?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error completing trip:', error);
    res.status(500).json({ 
      message: 'Error finalizando subalmacen', 
      error: error.message 
    });
  }
});

app.get("/api/trips-debug", auth, adminOnly, async (req, res) => {
  try {
    const debugInfo = {
      message: 'Debug de trips exitoso',
      timestamp: new Date().toISOString(),
      database_type: supabase ? 'Supabase' : 'Memory',
      fallback_data: {
        trips: fallbackDatabase.trips?.length || 0,
        substore_inventory: fallbackDatabase.substore_inventory?.length || 0,
        products: fallbackDatabase.products?.length || 0,
        employees: fallbackDatabase.employees?.length || 0
      }
    };
    
    // Intentar obtener datos reales
    try {
      const trips = await getTrips();
      const inventory = fallbackDatabase.substore_inventory || [];
      
      debugInfo.actual_data = {
        trips: trips.length,
        trips_with_inventory: trips.filter(t => t.substore_inventory && t.substore_inventory.length > 0).length,
        total_inventory_items: inventory.length
      };
      
      debugInfo.sample_trip = trips[0] || null;
      
    } catch (error) {
      debugInfo.data_error = error.message;
    }
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('Error in trips debug:', error);
    res.status(500).json({
      message: 'Error en debug',
      error: error.message
    });
  }
});

// POST - Devolver productos al almacén principal
app.post("/api/trips/:id/return", auth, adminOnly, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const { products } = req.body;
    
    console.log('🔄 Devolviendo productos del subalmacen:', tripId);
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        message: 'Debe especificar productos a devolver' 
      });
    }
    
    const result = await returnToMainStore(tripId, products);
    
    res.json({
      message: 'Productos devueltos exitosamente',
      trip_id: tripId,
      returned_products: products.length
    });
    
  } catch (error) {
    console.error('❌ Error returning products:', error);
    res.status(500).json({ 
      message: 'Error devolviendo productos', 
      error: error.message 
    });
  }
});

// GET - Obtener inventario de subalmacén por subalmacen
app.get("/api/trips/:id/inventory", auth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    console.log('🔍 GET substore inventory for trip:', tripId);
    
    // Verificar permisos del subalmacen
    const trip = await getTrips(null, null);
    const userTrip = trip.find(t => t.id === tripId);
    
    if (!userTrip) {
      return res.status(404).json({ message: 'subalmacen no encontrado' });
    }
    
    if (req.user.role !== 'admin' && userTrip.employee_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para ver este inventario' });
    }
    
    const inventory = await getSubstoreInventory(tripId);
    res.json(inventory);
    
  } catch (error) {
    console.error('Error getting substore inventory:', error);
    res.status(500).json({ 
      message: 'Error obteniendo inventario', 
      error: error.message 
    });
  }
});

// GET - Obtener movimientos de subalmacén
app.get("/api/trips/:id/inventory", auth, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    console.log('🔍 GET substore inventory for trip:', tripId);
    
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ message: 'ID de trip inválido' });
    }
    
    // Verificar que el trip existe y permisos
    const allTrips = await getTrips();
    const trip = allTrips.find(t => t.id === tripId);
    
    if (!trip) {
      return res.status(404).json({ message: 'subalmacen no encontrado' });
    }
    
    if (req.user.role !== 'admin' && trip.employee_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para ver este inventario' });
    }
    
    const inventory = await getSubstoreInventory(tripId);
    
    console.log('✅ Enviando inventario:', inventory.length, 'items');
    res.json(inventory);
    
  } catch (error) {
    console.error('❌ Error getting substore inventory:', error);
    res.status(500).json({ 
      message: 'Error obteniendo inventario', 
      error: error.message 
    });
  }
});

// POST - Agregar producto a subalmacén existente
app.post("/api/trips/:id/add-product", auth, adminOnly, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const productData = req.body;
    
    console.log('➕ POST /api/trips/:id/add-product:', { tripId, productData });
    
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ message: 'ID de subalmacén inválido' });
    }
    
    if (!productData.product_id || !productData.quantity || productData.quantity <= 0) {
      return res.status(400).json({ 
        message: 'product_id y quantity son requeridos y quantity debe ser mayor a 0' 
      });
    }
    
    const result = await addProductToExistingTrip(tripId, productData);
    
    res.json({
      success: true,
      message: result.action === 'quantity_added' 
        ? 'Cantidad agregada al producto existente' 
        : 'Nuevo producto agregado al subalmacén',
      action: result.action
    });
    
  } catch (error) {
    console.error('❌ Error adding product to trip:', error);
    res.status(500).json({ 
      message: 'Error agregando producto al subalmacén', 
      error: error.message 
    });
  }
});

// DELETE - Remover producto del subalmacén
app.delete("/api/trips/:id/remove-product", auth, adminOnly, async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);
    const { product_id } = req.body;
    
    console.log('➖ DELETE /api/trips/:id/remove-product:', { tripId, product_id });
    
    if (!tripId || isNaN(tripId)) {
      return res.status(400).json({ message: 'ID de subalmacén inválido' });
    }
    
    if (!product_id) {
      return res.status(400).json({ message: 'product_id es requerido' });
    }
    
    const result = await removeProductFromTrip(tripId, product_id);
    
    res.json({
      success: true,
      message: 'Producto removido del subalmacén exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error removing product from trip:', error);
    res.status(500).json({ 
      message: 'Error removiendo producto del subalmacén', 
      error: error.message 
    });
  }
});

// GET - Obtener trips con información de productos agotados
app.get("/api/trips-permanent", auth, async (req, res) => {
  try {
    console.log('🔍 GET /api/trips-permanent - User:', req.user?.role);
    
    const { employee_id } = req.query;
    
    // Solo mostrar trips activos (permanentes)
    const status = 'active';
    
    // Si no es admin, solo puede ver sus propios subalmacens
    const employeeFilter = req.user.role === 'admin' 
      ? (employee_id ? parseInt(employee_id) : null)
      : req.user.id;
    
    const trips = await getTripsWithDepletedInfo(status, employeeFilter);
    
    console.log('✅ Enviando', trips.length, 'subalmacenes permanentes al frontend');
    res.json(trips);
    
  } catch (error) {
    console.error('❌ Error in GET /api/trips-permanent:', error);
    res.status(500).json({ 
      message: 'Error obteniendo subalmacenes permanentes', 
      error: error.message 
    });
  }
});

app.get("/api/trips/depleted-products", auth, adminOnly, async (req, res) => {
  try {
    console.log('🔍 Obteniendo productos agotados en subalmacenes...');
    
    if (supabase) {
      const { data, error } = await supabase
        .from('substore_inventory')
        .select(`
          *,
          trips (trip_number, employee_name, employee_code)
        `)
        .eq('current_quantity', 0)
        .order('out_of_stock_since', { ascending: false });
      
      if (error) throw error;
      
      res.json(data || []);
    } else {
      // Fallback en memoria
      const depletedProducts = (fallbackDatabase.substore_inventory || [])
        .filter(item => item.current_quantity === 0)
        .map(item => {
          const trip = fallbackDatabase.trips.find(t => t.id === item.trip_id);
          return {
            ...item,
            trip: trip ? {
              trip_number: trip.trip_number,
              employee_name: trip.employee_name,
              employee_code: trip.employee_code
            } : null
          };
        });
      
      res.json(depletedProducts);
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo productos agotados:', error);
    res.status(500).json({ 
      message: 'Error obteniendo productos agotados', 
      error: error.message 
    });
  }
});

// POST - Limpiar productos agotados automáticamente
app.post("/api/trips/cleanup-depleted", auth, adminOnly, async (req, res) => {
  try {
    console.log('🧹 Iniciando limpieza automática de productos agotados...');
    
    const { older_than_days = 7 } = req.body;
    
    let removedCount = 0;
    
    if (supabase) {
      // Calcular fecha límite
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - older_than_days);
      
      // Obtener productos agotados antiguos
      const { data: depletedProducts, error: getError } = await supabase
        .from('substore_inventory')
        .select('*')
        .eq('current_quantity', 0)
        .lt('out_of_stock_since', cutoffDate.toISOString());
      
      if (getError) throw getError;
      
      // Remover cada producto
      for (const product of depletedProducts || []) {
        try {
          await removeProductFromTrip(product.trip_id, product.product_id);
          removedCount++;
        } catch (error) {
          console.warn(`⚠️ Error removiendo producto ${product.product_code}:`, error.message);
        }
      }
    } else {
      // Fallback en memoria
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - older_than_days);
      
      const itemsToRemove = (fallbackDatabase.substore_inventory || [])
        .filter(item => 
          item.current_quantity === 0 && 
          item.out_of_stock_since && 
          new Date(item.out_of_stock_since) < cutoffDate
        );
      
      for (const item of itemsToRemove) {
        try {
          await removeProductFromTrip(item.trip_id, item.product_id);
          removedCount++;
        } catch (error) {
          console.warn(`⚠️ Error removiendo producto ${item.product_code}:`, error.message);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Limpieza completada. ${removedCount} productos agotados removidos.`,
      removed_count: removedCount,
      cutoff_days: older_than_days
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza automática:', error);
    res.status(500).json({ 
      message: 'Error en limpieza automática', 
      error: error.message 
    });
  }
});



// Actualizar la ruta existente para usar la nueva función
app.put("/api/orders/:id/confirm-substore", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { trip_id, payment_info } = req.body;
    
    console.log('🔄 Confirmando pedido desde subalmacén permanente:', { orderId, trip_id });
    
    if (!trip_id) {
      return res.status(400).json({ 
        message: 'trip_id es requerido para confirmar desde subalmacén' 
      });
    }
    
    if (!payment_info || !payment_info.method) {
      return res.status(400).json({ 
        message: 'Información de pago requerida' 
      });
    }
    
    // Verificar permisos del subalmacen
    const trips = await getTripsWithDepletedInfo('active');
    const trip = trips.find(t => t.id === trip_id);
    
    if (!trip) {
      return res.status(404).json({ message: 'Subalmacén no encontrado o no activo' });
    }
    
    if (req.user.role !== 'admin' && trip.employee_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permisos para confirmar pedidos en este subalmacén' 
      });
    }
    
    const result = await confirmOrderFromSubstorePermanent(orderId, trip_id, payment_info);
    
    let responseMessage = 'Pedido confirmado desde subalmacén exitosamente';
    if (result.depleted_count > 0) {
      responseMessage += `. ${result.depleted_count} producto(s) se agotaron y pueden ser removidos.`;
    }
    
    res.json({
      message: responseMessage,
      order: result.order,
      sale: result.sale,
      trip_id: trip_id,
      depleted_products: result.depleted_products,
      depleted_count: result.depleted_count
    });
    
  } catch (error) {
    console.error('❌ Error confirmando pedido desde subalmacén permanente:', error);
    res.status(500).json({ 
      message: 'Error confirmando pedido desde subalmacén permanente', 
      error: error.message 
    });
  }
});

// Inicializar base de datos fallback con tablas de subalmacenes
if (!fallbackDatabase.trips) {
  fallbackDatabase.trips = [];
}
if (!fallbackDatabase.substore_inventory) {
  fallbackDatabase.substore_inventory = [];
}
if (!fallbackDatabase.substore_movements) {
  fallbackDatabase.substore_movements = [];
}

// ===== DEBUG ENDPOINTS ====

// API Routes - Ventas
app.get("/api/sales", auth, async (req, res) => {
  try {
    const sales = await getSales(req.user.id, req.user.role);
    res.json(sales);
  } catch (error) {
    console.error('Error in GET /api/sales:', error);
    res.status(500).json({ message: 'Error obteniendo ventas', error: error.message });
  }
});

// API Routes - Reportes
app.get("/api/reports/sales-by-employee", auth, adminOnly, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('sales_by_employee')
        .select('*');
      
      if (error) throw error;
      res.json(data || []);
    } else {
      // Fallback para datos en memoria
      const employees = await getEmployees();
      const sales = await getSales();
      
      const salesByEmployee = employees.map(emp => {
        const employeeSales = sales.filter(sale => sale.employee_id === emp.id);
        return {
          employee_id: emp.id,
          employee_code: emp.employee_code,
          name: emp.name,
          total_sales: employeeSales.length,
          total_amount: employeeSales.reduce((sum, sale) => sum + sale.total, 0)
        };
      });
      res.json(salesByEmployee);
    }
  } catch (error) {
    console.error('Error in GET /api/reports/sales-by-employee:', error);
    res.status(500).json({ message: 'Error obteniendo reporte', error: error.message });
  }
});

app.get("/api/reports/inventory", auth, adminOnly, async (req, res) => {
  try {
    const products = await getProducts();
    res.json({
      products: products,
      low_stock: products.filter(p => p.stock < 10),
      movements: []
    });
  } catch (error) {
    console.error('Error in GET /api/reports/inventory:', error);
    res.status(500).json({ message: 'Error obteniendo inventario', error: error.message });
  }
});

// ========== RUTAS DEL FRONTEND ==========

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rutas específicas del frontend
app.get("/admin/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'dashboard.html'));
});

app.get("/admin/products.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'products.html'));
});

app.get("/admin/employees.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'employees.html'));
});

app.get("/admin/subalmacenes.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'subalmacenes.html'));
});


// RUTA para confirmar pedido desde subalmacén
app.put("/api/orders/:id/confirm-substore", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { trip_id, payment_info } = req.body;
    
    console.log('🔄 Confirmando pedido desde subalmacén:', { orderId, trip_id });
    
    if (!trip_id) {
      return res.status(400).json({ 
        message: 'trip_id es requerido para confirmar desde subalmacén' 
      });
    }
    
    if (!payment_info || !payment_info.method) {
      return res.status(400).json({ 
        message: 'Información de pago requerida' 
      });
    }
    
    // Verificar permisos del subalmacen
    const trips = await getTrips('active');
    const trip = trips.find(t => t.id === trip_id);
    
    if (!trip) {
      return res.status(404).json({ message: 'subalmacen no encontrado o no activo' });
    }
    
    if (req.user.role !== 'admin' && trip.employee_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'No tienes permisos para confirmar pedidos en este subalmacen' 
      });
    }
    
    const result = await confirmOrderFromSubstore(orderId, trip_id, payment_info);
    
    res.json({
      message: 'Pedido confirmado desde subalmacén exitosamente',
      order: result.order,
      sale: result.sale,
      trip_id: trip_id
    });
    
  } catch (error) {
    console.error('❌ Error confirmando pedido desde subalmacén:', error);
    res.status(500).json({ 
      message: 'Error confirmando pedido desde subalmacén', 
      error: error.message 
    });
  }
});

// ========== ROUTES - REPORTES DE SUBALMACENES ==========

// GET - Resumen de subalmacens activos
app.get("/api/reports/active-trips", auth, adminOnly, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('active_trips_summary')
        .select('*');
      
      if (error) throw error;
      res.json(data || []);
    } else {
      // Fallback: calcular resumen manualmente
      const activeTrips = (fallbackDatabase.trips || [])
        .filter(t => t.status === 'active');
      
      const summary = activeTrips.map(trip => {
        const inventory = (fallbackDatabase.substore_inventory || [])
          .filter(item => item.trip_id === trip.id);
        
        return {
          ...trip,
          total_products: inventory.length,
          total_initial_quantity: inventory.reduce((sum, item) => sum + item.initial_quantity, 0),
          total_current_quantity: inventory.reduce((sum, item) => sum + item.current_quantity, 0),
          total_sold_quantity: inventory.reduce((sum, item) => sum + item.sold_quantity, 0),
          total_initial_value: inventory.reduce((sum, item) => sum + (item.initial_quantity * item.price), 0),
          total_current_value: inventory.reduce((sum, item) => sum + (item.current_quantity * item.price), 0),
          total_sold_value: inventory.reduce((sum, item) => sum + (item.sold_quantity * item.price), 0)
        };
      });
      
      res.json(summary);
    }
    
  } catch (error) {
    console.error('Error getting active trips summary:', error);
    res.status(500).json({ 
      message: 'Error obteniendo resumen de subalmacens', 
      error: error.message 
    });
  }
});

// GET - Reporte detallado de inventario por subalmacens
app.get("/api/reports/trip-inventory", auth, adminOnly, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('trip_inventory_detail')
        .select('*');
      
      if (error) throw error;
      res.json(data || []);
    } else {
      // Fallback: construir reporte manualmente
      const trips = fallbackDatabase.trips || [];
      const inventory = fallbackDatabase.substore_inventory || [];
      const products = fallbackDatabase.products || [];
      
      const report = inventory.map(item => {
        const trip = trips.find(t => t.id === item.trip_id);
        const product = products.find(p => p.id === item.product_id);
        
        return {
          trip_id: item.trip_id,
          trip_number: trip?.trip_number || 'N/A',
          employee_code: trip?.employee_code || 'N/A',
          employee_name: trip?.employee_name || 'N/A',
          trip_status: trip?.status || 'N/A',
          inventory_id: item.id,
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          initial_quantity: item.initial_quantity,
          current_quantity: item.current_quantity,
          sold_quantity: item.sold_quantity,
          returned_quantity: item.returned_quantity,
          price: item.price,
          current_value: item.current_quantity * item.price,
          sold_value: item.sold_quantity * item.price,
          main_store_stock: product?.stock || 0
        };
      });
      
      res.json(report);
    }
    
  } catch (error) {
    console.error('Error getting trip inventory report:', error);
    res.status(500).json({ 
      message: 'Error obteniendo reporte de inventario', 
      error: error.message 
    });
  }
});

app.get("/admin/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'orders.html'));
});

app.get("/admin/reports.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'admin', 'reports.html'));
});

app.get("/employee/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'employee', 'dashboard.html'));
});

app.get("/employee/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'employee', 'orders.html'));
});

app.get("/employee/sales.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'employee', 'sales.html'));
});

// Redirects
app.get("/admin", (req, res) => res.redirect("/admin/dashboard.html"));
app.get("/employee", (req, res) => res.redirect("/employee/dashboard.html"));

// Diagnóstico
app.get("/diagnostic", (req, res) => {
  res.sendFile(path.join(__dirname, 'diagnostic.html'));
});

// Catch-all para archivos no encontrados
app.get("*", (req, res) => {
  res.status(404).send(`
    <div style="font-family: Arial; max-width: 600px; margin: 50px auto; text-align: center;">
      <h1>404 - Página no encontrada</h1>
      <p><strong>Ruta solicitada:</strong> ${req.path}</p>
      <div style="margin: 20px 0;">
        <a href="/" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
          Inicio
        </a>
        <a href="/diagnostic" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
          Diagnóstico
        </a>
      </div>
    </div>
  `);
});

// ===== RUTAS DE API PARA SUBALMACENES =====
// Agregar estas rutas al archivo index.js después de las rutas existentes


// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    message: 'Error del servidor', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
  console.log(`URL: ${process.env.NODE_ENV === 'production' ? `Puerto ${PORT}` : `http://localhost:${PORT}`}`);
  console.log(`Credenciales: ADMIN001 / password`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Base de datos: ${supabase ? 'Supabase (PostgreSQL)' : 'En memoria (fallback)'}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Gestión de inventario ACTIVADA`);
  
  if (supabase) {
    console.log(`✅ Supabase conectado`);
  } else {
    console.log(`⚠️ Supabase no configurado - usando datos en memoria`);
    console.log(`💡 Para configurar Supabase, agrega las variables SUPABASE_URL y SUPABASE_SERVICE_KEY`);
  }
});