'use strict';

const uuid = (Sequelize) => ({
  type: Sequelize.UUID,
  defaultValue: Sequelize.literal('gen_random_uuid()'),
  primaryKey: true,
  allowNull: false,
});

const timestamps = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn('NOW'),
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn('NOW'),
  },
});

const existeTabla = async (queryInterface, nombre) => {
  const tablas = await queryInterface.showAllTables();
  return tablas
    .map((tabla) => (typeof tabla === 'string' ? tabla : tabla.tableName))
    .includes(nombre);
};

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await existeTabla(queryInterface, 'proveedores'))) {
      await queryInterface.createTable('proveedores', {
        id: uuid(Sequelize),
        tipo_documento: { type: Sequelize.STRING(20), allowNull: false },
        numero_documento: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        razon_social: { type: Sequelize.STRING(200), allowNull: false },
        nombre_comercial: { type: Sequelize.STRING(200), allowNull: true },
        telefono: { type: Sequelize.STRING(30), allowNull: true },
        email: { type: Sequelize.STRING(150), allowNull: true },
        direccion: { type: Sequelize.STRING(250), allowNull: true },
        ciudad: { type: Sequelize.STRING(100), allowNull: true },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      });
    }

    if (!(await existeTabla(queryInterface, 'categorias_productos'))) {
      await queryInterface.createTable('categorias_productos', {
        id: uuid(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      });
    }

    if (!(await existeTabla(queryInterface, 'lugares_areas'))) {
      await queryInterface.createTable('lugares_areas', {
        id: uuid(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        tipo: { type: Sequelize.STRING(50), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      });
    }

    if (!(await existeTabla(queryInterface, 'materias_primas'))) {
      await queryInterface.createTable('materias_primas', {
        id: uuid(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        unidad_medida: { type: Sequelize.STRING(30), allowNull: true },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      });
    }

    if (!(await existeTabla(queryInterface, 'bodegas'))) {
      await queryInterface.createTable('bodegas', {
        id: uuid(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        tipo: { type: Sequelize.STRING(50), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        direccion: { type: Sequelize.STRING(250), allowNull: true },
        responsable_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'usuarios', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      });
    }

    if (!(await existeTabla(queryInterface, 'vehiculos'))) {
      await queryInterface.createTable('vehiculos', {
        id: uuid(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        placa: { type: Sequelize.STRING(20), allowNull: false, unique: true },
        tipo_vehiculo: { type: Sequelize.STRING(50), allowNull: false },
        marca: { type: Sequelize.STRING(80), allowNull: true },
        modelo: { type: Sequelize.STRING(80), allowNull: true },
        capacidad_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        proveedor_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'proveedores', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        ...timestamps(Sequelize),
      });
    }

    if (!(await existeTabla(queryInterface, 'productos'))) {
      await queryInterface.createTable('productos', {
        id: uuid(Sequelize),
        codigo: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        nombre: { type: Sequelize.STRING(150), allowNull: false },
        descripcion: { type: Sequelize.TEXT, allowNull: true },
        categoria_producto_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'categorias_productos', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        unidad_medida: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'unidades_medida', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        estado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(Sequelize),
      });
    }
  },

  async down() {
    // Migración de compatibilidad para instalaciones históricas. No elimina datos maestros.
  },
};
