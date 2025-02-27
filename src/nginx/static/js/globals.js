import { getAccessToken } from "./auth.js";

export let lobby_socket;

export let gameplay_socket;

export let name;

window.addEventListener('beforeunload', closeSockets);
window.addEventListener('popstate', closeSockets);

export function initLobbySocket(url)
{
  const accessToken = getAccessToken();
    if (!lobby_socket)
        lobby_socket = new WebSocket(`${url}?token=${accessToken}`);
    else
        console.warn("Lobby socket already initialized.");
}

export function initGameplaySocket(url)
{
  const accessToken = getAccessToken();

  gameplay_socket = null;
    if (!gameplay_socket)
        gameplay_socket = new WebSocket(`${url}?token=${accessToken}`);
    else
        console.warn("Gameplaylocket socket already initialized.");
}

export function initGameplaySocketTournament(url, p1, p2, p3, p4, lobby_name)
{
  const accessToken = getAccessToken();

  gameplay_socket = null;
    if (!gameplay_socket)
      gameplay_socket = new WebSocket(`${url}?token=${encodeURIComponent(accessToken)}&p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&p3=${encodeURIComponent(p3)}&p4=${encodeURIComponent(p4)}&lobby_name=${encodeURIComponent(lobby_name)}`);
    else
        console.warn("Gameplaylocket socket already initialized.");
}

export function closeGameplaySocket()
{
  if (gameplay_socket && gameplay_socket.readyState === WebSocket.OPEN) {
    console.log("closing gameplay  socket...");
    gameplay_socket.close();
  }
  gameplay_socket = null;
}

export function closeSockets() {
    if (lobby_socket && lobby_socket.readyState === WebSocket.OPEN) {
      console.log("closing lobby socket")
      lobby_socket.close();
    }
    lobby_socket = null;
    closeGameplaySocket();
  }

export function setName(_name) {
  name = _name;
  }

export function unsetName() {
  name = "";
}

export function customAlert(message) {
  const alert_background = document.getElementById('alert-background');
  const alert = document.getElementById('alert');
  const alert_div = document.getElementById('alert-div');

  alert.classList.add('active');
  alert_background.classList.add('active');
  alert_div.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = message;
  alert_div.appendChild(title);

  const button = document.createElement('button');
  button.textContent = 'OK';
  button.classList.add('start_round');
  button.addEventListener('click', () => {
    alert.classList.remove('active');
    alert_background.classList.remove('active');
  });
  alert_div.appendChild(button);
  
}