# FLL Timer — Architecture & Interdependency Reference

This document describes every major system in the application and how the pieces connect. Read it before making changes so you understand what else a change might affect.

---

## 1. Overview

A two-page web app for running FLL (FIRST LEGO League) match events:

- **Control page** (`index.html` + `script.js`) — used by the event operator to configure teams, matches, and the timer
- **Display page** (`display.html` + `display.js`) — opened in a separate window/tab, shown on the big screen at the event

Communication between the two pages is **one-way**: the control page writes to `localStorage`, the display page reads from it. There is no back-channel.

---

## 2. File Map

| File | Role |
|------|------|
| `index.html` | Control page markup — setup checklist, match timer controls, schedule table, teams table, event config, modals |
| `display.html` | Display page markup — minimal shell; JS builds all content dynamically |
| `script.js` | All control page logic (~2 200 lines) |
| `display.js` | All display page logic (~660 lines) |
| `styles.css` | Entry point — only `@import`s other CSS files |
| `css/design-system.css` | Design tokens, CSS variables, font faces (Digital-7 Mono, Roboto, Kalam) |
| `css/component-classes.css` | Buttons, form controls, badges, alerts, modals, tabs, cards |
| `css/tables.css` | Match and teams table styling |
| `css/control.css` | Control page layout, checklist card, radio containers, collapse animations, sponsor grid |
| `css/display.css` | Display page — team card layout/colors, timer styling, text display, marquee, animations, fullscreen button |
| `sounds/start.wav` | Plays when timer enters `running` state |
| `sounds/warning.wav` | Plays once when timer crosses ≤ 20 seconds |
| `sounds/end.wav` | Plays once when timer reaches 0 |
| `sounds/abort.wav` | Plays when timer is aborted (running → stopped) |
| `sounds/match_result.wav` | Unused — available for future use |
| `sounds/pick_clock.wav` | Unused — available for future use |
| `sounds/pick_clock_expired.wav` | Unused — available for future use |
| `sounds/resume.wav` | Unused — available for future use |

---

## 3. State Object (Single Source of Truth)

All persistent data lives in one object, `timerState` in `script.js`, serialized to `localStorage` under the key `fll-timer-state`.

```js
{
  // Display
  displayType: 'match-timer' | 'text',   // which display mode is active
  timerMode: 'scheduled' | 'timeronly',  // sub-mode of match-timer

  // Content
  eventName: string,                     // shown on display
  customText: string,                    // shown in text display mode
  soundOption: 'ftc' | 'none',           // whether sounds play

  // Sponsor logos
  sponsorLogos: string[],                // array of base64-encoded images

  // Teams
  teams: [{ teamNumber: string, teamName: string }],

  // Match schedule
  matches: [{
    matchNumber: number,
    teams: [teamNumber, teamNumber, ...]  // indices map to tableNames
  }],
  currentMatchNumber: number,            // which match is active
  tableNames: string[],                  // 1–4 entries; length drives team card count

  // Timer runtime
  timerState: 'stopped' | 'running' | 'finished',
  timerStartTime: number | null,         // Date.now() when timer started
  timerEndTime: number | null,           // Date.now() + remaining ms when timer started
  timerCurrentTime: number,              // seconds remaining (updated by control page every 1s)

  // UI collapse state
  isScheduleCollapsed: boolean,
  isTeamsCollapsed: boolean,
  isChecklistCollapsed: boolean,

  // Setup checklist
  checklist: {
    uploadSchedule: boolean,
    teams: boolean,
    matches: boolean,
    eventName: boolean,
    sponsors: boolean,
    display: boolean,
    customText: boolean,
    matchTimer: boolean,
    expandCollapse: boolean,
    soundOption: boolean
  }
}
```

**Key rules:**
- Always update state through `updateState(timerState)` in `script.js` — this writes to localStorage AND dispatches a `StorageEvent` so the display page picks it up.
- Never write `localStorage` directly outside of `saveState()`.
- When adding a new top-level key, add a default value in `defaultState` so `loadState()` merges it correctly for existing saved states.

