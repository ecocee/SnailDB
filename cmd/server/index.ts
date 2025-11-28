#!/usr/bin/env node

/**
 * SNAILDB Server Entry Point
 * Start the custom database server
 */

import path from 'path';
import SnailDBServer, { SnailDBServerConfig } from '../../src/server/snaildb-server';
import { Logger, LogLevel } from '../../src/server/logger';

const logger = new Logger('CLI', path.join(process.cwd(), 'data'));

// Parse command line arguments
const args = process.argv.slice(2);
const config: SnailDBServerConfig = {
  host: 'localhost',
  port: 12222,
  dataDir: path.join(process.cwd(), 'data'),
  maxConnections: 1000,
  maxMemory: 512 * 1024 * 1024, // 512MB
  enableVectorSearch: true,
  vectorDimension: 384, // Default embedding dimension
  persistence: {
    enabled: true,
    interval: 30000, // 30 seconds
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 60 seconds
  },
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--host':
      config.host = args[++i];
      break;
    case '--port':
      config.port = parseInt(args[++i]);
      break;
    case '--password':
      config.password = args[++i];
      break;
    case '--datadir':
      config.dataDir = args[++i];
      break;
    case '--maxmemory':
      config.maxMemory = parseInt(args[++i]);
      break;
    case '--no-vectors':
      config.enableVectorSearch = false;
      break;
    case '--vector-dim':
      config.vectorDimension = parseInt(args[++i]);
      break;
    case '--help':
      printHelp();
      process.exit(0);
      break;
  }
}

function printHelp(): void {
  console.log(`
SNAILDB Server v2.0.0

Usage: snaildb-server [options]

Options:
  --host <hostname>         Server host (default: localhost)
  --port <port>            Server port (default: 12222)
  --password <password>    Server password (optional)
  --datadir <path>         Data directory (default: ./data)
  --maxmemory <bytes>      Max memory in bytes (default: 512MB)
  --no-vectors             Disable vector search
  --vector-dim <dim>       Vector dimension (default: 384)
  --help                   Show this help message

Examples:
  snaildb-server --port 12222
  snaildb-server --host 0.0.0.0 --port 9999 --password mypass
  snaildb-server --maxmemory 1073741824 --vector-dim 768
  `);
}

async function main(): Promise<void> {
  try {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    SNAILDB SERVER v2.0.0                     ║
║         AI-Optimized Custom Database for LLM/AI Models       ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    const server = new SnailDBServer(config);

    // Handle events
    server.on('started', () => {
      console.log(`✅ Server started successfully`);
      console.log(`📍 Connection string: snaildb://${config.host}:${config.port}`);
      if (config.password) {
        console.log(`🔐 Authentication enabled`);
      }
      console.log(`💾 Data directory: ${config.dataDir}`);
      console.log(`💰 Max memory: ${config.maxMemory / 1024 / 1024}MB`);
      console.log(`🧠 Vector search: ${config.enableVectorSearch ? 'enabled' : 'disabled'}`);
      if (config.enableVectorSearch) {
        console.log(`📐 Vector dimension: ${config.vectorDimension}`);
      }
      console.log(`\n⏳ Press Ctrl+C to stop the server\n`);
    });

    server.on('metrics', (metrics: any) => {
      logger.info('Metrics', metrics);
    });

    server.on('error', (error: any) => {
      logger.error('Server error', error as Error);
    });

    // Start server
    await server.start();

    // Keep process alive
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught exception', error as Error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal(`Unhandled rejection at ${promise}: ${reason}`);
      process.exit(1);
    });
  } catch (error) {
    logger.fatal('Failed to start server', error as Error);
    console.error(`❌ Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Run main
main();
