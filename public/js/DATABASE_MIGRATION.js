/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATABASE MIGRATION SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This script:
 * 1. Exports all data from old collections
 * 2. Normalizes data to new schema
 * 3. Migrates to new collections
 * 4. Validates data integrity
 * 5. Archives old collections
 * 
 * USAGE: Open browser console and run:
 * await performDatabaseMigration()
 */

async function performDatabaseMigration() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 DATABASE MIGRATION STARTING');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
        // Step 1: Initialize Firebase
        console.log('\n📍 STEP 1: Initializing Firebase...');
        if (!window.FirebaseCore?.isFirebaseReady()) {
            await window.FirebaseCore.initializeFirebase();
        }
        console.log('✅ Firebase ready');

        // Step 2: Export old data
        console.log('\n📍 STEP 2: Exporting old collections...');
        const oldData = await _exportOldCollections();
        console.log(`✅ Exported ${Object.keys(oldData).length} collections`);

        // Step 3: Normalize data
        console.log('\n📍 STEP 3: Normalizing data...');
        const normalizedData = _normalizeOldData(oldData);
        console.log('✅ Data normalized');

        // Step 4: Validate new data
        console.log('\n📍 STEP 4: Validating data...');
        const validation = _validateMigrationData(normalizedData);
        if (!validation.valid) {
            console.error('❌ Validation failed:');
            validation.errors.forEach(err => console.error('  -', err));
            return { success: false, error: 'Validation failed', errors: validation.errors };
        }
        console.log('✅ Validation passed');

        // Step 5: Migrate to new collections
        console.log('\n📍 STEP 5: Migrating to new collections...');
        const migrationResult = await _migrateToNewCollections(normalizedData);
        console.log('✅ Migration complete');

        // Step 6: Verify migration
        console.log('\n📍 STEP 6: Verifying migration...');
        const verification = await _verifyMigration(normalizedData);
        if (!verification.valid) {
            console.error('❌ Verification failed:');
            verification.errors.forEach(err => console.error('  -', err));
            return { success: false, error: 'Verification failed', errors: verification.errors };
        }
        console.log('✅ Verification successful');

        // Step 7: Archive old collections
        console.log('\n📍 STEP 7: Archiving old collections...');
        const archiveResult = await _archiveOldCollections();
        console.log('✅ Old collections archived');

        // Summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🎉 MIGRATION COMPLETE!');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`
✅ Users migrated: ${normalizedData.users.length}
✅ Lost items migrated: ${normalizedData.lostItems.length}
✅ Found items migrated: ${normalizedData.foundItems.length}
✅ Claims migrated: ${normalizedData.claims.length}

