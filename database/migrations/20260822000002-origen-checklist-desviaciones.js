'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE desviaciones
           ALTER COLUMN respuesta_inspeccion_id DROP NOT NULL,
           ALTER COLUMN regla_calidad_id DROP NOT NULL`,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DELETE FROM desviaciones WHERE respuesta_elemento_checklist_id IS NOT NULL;
         ALTER TABLE desviaciones
           ALTER COLUMN respuesta_inspeccion_id SET NOT NULL,
           ALTER COLUMN regla_calidad_id SET NOT NULL`,
        { transaction },
      );
    });
  },
};
