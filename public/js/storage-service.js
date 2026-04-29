/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIREBASE STORAGE SERVICE MODULE
 * Complete Image Upload, Optimization, and Management
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Image upload to Firebase Storage
 * - Automatic image optimization (compression, resizing)
 * - Thumbnail generation
 * - URL retrieval and caching
 * - Progress tracking
 * - Error handling and recovery
 */

console.log('📦 Storage Service Module Loading...');

// Configuration for image optimization
const IMAGE_CONFIG = {
    maxSize: 5 * 1024 * 1024, // 5MB max file size
    maxWidth: 2048,            // Max image width
    maxHeight: 2048,           // Max image height
    thumbnailWidth: 200,       // Thumbnail size
    thumbnailHeight: 200,
    quality: 0.85,             // JPEG compression quality
    formats: ['image/jpeg', 'image/png', 'image/webp']
};

// ============================================================================
// SECTION 1: IMAGE UPLOAD & STORAGE
// ============================================================================

/**
 * UPLOAD ITEM IMAGES TO FIREBASE STORAGE
 * Complete flow: validate → compress → upload → get URL → return
 * 
 * @param {string} itemId - Item document ID (for folder organization)
 * @param {FileList|Array} files - Image files to upload
 * @param {function} onProgress - Progress callback (optional)
 * @returns {Promise<object>} - Upload result with URLs
 * 
 * EXAMPLE:
 * const result = await storageUploadItemImages('item123', fileList, (progress) => {
 *     console.log('Upload progress:', progress.percent);
 * });
 */
async function storageUploadItemImages(itemId, files, onProgress) {
    try {
        if (!firebaseStorage) {
            return { success: false, error: 'Firebase Storage not initialized' };
        }

        if (!itemId) {
            return { success: false, error: 'Item ID required' };
        }

        if (!files || files.length === 0) {
            console.warn('⚠️ No files provided');
            return { success: true, urls: [], thumbnails: [] };
        }

        console.log(`📤 Uploading ${files.length} image(s) for item ${itemId}...`);

        const filesArray = Array.from(files);
        const uploadedUrls = [];
        const uploadedThumbnails = [];
        let successCount = 0;
        let failureCount = 0;

        // Upload each file
        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            const progress = {
                current: i,
                total: filesArray.length,
                percent: Math.round((i / filesArray.length) * 100)
            };

            if (onProgress) onProgress(progress);

            try {
                // Validate file
                const validation = storageValidateImageFile(file);
                if (!validation.valid) {
                    console.warn(`⚠️ File ${file.name} validation failed: ${validation.error}`);
                    failureCount++;
                    continue;
                }

                // Compress image
                const compressed = await storageCompressImage(file);

                // Generate unique filename
                const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const storagePath = `items/${itemId}/${filename}.jpg`;

                // Upload compressed image
                const uploadResult = await storageUploadFile(storagePath, compressed);

                if (uploadResult.success) {
                    uploadedUrls.push(uploadResult.url);
                    console.log(`✅ Image ${i + 1} uploaded:`, uploadResult.url);
                    successCount++;

                    // Generate and upload thumbnail
                    try {
                        const thumbResult = await storageUploadThumbnail(itemId, filename, compressed);
                        if (thumbResult.success) {
                            uploadedThumbnails.push(thumbResult.url);
                        }
                    } catch (thumbError) {
                        console.warn('⚠️ Thumbnail generation failed, continuing with main image');
                    }
                } else {
                    console.error(`❌ Upload failed for image ${i + 1}:`, uploadResult.error);
                    failureCount++;
                }
            } catch (error) {
                console.error(`❌ Error uploading file ${i + 1}:`, error.message);
                failureCount++;
            }
        }

        const finalProgress = {
            current: filesArray.length,
            total: filesArray.length,
            percent: 100
        };
        if (onProgress) onProgress(finalProgress);

        console.log(`📊 Upload complete: ${successCount} succeeded, ${failureCount} failed`);

        return {
            success: successCount > 0,
            urls: uploadedUrls,
            thumbnails: uploadedThumbnails.length > 0 ? uploadedThumbnails : uploadedUrls,
            successCount,
            failureCount,
            message: `${successCount} image(s) uploaded successfully`
        };
    } catch (error) {
        console.error('❌ Upload error:', error.message);
        return { success: false, error: error.message, urls: [] };
    }
}

/**
 * UPLOAD USER AVATAR TO FIREBASE STORAGE
 * 
 * @param {string} userId - User UID
 * @param {File} file - Avatar image file
 * @returns {Promise<object>} - Upload result
 */
