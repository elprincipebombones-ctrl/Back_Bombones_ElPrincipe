const sequelize = require('../../database/database');
const { siguienteCodigoCalidad } = require('../../utils/codigo-calidad');

module.exports = (nombre, atributos, tableName, opciones = {}) => {
  const modelo = sequelize.define(nombre, atributos, {
    tableName,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    ...opciones,
  });
  if (atributos.codigo) {
    const asignarCodigo = async (registro, options) => {
      if (registro.isNewRecord && !registro.codigo) {
        registro.codigo = await siguienteCodigoCalidad(sequelize, options.transaction);
      }
    };
    modelo.addHook('beforeValidate', asignarCodigo);
    modelo.addHook('beforeBulkCreate', async (registros, options) => {
      for (const registro of registros) await asignarCodigo(registro, options);
    });
  }
  return modelo;
};
