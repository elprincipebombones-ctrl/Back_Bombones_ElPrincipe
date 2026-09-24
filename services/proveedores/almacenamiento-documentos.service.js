const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ApiError } = require('../../utils/ApiError');
const directorio = path.resolve(process.env.PROVEEDORES_DOCUMENTOS_DIR || path.join(process.cwd(), 'storage', 'proveedores'));
const firmas = [
  { mime: 'application/pdf', ext: '.pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
  { mime: 'image/png', ext: '.png', test: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  { mime: 'image/jpeg', ext: '.jpg', test: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 2 } }).fields([{ name: 'camaraComercio', maxCount: 1 }, { name: 'rut', maxCount: 1 }]);
function validar(file) {
  const tipo = firmas.find((f) => f.test(file.buffer));
  if (!tipo || tipo.mime !== file.mimetype) throw new ApiError('Archivo inválido: sólo PDF, JPEG o PNG y el contenido debe coincidir con el MIME', 422);
  return tipo;
}
function guardar(file) {
  const tipo = validar(file); fs.mkdirSync(directorio, { recursive: true });
  const clave = `${crypto.randomUUID()}${tipo.ext}`; fs.writeFileSync(path.join(directorio, clave), file.buffer, { flag: 'wx' }); return clave;
}
function ruta(clave) { const segura = path.basename(clave); if (segura !== clave) throw new ApiError('Documento inválido', 400); return path.join(directorio, segura); }
function eliminar(clave) { if (!clave) return; try { fs.unlinkSync(ruta(clave)); } catch (e) { if (e.code !== 'ENOENT') console.error('[storage] No se pudo eliminar', e.message); } }
module.exports = { upload, guardar, ruta, eliminar };
