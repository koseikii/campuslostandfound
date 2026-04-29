/**
 * Firebase Diagnostic Tool
 * Run in browser console to verify Firebase setup
 */

console.log('🔧 Firebase Diagnostic Tool Loading...');

async function runFirebaseDiagnostics() {
    console.clear();
    console.log('🔍 Firebase Diagnostic Report');
    console.log('═'.repeat(50));

    const report = {
        timestamp: new Date().toLocaleString(),
        status: 'CHECKING',
        issues: [],
        warnings: [],
        success: []
    };

    // 1. Check Firebase initialization
    console.log('\n1️⃣ Checking Firebase Initialization...');
    if (typeof isFirebaseReady === 'function') {
        const isReady = isFirebaseReady();
        console.log(`   isFirebaseReady(): ${isReady ? '✅ TRUE' : '❌ FALSE'}`);
        if (isReady) {
            report.success.push('Firebase is initialized');
        } else {
            report.issues.push('Firebase not initialized - check initializeFirebase()');
        }
    } else {
        report.issues.push('isFirebaseReady function not found');
        console.log('   ❌ isFirebaseReady function not found');
    }

    // 2. Check Firebase Auth
    console.log('\n2️⃣ Checking Firebase Auth...');
    if (typeof firebaseAuth !== 'undefined' && firebaseAuth !== null) {
        console.log('   ✅ firebaseAuth object exists');
        report.success.push('Firebase Auth initialized');

        if (typeof firebaseGetCurrentUser === 'function') {
            const user = firebaseGetCurrentUser();
            console.log(`   Current user: ${user ? user.email : 'None (logged out)'}`);
        }
    } else {
        console.log('   ❌ firebaseAuth not found');
        report.issues.push('Firebase Auth not initialized');
    }

    // 3. Check Firestore
    console.log('\n3️⃣ Checking Firestore...');
    if (typeof firebaseDB !== 'undefined' && firebaseDB !== null) {
        console.log('   ✅ firebaseDB object exists');
        report.success.push('Firestore initialized');

        // Try to access a collection
        try {
            console.log('   Testing Firestore connection...');
            const result = await firebaseGetCollection('users');
            if (result.success) {
                console.log(`   ✅ Firestore accessible - Found ${result.data.length} users`);
                report.success.push(`Firestore connected - ${result.data.length} users in database`);
            } else {
                console.log(`   ⚠️ Firestore error: ${result.error}`);
                report.warnings.push(`Firestore accessible but returned error: ${result.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Firestore connection error: ${error.message}`);
            report.issues.push(`Firestore connection failed: ${error.message}`);
        }
    } else {
        console.log('   ❌ firebaseDB not found');
        report.issues.push('Firestore not initialized');
    }

    // 4. Check Firebase Storage
    console.log('\n4️⃣ Checking Firebase Storage...');
    if (typeof firebaseStorage !== 'undefined' && firebaseStorage !== null) {
        console.log('   ✅ firebaseStorage object exists');
        report.success.push('Firebase Storage initialized');
    } else {
        console.log('   ❌ firebaseStorage not found');
        report.issues.push('Firebase Storage not initialized');
    }

    // 5. Check Auth Functions
    console.log('\n5️⃣ Checking Auth Functions...');
    const authFunctions = ['firebaseLogin', 'firebaseSignup', 'firebaseLogout'];
    authFunctions.forEach(fn => {
        const exists = typeof window[fn] === 'function';
        console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
        if (!exists) {
            report.issues.push(`${fn} function not found`);
        }
    });

    // 6. Check Firebase Operations
    console.log('\n6️⃣ Checking Firebase Operations...');
    const operationFunctions = [
        'firebaseAddDocument',
        'firebaseGetCollection',
        'firebaseGetDocument',
        'firebaseUpdateDocument',
        'firebaseDeleteDocument',
        'firebaseQuery'
    ];
    operationFunctions.forEach(fn => {
        const exists = typeof window[fn] === 'function';
        console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
        if (!exists) {
            report.issues.push(`${fn} function not found`);
        }
    });

    // 7. Check Handler Functions
    console.log('\n7️⃣ Checking Handler Functions...');
    const handlers = ['handleLogin', 'handleSignup', 'handleLogout'];
    handlers.forEach(fn => {
        const exists = typeof window[fn] === 'function';
        console.log(`   ${exists ? '✅' : '❌'} ${fn}`);
        if (!exists) {
            report.warnings.push(`${fn} handler not found`);
        }
    });

    // 8. Check Local Storage
    console.log('\n8️⃣ Checking Local Storage...');
    const currentUser = localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken');
    console.log(`   Current User: ${currentUser ? '✅ Stored' : '⏸️ Not stored'}`);
    console.log(`   Auth Token: ${authToken ? '✅ Stored' : '⏸️ Not stored'}`);

    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            console.log(`   Logged in as: ${user.email} (${user.role})`);
            report.success.push(`User authenticated: ${user.email}`);
        } catch (e) {
            report.issues.push('Invalid user data in localStorage');
        }
    }

    // 9. Check Configuration
    console.log('\n9️⃣ Checking Configuration...');
    if (typeof firebaseConfig !== 'undefined') {
        console.log(`   ✅ Firebase Config exists`);
        console.log(`   Project: ${firebaseConfig.projectId}`);
        console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
        report.success.push('Firebase configuration loaded');
    } else {
        console.log('   ❌ firebaseConfig not found');
        report.issues.push('Firebase config not found');
    }

    // 10. Check Global Variables
    console.log('\n🔟 Checking Global State...');
    console.log(`   Firebase Initialized: ${isFirebaseInitialized ? '✅' : '❌'}`);
    console.log(`   App Config: ${typeof appConfig !== 'undefined' ? '✅' : '❌'}`);
    console.log(`   Mock Data: ${items.length} items, ${users.length} users`);

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('═'.repeat(50));

    if (report.issues.length === 0 && report.warnings.length === 0) {
        console.log('✅ ALL SYSTEMS OPERATIONAL');
        report.status = 'HEALTHY';
    } else if (report.issues.length === 0) {
        console.log('⚠️ OPERATIONAL WITH WARNINGS');
        report.status = 'WARNING';
    } else {
        console.log('❌ ISSUES DETECTED');
        report.status = 'ERROR';
    }

    console.log(`\n✅ Success Points (${report.success.length}):`);
    report.success.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

    if (report.warnings.length > 0) {
        console.log(`\n⚠️ Warnings (${report.warnings.length}):`);
        report.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
    }

    if (report.issues.length > 0) {
        console.log(`\n❌ Issues (${report.issues.length}):`);
        report.issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
        console.log('\n💡 Fixes to try:');
        console.log('   1. Reload page (Cmd+Shift+R on Mac)');
        console.log('   2. Check script loading order in index.html');
        console.log('   3. Verify Firebase project in console.firebase.google.com');
        console.log('   4. Check browser network tab for failed requests');
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`Report generated: ${report.timestamp}`);
    console.log('═'.repeat(50) + '\n');

    return report;
}

