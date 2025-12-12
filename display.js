// FLL Timer Display Page
console.log('FLL Timer Display loaded');

// DOM elements
const eventName = document.getElementById('eventName');
const customText = document.getElementById('customText');
const textDisplay = document.getElementById('textDisplay');
const timerDisplay = document.getElementById('timerDisplay');
const timerTime = document.querySelector('.timer-time');
const displayEventName = document.getElementById('displayEventName');
const displayMatchNumber = document.getElementById('displayMatchNumber');
const displayMatchTotal = document.getElementById('displayMatchTotal');
// We'll rebuild team cards dynamically to support 2 or 4 tables
let teamCardsContainer = null; // reference to timerDisplay for querying

// ============================================================
// TIMER CONFIGURATION - Change these values for testing
// ============================================================
const TIMER_DURATION = 150; // Timer duration in seconds (150 = 2:30 for official matches, set to 10 for quick testing)
// ============================================================

const defaultDisplayState = {
    displayType: 'text',
    eventName: '',
    customText: '',
    timerState: 'stopped',
    timerCurrentTime: TIMER_DURATION,
    matches: [],
    currentMatchNumber: 1,
    tableNames: ['1A', '1B'],
    sponsorLogos: []
};

// Current state
let currentState = { ...defaultDisplayState };

// Track previous state to avoid unnecessary DOM recreation
let previousTableNames = null;
let previousSponsorLogos = null;

// Load initial state from localStorage
function loadState() {
    try {
        const savedState = localStorage.getItem('fll-timer-state');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            currentState = { ...defaultDisplayState, ...parsedState };
            
            // Migrate old tableCount to tableNames if needed
            if (currentState.tableCount !== undefined && !currentState.tableNames) {
                const count = currentState.tableCount;
                if (count === 2) {
                    currentState.tableNames = ['1A', '1B'];
                } else if (count === 4) {
                    currentState.tableNames = ['1A', '1B', '2A', '2B'];
                } else {
                    currentState.tableNames = ['1A', '1B'];
                }
                delete currentState.tableCount;
            }
            
            // Ensure tableNames exists
            if (!currentState.tableNames || !Array.isArray(currentState.tableNames) || currentState.tableNames.length === 0) {
                currentState.tableNames = ['1A', '1B'];
            }
            
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
        textDisplay.style.display = 'grid';
        timerDisplay.style.display = 'none';
        
        // Update event name
        if (eventName) {
            eventName.textContent = currentState.eventName || 'Your event name here!';
        }
        
        // Update custom text (hide if empty)
        if (customText) {
            if (currentState.customText) {
                customText.innerHTML = currentState.customText.replace(/\n/g, '<br>');
                customText.style.display = 'block';
            } else {
                customText.style.display = 'none';
            }
        }
        
        console.log('Text display updated - Event:', currentState.eventName, 'Custom:', currentState.customText);
    } else if (currentState.displayType === 'match-timer') {
        textDisplay.style.display = 'none';
        timerDisplay.style.display = 'grid';
        
        updateTimerDisplay();
        
        console.log('Timer display updated');
    }
    
    // Update marquee for both display types
    updateMarquee();
}

// Update timer display specifically
function updateTimerDisplay() {
    // Preserve 0 when match has finished; only fall back when value is null/undefined
    const time = (currentState.timerCurrentTime ?? TIMER_DURATION);
    timerTime.innerHTML = formatTime(time);
    
    // Remove all state classes
    timerTime.classList.remove('warning', 'critical');
    
    // Update match and team information
    updateMatchDisplay();
    
    // Update status and styling based on timer state
    // Visual emphasis only handled by timerTime classes; status text removed.
    if (currentState.timerState === 'running') {
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
    const tableNames = currentState.tableNames || ['1A', '1B'];
    const tableCount = tableNames.length;
    
    // Remove existing team-card elements
    const existing = timerDisplay.querySelectorAll('.team-card');
    existing.forEach(el => el.remove());

    // Insert before timer-container
    const timerContainer = timerDisplay.querySelector('.timer-container');
    if (!timerContainer) return;

    const teamColors = ['team-color-a', 'team-color-b', 'team-color-c', 'team-color-d'];
    tableNames.forEach((tableName, i) => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.dataset.slot = i;
        card.innerHTML = `
            <div class="team-info">
                <div class="team-number display-small">Team ${i+1}</div>
                <div class="team-name"></div>
            </div>
            <div class="table-name heading-large">${tableName}</div>`;
        timerDisplay.insertBefore(card, timerContainer);
    });

    // Adjust grid template dynamically based on table count
    const teamAreas = tableNames.map((_, i) => `team${i+1}`).join(' ');
    const timerAreas = tableNames.map(() => 'timer').join(' ');
    const brandAreas = tableNames.map(() => 'brand-bar').join(' ');
    timerDisplay.style.gridTemplate = `"${teamAreas}" auto "${timerAreas}" 1fr "${brandAreas}" auto`;
}

