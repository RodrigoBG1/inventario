// Autenticación - USAR la configuración global SIN redeclarar

console.log('🔗 API Base URL (auth.js):', window.API_BASE_URL);
console.log('🌐 Hostname:', window.location.hostname);
console.log('🔗 Origin:', window.location.origin);

// Función para hacer login
async function login(employeeCode, password) {
    try {
        console.log('🔄 Intentando login con:', employeeCode);
        console.log('🔗 URL de API:', `${window.API_BASE_URL}/auth/login`);
        
        const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee_code: employeeCode,
                password: password
            })
        });

        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            throw new Error(errorData.message || `Error ${response.status}`);
        }

        const data = await response.json();
        console.log('📄 Datos recibidos:', data);

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

    } catch (error) {
        let errorMsg = 'Error de conexión. Verifica que el servidor esté funcionando.';
        
        // Mensajes de error más específicos
        if (error.message.includes('Failed to fetch')) {
            errorMsg = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
        } else if (error.message.includes('NetworkError')) {
            errorMsg = 'Error de red. El servidor podría estar inactivo.';
        } else if (error.message.includes('CORS')) {
            errorMsg = 'Error de CORS. Configuración del servidor incorrecta.';
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        showError(errorMsg);
        console.error('💥 Error de conexión:', error);
        
        // Mostrar información adicional para debugging
        console.log('🔍 Información de debugging:');
        console.log('- URL actual:', window.location.href);
        console.log('- API URL:', window.API_BASE_URL);
        console.log('- Hostname:', window.location.hostname);
        console.log('- Protocol:', window.location.protocol);
        console.log('- Port:', window.location.port);
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
        
        // Ocultar después de 10 segundos para dar tiempo a leer
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 10000);
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

// Test de conectividad mejorado
async function testConnection() {
    try {
        console.log('🔍 Testeando conexión a:', `${window.API_BASE_URL}/test`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
        
        const response = await fetch(`${window.API_BASE_URL}/test`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Conexión exitosa:', data);
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        
        if (error.name === 'AbortError') {
            console.error('🕐 Timeout: El servidor no responde en 10 segundos');
        }
        
        return false;
    }
}

// Event listener para el formulario de login
document.addEventListener('DOMContentLoaded', function() {
    // Test de conectividad al cargar
    testConnection();
    
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        // Mostrar información de debugging
        console.log('🔍 Información de la aplicación:');
        console.log('- Entorno:', window.location.hostname === 'localhost' ? 'Desarrollo' : 'Producción');
        console.log('- API Base URL:', window.API_BASE_URL);
        console.log('- URL completa:', window.location.href);
        console.log('- Credenciales disponibles:');
        console.log('  👨‍💼 Admin: ADMIN001 / password');
        console.log('  👷‍♂️ Empleado: EMP001 / password');
        
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
});