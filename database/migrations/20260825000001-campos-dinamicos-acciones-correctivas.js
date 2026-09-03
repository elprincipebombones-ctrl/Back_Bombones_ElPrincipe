'use strict';

const pk = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

const fk = (Sequelize, model, allowNull = false, onDelete = 'CASCADE') => ({
  type: Sequelize.UUID,
  allowNull,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete,
});

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'campos_accion_correctiva',
        {
          id: pk(Sequelize),
          codigo: { type: Sequelize.STRING(80), allowNull: false, unique: true },
          nombre: { type: Sequelize.STRING(200), allowNull: false },
          descripcion: { type: Sequelize.STRING(500), allowNull: true },
          obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );

      await queryInterface.createTable(
        'parametros_campos_accion',
        {
          id: pk(Sequelize),
          parametro_calidad_id: fk(Sequelize, 'parametros_calidad'),
          campo_accion_correctiva_id: fk(Sequelize, 'campos_accion_correctiva', false, 'RESTRICT'),
          orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          obligatorio_override: { type: Sequelize.BOOLEAN, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );

      await queryInterface.addConstraint('parametros_campos_accion', {
        fields: ['parametro_calidad_id', 'campo_accion_correctiva_id'],
        type: 'unique',
        name: 'uq_parametro_campo_accion',
        transaction,
      });

      await queryInterface.createTable(
        'criterios_campos_accion',
        {
          id: pk(Sequelize),
          criterio_inspeccion_id: fk(Sequelize, 'criterios_inspeccion'),
          campo_accion_correctiva_id: fk(Sequelize, 'campos_accion_correctiva', false, 'RESTRICT'),
          orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          obligatorio_override: { type: Sequelize.BOOLEAN, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );

      await queryInterface.addConstraint('criterios_campos_accion', {
        fields: ['criterio_inspeccion_id', 'campo_accion_correctiva_id'],
        type: 'unique',
        name: 'uq_criterio_campo_accion',
        transaction,
      });

      await queryInterface.createTable(
        'campos_accion_instancia',
        {
          id: pk(Sequelize),
          accion_correctiva_id: fk(Sequelize, 'acciones_correctivas'),
          campo_accion_correctiva_id: fk(Sequelize, 'campos_accion_correctiva', true, 'SET NULL'),
          codigo: { type: Sequelize.STRING(80), allowNull: false },
          nombre: { type: Sequelize.STRING(200), allowNull: false },
          obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          valor_texto: { type: Sequelize.TEXT, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );

      await queryInterface.addConstraint('campos_accion_instancia', {
        fields: ['accion_correctiva_id', 'codigo'],
        type: 'unique',
        name: 'uq_accion_correctiva_campo_snapshot',
        transaction,
      });

      await queryInterface.addIndex(
        'parametros_campos_accion',
        ['parametro_calidad_id', 'orden'],
        options,
      );
      await queryInterface.addIndex(
        'criterios_campos_accion',
        ['criterio_inspeccion_id', 'orden'],
        options,
      );
      await queryInterface.addIndex(
        'campos_accion_instancia',
        ['accion_correctiva_id', 'orden'],
        options,
      );

      await queryInterface.sequelize.query(
        `INSERT INTO campos_accion_correctiva
           (id, codigo, nombre, descripcion, obligatorio, orden, activo, created_at, updated_at)
         VALUES
           (gen_random_uuid(), 'CAUSA_PROBABLE', 'Causa probable del no cumplimiento', NULL, false, 1, true, NOW(), NOW()),
           (gen_random_uuid(), 'ACCION_CORRECTIVA_INMEDIATA', 'Acción correctiva inmediata', NULL, false, 2, true, NOW(), NOW()),
           (gen_random_uuid(), 'ACCION_PREVENTIVA', 'Acción preventiva', NULL, false, 3, true, NOW(), NOW())
         ON CONFLICT (codigo) DO NOTHING`,
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.dropTable('campos_accion_instancia', options);
      await queryInterface.dropTable('criterios_campos_accion', options);
      await queryInterface.dropTable('parametros_campos_accion', options);
      await queryInterface.dropTable('campos_accion_correctiva', options);
    });
  },
};
