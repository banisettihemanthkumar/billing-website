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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
    loadCartFromStorage();
});

// Setup Event Listeners
function setupEventListeners() {
    // Scanner Controls
    document.getElementById('startScanBtn').addEventListener('click', startScanning);
    document.getElementById('stopScanBtn').addEventListener('click', stopScanning);
    document.getElementById('uploadQRBtn').addEventListener('click', () => {
        document.getElementById('qrFileInput').click();
    });
    document.getElementById('qrFileInput').addEventListener('change', handleFileUpload);

    // Cart Controls
    document.getElementById('cartIcon').addEventListener('click', openCart);
    document.getElementById('closeCartBtn').addEventListener('click', closeCart);
    document.getElementById('overlay').addEventListener('click', closeCart);
    document.getElementById('continueShopping').addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);

    // Checkout Form
    document.getElementById('checkoutForm').addEventListener('submit', processCheckout);
}

// Load and Display Products
function loadProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    Object.values(PRODUCTS).forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">${product.emoji}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-description">${product.description}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <div class="product-sku">${product.id}</div>
            <button class="btn btn-add" onclick="addToCart('${product.id}')">
                + Add to Cart
            </button>
        `;
        grid.appendChild(card);
    });
}

// ====== IMPROVED SCANNER FUNCTIONS ======
async function startScanning() {
    try {
        // Request camera access with improved constraints
        const constraints = {
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('video');
        video.srcObject = stream;
        video.play();

        scanning = true;
        document.getElementById('startScanBtn').style.display = 'none';
        document.getElementById('stopScanBtn').style.display = 'inline-block';
        showScanMessage('📷 Camera active! Point at QR code', 'info');

        // Start QR code detection
        detectQRCodes();
    } catch (err) {
        console.error('Camera Error:', err);
        
        // Provide specific error messages
        if (err.name === 'NotAllowedError') {
            showScanMessage('❌ Camera access denied. Please allow camera permissions.', 'error');
        } else if (err.name === 'NotFoundError') {
            showScanMessage('❌ No camera found. Use upload QR code instead.', 'error');
        } else {
            showScanMessage('❌ Camera error: ' + err.message, 'error');
        }
    }
}

function stopScanning() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    scanning = false;
    const video = document.getElementById('video');
    video.srcObject = null;
    document.getElementById('startScanBtn').style.display = 'inline-block';
    document.getElementById('stopScanBtn').style.display = 'none';
    showScanMessage('Scanner stopped', 'info');
}

async function detectQRCodes() {
    if (!scanning) return;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size from video dimensions
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            // Get image data and scan for QR code
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Check if jsQR library is available
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, canvas.width, canvas.height, {
                    inversionAttempts: 'dontInvert'
                });

                if (code) {
                    processScannedCode(code.data);
                    return; // Stop loop after finding a code
                }
            } else {
                console.warn('jsQR library not loaded');
            }
        } catch (err) {
            console.error('QR Detection Error:', err);
        }
    }

    // Continue scanning
    if (scanning) {
        requestAnimationFrame(detectQRCodes);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showScanMessage('📤 Processing image...', 'info');
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    
                    if (code && code.data) {
                        processScannedCode(code.data);
                    } else {
                        showScanMessage('❌ No QR code found in image', 'error');
                    }
                } else {
                    showScanMessage('⚠️ QR Library not loaded. Try manual entry or demo codes.', 'error');
                }
            } catch (err) {
                console.error('Image processing error:', err);
                showScanMessage('❌ Error processing image', 'error');
            }
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
    event.target.value = '';
}

function processScannedCode(data) {
    // Check if the scanned code matches a product ID
    const productId = data.trim();
    
    if (PRODUCTS[productId]) {
        addToCart(productId);
        showScanMessage(`✅ Added: ${PRODUCTS[productId].name}`, 'success');
        
        // Auto stop scanner after successful scan
        setTimeout(() => {
            if (scanning) stopScanning();
        }, 1000);
    } else {
        showScanMessage(`⚠️ Unknown product code: ${productId}`, 'error');
    }
}

// Demo scanning function
function scanProduct(productId) {
    if (PRODUCTS[productId]) {
        addToCart(productId);
        showScanMessage(`✅ Added: ${PRODUCTS[productId].name}`, 'success');
    }
}

function showScanMessage(message, type = '') {
    const msgEl = document.getElementById('scanMessage');
    msgEl.textContent = message;
    msgEl.className = `scan-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            msgEl.textContent = '';
            msgEl.className = 'scan-message';
        }, 3000);
    }
}

