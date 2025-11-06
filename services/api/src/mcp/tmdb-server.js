// services/api/src/mcp/tmdb-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const TMDB_API_KEY = 'bab865524deb657dd17762f88ec0e4a7'; // Tu API Key
const TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYWI4NjU1MjRkZWI2NTdkZDE3NzYyZjg4ZWMwZTRhNyIsIm5iZiI6MTczMDUyNzg2Ni41MzQ4NDksInN1YiI6IjY3MjU3ZDUyNWRhZDhkMzk4NTE2NTY3ZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.0lqLXzseLMlS-HEmjhHIcI99KMKfQIdjuBOoVBLBECg';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Servidor MCP simple que consulta TMDB
 */
class TMDBServer {
  constructor() {
    this.server = new Server(
      {
        name: 'tmdb-movies-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  setupHandlers() {
    // Listar herramientas disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_movie_tmdb',
          description: 'Busca películas en TMDB (base de datos externa) que NO están en el catálogo local',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Título de la película a buscar'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'get_movie_details_tmdb',
          description: 'Obtiene detalles completos de una película de TMDB',
          inputSchema: {
            type: 'object',
            properties: {
              movie_id: {
                type: 'number',
                description: 'ID de TMDB de la película'
              }
            },
            required: ['movie_id']
          }
        },
        {
          name: 'get_streaming_availability',
          description: 'Obtiene información de dónde ver una película en streaming en Guatemala (Netflix, Prime Video, Disney+, HBO Max, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              movie_id: {
                type: 'number',
                description: 'ID de TMDB de la película'
              }
            },
            required: ['movie_id']
          }
        }
      ]
    }));

    // Ejecutar herramientas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'search_movie_tmdb') {
          return await this.searchMovie(args.query);
        }
        
        if (name === 'get_movie_details_tmdb') {
          return await this.getMovieDetails(args.movie_id);
        }

        throw new Error(`Herramienta desconocida: ${name}`);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Busca películas en TMDB
   */
  async searchMovie(query) {
    const config = TMDB_API_KEY 
      ? {
          params: {
            api_key: TMDB_API_KEY,
            query,
            language: 'es-MX'
          }
        }
      : {
          params: {
            query,
            language: 'es-MX'
          },
          headers: {
            'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
            'accept': 'application/json'
          }
        };

    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, config);

    const results = response.data.results.slice(0, 5).map(movie => ({
      id: movie.id,
      titulo: movie.title,
      titulo_original: movie.original_title,
      anio: movie.release_date?.split('-')[0] || 'N/A',
      descripcion: movie.overview || 'Sin descripción',
      calificacion: movie.vote_average?.toFixed(1) || 'N/A',
      poster: movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
        : null
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: response.data.total_results,
            peliculas: results
          }, null, 2)
        }
      ]
    };
  }

  /**
   * Obtiene detalles de una película
   */
  async getMovieDetails(movieId) {
    const config = TMDB_API_KEY
      ? {
          params: {
            api_key: TMDB_API_KEY,
            language: 'es-MX',
            append_to_response: 'credits'
          }
        }
      : {
          params: {
            language: 'es-MX',
            append_to_response: 'credits'
          },
          headers: {
            'Authorization': `Bearer ${TMDB_BEARER_TOKEN}`,
            'accept': 'application/json'
          }
        };

    const response = await axios.get(`${TMDB_BASE_URL}/movie/${movieId}`, config);

    const movie = response.data;
    
    const details = {
      id: movie.id,
      titulo: movie.title,
      titulo_original: movie.original_title,
      anio: movie.release_date?.split('-')[0],
      duracion: movie.runtime,
      generos: movie.genres?.map(g => g.name).join(', '),
      descripcion: movie.overview,
      calificacion: movie.vote_average?.toFixed(1),
      votos: movie.vote_count,
      director: movie.credits?.crew?.find(c => c.job === 'Director')?.name,
      actores: movie.credits?.cast?.slice(0, 5).map(a => a.name).join(', '),
      poster: movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
        : null,
      backdrop: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(details, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP TMDB iniciado');
  }
}

// Ejecutar servidor
const server = new TMDBServer();
server.run().catch(console.error);