// FLL Timer Control Page
console.log('FLL Timer Control loaded');

// DOM elements
const openDisplayBtn = document.getElementById('openDisplayBtn');
const displayTextInput = document.getElementById('displayText');
const eventNameInput = document.getElementById('eventName');
const soundOptionInputs = document.querySelectorAll('input[name="soundOption"]');
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
const toggleScheduleBtn = document.getElementById('toggleScheduleBtn');
const matchScheduleHead = document.getElementById('matchScheduleHead');
const prevMatchSub = document.getElementById('prevMatchSub');
const currentMatchSub = document.getElementById('currentMatchSub');
const nextMatchSub = document.getElementById('nextMatchSub');
const noMatchesMessage = document.getElementById('noMatchesMessage');
const matchCount = document.getElementById('matchCount');
const addTeamBtn = document.getElementById('addTeamBtn');
const deleteAllTeamsBtn = document.getElementById('deleteAllTeamsBtn');
const toggleTeamsBtn = document.getElementById('toggleTeamsBtn');
const teamsTable = document.getElementById('teamsTable');
const teamsBody = document.getElementById('teamsBody');
const noTeamsMessage = document.getElementById('noTeamsMessage');
const teamCount = document.getElementById('teamCount');
const uploadSponsorsBtn = document.getElementById('uploadSponsorsBtn');
const sponsorLogosInput = document.getElementById('sponsorLogosInput');
const sponsorPreview = document.getElementById('sponsorPreview');
const clearSponsorsBtn = document.getElementById('clearSponsorsBtn');
const selectFromLibraryBtn = document.getElementById('selectFromLibraryBtn');
const logoLibrary = document.getElementById('logoLibrary');

// Available sponsor logos in the library
const availableLogos = [
    { name: 'Arconic', path: 'media/sponsor-logos/logo-arconic.png' },
    { name: 'FIRST Illinois', path: 'media/sponsor-logos/first-illinois.png' },
    { name: 'ISU College of Engineering', path: 'media/sponsor-logos/logo-isu_college_of_engineering.png' },
    { name: 'John Deere', path: 'media/sponsor-logos/logo-john_deere.PNG' },
    { name: 'QC ESC', path: 'media/sponsor-logos/qcesc.png' },
    { name: 'QC ESC Square', path: 'media/sponsor-logos/qcesc-square.png' },
    { name: 'RTX', path: 'media/sponsor-logos/logo-rtx.png' }
];

// State management
// ============================================================
// TIMER CONFIGURATION - Change these values for testing
// ============================================================
const TIMER_DURATION = 150; // Timer duration in seconds (150 = 2:30 for official matches, set to 10 for quick testing)
// ============================================================

const defaultState = {
    displayType: 'text',
    eventName: '',
    customText: '',
    soundOption: 'none', // 'none' or 'ftc'
    // Event configuration
    sponsorLogos: [], // Array of base64 encoded images
    // Teams
    teams: [], // Array of team objects: { teamNumber: '1234', teamName: 'Team Name' }
    // Match schedule
    matches: [], // Array of match objects: { matchNumber: 1, teams: [1234, 5678, 9012, 3456] }
    currentMatchNumber: 1, // Currently displayed/active match
    tableNames: ['Table 1A', 'Table 1B'], // Array of table names, supports 1-4 tables
    // Timer settings
    timerState: 'stopped', // stopped, running, paused
    timerStartTime: null,
    timerEndTime: null,
    timerCurrentTime: TIMER_DURATION,
    // UI state
    isScheduleCollapsed: false,
    isTeamsCollapsed: false,
    // More state properties will be added as we build features
};

