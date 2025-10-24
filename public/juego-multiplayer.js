// ========================================
// MITOSIS MULTIJUGADOR - Cliente
// ========================================

// Variables globales del juego
let gameState = {
    isPaused: false,
    startTime: Date.now(),
    survivalTime: 0,
    totalMass: 100,
    cells: 1,
    generation: 1,
    currency: 0,
    upgrades: {
        armor: false,
        speed: false,
        doubleConsume: false,
        megaConsume: false,
        expansion: false
    },
    temporaryEffects: {
        doubleConsume: { active: false, timeLeft: 0 },
        megaConsume: { active: false, timeLeft: 0 }
    }
};

// Configuración del juego
const GAME_CONFIG = {
    mapSize: 4000,
    cameraSpeed: 5,
    initialMass: 100,
    minMassToDivide: 50,
    divisionRatio: 0.6,
    attractionForce: 0.3,
    friction: 0.98,
    maxSpeed: 8,
    consumableCount: 200,
    consumableMass: [5, 15, 25],
    consumableColors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
    shop: {
        upgrades: {
            armor: { cost: 200, effect: 0.2 },
            speed: { cost: 150, effect: 0.15 },
            doubleConsume: { cost: 250, duration: 30000 },
            megaConsume: { cost: 500, duration: 15000 },
            expansion: { cost: 300, effect: 1 }
        },
        currencyGain: {
            perConsumable: 5,
            perSecond: 1,
            perDivision: 10
        }
    }
};

// Variables del juego
let canvas, ctx;
let camera = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 };
let keys = {};
let isRightClickPressed = false;
let gameLoop;

// Arrays de objetos del juego
let playerCells = [];
let consumables = [];
let stars = [];
let otherPlayers = new Map();

// Variables de la tienda
let shopOpen = false;
let lastCurrencyUpdate = Date.now();

// Variables de conexión
let socket;
let currentRoomId;
let playerName;
let isConnected = false;

// ========================================
// INICIALIZACIÓN DEL JUEGO
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    setupEventListeners();
    setupConnectionEvents();
});

function initializeGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    createPlayerCell();
    createStarField();
    
    updateUI();
    
    console.log('Juego multijugador inicializado');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ========================================
// CONEXIÓN Y SALAS
// ========================================

function setupConnectionEvents() {
    // Botones de conexión
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('createRoomBtn').addEventListener('click', createRoom);
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);
    
    // Generar código de sala automático
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        const roomCode = generateRoomCode();
        document.getElementById('roomCode').value = roomCode;
    });
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function joinRoom() {
    playerName = document.getElementById('playerName').value.trim();
    const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
    
    if (!playerName) {
        alert('Por favor ingresa tu nombre');
        return;
    }
    
    if (!roomCode) {
        alert('Por favor ingresa un código de sala');
        return;
    }
    
    // Conectar con Socket.IO
    socket = io();
    
    socket.on('connect', () => {
        console.log('Conectado al servidor');
        isConnected = true;
        
        // Unirse a la sala
        socket.emit('joinRoom', {
            roomId: roomCode,
            playerName: playerName
        });
    });
    
    socket.on('roomJoined', (data) => {
        if (data.success) {
            currentRoomId = data.roomId;
            showScreen('waitingScreen');
            updateWaitingScreen(data);
            console.log('Unido a la sala:', data.roomId);
        } else {
            alert('Error: ' + data.message);
        }
    });
    
    socket.on('playerJoined', (data) => {
        updatePlayersList(data.player);
    });
    
    socket.on('playerLeft', (data) => {
        removePlayerFromList(data.playerId);
    });
    
    socket.on('gameStateUpdate', (data) => {
        updateGameState(data);
    });
    
    socket.on('playerUpdated', (data) => {
        otherPlayers.set(data.playerId, data.player);
    });
    
    socket.on('objectConsumed', (data) => {
        // Remover objeto consumido por otro jugador
        consumables = consumables.filter(c => c.id !== data.consumableId);
    });
    
    socket.on('playerConsumed', (data) => {
        if (data.victimId === socket.id) {
            // Fuiste consumido
            showMessage('¡Fuiste consumido! Respawn en 5 segundos...', 'error');
            gameState.isPaused = true;
        } else if (data.attackerId === socket.id) {
            // Consumiste a alguien
            gameState.currency += data.massGained;
            showMessage(`¡Consumiste a un jugador! +${Math.floor(data.massGained)}💰`, 'success');
        }
    });
    
    socket.on('playerRespawned', (data) => {
        if (data.playerId === socket.id) {
            // Respawn exitoso
            gameState.isPaused = false;
            createPlayerCell(); // Reiniciar células
            showMessage('¡Respawn exitoso!', 'success');
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado del servidor');
        isConnected = false;
        showMessage('Conexión perdida', 'error');
    });
}

function createRoom() {
    const roomCode = generateRoomCode();
    document.getElementById('roomCode').value = roomCode;
    joinRoom();
}

function startGame() {
    showScreen('gameCanvas');
    startGameLoop();
}

function leaveRoom() {
    if (socket) {
        socket.disconnect();
    }
    showScreen('connectionScreen');
    isConnected = false;
}

function updateWaitingScreen(data) {
    document.getElementById('currentRoomCode').textContent = data.roomId;
    document.getElementById('playerCount').textContent = data.players.length;
    
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    data.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.textContent = player.name;
        playersList.appendChild(playerDiv);
    });
    
    // Habilitar botón de inicio si hay al menos 2 jugadores
    const startBtn = document.getElementById('startGameBtn');
    startBtn.disabled = data.players.length < 2;
}

