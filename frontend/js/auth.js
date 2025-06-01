// Configuración de la API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

// Función para hacer login
async function login(employeeCode, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee_code: employeeCode,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar token y datos del usuario
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirigir según el rol
            if (data.user.role === 'admin') {
                window.location.href = 'admin/dashboard.html';
            } else {
                window.location.href = 'employee/dashboard.html';
            }
        } else {
            showError(data.message || 'Error de autenticación');
        }
    } catch (error) {
        showError('Error de conexión. Verifica que el servidor esté funcionando.');
        console.error('Error:', error);
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// Función para verificar si el usuario está autenticado
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '../index.html';
        return null;
    }
    
    return JSON.parse(user);
}

// Función para verificar si el usuario es admin
function requireAdmin() {
    const user = checkAuth();
    if (!user || user.role !== 'admin') {
        alert('Acceso denegado. Se requieren permisos de administrador.');
        window.location.href = '../index.html';
        return false;
    }
    return true;
}

// Función para mostrar errores
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// Función para obtener el token
function getToken() {
    return localStorage.getItem('token');
}

// Función para obtener datos del usuario
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Event listener para el formulario de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const employeeCode = document.getElementById('employee_code').value;
            const password = document.getElementById('password').value;
            
            if (!employeeCode || !password) {
                showError('Por favor, completa todos los campos');
                return;
            }
            
            await login(employeeCode, password);
        });
    }

    // Si estamos en una página que requiere autenticación
    if (window.location.pathname.includes('admin/') || window.location.pathname.includes('employee/')) {
        const user = checkAuth();
        if (user) {
            // Mostrar nombre del usuario en el sidebar
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = user.name;
            }
        }
    }
});