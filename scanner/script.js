// Product Database
var PRODUCTS = {
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

var cart = [];
var scanning = false;
var stream = null;

// Safe DOM getter
function getEl(id) {
    return document.getElementById(id) || null;
}

// Wait for DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    setTimeout(init, 0);
}

function init() {
    loadProducts();
    attachEvents();
    loadCart();
}

// Attach all event listeners
function attachEvents() {
    var startBtn = getEl('startScanBtn');
    var stopBtn = getEl('stopScanBtn');
    var uploadBtn = getEl('uploadQRBtn');
    var fileInput = getEl('qrFileInput');
    var cartIcon = getEl('cartIcon');
    var closeBtn = getEl('closeCartBtn');
    var overlay = getEl('overlay');
    var shop = getEl('continueShopping');
    var checkBtn = getEl('checkoutBtn');
    var form = getEl('checkoutForm');

    if (startBtn) startBtn.onclick = startScanning;
    if (stopBtn) stopBtn.onclick = stopScanning;
    if (uploadBtn) uploadBtn.onclick = function() { if (fileInput) fileInput.click(); };
    if (fileInput) fileInput.onchange = handleFileUpload;
    if (cartIcon) cartIcon.onclick = openCart;
    if (closeBtn) closeBtn.onclick = closeCart;
    if (overlay) overlay.onclick = closeCart;
    if (shop) shop.onclick = closeCart;
    if (checkBtn) checkBtn.onclick = openCheckout;
    if (form) form.onsubmit = processCheckout;
}

// Load products
function loadProducts() {
    var grid = getEl('productsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';

    for (var key in PRODUCTS) {
        var p = PRODUCTS[key];
        var card = document.createElement('div');
        card.className = 'product-card';
        
        var html = '<div class="product-image">' + p.emoji + '</div>';
        html += '<div class="product-name">' + p.name + '</div>';
        html += '<div class="product-description">' + p.description + '</div>';
        html += '<div class="product-price">$' + p.price.toFixed(2) + '</div>';
        html += '<div class="product-sku">' + p.id + '</div>';
        html += '<button class="btn btn-add" type="button">+ Add to Cart</button>';
        
        card.innerHTML = html;
        
        var btn = card.querySelector('.btn-add');
        btn.productId = p.id;
        btn.onclick = function() { addToCart(this.productId); };
        
        grid.appendChild(card);
    }
}

// Start scanner
function startScanning() {
    var video = getEl('video');
    if (!video) return;

    var constraints = {
        video: { facingMode: 'environment' },
        audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream_obj) {
            stream = stream_obj;
            video.srcObject = stream;
            
            scanning = true;
            var startBtn = getEl('startScanBtn');
            var stopBtn = getEl('stopScanBtn');
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            
            showMsg('📷 Camera ready! Scan QR code', 'info');
            detectQR();
        })
        .catch(function(err) {
            showMsg('📱 Camera error - Use Upload QR', 'error');
            console.log(err);
        });
}

// Stop scanner
function stopScanning() {
    scanning = false;
    
    if (stream) {
        var tracks = stream.getTracks();
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].stop();
        }
        stream = null;
    }

    var video = getEl('video');
    if (video) video.srcObject = null;
    
    var startBtn = getEl('startScanBtn');
    var stopBtn = getEl('stopScanBtn');
    if (startBtn) startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
    
    showMsg('⏹️ Scanner stopped', 'info');
}

// Detect QR
function detectQR() {
    if (!scanning) return;

    var video = getEl('video');
    var canvas = getEl('canvas');
    
    if (!video || !canvas) {
        if (scanning) setTimeout(detectQR, 100);
        return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) {
        if (scanning) setTimeout(detectQR, 100);
        return;
    }

    try {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (window.jsQR) {
                var code = window.jsQR(imageData.data, canvas.width, canvas.height);
                if (code && code.data) {
                    processCode(code.data);
                    return;
                }
            }
        }
    } catch (e) {
        console.log('Scan error:', e);
    }

    if (scanning) {
        requestAnimationFrame(detectQR);
    }
}

