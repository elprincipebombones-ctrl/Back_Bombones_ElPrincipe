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
    await queryInterface.addColumn('campos_formato', 'bloquear_al_guardar', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.createTable('inspecciones', {
      id: pk(Sequelize),
      version_formato_id: fk(Sequelize, 'versiones_formato'),
      lugar_inspeccion_id: fk(Sequelize, 'lugares_inspeccion', true, 'SET NULL'),
      estado: {
        type: Sequelize.ENUM('BORRADOR', 'COMPLETADA', 'PENDIENTE_ACCION', 'CERRADA'),
        allowNull: false,
        defaultValue: 'BORRADOR',
      },
      fecha_inspeccion: { type: Sequelize.DATEONLY, allowNull: false },
      iniciada_por: fk(Sequelize, 'usuarios'),
      fecha_inicio: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      fecha_completada: { type: Sequelize.DATE, allowNull: true },
      cerrada_por: fk(Sequelize, 'usuarios', true, 'SET NULL'),
      fecha_cierre: { type: Sequelize.DATE, allowNull: true },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps(Sequelize),
    });
    for (const columna of [
      'version_formato_id',
      'lugar_inspeccion_id',
      'iniciada_por',
      'cerrada_por',
    ]) {
      await queryInterface.addIndex('inspecciones', [columna]);
    }
    await queryInterface.addIndex('inspecciones', ['fecha_inspeccion', 'estado']);

    await queryInterface.createTable('respuestas_inspeccion', {
      id: pk(Sequelize),
      inspeccion_id: fk(Sequelize, 'inspecciones', false, 'CASCADE'),
      campo_formato_id: fk(Sequelize, 'campos_formato'),
      valor_texto: { type: Sequelize.TEXT, allowNull: true },
      valor_numero: { type: Sequelize.DECIMAL, allowNull: true },
      valor_booleano: { type: Sequelize.BOOLEAN, allowNull: true },
      valor_fecha: { type: Sequelize.DATEONLY, allowNull: true },
      valor_hora: { type: Sequelize.TIME, allowNull: true },
      valor_fecha_hora: { type: Sequelize.DATE, allowNull: true },
      valor_json: { type: Sequelize.JSONB, allowNull: true },
      observacion: { type: Sequelize.TEXT, allowNull: true },
      guardado_por: fk(Sequelize, 'usuarios'),
      fecha_guardado: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      bloqueada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('respuestas_inspeccion', {
      fields: ['inspeccion_id', 'campo_formato_id'],
      type: 'unique',
      name: 'uq_respuestas_inspeccion_campo',
    });
    for (const columna of ['inspeccion_id', 'campo_formato_id', 'guardado_por']) {
      await queryInterface.addIndex('respuestas_inspeccion', [columna]);
    }

    await queryInterface.createTable('respuestas_opciones', {
      id: pk(Sequelize),
      respuesta_inspeccion_id: fk(Sequelize, 'respuestas_inspeccion', false, 'CASCADE'),
      opcion_campo_id: fk(Sequelize, 'opciones_campo'),
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('respuestas_opciones', {
      fields: ['respuesta_inspeccion_id', 'opcion_campo_id'],
      type: 'unique',
      name: 'uq_respuestas_opciones_respuesta_opcion',
    });
    await queryInterface.addIndex('respuestas_opciones', ['respuesta_inspeccion_id']);
    await queryInterface.addIndex('respuestas_opciones', ['opcion_campo_id']);

    await queryInterface.createTable('desviaciones', {
      id: pk(Sequelize),
      inspeccion_id: fk(Sequelize, 'inspecciones', false, 'CASCADE'),
      respuesta_inspeccion_id: fk(Sequelize, 'respuestas_inspeccion', false, 'CASCADE'),
      regla_calidad_id: fk(Sequelize, 'reglas_calidad'),
      nivel_severidad_id: fk(Sequelize, 'niveles_severidad', true, 'SET NULL'),
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      mensaje: { type: Sequelize.TEXT, allowNull: true },
      estado: {
        type: Sequelize.ENUM('ABIERTA', 'EN_TRATAMIENTO', 'CERRADA'),
        allowNull: false,
        defaultValue: 'ABIERTA',
      },
      fecha_deteccion: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      detectada_por: fk(Sequelize, 'usuarios', true, 'SET NULL'),
      fecha_cierre: { type: Sequelize.DATE, allowNull: true },
      cerrada_por: fk(Sequelize, 'usuarios', true, 'SET NULL'),
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('desviaciones', {
      fields: ['respuesta_inspeccion_id', 'regla_calidad_id'],
      type: 'unique',
      name: 'uq_desviaciones_respuesta_regla',
    });
    for (const columna of [
      'inspeccion_id',
      'respuesta_inspeccion_id',
      'regla_calidad_id',
      'nivel_severidad_id',
      'detectada_por',
      'cerrada_por',
    ]) {
      await queryInterface.addIndex('desviaciones', [columna]);
    }

    await queryInterface.createTable('acciones_correctivas', {
      id: pk(Sequelize),
      desviacion_id: fk(Sequelize, 'desviaciones', false, 'CASCADE'),
      tipo_accion_id: fk(Sequelize, 'tipos_accion'),
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      estado: {
        type: Sequelize.ENUM('PENDIENTE', 'EN_PROCESO', 'CERRADA'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },
      responsable_id: fk(Sequelize, 'usuarios', true, 'SET NULL'),
      fecha_asignacion: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      fecha_limite: { type: Sequelize.DATE, allowNull: true },
      fecha_inicio: { type: Sequelize.DATE, allowNull: true },
      fecha_cierre: { type: Sequelize.DATE, allowNull: true },
      cerrada_por: fk(Sequelize, 'usuarios', true, 'SET NULL'),
      observacion_cierre: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('acciones_correctivas', {
      fields: ['desviacion_id', 'tipo_accion_id'],
      type: 'unique',
      name: 'uq_acciones_correctivas_desviacion_tipo',
    });
    for (const columna of ['desviacion_id', 'tipo_accion_id', 'responsable_id', 'cerrada_por']) {
      await queryInterface.addIndex('acciones_correctivas', [columna]);
    }

    await queryInterface.createTable('seguimientos_accion_correctiva', {
      id: pk(Sequelize),
      accion_correctiva_id: fk(Sequelize, 'acciones_correctivas', false, 'CASCADE'),
      tipo_registro: {
        type: Sequelize.ENUM('NUEVA_MEDICION', 'OBSERVACION', 'AJUSTE', 'VERIFICACION'),
        allowNull: false,
      },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      valor_numero: { type: Sequelize.DECIMAL, allowNull: true },
      valor_texto: { type: Sequelize.TEXT, allowNull: true },
      valor_booleano: { type: Sequelize.BOOLEAN, allowNull: true },
      unidad_medida_id: fk(Sequelize, 'unidades_medida', true, 'SET NULL'),
      resultado_cumple: { type: Sequelize.BOOLEAN, allowNull: true },
      registrado_por: fk(Sequelize, 'usuarios'),
      fecha_registro: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      ...timestamps(Sequelize),
    });
    for (const columna of ['accion_correctiva_id', 'unidad_medida_id', 'registrado_por']) {
      await queryInterface.addIndex('seguimientos_accion_correctiva', [columna]);
    }

    await queryInterface.createTable('evidencias_accion_correctiva', {
      id: pk(Sequelize),
      accion_correctiva_id: fk(Sequelize, 'acciones_correctivas', false, 'CASCADE'),
      seguimiento_accion_correctiva_id: fk(
        Sequelize,
        'seguimientos_accion_correctiva',
        true,
        'SET NULL',
      ),
      nombre_archivo: { type: Sequelize.STRING(255), allowNull: false },
      tipo_archivo: { type: Sequelize.STRING(100), allowNull: true },
      url_archivo: { type: Sequelize.TEXT, allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      subido_por: fk(Sequelize, 'usuarios'),
      fecha_carga: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      ...timestamps(Sequelize),
    });
    for (const columna of [
      'accion_correctiva_id',
      'seguimiento_accion_correctiva_id',
      'subido_por',
    ]) {
      await queryInterface.addIndex('evidencias_accion_correctiva', [columna]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('evidencias_accion_correctiva');
    await queryInterface.dropTable('seguimientos_accion_correctiva');
    await queryInterface.dropTable('acciones_correctivas');
    await queryInterface.dropTable('desviaciones');
    await queryInterface.dropTable('respuestas_opciones');
    await queryInterface.dropTable('respuestas_inspeccion');
    await queryInterface.dropTable('inspecciones');
    await queryInterface.removeColumn('campos_formato', 'bloquear_al_guardar');
    for (const tipo of [
      'enum_inspecciones_estado',
      'enum_desviaciones_estado',
      'enum_acciones_correctivas_estado',
      'enum_seguimientos_accion_correctiva_tipo_registro',
    ]) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${tipo}";`);
    }
  },
};
