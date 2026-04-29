// ========== ADVANCED ANALYTICS SYSTEM ==========

/**
 * Gets comprehensive analytics data
 */
function getAnalyticsData() {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Items stats
    const totalItems = items.length;
    const lostItems = items.filter(i => i.status === 'lost').length;
    const foundItems = items.filter(i => i.status === 'found').length;
    const resolvedItems = items.filter(i => i.resolved).length;
    const matchedItems = items.filter(i => i.matched).length;
    const unresolvedItems = items.filter(i => !i.resolved).length;

    // Time-based stats
    const itemsLastMonth = items.filter(i => i.createdAt >= thirtyDaysAgo).length;
    const itemsLastWeek = items.filter(i => i.createdAt >= sevenDaysAgo).length;

    // Resolution rate
    const resolutionRate = totalItems > 0 ? ((resolvedItems / totalItems) * 100).toFixed(1) : 0;
    const matchRate = unresolvedItems > 0 ? ((matchedItems / unresolvedItems) * 100).toFixed(1) : 0;

    // Category breakdown
    const categoryStats = {};
    items.forEach(item => {
        categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
    });

    // Location breakdown (top 10)
    const locationStats = {};
    items.forEach(item => {
        locationStats[item.location] = (locationStats[item.location] || 0) + 1;
    });

    const topLocations = Object.entries(locationStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // User stats
    const totalUsers = users.filter(u => u.role !== 'admin').length;
    const activeUsers = users.filter(u => {
        const userItems = items.filter(i => i.userId === u.id);
        return userItems.length > 0;
    }).length;

    // Top reporters
    const reporterStats = {};
    items.forEach(item => {
        const user = users.find(u => u.id === item.userId);
        if (user) {
            const key = user.name;
            reporterStats[key] = (reporterStats[key] || 0) + 1;
        }
    });

    const topReporters = Object.entries(reporterStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Time trend data (last 30 days, grouped by day)
    const dailyStats = {};
    for (let i = 29; i >= 0; i--) {
        const day = new Date(now - (i * 24 * 60 * 60 * 1000));
        const dayKey = day.toISOString().split('T')[0];
        dailyStats[dayKey] = { lost: 0, found: 0, resolved: 0 };
    }

    items.forEach(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        if (dailyStats[itemDate]) {
            if (item.status === 'lost') dailyStats[itemDate].lost++;
            else dailyStats[itemDate].found++;
            if (item.resolved) dailyStats[itemDate].resolved++;
        }
    });

    return {
        totalItems,
        lostItems,
        foundItems,
        resolvedItems,
        matchedItems,
        unresolvedItems,
        itemsLastMonth,
        itemsLastWeek,
        resolutionRate,
        matchRate,
        totalUsers,
        activeUsers,
        categoryStats,
        topLocations,
        topReporters,
        dailyStats
    };
}

/**
 * Displays advanced analytics dashboard
 */
function displayAdvancedAnalytics() {
    const analyticsContainer = document.getElementById('advancedAnalytics');
    if (!analyticsContainer) return;

    const data = getAnalyticsData();

    // Calculate trends
    const avgReportedPerDay = (data.itemsLastMonth / 30).toFixed(1);
    const avgResolvedPerDay = data.itemsLastMonth > 0 ? (data.resolvedItems / 30).toFixed(1) : 0;
    const userEngagement = data.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(1) : 0;

    let html = `
        <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h2 style="margin: 0 0 4px 0; font-size: 24px;">Analytics Dashboard</h2>
                    <p style="margin: 0; font-size: 13px; opacity: 0.9;">Last 30 days • ${items.length} total items tracked</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="exportAnalyticsReport()" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button onclick="refreshAnalytics()" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>
        </div>

        <!-- Key Performance Indicators -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <!-- Total Items KPI -->
            <div class="analytics-card" style="border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <div class="analytics-label">Total Items Reported</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${data.totalItems}</div>
                    </div>
                    <div style="width: 50px; height: 50px; background: var(--primary-light); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-inbox" style="font-size: 24px; color: var(--primary);"></i>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); padding-top: 8px; border-top: 1px solid var(--border);">
                    <span>This month: <strong style="color: var(--primary);">${data.itemsLastMonth}</strong></span>
                    <span>This week: <strong style="color: var(--primary);">${data.itemsLastWeek}</strong></span>
                </div>
            </div>

            <!-- Resolution Rate KPI -->
            <div class="analytics-card" style="border-left: 4px solid var(--success);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <div class="analytics-label">Resolution Rate</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--success); margin-top: 4px;">${data.resolutionRate}%</div>
                    </div>
                    <div style="width: 50px; height: 50px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-check-circle" style="font-size: 24px; color: var(--success);"></i>
                    </div>
                </div>
                <div style="width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${data.resolutionRate}%; height: 100%; background: var(--success); border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">${data.resolvedItems} resolved • ${data.unresolvedItems} pending</div>
            </div>

            <!-- Match Success KPI -->
            <div class="analytics-card" style="border-left: 4px solid var(--secondary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <div class="analytics-label">Match Success Rate</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--secondary); margin-top: 4px;">${data.matchRate}%</div>
                    </div>
                    <div style="width: 50px; height: 50px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-handshake" style="font-size: 24px; color: var(--secondary);"></i>
                    </div>
                </div>
                <div style="width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${Math.min(data.matchRate, 100)}%; height: 100%; background: var(--secondary); border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">${data.matchedItems} matches found</div>
            </div>

            <!-- User Engagement KPI -->
            <div class="analytics-card" style="border-left: 4px solid var(--warning);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <div class="analytics-label">User Engagement</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--warning); margin-top: 4px;">${userEngagement}%</div>
                    </div>
                    <div style="width: 50px; height: 50px; background: rgba(234, 179, 8, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-users" style="font-size: 24px; color: var(--warning);"></i>
                    </div>
                </div>
                <div style="width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${userEngagement}%; height: 100%; background: var(--warning); border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">${data.activeUsers} / ${data.totalUsers} users active</div>
            </div>
        </div>

        <!-- Status Breakdown & Daily Activity -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; grid-auto-flow: dense;">
            <!-- Status Distribution -->
            <div class="analytics-card">
                <div class="analytics-label" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-pie" style="color: var(--primary);"></i> Status Distribution
                </div>
                <div style="display: grid; gap: 12px;">
                    ${generateProgressBar('Lost Items', data.lostItems, data.totalItems, '#ef4444')}
                    ${generateProgressBar('Found Items', data.foundItems, data.totalItems, '#8b5cf6')}
                    ${generateProgressBar('Resolved', data.resolvedItems, data.totalItems, '#22c55e')}
                    ${generateProgressBar('Unresolved', data.unresolvedItems, data.totalItems, '#3b82f6')}
                </div>
            </div>

            <!-- Recent Activity Trend -->
            <div class="analytics-card">
                <div class="analytics-label" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-line" style="color: var(--primary);"></i> 7-Day Activity
                </div>
                <div style="display: flex; align-items: flex-end; justify-content: space-around; gap: 4px; height: 120px;">
                    ${generateActivity7DayBars(data.dailyStats)}
                </div>
            </div>
        </div>

        <!-- Category & Location Hotspots -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <!-- Top Categories -->
            <div class="analytics-card">
                <div class="analytics-label" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-tag" style="color: var(--primary);"></i> Top Categories
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${Object.entries(data.categoryStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([cat, count], i) => {
                const maxCount = Math.max(...Object.values(data.categoryStats));
                const width = (count / maxCount) * 100;
                return `
                                <div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                                        <span style="text-transform: capitalize; font-weight: 500; color: var(--text-primary);">${cat}</span>
                                        <span style="background: var(--primary-light); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: 600;">${count}</span>
                                    </div>
                                    <div style="width: 100%; height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
                                        <div style="width: ${width}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            `;
            }).join('')}
                </div>
            </div>

            <!-- Top Locations Heatmap -->
            <div class="analytics-card">
                <div class="analytics-label" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-map-marker-alt" style="color: var(--primary);"></i> Hotspot Locations
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${data.topLocations.slice(0, 6).map(([location, count]) => {
                const maxCount = data.topLocations[0][1];
                const intensity = (count / maxCount) * 100;
                const bgColor = intensity > 80 ? '#dc2626' : intensity > 60 ? '#ea580c' : intensity > 40 ? '#eab308' : '#22c55e';
                return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: ${bgColor}20; border-left: 3px solid ${bgColor}; border-radius: 6px;">
                                <span style="flex: 1; font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${location}</span>
                                <span style="background: ${bgColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${count}</span>
                            </div>
                        `;
            }).join('')}
                </div>
            </div>
        </div>

        <!-- Top Reporters & Additional Stats -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <!-- Top Reporters Leaderboard -->
            <div class="analytics-card">
                <div class="analytics-label" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-trophy" style="color: #f59e0b;"></i> Top Reporters
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${data.topReporters.slice(0, 5).map(([name, count], idx) => {
                const medals = ['1st', '2nd', '3rd', '4th', '5th'];
                const maxCount = data.topReporters[0][1];
                const width = (count / maxCount) * 100;
                return `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 16px; width: 24px; text-align: center;">${medals[idx] || idx + 1}</span>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                                        <span style="color: var(--text-primary); font-weight: 500;">${name}</span>
                                        <span style="color: var(--primary); font-weight: 600;">${count}</span>
                                    </div>
                                    <div style="width: 100%; height: 5px; background: var(--border); border-radius: 3px; overflow: hidden;">
                                        <div style="width: ${width}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #f97316); border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="analytics-card">
                <div class="analytics-label" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-tachometer-alt" style="color: var(--secondary);"></i> Quick Stats
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">AVG REPORTED/DAY</div>
                        <div style="font-size: 22px; font-weight: 700; color: var(--primary);">${avgReportedPerDay}</div>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">AVG RESOLVED/DAY</div>
                        <div style="font-size: 22px; font-weight: 700; color: var(--success);">${avgResolvedPerDay}</div>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">PENDING ITEMS</div>
                        <div style="font-size: 22px; font-weight: 700; color: var(--danger);">${data.unresolvedItems}</div>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">POSSIBLE MATCHES</div>
                        <div style="font-size: 22px; font-weight: 700; color: var(--warning);">${data.matchedItems}</div>
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; font-size: 12px; color: var(--text-secondary);">
            Last updated: ${new Date().toLocaleTimeString()} • Showing data from the last 30 days
        </div>
    `;

    analyticsContainer.innerHTML = html;
}

/**
 * Helper: Generate progress bar HTML
 */
function generateProgressBar(label, value, total, color) {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return `
        <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                <span style="color: var(--text-secondary);">${label}</span>
                <span style="color: var(--text-primary); font-weight: 600;">${value}</span>
            </div>
            <div style="width: 100%; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                <div style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>
        </div>
    `;
}

/**
 * Helper: Generate 7-day activity bars
 */
function generateActivity7DayBars(dailyStats) {
    const days = Object.entries(dailyStats).slice(-7);
    const maxValue = Math.max(...days.map(([_, d]) => d.lost + d.found)) || 1;

    return days.map(([date, data]) => {
        const total = data.lost + data.found;
        const height = (total / maxValue) * 100;
        const date_obj = new Date(date);
        const dayName = date_obj.toLocaleDateString('en-US', { weekday: 'short' });

        return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                <div style="width: 100%; height: ${Math.max(height, 5)}px; background: linear-gradient(180deg, var(--primary), var(--secondary)); border-radius: 3px; position: relative;" title="${total} items">
                    <div style="position: absolute; width: 100%; text-align: center; top: -18px; font-size: 10px; font-weight: 600; color: var(--text-secondary);">${total}</div>
                </div>
                <span style="font-size: 10px; color: var(--text-secondary);">${dayName}</span>
            </div>
        `;
    }).join('');
}

