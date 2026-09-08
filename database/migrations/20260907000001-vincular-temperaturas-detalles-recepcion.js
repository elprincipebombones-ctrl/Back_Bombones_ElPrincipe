module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE temperaturas_recepcion AS temperatura
      SET detalle_recepcion_id = detalle.id
      FROM detalles_recepcion AS detalle
      WHERE temperatura.detalle_recepcion_id IS NULL
        AND detalle.recepcion_id = temperatura.recepcion_id
        AND detalle.producto_id = temperatura.producto_id
        AND (
          SELECT COUNT(*)
          FROM detalles_recepcion AS coincidencia
          WHERE coincidencia.recepcion_id = temperatura.recepcion_id
            AND coincidencia.producto_id = temperatura.producto_id
        ) = 1
    `);
  },

  async down() {
    // La relación recuperada es válida y no debe eliminarse al revertir la migración.
  },
};
