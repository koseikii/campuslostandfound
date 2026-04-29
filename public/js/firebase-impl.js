/**
 * Firebase Implementation Module
 * Complete Firebase integration with all CRUD operations
 */

console.log('🔧 Firebase Implementation Module Loading...');

// ========== GLOBAL FIREBASE HELPERS ==========

/**
 * Firestore: Add a new document
 */
async function firebaseAddDocument(collection, data) {
    try {
        const { collection: collectionRef, addDoc } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const ref = collectionRef(firebaseDB, collection);
        const docRef = await addDoc(ref, {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        console.log(`✅ Document added to ${collection}:`, docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error(`❌ Error adding document to ${collection}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Firestore: Get all documents from a collection
 */
async function firebaseGetCollection(collection) {
    try {
        const { collection: collectionRef, getDocs } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const ref = collectionRef(firebaseDB, collection);
        const snapshot = await getDocs(ref);

        const docs = [];
        snapshot.forEach(doc => {
            docs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Retrieved ${docs.length} documents from ${collection}`);
        return { success: true, data: docs };
    } catch (error) {
        console.error(`❌ Error getting ${collection}:`, error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Firestore: Get a single document
 */
async function firebaseGetDocument(collection, docId) {
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const docRef = doc(firebaseDB, collection, docId);
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
            console.log(`✅ Retrieved document ${docId} from ${collection}`);
            return { success: true, data: { id: docId, ...docSnapshot.data() } };
        } else {
            console.warn(`⚠️ Document ${docId} not found in ${collection}`);
            return { success: false, error: 'Document not found' };
        }
    } catch (error) {
        console.error(`❌ Error getting document from ${collection}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Firestore: Update a document
 */
async function firebaseUpdateDocument(collection, docId, data) {
    try {
        const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const docRef = doc(firebaseDB, collection, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Updated document ${docId} in ${collection}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error updating document in ${collection}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Firestore: Delete a document
 */
async function firebaseDeleteDocument(collection, docId) {
    try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const docRef = doc(firebaseDB, collection, docId);
        await deleteDoc(docRef);

        console.log(`✅ Deleted document ${docId} from ${collection}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error deleting document from ${collection}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Firestore: Query documents with conditions
 */
async function firebaseQuery(collection, conditions = []) {
    try {
        const { collection: collectionRef, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const ref = collectionRef(firebaseDB, collection);
        const q = conditions.length > 0 ? query(ref, ...conditions) : query(ref);
        const snapshot = await getDocs(q);

        const docs = [];
        snapshot.forEach(doc => {
            docs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Query on ${collection} returned ${docs.length} documents`);
        return { success: true, data: docs };
    } catch (error) {
        console.error(`❌ Query error on ${collection}:`, error);
        return { success: false, error: error.message, data: [] };
    }
}

// ========== STORAGE OPERATIONS ==========

/**
 * Upload a file to Firebase Storage
 */
async function firebaseUploadFile(storagePath, file) {
    try {
        const { ref: storageRef, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js");

        const fileRef = storageRef(firebaseStorage, storagePath);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        console.log(`✅ File uploaded to ${storagePath}`);
        return { success: true, url: url, path: snapshot.ref.fullPath };
    } catch (error) {
        console.error(`❌ Error uploading file to ${storagePath}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a file from Firebase Storage
 */
async function firebaseDeleteFile(storagePath) {
    try {
        const { ref: storageRef, deleteObject } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js");

        const fileRef = storageRef(firebaseStorage, storagePath);
        await deleteObject(fileRef);

        console.log(`✅ File deleted from ${storagePath}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error deleting file from ${storagePath}:`, error);
        return { success: false, error: error.message };
    }
}

// ========== BATCH OPERATIONS ==========

/**
 * Perform batch write operations
 */
async function firebaseBatchWrite(operations) {
    try {
        const { writeBatch } = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");

        const batch = writeBatch(firebaseDB);

        for (const op of operations) {
            if (op.type === 'set') {
                batch.set(op.ref, op.data);
            } else if (op.type === 'update') {
                batch.update(op.ref, op.data);
            } else if (op.type === 'delete') {
                batch.delete(op.ref);
            }
        }

        await batch.commit();
        console.log(`✅ Batch write completed with ${operations.length} operations`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Batch write error:`, error);
        return { success: false, error: error.message };
    }
}

// ========== REAL-TIME LISTENERS ==========

/**
 * Listen to a collection in real-time
 */
function firebaseListenToCollection(collection, callback) {
    try {
        const { collection: collectionRef, onSnapshot } = import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js").then(module => {
            const ref = collectionRef(firebaseDB, collection);
            const unsubscribe = module.onSnapshot(ref, (snapshot) => {
                const docs = [];
                snapshot.forEach(doc => {
                    docs.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback({ success: true, data: docs });
            }, (error) => {
                console.error(`❌ Real-time listener error on ${collection}:`, error);
                callback({ success: false, error: error.message });
            });
            return unsubscribe;
        }).catch(err => {
            console.error('❌ Error setting up listener:', err);
            callback({ success: false, error: err.message });
        });

        return unsubscribe;
    } catch (error) {
        console.error(`❌ Listener setup error on ${collection}:`, error);
        return null;
    }
}

/**
 * Listen to a single document in real-time
 */
function firebaseListenToDocument(collection, docId, callback) {
    try {
        import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js").then(module => {
            const docRef = module.doc(firebaseDB, collection, docId);
            const unsubscribe = module.onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    callback({ success: true, data: { id: doc.id, ...doc.data() } });
                } else {
                    callback({ success: false, error: 'Document not found' });
                }
            }, (error) => {
                console.error(`❌ Real-time listener error on ${collection}/${docId}:`, error);
                callback({ success: false, error: error.message });
            });
            return unsubscribe;
        });
    } catch (error) {
        console.error(`❌ Document listener setup error:`, error);
        callback({ success: false, error: error.message });
    }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Get Firestore reference helpers
 */
async function getFirestoreHelpers() {
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js");
    return {
        collection: firestoreModule.collection,
        doc: firestoreModule.doc,
        where: firestoreModule.where,
        orderBy: firestoreModule.orderBy,
        limit: firestoreModule.limit,
        startAt: firestoreModule.startAt,
        endAt: firestoreModule.endAt,
        serverTimestamp: firestoreModule.serverTimestamp,
        arrayUnion: firestoreModule.arrayUnion,
        arrayRemove: firestoreModule.arrayRemove,
        increment: firestoreModule.increment
    };
}

/**
 * Initialize default collections
 */
async function initializeDefaultCollections() {
    try {
        console.log('📦 Initializing default collections...');

        // Check if categories exist
        const categoriesResult = await firebaseGetCollection('categories');
        if (categoriesResult.success && categoriesResult.data.length === 0) {
            console.log('📝 Creating default categories...');
            const categories = [
                { name: 'Electronics', icon: '💻' },
                { name: 'Documents', icon: '📄' },
                { name: 'Accessories', icon: '🎒' },
                { name: 'Personal Items', icon: '👜' },
                { name: 'Books', icon: '📚' },
                { name: 'Keys', icon: '🔑' },
                { name: 'Other', icon: '❓' }
            ];

            for (const cat of categories) {
                await firebaseAddDocument('categories', cat);
            }
            console.log('✅ Default categories created');
        }

        // Check if locations exist
        const locationsResult = await firebaseGetCollection('locations');
        if (locationsResult.success && locationsResult.data.length === 0) {
            console.log('📝 Creating default locations...');
            const locations = [
                { name: 'Main Library', building: 'Library' },
                { name: 'Student Center', building: 'Admin' },
                { name: 'Cafeteria', building: 'Dining' },
                { name: 'Gymnasium', building: 'Sports' },
                { name: 'Parking Lot', building: 'Parking' },
                { name: 'Classroom Building A', building: 'Academic' },
                { name: 'Classroom Building B', building: 'Academic' }
            ];

            for (const loc of locations) {
                await firebaseAddDocument('locations', loc);
            }
            console.log('✅ Default locations created');
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error initializing collections:', error);
        return { success: false, error: error.message };
    }
}

console.log('✅ Firebase Implementation Module Loaded');
