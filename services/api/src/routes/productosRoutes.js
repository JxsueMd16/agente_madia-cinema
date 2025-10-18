import { Router } from 'express';
import { listarProductos, getPelicula } from '../controllers/productosController.js';

const router = Router();

// Ruta para listar todas las películas
router.get('/', listarProductos);

// Ruta para obtener los detalles de una película por ID
router.get('/:id', getPelicula);

export default router;