/**
 * Refresh analytics dashboard
 */
function refreshAnalytics() {
    displayAdvancedAnalytics();
    showToast('Analytics dashboard refreshed', 'success');
}

/**
 * Exports advanced analytics as detailed text report
 */
function exportAnalyticsReport() {
    const data = getAnalyticsData();
    const now = new Date();
    const userEngagement = data.totalUsers > 0 ? ((data.activeUsers / data.totalUsers) * 100).toFixed(1) : 0;
    const avgReportedPerDay = (data.itemsLastMonth / 30).toFixed(1);
    const avgResolvedPerDay = data.itemsLastMonth > 0 ? (data.resolvedItems / 30).toFixed(1) : 0;

    let report = `
╔════════════════════════════════════════════════════════════════╗
║        CAMPUS LOST & FOUND - ADVANCED ANALYTICS REPORT        ║
╚════════════════════════════════════════════════════════════════╝

REPORT GENERATED: ${now.toLocaleString()}
REPORTING PERIOD: Last 30 days (${Math.floor(30)} days)
TOTAL ITEMS TRACKED: ${data.totalItems}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 KEY PERFORMANCE INDICATORS

Total Items Reported............ ${data.totalItems}
  ├─ This Month................ ${data.itemsLastMonth}
  └─ This Week................. ${data.itemsLastWeek}

Resolution Rate................ ${data.resolutionRate}%
  ├─ Resolved Items............ ${data.resolvedItems}
  └─ Pending Items............. ${data.unresolvedItems}

Match Success Rate............. ${data.matchRate}%
  └─ Possible Matches Found.... ${data.matchedItems}

User Engagement................ ${userEngagement}%
  ├─ Active Users.............. ${data.activeUsers}
  └─ Total Users............... ${data.totalUsers}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 ACTIVITY METRICS

Items Status Breakdown:
  ├─ Lost Items................ ${data.lostItems}
  ├─ Found Items............... ${data.foundItems}
  ├─ Resolved Items............ ${data.resolvedItems}
  └─ Unresolved Items.......... ${data.unresolvedItems}

Daily Averages:
  ├─ Average Reported/Day...... ${avgReportedPerDay}
  └─ Average Resolved/Day...... ${avgResolvedPerDay}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 TOP CATEGORIES (${Object.keys(data.categoryStats).length} total)

${Object.entries(data.categoryStats)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count], i) => {
                const percent = ((count / data.totalItems) * 100).toFixed(1);
                return `  ${i + 1}. ${cat.padEnd(30)} ${count} items (${percent}%)`;
            }).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 TOP LOCATIONS (Hotspots - ${data.topLocations.length} locations)

${data.topLocations.map(([location, count], i) => {
                const percent = ((count / data.totalItems) * 100).toFixed(1);
                const bar = '█'.repeat(Math.ceil((count / data.topLocations[0][1]) * 20));
                return `  ${i + 1}. ${location.padEnd(30)} │${bar.padEnd(20)}│ ${count} (${percent}%)`;
            }).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 TOP REPORTERS (Leaderboard - Top 10)

${data.topReporters.map(([name, count], i) => {
                const medals = ['🥇', '🥈', '🥉'];
                const medal = i < 3 ? medals[i] : `${i + 1}️⃣`;
                return `  ${medal} ${name.padEnd(30)} ${count} items`;
            }).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 INSIGHTS & RECOMMENDATIONS

${generateInsights(data)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Report Generated: ${now.toLocaleString()}
For more details, visit the Analytics Dashboard
    `;

    downloadFile(report, 'analytics_report_' + now.getTime() + '.txt', 'text/plain');
    showToast('Analytics report exported successfully', 'success');
}

