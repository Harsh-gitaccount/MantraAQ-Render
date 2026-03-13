// =======================
// GLOBAL STATE MANAGEMENT
// =======================
let currentUser = null;
let products = [];
let cart = [];
let isMenuOpen = false;

// ============
// UTILITIES
// ============
function $(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element '${id}' not found`);
    return el;
}

function show(el) { if (el && el.classList) el.classList.remove('hidden'); }
function hide(el) { if (el && el.classList) el.classList.add('hidden'); }

function addEventListenerSafe(id, event, handler) {
    const element = $(id);
    if (element) element.addEventListener(event, handler);
    else console.warn(`Cannot add ${event} listener: element '${id}' not found`);
}

const api = async (path, opts = {}) => {
    try {
        const response = await fetch(`/api${path}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            ...opts
        });
        const data = await response.json();
        if (!response.ok) {
            const error = new Error(data.error || data.message || 'Request failed');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch'))
            throw new Error('Network error. Please check your connection.');
        throw error;
    }
};

function isCartPage() { return window.location.pathname.includes('cart.html'); }

// ================
// MODALS, MENU, TOAST
// ================
function openModal(id) {
    closeMenu();
    const backdrop = $("modal-backdrop");
    const modal = $(id);
    if (backdrop) backdrop.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
}

function closeModals() {
    const backdrop = $("modal-backdrop");
    if (backdrop) backdrop.classList.add('hidden');
    document.querySelectorAll('.fixed.inset-0.z-50').forEach(m => {
        if (m.id !== 'modal-backdrop') hide(m);
    });
    closeMenu();
}

function closeMenu() {
    isMenuOpen = false;
    const menu = $("mobile-menu");
    const hamburgerIcon = $("hamburger-icon");
    const closeIcon = $("close-icon");
    if (menu) menu.classList.add('hidden');
    if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
    if (closeIcon) closeIcon.classList.add('hidden');
    const btn = $("mobile-menu-btn");
    if (btn) btn.setAttribute('aria-expanded', 'false');
}

function openMenu() {
    isMenuOpen = true;
    const menu = $("mobile-menu");
    const hamburgerIcon = $("hamburger-icon");
    const closeIcon = $("close-icon");
    if (menu) menu.classList.remove('hidden');
    if (hamburgerIcon) hamburgerIcon.classList.add('hidden');
    if (closeIcon) closeIcon.classList.remove('hidden');
    const btn = $("mobile-menu-btn");
    if (btn) btn.setAttribute('aria-expanded', 'true');
}

// Toast notifications (CSP-compliant, no inline)
function showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-full`;
    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    toast.classList.add(bgColors[type] || bgColors.info);
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 100);
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(toast)) document.body.removeChild(toast);
        }, 300);
    }, 4000);
}

// ✅ ADD ALL THESE NEW FUNCTIONS
// ✅ UPDATED: Remove Settings and enhance functions
function setupUserMenuEvents() {
    // Desktop user menu toggle
    addEventListenerSafe("user-menu-btn", "click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleUserDropdown();
    });
    
    // ✅ UPDATED: Menu item handlers (NO SETTINGS)
    addEventListenerSafe("profile-menu-item", "click", handleProfileClick);
    addEventListenerSafe("orders-menu-item", "click", handleOrdersClick);
    
    // Mobile menu item handlers
    addEventListenerSafe("mobile-profile-item", "click", handleMobileProfileClick);
    addEventListenerSafe("mobile-orders-item", "click", handleMobileOrdersClick);
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const userMenu = $("user-menu");
        const dropdown = $("user-dropdown");
        if (userMenu && dropdown && !userMenu.contains(e.target)) {
            closeUserDropdown();
        }
    });
}

// ✅ ENHANCED: Premium animation duration
function toggleUserDropdown() {
    const dropdown = $("user-dropdown");
    const arrow = $("dropdown-arrow");
    
    if (dropdown && arrow) {
        const isHidden = dropdown.classList.contains('hidden');
        
        if (isHidden) {
            // Show dropdown with premium animation
            dropdown.classList.remove('hidden', 'opacity-0', 'scale-95');
            dropdown.classList.add('opacity-100', 'scale-100');
            arrow.style.transform = 'rotate(180deg)';
        } else {
            // Hide dropdown
            closeUserDropdown();
        }
    }
}

// ✅ ENHANCED: Premium animation timing
function closeUserDropdown() {
    const dropdown = $("user-dropdown");
    const arrow = $("dropdown-arrow");
    
    if (dropdown && arrow) {
        dropdown.classList.remove('opacity-100', 'scale-100');
        dropdown.classList.add('opacity-0', 'scale-95');
        arrow.style.transform = 'rotate(0deg)';
        
        // ✅ UPDATED: Longer timeout for smoother animation
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 300);
    }
}

// ✅ UPDATED: Menu item handlers (NO SETTINGS)
function handleProfileClick() {
    closeUserDropdown();
    showUserProfile();
}

function handleOrdersClick() {
    closeUserDropdown();
    window.location.href = 'orders.html';
}

// ✅ REMOVED: handleSettingsClick function (deleted)

function handleMobileProfileClick() {
    closeMenu();
    showUserProfile();
}

function handleMobileOrdersClick() {
    closeMenu();
    window.location.href = 'orders.html';
}

// ✅ ENHANCED: Premium profile display with better formatting
function showUserProfile() {
    if (currentUser) {
        const memberSince = new Date(currentUser.created_at).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        });
        
        const profileDetails = `🏆 PREMIUM MEMBER PROFILE

👤 Name: ${currentUser.name}
📧 Email: ${currentUser.email}
📅 Member Since: ${memberSince}
🎯 Status: Active Premium Member

