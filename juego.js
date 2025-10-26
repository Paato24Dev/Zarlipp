// ========================================
// MITOSIS GAME - Sistema Completo
// ========================================

// Variables globales del juego
let gameState = {
    isPaused: false,
    startTime: Date.now(),
    survivalTime: 0,
    totalMass: 100, // Masa total del jugador
    cells: 1,
    generation: 1,
    currency: 0, // Moneda del juego
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
    // Mapa
    mapSize: 4000, // Tamaño del mapa en píxeles
    cameraSpeed: 5, // Velocidad de movimiento de la cámara
    
    // Célula principal
    initialMass: 100,
    minMassToDivide: 50, // Masa mínima para dividir
    divisionRatio: 0.6, // Porcentaje de masa que se mantiene al dividir
    
    // Física
    attractionForce: 0.3, // Fuerza de atracción
    friction: 0.98, // Fricción del movimiento
    maxSpeed: 8, // Velocidad máxima
    
    // Objetos consumibles
    consumableCount: 200, // Número de objetos en el mapa
    consumableMass: [5, 15, 25], // Rangos de masa de objetos
    consumableColors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
    
    // Sistema de tienda
    shop: {
        upgrades: {
            armor: { cost: 200, effect: 0.2 }, // Reduce daño en 20%
            speed: { cost: 150, effect: 0.15 }, // Aumenta velocidad en 15%
            doubleConsume: { cost: 250, duration: 30000 }, // 30 segundos
            megaConsume: { cost: 500, duration: 15000 }, // 15 segundos
            expansion: { cost: 300, effect: 1 } // +1 división adicional
        },
        currencyGain: {
            perConsumable: 5, // Moneda por objeto consumido
            perSecond: 1, // Moneda por segundo jugado
            perDivision: 10 // Moneda por división exitosa
        }
    }
};

// Variables del juego
let canvas, ctx;
let camera = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 };
let keys = {};
let isRightClickPressed = false; // Controlar si el click derecho está presionado
let gameLoop;

// Arrays de objetos del juego
let playerCells = []; // Células del jugador
let consumables = []; // Objetos consumibles
let stars = []; // Estrellas de fondo

// Variables de la tienda
let shopOpen = false;
let lastCurrencyUpdate = Date.now();

// Variables multijugador
let otherPlayers = new Map();
let isMultiplayer = false;

// Evitar sumar varias veces el mismo consumible en online
const pendingConsumptions = new Set();
window.pendingConsumptions = pendingConsumptions; // para usarlo desde el HTML

// ========================================
// INICIALIZACIÓN DEL JUEGO
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    setupEventListeners();
    startGameLoop();
});

function initializeGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Configurar canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Crear elementos del juego
    createPlayerCell();
    
    // ✅ SOLO crear consumibles si NO está en multijugador
    if (!isMultiplayer) {
        createConsumables();
    }
    
    createStarField();
    
    // Actualizar UI
    updateUI();
    
    console.log('Juego inicializado - Mitosis v2.0');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ========================================
// CREACIÓN DE ELEMENTOS DEL JUEGO
// ========================================

function createPlayerCell() {
    // Obtener color personalizado guardado
    const playerColor = localStorage.getItem('playerColor') || '#00ff88';
    
    playerCells = [{
        id: 0,
        x: 0,
        y: 0,
        mass: GAME_CONFIG.initialMass,
        radius: massToRadius(GAME_CONFIG.initialMass),
        color: playerColor,
        velocityX: 0,
        velocityY: 0,
        isMain: true,
        generation: 1
    }];
    
    // Centrar la cámara en la célula principal
    camera.x = -playerCells[0].x + canvas.width / 2;
    camera.y = -playerCells[0].y + canvas.height / 2;
}

function createConsumables() {
    consumables = [];
    
    for (let i = 0; i < GAME_CONFIG.consumableCount; i++) {
        const mass = GAME_CONFIG.consumableMass[Math.floor(Math.random() * GAME_CONFIG.consumableMass.length)];
        const radius = massToRadius(mass);
        
        consumables.push({
            id: i,
            x: (Math.random() - 0.5) * GAME_CONFIG.mapSize,
            y: (Math.random() - 0.5) * GAME_CONFIG.mapSize,
            mass: mass,
            radius: radius,
            color: GAME_CONFIG.consumableColors[Math.floor(Math.random() * GAME_CONFIG.consumableColors.length)],
            type: 'consumable'
        });
    }
}