---

## 4. Cross-Tab Communication

```
index.html (control)                   display.html (display)
     |                                       |
  updateState()                      window.addEventListener('storage', ...)
     |                                       |
  saveState()  ──── localStorage ──────>  loadState()
     |            'fll-timer-state'           |
  dispatchEvent(StorageEvent)          updateDisplay()
```

- **One-way only.** The display page never writes state.
- `updateState()` in `script.js` calls `saveState()` then dispatches a synthetic `StorageEvent` to work even within the same tab (localStorage events don't normally fire in the same window).
- The display page also reloads state on `visibilitychange` (when the tab regains focus).
- The control page calls `window.open('display.html', 'fll-display')` to open the display, and polls every 1 second to detect if the window was closed by the user.

---

## 5. Timer System

### States and Transitions

```
stopped ──[Start button]──> running ──[timer expires]──> finished
   ^                            |                            |
   |                     [Abort, after 3s]            [Reset button]
   └────────────────────────────┘────────────────────────────┘
```

- **`stopped`**: Default state. Start button is enabled and labeled "Start".
- **`running`**: Countdown active. Start button shows "Abort" (destructive). A 3-second window at the start prevents accidental aborts (`matchStartTimestamp` + `pointer-events: none`). Match navigation and display type changes are disabled while running.
- **`finished`**: Timer reached 0. Start button shows "Reset". Timer display pulsates.

### Dual Timers (important — do not collapse into one)

The control page and display page each run their own countdown:

- **Control page** (`timerInterval`): updates `timerState.timerCurrentTime` every 100ms for the control UI, but only calls `updateState()` (broadcasts) once per second to avoid flooding localStorage.
- **Display page** (`displayTimerInterval`): independently calculates remaining time from `timerEndTime` (a timestamp), so display stays smooth even when the control window is backgrounded or throttled.

### Configuration

`TIMER_DURATION` is defined at the top of both `script.js` and `display.js`. It is **150 seconds** (2:30) for official matches. Change it in both files when testing.

### Warning flag

`warningPlayed` (in `script.js`) prevents the warning sound trigger from being sent more than once per match. It is reset to `false` when a new match starts.

---

## 6. Sound System

**All sounds play in `display.js`, never in `script.js`.** The control page only sets `timerState.soundOption`; the display page decides whether and what to play.

| Sound | File | When | Guard |
|-------|------|------|-------|
| Start | `sounds/start.wav` | `timerState` transitions to `'running'` (previousTimerState ≠ 'running') | — |
| Warning | `sounds/warning.wav` | `timerCurrentTime` ≤ 20 and currently running | `warningSoundPlayed` flag |
| End | `sounds/end.wav` | `timerCurrentTime` reaches 0 | `endSoundPlayed` flag |
| Abort | `sounds/abort.wav` | `timerState` transitions from `'running'` to `'stopped'` | — |

`warningSoundPlayed` and `endSoundPlayed` are reset when `timerState` transitions back to `'stopped'`.

The `soundOption` gate: if `currentState.soundOption !== 'ftc'`, no sounds play.

Sounds are created inline via `new Audio('sounds/xyz.wav').play()` — no pre-loaded audio objects.

---

## 7. Display Types and Timer Modes

### Display Type (`displayType`)

Selected via radio buttons in `index.html`. Changing it while the timer is running is blocked.

| Value | What the Display Shows |
|-------|----------------------|
| `'match-timer'` | Team cards + central timer + match info + sponsor marquee |
| `'text'` | Event name/branding + large custom text (color-cycling animation) + sponsor marquee |

In `display.js`, `updateDisplay()` toggles `#textDisplay` and `#timerDisplay` based on `displayType`.

### Timer Mode (`timerMode`)

Sub-mode of `'match-timer'`. Also selected via radio in `index.html`.

| Value | Effect |
|-------|--------|
| `'scheduled'` | Shows team cards populated with team/match data; Previous/Next match navigation visible |
| `'timeronly'` | Hides team cards entirely; timer takes full screen; no match navigation |

### CSS Timer State Classes (applied to `#timerDisplay`)

| Class | Condition | Effect |
|-------|-----------|--------|
| `.warning` | `timerCurrentTime` ≤ 20 and running | Yellow timer text |
| `.critical` | `timerCurrentTime` ≤ 5 and running | Red timer text |
| `.pulsate` | `timerState === 'finished'` | Pulsating animation on timer |

---

## 8. Modals

All four modals follow the same pattern: `display: none` → `display: flex`, `document.body.classList.add('modal-open')`, close via close button or overlay click.

| Modal ID | Trigger | Reads State | Writes State |
|----------|---------|-------------|--------------|
| `#uploadScheduleModal` | "Upload Schedule" button | — | — (file selection leads to column mapping) |
| `#columnMappingModal` | After CSV file is selected | CSV headers | `matches`, `teams`, `tableNames`, `eventName` after import |
| `#translateHelpModal` | "Translate" help icon | — | — |
| `#fullscreenPromptModal` | Auto-shown on `display.html` load | — | — (enables audio autoplay by requiring a click) |

---

## 9. CSV Import Pipeline

```
1. User clicks "Upload Schedule" → uploadScheduleModal opens
2. User clicks "Select File" → file input triggers handleScheduleFile()
3. handleScheduleFile() reads file text → parseCSV() → smartGuessColumns()
4. If auto-detection succeeds → proceed; else showColumnMappingModal()
5. columnMappingModal shows headers as dropdowns; updateMappingPreview() shows live preview
6. User clicks "Import Data" → processCSVWithMapping()
7. buildMatchesFromRows() groups rows by start time → matches array
8. extractTeamsFromRows() deduplicates teams by teamNumber
9. tableNames auto-detected from unique "Room / Table Location" values
10. updateState(timerState) broadcasts to display
11. renderMatchSchedule() + renderTeams() refresh the UI
```

**Template download** (`downloadScheduleTemplateBtn`): generates an in-memory CSV blob with example rows (2 teams × 3 matches, 4 columns: Type, Start Time, Room / Table Location, Team Number, Team Name) and triggers a browser download of `schedule_template.csv`.

**Match grouping rule**: rows with the same `startTime` become one match; each row's `tableLocation` maps to a slot in `tableNames`.

---

## 10. Team & Match Data Model

```js
// Team
{ teamNumber: '12345', teamName: 'Team Alpha' }

// Match
{ matchNumber: 1, teams: ['12345', '67890', '', ''] }
// teams array length always equals tableNames.length
// Empty string = no team at that table for this match
```

`tableNames` drives everything:
- Its `length` determines how many team cards render on the display (2 or 4)
- Its `length` determines how many columns appear in the match schedule table
- Each `teams[i]` corresponds to `tableNames[i]`

Match dropdowns in the schedule table are populated from the `teams` array. If a team is deleted, any match slot referencing that team number becomes empty.

**Cheering feature** (display only): when a slot is empty and another team is competing in this match, that empty slot shows a "Good luck, [Team Name]!" message. The cheering assignment is hardcoded in `display.js`: slot 0 cheers for slots [1,2,3] in order; slot 1 cheers for [0,3,2]; etc.

---

## 11. Sponsor Logo System

- Logos are stored as **base64-encoded strings** in `timerState.sponsorLogos` (an array).
- The control page renders a drag-and-drop grid (`renderSponsorPreview()`). Drag handles use `handleDragStart` / `handleDragOver` / `handleDrop` / `handleDragEnd`.
- A built-in logo library (`availableLogos`, 7 entries) lets users add logos without uploading files. `addLogoFromLibrary()` fetches the image and converts it to base64.
- The display page's `updateMarquee()` renders logos as `<img>` tags in a scrolling `<marquee>`-style CSS animation.
- In `'text'` display mode, only sponsor logos show in the marquee. In `'match-timer'` mode, two FLL season logos are prepended before sponsor logos.

---

## 12. Setup Checklist

10 checklist items stored in `timerState.checklist`. Each is a boolean.

`autoCheckChecklistItems()` (called after every state change) auto-checks items based on state:
- `uploadSchedule`: matches.length > 0
- `teams`: teams.length > 0
- `matches`: matches.length > 0
- `eventName`: eventName.length > 0
- `sponsors`: sponsorLogos.length > 0
- `display`: (display window is open)
- `soundOption`: soundOption has been set

Items can also be manually toggled. `updateChecklistRainbow()` pulses a highlight on the next unchecked item's corresponding action button to guide the operator. The checklist is collapsible; collapse state persists via `timerState.isChecklistCollapsed`.

---

## 13. CSS Architecture

| File | Owns |
|------|------|
| `design-system.css` | All CSS variables (`--color-*`, `--spacing-*`, etc.), font faces |
| `component-classes.css` | Reusable classes: `.btn`, `.btn-primary`, `.btn-destructive`, `.badge`, `.alert`, `.modal`, etc. |
| `tables.css` | `.match-table`, `.teams-table` and their child elements |
| `control.css` | `#controlPage` layout, `.checklist-card`, `.radio-option-container`, collapse/expand keyframes |
| `display.css` | `#timerDisplay`, `#textDisplay`, `.team-card` (4 color variants), `.marquee-container`, `.pulsate` keyframe, `.fullscreen-btn` |

**Key animation classes (all in `display.css`):**
- `.pulsate` — applied to `#timerDisplay` when `timerState === 'finished'`
- `.warning` — yellow timer text (≤ 20s)
- `.critical` — red timer text (≤ 5s)
- `.cheering` — styling for empty-slot good-luck messages

**Team card color slots** (fixed by index, not configurable):
- Slot 0: Red
- Slot 1: Blue
- Slot 2: Green
- Slot 3: Yellow

---

## 14. Interdependency Quick-Reference

Use this table when changing a feature to identify what else you need to touch.

| If you change... | Also check / update |
|-----------------|-------------------|
| `timerState` fields | `defaultState` in `script.js`, `defaultDisplayState` in `display.js`, `loadState()` merge logic in both files |
| Timer states or transitions | Sound trigger logic in `display.js`, CSS classes in `display.css`, button label logic in `updateMatchControlButtons()` |
| Sound triggers | `display.js` sound section, `sounds/` directory, `soundOption` gate |
| `displayType` values | `updateDisplay()` in `display.js`, radio buttons in `index.html`, `getSelectedDisplayType()`/`setDisplayType()` in `script.js` |
| `timerMode` values | `updateDisplay()` in `display.js`, `setTimerMode()`/`applyTimerModeUI()` in `script.js`, team card rendering |
| `tableNames` | Match schedule table columns, team card count in `display.js`, `ensureTeamCards()` |
| Match data structure | `renderMatchSchedule()`, `updateMatchDisplay()` in `display.js`, CSV import (`buildMatchesFromRows()`) |
| Team data structure | `renderTeams()`, match dropdowns, `updateMatchDisplay()` in `display.js`, CSV import (`extractTeamsFromRows()`) |
| Sponsor logos | `renderSponsorPreview()`, `renderLogoLibrary()`, `updateMarquee()` in `display.js` |
| Modals | `component-classes.css` for styling, close button handlers, `modal-open` body class |
| CSV import columns | `smartGuessColumns()`, `buildMatchesFromRows()`, `extractTeamsFromRows()`, template download row headers |
| Checklist items | `defaultState.checklist`, `autoCheckChecklistItems()`, checklist HTML in `index.html` |
| CSS custom properties | `design-system.css` — changes cascade everywhere |