async function storageUploadUserAvatar(userId, file) {
    try {
        if (!firebaseStorage || !userId || !file) {
            return { success: false, error: 'Invalid parameters' };
        }

        // Validate
        const validation = storageValidateImageFile(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        console.log('📤 Uploading user avatar...');

        // Compress
        const compressed = await storageCompressImage(file);

        // Upload
        const storagePath = `avatars/${userId}/avatar.jpg`;
        const uploadResult = await storageUploadFile(storagePath, compressed);

        if (uploadResult.success) {
            console.log('✅ Avatar uploaded:', uploadResult.url);
        }

        return uploadResult;
    } catch (error) {
        console.error('❌ Avatar upload error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * UPLOAD SINGLE IMAGE TO FIREBASE STORAGE
 * Low-level function for direct uploads
 * 
 * @param {string} storagePath - Path in storage bucket
 * @param {Blob|File} file - File to upload
 * @returns {Promise<object>} - URL and metadata
 */
async function storageUploadFile(storagePath, file) {
    try {
        if (!firebaseStorage || !storagePath || !file) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { ref: storageRef, uploadBytes, getDownloadURL } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js"
        );

        const fileRef = storageRef(firebaseStorage, storagePath);

        // Upload with metadata
        const metadata = {
            contentType: file.type || 'image/jpeg',
            cacheControl: 'public, max-age=31536000'
        };

        const snapshot = await uploadBytes(fileRef, file, { customMetadata: metadata });
        const url = await getDownloadURL(fileRef);

        console.log(`✅ File uploaded to ${storagePath}`);

        return {
            success: true,
            url: url,
            path: snapshot.ref.fullPath,
            size: snapshot.metadata.size
        };
    } catch (error) {
        console.error(`❌ Upload failed for ${storagePath}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * DELETE IMAGE FROM FIREBASE STORAGE
 * 
 * @param {string} storagePath - Path to delete
 * @returns {Promise<object>} - Result
 */
async function storageDeleteFile(storagePath) {
    try {
        if (!firebaseStorage || !storagePath) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { ref: storageRef, deleteObject } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js"
        );

        const fileRef = storageRef(firebaseStorage, storagePath);
        await deleteObject(fileRef);

        console.log(`✅ File deleted: ${storagePath}`);
        return { success: true };
    } catch (error) {
        if (error.code === 'storage/object-not-found') {
            console.warn('⚠️ File already deleted:', storagePath);
            return { success: true }; // Consider it success if already gone
        }
        console.error(`❌ Delete failed for ${storagePath}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * GET DOWNLOAD URL FOR EXISTING FILE
 * 
 * @param {string} storagePath - Path to file
 * @returns {Promise<string>} - Download URL
 */
async function storageGetDownloadURL(storagePath) {
    try {
        if (!firebaseStorage || !storagePath) {
            return null;
        }

        const { ref: storageRef, getDownloadURL } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js"
        );

        const fileRef = storageRef(firebaseStorage, storagePath);
        const url = await getDownloadURL(fileRef);

        return url;
    } catch (error) {
        console.error('❌ Error getting download URL:', error.message);
        return null;
    }
}

// ============================================================================
// SECTION 2: IMAGE OPTIMIZATION
// ============================================================================

/**
 * VALIDATE IMAGE FILE
 * Check file type, size, and dimensions
 * 
 * @param {File} file - File to validate
 * @returns {object} - Validation result
 */
function storageValidateImageFile(file) {
    // Check if file exists
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check file type
    if (!IMAGE_CONFIG.formats.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${IMAGE_CONFIG.formats.join(', ')}`
        };
    }

    // Check file size
    if (file.size > IMAGE_CONFIG.maxSize) {
        const maxMB = IMAGE_CONFIG.maxSize / (1024 * 1024);
        return {
            valid: false,
            error: `File too large. Max: ${maxMB}MB`
        };
    }

    return { valid: true };
}

/**
 * COMPRESS AND OPTIMIZE IMAGE
 * Use HTML5 Canvas to reduce file size while maintaining quality
 * 
 * @param {File} file - Original image file
 * @returns {Promise<Blob>} - Compressed image blob
 * 
 * OPTIMIZATION STRATEGY:
 * 1. Load image into canvas
 * 2. Resize if exceeds max dimensions
 * 3. Compress using JPEG at configured quality
 * 4. Return compressed blob
 */
async function storageCompressImage(file) {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        // Create canvas
                        const canvas = document.createElement('canvas');

                        // Calculate new dimensions
                        let width = img.width;
                        let height = img.height;

                        if (width > IMAGE_CONFIG.maxWidth) {
                            height = (height * IMAGE_CONFIG.maxWidth) / width;
                            width = IMAGE_CONFIG.maxWidth;
                        }

                        if (height > IMAGE_CONFIG.maxHeight) {
                            width = (width * IMAGE_CONFIG.maxHeight) / height;
                            height = IMAGE_CONFIG.maxHeight;
                        }

                        canvas.width = width;
                        canvas.height = height;

                        // Draw and compress
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Convert to blob
                        canvas.toBlob(
                            (blob) => {
                                const originalSize = (file.size / 1024).toFixed(2);
                                const compressedSize = (blob.size / 1024).toFixed(2);
                                const ratio = ((1 - blob.size / file.size) * 100).toFixed(1);

                                console.log(`📸 Image compressed: ${originalSize}KB → ${compressedSize}KB (${ratio}% reduction)`);
                                resolve(blob);
                            },
                            'image/jpeg',
                            IMAGE_CONFIG.quality
                        );
                    } catch (error) {
                        reject(new Error(`Compression error: ${error.message}`));
                    }
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        } catch (error) {
            reject(new Error(`Compression setup error: ${error.message}`));
        }
    });
}

/**
 * GENERATE AND UPLOAD THUMBNAIL
 * Create smaller version for admin dashboard display
 * 
 * @param {string} itemId - Item ID
 * @param {string} filename - Original filename
 * @param {Blob} imageBlob - Compressed image blob
 * @returns {Promise<object>} - Thumbnail URL
 */
async function storageUploadThumbnail(itemId, filename, imageBlob) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = IMAGE_CONFIG.thumbnailWidth;
            canvas.height = IMAGE_CONFIG.thumbnailHeight;

            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate crop to fill thumbnail
                const sourceRatio = img.width / img.height;
                const targetRatio = IMAGE_CONFIG.thumbnailWidth / IMAGE_CONFIG.thumbnailHeight;

                let sx, sy, sWidth, sHeight;

                if (sourceRatio > targetRatio) {
                    sHeight = img.height;
                    sWidth = sHeight * targetRatio;
                    sx = (img.width - sWidth) / 2;
                    sy = 0;
                } else {
                    sWidth = img.width;
                    sHeight = sWidth / targetRatio;
                    sx = 0;
                    sy = (img.height - sHeight) / 2;
                }

                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, IMAGE_CONFIG.thumbnailWidth, IMAGE_CONFIG.thumbnailHeight);

                canvas.toBlob(
                    async (thumbBlob) => {
                        try {
                            const thumbPath = `items/${itemId}/thumb_${filename}.jpg`;
                            const result = await storageUploadFile(thumbPath, thumbBlob);
                            resolve(result);
                        } catch (error) {
                            console.warn('⚠️ Thumbnail upload failed:', error);
                            resolve({ success: false });
                        }
                    },
                    'image/jpeg',
                    IMAGE_CONFIG.quality
                );
            };

            img.onerror = () => {
                resolve({ success: false });
            };

            const url = URL.createObjectURL(imageBlob);
            img.src = url;
        } catch (error) {
            console.warn('⚠️ Thumbnail generation error:', error);
            resolve({ success: false });
        }
    });
}

// ============================================================================
// SECTION 3: BATCH OPERATIONS
// ============================================================================

/**
 * DELETE ALL ITEM IMAGES
 * Remove all images for an item
 * 
 * @param {string} itemId - Item ID
 * @returns {Promise<object>} - Result
 */
async function storageDeleteItemImages(itemId) {
    try {
        if (!firebaseStorage || !itemId) {
            return { success: false, error: 'Invalid parameters' };
        }

        const { ref: storageRef, listAll, deleteObject } = await import(
            "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js"
        );

        const itemFolder = storageRef(firebaseStorage, `items/${itemId}`);
        const result = await listAll(itemFolder);

        console.log(`📝 Deleting ${result.items.length} items from storage...`);

        // Delete all files in the folder
        const deletePromises = result.items.map(fileRef => deleteObject(fileRef));
        await Promise.all(deletePromises);

        console.log(`✅ All images deleted for item ${itemId}`);
        return { success: true, deletedCount: result.items.length };
    } catch (error) {
        console.error('❌ Error deleting item images:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * DELETE USER AVATAR
 * 
 * @param {string} userId - User UID
 * @returns {Promise<object>} - Result
 */
async function storageDeleteUserAvatar(userId) {
    try {
        return await storageDeleteFile(`avatars/${userId}/avatar.jpg`);
    } catch (error) {
        console.error('❌ Error deleting avatar:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// SECTION 4: HELPER FUNCTIONS
// ============================================================================

/**
 * GET IMAGE DIMENSIONS
 * Useful for preview rendering
 * 
 * @param {string|File} source - URL or File object
 * @returns {Promise<object>} - Width and height
 */
async function storageGetImageDimensions(source) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();

            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    ratio: img.width / img.height
                });
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            if (typeof source === 'string') {
                img.src = source;
            } else if (source instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(source);
            } else {
                reject(new Error('Invalid source'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * VALIDATE IMAGE DIMENSIONS
 * Check if image meets minimum requirements
 * 
 * @param {File} file - Image file
 * @param {number} minWidth - Minimum width (optional)
 * @param {number} minHeight - Minimum height (optional)
 * @returns {Promise<object>} - Validation result
 */
async function storageValidateImageDimensions(file, minWidth = 200, minHeight = 200) {
    try {
        const dims = await storageGetImageDimensions(file);

        if (dims.width < minWidth || dims.height < minHeight) {
            return {
                valid: false,
                error: `Image too small. Min: ${minWidth}x${minHeight}, Got: ${dims.width}x${dims.height}`
            };
        }

        return { valid: true, dimensions: dims };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

console.log('✅ Storage Service Module Loaded');
