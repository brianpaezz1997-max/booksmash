const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/venues - Crear un nuevo lugar
router.post('/', async (req, res) => {
  const { name, address, latitude, longitude, qr_code_hash } = req.body;

  if (!name || !latitude || !longitude || !qr_code_hash) {
    return res.status(400).json({ error: 'Faltan datos obligatorios del lugar' });
  }

  try {
    const newVenue = await pool.query(
      'INSERT INTO venues (name, address, latitude, longitude, qr_code_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, address, latitude, longitude, qr_code_hash]
    );

    res.status(201).json({
      message: '📍 Lugar creado con éxito',
      venue: newVenue.rows[0]
    });
  } catch (error) {
    console.error('Error al crear lugar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/venues - Obtener todos los lugares
router.get('/', async (req, res) => {
  try {
    const venues = await pool.query('SELECT * FROM venues ORDER BY id DESC');
    res.json(venues.rows);
  } catch (error) {
    console.error('Error al obtener lugares:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/venues/checkin - Registrar asistencia / Check-in con código QR
router.post('/checkin', async (req, res) => {
  const { user_id, qr_code_hash } = req.body;

  if (!user_id || !qr_code_hash) {
    return res.status(400).json({ error: 'Se requiere el ID de usuario y el código QR' });
  }

  try {
    // 1. Buscar el lugar correspondiente al QR
    const venueResult = await pool.query('SELECT * FROM venues WHERE qr_code_hash = $1', [qr_code_hash]);

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lugar no encontrado o código QR inválido' });
    }

    const venue = venueResult.rows[0];

    // 2. Registrar la asistencia del usuario
    const attendance = await pool.query(
      'INSERT INTO attendance (user_id, venue_id) VALUES ($1, $2) RETURNING *',
      [user_id, venue.id]
    );

    res.status(201).json({
      message: `✅ Check-in exitoso en ${venue.name}`,
      attendance: attendance.rows[0],
      venue
    });
  } catch (error) {
    console.error('Error en check-in:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;