function createStarField() {
    stars = [];
    
    for (let i = 0; i < 500; i++) {
        stars.push({
            x: (Math.random() - 0.5) * GAME_CONFIG.mapSize * 2,
            y: (Math.random() - 0.5) * GAME_CONFIG.mapSize * 2,
            size: Math.random() * 2 + 0.5,
            brightness: Math.random() * 0.8 + 0.2,
            color: `hsl(${Math.random() * 60 + 200}, 70%, ${Math.random() * 30 + 50}%)`
        });
    }
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

function massToRadius(mass) {
    return Math.sqrt(mass) * 2;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// Masas permitidas para consumibles (respetar 5, 15, 25)
const ALLOWED_CONSUMABLE_MASSES = [5, 15, 25];

function getBaseConsumableMass(m) {
    const v = Math.round(+m || 0);
    // nos quedamos con el permitido más cercano
    let best = ALLOWED_CONSUMABLE_MASSES[0];
    let diff = Infinity;
    for (const a of ALLOWED_CONSUMABLE_MASSES) {
        const d = Math.abs(a - v);
        if (d < diff) { diff = d; best = a; }
    }
    return best;
}

// ========================================
// CONTROLES Y EVENTOS
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
        console.log('Botón de configuración encontrado:', settingsBtn);
        settingsBtn.addEventListener('click', () => {
            console.log('Botón configuración clickeado - FUNCIONANDO');
            showScreen('settingsScreen');
        });
    } else {
        console.error('No se encontró el botón de configuración');
    }
    const shopBtn = document.getElementById('shopBtn');
    if (shopBtn) {
        console.log('Botón de tienda encontrado:', shopBtn);
        shopBtn.addEventListener('click', (event) => {
            event.preventDefault();
            console.log('🛒 TIENDA clickeada - Abriendo tienda');
            toggleShop();
        });
    } else {
        console.error('No se encontró el botón de tienda');
    }
    document.getElementById('menuBtn').addEventListener('click', () => {
        window.location.href = '/Pantallainicio.html';
    });
    document.getElementById('backToGameBtn').addEventListener('click', () => {
        showScreen('gameScreen');
    });
    
    // Configuración - Cargar valores guardados
    loadSettings();
    
    // Configuración
    document.getElementById('volumeSlider').addEventListener('input', updateVolume);
    document.getElementById('gameSpeed').addEventListener('change', updateGameSpeed);
    document.getElementById('graphicsQuality').addEventListener('change', updateGraphicsQuality);
    
    // Event listeners de la tienda
    setupShopEventListeners();
}

// Función para mostrar pantallas
function showScreen(screenId) {
    console.log('Mostrando pantalla:', screenId);
    
    // Ocultar todas las pantallas
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla solicitada
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log('Pantalla activada:', screenId);
    } else {
        console.error('No se encontró la pantalla:', screenId);
    }
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

// ========================================
// SISTEMA DE TIENDA
// ========================================

function setupShopEventListeners() {
    // Botón cerrar tienda
    const closeShopBtn = document.getElementById('closeShopBtn');
    if (closeShopBtn) {
        closeShopBtn.addEventListener('click', () => {
            toggleShop();
        });
    }
    
    // Botones de mejoras
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
    
    console.log('Event listeners de tienda configurados');
}

function toggleShop() {
    shopOpen = !shopOpen;
    const shopScreen = document.getElementById('shopScreen');
    
    if (shopOpen) {
        shopScreen.classList.add('active');
        updateShopUI();
        console.log('🛒 Tienda abierta');
    } else {
        shopScreen.classList.remove('active');
        console.log('🛒 Tienda cerrada');
    }
}

function updateShopUI() {
    // Actualizar balance
    const balanceElement = document.getElementById('shopBalance');
    if (balanceElement) {
        balanceElement.textContent = gameState.currency;
    }
    
    // Actualizar estado de mejoras
    updateUpgradeStatus('armor', gameState.upgrades.armor);
    updateUpgradeStatus('speed', gameState.upgrades.speed);
    updateUpgradeStatus('doubleConsume', gameState.temporaryEffects.doubleConsume.active);
    updateUpgradeStatus('megaConsume', gameState.temporaryEffects.megaConsume.active);
    updateUpgradeStatus('expansion', gameState.upgrades.expansion);
    
    // Actualizar botones
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
        showShopMessage('Saldo insuficiente', 'error');
        return;
    }
    
    // Verificar si ya está comprado
    if (gameState.upgrades[upgradeType] || 
        (upgradeType === 'doubleConsume' && gameState.temporaryEffects.doubleConsume.active) ||
        (upgradeType === 'megaConsume' && gameState.temporaryEffects.megaConsume.active)) {
        showShopMessage('Ya tienes esta mejora', 'warning');
        return;
    }
    
    // Comprar mejora
    gameState.currency -= cost;
    
    if (upgradeType === 'doubleConsume' || upgradeType === 'megaConsume') {
        // Mejoras temporales
        const duration = upgradeConfig.duration;
        gameState.temporaryEffects[upgradeType] = {
            active: true,
            timeLeft: duration
        };
        
        showShopMessage(`¡${upgradeType === 'doubleConsume' ? 'Doble Consumo' : 'Mega Consumo'} activado!`, 'success');
        console.log(`🛒 ${upgradeType} activado por ${duration/1000} segundos`);
    } else {
        // Mejoras permanentes
        gameState.upgrades[upgradeType] = true;
        showShopMessage(`¡${upgradeType} aplicada!`, 'success');
        console.log(`🛒 ${upgradeType} comprada permanentemente`);
    }
    
    updateShopUI();
    applyUpgradeEffects();
}

