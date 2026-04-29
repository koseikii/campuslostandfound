// ========== WATCHLIST & ADVANCED SEARCH SYSTEM ==========

// Initialize watchlist for a user
function initializeWatchlist() {
    if (!currentUser) return;

    if (!currentUser.watchlist) {
        currentUser.watchlist = [];
    }
}

// Add item to watchlist
function addToWatchlist(itemId) {
    if (!currentUser) {
        showToast('Please log in first', 'error');
        return;
    }

    if (!currentUser.watchlist) {
        currentUser.watchlist = [];
    }

    const item = items.find(i => i.id === itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }

    if (currentUser.watchlist.includes(itemId)) {
        showToast('Already in watchlist', 'warning');
        return;
    }

    currentUser.watchlist.push(itemId);
    saveData();
    showToast(`Added "${item.title}" to watchlist`, 'success');
    updateWatchlistUI();
}

// Remove item from watchlist
function removeFromWatchlist(itemId) {
    if (!currentUser) return;

    if (!currentUser.watchlist) {
        currentUser.watchlist = [];
    }

    currentUser.watchlist = currentUser.watchlist.filter(id => id !== itemId);
    saveData();
    showToast('Removed from watchlist', 'success');
    updateWatchlistUI();
}

// Check if item is in watchlist
function isInWatchlist(itemId) {
    if (!currentUser || !currentUser.watchlist) return false;
    return currentUser.watchlist.includes(itemId);
}

// Get watchlist items
function getWatchlistItems() {
    if (!currentUser || !currentUser.watchlist) return [];
    return items.filter(item => currentUser.watchlist && currentUser.watchlist.includes(item.id));
}

// Advanced search with multiple criteria
function advancedSearch(criteria) {
    let results = items.filter(item => {
        // Search term filter
        if (criteria.search) {
            const searchLower = criteria.search.toLowerCase();
            const matchesSearch = item.title.toLowerCase().includes(searchLower) ||
                item.description.toLowerCase().includes(searchLower) ||
                item.location.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        // Category filter
        if (criteria.category && criteria.category !== 'all') {
            if (item.category !== criteria.category) return false;
        }

        // Status filter
        if (criteria.status && criteria.status !== 'all') {
            if (criteria.status === 'resolved') {
                if (!item.resolved) return false;
            } else {
                if (item.status !== criteria.status) return false;
            }
        }

        // Location filter
        if (criteria.location && criteria.location.trim()) {
            const locationLower = criteria.location.toLowerCase();
            if (!item.location.toLowerCase().includes(locationLower)) return false;
        }

        // Date range filter
        if (criteria.startDate || criteria.endDate) {
            const itemDate = new Date(item.date).getTime();

            if (criteria.startDate) {
                const startDate = new Date(criteria.startDate).getTime();
                if (itemDate < startDate) return false;
            }

            if (criteria.endDate) {
                const endDate = new Date(criteria.endDate).getTime();
                if (itemDate > endDate) return false;
            }
        }

        // Matched filter
        if (criteria.matched !== undefined) {
            if (item.matched !== criteria.matched) return false;
        }

        return true;
    });

    return results;
}

// Find similar items for matching
function findSimilarItems(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return [];

    return items.filter(otherItem => {
        // Don't compare with itself
        if (otherItem.id === item.id) return false;

        // Opposite status (lost vs found)
        if (item.status === otherItem.status) return false;

        // Skip if either is resolved
        if (item.resolved || otherItem.resolved) return false;

        // Same category
        if (item.category !== otherItem.category) return false;

        // Similar location (within 2 miles conceptually)
        const locationSimilarity = calculateLocationSimilarity(item.location, otherItem.location);
        if (locationSimilarity < 0.4) return false;

        // Similar title (at least 50% match)
        const titleSimilarity = calculateStringSimilarity(item.title, otherItem.title);
        if (titleSimilarity < 0.5) return false;

        // Date proximity (within 30 days)
        const itemDate = new Date(item.date).getTime();
        const otherDate = new Date(otherItem.date).getTime();
        const dayDifference = Math.abs(itemDate - otherDate) / (1000 * 60 * 60 * 24);
        if (dayDifference > 30) return false;

        return true;
    });
}

// Calculate location similarity (0-1)
function calculateLocationSimilarity(loc1, loc2) {
    if (!loc1 || !loc2) return 0;

    const l1 = loc1.toLowerCase().split(/[,\s]+/);
    const l2 = loc2.toLowerCase().split(/[,\s]+/);

    let matches = 0;
    for (let word1 of l1) {
        for (let word2 of l2) {
            if (word1.length > 3 && word2.length > 3 && word1 === word2) {
                matches++;
            }
        }
    }

    return matches / Math.max(l1.length, l2.length);
}

// Calculate string similarity using Levenshtein distance
function calculateStringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Get edit distance for string comparison
function getEditDistance(s1, s2) {
    const costs = [];

    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }

    return costs[s2.length];
}

