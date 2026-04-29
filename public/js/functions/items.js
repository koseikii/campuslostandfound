// ========== ITEMS FUNCTIONS (OPTIMIZED) ==========

// Render search with debouncing (prevent re-renders on every keystroke)
let renderDebounceTimer = null;
function debouncedRender(delay = 300) {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
        renderItems();
    }, delay);
}

// Reset all filters and search
function resetFilters() {
    console.log('🔄 Resetting all filters...');

    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (sortFilter) sortFilter.value = 'newest';

    console.log('✅ Filters reset');
    currentPage = 1;
    renderItems();
}

// Update Statistics (optimized with memoization)
let cachedStats = null;
let lastStatsUpdate = 0;
function updateStats() {
    const now = Date.now();

    // Only recalculate if 2+ seconds have passed (reduce CPU usage)
    if (cachedStats && now - lastStatsUpdate < 2000) {
        const { lostItems, foundItems, resolvedItems, matchedItems } = cachedStats;

        const totalLostEl = document.getElementById('totalLost');
        const totalFoundEl = document.getElementById('totalFound');
        const totalResolvedEl = document.getElementById('totalResolved');
        const totalMatchedEl = document.getElementById('totalMatched');

        if (totalLostEl) totalLostEl.textContent = lostItems;
        if (totalFoundEl) totalFoundEl.textContent = foundItems;
        if (totalResolvedEl) totalResolvedEl.textContent = resolvedItems;
        if (totalMatchedEl) totalMatchedEl.textContent = matchedItems;
        console.log(`📊 Stats updated (from cache): Lost=${lostItems}, Found=${foundItems}, Resolved=${resolvedItems}, Matched=${matchedItems}`);
        return;
    }

    // Calculate fresh stats
    const lostItems = items.filter(i => i.status === 'lost' && !i.resolved).length;
    const foundItems = items.filter(i => i.status === 'found' && !i.resolved).length;
    const resolvedItems = items.filter(i => i.resolved).length;
    const matchedItems = items.filter(i => i.matched).length;

    cachedStats = { lostItems, foundItems, resolvedItems, matchedItems };
    lastStatsUpdate = now;

    const totalLostEl = document.getElementById('totalLost');
    const totalFoundEl = document.getElementById('totalFound');
    const totalResolvedEl = document.getElementById('totalResolved');
    const totalMatchedEl = document.getElementById('totalMatched');

    if (totalLostEl) totalLostEl.textContent = lostItems;
    if (totalFoundEl) totalFoundEl.textContent = foundItems;
    if (totalResolvedEl) totalResolvedEl.textContent = resolvedItems;
    if (totalMatchedEl) totalMatchedEl.textContent = matchedItems;

    console.log(`📊 Stats calculated: Lost=${lostItems}, Found=${foundItems}, Resolved=${resolvedItems}, Matched=${matchedItems}`);
}

