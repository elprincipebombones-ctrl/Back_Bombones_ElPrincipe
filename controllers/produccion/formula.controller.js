const sequelize = require('../../database/database');
const {
  Producto,
  CategoriaProducto,
  UnidadMedida,
  FamiliaMpCarnica,
  FormulaProducto,
  FormulaComponente,
} = require('../../models');
const { ok, fail } = require('../../utils/response');
const {
  normalizarCantidad,
  obtenerUnidadesCompatibles,
} = require('../../services/produccion/conversion-unidad.service');

const esMpCarnica = (producto) =>
  producto.tipoProducto === 'MP' &&
  (producto.categoriaProducto?.codigo === 'MP-CAR' ||
    producto.categoriaProducto?.nombre?.trim().toUpperCase() === 'MP CÁRNICAS');

const includeFormula = [
  {
    model: Producto,
    as: 'productoTerminado',
    include: [{ model: UnidadMedida, as: 'unidadMedida' }],
  },
  {
    model: FormulaComponente,
    as: 'componentes',
    include: [
      { model: Producto, as: 'producto' },
      { model: FamiliaMpCarnica, as: 'familiaMpCarnica' },
      { model: UnidadMedida, as: 'unidadMedida' },
    ],
  },
];

const obtenerFormula = (productoTerminadoId, transaction) =>
  FormulaProducto.findOne({
    where: { productoTerminadoId, activo: true },
    include: includeFormula,
    order: [[{ model: FormulaComponente, as: 'componentes' }, 'orden', 'ASC']],
    transaction,
  });

const familiaDisponible = (familia, productos) => {
  const miembros = productos.filter(
    (producto) => producto.familiaMpCarnicaId === familia.id && esMpCarnica(producto),
  );
  const unidades = new Set(miembros.map((producto) => producto.unidadMedidaId));
  return {
    tipo: 'FAMILIA_CARNICA',
    id: familia.id,
    nombre: familia.nombre,
    categoria: miembros[0]?.categoriaProducto,
    unidadMedida: unidades.size === 1 ? miembros[0]?.unidadMedida : null,
    disponible: miembros.length > 0 && unidades.size === 1,
    mensaje:
      miembros.length === 0
        ? 'La familia no tiene productos cárnicos activos'
        : unidades.size !== 1
          ? 'Los productos de la familia no comparten una unidad de medida'
          : null,
  };
};

