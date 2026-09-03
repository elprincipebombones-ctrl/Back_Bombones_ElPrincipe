const {
  AccionCorrectiva,
  Desviacion,
  ReglaCalidad,
  CondicionRegla,
  SeguimientoAccionCorrectiva,
  UnidadMedida,
} = require('../../models');
const { created, fail } = require('../../utils/response');
const { reglaSeActiva } = require('../../services/calidad/evaluador-reglas.service');

exports.crearSeguimiento = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id, {
      include: [
        {
          model: Desviacion,
          as: 'desviacion',
          include: [
            {
              model: ReglaCalidad,
              as: 'regla',
              include: [
                {
                  model: CondicionRegla,
                  as: 'condiciones',
                  where: { estado: true },
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    });
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA')
      return fail(res, 'No se puede agregar seguimiento a una acción cerrada', 409);
    const unidadMedidaId = req.body.unidadMedidaId ?? req.body.unidad_medida_id ?? null;
    if (unidadMedidaId && !(await UnidadMedida.findByPk(unidadMedidaId))) {
      return fail(res, 'Unidad de medida no encontrada', 422);
    }
    const tipoRegistro = req.body.tipoRegistro ?? req.body.tipo_registro;
    const valorNumero = req.body.valorNumero ?? req.body.valor_numero ?? null;
    let resultadoCumple = req.body.resultadoCumple ?? req.body.resultado_cumple ?? null;
    if (tipoRegistro === 'NUEVA_MEDICION') {
      if (valorNumero === null)
        return fail(res, 'Debes ingresar el valor de la nueva medición', 422);
      const regla = accion.desviacion?.regla;
      if (regla) {
        const activa = reglaSeActiva(regla, valorNumero);
        resultadoCumple = regla.resultado === 'NO_CUMPLE' ? !activa : activa;
      }
    }
    const seguimiento = await SeguimientoAccionCorrectiva.create({
      accionCorrectivaId: accion.id,
      tipoRegistro,
      descripcion: req.body.descripcion ?? null,
      valorNumero,
      valorTexto: req.body.valorTexto ?? req.body.valor_texto ?? null,
      valorBooleano: req.body.valorBooleano ?? req.body.valor_booleano ?? null,
      unidadMedidaId,
      resultadoCumple,
      registradoPor: req.usuario.id,
      fechaRegistro: new Date(),
    });
    return created(res, seguimiento, 'Seguimiento registrado');
  } catch (error) {
    return next(error);
  }
};
