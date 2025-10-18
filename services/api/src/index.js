// services/api/src/index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const app = express();

// Para obtener __dirname en ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middlewares
app.use(express.json());

// Servir archivos estáticos (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Registrar todas las rutas de la API
app.use('/', routes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Iniciar servidor
const port = process.env.API_PORT || 3000;

app.listen(port, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log('API de Películas Iniciada');
  console.log(`${'='.repeat(50)}`);
  console.log(`Puerto: ${port}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`${'='.repeat(50)}\n`);
});