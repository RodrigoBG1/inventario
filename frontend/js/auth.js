// Configuración de la API para Render
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : window.location.origin; // Para Render usa el mismo origen

// Función para hacer login
async function login(employeeCode, password) {
    try {
        console.log('🔄 Intentando login con:', employeeCode);
        console.log('🔗 URL de API:', `${API_BASE_URL}/auth/login`);
        
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

        console.log('📡 Respuesta del servidor:', response.status);
        const data = await response.json();
        console.log('📄 Datos recibidos:', data);

        if (response.ok) {
            // Guardar token y datos del usuario
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('✅ Login exitoso, redirigiendo...');
            
            // Redirigir según el rol
            if (data.user.role === 'admin') {
                window.location.href = '/admin/dashboard.html';
            } else {
                window.location.href = '/employee/dashboard.html';
            }
        } else {
            showError(data.message || 'Error de autenticación');
            console.error('❌ Error de login:', data.message);
        }
    } catch (error) {
        const errorMsg = 'Error de conexión. Verifica que el servidor esté funcionando.';
        showError(errorMsg);
        console.error('💥 Error de conexión:', error);
        
        // Mostrar información adicional para debugging
        console.log('🔍 Información de debugging:');
        console.log('- URL actual:', window.location.href);
        console.log('- API URL:', API_BASE_URL);
        console.log('- Hostname:', window.location.hostname);
    }
}

// Función para cerrar sesión
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Función para verificar si el usuario está autenticado
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        console.log('❌ No hay token o usuario, redirigiendo al login');
        window.location.href = '/';
        return null;
    }
    
    try {
        return JSON.parse(user);
    } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return null;
    }
}

// Función para verificar si el usuario es admin
function requireAdmin() {
    const user = checkAuth();
    if (!user || user.role !== 'admin') {
        alert('Acceso denegado. Se requieren permisos de administrador.');
        window.location.href = '/';
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
        // Agregar valores por defecto para testing en Render
        if (window.location.hostname !== 'localhost') {
            const employeeCodeInput = document.getElementById('employee_code');
            const passwordInput = document.getElementById('password');
            
            // Pre-llenar con credenciales de admin para facilitar testing
            if (employeeCodeInput && !employeeCodeInput.value) {
                employeeCodeInput.placeholder = 'ADMIN001 o EMP001';
            }
            if (passwordInput && !passwordInput.value) {
                passwordInput.placeholder = 'admin123 o emp123';
            }
        }
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const employeeCode = document.getElementById('employee_code').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!employeeCode || !password) {
                showError('Por favor, completa todos los campos');
                return;
            }
            
            // Deshabilitar el botón mientras se procesa
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Iniciando sesión...';
            
            try {
                await login(employeeCode, password);
            } finally {
                // Re-habilitar el botón
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
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
            
            console.log('✅ Usuario autenticado:', user.name, '- Rol:', user.role);
        }
    }
    
    // Agregar información de debugging en desarrollo
    if (window.location.hostname !== 'localhost') {
        console.log('🔍 Información de la aplicación:');
        console.log('- Entorno: Render (Producción)');
        console.log('- API Base URL:', API_BASE_URL);
        console.log('- Credenciales disponibles:');
        console.log('  👨‍💼 Admin: ADMIN001 / admin123');
        console.log('  👷‍♂️ Empleado: EMP001 / emp123');
    }
});