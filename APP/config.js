// config.js
const CONFIG = {
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api' 
        : 'https://your-backend.onrender.com/api',
    
    CURRENCY: '₦',
    DELIVERY_FEE: 0,
    APP_NAME: 'Beedaht Sweet Treats'
};

// Make it available globally
window.CONFIG = CONFIG;