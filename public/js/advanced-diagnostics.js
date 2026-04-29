/**
 * Advanced Diagnostic & Testing Tool
 * Lost & Found System - Production Verification
 * 
 * PURPOSE: Comprehensive testing, monitoring, and diagnostics
 * for the optimized Firebase system
 * 
 * USAGE: Run in browser console after system loads
 */

console.log('🔬 Advanced Diagnostic Tool Initializing...');

// ========== DIAGNOSTICS OBJECT ==========
const advancedDiagnostics = {
    // Timestamp for session
    sessionStart: Date.now(),

    // Store test results
    testResults: [],

    // Store performance metrics
    metrics: {}
};

// ========== SYSTEM HEALTH CHECK ==========

/**
 * Comprehensive system health check
 */
async function runFullDiagnostics() {
    console.clear();
    console.log('🔬 LOST & FOUND SYSTEM - FULL DIAGNOSTICS');
    console.log('━'.repeat(60));

    const results = {
        timestamp: new Date().toISOString(),
        tests: {}
    };

    // Test 1: Firebase Initialization
    console.log('\n1️⃣  FIREBASE INITIALIZATION');
    console.log('─'.repeat(40));
    results.tests.firebaseInit = testFirebaseInitialization();
    console.log(results.tests.firebaseInit.passed ? '✅ PASSED' : '❌ FAILED');

    // Test 2: Module Caching
    console.log('\n2️⃣  MODULE CACHING');
    console.log('─'.repeat(40));
    results.tests.moduleCaching = testModuleCaching();
    console.log(results.tests.moduleCaching.passed ? '✅ PASSED' : '❌ FAILED');

    // Test 3: Sync Manager
    console.log('\n3️⃣  SYNC MANAGER');
    console.log('─'.repeat(40));
    results.tests.syncManager = testSyncManager();
    console.log(results.tests.syncManager.passed ? '✅ PASSED' : '❌ FAILED');

    // Test 4: Data State
    console.log('\n4️⃣  DATA STATE');
    console.log('─'.repeat(40));
    results.tests.dataState = testDataState();
    console.log(results.tests.dataState.passed ? '✅ PASSED' : '❌ FAILED');

    // Test 5: Performance
    console.log('\n5️⃣  PERFORMANCE');
    console.log('─'.repeat(40));
    results.tests.performance = await testPerformance();
    console.log(results.tests.performance.passed ? '✅ PASSED' : '❌ FAILED');

    // Test 6: Memory
    console.log('\n6️⃣  MEMORY USAGE');
    console.log('─'.repeat(40));
    results.tests.memory = testMemoryUsage();
    console.log(results.tests.memory.passed ? '✅ PASSED' : '❌ FAILED');

    // Summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 OVERALL RESULTS');
    console.log('━'.repeat(60));

    const passedCount = Object.values(results.tests).filter(t => t.passed).length;
    const totalTests = Object.values(results.tests).length;
    const overallHealth = (passedCount / totalTests) * 100;

    console.log(`✅ Passed: ${passedCount}/${totalTests}`);
    console.log(`📈 Health Score: ${overallHealth.toFixed(1)}%`);

    if (overallHealth === 100) {
        console.log('🎉 SYSTEM IS PRODUCTION READY!');
    } else if (overallHealth >= 80) {
        console.log('⚠️ Some issues detected, review failed tests');
    } else {
        console.log('❌ Critical issues found, DO NOT DEPLOY');
    }

    console.log('━'.repeat(60));

    return results;
}

// ========== INDIVIDUAL TEST FUNCTIONS ==========

/**
 * Test 1: Firebase Initialization
 */
function testFirebaseInitialization() {
    const test = {
        name: 'Firebase Initialization',
        passed: true,
        details: []
    };

    try {
        // Check Firebase initialized
        if (!window.firebaseApp) {
            test.passed = false;
            test.details.push('❌ firebaseApp is null');
        } else {
            test.details.push('✅ firebaseApp initialized');
        }

        if (!window.firebaseAuth) {
            test.passed = false;
            test.details.push('❌ firebaseAuth is null');
        } else {
            test.details.push('✅ firebaseAuth initialized');
        }

        if (!window.firebaseDB) {
            test.passed = false;
            test.details.push('❌ firebaseDB (Firestore) is null');
        } else {
            test.details.push('✅ firebaseDB initialized');
        }

        if (typeof isFirebaseInitialized !== 'undefined' && isFirebaseInitialized) {
            test.details.push('✅ isFirebaseInitialized = true');
        } else {
            test.passed = false;
            test.details.push('❌ isFirebaseInitialized is false');
        }
    } catch (error) {
        test.passed = false;
        test.details.push(`❌ Exception: ${error.message}`);
    }

    test.details.forEach(d => console.log(d));
    return test;
}

/**
 * Test 2: Module Caching
 */
