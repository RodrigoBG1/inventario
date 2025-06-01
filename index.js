import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
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

// Base de datos en memoria para Render (ya que el filesystem es efímero)
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
  employees: [],
  orders: [],
  sales: [],
  inventory_movements: []
};

const readData = () => {
  try {
    // Intentar leer del archivo primero
    if (fs.existsSync("./db.json")) {
      const data = fs.readFileSync("./db.json");
      return JSON.parse(data);
    }
  } catch (error) {
    console.log("No se pudo leer db.json, usando datos en memoria");
  }
  
  // Si no hay archivo, usar datos en memoria
  return inMemoryDB;
};

const writeData = (data) => {
  try {
    // Actualizar datos en memoria
    inMemoryDB = { ...data };
    
    // Intentar escribir al archivo (puede fallar en Render)
    fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
  } catch (error) {
    console.log("No se pudo escribir db.json (normal en Render), usando memoria");
    // En Render, solo mantenemos los datos en memoria
    inMemoryDB = { ...data };
  }
};

// Función para inicializar usuarios por defecto
const initializeDefaultUsers = async () => {
  const data = readData();
  
  // Si no hay empleados, crear los por defecto
  if (data.employees.length === 0) {
    console.log("Inicializando usuarios por defecto...");
    
    try {
      const adminPassword = await bcrypt.hash("admin123", 10);
      const empPassword = await bcrypt.hash("emp123", 10);
      
      data.employees = [
        {
          id: 1,
          employee_code: "ADMIN001",
          name: "Administrador Principal",
          role: "admin",
          routes: [],
          commission_rate: 0,
          password: adminPassword,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          employee_code: "EMP001",
          name: "Juan Pérez",
          role: "employee",
          routes: ["Zona Norte", "Centro"],
          commission_rate: 0.05,
          password: empPassword,
          created_at: new Date().toISOString()
        }
      ];
      
      writeData(data);
      console.log("✅ Usuarios creados exitosamente:");
      console.log("👨‍💼 Admin: ADMIN001 / admin123");
      console.log("👷‍♂️ Empleado: EMP001 / emp123");
    } catch (error) {
      console.error("❌ Error creando usuarios:", error);
    }
  } else {
    console.log("✅ Usuarios ya existen en la base de datos");
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
    message: "API funcionando",
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
app.post("/auth/login", async (req, res) => {
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

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      console.log("❌ Contraseña incorrecta para:", employee_code);
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
  const body = req.body;
  const id = parseInt(req.params.id);
  const productIndex = data.products.findIndex((product) => product.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  data.products[productIndex] = {
    ...data.products[productIndex],
    ...body,
    updated_at: new Date().toISOString()
  };
  writeData(data);
  res.json({ message: "Producto actualizado exitosamente" });
});

app.delete("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const productIndex = data.products.findIndex((product) => product.id === id);
  
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  data.products.splice(productIndex, 1);
  writeData(data);
  res.json({ message: "Producto eliminado exitosamente" });
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

app.post("/api/employees", authenticateToken, requireAdmin, async (req, res) => {
  const data = readData();
  const body = req.body;
  
  const existingEmployee = data.employees.find(emp => emp.employee_code === body.employee_code);
  if (existingEmployee) {
    return res.status(400).json({ message: 'El código de empleado ya existe' });
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  
  const newEmployee = {
    id: data.employees.length + 1,
    employee_code: body.employee_code,
    name: body.name,
    role: body.role || 'employee',
    routes: body.routes || [],
    commission_rate: body.commission_rate || 0,
    password: hashedPassword,
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

// ========== RUTAS DEL FRONTEND ==========
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

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

app.get("/employee/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/dashboard.html'));
});

app.get("/employee/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/orders.html'));
});

app.get("/employee/sales.html", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/employee/sales.html'));
});

app.get("/admin", (req, res) => {
  res.redirect("/admin/dashboard.html");
});

app.get("/employee", (req, res) => {
  res.redirect("/employee/dashboard.html");
});

// API status
app.get("/api/status", (req, res) => {
  res.json({ 
    status: 'API funcionando correctamente en Render',
    version: '1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('💥 Error del servidor:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// Inicializar y arrancar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeDefaultUsers();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL: https://tu-app.onrender.com`);
      console.log("🔑 Credenciales de acceso:");
      console.log("   👨‍💼 Admin: ADMIN001 / admin123");
      console.log("   👷‍♂️ Empleado: EMP001 / emp123");
      console.log("🔍 Para debugging visita: /test");
    });
  } catch (error) {
    console.error('💥 Error al iniciar el servidor:', error);
  }
}

startServer();