✨ Profile management features coming soon!
🚀 Thank you for being a valued member!`;
        
        alert(profileDetails);
    }
}

// ✅ KEEP: Your updateUserDisplay function is perfect as-is
function updateUserDisplay() {
    if (currentUser) {
        // Desktop user info
        const userInitial = $('user-initial');
        const userName = $('user-name');
        const dropdownUserName = $('dropdown-user-name');
        const dropdownUserEmail = $('dropdown-user-email');
        const dropdownUserInitial = $('dropdown-user-initial');
        
        // Mobile user info  
        const mobileUserInitial = $('mobile-user-initial');
        const mobileUserName = $('mobile-user-name');
        const mobileUserEmail = $('mobile-user-email');
        
        const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
        
        if (userInitial) userInitial.textContent = initial;
        if (userName) userName.textContent = currentUser.name;
        if (dropdownUserName) dropdownUserName.textContent = currentUser.name;
        if (dropdownUserEmail) dropdownUserEmail.textContent = currentUser.email;
        if (dropdownUserInitial) dropdownUserInitial.textContent = initial;
        if (mobileUserInitial) mobileUserInitial.textContent = initial;
        if (mobileUserName) mobileUserName.textContent = currentUser.name;
        if (mobileUserEmail) mobileUserEmail.textContent = currentUser.email;

        // Handle verify menu item visibility
        const verifyMenuItem = $('verify-menu-item');
        if (verifyMenuItem) {
            if (currentUser.email_verified) {
                verifyMenuItem.classList.add('hidden');
            } else {
                verifyMenuItem.classList.remove('hidden');
            }
        }
        
        // Show user menu, hide auth buttons
        const userMenu = $('user-menu');
        const authButtons = $('auth-buttons');
        const mobileUserMenu = $('mobile-user-menu');
        const mobileAuthButtons = $('mobile-auth-buttons');
        
        if (userMenu) userMenu.classList.remove('hidden');
        if (authButtons) authButtons.classList.add('hidden');
        if (mobileUserMenu) mobileUserMenu.classList.remove('hidden');
        if (mobileAuthButtons) mobileAuthButtons.classList.add('hidden');
    } else {
        // Hide user menu, show auth buttons
        const userMenu = $('user-menu');
        const authButtons = $('auth-buttons');
        const mobileUserMenu = $('mobile-user-menu');
        const mobileAuthButtons = $('mobile-auth-buttons');
        
        if (userMenu) userMenu.classList.add('hidden');
        if (authButtons) authButtons.classList.remove('hidden');
        if (mobileUserMenu) mobileUserMenu.classList.add('hidden');
        if (mobileAuthButtons) mobileAuthButtons.classList.remove('hidden');
    }
}

// ===============
function setupEventListeners() {
    // Modal handling
    addEventListenerSafe("modal-backdrop", "click", closeModals);
    document.querySelectorAll(".modal-close").forEach(btn => {
        btn.addEventListener("click", closeModals);
    });
    
    // Mobile menu toggle
    addEventListenerSafe("mobile-menu-btn", "click", toggleMobileMenu);
    function toggleMobileMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        isMenuOpen ? closeMenu() : openMenu();
    }
    
    // Close menu when clicking links inside it
    document.addEventListener('DOMContentLoaded', function() {
        const mobileMenu = $("mobile-menu");
        if (mobileMenu) {
            mobileMenu.querySelectorAll('a, button').forEach(link => {
                link.addEventListener('click', closeMenu);
            });
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        const menu = $("mobile-menu");
        const btn = $("mobile-menu-btn");
        if (isMenuOpen && menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
            closeMenu();
        }
    });
    
    // Auth buttons/modal logic
    addEventListenerSafe("btn-signup", "click", () => openModal("modal-signup"));
    addEventListenerSafe("btn-login", "click", () => openModal("modal-login"));
    addEventListenerSafe("mobile-btn-signup", "click", () => openModal("modal-signup"));
    addEventListenerSafe("mobile-btn-login", "click", () => openModal("modal-login"));
    addEventListenerSafe("switch-to-login", "click", () => { 
        closeModals(); 
        openModal("modal-login"); 
    });
    addEventListenerSafe("switch-to-signup", "click", () => { 
        closeModals(); 
        openModal("modal-signup"); 
    });
    addEventListenerSafe("link-forgot", "click", (e) => { 
        e.preventDefault(); 
        closeModals(); 
        openModal("modal-forgot"); 
    });
    addEventListenerSafe("back-to-login", "click", () => { 
        closeModals(); 
        openModal("modal-login"); 
    });
    
    // Auth forms
    addEventListenerSafe("su-submit", "click", handleSignup);
    addEventListenerSafe("li-submit", "click", handleLogin);
    addEventListenerSafe("fp-submit", "click", handleForgotPassword);
    addEventListenerSafe("rp-submit", "click", handleResetPassword);
    addEventListenerSafe("btn-logout", "click", logout);
    addEventListenerSafe("mobile-btn-logout", "click", logout);
    
    // Checkout handler
    addEventListenerSafe("checkout-btn", "click", handleCheckout);
    
    // ✅ NEW: Professional User Menu Events (replaces old user dropdown code)
    setupUserMenuEvents();
}

    // ⭐ ENHANCED DELEGATION FOR PROFESSIONAL E-COMMERCE
    document.addEventListener('click', function(event) {
        // Product page quantity decrease buttons
        if (event.target.matches('.qty-decrease-product') || event.target.closest('.qty-decrease-product')) {
            event.preventDefault();
            const button = event.target.matches('.qty-decrease-product') ? event.target : event.target.closest('.qty-decrease-product');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.product-qty-input[data-product-id="${productId}"]`);
            
            if (qtyInput) {
                const currentQty = parseInt(qtyInput.value) || 1;
                if (currentQty > 1) {
                    qtyInput.value = currentQty - 1;
                }
            }
        }
        
        // Product page quantity increase buttons
        else if (event.target.matches('.qty-increase-product') || event.target.closest('.qty-increase-product')) {
            event.preventDefault();
            const button = event.target.matches('.qty-increase-product') ? event.target : event.target.closest('.qty-increase-product');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.product-qty-input[data-product-id="${productId}"]`);
            const product = products.find(p => p.id === productId);
            
            if (qtyInput && product) {
                const currentQty = parseInt(qtyInput.value) || 1;
                if (currentQty < product.stock_quantity) {
                    qtyInput.value = currentQty + 1;
                }
            }
        }
        
        // Enhanced Add to Cart with quantity support
        else if (event.target.matches('.add-to-cart-btn') || event.target.closest('.add-to-cart-btn')) {
            event.preventDefault();
            const button = event.target.matches('.add-to-cart-btn') ? event.target : event.target.closest('.add-to-cart-btn');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.product-qty-input[data-product-id="${productId}"]`) || 
                            document.querySelector(`.rec-qty-input[data-product-id="${productId}"]`);
            const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
            
            if (productId) {
                addToCart(productId, quantity);
                // Reset quantity input after adding
                if (qtyInput) qtyInput.value = 1;
            }
        }
        
        // Cart quantity increase
        else if (event.target.matches('.qty-increase') || event.target.closest('.qty-increase')) {
            event.preventDefault();
            const button = event.target.matches('.qty-increase') ? event.target : event.target.closest('.qty-increase');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.cart-qty-input[data-product-id="${productId}"]`);
            
            if (qtyInput) {
                const max = parseInt(qtyInput.getAttribute('max'));
                const currentVal = parseInt(qtyInput.value) || 1;
                if (currentVal < max) {
                    qtyInput.value = currentVal + 1;
                    updateCartQuantity(productId, currentVal + 1);
                }
            }
        }
        
        // Cart quantity decrease
        else if (event.target.matches('.qty-decrease') || event.target.closest('.qty-decrease')) {
            event.preventDefault();
            const button = event.target.matches('.qty-decrease') ? event.target : event.target.closest('.qty-decrease');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.cart-qty-input[data-product-id="${productId}"]`);
            
            if (qtyInput) {
                const currentVal = parseInt(qtyInput.value) || 1;
                if (currentVal > 1) {
                    qtyInput.value = currentVal - 1;
                    updateCartQuantity(productId, currentVal - 1);
                }
            }
        }
        
        // Recommended products quantity controls
        else if (event.target.matches('.qty-decrease-rec') || event.target.closest('.qty-decrease-rec')) {
            event.preventDefault();
            const button = event.target.matches('.qty-decrease-rec') ? event.target : event.target.closest('.qty-decrease-rec');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.rec-qty-input[data-product-id="${productId}"]`);
            
            if (qtyInput) {
                const currentQty = parseInt(qtyInput.value) || 1;
                if (currentQty > 1) {
                    qtyInput.value = currentQty - 1;
                }
            }
        }
        
        else if (event.target.matches('.qty-increase-rec') || event.target.closest('.qty-increase-rec')) {
            event.preventDefault();
            const button = event.target.matches('.qty-increase-rec') ? event.target : event.target.closest('.qty-increase-rec');
            const productId = button.getAttribute('data-product-id');
            const qtyInput = document.querySelector(`.rec-qty-input[data-product-id="${productId}"]`);
            const product = products.find(p => p.id === productId);
            
            if (qtyInput && product) {
                const currentQty = parseInt(qtyInput.value) || 1;
                if (currentQty < product.stock_quantity) {
                    qtyInput.value = currentQty + 1;
                }
            }
        }
        
        // Remove from cart
        else if (event.target.matches('.remove-from-cart') || event.target.closest('.remove-from-cart')) {
            event.preventDefault();
            const button = event.target.matches('.remove-from-cart') ? event.target : event.target.closest('.remove-from-cart');
            const productId = button.getAttribute('data-product-id');
            if (productId) {
                removeFromCart(productId);
            }
        }
        
        // Continue Shopping
        else if (event.target.matches('[data-action="scroll-to-products"]')) {
            event.preventDefault();
            const productsSection = document.getElementById('products');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // Resend email verification
        else if (event.target.matches('[data-action="resend-verification"]')) {
            event.preventDefault();
            resendVerification();
        }
        
        // Verification modal handlers
        else if (event.target.matches('[data-action="open-verification-modal"]') || event.target.closest('[data-action="open-verification-modal"]')) {
            event.preventDefault();
            openVerificationModal();
        }
        else if (event.target.matches('[data-action="close-verification-modal"]') || event.target.closest('[data-action="close-verification-modal"]')) {
            event.preventDefault();
            const modal = document.getElementById('verification-modal');
            if (modal) {
                modal.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                }, 200);
            }
        }
        else if (event.target.matches('[data-action="dismiss-verification-banner"]') || event.target.closest('[data-action="dismiss-verification-banner"]')) {
            event.preventDefault();
            event.stopPropagation(); // prevent modal from opening
            sessionStorage.setItem('verification_dismissed', 'true');
            const banner = document.getElementById('verification-banner');
            if (banner) banner.remove();
        }
        
        // Modal auth switch buttons
        else if (event.target.matches('[data-action="switch-to-login"]')) {
            event.preventDefault();
            const email = event.target.getAttribute('data-email');
            closeModals();
            openModal("modal-login");
            if (email) {
                const emailInput = $("li-email");
                if (emailInput) emailInput.value = email;
            }
        }
        else if (event.target.matches('[data-action="switch-to-signup"]')) {
            event.preventDefault();
            const email = event.target.getAttribute('data-email');
            closeModals();
            openModal("modal-signup");
            if (email) {
                const emailInput = $("su-email");
                if (emailInput) emailInput.value = email;
            }
        }
        
        // Make entire verification banner clickable (excluding buttons) handled by delegation
    });
    
    // Handle direct input changes on cart quantity inputs
    document.addEventListener('change', function(event) {
        if (event.target.matches('.cart-qty-input')) {
            const productId = event.target.getAttribute('data-product-id');
            const newQty = parseInt(event.target.value) || 1;
            const max = parseInt(event.target.getAttribute('max'));
            
            if (productId) {
                const validQty = Math.min(max, Math.max(1, newQty));
                event.target.value = validQty;
                updateCartQuantity(productId, validQty);
            }
        }
    });



// ================
// EMAIL VERIFICATION + ANALYTICS
// ================
// Enhanced verification banner that works on ALL devices
function showVerificationStatus(isVerified) {
    const existingBanner = document.getElementById('verification-banner');
    if (existingBanner) existingBanner.remove();
    
    // Check if dismissed or already verified
    if (isVerified || sessionStorage.getItem('verification_dismissed') === 'true') {
        return;
    }
    
    const banner = document.createElement('div');
    banner.id = 'verification-banner';
    banner.className = 'verification-banner-responsive bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 transition-colors';
    banner.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center cursor-pointer flex-grow" data-action="open-verification-modal">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-yellow-700">
                        <strong>📧 Important: Please verify your email</strong> to secure your account and receive updates.
                    </p>
                </div>
            </div>
            <div class="flex-shrink-0 flex items-center gap-2">
                <button data-action="resend-verification" 
                        class="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1 rounded text-sm font-medium transition-colors">
                    Resend Email
                </button>
                <button data-action="dismiss-verification-banner" 
                        class="text-yellow-600 hover:text-yellow-900 px-2 py-1 rounded hover:bg-yellow-200 focus:outline-none transition-colors" title="Dismiss">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        </div>
    `;
    
    // Insert at top of page content
    const mainContent = document.querySelector('main') || document.querySelector('.container') || document.body;
    mainContent.insertBefore(banner, mainContent.firstChild);
}
// Open verification modal with detailed instructions
function openVerificationModal() {
    const modal = document.createElement('div');
    modal.id = 'verification-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 flex items-center">
                    <svg class="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M2.94 6.24A2 2 0 014.89 4h10.22a2 2 0 011.95 2.24l-.73 4A2 2 0 0114.38 12H9.24l-.43 2.58A2 2 0 016.86 16H5a1 1 0 010-2h1.86l.43-2.58A2 2 0 019.24 10h5.14l.73-4H4.89l-.95 3.24z" clip-rule="evenodd"/>
                    </svg>
                    Email Verification Required
                </h3>
                <button data-action="close-verification-modal" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="mb-6">
                <p class="text-gray-600 mb-4">
                    To secure your account and receive important updates, please verify your email address:
                    <strong class="text-blue-600">${currentUser?.email || 'your email'}</strong>
                </p>
                
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h4 class="text-sm font-medium text-blue-800">What you need to do:</h4>
                            <div class="mt-2 text-sm text-blue-700">
                                <ol class="list-decimal list-inside space-y-1">
                                    <li>Check your email inbox (and spam folder)</li>
                                    <li>Click the verification link in the email</li>
                                    <li>Or use the "Resend Email" button below</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-3">
                <button data-action="resend-verification" 
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    📧 Resend Verification Email
                </button>
                <button data-action="close-verification-modal" 
                        class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors">
                    I'll Do It Later
                </button>
            </div>
            
            <p class="text-xs text-gray-500 mt-3 text-center">
                💡 Tip: Verified users get access to exclusive features and faster support!
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add click handlers for modal buttons
    modal.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="close-verification-modal"]') || e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Enhanced resend verification with better feedback
