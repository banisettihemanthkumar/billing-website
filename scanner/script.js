// Product Database
const PRODUCTS = {
    'CLOCK_BASIC_001': {
        id: 'CLOCK_BASIC_001',
        name: 'Basic Digital Clock',
        description: '8 Time Zones Display',
        price: 29.99,
        emoji: '🕐'
    },
    'CLOCK_PREMIUM_001': {
        id: 'CLOCK_PREMIUM_001',
        name: 'Premium Digital Clock',
        description: 'Unlimited Time Zones',
        price: 49.99,
        emoji: '⏰'
    },
    'CLOCK_PRO_001': {
        id: 'CLOCK_PRO_001',
        name: 'Pro Digital Clock',
        description: 'Advanced Features + API',
        price: 79.99,
        emoji: '⌚'
    }
};

let cart = [];
let scanning = false;
let stream = null;

// Safe DOM selector
function safeGetElement(id) {
    try {
        return document.getElementById(id);
    } catch (e) {
        return null;
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

function initialize() {
    try {
        loadProducts();
        setupEventListeners();
        loadCartFromStorage();
    } catch (error) {
        console.error('Init error:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    try {
        const startBtn = safeGetElement('startScanBtn');
        const stopBtn = safeGetElement('stopScanBtn');
        const uploadBtn = safeGetElement('uploadQRBtn');
        const fileInput = safeGetElement('qrFileInput');
        const cartIcon = safeGetElement('cartIcon');
        const closeCartBtn = safeGetElement('closeCartBtn');
        const overlay = safeGetElement('overlay');
        const continueShopping = safeGetElement('continueShopping');
        const checkoutBtn = safeGetElement('checkoutBtn');
        const checkoutForm = safeGetElement('checkoutForm');

        if (startBtn) startBtn.onclick = startScanning;
        if (stopBtn) stopBtn.onclick = stopScanning;
        if (uploadBtn) uploadBtn.onclick = () => { if (fileInput) fileInput.click(); };
        if (fileInput) fileInput.onchange = handleFileUpload;
        if (cartIcon) cartIcon.onclick = openCart;
        if (closeCartBtn) closeCartBtn.onclick = closeCart;
        if (overlay) overlay.onclick = closeCart;
        if (continueShopping) continueShopping.onclick = closeCart;
        if (checkoutBtn) checkoutBtn.onclick = openCheckout;
        if (checkoutForm) checkoutForm.onsubmit = processCheckout;
    } catch (error) {
        console.log('Setup error:', error);
    }
}

// Load Products
function loadProducts() {
    try {
        const grid = safeGetElement('productsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';

        for (const key in PRODUCTS) {
            const product = PRODUCTS[key];
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = '<div class="product-image">' + product.emoji + '</div>' +
                '<div class="product-name">' + product.name + '</div>' +
                '<div class="product-description">' + product.description + '</div>' +
                '<div class="product-price">$' + product.price.toFixed(2) + '</div>' +
                '<div class="product-sku">' + product.id + '</div>' +
                '<button class="btn btn-add" type="button">+ Add to Cart</button>';
            
            const button = card.querySelector('.btn-add');
            button.onclick = (function(pid) {
                return function() { addToCart(pid); };
            })(product.id);
            
            grid.appendChild(card);
        }
    } catch (error) {
        console.log('Load products error:', error);
    }
}

// ====== SCANNER FUNCTIONS ======
function startScanning() {
    try {
        const video = safeGetElement('video');
        if (!video) return;

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        }).then(function(mediaStream) {
            stream = mediaStream;
            video.srcObject = stream;
            video.play().catch(function(e) {
                console.log('Play error:', e);
            });

            scanning = true;
            const startBtn = safeGetElement('startScanBtn');
            const stopBtn = safeGetElement('stopScanBtn');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            
            showScanMessage('📷 Camera active! Point at QR code', 'info');
            setTimeout(function() { detectQRCodes(); }, 500);
        }).catch(function(err) {
            console.log('Camera error:', err);
            showScanMessage('📱 Camera unavailable - Use Upload QR Code', 'error');
        });
    } catch (error) {
        console.log('Start scanning error:', error);
    }
}

function stopScanning() {
    try {
        scanning = false;
        if (stream) {
            stream.getTracks().forEach(function(track) {
                try { track.stop(); } catch (e) {}
            });
            stream = null;
        }

        const video = safeGetElement('video');
        if (video) video.srcObject = null;
        
        const startBtn = safeGetElement('startScanBtn');
        const stopBtn = safeGetElement('stopScanBtn');
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        
        showScanMessage('⏹️ Scanner stopped', 'info');
    } catch (error) {
        console.log('Stop error:', error);
    }
}

function detectQRCodes() {
    if (!scanning) return;

    try {
        const video = safeGetElement('video');
        const canvas = safeGetElement('canvas');
        
        if (!video || !canvas) {
            if (scanning) setTimeout(function() { detectQRCodes(); }, 100);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            if (scanning) setTimeout(function() { detectQRCodes(); }, 100);
            return;
        }

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (typeof jsQR !== 'undefined' && jsQR) {
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    if (code && code.data) {
                        processScannedCode(code.data);
                        return;
                    }
                }
            } catch (err) {
                console.log('Detection error:', err);
            }
        }

        if (scanning) {
            requestAnimationFrame(detectQRCodes);
        }
    } catch (error) {
        console.log('Detect error:', error);
        if (scanning) {
            setTimeout(function() { detectQRCodes(); }, 100);
        }
    }
}

