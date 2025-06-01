import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here"; // En producción usar variable de entorno

const readData = () => {
  try {
    const data = fs.readFileSync("./db.json");
    return JSON.parse(data);
  } catch (error) {
    console.log(error);
    // Inicializar estructura básica si no existe
    return {
      products: [],
      employees: [],
      orders: [],
      sales: [],
      inventory_movements: []
    };
  }
};

const writeData = (data) => {
  try {
    fs.writeFileSync("./db.json", JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(error);
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
    if (err) return res.status(403).json({ message: 'Token inválido' });
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

// ========== AUTENTICACIÓN ==========
app.post("/auth/login", async (req, res) => {
  const { employee_code, password } = req.body;
  const data = readData();
  
  const employee = data.employees.find(emp => emp.employee_code === employee_code);
  if (!employee) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const validPassword = await bcrypt.compare(password, employee.password);
  if (!validPassword) {
    return res.status(401).json({ message: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: employee.id, employee_code: employee.employee_code, role: employee.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user: { id: employee.id, name: employee.name, role: employee.role } });
});

// ========== PRODUCTOS (Solo Admin) ==========
app.get("/products", authenticateToken, (req, res) => {
  const data = readData();
  res.json(data.products);
});

app.get("/products/:id", authenticateToken, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const product = data.products.find((product) => product.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  res.json(product);
});

app.post("/products", authenticateToken, requireAdmin, (req, res) => {
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
    ...body,
  };
  data.products.push(newProduct);
  writeData(data);
  res.json(newProduct);
});

app.put("/products/:id", authenticateToken, requireAdmin, (req, res) => {
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

app.delete("/products/:id", authenticateToken, requireAdmin, (req, res) => {
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

// ========== EMPLEADOS (Solo Admin) ==========
app.get("/employees", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  // No enviar passwords en la respuesta
  const employees = data.employees.map(emp => {
    const { password, ...employeeWithoutPassword } = emp;
    return employeeWithoutPassword;
  });
  res.json(employees);
});

app.post("/employees", authenticateToken, requireAdmin, async (req, res) => {
  const data = readData();
  const body = req.body;
  
  // Verificar que el código de empleado no exista
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
    ...body,
  };
  
  data.employees.push(newEmployee);
  writeData(data);
  
  // No devolver la password
  const { password, ...employeeResponse } = newEmployee;
  res.json(employeeResponse);
});

// ========== PEDIDOS ==========
app.get("/orders", authenticateToken, (req, res) => {
  const data = readData();
  let orders = data.orders;
  
  // Si es empleado, solo mostrar sus pedidos
  if (req.user.role !== 'admin') {
    orders = orders.filter(order => order.employee_id === req.user.id);
  }
  
  res.json(orders);
});

app.post("/orders", authenticateToken, (req, res) => {
  const data = readData();
  const body = req.body;
  
  const newOrder = {
    id: data.orders.length + 1,
    order_number: `ORD-${Date.now()}`,
    employee_id: req.user.id,
    employee_code: req.user.employee_code,
    products: body.products || [],
    status: 'hold', // hold, confirmed, cancelled
    photo_url: body.photo_url || null,
    client_info: body.client_info || {},
    location: body.location || null,
    notes: body.notes || '',
    total: body.total || 0,
    created_at: new Date().toISOString(),
    ...body,
  };
  
  data.orders.push(newOrder);
  writeData(data);
  res.json(newOrder);
});

app.put("/orders/:id/confirm", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  const id = parseInt(req.params.id);
  const orderIndex = data.orders.findIndex((order) => order.id === id);
  
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
    client_info: order.client_info,
    products: order.products,
    location: order.location,
    total: order.total,
    payment_info: req.body.payment_info || {},
    created_at: new Date().toISOString()
  };
  
  // Actualizar inventario
  order.products.forEach(product => {
    const productIndex = data.products.findIndex(p => p.id === product.product_id);
    if (productIndex !== -1) {
      data.products[productIndex].stock -= product.quantity;
      
      // Registro de movimiento de inventario
      data.inventory_movements.push({
        id: data.inventory_movements.length + 1,
        product_id: product.product_id,
        movement_type: 'sale',
        quantity: -product.quantity,
        reference_type: 'sale',
        reference_id: newSale.id,
        created_at: new Date().toISOString()
      });
    }
  });
  
  // Actualizar estado del pedido
  data.orders[orderIndex].status = 'confirmed';
  data.orders[orderIndex].confirmed_at = new Date().toISOString();
  
  data.sales.push(newSale);
  writeData(data);
  
  res.json({ message: "Pedido confirmado y venta creada", sale: newSale });
});

// ========== VENTAS ==========
app.get("/sales", authenticateToken, (req, res) => {
  const data = readData();
  let sales = data.sales;
  
  // Si es empleado, solo mostrar sus ventas
  if (req.user.role !== 'admin') {
    sales = sales.filter(sale => sale.employee_id === req.user.id);
  }
  
  res.json(sales);
});

// ========== REPORTES (Solo Admin) ==========
app.get("/reports/sales-by-employee", authenticateToken, requireAdmin, (req, res) => {
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

app.get("/reports/inventory", authenticateToken, requireAdmin, (req, res) => {
  const data = readData();
  res.json({
    products: data.products,
    low_stock: data.products.filter(p => p.stock < 10),
    movements: data.inventory_movements.slice(-50) // Últimos 50 movimientos
  });
});

// ========== RUTAS BÁSICAS ==========
app.get("/", (req, res) => {
  res.send("API Sistema de Aceites de Motor v1.0");
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});