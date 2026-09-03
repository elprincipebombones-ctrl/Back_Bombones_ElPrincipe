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
    await queryInterface.createTable('formatos_calidad', {
      id: pk(Sequelize),
      codigo: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      tipo_inspeccion_id: fk(Sequelize, 'tipos_inspeccion'),
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('formatos_calidad', ['tipo_inspeccion_id']);

    await queryInterface.createTable('versiones_formato', {
      id: pk(Sequelize),
      formato_calidad_id: fk(Sequelize, 'formatos_calidad', false, 'CASCADE'),
      numero_version: { type: Sequelize.INTEGER, allowNull: false },
      fecha_vigencia_desde: { type: Sequelize.DATEONLY, allowNull: false },
      fecha_vigencia_hasta: { type: Sequelize.DATEONLY, allowNull: true },
      estado_version: {
        type: Sequelize.ENUM('BORRADOR', 'PUBLICADO', 'OBSOLETO'),
        allowNull: false,
        defaultValue: 'BORRADOR',
      },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      publicado_por: fk(Sequelize, 'usuarios', true, 'SET NULL'),
      fecha_publicacion: { type: Sequelize.DATE, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('versiones_formato', {
      fields: ['formato_calidad_id', 'numero_version'],
      type: 'unique',
      name: 'uq_versiones_formato_formato_numero',
    });
    await queryInterface.addIndex('versiones_formato', ['formato_calidad_id']);
    await queryInterface.addIndex('versiones_formato', ['publicado_por']);

    await queryInterface.createTable('secciones_formato', {
      id: pk(Sequelize),
      version_formato_id: fk(Sequelize, 'versiones_formato', false, 'CASCADE'),
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('secciones_formato', ['version_formato_id']);

    await queryInterface.createTable('campos_formato', {
      id: pk(Sequelize),
      seccion_formato_id: fk(Sequelize, 'secciones_formato', false, 'CASCADE'),
      parametro_calidad_id: fk(Sequelize, 'parametros_calidad', true, 'SET NULL'),
      tipo_campo_id: fk(Sequelize, 'tipos_campo'),
      unidad_medida_id: fk(Sequelize, 'unidades_medida', true, 'SET NULL'),
      codigo: { type: Sequelize.STRING(30), allowNull: false },
      etiqueta: { type: Sequelize.STRING(150), allowNull: false },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      texto_ayuda: { type: Sequelize.STRING(255), allowNull: true },
      es_obligatorio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      valor_minimo: { type: Sequelize.DECIMAL, allowNull: true },
      valor_maximo: { type: Sequelize.DECIMAL, allowNull: true },
      precision_decimal: { type: Sequelize.INTEGER, allowNull: true },
      permite_observacion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      requiere_evidencia: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('campos_formato', {
      fields: ['seccion_formato_id', 'codigo'],
      type: 'unique',
      name: 'uq_campos_formato_seccion_codigo',
    });
    for (const column of [
      'seccion_formato_id',
      'parametro_calidad_id',
      'tipo_campo_id',
      'unidad_medida_id',
    ]) {
      await queryInterface.addIndex('campos_formato', [column]);
    }

    await queryInterface.createTable('opciones_campo', {
      id: pk(Sequelize),
      campo_formato_id: fk(Sequelize, 'campos_formato', false, 'CASCADE'),
      valor: { type: Sequelize.STRING(100), allowNull: false },
      etiqueta: { type: Sequelize.STRING(150), allowNull: false },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('opciones_campo', {
      fields: ['campo_formato_id', 'valor'],
      type: 'unique',
      name: 'uq_opciones_campo_campo_valor',
    });
    await queryInterface.addIndex('opciones_campo', ['campo_formato_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('opciones_campo');
    await queryInterface.dropTable('campos_formato');
    await queryInterface.dropTable('secciones_formato');
    await queryInterface.dropTable('versiones_formato');
    await queryInterface.dropTable('formatos_calidad');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_versiones_formato_estado_version";',
    );
  },
};
