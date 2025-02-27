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
let ballTrail;
let trailPoints = [];
const MAX_TRAIL_LENGTH = 40;  // Even longer trail
const BALL_SIZE = 0.3;  // Keep original ball size

// Add these global variables at the top
let impactParticles = [];
let cameraShakeIntensity = 0;
const SHAKE_DECAY = 0.9;
let scoreAnimations = {
    left: { scale: 1, time: 0 },
    right: { scale: 1, time: 0 }
};
const SCORE_ANIMATION_DURATION = 1.0; // Duration in seconds
const MAX_SCALE = 1.5; // Maximum scale during animation

// Add after other global variables
let leftInstructions, rightInstructions;

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
    const ballGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.position.y = 0.15;
    scene.add(ball);

    // Create a circular particle texture programmatically
    const particleTexture = createParticleTexture();

    // Add trail system
    const trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.9,  // Higher base opacity
        size: BALL_SIZE * 3,  // Much bigger starting size
        sizeAttenuation: true,
        map: particleTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
    });
    ballTrail = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(ballTrail);

    // Enhanced paddles with metallic effect
    const paddleGeometry = new THREE.BoxGeometry(1, 0.5, 0.3);
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
        const instructions = createPlayerInstructions();
        leftInstructions = instructions.leftInstructions;
        rightInstructions = instructions.rightInstructions;
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

    // Create base material with emissive properties
    const textMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.5,
        shininess: 100
    });

    // Update left score
    if (playerScoreText) {
        scene.remove(playerScoreText);
        playerScoreText.geometry.dispose();
    }
    playerScoreText = new THREE.Mesh(
        new TextGeometry(currentScore.left.toString(), {
            font: font,
            size: 0.8,
            depth: 0.2,
        }),
        textMaterial.clone() // Clone material for independent animation
    );
    playerScoreText.position.set(-2, 3, 0);
    // Apply current animation scale
    const leftScale = scoreAnimations.left.scale;
    playerScoreText.scale.set(leftScale, leftScale, leftScale);
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
            depth: 0.2,
        }),
        textMaterial.clone() // Clone material for independent animation
    );
    player2ScoreText.position.set(2, 3, 0);
    // Apply current animation scale
    const rightScale = scoreAnimations.right.scale;
    player2ScoreText.scale.set(rightScale, rightScale, rightScale);
    scene.add(player2ScoreText);
}

// Update the createInstructionsText function
function createInstructionsText(max_score) {
    if (!font) return;

    // Create a group to hold text and glow
    const textGroup = new THREE.Group();

    // Main text with glow effect
    const textMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff3333,          // Bright red
        emissive: 0xff0000,       // Red glow
        emissiveIntensity: 0.5,   // Reduced glow intensity
        shininess: 50,
        transparent: true,
        opacity: 0.9
    });

    // Create main text
    const mainText = new THREE.Mesh(
        new TextGeometry(`Score ${max_score} points to win!`, {
            font: font,
            size: 0.6,            // Slightly larger
            depth: 0.05,          // Thinner depth
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.01,
            bevelSegments: 5
        }),
        textMaterial
    );

    // Create outer glow
    const glowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.3,
        side: THREE.FrontSide    // Only show front face
    });

    const glowText = mainText.clone();
    glowText.material = glowMaterial;
    glowText.scale.multiplyScalar(1.02); // Just slightly larger
    glowText.position.z = 0.01; // Slightly in front

    // Add both to group
    textGroup.add(mainText);
    textGroup.add(glowText);

    // Position the group - moved forward and up for better visibility
    textGroup.position.set(-3.5, 4, -2);
    textGroup.rotation.x = -0.2; // Slight tilt for better readability

    // Add animation data
    textGroup.userData = {
        pulseTime: 0,
        baseIntensity: 0.5
    };

    scene.add(textGroup);
    return textGroup;
}

// Update the glow animation
function updateInstructionsGlow(textGroup, deltaTime) {
    if (!textGroup) return;

    textGroup.userData.pulseTime += deltaTime * 3; // Faster pulse
    const pulseFactor = (Math.sin(textGroup.userData.pulseTime) + 1) / 2;

    const mainText = textGroup.children[0];
    const glowText = textGroup.children[1];

    if (mainText.material && glowText.material) {
        // Subtle pulse for main text
        mainText.material.emissiveIntensity = 
            textGroup.userData.baseIntensity * (0.9 + pulseFactor * 0.2);
        
        // More pronounced pulse for glow
        glowText.material.opacity = 0.2 + pulseFactor * 0.2;
        glowText.material.emissiveIntensity = 0.4 + pulseFactor * 0.3;
    }
}

