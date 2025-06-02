import express from "express";
import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

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

// Base de datos en memoria
const database = {
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
app.get("/test", (req, res) => {
  res.json({
    message: "API funcionando correctamente",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    empleados: database.employees.map(emp => ({
      id: emp.id,
      employee_code: emp.employee_code,
      name: emp.name,
      role: emp.role
    }))
  });
});

// Status
app.get("/api/status", (req, res) => {
  res.json({
    status: 'OK',
    version: '1.0',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Login
app.post("/auth/login", (req, res) => {
  try {
    console.log("Login attempt:", req.body.employee_code);
    
    const { employee_code, password } = req.body;
    
    if (!employee_code || !password) {
      return res.status(400).json({ message: 'Faltan datos' });
    }
    
    const employee = database.employees.find(emp => emp.employee_code === employee_code);
    
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error interno' });
  }
});

// Productos
app.get("/api/products", auth, (req, res) => {
  res.json(database.products);
});

app.post("/api/products", auth, adminOnly, (req, res) => {
  const newProduct = {
    id: database.products.length + 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  database.products.push(newProduct);
  res.json(newProduct);
});

app.put("/api/products/:id", auth, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const index = database.products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  database.products[index] = { ...database.products[index], ...req.body };
  res.json(database.products[index]);
});

app.delete("/api/products/:id", auth, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const index = database.products.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  database.products.splice(index, 1);
  res.json({ message: 'Producto eliminado' });
});

// Empleados
app.get("/api/employees", auth, adminOnly, (req, res) => {
  const employees = database.employees.map(emp => {
    const { password, ...employeeData } = emp;
    return employeeData;
  });
  res.json(employees);
});

app.post("/api/employees", auth, adminOnly, (req, res) => {
  const newEmployee = {
    id: database.employees.length + 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  database.employees.push(newEmployee);
  
  const { password, ...employeeResponse } = newEmployee;
  res.json(employeeResponse);
});

// Pedidos
app.get("/api/orders", auth, (req, res) => {
  let orders = database.orders;
  if (req.user.role !== 'admin') {
    orders = orders.filter(order => order.employee_id === req.user.id);
  }
  res.json(orders);
});

app.post("/api/orders", auth, (req, res) => {
  const newOrder = {
    id: database.orders.length + 1,
    order_number: `ORD-${Date.now()}`,
    employee_id: req.user.id,
    employee_code: req.user.employee_code,
    status: 'hold',
    ...req.body,
    created_at: new Date().toISOString()
  };
  database.orders.push(newOrder);
  res.json(newOrder);
});

// Confirmar pedido
app.put("/api/orders/:id/confirm", auth, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const orderIndex = database.orders.findIndex(o => o.id === id);
  
  if (orderIndex === -1) {
    return res.status(404).json({ message: 'Pedido no encontrado' });
  }
  
  const order = database.orders[orderIndex];
  
  // Crear venta
  const sale = {
    id: database.sales.length + 1,
    sale_number: `SAL-${Date.now()}`,
    order_id: order.id,
    employee_id: order.employee_id,
    employee_code: order.employee_code,
    client_info: order.client_info,
    products: order.products,
    total: order.total,
    payment_info: req.body.payment_info,
    created_at: new Date().toISOString()
  };
  
  database.sales.push(sale);
  
  // Actualizar estado del pedido
  database.orders[orderIndex].status = 'confirmed';
  database.orders[orderIndex].confirmed_at = new Date().toISOString();
  
  res.json({ order: database.orders[orderIndex], sale });
});

// Ventas
app.get("/api/sales", auth, (req, res) => {
  let sales = database.sales;
  if (req.user.role !== 'admin') {
    sales = sales.filter(sale => sale.employee_id === req.user.id);
  }
  res.json(sales);
});

// Reportes
app.get("/api/reports/sales-by-employee", auth, adminOnly, (req, res) => {
  const salesByEmployee = database.employees.map(emp => {
    const employeeSales = database.sales.filter(sale => sale.employee_id === emp.id);
    return {
      employee_id: emp.id,
      employee_code: emp.employee_code,
      name: emp.name,
      total_sales: employeeSales.length,
      total_amount: employeeSales.reduce((sum, sale) => sum + sale.total, 0)
    };
  });
  res.json(salesByEmployee);
});

app.get("/api/reports/inventory", auth, adminOnly, (req, res) => {
  res.json({
    products: database.products,
    low_stock: database.products.filter(p => p.stock < 10),
    movements: database.inventory_movements || []
  });
});

// ========== RUTAS DEL FRONTEND ==========

// Diagnóstico embebido
app.get("/diagnostic", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Diagnóstico - Sistema de Aceites</title>
    <style>
        body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; margin: 5px; cursor: pointer; }
        button:hover { background: #1d4ed8; }
        .result { margin: 10px 0; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; }
        .success { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
        .error { background: #fee2e2; color: #991b1b; border: 1px solid #ef4444; }
        .info { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
        .status { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Diagnóstico del Sistema</h1>
        <div class="status">
            <strong>URL:</strong> ${req.get('host')}<br>
            <strong>Node:</strong> ${process.version}<br>
            <strong>Entorno:</strong> ${process.env.NODE_ENV || 'development'}<br>
            <strong>Timestamp:</strong> ${new Date().toISOString()}
        </div>
        
        <button onclick="testAPI()">🔍 Test API</button>
        <button onclick="testLogin()">🔑 Test Login</button>
        <button onclick="testProducts()">📦 Test Productos</button>
        <button onclick="showInfo()">ℹ️ Info Sistema</button>
        
        <div id="results"></div>
    </div>
    <script>
        const BASE_URL = window.location.origin;
        
        function addResult(msg, type) {
            const div = document.createElement('div');
            div.className = 'result ' + type;
            div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
            document.getElementById('results').appendChild(div);
        }
        
        async function testAPI() {
            try {
                const res = await fetch(BASE_URL + '/test');
                const data = await res.json();
                addResult('✅ API funcionando: ' + data.message, 'success');
                addResult('Empleados: ' + data.empleados.length, 'info');
            } catch (e) {
                addResult('❌ API Error: ' + e.message, 'error');
            }
        }
        
        async function testLogin() {
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
                addResult('❌ Login Error: ' + e.message, 'error');
            }
        }
        
        async function testProducts() {
            if (!window.testToken) {
                addResult('⚠️ Primero ejecuta "Test Login"', 'error');
                return;
            }
            try {
                const res = await fetch(BASE_URL + '/api/products', {
                    headers: { 'Authorization': 'Bearer ' + window.testToken }
                });
                const data = await res.json();
                if (res.ok) {
                    addResult('✅ Productos cargados: ' + data.length + ' productos', 'success');
                } else {
                    addResult('❌ Error productos: ' + data.message, 'error');
                }
            } catch (e) {
                addResult('❌ Productos Error: ' + e.message, 'error');
            }
        }
        
        function showInfo() {
            addResult('Sistema de Aceites v1.0\\nCredenciales:\\n- Admin: ADMIN001 / password\\n- Empleado: EMP001 / password', 'info');
        }
        
        // Auto-test al cargar
        testAPI();
    </script>
</body>
</html>`);
});

// Página principal
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, 'frontend', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <div style="font-family: Arial; max-width: 600px; margin: 50px auto; text-align: center;">
        <h1>🛢️ Sistema de Aceites</h1>
        <p>Servidor funcionando correctamente</p>
        <p><strong>Node.js:</strong> ${process.version}</p>
        <div style="margin: 20px 0;">
          <a href="/diagnostic" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            🔧 Diagnóstico
          </a>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px;">
          <h3>Credenciales de prueba:</h3>
          <p><strong>Admin:</strong> ADMIN001 / password</p>
          <p><strong>Empleado:</strong> EMP001 / password</p>
        </div>
      </div>
    `);
  }
});

// Rutas específicas del admin
const adminRoutes = [
  'dashboard.html',
  'products.html', 
  'employees.html',
  'orders.html',
  'reports.html'
];

adminRoutes.forEach(route => {
  app.get(`/admin/${route}`, (req, res) => {
    const filePath = path.join(__dirname, 'frontend', 'admin', route);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send(`
        <h1>404 - Archivo no encontrado</h1>
        <p>No se pudo encontrar: ${route}</p>
        <a href="/">← Volver al inicio</a>
      `);
    }
  });
});

// Rutas específicas del empleado
const employeeRoutes = [
  'dashboard.html',
  'orders.html',
  'sales.html'
];

employeeRoutes.forEach(route => {
  app.get(`/employee/${route}`, (req, res) => {
    const filePath = path.join(__dirname, 'frontend', 'employee', route);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send(`
        <h1>404 - Archivo no encontrado</h1>
        <p>No se pudo encontrar: ${route}</p>
        <a href="/">← Volver al inicio</a>
      `);
    }
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
  console.error('Server error:', err);
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
  console.log(`📦 Entorno: ${process.env.NODE_ENV || 'development'}`);
});