function updatePlayersList(player) {
    const playersList = document.getElementById('playersList');
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item';
    playerDiv.textContent = player.name;
    playersList.appendChild(playerDiv);
    
    // Actualizar contador
    const count = document.getElementById('playerCount');
    count.textContent = parseInt(count.textContent) + 1;
}

function removePlayerFromList(playerId) {
    // Actualizar contador
    const count = document.getElementById('playerCount');
    count.textContent = parseInt(count.textContent) - 1;
}

function updateGameState(data) {
    consumables = data.consumables;
    
    // Actualizar otros jugadores
    data.players.forEach(player => {
        if (player.id !== socket.id) {
            otherPlayers.set(player.id, player);
        }
    });
}

// ========================================
// CREACIÓN DE ELEMENTOS DEL JUEGO
// ========================================

function createPlayerCell() {
    playerCells = [{
        id: 0,
        x: 0,
        y: 0,
        mass: GAME_CONFIG.initialMass,
        radius: massToRadius(GAME_CONFIG.initialMass),
        color: '#00ff88',
        velocityX: 0,
        velocityY: 0,
        isMain: true,
        generation: 1
    }];
}

function createStarField() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: (Math.random() - 0.5) * GAME_CONFIG.mapSize,
            y: (Math.random() - 0.5) * GAME_CONFIG.mapSize,
            size: Math.random() * 2 + 1,
            brightness: Math.random() * 0.8 + 0.2
        });
    }
}

function massToRadius(mass) {
    return Math.sqrt(mass) * 2;
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Eventos del canvas
    canvas.addEventListener('click', handleLeftClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    
    // Teclado
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Limpiar estado cuando se pierde el foco
    window.addEventListener('blur', forceStopAttraction);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            forceStopAttraction();
        }
    });
    
    // Botones de la interfaz
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            showScreen('settingsScreen');
        });
    }
    
    const shopBtn = document.getElementById('shopBtn');
    if (shopBtn) {
        shopBtn.addEventListener('click', (event) => {
            event.preventDefault();
            toggleShop();
        });
    }
    
    document.getElementById('menuBtn').addEventListener('click', () => {
        leaveRoom();
    });
    
    // Configuración
    loadSettings();
    document.getElementById('volumeSlider').addEventListener('input', updateVolume);
    document.getElementById('gameSpeed').addEventListener('change', updateGameSpeed);
    document.getElementById('graphicsQuality').addEventListener('change', updateGraphicsQuality);
    
    // Event listeners de la tienda
    setupShopEventListeners();
}

// ========================================
// FUNCIONES DE PANTALLAS
// ========================================

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen, .overlay-screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${type === 'success' ? 'rgba(0, 255, 136, 0.9)' : 
                    type === 'error' ? 'rgba(255, 107, 107, 0.9)' : 
                    'rgba(0, 204, 255, 0.9)'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 1000;
        animation: fadeInOut 2s ease-in-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 2000);
}

// ========================================
// SISTEMA DE TIENDA (Reutilizado del juego original)
// ========================================