function showShopMessage(message, type = 'info') {
    // Crear elemento de mensaje temporal
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

function applyUpgradeEffects() {
    // Los efectos se aplicarán en las funciones correspondientes del juego
    console.log('Efectos de mejoras aplicados:', gameState.upgrades);
}

function updateCurrency() {
    const now = Date.now();
    const deltaTime = now - lastCurrencyUpdate;
    
    // Ganar moneda por tiempo jugado
    if (deltaTime >= 1000) { // Cada segundo
        gameState.currency += GAME_CONFIG.shop.currencyGain.perSecond;
        lastCurrencyUpdate = now;
    }
}

function addCurrency(amount, reason = '') {
    gameState.currency += amount;
    console.log(`💰 +${amount} moneda${reason ? ` (${reason})` : ''}`);
    
    if (shopOpen) {
        updateShopUI();
    }
}

function updateTemporaryEffects() {
    const now = Date.now();
    
    // Actualizar efectos temporales
    Object.keys(gameState.temporaryEffects).forEach(effect => {
        if (gameState.temporaryEffects[effect].active) {
            gameState.temporaryEffects[effect].timeLeft -= 16; // ~60fps
            
            if (gameState.temporaryEffects[effect].timeLeft <= 0) {
                gameState.temporaryEffects[effect].active = false;
                gameState.temporaryEffects[effect].timeLeft = 0;
                console.log(`⏰ Efecto ${effect} expirado`);
                
                if (shopOpen) {
                    updateShopUI();
                }
            }
        }
    });
}

function handleLeftClick(event) {
    if (gameState.isPaused) return;
    
    const rect = canvas.getBoundingClientRect();
    mousePos.x = event.clientX - rect.left;
    mousePos.y = event.clientY - rect.top;
    
    // Convertir coordenadas del mouse a coordenadas del mundo
    const worldX = mousePos.x - camera.x;
    const worldY = mousePos.y - camera.y;
    
    // SIEMPRE dividir hacia el cursor (no activar atracción automáticamente)
    divideCellTowards(worldX, worldY);
}

function handleRightClick(event) {
    event.preventDefault();
    // NO hacer nada aquí - solo prevenir el menú contextual
}

function handleMouseDown(event) {
    if (event.button === 2) { // Click derecho
        event.preventDefault();
        if (gameState.isPaused) return;
        startAttraction();
    }
}

function handleMouseUp(event) {
    if (event.button === 2) { // Click derecho
        event.preventDefault();
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
    
    switch(event.key.toLowerCase()) {
        case ' ':
            event.preventDefault();
            togglePause();
            break;
        case 'escape':
            togglePause();
            break;
    }
}

function handleKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
}

// ========================================
// MECÁNICAS DE DIVISIÓN Y FUSIÓN
// ========================================

function divideCellTowards(targetX, targetY) {
    const mainCell = playerCells[0];
    
    if (mainCell.mass < GAME_CONFIG.minMassToDivide) {
        console.log('Masa insuficiente para dividir');
        return;
    }
    
    // Verificar límite de divisiones
    const maxDivisions = 5 + (gameState.upgrades.expansion ? GAME_CONFIG.shop.upgrades.expansion.effect : 0);
    if (playerCells.length >= maxDivisions) {
        console.log('Límite de divisiones alcanzado');
        return;
    }
    
    // No desactivar atracción al dividir - el usuario controla cuando atraer
    
    // Calcular dirección hacia el objetivo
    const dx = targetX - mainCell.x;
    const dy = targetY - mainCell.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 10) return; // Evitar división muy cerca
    
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    // Calcular masa para la nueva célula
    const newMass = mainCell.mass * (1 - GAME_CONFIG.divisionRatio);
    const remainingMass = mainCell.mass * GAME_CONFIG.divisionRatio;
    
    // Crear nueva célula
    const newCell = {
        id: playerCells.length,
        x: mainCell.x + dirX * (mainCell.radius + massToRadius(newMass) + 10),
        y: mainCell.y + dirY * (mainCell.radius + massToRadius(newMass) + 10),
        mass: newMass,
        radius: massToRadius(newMass),
        color: `hsl(${Math.random() * 60 + 120}, 70%, 60%)`,
        velocityX: dirX * 5,
        velocityY: dirY * 5,
        isMain: false,
        generation: mainCell.generation + 1
    };
    
    // Actualizar célula principal
    mainCell.mass = remainingMass;
    mainCell.radius = massToRadius(remainingMass);
    
    // Añadir nueva célula
    playerCells.push(newCell);
    gameState.cells = playerCells.length;
    gameState.generation = Math.max(gameState.generation, newCell.generation);
    
    // Ganar moneda por división exitosa
    addCurrency(GAME_CONFIG.shop.currencyGain.perDivision, 'división');
    
    console.log(`Célula dividida! Nueva masa: ${newMass.toFixed(1)}, Masa restante: ${remainingMass.toFixed(1)}`);
    updateUI();
}

