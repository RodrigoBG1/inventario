import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken"; // ← ESTE IMPORT FALTABA
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

// Base de datos simplificada (sin encriptación)
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

// ========== API STATUS ==========
app.get("/api/status", (req, res) => {
  res.json({ 
    status: 'API funcionando correctamente',
    version: '1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// ========== PRODUCTOS ==========
app.get("/api/products", authenticateToken, (req, res) => {
  const data = readData();
  res.json(data.products);
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

// ========== EMPLEADOS ==========
app.get("/api/employees", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const employees = data.employees.map(emp => {
    const { password, ...employeeWithoutPassword } = emp;
    return employeeWithoutPassword;
  });
  res.json(employees);
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
  res.json([]);
});

app.get("/api/reports/inventory", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  res.json({
    products: data.products,
    low_stock: data.products.filter(p => p.stock < 10),
    movements: []
  });
});

// ========== RUTAS DEL FRONTEND ==========
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin/dashboard.html'));
});

app.get("/employee/*", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/dashboard.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('💥 Error del servidor:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// Inicializar y arrancar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log("✅ API lista para usar");
  console.log("🔑 Credenciales disponibles:");
  console.log("   👨‍💼 ADMIN001 / password");
  console.log("   👷‍♂️ EMP001 / password");
});