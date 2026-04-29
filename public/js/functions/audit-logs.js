// ========== AUDIT LOGS SYSTEM ==========

let auditLogs = [];

/**
 * Logs an action to the audit trail
 */
function logAuditAction(action, userId, details = {}) {
    const log = {
        id: Date.now(),
        action: action,
        userId: userId,
        userName: users.find(u => u.id === userId)?.name || 'Unknown User',
        userRole: users.find(u => u.id === userId)?.role || 'unknown',
        timestamp: Date.now(),
        details: details
    };

    auditLogs.unshift(log);

    // Keep only last 1000 logs to avoid storage bloat
    if (auditLogs.length > 1000) {
        auditLogs.pop();
    }

    localStorage.setItem('auditLogs', JSON.stringify(auditLogs));
    return log;
}

/**
 * Retrieves audit logs with filtering
 */
function getAuditLogs(filters = {}) {
    let filtered = [...auditLogs];

    if (filters.action) {
        filtered = filtered.filter(log => log.action.includes(filters.action));
    }

    if (filters.userId) {
        filtered = filtered.filter(log => log.userId === filters.userId);
    }

    if (filters.userRole) {
        filtered = filtered.filter(log => log.userRole === filters.userRole);
    }

    if (filters.startDate && filters.endDate) {
        filtered = filtered.filter(log =>
            log.timestamp >= filters.startDate && log.timestamp <= filters.endDate
        );
    }

    if (filters.limit) {
        filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
}

/**
 * Displays audit logs in admin panel
 */
function displayAuditLogs() {
    const container = document.getElementById('auditLogsContainer');
    if (!container) return;

    const logs = getAuditLogs({ limit: 100 });

    if (logs.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-muted);">No audit logs available</p>';
        return;
    }

    let html = '';
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const formattedTime = date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const actionColors = {
            'LOGIN': '#10b981',
            'LOGOUT': '#f59e0b',
            'ITEM_CREATED': '#4f6ef7',
            'ITEM_UPDATED': '#7c3aed',
            'ITEM_DELETED': '#f43f5e',
            'ITEM_RESOLVED': '#06b6d4',
            'USER_CREATED': '#8b5cf6',
            'USER_UPDATED': '#ec4899',
            'ADMIN_ACTION': '#f59e0b'
        };

        const color = actionColors[log.action] || '#64748b';

        html += `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-left: 4px solid ${color}; border-radius: 6px; padding: 12px; margin-bottom: 8px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <span style="background: ${color}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">
                            ${log.action}
                        </span>
                        <span style="color: var(--text-secondary); margin-left: 8px; font-size: 12px;">
                            by <strong>${log.userName}</strong> (${log.userRole})
                        </span>
                    </div>
                    <span style="color: var(--text-muted); font-size: 11px;">${formattedTime}</span>
                </div>
                ${Object.keys(log.details).length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 8px; border-radius: 4px; margin-top: 8px; font-family: monospace; font-size: 11px; color: var(--text-secondary);">
                        ${Object.entries(log.details).map(([key, value]) =>
            `<div><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}</div>`
        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Exports audit logs as CSV
 */
function exportAuditLogs() {
    const logs = auditLogs;
    let csv = 'Timestamp,User,Role,Action,Details\n';

    logs.forEach(log => {
        const date = new Date(log.timestamp).toISOString();
        const details = JSON.stringify(log.details).replace(/"/g, '""');
        csv += `"${date}","${log.userName}","${log.userRole}","${log.action}","${details}"\n`;
    });

    downloadFile(csv, 'audit_logs.csv', 'text/csv');
    showToast('Audit logs exported successfully', 'success');
}

/**
 * Initializes audit logs from storage
 */
function initializeAuditLogs() {
    auditLogs = JSON.parse(localStorage.getItem('auditLogs')) || [];
}

// Call this on app initialization
initializeAuditLogs();
