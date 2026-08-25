'use strict';

module.exports = {

  async up(queryInterface, Sequelize) {

    // =====================================================
    // 1. ELIMINAR TABLAS DEL MÓDULO DE RECEPCIÓN
    // =====================================================
    // Primero eliminamos las tablas hijas para evitar
    // conflictos con las llaves foráneas.
    
    await queryInterface.dropTable('resultados_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('condiciones_ambientales_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('verificaciones_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('temperaturas_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('recepciones_vehiculos', {
      cascade: true
    });

    await queryInterface.dropTable('detalles_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('recepciones', {
      cascade: true
    });


    // =====================================================
    // 2. RECEPCIONES
    // =====================================================

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


    // =====================================================
    // 3. DETALLES DE RECEPCIÓN
    // =====================================================

    await queryInterface.createTable('detalles_recepcion', {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      recepcion_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'recepciones',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      producto_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'productos',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      unidad_medida_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'unidades_medida',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      cantidad: {
        type: Sequelize.DECIMAL(15, 3),
        allowNull: false
      },

      lote: {
        type: Sequelize.STRING(100),
        allowNull: true
      },

      // NUEVO CAMPO
      lote_proveedor: {
        type: Sequelize.STRING(100),
        allowNull: true
      },

      fecha_vencimiento: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },

      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
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


    // =====================================================
    // 4. RECEPCIONES VEHÍCULOS
    // =====================================================

    await queryInterface.createTable('recepciones_vehiculos', {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      recepcion_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'recepciones',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      vehiculo_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'vehiculos',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      temperatura: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: true
      },

      precinto: {
        type: Sequelize.STRING(100),
        allowNull: true
      },

      guia_transporte: {
        type: Sequelize.STRING(100),
        allowNull: true
      },

      hora: {
        type: Sequelize.TIME,
        allowNull: true
      },

      vehiculo_conductor_ok: {
        type: Sequelize.BOOLEAN,
        allowNull: true
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


    // =====================================================
    // 5. TEMPERATURAS DE RECEPCIÓN
    // =====================================================

    await queryInterface.createTable('temperaturas_recepcion', {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      recepcion_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'recepciones',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      producto_id: {
        type: Sequelize.UUID,
        allowNull: false,

        references: {
          model: 'productos',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      temperatura: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false
      },

      hora: {
        type: Sequelize.TIME,
        allowNull: true
      },

      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
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


    // =====================================================
    // 6. VERIFICACIÓN DE RECEPCIÓN
    // =====================================================

    await queryInterface.createTable('verificaciones_recepcion', {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      recepcion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,

        references: {
          model: 'recepciones',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      certificado_calidad: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },

      plagas: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },

      rotulado_correcto: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },

      condiciones_embalaje: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },

      apariencia_color_textura: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },

      empaque_embalaje: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },

      olor: {
        type: Sequelize.BOOLEAN,
        allowNull: true
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


    // =====================================================
    // 7. CONDICIONES AMBIENTALES
    // =====================================================

    await queryInterface.createTable(
      'condiciones_ambientales_recepcion',
      {

        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },

        recepcion_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,

          references: {
            model: 'recepciones',
            key: 'id'
          },

          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },

        temperatura: {
          type: Sequelize.DECIMAL(6, 2),
          allowNull: true
        },

        desinfeccion_realizada: {
          type: Sequelize.BOOLEAN,
          allowNull: true
        },

        producto_desinfeccion: {
          type: Sequelize.STRING(150),
          allowNull: true
        },

        concentracion_desinfeccion: {
          type: Sequelize.STRING(50),
          allowNull: true
        },

        observaciones: {
          type: Sequelize.TEXT,
          allowNull: true
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

      }
    );


    // =====================================================
    // 8. RESULTADO DE RECEPCIÓN
    // =====================================================

    await queryInterface.createTable('resultados_recepcion', {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      recepcion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,

        references: {
          model: 'recepciones',
          key: 'id'
        },

        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      resultado: {
        type: Sequelize.STRING(30),
        allowNull: false
      },

      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      fecha_decision: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Eliminamos en orden inverso
    await queryInterface.dropTable('resultados_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable(
      'condiciones_ambientales_recepcion',
      { cascade: true }
    );

    await queryInterface.dropTable('verificaciones_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('temperaturas_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('recepciones_vehiculos', {
      cascade: true
    });

    await queryInterface.dropTable('detalles_recepcion', {
      cascade: true
    });

    await queryInterface.dropTable('recepciones', {
      cascade: true
    });

  }

};