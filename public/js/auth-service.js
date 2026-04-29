/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED AUTHENTICATION SERVICE MODULE
 * Complete Auth Flow with User Doc Linking and Account Management
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Auto-create Firestore user documents on signup
 * - Verify account linking on login
 * - Secure password change with verification
 * - Session management
 * - Account recovery and security
 */

// ============================================================================
// SECTION 1: ENHANCED SIGNUP WITH AUTO USER DOC CREATION
// ============================================================================

/**
 * COMPLETE SIGNUP FLOW
 * 1. Create auth user
 * 2. Create Firestore user document
 * 3. Return complete user data
 * 
 * @param {string} name - User's full name
 * @param {string} email - User's email
 * @param {string} phone - User's phone number
 * @param {string} password - User's password
 * @param {string} role - User role (student/teacher/staff)
 * @returns {Promise<object>} - Signup result
 * 
 * USAGE:
 * const result = await authCompleteSignup('John Doe', 'john@campus.edu', '+639123456789', 'password123', 'student');
 * if (result.success) {
 *     console.log('User created:', result.data);
 * }
 */
async function authCompleteSignup(name, email, phone, password, role = 'student') {
    try {
        if (!firebaseAuth || !firebaseDB) {
            return { success: false, error: 'Firebase not initialized' };
        }

        // Validate inputs
        if (!name || !email || !phone || !password) {
            return { success: false, error: 'All fields are required' };
        }

        if (password.length < 6) {
            return { success: false, error: 'Password must be at least 6 characters' };
        }

        const { createUserWithEmailAndPassword, updateProfile } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        console.log('🚀 Starting complete signup flow for:', email);

        // Step 1: Create Firebase Auth user
        console.log('📝 Creating Firebase Auth user...');
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const authUser = userCredential.user;

        console.log('✅ Auth user created:', authUser.uid);

        // Step 2: Update auth profile
        try {
            await updateProfile(authUser, { displayName: name });
            console.log('✅ Auth profile updated');
        } catch (error) {
            console.warn('⚠️ Profile update failed (non-critical):', error.message);
        }

        // Step 3: Create Firestore user document
        console.log('📝 Creating Firestore user document...');
        const userDocResult = await firestoreAutoCreateUserDoc(authUser.uid, {
            email: email,
            name: name,
            phone: phone,
            role: role,
            avatar: ''
        });

        if (!userDocResult.success) {
            console.error('❌ Failed to create Firestore document');
            // Don't delete auth user here - let admin clean up
            return {
                success: false,
                error: 'Failed to create user profile. Please contact support.',
                authCreated: true // Flag that auth user exists
            };
        }

        console.log('✅ Complete signup successful:', email);

        return {
            success: true,
            data: {
                uid: authUser.uid,
                email: authUser.email,
                name: name,
                phone: phone,
                role: role,
                avatar: '',
                createdAt: new Date().toISOString()
            },
            message: 'Account created successfully!'
        };
    } catch (error) {
        // Convert Firebase error codes to user-friendly messages
        let errorMessage = 'Signup failed';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Signup is disabled';
        }

        console.error('❌ Signup error:', error.message);
        return { success: false, error: errorMessage };
    }
}

// ============================================================================
// SECTION 2: ENHANCED LOGIN WITH ACCOUNT LINKING VERIFICATION
// ============================================================================

/**
 * COMPLETE LOGIN FLOW
 * 1. Authenticate user
 * 2. Verify Firestore account linking
 * 3. Auto-create Firestore doc if missing
 * 4. Return complete user data
 * 
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} - Login result with user data
 * 
 * USAGE:
 * const result = await authCompleteLogin('user@campus.edu', 'password123');
 * if (result.success) {
 *     currentUser = result.data;
 * }
 */