// Add this new function to create the impact effect
function createImpactEffect(position, color) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    // Create particles in a circular burst pattern
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.1;
        const radius = 0.2;
        
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        
        velocities.push({
            x: Math.cos(angle) * speed,
            y: (Math.random() - 0.5) * speed,
            z: Math.sin(angle) * speed
        });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: color,
        size: BALL_SIZE * 1.5,
        transparent: true,
        opacity: 1,
        map: createParticleTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    impactParticles.push({
        mesh: particles,
        velocities: velocities,
        life: 1.0
    });
}

// Add this function to update impact particles
function updateImpactParticles() {
    for (let i = impactParticles.length - 1; i >= 0; i--) {
        const impact = impactParticles[i];
        impact.life -= 0.05;
        
        const positions = impact.mesh.geometry.attributes.position.array;
        
        // Update particle positions based on velocities
        for (let j = 0; j < positions.length / 3; j++) {
            positions[j * 3] += impact.velocities[j].x;
            positions[j * 3 + 1] += impact.velocities[j].y;
            positions[j * 3 + 2] += impact.velocities[j].z;
            
            // Add gravity effect
            impact.velocities[j].y -= 0.003;
        }
        
        impact.mesh.geometry.attributes.position.needsUpdate = true;
        impact.mesh.material.opacity = impact.life;
        
        // Remove dead particles
        if (impact.life <= 0) {
            scene.remove(impact.mesh);
            impact.mesh.geometry.dispose();
            impact.mesh.material.dispose();
            impactParticles.splice(i, 1);
        }
    }
}

// Add camera shake function
function updateCameraShake() {
    if (cameraShakeIntensity > 0) {
        camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.z += (Math.random() - 0.5) * cameraShakeIntensity;
        
        cameraShakeIntensity *= SHAKE_DECAY;
        
        if (cameraShakeIntensity < 0.001) {
            cameraShakeIntensity = 0;
        }
    }
}

// Add this new function to handle score animations
function updateScoreAnimations(deltaTime) {
    let needsUpdate = false;

    // Update left score animation
    if (scoreAnimations.left.time > 0) {
        scoreAnimations.left.time -= deltaTime;
        const progress = 1 - (scoreAnimations.left.time / SCORE_ANIMATION_DURATION);
        const easeOutProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        
        if (progress <= 0.5) {
            // Scale up during first half
            scoreAnimations.left.scale = 1 + (MAX_SCALE - 1) * (1 - Math.pow(1 - progress * 2, 3));
        } else {
            // Scale down during second half
            scoreAnimations.left.scale = 1 + (MAX_SCALE - 1) * Math.pow(1 - (progress - 0.5) * 2, 3);
        }
        
        if (playerScoreText) {
            const scale = scoreAnimations.left.scale;
            playerScoreText.scale.set(scale, scale, scale);
            playerScoreText.material.emissiveIntensity = 1 - easeOutProgress;
        }
        needsUpdate = true;
    }

    // Update right score animation
    if (scoreAnimations.right.time > 0) {
        scoreAnimations.right.time -= deltaTime;
        const progress = 1 - (scoreAnimations.right.time / SCORE_ANIMATION_DURATION);
        const easeOutProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
        
        if (progress <= 0.5) {
            // Scale up during first half
            scoreAnimations.right.scale = 1 + (MAX_SCALE - 1) * (1 - Math.pow(1 - progress * 2, 3));
        } else {
            // Scale down during second half
            scoreAnimations.right.scale = 1 + (MAX_SCALE - 1) * Math.pow(1 - (progress - 0.5) * 2, 3);
        }
        
        if (player2ScoreText) {
            const scale = scoreAnimations.right.scale;
            player2ScoreText.scale.set(scale, scale, scale);
            player2ScoreText.material.emissiveIntensity = 1 - easeOutProgress;
        }
        needsUpdate = true;
    }

    return needsUpdate;
}

