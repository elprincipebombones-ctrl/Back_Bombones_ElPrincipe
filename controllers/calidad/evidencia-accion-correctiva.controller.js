const {
  AccionCorrectiva,
  SeguimientoAccionCorrectiva,
  EvidenciaAccionCorrectiva,
} = require('../../models');
const { created, fail } = require('../../utils/response');

exports.crearEvidencia = async (req, res, next) => {
  try {
    const accion = await AccionCorrectiva.findByPk(req.params.id);
    if (!accion) return fail(res, 'Acción correctiva no encontrada', 404);
    if (accion.estado === 'CERRADA') return fail(res, 'No se puede agregar evidencia a una acción cerrada', 409);
    const seguimientoId =
      req.body.seguimientoAccionCorrectivaId ?? req.body.seguimiento_accion_correctiva_id ?? null;
    if (seguimientoId) {
      const seguimiento = await SeguimientoAccionCorrectiva.findOne({
        where: { id: seguimientoId, accionCorrectivaId: accion.id },
      });
      if (!seguimiento) return fail(res, 'El seguimiento no pertenece a la acción correctiva', 422);
    }
    const evidencia = await EvidenciaAccionCorrectiva.create({
      accionCorrectivaId: accion.id,
      seguimientoAccionCorrectivaId: seguimientoId,
      nombreArchivo: req.body.nombreArchivo ?? req.body.nombre_archivo,
      tipoArchivo: req.body.tipoArchivo ?? req.body.tipo_archivo ?? null,
      urlArchivo: req.body.urlArchivo ?? req.body.url_archivo,
      descripcion: req.body.descripcion ?? null,
      subidoPor: req.usuario.id,
      fechaCarga: new Date(),
    });
    return created(res, evidencia, 'Evidencia registrada');
  } catch (error) {
    return next(error);
  }
};
