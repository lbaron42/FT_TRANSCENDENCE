import { lobby_socket, closeSockets, initLobbySocket } from "./sockets.js";
import { lobbyFull } from "./lobby-creation.js";
import { startGame } from "./game-handling.js";
import { startPacPong } from "./pacpong-handling.js";

function selectPlayer(role, name, db_value) {
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
  
  function generateGuestName() {
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // Generates a random 4-digit number
    return `guest${randomNumber}`;
  }

export function joinLocalLobby(lobby_id, lobby_name, max_score, pac_pong)
{
  document.querySelectorAll('.online').forEach(content => 
    {
      content.classList.remove('active');
    }
  );
  document.getElementById('lobby').classList.add('active')
  document.getElementById('lobby-header').textContent = `Lobby: ${lobby_name}`;
  const p1 = document.getElementById('p1');
  const p2 = document.getElementById('p2');
  const p3 = document.getElementById('p3');
  p1.style.display = 'none';
  p2.style.display = 'none';
  p3.style.display = 'none';
  const start_button = document.getElementById('start_game');
  if (start_button) {
    start_button.replaceWith(start_button.cloneNode(true));
    const new_start_button = document.getElementById('start_game');
    new_start_button.classList.add('start_enabled');
    new_start_button.addEventListener('click', () => {
      if (pac_pong == 1)
        startPacPong(lobby_id, '', 1, '', max_score)
      else
        startGame(lobby_id, '', 1, '', max_score);
    });
  }
}
  
export function joinLobby(lobby_id, lobby_name, max_score, pac_pong)
  {
    lobbyFull(lobby_id).then(is_full => {
      if (is_full) {
        alert('Lobby is full. Cannot join.');
        return;
      }
  
    const name = generateGuestName();
    const p1 = document.getElementById('p1');
    const p2 = document.getElementById('p2');
    const p3 = document.getElementById('p3');
    let roles = {
      p1: "None",
      p2: "None",
      p3: "None"
    };
  
    initLobbySocket(`/ws/lobby/${pac_pong}/${lobby_id}/${name}/`);
    
    lobby_socket.onopen = () => {
      console.log('Lobby WebSocket connected');
      document.getElementById('lobby-header').textContent = `Lobby: ${lobby_name}`;
      lobby_socket.send(JSON.stringify({
        action: 'init_player_roles',
      }));
      document.querySelectorAll('.online').forEach(content => 
        {
          content.classList.remove('active');
        }
      );
      document.getElementById('lobby').classList.add('active')
      p1.addEventListener('click', () => selectPlayer('p1', name, roles.p1));
      p2.addEventListener('click', () => selectPlayer('p2', name, roles.p2));
      if (pac_pong == 1)
        p3.addEventListener('click', () => selectPlayer('p3', name, roles.p3));
      else
        p3.style.display = 'none';
    };
  
    lobby_socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'start_game')
        {
            console.log('Game starting...');
            if (pac_pong == 1)
              startPacPong(lobby_id, roles.p1 == name ? 'p1' : roles.p2 == name ? 'p2' : 'p3', 2, roles, max_score, pac_pong);
            else
              startGame(lobby_id, roles.p1 == name ? 'p1' : 'p2', 2, roles, max_score);
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
          console.log(roles);
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

          if (roles.p3 != "None" && pac_pong) {
              p3.classList.add('player_selected');
              p3.innerHTML = `<p>PacPong</p>${roles.p3}`
        } else if (pac_pong) {
              p3.classList.remove('player_selected');
              p3.innerHTML = `<p>PacPong</p>`
        }
      }
    };
    
    lobby_socket.onerror = console.error;
    lobby_socket.onclose = () => console.log('Lobby WebSocket closed');
    
    window.addEventListener('beforeunload', closeSockets);
    });
  }
  
  function enableStartButton() {
    console.log("enabling start");
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
    start_button.classList.remove('start_enabled');
    start_button.onclick = null;
  }
  
  function sendStartGame()
  {
    const message = {
      action: `start_game`
      };
      lobby_socket.send(JSON.stringify(message));
  }
  