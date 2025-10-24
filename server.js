// ========================================
// SERVIDOR MULTIJUGADOR PARA MITOSIS
// ========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.static('public'));

// Servir archivos estáticos con MIME types correctos
app.use('/public', express.static('public'));

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servir CSS con MIME type correcto
app.get('/juego.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'public', 'juego.css'));
});

// Servir JS con MIME type correcto
app.get('/juego-multiplayer.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'juego-multiplayer.js'));
});

// ========================================
// SISTEMA DE SALAS Y JUGADORES
// ========================================

const rooms = new Map();
const players = new Map();

class Room {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.gameState = {
            consumables: [],
            gameStarted: false,
            startTime: Date.now()
        };
        this.maxPlayers = 8;
    }
    
    addPlayer(socketId, playerData) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        
        this.players.set(socketId, {
            id: socketId,
            name: playerData.name || `Jugador ${this.players.size + 1}`,
            cells: [{
                id: 0,
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                mass: 100,
                radius: 20,
                color: this.getRandomColor(),
                isMain: true,
                generation: 1
            }],
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
            },
            isAlive: true,
            lastUpdate: Date.now()
        });
        
        return true;
    }
    
    removePlayer(socketId) {
        this.players.delete(socketId);
    }
    
    getRandomColor() {
        const colors = ['#00ff88', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    generateConsumables() {
        if (this.gameState.consumables.length < 50) {
            for (let i = 0; i < 10; i++) {
                this.gameState.consumables.push({
                    id: Date.now() + Math.random(),
                    x: Math.random() * 4000 - 2000,
                    y: Math.random() * 4000 - 2000,
                    mass: Math.random() * 20 + 5,
                    color: this.getRandomColor()
                });
            }
        }
    }
    
    updateGameState() {
        // Generar consumibles si es necesario
        this.generateConsumables();
        
        // Actualizar efectos temporales
        this.players.forEach(player => {
            Object.keys(player.temporaryEffects).forEach(effect => {
                if (player.temporaryEffects[effect].active) {
                    player.temporaryEffects[effect].timeLeft -= 16;
                    if (player.temporaryEffects[effect].timeLeft <= 0) {
                        player.temporaryEffects[effect].active = false;
                        player.temporaryEffects[effect].timeLeft = 0;
                    }
                }
            });
            
            // Ganar moneda por tiempo
            player.currency += 0.016; // ~1 por segundo
        });
    }
}

// ========================================
// EVENTOS DE SOCKET.IO
// ========================================

io.on('connection', (socket) => {
    console.log(`🔌 Jugador conectado: ${socket.id}`);
    
    // Unirse a una sala
    socket.on('joinRoom', (data) => {
        const { roomId, playerName } = data;
        
        let room = rooms.get(roomId);
        if (!room) {
            room = new Room(roomId);
            rooms.set(roomId, room);
            console.log(`🏠 Nueva sala creada: ${roomId}`);
        }
        
        const success = room.addPlayer(socket.id, { name: playerName });
        
        if (success) {
            socket.join(roomId);
            players.set(socket.id, { roomId, socket });
            
            // Enviar estado actual de la sala
            socket.emit('roomJoined', {
                success: true,
                roomId: roomId,
                players: Array.from(room.players.values()),
                gameState: room.gameState
            });
            
            // Notificar a otros jugadores
            socket.to(roomId).emit('playerJoined', {
                player: room.players.get(socket.id)
            });
            
            console.log(`✅ ${playerName} se unió a la sala ${roomId}`);
        } else {
            socket.emit('roomJoined', {
                success: false,
                message: 'Sala llena'
            });
        }
    });
    
    // Actualizar posición del jugador
    socket.on('updatePlayer', (data) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const room = rooms.get(playerData.roomId);
        if (!room) return;
        
        const player = room.players.get(socket.id);
        if (!player) return;
        
        // Actualizar datos del jugador
        player.cells = data.cells;
        player.currency = data.currency;
        player.upgrades = data.upgrades;
        player.temporaryEffects = data.temporaryEffects;
        player.lastUpdate = Date.now();
        
        // Enviar actualización a otros jugadores
        socket.to(playerData.roomId).emit('playerUpdated', {
            playerId: socket.id,
            player: player
        });
    });
    
    // Manejar consumo de objetos
    socket.on('consumeObject', (data) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const room = rooms.get(playerData.roomId);
        if (!room) return;
        
        const player = room.players.get(socket.id);
        if (!player) return;
        
        // Remover objeto consumido
        room.gameState.consumables = room.gameState.consumables.filter(
            consumable => consumable.id !== data.consumableId
        );
        
        // Ganar moneda
        player.currency += 5;
        
        // Notificar a todos en la sala
        io.to(playerData.roomId).emit('objectConsumed', {
            consumableId: data.consumableId,
            playerId: socket.id
        });
    });
    
    // Manejar división de células
    socket.on('divideCell', (data) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const room = rooms.get(playerData.roomId);
        if (!room) return;
        
        const player = room.players.get(socket.id);
        if (!player) return;
        
        // Ganar moneda por división
        player.currency += 10;
        
        // Notificar a otros jugadores
        socket.to(playerData.roomId).emit('cellDivided', {
            playerId: socket.id,
            newCell: data.newCell
        });
    });
    
    // Manejar colisiones entre jugadores
    socket.on('playerCollision', (data) => {
        const playerData = players.get(socket.id);
        if (!playerData) return;
        
        const room = rooms.get(playerData.roomId);
        if (!room) return;
        
        const attacker = room.players.get(socket.id);
        const victim = room.players.get(data.victimId);
        
        if (!attacker || !victim) return;
        
        // Calcular si el ataque es exitoso (célula más grande consume la más pequeña)
        const attackerMass = attacker.cells.reduce((sum, cell) => sum + cell.mass, 0);
        const victimMass = victim.cells.reduce((sum, cell) => sum + cell.mass, 0);
        
        if (attackerMass > victimMass * 1.2) { // 20% más grande para consumir
            // El atacante consume a la víctima
            victim.isAlive = false;
            attacker.currency += victimMass * 0.1; // Ganar moneda por consumir
            
            // Notificar a todos
            io.to(playerData.roomId).emit('playerConsumed', {
                attackerId: socket.id,
                victimId: data.victimId,
                massGained: victimMass * 0.1
            });
            
            // Respawn de la víctima después de 5 segundos
            setTimeout(() => {
                if (room.players.has(data.victimId)) {
                    const respawnedPlayer = room.players.get(data.victimId);
                    respawnedPlayer.isAlive = true;
                    respawnedPlayer.cells = [{
                        id: 0,
                        x: Math.random() * 2000 - 1000,
                        y: Math.random() * 2000 - 1000,
                        mass: 100,
                        radius: 20,
                        color: respawnedPlayer.cells[0].color,
                        isMain: true,
                        generation: 1
                    }];
                    
                    io.to(playerData.roomId).emit('playerRespawned', {
                        playerId: data.victimId,
                        player: respawnedPlayer
                    });
                }
            }, 5000);
        }
    });
    
    // Desconexión
    socket.on('disconnect', () => {
        const playerData = players.get(socket.id);
        if (playerData) {
            const room = rooms.get(playerData.roomId);
            if (room) {
                room.removePlayer(socket.id);
                
                // Notificar a otros jugadores
                socket.to(playerData.roomId).emit('playerLeft', {
                    playerId: socket.id
                });
                
                // Eliminar sala si está vacía
                if (room.players.size === 0) {
                    rooms.delete(playerData.roomId);
                    console.log(`🗑️ Sala ${playerData.roomId} eliminada`);
                }
            }
            
            players.delete(socket.id);
        }
        
        console.log(`❌ Jugador desconectado: ${socket.id}`);
    });
});

// ========================================
// BUCLE DE ACTUALIZACIÓN DEL JUEGO
// ========================================

setInterval(() => {
    rooms.forEach(room => {
        room.updateGameState();
        
        // Enviar estado actualizado a todos los jugadores de la sala
        io.to(room.id).emit('gameStateUpdate', {
            consumables: room.gameState.consumables,
            players: Array.from(room.players.values())
        });
    });
}, 1000 / 60); // 60 FPS

// ========================================
// INICIAR SERVIDOR
// ========================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor Mitosis Multijugador iniciado en puerto ${PORT}`);
    console.log(`🌐 Accede a: http://localhost:${PORT}`);
});