exports.catalogos = async (_req, res, next) => {
  try {
    const [productos, familias, formulasActivas] = await Promise.all([
      Producto.findAll({
        where: { estado: true },
        include: [
          { model: CategoriaProducto, as: 'categoriaProducto' },
          { model: UnidadMedida, as: 'unidadMedida' },
        ],
        order: [['nombre', 'ASC']],
      }),
      FamiliaMpCarnica.findAll({ where: { activo: true }, order: [['nombre', 'ASC']] }),
      FormulaProducto.findAll({
        where: { activo: true },
        attributes: ['productoTerminadoId'],
      }),
    ]);

    const productosConFormula = new Set(
      formulasActivas.map((formula) => formula.productoTerminadoId),
    );

    const productosTerminados = productos
      .filter((producto) => producto.tipoProducto === 'PT')
      .map((producto) => ({
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        unidadMedida: producto.unidadMedida,
        tieneFormula: productosConFormula.has(producto.id),
      }));

    const componentes = productos
      .filter(
        (producto) =>
          ['MP', 'INSUMO', 'EMPAQUE'].includes(producto.tipoProducto) && !esMpCarnica(producto),
      )
      .map((producto) => ({
        tipo: 'PRODUCTO',
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoriaProducto,
        unidadMedida: producto.unidadMedida,
        disponible: true,
        mensaje: null,
      }));

    familias.forEach((familia) => {
      const componente = familiaDisponible(familia, productos);
      if (componente.categoria) componentes.push(componente);
    });

    const unidadesCompatibles = await obtenerUnidadesCompatibles(
      componentes.map((componente) => componente.unidadMedida?.id),
    );
    componentes.forEach((componente) => {
      componente.unidadBase = componente.unidadMedida;
      componente.unidadesCompatibles = componente.unidadMedida
        ? unidadesCompatibles.get(componente.unidadMedida.id) || [componente.unidadMedida]
        : [];
    });

    const grupos = new Map();
    componentes.forEach((componente) => {
      const categoria = componente.categoria;
      const clave = categoria?.id || 'sin-categoria';
      if (!grupos.has(clave)) {
        grupos.set(clave, {
          categoriaId: categoria?.id || null,
          categoria: categoria?.nombre || 'Sin categoría',
          componentes: [],
        });
      }
      grupos.get(clave).componentes.push(componente);
    });

    const componentesAgrupados = [...grupos.values()]
      .map((grupo) => ({
        ...grupo,
        componentes: grupo.componentes.sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria));

    return ok(res, { productosTerminados, grupos: componentesAgrupados });
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const producto = await Producto.findByPk(req.params.productoTerminadoId);
    if (!producto || producto.tipoProducto !== 'PT') {
      return fail(res, 'El producto terminado no existe o no es de tipo PT', 422);
    }
    return ok(res, await obtenerFormula(producto.id));
  } catch (error) {
    return next(error);
  }
};

const validarComponente = async (componente, transaction) => {
  if (componente.productoId) {
    const producto = await Producto.findByPk(componente.productoId, {
      include: [{ model: CategoriaProducto, as: 'categoriaProducto' }],
      transaction,
    });
    if (
      !producto ||
      !producto.estado ||
      !['MP', 'INSUMO', 'EMPAQUE'].includes(producto.tipoProducto)
    ) {
      return { error: 'Uno de los productos de la fórmula no existe o no está disponible' };
    }
    if (esMpCarnica(producto)) {
      return { error: 'Las materias primas cárnicas deben agregarse mediante su familia' };
    }
    await normalizarCantidad({
      cantidad: componente.cantidad,
      unidadOrigenId: componente.unidadMedidaId,
      unidadBaseId: producto.unidadMedidaId,
      transaction,
    });
    return { datos: { productoId: producto.id, familiaMpCarnicaId: null } };
  }

  const familia = await FamiliaMpCarnica.findByPk(componente.familiaMpCarnicaId, { transaction });
  if (!familia || !familia.activo) {
    return { error: 'Una de las familias cárnicas no existe o está inactiva' };
  }
  const miembros = await Producto.findAll({
    where: {
      familiaMpCarnicaId: familia.id,
      tipoProducto: 'MP',
      estado: true,
    },
    include: [
      {
        model: CategoriaProducto,
        as: 'categoriaProducto',
        required: true,
        where: { codigo: 'MP-CAR' },
      },
    ],
    transaction,
  });
  const unidades = new Set(miembros.map((producto) => producto.unidadMedidaId));
  if (miembros.length === 0 || unidades.size !== 1) {
    return { error: `La familia ${familia.nombre} no tiene una unidad común válida` };
  }
  const [unidadMedidaId] = unidades;
  await normalizarCantidad({
    cantidad: componente.cantidad,
    unidadOrigenId: componente.unidadMedidaId,
    unidadBaseId: unidadMedidaId,
    transaction,
  });
  return { datos: { productoId: null, familiaMpCarnicaId: familia.id } };
};

exports.guardar = async (req, res, next) => {
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const productoTerminado = await Producto.findByPk(req.params.productoTerminadoId, {
        transaction,
      });
      if (
        !productoTerminado ||
        !productoTerminado.estado ||
        productoTerminado.tipoProducto !== 'PT'
      ) {
        const error = new Error('Solo se pueden parametrizar productos activos de tipo PT');
        error.status = 422;
        throw error;
      }

      const claves = new Set();
      const componentes = [];
      for (const [indice, componente] of req.body.componentes.entries()) {
        const clave = componente.productoId
          ? `producto:${componente.productoId}`
          : `familia:${componente.familiaMpCarnicaId}`;
        if (claves.has(clave)) {
          const error = new Error('No se permiten componentes duplicados dentro de la fórmula');
          error.status = 409;
          throw error;
        }
        claves.add(clave);

        const validacion = await validarComponente(componente, transaction);
        if (validacion.error) {
          const error = new Error(validacion.error);
          error.status = 422;
          throw error;
        }
        componentes.push({
          ...validacion.datos,
          cantidad: componente.cantidad,
          unidadMedidaId: componente.unidadMedidaId,
          orden: indice + 1,
        });
      }

      let formula = await FormulaProducto.findOne({
        where: { productoTerminadoId: productoTerminado.id, activo: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!formula) {
        formula = await FormulaProducto.create(
          { productoTerminadoId: productoTerminado.id, activo: true },
          { transaction },
        );
      } else {
        await FormulaComponente.destroy({ where: { formulaProductoId: formula.id }, transaction });
      }

      await FormulaComponente.bulkCreate(
        componentes.map((componente) => ({ ...componente, formulaProductoId: formula.id })),
        { transaction },
      );
      return formula;
    });

    return ok(
      res,
      await obtenerFormula(resultado.productoTerminadoId),
      'Fórmula guardada correctamente',
    );
  } catch (error) {
    if (error.status) return fail(res, error.message, error.status);
    return next(error);
  }
};
