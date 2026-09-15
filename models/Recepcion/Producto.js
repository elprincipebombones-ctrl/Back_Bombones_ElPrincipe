const { DataTypes } = require('sequelize');

const sequelize = require('../../database/database');

const Producto = sequelize.define(
  'Producto',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    tipoProducto: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'tipo_producto',
      validate: {
        isIn: [['MP', 'INSUMO', 'EMPAQUE', 'PT']],
      },
    },

    categoriaProductoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categorias_productos',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    unidadMedidaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'unidades_medida',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    condicionTermicaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'condicion_termica_id',
      references: {
        model: 'condiciones_termicas',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'productos',
    timestamps: true,
    underscored: true,
  },
);

module.exports = Producto;