// Check watchlist for similar items and notify
function checkWatchlistForMatches() {
    if (!currentUser || !currentUser.watchlist) return;

    currentUser.watchlist.forEach(watchedItemId => {
        const watchedItem = items.find(i => i.id === watchedItemId);
        if (!watchedItem) return;

        const similarItems = findSimilarItems(watchedItemId);

        similarItems.forEach(similarItem => {
            const notificationKey = `match-${watchedItemId}-${similarItem.id}`;

            // Check if we already notified about this match
            if (!currentUser.notifiedMatches) {
                currentUser.notifiedMatches = [];
            }

            if (!currentUser.notifiedMatches.includes(notificationKey)) {
                // Send notification
                if (typeof sendRealtimeNotification === 'function') {
                    sendRealtimeNotification(
                        'Watchlist Match Found',
                        `Found a potential match for "${watchedItem.title}" - "${similarItem.title}"`,
                        'match',
                        similarItem.id
                    );
                }

                currentUser.notifiedMatches.push(notificationKey);
                saveData();
            }
        });
    });
}

// Update watchlist UI
function updateWatchlistUI() {
    const watchlistItems = getWatchlistItems();
    const watchlistBtn = document.querySelector('[data-view="watchlist"]');

    if (watchlistBtn) {
        const count = watchlistItems.length;
        if (count > 0) {
            watchlistBtn.innerHTML = `<i class="fas fa-bookmark"></i> Watchlist (${count})`;
        } else {
            watchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i> Watchlist';
        }
    }

    // Update watchlist badge on item cards
    document.querySelectorAll('.item-card').forEach(card => {
        const itemId = parseInt(card.getAttribute('data-item-id'));
        const watchBtn = card.querySelector('.watch-btn');

        if (watchBtn) {
            if (isInWatchlist(itemId)) {
                watchBtn.classList.add('active');
                watchBtn.title = 'Remove from watchlist';
            } else {
                watchBtn.classList.remove('active');
                watchBtn.title = 'Add to watchlist';
            }
        }
    });
}

// Render advanced search panel
function showAdvancedSearch() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = 'display: flex; align-items: center; justify-content: center; z-index: 1000;';

    modal.innerHTML = `
        <div style="background: var(--card-bg); border-radius: 14px; padding: 28px; max-width: 520px; width: 95%; max-height: 80vh; overflow-y: auto; box-shadow: 0 15px 50px rgba(0,0,0,0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
                <h3 style="margin: 0; color: var(--text-primary); font-size: 20px; font-weight: 700;">Advanced Search</h3>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted); padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">Search Term</label>
                    <input type="text" id="advSearchTerm" placeholder="Item name, description..." style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; box-sizing: border-box;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">Category</label>
                        <select id="advSearchCategory" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; box-sizing: border-box; cursor: pointer;">
                            <option value="all">All Categories</option>
                            <option value="electronics">Electronics</option>
                            <option value="clothing">Clothing</option>
                            <option value="accessories">Accessories</option>
                            <option value="documents">Documents</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">Status</label>
                        <select id="advSearchStatus" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; box-sizing: border-box; cursor: pointer;">
                            <option value="all">All Status</option>
                            <option value="lost">Lost</option>
                            <option value="found">Found</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">Location</label>
                    <input type="text" id="advSearchLocation" placeholder="Search by location..." style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; box-sizing: border-box;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">From Date</label>
                        <input type="date" id="advSearchStartDate" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; box-sizing: border-box;">
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 14px;">To Date</label>
                        <input type="date" id="advSearchEndDate" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 14px; box-sizing: border-box;">
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button onclick="performAdvancedSearch()" style="flex: 1.2; padding: 12px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s ease;" onhover="this.style.opacity=0.9">Search</button>
                    <button onclick="this.closest('.modal').remove()" style="flex: 0.8; padding: 12px 16px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s ease;">Cancel</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Perform advanced search
function performAdvancedSearch() {
    const criteria = {
        search: document.getElementById('advSearchTerm')?.value || '',
        category: document.getElementById('advSearchCategory')?.value || 'all',
        status: document.getElementById('advSearchStatus')?.value || 'all',
        location: document.getElementById('advSearchLocation')?.value || '',
        startDate: document.getElementById('advSearchStartDate')?.value || '',
        endDate: document.getElementById('advSearchEndDate')?.value || ''
    };

    const results = advancedSearch(criteria);

    // Close modal
    document.querySelector('.modal')?.remove();

    // Display results
    if (results.length === 0) {
        showToast('No items found matching your criteria', 'info');
        return;
    }

    const grid = document.getElementById('itemsGrid');
    if (grid) {
        grid.innerHTML = results.map(item => {
            // Try to find user by ID, fall back to item's userName
            let user = users.find(u => u.id === item.userId);

            if (!user && item.userName) {
                user = {
                    name: item.userName,
                    role: item.userRole || 'user',
                    id: item.userId
                };
            } else if (!user) {
                user = {
                    name: 'Unknown',
                    role: 'user',
                    id: item.userId
                };
            }

            const inWatchlist = isInWatchlist(item.id);

            return `
                <div class="item-card" data-item-id="${item.id}">
                    <img src="${getItemImage(item)}" alt="${item.title}" class="item-image" onerror="this.src='../assets/lost-found/placeholder.svg'">
                    <div class="item-content">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                            <div>
                                <h3 class="item-title">${item.title}</h3>
                                <span class="item-category">${item.category}</span>
                            </div>
                            <button class="watch-btn ${inWatchlist ? 'active' : ''}" onclick="toggleWatchlist(${item.id})" style="background: none; border: none; font-size: 20px; cursor: pointer; color: ${inWatchlist ? 'var(--warning)' : 'var(--text-muted)'}; transition: all 0.2s ease;" title="${inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}">
                                ${inWatchlist ? '★' : '☆'}
                            </button>
                        </div>
                        
                        <span class="badge badge-${item.status}">${item.status}</span>
                        <p class="item-description">${item.description}</p>
                        
                        <div class="item-meta">
                            <div><i class="fas fa-map-marker-alt"></i> <span>${item.location}</span></div>
                            <div><i class="fas fa-calendar"></i> <span>${formatDate(item.date)}</span></div>
                        </div>
                        
                        <div class="item-footer">
                            <div class="item-user">
                                <div class="avatar">${user.name[0].toUpperCase()}</div>
                                <div>
                                    <div style="font-weight: 500;">${user.name}</div>
                                    <div style="font-size: 11px; color: var(--text-muted);">${user.role}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('appPage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(`Found ${results.length} items`, 'success');
}

