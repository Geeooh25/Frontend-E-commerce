// API Configuration - SINGLE DECLARATION
const API_BASE_URL = 'http://localhost:5000/api'; 
const CURRENCY = '₦';
const DELIVERY_FEE = 0;

// Firebase Configuration - Using the modular SDK (v9+)
const firebaseConfig = {
    apiKey: "AIzaSyD0g5NGxzPrC98MFtTx4ZOePrHGGHqM0rU",
    authDomain: "beedaht-sweet-treats.firebaseapp.com",
    projectId: "beedaht-sweet-treats",
    storageBucket: "beedaht-sweet-treats.firebasestorage.app",
    messagingSenderId: "762048249430",
    appId: "1:762048249430:web:9e3b7c33dc517d6011c5f7",
    measurementId: "G-V1EF3K8JXX"
};

// Initialize Firebase properly
let firebaseAuth = null;
try {
    // Check if Firebase is already initialized
    if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    }
    firebaseAuth = firebase.auth();
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// State management
let cart = [];
let currentProduct = null;
let currentCombo = null;
let addOnsTotal = 0;
let comboAddOnsTotal = 0;
let quantity = 1;
let comboQuantity = 1;
let currentUser = null;
let token = localStorage.getItem('token');

// Product data (will be fetched from API)
let products = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadProducts();
    loadCartFromStorage();
    setupEventListeners();
});

// ==================== AUTHENTICATION FUNCTIONS ====================

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token and get user profile from backend
        fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                updateAuthUI(true);
            } else {
                localStorage.removeItem('token');
                updateAuthUI(false);
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            updateAuthUI(false);
        });
    } else {
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    console.log('Updating auth UI, logged in:', isLoggedIn);
    
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
    const mobileUserMenu = document.getElementById('mobile-user-menu');
    const mobileUserName = document.getElementById('mobile-user-name');
    const userNameEl = document.getElementById('user-name');
    
    if (isLoggedIn && currentUser) {
        // Desktop
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            if (userNameEl) userNameEl.textContent = currentUser.name.split(' ')[0];
        }
        
        // Mobile
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'none';
        if (mobileUserMenu) {
            mobileUserMenu.style.display = 'block';
            if (mobileUserName) mobileUserName.textContent = currentUser.name;
        }
    } else {
        // Desktop
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
        
        // Mobile
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'block';
        if (mobileUserMenu) mobileUserMenu.style.display = 'none';
    }
}

