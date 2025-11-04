'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1️⃣ Add 'rewarded' value to ENUM type
      await queryInterface.changeColumn(
        'Events',
        'status',
        {
          type: Sequelize.ENUM('draft', 'published', 'cancelled', 'completed', 'rewarded'),
          allowNull: false,
          defaultValue: 'draft',
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 2️⃣ Revert ENUM (remove rewarded)
      await queryInterface.changeColumn(
        'Events',
        'status',
        {
          type: Sequelize.ENUM('draft', 'published', 'cancelled', 'completed'),
          allowNull: false,
          defaultValue: 'draft',
        },
        { transaction }
      );
    });
  },
};
