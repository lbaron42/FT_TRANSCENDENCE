import { startTournamentGame } from "./game-handling-tournament.js";
import { lobby_socket, name, initLobbySocket, customAlert, closeSockets } from "./globals.js";
import { lobbyFull } from "./lobby-creation.js";
import { navigateTo } from "./routing.js";

export function joinTournament()
{
    lobbyFull(window.lobby_id).then(is_full => {
        if (is_full) {
          customAlert('Lobby is full or does not exist anymore. Cannot join.');
          navigateTo("/");
          return;
        }
    })

    // navigateTo("/tournament");

    initLobbySocket(`/ws/lobby/tournament/${window.lobby_id}/${name}/`)

    const playerContainer = document.getElementById('player-container');
    const tournamentContainer = document.getElementById('tournament-container');
    const playersHeader = document.getElementById('players-header');
    const tournamentHeader = document.getElementById('tournament-header');
    const tournamentDiv = document.getElementById('tournament');
    const tournamentPrep = document.getElementById('tournament-prep');

    const p1 = document.getElementById('p1-round1');
    const p2 = document.getElementById('p2-round1');
    const p3 = document.getElementById('p3-round1');
    const p4 = document.getElementById('p4-round1');
    const p1_2 = document.getElementById('p1-round2');
    const p2_2 = document.getElementById('p2-round2');
    let p3_2 = 'none'
    let p4_2 = 'none'

    const start_tournament = document.getElementById('start_tournament');
    const start_1 = document.getElementById('start-1');
    const start_2 = document.getElementById('start-2');
    const start_3 = document.getElementById('start-3');


    lobby_socket.onopen = () => {
        console.log("Tournament lobby connected");
        tournamentHeader.textContent = `Tournament: ${window.lobby_name}`;
        lobby_socket.send(JSON.stringify({
            action: 'player_joined',
          })
        );
        // document.querySelectorAll('.online').forEach(content => 
        //   {
        //     content.classList.remove('active');
        //   }
        // );
        // tournamentDiv.classList.add('active');
        
    }

    lobby_socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type == 'update_players')
        {
          playerContainer.innerHTML = '';
          playersHeader.classList.remove('disable');
          playerContainer.classList.remove('disable');
          tournamentContainer.classList.add('disable');
          tournamentPrep.classList.remove('disable');
          Object.keys(data.player_names).forEach((name) => {
              const button = document.createElement('button');
              button.classList.add('player_button');
              button.textContent = name;
              playerContainer.appendChild(button);
          });
        }
        else if (data.type === 'enable_tournament_button')
        {
          console.log("enabling button")
            enableStartButton(start_tournament, 'start_tournament');
        }
        else if (data.type === 'disable_tournament_button')
        {
            disableStartButton(start_tournament);
        }
        else if (data.type == 'start_tournament')
        {
          playersHeader.classList.add('disable');
          playerContainer.classList.add('disable');
          tournamentContainer.classList.remove('disable');
          tournamentPrep.classList.add('disable');
          p1.textContent = data.roles.p1;
          p2.textContent = data.roles.p2;
          p3.textContent = data.roles.p3;
          p4.textContent = data.roles.p4;
        }
        else if (data.type == 'player_left')
          {
            closeSockets();
          }
        else if (data.type == 'enable_start_1')
        {
          enableStartButton(start_1, 'start_1');
        }
        else if (data.type == 'enable_start_2')
        {
          enableStartButton(start_2, 'start_2');
        }
        else if (data.type == 'enable_start_3')
        {
          enableStartButton(start_3, 'start_3');
        }
        else if (data.type == 'start_1')
        {
          disableStartButton(start_1);
          startTournamentGame(window.lobby_id + `game_1`, `game_1`, data.roles.p1 == name ? 'p1' : 'p2', data.roles, window.max_score, p1.textContent, p2.textContent, p3.textContent, p4.textContent, window.lobby_name);
        }
        else if (data.type == 'start_2')
        {
          disableStartButton(start_2);
          startTournamentGame(window.lobby_id + `game_2`, `game_2`, data.roles.p1 == name ? 'p1' : 'p2', data.roles, window.max_score, p3.textContent, p4.textContent, p1.textContent, p2.textContent, window.lobby_name);
        }
        else if (data.type == 'start_3')
        {
          disableStartButton(start_3);
          startTournamentGame(window.lobby_id + `game_3`, `game_3`, data.roles.p1 == name ? 'p1' : 'p2', data.roles, window.max_score, p1_2.textContent, p2_2.textContent, p3_2, p4_2, window.lobby_name);
        }
        else if (data.type == 'p1_round2')
        {
          console.log(data);
          start_1.textContent = 'Start';
          start_1.classList.remove('fighting');
          p1_2.textContent = data.p1_round2;
          p3_2 = data.p3_round2;
          disableStartButton(start_1);
        }
        else if (data.type == 'p2_round2')
        {
          console.log(data);
          start_2.textContent = 'Start';
          start_2.classList.remove('fighting');
          p2_2.textContent = data.p2_round2;
          p4_2 = data.p4_round2;
          disableStartButton(start_2);
        }
        else if (data.type == 'winner')
        {
          customAlert(`${data.winner} won the tournament!`);
          closeSockets();
        }
        else if (data.type == 'game_1_ongoing')
        {
          start_1.textContent = '';
          start_1.classList.add('fighting');
        }
        else if (data.type == 'game_2_ongoing')
        {
          start_2.textContent = '';
          start_2.classList.add('fighting');
        }
        else if (data.type == 'game_3_ongoing')
        {
          start_3.textContent = '';
          start_3.classList.add('fighting');
        }
    }
    lobby_socket.onclose = () => {

      // document.querySelectorAll('.online').forEach(content => 
      //   {
      //     content.classList.remove('active');
      //   }
      // );
      // document.getElementById('option-choose').classList.add('active');
      navigateTo("/");
    }
} 

function enableStartButton(start_button, action_type) {
  console.log("Enabling start button:", start_button);

  start_button.classList.remove('disabled');
  start_button.classList.add('start_enabled');
  start_button.disabled = false;
  start_button.addEventListener('click', () => sendStartGame(action_type));
}

function disableStartButton(start_button) {
  console.log(`Disabling ${start_button}`);

  start_button.classList.add('disabled');
  start_button.classList.remove('start_enabled'); 
  start_button.removeEventListener('click', sendStartGame);
  start_button.disabled = true;
}
function sendStartGame(action_type)
{
  const message = {
    action: action_type
    };
    lobby_socket.send(JSON.stringify(message));
}
