/**
 * API Service - Client-side API wrapper for Lost & Found System
 * Handles all backend/database operations with proper error handling
 */

class APIService {
    constructor() {
        this.apiBase = '/api';
        this.timeout = 30000; // 30 second timeout
    }

    /**
     * Make a generic API call
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.apiBase}${endpoint}`;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: this.timeout
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await Promise.race([
                fetch(url, options),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.timeout)
                )
            ]);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            return {
                success: false,
                error: error.message || 'Failed to connect to server'
            };
        }
    }

    /**
     * Create a new item (report lost or found item)
     */
    async createItem(title, description, categoryId, itemType, locationId, imageData) {
        try {
            // Prepare the item data
            const itemData = {
                title: title,
                description: description,
                category_id: categoryId,
                item_type: itemType, // 'lost' or 'found'
                location_id: locationId,
                image: imageData,
                posted_by: JSON.parse(localStorage.getItem('currentUser') || '{}').id,
                created_at: new Date().toISOString()
            };

            // Try API endpoint first
            let result = await this.makeRequest('/items', 'POST', itemData);

            // If API fails, use local storage fallback
            if (!result.success) {
                console.warn('API failed, using local storage fallback');
                return this.createItemLocal(itemData);
            }

            return result;
        } catch (error) {
            console.error('Create item error:', error);
            return this.createItemLocal({
                title, description, categoryId, itemType, locationId, imageData
            });
        }
    }

