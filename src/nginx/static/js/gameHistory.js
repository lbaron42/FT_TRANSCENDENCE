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
            matchHistoryBody.innerHTML = '<tr><td colspan="5">No matches found.</td></tr>';
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
            // case 'four-player-tournament':
            //     genTournamentTableBody(games, matchHistoryBody);
            //     break;
        }
    } catch (error) {
        console.error(error.message);
    }
}

function getGameStatus(scores, playerKey){
    const gameStatusCell = document.createElement('td');

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const playerScore = scores[playerKey];

    if (playerScore === maxScore && playerScore === minScore) {
        gameStatusCell.textContent = 'Draw';
        gameStatusCell.style.color = 'yellow';
    } else if (playerScore === maxScore) {
        gameStatusCell.textContent = 'Win';
        gameStatusCell.style.color = 'green';
    } else {
        gameStatusCell.textContent = 'Lost';
        gameStatusCell.style.color = 'red';
    }
    return gameStatusCell;
}

async function displayMatchHistoryHead(gameMode) {
    const tableHeaders = {
        "two-player-pong": ["Date", "Opponent", "Score", "Result"],
        "pac-pong": ["Date", "Left", "Right", "Pacman", "Score (L-R-P)", "Result"],
        // "four-player-tournament": ["Date", "Name", "Winner", "Second", "Result"]
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
		const players = Object.keys(game.score);
		const scores = Object.values(game.score);

        if (players[0] === username) {
            opponentCell.textContent = players[1];
            scoreCell.textContent = scores[0] + '-' + scores[1];
            gameStatusCell = getGameStatus(scores, 0);
        } else if (players[1] === username) {
            opponentCell.textContent = players[0];
            scoreCell.textContent = scores[1] + '-' + scores[0];
            gameStatusCell = getGameStatus(scores, 1);
        } else {
            console.error(`Game with id ${game.id} can't be connected to current user: ${username}`);
            return;
        }
        row.appendChild(opponentCell);
        row.appendChild(scoreCell);
        row.appendChild(gameStatusCell);
        matchHistoryBody.appendChild(row);
    });
}

// Cells are ["Date", "Left", "Right", "Pacman", "Score", "Result"]
async function genPacPongTableBody(games, matchHistoryBody) {
    games.forEach(game => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(game.dateTime).toLocaleString();

		const players = Object.keys(game.score);
		const scores = Object.values(game.score);

        const leftCell = document.createElement('td');
        leftCell.textContent = players[0];
        const rightCell = document.createElement('td');
        rightCell.textContent = players[1];
		const pacCell = document.createElement('td');
        pacCell.textContent = players[2];
        const scoreCell = document.createElement('td');
        scoreCell.textContent = scores[0] + '-' + scores[1] + '-' + scores[2];
        let resultCell;
        const username = document.getElementById('username').textContent;
        if (players[0] === username) {
            resultCell = getGameStatus(scores, 0);
        } else if (players[1] === username) {
            resultCell = getGameStatus(scores, 1);
        } else if (players[2] === username) {
            resultCell = getGameStatus(scores, 2);
        } else {
            console.error(`Game with id ${game.id} can't be connected to current user: ${username}`);
            return;
        }
        row.appendChild(dateCell);
        row.appendChild(leftCell);
        row.appendChild(rightCell);
		row.appendChild(pacCell);
        row.appendChild(scoreCell);
        row.appendChild(resultCell);
        matchHistoryBody.appendChild(row);
    });
}

function getPlacement(players, scores, placeIdx){
    const placeCell = document.createElement('td');

    const playerScores = players.map((player, index) => ({
        player,
        score: scores[index]
    }));
    playerScores.sort((a, b) => b.score - a.score);
    placeCell.textContent = playerScores[placeIdx - 1].player;
    return placeCell;
}

// Cells are ["Date", "Name", "Winner", "Second", "Result"]
async function genTournamentTableBody(games, matchHistoryBody) {
    games.forEach(game => {
        const row = document.createElement('tr');
		const players = Object.keys(game.score);
		const scores = Object.values(game.score);
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(game.dateTime).toLocaleString();
        row.appendChild(dateCell);

        const nameCell = document.createElement('td');
        nameCell.textContent = game.lobbyName;
        let winnerCell = getPlacement(players, scores, 1);
        let secondCell = getPlacement(players, scores, 2);
		let resultCell;
		if (winnerCell.textContent == document.getElementById('username').textContent){
			resultCell = document.createElement('td');
			resultCell.textContent = 'Win';
        	resultCell.style.color = 'green';
		} else {
			resultCell = document.createElement('td');
			resultCell.textContent = 'Lost';
        	resultCell.style.color = 'red';
		}
        row.appendChild(nameCell);
        row.appendChild(winnerCell);
        row.appendChild(secondCell);
		row.appendChild(resultCell);
        matchHistoryBody.appendChild(row);
    });
}