function updateMatchDisplay() {
    const currentMatchNumber = currentState.currentMatchNumber || 1;
    const matches = currentState.matches || [];
    const divider = document.querySelector('.match-divider');
    
    if (displayEventName) {
        displayEventName.textContent = currentState.eventName || '';
        // Show/hide divider based on whether event name exists
        if (divider) {
            divider.style.display = currentState.eventName ? 'block' : 'none';
        }
    }
    if (displayMatchNumber) displayMatchNumber.textContent = currentMatchNumber;
    if (displayMatchTotal) displayMatchTotal.textContent = matches.length || '--';

    // Only recreate team cards if table names changed
    const tableNamesString = JSON.stringify(currentState.tableNames || ['1A', '1B']);
    if (previousTableNames !== tableNamesString) {
        ensureTeamCards();
        previousTableNames = tableNamesString;
    }
    const currentMatch = matches.find(m => m.matchNumber === currentMatchNumber);
    const cards = timerDisplay.querySelectorAll('.team-card');
    const teams = currentState.teams || [];
    
    cards.forEach(card => {
        const slot = parseInt(card.dataset.slot, 10);
        const numEl = card.querySelector('.team-number');
        const nameEl = card.querySelector('.team-name');
        
        if (currentMatch && currentMatch.teams) {
            const teamNumber = currentMatch.teams[slot];
            if (teamNumber) {
                numEl.innerHTML = teamNumber;
                numEl.style.fontStyle = 'normal';
                
                // Find and display team name
                const teamData = teams.find(t => t.teamNumber === teamNumber);
                if (teamData && teamData.teamName) {
                    nameEl.textContent = teamData.teamName;
                    nameEl.style.display = 'block';
                } else {
                    nameEl.textContent = '';
                    nameEl.style.display = 'none';
                }
            } else {
                numEl.innerHTML = '<em> — </em>';
                numEl.style.fontStyle = 'italic';
                nameEl.textContent = '';
                nameEl.style.display = 'none';
            }
        } else {
            numEl.innerHTML = '<em> — </em>';
            numEl.style.fontStyle = 'italic';
            nameEl.textContent = '';
            nameEl.style.display = 'none';
        }
    });
}

// Update marquee with season logos and custom sponsor logos
function updateMarquee() {
    const marquees = document.querySelectorAll('.marquee');
    if (!marquees || marquees.length === 0) return;
    
    // Check if sponsor logos changed
    const currentLogosString = JSON.stringify(currentState.sponsorLogos || []);
    const sponsorLogosChanged = previousSponsorLogos !== currentLogosString;
    if (!sponsorLogosChanged) {
        return; // No need to update if logos haven't changed
    }
    previousSponsorLogos = currentLogosString;
    
    // Update each marquee (text display and timer display)
    marquees.forEach(marquee => {
        const isTextDisplay = marquee.closest('#textDisplay') !== null;
        const className = isTextDisplay ? 'marquee-content-text' : 'marquee-content';
        
        let content = '';
        
        if (isTextDisplay) {
            // Text display: Only sponsor logos
            content = (currentState.sponsorLogos || []).map((logo, index) => 
                `<img src="${logo}" alt="Sponsor ${index + 1}" class="custom-sponsor-logo">`
            ).join('');
        } else {
            // Match Timer display: Alternate between season logos and sponsor logos
            const seasonLogo1 = `<img id="logoFLL" src="media/firstlegoleague-logo-all-formats/FIRSTLEGOLeague-IconHorizontal/FIRSTLego_iconHorz_RGB.png" alt="FIRST LEGO League Logo">`;
            const seasonLogo2 = `<div id="fllLogoAndWordmark">
                <img id="logoUnearthed" src="media/unearthed-assets/first_age_fll_unearthed_logo_only_rgb_fullcolor.png" alt="FIRST LEGO League Unearthed Logo">
                <img id="wordmarkUnearthed" src="media/unearthed-assets/first_age_fll_unearthed_wordmark_rgb_black.png" alt="FIRST LEGO League Unearthed Wordmark">
            </div>`;
            
            const sponsorLogos = currentState.sponsorLogos || [];
            
            // Build alternating pattern
            const items = [];
            const maxLength = Math.max(4, sponsorLogos.length);
            
            for (let i = 0; i < maxLength; i++) {
                // Alternate season logos
                if (i % 2 === 0) {
                    items.push(seasonLogo1);
                } else {
                    items.push(seasonLogo2);
                }
                
                // Add sponsor logo if available
                if (i < sponsorLogos.length) {
                    items.push(`<img src="${sponsorLogos[i]}" alt="Sponsor ${i + 1}" class="custom-sponsor-logo">`);
                }
            }
            
            content = items.join('');
        }
        
        // Clear existing content
        marquee.innerHTML = '';
        
        // Create first marquee-content div
        const marqueeContent1 = document.createElement('div');
        marqueeContent1.className = className;
        marqueeContent1.innerHTML = content;
        marquee.appendChild(marqueeContent1);
        
        // Create duplicate for seamless scrolling
        const marqueeContent2 = document.createElement('div');
        marqueeContent2.className = className;
        marqueeContent2.setAttribute('aria-hidden', 'true');
        marqueeContent2.innerHTML = content;
        marquee.appendChild(marqueeContent2);
    });
}

// Listen for state changes from control page (cross-tab communication)
window.addEventListener('storage', (event) => {
    if (event.key === 'fll-timer-state') {
        if (event.newValue) {
            try {
                const newState = JSON.parse(event.newValue);
                // Check what changed to optimize updates
                const tableCountChanged = newState.tableCount !== currentState.tableCount;
                const sponsorLogosChanged = JSON.stringify(newState.sponsorLogos) !== JSON.stringify(currentState.sponsorLogos);
                
                currentState = newState;
                
                // Reset tracking if these changed
                if (tableCountChanged) previousTableCount = null;
                if (sponsorLogosChanged) previousSponsorLogos = null;
                
                updateDisplay();
                console.log('State updated from control page');
            } catch (error) {
                console.error('Error parsing updated state:', error);
            }
        } else {
            // State was cleared/reset
            previousTableCount = null;
            previousSponsorLogos = null;
            currentState = { ...defaultDisplayState };
            updateDisplay();
            console.log('State was reset');
        }
    }
});

// Handle page visibility changes to reload state when coming back to tab
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Reset tracking to force full update on visibility change
        previousTableCount = null;
        previousSponsorLogos = null;
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
