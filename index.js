import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';

const app = express();

// Configuración básica
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "aceites-motor-secret-key-2025";

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Para operaciones admin
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // Para operaciones públicas

let supabase = null;

// Inicializar Supabase si las credenciales están disponibles
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase conectado correctamente');
} else {
  console.log('⚠️ Supabase no configurado - usando datos en memoria');
}

// Base de datos de respaldo (si Supabase no está disponible)
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  return fallbackDatabase.products;
}

async function getEmployees() {
  if (supabase) {
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, name, role, routes, commission_rate, created_at');
    
    if (error) throw error;
    return data;
  }
  return fallbackDatabase.employees.map(emp => {
    const { password, ...employeeData } = emp;
    return employeeData;
  });
}

async function getEmployeeByCode(employee_code) {
  if (supabase) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', employee_code)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  return fallbackDatabase.employees.find(emp => emp.employee_code === employee_code);
}

async function createProduct(productData) {
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  const index = fallbackDatabase.products.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Producto no encontrado');
  
  fallbackDatabase.products[index] = { ...fallbackDatabase.products[index], ...productData };
  return fallbackDatabase.products[index];
}

async function deleteProduct(id) {
  if (supabase) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { message: 'Producto eliminado' };
  }
  
  const index = fallbackDatabase.products.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Producto no encontrado');
  
  fallbackDatabase.products.splice(index, 1);
  return { message: 'Producto eliminado' };
}

async function getOrders(employeeId = null, role = null) {
  if (supabase) {
    let query = supabase.from('orders').select('*');
    
    if (role !== 'admin' && employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  let orders = fallbackDatabase.orders;
  if (role !== 'admin' && employeeId) {
    orders = orders.filter(order => order.employee_id === employeeId);
  }
  return orders;
}

async function createOrder(orderData) {
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    let query = supabase.from('sales').select('*');
    
    if (role !== 'admin' && employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
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

// Test
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
    res.status(500).json({
      message: "Error en API",
      error: error.message,
      database: supabase ? 'Supabase (con error)' : 'En memoria'
    });
  }
});

// Status
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
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Login
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
        employee_code: employee.employee_code
      } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Productos
app.get("/api/products", auth, async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo productos', error: error.message });
  }
});

app.post("/api/products", auth, adminOnly, async (req, res) => {
  try {
    const newProduct = await createProduct(req.body);
    res.json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error creando producto', error: error.message });
  }
});

app.put("/api/products/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedProduct = await updateProduct(id, req.body);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando producto', error: error.message });
  }
});

app.delete("/api/products/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await deleteProduct(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando producto', error: error.message });
  }
});

// Empleados
app.get("/api/employees", auth, adminOnly, async (req, res) => {
  try {
    const employees = await getEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo empleados', error: error.message });
  }
});

// Pedidos
app.get("/api/orders", auth, async (req, res) => {
  try {
    const orders = await getOrders(req.user.id, req.user.role);
    res.json(orders);
  } catch (error) {
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
    res.status(500).json({ message: 'Error creando pedido', error: error.message });
  }
});

// Ventas
app.get("/api/sales", auth, async (req, res) => {
  try {
    const sales = await getSales(req.user.id, req.user.role);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo ventas', error: error.message });
  }
});

// Reportes
app.get("/api/reports/sales-by-employee", auth, adminOnly, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('sales_by_employee')
        .select('*');
      
      if (error) throw error;
      res.json(data);
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
    res.status(500).json({ message: 'Error obteniendo inventario', error: error.message });
  }
});

// ========== RUTAS DEL FRONTEND ==========

