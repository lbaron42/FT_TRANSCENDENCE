import { gameplay_socket, initGameplaySocket, closeGameplaySocket } from "./sockets.js";

export function startPacPong(lobby_id, player, player_count, roles, max_score) {
	console.log("in pac pong");
	let gameSettings = {
		scoreBoard: document.getElementById('score'),
		canvas: document.getElementById('game-canvas'),
		paddle_width: 0,
		paddle_height: 0,
		ball_size: 0,
		pac_size: 0,
		player: player
	}

	document.querySelectorAll('.online').forEach(content => {
		content.classList.remove('active');
	}
	);
	document.getElementById('game').classList.add('active');

	const twoD = document.getElementById('2d');
	const threeD = document.getElementById('3d');
	twoD.style.display = 'none';
	threeD.style.display = 'none';


	initGameplaySocket(`/ws/gameplay/PacPong/${max_score}/${player_count}/${lobby_id}/`)

	const encodeState = (player, direction, moving) => {
		const pacBit = (player == 'p3' ? 1 : 0);  // if pac is moving  1, else 0 (if 0 the achsisBit can be skipped...)
		const achsisBit = (direction == 'left' || direction == 'right' ? 1 : 0); // if 1 it is left right, 0 is up down
		const playerBit = (player == 'p1' ? 0 : 1); // like before
		const directionBit = (direction == 'up' || direction == 'left' ? 1 : 0); // like before but also handles left right now in combination with achsisBit
		const movingBit = (moving ? 1 : 0); // key down or key up
		return ((pacBit << 4) | (achsisBit << 3) | (playerBit << 2) | (directionBit << 1) | movingBit);
	}

	const handleKeyDown = (event) => {
		if (event.key === 'w')
			gameplay_socket.send(encodeState((player ? player : 'p1'), 'up', 1));
		else if (event.key === 's')
			gameplay_socket.send(encodeState((player ? player : 'p1'), 'down', 1));
		else if (event.key === 'ArrowUp')
			gameplay_socket.send(encodeState((player ? player : 'p2'), 'up', 1));
		else if (event.key === 'ArrowDown')
			gameplay_socket.send(encodeState((player ? player : 'p2'), 'down', 1));
		else if (event.key === 'u')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'up', 1));
		else if (event.key === 'j')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'down', 1));
		else if ((player == 'p3' && (event.key === 'h' || event.key === 'a' || event.key === 'ArrowLeft')) || !player && event.key === 'h')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'left', 1));
		else if ((player == 'p3' && (event.key === 'k' || event.key === 'd' || event.key === 'ArrowRight')) || !player && event.key === 'k')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'right', 1));
	};

	const handleKeyUp = (event) => {
		if (event.key === 'w')
			gameplay_socket.send(encodeState((player ? player : 'p1'), 'up', 0));
		else if (event.key === 's')
			gameplay_socket.send(encodeState((player ? player : 'p1'), 'down', 0));
		else if (event.key === 'ArrowUp')
			gameplay_socket.send(encodeState((player ? player : 'p2'), 'up', 0));
		else if (event.key === 'ArrowDown')
			gameplay_socket.send(encodeState((player ? player : 'p2'), 'down', 0));
		else if (event.key === 'u')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'up', 0));
		else if (event.key === 'j')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'down', 0));
		else if ((player == 'p3' && (event.key === 'h' || event.key === 'a' || event.key === 'ArrowLeft')) || !player && event.key === 'h')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'left', 0));
		else if ((player == 'p3' && (event.key === 'k' || event.key === 'd' || event.key === 'ArrowRight')) || !player && event.key === 'k')
			gameplay_socket.send(encodeState((player ? player : 'p3'), 'right', 0));
	};

	gameplay_socket.onopen = () => {
		console.log('Gameplay WebSocket open');
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('keyup', handleKeyUp);
	};

	gameplay_socket.onmessage = (event) => {
		const data = JSON.parse(event.data);
		if (data.type == 'game_update') {
			drawGame(data, gameSettings, roles);
		}
		else if (data.type == 'game_init')
			initGameSettings(data, gameSettings);
		else if (data.type == 'player_left') {
			closeGameplaySocket();
			console.log("player disconnected");
			document.querySelectorAll('.online').forEach(content => {
				content.classList.remove('active');
			}
			);
			document.getElementById('lobby').classList.add('active');
			alert("Player disconnected - returning to lobby.");
		}
		else if (data.type == 'game_end') {
			console.log("game ending...");
			closeGameplaySocket();
			document.querySelectorAll('.online').forEach(content => {
				content.classList.remove('active');
			}
			);
			alert(data.message);
			document.getElementById('lobby').classList.add('active');
		}
	};

	gameplay_socket.onerror = console.error;

	gameplay_socket.onclose = () => {
		console.log('Gameplay WebSocket closed');
		document.removeEventListener('keydown', handleKeyDown);
		document.removeEventListener('keyup', handleKeyUp);
	}
}

