// Default time zones to display
const DEFAULT_TIMEZONES = [
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Asia/Dubai',
    'America/Los_Angeles',
    'Europe/Paris'
];

let activeTimezones = [...DEFAULT_TIMEZONES];

// Initialize the clock
function init() {
    renderClocks();
    updateClocks();
    setInterval(updateClocks, 1000);
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addBtn').addEventListener('click', addTimezone);
    document.getElementById('resetBtn').addEventListener('click', resetToDefault);
    document.getElementById('timezoneInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTimezone();
    });
}

// Add a new timezone
function addTimezone() {
    const input = document.getElementById('timezoneInput');
    const timezone = input.value.trim();

    if (!timezone) {
        showError('Please enter a timezone');
        return;
    }

    // Validate timezone
    try {
        new Date().toLocaleString('en-US', { timeZone: timezone });
    } catch (e) {
        showError(`Invalid timezone: ${timezone}`);
        input.value = '';
        return;
    }

    if (activeTimezones.includes(timezone)) {
        showError(`${timezone} is already added`);
        input.value = '';
        return;
    }

    activeTimezones.push(timezone);
    input.value = '';
    renderClocks();
}

// Reset to default timezones
function resetToDefault() {
    activeTimezones = [...DEFAULT_TIMEZONES];
    document.getElementById('timezoneInput').value = '';
    renderClocks();
    clearError();
}

// Remove a timezone
function removeTimezone(timezone) {
    activeTimezones = activeTimezones.filter(tz => tz !== timezone);
    renderClocks();
}

// Render clock cards
function renderClocks() {
    const grid = document.getElementById('clocksGrid');
    grid.innerHTML = '';

    activeTimezones.forEach(timezone => {
        const clockDiv = document.createElement('div');
        clockDiv.className = 'clock';
        clockDiv.id = `clock-${timezone}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => removeTimezone(timezone);

        clockDiv.appendChild(removeBtn);

        const timezoneLabel = document.createElement('div');
        timezoneLabel.className = 'clock-timezone';
        timezoneLabel.textContent = timezone;

        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'clock-time';
        timeDisplay.id = `time-${timezone}`;

        const dateDisplay = document.createElement('div');
        dateDisplay.className = 'clock-date';
        dateDisplay.id = `date-${timezone}`;

        const ampmDisplay = document.createElement('div');
        ampmDisplay.className = 'clock-ampm';
        ampmDisplay.id = `ampm-${timezone}`;

        const offsetDisplay = document.createElement('div');
        offsetDisplay.className = 'clock-offset';
        offsetDisplay.id = `offset-${timezone}`;

        clockDiv.appendChild(timezoneLabel);
        clockDiv.appendChild(timeDisplay);
        clockDiv.appendChild(dateDisplay);
        clockDiv.appendChild(ampmDisplay);
        clockDiv.appendChild(offsetDisplay);

        grid.appendChild(clockDiv);
    });
}

// Update all clocks
function updateClocks() {
    const now = new Date();

    activeTimezones.forEach(timezone => {
        updateClock(timezone, now);
    });

    // Update local time info
    updateLocalTimeInfo(now);
}

// Update individual clock
function updateClock(timezone, now) {
    try {
        // Get time in specific timezone
        const timeStr = now.toLocaleString('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const dateStr = now.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const ampmStr = now.toLocaleString('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Calculate timezone offset
        const tzTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const offset = (now - tzTime) / (1000 * 60 * 60);
        const sign = offset >= 0 ? '+' : '';
        const offsetStr = `UTC ${sign}${Math.round(offset)}:00`;

        // Update DOM
        const timeEl = document.getElementById(`time-${timezone}`);
        const dateEl = document.getElementById(`date-${timezone}`);
        const ampmEl = document.getElementById(`ampm-${timezone}`);
        const offsetEl = document.getElementById(`offset-${timezone}`);

        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
        if (ampmEl) ampmEl.textContent = ampmStr.split(' ')[1]; // AM/PM only
        if (offsetEl) offsetEl.textContent = offsetStr;
    } catch (e) {
        console.error(`Error updating timezone ${timezone}:`, e);
    }
}

// Update local time info
function updateLocalTimeInfo(now) {
    const localTimeStr = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const info = document.getElementById('currentTime');
    info.textContent = `Your Local Time: ${localTimeStr}`;
}

// Show error message
function showError(message) {
    let errorEl = document.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        document.querySelector('.controls').appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 3000);
}

// Clear error message
function clearError() {
    const errorEl = document.querySelector('.error-message');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