/**
 * Generate insights from analytics data
 */
function generateInsights(data) {
    const insights = [];

    // Resolution rate insight
    if (data.resolutionRate > 70) {
        insights.push('✓ Excellent resolution rate! Items are being resolved efficiently.');
    } else if (data.resolutionRate > 50) {
        insights.push('⚠ Moderate resolution rate. Consider improving follow-up processes.');
    } else {
        insights.push('⚠ Low resolution rate. More efforts needed to resolve pending items.');
    }

    // Match rate insight
    if (data.matchRate > 60) {
        insights.push('✓ Strong match success rate! The system is effectively connecting lost & found items.');
    } else if (data.matchRate > 30) {
        insights.push('⚠ Moderate match rate. Better categorization may help improve matches.');
    }

    // User engagement insight
    const userEngagement = data.totalUsers > 0 ? (data.activeUsers / data.totalUsers) * 100 : 0;
    if (userEngagement > 70) {
        insights.push('✓ High user engagement! The platform is actively used by the community.');
    } else if (userEngagement > 40) {
        insights.push('⚠ Moderate engagement. Consider campaigns to boost participation.');
    } else {
        insights.push('⚠ Low engagement. Outreach initiatives are recommended.');
    }

    // Activity insight
    if (data.itemsLastWeek > 0) {
        const weekPercentage = ((data.itemsLastWeek / data.itemsLastMonth) * 100).toFixed(0);
        insights.push(`• This week accounts for ${weekPercentage}% of this month's reports.`);
    }

    // Top location insight
    if (data.topLocations.length > 0) {
        const topLoc = data.topLocations[0];
        insights.push(`• ${topLoc[0]} is the hotspot with ${topLoc[1]} items (${((topLoc[1] / data.totalItems) * 100).toFixed(1)}% of all reports).`);
    }

    // Category insight
    const topCat = Object.entries(data.categoryStats).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
        insights.push(`• Most common category: ${topCat[0]} (${topCat[1]} items).`);
    }

    return insights.map(i => '  ' + i).join('\n');
}