function openLoginModal() {
    
    const existingModal = document.getElementById('login-modal');
    if (existingModal) existingModal.remove();
    
    // Create login modal dynamically
    const modalHtml = `
        <div class="modal" id="login-modal" style="display: block;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Login</h2>
                    <button class="close-modal" onclick="closeModal('login-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="login-form" onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <label for="login-email">Email</label>
                            <input type="email" id="login-email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" class="form-control" required>
                        </div>
                        <div class="text-right">
                            <a href="javascript:void(0)" onclick="openForgotPasswordModal()" class="forgot-password">Forgot Password?</a>
                        </div>
                        <button type="submit" class="btn btn-full-width">Login</button>
                        <p style="text-align: center; margin-top: 15px;">
                            Don't have an account? <a href="#" onclick="openRegisterModal(); closeModal('login-modal');">Register</a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openRegisterModal() {
  
    const existingModal = document.getElementById('register-modal');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="modal" id="register-modal" style="display: block;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Register</h2>
                    <button class="close-modal" onclick="closeModal('register-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="register-form" onsubmit="handleRegister(event)">
                        <div class="form-group">
                            <label for="register-name">Full Name</label>
                            <input type="text" id="register-name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email</label>
                            <input type="email" id="register-email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="register-phone">Phone</label>
                            <input type="tel" id="register-phone" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password</label>
                            <input type="password" id="register-password" class="form-control" required minlength="6">
                        </div>
                        <button type="submit" class="btn btn-full-width">Register</button>
                        <p style="text-align: center; margin-top: 15px;">
                            Already have an account? <a href="#" onclick="openLoginModal(); closeModal('register-modal');">Login</a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
        
        // Sign in with Firebase
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();
        
        // Send token to your backend
        const response = await fetch(`${API_BASE_URL}/auth/firebase/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(true);
            closeModal('login-modal');
            showNotification('Login successful!', 'success');
            
            // Load user's cart from server 
            loadUserCart();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please try again.';
        
        // Handle Firebase specific errors
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection.';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        // Reset button state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = 'Login';
            submitBtn.disabled = false;
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value;
    
    // Validate inputs
    if (!name || !email || !phone || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Basic phone validation
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    submitBtn.disabled = true;
    
    try {
        console.log('Sending registration data:', { name, email, phone });
        
        const response = await fetch(`${API_BASE_URL}/auth/firebase/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, password })
        });
        
        const data = await response.json();
        console.log('Registration response:', data);
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(true);
            closeModal('register-modal');
            showNotification('Registration successful! Please check your email for verification.', 'success');
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function logout() {
    // Sign out from Firebase if available
    if (firebaseAuth) {
        firebaseAuth.signOut().then(() => {
            console.log('Signed out from Firebase');
        }).catch((error) => {
            console.error('Firebase signout error:', error);
        });
    }
    
    // Clear local storage and state
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI(false);
    cart = [];
    updateCartCount();
    saveCartToStorage();
    showNotification('Logged out successfully', 'info');
}

// ==================== PASSWORD RESET FUNCTIONS ====================

function openForgotPasswordModal() {
    console.log('Opening forgot password modal');
    
    // Close login modal if open
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.style.display = 'none';
        loginModal.remove();
    }
    
    // Remove any existing forgot password modal
    const existingModal = document.getElementById('forgot-password-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create the forgot password modal HTML
    const modalHtml = `
        <div class="modal" id="forgot-password-modal" style="display: block;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Reset Password</h2>
                    <button class="close-modal" onclick="closeModal('forgot-password-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="forgot-password-form" onsubmit="handleForgotPassword(event)">
                        <div class="form-group">
                            <label for="forgot-email">Email Address</label>
                            <input type="email" id="forgot-email" class="form-control" placeholder="Enter your email" required>
                        </div>
                        <button type="submit" class="btn btn-full-width">Send Reset Link</button>
                        <p style="text-align: center; margin-top: 15px;">
                            <a href="javascript:void(0)" onclick="openLoginModal()" style="color: var(--primary);">Back to Login</a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    console.log('Forgot password modal created');
}

async function handleForgotPassword(event) {
    event.preventDefault();
    console.log('Processing forgot password request');
    
    const emailInput = document.getElementById('forgot-email');
    if (!emailInput) {
        showNotification('Email input not found', 'error');
        return;
    }
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    try {
        // Firebase will handle the password reset email
        if (firebaseAuth) {
            await firebaseAuth.sendPasswordResetEmail(email);
            showNotification('Password reset email sent! Please check your inbox.', 'success');
        } else {
            // Fallback to backend if Firebase not available
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.success) {
                showNotification('Password reset email sent! Please check your inbox.', 'success');
            } else {
                throw new Error('Failed to send reset email');
            }
        }
        
        // Close modal after 2 seconds
        setTimeout(() => {
            closeModal('forgot-password-modal');
            openLoginModal();
        }, 2000);
        
    } catch (error) {
        console.error('Forgot password error:', error);
        showNotification('If this email is registered, a reset link will be sent.', 'info');
        setTimeout(() => {
            closeModal('forgot-password-modal');
            openLoginModal();
        }, 2000);
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ==================== PRODUCT FUNCTIONS ====================

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            console.log('Products loaded from API:', products);
            displayProducts(products.slice(0, 8));
            displayAdvancedProducts(products);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        // Fallback to static products if API fails
        products = getStaticProducts();
        console.log('Using static products:', products);
        displayProducts(products.slice(0, 8));
        displayAdvancedProducts(products);
    }
}

// Static product data as fallback (keeping your existing static products)
function getStaticProducts() {
    return [
        // Your existing static products array - keeping it as is
        { id: 1, name: "Meat Pie", category: "small-chops", price: 1000, image: "./IMAGE/MEAT PIE.jpg", description: "Flaky pastry filled with seasoned minced meat.", hasAddOns: false },
        { id: 2, name: "Snowcap Doughnut", category: "small-chops", price: 1500, image: "./IMAGE/snowcap doughnut new.jpg", description: "Nigerian ring dough filled with powdered sweet milk.", hasAddOns: false },
        { id: 3, name: "Puff Puff", category: "small-chops", price: 1000, image: "./IMAGE/FRESH PUFF PUFF.jpg", description: "Soft, fluffy Nigerian dough balls, lightly sweetened.", hasAddOns: false },
        // ... rest of your static products
    ];
}

// Display products in the gallery
function displayProducts(productsToShow) {
    const container = document.getElementById('products-container');
    if (!container) {
        console.error('Products container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    productsToShow.forEach(product => {
        // Log product to see structure (helpful for debugging)
        console.log('Displaying product:', product);
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Use _id for API products, fallback to id for static products
        const productId = product._id || product.id;
        
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            <div class="product-info">
                <span class="product-category">${formatCategory(product.category)}</span>
                <h3>${product.name}</h3>
                <p>${product.description ? product.description.substring(0, 60) : ''}${product.description && product.description.length > 60 ? '...' : ''}</p>
                <div class="product-price">
                    <span class="price">${CURRENCY}${product.price.toLocaleString()}</span>
                    <button class="btn" onclick="openProductModal('${productId}')">Add to Cart</button>
                </div>
            </div>
        `;
        container.appendChild(productCard);
    });
}

// Display products in advanced shopping
function displayAdvancedProducts(productsToShow) {
    const container = document.getElementById('advanced-products-container');
    if (!container) {
        console.error('Advanced products container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    productsToShow.forEach(product => {
        // Use _id for API products, fallback to id for static products
        const productId = product._id || product.id;
        
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
            <div class="product-info">
                <span class="product-category">${formatCategory(product.category)}</span>
                <h3>${product.name}</h3>
                <p>${product.description ? product.description.substring(0, 60) : ''}${product.description && product.description.length > 60 ? '...' : ''}</p>
                <div class="product-price">
                    <span class="price">${CURRENCY}${product.price.toLocaleString()}</span>
                    <button class="btn" onclick="openProductModal('${productId}')">Add to Cart</button>
                </div>
            </div>
        `;
        container.appendChild(productCard);
    });
}

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

// Filter products by category
function filterProducts(category) {
    // Update active filter button
    document.querySelectorAll('.filter-option').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    let filteredProducts;
    if (category === 'all') {
        filteredProducts = products;
    } else {
        filteredProducts = products.filter(product => product.category === category);
    }
    
    displayAdvancedProducts(filteredProducts);
    
    // Scroll to advanced shopping section
    document.getElementById('advanced-shop').scrollIntoView({ behavior: 'smooth' });
}

// Filter category from footer links
function filterCategory(category) {
    event.preventDefault();
    filterProducts(category);
}

// Filter products by price
function filterByPrice(priceRange) {
    let filteredProducts = [];
    
    switch(priceRange) {
        case 'under-2000':
            filteredProducts = products.filter(product => product.price < 2000);
            break;
        case '2000-5000':
            filteredProducts = products.filter(product => product.price >= 2000 && product.price <= 5000);
            break;
        case 'over-5000':
            filteredProducts = products.filter(product => product.price > 5000);
            break;
    }
    
    displayAdvancedProducts(filteredProducts);
}

// Sort products
function sortProducts() {
    const sortValue = document.getElementById('sort-products').value;
    let sortedProducts = [...products];
    
    switch(sortValue) {
        case 'price-low':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
    }
    
    displayAdvancedProducts(sortedProducts);
}

// ==================== CART FUNCTIONS ====================

async function loadUserCart() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/myorders`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('User orders:', data.orders);
        }
    } catch (error) {
        console.error('Error loading user cart:', error);
    }
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('beedahtCart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            cart = cart.map(item => ({
                ...item,
                isCombo: item.isCombo || false,
                addOns: item.addOns || '',
                addOnsTotal: item.addOnsTotal || 0
            }));
        } catch (e) {
            console.error('Error loading cart:', e);
            cart = [];
        }
    }
    updateCartCount();
}

// Add item to cart
async function addToCart() {
    if (!currentProduct) {
        showNotification('Please select a product first!', 'error');
        return;
    }
    
    console.log('Adding to cart:', currentProduct);
    
    let unitPrice = currentProduct.price + addOnsTotal;
    
    let addOnsDetails = [];
    if (document.getElementById('extra-chicken')?.checked) {
        addOnsDetails.push('Extra Chicken');
    }
    if (document.getElementById('extra-sauce')?.checked) {
        addOnsDetails.push('Extra Sauce');
    }
    if (document.getElementById('extra-cheese')?.checked) {
        addOnsDetails.push('Extra Cheese');
    }
    
    // Use _id for API products, fallback to id for static products
    const productId = currentProduct._id || currentProduct.id;
    
    const cartItem = {
        id: Date.now(),
        productId: productId,
        name: currentProduct.name,
        quantity: quantity,
        price: unitPrice,
        image: currentProduct.image,
        category: currentProduct.category,
        isCombo: false,
        addOns: addOnsDetails.length > 0 ? addOnsDetails.join(', ') : '',
        addOnsTotal: addOnsTotal
    };
    
    const existingItemIndex = cart.findIndex(item => 
        item.productId === cartItem.productId && 
        item.addOns === cartItem.addOns
    );
    
    if (existingItemIndex !== -1) {
        cart[existingItemIndex].quantity += quantity;
        showNotification(`${currentProduct.name} quantity updated in cart!`, 'success');
    } else {
        cart.push(cartItem);
        showNotification(`${currentProduct.name} added to cart!`, 'success');
    }
    
    // Track add to cart event for analytics
    trackAddToCart({
        id: productId,
        name: currentProduct.name,
        price: unitPrice,
        quantity: quantity
    });
    
    updateCartCount();
    updateCartDisplay();
    saveCartToStorage();
    closeModal('product-modal');
}

// Add combo to cart
function addComboToCart() {
    if (!currentCombo) {
        showNotification('Please select a combo first!', 'error');
        return;
    }
    
    let unitPrice = currentCombo.price + comboAddOnsTotal;
    
    let addOnsDetails = [];
    const checkboxes = document.querySelectorAll('#combo-add-ons input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        const label = checkbox.closest('.add-on-info')?.querySelector('label')?.textContent || 'Add-on';
        addOnsDetails.push(label);
    });
    
    const cartItem = {
        id: Date.now(),
        productId: 'combo-' + currentCombo.name.replace(/\s+/g, '-').toLowerCase(),
        name: currentCombo.name,
        quantity: comboQuantity,
        price: unitPrice,
        image: currentCombo.image,
        isCombo: true,
        addOns: addOnsDetails.length > 0 ? addOnsDetails.join(', ') : '',
        addOnsTotal: comboAddOnsTotal
    };
    
    const existingItemIndex = cart.findIndex(item => 
        item.productId === cartItem.productId && 
        item.addOns === cartItem.addOns
    );
    
    if (existingItemIndex !== -1) {
        cart[existingItemIndex].quantity += comboQuantity;
        showNotification(`${currentCombo.name} quantity updated in cart!`, 'success');
    } else {
        cart.push(cartItem);
        showNotification(`${currentCombo.name} added to cart!`, 'success');
    }
    
    updateCartCount();
    updateCartDisplay();
    saveCartToStorage();
    closeModal('combo-modal');
}

// Update cart count in header
function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        if (el) el.textContent = totalItems;
    });
}

// Update cart display in modal
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    
    if (!cartItemsContainer || !cartTotalElement) return;
    
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Your cart is empty</p>
                <a href="#products" class="btn" onclick="toggleCart()">Start Shopping</a>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-details">
                        ${item.isCombo ? '<span class="combo-badge">COMBO</span>' : ''}
                        ${item.addOns ? ` | ${item.addOns}` : ''}
                    </div>
                    <div class="cart-item-price">${CURRENCY}${itemTotal.toLocaleString()}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItemElement);
        });
    }
    
    cartTotalElement.textContent = total.toLocaleString();
}

// Update item quantity in cart
function updateQuantity(itemId, change) {
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    cart[itemIndex].quantity += change;
    
    if (cart[itemIndex].quantity <= 0) {
        const removedItem = cart.splice(itemIndex, 1)[0];
        showNotification(`${removedItem.name} removed from cart`);
    } else {
        showNotification(`${cart[itemIndex].name} quantity updated to ${cart[itemIndex].quantity}`);
    }
    
    updateCartCount();
    updateCartDisplay();
    saveCartToStorage();
}

// Remove item from cart
function removeFromCart(itemId) {
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;
    
    const removedItem = cart[itemIndex];
    cart.splice(itemIndex, 1);
    
    updateCartCount();
    updateCartDisplay();
    saveCartToStorage();
    
    showNotification(`${removedItem.name} removed from cart`, 'warning');
}

// Save cart to localStorage
function saveCartToStorage() {
    localStorage.setItem('beedahtCart', JSON.stringify(cart));
}

// Toggle cart modal
function toggleCart() {
    const cartModal = document.getElementById('cart-modal');
    if (!cartModal) return;
    
    if (cartModal.style.display === 'block') {
        cartModal.style.display = 'none';
    } else {
        updateCartDisplay();
        cartModal.style.display = 'block';
    }
}

// ==================== ORDER FUNCTIONS ====================

// Proceed to checkout
async function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    
    // Check if user is logged in
    if (!currentUser) {
        showNotification('Please login to checkout', 'warning');
        openLoginModal();
        return;
    }
    
    // Update checkout summary
    const checkoutSummary = document.getElementById('checkout-summary');
    const checkoutTotal = document.getElementById('checkout-total');
    
    if (!checkoutSummary || !checkoutTotal) return;
    
    checkoutSummary.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-details">
                    ${item.isCombo ? '<span class="combo-badge">COMBO</span>' : ''}
                    ${item.addOns ? `<br><small>${item.addOns}</small>` : ''}
                </div>
            </div>
            <div class="cart-item-price">
                ${CURRENCY}${itemTotal.toLocaleString()} (${item.quantity}x)
            </div>
        `;
        checkoutSummary.appendChild(itemElement);
    });
    
    checkoutTotal.textContent = total.toLocaleString();
    
    // Pre-fill user data
    const nameField = document.getElementById('checkout-name');
    const emailField = document.getElementById('checkout-email');
    const phoneField = document.getElementById('checkout-phone');
    const addressField = document.getElementById('checkout-address');
    
    if (nameField) nameField.value = currentUser.name || '';
    if (emailField) emailField.value = currentUser.email || '';
    if (phoneField) phoneField.value = currentUser.phone || '';
    
    if (addressField && currentUser.address) {
        addressField.value = 
            `${currentUser.address.street || ''}, ${currentUser.address.city || ''}, ${currentUser.address.state || ''}`;
    }
    
    // Show checkout modal
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    
    if (cartModal) cartModal.style.display = 'none';
    if (checkoutModal) checkoutModal.style.display = 'block';
}

