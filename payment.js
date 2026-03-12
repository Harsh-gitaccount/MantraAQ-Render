// payment.js - Professional Payment Handler
(function() {
    'use strict';
    
    let checkoutCart = [];
    let shippingData = {};
    let currentUser = null;
    let selectedPaymentMethod = 'razorpay';
    let totalAmount = 0;
    
    // Initialize payment page
    async function initPaymentPage() {
        try {
            // Check authentication
            await checkAuthentication();
            
            // Load cart and shipping data
            loadCheckoutData();
            
            // Validate required data
            if (checkoutCart.length === 0) {
                showError('Cart is empty', 'Please add items to your cart first.');
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }
            
            if (!shippingData.fullName) {
                showError('Shipping address missing', 'Please complete your shipping address first.');
                setTimeout(() => window.location.href = 'shipping.html', 2000);
                return;
            }
            
            // Display data
            displayShippingAddress();
            displayOrderItems();
            calculateTotals();
            
            // Setup event listeners
            setupPaymentMethodSelection();
            setupOrderPlacement();
            
            console.log('✅ Payment page initialized successfully');
            
        } catch (error) {
            console.error('Payment page initialization failed:', error);
            showError('Initialization Failed', 'Please refresh the page and try again.');
        }
    }
    
    // Check user authentication
    async function checkAuthentication() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (!data.user) {
                    window.location.href = '/?login=required';
                    return;
                }
                currentUser = data.user;
            } else {
                window.location.href = '/?login=required';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/?login=required';
        }
    }
    // ✅ ADD THIS FUNCTION TO PAYMENT.JS