// Add CSS for analytics cards
function addAnalyticsStyles() {
    if (document.getElementById('analyticsStyles')) return;

    const style = document.createElement('style');
    style.id = 'analyticsStyles';
    style.textContent = `
        .analytics-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .analytics-card:hover {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            transform: translateY(-4px);
        }

        .analytics-label {
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            display: block;
            margin-bottom: 4px;
        }

        .analytics-value {
            font-size: 36px;
            font-weight: 800;
            color: var(--text-primary);
            margin: 8px 0;
            line-height: 1.1;
        }

        .analytics-change {
            font-size: 12px;
            font-weight: 600;
            opacity: 0.8;
        }

        /* Enhanced responsive design */
        @media (max-width: 1024px) {
            .analytics-card {
                padding: 16px;
            }

            .analytics-value {
                font-size: 28px;
            }
        }

        @media (max-width: 768px) {
            .analytics-card {
                padding: 12px;
            }

            .analytics-value {
                font-size: 24px;
            }

            .analytics-label {
                font-size: 11px;
                letter-spacing: 0.6px;
            }
        }

        @media (max-width: 480px) {
            .analytics-card {
                padding: 12px;
                border-radius: 10px;
            }

            .analytics-value {
                font-size: 20px;
            }
        }

        /* Scroll behavior for overflow content */
        div[style*="overflow-y: auto"] {
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: var(--border) var(--bg-secondary);
        }

        /* Compatibility for non-Firefox browsers */
        div[style*="overflow-y: auto"]::-webkit-scrollbar {
            width: 6px;
        }

        div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
            background: var(--bg-secondary);
        }

        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 3px;
        }

        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover {
            background: var(--text-muted);
        }
    `;
    document.head.appendChild(style);
}

addAnalyticsStyles();
