const { Op } = require('sequelize');
const { sequelize, Proveedor, DocumentoProveedor } = require('../models');
const storage = require('../services/proveedores/almacenamiento-documentos.service');
const { ok, created, fail } = require('../utils/response');
const include = [{ model: DocumentoProveedor, as: 'documentos' }],
  err = (m, s) => Object.assign(new Error(m), { status: s }),
  txt = (v) => (typeof v === 'string' ? v.trim() || null : v),
  bool = (v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : v);
const datos = (b) => {
  const o = {};
  for (const k of [
    'tipoDocumento',
    'numeroDocumento',
    'razonSocial',
    'nombreComercial',
    'telefono',
    'nombreContactoTelefono',
    'email',
    'emailFacturacionElectronica',
    'direccion',
    'ciudad',
  ])
    if (b[k] !== undefined) o[k] = txt(b[k]);
  if (o.tipoDocumento) o.tipoDocumento = o.tipoDocumento.toUpperCase();
  if (b.estado !== undefined) o.estado = bool(b.estado);
  return o;
};
const presentar = (r) => {
  const c = r.toJSON(),
    ds = c.documentos || [],
    doc = (t) => {
      const d = ds.find((x) => x.tipo === t);
      return d
        ? {
            id: d.id,
            nombreOriginal: d.nombreOriginal,
            url: `/api/clientes/${c.id}/documentos/${d.id}/descarga`,
            mimeType: d.mimeType,
            tamano: d.tamano,
          }
        : null;
    };
  delete c.documentos;
  delete c.esProveedor;
  delete c.esCliente;
  return { ...c, camaraComercio: doc('CAMARA_COMERCIO'), rut: doc('RUT') };
};
const buscar = (id, t) =>
  Proveedor.findOne({ where: { id, esCliente: true }, include, transaction: t });
async function guardarDocs(x, files, t, nuevos, viejos) {
  for (const [campo, tipo] of [
    ['camaraComercio', 'CAMARA_COMERCIO'],
    ['rut', 'RUT'],
  ]) {
    const f = files?.[campo]?.[0];
    if (!f) continue;
    const clave = storage.guardar(f);
    nuevos.push(clave);
    const d = await DocumentoProveedor.findOne({
      where: { proveedorId: x.id, tipo },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (d) {
      viejos.push(d.clave);
      await d.update(
        {
          nombreOriginal: f.originalname,
          clave,
          mimeType: f.mimetype,
          tamano: f.size,
          fechaCarga: new Date(),
        },
        { transaction: t },
      );
    } else
      await DocumentoProveedor.create(
        {
          proveedorId: x.id,
          tipo,
          nombreOriginal: f.originalname,
          clave,
          mimeType: f.mimetype,
          tamano: f.size,
        },
        { transaction: t },
      );
  }
}
exports.listar = async (_q, res, next) => {
  try {
    return ok(
      res,
      (
        await Proveedor.findAll({
          where: { esCliente: true },
          include,
          order: [
            [
              sequelize.literal(
                'COALESCE("Proveedor"."razon_social","Proveedor"."nombre_comercial","Proveedor"."numero_documento")',
              ),
              'ASC',
            ],
          ],
        })
      ).map(presentar),
    );
  } catch (e) {
    next(e);
  }
};
exports.obtener = async (req, res, next) => {
  try {
    const c = await buscar(req.params.id);
    return c ? ok(res, presentar(c)) : fail(res, 'Cliente no encontrado', 404);
  } catch (e) {
    next(e);
  }
};
exports.crear = async (req, res, next) => {
  const nuevos = [];
  try {
    const c = await sequelize.transaction(async (t) => {
      const d = datos(req.body),
        existente = await Proveedor.findOne({
          where: { tipoDocumento: d.tipoDocumento, numeroDocumento: d.numeroDocumento },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      if (existente?.esCliente)
        throw err('Ya existe un cliente con ese tipo y número de documento', 409);
      const x =
        existente ||
        (await Proveedor.create(
          {
            ...d,
            razonSocial: d.razonSocial || null,
            estado: d.estado === undefined ? true : d.estado,
            esProveedor: false,
            esCliente: true,
          },
          { transaction: t },
        ));
      if (existente) await x.update({ ...d, esCliente: true }, { transaction: t });
      await guardarDocs(x, req.files, t, nuevos, []);
      return buscar(x.id, t);
    });
    return created(res, presentar(c));
  } catch (e) {
    nuevos.forEach(storage.eliminar);
    next(e);
  }
};
exports.actualizar = async (req, res, next) => {
  const nuevos = [],
    viejos = [];
  try {
    const c = await sequelize.transaction(async (t) => {
      const x = await Proveedor.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!x?.esCliente) throw err('Cliente no encontrado', 404);
      const d = datos(req.body);
      if (d.emailFacturacionElectronica === null)
        throw err('El correo de facturación electrónica es obligatorio', 422);
      const tipo = d.tipoDocumento || x.tipoDocumento,
        numero = d.numeroDocumento || x.numeroDocumento;
      if (
        await Proveedor.findOne({
          where: { tipoDocumento: tipo, numeroDocumento: numero, id: { [Op.ne]: x.id } },
          transaction: t,
        })
      )
        throw err('Ya existe un tercero con ese tipo y número de documento', 409);
      await x.update(d, { transaction: t });
      await guardarDocs(x, req.files, t, nuevos, viejos);
      return buscar(x.id, t);
    });
    viejos.forEach(storage.eliminar);
    return ok(res, presentar(c), 'Cliente actualizado');
  } catch (e) {
    nuevos.forEach(storage.eliminar);
    next(e);
  }
};
exports.descargar = async (req, res, next) => {
  try {
    const cliente = await buscar(req.params.id);
    if (!cliente) return fail(res, 'Cliente no encontrado', 404);
    const d = await DocumentoProveedor.findOne({
      where: { id: req.params.documentoId, proveedorId: req.params.id },
    });
    if (!d) return fail(res, 'Documento no encontrado', 404);
    res.type(d.mimeType);
    res.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(d.nombreOriginal)}`,
    );
    return res.sendFile(storage.ruta(d.clave));
  } catch (e) {
    next(e);
  }
};
exports.eliminar = async (req, res, next) => {
  try {
    const c = await buscar(req.params.id);
    if (!c) return fail(res, 'Cliente no encontrado', 404);
    if (c.esProveedor) await c.update({ esCliente: false, emailFacturacionElectronica: null });
    else {
      const claves = c.documentos.map((d) => d.clave);
      await c.destroy();
      claves.forEach(storage.eliminar);
    }
    return ok(res, null, 'Cliente eliminado');
  } catch (e) {
    if (e.name === 'SequelizeForeignKeyConstraintError')
      return fail(res, 'El cliente tiene relaciones comerciales y no puede eliminarse', 409);
    next(e);
  }
};
