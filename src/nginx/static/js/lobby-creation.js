import { getAccessToken } from './auth.js';
import { customAlert } from './globals.js';
import { joinLobby, joinLocalLobby } from './lobby-handling.js';
import { joinTournament, joinLocalTournament } from './tournament_handler.js';


document.getElementById('prepare-lobby').addEventListener('click', prepareLobby);

document.getElementById('list-lobbies').addEventListener('click', listLobbies);

document.getElementById('lobby-form').addEventListener('submit', createLobby);

let pong_selected = true;
let online_selected = false;

document.addEventListener("DOMContentLoaded", function () {
  const pongModes = document.querySelectorAll("input[name='pong-mode']");
  const tournamentCheck = document.getElementById("tournament-check");
  const tournamentMode = document.getElementById("tournament-mode");
  const onlineModes = document.querySelectorAll("input[name='mode']");

  pongModes.forEach((mode) => {
    mode.addEventListener("change", function () {
      if (this.value === "0") {
        pong_selected = true;
      } else {
        pong_selected = false;
      }
      if (pong_selected == true && online_selected == true)
        tournamentCheck.classList.add("active");
      else 
      {
        tournamentCheck.classList.remove("active");
        tournamentMode.checked = false;
      }
    });
  });
  onlineModes.forEach((mode) => {
    mode.addEventListener("change", function () {
      if (this.value === "2") {
        online_selected = true;
      } else {
        online_selected = false;
      }
      if (pong_selected == true && online_selected == true)
        tournamentCheck.classList.add("active");
      else 
      {
        tournamentCheck.classList.remove("active");
        tournamentMode.checked = false;
      }
    });
  });
});

function prepareLobby() 
{
  document.querySelectorAll('.online').forEach(content => 
    {
      content.classList.remove('active');
    }
  );  
  document.querySelector('form.online').classList.add('active');
}

function createLobby(event)
{
  event.preventDefault();
  const formData = new FormData(document.getElementById('lobby-form'));
  console.log(formData);
  fetch('/lobby/create/', 
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
      },
      credentials: 'include',
      body: formData,
    })
    .then(data => data.json())
    .then(response =>
    {
      console.log('Raw response:', response);
      if(response.error)
        customAlert('Error: ' + response.error);
      else if(response.tournament_mode && response.max_player_count == 1)
        joinLocalTournament(response.lobby, response.lobby_name, response.max_score);
      else if(response.tournament_mode)
        joinTournament(response.lobby, response.lobby_name, response.max_score);
      else if(response.max_player_count == 1)
        joinLocalLobby(response.lobby, response.lobby_name, response.max_score, response.pac_pong)
      else 
        joinLobby(response.lobby, response.lobby_name, response.max_score, response.pac_pong);
    })
    .catch(error => {
      console.log('Fetch error: ' + error);
    }
  );
}

export function lobbyFull(lobby_id)
{
  return fetch(`/lobby/${lobby_id}/`, 
    {
      method: 'GET'
    })
    .then(data => data.json())
    .then(response =>
    {
      if(response.error)
      {
        console.log('Error: ' + response.error);
        return true ;
      }
      return response.lobby.current_player_count >= response.lobby.max_player_count;
    })
    .catch(error => {
      console.log('Fetch error: ' + error);
    }
  );
}

function listLobbies()
{
  document.querySelectorAll('.online').forEach(content => 
    {
      content.classList.remove('active');
    }
  );
  var lobbyList = document.getElementById("lobby-list");
  lobbyList.classList.add('active');

  fetch('/lobby/all/')
    .then(response => response.json())
    .then(lobbies => {
      const filteredLobbies = lobbies.filter(lobby => lobby.max_player_count > 1);
      lobbyList.innerHTML = '';
      filteredLobbies.forEach(lobby => {
        let lobbyDiv = document.createElement('div');
        lobbyDiv.classList.add('lobby-item');
        lobbyDiv.innerHTML = `
        <p>${lobby.current_player_count} / ${lobby.max_player_count}</p>
        <h3>${lobby.name}</h3>
        ${lobby.password ? '<img src="/svg/lock.svg" alt="password required">' : '<img src="/svg/lock-open.svg" alt="no password required">'}
      `;
      lobbyDiv.onclick = () => lobby.max_player_count == 4 ? joinTournament(lobby.id, lobby.name, lobby.max_score) : joinLobby(lobby.id, lobby.name, lobby.max_score, lobby.pac_pong);
      lobbyList.appendChild(lobbyDiv);
      });
    })
    .catch(error => {
      console.log('Error: ', error);
    });
} 