// ====== CART FUNCTIONS ======
function addToCart(productId) {
    if (!PRODUCTS[productId]) return;

    cart.push({
        id: productId,
        product: PRODUCTS[productId],
        quantity: 1
    });

    saveCartToStorage();
    updateCartDisplay();
    openCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCartToStorage();
    updateCartDisplay();
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function updateCartDisplay() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountEl = document.getElementById('cartCount');

    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p>Your cart is empty</p>
            </div>
        `;
        cartCountEl.textContent = '0';
        return;
    }

    cartItemsEl.innerHTML = '';
    cart.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product.name}</div>
                <div class="cart-item-price">$${item.product.price.toFixed(2)}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">Remove</button>
        `;
        cartItemsEl.appendChild(itemEl);
    });

    cartCountEl.textContent = cart.length;
    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// ====== CHECKOUT FUNCTIONS ======
function openCheckout() {
    if (cart.length === 0) {
        showScanMessage('⚠️ Add items to cart first', 'error');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const summaryEl = document.getElementById('checkoutSummary');
    summaryEl.innerHTML = `
        <div class="order-details">
            ${cart.map(item => `
                <div class="order-details-row">
                    <span>${item.product.name}</span>
                    <span>$${item.product.price.toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="order-details-row" style="border-top: 1px solid #bbb; padding-top: 10px;">
                <strong>Subtotal:</strong>
                <strong>$${subtotal.toFixed(2)}</strong>
            </div>
            <div class="order-details-row">
                <strong>Tax (10%):</strong>
                <strong>$${tax.toFixed(2)}</strong>
            </div>
            <div class="order-details-row" style="font-size: 1.2em; color: #667eea;">
                <strong>Total:</strong>
                <strong>$${total.toFixed(2)}</strong>
            </div>
        </div>
    `;

    closeCart();
    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
}

function processCheckout(e) {
    e.preventDefault();

    // Validate form
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const cardNumber = document.getElementById('cardNumber').value;

    if (!fullName || !email || !cardNumber) {
        alert('Please fill in all required fields');
        return;
    }

    // Generate order number
    const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Show success modal
    const successMsg = document.getElementById('successMessage');
    successMsg.textContent = `Your order #${orderNumber} has been placed successfully! You will receive a confirmation email at ${email}.`;

    const orderDetailsEl = document.getElementById('orderDetails');
    orderDetailsEl.innerHTML = `
        <div class="order-details">
            <div class="order-details-row">
                <strong>Order Number:</strong>
                <strong>${orderNumber}</strong>
            </div>
            <div class="order-details-row">
                <strong>Items Ordered:</strong>
                <span>${cart.length} item(s)</span>
            </div>
            <div class="order-details-row">
                <strong>Total Amount:</strong>
                <strong>$${total.toFixed(2)}</strong>
            </div>
            <div class="order-details-row">
                <strong>Shipped To:</strong>
                <span>${fullName}</span>
            </div>
            <div class="order-details-row">
                <strong>Estimated Delivery:</strong>
                <span>3-5 Business Days</span>
            </div>
        </div>
    `;

    closeCheckoutModal();
    document.getElementById('successModal').classList.add('active');

    // Reset form and cart
    document.getElementById('checkoutForm').reset();
    cart = [];
    saveCartToStorage();
    updateCartDisplay();
}

function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
    loadProducts();
}

function closeDemoModal() {
    document.getElementById('demoModal').classList.remove('active');
}

// ====== STORAGE FUNCTIONS ======
function saveCartToStorage() {
    localStorage.setItem('clockShopCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('clockShopCart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartDisplay();
    }
}

// Note: jsQR library needs to be included via CDN for QR detection
// Make sure the following is included in HTML: <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
