// services/api/src/utils/logger.js

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Formatea timestamp para logs
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Logger básico con colores
 */
export const logger = {
  info: (message, data = null) => {
    console.log(
      `${colors.cyan}[INFO]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`
    );
    if (data) console.log(data);
  },

  success: (message, data = null) => {
    console.log(
      `${colors.green}[SUCCESS]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`
    );
    if (data) console.log(data);
  },

  warn: (message, data = null) => {
    console.warn(
      `${colors.yellow}[WARN]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`
    );
    if (data) console.warn(data);
  },

  error: (message, error = null) => {
    console.error(
      `${colors.red}[ERROR]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`
    );
    if (error) {
      if (error.stack) {
        console.error(colors.dim + error.stack + colors.reset);
      } else {
        console.error(error);
      }
    }
  },

  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${colors.magenta}[DEBUG]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`
      );
      if (data) console.log(data);
    }
  },

  agent: (message, data = null) => {
    console.log(
      `${colors.blue}[AGENT]${colors.reset} ${colors.dim}${getTimestamp()}${colors.reset} ${message}`
    );
    if (data) console.log(data);
  }
};

export default logger;