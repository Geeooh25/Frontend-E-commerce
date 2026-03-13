// ==================== FIXED DISPLAY PRODUCTS WITH WISHLIST ====================
async function displayProducts(productsToShow) {
    const container = safeGetElement('products-container');
    if (!container) {
        console.error('Products container not found!');
        return;
    }
    
    console.log('Displaying products, currentUser:', currentUser ? 'logged in' : 'not logged in');
    
    container.innerHTML = '';
    
    // First, get all wishlist statuses at once if user is logged in
    let wishlistStatus = {};
    if (currentUser) {
        try {
            const response = await fetch(`${API_BASE_URL}/wishlist`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                // Create a map of product IDs in wishlist
                data.wishlist.forEach(product => {
                    wishlistStatus[product._id] = true;
                });
                console.log('Wishlist loaded:', Object.keys(wishlistStatus).length, 'items');
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        }
    }
    
    // Now display products
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.style.position = 'relative';
        
        const productId = product._id || product.id;
        
        // Check if product is in wishlist
        const inWishlist = wishlistStatus[productId] || false;
        const heartClass = inWishlist ? 'fas' : 'far';
        const activeClass = inWishlist ? 'active' : '';
        
        // Create heart button HTML (only show if user is logged in)
        const heartButton = currentUser ? 
            `<button class="wishlist-btn ${activeClass}" 
                    onclick="toggleWishlist('${productId}', this)" 
                    style="position: absolute; top: 10px; right: 10px; z-index: 10; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                <i class="${heartClass} fa-heart" style="color: #ec4899; font-size: 18px;"></i>
            </button>` : '';
        
        productCard.innerHTML = `
            ${heartButton}
            <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}" class="product-img" onerror="this.src='https://via.placeholder.com/300?text=No+Image'">
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
const DELIVERY_FEE = 1500; // Changed from 0 to actual delivery fee

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
let selectedDeliveryMethod = 'delivery'; // Default to delivery

// Product data (will be fetched from API)
let products = [];

// ==================== SAFE DOM MANIPULATION HELPER ====================
function safeInsertBefore(parent, newNode, referenceNode) {
    // Check if parent exists and is in DOM
    if (!parent || !document.body.contains(parent)) {
        console.warn('Parent element not found or not in DOM');
        return false;
    }
    
    // Check if reference node is valid and is a child of parent
    if (!referenceNode || !parent.contains(referenceNode)) {
        // If reference node is invalid, just append
        parent.appendChild(newNode);
        return true;
    }
    
    // Safe to insert before
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
                    const container = safeGetElement('products-container');
                    if (container && container.children.length > 0) {
                        displayProducts(products.slice(0, 8));
                        displayAdvancedProducts(products);
                        displayCombosWithWishlist();
                    }
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
        // Check if Firebase Auth is available
        if (!firebaseAuth) {
            console.error('Firebase Auth not available');
            showNotification('Authentication service unavailable', 'error');
            return;
        }

        // Create Google provider
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Add scopes if needed
        provider.addScope('profile');
        provider.addScope('email');
        
        // Set custom parameters
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        console.log('Opening Google sign-in popup...');
        
        // Show loading notification
        showNotification('Opening Google sign-in...', 'info');
        
        // Sign in with popup
        const result = await firebaseAuth.signInWithPopup(provider);
        
        // Get user info
        const user = result.user;
        console.log('Google sign-in successful:', user.email);
        console.log('User details:', {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL
        });
        
        // Get token for backend
        const idToken = await user.getIdToken();
        console.log('Got Firebase ID token');
        
        // Send token to your backend
        showNotification('Completing sign-in...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth/firebase/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idToken })
        });
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(true);
            updateWishlistCount();
            
            // Close any open modals
            closeModal('login-modal');
            closeModal('register-modal');
            
            showNotification(`Welcome, ${user.displayName || 'User'}!`, 'success');
            
            // Check for redirect after login (for admin access)
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                sessionStorage.removeItem('redirectAfterLogin');
                console.log('Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            }
            
            // Load user's cart from server
            loadUserCart();
            
            // Refresh product display to update wishlist hearts
            if (products.length > 0) {
                const container = safeGetElement('products-container');
                if (container && container.children.length > 0) {
                    displayProducts(products.slice(0, 8));
                    displayAdvancedProducts(products);
                    displayCombosWithWishlist();
                }
            }
        } else {
            console.error('Backend login failed:', data.message);
            showNotification(data.message || 'Google sign-in failed', 'error');
        }
        
    } catch (error) {
        console.error('Google sign-in error details:', {
            code: error.code,
            message: error.message,
            email: error.email,
            credential: error.credential
        });
        
        let errorMessage = 'Google sign-in failed. ';
        
        // Handle specific Firebase errors
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
    const existingModal = safeGetElement('login-modal');
    if (existingModal) safeRemoveElement(existingModal);
    
    // Create login modal dynamically with Google button
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
                    
                    <!-- Google Sign-In Button -->
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
                    
                    <!-- Google Sign-In Button -->
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
            updateWishlistCount();
            closeModal('login-modal');
            showNotification('Login successful!', 'success');
            
            // Check for redirect after login (for admin access)
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            }
            
            // Load user's cart from server
            loadUserCart();
            
            // Refresh product display to update wishlist hearts
            if (products.length > 0) {
                const container = safeGetElement('products-container');
                if (container && container.children.length > 0) {
                    displayProducts(products.slice(0, 8));
                    displayAdvancedProducts(products);
                    displayCombosWithWishlist();
                }
            }
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
            updateWishlistCount();
            closeModal('register-modal');
            showNotification('Registration successful! Please check your email for verification.', 'success');
            
            // Refresh product display to show wishlist hearts
            if (products.length > 0) {
                const container = safeGetElement('products-container');
                if (container && container.children.length > 0) {
                    displayProducts(products.slice(0, 8));
                    displayAdvancedProducts(products);
                    displayCombosWithWishlist();
                }
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
    
    // Refresh product display to remove wishlist hearts
    if (products.length > 0) {
        const container = safeGetElement('products-container');
        if (container) {
            displayProducts(products.slice(0, 8));
            displayAdvancedProducts(products);
            // Also refresh combos to remove hearts
            displayCombosWithWishlist();
        }
    }
}

// ==================== PASSWORD RESET FUNCTIONS ====================

function openForgotPasswordModal() {
    console.log('Opening forgot password modal');
    
    // Close login modal if open
    const loginModal = safeGetElement('login-modal');
    if (loginModal) {
        loginModal.style.display = 'none';
        safeRemoveElement(loginModal);
    }
    
    // Remove any existing forgot password modal
    const existingModal = safeGetElement('forgot-password-modal');
    if (existingModal) {
        safeRemoveElement(existingModal);
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

// ==================== FIXED ADVANCED PRODUCTS WITH WISHLIST ====================
async function displayAdvancedProducts(productsToShow) {
    const container = safeGetElement('advanced-products-container');
    if (!container) {
        console.error('Advanced products container not found!');
        return;
    }
    
    container.innerHTML = '';
    
    // Get wishlist status if user is logged in
    let wishlistStatus = {};
    if (currentUser) {
        try {
            const response = await fetch(`${API_BASE_URL}/wishlist`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                data.wishlist.forEach(product => {
                    wishlistStatus[product._id] = true;
                });
            }
        } catch (error) {
            console.error('Error loading wishlist for advanced products:', error);
        }
    }
    
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.style.position = 'relative';
        
        const productId = product._id || product.id;
        
        // Show heart button ONLY if logged in
        let heartButton = '';
        if (currentUser) {
            const inWishlist = wishlistStatus[productId] || false;
            const heartClass = inWishlist ? 'fas' : 'far';
            const activeClass = inWishlist ? 'active' : '';
            
            heartButton = `
                <button class="wishlist-btn ${activeClass}" 
                        onclick="toggleWishlist('${productId}', event, this)" 
                        style="position: absolute; top: 10px; right: 10px; z-index: 10; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
                    <i class="${heartClass} fa-heart" style="color: #ec4899; font-size: 18px;"></i>
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
                    <span class="price">${CURRENCY}${product.price.toLocaleString()}</span>
                    <button class="btn" onclick="openProductModal('${productId}')">Add to Cart</button>
                </div>
            </div>
        `;
        safeAppendChild(container, productCard);
    });
}

// ==================== ADD WISHLIST TO COMBOS ====================
function displayCombosWithWishlist() {
    const comboContainers = document.querySelectorAll('.combo-card');
    
    if (!currentUser) return; // Don't add hearts if not logged in
    
    // Get wishlist status first
    fetch(`${API_BASE_URL}/wishlist`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const wishlistIds = data.wishlist.map(p => p._id);
            
            comboContainers.forEach(comboCard => {
                // Remove any existing wishlist buttons first
                const existingBtn = comboCard.querySelector('.wishlist-btn');
                if (existingBtn) {
                    existingBtn.remove();
                }
                
                // Get the combo ID from the button's onclick
                const viewButton = comboCard.querySelector('button[onclick^="openComboModal"]');
                if (viewButton) {
                    const onclickAttr = viewButton.getAttribute('onclick');
                    const match = onclickAttr.match(/'([^']+)'/g);
                    if (match && match[0]) {
                        const comboName = match[0].replace(/'/g, '');
                        const comboId = `combo-${comboName.replace(/\s+/g, '-').toLowerCase()}`;
                        
                        // Check if this combo is in wishlist
                        const inWishlist = wishlistIds.some(id => id === comboId);
                        
                        // Add heart button to combo card
                        const heartButton = document.createElement('button');
                        heartButton.className = `wishlist-btn ${inWishlist ? 'active' : ''}`;
                        heartButton.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10; background: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;';
                        heartButton.innerHTML = `<i class="${inWishlist ? 'fas' : 'far'} fa-heart" style="color: #ec4899; font-size: 18px;"></i>`;
                        heartButton.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(comboId, heartButton);
                        };
                        
                        // Make combo card position relative if not already
                        comboCard.style.position = 'relative';
                        comboCard.appendChild(heartButton);
                    }
                }
            });
        }
    })
    .catch(error => console.error('Error loading wishlist for combos:', error));
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

// ==================== WISHLIST FUNCTIONS ====================

// Check if product is in wishlist
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

// Toggle wishlist - updated to handle both event and direct calls
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
            // Add to wishlist
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
                
                // Refresh combos if needed
                displayCombosWithWishlist();
            }
        } else {
            // Remove from wishlist
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
                
                // Refresh combos if needed
                displayCombosWithWishlist();
            }
        }
    } catch (error) {
        console.error('Wishlist toggle error:', error);
        showNotification('Error updating wishlist', 'error');
    }
}

// Update wishlist count in header
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

// Load wishlist page
async function loadWishlistPage() {
    if (!currentUser) {
        showNotification('Please login to view your wishlist', 'warning');
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
            displayWishlistItems(data.wishlist);
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

function displayWishlistItems(wishlist) {
    // Create wishlist modal or page
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
                            wishlist.map(product => `
                                <div class="wishlist-item" style="background: white; border-radius: 10px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                    <img src="${product.image || 'https://via.placeholder.com/200'}" 
                                         alt="${product.name}" 
                                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                                    <h4 style="margin: 10px 0 5px;">${product.name}</h4>
                                    <p style="color: #ec4899; font-weight: bold; margin-bottom: 10px;">₦${product.price.toLocaleString()}</p>
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
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
            // Remove item from DOM
            const item = button.closest('.wishlist-item');
            item.remove();
            showNotification('Removed from wishlist', 'info');
            
            // Update wishlist count
            updateWishlistCount();
            
            // If wishlist is empty, show message
            const grid = document.querySelector('.wishlist-grid');
            if (grid.children.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Your wishlist is empty</p>';
            }
            
            // Refresh product display to update hearts
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
    
    // Calculate delivery fee based on selected method
    let delivery = { fee: 0, message: 'Delivery: ₦0' };
    
    // Check if delivery method is set in session or default to delivery
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
        
        // Add delivery method selector
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

// Set delivery method
function setDeliveryMethod(method) {
    selectedDeliveryMethod = method;
    sessionStorage.setItem('deliveryMethod', method);
    updateCartDisplay();
    console.log('Delivery method set to:', method);
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

// ========== FIXED PROCEED TO CHECKOUT FUNCTION ==========
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
    
    // Update checkout summary
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
    
    // ========== FIXED DELIVERY SECTION INSERTION WITH PICKUP OPTION ==========
    if (typeof deliveryService !== 'undefined') {
        const checkoutModal = safeGetElement('checkout-modal');
        if (checkoutModal) {
            const checkoutBody = checkoutModal.querySelector('.modal-body');
            
            if (checkoutBody && document.body.contains(checkoutBody)) {
                // Remove existing delivery section if any
                const existingSection = safeGetElement('delivery-section');
                if (existingSection && existingSection.parentNode) {
                    safeRemoveElement(existingSection);
                }
                
                // Get selected delivery method
                const savedMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
                
                // Create new delivery section with pickup option
                const deliverySection = document.createElement('div');
                deliverySection.id = 'delivery-section';
                
                // Custom delivery options HTML that includes pickup
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
                
                // Find payment section
                const paymentSection = checkoutBody.querySelector('.payment-options')?.closest('.form-group');
                
                // SAFE INSERTION - Check if parent contains reference node
                if (paymentSection && checkoutBody.contains(paymentSection)) {
                    // Check if paymentSection has a parent and is in the DOM
                    if (paymentSection.parentNode === checkoutBody) {
                        // Safe to insert before
                        checkoutBody.insertBefore(deliverySection, paymentSection);
                    } else {
                        // If paymentSection is not a direct child, append to checkout body
                        safeAppendChild(checkoutBody, deliverySection);
                    }
                } else {
                    // If payment section not found, append to checkout body
                    safeAppendChild(checkoutBody, deliverySection);
                }
            } else {
                console.warn('Checkout body not found or not in DOM');
            }
        }
    }
    
    // Calculate total with delivery based on selected method
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
    
    // Pre-fill user data
    const nameField = safeGetElement('checkout-name');
    const emailField = safeGetElement('checkout-email');
    const phoneField = safeGetElement('checkout-phone');
    const addressField = safeGetElement('checkout-address');
    
    if (nameField) nameField.value = currentUser.name || '';
    if (emailField) emailField.value = currentUser.email || '';
    if (phoneField) phoneField.value = currentUser.phone || '';
    
    // If pickup is selected, address might be optional
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
    
    // Show checkout modal
    const cartModal = safeGetElement('cart-modal');
    const checkoutModal = safeGetElement('checkout-modal');
    
    if (cartModal) cartModal.style.display = 'none';
    if (checkoutModal) checkoutModal.style.display = 'block';
}

// Select delivery method in checkout
function selectDeliveryMethod(method) {
    selectedDeliveryMethod = method;
    sessionStorage.setItem('deliveryMethod', method);
    
    // Update radio buttons
    const radios = document.querySelectorAll('input[name="checkoutDeliveryMethod"]');
    radios.forEach(radio => {
        if (radio.value === method) {
            radio.checked = true;
        }
    });
    
    // Update delivery option styling
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
    
    // Update address field requirement
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
    
    // Recalculate total
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
    
    console.log('Checkout delivery method set to:', method);
}

// Update checkout total when delivery method changes
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
    
    // Get delivery method
    const deliveryMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
    let deliveryFee = 0;
    
    if (deliveryMethod === 'pickup') {
        deliveryFee = 0;
        console.log('✅ Pickup selected - no delivery fee');
    } else {
        if (typeof deliveryService !== 'undefined') {
            const delivery = deliveryService.calculateFee(itemsPrice);
            deliveryFee = delivery.fee;
            console.log(`✅ Delivery fee calculated: ₦${deliveryFee} - ${delivery.message}`);
        } else {
            deliveryFee = DELIVERY_FEE;
            console.log(`✅ Standard delivery fee: ₦${DELIVERY_FEE}`);
        }
    }
    
    const totalPrice = itemsPrice + deliveryFee;
    
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
                deliveryPrice: deliveryFee,
                totalPrice,
                deliveryMethod: deliveryMethod // Add delivery method to order
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
    
    // Get delivery method
    const deliveryMethod = sessionStorage.getItem('deliveryMethod') || 'delivery';
    let deliveryFee = 0;
    
    if (deliveryMethod === 'pickup') {
        deliveryFee = 0;
        console.log('✅ Pickup selected - no delivery fee for Paystack');
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
                deliveryMethod: deliveryMethod // Add delivery method to order
            })
        });

        const orderData = await orderResponse.json();
        console.log('Order created:', orderData);

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
        console.log('Payment initialization:', data);

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
    
    if (method === 'paystack') {
        console.log('Paystack selected');
    }
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
    console.log('Looking for product with ID:', productId);
    
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
    console.log('Closing modal:', modalId);
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