let isResending = false;
async function resendVerification() {
    if (isResending) return;
    isResending = true;
    
    const elementsToDisable = document.querySelectorAll('[data-action="resend-verification"]');
    const originalTexts = Array.from(elementsToDisable).map(btn => btn.textContent);
    
    try {
        elementsToDisable.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading-spinner"></span> Sending...';
        });
        
        await api("/auth/resend-verification", { method: "POST" });
        
        showToast("✅ Verification email sent! Please check your inbox and spam folder.", "success");
        
        // Close modal if open
        const modal = document.getElementById('verification-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
        
        // Show countdown timer on banner
        let countdown = 60;
        elementsToDisable.forEach(btn => btn.textContent = `📧 Sent (${countdown}s)`);
        
        const timer = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                elementsToDisable.forEach(btn => btn.textContent = `📧 Sent (${countdown}s)`);
            } else {
                clearInterval(timer);
                elementsToDisable.forEach((btn, index) => {
                    btn.textContent = originalTexts[index];
                    btn.disabled = false;
                });
                isResending = false;
            }
        }, 1000);
        
    } catch (error) {
        showToast("❌ Failed to send verification email. Please try again.", "error");
        elementsToDisable.forEach((btn, index) => {
            btn.textContent = originalTexts[index];
            btn.disabled = false;
        });
        isResending = false;
    }
}


