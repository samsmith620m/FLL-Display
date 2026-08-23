// FLL Timer Display Page — Before editing, read ARCHITECTURE.md for interdependencies
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
    sponsorLogos: [],
    uploadedSponsorLogos: [],
    customFllLogos: [],
    selectedFllLogo: 'default',
    customSeasonWordmarks: [],
    selectedSeasonWordmark: 'default',
    seasonWordmarkGap: 0,
};

// Current state
let currentState = { ...defaultDisplayState };

// Track previous state to avoid unnecessary DOM recreation
let previousTableNames = null;
let previousSponsorLogos = null;

const FLL_DEFAULT_LOGO_SRC = 'media/firstlegoleague-logo-all-formats/FIRSTLEGOLeague-IconHorizontal/FIRSTLego_iconHorz_RGB.png';
const SEASON_DEFAULT_WORDMARK_SRC = 'media/fll-bioglow-assets/first_canopy_fll_bioglow_logo_horizontal_rgb_fullcolor.png';

function getLogoSrc(customLogos, selectedValue, defaultSrc) {
    if (selectedValue !== 'default' && customLogos?.[selectedValue]) {
        return customLogos[selectedValue];
    }
    return defaultSrc;
}

function updateBrandingLogos(state) {
    const fllImg = document.getElementById('logoFLL');
    const wordmarkImg = document.getElementById('wordmarkSeason');
    if (fllImg) fllImg.src = getLogoSrc(state.customFllLogos, state.selectedFllLogo, FLL_DEFAULT_LOGO_SRC);
    if (wordmarkImg) {
        wordmarkImg.src = getLogoSrc(state.customSeasonWordmarks, state.selectedSeasonWordmark, SEASON_DEFAULT_WORDMARK_SRC);
        if (state.selectedSeasonWordmark !== 'default') {
            wordmarkImg.style.marginLeft = `${state.seasonWordmarkGap ?? 0}vh`;
            wordmarkImg.style.marginRight = '0';
        } else {
            wordmarkImg.style.marginLeft = '';
            wordmarkImg.style.marginRight = '';
        }
    }
}

// Display timer interval for smooth countdown
let displayTimerInterval = null;

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

function isRoundMarker(item) {
    return item?.type === 'round-marker';
}

function getRoundLabel(match, matchIndex) {
    const roundNumber = match?.roundNumber || 1;
    const roundMatchNumber = match?.roundMatchNumber || (matchIndex + 1);
    return `Round ${roundNumber}, Match ${roundMatchNumber}`;
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
    updateBrandingLogos(currentState);
}

// Track whether sounds have been played
let warningSoundPlayed = false;
let endSoundPlayed = false;

// Start display's own countdown timer for smooth animation
function startDisplayTimer() {
    // Clear any existing timer (shouldn't happen with proper state management)
    if (displayTimerInterval) {
        clearInterval(displayTimerInterval);
        displayTimerInterval = null;
    }
    
    // Reset sound flags when starting a new timer
    warningSoundPlayed = false;
    endSoundPlayed = false;
    
    // Play start sound if sound is enabled
    if (currentState.soundOption === 'ftc') {
        const startSound = new Audio('sounds/start.wav');
        startSound.play().catch(err => console.error('Error playing start sound:', err));
    }
    
    displayTimerInterval = setInterval(() => {
        if (currentState.timerState === 'running' && currentState.timerEndTime) {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((currentState.timerEndTime - now) / 1000));
            
            // Update display with calculated time
            timerTime.innerHTML = formatTime(remaining);
            
            // Remove all state classes
            timerTime.classList.remove('warning', 'critical', 'pulsate');
            
            // Update styling based on time
            if (remaining === 0) {
                timerTime.classList.add('critical', 'pulsate');
                
                // Play end sound once when timer reaches 0
                if (!endSoundPlayed && currentState.soundOption === 'ftc') {
                    const endSound = new Audio('sounds/end.wav');
                    endSound.play().catch(err => console.error('Error playing end sound:', err));
                    endSoundPlayed = true;
                }
            } else if (remaining <= 5) {
                timerTime.classList.add('critical');
            } else if (remaining <= 30) {
                timerTime.classList.add('warning');
                
                // Play warning sound once when crossing 30 second threshold
                if (!warningSoundPlayed && currentState.soundOption === 'ftc') {
                    const warningSound = new Audio('sounds/warning.wav');
                    warningSound.play().catch(err => console.error('Error playing warning sound:', err));
                    warningSoundPlayed = true;
                }
            }
            
            // Reset warning sound flag when timer is above 30 seconds
            if (remaining > 30) {
                warningSoundPlayed = false;
            }
        }
    }, 100); // Update every 100ms for smooth countdown
}

