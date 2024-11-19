// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// const canvas = document.querySelector('#three-canvas');
// const renderer = new THREE.WebGLRenderer({
//     canvas,
//     antialias: true
// });

// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
// renderer.shadowMap.enabled = true;

// //Scene
// const scene = new THREE.Scene();
// scene.background = new THREE.Color('rgb(220, 20, 60)');

// //Camera
// const camera = new THREE.PerspectiveCamera(
//     60, // FOV
//     window.innerWidth / window.innerHeight, // aspect
//     0.1, // near
//     1000 // far
// );

// camera.position.set(-1, 3, 7);
// scene.add(camera);


// //light
// const light = new THREE.AmbientLight( 0x404040 ); // soft white light
// scene.add( light );

// const controls = new OrbitControls( camera, renderer.domElement );
// controls.enableDamping = true;

// const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
// directionalLight.position.set(-3, 5, 1);
// directionalLight.castShadow = true;
// scene.add( directionalLight );

// const geometry = new THREE.BoxGeometry( 1, 1, 1 ); 
// const material = new THREE.MeshLambertMaterial( {color: 0x00ff00, side: THREE.DoubleSide} ); 
// const cube = new THREE.Mesh( geometry, material ); 
// cube.position.y = 0.5;
// cube.castShadow = true;
// scene.add( cube );

// const geometry1 = new THREE.PlaneGeometry( 10, 10 );
// const material1 = new THREE.MeshLambertMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
// const plane = new THREE.Mesh( geometry1, material1 );
// plane.rotation.x = THREE.MathUtils.degToRad(-90);
// plane.receiveShadow = true;
// scene.add( plane );

// //Draw
// camera.lookAt(cube.position);
// function move()
// {
//     renderer.render(scene, camera);
//     controls.update();

//     renderer.setAnimationLoop(move);
// }

// move();

// function setLayout()
// {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// }

// window.addEventListener('resize', setLayout);

// -------------------------------- first----------------------------

// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// const canvas = document.querySelector('#three-canvas');
// const renderer = new THREE.WebGLRenderer({
//     canvas,
//     antialias: true
// });

// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
// renderer.shadowMap.enabled = true;

// // Scene
// const scene = new THREE.Scene();
// scene.background = new THREE.Color('rgb(30, 30, 30)');

// // Camera
// const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.set(0, 5, 10);
// scene.add(camera);

// // Light
// const light = new THREE.AmbientLight(0x404040);
// scene.add(light);
// const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
// directionalLight.position.set(-3, 5, 1);
// scene.add(directionalLight);

// // Ball
// const ballRadius = 0.3;
// const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
// const ballMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
// const ball = new THREE.Mesh(ballGeometry, ballMaterial);
// scene.add(ball);

// // Paddles
// const paddleWidth = 2;
// const paddleHeight = 0.2;
// const paddleDepth = 1;
// const paddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
// const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

// const playerPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
// playerPaddle.position.set(0, 0.5, 5);
// scene.add(playerPaddle);

// const player2Paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
// player2Paddle.position.set(0, 0.5, -5);
// scene.add(player2Paddle);

// // Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

// // Variables
// let ballDirection = new THREE.Vector3(0.05, 0, 0.1);
// let playerScore = 0;
// let player2Score = 0;

// // Move Player Paddle
// function movePlayerPaddle(direction) {
//     playerPaddle.position.x += direction * 0.2;
// }

// // Detect Collisions and Update Ball Position
// function updateBall() {
//     ball.position.add(ballDirection);

//     // Bounce off walls
//     if (ball.position.x > 5 || ball.position.x < -5) {
//         ballDirection.x = -ballDirection.x;
//     }

//     // Bounce off paddles
//     if (ball.position.distanceTo(playerPaddle.position) < 0.4) {
//         ballDirection.z = -ballDirection.z;
//     }
//     if (ball.position.distanceTo(player2Paddle.position) < 0.2) {
//         ballDirection.z = -ballDirection.z;
//     }

//     // AI paddle follows ball
//     player2Paddle.position.x = ball.position.x;

//     // Score and reset if ball passes paddles
//     if (ball.position.z < -6) {
//         player2Score++;
//         resetBall();
//     } else if (ball.position.z > 6) {
//         playerScore++;
//         resetBall();
//     }
// }

