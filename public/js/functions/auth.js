// ========== AUTH FUNCTIONS ==========

function checkAuth() {
    // Check for stored user in memory (not localStorage for primary storage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showApp();
        } catch (e) {
            console.error('Invalid user data:', e);
            showLogin();
        }
    } else {
        showLogin();
    }
}

// NOTE: handleLogin is defined in firebase-auth-handler.js
// This function is overridden there with Firebase integration

// NOTE: handleSignup is defined in firebase-auth-handler.js
// This function is overridden there with Firebase integration

// NOTE: logout() function is now handled by handleLogout() in firebase-auth-handler.js
// Legacy logout function - use handleLogout() for Firebase-backed logout
function logout() {
    try {
        // ✅ NEW: Clean up real-time listeners to prevent memory leaks
        if (typeof cleanupAllListeners === 'function') {
            console.log('🧹 Cleaning up real-time listeners...');
            cleanupAllListeners();
        }

        currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');

        // Clear any other auth-related storage
        Object.keys(localStorage).forEach(key => {
            if (key.includes('auth') || key.includes('user') || key.includes('token')) {
                localStorage.removeItem(key);
            }
        });

        // Clear session storage as well
        sessionStorage.clear();

        console.log('✅ User logout: cleared all stored data');
    } catch (error) {
        console.error('⚠️ Error clearing logout data:', error);
    }

    showLogin();
    if (typeof showToast === 'function') {
        showToast('Logged out successfully', 'success');
    }
}

function showLogin() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('appPage').classList.remove('active');
    document.getElementById('adminPage').classList.remove('active');
}

function showApp() {
    console.log('👤 showApp called. CurrentUser:', currentUser ? currentUser.name : 'None', 'Items:', items.length);

    // Check if admin user
    if (currentUser && currentUser.role === 'admin') {
        console.log('👮 Admin detected, showing admin panel');
        showAdminPanel();
        return;
    }

    // Show app page
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('appPage').classList.add('active');
    document.getElementById('adminPage').classList.remove('active');

    // Update user info
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role;
        document.getElementById('userAvatar').textContent = currentUser.name[0].toUpperCase();
        console.log(`   ℹ️ Display name: ${currentUser.name} (${currentUser.role})`);
    }

    // ✅ IMPROVED: Use managed sync with deduplication
    if (typeof managedSyncItems === 'function' && isFirebaseReady()) {
        console.log('📥 Loading items from Firebase (managed sync)...');
        managedSyncItems().then(() => {
            console.log(`✅ Items loaded from Firebase: ${items.length} items`);
            updateStats();
            updateNotifications();
            currentTab = 'lost';
            renderItems();
        }).catch(error => {
            console.warn('⚠️ Firebase load failed, using local items:', error);
            updateStats();
            updateNotifications();
            currentTab = 'lost';
            renderItems();
        });
    } else {
        // Use local items if Firebase or managed sync not ready
        console.log('🔄 Using local items...');
        updateStats();
        updateNotifications();
        currentTab = 'lost';
        renderItems();
    }
}

