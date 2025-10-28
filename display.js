// FLL Timer Display Page
console.log('FLL Timer Display loaded');

// DOM elements
const displayTitle = document.querySelector('.display-title');
const textDisplay = document.getElementById('textDisplay');
const previewDisplay = document.getElementById('previewDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const timerTime = document.querySelector('.timer-time');
const displayMatchNumber = document.getElementById('displayMatchNumber');
const displayMatchTotal = document.getElementById('displayMatchTotal');
// We'll rebuild team cards dynamically to support 2 or 4 tables
let teamCardsContainer = null; // reference to timerDisplay for querying

// Default state
const TIMER_DURATION = 150; // Fixed 2:30 duration in seconds

const defaultDisplayState = {
    displayType: 'text', // 'text' | 'match-timer' | 'preview'
    display: 'Your event name here!',
    timerState: 'stopped',
    timerCurrentTime: TIMER_DURATION,
    matches: [],
    currentMatchNumber: 1
};

// Current state
let currentState = { ...defaultDisplayState };

// Load initial state from localStorage
function loadState() {
    try {
        const savedState = localStorage.getItem('fll-timer-state');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            currentState = { ...defaultDisplayState, ...parsedState };
            console.log('Display state loaded from localStorage');
        } else {
            console.log('No saved state found, using defaults');
        }
    } catch (error) {
        console.warn('Error loading state, using defaults:', error);
        currentState = { ...defaultDisplayState };
    }
    
    updateDisplay();
}

