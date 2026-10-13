const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/live-rooms - Crear sala live en un lugar (máximo 10 personas)
router.post('/', async (req, res) => {
  const { venue_id, name, max_capacity } = req.body;

  if (!venue_id || !name) {
    return res.status(400).json({ error: 'venue_id y name son obligatorios' });
  }

  try {
    const newRoom = await pool.query(
      'INSERT INTO live_rooms (venue_id, name, max_capacity) VALUES ($1, $2, $3) RETURNING *',
      [venue_id, name, max_capacity || 10]
    );

    res.status(201).json({
      message: '🔴 Sala Live creada exitosamente',
      room: newRoom.rows[0]
    });
  } catch (error) {
    console.error('Error al crear sala live:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/live-rooms/venue/:venueId - Obtener salas activas de un lugar
router.get('/venue/:venueId', async (req, res) => {
  const { venueId } = req.params;

  try {
    const rooms = await pool.query(
      'SELECT * FROM live_rooms WHERE venue_id = $1 AND is_active = true ORDER BY created_at DESC',
      [venueId]
    );

    res.json(rooms.rows);
  } catch (error) {
    console.error('Error al obtener salas live:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;