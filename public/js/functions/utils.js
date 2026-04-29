// ========== UTILITY FUNCTIONS ==========

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Normalize item object to ensure consistent field names
 * Maps Firebase field names to standard field names
 * @param {object} item - Item object from database
 * @returns {object} - Normalized item with standard field names
 */
function normalizeItem(item) {
    if (!item) return item;

    return {
        ...item,
        // Ensure location field exists
        location: item.location || item.location_description || 'Unknown',
        // Ensure date field exists
        date: item.date || item.found_on_date || new Date().toISOString().split('T')[0],
        // Ensure category is string
        category: item.category || item.category_id || 'Other'
    };
}

/**
 * Normalize multiple items
 */
function normalizeItems(itemsArray) {
    return itemsArray.map(normalizeItem);
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;

    // Add icon based on type
    let icon = '';
    if (type === 'error') icon = '';
    if (type === 'info') icon = '';
    if (type === 'success') icon = '';

    toast.innerHTML = `<span style="font-weight: 700; margin-right: 8px;">${icon}</span> ${message}`;
    toast.className = `toast active ${type}`;

    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Password Strength Validation
function validatePasswordStrength(password) {
    const feedback = {
        score: 0,
        level: 'Weak',
        message: []
    };

    // Length check
    if (password.length >= 8) feedback.score += 1;
    else feedback.message.push('At least 8 characters');

    if (password.length >= 12) feedback.score += 1;

    // Uppercase check
    if (/[A-Z]/.test(password)) feedback.score += 1;
    else feedback.message.push('At least one uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) feedback.score += 1;
    else feedback.message.push('At least one lowercase letter');

    // Number check
    if (/\d/.test(password)) feedback.score += 1;
    else feedback.message.push('At least one number');

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) feedback.score += 1;
    else feedback.message.push('At least one special character');

    // Determine level
    if (feedback.score <= 2) feedback.level = 'Weak';
    else if (feedback.score <= 4) feedback.level = 'Fair';
    else if (feedback.score <= 5) feedback.level = 'Good';
    else feedback.level = 'Strong';

    return feedback;
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown')?.classList.remove('active');
        const adminDropdown = document.getElementById('adminUserDropdown');
        if (adminDropdown) {
            adminDropdown.classList.remove('active');
        }
    }
    if (!e.target.closest('.notifications')) {
        document.getElementById('notificationDropdown')?.classList.remove('active');
    }
});

// Download file helper
function downloadFile(content, filename, type) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:' + type + ';charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`${filename} exported successfully!`, 'success');
}
