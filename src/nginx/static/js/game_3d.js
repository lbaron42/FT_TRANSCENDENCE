import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// Move all initialization into a function
let scene, camera, renderer, controls, ball, playerPaddle, player2Paddle;
let playerScoreText, player2ScoreText;
let font;
let currentScore = { left: 0, right: 0 };
let starfield;

export function initGame3D(canvas) {
    // Initialize renderer with explicit pixel ratio and size handling
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    
    // Set size with explicit pixel ratio
    const pixelRatio = window.devicePixelRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // Ensure canvas is visible and properly sized
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Scene with darker background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000814);  // Very dark blue, almost black

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);  // Increased intensity
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(-3, 5, 1);
    mainLight.castShadow = true;
    scene.add(mainLight);

    // Add point lights for dramatic effect
    const pointLight1 = new THREE.PointLight(0x00ff00, 0.5, 10);
    pointLight1.position.set(-5, 2, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff0000, 0.5, 10);
    pointLight2.position.set(5, 2, 0);
    scene.add(pointLight2);

    // Define world dimensions to match 2D aspect ratio
    const worldWidth = 20;  // For 1000 pixels
    const worldDepth = 10;  // For 500 pixels

    // Enhanced ball with glow effect
    const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.position.y = 0.3; // Back to original height
    scene.add(ball);

    // Enhanced paddles with metallic effect
    const paddleGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
    const paddleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00,
        metalness: 0.6,
        roughness: 0.2,
        emissive: 0x00ff00,
        emissiveIntensity: 0.2
    });

    playerPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
    // Position before rotation: (x=forward/back, y=up/down, z=left/right)
    playerPaddle.position.set(-10, 0.25, 0);
    // After this rotation, x becomes z and z becomes -x
    playerPaddle.rotation.y = Math.PI / 2;
    playerPaddle.castShadow = true;
    scene.add(playerPaddle);

    player2Paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
    player2Paddle.position.set(10, 0.25, 0);
    player2Paddle.rotation.y = Math.PI / 2;
    player2Paddle.castShadow = true;
    scene.add(player2Paddle);

    // Load texture with error handling and logging
    const textureLoader = new THREE.TextureLoader();
    console.log('Attempting to load texture from:', '/images/42_logo.png');
    
    let floor; // Declare floor variable at a higher scope
    
    const texture = textureLoader.load(
        '/images/42_logo.png',
        (loadedTexture) => {
            console.log('Texture loaded successfully');
            loadedTexture.wrapS = THREE.RepeatWrapping;
            loadedTexture.wrapT = THREE.RepeatWrapping;
            loadedTexture.repeat.set(1, 1);
            loadedTexture.flipY = false;
            
            // Update the floor material when texture is loaded
            if (floor && floor.material) {
                floor.material.map = loadedTexture;
                floor.material.needsUpdate = true;
            }
        },
        (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
            console.error('Error loading texture:', error);
        }
    );

    // Floor (matches world dimensions)
    const floorGeometry = new THREE.PlaneGeometry(worldWidth, worldDepth);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: texture,
        side: THREE.DoubleSide,
        metalness: 0.2,
        roughness: 0.8,
    });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid overlay (optional - for added effect)
    const gridGeometry = new THREE.PlaneGeometry(worldWidth, worldDepth, 40, 20);
    const gridMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    grid.position.y = 0.01; // Slightly above the textured floor
    grid.receiveShadow = true;
    scene.add(grid);

    // Walls (match world dimensions)
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0066ff,  // Bright blue color
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0x001133,  // Slight blue glow
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
    });

    const topWall = new THREE.Mesh(new THREE.BoxGeometry(worldWidth, 0.5, 0.1), wallMaterial);
    topWall.position.set(0, 0.25, -worldDepth/2);
    topWall.castShadow = true;
    topWall.receiveShadow = true;
    scene.add(topWall);

    const bottomWall = new THREE.Mesh(new THREE.BoxGeometry(worldWidth, 0.5, 0.1), wallMaterial);
    bottomWall.position.set(0, 0.25, worldDepth/2);
    bottomWall.castShadow = true;
    bottomWall.receiveShadow = true;
    scene.add(bottomWall);

    // Enable shadow mapping in renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create starfield before loading font
    createStarfield();
    
    // Load Font and create score displays
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (loadedFont) => {
        font = loadedFont;
        createScoreDisplays();
        createInstructionsText(canvas.max_score);
    });

    // Camera - adjust to view from front
    camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 12); // Position camera in front
    camera.lookAt(0, 0, 0);        // Look at the center

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2;
}

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = [];
    
    for (let i = 0; i < starCount; i++) {
        // Random position in a large sphere
        const radius = Math.random() * 100 + 50;  // Between 50 and 150
        const theta = Math.random() * Math.PI * 2;  // Around the sphere
        const phi = Math.acos((Math.random() * 2) - 1);  // Up and down
        
        positions.push(
            radius * Math.sin(phi) * Math.cos(theta),  // x
            radius * Math.sin(phi) * Math.sin(theta),  // y
            radius * Math.cos(phi)                     // z
        );
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.5,
        sizeAttenuation: true,  // Enable size attenuation
    });
    
    starfield = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starfield);
}

