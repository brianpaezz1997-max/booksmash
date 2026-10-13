const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const userRoutes = require('./routes/users');
const venueRoutes = require('./routes/venues');
const stickerRoutes = require('./routes/stickers');
const liveRoomRoutes = require('./routes/live_rooms');
const friendshipRoutes = require('./routes/friendships');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir la interfaz web e imágenes

// Rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/stickers', stickerRoutes);
app.use('/api/live-rooms', liveRoomRoutes);
app.use('/api/friendships', friendshipRoutes);

// Encender servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});