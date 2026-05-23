# FLL Timer

A web-based event display system for FIRST LEGO League (FLL) tournaments. Manage match schedules, teams, and a synchronized big-screen display with live timer and sponsor branding.

## Features

- 🎮 Control page for event operators (schedule management, match timer, team configuration)
- 📺 Separate display page for the big screen at events
- 🔊 Audio cues for match timing (start, warning, end, abort)
- 🏆 Sponsor logo carousel
- 📊 CSV schedule import with intelligent column detection
- 🎯 Real-time timer sync across windows
- 📱 Responsive design for different event setups

## For AI Agents Working on This Code

**Before making changes, read [`ARCHITECTURE.md`](ARCHITECTURE.md)** to understand the system's interdependencies. This application has two communicating pages, dual-timer logic, sounds that only trigger on one page, and shared state that affects multiple systems. Changes that seem isolated often have hidden dependencies.

**After making changes that affect any documented system, update [`ARCHITECTURE.md`](ARCHITECTURE.md).** See [`CLAUDE.md`](CLAUDE.md) for critical gotchas.

## Getting Started

1. Open `index.html` in a modern web browser
2. Configure your event (add teams, upload a schedule, set event name)
3. Click "Open Display" to open the big-screen display in a separate window
4. Use the control page to navigate matches and start the timer

## Architecture

This project uses:
- **Control page** (`index.html` + `script.js`) — event operator interface
- **Display page** (`display.html` + `display.js`) — big-screen output
- **Cross-tab communication** via localStorage
- **Persistent state** stored in browser storage

For detailed system documentation, see `ARCHITECTURE.md`.
