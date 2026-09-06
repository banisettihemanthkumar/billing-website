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

// Customer Order Data
let currentOrder = {
    orderId: 'ORD-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    product: 'CLOCK_PREMIUM_001',
    date: new Date().toLocaleDateString(),
    amount: 49.99,
    customerName: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, City, State 12345',
    licenseKey: 'CLK-' + Math.random().toString(36).substr(2, 12).toUpperCase()
};

let cart = [];
let scanning = false;
let stream = null;
let scanHistory = [];
let defaultTimezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney', 'Asia/Dubai'];
let activeTimezones = [...defaultTimezones];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadCartFromStorage();
});

// Initialize Dashboard
function initializeDashboard() {
    // Load customer order info
    document.getElementById('purchaseDate').textContent = currentOrder.date;
    document.getElementById('amountPaid').textContent = '$' + currentOrder.amount.toFixed(2);
    document.getElementById('productName').textContent = PRODUCTS[currentOrder.product].name;
    document.getElementById('orderId').textContent = currentOrder.orderId;
    document.getElementById('orderProductName').textContent = PRODUCTS[currentOrder.product].name;
    document.getElementById('orderDate').textContent = 'Date: ' + currentOrder.date;
    document.getElementById('orderIDDisplay').textContent = currentOrder.orderId;
    document.getElementById('orderAmount').textContent = '$' + currentOrder.amount.toFixed(2);
    document.getElementById('deliveryAddress').textContent = currentOrder.address;
    document.getElementById('licenseKey').textContent = currentOrder.licenseKey;
    document.getElementById('userName').textContent = 'Welcome, ' + currentOrder.customerName;

    // Load email
    document.getElementById('email').value = currentOrder.email;
    document.getElementById('fullName').value = currentOrder.customerName;
    document.getElementById('phone').value = currentOrder.phone;

    // Load clocks
    renderClocks();
    updateAllClocks();
    setInterval(updateAllClocks, 1000);
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    window.switchTab = switchTab;
    
    // Scanner
    document.getElementById('startScanBtn').addEventListener('click', startScanning);
    document.getElementById('stopScanBtn').addEventListener('click', stopScanning);
    document.getElementById('uploadQRBtn').addEventListener('click', () => {
        document.getElementById('qrFileInput').click();
    });
    document.getElementById('qrFileInput').addEventListener('change', handleFileUpload);

    // Clock management
    document.getElementById('addTzBtn').addEventListener('click', addTimezone);
    document.getElementById('resetTzBtn').addEventListener('click', resetTimezones);
    document.getElementById('timezoneInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTimezone();
    });

    // Settings
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Tab Switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Activate corresponding button
    event.target.classList.add('active');

    // Refresh scanner if tab is scanner
    if (tabName === 'scanner') {
        showScanMessage('Ready to scan', 'info');
    }
}

// SCANNER FUNCTIONS
async function startScanning() {
    try {
        // Request camera access
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
        document.getElementById('scannerStatus').textContent = '🎥 Camera Active - Scanning...';
        showScanMessage('📷 Camera active! Point at QR code', 'info');

        // Start detection
        detectQRCodes();
    } catch (err) {
        console.error('Camera Error:', err);
        if (err.name === 'NotAllowedError') {
            showScanMessage('❌ Camera access denied. Please allow camera permissions.', 'error');
        } else if (err.name === 'NotFoundError') {
            showScanMessage('❌ No camera found. Use upload instead.', 'error');
        } else {
            showScanMessage('❌ ' + err.message, 'error');
        }
        document.getElementById('scannerStatus').textContent = '❌ Camera failed - Use upload';
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
    document.getElementById('scannerStatus').textContent = 'Ready to scan';
    showScanMessage('Scanner stopped', 'info');
}

async function detectQRCodes() {
    if (!scanning) return;

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            // Get image data and scan for QR
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Check if jsQR is available
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, canvas.width, canvas.height, {
                    inversionAttempts: 'dontInvert'
                });

                if (code) {
                    processScannedCode(code.data);
                    return; // Stop loop after finding code
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
                    showScanMessage('⚠️ QR Library not loaded. Use demo codes instead.', 'error');
                }
            } catch (err) {
                console.error('Image processing error:', err);
                showScanMessage('❌ Error processing image: ' + err.message, 'error');
            }
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
    event.target.value = '';
}

function processScannedCode(data) {
    const productId = data.trim();
    
    if (PRODUCTS[productId]) {
        addToCart(productId);
        addScanHistory(productId);
        showScanMessage(`✅ Added: ${PRODUCTS[productId].name}`, 'success');
        
        // Auto stop after successful scan
        setTimeout(() => {
            if (scanning) stopScanning();
        }, 1000);
    } else {
        showScanMessage(`⚠️ Unknown product: ${productId}`, 'error');
    }
}

function addScanHistory(productId) {
    const item = {
        product: PRODUCTS[productId].name,
        time: new Date().toLocaleTimeString(),
        sku: productId
    };
    
    scanHistory.unshift(item);
    if (scanHistory.length > 5) scanHistory.pop();
    
    updateScanHistory();
}

