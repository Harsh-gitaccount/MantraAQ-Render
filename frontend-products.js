// frontend-products.js - PROFESSIONAL E-COMMERCE VERSION (Based on Your Code)
function $(id) { return document.getElementById(id); }
function show(el) { if (el && el.classList) el.classList.remove('hidden'); }
function hide(el) { if (el && el.classList) el.classList.add('hidden'); }

let allProducts = [];
let filteredProducts = [];

// UNIFIED CART SYSTEM - consistent with main.js and cart-page.js
function getCart() {
    const stored = localStorage.getItem('mantraaq-cart');
    return stored ? JSON.parse(stored) : [];
}

// ✅ NEW: Get cart quantity for specific product
function getCartQuantityForProduct(productId) {
    const cart = getCart();
    const cartItem = cart.find(item => item.id == productId);
    return cartItem ? (cartItem.qty || cartItem.quantity || 0) : 0;
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);
    
    // Update ALL cart count elements (desktop + mobile + cart page)
    ['cart-count', 'mobile-cart-count', 'cart-item-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    });
}

function addToCart(productId, quantity = 1) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    if (product.stock_quantity <= 0) {
        showToast(`${product.name} is out of stock`, "error");
        return;
    }

    let cart = getCart();
    const existingItem = cart.find(item => item.id == productId);
    const currentQty = existingItem ? (existingItem.qty || existingItem.quantity || 0) : 0;
    const newQty = currentQty + quantity;

    if (newQty > product.stock_quantity) {
        showToast(`Only ${product.stock_quantity} available. You have ${currentQty} in cart.`, "error");
        return;
    }

    if (existingItem) {
        existingItem.qty = newQty;
        existingItem.quantity = newQty; // Dual compatibility
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            qty: quantity,
            quantity: quantity, // Dual compatibility
            stock_quantity: product.stock_quantity,
            weight: product.weight,
            volume: product.volume
        });
    }

    localStorage.setItem('mantraaq-cart', JSON.stringify(cart));
    updateCartCount();
    
    // Notify all pages/tabs
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    
    showToast(`${quantity} x ${product.name} added to cart!`, "success");
    
    // ✅ ENHANCED: Re-render products to update stock badges
    refreshProductsUI();
    
    // ✅ PROFESSIONAL: Clean button feedback
    const button = event?.target;
    if (button) {
        const original = button.textContent;
        button.textContent = '✓ Added to Cart';
        button.style.background = '#059669';
        
        setTimeout(() => {
            button.textContent = original;
            button.style.background = '';
        }, 2000);
    }
}

// ✅ ENHANCED: Professional Product Card (No Hover Effects, Clean Design)
function createProductCard(product) {
    const cartQty = getCartQuantityForProduct(product.id);
    const remainingStock = product.stock_quantity - cartQty;
    
    const isOutOfStock = remainingStock <= 0;
    const isLowStock = remainingStock > 0 && remainingStock <= 5;
    
    // Format weight/volume display
    const weightVolume = product.weight || product.volume;
    
    return `
        <div class="product-card">
            <!-- ✅ ENHANCED: Fixed Aspect Ratio Image Container -->
            <div class="product-image-container">
                <img src="${product.image_url || 'https://via.placeholder.com/400x400?text=Product'}" 
                     alt="${product.name}" 
                     class="product-image"
                     loading="lazy">
                
                <!-- ✅ PROFESSIONAL: Stock Badge with Red for Out of Stock -->
                <div class="stock-badge ${
                    isOutOfStock 
                        ? 'sold-out' 
                        : isLowStock 
                            ? 'low-stock'
                            : 'in-stock'
                }">
                    ${isOutOfStock 
                        ? 'Sold Out'
                        : isLowStock 
                            ? `${remainingStock} left`
                            : 'In Stock'
                    }
                </div>
            </div>
            
            <!-- ✅ ENHANCED: Consistent Product Info Layout -->
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                
                <!-- ✅ PROFESSIONAL: Weight/Volume Display -->
                ${weightVolume ? 
                    `<div class="product-weight">${weightVolume}</div>` 
                    : ''
                }
                
                <p class="product-description">${product.description || 'Premium quality product'}</p>
                
                <!-- Price -->
                <div class="product-price">₹${(product.price / 100).toFixed(2)}</div>
                
                <!-- ✅ PROFESSIONAL: Clean Action Button (No Cart Count) -->
                ${isOutOfStock ? 
                    '<button class="sold-out-button" disabled>Sold Out</button>'
                    : 
                    `<button class="add-to-cart-btn" data-product-id="${product.id}">
                       Add to Cart
                     </button>`
                }
                
                <!-- ✅ CLEAN: Separate Cart Status (Optional) -->
                ${cartQty > 0 ? 
                    `<div class="cart-status">
                        <span>${cartQty} in cart</span>
                     </div>`
                    : ''
                }
            </div>
        </div>
    `;
}

