# Mitosis Multijugador

## 🚀 Instrucciones para Deploy en Vercel

### 1. Crear cuenta en Vercel
- Ve a https://vercel.com
- Click en "Sign Up"
- Conecta con GitHub (recomendado)

### 2. Preparar el repositorio
```bash
# Crear repositorio en GitHub
git init
git add .
git commit -m "Mitosis Multijugador"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mitosis-multiplayer.git
git push -u origin main
```

### 3. Deploy en Vercel
- Ve a tu dashboard de Vercel
- Click en "New Project"
- Importa tu repositorio de GitHub
- Vercel detectará automáticamente la configuración
- Click en "Deploy"

### 4. ¡Listo!
Tu juego estará disponible en: `https://tu-proyecto.vercel.app`

## 🎮 Cómo Jugar

1. **Crear Sala**: Click en "CREAR SALA" (genera código automático)
2. **Unirse**: Comparte el código con amigos
3. **Iniciar**: Cuando haya 2+ jugadores, click "INICIAR JUEGO"
4. **Jugar**: Usa WASD para mover, click izquierdo para dividir, click derecho para atraer

## 🌐 Características Multijugador

- ✅ **Hasta 8 jugadores** por sala
- ✅ **Códigos de sala** para unirse fácilmente
- ✅ **Consumo entre jugadores** (célula más grande consume la más pequeña)
- ✅ **Sistema de respawn** (5 segundos después de ser consumido)
- ✅ **Sincronización en tiempo real** de posiciones y acciones
- ✅ **Tienda compartida** (cada jugador tiene su propia moneda)
- ✅ **Efectos visuales** para todas las mejoras

## 🔧 Tecnologías Usadas

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5 Canvas + JavaScript vanilla
- **Hosting**: Vercel (gratis)
- **Tiempo real**: WebSockets

## 📁 Estructura del Proyecto

```
mitosis-multiplayer/
├── server.js              # Servidor principal
├── package.json           # Dependencias
├── vercel.json           # Configuración de Vercel
└── public/
    ├── index.html        # Interfaz principal
    ├── juego.css         # Estilos (reutilizado)
    └── juego-multiplayer.js # Cliente multijugador
```

## 🎯 Próximas Mejoras

- [ ] Sistema de ranking/leaderboard
- [ ] Salas privadas con contraseña
- [ ] Modos de juego (battle royale, team vs team)
- [ ] Persistencia de progreso
- [ ] Chat en tiempo real
- [ ] Espectadores