function calculateShipping(subtotal, paymentMethod = 'online') {
    const freeShippingThreshold = 499; // ₹500 for free shipping
    
    let shippingFee = 0;
    let codFee = 0;
    
    if (paymentMethod === 'cod') {
        // COD Logic
        codFee = 9.99; // COD handling fee
        shippingFee = subtotal >= freeShippingThreshold ? 0 : 49; // ₹60 delivery for COD
    } else {
        // Online Payment Logic
        shippingFee = subtotal >= freeShippingThreshold ? 0 : 49; // ₹49 delivery for online
        codFee = 0;
    }
    
    return {
        shippingFee,
        codFee,
        total: subtotal + shippingFee + codFee,
        isFreeShipping: shippingFee === 0,
        freeShippingThreshold
    };
}

    // Load cart and shipping data from localStorage
    function loadCheckoutData() {
        // Load cart data
        checkoutCart = JSON.parse(localStorage.getItem('checkout-cart')) || [];
        
        // Load shipping data
        shippingData = JSON.parse(localStorage.getItem('shipping-data')) || {};
        
        console.log('Loaded cart items:', checkoutCart.length);
        console.log('Loaded shipping data:', shippingData);
    }
    
    // Display shipping address
    function displayShippingAddress() {
        const container = document.getElementById('shipping-address-display');
        if (!container || !shippingData.fullName) return;
        
        const addressHtml = `
            <div class="space-y-2">
                <div class="font-semibold text-gray-900">${escapeHtml(shippingData.fullName)}</div>
                <div class="text-gray-700">
                    ${escapeHtml(shippingData.flatNo)}, ${escapeHtml(shippingData.street)}
                </div>
                <div class="text-gray-700">
                    ${escapeHtml(shippingData.city)}, ${escapeHtml(shippingData.state)} - ${shippingData.pincode}
                </div>
                <div class="text-gray-600 text-sm">
                    📱 ${shippingData.mobile}
                    ${shippingData.altMobile ? ` • ${shippingData.altMobile}` : ''}
                </div>
                <div class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    ${shippingData.addressType === 'Home' ? '🏠' : '🏢'} ${shippingData.addressType}
                </div>
            </div>
        `;
        
        container.innerHTML = addressHtml;
    }
    
    // Display order items
    function displayOrderItems() {
        const container = document.getElementById('order-items');
        if (!container) return;
        
        let html = '';
        
        checkoutCart.forEach(item => {
            const qty = item.qty || item.quantity || 1;
            const itemTotal = (item.price * qty) / 100;
            
            html += `
                <div class="order-item flex items-center space-x-3 p-3 rounded-lg">
                    <div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        ${item.image_url ? 
                            `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover rounded-lg">` :
                            `<span class="text-xs text-gray-500">📦</span>`
                        }
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-900 text-sm truncate">${escapeHtml(item.name)}</div>
                        <div class="text-xs text-gray-500">Qty: ${qty} × ₹${(item.price / 100).toFixed(2)}</div>
                    </div>
                    <div class="font-semibold text-gray-900">₹${itemTotal.toFixed(2)}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Calculate and display totals
   // ✅ ENHANCED: Calculate totals with proper shipping logic
function calculateTotals() {
    let subtotal = 0;
    
    checkoutCart.forEach(item => {
        const qty = item.qty || item.quantity || 1;
        subtotal += (item.price * qty) / 100;
    });
    
    // ✅ USE PROFESSIONAL SHIPPING CALCULATION
    const shipping = calculateShipping(subtotal, selectedPaymentMethod);
    totalAmount = shipping.total;
    
    // Update UI elements
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total-amount');
    const codFeeRow = document.getElementById('cod-fee-row');
    const shippingElement = document.querySelector('.flex.justify-between .text-green-600');
    
    if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `₹${totalAmount.toFixed(2)}`;
    
    // ✅ UPDATE SHIPPING DISPLAY
    const shippingRows = document.querySelectorAll('.flex.justify-between');
    let shippingRow = null;
    
    // Find the shipping row by looking for "Shipping" text
    shippingRows.forEach(row => {
        const spans = row.querySelectorAll('span');
        if (spans.length >= 2 && spans[0].textContent.includes('Shipping')) {
            shippingRow = row;
        }
    });
    
    if (shippingRow) {
        const shippingAmountSpan = shippingRow.querySelector('span:last-child');
        if (shippingAmountSpan) {
            if (shipping.isFreeShipping) {
                shippingAmountSpan.textContent = 'FREE';
                shippingAmountSpan.className = 'text-green-600 font-medium';
            } else {
                shippingAmountSpan.textContent = `₹${shipping.shippingFee.toFixed(2)}`;
                shippingAmountSpan.className = 'text-gray-900 font-medium';
            }
        }
    }
    
    // ✅ ENHANCED COD FEE HANDLING
    if (codFeeRow) {
        codFeeRow.style.display = shipping.codFee > 0 ? 'flex' : 'none';
        const codFeeElement = document.getElementById('cod-fee');
        if (codFeeElement && shipping.codFee > 0) {
            codFeeElement.textContent = `₹${shipping.codFee.toFixed(2)}`;
        }
    }
    
    // ✅ DEBUG LOGGING
    console.log('Payment totals calculated:', {
        subtotal: subtotal.toFixed(2),
        paymentMethod: selectedPaymentMethod,
        shippingFee: shipping.shippingFee.toFixed(2),
        codFee: shipping.codFee.toFixed(2),
        total: totalAmount.toFixed(2),
        isFreeShipping: shipping.isFreeShipping
    });
}

    // Setup payment method selection
    function setupPaymentMethodSelection() {
        const paymentMethods = document.querySelectorAll('.payment-method');
        const radioButtons = document.querySelectorAll('input[name="payment-method"]');
        
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => {
                const methodValue = method.dataset.method;
                const radio = method.querySelector('input[type="radio"]');
                
                if (radio) {
                    radio.checked = true;
                    selectedPaymentMethod = methodValue;
                    
                    // Update visual selection
                    paymentMethods.forEach(m => m.classList.remove('selected'));
                    method.classList.add('selected');
                    
                    // Recalculate totals
                    calculateTotals();
                    
                    console.log('Payment method selected:', selectedPaymentMethod);
                }
            });
        });
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedPaymentMethod = e.target.value;
                
                // Update visual selection
                paymentMethods.forEach(method => {
                    method.classList.toggle('selected', method.dataset.method === selectedPaymentMethod);
                });
                
                calculateTotals();
            });
        });
    }
    
    // Setup order placement
    function setupOrderPlacement() {
        const placeOrderBtn = document.getElementById('place-order-btn');
        const placeOrderText = document.getElementById('place-order-text');
        
        if (!placeOrderBtn) return;
        
        placeOrderBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (placeOrderBtn.disabled) return;
            
            // Show loading state
            placeOrderBtn.disabled = true;
            placeOrderText.innerHTML = '<span class="loading-spinner"></span> Creating Order...';
            
            try {
                if (selectedPaymentMethod === 'razorpay') {
                    await handleRazorpayPayment();
                } else if (selectedPaymentMethod === 'cod') {
                    await handleCashOnDelivery();
                }
            } catch (error) {
                console.error('Order placement failed:', error);
                showError('Order Failed', error.message || 'Please try again.');
            } finally {
                // Reset button state
                placeOrderBtn.disabled = false;
                placeOrderText.textContent = '🔒 Place Order Securely';
            }
        });
    }
    
    // ✅ CORRECTED: Handle Razorpay payment
    async function handleRazorpayPayment() {
        try {
            console.log('🔍 Initiating Razorpay payment...');
            
            // Create order on backend (no DB save yet)
            const orderData = await createOrder('razorpay');
            
            if (!orderData || !orderData.orderId) {
                throw new Error('Failed to create Razorpay order');
            }
            
            console.log('🔍 Razorpay order created:', orderData.orderId);
            
            // Configure Razorpay options
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                name: 'MantraAQ',
                description: 'Sustainable Products Order',
                order_id: orderData.orderId,
                prefill: {
                    name: shippingData.fullName,
                    email: currentUser.email,
                    contact: shippingData.mobile
                },
                theme: {
                    color: '#3b82f6'
                },
                handler: function(response) {
                    console.log('✅ Razorpay payment successful:', response);
                    handleRazorpaySuccess(response);
                },
                modal: {
                    ondismiss: function() {
                        console.log('❌ Razorpay payment cancelled by user');
                        showError('Payment Cancelled', 'You can try again when ready.');
                    }
                }
            };
            
            // Debug logging
            console.log('🔍 Opening Razorpay with options:', {
                key: options.key,
                amount: options.amount,
                order_id: options.order_id
            });
            
            // Open Razorpay checkout
            const rzp = new Razorpay(options);
            rzp.open();
            
        } catch (error) {
            console.error('🔥 Razorpay payment setup failed:', error);
            throw new Error(error.message || 'Payment setup failed');
        }
    }
    
    // ✅ CORRECTED: Handle Cash on Delivery
    async function handleCashOnDelivery() {
        try {
            console.log('🔍 Processing COD order...');
            
            // For COD, order is created and saved immediately
            const orderData = await createOrder('cod');
            
            if (!orderData || !orderData.success) {
                throw new Error('Failed to create COD order');
            }
            
            console.log('✅ COD order created successfully:', orderData.orderId);
            
            // For COD, show success immediately since order is confirmed
            handleCODSuccess({
                method: 'cod',
                orderId: orderData.orderId,
                amount: orderData.amount,
                message: orderData.message || 'COD order placed successfully'
            });
            
        } catch (error) {
            console.error('🔥 COD order failed:', error);
            throw new Error(error.message || 'COD order failed');
        }
    }
    
    // Create order on backend
    async function createOrder(paymentMethod = 'razorpay') {
        try {
            console.log(`🔍 Creating ${paymentMethod} order...`);
            
            const response = await fetch('/api/create-order', {
                method: 'POST',
                credentials: 'include',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: checkoutCart,
                    customer: {
                        name: shippingData.fullName,
                        email: currentUser.email,
                        mobile: shippingData.mobile,
                        address: shippingData
                    },
                    paymentMethod: paymentMethod
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create order');
            }
            
            console.log(`✅ ${paymentMethod} order API response:`, data);
            return data;
            
        } catch (error) {
            console.error('🔥 Create order error:', error);
            throw error;
        }
    }
    
    // ✅ NEW: Handle successful Razorpay payment
   function handleRazorpaySuccess(response) {
    console.log('🎉 Razorpay payment completed successfully');
    
    // Store payment details for success page
    localStorage.setItem('last-order', JSON.stringify({
        method: 'razorpay',
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
        timestamp: Date.now(),
        amount: totalAmount,
        items: checkoutCart.length
    }));
    
    // Clear cart and shipping data
    localStorage.removeItem('checkout-cart');
    localStorage.removeItem('shipping-data');
    localStorage.removeItem('mantraaq-cart');

    // Clear main cart UI if function exists
    if (typeof clearCartData === 'function') {
        clearCartData();
    } else if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Track successful payment
    if (typeof gtag !== 'undefined') {
        gtag('event', 'purchase', {
            transaction_id: response.razorpay_order_id,
            value: totalAmount,
            currency: 'INR',
            payment_method: 'razorpay'
        });
    }
    
    // ✅ PROFESSIONAL: Immediate redirect to success page
    console.log('Redirecting to order success page...');
    window.location.href = 'order-success.html';
}

function handleCODSuccess(orderDetails) {
    console.log('🎉 COD order placed successfully');
    
    // Store order details for success page
    localStorage.setItem('last-order', JSON.stringify({
        method: 'cod',
        orderId: orderDetails.orderId,
        timestamp: Date.now(),
        amount: orderDetails.amount / 100, // Convert from paise to rupees
        items: checkoutCart.length,
        message: orderDetails.message
    }));
    
    // Clear cart and shipping data
    localStorage.removeItem('checkout-cart');
    localStorage.removeItem('shipping-data');
    localStorage.removeItem('mantraaq-cart');

    // Clear main cart UI if function exists
    if (typeof clearCartData === 'function') {
        clearCartData();
    } else if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Track COD order
    if (typeof gtag !== 'undefined') {
        gtag('event', 'purchase', {
            transaction_id: orderDetails.orderId,
            value: totalAmount,
            currency: 'INR',
            payment_method: 'cod'
        });
    }
    
    // ✅ PROFESSIONAL: Immediate redirect to success page
    console.log('Redirecting to order success page...');
    window.location.href = 'order-success.html';
}

    
    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function showError(title, message) {
        console.error(`${title}: ${message}`);
        alert(`${title}: ${message}`);
    }
    
    // Initialize when DOM loads
    document.addEventListener('DOMContentLoaded', initPaymentPage);
    
})();
