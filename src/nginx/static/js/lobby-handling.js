import { lobby_socket, name, closeSockets, initLobbySocket, customAlert } from "./globals.js";
import { lobbyFull } from "./lobby-creation.js";
import { startGame } from "./game-handling.js";
import { startPacPong } from "./pacpong-handling.js";
import { navigateTo } from "./routing.js";

function selectPlayer(role, db_value) {
    if (lobby_socket && lobby_socket.readyState === WebSocket.OPEN) {
        if (db_value === "None")
        {
            const message = {
            action: `${role}_select`
            };
            lobby_socket.send(JSON.stringify(message));
        }
        else if (db_value === name)
        {
          const message = {
          action: `${role}_deselect`
          };
          lobby_socket.send(JSON.stringify(message));
      }
  
    }
  }
  
export function joinLobby()
  {
    lobbyFull(window.lobby_id).then(is_full => {
      if (is_full) {
        customAlert('Lobby is full or does not exist anymore. Cannot join.');
        navigateTo("/");
        return;
      }
      if (window.max_player_count == 1)
        initLobbySocket(`/ws/lobby/local/${window.pac_pong}/${window.lobby_id}/${name}/`);
      else 
        initLobbySocket(`/ws/lobby/${window.pac_pong}/${window.lobby_id}/${name}/`);

    const p1 = document.getElementById('p1');
    const p2 = document.getElementById('p2');
    const p3 = document.getElementById('p3');
    let roles = {
      p1: "None",
      p2: "None",
      p3: "None"
    };

    lobby_socket.onopen = () => {
      console.log('Lobby WebSocket connected');
      document.getElementById('lobby-header').textContent = `Lobby: ${window.lobby_name}`;
      if (window.max_player_count == 1)
      {
        p1.style.display = 'none';
        p2.style.display = 'none';
        p3.style.display = 'none';
        enableStartButton();
      }
      else
      {
        lobby_socket.send(JSON.stringify({
          action: 'init_player_roles',
        }));
        p1.addEventListener('click', () => selectPlayer('p1', roles.p1));
        p2.addEventListener('click', () => selectPlayer('p2', roles.p2));
        if (window.pac_pong == 1)
          p3.addEventListener('click', () => selectPlayer('p3', roles.p3));
        else
          p3.style.display = 'none';
        }
    };
  
    lobby_socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'start_game')
        {
            console.log('Game starting...');
            if (window.pac_pong == 1)
              startPacPong(window.lobby_id, roles.p1 == name ? 'p1' : roles.p2 == name ? 'p2' : roles.p2 == name ? 'p3' : '', window.max_player_count, roles, window.max_score, window.pac_pong);
            else
              startGame(window.lobby_id, roles.p1 == name ? 'p1' : roles.p2 == name ? 'p2' : '', window.max_player_count, roles, window.max_score);
        } 
        else if (data.type === 'enable_start_button')
        {
            enableStartButton();
        }
        else if (data.type === 'disable_start_button')
          {
              disableStartButton();
          }
        else if (data.type === 'update_roles') {
          roles = data.roles;
          if (roles.p1 != "None") {
              p1.classList.add('player_selected');
              p1.innerHTML = `<p>P1</p>${roles.p1}`
          } else {
              p1.classList.remove('player_selected');
              p1.innerHTML = `<p>P1</p>`
          }
  
          if (roles.p2 != "None") {
              p2.classList.add('player_selected');
              p2.innerHTML = `<p>P2</p>${roles.p2}`
          } else {
              p2.classList.remove('player_selected');
              p2.innerHTML = `<p>P2</p>`
          }

          if (roles.p3 != "None" && window.pac_pong) {
              p3.classList.add('player_selected');
              p3.innerHTML = `<p>PacPong</p>${roles.p3}`
        } else if (window.pac_pong) {
              p3.classList.remove('player_selected');
              p3.innerHTML = `<p>PacPong</p>`
        }
      }
    };
    
    lobby_socket.onerror = console.error;
    lobby_socket.onclose = (event) => {
      console.log('Lobby WebSocket closed');
      if (event.code == 4001) {
        navigateTo("/");
        customAlert("Player already in lobby.");
      }
    }
    });
  }
  
  function enableStartButton() {
    const start_button = document.getElementById('start_game');
    if (start_button) {
      start_button.replaceWith(start_button.cloneNode(true));
      const new_start_button = document.getElementById('start_game');
      new_start_button.classList.add('start_enabled');
      new_start_button.addEventListener('click', () => sendStartGame())
    }
  }
  
  function disableStartButton() {
    const start_button = document.getElementById('start_game');
    if (start_button)
    {
      start_button.classList.remove('start_enabled');
      start_button.onclick = null;
    }
  }
  
  function sendStartGame()
  {
    const message = {
      action: `start_game`
      };
      lobby_socket.send(JSON.stringify(message));
  }
  