// Update the updateGameState function to trigger score animations
export function updateGameState(gameSettings, paddleL, paddleR, ballX, ballY) {
    if (!scene || !ball || !playerPaddle || !player2Paddle) return;

    const worldWidth = 20;  // Match the initialization values
    const worldDepth = 10;

    // Store the initial Z offset that we set in the paddle creation
    const zOffset = 0.5;  // Match the value we set in position.set()

    // Store previous ball position for collision detection
    const prevBallX = ball.position.x;

    // Update paddles - add the zOffset to maintain the forward position
    playerPaddle.position.z = (((paddleL / gameSettings.canvas.height) * worldDepth) - (worldDepth / 2)) + zOffset;
    player2Paddle.position.z = (((paddleR / gameSettings.canvas.height) * worldDepth) - (worldDepth / 2)) + zOffset;

    // Update ball position
    const newBallX = ((ballX / gameSettings.canvas.width) * worldWidth) - (worldWidth / 2);
    const newBallZ = ((ballY / gameSettings.canvas.height) * worldDepth) - (worldDepth / 2);

    // Check for paddle collisions
    if (Math.abs(newBallX - prevBallX) > 0.1) { // Ball direction changed significantly
        const color = (newBallX > 0) ? 0x00ff00 : 0xff0000;
        createImpactEffect(ball.position, color);
        cameraShakeIntensity = 0.1; // Trigger screen shake
    }

    // Update positions
    ball.position.x = newBallX;
    ball.position.z = newBallZ;

    // Update scores and trigger animations
    const scoreText = gameSettings.scoreBoard.textContent;
    const scores = scoreText.match(/(\d+)\s*\|\s*(\d+)/);
    if (scores) {
        const newLeft = parseInt(scores[1]);
        const newRight = parseInt(scores[2]);
        
        // Check if scores changed
        if (newLeft > currentScore.left) {
            scoreAnimations.left.time = SCORE_ANIMATION_DURATION;
            scoreAnimations.left.scale = 1;
        }
        if (newRight > currentScore.right) {
            scoreAnimations.right.time = SCORE_ANIMATION_DURATION;
            scoreAnimations.right.scale = 1;
        }
        
        currentScore.left = newLeft;
        currentScore.right = newRight;
        updateScoreDisplays();
    }

    // Store max_score on canvas for later use
    renderer.domElement.max_score = gameSettings.max_score;
}

// Update the animate function
export function animate() {
    if (!scene || !camera || !renderer) return;
    
    const deltaTime = 1/60;
    
    requestAnimationFrame(animate);
    controls?.update();
    updateStarfield();
    updateBallTrail();
    updateImpactParticles();
    updateCameraShake();
    
    // Update score animations
    let needsUpdate = updateScoreAnimations(deltaTime);
    
    // Update instruction glow
    scene.traverse((object) => {
        if (object.isGroup && object.userData.hasOwnProperty('pulseTime')) {
            updateInstructionsGlow(object, deltaTime);
            needsUpdate = true;
        }
    });

    if (leftInstructions) updateFloatingInstructions(leftInstructions, deltaTime);
    if (rightInstructions) updateFloatingInstructions(rightInstructions, deltaTime);

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

    if (ballTrail) {
        ballTrail.geometry.dispose();
        ballTrail.material.dispose();
        ballTrail = null;
    }
    trailPoints = [];

    // Clean up impact particles
    impactParticles.forEach(impact => {
        scene.remove(impact.mesh);
        impact.mesh.geometry.dispose();
        impact.mesh.material.dispose();
    });
    impactParticles = [];
    cameraShakeIntensity = 0;

    scoreAnimations = {
        left: { scale: 1, time: 0 },
        right: { scale: 1, time: 0 }
    };

    leftInstructions = null;
    rightInstructions = null;
}

function updateBallTrail() {
    if (!ball || !ballTrail) return;

    // Add current position to trail
    trailPoints.unshift({
        x: ball.position.x,
        y: ball.position.y,
        z: ball.position.z
    });

    // Limit trail length
    if (trailPoints.length > MAX_TRAIL_LENGTH) {
        trailPoints.pop();
    }

    // Prepare buffer attributes
    const positions = new Float32Array(trailPoints.length * 3);
    const sizes = new Float32Array(trailPoints.length);
    const colors = new Float32Array(trailPoints.length * 3);
    
    trailPoints.forEach((point, i) => {
        const progress = i / MAX_TRAIL_LENGTH;
        
        // Position
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        // Size - Start much larger and shrink more gradually
        sizes[i] = BALL_SIZE * (4.0 - progress * 3.0);

        // Smooth fading effect for opacity
        const opacity = Math.pow(1 - progress, 1.5); // Even less aggressive fade

        // Color - Brighter at the start, fades to dim red
        colors[i * 3] = 1.0;      // Red
        colors[i * 3 + 1] = 0.8 * (1 - progress);  // Even more orange
        colors[i * 3 + 2] = 0.3 * (1 - progress);  // More orange glow
        
        // Apply opacity to colors
        colors[i * 3] *= opacity;
        colors[i * 3 + 1] *= opacity;
        colors[i * 3 + 2] *= opacity;
    });

    ballTrail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ballTrail.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    ballTrail.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}


// Create a circular particle texture programmatically
function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    
    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 3;

    // Create radial gradient
    const gradient = context.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    // Draw circle
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = true;
    return texture;
}