// Toggle watchlist
function toggleWatchlist(itemId) {
    if (isInWatchlist(itemId)) {
        removeFromWatchlist(itemId);
    } else {
        addToWatchlist(itemId);
    }

    // Immediately update the button UI
    const card = document.querySelector(`[data-item-id="${itemId}"]`);
    if (card) {
        const watchBtn = card.querySelector('.watch-btn');
        if (watchBtn) {
            const inWatchlist = isInWatchlist(itemId);
            watchBtn.textContent = inWatchlist ? '★' : '☆';
            watchBtn.style.color = inWatchlist ? 'var(--warning)' : 'var(--text-muted)';
            watchBtn.title = inWatchlist ? 'Remove from watchlist' : 'Add to watchlist';
        }
    }
}

// Show watchlist modal
function showWatchlist() {
    const watchlistItems = getWatchlistItems();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cssText = 'display: flex; align-items: center; justify-content: center; z-index: 1000;';

    let content = `
        <div style="background: var(--card-bg); border-radius: 14px; padding: 28px; max-width: 650px; width: 95%; max-height: 75vh; overflow-y: auto; box-shadow: 0 15px 50px rgba(0,0,0,0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
                <h3 style="margin: 0; color: var(--text-primary); font-size: 20px; font-weight: 700;">My Watchlist (${watchlistItems.length})</h3>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted); padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
    `;

    if (watchlistItems.length === 0) {
        content += `
            <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.6;">☆</div>
                <p style="font-size: 16px; font-weight: 500; margin: 0 0 8px 0;">Your watchlist is empty</p>
                <p style="font-size: 13px; margin: 0;">Add items to track them and get notified of matches</p>
            </div>
        `;
    } else {
        content += `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                ${watchlistItems.map(item => {
            // Try to find user by ID, fall back to item's userName
            let user = users.find(u => u.id === item.userId);

            if (!user && item.userName) {
                user = {
                    name: item.userName,
                    role: item.userRole || 'user',
                    id: item.userId
                };
            } else if (!user) {
                user = {
                    name: 'Unknown',
                    role: 'user',
                    id: item.userId
                };
            }

            return `
                        <div style="border: 1px solid var(--border); border-radius: 10px; padding: 14px; background: var(--bg-secondary); display: flex; gap: 14px; align-items: center; transition: all 0.2s ease; hover: box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <img src="${item.image}" alt="${item.title}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px; word-break: break-word;">${item.title}</div>
                                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;"><i class="fas fa-map-marker-alt" style="font-size: 11px;"></i> ${item.location}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">By ${user?.name || 'Unknown'} • ${formatDate(item.date)}</div>
                            </div>
                            <button onclick="removeFromWatchlist(${item.id})" style="background: var(--danger); color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap; transition: all 0.2s ease; flex-shrink: 0;">Remove</button>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }

    content += `</div>`;

    modal.innerHTML = content;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof currentUser !== 'undefined' && currentUser) {
        initializeWatchlist();
        updateWatchlistUI();
        checkWatchlistForMatches();
    }
});