function setupShopEventListeners() {
    const closeShopBtn = document.getElementById('closeShopBtn');
    if (closeShopBtn) {
        closeShopBtn.addEventListener('click', () => {
            toggleShop();
        });
    }
    
    const upgradeButtons = [
        { id: 'armorBtn', upgrade: 'armor' },
        { id: 'speedBtn', upgrade: 'speed' },
        { id: 'doubleConsumeBtn', upgrade: 'doubleConsume' },
        { id: 'megaConsumeBtn', upgrade: 'megaConsume' },
        { id: 'expansionBtn', upgrade: 'expansion' }
    ];
    
    upgradeButtons.forEach(({ id, upgrade }) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                purchaseUpgrade(upgrade);
            });
        }
    });
}

function toggleShop() {
    shopOpen = !shopOpen;
    const shopScreen = document.getElementById('shopScreen');
    
    if (shopOpen) {
        shopScreen.classList.add('active');
        updateShopUI();
    } else {
        shopScreen.classList.remove('active');
    }
}

function updateShopUI() {
    const balanceElement = document.getElementById('shopBalance');
    if (balanceElement) {
        balanceElement.textContent = Math.floor(gameState.currency);
    }
    
    updateUpgradeStatus('armor', gameState.upgrades.armor);
    updateUpgradeStatus('speed', gameState.upgrades.speed);
    updateUpgradeStatus('doubleConsume', gameState.temporaryEffects.doubleConsume.active);
    updateUpgradeStatus('megaConsume', gameState.temporaryEffects.megaConsume.active);
    updateUpgradeStatus('expansion', gameState.upgrades.expansion);
    
    updateUpgradeButtons();
}

function updateUpgradeStatus(upgradeType, isActive) {
    const statusElement = document.getElementById(`${upgradeType}Status`);
    if (statusElement) {
        if (isActive) {
            statusElement.textContent = 'ACTIVA';
            statusElement.className = 'upgrade-status active';
        } else {
            statusElement.textContent = 'No activa';
            statusElement.className = 'upgrade-status';
        }
    }
}

function updateUpgradeButtons() {
    const upgrades = ['armor', 'speed', 'doubleConsume', 'megaConsume', 'expansion'];
    
    upgrades.forEach(upgrade => {
        const btn = document.getElementById(`${upgrade}Btn`);
        const card = document.getElementById(`${upgrade}Upgrade`);
        
        if (btn && card) {
            const cost = GAME_CONFIG.shop.upgrades[upgrade].cost;
            const canAfford = gameState.currency >= cost;
            
            btn.disabled = !canAfford;
            
            if (gameState.upgrades[upgrade] || 
                (upgrade === 'doubleConsume' && gameState.temporaryEffects.doubleConsume.active) ||
                (upgrade === 'megaConsume' && gameState.temporaryEffects.megaConsume.active)) {
                card.classList.add('purchased');
                btn.textContent = 'COMPRADO';
                btn.disabled = true;
            } else {
                card.classList.remove('purchased');
            }
        }
    });
}

function purchaseUpgrade(upgradeType) {
    const upgradeConfig = GAME_CONFIG.shop.upgrades[upgradeType];
    const cost = upgradeConfig.cost;
    
    if (gameState.currency < cost) {
        showMessage('Saldo insuficiente', 'error');
        return;
    }
    
    if (gameState.upgrades[upgradeType] || 
        (upgradeType === 'doubleConsume' && gameState.temporaryEffects.doubleConsume.active) ||
        (upgradeType === 'megaConsume' && gameState.temporaryEffects.megaConsume.active)) {
        showMessage('Ya tienes esta mejora', 'warning');
        return;
    }
    
    gameState.currency -= cost;
    
    if (upgradeType === 'doubleConsume' || upgradeType === 'megaConsume') {
        const duration = upgradeConfig.duration;
        gameState.temporaryEffects[upgradeType] = {
            active: true,
            timeLeft: duration
        };
        
        showMessage(`¡${upgradeType === 'doubleConsume' ? 'Doble Consumo' : 'Mega Consumo'} activado!`, 'success');
    } else {
        gameState.upgrades[upgradeType] = true;
        showMessage(`¡${upgradeType} aplicada!`, 'success');
    }
    
    updateShopUI();
    
    // Enviar actualización al servidor
    if (socket && isConnected) {
        socket.emit('updatePlayer', {
            cells: playerCells,
            currency: gameState.currency,
            upgrades: gameState.upgrades,
            temporaryEffects: gameState.temporaryEffects
        });
    }
}

