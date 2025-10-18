// services/api/src/services/toolsService.js
import * as peliculasRepo from '../repositories/peliculasRepository.js';

/**
 * Definiciones de herramientas para Function Calling
 */
export const toolDefinitions = [
  {
    name: "buscar_por_genero",
    description: "Busca películas filtradas por uno o más géneros específicos. Útil cuando el usuario pregunta por películas de un género en particular.",
    parameters: {
      type: "object",
      properties: {
        generos: {
          type: "array",
          items: { type: "string" },
          description: "Lista de géneros a buscar (ej: ['Acción', 'Drama'])"
        }
      },
      required: ["generos"]
    }
  },
  {
    name: "buscar_por_anio",
    description: "Busca películas por año o rango de años. Útil para consultas sobre películas de una época específica.",
    parameters: {
      type: "object",
      properties: {
        anio_inicio: {
          type: "integer",
          description: "Año de inicio del rango"
        },
        anio_fin: {
          type: "integer",
          description: "Año final del rango (opcional, si no se proporciona busca solo el año_inicio)"
        }
      },
      required: ["anio_inicio"]
    }
  },
  {
    name: "buscar_por_calificacion",
    description: "Busca películas con calificación mayor o igual a un valor específico. Útil para encontrar las mejor valoradas.",
    parameters: {
      type: "object",
      properties: {
        calificacion_min: {
          type: "number",
          description: "Calificación mínima (escala 0-10)"
        }
      },
      required: ["calificacion_min"]
    }
  },
  {
    name: "buscar_por_pais",
    description: "Busca películas de un país específico. Útil cuando el usuario pregunta por películas guatemaltecas, estadounidenses, etc.",
    parameters: {
      type: "object",
      properties: {
        pais: {
          type: "string",
          description: "Código o nombre del país (ej: 'GT', 'US', 'Guatemala')"
        }
      },
      required: ["pais"]
    }
  },
  {
    name: "contar_peliculas",
    description: "Cuenta el total de películas en el catálogo, opcionalmente filtradas por criterios.",
    parameters: {
      type: "object",
      properties: {
        genero: {
          type: "string",
          description: "Género opcional para filtrar el conteo"
        },
        pais: {
          type: "string",
          description: "País opcional para filtrar el conteo"
        }
      },
      required: []
    }
  },
  {
    name: "obtener_estadisticas",
    description: "Obtiene estadísticas generales del catálogo: total de películas, promedio de calificaciones, géneros disponibles, etc.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "comparar_peliculas",
    description: "Compara dos o más películas específicas mostrando sus características lado a lado.",
    parameters: {
      type: "object",
      properties: {
        titulos: {
          type: "array",
          items: { type: "string" },
          description: "Lista de títulos de películas a comparar"
        }
      },
      required: ["titulos"]
    }
  }
];

/**
 * Ejecuta una herramienta específica
 */
export async function executeTool(toolName, args) {
  console.log(`Ejecutando herramienta: ${toolName}`, args);
  
  switch (toolName) {
    case 'buscar_por_genero':
      return await peliculasRepo.findByGenero(args.generos);
      
    case 'buscar_por_anio':
      return await peliculasRepo.findByAnio(args.anio_inicio, args.anio_fin);
      
    case 'buscar_por_calificacion':
      return await peliculasRepo.findByCalificacion(args.calificacion_min);
      
    case 'buscar_por_pais':
      return await peliculasRepo.findByPais(args.pais);
      
    case 'contar_peliculas':
      return await peliculasRepo.contarPeliculas(args.genero, args.pais);
      
    case 'obtener_estadisticas':
      return await peliculasRepo.getEstadisticas();
      
    case 'comparar_peliculas':
      return await peliculasRepo.compararPeliculas(args.titulos);
      
    default:
      throw new Error(`Herramienta desconocida: ${toolName}`);
  }
}