// Stop display timer
function stopDisplayTimer() {
    if (displayTimerInterval) {
        clearInterval(displayTimerInterval);
        displayTimerInterval = null;
    }
    endSoundPlayed = false;
}

// Track previous timer state to detect transitions
let previousTimerState = null;

// Update timer display specifically
function updateTimerDisplay() {
    // Preserve 0 when match has finished; only fall back when value is null/undefined
    const time = (currentState.timerCurrentTime ?? TIMER_DURATION);
    timerTime.innerHTML = formatTime(time);
    
    // Remove all state classes (but keep pulsate if timer is at 0 and finished)
    timerTime.classList.remove('warning', 'critical');
    if (currentState.timerState !== 'finished' || time !== 0) {
        timerTime.classList.remove('pulsate');
    }
    
    // Update match and team information
    updateMatchDisplay();
    
    // Handle timer state changes
    if (currentState.timerState === 'running') {
        // Only start the timer if transitioning from a non-running state
        if (previousTimerState !== 'running') {
            startDisplayTimer();
        }
        
        // Initial styling
        if (time <= 5) {
            timerTime.classList.add('critical');
        } else if (time <= 30) {
            timerTime.classList.add('warning');
        }
    } else {
        // Check if timer was aborted (transitioned from running to stopped)
        if (previousTimerState === 'running' && currentState.timerState === 'stopped' && currentState.soundOption === 'ftc') {
            const abortSound = new Audio('sounds/abort.wav');
            abortSound.play().catch(err => console.error('Error playing abort sound:', err));
        }
        
        stopDisplayTimer();
        warningSoundPlayed = false;
        endSoundPlayed = false;
        
        if (currentState.timerState === 'finished') {
            timerTime.classList.add('critical');
            if (time === 0) {
                timerTime.classList.add('pulsate');
            }
        } else {
            // Remove pulsate when resetting/stopping
            timerTime.classList.remove('pulsate');
        }
    }
    
    // Update previous state for next comparison
    previousTimerState = currentState.timerState;
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

    // Timer only mode: no cards, timer spans full width
    if (currentState.timerMode === 'timeronly') {
        timerDisplay.style.gridTemplate = '"timer" 1fr "brand-bar" auto';
        timerDisplay.style.gridTemplateColumns = '1fr';
        timerDisplay.style.paddingTop = '4vh';
        const timerContainer = timerDisplay.querySelector('.timer-container');
        if (timerContainer) 
            timerContainer.style.gap = '12vh'
            timerContainer.style.paddingTop = '7vh';
            timerContainer.style.paddingBottom = '0vh';
        const timerTime = timerDisplay.querySelector('.timer-time');
        if (timerTime) timerTime.style.fontSize = '79vh';
        return;
    }

    const teamColors = ['team-color-a', 'team-color-b', 'team-color-c', 'team-color-d'];
    tableNames.forEach((tableName, i) => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.dataset.slot = i;
        card.innerHTML = `
            <div class="team-info">
                <div class="team-number display-small">Team ${i+1}</div>
                <div class="team-name" translate="no"><span class="team-name-inner"></span></div>
                <div class="cheering-message" style="display: none;">
                    <em><span translate="no">🎉</span>&nbsp;<span class="cheering-prefix">Good luck,</span><br/><span class="cheering-name-line"><span class="cheering-name-inner"><span class="cheering-team-name" translate="no"></span>!</span></span></em>
                </div>
            </div>
            <div class="table-name heading-large" translate="no">${tableName}</div>`;
        timerDisplay.insertBefore(card, timerContainer);
    });

    // Adjust grid template dynamically based on table count
    const teamAreas = tableNames.map((_, i) => `team${i+1}`).join(' ');
    const timerAreas = tableNames.map(() => 'timer').join(' ');
    const brandAreas = tableNames.map(() => 'brand-bar').join(' ');
    timerDisplay.style.gridTemplate = `"${teamAreas}" auto "${timerAreas}" 1fr "${brandAreas}" auto`;
    timerDisplay.style.gridTemplateColumns = `repeat(${tableNames.length}, 1fr)`;
    timerDisplay.style.paddingTop = '0';
    if (timerContainer) 
        timerContainer.style.gap = '2vh';
        timerContainer.style.paddingTop = '4vh';
        timerContainer.style.paddingBottom = '4vh';
    const timerTime = timerDisplay.querySelector('.timer-time');
    if (timerTime) timerTime.style.fontSize = '59vh';
}