function trackVerificationMetrics() {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'email_verified', {
            'event_category': 'user_engagement',
            'event_label': 'email_verification'
        });
    }
}
// ======================
// AUTHENTICATION SYSTEM
// ======================

async function refreshUser() {
    // Don't try to refresh if user is already null/logged out
    if (!currentUser) {
        console.log('No current user, skipping refresh');
        return;
    }
    
    try {
        const res = await api("/auth/me", "GET");
        currentUser = res.user;
        updateAuthUI(currentUser); // Keep using your existing function
        console.log('✅ User data refreshed');
    } catch (error) {
        console.log('Failed to fetch user:', error);
        
        // If refresh fails, user is probably logged out
        currentUser = null;
        updateAuthUI(null);
        
        // Clear any stored tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
    }
}

function updateAuthUI(user) {
    // Set the global user variable
    currentUser = user;
    
    // Use the main display function
    updateUserDisplay();
    
    // Handle verification status (if you still need this)
    if (user) {
        showVerificationStatus(user.email_verified);
    } else {
        const existingBanner = document.getElementById('verification-banner');
        if (existingBanner) existingBanner.remove();
    }
}


async function logout() {
    console.log('🚪 Logging out user...');
    
    // Clear user data immediately (prevent further API calls)
    currentUser = null;
    
    // Close dropdown and update UI first
    closeUserDropdown();
    updateUserDisplay();
    
    // Clear cart data immediately
    clearCartData();
    
    // Clear any stored tokens/sessions
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    
    try {
        // Try to logout from server
        await api("/auth/logout", "POST");
        console.log('✅ Server logout successful');
        showToast("Logged out successfully", "success");
        
    } catch (error) {
        console.log('⚠️ Server logout failed (but user logged out locally):', error);
        
        // Show success anyway since local logout worked
        showToast("Logged out successfully", "success");
    }
    
    // Hide user dropdown (backup)
    const dropdown = $("user-dropdown");
    if (dropdown) dropdown.classList.add('hidden');
    
    // Redirect to home page after short delay
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}


