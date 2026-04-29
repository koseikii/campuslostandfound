// ========== IMAGE HANDLING SYSTEM ==========

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Handles image file upload and converts to base64
 */
function handleImageUpload(file) {
    return new Promise((resolve, reject) => {
        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            reject('Invalid image format. Allowed: JPG, PNG, WebP, GIF');
            return;
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
            reject('Image size exceeds 5MB limit');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const base64 = e.target.result;
            resolve({
                data: base64,
                name: file.name,
                size: file.size,
                type: file.type,
                timestamp: Date.now()
            });
        };

        reader.onerror = () => {
            reject('Failed to read file');
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Handles photo preview for report/edit forms
 */
function handlePhotoPreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    handleImageUpload(file)
        .then(imageData => {
            const previewContainer = e.target.parentElement.querySelector('.photo-preview');
            previewContainer.innerHTML = `
                <div style="position: relative; display: inline-block; width: 100%;">
                    <img src="${imageData.data}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                        ${(imageData.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                </div>
            `;

            // Store the image data in a data attribute for submission
            e.target.dataset.imageData = JSON.stringify(imageData);
        })
        .catch(error => {
            showToast(error, 'error');
            e.target.value = '';
        });
}

/**
 * Opens image gallery modal for viewing multiple item photos (USED by pagination.js)
 */
function openImageGallery(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.photos || item.photos.length === 0) {
        showToast('No photos available', 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
        <div class="modal-content modal-large" style="width: 95%; max-width: 900px; max-height: 85vh; padding: 0;">
            <div class="modal-header">
                <h2><i class="fas fa-image" style="margin-right: 8px;"></i>Photo Gallery - ${item.title}</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="display: flex; height: calc(100% - 60px); overflow: hidden;">
                <!-- Main Image -->
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; background: #f0f0f0; position: relative;">
                    <img id="galleryMainImage" src="${item.photos[0].data}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 8px 12px; border-radius: 20px; font-size: 12px;">
                        <span id="galleryImageCount">1</span> / ${item.photos.length}
                    </div>
                </div>

                <!-- Thumbnails -->
                <div style="width: 120px; overflow-y: auto; background: #fff; border-left: 1px solid var(--border); padding: 10px;">
                    ${item.photos.map((photo, index) => `
                        <div onclick="document.getElementById('galleryMainImage').src='${photo.data}'; document.getElementById('galleryImageCount').textContent='${index + 1}'" 
                             style="cursor: pointer; margin-bottom: 8px; border: 2px solid transparent; border-radius: 6px; overflow: hidden; transition: 0.2s;">
                            <img src="${photo.data}" style="width: 100%; height: 100px; object-fit: cover;">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Gets the primary image for an item (first photo or fallback)
 */
/**
 * Gets the appropriate image for an item
 * Returns first photo if available, otherwise returns local placeholder
 */
function getItemImage(item) {
    if (item.photos && item.photos.length > 0 && item.photos[0].data) {
        return item.photos[0].data;
    }
    if (item.image) {
        return item.image;
    }
    // Use local placeholder SVG to avoid external URL errors
    return '../assets/lost-found/placeholder.svg';
}