// Set a team-name's text and start/stop its bounce marquee based on whether it overflows the card
function setTeamNameText(nameEl, html, isHtml = false) {
    const inner = nameEl.querySelector('.team-name-inner');
    if (!inner) return;
    if (isHtml) {
        inner.innerHTML = html;
    } else {
        inner.textContent = html;
    }
    updateNameMarquee(nameEl);
}

// Shared bounce-marquee logic for any container/inner pair whose text may overflow its fixed-width box
function updateOverflowMarquee(containerEl, innerEl) {
    if (!containerEl || !innerEl) return;
    innerEl.classList.remove('overflowing');
    innerEl.style.removeProperty('--marquee-distance');
    innerEl.style.removeProperty('--marquee-duration');

    const overflow = innerEl.scrollWidth - containerEl.clientWidth;
    if (overflow > 1) {
        const pxPerSecond = 40;
        const pauseSeconds = 3; // combined pause time at both ends of the bounce
        const duration = (overflow / pxPerSecond) * 2 + pauseSeconds;
        innerEl.style.setProperty('--marquee-distance', `${overflow}px`);
        innerEl.style.setProperty('--marquee-duration', `${duration}s`);
        innerEl.classList.add('overflowing');
    }
}

function updateNameMarquee(nameEl) {
    if (!nameEl) return;
    updateOverflowMarquee(nameEl, nameEl.querySelector('.team-name-inner'));
}

function updateAllNameMarquees() {
    document.querySelectorAll('.team-name').forEach(updateNameMarquee);
    document.querySelectorAll('.cheering-name-line').forEach(line =>
        updateOverflowMarquee(line, line.querySelector('.cheering-name-inner')));
}

