// ========== NOTIFICATIONS ==========

function addNotification(message, itemId) {
    const notification = {
        id: Date.now(),
        message,
        itemId,
        read: false,
        timestamp: Date.now()
    };
    notifications.unshift(notification);
    saveData();
    updateNotifications();
}

function updateNotifications() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.textContent = unreadCount;

    const list = document.getElementById('notificationList');
    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = '<p style="padding: 15px; text-align: center; color: var(--text-muted);">No notifications</p>';
    } else {
        list.innerHTML = notifications.map(n => {
            let displayMessage = n.message;

            // Detect if this is an item posted notification
            if (n.message && n.message.includes('has been posted')) {
                const isYourMessage = n.message.includes('Your ');

                // If message says "Your" but current user is NOT the item poster
                if (isYourMessage && n.posterUserId && currentUser && n.posterUserId !== currentUser.id) {
                    // This is another user's item - show generic message
                    const itemTitle = n.message.match(/"([^"]+)"/)?.[1] || 'an item';
                    const itemType = n.message.includes('found') ? 'found' : 'lost';
                    displayMessage = `A ${itemType} item was posted: "${itemTitle}"`;
                } else if (!isYourMessage && n.posterUserId && currentUser && n.posterUserId === currentUser.id) {
                    // This is our item but message doesn't say "Your" - fix it
                    const itemTitle = n.message.match(/"([^"]+)"/)?.[1] || 'an item';
                    const itemType = n.message.includes('found') ? 'found' : 'lost';
                    displayMessage = `Your ${itemType} item "${itemTitle}" has been posted and is now visible to the community!`;
                }
            }

            return `
                <div class="notification-item ${n.read ? '' : 'unread'}" onclick="readNotification(${n.id})">
                    <p style="margin-bottom: 5px; font-weight: 500;">${displayMessage}</p>
                    <p style="font-size: 12px; color: var(--text-muted);">${formatTimeAgo(n.timestamp)}</p>
                </div>
            `;
        }).join('');
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function readNotification(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        saveData();
        updateNotifications();
    }
}