// Diagnóstico mejorado
app.get("/diagnostic", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>🔧 Diagnóstico - Sistema de Aceites</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
        }
        h1 { 
            color: #2563eb; 
            text-align: center; 
            margin-bottom: 30px;
            font-size: 2.5rem;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .status-card {
            background: #f8fafc;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid #2563eb;
        }
        .status-card h3 {
            margin: 0 0 10px 0;
            color: #1e40af;
        }
        .status-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #059669;
        }
        .status-supabase {
            background: linear-gradient(45deg, #10b981, #059669);
            color: white;
        }
        .status-supabase .status-value {
            color: white;
        }
        button { 
            background: linear-gradient(45deg, #2563eb, #3b82f6);
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            margin: 8px; 
            cursor: pointer; 
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(37, 99, 235, 0.4);
        }
        .result { 
            margin: 10px 0; 
            padding: 15px; 
            border-radius: 8px; 
            font-family: 'Courier New', monospace; 
            white-space: pre-wrap; 
            border-left: 4px solid #3b82f6;
        }
        .success { 
            background: #ecfdf5; 
            color: #065f46; 
            border-left-color: #10b981; 
        }
        .error { 
            background: #fef2f2; 
            color: #991b1b; 
            border-left-color: #ef4444; 
        }
        .info { 
            background: #eff6ff; 
            color: #1e40af; 
            border-left-color: #3b82f6; 
        }
        .actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin: 20px 0;
        }
        .credentials {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Diagnóstico del Sistema</h1>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>🌐 Servidor</h3>
                <div class="status-value">✅ Activo</div>
                <small>Node.js ${process.version}</small>
            </div>
            <div class="status-card ${supabase ? 'status-supabase' : ''}">
                <h3>🗄️ Base de Datos</h3>
                <div class="status-value">${supabase ? '✅ Supabase' : '⚠️ Memoria'}</div>
                <small>${supabase ? 'PostgreSQL conectado' : 'Datos temporales'}</small>
            </div>
            <div class="status-card">
                <h3>🔑 Autenticación</h3>
                <div class="status-value">✅ JWT</div>
                <small>Tokens seguros</small>
            </div>
            <div class="status-card">
                <h3>📡 API</h3>
                <div class="status-value">✅ REST</div>
                <small>Express 4.x</small>
            </div>
        </div>
        
        <div class="credentials">
            <h3>🔑 Credenciales de Prueba:</h3>
            <p><strong>👨‍💼 Administrador:</strong> ADMIN001 / password</p>
            <p><strong>👷‍♂️ Empleado:</strong> EMP001 / password</p>
        </div>
        
        <div class="actions">
            <button onclick="testAPI()">🔍 Probar API</button>
            <button onclick="testSupabase()">🗄️ Test Supabase</button>
            <button onclick="testLogin()">🔑 Probar Login</button>
            <button onclick="testProducts()">📦 Probar Productos</button>
            <button onclick="testCreateProduct()">➕ Crear Producto</button>
        </div>
        
        <div id="results"></div>
    </div>
    <script>
        const BASE_URL = window.location.origin;
        
        function addResult(msg, type) {
            const div = document.createElement('div');
            div.className = 'result ' + type;
            div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
            document.getElementById('results').appendChild(div);
            document.getElementById('results').scrollTop = document.getElementById('results').scrollHeight;
        }
        
        async function testAPI() {
            addResult('🔍 Probando conexión API...', 'info');
            try {
                const res = await fetch(BASE_URL + '/test');
                const data = await res.json();
                addResult('✅ ' + data.message, 'success');
                addResult('📊 Base de datos: ' + data.database.type + ' (' + data.database.products + ' productos)', 'info');
                addResult('🔗 Supabase: ' + data.supabase.status, data.database.connected ? 'success' : 'error');
            } catch (e) {
                addResult('❌ Error API: ' + e.message, 'error');
            }
        }
        
        async function testSupabase() {
            addResult('🗄️ Probando conexión Supabase...', 'info');
            try {
                const res = await fetch(BASE_URL + '/api/status');
                const data = await res.json();
                if (data.database.type === 'Supabase') {
                    addResult('✅ Supabase conectado correctamente', 'success');
                    addResult('📊 Datos: ' + data.database.products + ' productos, ' + data.database.employees + ' empleados', 'info');
                } else {
                    addResult('⚠️ Supabase no configurado, usando datos en memoria', 'error');
                }
            } catch (e) {
                addResult('❌ Error Supabase: ' + e.message, 'error');
            }
        }
        
        async function testLogin() {
            addResult('🔑 Probando login ADMIN001...', 'info');
            try {
                const res = await fetch(BASE_URL + '/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employee_code: 'ADMIN001', password: 'password' })
                });
                const data = await res.json();
                if (res.ok) {
                    addResult('✅ Login exitoso: ' + data.user.name + ' (' + data.user.role + ')', 'success');
                    window.testToken = data.token;
                } else {
                    addResult('❌ Login falló: ' + data.message, 'error');
                }
            } catch (e) {
                addResult('❌ Error login: ' + e.message, 'error');
            }
        }
        
        async function testProducts() {
            if (!window.testToken) {
                addResult('⚠️ Primero ejecuta "Probar Login"', 'error');
                return;
            }
            addResult('📦 Cargando productos...', 'info');
            try {
                const res = await fetch(BASE_URL + '/api/products', {
                    headers: { 'Authorization': 'Bearer ' + window.testToken }
                });
                const data = await res.json();
                if (res.ok) {
                    addResult('✅ Productos cargados: ' + data.length + ' productos encontrados', 'success');
                    if (data.length > 0) {
                        addResult('📦 Productos: ' + data.map(p => p.name).join(', '), 'info');
                    }
                } else {
                    addResult('❌ Error productos: ' + data.message, 'error');
                }
            } catch (e) {
                addResult('❌ Error productos: ' + e.message, 'error');
            }
        }
        
        async function testCreateProduct() {
            if (!window.testToken) {
                addResult('⚠️ Primero ejecuta "Probar Login"', 'error');
                return;
            }
            
            const testProduct = {
                code: 'TEST' + Date.now(),
                name: 'Aceite de Prueba',
                brand: 'Test Brand',
                viscosity: '10W-30',
                capacity: '1L',
                stock: 10,
                price: 30.00,
                cost: 22.00
            };
            
            addResult('➕ Creando producto de prueba...', 'info');
            try {
                const res = await fetch(BASE_URL + '/api/products', {
                    method: 'POST',
                    headers: { 
                        'Authorization': 'Bearer ' + window.testToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testProduct)
                });
                const data = await res.json();
                if (res.ok) {
                    addResult('✅ Producto creado: ' + data.name + ' (ID: ' + data.id + ')', 'success');
                } else {
                    addResult('❌ Error creando producto: ' + data.message, 'error');
                }
            } catch (e) {
                addResult('❌ Error crear producto: ' + e.message, 'error');
            }
        }
        
        // Auto-test al cargar
        setTimeout(testAPI, 500);
    </script>
</body>
</html>`);
});

// Página principal
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: Arial; max-width: 700px; margin: 50px auto; text-align: center; padding: 20px;">
      <h1 style="color: #2563eb;">🛢️ Sistema de Aceites v2.0</h1>
      <div style="background: ${supabase ? '#f0fdf4' : '#fef3c7'}; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${supabase ? '#10b981' : '#f59e0b'};">
        <h2 style="color: ${supabase ? '#065f46' : '#92400e'}; margin-top: 0;">${supabase ? '✅ Supabase Conectado' : '⚠️ Modo Desarrollo'}</h2>
        <p><strong>Node.js:</strong> ${process.version}</p>
        <p><strong>Base de datos:</strong> ${supabase ? 'Supabase (PostgreSQL)' : 'En memoria'}</p>
        <p><strong>Estado:</strong> ${supabase ? 'Producción lista' : 'Datos temporales'}</p>
      </div>
      
      <div style="margin: 30px 0;">
        <a href="/diagnostic" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px; display: inline-block; font-weight: bold;">
          🔧 Diagnóstico Completo
        </a>
        <a href="/admin/dashboard.html" style="background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px; display: inline-block; font-weight: bold;">
          👨‍💼 Panel Admin
        </a>
        <a href="/employee/dashboard.html" style="background: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px; display: inline-block; font-weight: bold;">
          👷‍♂️ Panel Empleado
        </a>
      </div>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-top: 30px; border-left: 4px solid #f59e0b;">
        <h3 style="color: #92400e; margin-top: 0;">🔑 Credenciales de Prueba:</h3>
        <p><strong>👨‍💼 Administrador:</strong> <code>ADMIN001</code> / <code>password</code></p>
        <p><strong>👷‍♂️ Empleado:</strong> <code>EMP001</code> / <code>password</code></p>
      </div>
      
      ${supabase ? `
      <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px;">
        <p><strong>🎉 ¡Supabase configurado!</strong> Los datos se guardan permanentemente en PostgreSQL.</p>
        <p>Puedes crear productos, empleados y pedidos sin perder información.</p>
      </div>
      ` : `
      <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px;">
        <p><strong>💡 Nota:</strong> Datos en memoria. Para persistencia permanente, configura Supabase.</p>
        <p>Los datos se reiniciarán cuando el servidor se reinicie.</p>
      </div>
      `}
    </div>
  `);
});

