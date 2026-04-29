/**
 * Firebase Authentication Functions
 * Updated version using Firebase services
 * Compatible with existing UI and workflows
 */

// ========== AUTH FUNCTIONS (FIREBASE VERSION) ==========

function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('✅ User restored from storage:', currentUser.email);
            showApp();
        } catch (e) {
            console.error('❌ Invalid user data:', e);
            showLogin();
        }
    } else {
        console.log('⚠️ No saved user, showing login');
        showLogin();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;

    // Use Firebase login
    firebaseLogin(email, password).then(result => {
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (result.success && result.data) {
            currentUser = result.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            if (result.token) {
                localStorage.setItem('authToken', result.token);
            }

            showToast('✅ Login successful!', 'success');
            console.log('✅ User logged in:', currentUser.email);
            showApp();
        } else {
            showToast(result.error || 'Login failed', 'error');
        }
    }).catch(error => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('❌ Login error: ' + error.message, 'error');
        console.error('Login error:', error);
    });
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole')?.value || 'user';

    if (!name || !email || !phone || !password) {
        showToast('Please fill all fields', 'error');
        return;
    }

    // Validate email format
    if (!email.includes('@')) {
        showToast('Please enter a valid email', 'error');
        return;
    }

    // Validate password strength
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    btn.disabled = true;

    // Use Firebase signup
    firebaseSignup(name, email, phone, password, role).then(result => {
        btn.innerHTML = originalText;
        btn.disabled = false;

        if (result.success) {
            showToast('✅ Account created! Please login.', 'success');
            console.log('✅ User registered:', email);

            // Send welcome email
            try {
                sendEmailNotification(email, 'Welcome to Campus Lost & Found',
                    `Hi ${name}, your account has been successfully created!`);
            } catch (error) {
                console.warn('⚠️ Email notification failed:', error);
            }

            // Pre-fill login form
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = password;

            switchTab('login');
        } else {
            showToast(result.error || 'Signup failed', 'error');
        }
    }).catch(error => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('❌ Signup error: ' + error.message, 'error');
        console.error('Signup error:', error);
    });
}

function handleLogout() {
    showConfirm('Are you sure you want to logout?', () => {
        const btn = document.querySelector('[onclick="handleLogout()"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        }

        firebaseLogout().then(result => {
            if (result.success) {
                currentUser = null;
                showToast('✅ Logged out successfully', 'success');
                console.log('✅ User logged out');
                showLogin();
            } else {
                if (btn) btn.disabled = false;
                showToast('Logout error: ' + result.error, 'error');
            }
        }).catch(error => {
            if (btn) btn.disabled = false;
            showToast('❌ Logout error: ' + error.message, 'error');
        });
    });
}

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabBtns = document.querySelectorAll('.tab-btn');

    if (tab === 'login') {
        if (loginForm) loginForm.classList.add('active');
        if (signupForm) signupForm.classList.remove('active');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.textContent.includes('Login'));
        });
    } else if (tab === 'signup') {
        if (loginForm) loginForm.classList.remove('active');
        if (signupForm) signupForm.classList.add('active');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.textContent.includes('Sign Up'));
        });
    }
}

/**
 * Update user profile
 */
async function updateUserProfile(updates) {
    const result = await firebaseUpdateProfile(updates);

    if (result.success) {
        currentUser = Object.assign(currentUser || {}, updates);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('✅ Profile updated', 'success');
    } else {
        showToast('❌ Profile update failed: ' + result.error, 'error');
    }

    return result;
}

/**
 * Change password
 */
async function changePasswordFirebase(newPassword) {
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    const result = await firebaseChangePassword(newPassword);

    if (result.success) {
        showToast('✅ Password changed successfully', 'success');
    } else {
        showToast('❌ Password change failed: ' + result.error, 'error');
    }

    return result;
}

/**
 * Reset password via email
 */
async function resetPasswordViaEmail(email) {
    if (!email) {
        showToast('Please enter your email', 'error');
        return;
    }

    const result = await firebaseResetPassword(email);

    if (result.success) {
        showToast('✅ Password reset email sent. Check your inbox.', 'success');
    } else {
        showToast('❌ Reset failed: ' + result.error, 'error');
    }

    return result;
}

/**
 * Get current user profile
 */
function getCurrentUserProfile() {
    return currentUser || firebaseGetCurrentUser() || null;
}

/**
 * Check if user is logged in
 */
function isUserLoggedIn() {
    return !!currentUser || !!firebaseGetCurrentUser();
}

/**
 * Get user role
 */
function getUserRole() {
    return (currentUser?.role || firebaseGetCurrentUser()?.role || 'user');
}

/**
 * Check if user is admin
 */
function isUserAdmin() {
    return getUserRole() === 'admin';
}

/**
 * Setup real-time auth state listener
 */
function setupAuthStateListener() {
    // Only set up listener if Firebase Auth is available
    if (!window.firebaseAuth) {
        console.warn('⚠️ Firebase Auth not available yet, skipping auth state listener');
        return;
    }

    try {
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName || user.email
                };
                console.log('✅ Auth state: User logged in');
                showApp();
            } else {
                currentUser = null;
                console.log('⚠️ Auth state: User logged out');
                showLogin();
            }
        });
    } catch (error) {
        console.error('⚠️ Error setting up auth listener:', error);
    }
}

// Initialize auth on page load (with delay to ensure Firebase is ready)
window.addEventListener('load', () => {
    console.log('🔐 Initializing authentication...');
    checkAuth();

    // Set up auth listener with a slight delay to ensure Firebase is ready
    setTimeout(() => {
        setupAuthStateListener();
    }, 500);
});
