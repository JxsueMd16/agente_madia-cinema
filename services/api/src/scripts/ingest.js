// services/api/src/scripts/ingest.js
import { pool } from '../config/database.js';
import { embedText, chatAnswer } from '../services/aiService.js';
import logger from '../utils/logger.js';

/**
 * Analiza una película y genera tags emocionales/temáticos usando Gemini
 */
async function analizarPeliculaConIA(pelicula) {
  const prompt = `Analiza esta película y genera tags descriptivos exhaustivos que capturen su esencia completa.

PELÍCULA:
- Título: ${pelicula.titulo}
- Géneros: ${pelicula.generos}
- Descripción: ${pelicula.descripcion}

Genera tags que capturen:
1. Tono emocional (emotivo, conmovedor, inspirador, triste, melancólico, alegre, divertido, ligero, intenso, oscuro, perturbador, épico)
2. Público objetivo (familiar, para niños, para toda la familia, para adultos, juvenil, maduro)
3. Atmósfera (suspenso, miedo, terror, misterio, romance, aventura, acción, tranquilo, relajante, tenso)
4. Temas emocionales (amistad, familia, amor, pérdida, superación, venganza, justicia, sacrificio, redención, nostalgia)
5. Conceptos específicos (viajes en el tiempo, inteligencia artificial, extraterrestres, espacio, multiverso, distopía, apocalipsis, paradojas temporales, realidad virtual, clonación, exploración espacial, agujeros negros, robots, aliens)
6. Sentimientos que provoca (hace llorar, feel good, motivador, angustiante, reflexivo, perturbador, inspirador)

INSTRUCCIONES CRÍTICAS:
- Si la película involucra CUALQUIER manipulación del tiempo (ralentización, aceleración, viajes, paradojas, distorsión relativista, agujeros de gusano), incluye "viajes en el tiempo"
- Si es apta para ver en familia o con niños, incluye "familiar" y "para toda la familia"
- Si tiene elementos científicos avanzados, menciónalos explícitamente
- Si la trama toca temas profundos o filosóficos, inclúyelos
- Sé exhaustivo: entre 15-20 tags

Ejemplos:
- Película sobre un perro que reencarna: emotivo, familiar, conmovedor, para toda la familia, amistad, amor, pérdida, superación, propósito de vida, hace llorar, feel good, reflexivo, inspirador, viajes en el tiempo, reencarnación, animales
- Película de exploración espacial: emotivo, intenso, viajes en el tiempo, espacio, familia, exploración espacial, ciencia ficción, reflexivo, épico, paradojas temporales, agujeros negros, relatividad, sacrificio, amor

Responde SOLO con:
TAGS: [lista separada por comas]`;

  try {
    const respuesta = await chatAnswer(prompt);
    
    const match = respuesta.match(/TAGS:\s*(.+)/i);
    if (match) {
      const tags = match[1]
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);
      
      return tags.join(', ');
    }
    
    logger.warn(`No se pudieron extraer tags para: ${pelicula.titulo}`);
    return '';
  } catch (error) {
    logger.error(`Error analizando película ${pelicula.id}:`, error.message);
    return '';
  }
}

/**
 * Genera un texto enriquecido para el embedding
 * Filosofía: Simple y directo - el embedding hará el resto
 */
function generarTextoEnriquecido(pelicula, tagsEmocionales) {
  return [
    `Título: ${pelicula.titulo}`,
    `Géneros: ${pelicula.generos}`,
    `Descripción: ${pelicula.descripcion}`,
    tagsEmocionales ? `\nTags: ${tagsEmocionales}` : '',
    tagsEmocionales ? `Características: ${tagsEmocionales}` : ''
  ].filter(Boolean).join('\n');
}

async function ingestPeliculas() {
  logger.info('Iniciando ingesta inteligente de películas con análisis emocional...');
  
  const client = await pool.connect();
  
  try {
    // 1. Obtener todas las películas con sus géneros
    const result = await client.query(`
      SELECT 
        p.id,
        p.titulo,
        p.descripcion,
        COALESCE(string_agg(g.nombre, ', ' ORDER BY g.nombre), '') AS generos
      FROM peliculas p
      LEFT JOIN pelicula_genero pg ON pg.pelicula_id = p.id
      LEFT JOIN generos g ON g.id = pg.genero_id
      GROUP BY p.id, p.titulo, p.descripcion
      ORDER BY p.id
    `);

    logger.info(`Encontradas ${result.rows.length} películas`);

    if (result.rows.length === 0) {
      logger.warn('No hay películas en la base de datos. Ejecuta primero 02_seed.sql');
      return;
    }

    // 2. Limpiar embeddings existentes
    await client.query('DELETE FROM pelicula_embeddings');
    logger.success('Embeddings antiguos eliminados');

    // 3. Procesar cada película con análisis emocional
    let procesadas = 0;
    let errores = 0;
    
    for (const pelicula of result.rows) {
      logger.info(`\n[${'='.repeat(60)}]`);
      logger.info(`[${pelicula.id}/${result.rows.length}] Procesando: ${pelicula.titulo}`);
      
      try {
        // Paso 1: Analizar con IA para obtener tags emocionales
        logger.info('  Analizando película con Gemini...');
        const tagsEmocionales = await analizarPeliculaConIA(pelicula);
        
        if (tagsEmocionales) {
          logger.success(`  Tags generados (${tagsEmocionales.split(',').length} tags)`);
          logger.debug(`  ${tagsEmocionales}`);
        }
        
        // Paso 2: Generar texto enriquecido
        const textoEnriquecido = generarTextoEnriquecido(pelicula, tagsEmocionales);
        logger.debug(`  Texto para embedding: ${textoEnriquecido.length} caracteres`);
        
        // Paso 3: Generar embedding
        logger.info('  Generando embedding...');
        const embedding = await embedText(textoEnriquecido);
        
        if (!Array.isArray(embedding) || embedding.length === 0) {
          logger.error(`  Embedding inválido`);
          errores++;
          continue;
        }

        logger.debug(`  Embedding: ${embedding.length} dimensiones`);

        // Paso 4: Guardar en base de datos
        const vectorStr = `[${embedding.join(',')}]`;
        
        await client.query(
          'INSERT INTO pelicula_embeddings (pelicula_id, embedding) VALUES ($1, $2)',
          [pelicula.id, vectorStr]
        );
        
        procesadas++;
        logger.success(`  ✓ COMPLETADO (${procesadas}/${result.rows.length})`);
        
      } catch (err) {
        errores++;
        logger.error(`  ✗ Error procesando película ${pelicula.id}:`, err.message);
      }

      // Pausa para no exceder límites de la API (1.5 segundos entre películas)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    logger.info(`\n${'='.repeat(60)}`);
    logger.success('INGESTA COMPLETADA');
    logger.info(`${'='.repeat(60)}`);
    logger.info(`Estadísticas finales:`);
    logger.info(`   - Total películas: ${result.rows.length}`);
    logger.info(`   - Procesadas exitosamente: ${procesadas}`);
    logger.info(`   - Errores: ${errores}`);
    
    // Verificar embeddings en BD
    const stats = await client.query('SELECT COUNT(*) as total FROM pelicula_embeddings');
    logger.info(`   - Embeddings en BD: ${stats.rows[0].total}`);
    logger.info(`${'='.repeat(60)}\n`);

  } catch (error) {
    logger.error('❌ Error fatal en ingesta:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestPeliculas()
    .then(() => {
      logger.success('Proceso completado exitosamente');
      process.exit(0);
    })
    .catch(err => {
      logger.error('Error fatal:', err);
      process.exit(1);
    });
}

export { ingestPeliculas };