async function handleSignup() {
    const name = $("su-name");
    const email = $("su-email");
    const password = $("su-pass");
    
    if (!name || !email || !password) {
        showMessage("su-msg", "Form elements not found", "error");
        return;
    }
    
    const nameValue = name.value.trim();
    const emailValue = email.value.trim();
    const passwordValue = password.value;
    
    if (!nameValue || nameValue.length < 2) {
        showMessage("su-msg", "Please enter your full name", "error");
        return;
    }
    if (!emailValue || !emailValue.includes('@')) {
        showMessage("su-msg", "Please enter a valid email address", "error");
        return;
    }
    if (!passwordValue || passwordValue.length < 8) {
        showMessage("su-msg", "Password must be at least 8 characters", "error");
        return;
    }
    
    const submitBtn = $("su-submit");
    if (submitBtn) {
        submitBtn.disabled = true;
        showMessage("su-msg", "Creating account...", "loading");
    }
    
    try {
        const res = await api("/auth/register", {
            method: "POST",
            body: JSON.stringify({ name: nameValue, email: emailValue, password: passwordValue })
        });
        showMessage("su-msg", res.message, "success");
        setTimeout(() => {
            closeModals();
            clearForm("signup");
        }, 2000);
    } catch (error) {
        if (error.status === 409) {
            showMessage("su-msg", `
                <div>An account with this email already exists</div>
                <button data-action="switch-to-login" data-email="${emailValue}" 
                        class="text-blue-500 hover:text-blue-600 text-xs mt-2 underline">
                    Sign in instead
                </button>
            `, "error");
        } else if (error.status === 500) {
            showMessage("su-msg", "Server error occurred. Please try again in a moment.", "error");
        } else {
            showMessage("su-msg", error.message || "Registration failed. Please try again.", "error");
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function handleLogin() {
    const email = $("li-email");
    const password = $("li-pass");
    
    if (!email || !password) {
        showMessage("li-msg", "Form elements not found", "error");
        return;
    }
    
    const emailValue = email.value.trim();
    const passwordValue = password.value;
    
    if (!emailValue || !passwordValue) {
        showMessage("li-msg", "Please enter both email and password", "error");
        return;
    }
    if (!emailValue.includes('@')) {
        showMessage("li-msg", "Please enter a valid email address", "error");
        return;
    }
    
    const submitBtn = $("li-submit");
    if (submitBtn) {
        submitBtn.disabled = true;
        showMessage("li-msg", "Signing in...", "loading");
    }
    
    try {
        console.log('🔄 Attempting login with:', { email: emailValue });
        
        // ✅ FIXED: Use YOUR api() function format correctly
        const res = await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: emailValue, password: passwordValue })
        });
        
        console.log('✅ Login response:', res);
        
        showMessage("li-msg", "Success! Welcome back.", "success");
        currentUser = res.user;
        
        // ✅ CRITICAL FIX: Save user data to localStorage
        localStorage.setItem('user', JSON.stringify(res.user));
        console.log('💾 User saved to localStorage:', res.user.name);
        
        // ✅ Store authentication token if provided
        if (res.token) {
            localStorage.setItem('authToken', res.token);
            console.log('🔑 Token saved to localStorage');
        }
        
        updateAuthUI(currentUser);
        
        // Check for redirect after login
        const redirectUrl = localStorage.getItem('redirect-after-login');
        if (redirectUrl) {
            localStorage.removeItem('redirect-after-login');
            setTimeout(() => {
                closeModals();
                clearForm("login");
                window.location.href = redirectUrl;
            }, 1000);
        } else {
            setTimeout(() => {
                closeModals();
                clearForm("login");
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        if (error.status === 401) {
            showMessage("li-msg", `
                <div>Invalid email or password. Please try again.</div>
                <div class="text-xs mt-1 text-gray-500">Double-check your credentials or use 'Forgot Password' to reset</div>
            `, "error");
            setTimeout(() => {
                const signupLink = document.createElement('button');
                signupLink.textContent = "Don't have an account? Sign up here";
                signupLink.className = "text-blue-500 hover:text-blue-600 text-xs mt-2 underline block";
                signupLink.setAttribute('data-action', 'switch-to-signup');
                signupLink.setAttribute('data-email', emailValue);
                const msgEl = $("li-msg");
                if (msgEl) msgEl.appendChild(signupLink);
            }, 1000);
        } else if (error.status === 400) {
            showMessage("li-msg", error.message || "Bad request", "error");
        } else if (error.status >= 500) {
            showMessage("li-msg", "Server error. Please try again later.", "error");
        } else {
            showMessage("li-msg", error.message || "Connection error. Please check your internet and try again.", "error");
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function handleForgotPassword() {
    const email = $("fp-email");
    if (!email) {
        showMessage("fp-msg", "Email input not found", "error");
        return;
    }
    
    const emailValue = email.value.trim();
    if (!emailValue || !emailValue.includes('@')) {
        showMessage("fp-msg", "Please enter a valid email address", "error");
        return;
    }
    
    const submitBtn = $("fp-submit");
    if (submitBtn) {
        submitBtn.disabled = true;
        showMessage("fp-msg", "Sending reset link...", "loading");
    }
    
    try {
        const res = await api("/auth/password/forgot", {
            method: "POST",
            body: JSON.stringify({ email: emailValue })
        });
        showMessage("fp-msg", res.message, "success");
    } catch (error) {
        showMessage("fp-msg", "Failed to send reset email. Please try again.", "error");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function handleResetPassword() {
    const password = $("rp-pass");
    if (!password) {
        showMessage("rp-msg", "Password input not found", "error");
        return;
    }
    
    const passwordValue = password.value;
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get("token");
    
    if (!passwordValue || passwordValue.length < 8) {
        showMessage("rp-msg", "Password must be at least 8 characters", "error");
        return;
    }
    
    const submitBtn = $("rp-submit");
    if (submitBtn) {
        submitBtn.disabled = true;
        showMessage("rp-msg", "Updating password...", "loading");
    }
    
    try {
        const res = await api("/auth/password/reset", {
            method: "POST",
            body: JSON.stringify({ token, password: passwordValue })
        });
        
        if (res.error) {
            showMessage("rp-msg", res.error, "error");
        } else {
            showMessage("rp-msg", res.message + " Redirecting...", "success");
            setTimeout(() => {
                closeModals();
                history.replaceState({}, "", "/");
            }, 2000);
        }
    } catch (error) {
        showMessage("rp-msg", "Failed to reset password. Please try again.", "error");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// ======================
// PRODUCTS & CART MANAGEMENT
// ======================

// FIXED main.js cart functions - REPLACE EVERYTHING BELOW

let isCartLoading = false; // Critical: Prevents infinite recursion
let cartUpdateTimeout = null;

// ✅ SAFE: Cart count update without recursion
function updateCartCountSafely() {
    const count = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
    
    // Update DOM elements directly, no function calls
    const elements = ['cart-count', 'mobile-cart-count', 'cart-item-count'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    });
}

// ✅ FIXED: Safe loadCartFromStorage function
function loadCartFromStorage() {
    // Prevent re-entrance/recursion
    if (isCartLoading) {
        console.log('Cart already loading, skipping...');
        return;
    }
    
    isCartLoading = true;
    
    try {
        const storedCart = localStorage.getItem('mantraaq-cart');
        if (storedCart) {
            try {
                const parsedCart = JSON.parse(storedCart);
                cart = parsedCart.map(item => ({
                    id: item.id,
                    qty: item.qty || item.quantity || 1
                }));
            } catch (parseError) {
                console.error('Error parsing cart from localStorage:', parseError);
                cart = [];
            }
        } else {
            cart = [];
        }
        
        // Update UI without causing recursion
        updateCartCountSafely();
        
    } catch (error) {
        console.error('Error in loadCartFromStorage:', error);
        cart = [];
    } finally {
        isCartLoading = false; // Always reset flag
    }
}

// ✅ FIXED: Safe cart synchronization
function syncCartToStorage() {
    const storageCart = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        return {
            id: item.id,
            name: product ? product.name : 'Unknown Product',
            price: product ? product.price : 0,
            image_url: product ? product.image_url : '',
            quantity: item.qty,
            qty: item.qty,
            stock_quantity: product ? product.stock_quantity : 0
        };
    });
    
    localStorage.setItem('mantraaq-cart', JSON.stringify(storageCart));
}

// ✅ FIXED: Enhanced addToCart function
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (product.stock_quantity <= 0) {
        showToast(`${product.name} is out of stock`, "error");
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    const currentCartQuantity = existingItem ? existingItem.qty : 0;
    const newQuantity = currentCartQuantity + quantity;
    
    if (newQuantity > product.stock_quantity) {
        showToast(`Only ${product.stock_quantity} ${product.name} available. You have ${currentCartQuantity} in cart.`, "error");
        return;
    }
    
    if (existingItem) {
        existingItem.qty = newQuantity;
    } else {
        cart.push({ 
            id: productId, 
            qty: quantity
        });
    }
    
    syncCartToStorage();
    updateCartUI();
    showToast(`${quantity} x ${product.name} added to cart!`, "success");
    
    // Notify other pages (debounced)
    clearTimeout(cartUpdateTimeout);
    cartUpdateTimeout = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: JSON.parse(localStorage.getItem('mantraaq-cart') || '[]')
        }));
    }, 50);
    
    if (isCartPage()) {
        renderCartPage();
        loadRecommendedProducts();
    }
}

// ✅ FIXED: updateCartUI function - NO recursive calls
function updateCartUI() {
    // Only update count, don't reload cart from storage
    updateCartCountSafely();
    
    // Only render cart if we're on a non-cart page
    if (!isCartPage()) {
        renderCart();
    }
}

// ✅ FIXED: updateCartCount function (for backward compatibility)
function updateCartCount(count) {
    const desktopCount = document.getElementById("cart-count");
    const mobileCount = document.getElementById("mobile-cart-count");
    if (desktopCount) desktopCount.textContent = count;
    if (mobileCount) mobileCount.textContent = count;
}

// ✅ FIXED: updateCartQuantity function
function updateCartQuantity(productId, newQty) {
    const product = products.find(p => p.id === productId);
    const item = cart.find(item => item.id === productId);
    
    if (!item || !product) return;
    
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQty > product.stock_quantity) {
        showToast(`Only ${product.stock_quantity} ${product.name} available`, "error");
        return;
    }
    
    item.qty = Math.min(product.stock_quantity, Math.max(1, newQty));
    syncCartToStorage();
    updateCartUI();
    
    if (isCartPage()) {
        renderCartPage();
        loadRecommendedProducts();
    }
}