function testModuleCaching() {
    const test = {
        name: 'Module Caching',
        passed: true,
        details: []
    };

    try {
        if (typeof areFirebaseModulesCached !== 'function') {
            test.passed = false;
            test.details.push('❌ areFirebaseModulesCached() not available');
        } else {
            const cached = areFirebaseModulesCached();
            if (cached) {
                test.details.push('✅ Modules are cached');
            } else {
                test.passed = false;
                test.details.push('❌ Modules not cached (need to call initializeFirebaseModuleCache)');
            }
        }

        if (typeof getFirestoreModule !== 'function') {
            test.passed = false;
            test.details.push('❌ getFirestoreModule() not available');
        } else {
            test.details.push('✅ getFirestoreModule() available');
        }

        if (typeof firebaseAddDocumentOptimized !== 'function') {
            test.passed = false;
            test.details.push('❌ Optimized functions not available');
        } else {
            test.details.push('✅ Optimized functions available');
        }
    } catch (error) {
        test.passed = false;
        test.details.push(`❌ Exception: ${error.message}`);
    }

    test.details.forEach(d => console.log(d));
    return test;
}

/**
 * Test 3: Sync Manager
 */
function testSyncManager() {
    const test = {
        name: 'Sync Manager',
        passed: true,
        details: []
    };

    try {
        if (typeof managedSyncItems !== 'function') {
            test.passed = false;
            test.details.push('❌ managedSyncItems() not available');
        } else {
            test.details.push('✅ managedSyncItems() available');
        }

        if (typeof managedSyncUsers !== 'function') {
            test.passed = false;
            test.details.push('❌ managedSyncUsers() not available');
        } else {
            test.details.push('✅ managedSyncUsers() available');
        }

        if (typeof getSyncStatus !== 'function') {
            test.passed = false;
            test.details.push('❌ getSyncStatus() not available');
        } else {
            const status = getSyncStatus();
            test.details.push(`✅ Sync Status: isSyncing=${status.isSyncing}, items=${status.itemsInMemory}, users=${status.usersInMemory}`);
        }

        if (window.syncDebug && typeof window.syncDebug.getStatus === 'function') {
            test.details.push('✅ window.syncDebug available');
        } else {
            test.passed = false;
            test.details.push('❌ window.syncDebug not available');
        }
    } catch (error) {
        test.passed = false;
        test.details.push(`❌ Exception: ${error.message}`);
    }

    test.details.forEach(d => console.log(d));
    return test;
}

/**
 * Test 4: Data State
 */
function testDataState() {
    const test = {
        name: 'Data State',
        passed: true,
        details: []
    };

    try {
        if (typeof items === 'undefined' || !Array.isArray(items)) {
            test.passed = false;
            test.details.push('❌ Global items array not found');
        } else {
            test.details.push(`✅ items array: ${items.length} items`);
        }

        if (typeof users === 'undefined' || !Array.isArray(users)) {
            test.passed = false;
            test.details.push('❌ Global users array not found');
        } else {
            test.details.push(`✅ users array: ${users.length} users`);
        }

        if (typeof currentUser === 'undefined') {
            test.details.push('⚠️ currentUser not set (normal if not logged in)');
        } else if (currentUser) {
            test.details.push(`✅ currentUser: ${currentUser.name} (${currentUser.role})`);
        } else {
            test.details.push('⚠️ currentUser is null');
        }

        // Check data consistency
        if (Array.isArray(items) && items.length > 0) {
            const itemsWithoutIds = items.filter(i => !i.id && !i.firebaseId);
            if (itemsWithoutIds.length > 0) {
                test.passed = false;
                test.details.push(`❌ ${itemsWithoutIds.length} items missing IDs`);
            } else {
                test.details.push('✅ All items have IDs');
            }
        }
    } catch (error) {
        test.passed = false;
        test.details.push(`❌ Exception: ${error.message}`);
    }

    test.details.forEach(d => console.log(d));
    return test;
}

/**
 * Test 5: Performance
 */
async function testPerformance() {
    const test = {
        name: 'Performance',
        passed: true,
        details: [],
        metrics: {}
    };

    try {
        // Measure sync time
        console.log('   ⏱️  Measuring sync performance...');
        const syncStart = performance.now();
        await managedSyncItems();
        const syncTime = performance.now() - syncStart;
        test.metrics.syncTime = syncTime;

        if (syncTime < 1000) {
            test.details.push(`✅ Sync time: ${syncTime.toFixed(0)}ms (optimal)`);
        } else if (syncTime < 5000) {
            test.details.push(`⚠️ Sync time: ${syncTime.toFixed(0)}ms (acceptable)`);
        } else {
            test.passed = false;
            test.details.push(`❌ Sync time: ${syncTime.toFixed(0)}ms (too slow)`);
        }

        // Measure render time
        console.log('   ⏱️  Measuring render performance...');
        const renderStart = performance.now();
        if (typeof renderItems === 'function') {
            renderItems();
        }
        const renderTime = performance.now() - renderStart;
        test.metrics.renderTime = renderTime;

        if (renderTime < 500) {
            test.details.push(`✅ Render time: ${renderTime.toFixed(0)}ms (optimal)`);
        } else if (renderTime < 2000) {
            test.details.push(`⚠️ Render time: ${renderTime.toFixed(0)}ms (acceptable)`);
        } else {
            test.passed = false;
            test.details.push(`❌ Render time: ${renderTime.toFixed(0)}ms (too slow)`);
        }
    } catch (error) {
        test.passed = false;
        test.details.push(`❌ Exception: ${error.message}`);
    }

    test.details.forEach(d => console.log(d));
    return test;
}

