// FLL Timer Control Page
console.log('FLL Timer Control loaded');

// DOM elements
const openDisplayBtn = document.getElementById('openDisplayBtn');
const displayTextInput = document.getElementById('displayText');
const resetConfigBtn = document.getElementById('resetConfigBtn');
const displayTypeToggle = document.getElementById('displayTypeToggle');
const startMatchBtn = document.getElementById('startMatchBtn');
const prevMatchBtn = document.getElementById('prevMatchBtn');
const nextMatchBtn = document.getElementById('nextMatchBtn');
const textDisplayConfig = document.getElementById('textDisplayConfig');
const matchTimerConfig = document.getElementById('matchTimerConfig');
const addMatchBtn = document.getElementById('addMatchBtn');
const matchScheduleTable = document.getElementById('matchScheduleTable');
const matchScheduleBody = document.getElementById('matchScheduleBody');
const prevMatchSub = document.getElementById('prevMatchSub');
const startMatchSub = document.getElementById('startMatchSub');
const nextMatchSub = document.getElementById('nextMatchSub');
const noMatchesMessage = document.getElementById('noMatchesMessage');
const matchCount = document.querySelector('.match-count');

// State management
const TIMER_DURATION = 150; // Fixed 2:30 duration in seconds

const defaultState = {
    displayType: 'text',
    display: 'Display',
    // Event configuration
    eventName: '',
    // Match schedule
    matches: [], // Array of match objects: { matchNumber: 1, teams: [1234, 5678, 9012, 3456] }
    currentMatchNumber: 1, // Currently displayed/active match
    // Timer settings
    timerState: 'stopped', // stopped, running, paused
    timerStartTime: null,
    timerEndTime: null,
    timerCurrentTime: TIMER_DURATION,
    // More state properties will be added as we build features
};

let timerState = { ...defaultState };
let timerInterval = null; // For the countdown timer
let displayWindow = null; // Track the display window

// Load existing state from localStorage or initialize with defaults
function loadState() {
    const savedState = localStorage.getItem('fll-timer-state');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            timerState = { ...defaultState, ...parsedState };
            console.log('Loaded existing configuration');
        } catch (error) {
            console.warn('Error loading saved state, using defaults:', error);
            timerState = { ...defaultState };
        }
    } else {
        console.log('No existing configuration found, using defaults');
        timerState = { ...defaultState };
    }
    
    // Save the state to ensure it's properly stored
    saveState();
}

// Save state to localStorage
function saveState() {
    try {
        localStorage.setItem('fll-timer-state', JSON.stringify(timerState));
        console.log('Configuration saved');
    } catch (error) {
        console.error('Error saving configuration:', error);
        alert('Unable to save configuration. Please check your browser settings.');
    }
}

// Reset all configuration to defaults
function resetConfiguration() {
    const confirmReset = confirm('Are you sure you want to reset all configuration? This will clear all your event settings and cannot be undone.');
    
    if (confirmReset) {
        // Stop any running timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        timerState = { ...defaultState };
        saveState();
        updateState(timerState);
        
        // Update UI to reflect reset
        displayTextInput.value = timerState.display;
        // Set display type toggle
        setDisplayTypeToggle(timerState.displayType);
        
        // Update UI based on display type
        updateDisplayTypeUI();
        
        // Reset match schedule display
        renderMatchSchedule();
        
        console.log('Configuration reset to defaults');
        alert('Configuration has been reset.');
    }
}

// Update state and notify display
function updateState(newState) {
    Object.assign(timerState, newState);
    saveState();
    
    // Trigger storage event for display page
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'fll-timer-state',
        newValue: JSON.stringify(timerState)
    }));
}

// Initialize UI with loaded state
function initializeUI() {
    displayTextInput.value = timerState.display;
    // Set display type toggle
    setDisplayTypeToggle(timerState.displayType);
    
    // Update UI based on display type
    updateDisplayTypeUI();
    
    // Initialize match schedule display
    renderMatchSchedule();
    
    // Initialize display button state
    updateOpenDisplayButton();
    
    console.log('UI initialized with saved configuration');
}