// ========================================
// FUNCIONES DE CONFIGURACIÓN
// ========================================

function loadSettings() {
    const savedVolume = localStorage.getItem('gameVolume') || '50';
    const savedSpeed = localStorage.getItem('gameSpeed') || 'normal';
    const savedQuality = localStorage.getItem('graphicsQuality') || 'medium';
    
    const volumeSlider = document.getElementById('volumeSlider');
    const gameSpeedSelect = document.getElementById('gameSpeed');
    const graphicsQualitySelect = document.getElementById('graphicsQuality');
    
    if (volumeSlider) volumeSlider.value = savedVolume;
    if (gameSpeedSelect) gameSpeedSelect.value = savedSpeed;
    if (graphicsQualitySelect) graphicsQualitySelect.value = savedQuality;
}

function updateVolume() {
    const volume = document.getElementById('volumeSlider').value;
    localStorage.setItem('gameVolume', volume);
}

function updateGameSpeed() {
    const speed = document.getElementById('gameSpeed').value;
    localStorage.setItem('gameSpeed', speed);
}

function updateGraphicsQuality() {
    const quality = document.getElementById('graphicsQuality').value;
    localStorage.setItem('graphicsQuality', quality);
}

// ========================================
// MECÁNICAS DE JUEGO (Simplificadas para multijugador)
// ========================================

function handleLeftClick(event) {
    if (gameState.isPaused || !isConnected) return;
    
    const rect = canvas.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
    
    const worldX = mousePos.x - camera.x;
    const worldY = mousePos.y - camera.y;
    
    divideCellTowards(worldX, worldY);
}

function handleRightClick(event) {
    event.preventDefault();
}

function handleMouseDown(event) {
    if (event.button === 2) {
        startAttraction();
    }
}

function handleMouseUp(event) {
    if (event.button === 2) {
        stopAttraction();
    }
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
}

function handleKeyDown(event) {
    keys[event.key.toLowerCase()] = true;
    
    if (event.key === ' ') {
        event.preventDefault();
        togglePause();
    }
    
    if (event.key === 'Escape') {
        showScreen('connectionScreen');
    }
}

function handleKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
}

function divideCellTowards(targetX, targetY) {
    const mainCell = playerCells[0];
    
    if (mainCell.mass < GAME_CONFIG.minMassToDivide) {
        return;
    }
    
    const maxDivisions = 5 + (gameState.upgrades.expansion ? GAME_CONFIG.shop.upgrades.expansion.effect : 0);
    if (playerCells.length >= maxDivisions) {
        return;
    }
    
    const dx = targetX - mainCell.x;
    const dy = targetY - mainCell.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 10) return;
    
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    const newMass = mainCell.mass * (1 - GAME_CONFIG.divisionRatio);
    const remainingMass = mainCell.mass * GAME_CONFIG.divisionRatio;
    
    const newCell = {
        id: playerCells.length,
        x: mainCell.x + dirX * (mainCell.radius + massToRadius(newMass) + 10),
        y: mainCell.y + dirY * (mainCell.radius + massToRadius(newMass) + 10),
        mass: newMass,
        radius: massToRadius(newMass),
        color: mainCell.color,
        velocityX: dirX * 5,
        velocityY: dirY * 5,
        isMain: false,
        generation: mainCell.generation + 1
    };
    
    mainCell.mass = remainingMass;
    mainCell.radius = massToRadius(remainingMass);
    
    playerCells.push(newCell);
    gameState.cells = playerCells.length;
    gameState.generation = Math.max(gameState.generation, newCell.generation);
    
    gameState.currency += GAME_CONFIG.shop.currencyGain.perDivision;
    
    // Enviar al servidor
    if (socket && isConnected) {
        socket.emit('divideCell', { newCell: newCell });
        socket.emit('updatePlayer', {
            cells: playerCells,
            currency: gameState.currency,
            upgrades: gameState.upgrades,
            temporaryEffects: gameState.temporaryEffects
        });
    }
    
    updateUI();
}

function startAttraction() {
    isRightClickPressed = true;
}

function stopAttraction() {
    isRightClickPressed = false;
}

function forceStopAttraction() {
    isRightClickPressed = false;
}

