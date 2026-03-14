// ==================== UNIFIED WISHLIST FUNCTIONS ====================

// Unified function to get wishlist status
async function getWishlistStatus() {
    if (!currentUser) return {};
    
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        if (data.success) {
            const status = {};
            data.wishlist.forEach(item => {
                // Handle both object IDs and string combo IDs
                const id = typeof item === 'object' ? item._id : item;
                status[id] = true;
            });
            return status;
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
    return {};
}

// Single function to create product cards
function createProductCard(product, wishlistStatus) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.style.position = 'relative';
    
    const productId = product._id || product.id;
    const inWishlist = wishlistStatus[productId] || false;
    
    let heartButton = '';
    if (currentUser) {
        heartButton = `
            <button class="wishlist-btn ${inWishlist ? 'active' : ''}" 
                    onclick="toggleWishlist('${productId}', this)" 
                    style="position: absolute; top: 10px; right: 10px; z-index: 10; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                <i class="${inWishlist ? 'fas' : 'far'} fa-heart" style="color: #ec4899; font-size: 18px;"></i>
            </button>
        `;
    }
    
    productCard.innerHTML = `
        ${heartButton}
        <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
        <div class="product-info">
            <span class="product-category">${formatCategory(product.category)}</span>
            <h3>${product.name}</h3>
            <p>${product.description ? product.description.substring(0, 60) : ''}${product.description && product.description.length > 60 ? '...' : ''}</p>
            <div class="product-price">
                <span class="price">${CURRENCY}${product.price?.toLocaleString() || 0}</span>
                <button class="btn" onclick="openProductModal('${productId}')">Add to Cart</button>
            </div>
        </div>
    `;
    
    return productCard;
}

// ==================== FIXED DISPLAY PRODUCTS WITH WISHLIST ====================
async function displayProducts(productsToShow) {
    const container = safeGetElement('products-container');
    if (!container) {
        console.error('Products container not found!');
        return;
    }
    
    console.log('Displaying products, currentUser:', currentUser ? 'logged in' : 'not logged in');
    
    container.innerHTML = '';
    
    // Get wishlist status using unified function
    const wishlistStatus = await getWishlistStatus();
    
    // Now display products using createProductCard
    productsToShow.forEach(product => {
        const productCard = createProductCard(product, wishlistStatus);
        safeAppendChild(container, productCard);
    });
    
    // After displaying products, also update combos with wishlist
    displayCombosWithWishlist();
}

// ==================== FIXED LOAD PRODUCTS ====================
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        
        if (data.success) {
            products = data.products;
            console.log('Products loaded from API:', products);
            
            // Wait a moment for auth to be checked, then display
            setTimeout(() => {
                displayProducts(products.slice(0, 8));
                displayAdvancedProducts(products);
            }, 500);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        products = getStaticProducts();
        setTimeout(() => {
            displayProducts(products.slice(0, 8));
            displayAdvancedProducts(products);
        }, 500);
    }
}

// API Configuration - SINGLE DECLARATION
const API_BASE_URL = 'https://backend-e-commerce-production-b9b1.up.railway.app/api'; 
const CURRENCY = '₦';
const DELIVERY_FEE = 1500;

// Combo prices constant for wishlist display
const COMBO_PRICES = {
    'jollof combo': 5000,
    'fried rice combo': 6000,
    'small chops combo': 5000,
    'doughnut combo': 3500,
    'milky doughnuts combo': 8500,
    'food tray combo': 100000,
    'ponmo garnished vegetable': 2000,
    'spaghetti': 4000,
    'ewa agoyin': 1500
};

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
let selectedDeliveryMethod = 'delivery';

// Product data (will be fetched from API)
let products = [];

// ==================== SAFE DOM MANIPULATION HELPER ====================
function safeInsertBefore(parent, newNode, referenceNode) {
    if (!parent || !document.body.contains(parent)) {
        console.warn('Parent element not found or not in DOM');
        return false;
    }
    
    if (!referenceNode || !parent.contains(referenceNode)) {
        parent.appendChild(newNode);
        return true;
    }
    
    parent.insertBefore(newNode, referenceNode);
    return true;
}

function safeAppendChild(parent, child) {
    if (parent && document.body.contains(parent)) {
        parent.appendChild(child);
        return true;
    }
    console.warn('Parent element not found or not in DOM');
    return false;
}

function safeRemoveElement(element) {
    if (element && element.parentNode && document.body.contains(element)) {
        element.remove();
        return true;
    }
    return false;
}

function safeGetElement(id) {
    const element = document.getElementById(id);
    if (element && document.body.contains(element)) {
        return element;
    }
    return null;
}

// ==================== INITIALIZATION ====================
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
                updateWishlistCount();
                
                // CRITICAL: Refresh products to show wishlist hearts
                if (products.length > 0) {
                    displayProducts(products.slice(0, 8));
                    displayAdvancedProducts(products);
                    displayCombosWithWishlist();
                }
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

// ==================== PASSWORD TOGGLE FUNCTION ====================
function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// ==================== GOOGLE SIGN-IN FUNCTION ====================
async function handleGoogleSignIn() {
    try {
        if (!firebaseAuth) {
            console.error('Firebase Auth not available');
            showNotification('Authentication service unavailable', 'error');
            return;
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        
        provider.addScope('profile');
        provider.addScope('email');
        
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        showNotification('Opening Google sign-in...', 'info');
        
        const result = await firebaseAuth.signInWithPopup(provider);
        
        const user = result.user;
        
        const idToken = await user.getIdToken();
        
        showNotification('Completing sign-in...', 'info');
        
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
            updateWishlistCount();
            
            closeModal('login-modal');
            closeModal('register-modal');
            
            showNotification(`Welcome, ${user.displayName || 'User'}!`, 'success');
            
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            }
            
            loadUserCart();
            
            if (products.length > 0) {
                displayProducts(products.slice(0, 8));
                displayAdvancedProducts(products);
                displayCombosWithWishlist();
            }
        } else {
            showNotification(data.message || 'Google sign-in failed', 'error');
        }
        
    } catch (error) {
        let errorMessage = 'Google sign-in failed. ';
        
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in cancelled. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'An account already exists with the same email address. Please login with your password.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'Sign-in cancelled. Please try again.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection.';
        } else {
            errorMessage += error.message || 'Unknown error occurred';
        }
        
        showNotification(errorMessage, 'error');
    }
}