async function authCompleteLogin(email, password) {
    try {
        if (!firebaseAuth || !firebaseDB) {
            return { success: false, error: 'Firebase not initialized' };
        }

        if (!email || !password) {
            return { success: false, error: 'Email and password required' };
        }

        const { signInWithEmailAndPassword } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        console.log('🔐 Starting login flow for:', email);

        // Step 1: Authenticate with Firebase Auth
        console.log('📝 Authenticating with Firebase Auth...');
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const authUser = userCredential.user;
        const idToken = await authUser.getIdToken();

        console.log('✅ Authentication successful:', authUser.uid);

        // Step 2: Verify account linking
        console.log('🔗 Verifying account linking...');
        const linkResult = await firestoreVerifyAccountLinking(authUser);

        if (!linkResult.success) {
            console.warn('⚠️ Account linking failed:', linkResult.error);
            return {
                success: false,
                error: 'Could not retrieve user profile. Please try again.'
            };
        }

        console.log('✅ Account linking verified');

        // Step 3: Prepare user data
        const firestoreUser = linkResult.data;
        const userData = {
            uid: authUser.uid,
            email: authUser.email,
            name: firestoreUser.name || authUser.displayName || email.split('@')[0],
            phone: firestoreUser.phone || '',
            role: firestoreUser.role || 'user',
            avatar: firestoreUser.avatar || '',
            status: firestoreUser.status || 'active',
            createdAt: firestoreUser.createdAt || new Date().toISOString()
        };

        console.log('✅ Complete login successful:', email, 'Role:', userData.role);

        // Step 4: Update last login time
        try {
            await firestoreUpdateUserProfile(authUser.uid, {
                lastLogin: new Date().toISOString()
            });
        } catch (error) {
            console.warn('⚠️ Could not update last login time');
        }

        return {
            success: true,
            data: userData,
            token: idToken,
            autoCreated: linkResult.autoCreated || false
        };
    } catch (error) {
        let errorMessage = 'Login failed';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled';
        }

        console.error('❌ Login error:', error.message);
        return { success: false, error: errorMessage };
    }
}

// ============================================================================
// SECTION 3: SECURE PASSWORD CHANGE
// ============================================================================

/**
 * CHANGE PASSWORD
 * Requires current password verification for security
 * 
 * @param {string} currentPassword - User's current password
 * @param {string} newPassword - New password to set
 * @returns {Promise<object>} - Result
 * 
 * SECURITY FEATURES:
 * - Requires current password verification
 * - Validates password strength
 * - Logs audit event
 * 
 * USAGE:
 * const result = await authChangePassword('oldpass123', 'newpass456');
 * if (result.success) {
 *     console.log('Password changed successfully');
 * }
 */
