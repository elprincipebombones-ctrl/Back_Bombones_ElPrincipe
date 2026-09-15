'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE recepciones_vehiculos ALTER COLUMN vehiculo_id DROP NOT NULL',
        { transaction },
      );

      await queryInterface.addColumn(
        'recepciones_vehiculos',
        'placa_snapshot',
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'recepciones_vehiculos',
        'tipo_vehiculo_snapshot',
        { type: Sequelize.STRING(50), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'recepciones_vehiculos',
        'marca_snapshot',
        { type: Sequelize.STRING(80), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        'recepciones_vehiculos',
        'modelo_snapshot',
        { type: Sequelize.STRING(80), allowNull: true },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `UPDATE recepciones_vehiculos rv
         SET placa_snapshot = UPPER(v.placa),
             tipo_vehiculo_snapshot = v.tipo_vehiculo,
             marca_snapshot = v.marca,
             modelo_snapshot = v.modelo
         FROM vehiculos v
         WHERE rv.vehiculo_id = v.id`,
        { transaction },
      );

      await queryInterface.changeColumn(
        'recepciones_vehiculos',
        'placa_snapshot',
        { type: Sequelize.STRING(20), allowNull: false },
        { transaction },
      );
      await queryInterface.addIndex('recepciones_vehiculos', ['recepcion_id', 'vehiculo_id'], {
        unique: true,
        name: 'uq_recepcion_vehiculo_registrado',
        transaction,
      });
      await queryInterface.addIndex('recepciones_vehiculos', ['recepcion_id', 'placa_snapshot'], {
        unique: true,
        name: 'uq_recepcion_vehiculo_placa_snapshot',
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'recepciones_vehiculos',
        'uq_recepcion_vehiculo_placa_snapshot',
        { transaction },
      );
      await queryInterface.removeIndex(
        'recepciones_vehiculos',
        'uq_recepcion_vehiculo_registrado',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DELETE FROM recepciones_vehiculos WHERE vehiculo_id IS NULL',
        { transaction },
      );
      await queryInterface.removeColumn('recepciones_vehiculos', 'modelo_snapshot', {
        transaction,
      });
      await queryInterface.removeColumn('recepciones_vehiculos', 'marca_snapshot', {
        transaction,
      });
      await queryInterface.removeColumn('recepciones_vehiculos', 'tipo_vehiculo_snapshot', {
        transaction,
      });
      await queryInterface.removeColumn('recepciones_vehiculos', 'placa_snapshot', {
        transaction,
      });
      await queryInterface.sequelize.query(
        'ALTER TABLE recepciones_vehiculos ALTER COLUMN vehiculo_id SET NOT NULL',
        { transaction },
      );
    });
  },
};