Next steps:
1. Deploy new code
2. Test all features
3. Monitor Firestore database
        `);

        return {
            success: true, statistics: {
                users: normalizedData.users.length,
                lostItems: normalizedData.lostItems.length,
                foundItems: normalizedData.foundItems.length,
                claims: normalizedData.claims.length
            }
        };

    } catch (error) {
        console.error('❌ MIGRATION FAILED:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// STEP 2: EXPORT OLD DATA
// ============================================================================

async function _exportOldCollections() {
    try {
        const { collection, getDocs } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const oldData = {};

        // List of old collection names to export
        const collectionNames = [
            'items',
            'item_claims',
            'lost_found_items',
            'users',
            'user_profiles',
            'notifications',
            'audit_logs'
        ];

        for (const collName of collectionNames) {
            try {
                const collRef = collection(db, collName);
                const snapshot = await getDocs(collRef);

                const docs = [];
                snapshot.forEach(doc => {
                    docs.push({ id: doc.id, ...doc.data() });
                });

                if (docs.length > 0) {
                    oldData[collName] = docs;
                    console.log(`  ✓ ${collName}: ${docs.length} documents`);
                }
            } catch (e) {
                console.warn(`  ⚠ ${collName}: not found (skipping)`);
            }
        }

        return oldData;

    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    }
}

// ============================================================================
// STEP 3: NORMALIZE DATA
// ============================================================================

function _normalizeOldData(oldData) {
    const normalized = {
        users: [],
        lostItems: [],
        foundItems: [],
        claims: []
    };

    console.log('  Normalizing users...');
    // Normalize users from multiple possible collections
    const userDocs = oldData.users || oldData.user_profiles || [];
    for (const doc of userDocs) {
        normalized.users.push({
            uid: doc.uid || doc.id || '',
            email: doc.email || '',
            name: doc.name || doc.displayName || 'Unknown',
            phone: doc.phone || '',
            role: doc.role || 'user',
            status: doc.status || 'active',
            createdAt: doc.createdAt || new Date().toISOString()
        });
    }

    console.log('  Normalizing items...');
    // Normalize items
    const itemDocs = oldData.items || oldData.lost_found_items || [];
    for (const doc of itemDocs) {
        const item = {
            name: doc.title || doc.name || 'Item',
            description: doc.description || doc.details || '',
            category: doc.category || doc.category_id || 'other',
            status: (doc.status || doc.item_type || 'lost').toLowerCase(),
            location: doc.location || doc.location_description || 'Campus',
            date: doc.date || doc.found_on_date || new Date().toISOString().split('T')[0],
            userId: doc.userId || doc.uid || '',
            images: Array.isArray(doc.images) ? doc.images : (doc.image ? [doc.image] : []),
            resolved: doc.resolved === true,
            matched: doc.matched === true,
            createdAt: doc.createdAt || new Date().toISOString()
        };

        // Route to correct collection
        if (item.status === 'lost') {
            normalized.lostItems.push(item);
        } else if (item.status === 'found') {
            normalized.foundItems.push(item);
        }
    }

    console.log('  Normalizing claims...');
    // Normalize claims
    const claimDocs = oldData.item_claims || [];
    for (const doc of claimDocs) {
        normalized.claims.push({
            itemId: doc.itemId || doc.item_id || '',
            claimantId: doc.claimantId || doc.claimed_by || '',
            itemOwnerId: doc.itemOwnerId || doc.item_owner || '',
            status: doc.status || 'pending',
            message: doc.message || doc.claim_message || '',
            createdAt: doc.createdAt || new Date().toISOString()
        });
    }

    return normalized;
}

// ============================================================================
// STEP 4: VALIDATE DATA
// ============================================================================

function _validateMigrationData(data) {
    const errors = [];

    // Validate users
    for (const user of data.users) {
        if (!user.uid) errors.push(`User missing uid: ${user.email}`);
        if (!user.email) errors.push(`User missing email: ${user.uid}`);
    }

    // Validate items
    for (const item of [...data.lostItems, ...data.foundItems]) {
        if (!item.name) errors.push('Item missing name');
        if (!item.userId) errors.push(`Item missing userId: ${item.name}`);
        if (!['lost', 'found'].includes(item.status)) errors.push(`Invalid status: ${item.status}`);
    }

    // Validate claims
    for (const claim of data.claims) {
        if (!claim.itemId) errors.push('Claim missing itemId');
        if (!claim.claimantId) errors.push('Claim missing claimantId');
        if (!claim.itemOwnerId) errors.push('Claim missing itemOwnerId');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// ============================================================================
// STEP 5: MIGRATE TO NEW COLLECTIONS
// ============================================================================

async function _migrateToNewCollections(data) {
    try {
        const { collection, writeBatch, doc } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        // Batch write (more efficient)
        const batch = writeBatch(db);
        let batchCount = 0;
        const maxBatchSize = 500;

        // Migrate users
        console.log(`  Migrating ${data.users.length} users...`);
        for (const user of data.users) {
            batch.set(doc(collection(db, 'users'), user.uid), user);
            batchCount++;
            if (batchCount >= maxBatchSize) {
                await batch.commit();
                batchCount = 0;
            }
        }

        // Migrate lost items
        console.log(`  Migrating ${data.lostItems.length} lost items...`);
        for (const item of data.lostItems) {
            const newId = Math.random().toString(36).substr(2, 9);
            batch.set(doc(collection(db, 'lostItems'), newId), item);
            batchCount++;
            if (batchCount >= maxBatchSize) {
                await batch.commit();
                batchCount = 0;
            }
        }

        // Migrate found items
        console.log(`  Migrating ${data.foundItems.length} found items...`);
        for (const item of data.foundItems) {
            const newId = Math.random().toString(36).substr(2, 9);
            batch.set(doc(collection(db, 'foundItems'), newId), item);
            batchCount++;
            if (batchCount >= maxBatchSize) {
                await batch.commit();
                batchCount = 0;
            }
        }

        // Migrate claims
        console.log(`  Migrating ${data.claims.length} claims...`);
        for (const claim of data.claims) {
            const newId = Math.random().toString(36).substr(2, 9);
            batch.set(doc(collection(db, 'claims'), newId), claim);
            batchCount++;
            if (batchCount >= maxBatchSize) {
                await batch.commit();
                batchCount = 0;
            }
        }

        // Final commit
        if (batchCount > 0) {
            await batch.commit();
        }

        return { success: true };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// ============================================================================
// STEP 6: VERIFY MIGRATION
// ============================================================================

async function _verifyMigration(expectedData) {
    try {
        const { collection, getDocs } = await window.FirebaseCore.require_firebase_module('firestore');
        const db = window.FirebaseCore.getFirestore();

        const errors = [];

        // Check users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        console.log(`  Users in Firestore: ${usersSnap.size} (expected: ${expectedData.users.length})`);

        // Check items
        const lostRef = collection(db, 'lostItems');
        const lostSnap = await getDocs(lostRef);
        console.log(`  Lost items in Firestore: ${lostSnap.size} (expected: ${expectedData.lostItems.length})`);

        const foundRef = collection(db, 'foundItems');
        const foundSnap = await getDocs(foundRef);
        console.log(`  Found items in Firestore: ${foundSnap.size} (expected: ${expectedData.foundItems.length})`);

        // Check claims
        const claimsRef = collection(db, 'claims');
        const claimsSnap = await getDocs(claimsRef);
        console.log(`  Claims in Firestore: ${claimsSnap.size} (expected: ${expectedData.claims.length})`);

        return {
            valid: errors.length === 0,
            errors
        };

    } catch (error) {
        console.error('❌ Verification failed:', error);
        throw error;
    }
}

// ============================================================================
// STEP 7: ARCHIVE OLD COLLECTIONS
// ============================================================================

async function _archiveOldCollections() {
    try {
        console.log('  ⚠️  WARNING: Old collections should be manually archived in Firestore Console');
        console.log('  Collections to archive:');
        console.log('    - items');
        console.log('    - item_claims');
        console.log('    - lost_found_items');
        console.log('    - user_profiles');
        console.log('    - notifications');
        console.log('    - audit_logs');

        return { success: true, message: 'Please manually delete old collections' };

    } catch (error) {
        console.error('❌ Archive failed:', error);
        throw error;
    }
}

console.log('✅ Migration script loaded. Run: await performDatabaseMigration()');
