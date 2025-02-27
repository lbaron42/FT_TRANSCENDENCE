import { getAccessToken } from './auth.js';
import { customAlert, lobby_socket } from './globals.js';
import { navigateTo } from './routing.js';


// document.getElementById('prepare-lobby').addEventListener('click', prepareLobby);

// document.getElementById('list-lobbies').addEventListener('click', listLobbies);

// document.getElementById('lobby-form').addEventListener('submit', createLobby);

// let pong_selected = true;
// let online_selected = false;

// document.addEventListener("DOMContentLoaded", function () {
//   const pongModes = document.querySelectorAll("input[name='pong-mode']");
//   const tournamentCheck = document.getElementById("tournament-check");
//   const tournamentMode = document.getElementById("tournament-mode");
//   const onlineModes = document.querySelectorAll("input[name='mode']");

//   pongModes.forEach((mode) => {
//     mode.addEventListener("change", function () {
//       if (this.value === "0") {
//         pong_selected = true;
//       } else {
//         pong_selected = false;
//       }
//       if (pong_selected == true && online_selected == true)
//         tournamentCheck.classList.add("active");
//       else 
//       {
//         tournamentCheck.classList.remove("active");
//         tournamentMode.checked = false;
//       }
//     });
//   });
//   onlineModes.forEach((mode) => {
//     mode.addEventListener("change", function () {
//       if (this.value === "2") {
//         online_selected = true;
//       } else {
//         online_selected = false;
//       }
//       if (pong_selected == true && online_selected == true)
//         tournamentCheck.classList.add("active");
//       else 
//       {
//         tournamentCheck.classList.remove("active");
//         tournamentMode.checked = false;
//       }
//     });
//   });
// });

// export function prepareLobby() 
// {
//   navigateTo("/create-lobby");
// }

export function createLobby(event)
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
      if(response.error)
      {
        customAlert('Error: ' + response.error);
        navigateTo("/");
        return ;
      }
      window.tournament_mode = response.tournament_mode;
      window.lobby_id = response.lobby;
      window.lobby_name = response.lobby_name;
      window.max_score = response.max_score;
      window.max_player_count = response.max_player_count;
      window.pac_pong = response.pac_pong;
      if (response.tournament_mode)
        navigateTo("/tournament");
      else 
        navigateTo("/lobby")
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
      if(lobby_socket)
        return false;
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

export function listLobbies()
{
  // navigateTo("/list-lobbies");
  let lobbyList = document.getElementById("lobby-list");
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
        `;
      lobbyDiv.onclick = () => {
        if (lobby.max_player_count == 4)
          window.tournament_mode = 1;
        else
          window.tournament_mode = 0;
        window.lobby_id = lobby.id;
        window.lobby_name = lobby.name;
        window.max_score = lobby.max_score;
        window.max_player_count = lobby.max_player_count;
        window.pac_pong = lobby.pac_pong;
        if (window.tournament_mode)
          navigateTo("/tournament");
        else
          navigateTo("/lobby");
      }
      lobbyList.appendChild(lobbyDiv);
      });
    })
    .catch(error => {
      console.log('Error: ', error);
    });
} 