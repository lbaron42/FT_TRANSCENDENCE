export function toggle3dButton()
{
    const threeDButton = document.getElementById('3d');
    const twoDButton = document.getElementById('2d');
    const canvas2d = document.getElementById('game-canvas');
    const canvas3d = document.getElementById('three-canvas');

    // Set initial state to 3D
    threeDButton.classList.add('active');
    twoDButton.classList.remove('active');
    canvas2d.style.display = 'block';
    canvas3d.style.display = 'none';

    // Add back the 3D button event listener
    threeDButton.addEventListener('click', async () => {
        threeDButton.classList.add('active');
        twoDButton.classList.remove('active');
        canvas2d.style.display = 'none';
        canvas3d.style.display = 'block';
        
        const game3dModule = await import('./game_3d.js');
        game3dModule.cleanup();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        gameSettings.contextType = '3d';
        game3dModule.initGame3D(canvas3d);
        game3dModule.resizeRenderer(canvas3d.clientWidth, canvas3d.clientHeight);
        game3dModule.animate();
    });

    twoDButton.addEventListener('click', async () => {
        twoDButton.classList.add('active');
        threeDButton.classList.remove('active');
        canvas3d.style.display = 'none';
        canvas2d.style.display = 'block';
        gameSettings.contextType = '2d';
        
        // Clean up 3D resources
        const game3dModule = await import('./game_3d.js');
        game3dModule.cleanup();
    });

    // Fix the resize handler
    window.addEventListener('resize', resize3d);
}

export function resize3d() {
    let resizeTimeout;
    const canvas3d = document.getElementById('three-canvas');
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(async () => {
        if (gameSettings.contextType === '3d') {
            const game3dModule = await import('./game_3d.js');
            game3dModule.resizeRenderer(canvas3d.clientWidth, canvas3d.clientHeight);
        }
    }, 100);
}