function updateScanHistory() {
    const list = document.getElementById('scanHistoryList');
    if (scanHistory.length === 0) {
        list.innerHTML = '<p class="empty-message">No scans yet. Start scanning!</p>';
        return;
    }
    
    list.innerHTML = scanHistory.map((item, i) => `
        <div class="history-item">
            <strong>${item.product}</strong>
            <br><small>${item.time} • ${item.sku}</small>
        </div>
    `).join('');
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

// Demo scanning
function scanProduct(productId) {
    if (PRODUCTS[productId]) {
        addToCart(productId);
        addScanHistory(productId);
        showScanMessage(`✅ Added: ${PRODUCTS[productId].name}`, 'success');
    }
}

// CART FUNCTIONS
function addToCart(productId) {
    if (!PRODUCTS[productId]) return;

    cart.push({
        id: productId,
        product: PRODUCTS[productId],
        quantity: 1
    });

    saveCartToStorage();
    updateCartDisplay();
}

function updateCartDisplay() {
    // Update cart count in all places
    const count = cart.length;
}

function saveCartToStorage() {
    localStorage.setItem('clockShopCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('clockShopCart');
    if (saved) {
        cart = JSON.parse(saved);
    }
}

// CLOCK FUNCTIONS
function renderClocks() {
    const grid = document.getElementById('clocksGrid');
    grid.innerHTML = '';

    activeTimezones.forEach(tz => {
        const clockDiv = document.createElement('div');
        clockDiv.className = 'clock';
        clockDiv.id = `clock-${tz}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'clock-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeTimezone(tz);

        clockDiv.appendChild(removeBtn);

        const tzLabel = document.createElement('div');
        tzLabel.className = 'clock-timezone';
        tzLabel.textContent = tz;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'clock-time';
        timeDiv.id = `time-${tz}`;

        const dateDiv = document.createElement('div');
        dateDiv.className = 'clock-date';
        dateDiv.id = `date-${tz}`;

        clockDiv.appendChild(tzLabel);
        clockDiv.appendChild(timeDiv);
        clockDiv.appendChild(dateDiv);
        grid.appendChild(clockDiv);
    });
}

function updateAllClocks() {
    const now = new Date();

    activeTimezones.forEach(tz => {
        try {
            const timeStr = now.toLocaleString('en-US', {
                timeZone: tz,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const dateStr = now.toLocaleString('en-US', {
                timeZone: tz,
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const timeEl = document.getElementById(`time-${tz}`);
            const dateEl = document.getElementById(`date-${tz}`);

            if (timeEl) timeEl.textContent = timeStr;
            if (dateEl) dateEl.textContent = dateStr;
        } catch (e) {
            console.error('Clock update error:', e);
        }
    });
}

function addTimezone() {
    const input = document.getElementById('timezoneInput');
    const tz = input.value.trim();

    if (!tz) {
        showClockMessage('Please enter a timezone', 'error');
        return;
    }

    try {
        new Date().toLocaleString('en-US', { timeZone: tz });
    } catch (e) {
        showClockMessage(`Invalid timezone: ${tz}`, 'error');
        input.value = '';
        return;
    }

    if (activeTimezones.includes(tz)) {
        showClockMessage(`${tz} is already added`, 'error');
        input.value = '';
        return;
    }

    activeTimezones.push(tz);
    input.value = '';
    renderClocks();
    showClockMessage(`✅ Added ${tz}`, 'success');
}

function removeTimezone(tz) {
    activeTimezones = activeTimezones.filter(t => t !== tz);
    renderClocks();
}

function resetTimezones() {
    activeTimezones = [...defaultTimezones];
    renderClocks();
    showClockMessage('✅ Reset to default timezones', 'success');
}

function showClockMessage(msg, type) {
    const msgEl = document.getElementById('clockMessage');
    msgEl.textContent = msg;
    msgEl.className = `clock-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            msgEl.textContent = '';
            msgEl.className = '';
        }, 3000);
    }
}

// SETTINGS & UTILITIES
function saveSettings() {
    alert('✅ Settings saved successfully!');
}

function resetSettings() {
    document.getElementById('fullName').value = currentOrder.customerName;
    document.getElementById('email').value = currentOrder.email;
    document.getElementById('phone').value = currentOrder.phone;
}

function changePassword() {
    alert('Password change feature coming soon!');
}

function enable2FA() {
    alert('2FA setup coming soon!');
}

function downloadReceipt() {
    alert('Receipt download feature coming soon!');
}

function contactSupport() {
    alert('Email sent to support team. We will respond within 24 hours!');
}

function copyToClipboard() {
    const key = document.getElementById('licenseKey').textContent;
    navigator.clipboard.writeText(key).then(() => {
        alert('✅ License key copied to clipboard!');
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        alert('Logged out successfully!');
        // In real app, redirect to login
    }
}