// Update UI based on selected display type
function updateDisplayTypeUI() {
    const displayType = getSelectedDisplayType();
    
    if (displayType === 'text') {
        textDisplayConfig.style.display = 'block';
        matchTimerConfig.style.display = 'none';
    } else if (displayType === 'match-timer') {
        textDisplayConfig.style.display = 'none';
        matchTimerConfig.style.display = 'block';
    }
    
    // Update match control buttons
    updateMatchControlButtons();
}

// Helper functions for display type toggle
function getSelectedDisplayType() {
    const activeBtn = displayTypeToggle.querySelector('.toggle-btn.active');
    return activeBtn ? activeBtn.dataset.value : 'text';
}

function setDisplayTypeToggle(displayType) {
    const buttons = displayTypeToggle.querySelectorAll('.toggle-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === displayType);
    });
}

// Open display page in new window/tab or close existing display
function openDisplay() {
    if (displayWindow && !displayWindow.closed) {
        // Display is open, close it
        displayWindow.close();
        displayWindow = null;
        updateOpenDisplayButton();
        console.log('Display window closed');
    } else {
        // Open new display window
        displayWindow = window.open('display.html', 'fll-display', 'width=1920,height=1080');
        
        if (displayWindow) {
            console.log('Display window opened');
            updateOpenDisplayButton();
            
            // Check if window is closed by user to update button
            const checkClosed = setInterval(() => {
                if (displayWindow && displayWindow.closed) {
                    displayWindow = null;
                    updateOpenDisplayButton();
                    clearInterval(checkClosed);
                    console.log('Display window was closed by user');
                }
            }, 1000);
        } else {
            alert('Please allow popups for this site to open the display window.');
        }
    }
}

// Update Open Display button based on display window state
function updateOpenDisplayButton() {
    if (displayWindow && !displayWindow.closed) {
        openDisplayBtn.textContent = 'Close Display';
        openDisplayBtn.className = 'secondary';
    } else {
        openDisplayBtn.textContent = 'Open Display';
        openDisplayBtn.className = 'primary';
        displayWindow = null; // Clear reference if window is closed
    }
}

// Update match control buttons based on state
function updateMatchControlButtons() {
    const hasMatches = timerState.matches.length > 0;
    const isMatchTimer = timerState.displayType === 'match-timer';
    const currentMatch = timerState.currentMatchNumber;
    const isRunning = timerState.timerState === 'running';
    const isFinished = timerState.timerState === 'finished';
    
    // Update match numbers in subtext
    if (hasMatches) {
        const prevMatch = currentMatch - 1;
        const nextMatch = currentMatch + 1;
        
        prevMatchSub.textContent = prevMatch >= 1 ? `Match ${prevMatch}` : '--';
        startMatchSub.textContent = `Match ${currentMatch}`;
        nextMatchSub.textContent = nextMatch <= timerState.matches.length ? `Match ${nextMatch}` : '--';
    } else {
        prevMatchSub.textContent = 'Match --';
        startMatchSub.textContent = 'Match --';
        nextMatchSub.textContent = 'Match --';
    }
    
    // Enable/disable match navigation based on available matches and timer state
    // Disable navigation while match is running
    prevMatchBtn.disabled = !hasMatches || currentMatch <= 1 || isRunning;
    nextMatchBtn.disabled = !hasMatches || currentMatch >= timerState.matches.length || isRunning;
    
    // Start/Abort button logic
    if (!isMatchTimer || !hasMatches) {
        startMatchBtn.disabled = true;
        startMatchBtn.querySelector('.button-main').textContent = 'Start Match';
        startMatchBtn.className = 'primary';
    } else if (isRunning) {
        startMatchBtn.disabled = false;
        startMatchBtn.querySelector('.button-main').textContent = 'Abort Match';
        startMatchBtn.className = 'danger';
    } else if (isFinished) {
        startMatchBtn.disabled = false;
        startMatchBtn.querySelector('.button-main').textContent = 'Reset Timer';
        startMatchBtn.className = 'secondary';
    } else {
        startMatchBtn.disabled = false;
        startMatchBtn.querySelector('.button-main').textContent = 'Start Match';
        startMatchBtn.className = 'primary';
    }
}

