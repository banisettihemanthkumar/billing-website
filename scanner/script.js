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
    try {
        loadProducts();
        setupEventListeners();
        loadCartFromStorage();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Setup Event Listeners
function setupEventListeners() {
    try {
        // Scanner Controls
        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        const uploadBtn = document.getElementById('uploadQRBtn');
        const fileInput = document.getElementById('qrFileInput');

        if (startBtn) startBtn.addEventListener('click', startScanning);
        if (stopBtn) stopBtn.addEventListener('click', stopScanning);
        if (uploadBtn) uploadBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
        if (fileInput) fileInput.addEventListener('change', handleFileUpload);

        // Cart Controls
        const cartIcon = document.getElementById('cartIcon');
        const closeCartBtn = document.getElementById('closeCartBtn');
        const overlay = document.getElementById('overlay');
        const continueShopping = document.getElementById('continueShopping');
        const checkoutBtn = document.getElementById('checkoutBtn');
        const checkoutForm = document.getElementById('checkoutForm');

        if (cartIcon) cartIcon.addEventListener('click', openCart);
        if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
        if (overlay) overlay.addEventListener('click', closeCart);
        if (continueShopping) continueShopping.addEventListener('click', closeCart);
        if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
        if (checkoutForm) checkoutForm.addEventListener('submit', processCheckout);
    } catch (error) {
        console.error('Event listener setup error:', error);
    }
}

// Load and Display Products
function loadProducts() {
    try {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        
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
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// ====== SCANNER FUNCTIONS (NO ERRORS) ======
async function startScanning() {
    try {
        const video = document.getElementById('video');
        if (!video) {
            console.error('Video element not found');
            return;
        }

        // Request camera access
        const constraints = {
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Ensure video plays
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Video play error (continuing anyway):', error);
            });
        }

        scanning = true;
        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-block';
        
        showScanMessage('📷 Camera active! Point at QR code', 'info');

        // Start QR code detection
        setTimeout(() => detectQRCodes(), 500);
    } catch (err) {
        console.error('Camera start error:', err);
        showScanMessage('📱 Camera unavailable - Use Upload QR Code option instead', 'error');
    }
}

function stopScanning() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.log('Track stop error:', e);
                }
            });
            stream = null;
        }

        scanning = false;
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = null;
        }
        
        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
        
        showScanMessage('⏹️ Scanner stopped', 'info');
    } catch (error) {
        console.log('Stop scanning error:', error);
    }
}

async function detectQRCodes() {
    if (!scanning) return;

    try {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size from video dimensions
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            try {
                // Draw current video frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get image data and scan for QR code
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Check if jsQR library is available
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, canvas.width, canvas.height, {
                        inversionAttempts: 'dontInvert'
                    });

                    if (code && code.data) {
                        processScannedCode(code.data);
                        return;
                    }
                }
            } catch (err) {
                console.log('QR scan iteration error (continuing):', err);
            }
        }

        // Continue scanning
        if (scanning) {
            requestAnimationFrame(detectQRCodes);
        }
    } catch (error) {
        console.log('Detect QR codes error:', error);
        if (scanning) {
            requestAnimationFrame(detectQRCodes);
        }
    }
}

function handleFileUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;

        showScanMessage('📤 Processing image...', 'info');
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.getElementById('canvas');
                        if (!canvas) return;
                        
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        
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
                                    showScanMessage('❌ No QR code found in image - Try another file', 'error');
                                }
                            } else {
                                showScanMessage('⚠️ QR Library loading - Try camera or upload again', 'error');
                            }
                        } catch (err) {
                            console.log('Image data error:', err);
                            showScanMessage('⚠️ Error processing image - Try another file', 'error');
                        }
                    } catch (err) {
                        console.log('Image load error:', err);
                    }
                };
                img.onerror = () => {
                    showScanMessage('❌ Failed to load image - Try another file', 'error');
                };
                img.src = e.target.result;
            } catch (err) {
                console.log('File reader error:', err);
                showScanMessage('❌ Error reading file - Try again', 'error');
            }
        };

        reader.onerror = () => {
            showScanMessage('❌ Error reading file - Try again', 'error');
        };

        try {
            reader.readAsDataURL(file);
        } catch (err) {
            console.log('Read as data URL error:', err);
        }
        
        event.target.value = '';
    } catch (error) {
        console.log('File upload error:', error);
        showScanMessage('❌ Error with file upload - Try again', 'error');
    }
}

function processScannedCode(data) {
    try {
        const productId = data.trim();
        
        if (PRODUCTS[productId]) {
            addToCart(productId);
            showScanMessage(`✅ Added: ${PRODUCTS[productId].name}`, 'success');
            
            // Auto stop scanner after successful scan
            setTimeout(() => {
                if (scanning) stopScanning();
            }, 1500);
        } else {
            showScanMessage(`⚠️ Product not found - Try another code`, 'error');
        }
    } catch (error) {
        console.log('Process scanned code error:', error);
        showScanMessage('❌ Error processing code - Try again', 'error');
    }
}

