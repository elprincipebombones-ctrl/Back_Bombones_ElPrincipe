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

      await queryInterface.createTable('categorias_elemento', {
        id: pk(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      }, options);

      await queryInterface.createTable('elementos_inspeccion', {
        id: pk(Sequelize),
        categoria_elemento_id: fk(Sequelize, 'categorias_elemento'),
        codigo: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(200), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      }, options);
      await queryInterface.addIndex('elementos_inspeccion', ['categoria_elemento_id'], options);

      await queryInterface.createTable('criterios_inspeccion', {
        id: pk(Sequelize),
        codigo: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(200), allowNull: false },
        pregunta: { type: Sequelize.TEXT, allowNull: false },
        tipo_campo_id: fk(Sequelize, 'tipos_campo'),
        resultado_esperado: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'CUMPLE' },
        permite_observacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        requiere_evidencia: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        nivel_severidad_id: fk(Sequelize, 'niveles_severidad'),
        mensaje_incumplimiento: { type: Sequelize.TEXT, allowNull: true },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      }, options);
      await queryInterface.addIndex('criterios_inspeccion', ['tipo_campo_id'], options);
      await queryInterface.addIndex('criterios_inspeccion', ['nivel_severidad_id'], options);

      await queryInterface.createTable('acciones_criterio', {
        id: pk(Sequelize),
        criterio_inspeccion_id: fk(Sequelize, 'criterios_inspeccion', false, 'CASCADE'),
        tipo_accion_id: fk(Sequelize, 'tipos_accion'),
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      }, options);
      await queryInterface.addConstraint('acciones_criterio', {
        fields: ['criterio_inspeccion_id', 'tipo_accion_id'],
        type: 'unique',
        name: 'uq_acciones_criterio_tipo',
        transaction,
      });
      await queryInterface.addIndex('acciones_criterio', ['criterio_inspeccion_id'], options);
      await queryInterface.addIndex('acciones_criterio', ['tipo_accion_id'], options);

      await queryInterface.createTable('checklists_seccion', {
        id: pk(Sequelize),
        seccion_formato_id: fk(Sequelize, 'secciones_formato', false, 'CASCADE'),
        criterio_inspeccion_id: fk(Sequelize, 'criterios_inspeccion'),
        nombre: { type: Sequelize.STRING(200), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      }, options);
      await queryInterface.addIndex('checklists_seccion', ['seccion_formato_id'], options);
      await queryInterface.addIndex('checklists_seccion', ['criterio_inspeccion_id'], options);

      await queryInterface.createTable('elementos_checklist', {
        id: pk(Sequelize),
        checklist_seccion_id: fk(Sequelize, 'checklists_seccion', false, 'CASCADE'),
        elemento_inspeccion_id: fk(Sequelize, 'elementos_inspeccion'),
        codigo_snapshot: { type: Sequelize.STRING(80), allowNull: false },
        nombre_snapshot: { type: Sequelize.STRING(200), allowNull: false },
        orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      }, options);
      await queryInterface.addConstraint('elementos_checklist', {
        fields: ['checklist_seccion_id', 'elemento_inspeccion_id'],
        type: 'unique',
        name: 'uq_elementos_checklist_elemento',
        transaction,
      });
      await queryInterface.addIndex('elementos_checklist', ['checklist_seccion_id'], options);
      await queryInterface.addIndex('elementos_checklist', ['elemento_inspeccion_id'], options);

      await queryInterface.createTable('respuestas_elemento_checklist', {
        id: pk(Sequelize),
        inspeccion_id: fk(Sequelize, 'inspecciones', false, 'CASCADE'),
        checklist_seccion_id: fk(Sequelize, 'checklists_seccion'),
        elemento_checklist_id: fk(Sequelize, 'elementos_checklist'),
        elemento_inspeccion_id: fk(Sequelize, 'elementos_inspeccion'),
        criterio_inspeccion_id: fk(Sequelize, 'criterios_inspeccion'),
        resultado: { type: Sequelize.STRING(50), allowNull: false },
        cumple: { type: Sequelize.BOOLEAN, allowNull: true },
        observacion: { type: Sequelize.TEXT, allowNull: true },
        evidencia_url: { type: Sequelize.TEXT, allowNull: true },
        guardado_por: fk(Sequelize, 'usuarios'),
        fecha_guardado: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        ...timestamps(Sequelize),
      }, options);
      await queryInterface.addConstraint('respuestas_elemento_checklist', {
        fields: ['inspeccion_id', 'elemento_checklist_id'],
        type: 'unique',
        name: 'uq_respuestas_elemento_inspeccion',
        transaction,
      });
      for (const column of [
        'inspeccion_id', 'checklist_seccion_id', 'elemento_checklist_id',
        'elemento_inspeccion_id', 'criterio_inspeccion_id', 'guardado_por',
      ]) {
        await queryInterface.addIndex('respuestas_elemento_checklist', [column], options);
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('respuestas_elemento_checklist');
    await queryInterface.dropTable('elementos_checklist');
    await queryInterface.dropTable('checklists_seccion');
    await queryInterface.dropTable('acciones_criterio');
    await queryInterface.dropTable('criterios_inspeccion');
    await queryInterface.dropTable('elementos_inspeccion');
    await queryInterface.dropTable('categorias_elemento');
  },
};