// ==================== ORDER FUNCTIONS WITH PAYSTACK ====================

// Process order - handles both regular and Paystack payments
async function processOrder(event) {
    if (event) event.preventDefault();
    
    const name = document.getElementById('checkout-name')?.value;
    const email = document.getElementById('checkout-email')?.value;
    const phone = document.getElementById('checkout-phone')?.value;
    const addressText = document.getElementById('checkout-address')?.value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    
    if (!paymentMethod) {
        showNotification('Please select a payment method!', 'error');
        return;
    }
    
    // If Paystack is selected, use the Paystack payment flow
    if (paymentMethod === 'paystack') {
        await processPaystackPayment(name, email, phone, addressText);
        return;
    }
    
    // Otherwise, use your existing payment flow (cash on delivery, bank transfer, etc.)
    await processRegularOrder(name, email, phone, addressText, paymentMethod);
}

// Process regular (non-Paystack) orders
async function processRegularOrder(name, email, phone, addressText, paymentMethod) {
    // Parse address correctly
    const addressParts = addressText ? addressText.split(',').map(part => part.trim()) : [];
    
    const shippingAddress = {
        street: addressParts[0] || 'No address provided',
        city: addressParts[1] || 'Lagos',
        state: addressParts[2] || 'Lagos',
        zipCode: '',
        phone: phone || ''
    };
    
    // Prepare order items
    const orderItems = cart.map(item => ({
        product: item.isCombo ? item.productId : item.productId?.toString() || '',
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        addOns: item.addOns || '',
        isCombo: item.isCombo || false
    }));
    
    const itemsPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryPrice = DELIVERY_FEE;
    const totalPrice = itemsPrice + deliveryPrice;
    
    try {
        console.log('Creating regular order...');
        
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                orderItems,
                shippingAddress,
                paymentMethod: paymentMethod,
                itemsPrice,
                deliveryPrice,
                totalPrice
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Order placed successfully! We will contact you shortly.', 'success');
            
            // Clear cart
            cart = [];
            updateCartCount();
            saveCartToStorage();
            
            // Reset form and close modal
            const form = document.getElementById('checkout-form');
            if (form) form.reset();
            closeModal('checkout-modal');
        } else {
            showNotification(data.message || 'Order failed', 'error');
        }
    } catch (error) {
        console.error('Order error:', error);
        showNotification('Failed to place order. Please try again.', 'error');
    }
}