// // Reset Ball Position
// function resetBall() {
//     ball.position.set(0, 0.5, 0);
//     ballDirection.z = -ballDirection.z; // Switch direction
// }

// // Animation loop
// function animate() {
//     controls.update();
//     updateBall();
//     renderer.render(scene, camera);
//     requestAnimationFrame(animate);
// }

// // Key controls
// document.addEventListener('keydown', (event) => {
//     if (event.key === 'ArrowLeft') movePlayerPaddle(-1);
//     if (event.key === 'ArrowRight') movePlayerPaddle(1);
// });

// animate();

// ------------------------------Second---------------------------------

// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
// import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


// const canvas = document.querySelector('#three-canvas');
// const renderer = new THREE.WebGLRenderer({
//     canvas,
//     antialias: true
// });

// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
// renderer.shadowMap.enabled = true;

// // Scene
// const scene = new THREE.Scene();
// scene.background = new THREE.Color('rgb(30, 30, 30)');

// // Camera
// const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.set(0, 5, 12);
// scene.add(camera);

// // Light
// const light = new THREE.AmbientLight(0x404040);
// scene.add(light);
// const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
// directionalLight.position.set(-3, 5, 1);
// scene.add(directionalLight);

// // Ball
// const ballRadius = 0.3;
// const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
// const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
// const ball = new THREE.Mesh(ballGeometry, ballMaterial);
// scene.add(ball);

// const gltfLoader = new GLTFLoader();

// gltfLoader.load('/src/assets/paddle.glb', (gltf) => {
//     const paddle1 = gltf.scene;
//     paddle1.position.set(0, 0.5, 5);
//     paddle1.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
//     scene.add(paddle1);

//     // Paddle movement function for Paddle 1
//     function movePlayerPaddle(direction) {
//         paddle1.position.x += direction * 0.2;
//         paddle1.position.x = Math.max(-4, Math.min(4, paddle1.position.x));
//     }
//     // Add key event listener for Paddle 1 controls
//     document.addEventListener('keydown', (event) => {
//         if (event.key === 'ArrowLeft') movePlayerPaddle(-1);
//         if (event.key === 'ArrowRight') movePlayerPaddle(1);
//     });
// });

// gltfLoader.load('/src/assets/paddle2.glb', (gltf) => {
//     const paddle2 = gltf.scene;
//     paddle2.position.set(0, 0.5, -5);
//     paddle2.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
//     scene.add(paddle2);

//     // Paddle movement function for Paddle 2
//     function movePlayer2Paddle(direction) {
//         paddle2.position.x += direction * 0.2;
//         paddle2.position.x = Math.max(-4, Math.min(4, paddle2.position.x));
//     }
//     // Add key event listener for Paddle 2 controls
//     document.addEventListener('keydown', (event) => {
//         if (event.key === 'a') movePlayer2Paddle(-1);
//         if (event.key === 'd') movePlayer2Paddle(1);
//     });
// });

// // Paddles
// const paddleWidth = 2;
// const paddleHeight = 0.2;
// const paddleDepth = 1;
// const paddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
// const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

// const playerPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
// playerPaddle.position.set(0, 0.5, 5);
// scene.add(playerPaddle);

// const player2Paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
// player2Paddle.position.set(0, 0.5, -5);
// scene.add(player2Paddle);

// // Side Walls
// const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
// const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 10), wallMaterial);
// leftWall.position.set(-5, 0.5, 0);
// scene.add(leftWall);

// const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 10), wallMaterial);
// rightWall.position.set(5, 0.5, 0);
// scene.add(rightWall);

// // Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

// // Variables
// let ballDirection = new THREE.Vector3(0.05, 0, 0.1);
// let playerScore = 0;
// let player2Score = 0;
// let gameOver = false;
// let font;

// // Initialize Texts
// let playerScoreText, player2ScoreText, winMessageText, player1ControlsText, player2ControlsText, instructionsText;
// const fontLoader = new FontLoader();

// // Load Font Once
// fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (loadedFont) => {
//     font = loadedFont;
//     createScoreTexts();
//     createControlTexts();
//     createInstructionsText();
// });

// // Create Initial Score Texts
// function createScoreTexts() {
//     const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

