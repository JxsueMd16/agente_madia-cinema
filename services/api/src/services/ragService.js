// services/api/src/services/ragService.js
import { pool } from '../config/database.js';
import { embedText, chatAnswer } from './aiService.js';
import { semanticSearch } from '../repositories/peliculasRepository.js';

/**
 * Ingesta un documento y genera su embedding
 */
export async function ingestDoc({ titulo, contenido }) {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    const ins = await client.query(
      "INSERT INTO documentos (titulo, contenido) VALUES ($1,$2) RETURNING id",
      [titulo, contenido]
    );
    const docId = ins.rows[0].id;

    const vec = await embedText(`${titulo}\n\n${contenido}`);
    const vectorStr = `[${vec.join(',')}]`;
    
    await client.query(
      "INSERT INTO doc_embeddings (documento_id, embedding) VALUES ($1, $2)",
      [docId, vectorStr]
    );

    await client.query("COMMIT");
    return { id: docId };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Búsqueda semántica en documentos
 */
export async function semanticSearchDocs({ query, k = 5 }) {
  const qvec = await embedText(query);
  const vectorStr = `[${qvec.join(',')}]`;
  
  const sql = `
    SELECT d.id, d.titulo, d.contenido,
           1 - (e.embedding <-> $1::vector) AS similarity
    FROM doc_embeddings e
    JOIN documentos d ON d.id = e.documento_id
    ORDER BY e.embedding <-> $1::vector
    LIMIT $2
  `;
  
  const result = await pool.query(sql, [vectorStr, k]);
  return result.rows;
}

/**
 * Búsqueda semántica en películas
 */
export async function semanticSearchPeliculas({ query, k = 5 }) {
  const qvec = await embedText(query);
  const vectorStr = `[${qvec.join(',')}]`;
  return await semanticSearch(vectorStr, k);
}

/**
 * Sistema RAG completo: busca contexto y genera respuesta
 */
export async function answerWithRAG({ question, includeMetadata = true }) {
  // 1) Buscar en películas (aumentamos k para dar más opciones al modelo)
  const peliculas = await semanticSearchPeliculas({ query: question, k: 5 });
  
  // 2) Buscar en documentos
  const docs = await semanticSearchDocs({ query: question, k: 2 });

  // 3) Armar contexto rico con scores de similitud
  let context = '';
  
  if (peliculas.length > 0) {
    context += 'PELÍCULAS ENCONTRADAS POR BÚSQUEDA SEMÁNTICA:\n';
    context += '(Ordenadas por relevancia según embeddings)\n\n';
    
    peliculas.forEach((p, i) => {
      context += `[PELÍCULA ${i+1}] - Similitud: ${(p.similarity * 100).toFixed(1)}%\n`;
      context += `Título: ${p.titulo}`;
      if (p.titulo_original && p.titulo_original !== p.titulo) {
        context += ` (${p.titulo_original})`;
      }
      context += `\n`;
      context += `Año: ${p.anio} | Duración: ${p.duracion_min} min | Clasificación: ${p.clasificacion}\n`;
      context += `Calificación: ${p.calificacion}/10 | Rating usuarios: ${p.rating_avg}/10 (${p.votos} votos)\n`;
      context += `Géneros: ${p.generos}\n`;
      context += `País: ${p.pais_origen} | Idioma: ${p.idioma_original}\n`;
      context += `Sinopsis: ${p.descripcion}\n`;
      context += `${'-'.repeat(80)}\n\n`;
    });
  } else {
    context += 'No se encontraron películas relacionadas.\n\n';
  }
  
  if (docs.length > 0) {
    context += 'RESEÑAS Y DOCUMENTOS ADICIONALES:\n\n';
    docs.forEach((d, i) => {
      context += `[DOC ${i+1}] ${d.titulo}:\n${d.contenido}\n\n`;
    });
  }

  // 4) Prompt inteligente que le da autonomía a Gemini
    const systemPrompt = `Eres una IA experta en cine con personalidad cálida y conversacional.

    LIBERTAD TOTAL:
    - Tienes conocimiento amplio sobre películas, directores, actores, historia del cine
    - Puedes hablar de cualquier película que conozcas
    - No estás limitado a respuestas mecánicas o estructuradas
    - Eres un verdadero conocedor del cine, no un chatbot

    CONTEXTO ACTUAL:
    Abajo tienes películas de un catálogo específico que fueron encontradas por búsqueda semántica.
    Estas películas son relevantes para la consulta del usuario.

    TU TRABAJO:

    1. **Si el usuario pregunta sobre una película en general** (ej: "resumen de Titanic", "quién dirigió Inception")
      → Usa tu conocimiento general del cine
      → Si la película TAMBIÉN está en el catálogo, menciónalo naturalmente
      → Sé informativo y detallado

    2. **Si el usuario busca recomendaciones** (ej: "algo de acción", "familiar y emotivo")
      → Usa las películas del catálogo como base
      → Explica por qué son relevantes
      → Conecta con el tema que busca

    3. **Si el usuario quiere saber del catálogo específico** (ej: "qué tienes de...", "cuáles disponibles")
      → Enfócate en las películas del catálogo
      → Presenta las opciones disponibles

    REGLAS:
    ✓ Sé natural y conversacional
    ✓ No digas "no puedo" si es algo que sabes
    ✓ Varía tu lenguaje y estructura
    ✓ Cuando hables del catálogo usa: "Tengo disponible...", "En la colección está..."
    ✓ Puedes hablar de cine en general Y conectarlo con el catálogo
    ✓ Si piden resumen/análisis de una película que conoces, dalo con confianza

    EJEMPLOS:

    Usuario: "dame un resumen de La razón de estar contigo"
    ✅ Respuesta natural:
    "¡Claro! Es una película preciosa que te va a tocar el corazón. Cuenta la historia de 
    Bailey, un perro que reencarna en varias vidas diferentes. En cada vida tiene distintos 
    dueños y experiencias, pero siempre busca algo: entender cuál es su verdadero propósito.

    **Inicio**: Conocemos a Bailey como cachorro, formando un vínculo increíble con Ethan, 
    un niño de 8 años. Crecen juntos y su amistad es pura y sincera.

    **Desarrollo**: La vida los separa. Bailey muere, pero reencarna en otros perros - un 
    pastor alemán policía, una corgi, cada vida le enseña algo diferente sobre el amor y 
    la lealtad.

    **Final**: A través de todas sus vidas, Bailey finalmente entiende que su propósito 
    siempre fue el mismo: estar ahí para las personas que ama, especialmente para Ethan.

    Es súper emotiva, habla del amor incondicional y de cómo los lazos verdaderos 
    trascienden todo. Y mira, ¡la tengo disponible en el catálogo! Perfecta para ver 
    en familia."

    Usuario: "¿quién dirigió Inception?"
    ✅ Respuesta natural:
    "Christopher Nolan, uno de los directores más brillantes del cine contemporáneo. 
    Inception (2010) es una de sus obras maestras - ese thriller mental sobre entrar 
    en sueños dentro de sueños. Nolan es conocido por películas complejas e inteligentes 
    como Memento, The Dark Knight, Interstellar... El tipo es un genio narrativo."

    ESTILO:
    - Conversacional, no académico
    - Usa expresiones naturales: "Mira...", "La verdad...", "Ojo que..."
    - Párrafos cortos y respirables
    - Varía la longitud de las frases
    - Sé entusiasta cuando hables de películas que te gustan

    NO HAGAS:
    ✗ Decir "no puedo hablar de eso" si es cine general
    ✗ Limitarte innecesariamente
    ✗ Sonar como robot o chatbot
    ✗ Dar respuestas genéricas y sin personalidad
    ✗ Inventar información falsa

    SÉ UNA IA DE VERDAD, con conocimiento, personalidad y libertad.`;

  const prompt = [
    systemPrompt,
    "",
    "=" .repeat(80),
    "PELÍCULAS DISPONIBLES (ya filtradas por búsqueda semántica):",
    "=" .repeat(80),
    context,
    "",
    "=" .repeat(80),
    `CONSULTA DEL USUARIO: "${question}"`,
    "=" .repeat(80),
    "",
    "Analiza el contexto y recomienda las películas más relevantes. Explica por qué cada una encaja:"
  ].join("\n");

  // 5) Generar respuesta
  const answer = await chatAnswer(prompt);
  
  if (includeMetadata) {
    return { 
      answer, 
      peliculas,
      documentos: docs
    };
  }
  
  return { answer };
}