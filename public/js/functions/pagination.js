// ========== PAGINATION SYSTEM ==========

const ITEMS_PER_PAGE = 12;
const ITEMS_PER_PAGE_TABLE = 10;

let currentPage = 1;
let totalPages = 1;
let currentPageData = [];

/**
 * Paginates an array of items
 */
function paginate(items, page, itemsPerPage) {
    const total = items.length;
    totalPages = Math.ceil(total / itemsPerPage);

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    currentPage = page;

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    return {
        data: items.slice(start, end),
        currentPage: page,
        totalPages: totalPages,
        total: total,
        itemsPerPage: itemsPerPage,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
}

/**
 * Creates pagination controls HTML
 */
function createPaginationControls(pagination, onPageChange) {
    if (pagination.totalPages <= 1) return '';

    const maxButtons = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    let html = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
            <button onclick="${onPageChange}(1)" class="pagination-btn" ${pagination.currentPage === 1 ? 'disabled' : ''} title="First page">
                <i class="fas fa-chevron-left"></i> First
            </button>
            <button onclick="${onPageChange}(${pagination.currentPage - 1})" class="pagination-btn" ${!pagination.hasPrevPage ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Prev
            </button>
    `;

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="${onPageChange}(${i})" class="pagination-btn ${i === pagination.currentPage ? 'active' : ''}" style="${i === pagination.currentPage ? 'background: var(--primary); color: white;' : ''}">
                ${i}
            </button>
        `;
    }

    html += `
            <button onclick="${onPageChange}(${pagination.currentPage + 1})" class="pagination-btn" ${!pagination.hasNextPage ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
            <button onclick="${onPageChange}(${pagination.totalPages})" class="pagination-btn" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} title="Last page">
                Last <i class="fas fa-chevron-right"></i>
            </button>
            <div style="color: var(--text-secondary); font-size: 13px; margin-left: auto;">
                Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.total} items)
            </div>
        </div>
    `;

    return html;
}

/**
 * Adds CSS for pagination buttons
 */
function addPaginationStyles() {
    if (document.getElementById('paginationStyles')) return;

    const style = document.createElement('style');
    style.id = 'paginationStyles';
    style.textContent = `
        .pagination-btn {
            background: var(--card-bg);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 36px;
        }

        .pagination-btn:hover:not(:disabled) {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .pagination-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        @media (max-width: 768px) {
            .pagination-btn {
                padding: 6px 10px;
                font-size: 12px;
                min-width: 32px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Renders items with pagination
 */
function renderItemsWithPagination(allItems, page = 1) {
    const pagination = paginate(allItems, page, ITEMS_PER_PAGE);
    currentPageData = pagination.data;
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    // Render items normally
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;

    if (pagination.data.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">No items found.</p>';
        grid.parentElement.innerHTML += createPaginationControls(pagination, 'goToPage');
        return;
    }

    const user = users;
    grid.innerHTML = pagination.data.map(item => {
        // Try to find user by ID, fall back to item's userName
        let itemUser = user.find(u => u.id === item.userId);

        if (!itemUser && item.userName) {
            itemUser = {
                name: item.userName,
                role: item.userRole || 'user',
                id: item.userId
            };
        } else if (!itemUser) {
            itemUser = {
                name: 'Unknown',
                role: 'user',
                id: item.userId
            };
        }

        const isOwner = currentUser && currentUser.id === item.userId;

        return `
            <div class="item-card" data-item-id="${item.id}">
                <div style="position: relative; overflow: hidden; border-radius: 12px 12px 0 0;">
                    <img src="${getItemImage(item)}" alt="${item.title}" class="item-image" onerror="this.src='../assets/lost-found/placeholder.svg'">
                    ${item.photos && item.photos.length > 1 ? `
                        <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 5px 10px; border-radius: 20px; font-size: 11px; cursor: pointer;" onclick="openImageGallery(${item.id})">
                            <i class="fas fa-images" style="margin-right: 4px;"></i> ${item.photos.length} photos
                        </div>
                    ` : ''}
                </div>
                <div class="item-content">
                    <div class="item-header">
                        <div>
                            <h3 class="item-title">${item.title}</h3>
                            <span class="item-category">${item.category}</span>
                        </div>
                        <span class="badge badge-${item.status}">${item.status === 'lost' ? 'Lost' : 'Found'}</span>
                    </div>
                    
                    ${item.matched ? '<span class="badge badge-matched" style="margin-bottom: 10px; display: inline-block;"><i class="fas fa-star"></i> Possible Match</span>' : ''}
                    ${item.resolved ? '<span class="badge badge-resolved" style="margin-bottom: 10px; display: inline-block;"><i class="fas fa-check-circle"></i> Resolved</span>' : ''}
                    
                    <p class="item-description" style="margin: 12px 0;">${item.description}</p>
                    
                    <div class="item-meta" style="margin: 12px 0;">
                        <div>
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${item.location}</span>
                        </div>
                        <div>
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(item.date)}</span>
                        </div>
                    </div>
                    
                    <div class="item-footer" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
                        <div class="item-user">
                            <div class="avatar">${itemUser ? itemUser.name[0].toUpperCase() : 'U'}</div>
                            <div>
                                <div style="font-weight: 500;">${itemUser ? itemUser.name : 'Unknown'}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">${itemUser ? itemUser.role : 'user'}</div>
                            </div>
                        </div>
                        ${!isOwner ? `
                            <button class="btn btn-primary btn-sm" onclick="viewContact(${item.userId}, ${item.id})">
                                <i class="fas fa-envelope"></i> Contact
                            </button>
                        ` : ''}
                    </div>
                    
                    ${isOwner ? `
                        <div class="item-actions" style="margin-top: 12px;">
                            <button class="btn btn-secondary btn-sm" onclick="editItem(${item.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            ${!item.resolved ? `
                                <button class="btn btn-primary btn-sm" onclick="markResolved(${item.id})">
                                    <i class="fas fa-check"></i> Resolve
                                </button>
                            ` : `
                                <button class="btn btn-warning btn-sm" onclick="unresolveItem(${item.id})">
                                    <i class="fas fa-undo"></i> Unresolve
                                </button>
                            `}
                            <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Add pagination controls after grid
    const paginationHtml = createPaginationControls(pagination, 'goToPage');
    grid.parentElement.innerHTML += paginationHtml;
}

/**
 * Navigate to a specific page
 */
function goToPage(page) {
    // Get DOM elements safely
    const searchInput = document.getElementById('searchInput');
    const categoryFilterEl = document.getElementById('categoryFilter');
    const statusFilterEl = document.getElementById('statusFilter');
    const sortFilterEl = document.getElementById('sortFilter');

    // Get values with defaults
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const category = categoryFilterEl ? categoryFilterEl.value : 'all';
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'all';
    const sortFilter = sortFilterEl ? sortFilterEl.value : 'newest';

    let filteredItems = items.filter(item => {
        let matchesTab;
        if (currentTab === 'resolved') {
            matchesTab = item.resolved;
        } else {
            matchesTab = item.status === currentTab && !item.resolved;
        }

        const matchesSearch = !searchTerm ||
            item.title.toLowerCase().includes(searchTerm) ||
            item.description.toLowerCase().includes(searchTerm) ||
            item.location.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || item.category === category;

        let matchesStatus = true;
        if (currentTab !== 'resolved') {
            matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && !item.resolved) ||
                (statusFilter === 'resolved' && item.resolved);
        }

        return matchesTab && matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort items
    if (sortFilter === 'newest') {
        filteredItems.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortFilter === 'oldest') {
        filteredItems.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortFilter === 'matched') {
        filteredItems.sort((a, b) => b.matched - a.matched);
    }

    renderItemsWithPagination(filteredItems, page);
}

// Initialize pagination styles on load
addPaginationStyles();