// Navigate to previous match
function previousMatch() {
    if (timerState.currentMatchNumber > 1) {
        updateState({ currentMatchNumber: timerState.currentMatchNumber - 1 });
        updateMatchControlButtons();
        renderMatchSchedule();
        console.log('Moved to previous match:', timerState.currentMatchNumber);
    }
}

// Navigate to next match
function nextMatch() {
    if (timerState.currentMatchNumber < timerState.matches.length) {
        updateState({ currentMatchNumber: timerState.currentMatchNumber + 1 });
        updateMatchControlButtons();
        renderMatchSchedule();
        console.log('Moved to next match:', timerState.currentMatchNumber);
    }
}

// Update display text automatically when input changes
function updateDisplayText() {
    const newText = displayTextInput.value.trim() || 'Display';
    updateState({ display: newText });
    console.log('Display text updated to:', newText);
}

// Timer Functions - Updated for new button behavior
function startMatch() {
    if (timerState.timerState === 'running') {
        // Abort match
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        const updates = {
            timerState: 'stopped',
            timerCurrentTime: TIMER_DURATION,
            timerStartTime: null,
            timerEndTime: null
        };
        
        updateState(updates);
        updateMatchControlButtons();
        console.log('Match aborted');
    } else if (timerState.timerState === 'finished') {
        // Reset timer
        const updates = {
            timerState: 'stopped',
            timerCurrentTime: TIMER_DURATION,
            timerStartTime: null,
            timerEndTime: null
        };
        
        updateState(updates);
        updateMatchControlButtons();
        console.log('Timer reset');
    } else {
        // Start match
        const now = Date.now();
        const updates = {
            timerState: 'running',
            timerStartTime: now,
            timerEndTime: now + (timerState.timerCurrentTime * 1000)
        };
        
        updateState(updates);
        startTimerCountdown();
        updateMatchControlButtons();
        console.log('Match started');
    }
}

function startTimerCountdown() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerState.timerEndTime - now) / 1000));
        
        if (remaining !== timerState.timerCurrentTime) {
            updateState({ timerCurrentTime: remaining });
        }
        
        if (remaining <= 0) {
            stopTimerCountdown();
            updateState({ timerState: 'finished' });
            updateMatchControlButtons();
            console.log('Match finished');
        }
    }, 100); // Update every 100ms for smooth countdown
}

function stopTimerCountdown() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Match Schedule Functions
function addMatch() {
    const matchNumber = timerState.matches.length + 1;
    const newMatch = {
        matchNumber: matchNumber,
        teams: ['', '', '', ''] // Empty team slots
    };
    
    const updatedMatches = [...timerState.matches, newMatch];
    const updates = { matches: updatedMatches };
    
    // If this is the first match, set it as current
    if (timerState.matches.length === 0) {
        updates.currentMatchNumber = 1;
    }
    
    updateState(updates);
    renderMatchSchedule();
    console.log('Match added:', newMatch);
}

