const { Op } = require('sequelize');
const { sequelize, Proveedor, DocumentoProveedor } = require('../../models');
const storage = require('../../services/proveedores/almacenamiento-documentos.service');
const { ok, created, fail } = require('../../utils/response');
const include = [{ model: DocumentoProveedor, as: 'documentos' }];
const texto = (v) => typeof v === 'string' ? (v.trim() || null) : v;
const booleano = (v) => v === undefined ? undefined : (v === true || v === 'true' ? true : v === false || v === 'false' ? false : v);
const presentar = (registro) => {
  const p = registro.toJSON(); const docs = p.documentos || [];
  const documento = (tipo) => { const d = docs.find((x) => x.tipo === tipo); return d ? { id: d.id, nombreOriginal: d.nombreOriginal, url: `/api/proveedores/${p.id}/documentos/${d.id}/descarga`, mimeType: d.mimeType, tamano: d.tamano } : null; };
  delete p.documentos;
  return { ...p, camaraComercio: documento('CAMARA_COMERCIO'), rut: documento('RUT') };
};
const datos = (body) => {
  const permitidos = ['tipoDocumento','numeroDocumento','razonSocial','nombreComercial','telefono','nombreContactoTelefono','email','direccion','ciudad'];
  const out = {}; for (const k of permitidos) if (body[k] !== undefined) out[k] = texto(body[k]);
  if (body.estado !== undefined) out.estado = booleano(body.estado); return out;
};
async function buscar(id, transaction) { return Proveedor.findByPk(id, { include, transaction }); }
async function guardarDocumentos(proveedor, files, transaction, nuevas, anteriores) {
  for (const [campo, tipo] of [['camaraComercio','CAMARA_COMERCIO'],['rut','RUT']]) {
    const file = files?.[campo]?.[0]; if (!file) continue;
    const clave = storage.guardar(file); nuevas.push(clave);
    const previo = await DocumentoProveedor.findOne({ where: { proveedorId: proveedor.id, tipo }, transaction, lock: transaction.LOCK.UPDATE });
    if (previo) { anteriores.push(previo.clave); await previo.update({ nombreOriginal: file.originalname, clave, mimeType: file.mimetype, tamano: file.size, fechaCarga: new Date() }, { transaction }); }
    else await DocumentoProveedor.create({ proveedorId: proveedor.id, tipo, nombreOriginal: file.originalname, clave, mimeType: file.mimetype, tamano: file.size }, { transaction });
  }
}
exports.listar = async (_req, res, next) => { try { const rows = await Proveedor.findAll({ include, order: [[sequelize.literal('COALESCE("Proveedor"."razon_social","Proveedor"."nombre_comercial","Proveedor"."numero_documento")'), 'ASC']] }); return ok(res, rows.map(presentar)); } catch (e) { next(e); } };
exports.obtener = async (req, res, next) => { try { const p = await buscar(req.params.id); return p ? ok(res, presentar(p)) : fail(res, 'Proveedor no encontrado', 404); } catch (e) { next(e); } };
exports.crear = async (req, res, next) => { const nuevas = []; try { const result = await sequelize.transaction(async (transaction) => { const d = datos(req.body); if (!d.tipoDocumento) throw Object.assign(new Error('Falta el tipo de documento'), { status: 422 }); if (!d.numeroDocumento) throw Object.assign(new Error('Falta el número de documento'), { status: 422 }); if (await Proveedor.findOne({ where: { numeroDocumento: d.numeroDocumento }, transaction })) throw Object.assign(new Error('Ya existe un proveedor con ese número de documento'), { status: 409 }); const p = await Proveedor.create({ ...d, razonSocial: d.razonSocial || null, estado: d.estado === undefined ? true : d.estado }, { transaction }); await guardarDocumentos(p, req.files, transaction, nuevas, []); return buscar(p.id, transaction); }); return created(res, presentar(result)); } catch (e) { nuevas.forEach(storage.eliminar); next(e); } };
exports.actualizar = async (req, res, next) => { const nuevas = [], anteriores = []; try { const result = await sequelize.transaction(async (transaction) => { const p = await Proveedor.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE }); if (!p) throw Object.assign(new Error('Proveedor no encontrado'), { status: 404 }); const d = datos(req.body); if (d.numeroDocumento && await Proveedor.findOne({ where: { numeroDocumento: d.numeroDocumento, id: { [Op.ne]: p.id } }, transaction })) throw Object.assign(new Error('Ya existe un proveedor con ese número de documento'), { status: 409 }); await p.update(d, { transaction }); await guardarDocumentos(p, req.files, transaction, nuevas, anteriores); return buscar(p.id, transaction); }); anteriores.forEach(storage.eliminar); return ok(res, presentar(result), 'Proveedor actualizado'); } catch (e) { nuevas.forEach(storage.eliminar); next(e); } };
exports.descargar = async (req, res, next) => { try { const doc = await DocumentoProveedor.findOne({ where: { id: req.params.documentoId, proveedorId: req.params.id } }); if (!doc) return fail(res, 'Documento no encontrado', 404); res.type(doc.mimeType); res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.nombreOriginal)}`); return res.sendFile(storage.ruta(doc.clave)); } catch (e) { next(e); } };
exports.eliminar = async (req, res, next) => { try { const p = await buscar(req.params.id); if (!p) return fail(res, 'Proveedor no encontrado', 404); const claves = p.documentos.map((d) => d.clave); await p.destroy(); claves.forEach(storage.eliminar); return ok(res, null, 'Proveedor eliminado'); } catch (e) { next(e); } };