async function authChangePassword(currentPassword, newPassword) {
    try {
        if (!firebaseAuth) {
            return { success: false, error: 'Firebase not initialized' };
        }

        const currentUser = firebaseGetCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        // Validate input
        if (!currentPassword || !newPassword) {
            return { success: false, error: 'Both passwords required' };
        }

        if (newPassword.length < 6) {
            return { success: false, error: 'New password must be at least 6 characters' };
        }

        if (currentPassword === newPassword) {
            return { success: false, error: 'New password must be different from current password' };
        }

        console.log('🔐 Starting password change for:', currentUser.email);

        const { reauthenticateWithCredential, EmailAuthProvider, updatePassword } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        // Step 1: Verify current password
        console.log('📝 Verifying current password...');
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            console.log('✅ Current password verified');
        } catch (error) {
            console.error('❌ Current password verification failed');
            return { success: false, error: 'Current password is incorrect' };
        }

        // Step 2: Update to new password
        console.log('📝 Updating password...');
        try {
            await updatePassword(currentUser, newPassword);
            console.log('✅ Password updated successfully');
        } catch (error) {
            console.error('❌ Password update failed:', error.message);
            return { success: false, error: 'Failed to update password' };
        }

        // Step 3: Log audit event
        try {
            await firestoreLogAuditEvent('password_change', {
                userId: currentUser.uid,
                email: currentUser.email,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.warn('⚠️ Audit logging failed (non-critical)');
        }

        console.log('✅ Password change complete');
        return { success: true, message: 'Password changed successfully' };
    } catch (error) {
        console.error('❌ Password change error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * RESET PASSWORD
 * Send password reset email
 * 
 * @param {string} email - Email to send reset link to
 * @returns {Promise<object>} - Result
 */
async function authSendPasswordResetEmail(email) {
    try {
        if (!firebaseAuth) {
            return { success: false, error: 'Firebase not initialized' };
        }

        if (!email) {
            return { success: false, error: 'Email required' };
        }

        const { sendPasswordResetEmail } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        console.log('📧 Sending password reset email to:', email);

        await sendPasswordResetEmail(firebaseAuth, email);

        console.log('✅ Password reset email sent');
        return {
            success: true,
            message: 'Password reset link sent to your email'
        };
    } catch (error) {
        let errorMessage = 'Failed to send reset email';

        if (error.code === 'auth/user-not-found') {
            // Don't reveal if user exists for security
            errorMessage = 'If an account exists with this email, you will receive a reset link';
        }

        console.error('❌ Password reset error:', error.message);
        return { success: false, error: errorMessage };
    }
}

// ============================================================================
// SECTION 4: ACCOUNT VERIFICATION & SECURITY
// ============================================================================

/**
 * VERIFY EMAIL ADDRESS
 * Send email verification
 * 
 * @returns {Promise<object>} - Result
 */
async function authSendEmailVerification() {
    try {
        if (!firebaseAuth) {
            return { success: false, error: 'Firebase not initialized' };
        }

        const currentUser = firebaseGetCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        if (currentUser.emailVerified) {
            return { success: true, message: 'Email already verified' };
        }

        const { sendEmailVerification } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        console.log('📧 Sending email verification to:', currentUser.email);

        await sendEmailVerification(currentUser);

        console.log('✅ Verification email sent');
        return {
            success: true,
            message: 'Verification email sent to your inbox'
        };
    } catch (error) {
        console.error('❌ Verification email error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * UPDATE USER EMAIL
 * Change email address with verification
 * 
 * @param {string} newEmail - New email address
 * @returns {Promise<object>} - Result
 */
async function authUpdateUserEmail(newEmail) {
    try {
        if (!firebaseAuth || !firebaseDB) {
            return { success: false, error: 'Firebase not initialized' };
        }

        const currentUser = firebaseGetCurrentUser();
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' };
        }

        if (!newEmail) {
            return { success: false, error: 'New email required' };
        }

        const { updateEmail } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        console.log('📧 Updating email to:', newEmail);

        // Update in Firebase Auth
        await updateEmail(currentUser, newEmail);
        console.log('✅ Email updated in Auth');

        // Update in Firestore
        await firestoreUpdateUserProfile(currentUser.uid, {
            email: newEmail
        });
        console.log('✅ Email updated in Firestore');

        return { success: true, message: 'Email updated successfully' };
    } catch (error) {
        let errorMessage = 'Failed to update email';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        }

        console.error('❌ Email update error:', error.message);
        return { success: false, error: errorMessage };
    }
}

// ============================================================================
// SECTION 5: SESSION MANAGEMENT
// ============================================================================

/**
 * GET CURRENT USER WITH FULL DATA
 * Returns user object with Firestore data
 * 
 * @returns {Promise<object>} - Complete user data
 */
async function authGetCurrentUserWithData() {
    try {
        const authUser = firebaseGetCurrentUser();
        if (!authUser) {
            return null;
        }

        const userResult = await firestoreGetUserProfile(authUser.uid);
        if (userResult.success) {
            return userResult.data;
        }

        return {
            uid: authUser.uid,
            email: authUser.email,
            name: authUser.displayName || authUser.email.split('@')[0]
        };
    } catch (error) {
        console.error('❌ Error getting current user:', error.message);
        return null;
    }
}

/**
 * CHECK IF USER IS ADMIN
 * 
 * @returns {boolean} - True if current user is admin
 */
function authIsCurrentUserAdmin() {
    const authUser = firebaseGetCurrentUser();
    if (!authUser) return false;

    // Also check localStorage for UI purposes
    try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.role === 'admin';
        }
    } catch (error) {
        console.warn('⚠️ Error checking admin status');
    }

    return false;
}

/**
 * CHECK IF USER IS LOGGED IN
 * 
 * @returns {boolean} - True if user is authenticated
 */
function authIsUserLoggedIn() {
    return firebaseGetCurrentUser() !== null;
}

/**
 * LOGOUT COMPLETELY
 * Clear auth and cleanup
 * 
 * @returns {Promise<object>} - Result
 */
async function authCompleteLogout() {
    try {
        if (!firebaseAuth) {
            return { success: false, error: 'Firebase not initialized' };
        }

        const { signOut } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js"
        );

        console.log('🔐 Logging out...');

        // Clean up listeners if function exists
        if (typeof firestoreCleanupAllListeners === 'function') {
            firestoreCleanupAllListeners();
        }

        // Clear local storage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('items');
        localStorage.removeItem('users');

        // Sign out
        await signOut(firebaseAuth);

        console.log('✅ Logout complete');
        return { success: true, message: 'Logged out successfully' };
    } catch (error) {
        console.error('❌ Logout error:', error.message);
        return { success: false, error: error.message };
    }
}

console.log('✅ Enhanced Auth Service Module Loaded');
