// services/api/src/controllers/productosController.js
import { getAllPeliculas, getPeliculaById } from '../repositories/peliculasRepository.js';

/**
 * Lista todas las películas del catálogo
 */
export async function listarProductos(req, res) {
  try {
    const peliculas = await getAllPeliculas();
    res.json(peliculas);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
}

export async function getPelicula(req, res) {
  const { id } = req.params;  // Obtener el ID de la URL

  try {
    const pelicula = await getPeliculaById(id);  // Buscar la película por ID
    res.json(pelicula);
  } catch (error) {
    console.error('Error al obtener detalles de la película:', error);
    res.status(500).json({ error: error.message });
  }
}
