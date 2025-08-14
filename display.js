// FLL Timer Display Page
console.log('FLL Timer Display loaded');

// DOM elements
const displayTitle = document.querySelector('.display-title');
const textDisplay = document.getElementById('textDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const timerTime = document.querySelector('.timer-time');
const timerStatus = document.querySelector('.timer-status');
const matchNumberElement = document.querySelector('.match-number');
const teamNumbers = document.querySelectorAll('.team-number');

// Default state
const TIMER_DURATION = 150; // Fixed 2:30 duration in seconds

const defaultDisplayState = {
    displayType: 'text',
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
    if (currentState.displayType === 'text') {
        textDisplay.style.display = 'flex';
        timerDisplay.style.display = 'none';
        
        if (currentState.display) {
            displayTitle.textContent = currentState.display;
        }
        
        console.log('Text display updated:', currentState.display);
    } else if (currentState.displayType === 'match-timer') {
        textDisplay.style.display = 'none';
        timerDisplay.style.display = 'grid';
        
        updateTimerDisplay();
        
        console.log('Timer display updated');
    }
}

// Update timer display specifically
function updateTimerDisplay() {
    const time = currentState.timerCurrentTime || TIMER_DURATION;
    timerTime.innerHTML = formatTime(time);
    
    // Remove all state classes
    timerTime.classList.remove('running', 'warning', 'critical');
    
    // Update match and team information
    updateMatchDisplay();
    
    // Update status and styling based on timer state
    switch (currentState.timerState) {
        case 'stopped':
            timerStatus.textContent = 'Ready! 👍';
            break;
        case 'running':
            timerStatus.textContent = 'Running 🏃';
            timerTime.classList.add('running');
            
            // Add warning/critical styling based on remaining time
            if (time <= 10) {
                timerTime.classList.add('critical');
            } else if (time <= 30) {
                timerTime.classList.add('warning');
            }
            break;
        case 'finished':
            timerStatus.textContent = 'Match Over! 🛑';
            timerTime.classList.add('critical');
            break;
        default:
            timerStatus.textContent = 'Ready! 👍';
    }
}

// Update match display with current match data
function updateMatchDisplay() {
    const currentMatchNumber = currentState.currentMatchNumber || 1;
    const matches = currentState.matches || [];
    
    // Update match number
    matchNumberElement.textContent = currentMatchNumber;
    
    // Find the current match
    const currentMatch = matches.find(match => match.matchNumber === currentMatchNumber);
    
    if (currentMatch && currentMatch.teams) {
        // Update team numbers from match data
        teamNumbers.forEach((teamElement, index) => {
            const teamNumber = currentMatch.teams[index];
            teamElement.textContent = teamNumber || `Team ${index + 1}`;
        });
    } else {
        // No match data, show default team placeholders
        teamNumbers.forEach((teamElement, index) => {
            teamElement.textContent = `Team ${index + 1}`;
        });
    }
}

// Listen for state changes from control page (cross-tab communication)
window.addEventListener('storage', (event) => {
    if (event.key === 'fll-timer-state') {
        if (event.newValue) {
            try {
                currentState = JSON.parse(event.newValue);
                updateDisplay();
                console.log('State updated from control page');
            } catch (error) {
                console.error('Error parsing updated state:', error);
            }
        } else {
            // State was cleared/reset
            currentState = { ...defaultDisplayState };
            updateDisplay();
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