// Demo scanning function
function scanProduct(productId) {
    try {
        if (PRODUCTS[productId]) {
            addToCart(productId);
            showScanMessage(`✅ Added: ${PRODUCTS[productId].name}`, 'success');
        }
    } catch (error) {
        console.log('Demo scan error:', error);
    }
}

function showScanMessage(message, type = '') {
    try {
        const msgEl = document.getElementById('scanMessage');
        if (!msgEl) return;
        
        msgEl.textContent = message;
        msgEl.className = `scan-message ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                msgEl.textContent = '';
                msgEl.className = 'scan-message';
            }, 4000);
        }
    } catch (error) {
        console.log('Show message error:', error);
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
        console.log('Add to cart error:', error);
        showScanMessage('❌ Error adding to cart - Try again', 'error');
    }
}

function removeFromCart(index) {
    try {
        cart.splice(index, 1);
        saveCartToStorage();
        updateCartDisplay();
    } catch (error) {
        console.log('Remove from cart error:', error);
    }
}

function openCart() {
    try {
        const cartSidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('overlay');
        if (cartSidebar) cartSidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    } catch (error) {
        console.log('Open cart error:', error);
    }
}

function closeCart() {
    try {
        const cartSidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('overlay');
        if (cartSidebar) cartSidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    } catch (error) {
        console.log('Close cart error:', error);
    }
}

function updateCartDisplay() {
    try {
        const cartItemsEl = document.getElementById('cartItems');
        const cartCountEl = document.getElementById('cartCount');

        if (!cartItemsEl || !cartCountEl) return;

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
            try {
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
            } catch (err) {
                console.log('Cart item error:', err);
            }
        });

        cartCountEl.textContent = cart.length;
        updateCartSummary();
    } catch (error) {
        console.log('Update cart display error:', error);
    }
}

function updateCartSummary() {
    try {
        const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0);
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        const subtotalEl = document.getElementById('subtotal');
        const taxEl = document.getElementById('tax');
        const totalEl = document.getElementById('total');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    } catch (error) {
        console.log('Update cart summary error:', error);
    }
}

// ====== CHECKOUT FUNCTIONS ======
function openCheckout() {
    try {
        if (cart.length === 0) {
            showScanMessage('⚠️ Please add items to cart first', 'error');
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0);
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        const summaryEl = document.getElementById('checkoutSummary');
        if (summaryEl) {
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
        }

        closeCart();
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) checkoutModal.classList.add('active');
    } catch (error) {
        console.log('Open checkout error:', error);
        showScanMessage('❌ Error opening checkout - Try again', 'error');
    }
}

function closeCheckoutModal() {
    try {
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) checkoutModal.classList.remove('active');
    } catch (error) {
        console.log('Close checkout modal error:', error);
    }
}

function processCheckout(e) {
    try {
        e.preventDefault();

        // Validate form
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const cardNumber = document.getElementById('cardNumber').value;

        if (!fullName || !email || !cardNumber) {
            alert('❌ Please fill in all required fields');
            return;
        }

        // Generate order number
        const orderNumber = 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + item.product.price, 0);
        const tax = subtotal * 0.1;
        const total = subtotal + tax;

        // Show success modal
        const successMsg = document.getElementById('successMessage');
        if (successMsg) {
            successMsg.textContent = `✅ Your order #${orderNumber} has been placed successfully! You will receive a confirmation email at ${email}.`;
        }

        const orderDetailsEl = document.getElementById('orderDetails');
        if (orderDetailsEl) {
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
        }

        closeCheckoutModal();
        const successModal = document.getElementById('successModal');
        if (successModal) successModal.classList.add('active');

        // Reset form and cart
        try {
            document.getElementById('checkoutForm').reset();
        } catch (err) {
            console.log('Form reset error:', err);
        }
        
        cart = [];
        saveCartToStorage();
        updateCartDisplay();
    } catch (error) {
        console.log('Process checkout error:', error);
        alert('❌ Error processing checkout - Please try again');
    }
}

function closeSuccessModal() {
    try {
        const successModal = document.getElementById('successModal');
        if (successModal) successModal.classList.remove('active');
        loadProducts();
    } catch (error) {
        console.log('Close success modal error:', error);
    }
}

// ====== STORAGE FUNCTIONS ======
function saveCartToStorage() {
    try {
        localStorage.setItem('clockShopCart', JSON.stringify(cart));
    } catch (error) {
        console.log('Save cart error:', error);
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
        console.log('Load cart error (using empty cart):', error);
        cart = [];
    }
}