function updateMatchDisplay() {
    const matches = (currentState.matches || []).filter(match => !isRoundMarker(match));
    const currentMatchNumber = currentState.currentMatchNumber || 1;
    const divider = document.querySelector('.match-divider');
    const isSimple = currentState.timerMode === 'timeronly';

    if (displayEventName) {
        displayEventName.textContent = currentState.eventName || '';
        if (divider) {
            divider.style.display = (!isSimple && currentState.eventName) ? 'block' : 'none';
        }
    }

    const matchNumberSpan = displayMatchNumber ? displayMatchNumber.parentElement : null;
    if (matchNumberSpan) matchNumberSpan.style.display = isSimple ? 'none' : '';
    const currentMatchIndex = matches.findIndex(match => match.matchNumber === currentMatchNumber);
    const currentMatch = matches[currentMatchIndex];
    if (displayMatchNumber) displayMatchNumber.textContent = !isSimple
        ? getRoundLabel(currentMatch, currentMatchIndex)
        : '--';
    if (displayMatchTotal) displayMatchTotal.textContent = matches.length || '--';

    // Only recreate team cards if table names or timer mode changed
    const tableNamesString = JSON.stringify(currentState.tableNames || ['1A', '1B'])
        + '|' + (currentState.timerMode || 'scheduled');
    if (previousTableNames !== tableNamesString) {
        ensureTeamCards();
        previousTableNames = tableNamesString;
    }
    const cards = timerDisplay.querySelectorAll('.team-card');
    const teams = currentState.teams || [];
    
    // Define cheering order for each slot (0-indexed)
    const cheeringOrder = [
        [1, 2, 3], // Slot 0 cheers for slots 1, 2, 3
        [0, 3, 2], // Slot 1 cheers for slots 0, 3, 2
        [3, 0, 1], // Slot 2 cheers for slots 3, 0, 1
        [2, 1, 0]  // Slot 3 cheers for slots 2, 1, 0
    ];
    
    cards.forEach(card => {
        const slot = parseInt(card.dataset.slot, 10);
        const numEl = card.querySelector('.team-number');
        const nameEl = card.querySelector('.team-name');
        const teamInfoEl = card.querySelector('.team-info');
        const cheeringMessageEl = card.querySelector('.cheering-message');
        
        if (currentMatch && currentMatch.teams) {
            const teamNumber = currentMatch.teams[slot];
            if (teamNumber) {
                // Slot has a team - remove cheering class and hide cheering message
                teamInfoEl.classList.remove('cheering');
                if (cheeringMessageEl) cheeringMessageEl.style.display = 'none';
                numEl.innerHTML = teamNumber;
                numEl.style.display = 'block';
                
                // Find and display team name
                const teamData = teams.find(t => t.teamNumber === teamNumber);
                if (teamData && teamData.teamName) {
                    nameEl.style.display = 'block';
                    setTeamNameText(nameEl, teamData.teamName);
                } else {
                    nameEl.style.display = 'none';
                    setTeamNameText(nameEl, '');
                }
            } else {
                // Slot is empty - check if should be cheering
                const cheeringForSlot = cheeringOrder[slot]?.find(cheerSlot => 
                    currentMatch.teams[cheerSlot] && currentMatch.teams[cheerSlot] !== ''
                );
                
                if (cheeringForSlot !== undefined) {
                    teamInfoEl.classList.add('cheering');
                    
                    // Find the team name they're cheering for
                    const cheeringTeamNumber = currentMatch.teams[cheeringForSlot];
                    const cheeringTeamData = teams.find(t => t.teamNumber === cheeringTeamNumber);
                    const cheeringTeamName = cheeringTeamData?.teamName || `Team ${cheeringTeamNumber}`;
                    
                    // Show cheering message with team name, hide regular team name
                    const cheeringTeamNameEl = card.querySelector('.cheering-team-name');
                    if (cheeringMessageEl && cheeringTeamNameEl) {
                        cheeringTeamNameEl.textContent = cheeringTeamName;
                        cheeringMessageEl.style.display = 'block';
                        updateOverflowMarquee(card.querySelector('.cheering-name-line'), card.querySelector('.cheering-name-inner'));
                    }
                    
                    numEl.innerHTML = '';
                    numEl.style.display = 'none';
                    nameEl.style.display = 'none';
                } else {
                    teamInfoEl.classList.remove('cheering');
                    if (cheeringMessageEl) cheeringMessageEl.style.display = 'none';
                    numEl.style.display = 'block';
                    nameEl.style.display = 'block';
                    setTeamNameText(nameEl, '<em> — </em>', true);
                }
            }
        } else {
            // No match data - remove cheering
            teamInfoEl.classList.remove('cheering');
            numEl.innerHTML = '<em> — </em>';
            numEl.style.display = 'block';
            setTeamNameText(nameEl, '');
            nameEl.style.display = 'none';
        }
    });

    // Grid columns stay equal 1fr tracks (set by ensureTeamCards) regardless of cheering state; re-measure overflow after any content change
    updateAllNameMarquees();
}

