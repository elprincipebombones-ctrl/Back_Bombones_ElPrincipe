const { Op } = require('sequelize');
const { sequelize, Proveedor, DocumentoProveedor } = require('../../models');
const storage = require('../../services/proveedores/almacenamiento-documentos.service');
const { ok, created, fail } = require('../../utils/response');
const include = [{ model: DocumentoProveedor, as: 'documentos' }];
const texto = (v) => (typeof v === 'string' ? v.trim() || null : v);
const booleano = (v) =>
  v === undefined
    ? undefined
    : v === true || v === 'true'
      ? true
      : v === false || v === 'false'
        ? false
        : v;
const presentar = (registro, ruta = 'proveedores') => {
  const p = registro.toJSON();
  const docs = p.documentos || [];
  const documento = (tipo) => {
    const d = docs.find((x) => x.tipo === tipo);
    return d
      ? {
          id: d.id,
          nombreOriginal: d.nombreOriginal,
          url: `/api/${ruta}/${p.id}/documentos/${d.id}/descarga`,
          mimeType: d.mimeType,
          tamano: d.tamano,
        }
      : null;
  };
  delete p.documentos;
  return { ...p, camaraComercio: documento('CAMARA_COMERCIO'), rut: documento('RUT') };
};
const datos = (body, incluyeCliente = false, permiteRoles = false) => {
  const permitidos = [
    'tipoDocumento',
    'numeroDocumento',
    'razonSocial',
    'nombreComercial',
    'telefono',
    'nombreContactoTelefono',
    'email',
    'direccion',
    'ciudad',
  ];
  if (incluyeCliente) permitidos.push('emailFacturacionElectronica');
  const out = {};
  for (const k of permitidos) if (body[k] !== undefined) out[k] = texto(body[k]);
  if (body.estado !== undefined) out.estado = booleano(body.estado);
  if (permiteRoles) {
    for (const rol of ['esCliente', 'esProveedor']) {
      if (body[rol] !== undefined) out[rol] = booleano(body[rol]);
    }
  }
  return out;
};
const esTerceros = (req) => req.baseUrl.endsWith('/terceros') || req.baseUrl.endsWith('/clientes');
const rutaDocumentos = (req) =>
  req.baseUrl.endsWith('/clientes')
    ? 'clientes'
    : req.baseUrl.endsWith('/terceros')
      ? 'terceros'
      : 'proveedores';
const documentoIgual = (numero) =>
  sequelize.where(
    sequelize.fn(
      'UPPER',
      sequelize.fn('REGEXP_REPLACE', sequelize.col('numero_documento'), '\\s', '', 'g'),
    ),
    numero.replace(/\s/g, '').toUpperCase(),
  );
