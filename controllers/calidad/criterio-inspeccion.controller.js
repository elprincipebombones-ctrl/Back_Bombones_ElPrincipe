const { Op } = require('sequelize');
const {
  sequelize, CriterioInspeccion, TipoCampo, NivelSeveridad, AccionCriterio, TipoAccion,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const include = [
  { model: TipoCampo, as: 'tipoCampo' },
  { model: NivelSeveridad, as: 'nivelSeveridad' },
  { model: AccionCriterio, as: 'acciones', include: [{ model: TipoAccion, as: 'tipoAccion' }] },
];
const obtenerCompleto = (id, transaction) => CriterioInspeccion.findByPk(id, { include, transaction });
const validarReferencias = async (body, transaction) => {
  if (body.tipoCampoId && !(await TipoCampo.findByPk(body.tipoCampoId, { transaction }))) {
    return 'Tipo de respuesta no encontrado';
  }
  if (body.nivelSeveridadId && !(await NivelSeveridad.findByPk(body.nivelSeveridadId, { transaction }))) {
    return 'Nivel de severidad no encontrado';
  }
  if (body.tipoAccionIds) {
    const cantidad = await TipoAccion.count({ where: { id: body.tipoAccionIds }, transaction });
    if (cantidad !== body.tipoAccionIds.length) return 'Una o más acciones no existen';
  }
  return null;
};
const sincronizarAcciones = async (criterioId, ids, transaction) => {
  if (!ids) return;
  await AccionCriterio.destroy({ where: { criterioInspeccionId: criterioId }, transaction });
  if (ids.length) {
    await AccionCriterio.bulkCreate(ids.map((tipoAccionId, indice) => ({
      criterioInspeccionId: criterioId, tipoAccionId, orden: indice + 1, estado: true,
    })), { transaction });
  }
};

exports.listar = async (_req, res, next) => {
  try {
    return ok(res, await CriterioInspeccion.findAll({ include, order: [['nombre', 'ASC']] }));
  } catch (error) { return next(error); }
};
exports.obtener = async (req, res, next) => {
  try {
    const criterio = await obtenerCompleto(req.params.id);
    return criterio ? ok(res, criterio) : fail(res, 'Criterio no encontrado', 404);
  } catch (error) { return next(error); }
};
exports.crear = async (req, res, next) => {
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      if (await CriterioInspeccion.findOne({ where: { codigo: req.body.codigo }, transaction })) {
        return { error: 'Ya existe un criterio con ese código' };
      }
      const error = await validarReferencias(req.body, transaction);
      if (error) return { error };
      const { tipoAccionIds, ...datos } = req.body;
      const criterio = await CriterioInspeccion.create(datos, { transaction });
      await sincronizarAcciones(criterio.id, tipoAccionIds || [], transaction);
      return { criterio: await obtenerCompleto(criterio.id, transaction) };
    });
    return resultado.error ? fail(res, resultado.error, 409) : created(res, resultado.criterio);
  } catch (error) { return next(error); }
};
exports.actualizar = async (req, res, next) => {
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const criterio = await CriterioInspeccion.findByPk(req.params.id, { transaction });
      if (!criterio) return { status: 404, error: 'Criterio no encontrado' };
      if (req.body.codigo && await CriterioInspeccion.findOne({
        where: { codigo: req.body.codigo, id: { [Op.ne]: criterio.id } }, transaction,
      })) return { status: 409, error: 'Ya existe un criterio con ese código' };
      const error = await validarReferencias(req.body, transaction);
      if (error) return { status: 422, error };
      const { tipoAccionIds, ...datos } = req.body;
      await criterio.update(datos, { transaction });
      await sincronizarAcciones(criterio.id, tipoAccionIds, transaction);
      return { criterio: await obtenerCompleto(criterio.id, transaction) };
    });
    return resultado.error
      ? fail(res, resultado.error, resultado.status || 409)
      : ok(res, resultado.criterio, 'Criterio actualizado');
  } catch (error) { return next(error); }
};
exports.eliminar = async (req, res, next) => {
  try {
    const criterio = await CriterioInspeccion.findByPk(req.params.id);
    if (!criterio) return fail(res, 'Criterio no encontrado', 404);
    await criterio.update({ estado: false });
    return ok(res, criterio, 'Criterio desactivado');
  } catch (error) { return next(error); }
};
