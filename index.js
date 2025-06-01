import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Configuraciones para Render
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// CORS para desarrollo y producción
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "aceites-motor-secret-key-2025";

// Base de datos simplificada
let inMemoryDB = {
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

const readData = () => {
  try {
    if (fs.existsSync("./db.json")) {
      const data = fs.readFileSync("./db.json");
      const parsed = JSON.parse(data);
      return parsed;
    }
  } catch (error) {
    console.log("No se pudo leer db.json, usando datos en memoria");
  }
  
  return inMemoryDB;
};

const writeData = (data) => {
  try {
    inMemoryDB = { ...data };
    fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
  } catch (error) {
    console.log("No se pudo escribir db.json (normal en Render), usando memoria");
    inMemoryDB = { ...data };
  }
};

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Error verificando token:", err.message);
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar rol de admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador' });
  }
  next();
};

// ========== SERVIR ARCHIVOS ESTÁTICOS ==========
app.use(express.static(path.join(__dirname, 'frontend')));

// ========== RUTA DE PRUEBA ==========
app.get("/test", (req, res) => {
  const data = readData();
  res.json({
    message: "API funcionando correctamente",
    timestamp: new Date().toISOString(),
    empleados: data.employees.map(emp => ({
      id: emp.id,
      employee_code: emp.employee_code,
      name: emp.name,
      role: emp.role
    }))
  });
});