// ========================================
// BUCLE PRINCIPAL DEL JUEGO
// ========================================

function startGameLoop() {
    if (gameLoop) clearInterval(gameLoop);
    
    gameLoop = setInterval(() => {
        if (!gameState.isPaused) {
            updateGame();
            renderGame();
        }
    }, 1000 / 60);
}

function updateGame() {
    gameState.survivalTime = Math.floor((Date.now() - gameState.startTime) / 1000);
    
    updateCurrency();
    updateTemporaryEffects();
    updateCamera();
    updatePlayerCells();
    checkConsumption();
    checkPlayerCollisions();
    updateUI();
    
    // Enviar actualización al servidor cada 100ms
    if (socket && isConnected && Date.now() % 100 < 16) {
        socket.emit('updatePlayer', {
            cells: playerCells,
            currency: gameState.currency,
            upgrades: gameState.upgrades,
            temporaryEffects: gameState.temporaryEffects
        });
    }
}

function updateCurrency() {
    const now = Date.now();
    const deltaTime = now - lastCurrencyUpdate;
    
    if (deltaTime >= 1000) {
        gameState.currency += GAME_CONFIG.shop.currencyGain.perSecond;
        lastCurrencyUpdate = now;
    }
}

function updateTemporaryEffects() {
    Object.keys(gameState.temporaryEffects).forEach(effect => {
        if (gameState.temporaryEffects[effect].active) {
            gameState.temporaryEffects[effect].timeLeft -= 16;
            
            if (gameState.temporaryEffects[effect].timeLeft <= 0) {
                gameState.temporaryEffects[effect].active = false;
                gameState.temporaryEffects[effect].timeLeft = 0;
            }
        }
    });
}

function updateCamera() {
    const mainCell = playerCells[0];
    
    camera.x = canvas.width / 2 - mainCell.x;
    camera.y = canvas.height / 2 - mainCell.y;
}

function updatePlayerCells() {
    const mainCell = playerCells[0];
    
    let moveX = 0;
    let moveY = 0;
    
    let speedMultiplier = 1;
    if (gameState.upgrades.speed) {
        speedMultiplier += GAME_CONFIG.shop.upgrades.speed.effect;
    }
    
    const currentSpeed = GAME_CONFIG.cameraSpeed * speedMultiplier;
    
    if (keys['w'] || keys['arrowup']) moveY -= currentSpeed;
    if (keys['s'] || keys['arrowdown']) moveY += currentSpeed;
    if (keys['a'] || keys['arrowleft']) moveX -= currentSpeed;
    if (keys['d'] || keys['arrowright']) moveX += currentSpeed;
    
    mainCell.x += moveX;
    mainCell.y += moveY;
    
    const mainCellVelocity = { x: moveX, y: moveY };
    
    for (let i = 1; i < playerCells.length; i++) {
        const cell = playerCells[i];
        
        cell.velocityX *= GAME_CONFIG.friction;
        cell.velocityY *= GAME_CONFIG.friction;
        
        if (!isRightClickPressed) {
            const formationIndex = i - 1;
            const formationRadius = mainCell.radius + 80 + (formationIndex * 30);
            const formationAngle = (formationIndex * Math.PI * 2) / Math.max(playerCells.length - 1, 1);
            
            const targetX = mainCell.x + Math.cos(formationAngle) * formationRadius;
            const targetY = mainCell.y + Math.sin(formationAngle) * formationRadius;
            
            const dx = targetX - cell.x;
            const dy = targetY - cell.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 10) {
                const followSpeed = (Math.sqrt(mainCellVelocity.x ** 2 + mainCellVelocity.y ** 2) * 0.4) || GAME_CONFIG.attractionForce * 0.2;
                const force = followSpeed * (1 / Math.max(dist, 1));
                cell.velocityX += dx * force;
                cell.velocityY += dy * force;
            }
            
            cell.x += mainCellVelocity.x * 0.5;
            cell.y += mainCellVelocity.y * 0.5;
        }
        
        if (isRightClickPressed) {
            const dx = mainCell.x - cell.x;
            const dy = mainCell.y - cell.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 5) {
                const force = GAME_CONFIG.attractionForce * (1 / Math.max(dist, 1));
                cell.velocityX += dx * force;
                cell.velocityY += dy * force;
            }
        }
        
        const speed = Math.sqrt(cell.velocityX ** 2 + cell.velocityY ** 2);
        if (speed > GAME_CONFIG.maxSpeed) {
            cell.velocityX = (cell.velocityX / speed) * GAME_CONFIG.maxSpeed;
            cell.velocityY = (cell.velocityY / speed) * GAME_CONFIG.maxSpeed;
        }
        
        cell.x += cell.velocityX;
        cell.y += cell.velocityY;
        
        const maxPos = GAME_CONFIG.mapSize / 2;
        cell.x = Math.max(-maxPos, Math.min(maxPos, cell.x));
        cell.y = Math.max(-maxPos, Math.min(maxPos, cell.y));
    }
}

