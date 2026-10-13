const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Archivos de persistencia local (Base de datos en archivos JSON)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const STICKERS_FILE = path.join(DATA_DIR, 'stickers.json');

function readJsonFile(filePath, defaultVal) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err);
  }
  return defaultVal;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error escribiendo ${filePath}:`, err);
  }
}

// Configuración de Multer para subir fotos y almacenarlas en disco
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- ENDPOINTS DE USUARIOS (PERSISTENTES) ---

app.post('/api/users/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para el registro' });
  }

  let users = readJsonFile(USERS_FILE, []);
  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
  }

  const newUser = {
    id: 'user_' + Date.now(),
    username,
    email,
    password, // En un entorno comercial real se encriptaría con bcrypt
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  writeJsonFile(USERS_FILE, users);

  res.json({ success: true, user: { id: newUser.id, username: newUser.username, email: newUser.email } });
});

app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  let users = readJsonFile(USERS_FILE, []);
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Correo electrónico o contraseña incorrectos' });
  }

  res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
});

// --- ENDPOINTS DE LUGARES Y CHECK-IN ---

app.post('/api/venues/checkin', (req, res) => {
  const { qr_code_hash } = req.body;
  // Simulamos validación de QR de local o evento
  const venue = {
    id: 'venue_001',
    name: qr_code_hash === 'QR_MONUMENTAL_001' ? 'Estadio Monumental' : 'Espacio Cultural BookSmash',
    address: 'Buenos Aires, Argentina'
  };
  res.json({ success: true, venue });
});

// --- ENDPOINTS DE PUBLICACIONES Y FOTOS (STICKERS) ---

app.post('/api/stickers', upload.single('photo'), (req, res) => {
  const { user_id, venue_id, device_watermark } = req.body;
  if (!req.file) {
    return res.status(400).json({ error: 'No se adjuntó ninguna imagen' });
  }

  let stickers = readJsonFile(STICKERS_FILE, []);
  const newSticker = {
    id: 'stk_' + Date.now(),
    user_id,
    venue_id,
    venue_name: venue_id === 'venue_001' ? 'Estadio Monumental' : 'Evento BookSmash',
    image_url: `/uploads/${req.file.filename}`,
    device_watermark: device_watermark || 'Publicación Oficial',
    created_at: new Date().toISOString()
  };

  stickers.unshift(newSticker); // Las más recientes primero
  writeJsonFile(STICKERS_FILE, stickers);

  res.json({ success: true, sticker: newSticker });
});

app.get('/api/stickers/user/:userId', (req, res) => {
  const stickers = readJsonFile(STICKERS_FILE, []);
  // Devolvemos todas las publicaciones de la red para alimentar el feed social
  res.json({ success: true, album: stickers });
});

app.listen(PORT, () => {
  console.log(`Servidor BookSmash ejecutándose en puerto ${PORT}`);
});