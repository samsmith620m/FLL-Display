const scheduleData = {
    scheduleList: [
        { match: 1, team1: 1, team2: 2, team3: 3, team4: 4 },
        { match: 2, team1: 5, team2: 6, team3: 7, team4: 8 }
    ],

    init: function() {
        const savedSchedule = localStorage.getItem('scheduleList');
        if (savedSchedule) {
            this.scheduleList = JSON.parse(savedSchedule);
        }
    },

    saveToLocalStorage: function() {
        localStorage.setItem('scheduleList', JSON.stringify(this.scheduleList));
    },
    
    getSchedule: async function() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.scheduleList);
            }, 100);
        });
    },

    addMatch: function(match, team1, team2, team3, team4) {
        this.scheduleList.push({ match, team1, team2, team3, team4 });
        this.scheduleList.sort((a, b) => a.match - b.match);
        this.saveToLocalStorage();
    },

    removeMatch: function(matchNumber) {
        this.scheduleList = this.scheduleList.filter(match => match.match !== matchNumber);
        this.saveToLocalStorage();
    },

    updateMatch: function(matchNumber, team1, team2, team3, team4) {
        const matchIndex = this.scheduleList.findIndex(match => match.match === matchNumber);
        if (matchIndex !== -1) {
            this.scheduleList[matchIndex] = { match: matchNumber, team1, team2, team3, team4 };
            this.saveToLocalStorage();
        }
    },

    updateFullSchedule: function(newSchedule) {
        this.scheduleList = newSchedule;
        this.saveToLocalStorage();
    }
};

// Initialize the schedule data from local storage
scheduleData.init();
export default scheduleData;