//     // Player 1 Score Text
//     playerScoreText = new THREE.Mesh(
//         new TextGeometry(playerScore.toString(), { font, size: 0.5, height: 0.1 }),
//         textMaterial
//     );
//     playerScoreText.position.set(-3, 3, 0);
//     scene.add(playerScoreText);

//     // Player 2 Score Text
//     player2ScoreText = new THREE.Mesh(
//         new TextGeometry(player2Score.toString(), { font, size: 0.5, height: 0.1 }),
//         textMaterial
//     );
//     player2ScoreText.position.set(3, 3, 0);
//     scene.add(player2ScoreText);
// }

// // Create Control Texts Above Paddles
// function createControlTexts() {
//     const textMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

//     // Player 1 Controls Text
//     player1ControlsText = new THREE.Mesh(
//         new TextGeometry('<- Arrow Keys ->', { font, size: 0.3, height: 0.05 }),
//         textMaterial
//     );
//     player1ControlsText.position.set(-1.5, 1, 5);
//     scene.add(player1ControlsText);

//     // Player 2 Controls Text
//     player2ControlsText = new THREE.Mesh(
//         new TextGeometry('<- A - D ->', { font, size: 0.3, height: 0.05 }),
//         textMaterial
//     );
//     player2ControlsText.position.set(-1.5, 1, -5);
//     scene.add(player2ControlsText);
// }

// // Create Instructions Text at the Back
// function createInstructionsText() {
//     const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Gold color

//     instructionsText = new THREE.Mesh(
//         new TextGeometry('Score 10 points to win!', { font, size: 0.5, height: 0.1 }),
//         textMaterial
//     );
//     instructionsText.position.set(-10, 5, -8);
//     scene.add(instructionsText);
// }

// // Function to Update Score Texts
// function updateScore() {
//     if (font) {
//         // Update Player 1 Score Text
//         scene.remove(playerScoreText);
//         playerScoreText.geometry.dispose();
//         playerScoreText.geometry = new TextGeometry(playerScore.toString(), { font, size: 0.5, height: 0.1 });
//         scene.add(playerScoreText);

//         // Update Player 2 Score Text
//         scene.remove(player2ScoreText);
//         player2ScoreText.geometry.dispose();
//         player2ScoreText.geometry = new TextGeometry(player2Score.toString(), { font, size: 0.5, height: 0.1 });
//         scene.add(player2ScoreText);
//     }
// }

// // Function to Show Win Message
// function showWinMessage(winner) {
//     if (font && !winMessageText) {
//         const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold color
//         winMessageText = new THREE.Mesh(
//             new TextGeometry(`${winner} Wins!`, { font, size: 0.7, height: 0.2 }),
//             textMaterial
//         );
//         winMessageText.position.set(-3, 4, 0);
//         scene.add(winMessageText);
//     }
// }

// // Move Player Paddle
// function movePlayerPaddle(direction) {
//     playerPaddle.position.x += direction * 0.2;
//     playerPaddle.position.x = Math.max(-4, Math.min(4, playerPaddle.position.x));
// }

// function movePlayer2Paddle(direction) {
//     player2Paddle.position.x += direction * 0.2;
//     player2Paddle.position.x = Math.max(-4, Math.min(4, player2Paddle.position.x));
// }

// // Detect Collisions and Update Ball Position
// function updateBall() {
//     if (gameOver) return;

//     ball.position.add(ballDirection);

//     // Bounce off walls
//     if (ball.position.x > 4.9 || ball.position.x < -4.9) {
//         ballDirection.x = -ballDirection.x;
//     }

//     // Bounce off paddles
//     if (ball.position.distanceTo(playerPaddle.position) < 0.6) {
//         ballDirection.z = -ballDirection.z;
//     }
//     if (ball.position.distanceTo(player2Paddle.position) < 0.6) {
//         ballDirection.z = -ballDirection.z;
//     }

//     // Score and reset if ball passes paddles
//     if (ball.position.z > 6) {
//         player2Score++;
//         checkGameOver('Player 2');
//         resetBall();
//     } else if (ball.position.z < -6) {
//         playerScore++;
//         checkGameOver('Player 1');
//         resetBall();
//     }
//     updateScore();
// }

// // Check Game Over
// function checkGameOver(winner) {
//     if (playerScore >= 10 || player2Score >= 10) {
//         gameOver = true;
//         showWinMessage(winner);
//         showResetButton();
//     }
// }