// Modify the createPlayerInstructions function
function createPlayerInstructions() {
    if (!font) return;

    // Create materials with glow effect
    const textMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff,          // Cyan
        emissive: 0x00ffff,       // Cyan glow
        emissiveIntensity: 0.5,   
        shininess: 50,
        transparent: true,
        opacity: 0.9
    });

    // Create arrow geometry
    const arrowGeometry = new THREE.BufferGeometry();
    const arrowVertices = new Float32Array([
        0, 0.3, 0,    // Tip
        -0.1, 0, 0,   // Bottom left
        0.1, 0, 0,    // Bottom right
    ]);
    arrowGeometry.setAttribute('position', new THREE.BufferAttribute(arrowVertices, 3));

    // Left player instructions (Up/Down arrows)
    const leftGroup = new THREE.Group();
    
    // Up arrow
    const upArrow = new THREE.Mesh(arrowGeometry, textMaterial.clone());
    upArrow.position.set(0, 0.4, 0);
    
    // Down arrow
    const downArrow = new THREE.Mesh(arrowGeometry, textMaterial.clone());
    downArrow.rotation.z = Math.PI;
    downArrow.position.set(0, -0.4, 0);
    
    // Text for left controls
    const leftText = new THREE.Mesh(
        new TextGeometry('W\n\n\nS', {
            font: font,
            size: 0.3,
            height: 0.05,
            curveSegments: 12,
            bevelEnabled: false
        }),
        textMaterial.clone()
    );
    leftText.position.set(-0.5, 0.6, 0);

    // Right player instructions (Up/Down arrows)
    const rightGroup = new THREE.Group();
    
    // Up arrow
    const upArrow2 = upArrow.clone();
    
    // Down arrow
    const downArrow2 = downArrow.clone();
    
    // Text for right controls
    const rightText = new THREE.Mesh(
        new TextGeometry('up\n\n\ndown', {
            font: font,
            size: 0.3,
            height: 0.05,
            curveSegments: 12,
            bevelEnabled: false
        }),
        textMaterial.clone()
    );
    rightText.position.set(0.3, 0.6, 0);

    // Add glow effect
    const glowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.3,
        side: THREE.FrontSide
    });

    // Create glow meshes
    const leftGlow = new THREE.Group();
    leftGlow.add(upArrow.clone());
    leftGlow.add(downArrow.clone());
    leftGlow.add(leftText.clone());
    leftGlow.children.forEach(child => {
        child.material = glowMaterial.clone();
        child.scale.multiplyScalar(1.02);
    });
    leftGlow.position.z = 0.01;

    const rightGlow = new THREE.Group();
    rightGlow.add(upArrow2.clone());
    rightGlow.add(downArrow2.clone());
    rightGlow.add(rightText.clone());
    rightGlow.children.forEach(child => {
        child.material = glowMaterial.clone();
        child.scale.multiplyScalar(1.02);
    });
    rightGlow.position.z = 0.01;

    // Add all elements to their groups
    leftGroup.add(upArrow);
    leftGroup.add(downArrow);
    leftGroup.add(leftText);
    leftGroup.add(leftGlow);
    
    rightGroup.add(upArrow2);
    rightGroup.add(downArrow2);
    rightGroup.add(rightText);
    rightGroup.add(rightGlow);

    // Position the groups vertically along the paddles
    leftGroup.position.set(-10, 2, 0);
    rightGroup.position.set(10, 2, 0);
    
    // Apply slight rotation for a dynamic effect
    leftGroup.rotation.y = 0.2;  // Slight twist to the left
    leftGroup.rotation.x = -0.2;   // Slight tilt back

    rightGroup.rotation.y = -0.2;  // Slight twist to the right
    rightGroup.rotation.x = -0.2;  // Slight tilt back
    
    // Add animation data
    leftGroup.userData = { pulseTime: 0, baseIntensity: 0.5, floatOffset: 0 };
    rightGroup.userData = { pulseTime: Math.PI, baseIntensity: 0.5, floatOffset: Math.PI };

    scene.add(leftGroup);
    scene.add(rightGroup);

    return { leftInstructions: leftGroup, rightInstructions: rightGroup };
}

// Add this function to update the floating animation
function updateFloatingInstructions(instructions, deltaTime) {
    if (!instructions) return;

    instructions.userData.pulseTime += deltaTime * 2;
    instructions.userData.floatOffset += deltaTime;

    // Floating motion
    const floatY = Math.sin(instructions.userData.floatOffset) * 0.1;
    instructions.position.y = instructions.position.y - (instructions.position.y - (2 + floatY)) * 0.1;

    // Pulsing glow
    const pulseFactor = (Math.sin(instructions.userData.pulseTime) + 1) / 2;
    
    const mainText = instructions.children[0];
    const glowText = instructions.children[1];

    if (mainText.material && glowText.material) {
        mainText.material.emissiveIntensity = 
            instructions.userData.baseIntensity * (0.8 + pulseFactor * 0.4);
        
        glowText.material.opacity = 0.2 + pulseFactor * 0.2;
        glowText.material.emissiveIntensity = 0.3 + pulseFactor * 0.3;
    }
}
