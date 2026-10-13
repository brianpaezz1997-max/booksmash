const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Mercado Pago
const mpAccessToken = process.env.MP_ACCESS_TOKEN || '';
let client = null;
if (mpAccessToken) {
  client = new MercadoPagoConfig({ accessToken: mpAccessToken });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de Multer para fotos subidas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Base de Datos Temporal en Memoria (MVP)
let users = [{ id: '1', username: 'BrianPaez', email: 'brian@booksmash.app', password: '123' }];
let stickers = [];
let venues = [
  { id: '1', name: 'Estadio Monumental', qr_code_hash: 'QR_MONUMENTAL_001' },
  { id: '2', name: 'Quilmes Bar', qr_code_hash: 'QR_QUILMES_BAR' }
];

// RUTAS API

// Auth
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) return res.json({ user });
  res.status(401).json({ error: 'Credenciales inválidas' });
});

app.post('/api/users/register', (req, res) => {
  const { username, email, password } = req.body;
  if (users.some(u => u.email === email)) return res.status(400).json({ error: 'El email ya existe' });
  
  const newUser = { id: String(users.length + 1), username, email, password };
  users.push(newUser);
  res.json({ user: newUser });
});

// Check-in
app.post('/api/venues/checkin', (req, res) => {
  const { qr_code_hash } = req.body;
  const venue = venues.find(v => v.qr_code_hash === qr_code_hash);
  if (venue) return res.json({ venue });
  res.status(404).json({ error: 'Código QR no válido' });
});

// Stickers
app.post('/api/stickers', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
  const { user_id, venue_id, device_watermark } = req.body;
  const venue = venues.find(v => v.id === venue_id) || { name: 'Evento Autorizado' };

  const newSticker = {
    id: String(stickers.length + 1),
    user_id,
    venue_name: venue.name,
    image_url: `/uploads/${req.file.filename}`,
    device_watermark: device_watermark || 'iPhone 15 Pro',
    created_at: new Date()
  };
  stickers.push(newSticker);
  res.json({ sticker: newSticker });
});

app.get('/api/stickers/user/:id', (req, res) => {
  res.json({ album: stickers });
});

// MERCADO PAGO - Crear preferencia de cobro real
app.post('/api/payments/create-preference', async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({ error: 'Mercado Pago no está configurado con Access Token' });
    }

    const { title, priceARS } = req.body;
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            title: title || 'Pase Comercial BookSmash',
            quantity: 1,
            unit_price: Number(priceARS) || 7500,
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${req.protocol}://${req.get('host')}/?status=success`,
          failure: `${req.protocol}://${req.get('host')}/?status=failure`,
          pending: `${req.protocol}://${req.get('host')}/?status=pending`
        },
        auto_return: 'approved'
      }
    });

    res.json({ init_point: result.init_point });
  } catch (error) {
    console.error('Error MP:', error);
    res.status(500).json({ error: 'Error al generar preferencia de pago' });
  }
});

// Asegurar carpeta de uploads
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor BookSmash corriendo en puerto ${PORT}`);
});