// ========== API STATUS ==========
app.get("/api/status", (req, res) => {
  res.json({ 
    status: 'API funcionando correctamente',
    version: '1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// ========== AUTENTICACIÓN ==========
app.post("/auth/login", (req, res) => {
  try {
    console.log("📝 Intento de login:", { employee_code: req.body.employee_code });
    
    const { employee_code, password } = req.body;
    
    if (!employee_code || !password) {
      console.log("❌ Faltan datos en la petición");
      return res.status(400).json({ message: 'Código de empleado y contraseña son requeridos' });
    }
    
    const data = readData();
    console.log("📊 Total empleados en DB:", data.employees.length);
    
    const employee = data.employees.find(emp => emp.employee_code === employee_code);
    if (!employee) {
      console.log("❌ Empleado no encontrado:", employee_code);
      return res.status(401).json({ message: 'Credenciales inválidas - Usuario no encontrado' });
    }
    
    console.log("👤 Empleado encontrado:", employee.name);

    // COMPARACIÓN SIMPLE (sin bcrypt)
    if (employee.password !== password) {
      console.log("❌ Contraseña incorrecta");
      return res.status(401).json({ message: 'Credenciales inválidas - Contraseña incorrecta' });
    }

    console.log("✅ Login exitoso para:", employee.name);

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
    console.error('💥 Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});

// ========== PRODUCTOS ==========
app.get("/api/products", authenticateToken, (req, res) => {
  const data = readData();
  res.json(data.products);
});

app.get("/api/products/:id", authenticateToken, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const product = data.products.find((product) => product.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  res.json(product);
});

app.post("/api/products", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const body = req.body;
  const newProduct = {
    id: data.products.length + 1,
    code: body.code,
    name: body.name,
    brand: body.brand,
    viscosity: body.viscosity,
    capacity: body.capacity,
    stock: body.stock || 0,
    price: body.price,
    cost: body.cost,
    created_at: new Date().toISOString(),
  };
  data.products.push(newProduct);
  writeData(data);
  res.json(newProduct);
});

app.put("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const productIndex = data.products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  const updatedProduct = {
    ...data.products[productIndex],
    ...req.body,
    id: id, // Mantener el ID original
    updated_at: new Date().toISOString()
  };
  
  data.products[productIndex] = updatedProduct;
  writeData(data);
  res.json(updatedProduct);
});

app.delete("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const productIndex = data.products.findIndex(p => p.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  data.products.splice(productIndex, 1);
  writeData(data);
  res.json({ message: 'Producto eliminado exitosamente' });
});

// ========== EMPLEADOS ==========
app.get("/api/employees", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const employees = data.employees.map(emp => {
    const { password, ...employeeWithoutPassword } = emp;
    return employeeWithoutPassword;
  });
  res.json(employees);
});

app.post("/api/employees", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const body = req.body;
  
  const existingEmployee = data.employees.find(emp => emp.employee_code === body.employee_code);
  if (existingEmployee) {
    return res.status(400).json({ message: 'El código de empleado ya existe' });
  }

  const newEmployee = {
    id: data.employees.length + 1,
    employee_code: body.employee_code,
    name: body.name,
    role: body.role || 'employee',
    routes: body.routes || [],
    commission_rate: body.commission_rate || 0,
    password: body.password,
    created_at: new Date().toISOString(),
  };
  
  data.employees.push(newEmployee);
  writeData(data);
  
  const { password, ...employeeResponse } = newEmployee;
  res.json(employeeResponse);
});

// ========== PEDIDOS ==========
app.get("/api/orders", authenticateToken, (req, res) => {
  const data = readData();
  let orders = data.orders;
  
  if (req.user.role !== 'admin') {
    orders = orders.filter(order => order.employee_id === req.user.id);
  }
  
  res.json(orders);
});

app.post("/api/orders", authenticateToken, (req, res) => {
  const data = readData();
  const body = req.body;
  
  const newOrder = {
    id: data.orders.length + 1,
    order_number: `ORD-${Date.now()}`,
    employee_id: req.user.id,
    employee_code: req.user.employee_code,
    products: body.products || [],
    status: 'hold',
    photo_url: body.photo_url || null,
    client_info: body.client_info || {},
    location: body.location || null,
    notes: body.notes || '',
    total: body.total || 0,
    created_at: new Date().toISOString(),
  };
  
  data.orders.push(newOrder);
  writeData(data);
  res.json(newOrder);
});

app.put("/api/orders/:id/confirm", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const orderId = parseInt(req.params.id);
  const orderIndex = data.orders.findIndex(o => o.id === orderId);
  
  if (orderIndex === -1) {
    return res.status(404).json({ message: 'Pedido no encontrado' });
  }
  
  const order = data.orders[orderIndex];
  
  // Crear venta
  const newSale = {
    id: data.sales.length + 1,
    sale_number: `SALE-${Date.now()}`,
    order_id: order.id,
    employee_id: order.employee_id,
    employee_code: order.employee_code,
    products: order.products,
    client_info: order.client_info,
    total: order.total,
    payment_info: req.body.payment_info,
    created_at: new Date().toISOString(),
  };
  
  data.sales.push(newSale);
  
  // Actualizar estado del pedido
  data.orders[orderIndex].status = 'confirmed';
  data.orders[orderIndex].confirmed_at = new Date().toISOString();
  
  writeData(data);
  res.json(newSale);
});

// ========== VENTAS ==========
app.get("/api/sales", authenticateToken, (req, res) => {
  const data = readData();
  let sales = data.sales;
  
  if (req.user.role !== 'admin') {
    sales = sales.filter(sale => sale.employee_id === req.user.id);
  }
  
  res.json(sales);
});

// ========== REPORTES ==========
app.get("/api/reports/sales-by-employee", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const salesByEmployee = {};
  
  data.sales.forEach(sale => {
    if (!salesByEmployee[sale.employee_code]) {
      salesByEmployee[sale.employee_code] = {
        employee_code: sale.employee_code,
        total_sales: 0,
        total_amount: 0,
        sales: []
      };
    }
    salesByEmployee[sale.employee_code].total_sales++;
    salesByEmployee[sale.employee_code].total_amount += sale.total;
    salesByEmployee[sale.employee_code].sales.push(sale);
  });
  
  res.json(Object.values(salesByEmployee));
});

app.get("/api/reports/inventory", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  res.json({
    products: data.products,
    low_stock: data.products.filter(p => p.stock < 10),
    movements: data.inventory_movements.slice(-50)
  });
});

// ========== RUTAS DEL FRONTEND (CORREGIDAS) ==========
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

// Rutas específicas para admin
app.get("/admin/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/dashboard.html'));
});

