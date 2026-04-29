/**
 * Item Report Handler
 * Handles lost/found item report creation with proper validation and error handling
 */

// Show item operation result
function showItemMessage(message, type = 'error', duration = 3000) {
    // Create or get message container
    let messageDiv = document.getElementById('itemMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'itemMessage';
        const container = document.querySelector('.report-form-container') || document.querySelector('main');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }
    }

    messageDiv.className = `form-message ${type}`;
    messageDiv.innerHTML = message;
    messageDiv.style.display = 'block';

    // Auto-hide after specified duration
    if (duration > 0) {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, duration);
    }

    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle item/report form submission
async function handleReportItem(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Validate required fields
    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const category_id = formData.get('category_id');
    const item_type = formData.get('item_type'); // 'lost' or 'found'
    const location_id = formData.get('location_id');
    const found_on_date = formData.get('found_on_date');
    const user_id = formData.get('user_id');

    // Check authentication
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.id) {
        showItemMessage('❌ You must be logged in to report an item', 'error');
        return;
    }

    // Validate inputs
    if (!title || title.length < 5) {
        showItemMessage('❌ Title must be at least 5 characters', 'error');
        return;
    }

    if (!description || description.length < 20) {
        showItemMessage('❌ Description must be at least 20 characters', 'error');
        return;
    }

    if (!category_id || category_id === '0') {
        showItemMessage('❌ Please select a category', 'error');
        return;
    }

    if (!item_type || !['lost', 'found'].includes(item_type)) {
        showItemMessage('❌ Please select Lost or Found', 'error');
        return;
    }

    if (!location_id || location_id === '0') {
        showItemMessage('❌ Please select a location', 'error');
        return;
    }

    if (!found_on_date) {
        showItemMessage('❌ Please select the date', 'error');
        return;
    }

    // Validate date is not in the future
    const selectedDate = new Date(found_on_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
        showItemMessage('❌ Date cannot be in the future', 'error');
        return;
    }

    try {
        // Show loading state
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reporting item...';

        // Prepare data
        const itemData = {
            title: title,
            description: description,
            detailed_description: formData.get('detailed_description') || '',
            category_id: parseInt(category_id),
            item_type: item_type,
            location_id: parseInt(location_id),
            location_description: formData.get('location_description') || '',
            found_on_date: found_on_date,
            found_on_time: formData.get('found_on_time') || null,
            user_id: currentUser.id,
            uid: currentUser.uid || currentUser.id,
            userId: currentUser.id,
            userName: currentUser.name || 'Unknown User',
            userEmail: currentUser.email || 'not provided',
            userPhone: currentUser.phone || 'not provided',
            userRole: currentUser.role || 'user',
            color: formData.get('color') || '',
            size: formData.get('size') || '',
            distinctive_features: formData.get('distinctive_features') || '',
            image_url: formData.get('image_url') || '',
            status: item_type,
            resolved: false,
            matched: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save to Firebase Firestore
        let result = await firebaseAddDocument('items', itemData);

        if (result.success) {
            // Also save to local items array for immediate UI update
            const newItem = {
                id: result.id,
                firebaseId: result.id,
                ...itemData,
                status: item_type
            };
            items.push(newItem);
            saveData();

            showItemMessage(
                `✅ Item reported successfully!<br>
                 📝 Item ID: <strong>${result.id}</strong><br>
                 <small>Your item has been saved to Firebase</small>`,
                'success',
                5000
            );

            // Reset form
            form.reset();

            // Redirect or refresh after delay
            setTimeout(() => {
                // Reload to refresh the items list
                window.location.reload();
            }, 3000);
        } else {
            showItemMessage('❌ ' + (result.error || 'Failed to report item'), 'error', 0);
            console.error('Item creation error:', result);
        }

        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;

    } catch (error) {
        showItemMessage('❌ An error occurred: ' + error.message, 'error', 0);
        console.error('Item report error:', error);
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = false;
    }
}

// Validate image before upload
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showItemMessage('❌ Image must be smaller than 5MB', 'error');
        event.target.value = '';
        return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showItemMessage('❌ Only JPEG, PNG, GIF, and WebP images are allowed', 'error');
        event.target.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function (e) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);

    showItemMessage('✅ Image selected and validated', 'success', 2000);
}

// Set minimum date to today
function initializeDatePicker() {
    const dateInput = document.getElementById('found_on_date');
    if (dateInput) {
        // Don't allow future dates
        const today = new Date().toISOString().split('T')[0];
        dateInput.max = today;
    }
}

// Initialize item form handlers
document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ Item handlers initialized');

    // Initialize date picker
    initializeDatePicker();

    // Attach form submission
    const itemForm = document.getElementById('reportItemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleReportItem);
    }

    // Attach image upload handler
    const imageInput = document.getElementById('itemImage');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }

    // Load categories if available
    if (typeof APIService !== 'undefined') {
        loadCategories();
        loadLocations();
    }
});

// Load categories into dropdown
async function loadCategories() {
    try {
        const apiService = new APIService();
        const result = await apiService.getCategories();

        if (result.success && result.data) {
            const select = document.getElementById('category_id');
            if (select) {
                result.data.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    if (cat.icon) {
                        option.textContent = `${cat.icon} ${cat.name}`;
                    }
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load locations into dropdown
async function loadLocations() {
    try {
        const apiService = new APIService();
        const result = await apiService.getLocations();

        if (result.success && result.data) {
            const select = document.getElementById('location_id');
            if (select) {
                result.data.forEach(loc => {
                    const option = document.createElement('option');
                    option.value = loc.id;
                    option.textContent = loc.name;
                    if (loc.building) {
                        option.textContent += ` (${loc.building})`;
                    }
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}
