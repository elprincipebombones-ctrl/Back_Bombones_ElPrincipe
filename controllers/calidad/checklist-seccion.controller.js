const {
  sequelize, ChecklistSeccion, SeccionFormato, CriterioInspeccion, ElementoChecklist,
  ElementoInspeccion, CategoriaElemento, TipoCampo, NivelSeveridad, AccionCriterio, TipoAccion,
} = require('../../models');
const { validarSeccion, validarChecklist } = require('../../services/calidad/inmutabilidad-version.service');
const { ok, created, fail } = require('../../utils/response');

const include = [
  {
    model: CriterioInspeccion,
    as: 'criterio',
    include: [
      { model: TipoCampo, as: 'tipoCampo' },
      { model: NivelSeveridad, as: 'nivelSeveridad' },
      { model: AccionCriterio, as: 'acciones', include: [{ model: TipoAccion, as: 'tipoAccion' }] },
    ],
  },
  {
    model: ElementoChecklist,
    as: 'elementos',
    include: [{
      model: ElementoInspeccion,
      as: 'elemento',
      include: [{ model: CategoriaElemento, as: 'categoria' }],
    }],
  },
];
const obtenerCompleto = (id, transaction) => ChecklistSeccion.findByPk(id, {
  include,
  order: [[{ model: ElementoChecklist, as: 'elementos' }, 'orden', 'ASC']],
  transaction,
});
const cargarElementosActivos = async (ids, transaction) => {
  const elementos = await ElementoInspeccion.findAll({ where: { id: ids, estado: true }, transaction });
  return elementos.length === ids.length ? elementos : null;
};
const sincronizarElementos = async (checklistId, ids, transaction) => {
  const elementos = await cargarElementosActivos(ids, transaction);
  if (!elementos) return 'Uno o más elementos no existen o están inactivos';
  const porId = new Map(elementos.map((elemento) => [elemento.id, elemento]));
  await ElementoChecklist.destroy({ where: { checklistSeccionId: checklistId }, transaction });
  await ElementoChecklist.bulkCreate(ids.map((elementoId, indice) => ({
    checklistSeccionId: checklistId,
    elementoInspeccionId: elementoId,
    codigoSnapshot: porId.get(elementoId).codigo,
    nombreSnapshot: porId.get(elementoId).nombre,
    orden: indice + 1,
    estado: true,
  })), { transaction });
  return null;
};
const validarReferencias = async (body, transaction) => {
  const errorVersion = await validarSeccion(body.seccionFormatoId, transaction);
  if (errorVersion) return errorVersion;
  if (body.seccionFormatoId && !(await SeccionFormato.findByPk(body.seccionFormatoId, { transaction }))) {
    return 'Sección no encontrada';
  }
  if (body.criterioInspeccionId) {
    const criterio = await CriterioInspeccion.findOne({
      where: { id: body.criterioInspeccionId, estado: true }, transaction,
    });
    if (!criterio) return 'El criterio no existe o está inactivo';
  }
  return null;
};

exports.listar = async (_req, res, next) => {
  try { return ok(res, await ChecklistSeccion.findAll({ include, order: [['orden', 'ASC']] })); }
  catch (error) { return next(error); }
};
exports.obtener = async (req, res, next) => {
  try {
    const checklist = await obtenerCompleto(req.params.id);
    return checklist ? ok(res, checklist) : fail(res, 'Checklist no encontrado', 404);
  } catch (error) { return next(error); }
};
exports.crear = async (req, res, next) => {
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const error = await validarReferencias(req.body, transaction);
      if (error) return { error };
      const { elementoIds, ...datos } = req.body;
      const checklist = await ChecklistSeccion.create(datos, { transaction });
      const errorElementos = await sincronizarElementos(checklist.id, elementoIds, transaction);
      if (errorElementos) throw new Error(errorElementos);
      return { checklist: await obtenerCompleto(checklist.id, transaction) };
    });
    return resultado.error ? fail(res, resultado.error, 409) : created(res, resultado.checklist);
  } catch (error) {
    if (error.message.includes('elementos')) return fail(res, error.message, 422);
    return next(error);
  }
};
exports.actualizar = async (req, res, next) => {
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const checklist = await ChecklistSeccion.findByPk(req.params.id, { transaction });
      if (!checklist) return { status: 404, error: 'Checklist no encontrado' };
      const errorActual = await validarChecklist(checklist.id, transaction);
      if (errorActual) return { status: 409, error: errorActual };
      const errorDestino = await validarReferencias({
        seccionFormatoId: req.body.seccionFormatoId || checklist.seccionFormatoId,
        criterioInspeccionId: req.body.criterioInspeccionId,
      }, transaction);
      if (errorDestino) return { status: 409, error: errorDestino };
      const { elementoIds, ...datos } = req.body;
      await checklist.update(datos, { transaction });
      if (elementoIds) {
        const errorElementos = await sincronizarElementos(checklist.id, elementoIds, transaction);
        if (errorElementos) return { status: 422, error: errorElementos };
      }
      return { checklist: await obtenerCompleto(checklist.id, transaction) };
    });
    return resultado.error
      ? fail(res, resultado.error, resultado.status || 409)
      : ok(res, resultado.checklist, 'Checklist actualizado');
  } catch (error) { return next(error); }
};
exports.eliminar = async (req, res, next) => {
  try {
    const checklist = await ChecklistSeccion.findByPk(req.params.id);
    if (!checklist) return fail(res, 'Checklist no encontrado', 404);
    const error = await validarChecklist(checklist.id);
    if (error) return fail(res, error, 409);
    await checklist.update({ estado: false });
    return ok(res, checklist, 'Checklist desactivado');
  } catch (error) { return next(error); }
};
exports.listarElementos = async (req, res, next) => {
  try {
    const checklist = await obtenerCompleto(req.params.id);
    if (!checklist) return fail(res, 'Checklist no encontrado', 404);
    return ok(res, checklist.elementos);
  } catch (error) { return next(error); }
};
