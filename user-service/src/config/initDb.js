const sequelize = require('./db'); 
const { User, Follow } = require('../models/associations');

async function initDB(syncModels = false) {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to Database");

    User;
    Follow;

    if (syncModels) {
      await sequelize.sync({ alter: true });
      console.log("✅ Database models synced");
    }
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
}

module.exports = { sequelize, initDB };
