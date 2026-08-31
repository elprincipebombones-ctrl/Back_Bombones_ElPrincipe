const { sequelize, ParametroCalidad, CriterioInspeccion } = require('../../models');
const { ok } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');
const {
  listarConfiguracion,
  sincronizarConfiguracion,
} = require('../../services/calidad/campos-accion-correctiva.service');

const configuraciones = {
  parametro: {
    modelo: ParametroCalidad,
    tipoOrigen: 'PARAMETRO',
    nombre: 'Parámetro',
  },
  criterio: {
    modelo: CriterioInspeccion,
    tipoOrigen: 'CRITERIO',
    nombre: 'Criterio',
  },
};

const obtenerOrigen = async (tipo, id, transaction) => {
  const configuracion = configuraciones[tipo];
  if (!configuracion) throw new ApiError('Origen no soportado', 422);
  const origen = await configuracion.modelo.findByPk(id, { transaction });
  if (!origen) throw new ApiError(`${configuracion.nombre} no encontrado`, 404);
  return configuracion;
};

const listar = (tipo) => async (req, res, next) => {
  try {
    const configuracion = await obtenerOrigen(tipo, req.params.id);
    const campos = await listarConfiguracion({
      tipoOrigen: configuracion.tipoOrigen,
      origenId: req.params.id,
    });
    return ok(res, campos);
  } catch (error) {
    return next(error);
  }
};

const guardar = (tipo) => async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const configuracion = await obtenerOrigen(tipo, req.params.id, transaction);
    const campos = await sincronizarConfiguracion({
      tipoOrigen: configuracion.tipoOrigen,
      origenId: req.params.id,
      campos: req.body.campos,
      transaction,
    });
    await transaction.commit();
    return ok(res, campos, 'Campos de la acción correctiva actualizados');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.listarParametro = listar('parametro');
exports.guardarParametro = guardar('parametro');
exports.listarCriterio = listar('criterio');
exports.guardarCriterio = guardar('criterio');