function startAttraction() {
    isRightClickPressed = true;
    console.log('🔗 Atracción ACTIVADA - Las células divididas se acercarán');
}

function stopAttraction() {
    isRightClickPressed = false;
    console.log('🔗 Atracción DESACTIVADA - Las células divididas se detienen');
}

function forceStopAttraction() {
    isRightClickPressed = false;
    console.log('🔗 Atracción FORZADA a DESACTIVAR');
}

// ========================================
// SISTEMA DE CONSUMO
// ========================================

// ========================================
// SISTEMA DE CONSUMO
// ========================================
function checkConsumption() {
    const mainCell = playerCells[0];

    // Consumir objetos del mapa - CÉLULA PRINCIPAL
    for (let i = consumables.length - 1; i >= 0; i--) {
        const c = consumables[i];
        const dist = distance(mainCell.x, mainCell.y, c.x, c.y);

        if (dist < mainCell.radius + (c.radius || massToRadius(c.mass))) {
            // Masa base (respeta 5/15/25)
            const baseMass = getBaseConsumableMass(c.mass);

            if (!isMultiplayer) {
                // OFFLINE: aplicar de inmediato
                mainCell.mass += baseMass;
                mainCell.radius = massToRadius(mainCell.mass);
                gameState.totalMass = mainCell.mass;
                addCurrency(GAME_CONFIG.shop.currencyGain.perConsumable, 'consumo');
                consumables.splice(i, 1);
                console.log(`🍎 Objeto consumido (offline)! Masa: +${baseMass}, Total: ${mainCell.mass.toFixed(1)}`);
            } else {
                // ONLINE: emitir una sola vez y esperar confirmación del servidor
                if (!pendingConsumptions.has(c.id)) {
                    pendingConsumptions.add(c.id);
                    window.gameSocket?.emit('consumeObject', { consumableId: c.id });
                    // NO sumamos ni borramos aquí para evitar duplicados
                }
            }
        }
    }

    // Consumir objetos del mapa - CÉLULAS DIVIDIDAS
    for (let j = 1; j < playerCells.length; j++) {
        const cell = playerCells[j];

        for (let i = consumables.length - 1; i >= 0; i--) {
            const c = consumables[i];
            const dist = distance(cell.x, cell.y, c.x, c.y);

            if (dist < cell.radius + (c.radius || massToRadius(c.mass))) {
                const baseMass = getBaseConsumableMass(c.mass);

                if (!isMultiplayer) {
                    // OFFLINE: aplicar de inmediato
                    cell.mass += baseMass;
                    cell.radius = massToRadius(cell.mass);
                    addCurrency(GAME_CONFIG.shop.currencyGain.perConsumable, 'consumo dividida');
                    consumables.splice(i, 1);
                    console.log(`🍎 Objeto consumido por célula dividida (offline)! Masa: +${baseMass}`);
                } else {
                    // ONLINE: emitir una sola vez y esperar confirmación
                    if (!pendingConsumptions.has(c.id)) {
                        pendingConsumptions.add(c.id);
                        window.gameSocket?.emit('consumeObject', { consumableId: c.id });
                    }
                }
            }
        }
    }

    // NUEVA FUNCIONALIDAD: Consumo entre células divididas (igual que lo tenías)
    for (let i = playerCells.length - 1; i >= 1; i--) {
        for (let j = i - 1; j >= 1; j--) {
            const cell1 = playerCells[i];
            const cell2 = playerCells[j];
            const dist = distance(cell1.x, cell1.y, cell2.x, cell2.y);

            if (dist < cell1.radius + cell2.radius) {
                let largerCell, smallerCell, largerIndex, smallerIndex;

                if (cell1.mass >= cell2.mass) {
                    largerCell = cell1;
                    smallerCell = cell2;
                    largerIndex = i;
                    smallerIndex = j;
                } else {
                    largerCell = cell2;
                    smallerCell = cell1;
                    largerIndex = j;
                    smallerIndex = i;
                }

                // Fusionar células divididas
                largerCell.mass += smallerCell.mass;
                largerCell.radius = massToRadius(largerCell.mass);

                // Eliminar la célula más pequeña
                playerCells.splice(smallerIndex, 1);
                gameState.cells = playerCells.length;

                console.log(`🔄 Células divididas fusionadas! Masa transferida: ${smallerCell.mass.toFixed(1)}, Nueva masa: ${largerCell.mass.toFixed(1)}`);

                if (smallerIndex < largerIndex) {
                    i--;
                }
                break;
            }
        }
    }

    // Consumir células divididas si están cerca de la principal (igual que lo tenías)
    for (let i = playerCells.length - 1; i >= 1; i--) {
        const cell = playerCells[i];
        const dist = distance(mainCell.x, mainCell.y, cell.x, cell.y);

        if (dist < mainCell.radius + cell.radius) {
            mainCell.mass += cell.mass;
            mainCell.radius = massToRadius(mainCell.mass);
            gameState.totalMass = mainCell.mass;

            playerCells.splice(i, 1);
            gameState.cells = playerCells.length;

            console.log(`🔄 Célula fusionada con principal! Masa transferida: ${cell.mass.toFixed(1)}, Total principal: ${mainCell.mass.toFixed(1)}`);
        }
    }
}
    
    // NUEVA FUNCIONALIDAD: Consumo entre células divididas
    for (let i = playerCells.length - 1; i >= 1; i--) {
        for (let j = i - 1; j >= 1; j--) {
            const cell1 = playerCells[i];
            const cell2 = playerCells[j];
            const dist = distance(cell1.x, cell1.y, cell2.x, cell2.y);
            
            // Si las células divididas se tocan
            if (dist < cell1.radius + cell2.radius) {
                // La célula más grande consume a la más pequeña
                let largerCell, smallerCell, largerIndex, smallerIndex;
                
                if (cell1.mass >= cell2.mass) {
                    largerCell = cell1;
                    smallerCell = cell2;
                    largerIndex = i;
                    smallerIndex = j;
                } else {
                    largerCell = cell2;
                    smallerCell = cell1;
                    largerIndex = j;
                    smallerIndex = i;
                }
                
                // Fusionar células divididas
                largerCell.mass += smallerCell.mass;
                largerCell.radius = massToRadius(largerCell.mass);
                
                // Eliminar la célula más pequeña
                playerCells.splice(smallerIndex, 1);
                gameState.cells = playerCells.length;
                
                console.log(`🔄 Células divididas fusionadas! Masa transferida: ${smallerCell.mass.toFixed(1)}, Nueva masa: ${largerCell.mass.toFixed(1)}`);
                
                // Ajustar índices después de eliminar
                if (smallerIndex < largerIndex) {
                    i--;
                }
                break; // Salir del bucle interno para evitar múltiples fusiones
            }
        }
    }
    
    // Consumir células divididas si están cerca de la principal
    for (let i = playerCells.length - 1; i >= 1; i--) {
        const cell = playerCells[i];
        const dist = distance(mainCell.x, mainCell.y, cell.x, cell.y);
        
        if (dist < mainCell.radius + cell.radius) {
            // Consumir célula dividida (incluyendo toda su masa acumulada)
            mainCell.mass += cell.mass;
            mainCell.radius = massToRadius(mainCell.mass);
            gameState.totalMass = mainCell.mass;
            
            // Eliminar célula consumida
            playerCells.splice(i, 1);
            gameState.cells = playerCells.length;
            
            console.log(`🔄 Célula fusionada con principal! Masa transferida: ${cell.mass.toFixed(1)}, Total principal: ${mainCell.mass.toFixed(1)}`);
        }
    }