// Render Items (optimized with DocumentFragment and lazy loading)
function renderItems() {
    try {
        console.log(`🎨 renderItems() called. Tab: ${currentTab}, Total items: ${items.length}`);

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

        console.log(`🔍 Search term: "${searchTerm}", Category: ${category}, Status: ${statusFilter}, Sort: ${sortFilter}`);

        let filteredItems = items.filter(item => {
            try {
                let matchesTab;
                if (currentTab === 'resolved') {
                    matchesTab = item.resolved;
                } else {
                    matchesTab = item.status === currentTab && !item.resolved;
                }

                const matchesSearch = !searchTerm ||
                    item.title?.toLowerCase().includes(searchTerm) ||
                    item.description?.toLowerCase().includes(searchTerm) ||
                    item.location?.toLowerCase().includes(searchTerm);
                const matchesCategory = category === 'all' || item.category === category;

                let matchesStatus = true;
                if (currentTab !== 'resolved') {
                    matchesStatus = statusFilter === 'all' ||
                        (statusFilter === 'active' && !item.resolved) ||
                        (statusFilter === 'resolved' && item.resolved);
                }

                return matchesTab && matchesSearch && matchesCategory && matchesStatus;
            } catch (filterErr) {
                console.warn('Error filtering item:', filterErr);
                return false;
            }
        });

        console.log(`📊 Filtered items: ${filteredItems.length} (from ${items.length} total)`);

        // Sort items (optimized with early exit)
        try {
            if (sortFilter === 'newest') {
                filteredItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            } else if (sortFilter === 'oldest') {
                filteredItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            } else if (sortFilter === 'matched') {
                filteredItems.sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0));
            }
        } catch (sortErr) {
            console.warn('Error sorting items:', sortErr);
        }

        const grid = document.getElementById('itemsGrid');
        if (!grid) {
            console.error('❌ itemsGrid element not found!');
            return;
        }

        // Clear the grid first
        grid.innerHTML = '';

        if (filteredItems.length === 0) {
            console.warn('⚠️ No items found for current filters');

            // Show "No items found" message
            const noItemsDiv = document.createElement('div');
            noItemsDiv.style.cssText = 'text-align: center; color: var(--text-muted); grid-column: 1/-1; padding: 40px 20px;';
            noItemsDiv.innerHTML = `
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p style="font-size: 16px; margin: 10px 0;">No items found matching your search criteria</p>
                <p style="font-size: 14px; opacity: 0.7;">Try adjusting your filters or search terms</p>
            `;
            grid.appendChild(noItemsDiv);
            return;
        }

        // Paginate results: 12 items per page
        const ITEMS_PER_PAGE = 12;
        const pagination = paginate(filteredItems, 1, ITEMS_PER_PAGE);

        // Use DocumentFragment for batch DOM operations
        const fragment = document.createDocumentFragment();

        pagination.data.forEach(item => {
            try {
                // Try to find user by ID, fall back to item's userName, then to 'Unknown'
                let user = users.find(u => u.id === item.userId);

                if (!user && item.userName) {
                    // Use the username stored with the item
                    user = {
                        name: item.userName,
                        role: item.userRole || 'user',
                        id: item.userId
                    };
                } else if (!user) {
                    // Final fallback
                    user = {
                        name: 'Unknown',
                        role: 'user',
                        id: item.userId
                    };
                }

                const isOwner = currentUser && currentUser.id === item.userId;

                const div = document.createElement('div');
                div.className = 'item-card';
                div.setAttribute('data-item-id', item.id);

                div.innerHTML = `
                    <img src="${getItemImage(item)}" alt="${item.title}" class="item-image" loading="lazy" onerror="this.src='../assets/lost-found/placeholder.svg'">
                    <div class="item-content">
                        <div class="item-header">
                            <div>
                                <h3 class="item-title">${item.title || 'Untitled'}</h3>
                                <span class="item-category">${item.category || 'Other'}</span>
                            </div>
                            <span class="badge badge-${item.status}">${item.status === 'lost' ? 'Lost' : 'Found'}</span>
                        </div>
                        
                        ${item.matched ? '<span class="badge badge-matched" style="margin-bottom: 10px; display: inline-block;"><i class="fas fa-star"></i> Possible Match</span>' : ''}
                        ${item.resolved ? `<span class="badge badge-resolved" style="margin-bottom: 10px; display: inline-block;"><i class="fas fa-check-circle"></i> Resolved</span>` : ''}
                        
                        <p class="item-description" style="margin: 12px 0;">${item.description || 'No description'}</p>
                        
                        <div class="item-meta" style="margin: 12px 0;">
                            <div>
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${item.location || 'Unknown location'}</span>
                            </div>
                            <div>
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(item.date)}</span>
                            </div>
                        </div>
                            
                            <div class="item-footer" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
                                <div class="item-user">
                                    <div class="avatar">${user.name[0]?.toUpperCase() || '?'}</div>
                                    <div>
                                        <div style="font-weight: 500;">${user.name}</div>
                                        <div style="font-size: 11px; color: var(--text-muted);">${user.role}</div>
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
                                            <i class="fas fa-check"></i> Mark Resolved
                                        </button>
                                    ` : `
                                        <button class="btn btn-warning btn-sm" onclick="unresolveItem(${item.id})" title="Mark as unresolved">
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

                fragment.appendChild(div);
            } catch (itemErr) {
                console.warn('Error rendering individual item:', itemErr);
            }
        });

        // Clear and append all at once
        grid.innerHTML = '';
        grid.appendChild(fragment);

        console.log(`✅ Rendered ${pagination.data.length} items to DOM`);

        // Add pagination controls if more than one page
        if (pagination.totalPages > 1) {
            try {
                const paginationHTML = createPaginationControls(pagination, 'goToPage');
                grid.parentElement.innerHTML += paginationHTML;
            } catch (paginationErr) {
                console.warn('Error adding pagination:', paginationErr);
            }
        }

        console.log(`🎨 renderItems() complete. Grid now has ${grid.children.length} visible items`);
    } catch (error) {
        console.error('❌ Error in renderItems:', error);
        // Don't throw - just log and continue
    }
}

function filterItems() {
    currentPage = 1; // Reset to first page when filtering
    if (typeof goToPage === 'function') {
        goToPage(1);
    } else {
        renderItems();
    }
}

// Switch between Lost, Found, and Resolved items tabs
function switchItemTab(tab) {
    console.log(`🔄 Switching to tab: ${tab}`);
    currentTab = tab;
    currentPage = 1; // Reset to first page when switching tabs

    // Update tab buttons - safe selector that works on the main app page
    const tabButtons = document.querySelectorAll('#appPage .tab-btn, main .tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Highlight active tab from the clicked element
    if (event && event.target && event.target.classList.contains('tab-btn')) {
        event.target.classList.add('active');
    } else if (tabButtons.length > 0) {
        // Fallback: activate the first button matching the tab
        const tabIndex = ['lost', 'found', 'resolved'].indexOf(tab);
        if (tabIndex >= 0 && tabButtons[tabIndex]) {
            tabButtons[tabIndex].classList.add('active');
        }
    }

    // Re-render items for new tab
    if (typeof renderItems === 'function') {
        renderItems();
    }
    console.log(`✅ Tab switched to: ${tab}, Items rendered`);
}

// Report Item Functions
function openReportModal(type) {
    if (!currentUser) {
        showToast('Please login to report an item', 'error');
        return;
    }

    currentReportType = type;

    const modalTitleEl = document.getElementById('modalTitle');
    if (modalTitleEl) modalTitleEl.textContent = `Report ${type === 'lost' ? 'Lost' : 'Found'} Item`;

    const reportModalEl = document.getElementById('reportModal');
    if (reportModalEl) reportModalEl.classList.add('active');

    const reportFormEl = document.getElementById('reportForm');
    if (reportFormEl) reportFormEl.reset();

    const photoPreviewEl = document.getElementById('photoPreview');
    if (photoPreviewEl) photoPreviewEl.innerHTML = '';

    // Clear social media fields
    const socialMediaFields = ['itemFacebook', 'itemTwitter', 'itemInstagram', 'itemLinkedin', 'itemWhatsapp'];
    socialMediaFields.forEach(fieldId => {
        const fieldEl = document.getElementById(fieldId);
        if (fieldEl) fieldEl.value = '';
    });

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const itemDateEl = document.getElementById('itemDate');
    if (itemDateEl) itemDateEl.value = today;
}

function closeReportModal() {
    const reportModalEl = document.getElementById('reportModal');
    if (reportModalEl) reportModalEl.classList.remove('active');
}

function handlePhotoPreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('photoPreview');

    if (!preview) return;

    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            preview.innerHTML = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image file must be smaller than 5MB', 'error');
            preview.innerHTML = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 4px;">`;
        };
        reader.onerror = () => {
            showToast('Error reading file', 'error');
            preview.innerHTML = '';
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

function handleEditPhotoPreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editPhotoPreview');

    if (!preview) return;

    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            preview.innerHTML = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image file must be smaller than 5MB', 'error');
            preview.innerHTML = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 4px; display: block;">`;
        };
        reader.onerror = () => {
            showToast('Error reading file', 'error');
            preview.innerHTML = '';
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

function updateDescCharCount() {
    const descEl = document.getElementById('itemDescription');
    const countEl = document.getElementById('descCharCount');

    if (descEl && countEl) {
        const length = descEl.value.length;
        countEl.textContent = `(${length}/500)`;

        if (length < 10) {
            countEl.style.color = 'var(--text-secondary)';
        } else if (length >= 10 && length <= 500) {
            countEl.style.color = '#22c55e';
        } else {
            countEl.style.color = '#ef4444';
        }
    }
}

function handleReportSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('itemTitle').value.trim();
    const category = document.getElementById('itemCategory').value;
    const description = document.getElementById('itemDescription').value.trim();
    const location = document.getElementById('itemLocation').value.trim();
    const date = document.getElementById('itemDate').value;

    if (!title || title.length < 3) {
        showToast('Please enter a title (at least 3 characters)', 'error');
        return;
    }
    if (!category || category === 'all') {
        showToast('Please select a category', 'error');
        return;
    }
    if (!description || description.length < 10) {
        showToast('Description must be at least 10 characters', 'error');
        return;
    }
    if (!location) {
        showToast('Please enter a location', 'error');
        return;
    }
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }

    const photoInput = document.getElementById('itemPhoto');

    if (photoInput && photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];

        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image file must be smaller than 5MB', 'error');
            return;
        }

        // Show loading state
        showToast('📤 Uploading image to Firebase Storage...', 'info');

        // 🔥 Upload image to Firebase Storage (NOT base64 to Firestore!)
        // First create a temporary ID for the storage path
        const tempItemId = 'item_' + Date.now();

        storageUploadItemImages(tempItemId, [file])
            .then(uploadResult => {
                if (uploadResult.success && uploadResult.urls.length > 0) {
                    const imageUrl = uploadResult.urls[0];
                    console.log('✅ Image uploaded to Firebase Storage:', imageUrl);
                    // Now create the item with the image URL
                    createReportItem(title, category, description, location, date, imageUrl);
                } else {
                    showToast('Failed to upload image to Firebase Storage', 'error');
                    console.error('Storage upload failed:', uploadResult.error);
                }
            })
            .catch(error => {
                showToast('Error uploading image: ' + error.message, 'error');
                console.error('Image upload error:', error);
            });
    } else {
        // No image provided, use placeholder
        createReportItem(title, category, description, location, date, '../assets/lost-found/placeholder.svg');
    }
}