function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        showScanMessage('📤 Processing image...', 'info');
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const img = new Image();
                img.onload = function() {
                    try {
                        const canvas = safeGetElement('canvas');
                        if (!canvas) return;
                        
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        
                        if (typeof jsQR !== 'undefined' && jsQR) {
                            const code = jsQR(imageData.data, canvas.width, canvas.height);
                            if (code && code.data) {
                                processScannedCode(code.data);
                            } else {
                                showScanMessage('❌ No QR code found', 'error');
                            }
                        } else {
                            showScanMessage('⚠️ QR Library loading', 'error');
                        }
                    } catch (err) {
                        console.log('Image processing error:', err);
                        showScanMessage('❌ Error processing image', 'error');
                    }
                };
                img.onerror = function() {
                    showScanMessage('❌ Failed to load image', 'error');
                };
                img.src = e.target.result;
            } catch (err) {
                console.log('Reader error:', err);
                showScanMessage('❌ Error reading file', 'error');
            }
        };

        reader.onerror = function() {
            showScanMessage('❌ Error reading file', 'error');
        };

        reader.readAsDataURL(file);
        event.target.value = '';
    } catch (error) {
        console.log('Upload error:', error);
        showScanMessage('❌ Error with upload', 'error');
    }
}

function processScannedCode(data) {
    try {
        const productId = String(data).trim();
        
        if (PRODUCTS[productId]) {
            addToCart(productId);
            showScanMessage('✅ Added: ' + PRODUCTS[productId].name, 'success');
            
            setTimeout(function() {
                if (scanning) stopScanning();
            }, 1500);
        } else {
            showScanMessage('⚠️ Product not found', 'error');
        }
    } catch (error) {
        console.log('Process code error:', error);
        showScanMessage('❌ Error processing code', 'error');
    }
}

function scanProduct(productId) {
    try {
        if (PRODUCTS[productId]) {
            addToCart(productId);
            showScanMessage('✅ Added: ' + PRODUCTS[productId].name, 'success');
        }
    } catch (error) {
        console.log('Scan error:', error);
    }
}

function showScanMessage(message, type) {
    try {
        const msgEl = safeGetElement('scanMessage');
        if (!msgEl) return;
        
        msgEl.textContent = message;
        msgEl.className = 'scan-message ' + (type || '');
        
        if (type === 'success' || type === 'error') {
            setTimeout(function() {
                msgEl.textContent = '';
                msgEl.className = 'scan-message';
            }, 4000);
        }
    } catch (error) {
        console.log('Message error:', error);
    }
}

// ====== CART FUNCTIONS ======
function addToCart(productId) {
    try {
        if (!PRODUCTS[productId]) return;

        cart.push({
            id: productId,
            product: PRODUCTS[productId],
            quantity: 1
        });

        saveCartToStorage();
        updateCartDisplay();
        openCart();
    } catch (error) {
        console.log('Add cart error:', error);
        showScanMessage('❌ Error adding to cart', 'error');
    }
}

function removeFromCart(index) {
    try {
        cart.splice(index, 1);
        saveCartToStorage();
        updateCartDisplay();
    } catch (error) {
        console.log('Remove error:', error);
    }
}

function openCart() {
    try {
        const sidebar = safeGetElement('cartSidebar');
        const overlay = safeGetElement('overlay');
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    } catch (error) {
        console.log('Open cart error:', error);
    }
}

function closeCart() {
    try {
        const sidebar = safeGetElement('cartSidebar');
        const overlay = safeGetElement('overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    } catch (error) {
        console.log('Close cart error:', error);
    }
}

function updateCartDisplay() {
    try {
        const cartItems = safeGetElement('cartItems');
        const cartCount = safeGetElement('cartCount');

        if (!cartItems || !cartCount) return;

        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><p>Your cart is empty</p></div>';
            cartCount.textContent = '0';
            return;
        }

        cartItems.innerHTML = '';
        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = '<div class="cart-item-info"><div class="cart-item-name">' + item.product.name + 
                '</div><div class="cart-item-price">$' + item.product.price.toFixed(2) + 
                '</div></div><button class="cart-item-remove" type="button">Remove</button>';
            
            const removeBtn = itemEl.querySelector('.cart-item-remove');
            removeBtn.onclick = (function(idx) {
                return function() { removeFromCart(idx); };
            })(i);
            
            cartItems.appendChild(itemEl);
        }

        cartCount.textContent = String(cart.length);
        updateCartSummary();
    } catch (error) {
        console.log('Update display error:', error);
    }
}

