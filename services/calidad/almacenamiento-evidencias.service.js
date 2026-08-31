const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ApiError } = require('../../utils/ApiError');

const TIPOS_PERMITIDOS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['application/pdf', '.pdf'],
]);
const directorio = path.resolve(
  process.env.CALIDAD_EVIDENCIAS_DIR || path.join(process.cwd(), 'storage', 'calidad', 'evidencias'),
);
const maximoMb = Number(process.env.CALIDAD_EVIDENCIAS_MAX_MB || 10);
const directorioProgramas = path.resolve(
  process.env.CALIDAD_PROGRAMAS_DIR || path.join(process.cwd(), 'storage', 'calidad', 'programas'),
);

const asegurarDirectorio = () => fs.mkdirSync(directorio, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    try {
      asegurarDirectorio();
      callback(null, directorio);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const extension = TIPOS_PERMITIDOS.get(file.mimetype);
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: maximoMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      return callback(new ApiError('Solo se permiten archivos JPG, JPEG, PNG o PDF', 422));
    }
    return callback(null, true);
  },
});

const urlPara = (nombreInterno) => `/api/calidad/archivos-evidencia/${nombreInterno}`;

const rutaDesdeUrl = (url) => {
  const nombre = path.basename(String(url || ''));
  const ruta = path.resolve(directorio, nombre);
  if (path.dirname(ruta) !== directorio) throw new ApiError('Ruta de evidencia inválida', 400);
  return ruta;
};

const eliminarSilencioso = (ruta) => {
  if (ruta && fs.existsSync(ruta)) fs.unlinkSync(ruta);
};

const uploadProgramaPdf = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      try {
        fs.mkdirSync(directorioProgramas, { recursive: true });
        callback(null, directorioProgramas);
      } catch (error) {
        callback(error);
      }
    },
    filename: (_req, _file, callback) => callback(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: maximoMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extensionPdf = path.extname(file.originalname || '').toLowerCase() === '.pdf';
    if (file.mimetype !== 'application/pdf' && !extensionPdf) {
      return callback(new ApiError('El archivo del programa debe ser PDF', 422));
    }
    return callback(null, true);
  },
});

const urlProgramaPara = (nombreInterno) => `/api/calidad/archivos-programas/${nombreInterno}`;

const rutaProgramaDesdeUrl = (url) => {
  const nombre = path.basename(String(url || ''));
  const ruta = path.resolve(directorioProgramas, nombre);
  if (path.dirname(ruta) !== directorioProgramas) {
    throw new ApiError('Ruta de documento de programa inválida', 400);
  }
  return ruta;
};

module.exports = {
  upload,
  urlPara,
  rutaDesdeUrl,
  eliminarSilencioso,
  maximoMb,
  uploadProgramaPdf,
  urlProgramaPara,
  rutaProgramaDesdeUrl,
};
