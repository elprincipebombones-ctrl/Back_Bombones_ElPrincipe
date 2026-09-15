const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../../database/database');
const Producto = require('../../models/Recepcion/Producto');
const CategoriaProducto = require('../../models/Recepcion/CategoriaProducto');
const UnidadMedida = require('../../models/Recepcion/UnidadMedida');
const CondicionTermica = require('../../models/Recepcion/CondicionTermica');
const { ok, created, fail } = require('../../utils/response');

const include = [
  {
    model: CategoriaProducto,
    as: 'categoriaProducto',
    attributes: ['id', 'codigo', 'nombre', 'descripcion', 'clasificacionMp', 'estado'],
  },
  {
    model: UnidadMedida,
    as: 'unidadMedida',
    attributes: ['id', 'codigo', 'nombre', 'simbolo', 'estado'],
  },
  {
    model: CondicionTermica,
    as: 'condicionTermica',
    attributes: ['id', 'codigo', 'nombre', 'temperaturaMinima', 'temperaturaMaxima', 'activo'],
  },
];

const esMpCarnica = (categoria) =>
  categoria?.codigo === 'MP-CAR' || categoria?.nombre?.trim().toUpperCase() === 'MP CÁRNICAS';

const generarCodigo = async (tipoProducto, transaction) => {
  const esProductoTerminado = tipoProducto === 'PT';
  const secuencia = esProductoTerminado ? 'productos_codigo_pt_seq' : 'productos_codigo_mp_seq';
  const prefijo = esProductoTerminado ? 'PT' : 'MP';
  const [resultado] = await sequelize.query(`SELECT nextval('${secuencia}') AS consecutivo`, {
    type: QueryTypes.SELECT,
    transaction,
  });
  return `${prefijo}-${String(resultado.consecutivo).padStart(5, '0')}`;
};

const familiaCodigo = (tipoProducto) => (tipoProducto === 'PT' ? 'PT' : 'MP');

exports.listar = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const tiposSolicitados = String(req.query.tipoProducto || '')
      .split(',')
      .map((tipo) => tipo.trim().toUpperCase())
      .filter(Boolean);
    const tiposValidos = ['MP', 'INSUMO', 'EMPAQUE', 'PT'];

    if (tiposSolicitados.some((tipo) => !tiposValidos.includes(tipo))) {
      return fail(res, 'El tipo de producto solicitado no es válido', 400);
    }

    const where = {};
    if (search) {
      where[Op.or] = [
        { codigo: { [Op.iLike]: `%${search}%` } },
        { nombre: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (tiposSolicitados.length) {
      where.tipoProducto = { [Op.in]: tiposSolicitados };
    }

    const productos = await Producto.findAll({ where, include, order: [['nombre', 'ASC']] });
    return ok(res, productos);
  } catch (err) {
    return next(err);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id, { include });
    return producto ? ok(res, producto) : fail(res, 'Producto no encontrado', 404);
  } catch (err) {
    return next(err);
  }
};

const validarRelaciones = async (categoriaProductoId, unidadMedidaId, condicionTermicaId) => {
  const [categoria, unidad, condicion] = await Promise.all([
    CategoriaProducto.findByPk(categoriaProductoId),
    UnidadMedida.findByPk(unidadMedidaId),
    condicionTermicaId ? CondicionTermica.findByPk(condicionTermicaId) : null,
  ]);
  if (!categoria || !categoria.estado) return { error: 'La categoría no existe o está inactiva' };
  if (!unidad || !unidad.estado) return { error: 'La unidad de medida no existe o está inactiva' };
  if (esMpCarnica(categoria) && (!condicion || !condicion.activo)) {
    return { error: 'La condición térmica es obligatoria y debe estar activa para una MP cárnica' };
  }
  return { categoria, condicionTermicaId: esMpCarnica(categoria) ? condicionTermicaId : null };
};

exports.listarCondicionesTermicas = async (_req, res, next) => {
  try {
    return ok(
      res,
      await CondicionTermica.findAll({
        where: { activo: true },
        order: [['nombre', 'ASC']],
      }),
    );
  } catch (err) {
    return next(err);
  }
};

exports.crear = async (req, res, next) => {
  try {
    const {
      nombre,
      descripcion,
      tipoProducto,
      categoriaProductoId,
      unidadMedidaId,
      condicionTermicaId,
      estado,
    } = req.body;
    const validacion = await validarRelaciones(
      categoriaProductoId,
      unidadMedidaId,
      condicionTermicaId,
    );
    if (validacion.error) return fail(res, validacion.error, 422);
    const producto = await sequelize.transaction(async (transaction) => {
      const codigo = await generarCodigo(tipoProducto, transaction);
      return Producto.create(
        {
          codigo,
          nombre,
          descripcion,
          tipoProducto,
          categoriaProductoId,
          unidadMedidaId,
          condicionTermicaId: validacion.condicionTermicaId,
          estado: estado ?? true,
        },
        { transaction },
      );
    });
    return created(res, await Producto.findByPk(producto.id, { include }));
  } catch (err) {
    return next(err);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return fail(res, 'Producto no encontrado', 404);
    const categoriaProductoId = req.body.categoriaProductoId ?? producto.categoriaProductoId;
    const unidadMedidaId = req.body.unidadMedidaId ?? producto.unidadMedidaId;
    const condicionTermicaId = req.body.condicionTermicaId ?? producto.condicionTermicaId;
    const validacion = await validarRelaciones(
      categoriaProductoId,
      unidadMedidaId,
      condicionTermicaId,
    );
    if (validacion.error) return fail(res, validacion.error, 422);
    const tipoProducto = req.body.tipoProducto ?? producto.tipoProducto;
    const campos = {
      nombre: req.body.nombre ?? producto.nombre,
      descripcion: req.body.descripcion ?? producto.descripcion,
      tipoProducto,
      categoriaProductoId,
      unidadMedidaId,
      condicionTermicaId: validacion.condicionTermicaId,
      estado: req.body.estado ?? producto.estado,
    };
    await sequelize.transaction(async (transaction) => {
      if (familiaCodigo(tipoProducto) !== familiaCodigo(producto.tipoProducto)) {
        campos.codigo = await generarCodigo(tipoProducto, transaction);
      }
      await producto.update(campos, { transaction });
    });
    return ok(res, await Producto.findByPk(producto.id, { include }), 'Producto actualizado');
  } catch (err) {
    return next(err);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return fail(res, 'Producto no encontrado', 404);
    await producto.destroy();
    return ok(res, null, 'Producto eliminado');
  } catch (err) {
    return next(err);
  }
};
