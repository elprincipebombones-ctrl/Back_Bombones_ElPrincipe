'use strict';
// Habilita gen_random_uuid() en PostgreSQL
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "pgcrypto";');
  },
};
