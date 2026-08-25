'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recepciones', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      numero: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },

      fecha_recepcion: {
        type: Sequelize.DATE,
        allowNull: false
      },

      proveedor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'proveedores',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      bodega_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'bodegas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      lugar_area_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'lugares_areas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      estado: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'PENDIENTE'
      },

      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      usuario_recepcion_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recepciones');
  }
};