// ✅ FIXED: removeFromCart function
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    syncCartToStorage();
    updateCartUI();
    
    if (isCartPage()) {
        renderCartPage();
        loadRecommendedProducts();
    }
}

// ✅ FIXED: renderCart function with proper formatting
function renderCart() {
    const cartItems = document.getElementById("cart-items");
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l1.5 6m0 0h8M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"></path>
                </svg>
                <p class="text-lg">Your cart is empty</p>
                <button data-action="scroll-to-products" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Continue Shopping
                </button>
            </div>
        `;
        const cartTotal = document.getElementById("cart-total");
        const checkoutBtn = document.getElementById("checkout-btn");
        if (cartTotal) cartTotal.textContent = "₹0.00";
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        
        const itemTotal = product.price * item.qty;
        total += itemTotal;
        
        // Format price safely
        const priceEach = '₹' + (product.price / 100).toFixed(2);
        const totalPrice = '₹' + (itemTotal / 100).toFixed(2);
        
        return `
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div class="flex items-center space-x-4">
                    <img src="${product.image_url}" alt="${product.name}" class="w-16 h-16 object-cover rounded-lg">
                    <div>
                        <h4 class="font-medium text-gray-900">${product.name}</h4>
                        <p class="text-gray-600">${priceEach} each</p>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <button class="qty-decrease w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                data-product-id="${item.id}" data-current-qty="${item.qty}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                            </svg>
                        </button>
                        <span class="w-8 text-center font-medium">${item.qty}</span>
                        <button class="qty-increase w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                data-product-id="${item.id}" data-current-qty="${item.qty}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="text-right">
                        <p class="font-semibold">${totalPrice}</p>
                        <button class="remove-from-cart text-red-500 hover:text-red-700 text-sm"
                                data-product-id="${item.id}">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const cartTotal = document.getElementById("cart-total");
    const checkoutBtn = document.getElementById("checkout-btn");
    const totalFormatted = '₹' + (total / 100).toFixed(2);
    if (cartTotal) cartTotal.textContent = totalFormatted;
    if (checkoutBtn) checkoutBtn.disabled = false;
}

// ✅ SAFE: Event listeners with debouncing (FIXED)
let storageEventTimeout = null;

// FIXED: Debounced handler for cartUpdated events
function handleCartUpdate() {
    if (!isCartLoading) {
        clearTimeout(storageEventTimeout);
        storageEventTimeout = setTimeout(() => {
            loadCartFromStorage();
        }, 100);
    }
}

// FIXED: Debounced handler for storage events
function handleStorageEvent(e) {
    if (e.key === 'mantraaq-cart' && !isCartLoading) {
        clearTimeout(storageEventTimeout);
        storageEventTimeout = setTimeout(() => {
            loadCartFromStorage();
        }, 100);
    }
}

// ✅ REPLACE your existing event listeners with these SAFE ones
// Remove your old event listeners and replace with:
window.removeEventListener('cartUpdated', loadCartFromStorage); // Remove old
window.removeEventListener('storage', loadCartFromStorage); // Remove old

window.addEventListener('cartUpdated', handleCartUpdate); // Add safe
window.addEventListener('storage', handleStorageEvent); // Add safe

// ✅ FIXED: Safe initialization function
function initializeCart() {
    // Only load cart once on page load
    if (!isCartLoading && cart.length === 0) {
        loadCartFromStorage();
    }
}

// ======================
// CHECKOUT & PAYMENT (Updated for new flow)
// ======================

async function handleCheckout() {
    if (!currentUser) {
        showToast("Please log in to place an order", "error");
        openModal("modal-login");
        return;
    }
    
    if (cart.length === 0) {
        showToast("Your cart is empty", "error");
        return;
    }
    
    try {
        // ✅ NEW: Store cart data for checkout flow
        localStorage.setItem('checkout-cart', JSON.stringify(cart));
        
        // ✅ NEW: Redirect to shipping page (new multi-step flow)
        window.location.href = '/shipping.html';
        
    } catch (error) {
        console.error('Checkout redirect error:', error);
        showToast("Failed to start checkout. Please try again.", "error");
    }
}

// ✅ REMOVED: Old handlePaymentSuccess - now handled in payment.js
// The new flow handles success in payment.js with proper modal and redirects

// ✅ NEW: Function to check if user has items in checkout flow
function hasActiveCheckout() {
    const checkoutCart = localStorage.getItem('checkout-cart');
    return checkoutCart && JSON.parse(checkoutCart).length > 0;
}

// ✅ NEW: Clear checkout data (useful for cleanup)
function clearCheckoutData() {
    localStorage.removeItem('checkout-cart');
    localStorage.removeItem('shipping-data');
    localStorage.removeItem('last-order');
}

// ✅ OPTIONAL: Enhanced add to cart with checkout suggestion
function addToCart(product) {
    // ... your existing add to cart logic ...
    
    // After adding to cart, show checkout suggestion
    if (cart.length === 1) {
        showToast("Item added! Ready to checkout?", "success", {
            action: "Checkout Now",
            callback: handleCheckout
        });
    } else {
        showToast(`${product.name} added to cart`, "success");
    }
}

// ======================
// CART PAGE FEATURES
// ======================