// Handle file upload
function handleFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    showMsg('📤 Processing...', 'info');
    var reader = new FileReader();

    reader.onload = function(event) {
        var img = new Image();
        
        img.onload = function() {
            var canvas = getEl('canvas');
            if (!canvas) return;
            
            var ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (window.jsQR) {
                    var code = window.jsQR(imageData.data, canvas.width, canvas.height);
                    if (code && code.data) {
                        processCode(code.data);
                    } else {
                        showMsg('❌ No QR found', 'error');
                    }
                } else {
                    showMsg('⚠️ QR library loading', 'error');
                }
            } catch (err) {
                showMsg('❌ Error reading image', 'error');
                console.log(err);
            }
        };
        
        img.onerror = function() {
            showMsg('❌ Image error', 'error');
        };
        
        img.src = event.target.result;
    };

    reader.onerror = function() {
        showMsg('❌ File error', 'error');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
}

// Process scanned code
function processCode(data) {
    var pid = String(data).trim();
    
    if (PRODUCTS[pid]) {
        addToCart(pid);
        showMsg('✅ Added: ' + PRODUCTS[pid].name, 'success');
        
        setTimeout(function() {
            if (scanning) stopScanning();
        }, 1500);
    } else {
        showMsg('⚠️ Product not found', 'error');
    }
}

// Show message
function showMsg(msg, type) {
    var el = getEl('scanMessage');
    if (!el) return;
    
    el.textContent = msg;
    el.className = 'scan-message ' + (type || '');
    
    if (type === 'success' || type === 'error') {
        setTimeout(function() {
            el.textContent = '';
            el.className = 'scan-message';
        }, 4000);
    }
}

// Add to cart
function addToCart(pid) {
    if (!PRODUCTS[pid]) return;

    cart.push({
        id: pid,
        product: PRODUCTS[pid],
        quantity: 1
    });

    saveCart();
    updateCart();
    openCart();
}

// Remove from cart
function removeFromCart(idx) {
    cart.splice(idx, 1);
    saveCart();
    updateCart();
}