// Process Paystack payment
async function processPaystackPayment(name, email, phone, addressText) {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }

    if (!currentUser) {
        showNotification('Please login to checkout', 'warning');
        openLoginModal();
        return;
    }

    // Parse address
    const addressParts = addressText ? addressText.split(',').map(part => part.trim()) : [];
    const shippingAddress = {
        street: addressParts[0] || 'No address provided',
        city: addressParts[1] || 'Lagos',
        state: addressParts[2] || 'Lagos',
        phone: phone || ''
    };

    // Calculate total
    const itemsPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const totalPrice = itemsPrice + DELIVERY_FEE;

    // Prepare order items
    const orderItems = cart.map(item => ({
        product: item.isCombo ? item.productId : item.productId?.toString() || '',
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        addOns: item.addOns || '',
        isCombo: item.isCombo || false
    }));

    // Show loading
    showNotification('Creating your order...', 'info');

    try {
        // First create the order
        const orderResponse = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                orderItems,
                shippingAddress,
                paymentMethod: 'card',
                itemsPrice,
                deliveryPrice: DELIVERY_FEE,
                totalPrice
            })
        });

        const orderData = await orderResponse.json();
        console.log('Order created:', orderData);

        if (orderData.success) {
            // Initialize Paystack payment
            await initializePaystackPayment(
                orderData.order.totalPrice,
                currentUser.email,
                orderData.order._id
            );
        } else {
            showNotification(orderData.message || 'Failed to create order', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Checkout failed. Please try again.', 'error');
    }
}