app.get("/admin/products.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/products.html'));
});

app.get("/admin/employees.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/employees.html'));
});

app.get("/admin/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/orders.html'));
});

app.get("/admin/reports.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/reports.html'));
});

// Rutas específicas para employee
app.get("/employee/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/dashboard.html'));
});

app.get("/employee/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/orders.html'));
});

app.get("/employee/sales.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/sales.html'));
});

// Redirects para acceso directo
app.get("/admin", (req, res) => {
  res.redirect("/admin/dashboard.html");
});

app.get("/employee", (req, res) => {
  res.redirect("/employee/dashboard.html");
});

// Ruta de diagnóstico
app.get("/diagnostic.html", (req, res) => {
  const diagnosticHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnóstico - Lubricantes Fresno</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; text-align: center; }
        .test-section { margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #2563eb; }
        button { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 5px; }
        .result { margin: 10px 0; padding: 15px; border-radius: 6px; font-family: monospace; }
        .success { background: #d1fae5; border: 1px solid #10b981; color: #065f46; }
        .error { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
        .info { background: #dbeafe; border: 1px solid #3b82f6; color: #1e40af; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Diagnóstico del Sistema</h1>
        <div class="test-section">
            <h3>🏥 Estado del Servidor</h3>
            <button onclick="testAPI()">Probar API</button>
            <button onclick="testStatus()">Probar Status</button>
            <button onclick="testLogin()">Probar Login</button>
        </div>
        <div id="results"></div>
    </div>
    <script>
        const BASE_URL = window.location.origin;
        function addResult(content, type = 'info') {
            const resultsDiv = document.getElementById('results');
            const resultDiv = document.createElement('div');
            resultDiv.className = \`result \${type}\`;
            resultDiv.textContent = \`[\${new Date().toLocaleTimeString()}] \${content}\`;
            resultsDiv.appendChild(resultDiv);
        }
        async function testAPI() {
            addResult('🔍 Probando /test...', 'info');
            try {
                const response = await fetch(\`\${BASE_URL}/test\`);
                const data = await response.json();
                addResult(\`✅ API funcionando: \${data.message}\`, 'success');
            } catch (error) {
                addResult(\`❌ Error: \${error.message}\`, 'error');
            }
        }
        async function testStatus() {
            addResult('🔍 Probando /api/status...', 'info');
            try {
                const response = await fetch(\`\${BASE_URL}/api/status\`);
                const data = await response.json();
                addResult(\`✅ Status: \${data.status}\`, 'success');
            } catch (error) {
                addResult(\`❌ Error: \${error.message}\`, 'error');
            }
        }
        async function testLogin() {
            addResult('🔍 Probando login...', 'info');
            try {
                const response = await fetch(\`\${BASE_URL}/auth/login\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employee_code: 'ADMIN001', password: 'password' })
                });
                const data = await response.json();
                if (response.ok) {
                    addResult(\`✅ Login exitoso: \${data.user.name}\`, 'success');
                } else {
                    addResult(\`❌ Login falló: \${data.message}\`, 'error');
                }
            } catch (error) {
                addResult(\`❌ Error: \${error.message}\`, 'error');
            }
        }
        // Auto-test
        setTimeout(testAPI, 1000);
        setTimeout(testStatus, 2000);
    </script>
</body>
</html>`;
  res.send(diagnosticHTML);
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('💥 Error del servidor:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// Catch-all para rutas no encontradas
app.get('*', (req, res) => {
  console.log(`🔍 Ruta no encontrada: ${req.path}`);
  res.status(404).send(`
    <h1>404 - Página no encontrada</h1>
    <p>La ruta <code>${req.path}</code> no existe.</p>
    <p><a href="/">Ir al inicio</a></p>
  `);
});

// Inicializar y arrancar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log("✅ API lista para usar");
  console.log("🔑 Credenciales disponibles:");
  console.log("   👨‍💼 ADMIN001 / password");
  console.log("   👷‍♂️ EMP001 / password");
  console.log("🔍 Diagnóstico disponible en: /diagnostic.html");
});