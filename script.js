import scheduleData from './schedule.js';

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const prevMatchBtn = document.getElementById('prevMatch');
const nextMatchBtn = document.getElementById('nextMatch');
const currentMatchDisplay = document.getElementById('currentMatch');
const team1Display = document.getElementById('team1');
const team2Display = document.getElementById('team2');
const team3Display = document.getElementById('team3');
const team4Display = document.getElementById('team4');
const menuBtn = document.getElementById('menuBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const scheduleTableBody = document.getElementById('scheduleTableBody');
const addMatchBtn = document.getElementById('addMatchBtn');
const discardChangesBtn = document.getElementById('discardChangesBtn');
const saveChangesBtn = document.getElementById('saveChangesBtn');

let originalSchedule = [];
let editedSchedule = [];
let timeLeft = 150; // 2 minutes and 30 seconds in seconds
let timerId;
let schedule = [];
let currentMatch = 1;

async function loadSchedule() {
    schedule = await scheduleData.getSchedule();
    updateMatchDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateMatchDisplay() {
    const match = schedule[currentMatch - 1];
    if (match) {
        currentMatchDisplay.textContent = `Match ${match.match}`;
        team1Display.textContent = `${match.team1}`;
        team2Display.textContent = `${match.team2}`;
        team3Display.textContent = `${match.team3}`;
        team4Display.textContent = `${match.team4}`;
    }
}

function startTimer() {
    startBtn.disabled = true;
    timerId = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft === 0) {
            clearInterval(timerId);
            startBtn.disabled = false;
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerId);
    timeLeft = 150;
    updateTimerDisplay();
    startBtn.disabled = false;
}

function prevMatch() {
    if (currentMatch > 1) {
        currentMatch--;
        updateMatchDisplay();
        resetTimer();
        if (currentMatch === 1) {
            prevMatchBtn.disabled = true;
        }
        nextMatchBtn.disabled = false;
    }
}

function nextMatch() {
    if (currentMatch < schedule.length) {
        currentMatch++;
        updateMatchDisplay();
        resetTimer();
        if (currentMatch === schedule.length) {
            nextMatchBtn.disabled = true;
        }
        prevMatchBtn.disabled = false;
    }
}

function renderScheduleTable() {
    scheduleTableBody.innerHTML = '';
    editedSchedule.forEach((match) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${match.match}</td>
            <td><input type="number" value="${match.team1}" data-match="${match.match}" data-team="1"></td>
            <td><input type="number" value="${match.team2}" data-match="${match.match}" data-team="2"></td>
            <td><input type="number" value="${match.team3}" data-match="${match.match}" data-team="3"></td>
            <td><input type="number" value="${match.team4}" data-match="${match.match}" data-team="4"></td>
            <td><button class="delete-btn" data-match="${match.match}">Delete</button></td>
        `;
        scheduleTableBody.appendChild(row);
    });
}

function openMenu() {
    modalOverlay.style.display = 'flex';
    originalSchedule = JSON.parse(JSON.stringify(schedule));
    editedSchedule = JSON.parse(JSON.stringify(schedule));
    renderScheduleTable();
}

function closeMenu() {
    modalOverlay.style.display = 'none';
    updateMatchDisplay();
}

function addNewMatch() {
    const newMatch = {
        match: editedSchedule.length + 1,
        team1: 0,
        team2: 0,
        team3: 0,
        team4: 0
    };
    editedSchedule.push(newMatch);
    renderScheduleTable();
}

function updateMatch(matchNumber, teamNumber, value) {
    const matchIndex = editedSchedule.findIndex(match => match.match === matchNumber);
    if (matchIndex !== -1) {
        editedSchedule[matchIndex][`team${teamNumber}`] = parseInt(value);
    }
}

function deleteMatch(matchNumber) {
    editedSchedule = editedSchedule.filter(match => match.match !== matchNumber);
    editedSchedule.forEach((match, index) => {
        match.match = index + 1;
    });
    renderScheduleTable();
}

function discardChanges() {
    editedSchedule = JSON.parse(JSON.stringify(originalSchedule));
    closeMenu();
}

async function saveChanges() {
    schedule = JSON.parse(JSON.stringify(editedSchedule));
    await scheduleData.updateFullSchedule(schedule);
    closeMenu();
}

// Event Listeners
startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
prevMatchBtn.addEventListener('click', prevMatch);
nextMatchBtn.addEventListener('click', nextMatch);
menuBtn.addEventListener('click', openMenu);
closeMenuBtn.addEventListener('click', closeMenu);
addMatchBtn.addEventListener('click', addNewMatch);
discardChangesBtn.addEventListener('click', discardChanges);
saveChangesBtn.addEventListener('click', saveChanges);

scheduleTableBody.addEventListener('input', (event) => {
    if (event.target.tagName === 'INPUT') {
        const matchNumber = parseInt(event.target.dataset.match);
        const teamNumber = parseInt(event.target.dataset.team);
        const value = event.target.value;
        updateMatch(matchNumber, teamNumber, value);
    }
});

scheduleTableBody.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const matchNumber = parseInt(event.target.dataset.match);
        deleteMatch(matchNumber);
    }
});

modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeMenu();
    }
});
// Initial load
loadSchedule().then(() => {
    updateTimerDisplay();
    updateMatchDisplay();
    prevMatchBtn.disabled = true;
});

