// Variables globales del juego
let currentScreen = 'mainMenu';
let gameState = {
    energy: 100,
    cells: 1,
    isPaused: false,
    gameSpeed: 'normal'
};

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeMenu();
    initializeBackgroundAnimation();
    setupEventListeners();
});

// Inicializar el menú
function initializeMenu() {
    showScreen('mainMenu');
}

// Mostrar una pantalla específica
function showScreen(screenId) {
    // Ocultar todas las pantallas
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Botones del menú principal
    document.getElementById('playBtn').addEventListener('click', () => {
        // Redireccionar sutilmente a la pantalla de juego
        window.location.href = 'juego.html';
    });
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
        showScreen('settingsScreen');
    });
    
    document.getElementById('instructionsBtn').addEventListener('click', () => {
        showScreen('instructionsScreen');
    });
    
    document.getElementById('creditsBtn').addEventListener('click', () => {
        showScreen('creditsScreen');
    });
    
    // Botones de volver al menú
    document.getElementById('backToMenuBtn').addEventListener('click', () => {
        showScreen('mainMenu');
    });
    
    document.getElementById('backToMenuBtn2').addEventListener('click', () => {
        showScreen('mainMenu');
    });
    
    document.getElementById('backToMenuBtn3').addEventListener('click', () => {
        showScreen('mainMenu');
    });
    
    // Botones del juego
    document.getElementById('divideBtn').addEventListener('click', divideCell);
    document.getElementById('evolveBtn').addEventListener('click', evolveCell);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    
    // Configuración - Cargar valores guardados
    loadSettings();
    
    // Configuración
    document.getElementById('volumeSlider').addEventListener('input', updateVolume);
    document.getElementById('gameSpeed').addEventListener('change', updateGameSpeed);
    document.getElementById('graphicsQuality').addEventListener('change', updateGraphicsQuality);
}

// Animación de fondo del menú principal
function initializeBackgroundAnimation() {
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Partículas celulares para el fondo
    const particles = [];
    const particleCount = 50;
    
    // Crear partículas
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            color: Math.random() > 0.5 ? '#00ff88' : '#00ccff'
        });
    }
    
    // Función de animación
    function animateBackground() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibujar partículas
        particles.forEach(particle => {
            // Actualizar posición
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Rebotar en los bordes
            if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
            
            // Mantener dentro del canvas
            particle.x = Math.max(0, Math.min(canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(canvas.height, particle.y));
            
            // Dibujar partícula
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
            ctx.fill();
            
            // Efecto de brillo
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Dibujar conexiones entre partículas cercanas
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 255, 136, ${0.1 * (1 - distance / 100)})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animateBackground);
    }
    
    animateBackground();
}

// Funciones del juego
function startGame() {
    console.log('Iniciando juego...');
    // Aquí inicializaremos la lógica del juego
    initializeGameCanvas();
}

function initializeGameCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas del juego
    function resizeGameCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeGameCanvas();
    window.addEventListener('resize', resizeGameCanvas);
    
    // Dibujar célula inicial
    drawInitialCell();
}

function drawInitialCell() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar célula principal
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 30;
    
    // Cuerpo de la célula
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff88';
    ctx.fill();
    
    // Borde brillante
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Núcleo
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // Efecto de brillo
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff88';
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Funciones de las células
function divideCell() {
    if (gameState.energy >= 20) {
        gameState.energy -= 20;
        gameState.cells += 1;
        updateUI();
        console.log('Célula dividida!');
        
        // Aquí añadiremos la lógica visual de división
        animateCellDivision();
    } else {
        console.log('No hay suficiente energía para dividir');
    }
}

function evolveCell() {
    if (gameState.energy >= 50) {
        gameState.energy -= 50;
        updateUI();
        console.log('Célula evolucionada!');
        
        // Aquí añadiremos la lógica de evolución
        animateCellEvolution();
    } else {
        console.log('No hay suficiente energía para evolucionar');
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.textContent = gameState.isPaused ? 'REANUDAR' : 'PAUSAR';
    console.log('Juego ' + (gameState.isPaused ? 'pausado' : 'reanudado'));
}

// Actualizar interfaz de usuario
function updateUI() {
    document.getElementById('energyValue').textContent = gameState.energy;
    document.getElementById('cellsValue').textContent = gameState.cells;
    
    const energyFill = document.getElementById('energyFill');
    energyFill.style.width = gameState.energy + '%';
}

// Animaciones
function animateCellDivision() {
    // Animación de división celular
    console.log('Animando división...');
}

function animateCellEvolution() {
    // Animación de evolución celular
    console.log('Animando evolución...');
}

// Funciones de configuración
function loadSettings() {
    // Cargar configuración desde localStorage
    const savedVolume = localStorage.getItem('gameVolume') || '50';
    const savedSpeed = localStorage.getItem('gameSpeed') || 'normal';
    const savedQuality = localStorage.getItem('graphicsQuality') || 'medium';
    
    // Aplicar valores a los controles
    const volumeSlider = document.getElementById('volumeSlider');
    const gameSpeedSelect = document.getElementById('gameSpeed');
    const graphicsQualitySelect = document.getElementById('graphicsQuality');
    
    if (volumeSlider) volumeSlider.value = savedVolume;
    if (gameSpeedSelect) gameSpeedSelect.value = savedSpeed;
    if (graphicsQualitySelect) graphicsQualitySelect.value = savedQuality;
    
    console.log('Configuración cargada:', { volume: savedVolume, speed: savedSpeed, quality: savedQuality });
}

function updateVolume() {
    const volume = document.getElementById('volumeSlider').value;
    localStorage.setItem('gameVolume', volume);
    console.log('Volumen actualizado:', volume);
}

function updateGameSpeed() {
    const speed = document.getElementById('gameSpeed').value;
    localStorage.setItem('gameSpeed', speed);
    console.log('Velocidad del juego actualizada:', speed);
}

function updateGraphicsQuality() {
    const quality = document.getElementById('graphicsQuality').value;
    localStorage.setItem('graphicsQuality', quality);
    console.log('Calidad gráfica actualizada:', quality);
}

// Sistema de energía automático
setInterval(() => {
    if (currentScreen === 'gameScreen' && !gameState.isPaused) {
        // Consumir energía lentamente
        if (gameState.energy > 0) {
            gameState.energy -= 0.1;
            updateUI();
        }
        
        // Generar energía ocasionalmente
        if (Math.random() < 0.01) {
            gameState.energy = Math.min(100, gameState.energy + 5);
            updateUI();
        }
    }
}, 100);

// Manejo de teclado
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'Escape':
            if (currentScreen !== 'mainMenu') {
                showScreen('mainMenu');
            }
            break;
        case ' ':
            if (currentScreen === 'gameScreen') {
                event.preventDefault();
                togglePause();
            }
            break;
        case 'd':
        case 'D':
            if (currentScreen === 'gameScreen') {
                divideCell();
            }
            break;
        case 'e':
        case 'E':
            if (currentScreen === 'gameScreen') {
                evolveCell();
            }
            break;
    }
});
