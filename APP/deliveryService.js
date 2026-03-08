// ==================== DELIVERY SERVICE ====================
// This service handles all delivery-related functionality
// Drop-in ready - won't break existing code

const deliveryService = (function() {
    // Private configuration
    const config = {
        // Default delivery fees (in Naira)
        baseFee: 1500,              // Standard delivery
        expressFee: 2500,            // Express delivery
        freeDeliveryThreshold: 15000, // Free delivery for orders above this amount
        
        // Estimated delivery times
        estimates: {
            'standard': '3-5 business days',
            'express': '1-2 business days',
            'pickup': 'Ready in 2 hours'
        },
        
        // Location-based pricing (for future use)
        zones: {
            'lagos-mainland': { fee: 1000, days: '2-3' },
            'lagos-island': { fee: 1500, days: '2-3' },
            'outside-lagos': { fee: 2500, days: '5-7' }
        }
    };
    
    // Current selected delivery method
    let currentDeliveryMethod = 'standard';
    let currentLocation = 'lagos-mainland';
    
    // Public methods
    return {
        // Calculate delivery fee based on subtotal and method
        calculateFee: function(subtotal, method = currentDeliveryMethod, location = currentLocation) {
            // Free delivery for orders above threshold
            if (subtotal >= config.freeDeliveryThreshold) {
                return {
                    fee: 0,
                    message: `🎉 Free Delivery (Orders above ₦${config.freeDeliveryThreshold.toLocaleString()})`,
                    estimate: config.estimates[method] || config.estimates.standard
                };
            }
            
            // Zone-based pricing (if location is provided)
            let fee = config.zones[location]?.fee || config.baseFee;
            
            // Express delivery surcharge
            if (method === 'express') {
                fee = config.expressFee;
            }
            
            return {
                fee: fee,
                message: `Delivery Fee: ₦${fee.toLocaleString()}`,
                estimate: config.estimates[method] || config.estimates.standard
            };
        },
        
        // Set delivery method
        setDeliveryMethod: function(method) {
            if (['standard', 'express', 'pickup'].includes(method)) {
                currentDeliveryMethod = method;
                return true;
            }
            return false;
        },
        
        // Get current delivery method
        getDeliveryMethod: function() {
            return currentDeliveryMethod;
        },
        
        // Set location (for future use)
        setLocation: function(location) {
            if (config.zones[location]) {
                currentLocation = location;
                return true;
            }
            return false;
        },
        
        // Get all delivery options with prices
        getDeliveryOptions: function(subtotal = 0) {
            const options = [];
            
            // Standard delivery
            const standard = this.calculateFee(subtotal, 'standard');
            options.push({
                id: 'standard',
                name: 'Standard Delivery',
                fee: standard.fee,
                message: standard.fee === 0 ? 'Free' : `₦${standard.fee.toLocaleString()}`,
                estimate: standard.estimate,
                description: standard.fee === 0 ? 
                    `Free (Orders above ₦${config.freeDeliveryThreshold.toLocaleString()})` : 
                    `₦${standard.fee.toLocaleString()} - ${standard.estimate}`
            });
            
            // Express delivery
            const express = this.calculateFee(subtotal, 'express');
            options.push({
                id: 'express',
                name: 'Express Delivery',
                fee: express.fee,
                message: `₦${express.fee.toLocaleString()}`,
                estimate: express.estimate,
                description: `₦${express.fee.toLocaleString()} - ${express.estimate}`
            });
            
            // Store pickup
            options.push({
                id: 'pickup',
                name: 'Store Pickup',
                fee: 0,
                message: 'Free',
                estimate: config.estimates.pickup,
                description: `Free - ${config.estimates.pickup}`
            });
            
            return options;
        },
        
        // Format delivery info for display
        formatDeliveryInfo: function(subtotal) {
            const delivery = this.calculateFee(subtotal);
            const options = this.getDeliveryOptions(subtotal);
            
            return {
                currentMethod: currentDeliveryMethod,
                fee: delivery.fee,
                message: delivery.message,
                estimate: delivery.estimate,
                options: options,
                freeDeliveryThreshold: config.freeDeliveryThreshold,
                qualifiesForFree: subtotal >= config.freeDeliveryThreshold,
                amountNeededForFree: subtotal >= config.freeDeliveryThreshold ? 0 : 
                    config.freeDeliveryThreshold - subtotal
            };
        },
        
        // Get HTML for delivery options (ready to insert into DOM)
        getDeliveryOptionsHTML: function(subtotal) {
            const options = this.getDeliveryOptions(subtotal);
            
            let html = `
                <div class="delivery-options-container">
                    <h3>Delivery Options</h3>
                    <div class="delivery-options">
            `;
            
            options.forEach(option => {
                const checked = option.id === currentDeliveryMethod ? 'checked' : '';
                html += `
                    <div class="delivery-option ${checked ? 'selected' : ''}" onclick="selectDelivery('${option.id}')">
                        <input type="radio" name="delivery" id="delivery-${option.id}" 
                               value="${option.id}" ${checked}>
                        <div class="delivery-option-content">
                            <div class="delivery-option-header">
                                <span class="delivery-option-name">${option.name}</span>
                                <span class="delivery-option-price">${option.message}</span>
                            </div>
                            <div class="delivery-option-description">
                                ${option.description}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    ${this.getDeliveryBannerHTML(subtotal)}
                </div>
            `;
            
            return html;
        },
        
        // Get delivery banner HTML (shows in cart)
        getDeliveryBannerHTML: function(subtotal) {
            const info = this.formatDeliveryInfo(subtotal);
            
            if (info.qualifiesForFree) {
                return `
                    <div class="delivery-banner free-delivery">
                        <i class="fas fa-truck"></i>
                        <span>🎉 Congratulations! You qualify for FREE delivery!</span>
                    </div>
                `;
            } else {
                return `
                    <div class="delivery-banner">
                        <i class="fas fa-info-circle"></i>
                        <span>Add ₦${info.amountNeededForFree.toLocaleString()} more for FREE delivery</span>
                    </div>
                `;
            }
        },
        
        // Reset to defaults
        reset: function() {
            currentDeliveryMethod = 'standard';
            currentLocation = 'lagos-mainland';
        }
    };
})();

// Make it globally available
window.deliveryService = deliveryService;

// Helper function for selecting delivery (called from onclick)
window.selectDelivery = function(method) {
    deliveryService.setDeliveryMethod(method);
    
    // Update UI
    document.querySelectorAll('.delivery-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`#delivery-${method}`)?.closest('.delivery-option');
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Update checkout total if checkout is open
    if (typeof updateCheckoutTotal === 'function') {
        updateCheckoutTotal();
    }
    
    console.log(`✅ Delivery method set to: ${method}`);
};