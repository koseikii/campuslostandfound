// ========== REAL-TIME NOTIFICATIONS & CALENDAR INTEGRATION ==========

/**
 * Enhanced Real-Time Notification System
 */
function sendRealtimeNotification(title, message, type = 'info', itemId = null, posterUserId = null) {
    const notification = {
        id: Date.now(),
        title: title,
        message: message,
        type: type, // 'success', 'error', 'warning', 'info', 'match'
        itemId: itemId,
        posterUserId: posterUserId,
        read: false,
        timestamp: Date.now(),
        seen: false
    };

    // Add to notifications array
    notifications.unshift(notification);
    saveData();

    // Show toast notification
    showToast(message, type === 'match' ? 'success' : type);

    // Show desktop notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'school-logo-removebg-preview.png',
            badge: 'school-logo-removebg-preview.png',
            tag: 'campus-lost-found',
            requireInteraction: type === 'match'
        });
    }

    // Play notification sound
    playNotificationSound(type);

    // Update notification UI
    updateNotifications();

    // Log to audit
    if (typeof logAuditAction === 'function') {
        logAuditAction('NOTIFICATION_SENT', currentUser?.id || 0, {
            title,
            message,
            type,
            itemId
        });
    }

    return notification;
}

/**
 * Request notification permission
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('Notifications enabled! You\'ll receive real-time updates', 'success');
            }
        });
    }
}

/**
 * Play notification sound
 */
function playNotificationSound(type = 'info') {
    try {
        const sounds = {
            'success': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==',
            'error': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBg==',
            'warning': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBg==',
            'match': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBg=='
        };

        const audio = new Audio(sounds[type] || sounds['info']);
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play prevented:', e));
    } catch (e) {
        console.log('Notification sound error:', e);
    }
}

/**
 * Enhanced Calendar Integration System
 */
class ItemCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.events = {};
        this.filterType = 'all'; // all, lost, found, resolved
        this.initializeEvents();
    }

    /**
     * Initialize events from items
     */
    initializeEvents() {
        this.events = {};

        items.forEach(item => {
            const dateKey = new Date(item.date).toISOString().split('T')[0];
            if (!this.events[dateKey]) {
                this.events[dateKey] = [];
            }

            this.events[dateKey].push({
                id: item.id,
                title: item.title,
                status: item.status,
                resolved: item.resolved,
                category: item.category,
                type: 'item'
            });
        });

        // Add resolved dates
        items.filter(i => i.resolved).forEach(item => {
            const dateKey = new Date(item.resolvedTimestamp || item.createdAt).toISOString().split('T')[0];
            if (!this.events[dateKey]) {
                this.events[dateKey] = [];
            }

            // Skip if already added as created date
            if (dateKey !== new Date(item.date).toISOString().split('T')[0]) {
                this.events[dateKey].push({
                    id: item.id,
                    title: item.title,
                    status: 'resolved',
                    resolved: true,
                    category: item.category,
                    type: 'resolution'
                });
            }
        });
    }

    /**
     * Get events for a specific date (filtered)
     */
    getEventsForDate(date) {
        const dateKey = date.toISOString().split('T')[0];
        const allEvents = this.events[dateKey] || [];

        if (this.filterType === 'all') return allEvents;
        return allEvents.filter(e => {
            if (this.filterType === 'lost') return e.status === 'lost';
            if (this.filterType === 'found') return e.status === 'found';
            if (this.filterType === 'resolved') return e.resolved;
            return true;
        });
    }

    /**
     * Get calendar statistics
     */
    getStats() {
        const allDates = Object.keys(this.events);
        const stats = {
            totalDays: allDates.length,
            totalEvents: Object.values(this.events).flat().length,
            lostCount: 0,
            foundCount: 0,
            resolvedCount: 0
        };

        Object.values(this.events).forEach(dayEvents => {
            dayEvents.forEach(e => {
                if (e.type === 'resolution') stats.resolvedCount++;
                else if (e.status === 'lost') stats.lostCount++;
                else if (e.status === 'found') stats.foundCount++;
            });
        });

        return stats;
    }

    /**
     * Get calendar HTML with improved design
     */
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const stats = this.getStats();

        let html = `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <!-- Calendar Header with Stats -->
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h3 style="margin: 0; color: var(--text-primary); font-size: 18px; font-weight: 700;">
                                <i class="fas fa-calendar"></i> Calendar
                            </h3>
                        </div>

                        <!-- Month and Year Selector -->
                        <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
                            <select id="monthSelector" onchange="itemCalendarInstance.jumpToMonthYear(parseInt(this.value), null)" style="padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-weight: 500;">
                                ${monthNames.map((m, i) => `<option value="${i}" ${i === month ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                            <select id="yearSelector" onchange="itemCalendarInstance.jumpToMonthYear(null, parseInt(this.value))" style="padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-weight: 500; width: 100px;">
                                ${Array.from({ length: 5 }, (_, i) => year - 2 + i).map(y => `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                            <button onclick="itemCalendarInstance.todayDate()" class="btn btn-sm" style="padding: 6px 12px; background: var(--success); color: white; border: none; font-weight: 600;">
                                <i class="fas fa-calendar-day"></i> Today
                            </button>
                        </div>

                        <!-- Filter Buttons -->
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            ${['all', 'lost', 'found', 'resolved'].map(filter => {
            const labels = { all: 'All', lost: 'Lost', found: 'Found', resolved: 'Resolved' };
            const icons = { all: 'fa-list', lost: 'fa-exclamation-circle', found: 'fa-hand-holding', resolved: 'fa-check-circle' };
            const colors = { all: 'var(--primary)', lost: 'var(--danger)', found: 'var(--secondary)', resolved: 'var(--success)' };
            const isActive = this.filterType === filter;
            return `
                                    <button onclick="itemCalendarInstance.setFilter('${filter}')" 
                            style="padding: 6px 12px; border: 1.5px solid ${isActive ? colors[filter] : 'var(--border)'}; background: ${isActive ? colors[filter] + '20' : 'transparent'}; color: ${isActive ? colors[filter] : 'var(--text-secondary)'}; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;">
                                        <i class="fas ${icons[filter]}" style="margin-right: 4px;"></i> ${labels[filter]}
                                    </button>
                                `;
        }).join('')}
                        </div>
                    </div>

                    <!-- Statistics Card -->
                    <div style="background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; padding: 16px; border-radius: 10px; min-width: 200px; text-align: center;">
                        <div style="font-size: 11px; opacity: 0.9; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Calendar Summary</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                            <div>
                                <div style="font-size: 12px; opacity: 0.8;">Total Days</div>
                                <div style="font-size: 20px; font-weight: 700;">${stats.totalDays}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; opacity: 0.8;">Lost</div>
                                <div style="font-size: 20px; font-weight: 700;">${stats.lostCount}</div>
                            </div>
                            <div>
                                <div style="font-size: 12px; opacity: 0.8;">Found</div>
                                <div style="font-size: 20px; font-weight: 700;">${stats.foundCount}</div>
                            </div>
                        </div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                            <div style="font-size: 12px; opacity: 0.8;">Resolved</div>
                            <div style="font-size: 20px; font-weight: 700;">${stats.resolvedCount}</div>
                        </div>
                    </div>
                </div>

                <!-- Calendar Grid -->
                <div style="background: var(--bg-secondary); padding: 12px; border-radius: 10px; margin-bottom: 16px;">
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
                        <!-- Day headers -->
                        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `
                            <div style="text-align: center; font-weight: 700; color: var(--primary); font-size: 11px; padding: 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${day}
                            </div>
                        `).join('')}

                        <!-- Empty cells -->
                        ${Array(startingDayOfWeek).fill(null).map(() => `
                            <div></div>
                        `).join('')}

                        <!-- Day cells -->
                        ${Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const events = this.getEventsForDate(date);
            const isToday = this.isToday(date);
            const isSelected = this.isSameDay(date, this.selectedDate);

            let bgColor = 'transparent';
            let borderColor = 'var(--border)';
            let textColor = 'var(--text-primary)';

            if (isToday) {
                bgColor = 'var(--primary)';
                borderColor = 'var(--primary)';
                textColor = 'white';
            } else if (events.length > 0) {
                bgColor = 'var(--card-bg)';
                borderColor = 'var(--border)';
            }

            return `
                                <div onclick="itemCalendarInstance.selectDate(new Date(${year}, ${month}, ${day}))"
                                     style="
                                         padding: 8px;
                                         background: ${bgColor};
                                         border: 2px solid ${borderColor};
                                         border-radius: 8px;
                                         cursor: pointer;
                                         transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                                         min-height: 60px;
                                         display: flex;
                                         flex-direction: column;
                                         align-items: center;
                                         justify-content: space-between;
                                         font-size: 13px;
                                         font-weight: ${isToday ? '700' : '500'};
                                         color: ${textColor};
                                     "
                                     onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)';"
                                     onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                                    <span>${day}</span>
                                    ${events.length > 0 ? `
                                        <div style="width: 100%; display: flex; justify-content: center; gap: 2px; margin-top: 4px;">
                                            ${events.slice(0, 2).map(e => {
                const color = e.type === 'resolution' ? 'var(--success)' : (e.status === 'lost' ? 'var(--danger)' : 'var(--secondary)');
                return `<div style="width: 5px; height: 5px; background: ${color}; border-radius: 50%;"></div>`;
            }).join('')}
                                            ${events.length > 2 ? `<span style="font-size: 8px; opacity: 0.6;">+${events.length - 2}</span>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>

                <!-- Events for selected date -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 14px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-calendar-check" style="color: var(--primary);"></i>
                            ${this.selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </h4>
                        
                        ${this.getEventsForDate(this.selectedDate).length > 0 ? `
                            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                                ${this.getEventsForDate(this.selectedDate).map((event, i) => {
            const color = event.type === 'resolution' ? 'var(--success)' : (event.status === 'lost' ? 'var(--danger)' : 'var(--secondary)');
            const icon = event.type === 'resolution' ? 'fa-check-circle' : (event.status === 'lost' ? 'fa-exclamation-circle' : 'fa-hand-holding');
            return `
                                        <div style="padding: 10px 12px; background: var(--bg-secondary); border-left: 3px solid ${color}; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;" 
                                             onclick="itemCalendarInstance.viewEvent(${event.id})"
                                             onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.transform='translateX(2px)';"
                                             onmouseout="this.style.boxShadow='none'; this.style.transform='translateX(0)';">
                                            <div style="font-weight: 600; color: var(--text-primary); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                                                <i class="fas ${icon}" style="color: ${color}; font-size: 13px;"></i>
                                                ${event.title.substring(0, 40)}
                                            </div>
                                            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                                                <span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 3px; display: inline-block; text-transform: capitalize;">
                                                    ${event.category}
                                                </span>
                                            </div>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
                                <i class="fas fa-inbox" style="font-size: 24px; opacity: 0.3; margin-bottom: 8px; display: block;"></i>
                                <p style="margin: 0; font-size: 12px;">No events on this date</p>
                            </div>
                        `}
                    </div>

                    <!-- Legend and Quick Navigation -->
                    <div style="border: 1px solid var(--border); border-radius: 10px; padding: 16px; background: var(--bg-secondary);">
                        <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Legend</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 12px; height: 12px; background: var(--danger); border-radius: 50%;"></div>
                                <span style="font-size: 12px; color: var(--text-secondary);">Lost Items</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 12px; height: 12px; background: var(--secondary); border-radius: 50%;"></div>
                                <span style="font-size: 12px; color: var(--text-secondary);">Found Items</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 12px; height: 12px; background: var(--success); border-radius: 50%;"></div>
                                <span style="font-size: 12px; color: var(--text-secondary);">Resolved Items</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Helper methods
     */
    isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.displayCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.displayCalendar();
    }

    jumpToMonth(monthsToJump) {
        this.currentDate.setMonth(this.currentDate.getMonth() + monthsToJump);
        this.displayCalendar();
    }

    jumpToMonthYear(newMonth, newYear) {
        if (newMonth !== null) {
            this.currentDate.setMonth(newMonth);
        }
        if (newYear !== null) {
            this.currentDate.setFullYear(newYear);
        }
        this.displayCalendar();
    }

    todayDate() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.displayCalendar();
    }

    selectDate(date) {
        this.selectedDate = date;
        this.displayCalendar();
    }

    setFilter(type) {
        this.filterType = type;
        this.displayCalendar();
    }

    refresh() {
        this.initializeEvents();
        this.displayCalendar();
        showToast('Calendar refreshed', 'success');
    }

    viewEvent(itemId) {
        const item = items.find(i => i.id === itemId);
        if (item) {
            // Switch to the appropriate tab based on item status
            const tab = item.status === 'resolved' || item.resolved ? 'resolved' : item.status;

            // Switch tab using the global switchItemTab function
            if (typeof switchItemTab === 'function') {
                currentTab = tab;
                currentPage = 1;

                // Hide calendar, show items grid
                document.getElementById('itemsGrid').style.display = 'grid';
                document.getElementById('itemCalendarContainer').style.display = 'none';

                // Render items
                if (typeof renderItemsWithPagination === 'function') {
                    goToPage(1);
                } else if (typeof renderItems === 'function') {
                    renderItems();
                }

                // Scroll to the item after a short delay to allow DOM to render
                setTimeout(() => {
                    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
                    if (itemElement) {
                        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // Add highlight effect
                        itemElement.style.transition = 'all 0.3s ease';
                        itemElement.style.boxShadow = '0 0 0 3px var(--primary)';
                        showToast(`Showing: ${item.title}`, 'success');

                        // Remove highlight after 2 seconds
                        setTimeout(() => {
                            itemElement.style.boxShadow = '';
                        }, 2000);
                    } else {
                        showToast(`Item: ${item.title}`, 'info');
                    }
                }, 100);
            }
        }
    }

    goToDate(dateString) {
        // Validate and parse the date
        const date = new Date(dateString + 'T00:00:00');
        if (isNaN(date.getTime())) {
            showToast('Invalid date', 'error');
            return;
        }

        this.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.selectedDate = date;
        this.displayCalendar();
        showToast(`Navigated to ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, 'info');
    }

    displayCalendar() {
        const container = document.getElementById('itemCalendarContainer');
        if (container) {
            container.innerHTML = this.render();
        }
    }
}

// Global calendar instance
let itemCalendarInstance = null;

/**
 * Initialize calendar
 */
function initializeCalendar() {
    if (!document.getElementById('itemCalendarContainer')) {
        console.warn('Calendar container not found');
        return;
    }

    itemCalendarInstance = new ItemCalendar();
    addCalendarNotificationStyles();
    itemCalendarInstance.displayCalendar();
}

/**
 * Add calendar-specific styles (improved)
 */
function addCalendarNotificationStyles() {
    if (document.getElementById('calendarNotificationStyles')) return;

    const style = document.createElement('style');
    style.id = 'calendarNotificationStyles';
    style.textContent = `
        /* Calendar Container Styles */
        #itemCalendarContainer {
            font-family: var(--font-family);
            animation: fadeIn 0.3s ease;
        }

        /* Enhanced Button Styles for Calendar */
        #itemCalendarContainer .btn {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #itemCalendarContainer .btn:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        #itemCalendarContainer .btn.btn-sm {
            padding: 6px 8px;
            font-size: 12px;
        }

        /* Date Picker Input */
        #calendarDatePicker {
            transition: all 0.2s ease;
        }

        #calendarDatePicker:hover {
            border-color: var(--primary);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        #calendarDatePicker:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary)20;
        }

        /* Notification Toast Styles */
        .notification-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 16px 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            z-index: 9999;
            max-width: 400px;
            animation: slideUpRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            font-weight: 500;
        }

        .notification-toast.success {
            border-left: 4px solid var(--success);
            background: var(--success)08;
        }

        .notification-toast.error {
            border-left: 4px solid var(--danger);
            background: var(--danger)08;
        }

        .notification-toast.warning {
            border-left: 4px solid var(--warning);
            background: var(--warning)08;
        }

        .notification-toast.info {
            border-left: 4px solid var(--primary);
            background: var(--primary)08;
        }

        .notification-toast.match {
            border-left: 4px solid var(--secondary);
            background: var(--secondary)08;
        }

        .notification-toast .close-btn {
            cursor: pointer;
            color: var(--text-secondary);
            font-size: 16px;
            margin-left: auto;
            padding: 0;
            border: none;
            background: none;
            transition: color 0.2s ease;
            flex-shrink: 0;
        }

        .notification-toast .close-btn:hover {
            color: var(--text-primary);
        }

        /* Animations */
        @keyframes slideUpRight {
            from {
                transform: translateX(400px) translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateX(0) translateY(0);
                opacity: 1;
            }
        }

        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translateX(400px) translateY(20px);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        /* Mobile Responsive Calendar */
        @media (max-width: 768px) {
            .notification-toast {
                bottom: 10px;
                right: 10px;
                left: 10px;
                max-width: none;
                font-size: 12px;
            }

            #itemCalendarContainer {
                padding: 10px 0 !important;
            }

            #itemCalendarContainer > div {
                padding: 12px !important;
            }
        }
    `;
    document.head.appendChild(style);
}
