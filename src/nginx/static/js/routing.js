import { closeSockets, customAlert, gameplay_socket } from "./globals.js";
import { checkAuthentication } from "./index.js";
import { createLobby, listLobbies } from "./lobby-creation.js";
import { joinLobby} from "./lobby-handling.js";
import { loadProfile } from "./profile.js";
import { CreateLobby, Home, ListLobbies, Lobby, Profile, TournamentLobby, UpdateProfile } from "./routes.js";
import { joinTournament } from "./tournament_handler.js";
import { loadSettings } from "./update-profile.js";

const routes = {
    "/": Home,
    "/profile": Profile,
    "/update-profile": UpdateProfile,
    "/list-lobbies": ListLobbies,
    "/create-lobby": CreateLobby,
    "/tournament": TournamentLobby,
    "/lobby": Lobby,
};

export const navigateTo = async (path) => {

  await checkAuthentication();
    closeSockets();
    history.pushState({}, "", path);
    render(); 
};

// Function to render the correct page content
const render = () => {
    const path = window.location.pathname;
    document.getElementById("app").innerHTML = routes[path] ? routes[path]() : "<h1>404 - Page Not Found</h1>";
    if (path == "/")
    {
        document.getElementById('signup-button').style.display = 'none';
        document.getElementById('profile-button').style.display = 'flex';
        document.getElementById('settings-button').style.display = 'none';
        document.getElementById('prepare-lobby').addEventListener('click', () => navigateTo("/create-lobby"));
        document.getElementById('list-lobbies').addEventListener('click', () => navigateTo("/list-lobbies"));
    }
    else if (path == "/create-lobby")
    {
        document.getElementById('lobby-form').addEventListener('submit', createLobby);
        let pong_selected = true;
        let online_selected = false;
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
    }
    else if (path == "/list-lobbies")
    {
      listLobbies();
    }
    else if (path == "/lobby")
    {
        joinLobby();
    }
    else if (path == "/tournament")
        joinTournament();
    else if (path == "/game" && !gameplay_socket)
    {
        customAlert("Please do not enter a game via navigation button.");
        history.back();
    }
    else if (path == "/profile")
    {
      loadProfile();
      document.getElementById('signup-button').style.display = 'none';
      document.getElementById('profile-button').style.display = 'none';
      document.getElementById('settings-button').style.display = 'flex';
    }
    else if (path == "/update-profile")
    {
      loadSettings();
    }
};

// Handle back/forward browser buttons
window.addEventListener("popstate", render);

// Initialize app on page load
document.addEventListener("DOMContentLoaded", render);