const fs = require('fs');
const { validationResult } = require('express-validator');
const { ProgramaCalidad } = require('../../models');
const { ok, created, fail } = require('../../utils/response');
const {
  uploadProgramaPdf,
  urlProgramaPara,
  rutaProgramaDesdeUrl,
  eliminarSilencioso,
} = require('../../services/calidad/almacenamiento-evidencias.service');

exports.upload = uploadProgramaPdf;

exports.validarConArchivo = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    eliminarSilencioso(req.file?.path);
    return fail(res, 'Errores de validación', 422, errores.array());
  }
  if (req.file) {
    const descriptor = fs.openSync(req.file.path, 'r');
    const firma = Buffer.alloc(5);
    fs.readSync(descriptor, firma, 0, 5, 0);
    fs.closeSync(descriptor);
    if (firma.toString() !== '%PDF-') {
      eliminarSilencioso(req.file.path);
      return fail(res, 'El archivo adjunto no contiene un PDF válido', 422);
    }
  }
  return next();
};

const datosDesdeBody = (body) => ({
  ...(body.nombre !== undefined ? { nombre: body.nombre.trim() } : {}),
  ...(body.descripcion !== undefined ? { descripcion: body.descripcion?.trim() || null } : {}),
  ...(body.estado !== undefined ? { estado: body.estado === true || body.estado === 'true' } : {}),
});

exports.listar = async (_req, res, next) => {
  try {
    return ok(res, await ProgramaCalidad.findAll({ order: [['nombre', 'ASC']] }));
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const programa = await ProgramaCalidad.findByPk(req.params.id);
    if (!programa) return fail(res, 'Programa no encontrado', 404);
    return ok(res, programa);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const programa = await ProgramaCalidad.create({
      ...datosDesdeBody(req.body),
      archivoPdf: req.file ? urlProgramaPara(req.file.filename) : null,
    });
    return created(res, programa, 'Programa creado');
  } catch (error) {
    eliminarSilencioso(req.file?.path);
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const programa = await ProgramaCalidad.findByPk(req.params.id);
    if (!programa) {
      eliminarSilencioso(req.file?.path);
      return fail(res, 'Programa no encontrado', 404);
    }
    const archivoAnterior = programa.archivoPdf;
    await programa.update({
      ...datosDesdeBody(req.body),
      ...(req.file ? { archivoPdf: urlProgramaPara(req.file.filename) } : {}),
    });
    if (req.file && archivoAnterior) eliminarSilencioso(rutaProgramaDesdeUrl(archivoAnterior));
    return ok(res, programa, 'Programa actualizado');
  } catch (error) {
    eliminarSilencioso(req.file?.path);
    return next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const programa = await ProgramaCalidad.findByPk(req.params.id);
    if (!programa) return fail(res, 'Programa no encontrado', 404);
    await programa.update({ estado: false });
    return ok(res, programa, 'Programa desactivado');
  } catch (error) {
    return next(error);
  }
};

exports.descargar = async (req, res, next) => {
  try {
    const url = urlProgramaPara(req.params.nombre);
    const programa = await ProgramaCalidad.findOne({ where: { archivoPdf: url } });
    if (!programa) return fail(res, 'Documento de programa no encontrado', 404);
    const ruta = rutaProgramaDesdeUrl(programa.archivoPdf);
    if (!fs.existsSync(ruta)) return fail(res, 'El PDF del programa no está disponible', 404);
    res.type('application/pdf');
    return res.sendFile(ruta);
  } catch (error) {
    return next(error);
  }
};
