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
      price: 25.99,
      cost: 18.50,
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

// Funciones helper para manejar Supabase o fallback
async function getProducts() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting products from Supabase:', error);
      return fallbackDatabase.products;
    }
  }
  return fallbackDatabase.products;
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

async function createProduct(productData) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating product in Supabase:', error);
      // Fallback a memoria si falla Supabase
    }
  }
  
  const newProduct = {
    id: fallbackDatabase.products.length + 1,
    ...productData,
    created_at: new Date().toISOString()
  };
  fallbackDatabase.products.push(newProduct);
  return newProduct;
}

async function updateProduct(id, productData) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating product in Supabase:', error);
      // Fallback a memoria si falla Supabase
    }
  }
  
  const index = fallbackDatabase.products.findIndex(p => p.id === parseInt(id));
  if (index === -1) throw new Error('Producto no encontrado');
  
  fallbackDatabase.products[index] = { ...fallbackDatabase.products[index], ...productData };
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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating order in Supabase:', error);
      // Fallback a memoria si falla Supabase
    }
  }
  
  const newOrder = {
    id: fallbackDatabase.orders.length + 1,
    ...orderData,
    created_at: new Date().toISOString()
  };
  fallbackDatabase.orders.push(newOrder);
  return newOrder;
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
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ message: 'Error obteniendo productos', error: error.message });
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

// API Routes - Pedidos
app.get("/api/orders", auth, async (req, res) => {
  try {
    const orders = await getOrders(req.user.id, req.user.role);
    res.json(orders);
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    res.status(500).json({ message: 'Error obteniendo pedidos', error: error.message });
  }
});

app.post("/api/orders", auth, async (req, res) => {
  try {
    const orderData = {
      order_number: `ORD-${Date.now()}`,
      employee_id: req.user.id,
      employee_code: req.user.employee_code,
      status: 'hold',
      ...req.body
    };
    
    const newOrder = await createOrder(orderData);
    res.json(newOrder);
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    res.status(500).json({ message: 'Error creando pedido', error: error.message });
  }
});


app.put("/api/orders/:id/confirm", auth, adminOnly, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { payment_info } = req.body;
    
    console.log(`🔄 Confirmando pedido ${orderId}...`);
    
    if (supabase) {
      try {
        // Get the order first
        const { data: order, error: getError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (getError) throw getError;
        if (!order) {
          return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        
        // Update order status to confirmed
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            payment_info: payment_info
          })
          .eq('id', orderId)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        // Create a sale record
        const saleData = {
          order_id: orderId,
          sale_number: `SALE-${Date.now()}`,
          employee_id: order.employee_id,
          employee_code: order.employee_code,
          client_info: order.client_info,
          products: order.products,
          total: order.total,
          payment_info: payment_info,
          location: order.location,
          notes: order.notes,
          created_at: new Date().toISOString()
        };
        
        const { data: newSale, error: saleError } = await supabase
          .from('sales')
          .insert([saleData])
          .select()
          .single();
        
        if (saleError) {
          console.warn('Error creating sale record:', saleError);
          // Continue anyway, order is confirmed
        }
        
        console.log(`✅ Pedido ${orderId} confirmado exitosamente`);
        res.json({ 
          message: 'Pedido confirmado exitosamente',
          order: updatedOrder,
          sale: newSale || null
        });
        
      } catch (error) {
        console.error('Error en Supabase, usando fallback:', error);
        // Fallback to memory database
      }
    }
    
    // Fallback for memory database
    const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    const order = fallbackDatabase.orders[orderIndex];
    
    // Update order
    fallbackDatabase.orders[orderIndex] = {
      ...order,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      payment_info: payment_info
    };
    
    // Create sale record
    const newSale = {
      id: fallbackDatabase.sales.length + 1,
      order_id: orderId,
      sale_number: `SALE-${Date.now()}`,
      employee_id: order.employee_id,
      employee_code: order.employee_code,
      client_info: order.client_info,
      products: order.products,
      total: order.total,
      payment_info: payment_info,
      location: order.location,
      notes: order.notes,
      created_at: new Date().toISOString()
    };
    
    fallbackDatabase.sales.push(newSale);
    
    console.log(`✅ Pedido ${orderId} confirmado exitosamente (fallback)`);
    res.json({ 
      message: 'Pedido confirmado exitosamente',
      order: fallbackDatabase.orders[orderIndex],
      sale: newSale
    });
    
  } catch (error) {
    console.error('❌ Error confirming order:', error);
    res.status(500).json({ 
      message: 'Error al confirmar pedido', 
      error: error.message 
    });
  }
});

// Cancel Order endpoint (NEW)
app.put("/api/orders/:id/cancel", auth, adminOnly, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { reason } = req.body;
    
    console.log(`🚫 Cancelando pedido ${orderId}...`);
    
    if (supabase) {
      try {
        // Check if order exists and is not already confirmed
        const { data: order, error: getError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (getError) throw getError;
        if (!order) {
          return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        
        if (order.status === 'confirmed') {
          return res.status(400).json({ message: 'No se puede cancelar un pedido ya confirmado' });
        }
        
        // Update order status to cancelled
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
        res.json({ 
          message: 'Pedido cancelado exitosamente',
          order: updatedOrder
        });
        
      } catch (error) {
        console.error('Error en Supabase, usando fallback:', error);
        // Fallback to memory database
      }
    }
    
    // Fallback for memory database
    const orderIndex = fallbackDatabase.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    const order = fallbackDatabase.orders[orderIndex];
    
    if (order.status === 'confirmed') {
      return res.status(400).json({ message: 'No se puede cancelar un pedido ya confirmado' });
    }
    
    // Update order
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
    console.error('❌ Error cancelling order:', error);
    res.status(500).json({ 
      message: 'Error al cancelar pedido', 
      error: error.message 
    });
  }
});

// Get Order Details endpoint (HELPFUL FOR ADMIN)
app.get("/api/orders/:id", auth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          // Check if user has permission to view this order
          if (req.user.role !== 'admin' && data.employee_id !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permisos para ver este pedido' });
          }
          
          return res.json(data);
        }
      } catch (error) {
        console.error('Error getting order from Supabase:', error);
        // Fallback to memory database
      }
    }
    
    // Fallback for memory database
    const order = fallbackDatabase.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && order.employee_id !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para ver este pedido' });
    }
    
    res.json(order);
    
  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({ 
      message: 'Error al obtener detalles del pedido', 
      error: error.message 
    });
  }
});

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
  
  if (supabase) {
    console.log(`✅ Supabase conectado`);
  } else {
    console.log(`⚠️ Supabase no configurado - usando datos en memoria`);
    console.log(`💡 Para configurar Supabase, agrega las variables SUPABASE_URL y SUPABASE_SERVICE_KEY`);
  }
});