// Update marquee with season logos and custom sponsor logos
function updateMarquee() {
    const marquees = document.querySelectorAll('.marquee');
    if (!marquees || marquees.length === 0) return;

    // Check if any marquee-relevant state changed
    const currentLogosString = JSON.stringify([
        currentState.sponsorLogos || [],
        currentState.selectedFllLogo,
        currentState.selectedSeasonWordmark,
        currentState.customFllLogos || [],
        currentState.customSeasonWordmarks || [],
        currentState.seasonWordmarkGap ?? 0,
    ]);
    const sponsorLogosChanged = previousSponsorLogos !== currentLogosString;
    if (!sponsorLogosChanged) {
        return;
    }
    previousSponsorLogos = currentLogosString;

    const fllLogoSrc = getLogoSrc(currentState.customFllLogos, currentState.selectedFllLogo, FLL_DEFAULT_LOGO_SRC);
    const seasonWordmarkSrc = getLogoSrc(currentState.customSeasonWordmarks, currentState.selectedSeasonWordmark, SEASON_DEFAULT_WORDMARK_SRC);

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
            const seasonLogo1 = `<img id="logoFLL" src="${fllLogoSrc}" alt="FIRST LEGO League Logo">`;
            const wordmarkMargin = currentState.selectedSeasonWordmark !== 'default'
                ? `style="margin-left:${currentState.seasonWordmarkGap ?? 0}vh;margin-right:0"`
                : '';
            const seasonLogo2 = `<div id="fllLogoAndWordmark">
                <img id="wordmarkSeason" src="${seasonWordmarkSrc}" alt="Season Wordmark" ${wordmarkMargin}>
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

// Re-check team-name overflow when the viewport changes card widths
let marqueeResizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(marqueeResizeTimeout);
    marqueeResizeTimeout = setTimeout(updateAllNameMarquees, 200);
});

// Listen for state changes from control page (cross-tab communication)
window.addEventListener('storage', (event) => {
    if (event.key === 'fll-timer-state') {
        if (event.newValue) {
            try {
                const newState = JSON.parse(event.newValue);
                // Check what changed to optimize updates
                const tableCountChanged = newState.tableCount !== currentState.tableCount;
                const sponsorLogosChanged = JSON.stringify(newState.sponsorLogos) !== JSON.stringify(currentState.sponsorLogos);
                const logoSelectionChanged =
                    newState.selectedFllLogo !== currentState.selectedFllLogo ||
                    newState.selectedSeasonWordmark !== currentState.selectedSeasonWordmark ||
                    newState.seasonWordmarkGap !== currentState.seasonWordmarkGap ||
                    JSON.stringify(newState.customFllLogos) !== JSON.stringify(currentState.customFllLogos) ||
                    JSON.stringify(newState.customSeasonWordmarks) !== JSON.stringify(currentState.customSeasonWordmarks);

                currentState = newState;

                // Reset tracking if these changed
                if (tableCountChanged) previousTableCount = null;
                if (sponsorLogosChanged || logoSelectionChanged) previousSponsorLogos = null;
                
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

// Fullscreen button with cursor-based visibility
const fullscreenBtn = document.getElementById('fullscreenBtn');
const fullscreenBtnText = document.getElementById('fullscreenBtnText');
const fullscreenBtnIcon = fullscreenBtn?.querySelector('.material-symbols-rounded');
const fullscreenTextEnter = document.getElementById('fullscreenTextEnter');
const fullscreenTextExit = document.getElementById('fullscreenTextExit');
let hideTimeout;

if (fullscreenBtn) {
    // Update button text/icon based on fullscreen state
    function updateFullscreenButton() {
        if (document.fullscreenElement) {
            fullscreenBtnText.textContent = fullscreenTextExit?.textContent || 'Exit Fullscreen';
            fullscreenBtnIcon.textContent = 'fullscreen_exit';
        } else {
            fullscreenBtnText.textContent = fullscreenTextEnter?.textContent || 'Go Fullscreen!';
            fullscreenBtnIcon.textContent = 'fullscreen';
        }
    }

    // Show button on mouse move, hide after inactivity
    function showButton() {
        clearTimeout(hideTimeout);
        fullscreenBtn.classList.remove('hide');
        fullscreenBtn.classList.add('show');
        
        hideTimeout = setTimeout(() => {
            fullscreenBtn.classList.remove('show');
            fullscreenBtn.classList.add('hide');
        }, 1000); // Hide after 2 seconds of inactivity
    }

    // Toggle fullscreen
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.log('Exit fullscreen failed:', err);
            });
        }
    });

    // Listen for mouse movement
    document.addEventListener('mousemove', showButton);

    // Update button when fullscreen state changes
    document.addEventListener('fullscreenchange', updateFullscreenButton);

    // Initial button state
    updateFullscreenButton();
}

// Fullscreen Prompt Modal - triggers on page load to enable autoplay audio
const fullscreenPromptModal = document.getElementById('fullscreenPromptModal');
const fullscreenPromptYes = document.getElementById('fullscreenPromptYes');
const fullscreenPromptNo = document.getElementById('fullscreenPromptNo');

if (fullscreenPromptModal && fullscreenPromptYes && fullscreenPromptNo) {
    function closeFullscreenPromptModal() {
        fullscreenPromptModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }

    // Go Fullscreen button
    fullscreenPromptYes.addEventListener('click', () => {
        closeFullscreenPromptModal();
        // Request fullscreen
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        }
    });

    // Not yet button
    fullscreenPromptNo.addEventListener('click', () => {
        closeFullscreenPromptModal();
    });

    // Close modal when clicking outside (on the overlay)
    fullscreenPromptModal.addEventListener('click', (e) => {
        if (e.target === fullscreenPromptModal) {
            closeFullscreenPromptModal();
        }
    });
}

// Show connection status for debugging
console.log('Display ready for real-time updates from control page');