function renderCartPage() {
    const container = document.getElementById('cart-items-list');
    const loading = document.getElementById('cart-loading');
    const empty = document.getElementById('cart-empty');
    
    if (loading) loading.classList.add('hidden');
    
    if (!cart || cart.length === 0) {
        if (empty) empty.classList.remove('hidden');
        if (container) container.innerHTML = '';
        updateCartSummary();
        return;
    }
    
    if (empty) empty.classList.add('hidden');
    
    const itemsHTML = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return '';
        
        const itemTotal = product.price * item.qty;
        
        return `
            <div class="p-6 flex flex-col sm:flex-row gap-6 border-b border-gray-100 last:border-b-0">
                <!-- Product Image -->
                <div class="w-full sm:w-24 h-24 flex-shrink-0">
                    <img src="${product.image_url}" alt="${product.name}" 
                         class="w-full h-full object-cover rounded-lg border border-gray-200"
                         onerror="this.src='https://via.placeholder.com/150x150?text=${encodeURIComponent(product.name)}'">
                </div>
                
                <!-- Product Details -->
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">${product.name}</h3>
                    <p class="text-sm text-gray-600 mb-2 line-clamp-2">${product.description}</p>
                    <p class="text-base font-medium text-blue-600">₹${(product.price / 100).toFixed(2)} each</p>
                    <p class="text-xs text-gray-500 mt-1">${product.stock_quantity} available</p>
                </div>
                
                <!-- Quantity & Actions -->
                <div class="flex sm:flex-col items-center sm:items-end gap-4">
                    <!-- Professional Quantity Controls -->
                    <div class="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                        <button class="qty-decrease p-3 hover:bg-gray-100 transition-colors rounded-l-lg ${item.qty <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                                data-product-id="${item.id}" data-current-qty="${item.qty}"
                                ${item.qty <= 1 ? 'disabled' : ''}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                            </svg>
                        </button>
                        <input type="number" value="${item.qty}" min="1" max="${product.stock_quantity}" 
                               class="cart-qty-input w-16 py-3 text-center font-semibold bg-transparent border-0 focus:ring-0" 
                               data-product-id="${item.id}">
                        <button class="qty-increase p-3 hover:bg-gray-100 transition-colors rounded-r-lg ${item.qty >= product.stock_quantity ? 'opacity-50 cursor-not-allowed' : ''}"
                                data-product-id="${item.id}" data-current-qty="${item.qty}"
                                ${item.qty >= product.stock_quantity ? 'disabled' : ''}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Item Total & Remove -->
                    <div class="text-right">
                        <p class="text-xl font-bold text-gray-900 mb-2">₹${(itemTotal / 100).toFixed(2)}</p>
                        <button class="remove-from-cart inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                                data-product-id="${item.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (container) container.innerHTML = itemsHTML;
    updateCartSummary();
}

function updateCartSummary() {
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return product ? sum + (product.price * item.qty) : sum;
    }, 0);
    
    const elements = {
        'item-count': itemCount,
        'subtotal': `₹${(subtotal / 100).toFixed(2)}`,
        'total-amount': `₹${(subtotal / 100).toFixed(2)}`
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        if (cart.length === 0) {
            const checkoutText = checkoutBtn.querySelector('#checkout-text');
            if (checkoutText) checkoutText.textContent = 'Cart is Empty';
        } else {
            const checkoutText = checkoutBtn.querySelector('#checkout-text');
            if (checkoutText) checkoutText.textContent = `Pay ₹${(subtotal / 100).toFixed(2)}`;
        }
    }
}

function loadRecommendedProducts() {
    const container = document.getElementById('recommended-products');
    if (!container || !products.length) return;
    
    const cartProductIds = cart.map(item => item.id);
    
    // Get products not in cart first
    let availableProducts = products.filter(p => !cartProductIds.includes(p.id) && p.stock_quantity > 0);
    
    // If we don't have enough products not in cart, include some from cart (for repurchase)
    if (availableProducts.length < 3) {
        const cartProducts = products.filter(p => cartProductIds.includes(p.id) && p.stock_quantity > 0);
        availableProducts = [...availableProducts, ...cartProducts.slice(0, 3 - availableProducts.length)];
    }
    
    // If still not enough, get any available products
    if (availableProducts.length < 3) {
        const moreProducts = products.filter(p => p.stock_quantity > 0 && !availableProducts.some(ap => ap.id === p.id));
        availableProducts = [...availableProducts, ...moreProducts.slice(0, 3 - availableProducts.length)];
    }
    
    // Randomize and take 3
    const shuffled = availableProducts.sort(() => 0.5 - Math.random());
    const recommended = shuffled.slice(0, 3);
    
    container.innerHTML = recommended.map(product => `
        <div class="bg-white border rounded-lg p-4 hover:shadow-lg transition-all duration-200">
            <img src="${product.image_url}" alt="${product.name}" 
                 class="w-full h-32 object-cover rounded-lg mb-3"
                 onerror="this.src='https://via.placeholder.com/200x128?text=${encodeURIComponent(product.name)}'">
            <h4 class="font-semibold text-sm mb-2 line-clamp-2">${product.name}</h4>
            <p class="text-blue-600 font-bold text-lg mb-3">₹${(product.price / 100).toFixed(2)}</p>
            
            <div class="space-y-2">
                <div class="flex items-center justify-center space-x-2">
                    <button class="qty-decrease-rec w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors" 
                            data-product-id="${product.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                    </button>
                    <input type="number" class="rec-qty-input w-12 h-8 text-center text-sm border border-gray-300 rounded font-medium focus:ring-1 focus:ring-blue-500" 
                           data-product-id="${product.id}" 
                           value="1" 
                           min="1" 
                           max="${product.stock_quantity}">
                    <button class="qty-increase-rec w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors" 
                            data-product-id="${product.id}">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                </div>
                
                <button class="add-to-cart-btn w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        data-product-id="${product.id}">
                    Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}


function initPromoCode() {
    const applyBtn = document.getElementById('apply-promo');
    const promoInput = document.getElementById('promo-code');
    
    if (applyBtn && promoInput) {
        applyBtn.addEventListener('click', () => {
            const code = promoInput.value.trim().toLowerCase();
            const promoCodes = {
                'welcome10': { discount: 0.1, message: '10% discount applied!' },
                'save15': { discount: 0.15, message: '15% discount applied!' },
                'first20': { discount: 0.2, message: '20% discount applied!' }
            };
            
            if (promoCodes[code]) {
                showToast(promoCodes[code].message, 'success');
                promoInput.value = '';
            } else {
                showToast('Invalid promo code', 'error');
            }
        });
    }
}

// ======================
// UTILITY FUNCTIONS
// ======================

function showMessage(elementId, message, type) {
    const element = $(elementId);
    if (!element) return;
    
    element.innerHTML = message;
    
    const classes = {
        error: "text-sm text-center text-red-600",
        success: "text-sm text-center text-green-600",
        loading: "text-sm text-center text-blue-600"
    };
    
    element.className = classes[type] || classes.error;
}

function clearForm(type) {
    if (type === "signup") {
        const name = $("su-name");
        const email = $("su-email");
        const pass = $("su-pass");
        const msg = $("su-msg");
        
        if (name) name.value = "";
        if (email) email.value = "";
        if (pass) pass.value = "";
        if (msg) msg.innerHTML = "";
    } else if (type === "login") {
        const email = $("li-email");
        const pass = $("li-pass");
        const msg = $("li-msg");
        
        if (email) email.value = "";
        if (pass) pass.value = "";
        if (msg) msg.innerHTML = "";
    }
}