let timerState = { ...defaultState };
let timerInterval = null; // For the countdown timer
let matchStartTimestamp = null; // Track when match started for abort delay
let displayWindow = null; // Track the display window
let isScheduleCollapsed = false; // Track schedule collapse state
let isTeamsCollapsed = false; // Track teams collapse state
let warningPlayed = false; // Track if warning sound has played for this match

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
            
            // Migrate old tableCount to tableNames if needed
            if (timerState.tableCount !== undefined && !timerState.tableNames) {
                const count = timerState.tableCount;
                if (count === 2) {
                    timerState.tableNames = ['1A', '1B'];
                } else if (count === 4) {
                    timerState.tableNames = ['1A', '1B', '2A', '2B'];
                } else {
                    timerState.tableNames = ['1A', '1B'];
                }
                delete timerState.tableCount;
                console.log('Migrated tableCount to tableNames');
            }
            
            // Ensure tableNames exists
            if (!timerState.tableNames || !Array.isArray(timerState.tableNames) || timerState.tableNames.length === 0) {
                timerState.tableNames = ['1A', '1B'];
            }
            
            // Load collapsed states
            isScheduleCollapsed = timerState.isScheduleCollapsed || false;
            isTeamsCollapsed = timerState.isTeamsCollapsed || false;
            
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
        // Set display type toggle
        setDisplayTypeToggle(timerState.displayType);
        
        // Update UI based on display type
        updateMatchControlButtons();
        
        // Reset teams display
        renderTeams();
        
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
    eventNameInput.value = timerState.eventName || '';
    
    // Restore sound option
    const soundOption = timerState.soundOption || 'none';
    soundOptionInputs.forEach(input => {
        input.checked = input.value === soundOption;
    });
    displayTextInput.value = timerState.customText || '';
    // Set display type toggle
    setDisplayTypeToggle(timerState.displayType);
    
    // Update UI based on display type
    updateMatchControlButtons();
    
    // Initialize teams display
    renderTeams();
    
    // Initialize match schedule display
    renderMatchSchedule();
    
    // Apply saved collapsed states
    if (isTeamsCollapsed && timerState.teams.length > 3) {
        toggleTeamsBtn.innerHTML = '<span class="material-symbols-rounded" translate="no">keyboard_arrow_down</span>Expand';
        teamsTable.style.display = 'none';
        addTeamBtn.style.display = 'none';
        deleteAllTeamsBtn.style.display = 'none';
    }
    
    if (isScheduleCollapsed && timerState.matches.length > 3) {
        toggleScheduleBtn.innerHTML = '<span class="material-symbols-rounded" translate="no">keyboard_arrow_down</span>Expand';
        uploadScheduleBtn.style.display = 'none';
        addMatchBtn.style.display = 'none';
        deleteAllMatchesBtn.style.display = 'none';
    }
    
    // Initialize display button state
    updateOpenDisplayButton();
    
    console.log('UI initialized with saved configuration');
}

// Table management functions
function addTable() {
    if (timerState.tableNames.length >= 4) {
        alert('Maximum of 4 tables supported');
        return;
    }
    
    const defaultNames = ['Table 1A', 'Table 1B', 'Table 2A', 'Table 2B'];
    const newName = defaultNames[timerState.tableNames.length] || `Table ${timerState.tableNames.length + 1}`;
    
    const updatedTableNames = [...timerState.tableNames, newName];
    
    // Expand all matches to include empty slot for new table
    const updatedMatches = timerState.matches.map(match => ({
        ...match,
        teams: [...match.teams, '']
    }));
    
    updateState({ 
        tableNames: updatedTableNames,
        matches: updatedMatches
    });
    renderMatchSchedule();
}

function removeTable() {
    if (timerState.tableNames.length <= 1) {
        alert('At least 1 table is required');
        return;
    }
    
    if (!confirm(`Remove table "${timerState.tableNames[timerState.tableNames.length - 1]}"? Team data for this table will be preserved but hidden.`)) {
        return;
    }
    
    const updatedTableNames = timerState.tableNames.slice(0, -1);
    
    // Keep team data but it will be hidden
    updateState({ tableNames: updatedTableNames });
    renderMatchSchedule();
}