// Initialize Paystack payment
async function initializePaystackPayment(amount, email, orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/payments/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ email, amount, orderId })
        });

        const data = await response.json();
        console.log('Payment initialization:', data);

        if (data.success) {
            // Redirect to Paystack payment page
            window.location.href = data.authorization_url;
        } else {
            showNotification(data.message || 'Payment initialization failed', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment failed. Please try again.', 'error');
    }
}

// Close checkout modal
function closeCheckout() {
    closeModal('checkout-modal');
}

// Select payment method
function selectPayment(method) {
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    const radio = document.getElementById(method);
    if (radio) radio.checked = true;
    
    // If Paystack is selected, you might want to show additional info
    if (method === 'paystack') {
        console.log('Paystack selected');
    }
}

// View my orders
async function viewMyOrders() {
    if (!currentUser) {
        showNotification('Please login to view your orders', 'warning');
        openLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/myorders`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            let ordersHtml = '<div class="orders-list">';
            if (data.orders.length === 0) {
                ordersHtml += '<p>No orders found</p>';
            } else {
                data.orders.forEach(order => {
                    ordersHtml += `
                        <div class="order-item">
                            <h4>Order #${order._id.slice(-6)}</h4>
                            <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
                            <p>Status: <span class="status-${order.orderStatus}">${order.orderStatus}</span></p>
                            <p>Total: ${CURRENCY}${order.totalPrice.toLocaleString()}</p>
                        </div>
                    `;
                });
            }
            ordersHtml += '</div>';
            
            showModal('My Orders', ordersHtml);
        }
    } catch (error) {
        showNotification('Failed to load orders', 'error');
    }
}

// ==================== MODAL FUNCTIONS ====================

// Open product detail modal - FIXED VERSION
function openProductModal(productId) {
    console.log('Looking for product with ID:', productId);
    
    // Try to find by _id (MongoDB) first, then fallback to id (static)
    const product = products.find(p => p._id == productId || p.id == productId);
    
    if (!product) {
        console.error('Product not found with ID:', productId);
        showNotification('Product not found!', 'error');
        return;
    }
    
    console.log('Found product:', product);
    currentProduct = product;
    addOnsTotal = 0;
    quantity = 1;
    
    const nameEl = document.getElementById('modal-product-name');
    const imgEl = document.getElementById('modal-product-img');
    const descEl = document.getElementById('modal-product-description');
    const priceEl = document.getElementById('modal-product-price');
    const qtyEl = document.getElementById('quantity-display');
    
    if (nameEl) nameEl.textContent = product.name;
    if (imgEl) imgEl.src = product.image;
    if (descEl) descEl.textContent = product.description || 'Delicious Nigerian treat';
    updateProductPriceDisplay();
    if (qtyEl) qtyEl.textContent = quantity;
    
    const addOnsSection = document.getElementById('add-ons-section');
    if (addOnsSection) {
        if (product.hasAddOns) {
            addOnsSection.classList.remove('hidden');
            const chicken = document.getElementById('extra-chicken');
            const sauce = document.getElementById('extra-sauce');
            const cheese = document.getElementById('extra-cheese');
            if (chicken) chicken.checked = false;
            if (sauce) sauce.checked = false;
            if (cheese) cheese.checked = false;
        } else {
            addOnsSection.classList.add('hidden');
        }
    }
    
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'block';
}

// Open combo detail modal with dynamic toppings
function openComboModal(name, price, image) {
    currentCombo = { name, price, image };
    comboAddOnsTotal = 0;
    comboQuantity = 1;
    
    const nameEl = document.getElementById('combo-modal-name');
    const imgEl = document.getElementById('combo-modal-img');
    const priceEl = document.getElementById('combo-modal-price');
    const qtyEl = document.getElementById('combo-quantity-display');
    
    if (nameEl) nameEl.textContent = name;
    if (imgEl) imgEl.src = image;
    updateComboPriceDisplay();
    if (qtyEl) qtyEl.textContent = comboQuantity;
    
    const addOnsContainer = document.getElementById('combo-add-ons');
    if (!addOnsContainer) return;
    
    addOnsContainer.innerHTML = '';
    
    let toppings = [];
    
    if (name.includes('Jollof') || name.includes('Fried Rice')) {
        toppings = [
            { id: 'extra-chicken', label: 'Extra Chicken', price: 1500 },
            { id: 'extra-beef', label: 'Extra Beef', price: 500 },
            { id: 'extra-fish', label: 'Extra Fish', price: 1500 },
            { id: 'extra-plantain', label: 'Extra Plantain', price: 400 },
            { id: 'extra-sauce', label: 'Extra Sauce', price: 300 }
        ];
    } else if (name.includes('Small Chops')) {
        toppings = [
            { id: 'extra-meat-kabab', label: 'Extra Meat Kabab', price: 1000 },
            { id: 'extra-puff-puff', label: 'Extra Puff Puff', price: 400 },
            { id: 'extra-samosa', label: 'Extra Samosa (3pcs)', price: 500 },
            { id: 'extra-springroll', label: 'Extra Spring Roll (3pcs)', price: 500 }
        ];
    } else if (name.includes('Doughnut')) {
        toppings = [
            { id: 'extra-doughnut', label: 'Extra Doughnut', price: 500 },
            { id: 'extra-puff-puff', label: 'Extra Puff Puff', price: 400 }
        ];
    } else if (name.includes('Ewa Agoyin')) {
        toppings = [
            { id: 'extra-meat', label: 'Extra Meat', price: 500 },
            { id: 'extra-egg', label: 'Extra Egg', price: 300 },
            { id: 'extra-plantain', label: 'Extra Plantain', price: 400 }
        ];
    } else if (name.includes('Spaghetti')) {
        toppings = [
            { id: 'extra-chicken', label: 'Extra Chicken', price: 1500 },
            { id: 'extra-egg', label: 'Extra Egg', price: 300 },
            { id: 'extra-fish', label: 'Extra Fish', price: 1500 }
        ];
    } else {
        toppings = [
            { id: 'extra-chicken', label: 'Extra Chicken', price: 1500 },
            { id: 'extra-plantain', label: 'Extra Plantain', price: 400 },
            { id: 'extra-sauce', label: 'Extra Sauce', price: 300 }
        ];
    }
    
    toppings.forEach(topping => {
        const addOnOption = document.createElement('div');
        addOnOption.className = 'add-on-option';
        addOnOption.innerHTML = `
            <div class="add-on-info">
                <input type="checkbox" id="combo-${topping.id}" onchange="updateComboAddOnPrice()">
                <label for="combo-${topping.id}">${topping.label} (+${CURRENCY}${topping.price.toLocaleString()})</label>
            </div>
            <span class="add-on-price">${CURRENCY}${topping.price.toLocaleString()}</span>
        `;
        addOnsContainer.appendChild(addOnOption);
    });
    
    const modal = document.getElementById('combo-modal');
    if (modal) modal.style.display = 'block';
}

// Show generic modal
function showModal(title, content) {
    const existingModal = document.getElementById('generic-modal');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="modal" id="generic-modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-modal" onclick="closeModal('generic-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close modal
function closeModal(modalId) {
    console.log('Closing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        setTimeout(() => {
            if (modal && modal.parentNode) {
                const staticModals = ['product-modal', 'combo-modal', 'cart-modal', 'checkout-modal', 'quick-order-modal'];
                if (staticModals.includes(modalId)) {
                    return;
                }
                modal.remove();
            }
        }, 300);
    }
}

// Increase product quantity
function increaseQuantity() {
    quantity++;
    const qtyEl = document.getElementById('quantity-display');
    if (qtyEl) qtyEl.textContent = quantity;
    updateProductPriceDisplay();
}

// Decrease product quantity
function decreaseQuantity() {
    if (quantity > 1) {
        quantity--;
        const qtyEl = document.getElementById('quantity-display');
        if (qtyEl) qtyEl.textContent = quantity;
        updateProductPriceDisplay();
    }
}

// Update product price display
function updateProductPriceDisplay() {
    if (currentProduct) {
        const basePrice = currentProduct.price;
        const totalPrice = (basePrice + addOnsTotal) * quantity;
        const priceEl = document.getElementById('modal-product-price');
        if (priceEl) priceEl.textContent = `${CURRENCY}${totalPrice.toLocaleString()}`;
    }
}

// Update add-on price calculation
function updateAddOnPrice() {
    addOnsTotal = 0;
    
    if (document.getElementById('extra-chicken')?.checked) {
        addOnsTotal += 800;
    }
    if (document.getElementById('extra-sauce')?.checked) {
        addOnsTotal += 300;
    }
    if (document.getElementById('extra-cheese')?.checked) {
        addOnsTotal += 500;
    }
    
    updateProductPriceDisplay();
}

// Increase combo quantity
function increaseComboQuantity() {
    comboQuantity++;
    const qtyEl = document.getElementById('combo-quantity-display');
    if (qtyEl) qtyEl.textContent = comboQuantity;
    updateComboPriceDisplay();
}

// Decrease combo quantity
function decreaseComboQuantity() {
    if (comboQuantity > 1) {
        comboQuantity--;
        const qtyEl = document.getElementById('combo-quantity-display');
        if (qtyEl) qtyEl.textContent = comboQuantity;
        updateComboPriceDisplay();
    }
}

// Update combo price display
function updateComboPriceDisplay() {
    if (currentCombo) {
        const basePrice = currentCombo.price;
        const totalPrice = (basePrice + comboAddOnsTotal) * comboQuantity;
        const priceEl = document.getElementById('combo-modal-price');
        if (priceEl) priceEl.textContent = `${CURRENCY}${totalPrice.toLocaleString()}`;
    }
}

// Update combo add-on price calculation
function updateComboAddOnPrice() {
    comboAddOnsTotal = 0;
    
    const checkboxes = document.querySelectorAll('#combo-add-ons input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const priceElement = checkbox.closest('.add-on-option')?.querySelector('.add-on-price');
            if (priceElement) {
                const priceText = priceElement.textContent.replace(/[₦,]/g, '');
                const price = parseInt(priceText);
                if (!isNaN(price)) {
                    comboAddOnsTotal += price;
                }
            }
        }
    });
    
    updateComboPriceDisplay();
}

// ==================== QUICK ORDER FUNCTIONS ====================

// Show quick order modal
function showOrderModal(type) {
    const modal = document.getElementById('quick-order-modal');
    const title = document.getElementById('quick-order-title');
    const message = document.getElementById('quick-order-message');
    
    if (type === 'pickup') {
        if (title) title.textContent = 'Store Pickup Order';
        if (message) message.textContent = 'Place your order for pickup at our bakery. We\'ll prepare it fresh for you.';
    } else if (type === 'delivery') {
        if (title) title.textContent = 'Home Delivery Order';
        if (message) message.textContent = 'Place your order for home delivery. We\'ll deliver it fresh to your doorstep.';
    }
    
    if (modal) modal.style.display = 'block';
}

// Show subscription modal
function showSubscriptionModal() {
    const modal = document.getElementById('quick-order-modal');
    const title = document.getElementById('quick-order-title');
    const message = document.getElementById('quick-order-message');
    
    if (title) title.textContent = 'Subscription Service';
    if (message) message.textContent = 'Sign up for our subscription service to get regular deliveries of your favorite treats.';
    
    if (modal) modal.style.display = 'block';
}

// Close quick order modal
function closeQuickOrder() {
    const modal = document.getElementById('quick-order-modal');
    if (modal) modal.style.display = 'none';
}

// Submit quick order
function submitQuickOrder() {
    const name = document.getElementById('quick-order-name')?.value;
    const phone = document.getElementById('quick-order-phone')?.value;
    const details = document.getElementById('quick-order-details')?.value;
    
    if (!name || !phone) {
        showNotification('Please fill in your name and phone number!', 'error');
        return;
    }
    
    showNotification('Order request submitted! We will contact you shortly.', 'success');
    
    const nameField = document.getElementById('quick-order-name');
    const phoneField = document.getElementById('quick-order-phone');
    const detailsField = document.getElementById('quick-order-details');
    
    if (nameField) nameField.value = '';
    if (phoneField) phoneField.value = '';
    if (detailsField) detailsField.value = '';
    
    closeQuickOrder();
}

// ==================== NOTIFICATION FUNCTIONS ====================

// Show notification
function showNotification(message, type = 'success') {
    document.querySelectorAll('.notification').forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '✗';
    if (type === 'warning') icon = '⚠';
    if (type === 'info') icon = 'ℹ';
    
    notification.innerHTML = `
        <span style="font-size: 1.2em;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ==================== PROFILE FUNCTIONS ====================

function viewProfile() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    console.log('Opening profile modal for user:', currentUser.name);
    
    const existingModal = document.getElementById('profile-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    let addressDisplay = 'Not provided';
    if (currentUser.address) {
        const parts = [
            currentUser.address.street || '',
            currentUser.address.city || '',
            currentUser.address.state || ''
        ].filter(p => p.trim() !== '');
        
        if (parts.length > 0) {
            addressDisplay = parts.join(', ');
        }
    }
    
    let memberSince = 'N/A';
    if (currentUser.createdAt) {
        memberSince = new Date(currentUser.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    const profileHtml = `
        <div class="modal" id="profile-modal" style="display: block;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-user-circle" style="margin-right: 10px; color: var(--primary);"></i>My Profile</h2>
                    <button class="close-modal" onclick="closeModal('profile-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 4rem; color: var(--primary);">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <h3 style="margin: 10px 0 5px; color: var(--text-dark);">${currentUser.name}</h3>
                        <p style="color: var(--text-medium); margin: 0;">${currentUser.role === 'admin' ? 'Administrator' : 'Customer'}</p>
                    </div>
                    
                    <div style="background: var(--neutral-light); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--neutral-medium);">
                            <i class="fas fa-envelope" style="width: 30px; color: var(--primary);"></i>
                            <div>
                                <div style="font-size: 0.85rem; color: var(--text-light);">Email</div>
                                <div style="font-weight: 500;">${currentUser.email}</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--neutral-medium);">
                            <i class="fas fa-phone" style="width: 30px; color: var(--primary);"></i>
                            <div>
                                <div style="font-size: 0.85rem; color: var(--text-light);">Phone</div>
                                <div style="font-weight: 500;">${currentUser.phone || 'Not provided'}</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: flex-start; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--neutral-medium);">
                            <i class="fas fa-map-marker-alt" style="width: 30px; color: var(--primary);"></i>
                            <div>
                                <div style="font-size: 0.85rem; color: var(--text-light);">Address</div>
                                <div style="font-weight: 500;">${addressDisplay}</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center;">
                            <i class="fas fa-calendar-alt" style="width: 30px; color: var(--primary);"></i>
                            <div>
                                <div style="font-size: 0.85rem; color: var(--text-light);">Member Since</div>
                                <div style="font-weight: 500;">${memberSince}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="openEditProfileModal()" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-edit"></i> Edit Profile
                        </button>
                        <button class="btn btn-outline" onclick="closeModal('profile-modal')" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', profileHtml);
}

function openEditProfileModal() {
    console.log('Opening edit profile modal');
    
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    closeModal('profile-modal');
    
    const existingModal = document.getElementById('edit-profile-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    let addressText = '';
    if (currentUser.address) {
        addressText = [
            currentUser.address.street || '',
            currentUser.address.city || '',
            currentUser.address.state || ''
        ].filter(p => p.trim() !== '').join(', ');
    }
    
    const editHtml = `
        <div class="modal" id="edit-profile-modal" style="display: block;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit" style="margin-right: 10px; color: var(--primary);"></i>Edit Profile</h2>
                    <button class="close-modal" onclick="closeModal('edit-profile-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="edit-profile-form" onsubmit="updateProfile(event)">
                        <div class="form-group">
                            <label for="edit-name">
                                <i class="fas fa-user" style="margin-right: 5px; color: var(--primary);"></i>Full Name
                            </label>
                            <input type="text" id="edit-name" class="form-control" value="${currentUser.name || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-email">
                                <i class="fas fa-envelope" style="margin-right: 5px; color: var(--primary);"></i>Email
                            </label>
                            <input type="email" id="edit-email" class="form-control" value="${currentUser.email || ''}" required>
                            <small style="color: var(--text-light); font-size: 0.8rem;">Changing email may require verification</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-phone">
                                <i class="fas fa-phone" style="margin-right: 5px; color: var(--primary);"></i>Phone
                            </label>
                            <input type="tel" id="edit-phone" class="form-control" value="${currentUser.phone || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-address">
                                <i class="fas fa-map-marker-alt" style="margin-right: 5px; color: var(--primary);"></i>Address
                            </label>
                            <input type="text" id="edit-address" class="form-control" value="${addressText}" placeholder="Street, City, State">
                            <small style="color: var(--text-light); font-size: 0.8rem;">Format: Street, City, State (e.g., 23 Allen Avenue, Ikeja, Lagos)</small>
                        </div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 25px;">
                            <button type="submit" class="btn" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" class="btn btn-outline" onclick="closeModal('edit-profile-modal')" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', editHtml);
}

async function updateProfile(event) {
    event.preventDefault();
    console.log('Updating profile...');
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const addressText = document.getElementById('edit-address').value.trim();
    
    if (!name || !email || !phone) {
        showNotification('Please fill in all required fields', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return;
    }
    
    const addressParts = addressText.split(',').map(p => p.trim());
    const address = {
        street: addressParts[0] || '',
        city: addressParts[1] || '',
        state: addressParts[2] || ''
    };
    
    try {
        console.log('Sending update request with data:', { name, email, phone, address });
        
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, email, phone, address })
        });
        
        const data = await response.json();
        console.log('Update response:', data);
        
        if (data.success) {
            currentUser = data.user;
            updateAuthUI(true);
            closeModal('edit-profile-modal');
            showNotification('Profile updated successfully!', 'success');
            setTimeout(() => {
                viewProfile();
            }, 500);
        } else {
            showNotification(data.message || 'Update failed', 'error');
        }
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Error updating profile. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ==================== SOCIAL SHARING FUNCTIONS ====================

function shareOnFacebook(url, text) {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

function shareOnTwitter(url, text) {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

function shareOnWhatsApp(url, text) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
}

// ==================== ANALYTICS FUNCTIONS ====================

// Track page views
function trackPageView(pageName) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            page_title: pageName,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
    }
}

// Track e-commerce events
function trackAddToCart(product) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'add_to_cart', {
            currency: 'NGN',
            value: product.price,
            items: [{
                item_id: product.id,
                item_name: product.name,
                price: product.price,
                quantity: product.quantity || 1
            }]
        });
    }
}

