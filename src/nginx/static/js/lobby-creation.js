import { getCSRFToken } from './auth.js';
import { joinLobby, joinLocalLobby } from './lobby-handling.js';

document.getElementById('prepare-lobby').addEventListener('click', prepareLobby);

document.getElementById('list-lobbies').addEventListener('click', listLobbies);

document.getElementById('lobby-form').addEventListener('submit', createLobby);

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

  fetch('/lobby/create/', 
    {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCSRFToken(),
      },
      credentials: 'include',
      body: formData,
    })
    .then(data => data.json())
    .then(response =>
    {
      console.log('Raw response:', response);
      if(response.error)
        console.log('Error: ' + response.error);
      else if(response.tournament_mode && response.max_player_count == 1)
        joinLocalTournament(response.lobby, response.lobby_name, response.max_score, response.pac_pong);
      else if(response.tournament_mode)
        joinTournament(response.lobby, response.lobby_name, response.max_score, response.pac_pong);
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
      lobbyDiv.onclick = () => joinLobby(lobby.id, lobby.name, lobby.max_score, lobby.pac_pong);
      lobbyList.appendChild(lobbyDiv);
      });
    })
    .catch(error => {
      console.log('Error: ', error);
    });
} 