    /**
     * Create item using local storage (fallback)
     */
    createItemLocal(itemData) {
        try {
            // Generate unique ID
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const maxId = items.length > 0 ? Math.max(...items.map(i => i.id || 0)) : 0;
            const newId = maxId + 1;

            // Get current user for user info if not provided
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

            // Create item with ID and ensure user info is included
            const newItem = {
                id: newId,
                ...itemData,
                userId: itemData.userId || itemData.user_id || currentUser.id,
                userName: itemData.userName || currentUser.name || 'Unknown User',
                userEmail: itemData.userEmail || currentUser.email || 'not provided',
                userPhone: itemData.userPhone || currentUser.phone || 'not provided',
                userRole: itemData.userRole || currentUser.role || 'user',
                item_code: `LF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                status: itemData.status || 'active',
                created_at: itemData.created_at || new Date().toISOString()
            };

            // Save to localStorage
            items.push(newItem);
            localStorage.setItem('items', JSON.stringify(items));

            // Add to global items array if it exists
            if (typeof items !== 'undefined' && Array.isArray(window.items)) {
                window.items.unshift(newItem);
            }

            return {
                success: true,
                message: 'Item reported successfully!',
                data: newItem
            };
        } catch (error) {
            console.error('Local item creation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to create item'
            };
        }
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const result = await this.makeRequest('/auth/login', 'POST', { email, password });

            if (result.success && result.data) {
                localStorage.setItem('currentUser', JSON.stringify(result.data));
                localStorage.setItem('authToken', result.token || '');
                return result;
            }

            // Fallback to local authentication
            return this.loginLocal(email, password);
        } catch (error) {
            console.error('Login error:', error);
            return this.loginLocal(email, password);
        }
    }

    /**
     * Local login fallback
     */
    loginLocal(email, password) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                const { password, ...userWithoutPassword } = user;
                localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
                return {
                    success: true,
                    message: 'Login successful',
                    data: userWithoutPassword
                };
            }

            return {
                success: false,
                error: 'Invalid email or password'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Login failed'
            };
        }
    }

    /**
     * Signup user
     */
    async signup(name, email, phone, password, role) {
        try {
            const result = await this.makeRequest('/auth/signup', 'POST', {
                name, email, phone, password, role
            });

            if (result.success && result.data) {
                localStorage.setItem('currentUser', JSON.stringify(result.data));
                return result;
            }

            // Fallback to local signup
            return this.signupLocal(name, email, phone, password, role);
        } catch (error) {
            console.error('Signup error:', error);
            return this.signupLocal(name, email, phone, password, role);
        }
    }

    /**
     * Local signup fallback
     */
    signupLocal(name, email, phone, password, role) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');

            // Check if user already exists
            if (users.find(u => u.email === email)) {
                return {
                    success: false,
                    error: 'Email already registered'
                };
            }

            // Create new user
            const newUser = {
                id: users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 1,
                name,
                email,
                phone,
                password, // Note: In production, passwords should be hashed
                role: role || 'student',
                created_at: new Date().toISOString(),
                avatar: '',
                bio: ''
            };

            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(newUser));

            const { password: pwd, ...userWithoutPassword } = newUser;
            return {
                success: true,
                message: 'Account created successfully!',
                data: userWithoutPassword
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Signup failed'
            };
        }
    }

    /**
     * Get all categories
     */
    async getCategories() {
        try {
            const result = await this.makeRequest('/categories', 'GET');

            if (result.success && Array.isArray(result.data)) {
                return result;
            }

            // Fallback to local categories
            return this.getCategoriesLocal();
        } catch (error) {
            console.error('Get categories error:', error);
            return this.getCategoriesLocal();
        }
    }

    /**
     * Local categories fallback
     */
    getCategoriesLocal() {
        const defaultCategories = [
            { id: 1, name: 'Electronics', icon: 'fa-laptop' },
            { id: 2, name: 'Bags & Backpacks', icon: 'fa-bag' },
            { id: 3, name: 'Books & Stationery', icon: 'fa-book' },
            { id: 4, name: 'Accessories', icon: 'fa-ring' },
            { id: 5, name: 'Keys & Cards', icon: 'fa-key' },
            { id: 6, name: 'Clothing', icon: 'fa-shirt' },
            { id: 7, name: 'Other', icon: 'fa-box' }
        ];

        return {
            success: true,
            data: defaultCategories
        };
    }

    /**
     * Get all locations
     */
    async getLocations() {
        try {
            const result = await this.makeRequest('/locations', 'GET');

            if (result.success && Array.isArray(result.data)) {
                return result;
            }

            // Fallback to local locations
            return this.getLocationsLocal();
        } catch (error) {
            console.error('Get locations error:', error);
            return this.getLocationsLocal();
        }
    }

    /**
     * Local locations fallback
     */
    getLocationsLocal() {
        const defaultLocations = [
            { id: 1, name: 'Main Building', building: 'Main' },
            { id: 2, name: 'Library', building: 'Library' },
            { id: 3, name: 'Cafeteria', building: 'Cafeteria' },
            { id: 4, name: 'Sports Complex', building: 'Sports' },
            { id: 5, name: 'Dormitory', building: 'Dorm' },
            { id: 6, name: 'Auditorium', building: 'Auditorium' },
            { id: 7, name: 'Laboratory', building: 'Lab' },
            { id: 8, name: 'Parking Area', building: 'Parking' },
            { id: 9, name: 'Gate/Entrance', building: 'Entrance' },
            { id: 10, name: 'Other', building: 'Other' }
        ];

        return {
            success: true,
            data: defaultLocations
        };
    }

    /**
     * Get items with filters
     */
    async getItems(filters = {}) {
        try {
            const params = new URLSearchParams(filters).toString();
            const result = await this.makeRequest(`/items?${params}`, 'GET');

            if (result.success && Array.isArray(result.data)) {
                return result;
            }

            return this.getItemsLocal(filters);
        } catch (error) {
            console.error('Get items error:', error);
            return this.getItemsLocal(filters);
        }
    }

    /**
     * Local items fallback
     */
    getItemsLocal(filters = {}) {
        try {
            let items = JSON.parse(localStorage.getItem('items') || '[]');

            // Apply filters
            if (filters.category) {
                items = items.filter(i => i.category_id === parseInt(filters.category));
            }

            if (filters.type) {
                items = items.filter(i => i.item_type === filters.type);
            }

            if (filters.status) {
                items = items.filter(i => i.status === filters.status);
            }

            return {
                success: true,
                data: items
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to get items'
            };
        }
    }

    /**
     * Get single item by ID
     */
    async getItem(itemId) {
        try {
            const result = await this.makeRequest(`/items/${itemId}`, 'GET');

            if (result.success && result.data) {
                return result;
            }

            return this.getItemLocal(itemId);
        } catch (error) {
            console.error('Get item error:', error);
            return this.getItemLocal(itemId);
        }
    }

    /**
     * Local item lookup fallback
     */
    getItemLocal(itemId) {
        try {
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const item = items.find(i => i.id === parseInt(itemId));

            if (item) {
                return {
                    success: true,
                    data: item
                };
            }

            return {
                success: false,
                error: 'Item not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to get item'
            };
        }
    }

    /**
     * Update item
     */
    async updateItem(itemId, updates) {
        try {
            const result = await this.makeRequest(`/items/${itemId}`, 'PUT', updates);

            if (result.success) {
                return result;
            }

            return this.updateItemLocal(itemId, updates);
        } catch (error) {
            console.error('Update item error:', error);
            return this.updateItemLocal(itemId, updates);
        }
    }

    /**
     * Local item update fallback
     */
    updateItemLocal(itemId, updates) {
        try {
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const index = items.findIndex(i => i.id === parseInt(itemId));

            if (index !== -1) {
                items[index] = { ...items[index], ...updates };
                localStorage.setItem('items', JSON.stringify(items));

                return {
                    success: true,
                    message: 'Item updated successfully',
                    data: items[index]
                };
            }

            return {
                success: false,
                error: 'Item not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to update item'
            };
        }
    }

    /**
     * Delete item
     */
    async deleteItem(itemId) {
        try {
            const result = await this.makeRequest(`/items/${itemId}`, 'DELETE');

            if (result.success) {
                return result;
            }

            return this.deleteItemLocal(itemId);
        } catch (error) {
            console.error('Delete item error:', error);
            return this.deleteItemLocal(itemId);
        }
    }

    /**
     * Local item deletion fallback
     */
    deleteItemLocal(itemId) {
        try {
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const index = items.findIndex(i => i.id === parseInt(itemId));

            if (index !== -1) {
                const deletedItem = items.splice(index, 1)[0];
                localStorage.setItem('items', JSON.stringify(items));

                // Store in deleted items list
                const deleted = JSON.parse(localStorage.getItem('deletedItems') || '[]');
                deleted.push({ ...deletedItem, deletedAt: new Date().toISOString() });
                localStorage.setItem('deletedItems', JSON.stringify(deleted));

                return {
                    success: true,
                    message: 'Item deleted successfully'
                };
            }

            return {
                success: false,
                error: 'Item not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to delete item'
            };
        }
    }

    /**
     * Search items
     */
    async searchItems(searchTerm) {
        try {
            const result = await this.makeRequest(`/items/search?q=${encodeURIComponent(searchTerm)}`, 'GET');

            if (result.success && Array.isArray(result.data)) {
                return result;
            }

            return this.searchItemsLocal(searchTerm);
        } catch (error) {
            console.error('Search error:', error);
            return this.searchItemsLocal(searchTerm);
        }
    }

    /**
     * Local search fallback
     */
    searchItemsLocal(searchTerm) {
        try {
            const items = JSON.parse(localStorage.getItem('items') || '[]');
            const term = searchTerm.toLowerCase();

            const results = items.filter(item =>
                item.title?.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term) ||
                item.location?.toLowerCase().includes(term)
            );

            return {
                success: true,
                data: results
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Search failed'
            };
        }
    }

    /**
     * Get user profile
     */
    async getUserProfile(userId) {
        try {
            const result = await this.makeRequest(`/users/${userId}`, 'GET');

            if (result.success && result.data) {
                return result;
            }

            return this.getUserProfileLocal(userId);
        } catch (error) {
            console.error('Get profile error:', error);
            return this.getUserProfileLocal(userId);
        }
    }

    /**
     * Local user profile lookup
     */
    getUserProfileLocal(userId) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.id === parseInt(userId));

            if (user) {
                const { password, ...userWithoutPassword } = user;
                return {
                    success: true,
                    data: userWithoutPassword
                };
            }

            return {
                success: false,
                error: 'User not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to get profile'
            };
        }
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, updates) {
        try {
            const result = await this.makeRequest(`/users/${userId}`, 'PUT', updates);

            if (result.success) {
                // Update current user in localStorage if it's the same user
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (currentUser.id === userId) {
                    const updated = { ...currentUser, ...updates };
                    localStorage.setItem('currentUser', JSON.stringify(updated));
                }
                return result;
            }

            return this.updateUserProfileLocal(userId, updates);
        } catch (error) {
            console.error('Update profile error:', error);
            return this.updateUserProfileLocal(userId, updates);
        }
    }

    /**
     * Local user profile update
     */
    updateUserProfileLocal(userId, updates) {
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const index = users.findIndex(u => u.id === parseInt(userId));

            if (index !== -1) {
                users[index] = { ...users[index], ...updates };
                localStorage.setItem('users', JSON.stringify(users));

                // Update current user if applicable
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (currentUser.id === userId) {
                    localStorage.setItem('currentUser', JSON.stringify(users[index]));
                }

                const { password, ...userWithoutPassword } = users[index];
                return {
                    success: true,
                    message: 'Profile updated successfully',
                    data: userWithoutPassword
                };
            }

            return {
                success: false,
                error: 'User not found'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to update profile'
            };
        }
    }
}

// Make APIService available globally
window.APIService = APIService;