// ======================
// UI ANIMATIONS & ENHANCEMENTS
// ======================

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Progress bar
    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = scrolled + '%';
        }
    });

    // Animated counters
    function animateCounters() {
        const counters = document.querySelectorAll('.counter');
        let hasAnimated = false;
        
        counters.forEach(counter => {
            if (!hasAnimated) {
                const target = parseInt(counter.getAttribute('data-target'));
                const increment = target / 100;
                let current = 0;
                
                const updateCounter = () => {
                    if (current < target) {
                        current += increment;
                        counter.textContent = Math.ceil(current);
                        setTimeout(updateCounter, 20);
                    } else {
                        counter.textContent = target + (target < 100 ? '%' : '+');
                    }
                };
                updateCounter();
            }
        });
        hasAnimated = true;
    }

    const impactObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
            }
        });
    });
    
    const impactSection = document.querySelector('#impact');
    if (impactSection) {
        impactObserver.observe(impactSection);
    }

    // Navbar scroll effect
   
let lastScrollTop = 0;
window.addEventListener('scroll', function() {
    const nav = document.querySelector('nav');
    
    // ✅ Add null check here - this prevents the error
    if (!nav) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 50) {
        nav.classList.add('bg-gray-900/95', 'backdrop-blur-sm', 'shadow-lg');
    } else {
        nav.classList.remove('bg-gray-900/95', 'backdrop-blur-sm', 'shadow-lg');
    }
    
    lastScrollTop = scrollTop;
});


    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Contact form handling
    const form = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formStatus = document.getElementById('form-status');
    
    if (form && submitBtn && formStatus) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            formStatus.classList.add('hidden');
            const formData = new FormData(form);
            
            try {
                const response = await fetch('https://formspree.io/f/movlloyl', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    formStatus.textContent = 'Thank you! Your message has been sent successfully. We\'ll get back to you soon!';
                    formStatus.className = 'p-4 rounded-lg bg-green-100 text-green-800 border border-green-300';
                    formStatus.classList.remove('hidden');
                    form.reset();
                } else {
                    throw new Error(`Form submission failed: ${response.status}`);
                }
                
            } catch (error) {
                formStatus.textContent = 'Sorry, there was an error sending your message. Please try again or contact us directly.';
                formStatus.className = 'p-4 rounded-lg bg-red-100 text-red-800 border border-red-300';
                formStatus.classList.remove('hidden');
            }
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            setTimeout(() => {
                formStatus.classList.add('hidden');
            }, 8000);
        });
    }

    // Newsletter form handling
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterBtn = document.getElementById('newsletter-btn');
    const newsletterStatus = document.getElementById('newsletter-status');

    if (newsletterForm && newsletterBtn && newsletterStatus) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const originalText = newsletterBtn.textContent;
            newsletterBtn.textContent = 'Subscribing...';
            newsletterBtn.disabled = true;
            
            newsletterStatus.classList.add('hidden');
            const formData = new FormData(newsletterForm);
            
            try {
                const response = await fetch('https://formspree.io/f/mvgqbpro', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    newsletterStatus.textContent = 'Successfully subscribed! Thank you for joining our newsletter!';
                    newsletterStatus.className = 'mt-3 p-3 rounded-lg text-sm bg-green-100 text-green-800 border border-green-300';
                    newsletterStatus.classList.remove('hidden');
                    newsletterForm.reset();
                } else {
                    throw new Error(`Newsletter subscription failed: ${response.status}`);
                }
                
            } catch (error) {
                newsletterStatus.textContent = 'Error subscribing to newsletter. Please try again.';
                newsletterStatus.className = 'mt-3 p-3 rounded-lg text-sm bg-red-100 text-red-800 border border-red-300';
                newsletterStatus.classList.remove('hidden');
            }
            
            newsletterBtn.textContent = originalText;
            newsletterBtn.disabled = false;
            
            setTimeout(() => {
                newsletterStatus.classList.add('hidden');
            }, 6000);
        });
    }

    // Hero button functionality
    addEventListenerSafe('hero-explore-products', 'click', () => {
        window.location.href = '/products.html';
    });

    addEventListenerSafe('hero-learn-more', 'click', () => {
        const aboutSection = document.getElementById('about');
        if (aboutSection) {
            aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // ✅ NEW: Check for login requirement on page load
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'required') {
        setTimeout(() => {
            openModal('modal-login');
            showMessage("li-msg", "Please log in to continue with your order", "info");
        }, 500);
        
        // Clean up URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
});

// ======================
// APP INITIALIZATION
// ======================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing MantraAQ app...');

    checkAndClearCartOnVersionChange();
    
    setupEventListeners();
    // ✅ FIX: Restore user from localStorage FIRST
const savedUser = localStorage.getItem('user');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
        updateAuthUI(currentUser);
        console.log('✅ User restored from localStorage:', currentUser.name);
    } catch (error) {
        console.log('Error parsing saved user:', error);
        localStorage.removeItem('user');
    }
}

// ✅ THEN try to refresh from server (only if we have a user)
if (currentUser) {
    refreshUser();
}

   
    // ✅ SAFE: Only call loadProducts if it exists
    if (typeof loadProducts === 'function') {
        loadProducts();
    } else {
        console.log('loadProducts not available - probably cart page');
    }
    
    
    // ✅ CRITICAL CHANGE: Use initializeCart() instead of loadCartFromStorage()
    initializeCart();

    if (isCartPage()) {
        setTimeout(() => {
            renderCartPage();
            loadRecommendedProducts();
            initPromoCode();
        }, 100);
    }
    
    function checkAndClearCartOnVersionChange() {
    const currentVersion = '1.1'; // Update this when you reset database
    const storedVersion = localStorage.getItem('db-version');
    
    if (storedVersion !== currentVersion) {
        console.log('Database version changed, clearing cart...');
        clearCartData();
        localStorage.setItem('db-version', currentVersion);
    }
}
    // Handle email verification success from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        showToast("Email verified successfully! Thank you.", "success");
        
        if (typeof trackVerificationMetrics === 'function') {
            trackVerificationMetrics();
        }
        
        if (currentUser) {
            currentUser.email_verified = true;
            updateAuthUI(currentUser);
        }
        
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('verification_failed') === 'true') {
        showToast("Verification link is invalid or has expired. Please request a new one.", "error");
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle password reset from URL
    if (location.pathname === "/reset-password" && urlParams.get("token")) {
        openModal("modal-reset");
    }
});

// (Removed duplicate verification modal listeners)

console.log('MantraAQ main.js loaded successfully');


// ✅ Essential cart clearing function
function clearCartData() {
    localStorage.removeItem('mantraaq-cart');
    localStorage.removeItem('authToken'); // if you store auth tokens
    updateCartCount();
    
    // Refresh product UI if function exists
    if (typeof refreshProductsUI === 'function') {
        refreshProductsUI();
    }
    
    console.log('Cart data cleared successfully');
}

// Make function globally accessible for testing
window.clearCartData = clearCartData;
