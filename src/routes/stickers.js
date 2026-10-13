const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');

// Configuración de almacenamiento de fotos con Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'sticker-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// POST /api/stickers - Subir una figurita/foto con archivo real
router.post('/', upload.single('photo'), async (req, res) => {
  const { user_id, venue_id, device_watermark } = req.body;

  if (!user_id || !venue_id || !req.file) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (user_id, venue_id y la foto)' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;

  try {
    // 1. Verificar si el usuario hizo check-in en el lugar previamente
    const attendanceCheck = await pool.query(
      'SELECT id FROM attendance WHERE user_id = $1 AND venue_id = $2',
      [user_id, venue_id]
    );

    if (attendanceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Debes hacer check-in en este lugar antes de agregar una figurita' });
    }

    // 2. Guardar la figurita en la base de datos
    const newSticker = await pool.query(
      'INSERT INTO stickers (user_id, venue_id, image_url, device_watermark) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, venue_id, imageUrl, device_watermark || 'Navegador Web']
    );

    // 3. Sumar 10 puntos al usuario
    await pool.query('UPDATE users SET score = score + 10 WHERE id = $1', [user_id]);

    res.status(201).json({
      message: '📸 Figurita agregada con éxito al álbum (+10 puntos)',
      sticker: newSticker.rows[0]
    });
  } catch (error) {
    console.error('Error al agregar figurita:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/stickers/user/:userId - Obtener el álbum completo del usuario
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const stickers = await pool.query(
      `SELECT s.id, s.image_url, s.device_watermark, s.reaction_score, s.created_at, 
              v.name AS venue_name, v.address AS venue_address
       FROM stickers s
       JOIN venues v ON s.venue_id = v.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json({
      total_stickers: stickers.rows.length,
      album: stickers.rows
    });
  } catch (error) {
    console.error('Error al obtener álbum:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;