// ========================================
// ACTUALIZACIÓN DEL JUEGO
// ========================================

function startGameLoop() {
    gameLoop = setInterval(() => {
        if (!gameState.isPaused) {
            updateGame();
            renderGame();
        }
    }, 1000 / 60); // 60 FPS
}

function updateGame() {
    // Actualizar tiempo de supervivencia
    gameState.survivalTime = Math.floor((Date.now() - gameState.startTime) / 1000);
    
    // Actualizar sistema de tienda
    updateCurrency();
    updateTemporaryEffects();
    
    // Actualizar movimiento de la cámara
    updateCamera();
    
    // Actualizar células del jugador
    updatePlayerCells();
    
    // Verificar consumo
    checkConsumption();
    
    // Verificar colisiones multijugador
    if (isMultiplayer) {
        checkMultiplayerCollisions();
    }
    
    // Enviar actualización al servidor multijugador
    if (isMultiplayer && window.gameSocket && Date.now() % 100 < 16) {
        window.gameSocket.emit('updatePlayer', {
            cells: playerCells,
            currency: gameState.currency,
            upgrades: gameState.upgrades,
            temporaryEffects: gameState.temporaryEffects
        });
    }
    
    // Actualizar UI
    updateUI();
}

function updateCamera() {
    const mainCell = playerCells[0];
    
    // Mover cámara hacia la célula principal
    const targetCameraX = -mainCell.x + canvas.width / 2;
    const targetCameraY = -mainCell.y + canvas.height / 2;
    
    camera.x += (targetCameraX - camera.x) * 0.1;
    camera.y += (targetCameraY - camera.y) * 0.1;
}

