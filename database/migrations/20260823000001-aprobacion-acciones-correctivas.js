'use strict';

const pk = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

const fkUsuario = (Sequelize, allowNull = false) => ({
  type: Sequelize.UUID,
  allowNull,
  references: { model: 'usuarios', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: allowNull ? 'SET NULL' : 'CASCADE',
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.sequelize.query(
        `ALTER TYPE enum_acciones_correctivas_estado RENAME TO enum_acciones_correctivas_estado_anterior;
         CREATE TYPE enum_acciones_correctivas_estado AS ENUM
           ('PENDIENTE', 'EN_PROCESO', 'PENDIENTE_APROBACION', 'CERRADA');
         ALTER TABLE acciones_correctivas ALTER COLUMN estado DROP DEFAULT;
         ALTER TABLE acciones_correctivas ALTER COLUMN estado TYPE enum_acciones_correctivas_estado
           USING estado::text::enum_acciones_correctivas_estado;
         ALTER TABLE acciones_correctivas ALTER COLUMN estado SET DEFAULT 'PENDIENTE';
         DROP TYPE enum_acciones_correctivas_estado_anterior;`,
        options,
      );
      await queryInterface.addColumn(
        'acciones_correctivas',
        'fecha_envio_aprobacion',
        { type: Sequelize.DATE, allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'acciones_correctivas',
        'enviada_aprobacion_por',
        fkUsuario(Sequelize, true),
        options,
      );
      await queryInterface.createTable('aprobadores_acciones_correctivas', {
        id: pk(Sequelize),
        usuario_id: fkUsuario(Sequelize),
        agregado_por: fkUsuario(Sequelize, true),
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      }, options);
      await queryInterface.addConstraint('aprobadores_acciones_correctivas', {
        fields: ['usuario_id'],
        type: 'unique',
        name: 'uq_aprobadores_acciones_usuario',
        transaction,
      });
      await queryInterface.sequelize.query(
        `INSERT INTO aprobadores_acciones_correctivas
           (id, usuario_id, agregado_por, estado, created_at, updated_at)
         SELECT gen_random_uuid(), u.id, u.id, true, NOW(), NOW()
         FROM usuarios u
         INNER JOIN roles r ON r.id = u.rol_id
         WHERE u.estado = true AND r.nombre = 'Administrador'
         ON CONFLICT (usuario_id) DO NOTHING`,
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.dropTable('aprobadores_acciones_correctivas', options);
      await queryInterface.removeColumn('acciones_correctivas', 'enviada_aprobacion_por', options);
      await queryInterface.removeColumn('acciones_correctivas', 'fecha_envio_aprobacion', options);
      await queryInterface.sequelize.query(
        `UPDATE acciones_correctivas SET estado = 'EN_PROCESO'
         WHERE estado::text = 'PENDIENTE_APROBACION';
         ALTER TYPE enum_acciones_correctivas_estado RENAME TO enum_acciones_correctivas_estado_nuevo;
         CREATE TYPE enum_acciones_correctivas_estado AS ENUM ('PENDIENTE', 'EN_PROCESO', 'CERRADA');
         ALTER TABLE acciones_correctivas ALTER COLUMN estado DROP DEFAULT;
         ALTER TABLE acciones_correctivas ALTER COLUMN estado TYPE enum_acciones_correctivas_estado
           USING estado::text::enum_acciones_correctivas_estado;
         ALTER TABLE acciones_correctivas ALTER COLUMN estado SET DEFAULT 'PENDIENTE';
         DROP TYPE enum_acciones_correctivas_estado_nuevo;`,
        options,
      );
    });
  },
};
