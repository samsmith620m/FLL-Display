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
const deleteAllMatchesBtn = document.getElementById('deleteAllMatchesBtn');
const matchScheduleTable = document.getElementById('matchScheduleTable');
const matchScheduleBody = document.getElementById('matchScheduleBody');
const prevMatchSub = document.getElementById('prevMatchSub');
const startMatchSub = document.getElementById('startMatchSub');
const nextMatchSub = document.getElementById('nextMatchSub');
const noMatchesMessage = document.getElementById('noMatchesMessage');
const matchCount = document.querySelector('.match-count');
const quickModeToggle = document.getElementById('quickModeToggle');
const deleteMatchModal = document.getElementById('deleteMatchModal');
const deleteMatchPreviewBody = document.getElementById('deleteMatchPreviewBody');
const deleteMatchCloseBtn = document.getElementById('deleteMatchCloseBtn');
const keepMatchBtn = document.getElementById('keepMatchBtn');
const confirmDeleteMatchBtn = document.getElementById('confirmDeleteMatchBtn');
const deleteAllMatchesModal = document.getElementById('deleteAllMatchesModal');
const deleteAllMatchesPreviewBody = document.getElementById('deleteAllMatchesPreviewBody');
const deleteAllCloseBtn = document.getElementById('deleteAllCloseBtn');
const keepAllMatchesBtn = document.getElementById('keepAllMatchesBtn');
const confirmDeleteAllMatchesBtn = document.getElementById('confirmDeleteAllMatchesBtn');

// State management
const BASE_TIMER_DURATION = 150; // 2:30 official
function getDurationOverride(base) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('quick')) return 15;
    if (params.has('duration')) {
        const v = parseInt(params.get('duration'), 10);
        if (!isNaN(v) && v > 0 && v <= 3600) return v;
    }
    return base;
}
const TIMER_DURATION = getDurationOverride(BASE_TIMER_DURATION);

const defaultState = {
    displayType: 'match-timer',
    display: 'Your event name here!',
    timerState: 'stopped',
    timerCurrentTime: TIMER_DURATION,
    timerDuration: TIMER_DURATION, // persisted dynamic duration
    matches: [],
    currentMatchNumber: 1,
    selectedTeams: []
};

let timerState = { ...defaultState };
let timerInterval = null; // For the countdown timer
let displayWindow = null; // Track the display window
let pendingDeleteMatchNumber = null;
let lastFocusedElementBeforeModal = null;

// Load existing state from localStorage or initialize with defaults
function loadState() {
    try {
        const saved = localStorage.getItem('fll-timer-state');
        if (saved) {
            Object.assign(timerState, JSON.parse(saved));
            if (timerState.timerCurrentTime > (timerState.timerDuration || TIMER_DURATION)) {
                timerState.timerCurrentTime = timerState.timerDuration || TIMER_DURATION;
            }
            if (!timerState.timerDuration) {
                timerState.timerDuration = TIMER_DURATION;
            }
        }
    } catch (e) {}
    updateMatchControlButtons();
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
    
    if (quickModeToggle) {
        quickModeToggle.checked = timerState.timerDuration <= 15;
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
    const newText = displayTextInput.value.trim() || 'Your event name here!';
    updateState({ display: newText });
    console.log('Display text updated to:', newText);
}

// Timer Functions - Updated for new button behavior
function startMatch() {
    const activeDuration = timerState.timerDuration || TIMER_DURATION;
    if (timerState.timerState === 'running') {
        // Abort match
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        updateState({ timerState: 'stopped', timerCurrentTime: activeDuration, timerStartTime: null, timerEndTime: null });
        updateMatchControlButtons();
        console.log('Match aborted');
    } else if (timerState.timerState === 'finished') {
        updateState({ timerState: 'stopped', timerCurrentTime: activeDuration, timerStartTime: null, timerEndTime: null });
        updateMatchControlButtons();
        console.log('Timer reset');
    } else {
        const now = Date.now();
        const currentTime = timerState.timerCurrentTime > 0 && timerState.timerCurrentTime <= activeDuration ? timerState.timerCurrentTime : activeDuration;
        updateState({ timerState: 'running', timerStartTime: now, timerEndTime: now + (currentTime * 1000), timerCurrentTime: currentTime });
        startTimerCountdown();
        updateMatchControlButtons();
        console.log('Match started');
    }
}

function startTimerCountdown() {
    if (timerInterval) { clearInterval(timerInterval); }
    timerInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerState.timerEndTime - now) / 1000));
        if (remaining !== timerState.timerCurrentTime) { updateState({ timerCurrentTime: remaining }); }
        if (remaining <= 0) { stopTimerCountdown(); updateState({ timerState: 'finished' }); updateMatchControlButtons(); console.log('Match finished'); }
    }, 100);
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

function deleteMatch(match) {
    openDeleteMatchModal(match.matchNumber);
}

function openDeleteMatchModal(matchNumber) {
    const match = timerState.matches.find(m => m.matchNumber === matchNumber);
    if (!match) return;
    pendingDeleteMatchNumber = match.matchNumber;
    deleteMatchPreviewBody.innerHTML = '';
    const row = document.createElement('tr');
    const cellMatch = document.createElement('td');
    cellMatch.textContent = match.matchNumber;
    row.appendChild(cellMatch);
    match.teams.forEach(t => {
        const td = document.createElement('td');
        td.textContent = (t && t.trim()) ? t : '—';
        row.appendChild(td);
    });
    deleteMatchPreviewBody.appendChild(row);
    lastFocusedElementBeforeModal = document.activeElement;
    document.body.classList.add('modal-open');
    deleteMatchModal.style.display = 'flex';
    deleteMatchCloseBtn.focus();
    document.addEventListener('keydown', handleModalKeydown);
}