function checkConsumption() {
    const mainCell = playerCells[0];
    
    for (let i = consumables.length - 1; i >= 0; i--) {
        const consumable = consumables[i];
        const dist = distance(mainCell.x, mainCell.y, consumable.x, consumable.y);
        
        if (dist < mainCell.radius) {
            let massGained = consumable.mass;
            if (gameState.temporaryEffects.doubleConsume.active) {
                massGained *= 2;
            }
            if (gameState.temporaryEffects.megaConsume.active) {
                massGained *= 5;
            }
            
            mainCell.mass += massGained;
            mainCell.radius = massToRadius(mainCell.mass);
            gameState.totalMass = mainCell.mass;
            
            gameState.currency += GAME_CONFIG.shop.currencyGain.perConsumable;
            
            // Enviar al servidor
            if (socket && isConnected) {
                socket.emit('consumeObject', { consumableId: consumable.id });
            }
            
            consumables.splice(i, 1);
        }
    }
    
    for (let j = 1; j < playerCells.length; j++) {
        const dividedCell = playerCells[j];
        
        for (let i = consumables.length - 1; i >= 0; i--) {
            const consumable = consumables[i];
            const dist = distance(dividedCell.x, dividedCell.y, consumable.x, consumable.y);
            
            if (dist < dividedCell.radius) {
                let massGained = consumable.mass;
                if (gameState.temporaryEffects.doubleConsume.active) {
                    massGained *= 2;
                }
                if (gameState.temporaryEffects.megaConsume.active) {
                    massGained *= 5;
                }
                
                dividedCell.mass += massGained;
                dividedCell.radius = massToRadius(dividedCell.mass);
                
                gameState.currency += GAME_CONFIG.shop.currencyGain.perConsumable;
                
                if (socket && isConnected) {
                    socket.emit('consumeObject', { consumableId: consumable.id });
                }
                
                consumables.splice(i, 1);
            }
        }
    }
}

function checkPlayerCollisions() {
    const mainCell = playerCells[0];
    const mainMass = mainCell.mass;
    
    otherPlayers.forEach((otherPlayer, playerId) => {
        if (!otherPlayer.isAlive) return;
        
        otherPlayer.cells.forEach(otherCell => {
            const dist = distance(mainCell.x, mainCell.y, otherCell.x, otherCell.y);
            
            if (dist < mainCell.radius + otherCell.radius) {
                const otherMass = otherCell.mass;
                
                if (mainMass > otherMass * 1.2) {
                    // Consumir al otro jugador
                    if (socket && isConnected) {
                        socket.emit('playerCollision', { victimId: playerId });
                    }
                }
            }
        });
    });
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ========================================
// RENDERIZADO
// ========================================

function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawStarField();
    drawConsumables();
    drawOtherPlayers();
    drawPlayerCells();
    drawEffects();
}

function drawStarField() {
    stars.forEach(star => {
        const screenX = star.x + camera.x;
        const screenY = star.y + camera.y;
        
        if (screenX > -50 && screenX < canvas.width + 50 && 
            screenY > -50 && screenY < canvas.height + 50) {
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.fill();
        }
    });
}

function drawConsumables() {
    consumables.forEach(consumable => {
        const screenX = consumable.x + camera.x;
        const screenY = consumable.y + camera.y;
        
        if (screenX > -50 && screenX < canvas.width + 50 && 
            screenY > -50 && screenY < canvas.height + 50) {
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = consumable.color;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, massToRadius(consumable.mass), 0, Math.PI * 2);
            ctx.fillStyle = consumable.color;
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }
    });
}