/**
 * Quick test: Verify core functions work
 */
async function quickTest() {
    console.log('🧪 Running Quick Test...\n');

    try {
        // Test 1: Check Firebase Ready
        console.log('Test 1: Check Firebase Ready');
        const ready = isFirebaseReady();
        console.log(`  Result: ${ready ? '✅ PASS' : '❌ FAIL'}\n`);

        // Test 2: Get collection
        console.log('Test 2: Get Users Collection');
        const usersResult = await firebaseGetCollection('users');
        console.log(`  Result: ${usersResult.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Users found: ${usersResult.data?.length || 0}\n`);

        // Test 3: Get items
        console.log('Test 3: Get Items Collection');
        const itemsResult = await firebaseGetCollection('items');
        console.log(`  Result: ${itemsResult.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`  Items found: ${itemsResult.data?.length || 0}\n`);

        console.log('✅ Quick test complete!');

    } catch (error) {
        console.log(`❌ Quick test error: ${error.message}`);
    }
}

/**
 * Helper function to test login
 */
async function testLogin(email, password) {
    console.log(`🔑 Testing Login with ${email}...\n`);
    try {
        const result = await firebaseLogin(email, password);
        if (result.success) {
            console.log('✅ Login successful!');
            console.log('User:', result.data);
        } else {
            console.log(`❌ Login failed: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Login error: ${error.message}`);
    }
}

/**
 * Helper function to test signup
 */
async function testSignup(name, email, phone, password) {
    console.log(`📝 Testing Signup for ${name}...\n`);
    try {
        const result = await firebaseSignup(name, email, phone, password, 'student');
        if (result.success) {
            console.log('✅ Signup successful!');
            console.log('User:', result.data);
        } else {
            console.log(`❌ Signup failed: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Signup error: ${error.message}`);
    }
}

// Make functions globally available
window.runFirebaseDiagnostics = runFirebaseDiagnostics;
window.quickTest = quickTest;
window.testLogin = testLogin;
window.testSignup = testSignup;

console.log('✅ Diagnostic Tool Ready');
console.log('Usage in browser console:');
console.log('  runFirebaseDiagnostics()  - Full system check');
console.log('  quickTest()               - Quick functionality test');
console.log('  testLogin(email, pass)    - Test login');
console.log('  testSignup(name, email, phone, pass) - Test signup');