function updateTableName(index, newName) {
    const updatedTableNames = [...timerState.tableNames];
    updatedTableNames[index] = newName;
    updateState({ tableNames: updatedTableNames });
}

// Teams management functions
function addTeam() {
    const newTeam = {
        teamNumber: '',
        teamName: ''
    };
    
    const updatedTeams = [...timerState.teams, newTeam];
    updateState({ teams: updatedTeams });
    renderTeams();
}

function deleteTeam(index) {
    if (!confirm('Are you sure you want to delete this team?')) {
        return;
    }
    
    const updatedTeams = timerState.teams.filter((_, i) => i !== index);
    updateState({ teams: updatedTeams });
    renderTeams();
}

function deleteAllTeams() {
    if (confirm('Are you sure you want to delete all teams? This action cannot be undone.')) {
        updateState({ teams: [] });
        renderTeams();
        console.log('All teams deleted');
    }
}

function updateTeamNumber(index, value) {
    const updatedTeams = [...timerState.teams];
    updatedTeams[index] = { ...updatedTeams[index], teamNumber: value };
    updateState({ teams: updatedTeams });
    renderMatchSchedule(); // Update match schedule dropdowns
}

function updateTeamName(index, value) {
    const updatedTeams = [...timerState.teams];
    updatedTeams[index] = { ...updatedTeams[index], teamName: value };
    updateState({ teams: updatedTeams });
    renderMatchSchedule(); // Update match schedule dropdowns
}

function toggleTeamsCollapse() {
    isTeamsCollapsed = !isTeamsCollapsed;
    toggleTeamsBtn.innerHTML = isTeamsCollapsed 
        ? '<span class="material-symbols-rounded" translate="no">keyboard_arrow_down</span>Expand' 
        : '<span class="material-symbols-rounded" translate="no">keyboard_arrow_up</span>Collapse';
    
    // Save collapsed state
    updateState({ isTeamsCollapsed });
    
    // Hide/show the teams table and action buttons
    if (isTeamsCollapsed) {
        teamsTable.style.display = 'none';
        addTeamBtn.style.display = 'none';
        deleteAllTeamsBtn.style.display = 'none';
    } else {
        teamsTable.style.display = 'table';
        addTeamBtn.style.display = 'inline-flex';
        // Show delete all button only if there are teams
        deleteAllTeamsBtn.style.display = timerState.teams.length > 0 ? 'inline-flex' : 'none';
    }
}