function updatePlayerCells() {
    const mainCell = playerCells[0];
    
    // Actualizar célula principal con controles
    let moveX = 0;
    let moveY = 0;
    
    // Aplicar mejora de velocidad si está activa
    let speedMultiplier = 1;
    if (gameState.upgrades.speed) {
        speedMultiplier += GAME_CONFIG.shop.upgrades.speed.effect;
    }
    
    const currentSpeed = GAME_CONFIG.cameraSpeed * speedMultiplier;
    
    if (keys['w'] || keys['arrowup']) moveY -= currentSpeed;
    if (keys['s'] || keys['arrowdown']) moveY += currentSpeed;
    if (keys['a'] || keys['arrowleft']) moveX -= currentSpeed;
    if (keys['d'] || keys['arrowright']) moveX += currentSpeed;
    
    // Aplicar movimiento
    mainCell.x += moveX;
    mainCell.y += moveY;
    
    // Guardar velocidad de movimiento para las células divididas
    const mainCellVelocity = { x: moveX, y: moveY };
    
    // Actualizar células divididas
    for (let i = 1; i < playerCells.length; i++) {
        const cell = playerCells[i];
        
        // Aplicar fricción
        cell.velocityX *= GAME_CONFIG.friction;
        cell.velocityY *= GAME_CONFIG.friction;
        
        // Seguimiento automático de la célula principal (formación)
        if (!isRightClickPressed) {
            // Calcular posición objetivo en formación
            const formationIndex = i - 1; // Índice en la formación (0, 1, 2, ...)
            const formationRadius = mainCell.radius + 80 + (formationIndex * 30); // Mayor distancia de seguimiento
            const formationAngle = (formationIndex * Math.PI * 2) / Math.max(playerCells.length - 1, 1); // Distribución circular
            
            // Posición objetivo en formación
            const targetX = mainCell.x + Math.cos(formationAngle) * formationRadius;
            const targetY = mainCell.y + Math.sin(formationAngle) * formationRadius;
            
            // Mover hacia la posición objetivo con la misma velocidad que la principal
            const dx = targetX - cell.x;
            const dy = targetY - cell.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 10) { // Solo mover si no está en posición (mayor tolerancia)
                // Movimiento más suave y lento
                const followSpeed = (Math.sqrt(mainCellVelocity.x ** 2 + mainCellVelocity.y ** 2) * 0.4) || GAME_CONFIG.attractionForce * 0.2;
                const force = followSpeed * (1 / Math.max(dist, 1));
                cell.velocityX += dx * force;
                cell.velocityY += dy * force;
            }
            
            // Aplicar movimiento base de la célula principal (50% de velocidad - más lento)
            cell.x += mainCellVelocity.x * 0.5;
            cell.y += mainCellVelocity.y * 0.5;
        }
        
        // Atracción hacia la célula principal si está activa (click derecho)
        if (isRightClickPressed) {
            const dx = mainCell.x - cell.x;
            const dy = mainCell.y - cell.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const force = GAME_CONFIG.attractionForce;
                cell.velocityX += (dx / dist) * force;
                cell.velocityY += (dy / dist) * force;
            }
        }
        
        // Limitar velocidad máxima
        const speed = Math.sqrt(cell.velocityX ** 2 + cell.velocityY ** 2);
        if (speed > GAME_CONFIG.maxSpeed) {
            cell.velocityX = (cell.velocityX / speed) * GAME_CONFIG.maxSpeed;
            cell.velocityY = (cell.velocityY / speed) * GAME_CONFIG.maxSpeed;
        }
        
        // Actualizar posición
        cell.x += cell.velocityX;
        cell.y += cell.velocityY;
        
        // Mantener dentro del mapa
        cell.x = Math.max(-GAME_CONFIG.mapSize/2, Math.min(GAME_CONFIG.mapSize/2, cell.x));
        cell.y = Math.max(-GAME_CONFIG.mapSize/2, Math.min(GAME_CONFIG.mapSize/2, cell.y));
    }
    
    // Mantener célula principal dentro del mapa
    mainCell.x = Math.max(-GAME_CONFIG.mapSize/2, Math.min(GAME_CONFIG.mapSize/2, mainCell.x));
    mainCell.y = Math.max(-GAME_CONFIG.mapSize/2, Math.min(GAME_CONFIG.mapSize/2, mainCell.y));
}

