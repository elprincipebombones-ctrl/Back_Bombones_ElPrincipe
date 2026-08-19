const { DataTypes } = require('sequelize');
const sequelize = require('../../database/database');

const Recepcion = sequelize.define(
    'Recepcion',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        numeroRecepcion: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'numero_recepcion'
        },

        tipoRecepcion: {
            type: DataTypes.STRING(50),
            allowNull: false,
            field: 'tipo_recepcion'
        },

        fechaRecepcion: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'fecha_recepcion'
        },

        horaRecepcion: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'hora_recepcion'
        },

        proveedorId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'proveedor_id',
            references: {
                model: 'proveedores',
                key: 'id'
            }
        },

        lugarAreaId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'lugar_area_id',
            references: {
                model: 'lugares_areas',
                key: 'id'
            }
        },

        lote: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        observaciones: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        estado: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        usuarioRecepcionId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'usuario_recepcion_id',
            references: {
                model: 'usuarios',
                key: 'id'
            }
        },

        usuarioVerificacionId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'usuario_verificacion_id',
            references: {
                model: 'usuarios',
                key: 'id'
            }
        },
        usuarioVerificacionId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'usuario_verificacion_id',
            references: {
                model: 'usuarios',
                key: 'id'
            }
        },
    },
    {
        tableName: 'recepciones',
        timestamps: true,
        underscored: true
    }
);

module.exports = Recepcion;