function renderTeams() {
    const tbody = teamsBody;
    const noTeams = noTeamsMessage;
    const table = teamsTable;
    
    // Update team count
    const count = timerState.teams.length;
    teamCount.textContent = `${count} team${count !== 1 ? 's' : ''}`;
    
    // Show/hide Delete All button and Collapse button
    if (deleteAllTeamsBtn) {
        deleteAllTeamsBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (toggleTeamsBtn) {
        toggleTeamsBtn.style.display = count > 3 ? 'inline-flex' : 'none';
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (timerState.teams.length === 0) {
        table.style.display = 'none';
        noTeams.style.display = 'block';
        isTeamsCollapsed = false;
        return;
    }
    
    // Reset collapse state if we have 3 or fewer teams
    if (timerState.teams.length <= 3) {
        isTeamsCollapsed = false;
    }
    
    table.style.display = 'table';
    noTeams.style.display = 'none';
    
    // Filter teams if collapsed (show all for now, can add filtering later if needed)
    let teamsToDisplay = timerState.teams;
    
    // Create rows for each team
    teamsToDisplay.forEach((team, index) => {
        const row = document.createElement('tr');
        
        // Team number column
        const numberCell = document.createElement('td');
        const numberInput = document.createElement('input');
        numberInput.type = 'text';
        numberInput.className = 'team-input';
        numberInput.value = team.teamNumber;
        numberInput.placeholder = 'Team Number';
        numberInput.addEventListener('input', (e) => {
            updateTeamNumber(index, e.target.value);
        });
        numberCell.appendChild(numberInput);
        row.appendChild(numberCell);
        
        // Team name column
        const nameCell = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'team-input';
        nameInput.value = team.teamName;
        nameInput.placeholder = 'Team Name';
        nameInput.addEventListener('input', (e) => {
            updateTeamName(index, e.target.value);
        });
        nameCell.appendChild(nameInput);
        row.appendChild(nameCell);
        
        // Actions column
        const actionsCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'destructive icon-only material-symbols-rounded';
        deleteBtn.title = 'Delete Team';
        deleteBtn.setAttribute('translate', 'no');
        deleteBtn.textContent = 'delete';
        deleteBtn.addEventListener('click', () => {
            deleteTeam(index);
        });
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
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
        // Open new display tab
        displayWindow = window.open('display.html', 'fll-display');
        
        if (displayWindow) {
            console.log('Display tab opened');
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
    if (!isMatchTimer || !hasMatches) {
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

    // Prevent accidental display type change or closing display while a match is running
    const textToggleBtn = displayTypeToggle?.querySelector('[data-value="text"]');
    const matchTimerToggleBtn = displayTypeToggle?.querySelector('[data-value="match-timer"]');
    if (textToggleBtn) {
        textToggleBtn.disabled = isRunning;
    }
    if (matchTimerToggleBtn) {
        matchTimerToggleBtn.disabled = isRunning;
    }
    if (openDisplayBtn) {
        openDisplayBtn.disabled = isRunning;
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

        // Resets the timer
        const updates = {
            timerState: 'stopped',
            timerCurrentTime: TIMER_DURATION,
            timerStartTime: null,
            timerEndTime: null
        };
        
        updateState(updates);
        updateMatchControlButtons();
        
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
// Update sound option when radio changes
function updateSoundOption() {
    const selectedOption = document.querySelector('input[name="soundOption"]:checked')?.value || 'none';
    updateState({ soundOption: selectedOption });
    console.log('Sound option updated to:', selectedOption);
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
        warningPlayed = false; // Reset warning flag
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
        warningPlayed = false; // Reset warning flag
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
        warningPlayed = false; // Reset warning flag for new match
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
    
    let lastRemaining = timerState.timerCurrentTime; // Track last value to prevent skipping
    let lastStateSave = lastRemaining; // Track last value saved to state
    
    timerInterval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerState.timerEndTime - now) / 1000));
        
        // Update local display immediately
        if (remaining !== lastRemaining) {
            lastRemaining = remaining;
            timerState.timerCurrentTime = remaining;
            // Update control button subtext with new time
            updateMatchControlButtons();
            
            // Only save to state (and broadcast to display) every second to reduce load
            if (remaining !== lastStateSave) {
                lastStateSave = remaining;
                saveState();
                // Trigger storage event for display page
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'fll-timer-state',
                    newValue: JSON.stringify(timerState)
                }));
            }
        }
        
        if (remaining <= 0) {
            stopTimerCountdown();
            warningPlayed = false; // Reset for next match
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

// Toggle schedule collapse state
function toggleScheduleCollapse() {
    isScheduleCollapsed = !isScheduleCollapsed;
    toggleScheduleBtn.innerHTML = isScheduleCollapsed 
        ? '<span class="material-symbols-rounded" translate="no">keyboard_arrow_down</span>Expand' 
        : '<span class="material-symbols-rounded" translate="no">keyboard_arrow_up</span>Collapse';
    
    // Save collapsed state
    updateState({ isScheduleCollapsed });
    
    // Hide/show the action buttons (table remains visible to show filtered matches)
    if (isScheduleCollapsed) {
        uploadScheduleBtn.style.display = 'none';
        addMatchBtn.style.display = 'none';
        deleteAllMatchesBtn.style.display = 'none';
    } else {
        uploadScheduleBtn.style.display = 'inline-flex';
        addMatchBtn.style.display = 'inline-flex';
        // Show delete all button only if there are matches
        deleteAllMatchesBtn.style.display = timerState.matches.length > 0 ? 'inline-flex' : 'none';
    }
    
    renderMatchSchedule();
}

function renderMatchSchedule() {
    const tbody = matchScheduleBody;
    const noMatches = noMatchesMessage;
    const table = matchScheduleTable;
    
    // Update match count
    const count = timerState.matches.length;
    matchCount.textContent = `${count} match${count !== 1 ? 'es' : ''}`;
    
    // Show/hide Delete All button and Collapse button
    if (deleteAllMatchesBtn) {
        deleteAllMatchesBtn.style.display = (count > 0 && !isScheduleCollapsed) ? 'inline-flex' : 'none';
    }
    if (toggleScheduleBtn) {
        toggleScheduleBtn.style.display = count > 3 ? 'inline-flex' : 'none';
    }
    
    // Update match control buttons
    updateMatchControlButtons();
    
    // Build header dynamically from tableNames
    const headerRow = document.createElement('tr');
    const matchNumHeader = document.createElement('th');
    matchNumHeader.textContent = 'Match #';
    headerRow.appendChild(matchNumHeader);

    // Add editable table name headers
    timerState.tableNames.forEach((tableName, index) => {
        const th = document.createElement('th');
        
        // Create container for input and remove button
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = 'var(--flld-spacing-xs)';
        container.style.alignItems = 'center';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'table-name-input';
        input.value = tableName;
        input.placeholder = `Table ${index + 1} Name`;
        input.style.flex = '1';
        input.style.minWidth = '0';
        input.addEventListener('input', (e) => {
            updateTableName(index, e.target.value);
        });
        container.appendChild(input);
        
        // Add remove button to the last table header
        if (index === timerState.tableNames.length - 1 && timerState.tableNames.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'destructive icon-only material-symbols-rounded';
            removeBtn.title = 'Remove Table';
            removeBtn.setAttribute('translate', 'no');
            removeBtn.textContent = 'close';
            removeBtn.addEventListener('click', removeTable);
            container.appendChild(removeBtn);
        }
        
        th.appendChild(container);
        headerRow.appendChild(th);
    });

    // Actions column header with Add Table button (only if not at max)
    const actionsHeader = document.createElement('th');
    if (timerState.tableNames.length < 4) {
        const addTableBtn = document.createElement('button');
        addTableBtn.className = 'secondary icon-only material-symbols-rounded';
        addTableBtn.style.width = '100%';
        addTableBtn.title = 'Add Table';
        addTableBtn.setAttribute('translate', 'no');
        addTableBtn.textContent = 'add';
        addTableBtn.addEventListener('click', addTable);
        actionsHeader.appendChild(addTableBtn);
    }
    headerRow.appendChild(actionsHeader);

    if (matchScheduleHead) {
        matchScheduleHead.innerHTML = '';
        matchScheduleHead.appendChild(headerRow);
    }

    // Clear existing rows
    tbody.innerHTML = '';
    
    if (timerState.matches.length === 0) {
        table.style.display = 'none';
        noMatches.style.display = 'block';
        isScheduleCollapsed = false; // Reset collapse state
        return;
    }
    
    // Reset collapse state if we have 3 or fewer matches
    if (timerState.matches.length <= 3) {
        isScheduleCollapsed = false;
    }
    
    table.style.display = 'table';
    noMatches.style.display = 'none';
    
    // Filter matches if collapsed: show only current and next
    let matchesToDisplay = timerState.matches;
    if (isScheduleCollapsed && timerState.matches.length > 0) {
        const currentMatchNum = timerState.currentMatchNumber;
        matchesToDisplay = timerState.matches.filter(match => {
            const diff = match.matchNumber - currentMatchNum;
            return diff >= 0 && diff <= 1; // Show current and next only
        });
        // If filtered list is empty (edge case), show all
        if (matchesToDisplay.length === 0) {
            matchesToDisplay = timerState.matches;
        }
    }
    
    // Create rows for each match
    matchesToDisplay.forEach(match => {
        const row = document.createElement('tr');
        
        // Add highlighting for current match
        if (match.matchNumber === timerState.currentMatchNumber) {
            row.classList.add('current-match-row');
        }
        
        // Match number column
        const matchNumberCell = document.createElement('td');
        matchNumberCell.innerHTML = `<span class="match-number">${match.matchNumber}</span>`;
        row.appendChild(matchNumberCell);
        
        // Team columns based on tableNames length
        const tableCount = timerState.tableNames.length;
        for (let teamIndex = 0; teamIndex < tableCount; teamIndex++) {
            const teamCell = document.createElement('td');
            const teamSelect = document.createElement('select');
            teamSelect.className = 'team-input';
            
            // Add placeholder option (disabled and hidden)
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Select a team';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            placeholderOption.hidden = true;
            teamSelect.appendChild(placeholderOption);
            
            // Add option for each team
            timerState.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.teamNumber;
                option.textContent = `${team.teamNumber}${team.teamName ? ' - ' + team.teamName : ''}`;
                teamSelect.appendChild(option);
            });
            
            // Set current value
            teamSelect.value = match.teams[teamIndex] || '';
            
            teamSelect.addEventListener('change', (e) => {
                updateMatchTeam(match.matchNumber, teamIndex, e.target.value);
            });
            teamCell.appendChild(teamSelect);
            row.appendChild(teamCell);
        }
        
        // Actions column
        const actionsCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'destructive icon-only material-symbols-rounded';
        deleteBtn.title = 'Delete Match';
        deleteBtn.setAttribute('translate', 'no');
        deleteBtn.textContent = 'delete';
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
        team: header.findIndex(h => h.toLowerCase().includes('team number')),
        teamName: header.findIndex(h => h.toLowerCase().includes('team name'))
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
        const teamName = cols[idx.teamName]?.trim() || '';
        if (!start || !table || !team) continue;
        rows.push({ start, table, team, teamName });
    }
    return rows;
}

// Extract unique teams from parsed CSV rows
function extractTeamsFromRows(rows) {
    const teamMap = new Map(); // Use Map to track unique teams by team number
    
    rows.forEach(row => {
        if (row.team && !teamMap.has(row.team)) {
            teamMap.set(row.team, {
                teamNumber: row.team,
                teamName: row.teamName || ''
            });
        }
    });
    
    // Convert to array and sort by team number
    return Array.from(teamMap.values()).sort((a, b) => {
        const numA = parseInt(a.teamNumber) || 0;
        const numB = parseInt(b.teamNumber) || 0;
        return numA - numB;
    });
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
    
    // Detect unique tables from the CSV and preserve original names
    const uniqueTablesMap = new Map(); // maps lowercase to original case
    rows.forEach(r => {
        const tableLower = r.table.toLowerCase().trim();
        if (!uniqueTablesMap.has(tableLower)) {
            uniqueTablesMap.set(tableLower, r.table.trim()); // preserve original
        }
    });
    
    // Sort table names and create mapping
    const sortedTables = [...uniqueTablesMap.keys()].sort();
    const tableMapping = new Map();
    const detectedTableNames = [];
    
    sortedTables.forEach((tableLower) => {
        if (detectedTableNames.length < 4) { // Limit to 4 tables
            const originalName = uniqueTablesMap.get(tableLower);
            detectedTableNames.push(originalName);
            tableMapping.set(tableLower, detectedTableNames.length - 1);
        }
    });
    
    const maxSlots = detectedTableNames.length;
    
    // Update tableNames to use full CSV table names
    if (detectedTableNames.length > 0) {
        updateState({ tableNames: detectedTableNames });
    }
    
    // Sort start times
    const orderedStarts = [...groups.keys()].sort((a,b) => timeToMinutes(a) - timeToMinutes(b));
    const matches = [];
    
    orderedStarts.forEach((start) => {
        const group = groups.get(start);
        // Initialize slots based on detected table count
        const slots = new Array(maxSlots).fill('');
        
        group.forEach(entry => {
            const tableLower = entry.table.toLowerCase().trim();
            const slotIndex = tableMapping.get(tableLower);
            if (slotIndex !== undefined && slotIndex < maxSlots) {
                slots[slotIndex] = entry.team;
            }
        });
        
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
            
            // Extract unique teams from CSV
            const extractedTeams = extractTeamsFromRows(rows);
            
            // Merge with existing teams, avoiding duplicates
            const existingTeamNumbers = new Set(timerState.teams.map(t => t.teamNumber));
            const newTeams = extractedTeams.filter(t => !existingTeamNumbers.has(t.teamNumber));
            const allTeams = [...timerState.teams, ...newTeams];
            
            updateState({ 
                matches, 
                teams: allTeams,
                currentMatchNumber: matches.length ? 1 : 1 
            });
            renderMatchSchedule();
            renderTeams();
            
            const teamsMessage = newTeams.length > 0 
                ? ` ${newTeams.length} new team(s) added.`
                : ' No new teams (all teams already exist).';
            alert(`Imported ${matches.length} matches.${teamsMessage}`);
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

// Event Listeners
openDisplayBtn.addEventListener('click', openDisplay);
toggleTeamsBtn.addEventListener('click', toggleTeamsCollapse);
toggleScheduleBtn.addEventListener('click', toggleScheduleCollapse);
resetConfigBtn.addEventListener('click', resetConfiguration);
currentMatchBtn.addEventListener('click', startMatch);
prevMatchBtn.addEventListener('click', previousMatch);
nextMatchBtn.addEventListener('click', nextMatch);
addTeamBtn.addEventListener('click', addTeam);
deleteAllTeamsBtn.addEventListener('click', deleteAllTeams);
addMatchBtn.addEventListener('click', addMatch);
deleteAllMatchesBtn.addEventListener('click', deleteAllMatches);

// Track changes on input fields and update automatically
eventNameInput.addEventListener('input', updateEventName);
displayTextInput.addEventListener('input', updateCustomText);
soundOptionInputs.forEach(input => {
    input.addEventListener('change', updateSoundOption);
});

// Sponsor logo upload handlers
selectFromLibraryBtn.addEventListener('click', () => {
    toggleLogoLibrary();
});

uploadSponsorsBtn.addEventListener('click', () => {
    sponsorLogosInput.click();
});

function toggleLogoLibrary() {
    const isVisible = logoLibrary.style.display !== 'none';
    
    if (isVisible) {
        logoLibrary.style.display = 'none';
        selectFromLibraryBtn.textContent = 'Select from Library';
    } else {
        renderLogoLibrary();
        logoLibrary.style.display = 'grid';
        selectFromLibraryBtn.textContent = 'Hide Library';
    }
}

function renderLogoLibrary() {
    logoLibrary.innerHTML = availableLogos.map((logo, index) => `
        <div class="library-logo-item" data-index="${index}">
            <img src="${logo.path}" alt="${logo.name}">
            <button class="secondary" onclick="addLogoFromLibrary(${index})"><span class="material-symbols-rounded" translate="no">add</span>Add</button>
        </div>
    `).join('');
}

async function addLogoFromLibrary(index) {
    const logo = availableLogos[index];
    
    try {
        // Fetch the image and convert to base64
        const response = await fetch(logo.path);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            updateState({ sponsorLogos: [...timerState.sponsorLogos, e.target.result] });
            renderSponsorPreview();
        };
        reader.readAsDataURL(blob);
    } catch (error) {
        console.error('Error loading logo from library:', error);
        alert('Error loading logo. Please try again.');
    }
}

sponsorLogosInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const logoPromises = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });
    
    try {
        const logos = await Promise.all(logoPromises);
        updateState({ sponsorLogos: [...timerState.sponsorLogos, ...logos] });
        renderSponsorPreview();
    } catch (error) {
        console.error('Error loading sponsor logos:', error);
        alert('Error loading one or more images. Please try again.');
    }
    
    // Reset input so same file can be uploaded again
    sponsorLogosInput.value = '';
});

clearSponsorsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to remove all sponsor logos?')) {
        updateState({ sponsorLogos: [] });
        renderSponsorPreview();
    }
});