// // Reset Ball Position
// function resetBall() {
//     ball.position.set(0, 0.5, 0);
//     ballDirection.z = -ballDirection.z;
// }

// // Show Reset Button
// function showResetButton() {
//     const button = document.createElement('button');
//     button.innerText = 'Reset Game';
//     button.classList.add('reset-button');
//     document.body.appendChild(button);

//     button.addEventListener('click', () => {
//         playerScore = 0;
//         player2Score = 0;
//         gameOver = false;
//         updateScore();

//         // Remove win message if it exists
//         if (winMessageText) {
//             scene.remove(winMessageText);
//             winMessageText.geometry.dispose();
//             winMessageText = null;
//         }
//         button.remove();
//     });
// }

// // Animation loop
// function animate() {
//     controls.update();
//     updateBall();
//     renderer.render(scene, camera);
//     requestAnimationFrame(animate);
// }

// // Key controls
// document.addEventListener('keydown', (event) => {
//     if (event.key === 'ArrowLeft') movePlayerPaddle(-1);
//     if (event.key === 'ArrowRight') movePlayerPaddle(1);
//     if (event.key === 'a') movePlayer2Paddle(-1);
//     if (event.key === 'd') movePlayer2Paddle(1);
// });
// animate();

// // Resize handling
// function setLayout() {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// }
// window.addEventListener('resize', setLayout);

// ----------------------------------third--------------------------------
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
renderer.shadowMap.enabled = true;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('rgb(30, 30, 30)');

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 12);
scene.add(camera);

// Light
const light = new THREE.AmbientLight(0x404040);
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(-3, 5, 1);
scene.add(directionalLight);

// Ball
const ballRadius = 0.3;
const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
scene.add(ball);

// Paddles
const paddleWidth = 2;
const paddleHeight = 0.2;
const paddleDepth = 1;
const paddleGeometry = new THREE.BoxGeometry(paddleWidth, paddleHeight, paddleDepth);
const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

const playerPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
playerPaddle.position.set(0, 0.5, 5);
scene.add(playerPaddle);

const player2Paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
player2Paddle.position.set(0, 0.5, -5);
scene.add(player2Paddle);

// Side Walls
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 10), wallMaterial);
leftWall.position.set(-5, 0.5, 0);
scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 10), wallMaterial);
rightWall.position.set(5, 0.5, 0);
scene.add(rightWall);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Variables
let ballDirection = new THREE.Vector3(0.05, 0, 0.1);
let playerScore = 0;
let player2Score = 0;
let gameOver = false;
let font;
let lastTimestamp = 0;

// Initialize Texts
let playerScoreText, player2ScoreText, winMessageText, player1ControlsText, player2ControlsText, instructionsText;
const fontLoader = new FontLoader();

// Load Font Once
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (loadedFont) => {
    font = loadedFont;
    createScoreTexts();
    createControlTexts();
    createInstructionsText();
});

// Create Initial Score Texts
function createScoreTexts() {
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Player 1 Score Text
    playerScoreText = new THREE.Mesh(
        new TextGeometry(playerScore.toString(), { font, size: 0.5, height: 0.1 }),
        textMaterial
    );
    playerScoreText.position.set(-3, 3, 0);
    scene.add(playerScoreText);

    // Player 2 Score Text
    player2ScoreText = new THREE.Mesh(
        new TextGeometry(player2Score.toString(), { font, size: 0.5, height: 0.1 }),
        textMaterial
    );
    player2ScoreText.position.set(3, 3, 0);
    scene.add(player2ScoreText);
}

// Create Control Texts Above Paddles
function createControlTexts() {
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    // Player 1 Controls Text
    player1ControlsText = new THREE.Mesh(
        new TextGeometry('<- Arrow Keys ->', { font, size: 0.3, height: 0.05 }),
        textMaterial
    );
    player1ControlsText.position.set(-1.5, 1, 5);
    scene.add(player1ControlsText);

    // Player 2 Controls Text
    player2ControlsText = new THREE.Mesh(
        new TextGeometry('<- A - D ->', { font, size: 0.3, height: 0.05 }),
        textMaterial
    );
    player2ControlsText.position.set(-1.5, 1, -5);
    scene.add(player2ControlsText);
}

