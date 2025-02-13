import {getCSRFToken, getAccessToken} from './auth.js';

export async function displayMatchHistory(gameMode) {
    const accessToken = getAccessToken();
    if (!accessToken) {
        console.warn("No access token found.");
        return;
    }
    const matchHistoryBody = document.getElementById('match-history-body');
    displayMatchHistoryHead(gameMode);
    try {
        let response = await fetch('/user-api/game-history?' +
            new URLSearchParams({ limit: '10', gameMode: gameMode}).toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'X-CSRFToken': getCSRFToken(),
                },
                credentials: 'include',
            });

        if (response.status === 401) {
            console.warn("Unauthorized. Refreshing token...");
            const refreshed = await refreshAccessToken();
            if (refreshed) return displayMatchHistory();
        }

        if (!response.ok) throw new Error(`Failed to fetch match history: ${response.status}`);

        const json = await response.json();
        const games = json.results;

        if (!games || games.length === 0) {
            console.warn("No match history found.");
            matchHistoryBody.innerHTML = '<tr><td colspan="5">No match history available.</td></tr>';
            return;
        }
        matchHistoryBody.innerHTML = '';
        switch (gameMode){
            case 'two-player-pong':
                genPongTableBody(games, matchHistoryBody);
                break;
            case 'pac-pong':
                genPacPongTableBody(games, matchHistoryBody);
                break;
            case 'four-player-tournament':
                genTournamentTableBody(games, matchHistoryBody);
                break;
        }
    } catch (error) {
        console.error(error.message);
    }
}

function getGameStatus(score, playerIdx){
    const gameStatusCell = document.createElement('td');
    if (score[playerIdx] == Math.max(score) && score[playerIdx] == Math.min(score)){
        gameStatusCell.textContent = 'Draw';
        gameStatusCell.style.color = 'yellow';
    } else if (score[playerIdx] == Math.max(score)){
        gameStatusCell.textContent = 'Win';
        gameStatusCell.style.color = 'green';
    } else {
        gameStatusCell.textContent = 'Lost';
        gameStatusCell.style.color = 'red';
    }
    return (gameStatusCell);
}

async function displayMatchHistoryHead(gameMode) {
    const tableHeaders = {
        "two-player-pong": ["Date", "Opponent", "Score", "Result"],
        "pac-pong": ["Date", "Left", "Pacman", "Right", "Score", "Result"],
        "four-player-tournament": ["Date", "Name", "Winner", "Second", "Third", "Forth"]
    };
    const matchHistoryHead = document.getElementById("match-history-head");
    matchHistoryHead.innerHTML = "";
    const headerRow = document.createElement("tr");
    tableHeaders[gameMode].forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    matchHistoryHead.appendChild(headerRow);
}

// Cells are ["Date", "Opponent", "Score", "Result"]
async function genPongTableBody(games, matchHistoryBody) {
    games.forEach(game => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(game.dateTime).toLocaleString();
        row.appendChild(dateCell);

        const opponentCell = document.createElement('td');
        const scoreCell = document.createElement('td');
        let gameStatusCell;
        const username = document.getElementById('username').textContent;

        if (game.players[0] === username) {
            opponentCell.textContent = game.players[1];
            scoreCell.textContent = game.score[0] + '-' + game.score[1];
            gameStatusCell = getGameStatus(game.score, 0);
        } else if (game.players[1] === username) {
            opponentCell.textContent = game.players[0];
            scoreCell.textContent = game.score[1] + '-' + game.score[0];
            gameStatusCell = getGameStatus(game.score, 1);
        } else {
            console.error(`Game with id ${game.id} can't be connected to current user: ${username}. PLAYERS: ${game.players[0]}, ${game.players[1]}`);
            return;
        }
        row.appendChild(opponentCell);
        row.appendChild(scoreCell);
        row.appendChild(gameStatusCell);
        matchHistoryBody.appendChild(row);
    });
}

// Cells are ["Date", "Left", "Pacman", "Right", "Score", "Result"]
async function genPacPongTableBody(games, matchHistoryBody) {
    games.forEach(game => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(game.dateTime).toLocaleString();

        const leftCell = document.createElement('td');
        leftCell.textContent = game.players[0];
        const pacCell = document.createElement('td');
        pacCell.textContent = game.players[1];
        const rightCell = document.createElement('td');
        rightCell.textContent = game.players[2];
        const scoreCell = document.createElement('td');
        scoreCell.textContent = game.score[0] + '-' + game.score[1] + '-' + game.score[2];
        let resultCell;
        const username = document.getElementById('username').textContent;
        if (game.players[0] === username) {
            resultCell = getGameStatus(game.score, 0);
        } else if (game.players[1] === username) {
            resultCell = getGameStatus(game.score, 1);
        } else if (game.players[2] === username) {
            resultCell = getGameStatus(game.score, 2);
        } else {
            console.error(`Game with id ${game.id} can't be connected to current user: ${username}. PLAYERS: ${game.players[0]}, ${game.players[1]}`);
            return;
        }
        row.appendChild(dateCell);
        row.appendChild(leftCell);
        row.appendChild(pacCell);
        row.appendChild(rightCell);
        row.appendChild(scoreCell);
        row.appendChild(resultCell);
        matchHistoryBody.appendChild(row);
    });
}

function getPlacement(players, score, placeIdx){
    const placeCell = document.createElement('td');

    const playerScores = players.map((player, index) => ({
        player,
        score: score[index]
    }));
    playerScores.sort((a, b) => b.score - a.score);
    placeCell.textContent = playerScores[placeIdx - 1].player;
    return placeCell;
}

// Cells are ["Date", "Name", "Winner", "Second", "Third", "Forth"]
async function genTournamentTableBody(games, matchHistoryBody) {
    games.forEach(game => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(game.dateTime).toLocaleString();
        row.appendChild(dateCell);

        const nameCell = document.createElement('td');
        nameCell.textContent = game.lobbyName;
        let winnerCell = getPlacement(game.players, game.score, 1);
        let secondCell = getPlacement(game.players, game.score, 2);
        let thirdCell = getPlacement(game.players, game.score, 3);
        let fourthCell = getPlacement(game.players, game.score, 4);

        row.appendChild(nameCell);
        row.appendChild(winnerCell);
        row.appendChild(secondCell);
        row.appendChild(thirdCell);
        row.appendChild(fourthCell);
        matchHistoryBody.appendChild(row);
    });
}