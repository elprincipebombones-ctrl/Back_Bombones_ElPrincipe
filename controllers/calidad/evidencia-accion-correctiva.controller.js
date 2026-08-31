const {
  AccionCorrectiva,
  SeguimientoAccionCorrectiva,
  EvidenciaAccionCorrectiva,
} = require('../../models');
const { created, fail } = require('../../utils/response');
const fs = require('fs');
const {
  upload,
  urlPara,
  rutaDesdeUrl,
  eliminarSilencioso,
} = require('../../services/calidad/almacenamiento-evidencias.service');

exports.upload = upload;

exports.crearEvidencia = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'Debes adjuntar un archivo JPG, JPEG, PNG o PDF', 422);
    const accion = await AccionCorrectiva.findByPk(req.params.id);
    if (!accion) {
      eliminarSilencioso(req.file.path);
      return fail(res, 'Acción correctiva no encontrada', 404);
    }
    if (accion.estado === 'CERRADA') {
      eliminarSilencioso(req.file.path);
      return fail(res, 'No se puede agregar evidencia a una acción cerrada', 409);
    }
    const seguimientoId =
      req.body.seguimientoAccionCorrectivaId ?? req.body.seguimiento_accion_correctiva_id ?? null;
    if (seguimientoId) {
      const seguimiento = await SeguimientoAccionCorrectiva.findOne({
        where: { id: seguimientoId, accionCorrectivaId: accion.id },
      });
      if (!seguimiento) {
        eliminarSilencioso(req.file.path);
        return fail(res, 'El seguimiento no pertenece a la acción correctiva', 422);
      }
    }
    const evidencia = await EvidenciaAccionCorrectiva.create({
      accionCorrectivaId: accion.id,
      seguimientoAccionCorrectivaId: seguimientoId,
      nombreArchivo: req.file.originalname,
      tipoArchivo: req.file.mimetype,
      urlArchivo: urlPara(req.file.filename),
      descripcion: req.body.descripcion ?? null,
      subidoPor: req.usuario.id,
      fechaCarga: new Date(),
    });
    return created(res, evidencia, 'Evidencia registrada');
  } catch (error) {
    eliminarSilencioso(req.file?.path);
    return next(error);
  }
};

exports.descargar = async (req, res, next) => {
  try {
    const url = urlPara(req.params.nombre);
    const evidencia = await EvidenciaAccionCorrectiva.findOne({ where: { urlArchivo: url } });
    if (!evidencia) return fail(res, 'Evidencia no encontrada', 404);
    const ruta = rutaDesdeUrl(evidencia.urlArchivo);
    if (!fs.existsSync(ruta)) return fail(res, 'El archivo de evidencia no está disponible', 404);
    res.type(evidencia.tipoArchivo || 'application/octet-stream');
    return res.download(ruta, evidencia.nombreArchivo);
  } catch (error) {
    return next(error);
  }
};