// Rutas del frontend
const routes = {
  admin: ['dashboard.html', 'products.html', 'employees.html', 'orders.html', 'reports.html'],
  employee: ['dashboard.html', 'orders.html', 'sales.html']
};

Object.entries(routes).forEach(([type, routeList]) => {
  routeList.forEach(route => {
    app.get(`/${type}/${route}`, (req, res) => {
      const filePath = path.join(__dirname, 'frontend', type, route);
      res.sendFile(filePath, (err) => {
        if (err) {
          res.status(404).send(`
            <div style="font-family: Arial; max-width: 600px; margin: 50px auto; text-align: center;">
              <h1>404 - Archivo no encontrado</h1>
              <p><strong>Ruta:</strong> /${type}/${route}</p>
              <p><strong>Archivo:</strong> ${filePath}</p>
              <a href="/" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                🏠 Volver al Inicio
              </a>
            </div>
          `);
        }
      });
    });
  });
});

// Redirects
app.get("/admin", (req, res) => res.redirect("/admin/dashboard.html"));
app.get("/employee", (req, res) => res.redirect("/employee/dashboard.html"));

// Catch-all para 404
app.get("*", (req, res) => {
  res.status(404).send(`
    <div style="font-family: Arial; max-width: 600px; margin: 50px auto; text-align: center;">
      <h1>404 - Página no encontrada</h1>
      <p><strong>Ruta solicitada:</strong> ${req.path}</p>
      <div style="margin: 20px 0;">
        <a href="/" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
          🏠 Inicio
        </a>
        <a href="/diagnostic" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
          🔧 Diagnóstico
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
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📍 Diagnóstico: http://localhost:${PORT}/diagnostic`);
  console.log(`🔑 Credenciales: ADMIN001 / password`);
  console.log(`🟢 Node.js: ${process.version}`);
  console.log(`🗄️ Base de datos: ${supabase ? 'Supabase (PostgreSQL)' : 'En memoria (fallback)'}`);
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  if (supabase) {
    console.log(`✅ Supabase conectado: ${supabaseUrl}`);
  } else {
    console.log(`⚠️ Supabase no configurado - usando datos en memoria`);
    console.log(`💡 Para configurar Supabase, agrega las variables SUPABASE_URL y SUPABASE_SERVICE_KEY`);
  }
});