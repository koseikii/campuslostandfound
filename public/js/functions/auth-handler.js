/**
 * Authentication Form Handler
 * Handles login and signup form submissions with proper error handling
 */

// Show message in form
function showFormMessage(message, type = 'error') {
    const messageDiv = document.getElementById('formMessage');
    if (!messageDiv) return;

    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = message;
    messageDiv.style.display = 'block';

    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validate inputs
    if (!email || !password) {
        showFormMessage('❌ Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showFormMessage('❌ Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Show loading state
        const btn = event.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Call API
        const apiService = new APIService();
        const result = await apiService.login(email, password);

        if (result.success) {
            showFormMessage('✅ ' + result.message, 'success');

            // Store user data
            localStorage.setItem('currentUser', JSON.stringify(result.data));

            // Redirect after delay
            setTimeout(() => {
                window.location.href = '/PCDS_CAMPUS/index.html';
            }, 1500);
        } else {
            showFormMessage('❌ ' + (result.error || 'Login failed'), 'error');
            console.error('Login error:', result);
        }

        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;

    } catch (error) {
        showFormMessage('❌ An error occurred: ' + error.message, 'error');
        console.error('Login error:', error);
        const btn = event.target.querySelector('button[type="submit"]');
        btn.disabled = false;
    }
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;

    // Validate inputs
    if (!name || !email || !phone || !password || !role) {
        showFormMessage('❌ Please fill in all fields', 'error');
        return;
    }

    if (!name.includes(' ')) {
        showFormMessage('❌ Please enter your first and last name', 'error');
        return;
    }

    if (password.length < 6) {
        showFormMessage('❌ Password must be at least 6 characters', 'error');
        return;
    }

    if (!email.includes('@')) {
        showFormMessage('❌ Please enter a valid email address', 'error');
        return;
    }

    if (phone.length < 10) {
        showFormMessage('❌ Please enter a valid phone number', 'error');
        return;
    }

    try {
        // Show loading state
        const btn = event.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

        // Call API
        const apiService = new APIService();
        const result = await apiService.signup(name, email, phone, password, role);

        if (result.success) {
            showFormMessage('✅ ' + result.message + ' Redirecting to login...', 'success');

            // Reset form
            event.target.reset();

            // Switch to login tab after delay
            setTimeout(() => {
                switchTab('login');
                document.getElementById('loginEmail').value = email;
                showFormMessage('💡 Now log in with your new account', 'info');
            }, 1500);
        } else {
            showFormMessage('❌ ' + (result.error || 'Registration failed'), 'error');
            console.error('Signup error:', result);
        }

        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;

    } catch (error) {
        showFormMessage('❌ An error occurred: ' + error.message, 'error');
        console.error('Signup error:', error);
        const btn = event.target.querySelector('button[type="submit"]');
        btn.disabled = false;
    }
}

// Switch between login and signup tabs
function switchTab(tab) {
    // Hide message when switching tabs
    const messageDiv = document.getElementById('formMessage');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Hide/show forms
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
}

// Initialize form handlers on page load
document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Auth handlers initialized');

    // Add enter key support for forms
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        form.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    this.dispatchEvent(new Event('submit'));
                }
            }
        });
    });
});
