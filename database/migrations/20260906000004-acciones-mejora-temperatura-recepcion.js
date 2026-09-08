const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tabla = await queryInterface.describeTable('acciones_mejora_recepcion', {
        transaction,
      });

      if (!tabla.detalle_recepcion_id) {
        await queryInterface.addColumn(
          'acciones_mejora_recepcion',
          'detalle_recepcion_id',
          {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'detalles_recepcion', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction },
        );
      }

      await queryInterface.removeConstraint(
        'acciones_mejora_recepcion',
        'acciones_mejora_recepcion_origen_check',
        { transaction },
      );
      await queryInterface.addConstraint('acciones_mejora_recepcion', {
        fields: ['origen'],
        type: 'check',
        where: { origen: ['VERIFICACION', 'TEMPERATURA'] },
        name: 'acciones_mejora_recepcion_origen_check',
        transaction,
      });

      await queryInterface.removeConstraint(
        'acciones_mejora_recepcion',
        'acciones_mejora_recepcion_afectacion_check',
        { transaction },
      );
      await queryInterface.addConstraint('acciones_mejora_recepcion', {
        fields: ['afectacion'],
        type: 'check',
        where: { afectacion: ['RECEPCION_COMPLETA', 'PRODUCTO'] },
        name: 'acciones_mejora_recepcion_afectacion_check',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete(
        'acciones_mejora_recepcion',
        { origen: 'TEMPERATURA' },
        { transaction },
      );
      await queryInterface.removeConstraint(
        'acciones_mejora_recepcion',
        'acciones_mejora_recepcion_origen_check',
        { transaction },
      );
      await queryInterface.addConstraint('acciones_mejora_recepcion', {
        fields: ['origen'],
        type: 'check',
        where: { origen: ['VERIFICACION'] },
        name: 'acciones_mejora_recepcion_origen_check',
        transaction,
      });
      await queryInterface.removeConstraint(
        'acciones_mejora_recepcion',
        'acciones_mejora_recepcion_afectacion_check',
        { transaction },
      );
      await queryInterface.addConstraint('acciones_mejora_recepcion', {
        fields: ['afectacion'],
        type: 'check',
        where: { afectacion: ['RECEPCION_COMPLETA'] },
        name: 'acciones_mejora_recepcion_afectacion_check',
        transaction,
      });
      await queryInterface.removeColumn('acciones_mejora_recepcion', 'detalle_recepcion_id', {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
