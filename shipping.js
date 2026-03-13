// shipping.js - Complete Shipping Address Handler with Saved Addresses Integration
(function() {
    'use strict';
    
    // ✅ Global Variables
    let checkoutCart = [];
    let currentUser = null;
    let savedAddresses = [];
    let selectedSavedAddress = null;
    let isFormDirty = false;
    
    // ✅ Load Saved Addresses from Backend
    async function loadSavedAddresses() {
        try {
            showAddressesLoading(true);
            
            const response = await fetch('/api/shipping-addresses', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                savedAddresses = await response.json();
                console.log(`📍 Loaded ${savedAddresses.length} saved addresses`);
                
                showAddressesLoading(false);
                displaySavedAddresses();
                
                if (savedAddresses.length > 0) {
                    showToast('📍 Found your saved addresses', 'info');
                }
            } else {
                console.log('No saved addresses found');
                savedAddresses = [];
                showAddressesLoading(false);
            }
        } catch (error) {
            console.error('Error loading saved addresses:', error);
            savedAddresses = [];
            showAddressesLoading(false);
            showToast('⚠️ Could not load saved addresses', 'warning');
        }
    }
    // ✅ ADD THIS FUNCTION TO SHIPPING.JS
function calculateShipping(subtotal, paymentMethod = 'online') {
    const freeShippingThreshold = 499; // ₹499for free shipping
    
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

    // ✅ Show/Hide Loading State for Addresses
    function showAddressesLoading(show) {
        const loading = document.getElementById('addresses-loading');
        const container = document.getElementById('saved-addresses-container');
        
        if (show) {
            if (loading) loading.classList.remove('hidden');
            if (container) container.classList.add('hidden');
        } else {
            if (loading) loading.classList.add('hidden');
            if (container) container.classList.remove('hidden');
        }
    }
    
    // ✅ FIXED: Display Saved Addresses (CSP Compliant)
    function displaySavedAddresses() {
        const section = document.getElementById('saved-addresses-section');
        const container = document.getElementById('saved-addresses-container');
        const countBadge = document.getElementById('addresses-count');
        
        if (!section || !container) return;
        
        if (savedAddresses.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        // Show section and update count
        section.classList.remove('hidden');
        if (countBadge) {
            countBadge.textContent = `${savedAddresses.length} saved`;
        }
        
        let html = '';
        savedAddresses.forEach((address, index) => {
            const isDefault = address.is_default === 1;
            const addressTypeIcon = address.address_type === 'Home' ? '🏠' : 
                                   address.address_type === 'Work' ? '🏢' : '📍';
            
            html += `
                <div class="saved-address-card p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer"
                     data-address-index="${index}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <!-- Header with name and badges -->
                            <div class="flex items-center flex-wrap gap-2 mb-3">
                                <h4 class="font-semibold text-gray-900 text-lg">${escapeHtml(address.full_name)}</h4>
                                
                                <span class="address-type-badge text-xs px-2 py-1 rounded-full ${
                                    address.address_type === 'Home' ? 'bg-green-100 text-green-800' : 
                                    address.address_type === 'Work' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-purple-100 text-purple-800'
                                }">
                                    ${addressTypeIcon} ${address.address_type}
                                </span>
                                
                                ${isDefault ? `
                                    <span class="default-badge text-xs px-2 py-1 rounded-full text-white font-medium">
                                        ⭐ Default
                                    </span>
                                ` : ''}
                            </div>
                            
                            <!-- Address details -->
                            <div class="text-sm text-gray-600 space-y-1 mb-3">
                                <div class="font-medium">${escapeHtml(address.flat_no)}, ${escapeHtml(address.street)}</div>
                                <div>${escapeHtml(address.city)}, ${escapeHtml(address.state)} - ${address.pincode}</div>
                                <div class="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                    <span class="flex items-center">
                                        <span class="mr-1">📱</span>
                                        ${address.mobile}
                                    </span>
                                    ${address.alt_mobile ? `
                                        <span class="flex items-center">
                                            <span class="mr-1">📞</span>
                                            ${address.alt_mobile}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Select button -->
                        <div class="ml-4 flex-shrink-0">
                            <button class="select-btn px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
                                    data-address-index="${index}">
                                <span class="select-text">Select</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // ✅ FIXED: Add event listeners after HTML is created (CSP compliant)
        setupAddressClickEvents();
        setupAddNewAddressButton();
    }

    // ✅ NEW: Setup address click events (CSP compliant)
    function setupAddressClickEvents() {
        const container = document.getElementById('saved-addresses-container');
        if (!container) return;
        
        // Add click events to address cards
        container.querySelectorAll('.saved-address-card').forEach(card => {
            card.addEventListener('click', function() {
                const index = parseInt(this.dataset.addressIndex);
                selectSavedAddress(index);
            });
        });
        
        // Add click events to select buttons
        container.querySelectorAll('.select-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click
                const index = parseInt(this.dataset.addressIndex);
                selectSavedAddress(index);
            });
        });
    }
    
    // ✅ FIXED: Setup Add New Address Button (CSP Compliant)
    function setupAddNewAddressButton() {
        const addNewBtn = document.getElementById('add-new-address-btn');
        if (addNewBtn) {
            // Remove existing listeners and add new one
            addNewBtn.replaceWith(addNewBtn.cloneNode(true));
            const newBtn = document.getElementById('add-new-address-btn');
            
            newBtn.addEventListener('click', function() {
                clearAddressForm();
                selectedSavedAddress = null;
                updateSelectedAddressUI();
                
                // Enable save toggle
                const saveToggle = document.getElementById('save-address-toggle');
                if (saveToggle) {
                    saveToggle.checked = true;
                    saveToggle.disabled = false;
                }
                
                // Scroll to form
                document.getElementById('shipping-form').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                showToast('📝 Enter new address details below', 'info');
            });
        }
    }
    
    // ✅ MISSING FUNCTION ADDED: Select Saved Address
    function selectSavedAddress(index) {
        if (!savedAddresses || !savedAddresses[index]) {
            console.error('Invalid address index:', index);
            return;
        }
        
        const address = savedAddresses[index];
        selectedSavedAddress = address;
        isFormDirty = false;
        
        console.log('🚢 Selecting address:', address.full_name);
        
        // Fill form with selected address
        fillFormWithSavedAddress(address);
        
        // Update UI to show selection
        updateSelectedAddressUI();
        
        // Auto-check and disable save toggle since address is already saved
        const saveToggle = document.getElementById('save-address-toggle');
        if (saveToggle) {
            saveToggle.checked = true;
            saveToggle.disabled = true;
        }
        
        // Show success message
        showToast('✅ Address selected successfully!', 'success');
        
        // Scroll to form for mobile users
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                const form = document.getElementById('shipping-form');
                if (form) {
                    form.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }, 300);
        }
    }
    
    // ✅ FIXED: Update Selected Address UI
    function updateSelectedAddressUI() {
        const cards = document.querySelectorAll('.saved-address-card');
        
        cards.forEach((card, index) => {
            const selectText = card.querySelector('.select-text');
            const selectBtn = card.querySelector('.select-btn');
            
            // Check if this address is selected
            if (selectedSavedAddress && 
                savedAddresses[index] && 
                savedAddresses[index].id === selectedSavedAddress.id) {
                
                // Mark as selected
                card.classList.add('selected');
                if (selectText) selectText.textContent = '✓ Selected';
                if (selectBtn) selectBtn.classList.add('selected');
                
            } else {
                // Mark as not selected
                card.classList.remove('selected');
                if (selectText) selectText.textContent = 'Select';
                if (selectBtn) selectBtn.classList.remove('selected');
            }
        });
    }
    
    // ✅ Fill Form with Saved Address
    function fillFormWithSavedAddress(address) {
        if (!address) return;
        
        const fields = {
            'full-name': address.full_name || '',
            'mobile': address.mobile || '',
            'alt-mobile': address.alt_mobile || '',
            'flat-no': address.flat_no || '',
            'street': address.street || '',
            'city': address.city || '',
            'state': address.state || '',
            'country': address.country || 'India',
            'pincode': address.pincode || ''
        };
        
        // Fill text inputs
        Object.entries(fields).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) {
                input.value = value;
                clearFieldError(input, `${id}-error`);
            }
        });
        
        // Set address type radio
        const addressTypeRadio = document.querySelector(`input[name="address-type"][value="${address.address_type}"]`);
        if (addressTypeRadio) {
            addressTypeRadio.checked = true;
            clearFieldError(null, 'address-type-error');
        }
        
        // Clear all validation states
        clearAllFormErrors();
        
        console.log('✅ Form filled with saved address');
    }
    
    // ✅ Clear Address Form
    function clearAddressForm() {
        console.log('🧹 Clearing address form...');
        
        const inputs = ['full-name', 'mobile', 'alt-mobile', 'flat-no', 'street', 'city', 'state', 'pincode'];
        
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = '';
                clearFieldError(input, `${id}-error`);
            }
        });
        
        // Reset country to default
        const countrySelect = document.getElementById('country');
        if (countrySelect) countrySelect.value = 'India';
        
        // Clear address type
        const addressTypeRadios = document.querySelectorAll('input[name="address-type"]');
        addressTypeRadios.forEach(radio => {
            radio.checked = false;
        });
        clearFieldError(null, 'address-type-error');
        
        clearAllFormErrors();
        isFormDirty = false;
        selectedSavedAddress = null;
    }
    
    // ✅ Clear All Form Errors
    function clearAllFormErrors() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.classList.remove('error-border', 'success-border');
        });
        
        const errors = document.querySelectorAll('.form-error');
        errors.forEach(error => {
            error.style.display = 'none';
        });
    }
    
    // ✅ Address Search Functions (Backend Proxy Integration)
    async function searchAddresses(query) {
        const searches = [
            searchWithNominatim(query),
            searchWithPostalAPI(query)
        ];
        
        try {
            const results = await Promise.allSettled(searches);
            const addresses = [];
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    addresses.push(...result.value);
                }
            });
            
            return addresses.slice(0, 5);
        } catch (error) {
            console.error('Address search failed:', error);
            return [];
        }
    }
    
    async function searchWithNominatim(query) {
        try {
            const response = await fetch(`/api/address-search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const results = await response.json();
            
            return results.map(result => ({
                type: 'nominatim',
                display: result.display_name,
                address: {
                    house_number: result.address?.house_number || '',
                    road: result.address?.road || '',
                    city: result.address?.city || result.address?.town || result.address?.village || '',
                    state: result.address?.state || '',
                    postcode: result.address?.postcode || ''
                }
            }));
        } catch (error) {
            console.error('Nominatim search failed:', error);
            return [];
        }
    }
    
    async function searchWithPostalAPI(query) {
        if (!/^\d{6}$/.test(query.trim())) {
            return [];
        }
        
        try {
            const response = await fetch(`/api/pincode/${query}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data[0] && data[0].Status === 'Success') {
                return data[0].PostOffice.map(office => ({
                    type: 'postal',
                    display: `${office.Name}, ${office.District}, ${office.State} - ${query}`,
                    address: {
                        area: office.Name,
                        city: office.District,
                        state: office.State,
                        postcode: query
                    }
                }));
            }
            return [];
        } catch (error) {
            console.error('PIN code lookup failed:', error);
            return [];
        }
    }
    
    // ✅ Setup Address Autocomplete
    function setupAddressAutocomplete() {
        const addressInput = document.getElementById('street');
        const pincodeInput = document.getElementById('pincode');
        let searchTimeout;
        
        if (addressInput) {
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.id = 'address-suggestions';
            suggestionsDiv.className = 'absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden';
            
            const parent = addressInput.parentNode;
            if (parent.style.position !== 'relative') {
                parent.style.position = 'relative';
            }
            parent.appendChild(suggestionsDiv);
            
            let isSearching = false;
            
            addressInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                markFormAsDirty();
                
                clearTimeout(searchTimeout);
                
                if (query.length < 3) {
                    suggestionsDiv.classList.add('hidden');
                    return;
                }
                
                suggestionsDiv.innerHTML = '<div class="p-3 text-gray-500 text-center">🔍 Searching addresses...</div>';
                suggestionsDiv.classList.remove('hidden');
                
                searchTimeout = setTimeout(async () => {
                    if (isSearching) return;
                    
                    isSearching = true;
                    try {
                        const suggestions = await searchAddresses(query);
                        displaySuggestions(suggestions, suggestionsDiv, addressInput);
                    } catch (error) {
                        console.error('Search error:', error);
                        suggestionsDiv.innerHTML = '<div class="p-3 text-red-500 text-center">❌ Search failed. Please try again.</div>';
                    } finally {
                        isSearching = false;
                    }
                }, 500);
            });
            
            document.addEventListener('click', (e) => {
                if (!addressInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.classList.add('hidden');
                }
            });
        }
        
        if (pincodeInput) {
            pincodeInput.addEventListener('blur', async (e) => {
                const pincode = e.target.value.trim();
                
                if (pincode.length === 6) {
                    const errorElement = document.getElementById('pincode-error');
                    if (errorElement) {
                        errorElement.textContent = '🔍 Looking up PIN code...';
                        errorElement.style.color = '#3b82f6';
                        errorElement.style.display = 'block';
                    }
                    
                    try {
                        const locationData = await searchWithPostalAPI(pincode);
                        if (locationData.length > 0) {
                            const firstResult = locationData[0];
                            const cityInput = document.getElementById('city');
                            const stateInput = document.getElementById('state');
                            
                            if (cityInput) cityInput.value = firstResult.address.city || '';
                            if (stateInput) stateInput.value = firstResult.address.state || '';
                            
                            if (errorElement) {
                                errorElement.textContent = '✅ Address details auto-filled successfully';
                                errorElement.style.color = '#059669';
                                errorElement.style.display = 'block';
                                setTimeout(() => {
                                    errorElement.style.display = 'none';
                                }, 3000);
                            }
                        } else {
                            if (errorElement) {
                                errorElement.textContent = '⚠️ PIN code not found. Please enter manually.';
                                errorElement.style.color = '#f59e0b';
                                errorElement.style.display = 'block';
                                setTimeout(() => {
                                    errorElement.style.display = 'none';
                                }, 4000);
                            }
                        }
                    } catch (error) {
                        console.error('PIN code lookup error:', error);
                        if (errorElement) {
                            errorElement.textContent = '❌ PIN code lookup failed. Please enter manually.';
                            errorElement.style.color = '#dc2626';
                            errorElement.style.display = 'block';
                            setTimeout(() => {
                                errorElement.style.display = 'none';
                            }, 4000);
                        }
                    }
                }
            });
        }
    }
    
    // ✅ Display Address Suggestions
    function displaySuggestions(suggestions, container, input) {
        if (suggestions.length === 0) {
            container.innerHTML = '<div class="p-3 text-gray-500 text-center">🔍 No addresses found. Try a different search.</div>';
            setTimeout(() => container.classList.add('hidden'), 2000);
            return;
        }
        
        const html = suggestions.map((suggestion, index) => `
            <div class="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 suggestion-item transition-colors duration-150" 
                 data-index="${index}">
                <div class="font-medium text-gray-900 text-sm leading-tight">${escapeHtml(suggestion.display)}</div>
                <div class="text-xs text-gray-500 mt-1">
                    <span class="inline-flex items-center">
                        ${suggestion.type === 'nominatim' ? '📍 OpenStreetMap' : '📮 India Post'}
                        <span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                            ${suggestion.type === 'nominatim' ? 'Map Data' : 'Official'}
                        </span>
                    </span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
        container.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                fillAddressFromSuggestion(suggestions[index]);
                container.classList.add('hidden');
                
                // Clear selected saved address since user is entering new address
                markFormAsDirty();
                
                showToast('✅ Address filled successfully!', 'success');
            });
        });
    }
    
    // ✅ Fill Address from Suggestion
    function fillAddressFromSuggestion(suggestion) {
        const addr = suggestion.address;
        
        try {
            if (addr.road) {
                const streetInput = document.getElementById('street');
                if (streetInput) {
                    streetInput.value = addr.road;
                    clearFieldError(streetInput, 'street-error');
                }
            }
            
            if (addr.city) {
                const cityInput = document.getElementById('city');
                if (cityInput) {
                    cityInput.value = addr.city;
                    clearFieldError(cityInput, 'city-error');
                }
            }
            
            if (addr.state) {
                const stateInput = document.getElementById('state');
                if (stateInput) {
                    stateInput.value = addr.state;
                    clearFieldError(stateInput, 'state-error');
                }
            }
            
            if (addr.postcode) {
                const pincodeInput = document.getElementById('pincode');
                if (pincodeInput) {
                    pincodeInput.value = addr.postcode;
                    clearFieldError(pincodeInput, 'pincode-error');
                }
            }
            
            if (addr.house_number) {
                const flatInput = document.getElementById('flat-no');
                if (flatInput && !flatInput.value.trim()) {
                    flatInput.value = addr.house_number;
                    clearFieldError(flatInput, 'flat-no-error');
                }
            }
        } catch (error) {
            console.error('Error filling address:', error);
            showToast('⚠️ Some fields could not be filled', 'warning');
        }
    }
    
    // ✅ Mark Form as Dirty (User Made Changes)
    function markFormAsDirty() {
        if (!isFormDirty) {
            isFormDirty = true;
            selectedSavedAddress = null;
            updateSelectedAddressUI();
            
            // Re-enable save toggle
            const saveToggle = document.getElementById('save-address-toggle');
            if (saveToggle) {
                saveToggle.disabled = false;
            }
        }
    }
    
    // ✅ Enhanced Toast Notifications
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 transform translate-x-full opacity-0 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'warning' ? 'bg-yellow-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        
        const icon = type === 'success' ? '✅' : 
                    type === 'warning' ? '⚠️' : 
                    type === 'error' ? '❌' : 'ℹ️';
        
        toast.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">${icon}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    // ✅ HTML Escaping for Security
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ✅ Initialize Shipping Page
    // ✅ FIXED: Replace your initShippingPage() function with this
// ✅ FIXED: Replace your initShippingPage() function with this
async function initShippingPage() {
    try {
        console.log('🚢 Initializing shipping page...');
        
        // Check authentication
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (!data.user) {
                console.log('🚢 User not authenticated');
                window.location.href = '/?login=required';
                return;
            }
            currentUser = data.user;
            console.log('🚢 User authenticated:', currentUser.email || currentUser.name);
        } else {
            console.log('🚢 Auth check failed:', response.status);
            window.location.href = '/?login=required';
            return;
        }
        
        // Get cart from localStorage
        checkoutCart = JSON.parse(localStorage.getItem('checkout-cart')) || [];
        console.log('🚢 Cart loaded:', checkoutCart.length, 'items');
        
        if (checkoutCart.length === 0) {
            showToast('❌ Your cart is empty', 'error');
            setTimeout(() => window.location.href = 'cart.html', 2000);
            return;
        }
        
        // Load saved addresses
        await loadSavedAddresses();
        
        // Display order summary
        displayOrderSummary();
        
        // Setup form functionality
        setupFormValidation();
        setupAddressAutocomplete();
        setupFormSubmission();
        
        // Enable submit button
        const button = document.getElementById('continue-payment-btn');
        if (button) {
            button.disabled = false;
        }
        
        // Welcome message
        if (savedAddresses.length > 0) {
            showToast('📍 Select a saved address or enter new one', 'info');
        } else {
            showToast('🚚 Enter your delivery address below', 'info');
        }

        // ✅ NEW: Force verification banner to reappear during checkout
        sessionStorage.removeItem('verification_dismissed');
        if (currentUser && !currentUser.email_verified) {
            // Give main.js time to load and inject it, or call it directly if available
            if (typeof showVerificationStatus === 'function') {
                showVerificationStatus(false);
            }
        }
        
        console.log('✅ Shipping page initialized successfully');
        
    } catch (error) {
        console.error('❌ Shipping page initialization failed:', error);
        showToast('❌ Page loading failed. Please refresh.', 'error');
    }
}

    
    // ✅ Display Order Summary
   // ✅ ENHANCED: Display Order Summary with Shipping Calculation
function displayOrderSummary() {
    const container = document.getElementById('shipping-items');
    const totalElement = document.getElementById('shipping-total');
    const shippingTextElement = document.getElementById('shipping-text');
    
    if (!container || !totalElement) return;
    
    let subtotal = 0;
    let html = '';
    
    checkoutCart.forEach(item => {
        const qty = item.qty || item.quantity || 1;
        const itemTotal = (item.price * qty) / 100;
        subtotal += itemTotal;
        
        html += `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 text-sm truncate">${escapeHtml(item.name)}</div>
                    <div class="text-xs text-gray-500 mt-1">Qty: ${qty} × ₹${(item.price / 100).toFixed(2)}</div>
                </div>
                <div class="font-semibold text-gray-900">₹${itemTotal.toFixed(2)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // ✅ CALCULATE SHIPPING (show online payment rates on shipping page)
    const shipping = calculateShipping(subtotal, 'online');
    
    // Update total with shipping
    totalElement.textContent = `₹${shipping.total.toFixed(2)}`;
    
    // ✅ UPDATE SHIPPING MESSAGE
    if (shippingTextElement) {
        if (shipping.isFreeShipping) {
            shippingTextElement.textContent = 'Including all taxes • FREE delivery';
        } else {
            shippingTextElement.textContent = `Including all taxes • ₹${shipping.shippingFee} delivery charge`;
        }
    }
    
    // ✅ OPTIONAL: Add shipping breakdown to the summary
    if (container && !shipping.isFreeShipping) {
        html += `
            <div class="flex justify-between items-center py-2 border-t border-gray-200 mt-2 pt-2">
                <div class="text-sm text-gray-600">Shipping Charge</div>
                <div class="text-sm font-medium text-gray-900">₹${shipping.shippingFee.toFixed(2)}</div>
            </div>
        `;
        container.innerHTML = html;
    }
}

    // ✅ Setup Form Validation
    function setupFormValidation() {
        const inputs = [
            { id: 'full-name', validator: validateFullName, errorId: 'full-name-error' },
            { id: 'mobile', validator: validateMobile, errorId: 'mobile-error' },
            { id: 'alt-mobile', validator: validateAltMobile, errorId: 'alt-mobile-error' },
            { id: 'flat-no', validator: validateFlatNo, errorId: 'flat-no-error' },
            { id: 'street', validator: validateStreet, errorId: 'street-error' },
            { id: 'pincode', validator: validatePincode, errorId: 'pincode-error' },
            { id: 'city', validator: validateCity, errorId: 'city-error' },
            { id: 'state', validator: validateState, errorId: 'state-error' }
        ];
        
        inputs.forEach(({ id, validator, errorId }) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('blur', () => validator(input, errorId));
                input.addEventListener('input', () => {
                    clearFieldError(input, errorId);
                    markFormAsDirty();
                });
            }
        });
        
        // Address type validation
        const addressTypeRadios = document.querySelectorAll('input[name="address-type"]');
        addressTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                clearFieldError(null, 'address-type-error');
                markFormAsDirty();
            });
        });
    }
    
    // ✅ Validation Functions
    function validateFullName(input, errorId) {
        const value = input.value.trim();
        
        if (!value) {
            setFieldError(input, 'Name is required', errorId);
            return false;
        }
        if (value.length < 2) {
            setFieldError(input, 'Name must be at least 2 characters', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateMobile(input, errorId) {
        const value = input.value.replace(/\D/g, '');
        input.value = value;
        
        if (!value) {
            setFieldError(input, 'Mobile number is required', errorId);
            return false;
        }
        if (value.length !== 10) {
            setFieldError(input, 'Please enter a valid 10-digit mobile number', errorId);
            return false;
        }
        if (!value.match(/^[6-9]\d{9}$/)) {
            setFieldError(input, 'Please enter a valid Indian mobile number', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateAltMobile(input, errorId) {
        const value = input.value.replace(/\D/g, '');
        input.value = value;
        
        if (value && value.length !== 10) {
            setFieldError(input, 'Please enter a valid 10-digit mobile number', errorId);
            return false;
        }
        if (value && !value.match(/^[6-9]\d{9}$/)) {
            setFieldError(input, 'Please enter a valid Indian mobile number', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateFlatNo(input, errorId) {
        const value = input.value.trim();
        
        if (!value) {
            setFieldError(input, 'Flat/House number is required', errorId);
            return false;
        }
        if (value.length < 2) {
            setFieldError(input, 'Please provide more details', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateStreet(input, errorId) {
        const value = input.value.trim();
        
        if (!value) {
            setFieldError(input, 'Street address is required', errorId);
            return false;
        }
        if (value.length < 3) {
            setFieldError(input, 'Please enter complete street address', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validatePincode(input, errorId) {
        const value = input.value.replace(/\D/g, '');
        input.value = value;
        
        if (!value) {
            setFieldError(input, 'PIN code is required', errorId);
            return false;
        }
        if (value.length !== 6) {
            setFieldError(input, 'Please enter a valid 6-digit PIN code', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateCity(input, errorId) {
        if (!input.value.trim()) {
            setFieldError(input, 'City is required', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateState(input, errorId) {
        if (!input.value.trim()) {
            setFieldError(input, 'State is required', errorId);
            return false;
        }
        
        setFieldValid(input, errorId);
        return true;
    }
    
    function validateAddressType() {
        const addressType = document.querySelector('input[name="address-type"]:checked');
        if (!addressType) {
            setFieldError(null, 'Please select address type', 'address-type-error');
            return false;
        }
        
        clearFieldError(null, 'address-type-error');
        return true;
    }
    
    // ✅ Field State Management
    function setFieldError(input, message, errorId) {
        if (input) {
            input.classList.add('error-border');
            input.classList.remove('success-border');
        }
        
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
    
    function setFieldValid(input, errorId) {
        if (input) {
            input.classList.remove('error-border');
            input.classList.add('success-border');
        }
        
        if (errorId) {
            const errorElement = document.getElementById(errorId);
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }
    }
    
    function clearFieldError(input, errorId) {
        if (input) {
            input.classList.remove('error-border', 'success-border');
        }
        
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    // ✅ Setup Form Submission
    function setupFormSubmission() {
        const form = document.getElementById('shipping-form');
        const continueBtn = document.getElementById('continue-payment-btn');
        const continueText = document.getElementById('continue-text');
        
        if (!form || !continueBtn || !continueText) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            continueBtn.disabled = true;
            continueText.innerHTML = '🔄 Validating Address...';
            
            try {
                // Validate all fields
                const validations = [
                    validateFullName(document.getElementById('full-name'), 'full-name-error'),
                    validateMobile(document.getElementById('mobile'), 'mobile-error'),
                    validateAltMobile(document.getElementById('alt-mobile'), 'alt-mobile-error'),
                    validateFlatNo(document.getElementById('flat-no'), 'flat-no-error'),
                    validateStreet(document.getElementById('street'), 'street-error'),
                    validatePincode(document.getElementById('pincode'), 'pincode-error'),
                    validateCity(document.getElementById('city'), 'city-error'),
                    validateState(document.getElementById('state'), 'state-error'),
                    validateAddressType()
                ];
                
                const isValid = validations.every(result => result === true);
                
                if (!isValid) {
                    continueBtn.disabled = false;
                    continueText.textContent = '🔒 Continue to Secure Payment';
                    
                    // Scroll to first error
                    const firstError = document.querySelector('.error-border');
                    if (firstError) {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        firstError.focus();
                    }
                    showToast('❌ Please fix the errors above', 'error');
                    return;
                }
                
                // Collect shipping data
                const shippingData = {
                    fullName: document.getElementById('full-name').value.trim(),
                    mobile: document.getElementById('mobile').value.trim(),
                    altMobile: document.getElementById('alt-mobile').value.trim(),
                    flatNo: document.getElementById('flat-no').value.trim(),
                    street: document.getElementById('street').value.trim(),
                    city: document.getElementById('city').value.trim(),
                    state: document.getElementById('state').value.trim(),
                    country: document.getElementById('country').value,
                    pincode: document.getElementById('pincode').value,
                    addressType: document.querySelector('input[name="address-type"]:checked').value
                };
                
                // Show success animation
                continueText.innerHTML = '✅ Address Saved! Redirecting...';
                showToast('🚚 Proceeding to secure payment', 'success');
                
                // Store shipping data
                localStorage.setItem('shipping-data', JSON.stringify(shippingData));
                
                // Redirect to payment page
                setTimeout(() => {
                    window.location.href = 'payment.html';
                }, 1500);
                
            } catch (error) {
                console.error('Form submission error:', error);
                continueBtn.disabled = false;
                continueText.textContent = '🔒 Continue to Secure Payment';
                showToast('❌ Something went wrong. Please try again.', 'error');
            }
        });
    }
    
    // ✅ Initialize when DOM loads
    document.addEventListener('DOMContentLoaded', initShippingPage);
    
})();
