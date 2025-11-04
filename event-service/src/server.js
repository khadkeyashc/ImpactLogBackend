const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const infra = require('./config/initInfrastructure'); // already a singleton
const app = require('./app'); // <-- use your full Express setup

const port = process.env.PORT || 3005;

async function startHttp() {
  try {
    // Initialize Redis, RabbitMQ, DB
    await infra.init({ syncDBModels: true });

    // Start HTTP server
    const server = app.listen(port, () => {
      console.log(`✅ Auth HTTP service running on port ${port}`);
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      try {
        console.log('⚠️ Shutting down gracefully...');
        server.close(async () => {
          await infra.shutdown();
          console.log('✅ Shutdown complete. Exiting process.');
          process.exit(0);
        });
      } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('❌ Failed to start HTTP server:', err.message);
    process.exit(1);
  }
}

startHttp();
