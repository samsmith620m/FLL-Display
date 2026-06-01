# FLL Timer — Instructions for AI Agents

## Before Making Any Code Changes

Read `ARCHITECTURE.md` first. It documents every system in this app and their interdependencies. This application has two pages that communicate via localStorage, a dual-timer design, sounds that only trigger on the display page, and several systems that share the same state object. Changes that seem isolated often aren't.

## After Making Changes

If your changes affect any system described in `ARCHITECTURE.md`, update the relevant section(s) before finishing. Keep the doc accurate — it's only useful if it reflects the current code.

**Update `ARCHITECTURE.md` when you:**
- Add, rename, or remove a key from `timerState` / `defaultState`
- Add a new timer state, display type, or timer mode
- Add, remove, or rewire a sound trigger
- Add a new modal
- Change the CSV import pipeline or match/team data structure
- Add or rename a CSS file or move styles between files
- Change how cross-tab communication works

## Critical Gotchas

- **State changes must go through `updateState(timerState)`** in `script.js`. This writes localStorage *and* dispatches a StorageEvent so the display page picks it up. Writing localStorage directly won't notify the display.
- **Sounds live in `display.js`**, not `script.js`. The control page only sets `soundOption`; the display page decides what plays.
- **Display type and timer mode changes are blocked while the timer is running.** If you add a new control that modifies these, respect that gate.
- **Adding a new `timerState` key requires updating `defaultState` in `script.js`** so `loadState()`'s spread merge correctly handles existing saved states. Also add a matching default in `defaultDisplayState` in `display.js` if the display page reads it.
- **`tableNames.length` drives team card count** (2 or 4 cards). It also determines the number of columns in the match schedule table and the length of each match's `teams` array.
- **CSS for the display page is in `css/display.css`**; control page layout is in `css/control.css`. Don't mix them.
- **`TIMER_DURATION` is defined in both `script.js` and `display.js`** and must match.
- **Always validate JS syntax after editing code.** When replacing code blocks in script.js, ensure braces are properly balanced. Use `node -c script.js` to check for syntax errors before considering edits complete.

## CSS Style

- **Use native CSS nesting syntax** for all new CSS. Nest pseudo-classes, child selectors, and modifier rules inside their parent block (e.g., `&:hover { }`, nested `.child { }` inside parent). No need to refactor existing flat rules, but all newly written CSS should use nesting.
