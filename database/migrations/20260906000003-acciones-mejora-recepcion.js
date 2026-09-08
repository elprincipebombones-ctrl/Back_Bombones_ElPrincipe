const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const recepciones = await queryInterface.describeTable('recepciones', { transaction });
      if (!recepciones.tiene_novedades) {
        await queryInterface.addColumn(
          'recepciones',
          'tiene_novedades',
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        'ALTER TABLE recepciones DROP CONSTRAINT IF EXISTS recepciones_estado_check',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE recepciones
         ADD CONSTRAINT recepciones_estado_check
         CHECK (estado IN ('EN_PROCESO', 'TERMINADA', 'RECHAZADA'))`,
        { transaction },
      );

      const tablas = await queryInterface.showAllTables({ transaction });
      if (!tablas.includes('acciones_mejora_recepcion')) {
        await queryInterface.createTable(
          'acciones_mejora_recepcion',
          {
            id: {
              type: DataTypes.UUID,
              defaultValue: DataTypes.UUIDV4,
              primaryKey: true,
            },
            recepcion_id: {
              type: DataTypes.UUID,
              allowNull: false,
              references: { model: 'recepciones', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            origen: {
              type: DataTypes.STRING(30),
              allowNull: false,
              defaultValue: 'VERIFICACION',
            },
            control: {
              type: DataTypes.STRING(50),
              allowNull: false,
            },
            afectacion: {
              type: DataTypes.STRING(30),
              allowNull: false,
              defaultValue: 'RECEPCION_COMPLETA',
            },
            observacion: {
              type: DataTypes.TEXT,
              allowNull: false,
            },
            decision: {
              type: DataTypes.STRING(20),
              allowNull: true,
            },
            estado: {
              type: DataTypes.STRING(20),
              allowNull: false,
              defaultValue: 'PENDIENTE',
            },
            created_at: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: DataTypes.NOW,
            },
            updated_at: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: DataTypes.NOW,
            },
          },
          { transaction },
        );

        await queryInterface.addConstraint('acciones_mejora_recepcion', {
          fields: ['recepcion_id', 'control'],
          type: 'unique',
          name: 'acciones_mejora_recepcion_control_unique',
          transaction,
        });
        await queryInterface.addConstraint('acciones_mejora_recepcion', {
          fields: ['origen'],
          type: 'check',
          where: { origen: ['VERIFICACION'] },
          name: 'acciones_mejora_recepcion_origen_check',
          transaction,
        });
        await queryInterface.addConstraint('acciones_mejora_recepcion', {
          fields: ['afectacion'],
          type: 'check',
          where: { afectacion: ['RECEPCION_COMPLETA'] },
          name: 'acciones_mejora_recepcion_afectacion_check',
          transaction,
        });
        await queryInterface.addConstraint('acciones_mejora_recepcion', {
          fields: ['decision'],
          type: 'check',
          where: { decision: ['RECIBIR', 'NO_RECIBIR'] },
          name: 'acciones_mejora_recepcion_decision_check',
          transaction,
        });
        await queryInterface.addConstraint('acciones_mejora_recepcion', {
          fields: ['estado'],
          type: 'check',
          where: { estado: ['PENDIENTE', 'GESTIONADA'] },
          name: 'acciones_mejora_recepcion_estado_check',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('acciones_mejora_recepcion', { transaction });
      await queryInterface.sequelize.query(
        'ALTER TABLE recepciones DROP CONSTRAINT IF EXISTS recepciones_estado_check',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE recepciones
         ADD CONSTRAINT recepciones_estado_check
         CHECK (estado IN ('EN_PROCESO', 'TERMINADA'))`,
        { transaction },
      );
      const recepciones = await queryInterface.describeTable('recepciones', { transaction });
      if (recepciones.tiene_novedades) {
        await queryInterface.removeColumn('recepciones', 'tiene_novedades', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
