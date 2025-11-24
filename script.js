// FLL Timer Control Page
console.log('FLL Timer Control loaded');

// DOM elements
const displayTextInput = document.getElementById('displayText');
const eventNameInput = document.getElementById('eventName');
const resetConfigBtn = document.getElementById('resetConfigBtn');
const currentMatchBtn = document.getElementById('currentMatchBtn');
const prevMatchBtn = document.getElementById('prevMatchBtn');
const nextMatchBtn = document.getElementById('nextMatchBtn');
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
// ============================================================
// TIMER CONFIGURATION - Change these values for testing
// ============================================================
const TIMER_DURATION = 150; // Timer duration in seconds (150 = 2:30 for official matches, set to 10 for quick testing)
// ============================================================

const defaultState = {
    eventName: '',
    customText: '',
    // Display management - NEW: array of display configurations
    displays: [
        // Each display: { id: '1', name: 'Main Display', type: 'text' }
    ],
    nextDisplayId: 1, // Auto-increment for new displays
    // Event configuration
    // Match schedule
    matches: [], // Array of match objects: { matchNumber: 1, teams: [1234, 5678, 9012, 3456] }
    currentMatchNumber: 1, // Currently displayed/active match
    tableCount: 4,
    previewShown: false, // Has preview been shown for current match cycle
    // Timer settings
    timerState: 'stopped', // stopped, running, paused
    timerStartTime: null,
    timerEndTime: null,
    timerCurrentTime: TIMER_DURATION,
    // More state properties will be added as we build features
};

let timerState = { ...defaultState };
let timerInterval = null; // For the countdown timer
let matchStartTimestamp = null; // Track when match started for abort delay
let displayWindows = {}; // Track all display windows by ID

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
        eventNameInput.value = '';
        displayTextInput.value = '';
        
        // Reset match schedule display
        renderMatchSchedule();
        renderDisplayList();
        
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
    eventNameInput.value = timerState.eventName || '';
    displayTextInput.value = timerState.customText || '';
    
    // Initialize match schedule display
    renderMatchSchedule();
    // Initialize table count toggle
    if (tableCountToggle) setTableCountToggle(timerState.tableCount);
    
    console.log('UI initialized with saved configuration');
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

