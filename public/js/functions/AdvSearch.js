// ========== ADVANCED SEARCH SYSTEM (OPTIMIZED) ==========

// Search cache for performance
const searchCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
let lastSearchTime = 0;
let searchDebounceTimer = null;

// Pre-compute category and status sets for O(1) lookups
const categorySet = new Set(items.map(i => i.category));
const statusSet = new Set(items.map(i => i.status));

// Advanced search with multiple criteria (OPTIMIZED)
function advancedSearch(criteria) {
    // Generate cache key
    const cacheKey = JSON.stringify(criteria);
    const now = Date.now();

    // Return cached result if available and not expired
    if (searchCache.has(cacheKey)) {
        const cached = searchCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_EXPIRY) {
            return cached.results;
        }
        searchCache.delete(cacheKey);
    }

    // Early exit optimizations - filter in order of selectivity
    let results = items;

    // 1. Category filter (most selective first - narrow down quickly)
    if (criteria.category && criteria.category !== 'all') {
        results = results.filter(item => item.category === criteria.category);
    }

    // 2. Status filter
    if (criteria.status && criteria.status !== 'all') {
        results = results.filter(item => {
            if (criteria.status === 'resolved') {
                return item.resolved;
            } else {
                return item.status === criteria.status;
            }
        });
    }

    // 3. Date range filter (fast numeric comparison)
    if (criteria.startDate || criteria.endDate) {
        const startTime = criteria.startDate ? new Date(criteria.startDate).getTime() : 0;
        const endTime = criteria.endDate ? new Date(criteria.endDate).getTime() : Date.now();

        results = results.filter(item => {
            const itemTime = new Date(item.date).getTime();
            return itemTime >= startTime && itemTime <= endTime;
        });
    }

    // 4. Location filter
    if (criteria.location && criteria.location.trim()) {
        const locationLower = criteria.location.toLowerCase();
        results = results.filter(item => item.location.toLowerCase().includes(locationLower));
    }

    // 5. Search term filter (most expensive - do last)
    if (criteria.search && criteria.search.trim()) {
        const searchLower = criteria.search.toLowerCase();
        results = results.filter(item =>
            item.title.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower) ||
            item.location.toLowerCase().includes(searchLower)
        );
    }

    // 6. Matched filter
    if (criteria.matched !== undefined) {
        results = results.filter(item => item.matched === criteria.matched);
    }

    // Cache the result
    searchCache.set(cacheKey, {
        results: results,
        timestamp: now
    });

    // Clean old cache entries if map gets too large
    if (searchCache.size > 50) {
        for (const [key, value] of searchCache.entries()) {
            if (now - value.timestamp > CACHE_EXPIRY) {
                searchCache.delete(key);
            }
        }
    }

    return results;
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

// Store search results globally for pagination
let currentSearchResults = [];
let currentSearchCriteria = null;

// Perform advanced search with pagination
function performAdvancedSearch() {
    const criteria = {
        search: document.getElementById('advSearchTerm')?.value || '',
        category: document.getElementById('advSearchCategory')?.value || 'all',
        status: document.getElementById('advSearchStatus')?.value || 'all',
        location: document.getElementById('advSearchLocation')?.value || '',
        startDate: document.getElementById('advSearchStartDate')?.value || '',
        endDate: document.getElementById('advSearchEndDate')?.value || ''
    };

    // Optimized search with early-exit filters
    const results = advancedSearch(criteria);

    // Close modal
    document.querySelector('.modal')?.remove();

    // Display results
    if (results.length === 0) {
        showToast('No items found matching your criteria', 'info');
        return;
    }

    currentSearchResults = results;
    currentSearchCriteria = criteria;

    // Display with pagination (12 items per page)
    displaySearchResultsWithPagination(1);

    showToast(`Found ${results.length} items`, 'success');
}

// Display search results with pagination
function displaySearchResultsWithPagination(page = 1) {
    if (!currentSearchResults.length) return;

    const RESULTS_PER_PAGE = 12;
    const totalPages = Math.ceil(currentSearchResults.length / RESULTS_PER_PAGE);

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * RESULTS_PER_PAGE;
    const end = start + RESULTS_PER_PAGE;
    const pageResults = currentSearchResults.slice(start, end);

    const grid = document.getElementById('itemsGrid');
    if (!grid) return;

    // Use DocumentFragment for batch DOM operations (faster rendering)
    const fragment = document.createDocumentFragment();

    pageResults.forEach(item => {
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

        const div = document.createElement('div');
        div.className = 'item-card';
        div.setAttribute('data-item-id', item.id);

        div.innerHTML = `
            <img src="${getItemImage(item)}" alt="${item.title}" class="item-image" loading="lazy" onerror="this.src='../assets/lost-found/placeholder.svg'">
            <div class="item-content">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
                    <div>
                        <h3 class="item-title">${item.title}</h3>
                        <span class="item-category">${item.category}</span>
                    </div>
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
        `;

        fragment.appendChild(div);
    });

    // Clear and append all at once (batch operation)
    grid.innerHTML = '';
    grid.appendChild(fragment);

    // Create pagination controls
    let paginationHTML = '';
    if (totalPages > 1) {
        paginationHTML = createSearchPaginationControls(page, totalPages, currentSearchResults.length);
    }

    grid.parentElement.innerHTML += paginationHTML;

    document.getElementById('appPage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Create pagination controls for search results
function createSearchPaginationControls(currentPage, totalPages, totalItems) {
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    let html = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
            <button onclick="displaySearchResultsWithPagination(1)" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} title="First page">
                <i class="fas fa-chevron-left"></i> First
            </button>
            <button onclick="displaySearchResultsWithPagination(${currentPage - 1})" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Prev
            </button>
    `;

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="displaySearchResultsWithPagination(${i})" class="pagination-btn ${i === currentPage ? 'active' : ''}" style="${i === currentPage ? 'background: var(--primary); color: white;' : ''}">
                ${i}
            </button>
        `;
    }

    html += `
            <button onclick="displaySearchResultsWithPagination(${currentPage + 1})" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
            <button onclick="displaySearchResultsWithPagination(${totalPages})" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} title="Last page">
                Last <i class="fas fa-chevron-right"></i>
            </button>
            <div style="color: var(--text-secondary); font-size: 13px; margin-left: auto; font-weight: 500;">
                Page ${currentPage} of ${totalPages} (${totalItems} results)
            </div>
        </div>
    `;

    return html;
}