function drawOtherPlayers() {
    otherPlayers.forEach((player, playerId) => {
        if (!player.isAlive) return;
        
        player.cells.forEach(cell => {
            const screenX = cell.x + camera.x;
            const screenY = cell.y + camera.y;
            
            if (screenX > -cell.radius && screenX < canvas.width + cell.radius && 
                screenY > -cell.radius && screenY < canvas.height + cell.radius) {
                
                ctx.shadowBlur = 15;
                ctx.shadowColor = cell.color;
                
                ctx.beginPath();
                ctx.arc(screenX, screenY, cell.radius, 0, Math.PI * 2);
                ctx.fillStyle = cell.color;
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(screenX, screenY, cell.radius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                
                ctx.shadowBlur = 0;
                
                // Nombre del jugador
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(player.name, screenX, screenY - cell.radius - 10);
            }
        });
    });
}

function drawPlayerCells() {
    playerCells.forEach((cell, index) => {
        const screenX = cell.x + camera.x;
        const screenY = cell.y + camera.y;
        
        if (screenX > -cell.radius && screenX < canvas.width + cell.radius && 
            screenY > -cell.radius && screenY < canvas.height + cell.radius) {
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = cell.color;
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, cell.radius, 0, Math.PI * 2);
            ctx.fillStyle = cell.color;
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, cell.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            ctx.shadowBlur = 0;
            
            drawUpgradeEffects(cell, screenX, screenY);
            
            if (!cell.isMain) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(cell.generation.toString(), screenX, screenY + 4);
            }
        }
    });
}

function drawUpgradeEffects(cell, screenX, screenY) {
    if (gameState.upgrades.armor && cell.isMain) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    if (gameState.upgrades.speed && cell.isMain) {
        const time = Date.now() * 0.01;
        for (let i = 0; i < 5; i++) {
            const angle = (time + i * 0.5) % (Math.PI * 2);
            const particleX = screenX + Math.cos(angle) * (cell.radius + 15);
            const particleY = screenY + Math.sin(angle) * (cell.radius + 15);
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.fill();
        }
    }
    
    if (gameState.temporaryEffects.doubleConsume.active) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const timeLeft = Math.ceil(gameState.temporaryEffects.doubleConsume.timeLeft / 1000);
        ctx.fillStyle = '#00ccff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`x2 (${timeLeft}s)`, screenX, screenY - cell.radius - 20);
    }
    
    if (gameState.temporaryEffects.megaConsume.active) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        const timeLeft = Math.ceil(gameState.temporaryEffects.megaConsume.timeLeft / 1000);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`x5 (${timeLeft}s)`, screenX, screenY - cell.radius - 25);
    }
    
    if (gameState.upgrades.expansion && cell.isMain) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(128, 0, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawEffects() {
    if (isRightClickPressed) {
        const mainCell = playerCells[0];
        const screenX = mainCell.x + camera.x;
        const screenY = mainCell.y + camera.y;
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, mainCell.radius + 30, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

// ========================================
// UI Y UTILIDADES
// ========================================

function updateUI() {
    document.getElementById('cellsValue').textContent = gameState.cells;
    document.getElementById('generationValue').textContent = gameState.generation;
    document.getElementById('timeValue').textContent = gameState.survivalTime + 's';
    document.getElementById('currencyValue').textContent = Math.floor(gameState.currency);
    
    const mainCell = playerCells[0];
    if (mainCell) {
        document.getElementById('cellSize').textContent = Math.floor(mainCell.radius) + 'px';
        document.getElementById('cellSpeed').textContent = gameState.upgrades.speed ? 'Mejorada' : 'Normal';
        document.getElementById('cellAbilities').textContent = isRightClickPressed ? 'Atrayendo' : 'Normal';
    }
    
    // Actualizar lista de jugadores online
    updateOnlinePlayersList();
}

function updateOnlinePlayersList() {
    const onlinePlayersList = document.getElementById('onlinePlayersList');
    if (!onlinePlayersList) return;
    
    onlinePlayersList.innerHTML = '';
    
    otherPlayers.forEach((player, playerId) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'info-item';
        playerDiv.innerHTML = `
            <span style="color: ${player.cells[0]?.color || '#ffffff'}">●</span>
            <span>${player.name}</span>
            <span>${player.isAlive ? 'Vivo' : 'Muerto'}</span>
        `;
        onlinePlayersList.appendChild(playerDiv);
    });
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
}