function generateUniqueItemId() {
    const allIds = [
        ...items.map(i => i.id),
        ...deletedItems.map(i => i.id)
    ];
    return allIds.length > 0 ? Math.max(...allIds) + 1 : 1;
}

function createReportItem(title, category, description, location, date, imageData) {
    // Create item object (will get ID from backend after API call)
    const newItem = {
        title,
        category,
        description,
        location,
        date,
        status: currentReportType,
        image: imageData,
        userId: currentUser.id,
        userName: currentUser.name,
        matched: false,
        resolved: false,
        createdAt: Date.now(),
        socialMedia: {
            facebook: document.getElementById('itemFacebook').value.trim(),
            twitter: document.getElementById('itemTwitter').value.trim(),
            instagram: document.getElementById('itemInstagram').value.trim(),
            linkedin: document.getElementById('itemLinkedin').value.trim(),
            whatsapp: document.getElementById('itemWhatsapp').value.trim()
        }
    };

    // Show loading state
    showToast('📤 Uploading item to database...', 'info');

    // Call API to save item to MySQL
    const api = new APIService();

    // Map category name to ID if needed
    let categoryId = category;
    if (window.categories && typeof category === 'string') {
        const categoryObj = window.categories.find(c => c.name.toLowerCase() === category.toLowerCase());
        if (categoryObj) {
            categoryId = categoryObj.id;
        }
    }

    // Map location name to ID if needed
    let locationId = location;
    if (window.locations && typeof location === 'string') {
        const locationObj = window.locations.find(l => l.name.toLowerCase() === location.toLowerCase());
        if (locationObj) {
            locationId = locationObj.id;
        }
    }

    api.createItem(title, description, categoryId, currentReportType, locationId, imageData).then(result => {
        if (result.success && result.data) {
            // Add to local items with ID from backend
            newItem.id = result.data.id;
            newItem.firebaseId = result.data.id;
            // Ensure location and date are set (normalize)
            if (!newItem.location) newItem.location = location;
            if (!newItem.date) newItem.date = date;

            checkMatches(newItem);
            items.unshift(newItem);

            // 🔥 ALSO SAVE TO FIREBASE IMMEDIATELY
            const firebaseData = {
                title: title,
                description: description,
                category_id: categoryId,
                item_type: currentReportType,
                location_id: locationId,
                location_description: location,
                found_on_date: date,
                user_id: currentUser.id,
                uid: currentUser.uid || currentUser.id,
                userId: currentUser.id,
                userName: currentUser.name || 'Unknown User',
                userEmail: currentUser.email || 'not provided',
                userPhone: currentUser.phone || 'not provided',
                userRole: currentUser.role || 'user',
                status: currentReportType,
                resolved: false,
                matched: false,
                image_url: imageData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            firebaseAddDocument('items', firebaseData).then(fbResult => {
                if (fbResult.success) {
                    console.log('✅ Item also saved to Firebase:', fbResult.id);
                    // Update the item with Firebase ID for future syncing
                    newItem.firebaseId = fbResult.id;
                    saveData();
                } else {
                    console.warn('⚠️ Item saved to local database but Firebase save failed:', fbResult.error);
                }
            }).catch(fbErr => {
                console.warn('⚠️ Firebase save error (non-blocking):', fbErr);
            });

            // Log audit action for item creation
            if (typeof logAuditAction === 'function') {
                logAuditAction('ITEM_CREATED', currentUser.id, {
                    itemId: newItem.id,
                    title: newItem.title,
                    category: newItem.category,
                    status: newItem.status,
                    location: newItem.location
                });
            }

            closeReportModal();

            // Send real-time notification for item creation
            if (typeof sendRealtimeNotification === 'function') {
                sendRealtimeNotification(
                    '📄 Item Reported Successfully',
                    `Your ${currentReportType} item "${title}" has been posted and is now visible to the community!`,
                    'success',
                    newItem.id,
                    currentUser.id
                );
            } else {
                showToast(`✅ Item reported successfully!`, 'success');
            }

            sendEmailNotification(currentUser.email, `Item Report Confirmed: ${title}`, `Your ${currentReportType} item report has been posted successfully.`);
            renderItems();
            updateStats();
        } else {
            showToast(`❌ Error: ${result.error || 'Failed to create item'}`, 'error');
        }
    }).catch(error => {
        showToast(`❌ Error uploading item: ${error.message}`, 'error');
    });
}

function checkMatches(newItem) {
    const keywords = newItem.title.toLowerCase().split(' ');
    const oppositeStatus = newItem.status === 'lost' ? 'found' : 'lost';

    items.forEach(item => {
        if (item.status === oppositeStatus && item.category === newItem.category) {
            const itemKeywords = item.title.toLowerCase().split(' ');
            const hasMatch = keywords.some(kw => itemKeywords.includes(kw));

            if (hasMatch) {
                newItem.matched = true;
                item.matched = true;

                // Use enhanced real-time notification
                if (typeof sendRealtimeNotification === 'function') {
                    sendRealtimeNotification(
                        'Possible Match Found!',
                        `A potential match was found for your ${item.status} item: "${item.title}"`,
                        'match',
                        item.id
                    );
                } else {
                    addNotification(`Possible match found for your ${item.status} item: ${item.title}`, item.id);
                }
            }
        }
    });
}

// Edit Item
function editItem(itemId) {
    try {
        const item = items.find(i => i.id === itemId);
        if (!item) {
            console.warn('Item not found:', itemId);
            if (typeof showToast === 'function') showToast('Item not found', 'error');
            return;
        }

        const editIdEl = document.getElementById('editItemId');
        const editTitleEl = document.getElementById('editItemTitle');
        const editDescEl = document.getElementById('editItemDescription');
        const editLocEl = document.getElementById('editItemLocation');

        if (!editIdEl || !editTitleEl || !editDescEl || !editLocEl) {
            console.error('Edit form fields not found');
            return;
        }

        editIdEl.value = item.id;
        editTitleEl.value = item.title;
        editDescEl.value = item.description;
        editLocEl.value = item.location;

        const editPhotoPreviewEl = document.getElementById('editPhotoPreview');
        if (editPhotoPreviewEl) {
            if (item.image && item.image.startsWith('data:image/')) {
                editPhotoPreviewEl.innerHTML = `<img src="${item.image}" alt="Current photo" style="max-width: 100%; max-height: 300px; border-radius: 4px; display: block;">`;
            } else {
                editPhotoPreviewEl.innerHTML = '';
            }
        }

        const editItemPhotoEl = document.getElementById('editItemPhoto');
        if (editItemPhotoEl) {
            editItemPhotoEl.value = '';
            const newPhotoEl = editItemPhotoEl.cloneNode(true);
            if (editItemPhotoEl.parentNode) {
                editItemPhotoEl.parentNode.replaceChild(newPhotoEl, editItemPhotoEl);
                document.getElementById('editItemPhoto')?.addEventListener('change', handleEditPhotoPreview);
            }
        }

        if (item.socialMedia) {
            const fbEl = document.getElementById('editItemFacebook');
            const twEl = document.getElementById('editItemTwitter');
            const igEl = document.getElementById('editItemInstagram');
            const liEl = document.getElementById('editItemLinkedin');
            const waEl = document.getElementById('editItemWhatsapp');

            if (fbEl) fbEl.value = item.socialMedia.facebook || '';
            if (twEl) twEl.value = item.socialMedia.twitter || '';
            if (igEl) igEl.value = item.socialMedia.instagram || '';
            if (liEl) liEl.value = item.socialMedia.linkedin || '';
            if (waEl) waEl.value = item.socialMedia.whatsapp || '';
        }

        const editModal = document.getElementById('editModal');
        if (editModal) editModal.classList.add('active');
    } catch (error) {
        console.error('Error in editItem:', error);
        if (typeof showToast === 'function') showToast('Error opening edit form: ' + error.message, 'error');
    }
}

function handleEditSubmit(e) {
    try {
        e.preventDefault();

        const itemIdEl = document.getElementById('editItemId');
        if (!itemIdEl) {
            console.error('Edit item ID field not found');
            if (typeof showToast === 'function') showToast('Form error: missing item ID', 'error');
            return;
        }

        const itemId = parseInt(itemIdEl.value);
        const item = items.find(i => i.id === itemId);

        if (!item) {
            console.error('Item not found:', itemId);
            if (typeof showToast === 'function') showToast('Item not found', 'error');
            return;
        }

        const titleEl = document.getElementById('editItemTitle');
        const descEl = document.getElementById('editItemDescription');
        const locEl = document.getElementById('editItemLocation');

        if (!titleEl || !descEl || !locEl) {
            console.error('Required edit form fields not found');
            if (typeof showToast === 'function') showToast('Form fields missing', 'error');
            return;
        }

        item.title = titleEl.value;
        item.description = descEl.value;
        item.location = locEl.value;

        if (!item.socialMedia) {
            item.socialMedia = {};
        }

        const fbEl = document.getElementById('editItemFacebook');
        const twEl = document.getElementById('editItemTwitter');
        const igEl = document.getElementById('editItemInstagram');
        const liEl = document.getElementById('editItemLinkedin');
        const waEl = document.getElementById('editItemWhatsapp');

        if (fbEl) item.socialMedia.facebook = fbEl.value.trim();
        if (twEl) item.socialMedia.twitter = twEl.value.trim();
        if (igEl) item.socialMedia.instagram = igEl.value.trim();
        if (liEl) item.socialMedia.linkedin = liEl.value.trim();
        if (waEl) item.socialMedia.whatsapp = waEl.value.trim();

        const photoInput = document.getElementById('editItemPhoto');

        const updateItemHandler = () => {
            try {
                // Log audit action for item update
                if (typeof logAuditAction === 'function' && currentUser) {
                    logAuditAction('ITEM_UPDATED', currentUser.id, {
                        itemId: item.id,
                        title: item.title,
                        changes: photoInput && photoInput.files && photoInput.files[0]
                            ? ['title', 'description', 'location', 'image', 'socialMedia']
                            : ['title', 'description', 'location', 'socialMedia']
                    });
                }

                // Save locally
                if (typeof saveData === 'function') {
                    saveData();
                }

                if (typeof showToast === 'function') {
                    showToast('Item updated successfully!', 'success');
                }
                console.log('Item updated:', item.id);

                if (typeof closeEditModal === 'function') {
                    closeEditModal();
                }

                if (typeof renderItems === 'function') {
                    renderItems();
                }
            } catch (error) {
                console.error('Error in updateItemHandler:', error);
                if (typeof showToast === 'function') {
                    showToast('Error updating item: ' + error.message, 'error');
                }
            }
        };

        if (photoInput && photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];

            if (!file.type.startsWith('image/')) {
                if (typeof showToast === 'function') showToast('Please select a valid image file', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                item.image = event.target.result;
                updateItemHandler();
            };
            reader.onerror = () => {
                if (typeof showToast === 'function') showToast('Error processing photo', 'error');
            };
            reader.readAsDataURL(file);
        } else {
            updateItemHandler();
        }
    } catch (error) {
        console.error('Error in handleEditSubmit:', error);
        if (typeof showToast === 'function') {
            showToast('An error occurred while editing item: ' + error.message, 'error');
        }
    }
}

function closeEditModal() {
    try {
        const modal = document.getElementById('editModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.error('Error closing edit modal:', error);
    }
}

function markResolved(itemId) {
    try {
        if (!itemId || typeof itemId !== 'number') {
            if (typeof showToast === 'function') showToast('Invalid item ID', 'error');
            return false;
        }

        const item = items.find(i => i.id === itemId);
        if (!item) {
            if (typeof showToast === 'function') showToast('Item not found', 'error');
            return false;
        }

        const isOwner = currentUser && currentUser.id === item.userId;
        if (!isOwner) {
            if (typeof showToast === 'function') showToast('You can only mark your own items as resolved', 'error');
            return false;
        }

        if (item.resolved) {
            if (typeof showToast === 'function') showToast('This item is already marked as resolved', 'warning');
            return false;
        }

        item.resolved = true;
        item.resolvedDate = new Date().toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        item.resolvedBy = currentUser.id;
        item.resolvedTimestamp = Date.now();

        // Save locally
        if (typeof saveData === 'function') {
            saveData();
        }

        // ✅ Update Firebase Firestore
        if (item.firebaseId && typeof firebaseUpdateDocument === 'function') {
            firebaseUpdateDocument('items', item.firebaseId, {
                resolved: true,
                resolvedDate: item.resolvedDate,
                resolvedBy: item.resolvedBy,
                resolvedTimestamp: item.resolvedTimestamp,
                updatedAt: new Date().toISOString()
            }).catch(err => {
                console.warn('⚠️ Firebase update failed, but local change saved:', err);
            });
        }

        // Log audit action for item resolution
        if (typeof logAuditAction === 'function' && currentUser) {
            logAuditAction('ITEM_RESOLVED', currentUser.id, {
                itemId: item.id,
                title: item.title,
                status: item.status,
                resolvedDate: item.resolvedDate
            });
        }

        if (item.matched) {
            // Use enhanced real-time notification
            if (typeof sendRealtimeNotification === 'function') {
                sendRealtimeNotification(
                    'Item Resolved!',
                    `Your "${item.status}" report for "${item.title}" has been marked as resolved!`,
                    'success',
                    item.id
                );
            } else if (typeof addNotification === 'function') {
                addNotification(
                    `Your "${item.status}" report for "${item.title}" has been resolved!`,
                    item.id
                );
            }
        }

        if (typeof showToast === 'function') {
            showToast(`Item "${item.title}" marked as resolved successfully!`, 'success');
        }

        if (typeof renderItems === 'function') renderItems();
        if (typeof updateStats === 'function') updateStats();

        console.log('Item marked as resolved:', itemId);
        return true;
    } catch (error) {
        console.error('Error marking item as resolved:', error);
        if (typeof showToast === 'function') {
            showToast('Error marking item as resolved: ' + error.message, 'error');
        }
        return false;
    }
}

function unresolveItem(itemId) {
    if (!itemId || typeof itemId !== 'number') {
        showToast('Invalid item ID', 'error');
        return false;
    }

    const item = items.find(i => i.id === itemId);
    if (!item) {
        showToast('Item not found', 'error');
        return false;
    }

    const isOwner = currentUser && currentUser.id === item.userId;
    if (!isOwner) {
        showToast('You can only modify your own items', 'error');
        return false;
    }

    if (!item.resolved) {
        showToast('This item is already unresolved', 'warning');
        return false;
    }

    item.previousResolvedDate = item.resolvedDate;
    item.previousResolvedBy = item.resolvedBy;

    item.resolved = false;
    item.resolvedDate = null;
    item.resolvedBy = null;
    item.resolvedTimestamp = null;

    // Save locally
    if (typeof saveData === 'function') {
        saveData();
    }

    // ✅ Update Firebase Firestore
    if (item.firebaseId && typeof firebaseUpdateDocument === 'function') {
        firebaseUpdateDocument('items', item.firebaseId, {
            resolved: false,
            resolvedDate: null,
            resolvedBy: null,
            resolvedTimestamp: null,
            updatedAt: new Date().toISOString()
        }).then(() => {
            renderItems();
            updateStats();
            showToast(`✅ Item "${item.title}" marked as unresolved!`, 'success');
        }).catch(error => {
            console.warn('⚠️ Firebase update failed, but local change saved:', error);
            renderItems();
            updateStats();
            showToast(`✅ Item "${item.title}" marked as unresolved!`, 'success');
        });
    } else {
        renderItems();
        updateStats();
        showToast(`✅ Item "${item.title}" marked as unresolved!`, 'success');
    }

    return true;
}

function deleteItem(itemId) {
    try {
        if (!itemId) {
            if (typeof showToast === 'function') showToast('Invalid item ID', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        const item = items.find(i => i.id === itemId);
        if (!item) {
            if (typeof showToast === 'function') showToast('Item not found', 'error');
            return;
        }

        // Check ownership
        if (currentUser && currentUser.id !== item.userId && currentUser.role !== 'admin') {
            if (typeof showToast === 'function') showToast('You can only delete your own items', 'error');
            return;
        }

        // Remove from items array
        const index = items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            items.splice(index, 1);
            console.log('Item deleted from array:', itemId);
        }

        // Save data locally
        if (typeof saveData === 'function') {
            saveData();
        }

        // ✅ Delete from Firebase Firestore (PRIMARY PERSISTENCE)
        // Use firebaseId if available, otherwise use itemId
        const fbId = item.firebaseId || item.id;

        if (fbId && typeof firebaseDeleteDocument === 'function') {
            console.log('🗑️ Deleting from Firebase:', fbId);
            showToast('🗑️ Syncing deletion to server...', 'info');

            firebaseDeleteDocument('items', fbId)
                .then(result => {
                    if (result.success) {
                        console.log('✅ Item permanently deleted from Firebase:', fbId);
                        showToast('✅ Item permanently deleted!', 'success');
                    } else {
                        console.warn('⚠️ Firebase delete failed:', result.error);
                        console.log('Item will be marked as deleted locally, may need manual cleanup');
                    }
                    // Update UI regardless
                    if (typeof renderItems === 'function') renderItems();
                    if (typeof updateStats === 'function') updateStats();
                })
                .catch(err => {
                    console.error('❌ Firebase delete error:', err);
                    console.log('Item deleted locally, server sync will retry on next connection');
                    // Update UI anyway
                    if (typeof renderItems === 'function') renderItems();
                    if (typeof updateStats === 'function') updateStats();
                });
        } else {
            console.warn('⚠️ No Firebase connection to delete from server');
            if (typeof renderItems === 'function') renderItems();
            if (typeof updateStats === 'function') updateStats();
        }

        // Log audit action
        if (typeof logAuditAction === 'function' && currentUser) {
            logAuditAction('ITEM_DELETED', currentUser.id, {
                itemId: itemId,
                title: item.title
            });
        }

        if (typeof showToast === 'function') showToast('Item deleted!', 'success');

        if (typeof renderItems === 'function') renderItems();
        if (typeof updateStats === 'function') updateStats();

        console.log('Item deleted:', itemId);
    } catch (error) {
        console.error('Error deleting item:', error);
        if (typeof showToast === 'function') showToast('Error deleting item: ' + error.message, 'error');
    }
}