function submitQuickOrder() {
    const name = safeGetElement('quick-order-name')?.value;
    const phone = safeGetElement('quick-order-phone')?.value;
    const details = safeGetElement('quick-order-details')?.value;
    
    if (!name || !phone) {
        showNotification('Please fill in your name and phone number!', 'error');
        return;
    }
    
    showNotification('Order request submitted! We will contact you shortly.', 'success');
    
    const nameField = safeGetElement('quick-order-name');
    const phoneField = safeGetElement('quick-order-phone');
    const detailsField = safeGetElement('quick-order-details');
    
    if (nameField) nameField.value = '';
    if (phoneField) phoneField.value = '';
    if (detailsField) detailsField.value = '';
    
    closeQuickOrder();
}

// ==================== NOTIFICATION FUNCTIONS ====================

function showNotification(message, type = 'success') {
    document.querySelectorAll('.notification').forEach(el => safeRemoveElement(el));
    
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
    
    safeAppendChild(document.body, notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            safeRemoveElement(notification);
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
    
    const existingModal = safeGetElement('profile-modal');
    if (existingModal) {
        safeRemoveElement(existingModal);
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
    
    const existingModal = safeGetElement('edit-profile-modal');
    if (existingModal) {
        safeRemoveElement(existingModal);
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

function trackPageView(pageName) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            page_title: pageName,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
    }
}

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
window.loadWishlistPage = loadWishlistPage;
window.addToCartFromWishlist = addToCartFromWishlist;
window.removeFromWishlist = removeFromWishlist;
window.updateWishlistCount = updateWishlistCount;
window.displayCombosWithWishlist = displayCombosWithWishlist;