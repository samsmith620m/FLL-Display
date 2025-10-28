// FLL Timer Control Page
console.log('FLL Timer Control loaded');

// DOM elements
const openDisplayBtn = document.getElementById('openDisplayBtn');
const displayTextInput = document.getElementById('displayText');
const resetConfigBtn = document.getElementById('resetConfigBtn');
const displayTypeToggle = document.getElementById('displayTypeToggle');
const currentMatchBtn = document.getElementById('currentMatchBtn');
const prevMatchBtn = document.getElementById('prevMatchBtn');
const nextMatchBtn = document.getElementById('nextMatchBtn');
const textDisplayConfig = document.getElementById('textDisplayConfig');
const matchTimerConfig = document.getElementById('matchTimerConfig');
const addMatchBtn = document.getElementById('addMatchBtn');
const deleteAllMatchesBtn = document.getElementById('deleteAllMatchesBtn');
const uploadScheduleBtn = document.getElementById('uploadScheduleBtn');
const uploadScheduleInput = document.getElementById('uploadScheduleInput');
const matchScheduleTable = document.getElementById('matchScheduleTable');
const matchScheduleBody = document.getElementById('matchScheduleBody');
const matchScheduleHead = document.getElementById('matchScheduleHead');
const prevMatchSub = document.getElementById('prevMatchSub');
const currentMatchSub = document.getElementById('currentMatchSub');
const nextMatchSub = document.getElementById('nextMatchSub');
const noMatchesMessage = document.getElementById('noMatchesMessage');
const matchCount = document.querySelector('.match-count');
const tableCountToggle = document.getElementById('tableCountToggle');

// State management
const TIMER_DURATION = 150; // Fixed 2:30 duration in seconds

const defaultState = {
    displayType: 'text', // user selectable: 'text' | 'match-timer'; internal transitional: 'preview'
    display: 'Your event name here!',
    // Event configuration
    eventName: '',
    // Match schedule
    matches: [], // Array of match objects: { matchNumber: 1, teams: [1234, 5678, 9012, 3456] }
    currentMatchNumber: 1, // Currently displayed/active match
    tableCount: 4,
    // Timer settings
    timerState: 'stopped', // stopped, running, paused
    timerStartTime: null,
    timerEndTime: null,
    timerCurrentTime: TIMER_DURATION,
    // Match flow flags
    previewShown: false, // Has preview been shown for the current (stopped) match cycle
    // More state properties will be added as we build features
};

let timerState = { ...defaultState };
let timerInterval = null; // For the countdown timer
let displayWindow = null; // Track the display window

// Format seconds into M:SS (no styling changes)
function formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

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
    // Initialize table count toggle
    if (tableCountToggle) setTableCountToggle(timerState.tableCount);
    
    // Initialize display button state
    updateOpenDisplayButton();
    
    console.log('UI initialized with saved configuration');
}

// Update UI based on selected display type
function updateDisplayTypeUI() {
    const displayType = getSelectedDisplayType();
    // Text configuration only visible for text display
    if (displayType === 'text') {
        textDisplayConfig.style.display = 'inherit';
    } else {
        textDisplayConfig.style.display = 'none';
    }
    // Match timer controls only visible for match timer
    if (displayType === 'match-timer' || displayType === 'preview') { // treat preview as part of match flow
        matchTimerConfig.style.display = 'inherit';
    } else {
        matchTimerConfig.style.display = 'none';
    }
    // Preview currently has no extra config section

    // Update match control buttons
    updateMatchControlButtons();
}

// Table count toggle helpers
function getSelectedTableCount() {
    const active = tableCountToggle?.querySelector('.toggle.active');
    return active ? parseInt(active.dataset.value, 10) : 4;
}
function setTableCountToggle(count) {
    if (!tableCountToggle) return;
    tableCountToggle.querySelectorAll('.toggle').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === count);
    });
}

// Helper functions for display type toggle
function getSelectedDisplayType() {
    const activeBtn = displayTypeToggle.querySelector('.toggle.active');
    return activeBtn ? activeBtn.dataset.value : 'text';
}

