'use strict';

const pk = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

const fk = (Sequelize, model, allowNull = false, onDelete = 'RESTRICT') => ({
  type: Sequelize.UUID,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'tareas_accion_correctiva',
        {
          id: pk(Sequelize),
          accion_correctiva_id: {
            ...fk(Sequelize, 'acciones_correctivas'),
            unique: true,
          },
          usuario_asignado_id: fk(Sequelize, 'usuarios'),
          fecha_limite: { type: Sequelize.DATEONLY, allowNull: false },
          descripcion: { type: Sequelize.TEXT, allowNull: false },
          documentacion: { type: Sequelize.TEXT, allowNull: true },
          estado: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'PENDIENTE',
          },
          fecha_completada: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        },
        options,
      );

      await queryInterface.addConstraint('tareas_accion_correctiva', {
        fields: ['estado'],
        type: 'check',
        where: { estado: ['PENDIENTE', 'COMPLETADA'] },
        name: 'ck_tareas_accion_correctiva_estado',
        transaction,
      });
      await queryInterface.addIndex(
        'tareas_accion_correctiva',
        ['usuario_asignado_id', 'estado', 'fecha_limite'],
        options,
      );

      await queryInterface.addColumn(
        'evidencias_accion_correctiva',
        'tarea_accion_correctiva_id',
        fk(Sequelize, 'tareas_accion_correctiva', true, 'RESTRICT'),
        options,
      );
      await queryInterface.addIndex(
        'evidencias_accion_correctiva',
        ['tarea_accion_correctiva_id'],
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.removeColumn(
        'evidencias_accion_correctiva',
        'tarea_accion_correctiva_id',
        options,
      );
      await queryInterface.dropTable('tareas_accion_correctiva', options);
    });
  },
};
