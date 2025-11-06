// services/api/src/services/mcpClient.js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cliente MCP simplificado que se conecta al servidor TMDB
 */
class MCPClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Conecta al servidor MCP
   */
  async connect() {
    if (this.isConnected) return;

    try {
      const serverPath = path.join(__dirname, '../mcp/tmdb-server.js');
      
      // Crear transporte stdio
      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath]
      });

      // Crear cliente
      this.client = new Client({
        name: 'mcp-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(transport);
      this.isConnected = true;

      console.log('[MCP] Cliente conectado exitosamente');
    } catch (error) {
      console.error('[MCP] Error conectando:', error.message);
      throw error;
    }
  }

  /**
   * Lista herramientas disponibles
   */
  async listTools() {
    if (!this.isConnected) await this.connect();
    
    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error('[MCP] Error listando tools:', error.message);
      return [];
    }
  }

  /**
   * Ejecuta una herramienta
   */
  async callTool(name, args) {
    if (!this.isConnected) await this.connect();

    try {
      const response = await this.client.callTool({
        name,
        arguments: args
      });

      // Extraer contenido de texto
      if (response.content && Array.isArray(response.content)) {
        const textContent = response.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          try {
            return JSON.parse(textContent.text);
          } catch (e) {
            return { data: textContent.text };
          }
        }
      }

      return response;
    } catch (error) {
      console.error('[MCP] Error ejecutando tool:', error.message);
      throw error;
    }
  }

  /**
   * Busca película en TMDB
   */
  async searchMovie(query) {
    try {
      const result = await this.callTool('search_movie_tmdb', { query });
      return result;
    } catch (error) {
      console.error('[MCP] Error buscando película:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene detalles de película
   */
  async getMovieDetails(movieId) {
    try {
      const result = await this.callTool('get_movie_details_tmdb', { movie_id: movieId });
      return result;
    } catch (error) {
      console.error('[MCP] Error obteniendo detalles:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene disponibilidad de streaming en Guatemala
   */
  async getStreamingAvailability(movieId) {
    try {
      const result = await this.callTool('get_streaming_availability', { movie_id: movieId });
      return result;
    } catch (error) {
      console.error('[MCP] Error obteniendo disponibilidad:', error.message);
      throw error;
    }
  }

  /**
   * Cierra conexión
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        console.log('[MCP] Cliente desconectado');
      } catch (error) {
        console.error('[MCP] Error desconectando:', error.message);
      }
    }
  }
}

// Singleton
let mcpClientInstance = null;

export function getMCPClient() {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}

export default getMCPClient;