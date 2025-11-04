
const { initRedis } = require("../config/initReddis");
const { initRabbitMQ } = require("../config/initRabbitmq");

class Infrastructure {
  constructor() {
    this.redisClient = null;
    this.amqpConn = null;
    this.amqpChannel = null;
  }

  async init() {
    

    // Initialize Redis (uncomment if you need Redis)
    // this.redisClient = await initRedis();

    // Initialize RabbitMQ
    const { conn, channel } = await initRabbitMQ();
    this.amqpConn = conn;
    this.amqpChannel = channel;

    console.log("✅ Infrastructure initialized (DB, RabbitMQ, Redis?)");
  }

  async shutdown() {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
        console.log("🛑 Redis connection closed");
      }
      if (this.amqpChannel) {
        await this.amqpChannel.close();
        console.log("🛑 RabbitMQ channel closed");
      }
      if (this.amqpConn) {
        await this.amqpConn.close();
        console.log("🛑 RabbitMQ connection closed");
      }
    } catch (err) {
      console.error("❌ Error shutting down infrastructure:", err.message);
    }
  }
}

// Export singleton instance
module.exports = new Infrastructure();