function trackPurchase(order) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'purchase', {
            transaction_id: order.id,
            value: order.total,
            currency: 'NGN',
            items: order.items.map(item => ({
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: item.quantity
            }))
        });
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('nav');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            nav.classList.toggle('active');
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (nav && nav.classList.contains('active') && 
            !nav.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            nav.classList.remove('active');
        }
    });
    
    // Close menu when clicking a link
    if (nav) {
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                nav.classList.remove('active');
            });
        });
    }
    
    // Checkout form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processOrder(e);
        });
    }
    
    // Newsletter form submission
    const newsletterBtn = document.querySelector('.newsletter-form button');
    if (newsletterBtn) {
        newsletterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const emailInput = document.querySelector('.newsletter-form input');
            if (emailInput && emailInput.value) {
                showNotification('Thank you for subscribing to our newsletter!', 'success');
                emailInput.value = '';
            } else {
                showNotification('Please enter your email address', 'error');
            }
        });
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetId = href;
                
                if (targetId === '#' || targetId === '') {
                    return;
                }
                
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    window.scrollTo({
                        top: targetSection.offsetTop - 80,
                        behavior: 'smooth'
                    });
                    
                    if (nav) nav.classList.remove('active');
                }
            }
        });
    });
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            closeModal(modalId);
        }
    };
}

