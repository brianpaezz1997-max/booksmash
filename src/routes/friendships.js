const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/friendships - Conectar usuarios (solo si coincidieron en el mismo lugar)
router.post('/', async (req, res) => {
  const { user_id_1, user_id_2, venue_id } = req.body;

  if (!user_id_1 || !user_id_2 || !venue_id) {
    return res.status(400).json({ error: 'Faltan datos (user_id_1, user_id_2, venue_id)' });
  }

  if (user_id_1 === user_id_2) {
    return res.status(400).json({ error: 'No puedes vincularte con tu propio usuario' });
  }

  try {
    // Validar que ambos usuarios tengan check-in registrado en ese lugar
    const check1 = await pool.query('SELECT id FROM attendance WHERE user_id = $1 AND venue_id = $2', [user_id_1, venue_id]);
    const check2 = await pool.query('SELECT id FROM attendance WHERE user_id = $1 AND venue_id = $2', [user_id_2, venue_id]);

    if (check1.rows.length === 0 || check2.rows.length === 0) {
      return res.status(403).json({ error: 'Solo pueden vincularse si ambos registran asistencia en el mismo lugar' });
    }

    const newFriendship = await pool.query(
      'INSERT INTO friendships (user_id_1, user_id_2, common_venue_id) VALUES ($1, $2, $3) RETURNING *',
      [user_id_1, user_id_2, venue_id]
    );

    res.status(201).json({
      message: '🤝 Amistad confirmada por coincidencia de lugar',
      friendship: newFriendship.rows[0]
    });
  } catch (error) {
    console.error('Error al conectar usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor o vínculo ya existente' });
  }
});

module.exports = router;