function removeMatch(matchNumber) {
    const updatedMatches = timerState.matches
        .filter(match => match.matchNumber !== matchNumber)
        .map((match, index) => ({
            ...match,
            matchNumber: index + 1 // Renumber matches
        }));
    
    // Handle current match selection when removing matches
    let newCurrentMatch = timerState.currentMatchNumber;
    if (matchNumber === timerState.currentMatchNumber) {
        // If removing current match, select the first available match or 1
        newCurrentMatch = updatedMatches.length > 0 ? 1 : 1;
    } else if (matchNumber < timerState.currentMatchNumber) {
        // If removing a match before current, adjust current match number
        newCurrentMatch = timerState.currentMatchNumber - 1;
    }
    
    updateState({ 
        matches: updatedMatches,
        currentMatchNumber: newCurrentMatch
    });
    renderMatchSchedule();
    console.log('Match removed:', matchNumber);
}

function updateMatchTeam(matchNumber, teamIndex, teamValue) {
    const updatedMatches = timerState.matches.map(match => {
        if (match.matchNumber === matchNumber) {
            const updatedTeams = [...match.teams];
            updatedTeams[teamIndex] = teamValue;
            return { ...match, teams: updatedTeams };
        }
        return match;
    });
    
    updateState({ matches: updatedMatches });
    console.log('Team updated:', { matchNumber, teamIndex, teamValue });
}

function renderMatchSchedule() {
    const tbody = matchScheduleBody;
    const noMatches = noMatchesMessage;
    const table = matchScheduleTable;
    
    // Update match count
    const count = timerState.matches.length;
    matchCount.textContent = `${count} match${count !== 1 ? 'es' : ''} scheduled`;
    
    // Update match control buttons
    updateMatchControlButtons();
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (timerState.matches.length === 0) {
        table.style.display = 'none';
        noMatches.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    noMatches.style.display = 'none';
    
    // Create rows for each match
    timerState.matches.forEach(match => {
        const row = document.createElement('tr');
        
        // Add highlighting for current match
        if (match.matchNumber === timerState.currentMatchNumber) {
            row.classList.add('current-match-row');
        }
        
        // Match number column
        const matchNumberCell = document.createElement('td');
        matchNumberCell.innerHTML = `<span class="match-number">${match.matchNumber}</span>`;
        row.appendChild(matchNumberCell);
        
        // Team columns
        match.teams.forEach((team, teamIndex) => {
            const teamCell = document.createElement('td');
            const teamInput = document.createElement('input');
            teamInput.type = 'text';
            teamInput.className = 'team-input';
            teamInput.value = team;
            teamInput.placeholder = `Team ${teamIndex + 1}`;
            teamInput.addEventListener('input', (e) => {
                updateMatchTeam(match.matchNumber, teamIndex, e.target.value);
            });
            teamCell.appendChild(teamInput);
            row.appendChild(teamCell);
        });
        
        // Actions column
        const actionsCell = document.createElement('td');
        const removeBtn = document.createElement('button');
        removeBtn.className = 'danger';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to remove Match ${match.matchNumber}?`)) {
                removeMatch(match.matchNumber);
            }
        });
        actionsCell.appendChild(removeBtn);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
    });
}

// Event listeners
openDisplayBtn.addEventListener('click', openDisplay);
resetConfigBtn.addEventListener('click', resetConfiguration);
startMatchBtn.addEventListener('click', startMatch);
prevMatchBtn.addEventListener('click', previousMatch);
nextMatchBtn.addEventListener('click', nextMatch);
addMatchBtn.addEventListener('click', addMatch);

// Track changes on input fields and update automatically
displayTextInput.addEventListener('input', updateDisplayText);

// Handle display type toggle buttons
displayTypeToggle.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-btn')) {
        const currentDisplayType = e.target.dataset.value;
        
        // Update button states
        setDisplayTypeToggle(currentDisplayType);
        
        updateState({ 
            displayType: currentDisplayType,
            // Reset timer when switching to timer display
            ...(currentDisplayType === 'match-timer' && {
                timerCurrentTime: TIMER_DURATION,
                timerState: 'stopped'
            })
        });
        updateDisplayTypeUI();
    }
});

// Initialize when page loads
loadState();
initializeUI();
console.log('Control page initialized with persistent configuration');