// Tab Functions
// NOTE: switchTab() is defined in firebase-auth-handler.js
// This function is overridden there
function switchTab(tab) {
    try {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (!loginForm || !signupForm) {
            console.warn('⚠️ Auth forms not found in DOM');
            return;
        }

        const tabBtns = document.querySelectorAll('#loginPage .tab-btn');

        if (tab === 'login') {
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            tabBtns.forEach(btn => {
                if (btn.textContent.includes('Login')) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } else if (tab === 'signup') {
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
            tabBtns.forEach(btn => {
                if (btn.textContent.includes('Sign Up')) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    } catch (error) {
        console.error('❌ Error switching tab:', error);
    }
}

// Change Password Functions
function openChangePasswordModal() {
    try {
        console.log('🔐 Opening change password modal...');

        // Close other dropdowns
        const userDropdown = document.getElementById('userDropdown');
        const adminDropdown = document.getElementById('adminUserDropdown');
        if (userDropdown) userDropdown.classList.remove('active');
        if (adminDropdown) adminDropdown.classList.remove('active');

        // Show modal
        const modal = document.getElementById('changePasswordModal');
        if (!modal) {
            console.error('❌ Change password modal not found in DOM');
            return;
        }
        modal.classList.add('active');
        console.log('   ✓ Modal displayed');

        // Reset form
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();

        // Reset password strength display
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');
        const requirements = document.getElementById('passwordRequirements');

        if (strengthBar) strengthBar.style.width = '0%';
        if (strengthText) strengthText.textContent = '';
        if (requirements) requirements.innerHTML = '';

        // Focus on current password field
        setTimeout(() => {
            const currentPasswordEl = document.getElementById('currentPassword');
            if (currentPasswordEl) {
                currentPasswordEl.focus();
                console.log('   ✓ Form reset and focused on current password field');
            }
        }, 100);
    } catch (error) {
        console.error('❌ Error opening change password modal:', error);
    }
}

function closeChangePasswordModal() {
    try {
        console.log('🔐 Closing change password modal');

        const modal = document.getElementById('changePasswordModal');
        const form = document.getElementById('changePasswordForm');
        const strengthBar = document.getElementById('passwordStrengthBar');
        const strengthText = document.getElementById('passwordStrengthText');
        const requirements = document.getElementById('passwordRequirements');

        if (modal) modal.classList.remove('active');
        if (form) form.reset();
        if (strengthBar) strengthBar.style.width = '0%';
        if (strengthText) strengthText.textContent = '';
        if (requirements) requirements.innerHTML = '';

        console.log('   ✓ Modal closed and form reset');
    } catch (error) {
        console.error('❌ Error closing change password modal:', error);
    }
}

function handleChangePassword(e) {
    try {
        e.preventDefault();
        console.log('🔑 handleChangePassword called');

        // Get form values
        const currentPasswordEl = document.getElementById('currentPassword');
        const newPasswordEl = document.getElementById('newPassword');
        const confirmPasswordEl = document.getElementById('confirmPassword');

        if (!currentPasswordEl || !newPasswordEl || !confirmPasswordEl) {
            console.error('❌ Password form fields not found');
            if (typeof showToast === 'function') {
                showToast('Form fields not found. Please refresh the page.', 'error');
            }
            return;
        }

        const currentPassword = currentPasswordEl.value.trim();
        const newPassword = newPasswordEl.value.trim();
        const confirmPassword = confirmPasswordEl.value.trim();

        console.log('   ✓ Form values retrieved');

        // Check if user is logged in
        if (!currentUser) {
            if (typeof showToast === 'function') {
                showToast('Please log in first', 'error');
            }
            console.error('   ❌ No current user');
            return;
        }

        // Verify current password
        if (currentPassword !== currentUser.password) {
            if (typeof showToast === 'function') {
                showToast('Current password is incorrect', 'error');
            }
            console.warn('   ❌ Current password mismatch');
            return;
        }
        console.log('   ✓ Current password verified');

        // Check if new password is same as current
        if (newPassword === currentPassword) {
            if (typeof showToast === 'function') {
                showToast('New password must be different from current password', 'error');
            }
            console.warn('   ❌ New password same as current');
            return;
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            if (typeof showToast === 'function') {
                showToast('Passwords do not match', 'error');
            }
            console.warn('   ❌ Confirmation password mismatch');
            return;
        }
        console.log('   ✓ Passwords match');

        // Validate password strength
        const strength = typeof validatePasswordStrength === 'function' ? validatePasswordStrength(newPassword) : { level: 'medium', score: 3, message: [] };
        console.log(`   📊 Password strength: ${strength.level} (score: ${strength.score}/6)`);

        if (strength.score < 3) {
            if (typeof showToast === 'function') {
                showToast(`Password is too weak. ${strength.message.join(', ')}`, 'error');
            }
            console.warn('   ❌ Password too weak');
            return;
        }
        console.log('   ✓ Password strength acceptable');

        // Update password in currentUser
        const oldPassword = currentUser.password;
        currentUser.password = newPassword;
        console.log('   ✓ Updated currentUser password');

        // Update password in users array
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            console.log(`   ✓ Updated user in array (index: ${userIndex})`);
        } else {
            console.error('   ❌ User not found in array');
        }

        // Save to localStorage and database
        try {
            if (typeof saveData === 'function') {
                saveData();
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('   ✓ Saved to localStorage and database');
        } catch (err) {
            console.error('   ❌ Error saving data:', err);
            if (typeof showToast === 'function') {
                showToast('Error saving password. Please try again.', 'error');
            }
            currentUser.password = oldPassword; // Revert on error
            return;
        }

        // Show success and close modal
        if (typeof showToast === 'function') {
            showToast('Password changed successfully!', 'success');
        }
        console.log('   ✓ Password changed successfully');

        // Send email notification (non-blocking)
        try {
            if (typeof sendEmailNotification === 'function') {
                sendEmailNotification(currentUser.email, 'Password Changed', `Your password has been successfully changed on ${new Date().toLocaleString()}`);
            }
        } catch (err) {
            console.warn('   ⚠️ Email notification failed (non-critical):', err);
        }

        // Close modal and reset form
        closeChangePasswordModal();
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();
        console.log('🔑 handleChangePassword complete ✅');
    } catch (error) {
        console.error('❌ handleChangePassword error:', error);
        if (typeof showToast === 'function') {
            showToast('An error occurred while changing password: ' + error.message, 'error');
        }
    }
}

// Monitor password strength in real-time
function updatePasswordStrength() {
    const newPassword = document.getElementById('newPassword').value;
    if (!newPassword) {
        document.getElementById('passwordStrengthBar').style.width = '0%';
        document.getElementById('passwordStrengthText').textContent = '';
        document.getElementById('passwordRequirements').innerHTML = '';
        return;
    }

    const strength = validatePasswordStrength(newPassword);
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
    const widths = ['20%', '40%', '60%', '80%', '100%'];

    const barWidth = widths[Math.min(strength.score, 4)];
    const barColor = colors[Math.min(strength.score, 4)];

    document.getElementById('passwordStrengthBar').style.width = barWidth;
    document.getElementById('passwordStrengthBar').style.backgroundColor = barColor;
    document.getElementById('passwordStrengthText').textContent = `Strength: ${strength.level}`;
    document.getElementById('passwordStrengthText').style.color = barColor;

    // Show requirements
    let requirements = '<div style="font-size: 12px; margin-top: 10px;">';
    requirements += '<strong>Requirements:</strong><ul style="margin: 5px 0; padding-left: 20px;">';
    requirements += `<li style="color: ${newPassword.length >= 8 ? '#22c55e' : '#ef4444'};">✓ At least 8 characters (${newPassword.length}/8)</li>`;
    requirements += `<li style="color: ${/[A-Z]/.test(newPassword) ? '#22c55e' : '#ef4444'};">✓ Uppercase letter</li>`;
    requirements += `<li style="color: ${/[a-z]/.test(newPassword) ? '#22c55e' : '#ef4444'};">✓ Lowercase letter</li>`;
    requirements += `<li style="color: ${/\d/.test(newPassword) ? '#22c55e' : '#ef4444'};">✓ Number</li>`;
    requirements += `<li style="color: ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? '#22c55e' : '#ef4444'};">✓ Special character (!@#$%^&*)</li>`;
    requirements += '</ul></div>';
    document.getElementById('passwordRequirements').innerHTML = requirements;

    console.log(`🔐 Password strength updated: ${strength.level} (${strength.score}/6)`);
}