// Update match control buttons based on state
function updateMatchControlButtons() {
    const hasMatches = timerState.matches.length > 0;
    const currentMatch = timerState.currentMatchNumber;
    const isRunning = timerState.timerState === 'running';
    const isFinished = timerState.timerState === 'finished';
    
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
    
    // Start/Abort button logic - now works independently of display type
    if (!hasMatches) {
        currentMatchBtn.disabled = true;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Start';
        currentMatchBtn.className = 'primary';
    } else if (isRunning) {
        // Check if within 3-second abort delay
        const elapsed = matchStartTimestamp ? Date.now() - matchStartTimestamp : Infinity;
        const inAbortDelay = elapsed < 3000;
        currentMatchBtn.style.pointerEvents = inAbortDelay ? 'none' : 'auto';
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Abort';
        currentMatchBtn.className = 'destructive';
    } else if (isFinished) {
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Reset';
        currentMatchBtn.className = 'secondary';
    } else {
        currentMatchBtn.disabled = false;
        currentMatchBtn.querySelector('.button-main-text').textContent = 'Start';
        currentMatchBtn.className = 'primary';
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

// Update event name when input changes
function updateEventName() {
    const newName = eventNameInput.value.trim();
    updateState({ eventName: newName });
    console.log('Event name updated to:', newName);
}

// Update custom text when input changes
function updateCustomText() {
    const newText = displayTextInput.value.trim();
    updateState({ customText: newText });
    console.log('Custom text updated to:', newText);
}

// Timer Functions - Updated for new button behavior
function startMatch() {
    if (timerState.timerState === 'running') {
        // Abort match (only if 3 seconds have passed)
        const elapsed = Date.now() - matchStartTimestamp;
        if (elapsed < 3000) {
            console.log('Cannot abort match in first 3 seconds');
            return; // Prevent abort in first 3 seconds
        }
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        matchStartTimestamp = null;
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
        matchStartTimestamp = now; // Track start time for abort delay
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
    console.log('renderMatchSchedule called, matches:', timerState.matches);
    const tbody = matchScheduleBody;
    const noMatches = noMatchesMessage;
    const table = matchScheduleTable;
    
    if (!tbody || !table || !noMatches) {
        console.error('Match schedule DOM elements not found:', { tbody, table, noMatches });
        return;
    }
    
    console.log('DOM elements found, rendering', timerState.matches.length, 'matches');
    
    // Update match count
    const count = timerState.matches.length;
    if (matchCount) {
        matchCount.textContent = `${count} match${count !== 1 ? 'es' : ''} scheduled`;
    }
    
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
    console.log('tbody cleared, innerHTML:', tbody.innerHTML);
    
    if (timerState.matches.length === 0) {
        table.style.display = 'none';
        noMatches.style.display = 'block';
        console.log('No matches, showing empty message');
        return;
    }
    
    table.style.display = 'table';
    noMatches.style.display = 'none';
    console.log('Building rows for', timerState.matches.length, 'matches');
    
    // Create rows for each match
    timerState.matches.forEach(match => {
        console.log('Creating row for match', match.matchNumber);
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
        console.log('Row appended for match', match.matchNumber);
    });
    
    console.log('renderMatchSchedule complete, tbody children:', tbody.children.length);
}

// --- CSV Upload & Parsing ---
// Expect columns: Event Name,Type,Date (mm/dd/yyyy),Start Time,End Time,Room / Table Location,Team Number,Team Name
// We only import rows where Type starts with 'Official Match' (keeping source spelling) and treat rows sharing the same Start Time as one match.
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
        if (!typeVal || !/^official match/i.test(typeVal)) continue; // only official matches
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

// ============================================================
// DISPLAY MANAGEMENT FUNCTIONS - NEW
// ============================================================

function addDisplay() {
    const id = String(timerState.nextDisplayId);
    const newDisplay = {
        id: id,
        name: `Display ${id}`,
        type: 'text' // Default to text display
    };
    
    const updatedDisplays = [...timerState.displays, newDisplay];
    updateState({
        displays: updatedDisplays,
        nextDisplayId: timerState.nextDisplayId + 1
    });
    
    renderDisplayList();
    console.log('Display added:', newDisplay);
}

function removeDisplay(displayId) {
    // Close window if open
    if (displayWindows[displayId] && !displayWindows[displayId].closed) {
        displayWindows[displayId].close();
        delete displayWindows[displayId];
    }
    
    const updatedDisplays = timerState.displays.filter(d => d.id !== displayId);
    updateState({ displays: updatedDisplays });
    renderDisplayList();
    console.log('Display removed:', displayId);
}

function updateDisplayType(displayId, newType) {
    const updatedDisplays = timerState.displays.map(d => {
        if (d.id === displayId) {
            return { ...d, type: newType };
        }
        return d;
    });
    
    updateState({ displays: updatedDisplays });
    renderDisplayList();
    console.log('Display type updated:', { displayId, newType });
}

function updateDisplayName(displayId, newName) {
    const updatedDisplays = timerState.displays.map(d => {
        if (d.id === displayId) {
            return { ...d, name: newName };
        }
        return d;
    });
    
    updateState({ displays: updatedDisplays });
    renderDisplayList();
}

function openDisplayWindow(displayId) {
    const display = timerState.displays.find(d => d.id === displayId);
    if (!display) return;
    
    // Check if already open
    if (displayWindows[displayId] && !displayWindows[displayId].closed) {
        displayWindows[displayId].focus();
        console.log('Display window focused:', displayId);
        return;
    }
    
    // Open new window with display ID in URL
    const url = `display.html?id=${displayId}`;
    const windowName = `fll-display-${displayId}`;
    const newWindow = window.open(url, windowName, 'width=1920,height=1080');
    
    if (newWindow) {
        displayWindows[displayId] = newWindow;
        console.log('Display window opened:', displayId);
        renderDisplayList();
        
        // Monitor if window closes
        const checkClosed = setInterval(() => {
            if (newWindow.closed) {
                delete displayWindows[displayId];
                renderDisplayList();
                clearInterval(checkClosed);
                console.log('Display window closed by user:', displayId);
            }
        }, 1000);
    } else {
        alert('Please allow popups for this site to open display windows.');
    }
}

function renderDisplayList() {
    const container = document.getElementById('displayList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (timerState.displays.length === 0) {
        container.innerHTML = '<p class="no-displays">No displays configured. Click "Add Display" to create one.</p>';
        return;
    }
    
    timerState.displays.forEach(display => {
        const isOpen = displayWindows[display.id] && !displayWindows[display.id].closed;
        
        const displayCard = document.createElement('div');
        displayCard.className = 'card alternate';
        displayCard.innerHTML = `
            <div class="card-header">
                <h3>Display ${display.id}</h3>
                <div class="form-control horizontal">
                    <label>Display Type</label>
                    <div class="toggle-button-group" data-display-id="${display.id}">
                        <button class="toggle start ${display.type === 'text' ? 'active' : ''}" data-value="text">Custom Text</button>
                        <button class="toggle end ${display.type === 'match-timer' ? 'active' : ''}" data-value="match-timer">Match Timer</button>
                    </div>
                </div>
                <div class="card-header-actions">
                    <button class="primary ${isOpen ? 'secondary' : ''}" 
                            data-display-id="${display.id}" 
                            data-action="toggle-window">
                        ${isOpen ? 'Focus Display' : 'Open Display'}
                    </button>
                    <button class="destructive" data-display-id="${display.id}" data-action="remove">Delete</button>
                </div>
            </div>
        `;
        
        container.appendChild(displayCard);
    });
    
    // Add event listeners
    container.querySelectorAll('[data-action="remove"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const displayId = e.target.dataset.displayId;
            if (confirm(`Remove "Display ${displayId}"?`)) {
                removeDisplay(displayId);
            }
        });
    });
    
    container.querySelectorAll('[data-action="toggle-window"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const displayId = e.target.dataset.displayId;
            openDisplayWindow(displayId);
        });
    });
    
    container.querySelectorAll('.toggle-button-group').forEach(group => {
        group.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle')) {
                const displayId = group.dataset.displayId;
                const newType = e.target.dataset.value;
                updateDisplayType(displayId, newType);
            }
        });
    });
}

// ============================================================
// END DISPLAY MANAGEMENT FUNCTIONS
// ============================================================

// Event listeners
const addDisplayBtn = document.getElementById('addDisplayBtn');
if (addDisplayBtn) {
    addDisplayBtn.addEventListener('click', addDisplay);
}

resetConfigBtn.addEventListener('click', resetConfiguration);
currentMatchBtn.addEventListener('click', startMatch);
prevMatchBtn.addEventListener('click', previousMatch);
nextMatchBtn.addEventListener('click', nextMatch);
addMatchBtn.addEventListener('click', addMatch);
deleteAllMatchesBtn.addEventListener('click', deleteAllMatches);

// Track changes on input fields and update automatically
eventNameInput.addEventListener('input', updateEventName);
displayTextInput.addEventListener('input', updateCustomText);

// Initialize when page loads
loadState();
initializeUI();
renderDisplayList(); // Render display management UI
console.log('Control page initialized with persistent configuration');