function updateStarfield() {
    if (!starfield) return;
    
    // Rotate the starfield slowly
    starfield.rotation.y += 0.0001;
    starfield.rotation.x += 0.0001;
}

function createScoreDisplays() {
    if (!font || !scene) return;

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });

    // Create initial score texts with depth instead of height
    playerScoreText = new THREE.Mesh(
        new TextGeometry(currentScore.left.toString(), {
            font: font,
            size: 0.8,
            depth: 0.1,  // Changed from height to depth
        }),
        textMaterial
    );
    playerScoreText.position.set(-2, 3, 0);
    scene.add(playerScoreText);

    player2ScoreText = new THREE.Mesh(
        new TextGeometry(currentScore.right.toString(), {
            font: font,
            size: 0.8,
            depth: 0.1,  // Changed from height to depth
        }),
        textMaterial
    );
    player2ScoreText.position.set(2, 3, 0);
    scene.add(player2ScoreText);
}

function updateScoreDisplays() {
    if (!font || !scene) return;

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 }); // Yellow color

    // Update left score
    if (playerScoreText) {
        scene.remove(playerScoreText);
        playerScoreText.geometry.dispose();
    }
    playerScoreText = new THREE.Mesh(
        new TextGeometry(currentScore.left.toString(), {
            font: font,
            size: 0.8,
            depth: 0.1,  // Changed from height to depth
        }),
        textMaterial
    );
    playerScoreText.position.set(-2, 3, 0);
    scene.add(playerScoreText);

    // Update right score
    if (player2ScoreText) {
        scene.remove(player2ScoreText);
        player2ScoreText.geometry.dispose();
    }
    player2ScoreText = new THREE.Mesh(
        new TextGeometry(currentScore.right.toString(), {
            font: font,
            size: 0.8,
            depth: 0.1,  // Changed from height to depth
        }),
        textMaterial
    );
    player2ScoreText.position.set(2, 3, 0);
    scene.add(player2ScoreText);
}

// Add function to create instructions text
function createInstructionsText(max_score) {
    if (!font) return;

    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const instructionsText = new THREE.Mesh(
        new TextGeometry(`Score ${max_score} points to win!`, {
            font: font,
            size: 0.5,
            depth: 0.1,  // Changed from height to depth
        }),
        textMaterial
    );
    instructionsText.position.set(-3, 3, -4);
    scene.add(instructionsText);
}

export function updateGameState(gameSettings, paddleL, paddleR, ballX, ballY) {
    if (!scene || !ball || !playerPaddle || !player2Paddle) return;

    const worldWidth = 20;  // Match the initialization values
    const worldDepth = 10;

    // Store the initial Z offset that we set in the paddle creation
    const zOffset = 0.5;  // Match the value we set in position.set()

    // Update paddles - add the zOffset to maintain the forward position
    playerPaddle.position.z = (((paddleL / gameSettings.canvas.height) * worldDepth) - (worldDepth / 2)) + zOffset;
    player2Paddle.position.z = (((paddleR / gameSettings.canvas.height) * worldDepth) - (worldDepth / 2)) + zOffset;

    // Update ball position
    ball.position.z = ((ballY / gameSettings.canvas.height) * worldDepth) - (worldDepth / 2);
    ball.position.x = ((ballX / gameSettings.canvas.width) * worldWidth) - (worldWidth / 2);

    // Update scores
    const scoreText = gameSettings.scoreBoard.textContent;
    const scores = scoreText.match(/(\d+)\s*\|\s*(\d+)/);
    if (scores) {
        currentScore.left = parseInt(scores[1]);
        currentScore.right = parseInt(scores[2]);
        updateScoreDisplays();
    }

    // Store max_score on canvas for later use
    renderer.domElement.max_score = gameSettings.max_score;
}

export function animate() {
    if (!scene || !camera || !renderer) return;
    
    requestAnimationFrame(animate);
    controls?.update();
    updateStarfield();
    renderer.render(scene, camera);
}

export function resizeRenderer(width, height) {
    if (!renderer || !camera) return;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

// Add cleanup function
export function cleanup() {
    // Cancel any pending animation frame
    if (window.animationFrameId) {
        cancelAnimationFrame(window.animationFrameId);
        window.animationFrameId = null;
    }

    if (scene) {
        // Dispose of all meshes, materials, and geometries
        scene.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });

        // Clear the scene
        while(scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
    
    if (controls) {
        controls.dispose();
        controls = null;
    }

    // Reset all variables but keep renderer and scene
    camera = null;
    ball = null;
    playerPaddle = null;
    player2Paddle = null;
    playerScoreText = null;
    player2ScoreText = null;
    font = null;
    currentScore = { left: 0, right: 0 };
}