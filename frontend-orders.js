(function() {
    'use strict';
    
    let orders = [];
    let filteredOrders = [];
    let currentFilter = 'all';
    
    // ✅ Enhanced Toast Notifications
    function showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container') || document.body;
        const toast = document.createElement('div');
        toast.className = `toast ${type} transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
        
        const icons = {
            success: '✅',
            warning: '⚠️', 
            error: '❌',
            info: 'ℹ️'
        };
        
        const colors = {
            success: 'bg-green-500 text-white',
            warning: 'bg-yellow-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        toast.innerHTML = `
            <div class="flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg ${colors[type]}">
                <span class="text-lg">${icons[type]}</span>
                <span class="font-medium">${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    // ✅ Initialize orders page
    async function initOrdersPage() {
        try {
            console.log('📦 Initializing modern orders page...');
            
            await checkAuthentication();
            setupEventListeners();
            await loadOrders();
            
        } catch (error) {
            console.error('Orders page initialization failed:', error);
            showErrorState();
        }
    }
    
    // ✅ Check authentication
    async function checkAuthentication() {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/?login=required';
            throw new Error('Not authenticated');
        }
        
        const data = await response.json();
        if (!data.user) {
            window.location.href = '/?login=required';
            throw new Error('User not found');
        }
    }
    
    // ✅ Enhanced event listeners
    function setupEventListeners() {
        // Filter dropdown
        const filterSelect = document.getElementById('order-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                filterOrders();
                displayOrders();
                updateOrdersCount();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<span class="text-sm">⏳</span><span class="hidden sm:inline ml-2">Loading...</span>';
                
                await loadOrders();
                
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<span class="text-sm">🔄</span><span class="hidden sm:inline ml-2">Refresh</span>';
                
                showToast('Orders updated', 'success', 2000);
            });
        }
        
        // Retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadOrders);
        }
    }
    
    // ✅ Load orders from API
    async function loadOrders() {
        try {
            showLoadingState();
            
            const response = await fetch('/api/orders', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load orders: ${response.status}`);
            }
            
            orders = await response.json();
            console.log('📦 Loaded orders:', orders.length);
            
            filterOrders();
            displayOrders();
            updateOrdersCount();
            updateLastUpdated();
            
        } catch (error) {
            console.error('Failed to load orders:', error);
            showErrorState();
        }
    }
    
    // ✅ Filter orders
    function filterOrders() {
        if (currentFilter === 'all') {
            filteredOrders = orders;
        } else {
            filteredOrders = orders.filter(order => order.status === currentFilter);
        }
    }
    
    // ✅ Get product image URL
// ✅ OPTIMIZED: Clean version with less logging
function getProductImageUrl(item) {
    // Check database fields first
    const imageFields = ['image_url', 'product_image_url', 'product_image', 'imageUrl'];
    
    for (const field of imageFields) {
        if (item[field] && item[field].trim() !== '') {
            let imageUrl = item[field].trim();
            if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                imageUrl = `/${imageUrl}`;
            }
            return imageUrl;
        }
    }
    
    // Fallback: Generate from product name
    const productName = item.current_product_name || item.product_name || item.name;
    if (productName) {
        const baseFilename = productName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        return `/assets/images/products/${baseFilename}.jpg`;
    }
    
    return null;
}

// ✅ OPTIMIZED: Clean image creation with smart fallbacks
function createProductImage(item) {
    const primaryImageUrl = getProductImageUrl(item);
    const imageId = `img-${Math.random().toString(36).substr(2, 9)}`;
    
    const html = `
        <div class="flex-shrink-0">
            ${primaryImageUrl ? `<img id="${imageId}" class="product-image" style="display: none;">` : ''}
            <div id="${imageId}-placeholder" class="product-image-placeholder">🌿</div>
        </div>
    `;
    
    if (primaryImageUrl) {
        setTimeout(() => {
            const img = document.getElementById(imageId);
            const placeholder = document.getElementById(imageId + '-placeholder');
            
            if (img && placeholder) {
                const productName = item.current_product_name || item.product_name || item.name || '';
                
                // Smart backup URLs based on your actual file structure
                const backupUrls = [
                    `/assets/images/products/raw-singhara.jpg`,        // Your actual file
                    `/assets/images/products/singhara-flour.jpg`,      // Your actual file
                    `/assets/images/products/singhara-snacks.jpg`,     // Your actual file
                    `/assets/images/products/singhara-sweeteners.jpg`, // Your actual file
                ];
                
                let currentBackup = 0;
                
                function tryNextImage() {
                    if (currentBackup < backupUrls.length) {
                        img.src = backupUrls[currentBackup];
                        currentBackup++;
                    } else {
                        img.style.display = 'none';
                        placeholder.style.display = 'flex';
                    }
                }
                
                img.addEventListener('load', () => {
                    img.style.display = 'block';
                    placeholder.style.display = 'none';
                });
                
                img.addEventListener('error', tryNextImage);
                
                // Start with primary URL
                img.src = primaryImageUrl;
                img.alt = escapeHtml(productName);
            }
        }, 100);
    }
    
    return html;
}

    // ✅ Modern order display with expandable cards
    function displayOrders() {
        hideAllStates();
        
        if (filteredOrders.length === 0) {
            showEmptyState();
            return;
        }
        
        const container = document.getElementById('orders-container');
        if (!container) return;
        
        let html = '';
        
        filteredOrders.forEach((order, index) => {
            try {
                const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Parse items safely
                let items = [];
                try {
                    if (typeof order.items === 'string') {
                        items = JSON.parse(order.items || '[]');
                    } else if (Array.isArray(order.items)) {
                        items = order.items;
                    } else if (order.items) {
                        items = [order.items];
                    }
                } catch (parseError) {
                    console.warn('Error parsing order items:', parseError);
                    items = [];
                }
                
                // Parse shipping address
                let shippingAddress = {};
                try {
                    if (typeof order.shipping_address === 'string') {
                        shippingAddress = JSON.parse(order.shipping_address || '{}');
                    } else if (order.shipping_address) {
                        shippingAddress = order.shipping_address;
                    }
                } catch (parseError) {
                    console.warn('Error parsing shipping address:', parseError);
                }
                
                const statusClass = `status-${order.status || 'unknown'}`;
                const orderId = order.id || 'unknown';
                
                html += `
                    <div class="order-card bg-white rounded-xl border fade-in" 
                         data-order-id="${orderId}" 
                         style="animation-delay: ${index * 0.1}s">
                        
                        <!-- ✅ Order Header (Always Visible) -->
                        <div class="p-6 cursor-pointer order-header-clickable" data-order-id="${orderId}">
                            <div class="flex items-start justify-between">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center flex-wrap gap-3 mb-3">
                                        <h3 class="text-lg font-bold text-gray-900">
                                            Order #${orderId.toString().substring(0, 8)}...
                                        </h3>
                                        <span class="status-badge ${statusClass}">
                                            ${getStatusText(order.status)}
                                        </span>
                                    </div>
                                    
                                    <div class="flex items-center flex-wrap gap-4 text-sm text-gray-600 mb-4">
                                        <span class="flex items-center gap-2">
                                            <span>📅</span>
                                            ${orderDate} at ${orderTime}
                                        </span>
                                        <span class="flex items-center gap-2">
                                            <span>💳</span>
                                            ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                                        </span>
                                        <span class="flex items-center gap-2">
                                            <span>📦</span>
                                            ${items.length} item${items.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    
                                    <!-- ✅ Quick Product Preview -->
                                    <div class="flex items-center space-x-2 text-sm">
                                        ${items.slice(0, 2).map(item => `
                                            <span class="px-2 py-1 bg-gray-100 rounded-md text-gray-700">
                                                ${escapeHtml(item.product_name || item.name || 'Product')}
                                            </span>
                                        `).join('')}
                                        ${items.length > 2 ? `
                                            <span class="px-2 py-1 bg-gray-200 rounded-md text-gray-600">
                                                +${items.length - 2} more
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                                
                                <!-- ✅ Order Amount & Expand Button -->
                                <div class="text-right ml-6 flex flex-col items-end space-y-3">
                                    <div>
                                        <div class="text-2xl font-bold text-green-600">
                                            ₹${((order.amount || 0) / 100).toFixed(2)}
                                        </div>
                                        ${(order.cod_fee && order.cod_fee > 0) ? `
                                            <div class="text-xs text-yellow-600 font-medium">
                                                +₹${(order.cod_fee / 100).toFixed(2)} COD
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <button class="expand-toggle action-btn btn-secondary px-3 py-2 rounded-lg text-xs" 
                                            data-order-id="${orderId}">
                                        <span class="expand-text">View Details</span>
                                        <svg class="w-4 h-4 expand-icon transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ✅ Expandable Order Details -->
                        <div class="order-details" data-order-id="${orderId}">
                            <div class="px-6 pb-6 border-t border-gray-100">
                                
                                <!-- ✅ Product Items Section with Real Images -->
                                <div class="mt-6">
                                    <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <span>📦</span> Order Items
                                    </h4>
                                    <div class="space-y-3">
                                        ${items.length > 0 ? items.map(item => `
                                            <div class="product-item p-4 border border-gray-200 rounded-lg">
                                                <div class="flex items-start justify-between">
                                                    <div class="flex items-start space-x-4">
                                                        <!-- ✅ Real Product Image (CSP Fixed) -->
                                                        <div class="flex-shrink-0">
                                                            ${createProductImage(item)}
                                                        </div>
                                                        <div class="flex-1">
                                                            <h5 class="font-semibold text-gray-900 mb-1">
                                                                ${escapeHtml(item.product_name || item.name || 'Unknown Product')}
                                                            </h5>
                                                            <div class="text-sm text-gray-600 space-y-1">
                                                                <div>Quantity: <span class="font-medium">${item.quantity || 1}</span></div>
                                                                <div>Unit Price: <span class="font-medium">₹${((item.unit_price || item.price || 0) / 100).toFixed(2)}</span></div>
                                                                ${item.product_weight ? `<div>Weight: <span class="font-medium">${item.product_weight}g</span></div>` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="text-right">
                                                        <div class="text-lg font-bold text-gray-900">
                                                            ₹${((item.total_price || item.total || (item.unit_price || item.price || 0) * (item.quantity || 1)) / 100).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('') : `
                                            <div class="text-center py-8 text-gray-500">
                                                <span class="text-4xl block mb-2">📦</span>
                                                <p>No items found for this order</p>
                                            </div>
                                        `}
                                    </div>
                                </div>
                                
                                <!-- ✅ Shipping & Billing Section -->
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                    <!-- Shipping Address -->
                                    <div>
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <span>🏠</span> Shipping Address
                                        </h4>
                                        <div class="bg-gray-50 rounded-lg p-4">
                                            <div class="space-y-2 text-sm">
                                                <div class="font-semibold text-gray-900">
                                                    ${escapeHtml(shippingAddress.fullName || 'N/A')}
                                                </div>
                                                ${shippingAddress.flatNo || shippingAddress.street ? `
                                                    <div class="text-gray-700">
                                                        ${escapeHtml(shippingAddress.flatNo || '')}${shippingAddress.flatNo && shippingAddress.street ? ', ' : ''}${escapeHtml(shippingAddress.street || '')}
                                                    </div>
                                                ` : ''}
                                                <div class="text-gray-700">
                                                    ${escapeHtml(shippingAddress.city || '')}${shippingAddress.city && shippingAddress.state ? ', ' : ''}${escapeHtml(shippingAddress.state || '')}${shippingAddress.pincode ? ' - ' + shippingAddress.pincode : ''}
                                                </div>
                                                ${shippingAddress.mobile ? `
                                                    <div class="text-gray-600 flex items-center gap-2">
                                                        <span>📱</span> ${shippingAddress.mobile}
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Order Summary -->
                                    <div>
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <span>💰</span> Order Summary
                                        </h4>
                                        <div class="bg-gray-50 rounded-lg p-4">
                                            <div class="space-y-3 text-sm">
                                                <div class="flex justify-between">
                                                    <span class="text-gray-600">Subtotal:</span>
                                                    <span class="font-medium">₹${(((order.subtotal || order.amount) || 0) / 100).toFixed(2)}</span>
                                                </div>
                                                ${(order.shipping_fee && order.shipping_fee > 0) ? `
                                                    <div class="flex justify-between">
                                                        <span class="text-gray-600">Shipping:</span>
                                                        <span class="font-medium">₹${(order.shipping_fee / 100).toFixed(2)}</span>
                                                    </div>
                                                ` : `
                                                    <div class="flex justify-between">
                                                        <span class="text-gray-600">Shipping:</span>
                                                        <span class="text-green-600 font-medium">FREE</span>
                                                    </div>
                                                `}
                                                ${(order.cod_fee && order.cod_fee > 0) ? `
                                                    <div class="flex justify-between">
                                                        <span class="text-gray-600">COD Fee:</span>
                                                        <span class="font-medium">₹${(order.cod_fee / 100).toFixed(2)}</span>
                                                    </div>
                                                ` : ''}
                                                <div class="border-t border-gray-200 pt-3 mt-3">
                                                    <div class="flex justify-between text-lg font-bold">
                                                        <span>Total:</span>
                                                        <span class="text-green-600">₹${((order.amount || 0) / 100).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- ✅ Action Buttons (Download Receipt Only) -->
                                <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button class="action-btn btn-secondary px-4 py-2 rounded-lg download-receipt-btn" 
                                            data-order-id="${orderId}">
                                        📄 Download Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (orderError) {
                console.error('Error processing order:', orderError, order);
                html += `
                    <div class="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div class="text-red-600">
                            <h3 class="font-bold">Error Loading Order</h3>
                            <p class="text-sm">Order ID: ${order?.id || 'Unknown'}</p>
                        </div>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html;
        container.style.display = 'block';
        
        setupOrderCardEvents();
    }
    
    // ✅ Enhanced event listeners for order cards
    function setupOrderCardEvents() {
        // Expand/collapse toggle
        document.querySelectorAll('.expand-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = btn.dataset.orderId;
                toggleOrderDetails(orderId);
            });
        });
        
        // Header click to expand
        document.querySelectorAll('.order-header-clickable').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                const orderId = header.dataset.orderId;
                toggleOrderDetails(orderId);
            });
        });
        
        // ✅ Download receipt buttons (Auto download)
        document.querySelectorAll('.download-receipt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const orderId = btn.dataset.orderId;
                downloadReceiptPDF(orderId);
            });
        });
    }
    
    // ✅ Toggle order details expansion
    function toggleOrderDetails(orderId) {
        const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
        const orderDetails = document.querySelector(`.order-details[data-order-id="${orderId}"]`);
        const expandBtn = document.querySelector(`.expand-toggle[data-order-id="${orderId}"]`);
        
        if (!orderDetails || !expandBtn) return;
        
        const isExpanded = orderDetails.classList.contains('expanded');
        const expandText = expandBtn.querySelector('.expand-text');
        const expandIcon = expandBtn.querySelector('.expand-icon');
        
        if (isExpanded) {
            // Collapse
            orderDetails.classList.remove('expanded');
            orderCard.classList.remove('expanded');
            expandText.textContent = 'View Details';
            expandIcon.style.transform = 'rotate(0deg)';
        } else {
            // Expand
            orderDetails.classList.add('expanded');
            orderCard.classList.add('expanded');
            expandText.textContent = 'Hide Details';
            expandIcon.style.transform = 'rotate(180deg)';
        }
    }
    
    // ✅ Download receipt as PDF (Auto download)
   // ✅ Fixed: Download receipt as proper PDF
function downloadReceiptPDF(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    
    // Parse order items
    let items = [];
    try {
        if (typeof order.items === 'string') {
            items = JSON.parse(order.items || '[]');
        } else if (Array.isArray(order.items)) {
            items = order.items;
        }
    } catch (e) {
        items = [];
    }
    
    // Parse shipping address
    let shippingAddress = {};
    try {
        if (typeof order.shipping_address === 'string') {
            shippingAddress = JSON.parse(order.shipping_address || '{}');
        } else if (order.shipping_address) {
            shippingAddress = order.shipping_address;
        }
    } catch (e) {
        shippingAddress = {};
    }
    
    showToast('Generating PDF...', 'info', 2000);
    
    // Create receipt content for PDF generation
    const receiptData = {
        company: {
            name: 'MantraAQ',
            tagline: 'Premium Quality Natural Products',
            email: 'support@mantraaq.com'
        },
        order: {
            id: orderId,
            date: new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            paymentMethod: order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment',
            status: getStatusText(order.status).replace(/[^\w\s]/gi, '')
        },
        items: items.map(item => ({
            name: item.product_name || item.name || 'Unknown Product',
            quantity: item.quantity || 1,
            unitPrice: ((item.unit_price || item.price || 0) / 100).toFixed(2),
            total: ((item.total_price || item.total || 0) / 100).toFixed(2)
        })),
        address: {
            name: shippingAddress.fullName || 'N/A',
            line1: [shippingAddress.flatNo, shippingAddress.street].filter(Boolean).join(', '),
            line2: [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', ') + 
                   (shippingAddress.pincode ? ' - ' + shippingAddress.pincode : ''),
            phone: shippingAddress.mobile || 'N/A'
        },
        totals: {
            subtotal: (((order.subtotal || order.amount) || 0) / 100).toFixed(2),
            shipping: (order.shipping_fee && order.shipping_fee > 0) ? (order.shipping_fee / 100).toFixed(2) : 'FREE',
            codFee: (order.cod_fee && order.cod_fee > 0) ? (order.cod_fee / 100).toFixed(2) : null,
            total: ((order.amount || 0) / 100).toFixed(2)
        }
    };
    
    // Generate PDF using browser's built-in functionality
    generatePDFReceipt(receiptData, orderId);
}

// ✅ New: Generate PDF receipt using print functionality
function generatePDFReceipt(data, orderId) {
    // Create a new window for PDF generation
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const pdfHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>MantraAQ Receipt - ${orderId}</title>
            <meta charset="UTF-8">
            <style>
                @page {
                    size: A4;
                    margin: 20mm;
                }
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.4;
                    color: #333;
                    font-size: 12px;
                }
                
                .receipt-container {
                    max-width: 100%;
                    margin: 0 auto;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 2px solid #16a34a;
                    padding-bottom: 15px;
                }
                
                .company-name {
                    font-size: 28px;
                    font-weight: bold;
                    color: #16a34a;
                    margin-bottom: 5px;
                }
                
                .tagline {
                    font-size: 14px;
                    color: #666;
                }
                
                .receipt-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin: 15px 0 5px 0;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 25px;
                }
                
                .info-section {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                }
                
                .info-title {
                    font-weight: bold;
                    color: #16a34a;
                    margin-bottom: 10px;
                    font-size: 14px;
                }
                
                .info-row {
                    margin-bottom: 5px;
                }
                
                .info-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 100px;
                }
                
                .items-section {
                    margin-bottom: 25px;
                }
                
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #16a34a;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 5px;
                }
                
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                
                .items-table th {
                    background: #16a34a;
                    color: white;
                    padding: 10px 8px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 12px;
                }
                
                .items-table td {
                    padding: 8px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 11px;
                }
                
                .items-table tbody tr:nth-child(even) {
                    background: #f9fafb;
                }
                
                .total-section {
                    float: right;
                    width: 250px;
                    margin-top: 10px;
                }
                
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .final-total {
                    font-size: 16px;
                    font-weight: bold;
                    color: #16a34a;
                    border-bottom: 2px solid #16a34a;
                    padding: 10px 0;
                }
                
                .footer {
                    clear: both;
                    margin-top: 30px;
                    text-align: center;
                    font-size: 11px;
                    color: #666;
                    border-top: 1px solid #e5e7eb;
                    padding-top: 15px;
                }
                
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div class="company-name">🌿 ${data.company.name}</div>
                    <div class="tagline">${data.company.tagline}</div>
                    <div class="receipt-title">INVOICE / RECEIPT</div>
                </div>
                
                <div class="info-grid">
                    <div class="info-section">
                        <div class="info-title">📋 Order Details</div>
                        <div class="info-row">
                            <span class="info-label">Order ID:</span>
                            #${data.order.id.substring(0, 12)}...
                        </div>
                        <div class="info-row">
                            <span class="info-label">Date:</span>
                            ${data.order.date}
                        </div>
                        <div class="info-row">
                            <span class="info-label">Payment:</span>
                            ${data.order.paymentMethod}
                        </div>
                        <div class="info-row">
                            <span class="info-label">Status:</span>
                            ${data.order.status}
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-title">🏠 Delivery Address</div>
                        <div style="line-height: 1.6;">
                            <strong>${data.address.name}</strong><br>
                            ${data.address.line1}<br>
                            ${data.address.line2}<br>
                            📱 ${data.address.phone}
                        </div>
                    </div>
                </div>
                
                <div class="items-section">
                    <div class="section-title">📦 Order Items</div>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 50%">Product</th>
                                <th style="width: 15%">Qty</th>
                                <th style="width: 17.5%">Unit Price</th>
                                <th style="width: 17.5%">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${item.unitPrice}</td>
                                    <td><strong>₹${item.total}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="total-section">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>₹${data.totals.subtotal}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${data.totals.shipping === 'FREE' ? 'FREE' : '₹' + data.totals.shipping}</span>
                    </div>
                    ${data.totals.codFee ? `
                        <div class="total-row">
                            <span>COD Fee:</span>
                            <span>₹${data.totals.codFee}</span>
                        </div>
                    ` : ''}
                    <div class="total-row final-total">
                        <span>Total Amount:</span>
                        <span>₹${data.totals.total}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Thank you for choosing ${data.company.name}!</strong></p>
                    <p>For support: ${data.company.email} | Visit: mantraaq.com</p>
                    <p style="margin-top: 10px;">This is a computer generated receipt.</p>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                        setTimeout(() => {
                            window.close();
                        }, 100);
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(pdfHTML);
    printWindow.document.close();
    
    showToast('Receipt PDF generated - Save as PDF in print dialog', 'success');
}

    // ✅ Get status text with icons
    function getStatusText(status) {
        const statusMap = {
            'paid': 'Paid ✅',
            'cod_confirmed': 'COD Confirmed 💰',
            'processing': 'Processing ⏳',
            'shipped': 'Shipped 🚚',
            'delivered': 'Delivered ✅',
            'cancelled': 'Cancelled ❌'
        };
        return statusMap[status] || status;
    }
    
    // ✅ Update orders count
    function updateOrdersCount() {
        const countElement = document.getElementById('orders-count');
        if (countElement) {
            const total = orders.length;
            const filtered = filteredOrders.length;
            
            if (currentFilter === 'all') {
                countElement.textContent = `${total} orders`;
            } else {
                countElement.textContent = `${filtered} of ${total} orders`;
            }
        }
    }
    
    // ✅ Update last updated time
    function updateLastUpdated() {
        const element = document.getElementById('last-updated');
        if (element) {
            element.textContent = 'Just now';
        }
    }
    
    // ✅ State management
    function showLoadingState() {
        hideAllStates();
        const loading = document.getElementById('loading-state');
        if (loading) loading.classList.remove('hidden');
    }
    
    function showEmptyState() {
        hideAllStates();
        const empty = document.getElementById('empty-state');
        if (empty) empty.classList.remove('hidden');
    }
    
    function showErrorState() {
        hideAllStates();
        const error = document.getElementById('error-state');
        if (error) error.classList.remove('hidden');
    }
    
    function hideAllStates() {
        const states = ['loading-state', 'empty-state', 'error-state', 'orders-container'];
        states.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('hidden');
                element.style.display = 'none';
            }
        });
    }
    
    // ✅ Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    // ✅ Initialize when DOM loads
    document.addEventListener('DOMContentLoaded', initOrdersPage);
    
})();