// Format time in MM:SS format with styled colon
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `<span class="colon">${minutes}:</span>${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update display based on current state
function updateDisplay() {
    // Show/hide display modes based on type
    const type = currentState.displayType;
    // Hide all first
    textDisplay.style.display = 'none';
    timerDisplay.style.display = 'none';
    if (previewDisplay) previewDisplay.style.display = 'none';

    switch (type) {
        case 'text':
            textDisplay.style.display = 'flex';
            if (currentState.display) {
                displayTitle.textContent = currentState.display;
            }
            console.log('Text display updated:', currentState.display);
            break;
        case 'match-timer':
            timerDisplay.style.display = 'grid';
            updateTimerDisplay();
            console.log('Timer display updated');
            break;
        case 'preview':
            if (previewDisplay) {
                previewDisplay.style.display = 'grid';
                updatePreviewDisplay();
                console.log('Preview display shown');
            }
            break;
        default:
            textDisplay.style.display = 'flex';
            break;
    }
}

// Build / update the Preview display (static layout without timer)
function updatePreviewDisplay() {
    if (!previewDisplay) return;
    const tableCount = currentState.tableCount || 4;
    const currentMatchNumber = currentState.currentMatchNumber || 1;
    const matches = currentState.matches || [];
    const currentMatch = matches.find(m => m.matchNumber === currentMatchNumber);

    // Keep brandBar in place; rebuild only team-card elements
    const previewBar = previewDisplay.querySelector('.preview-bar');
    const brandBar = previewDisplay.querySelector('#brandBar');
    // Remove existing team cards
    previewDisplay.querySelectorAll('.team-card').forEach(card => card.remove());

    const tables = tableCount === 2
        ? [ 'Table 1A', 'Table 1B' ]
        : [ 'Table 1A', 'Table 1B', 'Table 2A', 'Table 2B' ];

    tables.forEach((tableName, index) => {
        const card = document.createElement('div');
        card.className = 'team-card';
        const teamVal = currentMatch?.teams?.[index] || (index < (currentMatch?.teams?.length || 0) ? '' : '');
        const displayNumber = teamVal ? `Team ${teamVal}` : `Team ${index + 1}`;
        card.innerHTML = `\n            <div class="team display-small">${displayNumber}</div>\n            <div class="table heading-large">${tableName}</div>`;
        // Insert before brand bar if it exists, else append
        // Insert before preview bar if present so preview bar stays after the team cards
        if (previewBar) {
            previewDisplay.insertBefore(card, previewBar);
        } else if (brandBar) {
            previewDisplay.insertBefore(card, brandBar);
        } else {
            previewDisplay.appendChild(card); // fallback
        }
    });
}

// Update timer display specifically
function updateTimerDisplay() {
    // Preserve 0 when match has finished; only fall back when value is null/undefined
    const time = (currentState.timerCurrentTime ?? TIMER_DURATION);
    timerTime.innerHTML = formatTime(time);
    
    // Remove all state classes
    timerTime.classList.remove('running', 'warning', 'critical');
    
    // Update match and team information
    updateMatchDisplay();
    
    // Update status and styling based on timer state
    // Visual emphasis only handled by timerTime classes; status text removed.
    if (currentState.timerState === 'running') {
        timerTime.classList.add('running');
        if (time <= 10) {
            timerTime.classList.add('critical');
        } else if (time <= 30) {
            timerTime.classList.add('warning');
        }
    } else if (currentState.timerState === 'finished') {
        timerTime.classList.add('critical');
    }
}

// Update match display with current match data
function ensureTeamCards() {
    if (!timerDisplay) return;
    const tableCount = currentState.tableCount || 4;
    // Remove existing team-card elements
    const existing = timerDisplay.querySelectorAll('.team-card');
    existing.forEach(el => el.remove());

    // Insert before timer-container
    const timerContainer = timerDisplay.querySelector('.timer-container');
    if (!timerContainer) return;

    const tables = tableCount === 2
        ? [ ['Table 1A', 'team-color-a'], ['Table 1B', 'team-color-b'] ]
        : [ ['Table 1A','team-color-a'], ['Table 1B','team-color-b'], ['Table 2A','team-color-c'], ['Table 2B','team-color-d'] ];
    tables.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.dataset.slot = i; // 0..3
        card.innerHTML = `\n            <div class="team display-small">Team ${i+1}</div>\n            <div class="table heading-large">${t[0]}</div>`;
        timerDisplay.insertBefore(card, timerContainer);
    });

    // Adjust grid template
    if (tableCount === 2) {
        timerDisplay.style.gridTemplate = `"team1 team2" auto "timer timer" 1fr "brand-bar brand-bar" auto / 1fr 1fr`;
    } else {
        timerDisplay.style.gridTemplate = `"team1 team2 team3 team4" auto "timer timer timer timer" 1fr "brand-bar brand-bar brand-bar brand-bar" auto / 1fr 1fr 1fr 1fr`;
    }
}

function updateMatchDisplay() {
    const currentMatchNumber = currentState.currentMatchNumber || 1;
    const matches = currentState.matches || [];
    if (displayMatchNumber) displayMatchNumber.textContent = currentMatchNumber;
    if (displayMatchTotal) displayMatchTotal.textContent = matches.length || '--';

    ensureTeamCards();
    const currentMatch = matches.find(m => m.matchNumber === currentMatchNumber);
    const tableCount = currentState.tableCount || 4;
    const cards = timerDisplay.querySelectorAll('.team-card');
    cards.forEach(card => {
        const slot = parseInt(card.dataset.slot, 10);
        if (tableCount === 2 && slot > 1) { card.style.display = 'none'; return; }
        card.style.display = '';
        const numEl = card.querySelector('.team');
        if (currentMatch && currentMatch.teams) {
            const val = currentMatch.teams[slot];
            numEl.textContent = val || `Team ${slot + 1}`;
        } else {
            numEl.textContent = `Team ${slot + 1}`;
        }
    });
}

// Listen for state changes from control page (cross-tab communication)
window.addEventListener('storage', (event) => {
    if (event.key === 'fll-timer-state') {
        if (event.newValue) {
            try {
                currentState = JSON.parse(event.newValue);
                updateDisplay();
                if (currentState.displayType === 'preview') updatePreviewDisplay();
                console.log('State updated from control page');
            } catch (error) {
                console.error('Error parsing updated state:', error);
            }
        } else {
            // State was cleared/reset
            currentState = { ...defaultDisplayState };
            updateDisplay();
            if (currentState.displayType === 'preview') updatePreviewDisplay();
            console.log('State was reset');
        }
    }
});

// Handle page visibility changes to reload state when coming back to tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadState();
        console.log('Page became visible, reloaded state');
    }
});

// Initialize display
loadState();
console.log('Display page initialized with persistent state');

// Prevent right-click context menu and add fullscreen toggle
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.log('Exit fullscreen failed:', err);
            });
        }
    }
});

// Show connection status for debugging
console.log('Display ready for real-time updates from control page');