/**
 * Test 6: Memory Usage
 */
function testMemoryUsage() {
    const test = {
        name: 'Memory Usage',
        passed: true,
        details: []
    };

    try {
        if (performance.memory) {
            const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
            const total = (performance.memory.totalJSHeapSize / 1048576).toFixed(1);
            const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1);

            test.details.push(`📊 Heap: ${used}MB used / ${total}MB total / ${limit}MB limit`);

            if (used < 50) {
                test.details.push('✅ Memory usage: LOW');
            } else if (used < 150) {
                test.details.push('✅ Memory usage: NORMAL');
            } else if (used < 300) {
                test.details.push('⚠️ Memory usage: HIGH');
            } else {
                test.passed = false;
                test.details.push('❌ Memory usage: CRITICAL');
            }
        } else {
            test.details.push('⚠️ performance.memory not available (Chrome only)');
        }
    } catch (error) {
        test.details.push(`❌ Exception: ${error.message}`);
    }

    test.details.forEach(d => console.log(d));
    return test;
}

// ========== QUICK TESTS ==========

/**
 * Test create operation
 */
async function testCreateItem() {
    console.log('🧪 Testing CREATE operation...');

    const testItem = {
        title: 'TEST ITEM ' + Date.now(),
        description: 'This is a test item for diagnostics',
        category: 'other',
        status: 'lost',
        location: 'Test Location',
        userId: currentUser?.id || 'test-user'
    };

    try {
        const result = await firebaseAddDocumentOptimized('items', testItem);

        if (result.success) {
            console.log(`✅ Item created: ${result.id}`);
            return { success: true, itemId: result.id };
        } else {
            console.log(`❌ Failed: ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`❌ Exception: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test read operation
 */
async function testReadItems() {
    console.log('🧪 Testing READ operation...');

    try {
        const result = await firebaseGetCollectionOptimized('items');

        if (result.success) {
            console.log(`✅ Retrieved ${result.data.length} items`);
            return { success: true, count: result.data.length };
        } else {
            console.log(`❌ Failed: ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`❌ Exception: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test update operation
 */
async function testUpdateItem(itemId) {
    console.log(`🧪 Testing UPDATE operation for ${itemId}...`);

    try {
        const result = await firebaseUpdateDocumentOptimized('items', itemId, {
            description: 'Updated at ' + new Date().toISOString()
        });

        if (result.success) {
            console.log('✅ Item updated');
            return { success: true };
        } else {
            console.log(`❌ Failed: ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`❌ Exception: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test delete operation
 */
async function testDeleteItem(itemId) {
    console.log(`🧪 Testing DELETE operation for ${itemId}...`);

    try {
        const result = await firebaseDeleteDocumentOptimized('items', itemId);

        if (result.success) {
            console.log('✅ Item deleted');
            return { success: true };
        } else {
            console.log(`❌ Failed: ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`❌ Exception: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Run CRUD tests
 */
async function testCRUDOperations() {
    console.log('\n🧪 RUNNING CRUD TESTS');
    console.log('━'.repeat(60));

    // CREATE
    const created = await testCreateItem();
    if (!created.success) {
        console.log('❌ CREATE failed, skipping rest');
        return;
    }

    // READ
    await testReadItems();

    // UPDATE
    await testUpdateItem(created.itemId);

    // DELETE
    await testDeleteItem(created.itemId);

    console.log('✅ CRUD tests completed');
}

// ========== EXPORT DIAGNOSTICS ==========

/**
 * Export diagnostics as JSON
 */
function exportDiagnostics() {
    const status = getSyncStatus();
    const diagnostics = {
        timestamp: new Date().toISOString(),
        syncStatus: status,
        dataState: {
            itemsCount: items.length,
            usersCount: users.length,
            currentUser: currentUser ? { name: currentUser.name, role: currentUser.role } : null
        },
        system: {
            firebaseInitialized: typeof isFirebaseInitialized !== 'undefined' && isFirebaseInitialized,
            modulesCached: areFirebaseModulesCached ? areFirebaseModulesCached() : false,
            syncManagerAvailable: typeof managedSyncItems === 'function'
        }
    };

    return JSON.stringify(diagnostics, null, 2);
}

// ========== MAKE AVAILABLE IN CONSOLE ==========

window.diagnostics = {
    runFull: runFullDiagnostics,
    testCRUD: testCRUDOperations,
    exportJSON: exportDiagnostics,

    // Individual tests
    testCreate: testCreateItem,
    testRead: testReadItems,
    testUpdate: testUpdateItem,
    testDelete: testDeleteItem
};

console.log('✅ Advanced Diagnostic Tool Ready');
console.log('   Use: window.diagnostics.runFull() - Full system check');
console.log('   Use: window.diagnostics.testCRUD() - Test create/read/update/delete');
console.log('   Use: window.diagnostics.exportJSON() - Export diagnostics');
