// cart-page.js - TOP-NOTCH PROFESSIONAL CART
(function() {
    'use strict';

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }


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

// ✅ ADD FREE SHIPPING PROGRESS FUNCTION
function updateShippingProgress(subtotal, threshold) {
    const progressContainer = document.getElementById('free-shipping-progress');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    
    if (!progressContainer) return;
    
    if (subtotal >= threshold) {
        // Free shipping achieved
        progressContainer.classList.add('hidden');
    } else {
        // Show progress
        const remaining = threshold - subtotal;
        const progress = (subtotal / threshold) * 100;
        
        progressContainer.classList.remove('hidden');
        
        if (progressText) {
            progressText.textContent = `Add ₹${remaining.toFixed(0)} more for FREE shipping!`;
        }
        
        if (progressBar) {
            progressBar.style.width = `${Math.max(progress, 10)}%`; // Minimum 10% for visibility
        }
    }
}
    
    function getCart() {
        const stored = localStorage.getItem('mantraaq-cart');
        return stored ? JSON.parse(stored) : [];
    }
    
    function saveCart(cartData) {
        localStorage.setItem('mantraaq-cart', JSON.stringify(cartData));
        updateCartCount();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cartData }));
    }
    
    function updateCartCount() {
        const cart = getCart();
        const count = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);
        
        // Update all cart count elements
        ['cart-count', 'mobile-cart-count', 'cart-item-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'cart-count') {
                    el.textContent = count === 1 ? '1 item' : `${count} items`;
                } else {
                    el.textContent = count;
                }
            }
        });
    }
    
    // ✅ FIXED: Allow quantity to go to 0 and remove item
    function updateQuantity(itemId, newQty) {
        let cart = getCart();
        
        if (newQty <= 0) {
            // Remove item when quantity reaches 0
            cart = cart.filter(item => item.id != itemId);
            console.log(`Item ${itemId} removed from cart (quantity = 0)`);
        } else {
            const item = cart.find(item => item.id == itemId);
            if (item) {
                const maxQty = item.stock_quantity || 99;
                item.qty = Math.min(maxQty, Math.max(1, newQty));
                item.quantity = item.qty;
                console.log(`Item ${itemId} quantity updated to ${item.qty}`);
            }
        }
        
        saveCart(cart);
        renderCartItems();
        showQuantityFeedback(itemId, newQty);
    }
    
    function showQuantityFeedback(itemId, newQty) {
        // Visual feedback for quantity changes
        const qtyDisplay = document.querySelector(`[data-item-id="${itemId}"] .qty-display`);
        if (qtyDisplay) {
            qtyDisplay.style.color = newQty <= 0 ? '#dc2626' : '#059669';
            qtyDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                qtyDisplay.style.color = '#111827';
                qtyDisplay.style.transform = 'scale(1)';
            }, 600);
        }
    }
    
    function removeItem(itemId) {
        let cart = getCart();
        cart = cart.filter(item => item.id != itemId);
        saveCart(cart);
        renderCartItems();
    }

    // ✅ ENHANCED: Professional Cart Rendering with Weight/Volume
    function renderCartItems() {
        const container = document.getElementById('cart-items-list');
        const loading = document.getElementById('cart-loading');
        const empty = document.getElementById('cart-empty');
        
        if (loading) loading.style.display = 'none';
        
        const cart = getCart();
        console.log('Rendering cart:', { cartLength: cart.length });
        
        if (!cart || cart.length === 0) {
            if (empty) empty.classList.remove('hidden');
            if (container) container.innerHTML = '';
            updateOrderSummary([]);
            return;
        }
        
        if (empty) empty.classList.add('hidden');
        
        const itemsHTML = cart.map(item => {
            const qty = item.qty || item.quantity || 1;
            const weightVolume = item.weight || item.volume || '';
            const stockRemaining = (item.stock_quantity || 99) - qty;
            
            // ✅ PROFESSIONAL: Better stock messaging
            let stockMessage;
            let stockClass = 'item-stock';
            
            if (stockRemaining > 5) {
                stockMessage = `${stockRemaining} available`;
                stockClass = 'item-stock';
            } else if (stockRemaining > 0) {
                stockMessage = `Only ${stockRemaining} left`;
                stockClass = 'item-stock';
            } else {
                stockMessage = 'No more stock';
                stockClass = 'item-stock out-of-stock';
            }
            
            return `
                <div class="cart-item" data-item-id="${item.id}">
                    <!-- Product Image -->
                    <div class="item-image-container">
                        <img src="${item.image_url || 'https://via.placeholder.com/100x100?text=Product'}" 
                             alt="${item.name}" 
                             class="item-image">
                    </div>
                    
                    <!-- Product Details -->
                    <div class="item-details">
                        <h3 class="item-name">${item.name}</h3>
                        ${weightVolume ? 
                            `<div class="item-weight">${weightVolume}</div>` 
                            : ''
                        }
                        <div class="item-price">₹${(item.price / 100).toFixed(2)} each</div>
                        <div class="${stockClass}">
                            ${stockMessage}
                        </div>
                    </div>
                    
                    <!-- Quantity Controls -->
                    <div class="quantity-controls">
                        <button class="qty-btn" 
                                data-item-id="${item.id}" 
                                data-action="decrease">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M20 12H4"/>
                            </svg>
                        </button>
                        
                        <div class="qty-display">${qty}</div>
                        
                        <button class="qty-btn" 
                                data-item-id="${item.id}" 
                                data-action="increase"
                                ${qty >= (item.stock_quantity || 99) ? 'disabled' : ''}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Item Total and Remove -->
                    <div class="item-total-section">
                        <div class="item-total">₹${((item.price * qty) / 100).toFixed(2)}</div>
                        <button class="remove-btn" data-item-id="${item.id}">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        if (container) {
            container.innerHTML = itemsHTML;
            container.style.visibility = 'visible';
            container.style.opacity = '1';
        }
        
        updateOrderSummary(cart);
    }

    // ✅ ENHANCED: Updated Order Summary with Place Order Button Support
   // ✅ ENHANCED: Updated Order Summary with Shipping Calculation
function updateOrderSummary(cart) {
    const subtotalRaw = cart.reduce((sum, item) => {
        const qty = item.qty || item.quantity || 1;
        return sum + (item.price * qty);
    }, 0);
    
    const subtotal = subtotalRaw / 100; // Convert from paise to rupees
    const itemCount = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 1), 0);
    
    // ✅ CALCULATE SHIPPING (default to online for cart page)
    const shipping = calculateShipping(subtotal, 'online');
    
    // Update summary elements
    const updates = {
        'item-count': itemCount,
        'subtotal': `₹${subtotal.toFixed(2)}`,
        'total-amount': `₹${shipping.total.toFixed(2)}`
    };
    
    Object.entries(updates).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // ✅ UPDATE SHIPPING DISPLAY
    const shippingElement = document.getElementById('shipping-amount');
    if (shippingElement) {
        if (shipping.isFreeShipping) {
            shippingElement.textContent = 'FREE';
            shippingElement.className = 'font-bold text-green-600';
        } else {
            shippingElement.textContent = `₹${shipping.shippingFee.toFixed(2)}`;
            shippingElement.className = 'font-bold text-gray-900';
        }
    }
    
    // ✅ UPDATE FREE SHIPPING PROGRESS
    updateShippingProgress(subtotal, shipping.freeShippingThreshold);
    
    // ✅ PROFESSIONAL: Update Place Order button
    const placeOrderBtn = document.getElementById('place-order-btn');
    const placeOrderText = document.getElementById('place-order-text');
    
    if (placeOrderBtn && placeOrderText) {
        if (cart.length === 0) {
            placeOrderBtn.disabled = true;
            placeOrderText.textContent = 'Cart is Empty';
        } else {
            placeOrderBtn.disabled = false;
            placeOrderText.textContent = `Place Order (₹${shipping.total.toFixed(2)})`;
        }
    }
    
    // ✅ FALLBACK: Support old checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    const checkoutText = document.getElementById('checkout-text');
    
    if (checkoutBtn && checkoutText) {
        if (cart.length === 0) {
            checkoutBtn.disabled = true;
            checkoutText.textContent = 'Cart is Empty';
        } else {
            checkoutBtn.disabled = false;
            checkoutText.textContent = `Pay ₹${shipping.total.toFixed(2)}`;
        }
    }
}

    // ✅ NEW: Professional checkout flow handler
    // ✅ PROFESSIONAL: Login Check Before Checkout using your existing auth system
async function handlePlaceOrder() {
    const cart = getCart();
    if (!cart || cart.length === 0) {
        alert('Your cart is empty');
        return;
    }
    
    // Show loading state on button
    const placeOrderBtn = document.getElementById('place-order-btn');
    const placeOrderText = document.getElementById('place-order-text');
    
    if (placeOrderBtn && placeOrderText) {
        const originalText = placeOrderText.textContent;
        placeOrderText.textContent = 'Checking login...';
        placeOrderBtn.disabled = true;
        
        try {
            // ✅ Use your existing auth endpoint to check login status
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include', // Include session cookies (sid)
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.user && data.user.id) {
                    // ✅ User is logged in - store cart and redirect to shipping
                    console.log('User is logged in:', data.user.email);
                    localStorage.setItem('checkout-cart', JSON.stringify(cart));
                    localStorage.setItem('checkout-user', JSON.stringify(data.user));
                    
                    // Redirect to shipping address page (instead of checkout.html)
                    window.location.href = 'shipping.html';
                    return;
                }
            }
            
            // ✅ User not logged in - store cart and redirect to home with login modal
            console.log('User not logged in, opening login modal');
            localStorage.setItem('checkout-cart', JSON.stringify(cart));
            localStorage.setItem('redirect-after-login', 'shipping.html');
            
            // Redirect to home page and trigger login modal
            window.location.href = '/?login=required';
            
        } catch (error) {
            console.error('Auth check failed:', error);
            // On error, redirect to home with login requirement
            localStorage.setItem('checkout-cart', JSON.stringify(cart));
            localStorage.setItem('redirect-after-login', 'shipping.html');
            window.location.href = '/?login=required';
        } finally {
            // Restore button state
            placeOrderText.textContent = originalText;
            placeOrderBtn.disabled = false;
        }
    }
}

    // ✅ ENHANCED: Event delegation for all cart interactions including Place Order
    function setupCartEventListeners() {
        document.addEventListener('click', function(event) {
            // ✅ NEW: Handle Place Order button
            if (event.target.matches('#place-order-btn') || event.target.closest('#place-order-btn')) {
                event.preventDefault();
                handlePlaceOrder();
                return;
            }
            
            // Handle quantity decrease (can go to 0)
            if (event.target.closest('.qty-btn[data-action="decrease"]')) {
                event.preventDefault();
                const button = event.target.closest('.qty-btn[data-action="decrease"]');
                const itemId = button.getAttribute('data-item-id');
                const cart = getCart();
                const item = cart.find(i => i.id == itemId);
                
                if (item) {
                    const qty = item.qty || item.quantity || 1;
                    updateQuantity(itemId, qty - 1); // Can go to 0 and remove item
                }
            }
            
            // Handle quantity increase
            else if (event.target.closest('.qty-btn[data-action="increase"]')) {
                event.preventDefault();
                const button = event.target.closest('.qty-btn[data-action="increase"]');
                const itemId = button.getAttribute('data-item-id');
                const cart = getCart();
                const item = cart.find(i => i.id == itemId);
                
                if (item) {
                    const qty = item.qty || item.quantity || 1;
                    const maxQty = item.stock_quantity || 99;
                    if (qty < maxQty) {
                        updateQuantity(itemId, qty + 1);
                    }
                }
            }
            
            // Handle item removal
            else if (event.target.matches('.remove-btn')) {
                event.preventDefault();
                const itemId = event.target.getAttribute('data-item-id');
                
                // Professional confirmation
                if (confirm('Remove this item from your cart?')) {
                    removeItem(itemId);
                }
            }
        });
    }
    
    // ✅ PROFESSIONAL: Initialize Cart Page
    function initializeCartPage() {
        console.log('Initializing professional cart page...');
        
        updateCartCount();
        renderCartItems();
        setupCartEventListeners();
        
        // Debounced event handlers
        const debouncedRender = debounce(() => {
            console.log('Cart updated, re-rendering...');
            updateCartCount();
            renderCartItems();
        }, 150);
        
        // Event listeners for cart updates
        window.addEventListener('cartUpdated', debouncedRender);
        window.addEventListener('storage', (e) => {
            if (e.key === 'mantraaq-cart') {
                debouncedRender();
            }
        });
        
        // Page visibility handler
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                setTimeout(() => {
                    updateCartCount();
                    renderCartItems();
                }, 100);
            }
        });
    }
    
    // Start when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Cart page DOM loaded, initializing...');
        initializeCartPage();
        
        // Safety render
        setTimeout(() => {
            console.log('Safety render triggered');
            renderCartItems();
        }, 300);
    });
    
})();
