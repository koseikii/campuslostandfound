/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STORAGE MODULE - Firebase Storage Operations
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Replaces: storage-service.js (duplicates)
 * 
 * Features:
 * - Image upload & optimization
 * - Image compression
 * - URL retrieval
 * - Thumbnail generation
 * - Progress tracking
 */

console.log('📤 Storage Module Loading...');

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_CONFIG = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp']
};

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

/**
 * Upload image to Firebase Storage
 * 
 * @param {File} file - Image file
 * @param {string} itemId - Item ID (for organization)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} - { success, url, error }
 */
async function storageUploadImage(file, itemId, onProgress) {
    try {
        if (!window.FirebaseCore?.isFirebaseStorageReady()) {
            return { success: false, error: 'Firebase Storage not initialized' };
        }

        if (!file) {
            return { success: false, error: 'No file provided' };
        }

        // Validate file
        const validation = _validateImageFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        console.log('📤 Uploading image:', file.name);

        // Compress image
        const compressed = await _compressImage(file);

        // Generate filename
        const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
        const storagePath = `items/${itemId}/${filename}`;

        // Upload
        const { ref, uploadBytesResumable, getDownloadURL } = await window.FirebaseCore.require_firebase_module('storage');
        const storage = window.FirebaseCore.getStorage();

        const fileRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(fileRef, compressed);

        // Handle progress
        return new Promise((resolve) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error('❌ Upload error:', error);
                    resolve({ success: false, error: error.message });
                },
                async () => {
                    try {
                        const url = await getDownloadURL(fileRef);
                        console.log('✅ Image uploaded:', url);
                        resolve({ success: true, url });
                    } catch (error) {
                        console.error('❌ Error getting URL:', error);
                        resolve({ success: false, error: error.message });
                    }
                }
            );
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Upload multiple images
 * 
 * @param {File[]} files - Image files
 * @param {string} itemId - Item ID
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>} - { success, urls, error }
 */
async function storageUploadImages(files, itemId, onProgress) {
    try {
        if (!files || files.length === 0) {
            return { success: true, urls: [] };
        }

        const urls = [];
        const filesArray = Array.from(files);

        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            const progress = (i / filesArray.length) * 100;

            if (onProgress) onProgress(progress);

            const result = await storageUploadImage(file, itemId);

            if (result.success) {
                urls.push(result.url);
            } else {
                console.warn('⚠️ Failed to upload file:', file.name, result.error);
            }
        }

        console.log(`✅ Uploaded ${urls.length}/${filesArray.length} images`);
        return { success: true, urls };

    } catch (error) {
        console.error('❌ Batch upload error:', error);
        return { success: false, error: error.message, urls: [] };
    }
}

// ============================================================================
// IMAGE COMPRESSION
// ============================================================================

/**
 * Compress image before upload
 * 
 * @private
 * @param {File} file - Original image file
 * @returns {Promise<Blob>} - Compressed image blob
 */
async function _compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                // Create canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > STORAGE_CONFIG.maxWidth || height > STORAGE_CONFIG.maxHeight) {
                    const ratio = Math.min(
                        STORAGE_CONFIG.maxWidth / width,
                        STORAGE_CONFIG.maxHeight / height
                    );
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        console.log(`📊 Compressed: ${(file.size / 1024).toFixed(2)}KB → ${(blob.size / 1024).toFixed(2)}KB`);
                        resolve(blob);
                    },
                    'image/jpeg',
                    STORAGE_CONFIG.quality
                );
            };

            img.src = event.target.result;
        };

        reader.readAsDataURL(file);
    });
}

// ============================================================================
// IMAGE VALIDATION
// ============================================================================

/**
 * Validate image file
 * 
 * @private
 * @param {File} file - Image file
 * @returns {object} - { valid: boolean, error: string }
 */
function _validateImageFile(file) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (!STORAGE_CONFIG.supportedFormats.includes(file.type)) {
        return { valid: false, error: 'Unsupported format. Use JPG, PNG, or WebP' };
    }

    if (file.size > STORAGE_CONFIG.maxFileSize) {
        return {
            valid: false,
            error: `File too large. Max ${(STORAGE_CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB`
        };
    }

    return { valid: true };
}

// ============================================================================
// IMAGE DELETION
// ============================================================================

/**
 * Delete image from Storage
 * 
 * @param {string} imageUrl - Image URL
 * @returns {Promise<object>} - { success, error }
 */
async function storageDeleteImage(imageUrl) {
    try {
        if (!window.FirebaseCore?.isFirebaseStorageReady()) {
            return { success: false, error: 'Firebase Storage not initialized' };
        }

        if (!imageUrl) {
            return { success: false, error: 'Image URL required' };
        }

        const { ref, deleteObject } = await window.FirebaseCore.require_firebase_module('storage');
        const storage = window.FirebaseCore.getStorage();

        // Extract path from URL
        const decodedPath = decodeURIComponent(
            imageUrl.split('/o/')[1]?.split('?')[0] || ''
        );

        if (!decodedPath) {
            return { success: false, error: 'Could not extract path from URL' };
        }

        const fileRef = ref(storage, decodedPath);
        await deleteObject(fileRef);

        console.log('✅ Image deleted');
        return { success: true };

    } catch (error) {
        console.error('❌ Error deleting image:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.StorageService = {
    uploadImage: storageUploadImage,
    uploadImages: storageUploadImages,
    deleteImage: storageDeleteImage
};

console.log('✅ Storage Module Loaded');
