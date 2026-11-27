const fs = require('fs');
const { Recepcion, DocumentoRecepcion, sequelize } = require('../../models');
const almacenamiento = require('../../services/calidad/almacenamiento-evidencias.service');
const { ApiError } = require('../../utils/ApiError');
const { created, fail } = require('../../utils/response');

exports.crear = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'Debes adjuntar una foto JPG, PNG o un PDF', 422);
    const documento = await sequelize.transaction(async (transaction) => {
      const recepcion = await Recepcion.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!recepcion) throw new ApiError('Recepción no encontrada', 404);
      if (recepcion.estado !== 'EN_PROCESO') {
        throw new ApiError('La recepción finalizada es de solo lectura', 409);
      }
      return DocumentoRecepcion.create(
        {
          recepcionId: recepcion.id,
          nombreArchivo: req.file.originalname,
          tipoArchivo: req.file.mimetype,
          nombreInterno: req.file.filename,
          subidoPor: req.usuario.id,
        },
        { transaction },
      );
    });
    return created(res, documento, 'Documento adjuntado');
  } catch (error) {
    almacenamiento.eliminarSilencioso(req.file?.path);
    return next(error);
  }
};

exports.descargar = async (req, res, next) => {
  try {
    const documento = await DocumentoRecepcion.findOne({
      where: { id: req.params.documentoId, recepcionId: req.params.id },
    });
    if (!documento) return fail(res, 'Documento no encontrado', 404);
    const ruta = almacenamiento.rutaDesdeUrl(documento.nombreInterno);
    if (!fs.existsSync(ruta)) return fail(res, 'El archivo no está disponible', 404);
    res.type(documento.tipoArchivo);
    return res.download(ruta, documento.nombreArchivo);
  } catch (error) {
    return next(error);
  }
};