// Helper functions for modal close (backward compatibility)
function closeComboModal() {
    closeModal('combo-modal');
}

function closeProductModal() {
    closeModal('product-modal');
}

// ==================== EXPOSE FUNCTIONS GLOBALLY ====================

// Make sure all functions are available globally
window.openLoginModal = openLoginModal;
window.openRegisterModal = openRegisterModal;
window.openForgotPasswordModal = openForgotPasswordModal;
window.closeModal = closeModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleForgotPassword = handleForgotPassword;
window.logout = logout;
window.toggleCart = toggleCart;
window.proceedToCheckout = proceedToCheckout;
window.closeCheckout = closeCheckout;
window.selectPayment = selectPayment;
window.viewProfile = viewProfile;
window.openEditProfileModal = openEditProfileModal;
window.updateProfile = updateProfile;
window.viewMyOrders = viewMyOrders;
window.showOrderModal = showOrderModal;
window.showSubscriptionModal = showSubscriptionModal;
window.closeQuickOrder = closeQuickOrder;
window.submitQuickOrder = submitQuickOrder;
window.filterProducts = filterProducts;
window.filterCategory = filterCategory;
window.filterByPrice = filterByPrice;
window.sortProducts = sortProducts;
window.openProductModal = openProductModal;
window.openComboModal = openComboModal;
window.addToCart = addToCart;
window.addComboToCart = addComboToCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.increaseComboQuantity = increaseComboQuantity;
window.decreaseComboQuantity = decreaseComboQuantity;
window.updateAddOnPrice = updateAddOnPrice;
window.updateComboAddOnPrice = updateComboAddOnPrice;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.closeComboModal = closeComboModal;
window.closeProductModal = closeProductModal;

// Expose new functions
window.initializePaystackPayment = initializePaystackPayment;
window.processPaystackPayment = processPaystackPayment;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.trackPageView = trackPageView;
window.trackAddToCart = trackAddToCart;
window.trackPurchase = trackPurchase;