// Create Instructions Text at the Back
function createInstructionsText() {
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Gold color

    instructionsText = new THREE.Mesh(
        new TextGeometry('Score 10 points to win!', { font, size: 0.5, height: 0.1 }),
        textMaterial
    );
    instructionsText.position.set(-10, 5, -8);
    scene.add(instructionsText);
}

// Function to Update Score Texts
function updateScore() {
    if (font) {
        // Update Player 1 Score Text
        scene.remove(playerScoreText);
        playerScoreText.geometry.dispose();
        playerScoreText.geometry = new TextGeometry(playerScore.toString(), { font, size: 0.5, height: 0.1 });
        scene.add(playerScoreText);

        // Update Player 2 Score Text
        scene.remove(player2ScoreText);
        player2ScoreText.geometry.dispose();
        player2ScoreText.geometry = new TextGeometry(player2Score.toString(), { font, size: 0.5, height: 0.1 });
        scene.add(player2ScoreText);
    }
}

// Function to Show Win Message
function showWinMessage(winner) {
    if (font && !winMessageText) {
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Gold color
        winMessageText = new THREE.Mesh(
            new TextGeometry(`${winner} Wins!`, { font, size: 0.7, height: 0.2 }),
            textMaterial
        );
        winMessageText.position.set(-3, 4, 0);
        scene.add(winMessageText);
    }
}

// Move Player Paddle
function movePlayerPaddle(direction) {
    playerPaddle.position.x += direction * 0.2;
    playerPaddle.position.x = Math.max(-4, Math.min(4, playerPaddle.position.x));
}

function movePlayer2Paddle(direction) {
    player2Paddle.position.x += direction * 0.2;
    player2Paddle.position.x = Math.max(-4, Math.min(4, player2Paddle.position.x));
}

// Detect Collisions and Update Ball Position
function updateBall(deltaTime) {
    if (gameOver) return;

    // Scale the ball movement by delta time
    ball.position.addScaledVector(ballDirection, deltaTime * 50); //speed ajustment of the ball

    // Bounce off walls
    if (ball.position.x > 4.9 || ball.position.x < -4.9) {
        ballDirection.x = -ballDirection.x;
    }

    // Bounce off paddles
    if (ball.position.distanceTo(playerPaddle.position) < 0.6) {
        ballDirection.z = -ballDirection.z;
    }
    if (ball.position.distanceTo(player2Paddle.position) < 0.6) {
        ballDirection.z = -ballDirection.z;
    }

    // Score and reset if ball passes paddles
    if (ball.position.z > 6) {
        player2Score++;
        checkGameOver('Player 2');
        resetBall();
    } else if (ball.position.z < -6) {
        playerScore++;
        checkGameOver('Player 1');
        resetBall();
    }
    updateScore();
}

// Check Game Over
function checkGameOver(winner) {
    if (playerScore >= 10 || player2Score >= 10) {
        gameOver = true;
        showWinMessage(winner);
        showResetButton();
    }
}

// Reset Ball Position
function resetBall() {
    ball.position.set(0, 0.5, 0);
    ballDirection.z = -ballDirection.z;
}

// Show Reset Button
function showResetButton() {
    const button = document.createElement('button');
    button.innerText = 'Reset Game';
    button.classList.add('reset-button');
    document.body.appendChild(button);

    button.addEventListener('click', () => {
        playerScore = 0;
        player2Score = 0;
        gameOver = false;
        updateScore();

        // Remove win message if it exists
        if (winMessageText) {
            scene.remove(winMessageText);
            winMessageText.geometry.dispose();
            winMessageText = null;
        }
        button.remove();
    });
}

// Animation loop
function animate(timestamp = 0) {
    // Calculate time delta in seconds
    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Update controls
    controls.update();

    // Update the ball position using delta time
    updateBall(deltaTime);

    // Render the scene
    renderer.render(scene, camera);

    // Request the next frame
    requestAnimationFrame(animate);
}

// Key controls
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') movePlayerPaddle(-1);
    if (event.key === 'ArrowRight') movePlayerPaddle(1);
    if (event.key === 'a') movePlayer2Paddle(-1);
    if (event.key === 'd') movePlayer2Paddle(1);
});
animate();

// Resize handling
function setLayout() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', setLayout);
//------------------------------------fourt----------------------------------

// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
// import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// const canvas = document.querySelector('#three-canvas');
// const renderer = new THREE.WebGLRenderer({
//     canvas,
//     antialias: true
// });

// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
// renderer.shadowMap.enabled = true;

// // Scene
// const scene = new THREE.Scene();
// scene.background = new THREE.Color('rgb(30, 30, 30)');

// // Camera
// const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.set(0, 5, 12);
// scene.add(camera);

// // Light
// const light = new THREE.AmbientLight(0x404040);
// scene.add(light);
// const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
// directionalLight.position.set(-3, 5, 1);
// scene.add(directionalLight);

// // Ball
// const ballRadius = 0.3;
// const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
// const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
// const ball = new THREE.Mesh(ballGeometry, ballMaterial);
// scene.add(ball);

// // GLTFLoader and paddles
// const gltfLoader = new GLTFLoader();
// let paddle1, paddle2;
// let scale = 0.018

// // Load Paddle 1
// gltfLoader.load('./assets/paddle.glb', (gltf) => {
//     console.log("Paddle 1 loaded");
//     paddle1 = gltf.scene;
//     paddle1.position.set(0, 0.5, 5);
//     paddle1.scale.set(scale, scale, scale);
//     scene.add(paddle1);

//     // Paddle movement function for Paddle 1
//     function movePlayerPaddle(direction) {
//         paddle1.position.x += direction * 0.2;
//         paddle1.position.x = Math.max(-4, Math.min(4, paddle1.position.x));
//     }

//     // Key event listener for Paddle 1 controls
//     document.addEventListener('keydown', (event) => {
//         if (event.key === 'ArrowLeft') movePlayerPaddle(-1);
//         if (event.key === 'ArrowRight') movePlayerPaddle(1);
//     });
// });

// // Load Paddle 2
// gltfLoader.load('./assets/paddle2.glb', (gltf) => {
//     console.log("Paddle 2 loaded");
//     paddle2 = gltf.scene;
//     paddle2.position.set(0, 0.5, -5);
//     paddle2.scale.set(scale, scale, scale);
//     scene.add(paddle2);

//     // Paddle movement function for Paddle 2
//     function movePlayer2Paddle(direction) {
//         paddle2.position.x += direction * 0.2;
//         paddle2.position.x = Math.max(-4, Math.min(4, paddle2.position.x));
//     }

//     // Key event listener for Paddle 2 controls
//     document.addEventListener('keydown', (event) => {
//         if (event.key === 'a') movePlayer2Paddle(-1);
//         if (event.key === 'd') movePlayer2Paddle(1);
//     });
// });

// // Side Walls
// const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
// const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 10), wallMaterial);
// leftWall.position.set(-5, 0.5, 0);
// scene.add(leftWall);

// const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 10), wallMaterial);
// rightWall.position.set(5, 0.5, 0);
// scene.add(rightWall);

// // Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

// // Variables
// let ballDirection = new THREE.Vector3(0.05, 0, 0.1);
// let playerScore = 0;
// let player2Score = 0;
// let gameOver = false;
// let font;

// // Update Ball Position and Check Collisions
// function updateBall() {
//     if (gameOver) return;

//     ball.position.add(ballDirection);

//     // Bounce off walls
//     if (ball.position.x > 4.9 || ball.position.x < -4.9) {
//         ballDirection.x = -ballDirection.x;
//     }

//     // Bounce off paddles if loaded
//     if (paddle1 && ball.position.distanceTo(paddle1.position) < 0.6) {
//         ballDirection.z = -ballDirection.z;
//     }
//     if (paddle2 && ball.position.distanceTo(paddle2.position) < 0.6) {
//         ballDirection.z = -ballDirection.z;
//     }

//     // Score and reset if ball passes paddles
//     if (ball.position.z > 6) {
//         player2Score++;
//         resetBall();
//     } else if (ball.position.z < -6) {
//         playerScore++;
//         resetBall();
//     }
// }

// // Reset Ball Position
// function resetBall() {
//     ball.position.set(0, 0.5, 0);
//     ballDirection.z = -ballDirection.z;
// }

// // Animation loop
// function animate() {
//     controls.update();
//     updateBall();
//     renderer.render(scene, camera);
//     requestAnimationFrame(animate);
// }

// // Start the animation
// animate();

// // Resize handling
// function setLayout() {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// }
// window.addEventListener('resize', setLayout);