// ✅ PROFESSIONAL: Advanced Search with Debounce and Results Counter
function setupSearch() {
    const searchInput = $('product-search');
    const resultsDisplay = $('search-results-count');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', debounce((event) => {
        const query = event.target.value.toLowerCase().trim();
        
        if (query === '') {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(product => 
                product.name.toLowerCase().includes(query) ||
                (product.description && product.description.toLowerCase().includes(query)) ||
                (product.weight && product.weight.toLowerCase().includes(query)) ||
                (product.volume && product.volume.toLowerCase().includes(query))
            );
        }
        
        renderProducts(filteredProducts);
        updateSearchResults(query);
        
    }, 300));
}

// ✅ NEW: Display search results count
function updateSearchResults(query) {
    const resultsCount = filteredProducts.length;
    const totalCount = allProducts.length;
    
    // Create results display if it doesn't exist
    let resultsDiv = $('search-results-count');
    if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'search-results-count';
        resultsDiv.className = 'text-center text-sm text-gray-600 mt-2 mb-4';
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(resultsDiv);
        }
    }
    
    if (query) {
        resultsDiv.textContent = `${resultsCount} of ${totalCount} products found`;
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.textContent = `Showing all ${totalCount} products`;
        resultsDiv.style.display = 'block';
    }
}

// ✅ NEW: Debounce utility for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ✅ NEW: Function to refresh product UI with updated stock
function refreshProductsUI() {
    const productsToRender = filteredProducts.length > 0 || document.getElementById('product-search')?.value ? filteredProducts : allProducts;
    if (productsToRender.length > 0) {
        renderProducts(productsToRender);
    }
}

// Event delegation
function setupProductPageEvents() {
    document.addEventListener('click', function(event) {
        if (event.target.matches('.add-to-cart-btn')) {
            event.preventDefault();
            const productId = event.target.getAttribute('data-product-id');
            if (productId) addToCart(productId, 1);
        }
        
        if (event.target.matches('[data-action="retry-load-products"]')) {
            event.preventDefault();
            loadProducts();
        }
    });
    
    document.addEventListener('change', function(event) {
        if (event.target.matches('#sort-select')) {
            handleSortChange();
        }
    });
}

// Product loading
function renderProducts(products) {
    const productGrid = $('product-grid');
    if (!productGrid) return;
    
    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-gray-400 mb-4">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p class="text-gray-600">Try different search terms</p>
            </div>
        `;
        return;
    }
    
    productGrid.innerHTML = products.map(product => createProductCard(product)).join('');
    show(productGrid);
}

async function loadProducts() {
    const productGrid = $('product-grid');
    const loadingEl = $('products-loading');
    const emptyEl = $('products-empty');

    show(loadingEl);
    hide(productGrid);
    hide(emptyEl);

    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const products = await response.json();
        allProducts = products;
        filteredProducts = [...products]; // Initialize filtered products
        hide(loadingEl);

        if (!products || products.length === 0) {
            show(emptyEl);
            return;
        }

        renderProducts(products);
        updateSearchResults(''); // Show initial count
    } catch (error) {
        console.error('Failed to load products:', error);
        hide(loadingEl);
        show(emptyEl);
        
        emptyEl.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-6">😞</div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Failed to load products</h3>
                <p class="text-gray-600 mb-6">Please check your connection and try again</p>
                <button data-action="retry-load-products" class="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-bold">
                    🔄 Try Again
                </button>
            </div>
        `;
    }
}

// Utilities
function sortProducts(products, sortBy) {
    const sorted = [...products];
    switch (sortBy) {
        case 'name': return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'price-low': return sorted.sort((a, b) => a.price - b.price);
        case 'price-high': return sorted.sort((a, b) => b.price - a.price);
        default: return sorted;
    }
}

function handleSortChange() {
    const sortSelect = $('sort-select');
    if (!sortSelect || !filteredProducts.length) return;
    const sortedProducts = sortProducts(filteredProducts, sortSelect.value);
    renderProducts(sortedProducts);
}

// ✅ MINIMAL FIX: Safe showToast
function showToast(message, type = "info") {
    console.log(`${type.toUpperCase()}: ${message}`);
}

// ✅ ENHANCED: Initialize with all features
function initializePage() {
    updateCartCount();
    loadProducts();
    setupProductPageEvents();
    setupSearch(); // Initialize search functionality
    
    // Listen for cart updates from other pages AND refresh UI
    window.addEventListener('cartUpdated', () => {
        updateCartCount();
        refreshProductsUI(); // Update product badges when cart changes
    });
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'mantraaq-cart') {
            updateCartCount();
            refreshProductsUI(); // Update product badges when cart changes
        }
    });
}

document.addEventListener('DOMContentLoaded', initializePage);

// Export for debugging
window.loadProducts = loadProducts;
window.addToCart = addToCart;
window.allProducts = allProducts;
window.refreshProductsUI = refreshProductsUI;
