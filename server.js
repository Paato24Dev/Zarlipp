// ========================================
// SERVIDOR MULTIJUGADOR PARA MITOSIS
// ========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,      // ✅ Timeout configurado AQUÍ
    pingInterval: 25000,     // ✅ Intervalo de ping AQUÍ
    transports: ['websocket', 'polling'],
    connectTimeout: 45000    // ✅ Timeout de conexión AQUÍ
});

// Conectar a MongoDB (usando la URL de entorno)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mitosis';

// Intentar conectar a MongoDB, pero no bloquear si falla
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // ✅ Timeout de 5 segundos para MongoDB
}).then(() => {
    console.log('✅ Conectado a MongoDB');
}).catch(err => {
    console.log('⚠️ MongoDB no disponible, continuando sin base de datos:', err.message);
});

// Esquema de jugador para MongoDB
const playerSchema = new mongoose.Schema({
    socketId: String,
    name: String,
    color: String,
    totalMass: Number,
    gamesPlayed: Number,
    bestScore: Number,
    lastSeen: Date
});

const Player = mongoose.model('Player', playerSchema);

// Middleware
app.use(cors());

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(__dirname));

// Rutas principales con MIME types correctos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pantallainicio.html'));
});

app.get('/Pantallainicio.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pantallainicio.html'));
});

app.get('/juego.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'juego.html'));
});

// Servir CSS con MIME type correcto
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/juego.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'juego.css'));
});

// Servir JS con MIME type correcto
app.get('/script.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/juego.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'juego.js'));
});

// ✅ Ruta de salud para verificar que el servidor funciona
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
        rooms: rooms.size,
        players: players.size
    });
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
            startTime: Date.now(),
            leaderboard: []
        };
        this.maxPlayers = 20; // Aumentado a 20 jugadores
        
        // Sembrar consumibles iniciales para evitar "mapa vacío" al conectar
        this.generateConsumables();
        
        // Actualizar tabla de líderes cada 5 segundos
        this.leaderboardInterval = setInterval(() => {
            this.updateLeaderboard();
        }, 5000);
    }
    
    addPlayer(socketId, playerData) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        
        const playerName = playerData.name || `Jugador ${this.players.size + 1}`;
        const playerColor = playerData.color || this.getRandomColor();
        
        this.players.set(socketId, {
            id: socketId,
            name: playerName,
            color: playerColor,
            cells: [{
                id: 0,
                x: Math.random() * 2000 - 1000,
                y: Math.random() * 2000 - 1000,
                mass: 100,
                radius: 20,
                color: playerColor,
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
            lastUpdate: Date.now(),
            totalMass: 100
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
        // Asegurar que siempre haya al menos 50 consumibles
        while (this.gameState.consumables.length < 50) {
            this.gameState.consumables.push({
                id: Date.now() + Math.random(),
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                mass: Math.random() * 20 + 5,
                color: this.getRandomColor()
            });
        }
    }
    
    // Respawn automático de consumibles cuando se comen
    respawnConsumable() {
        this.gameState.consumables.push({
            id: Date.now() + Math.random(),
            x: Math.random() * 4000 - 2000,
            y: Math.random() * 4000 - 2000,
            mass: Math.random() * 20 + 5,
            color: this.getRandomColor()
        });
    }
    
    // Actualizar tabla de líderes
    updateLeaderboard() {
        const playersArray = Array.from(this.players.values());
        this.gameState.leaderboard = playersArray
            .sort((a, b) => b.totalMass - a.totalMass)
            .slice(0, 10)
            .map((player, index) => ({
                position: index + 1,
                name: player.name,
                mass: Math.round(player.totalMass),
                color: player.color
            }));
    }
    
    updateGameState() {
        // Generar consumibles si es necesario
        this.generateConsumables();
        
        // Actualizar efectos temporales y masa total
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
            
            // Calcular masa total del jugador
            player.totalMass = player.cells.reduce((sum, cell) => sum + cell.mass, 0);
            
            // Ganar moneda por tiempo
            player.currency += 0.016; // ~1 por segundo
        });
    }
    
    // ✅ Limpiar intervalos al destruir la sala
    destroy() {
        if (this.leaderboardInterval) {
            clearInterval(this.leaderboardInterval);
        }
    }
}

// ========================================
// EVENTOS DE SOCKET.IO
// ========================================