// ========================================
// RENDERIZADO
// ========================================

function renderGame() {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar fondo estrellado
    drawStarField();
    
    // Dibujar objetos consumibles
    drawConsumables();
    
    // Dibujar otros jugadores (multijugador)
    if (isMultiplayer) {
        drawOtherPlayers();
    }
    
    // Dibujar células del jugador
    drawPlayerCells();
    
    // Dibujar efectos
    drawEffects();
}

function drawStarField() {
    stars.forEach(star => {
        const screenX = star.x + camera.x;
        const screenY = star.y + camera.y;
        
        // Solo dibujar estrellas visibles
        if (screenX > -50 && screenX < canvas.width + 50 && 
            screenY > -50 && screenY < canvas.height + 50) {
            
            ctx.beginPath();
            ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = star.brightness;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
}

function drawConsumables() {
    consumables.forEach(consumable => {
        const screenX = consumable.x + camera.x;
        const screenY = consumable.y + camera.y;
        
        // Solo dibujar objetos visibles
        if (screenX > -consumable.radius && screenX < canvas.width + consumable.radius && 
            screenY > -consumable.radius && screenY < canvas.height + consumable.radius) {
            
            // Dibujar objeto consumible
            ctx.beginPath();
            ctx.arc(screenX, screenY, consumable.radius, 0, Math.PI * 2);
            ctx.fillStyle = consumable.color;
            ctx.fill();
            
            // Borde brillante
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Efecto de brillo
            ctx.shadowBlur = 10;
            ctx.shadowColor = consumable.color;
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
        
        // Solo dibujar células visibles
        if (screenX > -cell.radius && screenX < canvas.width + cell.radius && 
            screenY > -cell.radius && screenY < canvas.height + cell.radius) {
            
            // Sombra
            ctx.shadowBlur = 20;
            ctx.shadowColor = cell.color;
            
            // Cuerpo de la célula
            ctx.beginPath();
            ctx.arc(screenX, screenY, cell.radius, 0, Math.PI * 2);
            ctx.fillStyle = cell.color;
            ctx.fill();
            
            // Borde
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Núcleo
            ctx.beginPath();
            ctx.arc(screenX, screenY, cell.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            
            // Resetear sombra
            ctx.shadowBlur = 0;
            
            // Efectos visuales de mejoras
            drawUpgradeEffects(cell, screenX, screenY);
            
            // Dibujar indicador de generación para células divididas
            if (!cell.isMain) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(cell.generation.toString(), screenX, screenY + 4);
            }
        }
    });
}

function drawEffects() {
    // Efectos visuales adicionales
    if (isRightClickPressed) {
        const mainCell = playerCells[0];
        const screenX = mainCell.x + camera.x;
        const screenY = mainCell.y + camera.y;
        
        // Efecto de atracción
        ctx.beginPath();
        ctx.arc(screenX, screenY, mainCell.radius + 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 136, ${0.3 + Math.sin(Date.now() * 0.005) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

// ========================================
// FUNCIONES DE INTERFAZ
// ========================================

function updateUI() {
    document.getElementById('cellsValue').textContent = gameState.cells;
    document.getElementById('generationValue').textContent = gameState.generation;
    document.getElementById('timeValue').textContent = gameState.survivalTime + 's';
    
    // Actualizar información de célula principal
    if (playerCells.length > 0) {
        const mainCell = playerCells[0];
        document.getElementById('cellSize').textContent = Math.floor(mainCell.mass) + 'g';
        document.getElementById('cellSpeed').textContent = Math.floor(mainCell.radius) + 'px';
        document.getElementById('cellAbilities').textContent = isRightClickPressed ? 'Atrayendo' : 'Normal';
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    const pauseScreen = document.getElementById('pauseScreen');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (gameState.isPaused) {
        if (pauseScreen) pauseScreen.classList.add('active');
        if (pauseBtn) pauseBtn.innerHTML = '<span class="btn-icon">▶</span>REANUDAR';
    } else {
        if (pauseScreen) pauseScreen.classList.remove('active');
        if (pauseBtn) pauseBtn.innerHTML = '<span class="btn-icon">⏸</span>PAUSAR';
    }
}

function restartGame() {
    gameState = {
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
    
    // Limpiar arrays
    playerCells = [];
    consumables = [];
    otherPlayers.clear(); // ✅ Limpiar otros jugadores
    
    // Recrear elementos
    createPlayerCell();
    
    // ✅ SOLO crear consumibles si está offline
    if (!isMultiplayer) {
        createConsumables();
    }
    
    // Limpiar pantallas
    document.getElementById('pauseScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    
    updateUI();
    console.log('Juego reiniciado');
}

// Funciones de botones (mantener compatibilidad)
function divideCell() {
    const mainCell = playerCells[0];
    divideCellTowards(mainCell.x + 100, mainCell.y);
}

function evolveCell() {
    const mainCell = playerCells[0];
    mainCell.mass += 50;
    mainCell.radius = massToRadius(mainCell.mass);
    gameState.totalMass = mainCell.mass;
    console.log('Célula evolucionada! Masa: +50');
    updateUI();
}

// ========================================
// EFECTOS VISUALES DE MEJORAS
// ========================================

function drawUpgradeEffects(cell, screenX, screenY) {
    // Efecto de armadura (aura dorada)
    if (gameState.upgrades.armor && cell.isMain) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // Efecto de velocidad (partículas de movimiento)
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
    
    // Efecto de doble consumo (resplandor azul)
    if (gameState.temporaryEffects.doubleConsume.active) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Texto de duración
        const timeLeft = Math.ceil(gameState.temporaryEffects.doubleConsume.timeLeft / 1000);
        ctx.fillStyle = '#00ccff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`x2 (${timeLeft}s)`, screenX, screenY - cell.radius - 20);
    }
    
    // Efecto de mega consumo (resplandor rojo intenso)
    if (gameState.temporaryEffects.megaConsume.active) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Texto de duración
        const timeLeft = Math.ceil(gameState.temporaryEffects.megaConsume.timeLeft / 1000);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`x5 (${timeLeft}s)`, screenX, screenY - cell.radius - 25);
    }
    
    // Efecto de expansión (aura púrpura)
    if (gameState.upgrades.expansion && cell.isMain) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, cell.radius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(128, 0, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ========================================
// FUNCIONES MULTIJUGADOR
// ========================================

function checkMultiplayerCollisions() {
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
                    if (window.gameSocket) {
                        window.gameSocket.emit('playerCollision', { victimId: playerId });
                    }
                }
            }
        });
    });
}

function updateMultiplayerState(data) {
    // Asegurar modo online
    isMultiplayer = true;

    // Actualizar otros jugadores (no incluirme)
    if (Array.isArray(data.players)) {
        otherPlayers.clear();
        data.players.forEach(player => {
            if (player.id !== window.gameSocket?.id) {
                otherPlayers.set(player.id, player);
            }
        });
    }

// Normalizar consumibles del servidor (añadir radius/type y MASA BASE 5/15/25)
const normalizeConsumable = (c) => {
    const base = getBaseConsumableMass(c.mass);
    return {
        id: c.id,
        x: c.x,
        y: c.y,
        mass: base,
        radius: (c.radius != null) ? c.radius : massToRadius(base),
        color: c.color || '#feca57',
        type: c.type || 'consumable'
    };
};

    if (Array.isArray(data.consumables) && data.consumables.length >= 0) {
        const serverList = data.consumables.map(normalizeConsumable);

        // Merge inteligente: agregar nuevos y remover faltantes
        const existingIds = new Set(consumables.map(c => c.id));
        const serverIds = new Set(serverList.map(c => c.id));

        // Agregar nuevos
        serverList.forEach(sc => {
            if (!existingIds.has(sc.id)) consumables.push(sc);
        });

        // Remover los que ya no están
        consumables = consumables.filter(c => serverIds.has(c.id));

        // Extra: si por alguna razón llegan 0, mantenemos los actuales por un frame
        // y se corrige en el siguiente tick
        // console.log('🌐 Consumibles sincronizados:', consumables.length);
    }
}

// Dejar expuesto global
window.updateMultiplayerState = updateMultiplayerState;