function closeDeleteMatchModal() {
    deleteMatchModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    pendingDeleteMatchNumber = null;
    document.removeEventListener('keydown', handleModalKeydown);
    if (lastFocusedElementBeforeModal) { lastFocusedElementBeforeModal.focus(); }
}

function handleModalKeydown(e) {
    if (e.key === 'Escape') {
        closeDeleteMatchModal();
    } else if (e.key === 'Tab') {
        // Basic focus trap
        const focusable = deleteMatchModal.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusable).filter(el => !el.disabled && el.offsetParent !== null);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
}

function performDeleteMatch(matchNumber) {
    const updatedMatches = timerState.matches
        .filter(match => match.matchNumber !== matchNumber)
        .map((match, index) => ({ ...match, matchNumber: index + 1 }));
    let newCurrentMatch = timerState.currentMatchNumber;
    if (matchNumber === timerState.currentMatchNumber) {
        newCurrentMatch = updatedMatches.length > 0 ? 1 : 1;
    } else if (matchNumber < timerState.currentMatchNumber) {
        newCurrentMatch = timerState.currentMatchNumber - 1;
    }
    updateState({ matches: updatedMatches, currentMatchNumber: newCurrentMatch });
    renderMatchSchedule();
    console.log('Match deleted:', matchNumber);
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

function deleteAllMatches() {
    openDeleteAllMatchesModal();
}

function openDeleteAllMatchesModal() {
    if (!timerState.matches.length) return;
    deleteAllMatchesPreviewBody.innerHTML = '';
    timerState.matches.forEach(match => {
        const row = document.createElement('tr');
        const cellMatch = document.createElement('td');
        cellMatch.textContent = match.matchNumber;
        row.appendChild(cellMatch);
        match.teams.forEach(t => {
            const td = document.createElement('td');
            td.textContent = (t && t.trim()) ? t : '—';
            row.appendChild(td);
        });
        deleteAllMatchesPreviewBody.appendChild(row);
    });
    lastFocusedElementBeforeModal = document.activeElement;
    document.body.classList.add('modal-open');
    deleteAllMatchesModal.style.display = 'flex';
    deleteAllCloseBtn.focus();
    document.addEventListener('keydown', handleModalKeydownAll);
}

function closeDeleteAllMatchesModal() {
    deleteAllMatchesModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', handleModalKeydownAll);
    if (lastFocusedElementBeforeModal) lastFocusedElementBeforeModal.focus();
}

function handleModalKeydownAll(e) {
    if (e.key === 'Escape') {
        closeDeleteAllMatchesModal();
    } else if (e.key === 'Tab') {
        const focusable = deleteAllMatchesModal.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusable).filter(el => !el.disabled && el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
}

function renderMatchSchedule() {
    const tbody = matchScheduleBody;
    const noMatches = noMatchesMessage;
    const table = matchScheduleTable;
    
    // Update match count
    const count = timerState.matches.length;
    matchCount.textContent = `${count} match${count !== 1 ? 'es' : ''} scheduled`;
    
    // Show/hide Delete All button
    if (deleteAllMatchesBtn) {
        deleteAllMatchesBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    
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
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            openDeleteMatchModal(match.matchNumber);
        });
        actionsCell.appendChild(deleteBtn);
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
deleteAllMatchesBtn.addEventListener('click', deleteAllMatches);

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

if (quickModeToggle) {
    quickModeToggle.addEventListener('change', () => {
        const newDuration = quickModeToggle.checked ? 15 : BASE_TIMER_DURATION;
        const wasRunning = timerState.timerState === 'running';
        if (wasRunning) {
            // Abort current running timer when changing mode
            stopTimerCountdown();
        }
        const updates = { timerDuration: newDuration };
        if (!wasRunning) {
            updates.timerCurrentTime = newDuration;
            updates.timerState = 'stopped';
        } else {
            // If it was running, restart from full new duration
            const now = Date.now();
            updates.timerCurrentTime = newDuration;
            updates.timerState = 'running';
            updates.timerStartTime = now;
            updates.timerEndTime = now + (newDuration * 1000);
        }
        updateState(updates);
        if (wasRunning) { startTimerCountdown(); }
        updateMatchControlButtons();
        console.log('Quick mode toggled. Duration set to', newDuration);
    });
}

// Modal button listeners
if (deleteMatchCloseBtn) deleteMatchCloseBtn.addEventListener('click', closeDeleteMatchModal);
if (keepMatchBtn) keepMatchBtn.addEventListener('click', closeDeleteMatchModal);
if (confirmDeleteMatchBtn) confirmDeleteMatchBtn.addEventListener('click', () => {
    if (pendingDeleteMatchNumber != null) {
        performDeleteMatch(pendingDeleteMatchNumber);
    }
    closeDeleteMatchModal();
});
if (deleteAllCloseBtn) deleteAllCloseBtn.addEventListener('click', closeDeleteAllMatchesModal);
if (keepAllMatchesBtn) keepAllMatchesBtn.addEventListener('click', closeDeleteAllMatchesModal);
if (confirmDeleteAllMatchesBtn) confirmDeleteAllMatchesBtn.addEventListener('click', () => {
    updateState({ matches: [], currentMatchNumber: 1 });
    renderMatchSchedule();
    closeDeleteAllMatchesModal();
    console.log('All matches deleted');
});

// Initialize when page loads
loadState();
initializeUI();
console.log('Control page initialized with persistent configuration');