// Drag and drop handlers
let draggedIndex = null;
let draggedElement = null;

function handleDragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    draggedElement = e.currentTarget;
    e.currentTarget.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    const dropTarget = e.currentTarget;
    if (draggedElement && dropTarget !== draggedElement && dropTarget.classList.contains('sponsor-preview-item')) {
        const dropIndex = parseInt(dropTarget.dataset.index);
        
        // Get bounding boxes
        const dropRect = dropTarget.getBoundingClientRect();
        const afterElement = (e.clientX > dropRect.left + dropRect.width / 2);
        
        // Insert visual placeholder
        if (afterElement) {
            dropTarget.parentNode.insertBefore(draggedElement, dropTarget.nextSibling);
        } else {
            dropTarget.parentNode.insertBefore(draggedElement, dropTarget);
        }
        
        // Update indices
        const items = sponsorPreview.querySelectorAll('.sponsor-preview-item');
        items.forEach((item, idx) => {
            item.dataset.index = idx;
        });
    }
    
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    const dropIndex = parseInt(e.currentTarget.dataset.index);
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        const newLogos = [...timerState.sponsorLogos];
        const [removed] = newLogos.splice(draggedIndex, 1);
        newLogos.splice(dropIndex, 0, removed);
        updateState({ sponsorLogos: newLogos });
        renderSponsorPreview();
    }
    
    return false;
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedIndex = null;
    draggedElement = null;
    
    // Save final order
    const finalOrder = [];
    const items = sponsorPreview.querySelectorAll('.sponsor-preview-item');
    items.forEach((item) => {
        const index = parseInt(item.dataset.index);
        if (timerState.sponsorLogos[index]) {
            finalOrder.push(timerState.sponsorLogos[index]);
        }
    });
    
    if (finalOrder.length > 0) {
        updateState({ sponsorLogos: finalOrder });
        renderSponsorPreview();
    }
}