function updateAuthUI(isLoggedIn) {
    console.log('Updating auth UI, logged in:', isLoggedIn);
    
    const authButtons = safeGetElement('auth-buttons');
    const userProfile = safeGetElement('user-profile');
    const mobileAuthButtons = safeGetElement('mobile-auth-buttons');
    const mobileUserMenu = safeGetElement('mobile-user-menu');
    const mobileUserName = safeGetElement('mobile-user-name');
    const userNameEl = safeGetElement('user-name');
    
    if (isLoggedIn && currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            if (userNameEl) userNameEl.textContent = currentUser.name.split(' ')[0];
        }
        
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'none';
        if (mobileUserMenu) {
            mobileUserMenu.style.display = 'block';
            if (mobileUserName) mobileUserName.textContent = currentUser.name;
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
        
        if (mobileAuthButtons) mobileAuthButtons.style.display = 'block';
        if (mobileUserMenu) mobileUserMenu.style.display = 'none';
    }
}

function openLoginModal() {
    const existingModal = safeGetElement('login-modal');
    if (existingModal) safeRemoveElement(existingModal);
    
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
                        <div class="form-group password-field">
                            <label for="login-password">Password</label>
                            <div style="position: relative;">
                                <input type="password" id="login-password" class="form-control" required style="padding-right: 40px;">
                                <i class="fas fa-eye password-toggle" onclick="togglePasswordVisibility('login-password', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #999;"></i>
                            </div>
                        </div>
                        <div class="text-right">
                            <a href="javascript:void(0)" onclick="openForgotPasswordModal()" class="forgot-password">Forgot Password?</a>
                        </div>
                        <button type="submit" class="btn btn-full-width">Login</button>
                    </form>
                    
                    <div class="divider" style="text-align: center; margin: 20px 0; position: relative;">
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0;">
                        <span style="position: relative; top: -12px; background: white; padding: 0 10px; color: #999; font-size: 14px;">OR</span>
                    </div>
                    
                    <button onclick="handleGoogleSignIn()" class="btn btn-google" style="width: 100%; padding: 12px; background: white; border: 2px solid #4285f4; color: #4285f4; border-radius: 8px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;">
                        <i class="fab fa-google" style="color: #4285f4;"></i> Sign in with Google
                    </button>
                    
                    <p style="text-align: center; margin-top: 15px;">
                        Don't have an account? <a href="#" onclick="openRegisterModal(); closeModal('login-modal');">Register</a>
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openRegisterModal() {
    const existingModal = safeGetElement('register-modal');
    if (existingModal) safeRemoveElement(existingModal);
    
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
                        <div class="form-group password-field">
                            <label for="register-password">Password</label>
                            <div style="position: relative;">
                                <input type="password" id="register-password" class="form-control" required minlength="6" style="padding-right: 40px;">
                                <i class="fas fa-eye password-toggle" onclick="togglePasswordVisibility('register-password', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #999;"></i>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-full-width">Register</button>
                    </form>
                    
                    <div class="divider" style="text-align: center; margin: 20px 0; position: relative;">
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0;">
                        <span style="position: relative; top: -12px; background: white; padding: 0 10px; color: #999; font-size: 14px;">OR</span>
                    </div>
                    
                    <button onclick="handleGoogleSignIn()" class="btn btn-google" style="width: 100%; padding: 12px; background: white; border: 2px solid #4285f4; color: #4285f4; border-radius: 8px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;">
                        <i class="fab fa-google" style="color: #4285f4;"></i> Sign up with Google
                    </button>
                    
                    <p style="text-align: center; margin-top: 15px;">
                        Already have an account? <a href="#" onclick="openLoginModal(); closeModal('register-modal');">Login</a>
                    </p>
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
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
        
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const idToken = await userCredential.user.getIdToken();
        
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
            updateWishlistCount();
            closeModal('login-modal');
            showNotification('Login successful!', 'success');
            
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            }
            
            loadUserCart();
            
            if (products.length > 0) {
                displayProducts(products.slice(0, 8));
                displayAdvancedProducts(products);
                displayCombosWithWishlist();
            }
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        let errorMessage = 'Login failed. Please try again.';
        
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
    
    if (!name || !email || !phone || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
        showNotification('Please enter a valid phone number', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/firebase/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(true);
            updateWishlistCount();
            closeModal('register-modal');
            showNotification('Registration successful! Please check your email for verification.', 'success');
            
            if (products.length > 0) {
                displayProducts(products.slice(0, 8));
                displayAdvancedProducts(products);
                displayCombosWithWishlist();
            }
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
    if (firebaseAuth) {
        firebaseAuth.signOut().then(() => {
            console.log('Signed out from Firebase');
        }).catch((error) => {
            console.error('Firebase signout error:', error);
        });
    }
    
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI(false);
    cart = [];
    updateCartCount();
    saveCartToStorage();
    showNotification('Logged out successfully', 'info');
    
    if (products.length > 0) {
        displayProducts(products.slice(0, 8));
        displayAdvancedProducts(products);
        displayCombosWithWishlist();
    }
}

// ==================== PASSWORD RESET FUNCTIONS ====================

function openForgotPasswordModal() {
    const loginModal = safeGetElement('login-modal');
    if (loginModal) {
        loginModal.style.display = 'none';
        safeRemoveElement(loginModal);
    }
    
    const existingModal = safeGetElement('forgot-password-modal');
    if (existingModal) {
        safeRemoveElement(existingModal);
    }
    
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
}

async function handleForgotPassword(event) {
    event.preventDefault();
    
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
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    try {
        if (firebaseAuth) {
            await firebaseAuth.sendPasswordResetEmail(email);
            showNotification('Password reset email sent! Please check your inbox.', 'success');
        } else {
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
        
        setTimeout(() => {
            closeModal('forgot-password-modal');
            openLoginModal();
        }, 2000);
        
    } catch (error) {
        showNotification('If this email is registered, a reset link will be sent.', 'info');
        setTimeout(() => {
            closeModal('forgot-password-modal');
            openLoginModal();
        }, 2000);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ==================== PRODUCT FUNCTIONS ====================

// ==================== FIXED ADVANCED PRODUCTS WITH WISHLIST ====================
async function displayAdvancedProducts(productsToShow) {
    const container = safeGetElement('advanced-products-container');
    if (!container) {
        console.error('Advanced products container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    const wishlistStatus = await getWishlistStatus();
    
    productsToShow.forEach(product => {
        const productCard = createProductCard(product, wishlistStatus);
        safeAppendChild(container, productCard);
    });
}

// ==================== FIXED COMBO WISHLIST ====================
function displayCombosWithWishlist() {
    if (!currentUser) return;
    
    const comboContainers = document.querySelectorAll('.combo-card');
    if (!comboContainers.length) return;
    
    fetch(`${API_BASE_URL}/wishlist`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const wishlistIds = new Set();
            data.wishlist.forEach(item => {
                const id = typeof item === 'object' ? item._id : item;
                wishlistIds.add(id);
            });
            
            comboContainers.forEach(comboCard => {
                const viewButton = comboCard.querySelector('button[onclick^="openComboModal"]');
                if (!viewButton) return;
                
                const onclickAttr = viewButton.getAttribute('onclick');
                const matches = onclickAttr.match(/'([^']+)'/g);
                if (!matches || matches.length < 2) return;
                
                const comboName = matches[0].replace(/'/g, '');
                const comboPrice = matches[1] ? parseInt(matches[1].replace(/'/g, '')) : 0;
                
                const comboId = `combo-${comboName.toLowerCase().replace(/\s+/g, '-')}`;
                
                const inWishlist = wishlistIds.has(comboId);
                
                const existingHeart = comboCard.querySelector('.wishlist-btn');
                if (existingHeart) existingHeart.remove();
                
                const heartButton = document.createElement('button');
                heartButton.className = `wishlist-btn ${inWishlist ? 'active' : ''}`;
                heartButton.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;';
                heartButton.innerHTML = `<i class="${inWishlist ? 'fas' : 'far'} fa-heart" style="color: #ec4899; font-size: 18px;"></i>`;
                
                heartButton.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleComboWishlist(comboId, comboName, comboPrice, heartButton);
                };
                
                comboCard.style.position = 'relative';
                comboCard.appendChild(heartButton);
            });
        }
    })
    .catch(error => console.error('Error loading wishlist for combos:', error));
}

// ==================== TOGGLE COMBO WISHLIST ====================
async function toggleComboWishlist(comboId, comboName, comboPrice, button) {
    if (!currentUser) {
        showNotification('Please login to save items to wishlist', 'warning');
        openLoginModal();
        return;
    }
    
    const icon = button.querySelector('i');
    const isAdding = icon.classList.contains('far');
    
    try {
        if (isAdding) {
            const response = await fetch(`${API_BASE_URL}/wishlist/add/${comboId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                button.classList.add('active');
                showNotification(`"${comboName}" added to wishlist! ❤️`, 'success');
                updateWishlistCount();
            } else {
                showNotification(data.message || 'Failed to add to wishlist', 'error');
            }
        } else {
            const response = await fetch(`${API_BASE_URL}/wishlist/remove/${comboId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.classList.remove('active');
                showNotification(`"${comboName}" removed from wishlist`, 'info');
                updateWishlistCount();
            }
        }
    } catch (error) {
        console.error('Combo wishlist error:', error);
        showNotification('Error updating wishlist', 'error');
    }
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

function filterProducts(category) {
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
    const advancedShop = safeGetElement('advanced-shop');
    if (advancedShop) {
        advancedShop.scrollIntoView({ behavior: 'smooth' });
    }
}

function filterCategory(category) {
    event.preventDefault();
    filterProducts(category);
}

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

// ==================== WISHLIST FUNCTIONS ====================

async function checkWishlistStatus(productId) {
    if (!currentUser) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist/check/${productId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        return data.success ? data.inWishlist : false;
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return false;
    }
}

async function toggleWishlist(productId, button) {
    if (!currentUser) {
        showNotification('Please login to save items to wishlist', 'warning');
        openLoginModal();
        return;
    }
    
    const icon = button.querySelector('i');
    const isAdding = icon.classList.contains('far');
    
    try {
        if (isAdding) {
            const response = await fetch(`${API_BASE_URL}/wishlist/add/${productId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                button.classList.add('active');
                showNotification('Added to wishlist! ❤️', 'success');
                updateWishlistCount();
                
                displayCombosWithWishlist();
            }
        } else {
            const response = await fetch(`${API_BASE_URL}/wishlist/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.classList.remove('active');
                showNotification('Removed from wishlist', 'info');
                updateWishlistCount();
                
                displayCombosWithWishlist();
            }
        }
    } catch (error) {
        console.error('Wishlist toggle error:', error);
        showNotification('Error updating wishlist', 'error');
    }
}

async function updateWishlistCount() {
    const wishlistCountEl = document.getElementById('wishlist-count');
    if (!wishlistCountEl) return;
    
    if (!currentUser) {
        wishlistCountEl.textContent = '0';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            wishlistCountEl.textContent = data.wishlist.length;
        }
    } catch (error) {
        console.error('Error updating wishlist count:', error);
    }
}

// ==================== UPDATED WISHLIST DISPLAY ====================
async function displayWishlistItems() {
    if (!currentUser) {
        showNotification('Please login to view wishlist', 'warning');
        openLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const wishlist = data.wishlist;
            
            const modalHtml = `
                <div class="modal" id="wishlist-modal" style="display: block;">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-heart" style="color: #ec4899;"></i> My Wishlist</h2>
                            <button class="close-modal" onclick="closeModal('wishlist-modal')">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="wishlist-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                                ${wishlist.length === 0 ? 
                                    '<p style="grid-column: 1/-1; text-align: center;">Your wishlist is empty</p>' : 
                                    wishlist.map(item => {
                                        if (typeof item === 'string' && item.startsWith('combo-')) {
                                            return displayComboInWishlist(item);
                                        } else {
                                            return displayProductInWishlist(item);
                                        }
                                    }).join('')
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

// Helper for displaying combos in wishlist
function displayComboInWishlist(comboId) {
    const comboName = comboId.replace('combo-', '').replace(/-/g, ' ');
    
    const price = Object.entries(COMBO_PRICES).find(([key]) => 
        comboName.toLowerCase().includes(key)
    )?.[1] || 5000;
    
    return `
        <div class="wishlist-item" data-id="${comboId}">
            <img src="./IMAGE/${comboName.toUpperCase().replace(/ /g, '_')}.jpg" 
                 alt="${comboName}" 
                 style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"
                 onerror="this.src='https://via.placeholder.com/200?text=Combo'">
            <h4 style="margin: 10px 0 5px; text-transform: capitalize;">${comboName}</h4>
            <p style="color: #ec4899; font-weight: bold; margin-bottom: 10px;">₦${price.toLocaleString()}</p>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-primary" style="flex: 1; padding: 8px;" 
                        onclick="openComboModal('${comboName}', ${price}, './IMAGE/${comboName.toUpperCase().replace(/ /g, '_')}.jpg')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-outline" style="padding: 8px;" 
                        onclick="removeFromWishlist('${comboId}', this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Helper for displaying products in wishlist
function displayProductInWishlist(product) {
    return `
        <div class="wishlist-item" data-id="${product._id}">
            <img src="${product.image || 'https://via.placeholder.com/200'}" 
                 alt="${product.name}" 
                 style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
            <h4 style="margin: 10px 0 5px;">${product.name}</h4>
            <p style="color: #ec4899; font-weight: bold; margin-bottom: 10px;">₦${product.price?.toLocaleString() || 0}</p>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-primary" style="flex: 1; padding: 8px;" 
                        onclick="addToCartFromWishlist('${product._id}')">
                    <i class="fas fa-cart-plus"></i>
                </button>
                <button class="btn btn-outline" style="padding: 8px;" 
                        onclick="removeFromWishlist('${product._id}', this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Load wishlist page (alias for displayWishlistItems for backward compatibility)
async function loadWishlistPage() {
    await displayWishlistItems();
}

async function addToCartFromWishlist(productId) {
    const product = products.find(p => p._id === productId || p.id === productId);
    if (product) {
        currentProduct = product;
        quantity = 1;
        addOnsTotal = 0;
        await addToCart();
        closeModal('wishlist-modal');
    }
}

async function removeFromWishlist(productId, button) {
    try {
        const response = await fetch(`${API_BASE_URL}/wishlist/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const item = button.closest('.wishlist-item');
            item.remove();
            showNotification('Removed from wishlist', 'info');
            
            updateWishlistCount();
            
            const grid = document.querySelector('.wishlist-grid');
            if (grid && grid.children.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Your wishlist is empty</p>';
            }
            
            if (products.length > 0) {
                displayProducts(products.slice(0, 8));
                displayAdvancedProducts(products);
                displayCombosWithWishlist();
            }
        }
    } catch (error) {
        console.error('Error removing from wishlist:', error);
    }
}

// Static product data as fallback
function getStaticProducts() {
    return [
        { id: 1, name: "Meat Pie", category: "small-chops", price: 1000, image: "./IMAGE/MEAT PIE.jpg", description: "Flaky pastry filled with seasoned minced meat.", hasAddOns: false },
        { id: 2, name: "Snowcap Doughnut", category: "small-chops", price: 1500, image: "./IMAGE/snowcap doughnut new.jpg", description: "Nigerian ring dough filled with powdered sweet milk.", hasAddOns: false },
        { id: 3, name: "Puff Puff", category: "small-chops", price: 1000, image: "./IMAGE/FRESH PUFF PUFF.jpg", description: "Soft, fluffy Nigerian dough balls, lightly sweetened.", hasAddOns: false }
    ];
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

async function addToCart() {
    if (!currentProduct) {
        showNotification('Please select a product first!', 'error');
        return;
    }
    
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

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        if (el) el.textContent = totalItems;
    });
}

function updateCartDisplay() {
    const cartItemsContainer = safeGetElement('cart-items');
    const cartTotalElement = safeGetElement('cart-total');
    
    if (!cartItemsContainer || !cartTotalElement) return;
    
    cartItemsContainer.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
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
        safeAppendChild(cartItemsContainer, cartItemElement);
    });
    
    let delivery = { fee: 0, message: 'Delivery: ₦0' };
    
    const savedMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
    selectedDeliveryMethod = savedMethod;
    
    if (selectedDeliveryMethod === 'pickup') {
        delivery.fee = 0;
        delivery.message = 'Store Pickup: FREE';
    } else {
        if (typeof deliveryService !== 'undefined') {
            delivery = deliveryService.calculateFee(subtotal);
        } else {
            delivery.fee = DELIVERY_FEE;
            delivery.message = `Delivery Fee: ₦${DELIVERY_FEE}`;
        }
    }
    
    const total = subtotal + delivery.fee;
    
    let deliveryInfoEl = safeGetElement('delivery-info');
    if (!deliveryInfoEl) {
        const cartFooter = document.querySelector('.cart-footer') || cartItemsContainer.parentNode;
        if (cartFooter) {
            deliveryInfoEl = document.createElement('div');
            deliveryInfoEl.id = 'delivery-info';
            deliveryInfoEl.className = 'delivery-info';
            safeAppendChild(cartFooter, deliveryInfoEl);
        }
    }
    
    if (deliveryInfoEl) {
        let bannerHtml = '';
        if (typeof deliveryService !== 'undefined' && deliveryService.getDeliveryBannerHTML) {
            bannerHtml = deliveryService.getDeliveryBannerHTML(subtotal);
        }
        
        const deliverySelector = `
            <div class="delivery-method-selector" style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Delivery Method:</label>
                <div style="display: flex; gap: 15px;">
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="radio" name="deliveryMethod" value="delivery" ${selectedDeliveryMethod === 'delivery' ? 'checked' : ''} onchange="setDeliveryMethod('delivery')"> Home Delivery
                    </label>
                    <label style="display: flex; align-items: center; gap: 5px;">
                        <input type="radio" name="deliveryMethod" value="pickup" ${selectedDeliveryMethod === 'pickup' ? 'checked' : ''} onchange="setDeliveryMethod('pickup')"> Store Pickup
                    </label>
                </div>
            </div>
        `;
        
        deliveryInfoEl.innerHTML = `
            ${deliverySelector}
            <div class="delivery-summary">
                <div class="delivery-row">
                    <span>Subtotal:</span>
                    <span>${CURRENCY}${subtotal.toLocaleString()}</span>
                </div>
                <div class="delivery-row">
                    <span>${delivery.message}</span>
                    <span>${delivery.fee === 0 ? 'FREE' : CURRENCY + delivery.fee.toLocaleString()}</span>
                </div>
                ${bannerHtml}
            </div>
        `;
    }
    
    cartTotalElement.textContent = total.toLocaleString();
}

function setDeliveryMethod(method) {
    selectedDeliveryMethod = method;
    sessionStorage.setItem('deliveryMethod', method);
    updateCartDisplay();
}

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

function saveCartToStorage() {
    localStorage.setItem('beedahtCart', JSON.stringify(cart));
}

function toggleCart() {
    const cartModal = safeGetElement('cart-modal');
    if (!cartModal) return;
    
    if (cartModal.style.display === 'block') {
        cartModal.style.display = 'none';
    } else {
        updateCartDisplay();
        cartModal.style.display = 'block';
    }
}

// ==================== ORDER FUNCTIONS ====================

async function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    
    if (!currentUser) {
        showNotification('Please login to checkout', 'warning');
        openLoginModal();
        return;
    }
    
    const checkoutSummary = safeGetElement('checkout-summary');
    const checkoutTotal = safeGetElement('checkout-total');
    
    if (!checkoutSummary || !checkoutTotal) {
        console.error('Checkout elements not found');
        return;
    }
    
    checkoutSummary.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
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
        safeAppendChild(checkoutSummary, itemElement);
    });
    
    if (typeof deliveryService !== 'undefined') {
        const checkoutModal = safeGetElement('checkout-modal');
        if (checkoutModal) {
            const checkoutBody = checkoutModal.querySelector('.modal-body');
            
            if (checkoutBody && document.body.contains(checkoutBody)) {
                const existingSection = safeGetElement('delivery-section');
                if (existingSection && existingSection.parentNode) {
                    safeRemoveElement(existingSection);
                }
                
                const savedMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
                
                const deliverySection = document.createElement('div');
                deliverySection.id = 'delivery-section';
                
                const deliveryHtml = `
                    <div class="form-group form-row">
                        <h3>Delivery Method</h3>
                        <div class="delivery-options" style="margin-bottom: 20px;">
                            <div class="delivery-option" onclick="selectDeliveryMethod('delivery')" style="border: 2px solid ${savedMethod === 'delivery' ? '#FFB88C' : '#e0e0e0'}; padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: pointer; background: ${savedMethod === 'delivery' ? '#fff9f5' : 'white'};">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <input type="radio" name="checkoutDeliveryMethod" value="delivery" ${savedMethod === 'delivery' ? 'checked' : ''} style="width: auto;">
                                    <div style="flex: 1;">
                                        <h4 style="margin: 0 0 5px;">Home Delivery</h4>
                                        <p style="margin: 0; color: #666;">Get your order delivered to your doorstep</p>
                                        <p style="margin: 5px 0 0; font-weight: bold; color: #333;">Fee: ${savedMethod === 'delivery' ? (subtotal >= 5000 ? 'FREE' : `₦${DELIVERY_FEE}`) : `₦${DELIVERY_FEE}`}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="delivery-option" onclick="selectDeliveryMethod('pickup')" style="border: 2px solid ${savedMethod === 'pickup' ? '#FFB88C' : '#e0e0e0'}; padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: pointer; background: ${savedMethod === 'pickup' ? '#fff9f5' : 'white'};">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <input type="radio" name="checkoutDeliveryMethod" value="pickup" ${savedMethod === 'pickup' ? 'checked' : ''} style="width: auto;">
                                    <div style="flex: 1;">
                                        <h4 style="margin: 0 0 5px;">Store Pickup</h4>
                                        <p style="margin: 0; color: #666;">Pick up your order from our bakery</p>
                                        <p style="margin: 5px 0 0; font-weight: bold; color: #28a745;">Fee: FREE</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                deliverySection.innerHTML = deliveryHtml;
                
                const paymentSection = checkoutBody.querySelector('.payment-options')?.closest('.form-group');
                
                if (paymentSection && checkoutBody.contains(paymentSection)) {
                    if (paymentSection.parentNode === checkoutBody) {
                        checkoutBody.insertBefore(deliverySection, paymentSection);
                    } else {
                        safeAppendChild(checkoutBody, deliverySection);
                    }
                } else {
                    safeAppendChild(checkoutBody, deliverySection);
                }
            }
        }
    }
    
    const savedMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
    let deliveryFee = 0;
    
    if (savedMethod === 'pickup') {
        deliveryFee = 0;
    } else {
        if (typeof deliveryService !== 'undefined') {
            const delivery = deliveryService.calculateFee(subtotal);
            deliveryFee = delivery.fee;
        } else {
            deliveryFee = DELIVERY_FEE;
        }
    }
    
    const total = subtotal + deliveryFee;
    
    checkoutTotal.textContent = total.toLocaleString();
    
    const nameField = safeGetElement('checkout-name');
    const emailField = safeGetElement('checkout-email');
    const phoneField = safeGetElement('checkout-phone');
    const addressField = safeGetElement('checkout-address');
    
    if (nameField) nameField.value = currentUser.name || '';
    if (emailField) emailField.value = currentUser.email || '';
    if (phoneField) phoneField.value = currentUser.phone || '';
    
    if (addressField) {
        if (savedMethod === 'pickup') {
            addressField.placeholder = 'Address not required for pickup';
            addressField.required = false;
        } else {
            addressField.required = true;
        }
        
        if (currentUser.address) {
            addressField.value = 
                `${currentUser.address.street || ''}, ${currentUser.address.city || ''}, ${currentUser.address.state || ''}`;
        }
    }
    
    const cartModal = safeGetElement('cart-modal');
    const checkoutModal = safeGetElement('checkout-modal');
    
    if (cartModal) cartModal.style.display = 'none';
    if (checkoutModal) checkoutModal.style.display = 'block';
}

function selectDeliveryMethod(method) {
    selectedDeliveryMethod = method;
    sessionStorage.setItem('deliveryMethod', method);
    
    const radios = document.querySelectorAll('input[name="checkoutDeliveryMethod"]');
    radios.forEach(radio => {
        if (radio.value === method) {
            radio.checked = true;
        }
    });
    
    const options = document.querySelectorAll('.delivery-option');
    options.forEach(option => {
        const radio = option.querySelector('input');
        if (radio && radio.value === method) {
            option.style.borderColor = '#FFB88C';
            option.style.background = '#fff9f5';
        } else {
            option.style.borderColor = '#e0e0e0';
            option.style.background = 'white';
        }
    });
    
    const addressField = safeGetElement('checkout-address');
    if (addressField) {
        if (method === 'pickup') {
            addressField.placeholder = 'Address not required for pickup';
            addressField.required = false;
        } else {
            addressField.placeholder = 'Street, City, State';
            addressField.required = true;
        }
    }
    
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const checkoutTotal = safeGetElement('checkout-total');
    
    if (checkoutTotal) {
        let deliveryFee = 0;
        if (method === 'delivery') {
            if (typeof deliveryService !== 'undefined') {
                const delivery = deliveryService.calculateFee(subtotal);
                deliveryFee = delivery.fee;
            } else {
                deliveryFee = DELIVERY_FEE;
            }
        }
        checkoutTotal.textContent = (subtotal + deliveryFee).toLocaleString();
    }
}

function updateCheckoutTotal() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const method = sessionStorage.getItem('deliveryMethod') || 'delivery';
    let deliveryFee = 0;
    
    if (method === 'pickup') {
        deliveryFee = 0;
    } else {
        if (typeof deliveryService !== 'undefined') {
            const delivery = deliveryService.calculateFee(subtotal);
            deliveryFee = delivery.fee;
        } else {
            deliveryFee = DELIVERY_FEE;
        }
    }
    
    const total = subtotal + deliveryFee;
    
    const checkoutTotalEl = safeGetElement('checkout-total');
    if (checkoutTotalEl) {
        checkoutTotalEl.textContent = total.toLocaleString();
    }
}

window.updateCheckoutTotal = updateCheckoutTotal;
window.selectDeliveryMethod = selectDeliveryMethod;
window.setDeliveryMethod = setDeliveryMethod;

// ==================== ORDER FUNCTIONS WITH PAYSTACK ====================

async function processOrder(event) {
    if (event) event.preventDefault();
    
    const name = safeGetElement('checkout-name')?.value;
    const email = safeGetElement('checkout-email')?.value;
    const phone = safeGetElement('checkout-phone')?.value;
    const addressText = safeGetElement('checkout-address')?.value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    
    if (!paymentMethod) {
        showNotification('Please select a payment method!', 'error');
        return;
    }
    
    if (paymentMethod === 'paystack') {
        await processPaystackPayment(name, email, phone, addressText);
        return;
    }
    
    await processRegularOrder(name, email, phone, addressText, paymentMethod);
}

async function processRegularOrder(name, email, phone, addressText, paymentMethod) {
    const addressParts = addressText ? addressText.split(',').map(part => part.trim()) : [];
    
    const shippingAddress = {
        street: addressParts[0] || 'No address provided',
        city: addressParts[1] || 'Lagos',
        state: addressParts[2] || 'Lagos',
        zipCode: '',
        phone: phone || ''
    };
    
    const orderItems = cart.map(item => ({
        product: item.isCombo ? item.productId : item.productId?.toString() || '',
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        addOns: item.addOns || '',
        isCombo: item.isCombo || false
    }));
    
    const itemsPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const deliveryMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
    let deliveryFee = 0;
    
    if (deliveryMethod === 'pickup') {
        deliveryFee = 0;
    } else {
        if (typeof deliveryService !== 'undefined') {
            const delivery = deliveryService.calculateFee(itemsPrice);
            deliveryFee = delivery.fee;
        } else {
            deliveryFee = DELIVERY_FEE;
        }
    }
    
    const totalPrice = itemsPrice + deliveryFee;
    
    try {
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
                deliveryPrice: deliveryFee,
                totalPrice,
                deliveryMethod: deliveryMethod
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Order placed successfully! We will contact you shortly.', 'success');
            
            cart = [];
            updateCartCount();
            saveCartToStorage();
            
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

    const addressParts = addressText ? addressText.split(',').map(part => part.trim()) : [];
    const shippingAddress = {
        street: addressParts[0] || 'No address provided',
        city: addressParts[1] || 'Lagos',
        state: addressParts[2] || 'Lagos',
        phone: phone || ''
    };

    const itemsPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const deliveryMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
    let deliveryFee = 0;
    
    if (deliveryMethod === 'pickup') {
        deliveryFee = 0;
    } else {
        if (typeof deliveryService !== 'undefined') {
            const delivery = deliveryService.calculateFee(itemsPrice);
            deliveryFee = delivery.fee;
        } else {
            deliveryFee = DELIVERY_FEE;
        }
    }
    
    const totalPrice = itemsPrice + deliveryFee;

    const orderItems = cart.map(item => ({
        product: item.isCombo ? item.productId : item.productId?.toString() || '',
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        addOns: item.addOns || '',
        isCombo: item.isCombo || false
    }));

    showNotification('Creating your order...', 'info');

    try {
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
                deliveryPrice: deliveryFee,
                totalPrice,
                deliveryMethod: deliveryMethod
            })
        });

        const orderData = await orderResponse.json();

        if (orderData.success) {
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

        if (data.success) {
            window.location.href = data.authorization_url;
        } else {
            showNotification(data.message || 'Payment initialization failed', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment failed. Please try again.', 'error');
    }
}

function closeCheckout() {
    closeModal('checkout-modal');
}

function selectPayment(method) {
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    const radio = document.getElementById(method);
    if (radio) radio.checked = true;
}

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
                            <p>Delivery: ${order.deliveryMethod || 'delivery'}</p>
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

function openProductModal(productId) {
    const product = products.find(p => p._id == productId || p.id == productId);
    
    if (!product) {
        showNotification('Product not found!', 'error');
        return;
    }
    
    currentProduct = product;
    addOnsTotal = 0;
    quantity = 1;
    
    const nameEl = safeGetElement('modal-product-name');
    const imgEl = safeGetElement('modal-product-img');
    const descEl = safeGetElement('modal-product-description');
    const priceEl = safeGetElement('modal-product-price');
    const qtyEl = safeGetElement('quantity-display');
    
    if (nameEl) nameEl.textContent = product.name;
    if (imgEl) imgEl.src = product.image;
    if (descEl) descEl.textContent = product.description || 'Delicious Nigerian treat';
    updateProductPriceDisplay();
    if (qtyEl) qtyEl.textContent = quantity;
    
    const addOnsSection = safeGetElement('add-ons-section');
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
    
    const modal = safeGetElement('product-modal');
    if (modal) modal.style.display = 'block';
}

function openComboModal(name, price, image) {
    currentCombo = { name, price, image };
    comboAddOnsTotal = 0;
    comboQuantity = 1;
    
    const nameEl = safeGetElement('combo-modal-name');
    const imgEl = safeGetElement('combo-modal-img');
    const priceEl = safeGetElement('combo-modal-price');
    const qtyEl = safeGetElement('combo-quantity-display');
    
    if (nameEl) nameEl.textContent = name;
    if (imgEl) imgEl.src = image;
    updateComboPriceDisplay();
    if (qtyEl) qtyEl.textContent = comboQuantity;
    
    const addOnsContainer = safeGetElement('combo-add-ons');
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
        safeAppendChild(addOnsContainer, addOnOption);
    });
    
    const modal = safeGetElement('combo-modal');
    if (modal) modal.style.display = 'block';
}

function showModal(title, content) {
    const existingModal = safeGetElement('generic-modal');
    if (existingModal) safeRemoveElement(existingModal);
    
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

function closeModal(modalId) {
    const modal = safeGetElement(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        setTimeout(() => {
            if (modal && modal.parentNode) {
                const staticModals = ['product-modal', 'combo-modal', 'cart-modal', 'checkout-modal', 'quick-order-modal'];
                if (staticModals.includes(modalId)) {
                    return;
                }
                safeRemoveElement(modal);
            }
        }, 300);
    }
}

function increaseQuantity() {
    quantity++;
    const qtyEl = safeGetElement('quantity-display');
    if (qtyEl) qtyEl.textContent = quantity;
    updateProductPriceDisplay();
}

function decreaseQuantity() {
    if (quantity > 1) {
        quantity--;
        const qtyEl = safeGetElement('quantity-display');
        if (qtyEl) qtyEl.textContent = quantity;
        updateProductPriceDisplay();
    }
}

function updateProductPriceDisplay() {
    if (currentProduct) {
        const basePrice = currentProduct.price;
        const totalPrice = (basePrice + addOnsTotal) * quantity;
        const priceEl = safeGetElement('modal-product-price');
        if (priceEl) priceEl.textContent = `${CURRENCY}${totalPrice.toLocaleString()}`;
    }
}

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

function increaseComboQuantity() {
    comboQuantity++;
    const qtyEl = safeGetElement('combo-quantity-display');
    if (qtyEl) qtyEl.textContent = comboQuantity;
    updateComboPriceDisplay();
}

function decreaseComboQuantity() {
    if (comboQuantity > 1) {
        comboQuantity--;
        const qtyEl = safeGetElement('combo-quantity-display');
        if (qtyEl) qtyEl.textContent = comboQuantity;
        updateComboPriceDisplay();
    }
}

function updateComboPriceDisplay() {
    if (currentCombo) {
        const basePrice = currentCombo.price;
        const totalPrice = (basePrice + comboAddOnsTotal) * comboQuantity;
        const priceEl = safeGetElement('combo-modal-price');
        if (priceEl) priceEl.textContent = `${CURRENCY}${totalPrice.toLocaleString()}`;
    }
}

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

function showOrderModal(type) {
    const modal = safeGetElement('quick-order-modal');
    const title = safeGetElement('quick-order-title');
    const message = safeGetElement('quick-order-message');
    
    if (type === 'pickup') {
        if (title) title.textContent = 'Store Pickup Order';
        if (message) message.textContent = 'Place your order for pickup at our bakery. We\'ll prepare it fresh for you.';
    } else if (type === 'delivery') {
        if (title) title.textContent = 'Home Delivery Order';
        if (message) message.textContent = 'Place your order for home delivery. We\'ll deliver it fresh to your doorstep.';
    }
    
    if (modal) modal.style.display = 'block';
}

function showSubscriptionModal() {
    const modal = safeGetElement('quick-order-modal');
    const title = safeGetElement('quick-order-title');
    const message = safeGetElement('quick-order-message');
    
    if (title) title.textContent = 'Subscription Service';
    if (message) message.textContent = 'Sign up for our subscription service to get regular deliveries of your favorite treats.';
    
    if (modal) modal.style.display = 'block';
}

function closeQuickOrder() {
    const modal = safeGetElement('quick-order-modal');
    if (modal) modal.style.display = 'none';
}

// ==================== ENHANCED QUICK ORDER SUBMISSION ====================
async function submitQuickOrder() {
    const name = document.getElementById('quick-order-name')?.value;
    const phone = document.getElementById('quick-order-phone')?.value;
    const details = document.getElementById('quick-order-details')?.value;
    
    if (!name || !phone) {
        showNotification('Please fill in your name and phone number!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/quick-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, details })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Order request submitted! We will contact you shortly.', 'success');
            
            // Clear form
            document.getElementById('quick-order-name').value = '';
            document.getElementById('quick-order-phone').value = '';
            document.getElementById('quick-order-details').value = '';
            
            closeQuickOrder();
        } else {
            showNotification(data.message || 'Failed to submit', 'error');
        }
    } catch (error) {
        console.error('Quick order error:', error);
        showNotification('Error submitting order', 'error');
    }
}

// ==================== NEWSLETTER SUBSCRIPTION ====================
async function subscribeNewsletter(email) {
    if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Thanks for subscribing! 🎉', 'success');
            // Clear the input
            const emailInput = document.querySelector('.newsletter-form input');
            if (emailInput) emailInput.value = '';
        } else {
            showNotification(data.message || 'Subscription failed', 'error');
        }
    } catch (error) {
        console.error('Newsletter error:', error);
        showNotification('Error subscribing. Please try again later.', 'error');
    }
}

// ==================== UPDATE EVENT LISTENERS ====================
function setupEventListeners() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('nav');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (nav) nav.classList.toggle('active');
        });
    }
    
    document.addEventListener('click', function(e) {
        if (nav && nav.classList.contains('active') && 
            mobileMenuBtn && !nav.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            nav.classList.remove('active');
        }
    });
    
    if (nav) {
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                nav.classList.remove('active');
            });
        });
    }
    
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processOrder(e);
        });
    }
    
    // Enhanced newsletter button handler
    const newsletterBtn = document.querySelector('.newsletter-form button');
    if (newsletterBtn) {
        // Remove existing event listeners by cloning
        const newBtn = newsletterBtn.cloneNode(true);
        newsletterBtn.parentNode.replaceChild(newBtn, newsletterBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const emailInput = document.querySelector('.newsletter-form input');
            if (emailInput && emailInput.value) {
                subscribeNewsletter(emailInput.value);
            } else {
                showNotification('Please enter your email address', 'error');
            }
        });
    }
    
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
    
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            const modalId = event.target.id;
            closeModal(modalId);
        }
    };
}

function closeComboModal() {
    closeModal('combo-modal');
}

function closeProductModal() {
    closeModal('product-modal');
}

// ==================== EXPOSE FUNCTIONS GLOBALLY ====================

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
window.subscribeNewsletter = subscribeNewsletter;
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
window.initializePaystackPayment = initializePaystackPayment;
window.processPaystackPayment = processPaystackPayment;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.trackPageView = trackPageView;
window.trackAddToCart = trackAddToCart;
window.trackPurchase = trackPurchase;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleGoogleSignIn = handleGoogleSignIn;
window.setDeliveryMethod = setDeliveryMethod;
window.selectDeliveryMethod = selectDeliveryMethod;
window.updateCheckoutTotal = updateCheckoutTotal;

// Add wishlist functions to global scope
window.toggleWishlist = toggleWishlist;
window.toggleComboWishlist = toggleComboWishlist;
window.loadWishlistPage = loadWishlistPage;
window.displayWishlistItems = displayWishlistItems;
window.addToCartFromWishlist = addToCartFromWishlist;
window.removeFromWishlist = removeFromWishlist;
window.updateWishlistCount = updateWishlistCount;
window.displayCombosWithWishlist = displayCombosWithWishlist;
window.getWishlistStatus = getWishlistStatus;
window.createProductCard = createProductCard;
window.displayComboInWishlist = displayComboInWishlist;
window.displayProductInWishlist = displayProductInWishlist;