// Open cart
function openCart() {
    var sidebar = getEl('cartSidebar');
    var overlay = getEl('overlay');
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

// Close cart
function closeCart() {
    var sidebar = getEl('cartSidebar');
    var overlay = getEl('overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// Update cart display
function updateCart() {
    var cartItems = getEl('cartItems');
    var cartCount = getEl('cartCount');

    if (!cartItems || !cartCount) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><p>Empty</p></div>';
        cartCount.textContent = '0';
        return;
    }

    cartItems.innerHTML = '';
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var div = document.createElement('div');
        div.className = 'cart-item';
        
        var html = '<div class="cart-item-info">';
        html += '<div class="cart-item-name">' + item.product.name + '</div>';
        html += '<div class="cart-item-price">$' + item.product.price.toFixed(2) + '</div>';
        html += '</div>';
        html += '<button class="cart-item-remove" type="button">Remove</button>';
        
        div.innerHTML = html;
        
        var removeBtn = div.querySelector('.cart-item-remove');
        removeBtn.itemIndex = i;
        removeBtn.onclick = function() { removeFromCart(this.itemIndex); };
        
        cartItems.appendChild(div);
    }

    cartCount.textContent = String(cart.length);
    updateSummary();
}

// Update summary
function updateSummary() {
    var sub = 0;
    for (var i = 0; i < cart.length; i++) {
        sub += cart[i].product.price;
    }
    
    var tax = sub * 0.1;
    var total = sub + tax;

    var subEl = getEl('subtotal');
    var taxEl = getEl('tax');
    var totEl = getEl('total');

    if (subEl) subEl.textContent = '$' + sub.toFixed(2);
    if (taxEl) taxEl.textContent = '$' + tax.toFixed(2);
    if (totEl) totEl.textContent = '$' + total.toFixed(2);
}

// Open checkout
function openCheckout() {
    if (cart.length === 0) {
        showMsg('⚠️ Add items first', 'error');
        return;
    }

    var sub = 0;
    for (var i = 0; i < cart.length; i++) {
        sub += cart[i].product.price;
    }
    var tax = sub * 0.1;
    var total = sub + tax;

    var html = '<table class="summary-table"><tbody>';
    for (var i = 0; i < cart.length; i++) {
        html += '<tr><td>' + cart[i].product.name + '</td><td>$' + cart[i].product.price.toFixed(2) + '</td></tr>';
    }
    html += '<tr class="summary-total"><td><strong>Subtotal:</strong></td><td><strong>$' + sub.toFixed(2) + '</strong></td></tr>';
    html += '<tr><td><strong>Tax (10%):</strong></td><td><strong>$' + tax.toFixed(2) + '</strong></td></tr>';
    html += '<tr class="summary-grand-total"><td><strong>Total:</strong></td><td><strong>$' + total.toFixed(2) + '</strong></td></tr>';
    html += '</tbody></table>';

    var summaryEl = getEl('checkoutSummary');
    if (summaryEl) summaryEl.innerHTML = html;

    // Clear form
    var form = getEl('checkoutForm');
    if (form) form.reset();

    closeCart();
    var modal = getEl('checkoutModal');
    if (modal) modal.classList.add('active');
}

// Close checkout modal
function closeCheckoutModal() {
    var modal = getEl('checkoutModal');
    if (modal) modal.classList.remove('active');
}

// Process checkout
function processCheckout(e) {
    e.preventDefault();

    var fullNameEl = getEl('fullName');
    var emailEl = getEl('email');
    var addressEl = getEl('address');
    var cardEl = getEl('cardNumber');
    var expiryEl = getEl('expiry');
    var cvvEl = getEl('cvv');

    // Basic validation
    if (!fullNameEl || !fullNameEl.value.trim()) {
        alert('❌ Please enter your full name');
        return;
    }
    if (!emailEl || !emailEl.value.trim()) {
        alert('❌ Please enter your email');
        return;
    }
    if (!addressEl || !addressEl.value.trim()) {
        alert('❌ Please enter your shipping address');
        return;
    }
    if (!cardEl || !cardEl.value.trim() || cardEl.value.replace(/\s/g, '').length < 13) {
        alert('❌ Please enter a valid card number');
        return;
    }
    if (!expiryEl || !expiryEl.value.match(/^\d{2}\/\d{2}$/)) {
        alert('❌ Please enter expiry in MM/YY format');
        return;
    }
    if (!cvvEl || !cvvEl.value.match(/^\d{3}$/)) {
        alert('❌ Please enter a valid 3-digit CVV');
        return;
    }

    // Generate order number
    var orderNum = 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    // Calculate totals
    var sub = 0;
    for (var i = 0; i < cart.length; i++) {
        sub += cart[i].product.price;
    }
    var tax = sub * 0.1;
    var total = sub + tax;

    // Build success message
    var msgEl = getEl('successMessage');
    if (msgEl) {
        msgEl.innerHTML = '<p>✅ Order <strong>#' + orderNum + '</strong> confirmed!</p>' +
                         '<p>Confirmation email sent to <strong>' + emailEl.value + '</strong></p>' +
                         '<p>Estimated delivery: <strong>3-5 Business Days</strong></p>';
    }

    // Build order details
    var detailsEl = getEl('orderDetails');
    if (detailsEl) {
        var html = '<div class="order-details-grid">';
        html += '<div class="detail-item"><span class="detail-label">Order #:</span><span class="detail-value">' + orderNum + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Items:</span><span class="detail-value">' + cart.length + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Subtotal:</span><span class="detail-value">$' + sub.toFixed(2) + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Tax:</span><span class="detail-value">$' + tax.toFixed(2) + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Total:</span><span class="detail-value total">$' + total.toFixed(2) + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Ship To:</span><span class="detail-value">' + fullNameEl.value + '</span></div>';
        html += '</div>';
        detailsEl.innerHTML = html;
    }

    // Close checkout and show success
    closeCheckoutModal();
    var successModal = getEl('successModal');
    if (successModal) successModal.classList.add('active');

    // Clear cart
    cart = [];
    saveCart();
}

// Close success modal
function closeSuccessModal() {
    var modal = getEl('successModal');
    if (modal) modal.classList.remove('active');
    
    // Reset cart display
    updateCart();
    loadProducts();
}

// Save cart to localStorage
function saveCart() {
    try {
        localStorage.setItem('clockShopCart', JSON.stringify(cart));
    } catch (e) {
        console.log('Save error:', e);
    }
}

// Load cart from localStorage
function loadCart() {
    try {
        var saved = localStorage.getItem('clockShopCart');
        if (saved) {
            cart = JSON.parse(saved);
            updateCart();
        }
    } catch (e) {
        console.log('Load error:', e);
        cart = [];
    }
}