function removeSponsor(index) {
    const newLogos = [...timerState.sponsorLogos];
    newLogos.splice(index, 1);
    updateState({ sponsorLogos: newLogos });
    renderSponsorPreview();
}

function renderSponsorPreview() {
    // Show/hide clear all button based on whether there are logos
    if (clearSponsorsBtn) {
        clearSponsorsBtn.style.display = (timerState.sponsorLogos && timerState.sponsorLogos.length > 0) ? 'inline-flex' : 'none';
    }
    
    if (!timerState.sponsorLogos || timerState.sponsorLogos.length === 0) {
        sponsorPreview.innerHTML = '<div class="no-data-area-neutral">No sponsor logos added. Select logos from the library or upload your own!</div>';
        return;
    }
    
    sponsorPreview.innerHTML = timerState.sponsorLogos.map((logo, index) => `
        <div class="sponsor-preview-item" draggable="true" data-index="${index}">
            <div class="drag-handle material-symbols-rounded" title="Drag to reorder" translate="no">drag_indicator</div>
            <img src="${logo}" alt="Sponsor ${index + 1}">
            <button class="destructive icon-only material-symbols-rounded" onclick="removeSponsor(${index})" title="Remove logo" translate="no">close</button>
        </div>
    `).join('');
    
    // Add drag and drop event listeners
    const items = sponsorPreview.querySelectorAll('.sponsor-preview-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

// Handle display type toggle buttons
displayTypeToggle.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle')) {
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
        updateMatchControlButtons();
    }
});

// Initialize when page loads
loadState();
initializeUI();
renderSponsorPreview();
console.log('Control page initialized with persistent configuration');