io.on('connection', (socket) => {
    console.log(`🔌 Jugador conectado: ${socket.id}`);
    
    // ❌ ELIMINADO: socket.setTimeout(30000);
    // ✅ Los timeouts ya están configurados en las opciones de Socket.IO arriba
    
    // Unirse a una sala
    socket.on('joinRoom', (data) => {
        try {
            const { roomId, playerName, color } = data;
            
            // Si es la sala principal, usar código fijo
            const actualRoomId = (roomId === 'MAIN') ? 'MAIN' : roomId;
            
            let room = rooms.get(actualRoomId);
            if (!room) {
                room = new Room(actualRoomId);
                rooms.set(actualRoomId, room);
                console.log(`🏠 Nueva sala creada: ${actualRoomId}`);
            }
            
            const success = room.addPlayer(socket.id, { name: playerName, color: color });
            
            if (success) {
                // Asegurar que el socket se una exactamente a la sala usada para emitir actualizaciones
                socket.join(actualRoomId);
                players.set(socket.id, { roomId: actualRoomId, socket });
                
                // Enviar estado actual de la sala
                socket.emit('roomJoined', {
                    success: true,
                    roomId: actualRoomId,
                    players: Array.from(room.players.values()),
                    gameState: room.gameState
                });
                
                // Notificar a otros jugadores
                socket.to(actualRoomId).emit('playerJoined', {
                    player: room.players.get(socket.id)
                });
                
                console.log(`✅ ${playerName} se unió a la sala ${actualRoomId}`);
            } else {
                socket.emit('roomJoined', {
                    success: false,
                    message: 'Sala llena (máximo 20 jugadores)'
                });
            }
        } catch (error) {
            console.error('Error en joinRoom:', error);
            socket.emit('roomJoined', {
                success: false,
                message: 'Error del servidor'
            });
        }
    });
    
    // Actualizar posición del jugador
    socket.on('updatePlayer', (data) => {
        try {
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
        } catch (error) {
            console.error('Error en updatePlayer:', error);
        }
    });
    
    // Manejar consumo de objetos
    socket.on('consumeObject', (data) => {
        try {
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
            
            // Respawn automático de un nuevo consumible
            room.respawnConsumable();
            
            // Ganar moneda
            player.currency += 5;
            
            // Notificar a todos en la sala
            io.to(playerData.roomId).emit('objectConsumed', {
                consumableId: data.consumableId,
                playerId: socket.id
            });
        } catch (error) {
            console.error('Error en consumeObject:', error);
        }
    });
    
    // Manejar división de células
    socket.on('divideCell', (data) => {
        try {
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
        } catch (error) {
            console.error('Error en divideCell:', error);
        }
    });
    
    // Manejar colisiones entre jugadores
    socket.on('playerCollision', (data) => {
        try {
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
        } catch (error) {
            console.error('Error en playerCollision:', error);
        }
    });
    
    // Heartbeat para mantener conexión viva
    socket.on('ping', () => {
        socket.emit('pong');
    });
    
    // Manejo de errores
    socket.on('error', (error) => {
        console.error(`❌ Error en socket ${socket.id}:`, error);
    });
    
    // Desconexión
    socket.on('disconnect', (reason) => {
        console.log(`❌ Jugador desconectado: ${socket.id}, razón: ${reason}`);
        
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
                    room.destroy(); // ✅ Limpiar intervalos
                    rooms.delete(playerData.roomId);
                    console.log(`🗑️ Sala ${playerData.roomId} eliminada`);
                }
            }
            
            players.delete(socket.id);
        }
    });
});

// ========================================
// BUCLE DE ACTUALIZACIÓN DEL JUEGO
// ========================================

setInterval(() => {
    rooms.forEach(room => {
        try {
            room.updateGameState();
            
            // Enviar estado actualizado a todos los jugadores de la sala
            io.to(room.id).emit('gameStateUpdate', {
                consumables: room.gameState.consumables,
                players: Array.from(room.players.values()),
                leaderboard: room.gameState.leaderboard
            });
        } catch (error) {
            console.error('Error en actualización de sala:', error);
        }
    });
}, 1000 / 60); // 60 FPS

// ========================================
// INICIAR SERVIDOR
// ========================================

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Mitosis Multijugador iniciado en puerto ${PORT}`);
    console.log(`🌐 Accede a: http://localhost:${PORT}`);
});