function setDisplayTypeToggle(displayType) {
    const buttons = displayTypeToggle.querySelectorAll('.toggle');
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
    const isMatchTimerDisplay = timerState.displayType === 'match-timer';
    const isPreviewDisplay = timerState.displayType === 'preview';
    const currentMatch = timerState.currentMatchNumber;
    const isRunning = timerState.timerState === 'running';
    const isFinished = timerState.timerState === 'finished';
    const previewShown = timerState.previewShown;
    
    // Update match numbers in subtext
    if (hasMatches) {
        const prevMatch = currentMatch - 1;
        const nextMatch = currentMatch + 1;
        
        prevMatchSub.textContent = prevMatch >= 1 ? `Match ${prevMatch}` : '--';
    currentMatchSub.textContent = `Match ${currentMatch} | ${formatTimer(timerState.timerCurrentTime)}`;
        nextMatchSub.textContent = nextMatch <= timerState.matches.length ? `Match ${nextMatch}` : '--';
    } else {
        prevMatchSub.textContent = 'Match --';
    currentMatchSub.textContent = 'Match --';
        nextMatchSub.textContent = 'Match --';
    }
    
    // Enable/disable match navigation based on available matches and timer state
    // Disable navigation while match is running
    prevMatchBtn.disabled = !hasMatches || currentMatch <= 1 || isRunning;
    nextMatchBtn.disabled = !hasMatches || currentMatch >= timerState.matches.length || isRunning;
    
    // Start/Abort button logic
    if (!(isMatchTimerDisplay || isPreviewDisplay) || !hasMatches) {
        currentMatchBtn.disabled = true;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Show Preview';
        currentMatchBtn.className = 'primary';
    } else if (isRunning) {
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Abort';
        currentMatchBtn.className = 'destructive';
    } else if (isFinished) {
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Reset';
        currentMatchBtn.className = 'secondary';
    } else if (isPreviewDisplay && !previewShown) {
        // In preview showing upcoming teams: next is Show Timer
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Show Timer';
        currentMatchBtn.className = 'primary';
    } else if (isMatchTimerDisplay && previewShown && !isRunning && !isFinished) {
        // Timer layout is visible but not started yet
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Start';
        currentMatchBtn.className = 'primary';
    } else { // stopped state before any preview flow began
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Show Preview';
        currentMatchBtn.className = 'primary';
    }

    // Prevent accidental display type change or closing display while a match is running
    const textToggleBtn = displayTypeToggle?.querySelector('[data-value="text"]');
    const matchTimerToggleBtn = displayTypeToggle?.querySelector('[data-value="match-timer"]');
    const previewToggleBtn = displayTypeToggle?.querySelector('[data-value="preview"]');
    // Only disable changing to unrelated display modes while running; keep preview/match timer frozen
    if (textToggleBtn) textToggleBtn.disabled = isRunning; // can't switch to text mid-match
    if (previewToggleBtn) previewToggleBtn.disabled = isRunning; // cannot re-enter preview while running
    if (matchTimerToggleBtn) matchTimerToggleBtn.disabled = false; // active stage
    if (openDisplayBtn) {
        openDisplayBtn.disabled = isRunning; // disable open/close control while running
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
    const isPreviewDisplay = timerState.displayType === 'preview';
    const isMatchTimerDisplay = timerState.displayType === 'match-timer';
    const previewShown = timerState.previewShown;
    // From initial match-timer (stopped, no preview yet) -> Show Preview
    if (isMatchTimerDisplay && !isPreviewDisplay && !previewShown && timerState.timerState === 'stopped') {
        updateState({ displayType: 'preview', previewShown: false });
        updateDisplayTypeUI();
        updateMatchControlButtons();
        console.log('Preview shown');
        return;
    }
    // Abort
    if (timerState.timerState === 'running') {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
            updateState({
                timerState: 'stopped',
                timerCurrentTime: TIMER_DURATION,
                timerStartTime: null,
                timerEndTime: null,
                displayType: 'match-timer',
                previewShown: false
            });
        updateMatchControlButtons();
        console.log('Match aborted');
        return;
    }
    // Reset (finished -> ready cycle)
    if (timerState.timerState === 'finished') {
        updateState({
            timerState: 'stopped',
            timerCurrentTime: TIMER_DURATION,
            timerStartTime: null,
            timerEndTime: null,
            displayType: 'match-timer',
            previewShown: false
        });
        updateMatchControlButtons();
        console.log('Timer reset');
        return;
    }
    // Sequence transitions
    if (!isPreviewDisplay && !isMatchTimerDisplay) {
        // Entering flow from some other display type: jump to preview first
        updateState({ displayType: 'preview', previewShown: false });
        updateMatchControlButtons();
        console.log('Preview shown');
        return;
    }
    if (isPreviewDisplay && !previewShown) {
        // Show Timer stage: switch to match-timer layout but keep timer stopped
        updateState({ displayType: 'match-timer', previewShown: true, timerState: 'stopped' });
        updateMatchControlButtons();
        console.log('Timer layout shown (pre-start)');
        return;
    }
    if (isMatchTimerDisplay && previewShown && timerState.timerState === 'stopped') {
        // Start match from pre-start timer layout
        const now = Date.now();
        updateState({
            displayType: 'match-timer',
            timerState: 'running',
            timerStartTime: now,
            timerEndTime: now + (timerState.timerCurrentTime * 1000),
            previewShown: true
        });
        startTimerCountdown();
        updateMatchControlButtons();
        console.log('Match started');
        return;
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
            // Update control button subtext with new time
            updateMatchControlButtons();
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

function deleteMatch(matchNumber) {
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
    if (confirm('Are you sure you want to delete all matches? This action cannot be undone.')) {
        updateState({ 
            matches: [],
            currentMatchNumber: 1
        });
        renderMatchSchedule();
        console.log('All matches deleted');
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
    
    // Build header based on table count
    const tableCount = timerState.tableCount || 4;
    const headerRow = document.createElement('tr');
    const headers = ['Match #'];
    if (tableCount === 2) {
        headers.push('Table 1A', 'Table 1B');
    } else { // 4 tables
        headers.push('Table 1A', 'Table 1B', 'Table 2A', 'Table 2B');
    }
    headers.push('');
    headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
    if (matchScheduleHead) {
        matchScheduleHead.innerHTML = '';
        matchScheduleHead.appendChild(headerRow);
    }

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
        
        // Team columns (limit by tableCount)
        const visibleTeams = tableCount === 2 ? match.teams.slice(0,2) : match.teams;
        visibleTeams.forEach((team, teamIndex) => {
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
        deleteBtn.className = 'destructive';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete Match ${match.matchNumber}?`)) {
                deleteMatch(match.matchNumber);
            }
        });
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
    });
}

// --- CSV Upload & Parsing ---
// Expect columns: Event Name,Type,Date (mm/dd/yyyy),Start Time,End Time,Room / Table Location,Team Number,Team Name
// We only import rows where Type starts with 'Offical Match' (keeping source spelling) and treat rows sharing the same Start Time as one match.
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (lines.length < 2) return [];
    const header = lines[0].split(',');
    // Basic index mapping (defensive in case order changes)
    const idx = {
        type: header.findIndex(h => h.toLowerCase().includes('type')),
        start: header.findIndex(h => h.toLowerCase().includes('start time')),
        table: header.findIndex(h => h.toLowerCase().includes('room') || h.toLowerCase().includes('table')),
        team: header.findIndex(h => h.toLowerCase().includes('team number'))
    };
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const raw = lines[i];
        // Skip empty or ceremony rows quickly
        if (!raw.trim()) continue;
        const cols = raw.split(',');
        const typeVal = cols[idx.type]?.trim();
        if (!typeVal || !/^offical match/i.test(typeVal)) continue; // only official matches
        const start = cols[idx.start]?.trim();
        const table = cols[idx.table]?.trim();
        const team = cols[idx.team]?.trim();
        if (!start || !table || !team) continue;
        rows.push({ start, table, team });
    }
    return rows;
}

// Convert 12h time like '9:07 AM' to minutes since midnight for sorting
function timeToMinutes(t) {
    const match = t.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    let [ , hh, mm, ap ] = match;
    let h = parseInt(hh, 10);
    const m = parseInt(mm, 10);
    if (ap.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
}

function buildMatchesFromRows(rows) {
    // Group by start time
    const groups = new Map();
    rows.forEach(r => {
        if (!groups.has(r.start)) groups.set(r.start, []);
        groups.get(r.start).push(r);
    });
    // Sort start times
    const orderedStarts = [...groups.keys()].sort((a,b) => timeToMinutes(a) - timeToMinutes(b));
    const matches = [];
    const tableCount = timerState.tableCount || 4;
    orderedStarts.forEach((start) => {
        const group = groups.get(start);
        // Map tables to fixed order columns, but maintain 4-slot internal model
        const slots = ['', '', '', ''];
        group.forEach(entry => {
            const table = entry.table.toLowerCase();
            let slotIndex = -1;
            if (table.includes('1a')) slotIndex = 0;
            else if (table.includes('1b')) slotIndex = 1;
            else if (table.includes('2a')) slotIndex = 2;
            else if (table.includes('2b')) slotIndex = 3;
            if (slotIndex >= 0) slots[slotIndex] = entry.team;
        });
        // If only 2 tables configured, we ignore 2A/2B for display but keep data
        matches.push({ matchNumber: matches.length + 1, teams: slots });
    });
    return matches;
}

function handleScheduleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            const rows = parseCSV(text);
            if (!rows.length) {
                alert('No official matches found in CSV.');
                return;
            }
            const matches = buildMatchesFromRows(rows);
            updateState({ matches, currentMatchNumber: matches.length ? 1 : 1 });
            renderMatchSchedule();
            alert(`Imported ${matches.length} matches.`);
        } catch (err) {
            console.error('Error importing schedule', err);
            alert('Failed to import schedule.');
        }
    };
    reader.readAsText(file);
}

if (uploadScheduleBtn && uploadScheduleInput) {
    uploadScheduleBtn.addEventListener('click', () => uploadScheduleInput.click());
    uploadScheduleInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleScheduleFile(file);
        // reset input so same file can be chosen again if needed
        e.target.value = '';
    });
}

// Handle table count change
tableCountToggle?.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle')) {
        const newCount = parseInt(e.target.dataset.value, 10);
        if (newCount !== timerState.tableCount) {
            setTableCountToggle(newCount);
            updateState({ tableCount: newCount });
            renderMatchSchedule();
        }
    }
});

// Event listeners
openDisplayBtn.addEventListener('click', openDisplay);
resetConfigBtn.addEventListener('click', resetConfiguration);
currentMatchBtn.addEventListener('click', startMatch);
prevMatchBtn.addEventListener('click', previousMatch);
nextMatchBtn.addEventListener('click', nextMatch);
addMatchBtn.addEventListener('click', addMatch);
deleteAllMatchesBtn.addEventListener('click', deleteAllMatches);

// Track changes on input fields and update automatically
displayTextInput.addEventListener('input', updateDisplayText);

// Handle display type toggle buttons
displayTypeToggle.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle')) {
        const currentDisplayType = e.target.dataset.value;
        
        // Update button states
        setDisplayTypeToggle(currentDisplayType);
        
        // Block switching while running
        if (timerState.timerState === 'running') return;
        const updates = { displayType: currentDisplayType };
        if (currentDisplayType === 'match-timer' && timerState.displayType !== 'preview') {
            // Entering match timer fresh ensures reset & clears preview state
            updates.timerCurrentTime = timerState.timerCurrentTime ?? TIMER_DURATION;
            updates.timerState = 'stopped';
            updates.previewShown = false;
        }
        updateState(updates);
        updateDisplayTypeUI();
        updateMatchControlButtons();
    }
});

// Initialize when page loads
loadState();
initializeUI();
console.log('Control page initialized with persistent configuration');
