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
    await queryInterface.createTable('reglas_calidad', {
      id: pk(Sequelize),
      campo_formato_id: fk(Sequelize, 'campos_formato', false, 'CASCADE'),
      codigo: { type: Sequelize.STRING(30), allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      descripcion: { type: Sequelize.STRING(255), allowNull: true },
      nivel_severidad_id: fk(Sequelize, 'niveles_severidad', true, 'SET NULL'),
      mensaje_incumplimiento: { type: Sequelize.STRING(255), allowNull: true },
      operador_logico: { type: Sequelize.ENUM('AND', 'OR'), allowNull: false, defaultValue: 'AND' },
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addConstraint('reglas_calidad', {
      fields: ['campo_formato_id', 'codigo'],
      type: 'unique',
      name: 'uq_reglas_calidad_campo_codigo',
    });
    await queryInterface.addIndex('reglas_calidad', ['campo_formato_id']);
    await queryInterface.addIndex('reglas_calidad', ['nivel_severidad_id']);

    await queryInterface.createTable('condiciones_regla', {
      id: pk(Sequelize),
      regla_calidad_id: fk(Sequelize, 'reglas_calidad', false, 'CASCADE'),
      tipo_condicion: {
        type: Sequelize.ENUM('RANGO', 'VALOR_EXACTO', 'LISTA', 'OBLIGATORIO'),
        allowNull: false,
      },
      operador: {
        type: Sequelize.ENUM(
          'IGUAL',
          'DIFERENTE',
          'MAYOR_QUE',
          'MAYOR_IGUAL',
          'MENOR_QUE',
          'MENOR_IGUAL',
          'ENTRE',
          'FUERA_DE_RANGO',
          'EN_LISTA',
          'NO_EN_LISTA',
          'VACIO',
          'NO_VACIO',
        ),
        allowNull: false,
      },
      valor_1: { type: Sequelize.STRING(255), allowNull: true },
      valor_2: { type: Sequelize.STRING(255), allowNull: true },
      valor_json: { type: Sequelize.JSONB, allowNull: true },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('condiciones_regla', ['regla_calidad_id']);

    await queryInterface.createTable('acciones_regla', {
      id: pk(Sequelize),
      regla_calidad_id: fk(Sequelize, 'reglas_calidad', false, 'CASCADE'),
      tipo_accion_id: fk(Sequelize, 'tipos_accion'),
      configuracion: { type: Sequelize.JSONB, allowNull: true },
      orden: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps(Sequelize),
    });
    await queryInterface.addIndex('acciones_regla', ['regla_calidad_id']);
    await queryInterface.addIndex('acciones_regla', ['tipo_accion_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('acciones_regla');
    await queryInterface.dropTable('condiciones_regla');
    await queryInterface.dropTable('reglas_calidad');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reglas_calidad_operador_logico";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_condiciones_regla_tipo_condicion";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_condiciones_regla_operador";');
  },
};
