
export const Home = () => `
        <div class="game-selector active" id="online">
          <div class="online active" id="option-choose">
            <button id="prepare-lobby">Create Lobby</button>
            <button id="list-lobbies">Join Lobby</button>
          </div>
        </div>`;

export const Profile = () => `
          <div class="profile">
        <section id="profile-info">
            <div id="avatar-container">
                <img id="avatar" 
     				src="./images/default_avatar.jpg" alt="User Avatar">
                <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                <button id="change-avatar-btn">Change Avatar</button>
            </div>
            <h2>Welcome, <span id="username"></span></h2> 
            <p>Display Name: <span id="display-name"></span></p>
            <div id="user-stats">
                <h3>Stats</h3>
                <p>Wins: <span id="games-wins"></span></p>
                <p>Losses: <span id="games-losses"></span></p>
				<p>Draws: <span id="games-draws"></span></p>
				<p>Games Played: <span id="games-played"></span></p>
				<p>Pong Elo Ranking Score: <span id="ranking-score"></span></p>
            </div>
            <div id="two-fa-section">
                <h3>Two-Factor Authentication</h3>
                <label class="switch">
                    <input type="checkbox" id="two-fa-toggle">
                    <span class="slider round"></span>
                </label>
                <span id="two-fa-status"></span>
            </div>
        </section>
        <section id="friends-list">
            <h3>Friends</h3>
            <ul id="friends"></ul>
            <div><input type="text" id="friend-username" placeholder="Enter friend's username"></div>
            <div><button id="add-friend-btn">Add Friend</button></div>
        <section id="friend-requests">
            <h3>Pending Friend Requests</h3>
            <ul id="pending-requests"></ul>
            <div><button id="fetch-pending-requests">Refresh Requests</button></div>
        </section>
        </section>
        <section id="match-history">
            <h3>Match History</h3>
            <div id="game-tabs">
                <button class="game-tab active" data-game="two-player-pong">Pong</button>
                <button class="game-tab" data-game="pac-pong">PacPong</button>
                <button class="game-tab" data-game="four-player-tournament">Tournament</button>
            </div>
            <table id="match-history-table">
                <thead id="match-history-head">
                    <!-- Table headers will be inserted dynamically -->
                </thead>
                <tbody id="match-history-body"></tbody>
            </table>
        </section>
      </div>`;

export const UpdateProfile = () => 
  `<form id="update-form">
  <h1>Update Your Profile</h1>
    <label for="display-name">Display Name:</label>
    <input type="text" id="display-name" name="display_name" required>

    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>

    <label for="password">New Password (leave blank to keep current):</label>
    <input type="password" id="password" name="password">

    <label for="confirm-password">Confirm New Password:</label>
    <input type="password" id="confirm-password" name="confirm_password">

    <button type="submit">Update Profile</button>
</form>`;
        
export const ListLobbies = () => `
    <div class="game-selector active" id="online">
        <div class="online active" id="lobby-list"><p>test</p></div>
    </div>`;

export const CreateLobby = () => `
    <div class="game-selector active" id="online">
        <form class="online active" id="lobby-form">
            <h2>Create a Lobby:</h2>
            <div>
              <label for="lobby-name">Lobby Name:</label>
              <input type="text" id="lobby-name" name="lobby-name" required>
            </div>
            <div>
              <div id="mode-options">
                <label class="score-option">
                  <input type="radio" name="mode" value="1" checked>
                  <span>local</span>
                </label>
                <label class="score-option">
                  <input type="radio" name="mode" value="2">
                  <span>online</span>
                </label>
              </div>
            </div>
            <div>
              <div id="pong-modes">
                <label class="score-option">
                  <input type="radio" name="pong-mode" value="0" checked>
                  <span>Pong</span>
                </label>
                <label class="score-option">
                  <input type="radio" name="pong-mode" value="1">
                  <span>PacPong</span>
                </label>
              </div>
            </div>
            <div id="tournament-check">
              <label for="tournament-mode">Tournament Mode:</label>
              <input type="checkbox" name="tornament-mode" id="tournament-mode">
            </div>
            <div>
              <label for="score-options">Score:</label>
              <div id="score-options">
                <label class="score-option">
                  <input type="radio" name="score" value="3" checked>
                  <span>3</span>
                </label>
                <label class="score-option">
                  <input type="radio" name="score" value="5">
                  <span>5</span>
                </label>
                <label class="score-option">
                  <input type="radio" name="score" value="10">
                  <span>10</span>
                </label>
              </div>
            </div>
            <button type="submit">Create</button>
          </form>
    </div>`;

export const TournamentLobby = () => `
    <div class="game-selector active" id="online">
        <div class="online active" id="tournament">
            <div id="tournament-prep">
              <h2 id="tournament-header">Tournament: </h2>
              <div>
                <h3 id="players-header">Players: </h3>
                <div id="player-container"></div>
              </div>
            </div>
            <div id="tournament-container" class="disable">
              <div>
                <div>
                  <button class="player_button player_tournament" id="p1-round1">Name 1</button>
                  <button class="start_round disabled" id="start-1">Start</button>
                  <button class="player_button player_tournament" id="p2-round1">Name 2</button>
                </div>
                <div>
                  <button class="player_button player_tournament" id="p3-round1">Name 3</button>
                  <button class="start_round disabled" id="start-2">Start</button>
                  <button class="player_button player_tournament" id="p4-round1">Name 4</button>
                </div>
              </div>
              <div>
                <div>
                  <button class="player_button player_tournament" id="p1-round2"></button>
                  <button class="start_round disabled" id="start-3">Start</button>
                  <button class="player_button player_tournament" id="p2-round2"></button>
                </div>
              </div>
            </div>
            <button class="start_button" id="start_tournament">Start Tournament</button>
          </div>
        <div class="online" id="game">
            <p id="score">Left: 0 | Right: 0</p>
            <div id="draw-type">
              <p id="3d">3d</p>
              <p id="2d" class="active">2d</p>
            </div>
            <canvas id="game-canvas"></canvas>
        </div>
    </div>`;

export const Lobby = () => `
    <div class="game-selector active" id="online">
        <div class="online active" id="lobby">
            <h2 id="lobby-header">Lobby: </h2>
            <div>
              <button class="player_button" id="p1"><p>P1</p></button>
              <button class="player_button" id="p3"><p>PacMan</p></button>
              <button class="player_button" id="p2"><p>P2</p></button>
            </div>
            <button class="start_button" id="start_game">Start Game</button>
        </div>
        <div class="online" id="game">
            <p id="score">Left: 0 | Right: 0</p>
            <div id="draw-type">
              <p id="3d">3d</p>
              <p id="2d" class="active">2d</p>
            </div>
            <canvas id="game-canvas"></canvas>
            <canvas id="three-canvas" style="display:none;"></canvas>
        </div>
    </div>`;