const asegurarRoles = (p) => {
  if (!p.esCliente && !p.esProveedor) {
    throw Object.assign(new Error('Debe seleccionar al menos un rol'), { status: 422 });
  }
};
const asegurarFacturacionCliente = (esCliente, correo) => {
  if (esCliente && !correo?.trim()) {
    throw Object.assign(
      new Error('El correo de facturación electrónica es obligatorio para clientes'),
      {
        status: 422,
      },
    );
  }
};
async function buscar(id, transaction) {
  return Proveedor.findByPk(id, { include, transaction });
}
async function guardarDocumentos(proveedor, files, transaction, nuevas, anteriores) {
  for (const [campo, tipo] of [
    ['camaraComercio', 'CAMARA_COMERCIO'],
    ['rut', 'RUT'],
  ]) {
    const file = files?.[campo]?.[0];
    if (!file) continue;
    const clave = storage.guardar(file);
    nuevas.push(clave);
    const previo = await DocumentoProveedor.findOne({
      where: { proveedorId: proveedor.id, tipo },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (previo) {
      anteriores.push(previo.clave);
      await previo.update(
        {
          nombreOriginal: file.originalname,
          clave,
          mimeType: file.mimetype,
          tamano: file.size,
          fechaCarga: new Date(),
        },
        { transaction },
      );
    } else
      await DocumentoProveedor.create(
        {
          proveedorId: proveedor.id,
          tipo,
          nombreOriginal: file.originalname,
          clave,
          mimeType: file.mimetype,
          tamano: file.size,
        },
        { transaction },
      );
  }
}
exports.listar = async (req, res, next) => {
  try {
    const where = req.baseUrl.endsWith('/clientes')
      ? { esCliente: true, estado: true }
      : esTerceros(req)
        ? {}
        : { esProveedor: true };
    if (esTerceros(req)) {
      if (req.query.rol === 'clientes') where.esCliente = true;
      if (req.query.rol === 'proveedores') where.esProveedor = true;
      if (req.query.rol === 'ambos') Object.assign(where, { esCliente: true, esProveedor: true });
      if (req.query.estado === 'activo') where.estado = true;
      if (req.query.estado === 'inactivo') where.estado = false;
    }
    const rows = await Proveedor.findAll({
      where,
      include,
      order: [
        ['razonSocial', 'ASC'],
        ['numeroDocumento', 'ASC'],
      ],
    });
    return ok(
      res,
      rows.map((row) => presentar(row, rutaDocumentos(req))),
    );
  } catch (e) {
    next(e);
  }
};
exports.obtener = async (req, res, next) => {
  try {
    const p = await buscar(req.params.id);
    return p && (req.baseUrl.endsWith('/clientes') ? p.esCliente : esTerceros(req) || p.esProveedor)
      ? ok(res, presentar(p, rutaDocumentos(req)))
      : fail(res, 'Tercero no encontrado', 404);
  } catch (e) {
    next(e);
  }
};
exports.crear = async (req, res, next) => {
  const nuevas = [];
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const d = datos(req.body, esTerceros(req), req.baseUrl.endsWith('/terceros'));
      if (!d.tipoDocumento || !d.numeroDocumento) {
        throw Object.assign(new Error('Tipo y número de documento son obligatorios'), {
          status: 422,
        });
      }
      const roles = req.baseUrl.endsWith('/clientes')
        ? { esCliente: true, esProveedor: false }
        : esTerceros(req)
          ? { esCliente: d.esCliente ?? false, esProveedor: d.esProveedor ?? false }
          : { esCliente: false, esProveedor: true };
      asegurarRoles(roles);
      const existente = await Proveedor.findOne({
        where: documentoIgual(d.numeroDocumento),
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existente) {
        if (req.baseUrl.endsWith('/clientes') && !existente.esCliente) {
          asegurarFacturacionCliente(
            true,
            Object.hasOwn(d, 'emailFacturacionElectronica')
              ? d.emailFacturacionElectronica
              : existente.emailFacturacionElectronica,
          );
          await existente.update({ ...d, esCliente: true }, { transaction });
          await guardarDocumentos(existente, req.files, transaction, nuevas, []);
          return buscar(existente.id, transaction);
        }
        if (!esTerceros(req) && !existente.esProveedor) {
          await existente.update({ ...d, esProveedor: true }, { transaction });
          await guardarDocumentos(existente, req.files, transaction, nuevas, []);
          return buscar(existente.id, transaction);
        }
        throw Object.assign(
          new Error('Ya existe un tercero con ese número de documento; edite sus roles'),
          { status: 409 },
        );
      }
      asegurarFacturacionCliente(roles.esCliente, d.emailFacturacionElectronica);
      const p = await Proveedor.create(
        { ...d, ...roles, estado: d.estado ?? true },
        { transaction },
      );
      await guardarDocumentos(p, req.files, transaction, nuevas, []);
      return buscar(p.id, transaction);
    });
    return created(res, presentar(result, rutaDocumentos(req)));
  } catch (e) {
    nuevas.forEach(storage.eliminar);
    next(e);
  }
};
exports.actualizar = async (req, res, next) => {
  const nuevas = [],
    anteriores = [];
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const p = await Proveedor.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        !p ||
        (req.baseUrl.endsWith('/clientes') && !p.esCliente) ||
        (!esTerceros(req) && !p.esProveedor)
      ) {
        throw Object.assign(new Error('Tercero no encontrado'), { status: 404 });
      }
      const d = datos(req.body, esTerceros(req), req.baseUrl.endsWith('/terceros'));
      asegurarRoles({
        esCliente: d.esCliente ?? p.esCliente,
        esProveedor: d.esProveedor ?? p.esProveedor,
      });
      asegurarFacturacionCliente(
        d.esCliente ?? p.esCliente,
        Object.hasOwn(d, 'emailFacturacionElectronica')
          ? d.emailFacturacionElectronica
          : p.emailFacturacionElectronica,
      );
      if (p.esProveedor && d.esProveedor === false) {
        const { Recepcion, Vehiculo } = require('../../models');
        if (
          (await Recepcion.count({ where: { proveedorId: p.id }, transaction })) ||
          (await Vehiculo.count({ where: { proveedorId: p.id }, transaction }))
        ) {
          throw Object.assign(
            new Error('El tercero tiene recepciones o vehículos; conserve el rol proveedor'),
            {
              status: 409,
            },
          );
        }
      }
      if (
        d.numeroDocumento &&
        (await Proveedor.findOne({
          where: { [Op.and]: [documentoIgual(d.numeroDocumento), { id: { [Op.ne]: p.id } }] },
          transaction,
        }))
      ) {
        throw Object.assign(new Error('Ya existe un tercero con ese número de documento'), {
          status: 409,
        });
      }
      await p.update(d, { transaction });
      await guardarDocumentos(p, req.files, transaction, nuevas, anteriores);
      return buscar(p.id, transaction);
    });
    anteriores.forEach(storage.eliminar);
    return ok(res, presentar(result, rutaDocumentos(req)), 'Tercero actualizado');
  } catch (e) {
    nuevas.forEach(storage.eliminar);
    next(e);
  }
};
exports.descargar = async (req, res, next) => {
  try {
    const tercero = await Proveedor.findByPk(req.params.id);
    if (
      !tercero ||
      (req.baseUrl.endsWith('/clientes') && !tercero.esCliente) ||
      (!esTerceros(req) && !tercero.esProveedor)
    ) {
      return fail(res, 'Documento no encontrado', 404);
    }
    const doc = await DocumentoProveedor.findOne({
      where: { id: req.params.documentoId, proveedorId: req.params.id },
    });
    if (!doc) return fail(res, 'Documento no encontrado', 404);
    res.type(doc.mimeType);
    res.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(doc.nombreOriginal)}`,
    );
    return res.sendFile(storage.ruta(doc.clave));
  } catch (e) {
    next(e);
  }
};
exports.eliminar = async (req, res, next) => {
  try {
    const p = await buscar(req.params.id);
    if (!p || (!esTerceros(req) && !p.esProveedor)) return fail(res, 'Tercero no encontrado', 404);
    const { Recepcion, Vehiculo } = require('../../models');
    if (req.baseUrl.endsWith('/clientes') && p.esProveedor) {
      await p.update({ esCliente: false });
      return ok(res, null, 'Rol cliente retirado');
    }
    if (!esTerceros(req) && p.esCliente) {
      if (
        (await Recepcion.count({ where: { proveedorId: p.id } })) ||
        (await Vehiculo.count({ where: { proveedorId: p.id } }))
      ) {
        return fail(res, 'El proveedor tiene recepciones o vehículos; mantenga su rol', 409);
      }
      await p.update({ esProveedor: false });
      return ok(res, null, 'Rol proveedor retirado');
    }
    if (
      (await Recepcion.count({ where: { proveedorId: p.id } })) ||
      (await Vehiculo.count({ where: { proveedorId: p.id } }))
    ) {
      return fail(res, 'El tercero tiene recepciones o vehículos; márquelo inactivo', 409);
    }
    const claves = p.documentos.map((d) => d.clave);
    await p.destroy();
    claves.forEach(storage.eliminar);
    return ok(res, null, 'Tercero eliminado');
  } catch (e) {
    next(e);
  }
};
