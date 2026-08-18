const {
  AccionCorrectiva,
  SeguimientoAccionCorrectiva,
  UnidadMedida,
} = require('../../models');
const { created, fail } = require('../../utils/response');

exports.crearSeguimiento = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id);
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') return fail(res, 'No se puede agregar seguimiento a una acción cerrada', 409);
    const unidadMedidaId = req.body.unidadMedidaId ?? req.body.unidad_medida_id ?? null;
    if (unidadMedidaId && !(await UnidadMedida.findByPk(unidadMedidaId))) {
      return fail(res, 'Unidad de medida no encontrada', 422);
    }
    const seguimiento = await SeguimientoAccionCorrectiva.create({
      accionCorrectivaId: accion.id,
      tipoRegistro: req.body.tipoRegistro ?? req.body.tipo_registro,
      descripcion: req.body.descripcion ?? null,
      valorNumero: req.body.valorNumero ?? req.body.valor_numero ?? null,
      valorTexto: req.body.valorTexto ?? req.body.valor_texto ?? null,
      valorBooleano: req.body.valorBooleano ?? req.body.valor_booleano ?? null,
      unidadMedidaId,
      resultadoCumple: req.body.resultadoCumple ?? req.body.resultado_cumple ?? null,
      registradoPor: req.usuario.id,
      fechaRegistro: new Date(),
    });
    return created(res, seguimiento, 'Seguimiento registrado');
  } catch (error) {
    return next(error);
  }
};