function initGameSettings(data, gameSettings) {
	const canvas_container = document.getElementById('game');
	let container_height = canvas_container.clientHeight;
	let container_width = canvas_container.clientWidth;
	let screen_height_ratio = parseFloat(data.screen_height);
	if (container_height > container_width * screen_height_ratio) {
		gameSettings.canvas.width = container_width;
		gameSettings.canvas.height = container_width * screen_height_ratio;
	}
	else {
		gameSettings.canvas.width = container_height / screen_height_ratio;
		gameSettings.canvas.height = container_height;
	}
	gameSettings.paddle_height = gameSettings.canvas.width * parseFloat(data.paddle_heigth);
	gameSettings.paddle_width = gameSettings.canvas.width * parseFloat(data.paddle_width);
	gameSettings.ball_size = gameSettings.canvas.width * parseFloat(data.ball_size);
	gameSettings.pac_size = gameSettings.canvas.width * parseFloat(data.pac_size);
}

function normalize(value, max, canvasSize) {
	return ((value / max) * canvasSize);
}

function drawGame(data, gameSettings, roles) {
	const maxX = 1000;
	const maxY = 500;

	// const nonce = parseInt(data.nonce);
	const paddleL = normalize(parseInt(data.paddleL), maxY, gameSettings.canvas.height);
	const paddleR = normalize(parseInt(data.paddleR), maxY, gameSettings.canvas.height);
	const ballX = normalize(parseInt(data.ball_x), maxX, gameSettings.canvas.width);
	const ballY = normalize(parseInt(data.ball_y), maxY, gameSettings.canvas.height);
	const pacX = normalize(parseInt(data.pac_x), maxX, gameSettings.canvas.width);
	const pacY = normalize(parseInt(data.pac_y), maxY, gameSettings.canvas.height);

	// right now i was thinking to toggle the drawing mode from 2d to 3d
	// but if you use three.js, we could also just switch the camera position and have it one.

	//and dont wonder, i set both (if else) to drawGame2d right now, since drawGame3d is not implemented yet.
	drawGame2d(gameSettings, paddleL, paddleR, ballX, ballY, pacX, pacY);

	// Update score
	if (roles)
		gameSettings.scoreBoard.textContent = `P1 : ${roles.p1} : ${data.Lscore} | ${data.Rscore} : ${roles.p2} : P2`;
	else
		gameSettings.scoreBoard.textContent = `P1 : ${data.Lscore} | ${data.Rscore} : P2`;
}

function drawGame2d(gameSettings, paddleL, paddleR, ballX, ballY, pacX, pacY) {
	const context = gameSettings.canvas.getContext('2d');
	context.clearRect(0, 0, gameSettings.canvas.width, gameSettings.canvas.height);
	context.fillStyle = 'white';

	// draw paddles
	context.fillRect(0, paddleL, gameSettings.paddle_width, gameSettings.paddle_height);
	context.fillRect(gameSettings.canvas.width - gameSettings.paddle_width, paddleR, gameSettings.paddle_width, gameSettings.paddle_height);

	// draw ball
	context.beginPath();
	context.arc(ballX, ballY, gameSettings.ball_size / 2, 0, Math.PI * 2);
	context.fill();

	context.beginPath();
	context.fillStyle = 'yellow'; // Different color for distinction
	context.arc(pacX, pacY, gameSettings.pac_size / 2, 0, Math.PI * 2);
	context.fill();
}


function drawGame3d(gameSettings, paddleL, paddleR, ballX, ballY) {

	/* gameSettings.scoreBoard <-- gets updated in drawGame already
	gameSettings.canvas <-- canvas element 
	gameSettings.contextType <-- updates when the player clicks on 3d or 2d to toggle mode 
	gameSettings.paddle_width 
	gameSettings.paddle_height
	gameSettings.ball_size
	gameSettings.player <- says if the player is 'p1' or 'p2' we can adjust the camera depending on it.  
	
	paddleL <- y position of paddleL (x is as left as possible) aka 0 
	paddleR <- y position of paddleR (x is as right as possible) aka gameSettings.canvas.width - gameSettings.paddle_width
	ballX
	ballY
	*/
}