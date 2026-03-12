// order-success.js - Professional Order Success Handler
(function() {
    'use strict';
    
    function initOrderSuccessPage() {
        try {
            // Get order data from localStorage
            const orderData = JSON.parse(localStorage.getItem('last-order') || '{}');
            
            if (!orderData.orderId && !orderData.method) {
                // No order data found, redirect to home
                showError('No order data found');
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }
            
            // Display order information
            displayOrderDetails(orderData);
            
            // Update page based on payment method
            updatePaymentMethodDisplay(orderData);
            
            // Clean up sensitive data after displaying
            setTimeout(() => {
                localStorage.removeItem('last-order');
            }, 5000);
            
            console.log('✅ Order success page initialized');
            
        } catch (error) {
            console.error('Error initializing order success page:', error);
            showError('Error loading order details');
        }
    }
    
    function displayOrderDetails(orderData) {
        // Order ID
        const orderIdElement = document.getElementById('order-id');
        if (orderIdElement && orderData.orderId) {
            orderIdElement.textContent = `#${orderData.orderId}`;
        }
        
        // Order Date
        const orderDateElement = document.getElementById('order-date');
        if (orderDateElement) {
            const date = orderData.timestamp ? 
                new Date(orderData.timestamp).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                }) : 
                new Date().toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            orderDateElement.textContent = date;
        }
        
        // Total Amount
        const totalAmountElement = document.getElementById('total-amount');
        if (totalAmountElement && orderData.amount) {
            totalAmountElement.textContent = `₹${parseFloat(orderData.amount).toFixed(2)}`;
        }
        
        // Item Count
        const itemCountElement = document.getElementById('item-count');
        if (itemCountElement && orderData.items) {
            const itemText = orderData.items === 1 ? '1 item' : `${orderData.items} items`;
            itemCountElement.textContent = itemText;
        }
    }
    
    function updatePaymentMethodDisplay(orderData) {
        const paymentMethodBadge = document.getElementById('payment-method-badge');
        const paymentDetails = document.getElementById('payment-details');
        const successMessage = document.getElementById('success-message');
        
        if (orderData.method === 'cod') {
            // Cash on Delivery
            if (paymentMethodBadge) {
                paymentMethodBadge.textContent = 'Cash on Delivery';
                paymentMethodBadge.className = 'px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full font-medium';
            }
            
            if (paymentDetails) {
                paymentDetails.innerHTML = `
                    <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                    <span class="text-sm text-gray-700">
                        Pay ₹${parseFloat(orderData.amount || 0).toFixed(2)} in cash when your order arrives
                    </span>
                `;
            }
            
            if (successMessage) {
                successMessage.textContent = 'Your COD order has been confirmed and will be delivered soon!';
            }
            
        } else if (orderData.method === 'razorpay') {
            // Online Payment
            if (paymentMethodBadge) {
                paymentMethodBadge.textContent = 'Online Payment';
                paymentMethodBadge.className = 'px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium';
            }
            
            if (paymentDetails) {
                paymentDetails.innerHTML = `
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span class="text-sm text-gray-700">
                        Payment of ₹${parseFloat(orderData.amount || 0).toFixed(2)} completed successfully
                        ${orderData.paymentId ? `• Payment ID: ${orderData.paymentId.substr(-8)}` : ''}
                    </span>
                `;
            }
            
            if (successMessage) {
                successMessage.textContent = 'Your payment was successful and order confirmed!';
            }
        }
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    // ✅ UPDATED: Initialize when DOM loads with button listeners
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize the success page
        initOrderSuccessPage();
        
        // ✅ ADD BUTTON EVENT LISTENERS
        const continueShoppingBtn = document.getElementById('continue-shopping-btn');
        const viewOrdersBtn = document.getElementById('view-orders-btn');
        
        // Debug: Check if buttons exist
        console.log('Continue shopping button found:', !!continueShoppingBtn);
        console.log('View orders button found:', !!viewOrdersBtn);
        
        if (continueShoppingBtn) {
            continueShoppingBtn.addEventListener('click', function() {
                console.log('Continue shopping clicked - redirecting to home...');
                window.location.href = '/';
            });
        } else {
            console.error('Continue shopping button not found! Check button ID.');
        }
        
        if (viewOrdersBtn) {
            viewOrdersBtn.addEventListener('click', function() {
                console.log('View orders clicked - redirecting to orders page...');
                window.location.href = 'orders.html';
            });
        } else {
            console.error('View orders button not found! Check button ID.');
        }
        
        console.log('✅ Order success page and button listeners initialized');
    });
    
    // Prevent back button to payment page
    window.addEventListener('popstate', function() {
        console.log('Back button pressed - redirecting to home...');
        window.location.href = '/';
    });
    
})();

