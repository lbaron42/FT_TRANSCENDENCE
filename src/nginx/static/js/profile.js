import { getCSRFToken, logout} from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    fetchProfileData();
	fetchMatchHistory();
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('settings-button').addEventListener('click', function() {
        window.location.href = 'update-profile.html';
    });
    document.getElementById('home-button').addEventListener('click', function() {
        window.location.href = 'index.html';
    });
    document.getElementById('change-avatar-btn').addEventListener('click', function() {
        document.getElementById('avatar-upload').click();
    });
    document.getElementById('avatar-upload').addEventListener('change', uploadAvatar);
    document.getElementById('add-friend-btn').addEventListener('click', addFriend);
});

function fetchProfileData() {
    fetch('/user-api/profile/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        credentials: 'include',
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Failed to fetch profile data');
        }
    })
    .then(data => {
        document.getElementById('username').textContent = data.user.username;
        document.getElementById('display-name').textContent = data.display_name;
        document.getElementById('wins').textContent = data.stats["games-wins"];
        document.getElementById('losses').textContent = data.stats["games-losses"];
		document.getElementById('draws').textContent = data.stats["games-draws"];
		document.getElementById('ranking-score').textContent = data.stats["ranking-score"];
		document.getElementById('games-played').textContent = data.stats["games-played"];
        if (data.avatar_url) {
            document.getElementById('avatar').src = data.avatar_url;
        }
        updateFriendsList(data.friends);
    })
    .catch(error => {
        console.error('Error fetching profile data:', error);
        alert('Error loading profile information.');
    });
}

function updateFriendsList(friends) {
    const friendsList = document.getElementById('friends');
    friendsList.innerHTML = '';
    friends.forEach(friend => {
        const li = document.createElement('li');
        li.textContent = `${friend.username} (${friend.online ? 'Online' : 'Offline'})`;
        friendsList.appendChild(li);
    });
}

function getGameStatus(score, playerIdx){
	const gameStatusCell = document.createElement('td');
	const opponentIdx = (playerIdx + 1) % 2;
	if (score[playerIdx] == score[opponentIdx]){
		gameStatusCell.textContent = 'Draw';
		gameStatusCell.style.color = 'yellow';
	} else if (score[playerIdx] > score[opponentIdx]){
		gameStatusCell.textContent = 'Win';
		gameStatusCell.style.color = 'green';
	} else {
		gameStatusCell.textContent = 'Lost';
		gameStatusCell.style.color = 'red';
	}
	return (gameStatusCell);
}

async function fetchMatchHistory() {
	const tableBody = document.getElementById('match-history-body');
	try {
	const response = await fetch('/user-api/game-history?' +
		new URLSearchParams({limit: '10'}).toString(),{
			method: 'GET',
			headers: {
                'Content-Type': 'application/json',
				'X-CSRFToken': getCSRFToken()
            },
			credentials: 'include',
		});
		if (!response.ok) {
            console.error('Failed to fetch match history:', response.status);
            return;
        }
		const json = await response.json();
		const games = json.results;
		tableBody.innerHTML = '';
		games.forEach(game => {
			const row = document.createElement('tr');

			const dateCell = document.createElement('td');
			dateCell.textContent = new Date(game.dateTime).toLocaleString();
			row.appendChild(dateCell);

			const gameModeCell = document.createElement('td');
			gameModeCell.textContent = game.gameMode;
			row.appendChild(gameModeCell);

			const opponentCell = document.createElement('td');
			const scoreCell = document.createElement('td');
			let gameStatusCell;
			const username = document.getElementById('username').textContent;
			if (game.players[0] == username){
				opponentCell.textContent = game.players[1];
				scoreCell.textContent = game.score[0].toString() + '-' + game.score[1].toString();
				gameStatusCell = getGameStatus(game.score, 0);
			} else if (game.players[1] == username) {
				opponentCell.textContent = game.players[0];
				scoreCell.textContent = game.score[1].toString() + '-' + game.score[0].toString();
				gameStatusCell = getGameStatus(game.score, 1);
			} else {
				console.error(`Game with id ${game.id} can\'t be connected to current user: ${username}. PLAYERS: ${game.players[0]}, ${game.players[1]}`);
			}
			row.appendChild(opponentCell);
			row.appendChild(scoreCell);
			row.appendChild(gameStatusCell);

			tableBody.appendChild(row);
		})
	} catch (error) {
		console.error(error.message);
	}
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('avatar', file);

        fetch('/user-api/upload-avatar/', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if(data.message) {
                document.getElementById('avatar').src = window.URL.createObjectURL(file);
                alert('Avatar uploaded successfully!');
            } else {
                throw new Error(data.error || 'Failed to upload avatar');
            }
        })
        .catch(error => {
            console.error('Error uploading avatar:', error);
            alert(error.message);
        });
    }
}


function addFriend() {
    const friendUsername = document.getElementById('friend-username').value;
    if (friendUsername) {
        fetch('/user-api/add-friend/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ friend_username: friendUsername }),
            credentials: 'include',
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Failed to add friend');
            }
        })
        .then(data => {
            alert('Friend added successfully!');
            fetchProfileData();
        })
        .catch(error => {
            console.error('Error adding friend:', error);
            alert('Failed to add friend.');
        });
    }
}
