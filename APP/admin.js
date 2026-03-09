// API Configuration
const API_BASE_URL = 'https://backend-e-commerce-production-b9b1.up.railway.app/api';
console.log('Admin JS loaded. API URL:', API_BASE_URL);

// State management
let currentUser = null;
let products = [];
let categories = [];
let orders = [];
let selectedFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin page DOM loaded');
    checkAdminAccess();
    loadDashboardStats();
    loadProducts();
    loadCategories();
    loadOrders();
    setupEventListeners();
    
    // Ensure products tab is active
    setTimeout(() => {
        switchTab('products');
    }, 500);
});

// ==================== AUTHENTICATION ====================

async function checkAdminAccess() {
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    // Check if we were redirected here after login
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
        // Clear it since we're already here
        sessionStorage.removeItem('redirectAfterLogin');
        console.log('Redirect URL cleared');
    }
    
    if (!token) {
        // Save the current page to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        showNotification('Please login first', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Auth response:', data);
        
        if (data.success) {
            currentUser = data.user;
            if (currentUser.role !== 'admin') {
                showNotification('Admin access required', 'error');
                setTimeout(() => window.location.href = 'index.html', 2000);
            } else {
                document.getElementById('admin-name').textContent = currentUser.name;
                console.log('Admin access granted');
            }
        } else {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showNotification('Authentication failed: ' + error.message, 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('redirectAfterLogin'); // Clear any saved redirect
    window.location.href = 'index.html';
}

// ==================== DASHBOARD STATS ====================

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dashboard stats:', data);
        
        if (data.success) {
            document.getElementById('total-products').textContent = data.stats.totalProducts || 0;
            document.getElementById('total-categories').textContent = categories.length || 0;
            document.getElementById('total-orders').textContent = data.stats.totalOrders || 0;
            document.getElementById('total-users').textContent = data.stats.totalUsers || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ==================== PRODUCTS MANAGEMENT ====================

async function loadProducts() {
    console.log('Loading products...');
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        console.log('Products response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Products data received:', data);
        
        if (data.success) {
            products = data.products || [];
            console.log('Products loaded:', products.length);
            displayProducts();
        } else {
            console.error('Failed to load products:', data.message);
            showNotification('Failed to load products: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products: ' + error.message, 'error');
        
        const tbody = document.getElementById('products-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 10px;"></i>
                        <p>Error loading products: ${error.message}</p>
                        <p>Make sure backend is running at ${API_BASE_URL}</p>
                        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

function displayProducts() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) {
        console.error('Products table body not found!');
        return;
    }
    
    console.log('Displaying products:', products.length);
    
    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 10px;"></i>
                    <p>No products found</p>
                    <button class="btn btn-primary" onclick="openAddProductModal()">Add Your First Product</button>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    products.forEach(product => {
        const productId = product._id || product.id;
        const stockQty = product.stockQuantity || 0;
        const price = product.price || 0;
        
        // Debug log to check product data
        console.log(`Product: ${product.name}, Price: ${price}, ID: ${productId}`);
        
        let stockClass = 'stock-high';
        let stockText = 'In Stock';
        
        if (stockQty === 0) {
            stockClass = 'stock-out';
            stockText = 'Out of Stock';
        } else if (stockQty <= 10) {
            stockClass = 'stock-low';
            stockText = 'Low Stock';
        }
        
        // Use online placeholder instead of local file
        const imageUrl = product.image || 'https://via.placeholder.com/300?text=No+Image';
        
        html += `
            <tr>
                <td>
                    <img src="${imageUrl}" alt="${product.name}" class="product-image" 
                         onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
                </td>
                <td>${product.name || 'Unnamed'}</td>
                <td>${formatCategory(product.category) || 'Uncategorized'}</td>
                <td>₦${Number(price).toLocaleString()}</td>
                <td>
                    <span class="stock-badge ${stockClass}">${stockQty}</span>
                </td>
                <td>
                    <span class="stock-badge ${stockClass}">${stockText}</span>
                </td>
                <td>
                    <div class="action-icons">
                        <i class="fas fa-eye action-icon view" onclick="viewProduct('${productId}')" title="View"></i>
                        <i class="fas fa-edit action-icon edit" onclick="openEditProductModal('${productId}')" title="Edit"></i>
                        <i class="fas fa-boxes action-icon" onclick="openStockModal('${productId}')" title="Update Stock"></i>
                        <i class="fas fa-trash action-icon delete" onclick="openDeleteModal('product', '${productId}')" title="Delete"></i>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    console.log('Products displayed');
}

// ==================== UPDATED CATEGORY SELECT FUNCTION ====================

async function loadCategorySelect(selectedCategory = '') {
    const select = document.getElementById('product-category');
    if (!select) return;
    
    // Clear existing options
    select.innerHTML = '<option value="">Select Category</option>';
    
    // load from API
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        
        if (data.success && data.categories && data.categories.length > 0) {
            console.log('Loading categories from database:', data.categories);
            // Use categories from database
            data.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1).replace('-', ' ');
                if (category.name === selectedCategory) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } else {
            console.log('No categories in database, using defaults');
            // Fallback to default categories if none in database
            const defaultCategories = [
                'small-chops', 'cakes', 'cookies', 'pastries', 'drinks', 'combos'
            ];
            defaultCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (cat === selectedCategory) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to default categories on error
        const defaultCategories = [
            'small-chops', 'cakes', 'cookies', 'pastries', 'drinks', 'combos'
        ];
        defaultCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (cat === selectedCategory) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
}

function openAddProductModal() {
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-preview').src = '';
    selectedFile = null;
    
    loadCategorySelect();
    document.getElementById('product-modal').style.display = 'block';
}

async function openEditProductModal(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = product._id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stockQuantity || 0;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-featured').checked = product.featured || false;
    document.getElementById('product-instock').checked = product.inStock !== false;
    
    if (product.image) {
        document.getElementById('image-preview').src = product.image;
        document.getElementById('image-preview').style.display = 'block';
    } else {
        document.getElementById('image-preview').src = 'https://via.placeholder.com/300?text=No+Image';
        document.getElementById('image-preview').style.display = 'block';
    }
    
    await loadCategorySelect(product.category);
    document.getElementById('product-modal').style.display = 'block';
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('image-preview').src = e.target.result;
            document.getElementById('image-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

document.getElementById('product-image')?.addEventListener('change', handleImageSelect);

async function saveProduct(event) {
    event.preventDefault();
    showLoading(true);
    
    const productId = document.getElementById('product-id').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('product-name').value);
    formData.append('category', document.getElementById('product-category').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('stockQuantity', document.getElementById('product-stock').value);
    formData.append('description', document.getElementById('product-description').value);
    formData.append('featured', document.getElementById('product-featured').checked);
    formData.append('inStock', document.getElementById('product-instock').checked);
    
    if (selectedFile) {
        formData.append('image', selectedFile);
    }
    
    try {
        const url = productId 
            ? `${API_BASE_URL}/products/${productId}`
            : `${API_BASE_URL}/products`;
        
        const response = await fetch(url, {
            method: productId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Product ${productId ? 'updated' : 'created'} successfully!`, 'success');
            closeModal('product-modal');
            loadProducts();
            loadDashboardStats();
        } else {
            showNotification(data.message || 'Failed to save product', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product', 'error');
    } finally {
        showLoading(false);
    }
}

function openStockModal(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    document.getElementById('stock-product-id').value = product._id;
    document.getElementById('stock-product-name').value = product.name;
    document.getElementById('current-stock').value = product.stockQuantity || 0;
    document.getElementById('new-stock').value = '';
    document.getElementById('stock-modal').style.display = 'block';
}

async function updateStock(event) {
    event.preventDefault();
    
    const productId = document.getElementById('stock-product-id').value;
    const newStock = document.getElementById('new-stock').value;
    
    if (!newStock || newStock < 0) {
        showNotification('Please enter a valid stock quantity', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/stock`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ stockQuantity: parseInt(newStock) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Stock updated successfully!', 'success');
            closeModal('stock-modal');
            loadProducts();
        } else {
            showNotification(data.message || 'Failed to update stock', 'error');
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        showNotification('Error updating stock', 'error');
    } finally {
        showLoading(false);
    }
}

function viewProduct(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const imageUrl = product.image || 'https://via.placeholder.com/300?text=No+Image';
    
    const details = `
        <div style="padding: 10px;">
            <img src="${imageUrl}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;" 
                 onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            <p><strong>Name:</strong> ${product.name}</p>
            <p><strong>Category:</strong> ${formatCategory(product.category)}</p>
            <p><strong>Price:</strong> ₦${product.price.toLocaleString()}</p>
            <p><strong>Stock:</strong> ${product.stockQuantity || 0}</p>
            <p><strong>Description:</strong> ${product.description}</p>
            <p><strong>Featured:</strong> ${product.featured ? 'Yes' : 'No'}</p>
            <p><strong>Status:</strong> ${product.inStock ? 'In Stock' : 'Out of Stock'}</p>
        </div>
    `;
    
    showCustomModal('Product Details', details);
}

// ==================== CATEGORIES MANAGEMENT ====================

async function loadCategories() {
    console.log('Loading categories...');
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        console.log('Categories response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Categories data received:', data);
        
        if (data.success) {
            categories = data.categories || [];
            console.log('Categories loaded:', categories.length);
            displayCategories();
        } else {
            console.error('Failed to load categories:', data.message);
            showNotification('Failed to load categories: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Error loading categories: ' + error.message, 'error');
    }
}

function displayCategories() {
    const container = document.getElementById('categories-container');
    if (!container) {
        console.error('Categories container not found!');
        return;
    }
    
    console.log('Displaying categories:', categories);
    
    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                <i class="fas fa-tags" style="font-size: 3rem; color: #ccc; margin-bottom: 10px;"></i>
                <p>No categories found</p>
                <button class="btn btn-primary" onclick="openAddCategoryModal()">Add Your First Category</button>
            </div>
        `;
        return;
    }
    
    let html = '';
    categories.forEach(category => {
        const categoryId = category._id || category.id;
        
        html += `
            <div class="category-card">
                <div class="category-info">
                    <h3>${category.name || 'Unnamed Category'}</h3>
                    <p>${category.description || 'No description'}</p>
                </div>
                <div class="category-actions">
                    <i class="fas fa-edit action-icon edit" onclick="openEditCategoryModal('${categoryId}')" title="Edit"></i>
                    <i class="fas fa-trash action-icon delete" onclick="openDeleteModal('category', '${categoryId}')" title="Delete"></i>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('Categories displayed');
}

function openAddCategoryModal() {
    document.getElementById('category-modal-title').textContent = 'Add New Category';
    document.getElementById('category-form').reset();
    document.getElementById('category-id').value = '';
    document.getElementById('category-modal').style.display = 'block';
}

async function openEditCategoryModal(categoryId) {
    const category = categories.find(c => c._id === categoryId);
    if (!category) return;
    
    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('category-id').value = category._id;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-description').value = category.description || '';
    document.getElementById('category-modal').style.display = 'block';
}

async function saveCategory(event) {
    event.preventDefault();
    showLoading(true);
    
    const categoryId = document.getElementById('category-id').value;
    const formData = new FormData();
    
    formData.append('name', document.getElementById('category-name').value);
    formData.append('description', document.getElementById('category-description').value);
    
    const file = document.getElementById('category-image').files[0];
    if (file) {
        formData.append('image', file);
    }
    
    try {
        const url = categoryId 
            ? `${API_BASE_URL}/categories/${categoryId}`
            : `${API_BASE_URL}/categories`;
        
        const response = await fetch(url, {
            method: categoryId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Category ${categoryId ? 'updated' : 'created'} successfully!`, 'success');
            closeModal('category-modal');
            loadCategories();
            loadDashboardStats();
        } else {
            showNotification(data.message || 'Failed to save category', 'error');
        }
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error saving category', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== ORDERS MANAGEMENT ====================

async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            orders = data.orders;
            displayOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #ccc; margin-bottom: 10px;"></i>
                    <p>No orders found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order._id.slice(-8).toUpperCase()}</td>
            <td>${order.user?.name || 'N/A'}</td>
            <td>₦${order.totalPrice.toLocaleString()}</td>
            <td>
                <select class="form-control" style="width: auto;" onchange="updateOrderStatus('${order._id}', this.value)">
                    <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.orderStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="preparing" ${order.orderStatus === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="ready" ${order.orderStatus === 'ready' ? 'selected' : ''}>Ready</option>
                    <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <i class="fas fa-eye action-icon view" onclick="viewOrderDetails('${order._id}')" title="View Details"></i>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, status) {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Order status updated', 'success');
            loadOrders();
        } else {
            showNotification(data.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Error updating order', 'error');
    } finally {
        showLoading(false);
    }
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    
    const itemsHtml = order.orderItems.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₦${item.price.toLocaleString()}</td>
            <td>₦${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('');
    
    const details = `
        <div style="padding: 10px;">
            <h3>Order #${order._id.slice(-8).toUpperCase()}</h3>
            <p><strong>Customer:</strong> ${order.user?.name || 'N/A'} (${order.user?.email || 'N/A'})</p>
            <p><strong>Phone:</strong> ${order.shippingAddress?.phone || 'N/A'}</p>
            <p><strong>Address:</strong> ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
            
            <h4 style="margin-top: 20px;">Order Items</h4>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 10px; text-align: left;">Item</th>
                        <th style="padding: 10px; text-align: left;">Qty</th>
                        <th style="padding: 10px; text-align: left;">Price</th>
                        <th style="padding: 10px; text-align: left;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                        <td style="padding: 10px;">₦${order.itemsPrice.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right;"><strong>Delivery:</strong></td>
                        <td style="padding: 10px;">₦${order.deliveryPrice.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                        <td style="padding: 10px;"><strong>₦${order.totalPrice.toLocaleString()}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    showCustomModal('Order Details', details);
}

// ==================== DELETE FUNCTIONALITY ====================

function openDeleteModal(type, id) {
    document.getElementById('delete-id').value = id;
    document.getElementById('delete-type').value = type;
    document.getElementById('delete-modal').style.display = 'block';
}

async function confirmDelete() {
    const id = document.getElementById('delete-id').value;
    const type = document.getElementById('delete-type').value;
    
    showLoading(true);
    
    try {
        const url = type === 'product' 
            ? `${API_BASE_URL}/products/${id}`
            : `${API_BASE_URL}/categories/${id}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`${type} deleted successfully!`, 'success');
            closeModal('delete-modal');
            if (type === 'product') {
                loadProducts();
            } else {
                loadCategories();
            }
            loadDashboardStats();
        } else {
            showNotification(data.message || `Failed to delete ${type}`, 'error');
        }
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        showNotification(`Error deleting ${type}`, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== TAB SWITCHING ====================

function switchTab(tab) {
    console.log('Switching to tab:', tab);
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    if (tab === 'products') {
        if (tabs[0]) tabs[0].classList.add('active');
        const productsTab = document.getElementById('products-tab');
        if (productsTab) {
            productsTab.classList.add('active');
            loadProducts();
        }
    } else if (tab === 'categories') {
        if (tabs[1]) tabs[1].classList.add('active');
        const categoriesTab = document.getElementById('categories-tab');
        if (categoriesTab) {
            categoriesTab.classList.add('active');
            loadCategories();
        }
    } else if (tab === 'orders') {
        if (tabs[2]) tabs[2].classList.add('active');
        const ordersTab = document.getElementById('orders-tab');
        if (ordersTab) {
            ordersTab.classList.add('active');
            loadOrders();
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatCategory(category) {
    const categories = {
        'small-chops': 'Small Chops',
        'cakes': 'Cakes',
        'cookies': 'Cookies',
        'pastries': 'Pastries',
        'drinks': 'Drinks',
        'combos': 'Combos'
    };
    return categories[category] || category;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showCustomModal(title, content) {
    const existing = document.getElementById('custom-modal');
    if (existing) existing.remove();
    
    const modalHtml = `
        <div class="modal" id="custom-modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-modal" onclick="closeModal('custom-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (modalId === 'custom-modal') {
            modal.remove();
        }
    }
}

function showNotification(message, type = 'success') {
    const existing = document.querySelectorAll('.notification');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '✗';
    if (type === 'warning') icon = '⚠';
    if (type === 'info') icon = 'ℹ';
    
    notification.innerHTML = `<span style="font-size: 1.2em;">${icon}</span><span>${message}</span>`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function setupEventListeners() {
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            closeModal(modalId);
        }
    };
}