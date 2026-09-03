'use strict';

const pk = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
});

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
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
        'programaciones_formato',
        {
          id: pk(Sequelize),
          formato_calidad_id: fk(Sequelize, 'formatos_calidad', false, 'CASCADE'),
          hora_programada: { type: Sequelize.TIME, allowNull: true },
          fecha_inicio: { type: Sequelize.DATEONLY, allowNull: false },
          fecha_fin: { type: Sequelize.DATEONLY, allowNull: true },
          activo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await queryInterface.addIndex('programaciones_formato', ['formato_calidad_id'], options);
      await queryInterface.addIndex(
        'programaciones_formato',
        ['activo', 'fecha_inicio', 'fecha_fin'],
        options,
      );

      await queryInterface.createTable(
        'dias_programacion',
        {
          id: pk(Sequelize),
          programacion_formato_id: fk(Sequelize, 'programaciones_formato', false, 'CASCADE'),
          dia_semana: { type: Sequelize.INTEGER, allowNull: false },
          ...timestamps(Sequelize),
        },
        options,
      );
      await queryInterface.addConstraint('dias_programacion', {
        fields: ['programacion_formato_id', 'dia_semana'],
        type: 'unique',
        name: 'uq_dias_programacion_programacion_dia',
        transaction,
      });
      await queryInterface.sequelize.query(
        `ALTER TABLE dias_programacion
         ADD CONSTRAINT ck_dias_programacion_dia_semana CHECK (dia_semana BETWEEN 1 AND 7)`,
        options,
      );
      await queryInterface.addIndex('dias_programacion', ['dia_semana'], options);

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX uq_versiones_formato_publicada
         ON versiones_formato (formato_calidad_id)
         WHERE estado_version = 'PUBLICADO'`,
        options,
      );

      await queryInterface.sequelize.query(
        `ALTER TYPE enum_inspecciones_estado RENAME TO enum_inspecciones_estado_anterior;
         CREATE TYPE enum_inspecciones_estado AS ENUM
           ('BORRADOR', 'EN_PROCESO', 'PENDIENTE_ACCION', 'CERRADA', 'CERRADA_INCOMPLETA');
         ALTER TABLE inspecciones ALTER COLUMN estado DROP DEFAULT;
         ALTER TABLE inspecciones ALTER COLUMN estado TYPE enum_inspecciones_estado
           USING (CASE WHEN estado::text = 'COMPLETADA' THEN 'EN_PROCESO' ELSE estado::text END)::enum_inspecciones_estado;
         ALTER TABLE inspecciones ALTER COLUMN estado SET DEFAULT 'BORRADOR';
         DROP TYPE enum_inspecciones_estado_anterior;`,
        options,
      );

      await queryInterface.changeColumn(
        'desviaciones',
        'respuesta_inspeccion_id',
        {
          ...fk(Sequelize, 'respuestas_inspeccion', true, 'CASCADE'),
        },
        options,
      );
      await queryInterface.changeColumn(
        'desviaciones',
        'regla_calidad_id',
        {
          ...fk(Sequelize, 'reglas_calidad', true, 'RESTRICT'),
        },
        options,
      );
      await queryInterface.addColumn(
        'desviaciones',
        'respuesta_elemento_checklist_id',
        fk(Sequelize, 'respuestas_elemento_checklist', true, 'CASCADE'),
        options,
      );
      await queryInterface.addIndex('desviaciones', ['respuesta_elemento_checklist_id'], options);
      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX uq_desviaciones_respuesta_checklist
         ON desviaciones (respuesta_elemento_checklist_id)
         WHERE respuesta_elemento_checklist_id IS NOT NULL`,
        options,
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE desviaciones ADD CONSTRAINT ck_desviaciones_origen_respuesta
         CHECK ((respuesta_inspeccion_id IS NOT NULL) <> (respuesta_elemento_checklist_id IS NOT NULL))`,
        options,
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.removeConstraint(
        'desviaciones',
        'ck_desviaciones_origen_respuesta',
        options,
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS uq_desviaciones_respuesta_checklist',
        options,
      );
      await queryInterface.removeColumn('desviaciones', 'respuesta_elemento_checklist_id', options);
      await queryInterface.changeColumn(
        'desviaciones',
        'respuesta_inspeccion_id',
        {
          ...fk(Sequelize, 'respuestas_inspeccion', false, 'CASCADE'),
        },
        options,
      );
      await queryInterface.changeColumn(
        'desviaciones',
        'regla_calidad_id',
        {
          ...fk(Sequelize, 'reglas_calidad', false, 'RESTRICT'),
        },
        options,
      );
      await queryInterface.sequelize.query(
        `ALTER TYPE enum_inspecciones_estado RENAME TO enum_inspecciones_estado_nuevo;
         CREATE TYPE enum_inspecciones_estado AS ENUM
           ('BORRADOR', 'COMPLETADA', 'PENDIENTE_ACCION', 'CERRADA');
         ALTER TABLE inspecciones ALTER COLUMN estado DROP DEFAULT;
         ALTER TABLE inspecciones ALTER COLUMN estado TYPE enum_inspecciones_estado
           USING (CASE
             WHEN estado::text = 'EN_PROCESO' THEN 'COMPLETADA'
             WHEN estado::text = 'CERRADA_INCOMPLETA' THEN 'COMPLETADA'
             ELSE estado::text
           END)::enum_inspecciones_estado;
         ALTER TABLE inspecciones ALTER COLUMN estado SET DEFAULT 'BORRADOR';
         DROP TYPE enum_inspecciones_estado_nuevo;`,
        options,
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS uq_versiones_formato_publicada',
        options,
      );
      await queryInterface.dropTable('dias_programacion', options);
      await queryInterface.dropTable('programaciones_formato', options);
    });
  },
};