function updateCartSummary() {
    try {
        let subtotal = 0;
        for (let i = 0; i < cart.length; i++) {
            subtotal += cart[i].product.price;
        }
        
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        const subtotalEl = safeGetElement('subtotal');
        const taxEl = safeGetElement('tax');
        const totalEl = safeGetElement('total');

        if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
        if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
        if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
    } catch (error) {
        console.log('Summary error:', error);
    }
}

// ====== CHECKOUT FUNCTIONS ======
function openCheckout() {
    try {
        if (cart.length === 0) {
            showScanMessage('⚠️ Add items to cart first', 'error');
            return;
        }

        let subtotal = 0;
        for (let i = 0; i < cart.length; i++) {
            subtotal += cart[i].product.price;
        }
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        let summaryHTML = '<div class="order-details">';
        for (let i = 0; i < cart.length; i++) {
            summaryHTML += '<div class="order-details-row"><span>' + cart[i].product.name + 
                '</span><span>$' + cart[i].product.price.toFixed(2) + '</span></div>';
        }
        summaryHTML += '<div class="order-details-row" style="border-top: 1px solid #bbb; padding-top: 10px;">' +
            '<strong>Subtotal:</strong><strong>$' + subtotal.toFixed(2) + '</strong></div>' +
            '<div class="order-details-row"><strong>Tax (10%):</strong><strong>$' + tax.toFixed(2) + '</strong></div>' +
            '<div class="order-details-row" style="font-size: 1.2em; color: #667eea;"><strong>Total:</strong><strong>$' + total.toFixed(2) + '</strong></div></div>';

        const summaryEl = safeGetElement('checkoutSummary');
        if (summaryEl) summaryEl.innerHTML = summaryHTML;

        closeCart();
        const modal = safeGetElement('checkoutModal');
        if (modal) modal.classList.add('active');
    } catch (error) {
        console.log('Open checkout error:', error);
        showScanMessage('❌ Error opening checkout', 'error');
    }
}

function closeCheckoutModal() {
    try {
        const modal = safeGetElement('checkoutModal');
        if (modal) modal.classList.remove('active');
    } catch (error) {
        console.log('Close checkout error:', error);
    }
}

function processCheckout(e) {
    try {
        e.preventDefault();

        const fullName = safeGetElement('fullName');
        const email = safeGetElement('email');
        const cardNumber = safeGetElement('cardNumber');

        if (!fullName || !fullName.value || !email || !email.value || !cardNumber || !cardNumber.value) {
            alert('❌ Please fill all fields');
            return;
        }

        const orderNumber = 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        let subtotal = 0;
        for (let i = 0; i < cart.length; i++) {
            subtotal += cart[i].product.price;
        }
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        const successMsg = safeGetElement('successMessage');
        if (successMsg) {
            successMsg.textContent = '✅ Order #' + orderNumber + ' placed! Email: ' + email.value;
        }

        let orderHTML = '<div class="order-details">' +
            '<div class="order-details-row"><strong>Order:</strong><strong>' + orderNumber + '</strong></div>' +
            '<div class="order-details-row"><strong>Items:</strong><span>' + cart.length + '</span></div>' +
            '<div class="order-details-row"><strong>Total:</strong><strong>$' + total.toFixed(2) + '</strong></div>' +
            '<div class="order-details-row"><strong>Ship To:</strong><span>' + fullName.value + '</span></div>' +
            '<div class="order-details-row"><strong>Delivery:</strong><span>3-5 Days</span></div></div>';

        const orderDetails = safeGetElement('orderDetails');
        if (orderDetails) orderDetails.innerHTML = orderHTML;

        closeCheckoutModal();
        const successModal = safeGetElement('successModal');
        if (successModal) successModal.classList.add('active');

        cart = [];
        saveCartToStorage();
        updateCartDisplay();
    } catch (error) {
        console.log('Checkout error:', error);
        alert('❌ Error processing order');
    }
}

function closeSuccessModal() {
    try {
        const modal = safeGetElement('successModal');
        if (modal) modal.classList.remove('active');
        loadProducts();
    } catch (error) {
        console.log('Close success error:', error);
    }
}

// ====== STORAGE ======
function saveCartToStorage() {
    try {
        localStorage.setItem('clockShopCart', JSON.stringify(cart));
    } catch (error) {
        console.log('Save error:', error);
    }
}

function loadCartFromStorage() {
    try {
        const saved = localStorage.getItem('clockShopCart');
        if (saved) {
            cart = JSON.parse(saved);
            updateCartDisplay();
        }
    } catch (error) {
        console.log('Load error:', error);
        cart = [];
    }
}
