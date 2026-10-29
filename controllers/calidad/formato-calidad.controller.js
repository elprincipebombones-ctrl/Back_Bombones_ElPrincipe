const {
  FormatoCalidad,
  TipoInspeccion,
  ProgramaCalidad,
  VersionFormato,
  FormatoLugarInspeccion,
  CategoriaLugarInspeccion,
  LugarInspeccion,
  sequelize,
} = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const include = [
  { model: TipoInspeccion, as: 'tipoInspeccion' },
  { model: ProgramaCalidad, as: 'programa' },
  { model: VersionFormato, as: 'versiones' },
];

const validarPrograma = async (programaId, programaActualId = null) => {
  if (programaId === undefined || programaId === null) return null;
  const programa = await ProgramaCalidad.findByPk(programaId);
  if (!programa) return 'Programa no encontrado';
  if (!programa.estado && programa.id !== programaActualId)
    return 'El programa seleccionado está inactivo';
  return null;
};

exports.listar = async (_req, res, next) => {
  try {
    return ok(res, await FormatoCalidad.findAll({ include, order: [['nombre', 'ASC']] }));
  } catch (error) {
    return next(error);
  }
};

exports.listarOperativos = async (_req, res, next) => {
  try {
    return ok(
      res,
      await FormatoCalidad.findAll({
        where: { estado: true },
        include: [
          { model: TipoInspeccion, as: 'tipoInspeccion' },
          { model: ProgramaCalidad, as: 'programa' },
          {
            model: VersionFormato,
            as: 'versiones',
            where: { estadoVersion: 'PUBLICADO' },
            required: true,
          },
        ],
        order: [['nombre', 'ASC']],
      }),
    );
  } catch (error) {
    return next(error);
  }
};

exports.obtener = async (req, res, next) => {
  try {
    const formato = await FormatoCalidad.findByPk(req.params.id, { include });
    if (!formato) return fail(res, 'Formato de calidad no encontrado', 404);
    return ok(res, formato);
  } catch (error) {
    return next(error);
  }
};

exports.crear = async (req, res, next) => {
  const transaccion = await sequelize.transaction();
  try {
    const { versionInicial, ...datosFormato } = req.body;
    if (await FormatoCalidad.findOne({ where: { codigo: datosFormato.codigo } })) {
      await transaccion.rollback();
      return fail(res, 'Ya existe un formato con ese código', 409);
    }
    if (!(await TipoInspeccion.findByPk(datosFormato.tipoInspeccionId))) {
      await transaccion.rollback();
      return fail(res, 'Tipo de inspección no encontrado', 422);
    }
    const errorPrograma = await validarPrograma(datosFormato.programaId);
    if (errorPrograma) {
      await transaccion.rollback();
      return fail(res, errorPrograma, 422);
    }
    const formato = await FormatoCalidad.create(datosFormato, { transaction: transaccion });
    if (versionInicial) {
      await VersionFormato.create(
        {
          ...versionInicial,
          formatoCalidadId: formato.id,
          estadoVersion: 'BORRADOR',
          publicadoPor: null,
          fechaPublicacion: null,
        },
        { transaction: transaccion },
      );
    }
    await transaccion.commit();
    return created(res, await FormatoCalidad.findByPk(formato.id, { include }));
  } catch (error) {
    await transaccion.rollback();
    return next(error);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    const formato = await FormatoCalidad.findByPk(req.params.id);
    if (!formato) return fail(res, 'Formato de calidad no encontrado', 404);
    if (req.body.tipoInspeccionId && !(await TipoInspeccion.findByPk(req.body.tipoInspeccionId))) {
      return fail(res, 'Tipo de inspección no encontrado', 422);
    }
    const errorPrograma = await validarPrograma(req.body.programaId, formato.programaId);
    if (errorPrograma) return fail(res, errorPrograma, 422);
    await formato.update(req.body);
    return ok(
      res,
      await FormatoCalidad.findByPk(formato.id, { include }),
      'Formato de calidad actualizado',
    );
  } catch (error) {
    return next(error);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    const formato = await FormatoCalidad.findByPk(req.params.id);
    if (!formato) return fail(res, 'Formato de calidad no encontrado', 404);
    await formato.update({ estado: false });
    return ok(res, formato, 'Formato de calidad desactivado');
  } catch (error) {
    return next(error);
  }
};

exports.listarLugares = async (req, res, next) => {
  try {
    const formato = await FormatoCalidad.findByPk(req.params.id);
    if (!formato) return fail(res, 'Formato de calidad no encontrado', 404);

    const [categorias, asignaciones] = await Promise.all([
      CategoriaLugarInspeccion.findAll({
        include: [
          {
            model: LugarInspeccion,
            as: 'lugares',
            separate: true,
            order: [['orden', 'ASC']],
          },
        ],
        order: [['orden', 'ASC']],
      }),
      FormatoLugarInspeccion.findAll({
        where: { formatoCalidadId: formato.id, estado: true },
        attributes: ['lugarInspeccionId'],
      }),
    ]);
    const seleccionados = new Set(asignaciones.map((item) => item.lugarInspeccionId));

    return ok(res, {
      formato: { id: formato.id, codigo: formato.codigo, nombre: formato.nombre },
      categorias: categorias.map((categoria) => ({
        ...categoria.toJSON(),
        lugares: (categoria.lugares || []).map((lugar) => ({
          ...lugar.toJSON(),
          asignado: seleccionados.has(lugar.id),
        })),
      })),
      cantidadAsignada: seleccionados.size,
    });
  } catch (error) {
    return next(error);
  }
};

exports.guardarLugares = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formato = await FormatoCalidad.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!formato) {
      await transaction.rollback();
      return fail(res, 'Formato de calidad no encontrado', 404);
    }

    const lugarIds = [...new Set(req.body.lugarIds)];
    if (lugarIds.length) {
      const lugares = await LugarInspeccion.findAll({
        where: { id: lugarIds, estado: true },
        include: [
          {
            model: CategoriaLugarInspeccion,
            as: 'categoria',
            where: { estado: true },
            required: true,
          },
        ],
        transaction,
      });
      if (lugares.length !== lugarIds.length) {
        await transaction.rollback();
        return fail(
          res,
          'Uno o más lugares seleccionados están inactivos o no existen',
          422,
        );
      }
    }

    await FormatoLugarInspeccion.update(
      { estado: false },
      { where: { formatoCalidadId: formato.id }, transaction },
    );
    for (const lugarInspeccionId of lugarIds) {
      const [asignacion] = await FormatoLugarInspeccion.findOrCreate({
        where: { formatoCalidadId: formato.id, lugarInspeccionId },
        defaults: { estado: true },
        transaction,
      });
      if (!asignacion.estado) await asignacion.update({ estado: true }, { transaction });
    }

    await transaction.commit();
    return ok(
      res,
      { formatoId: formato.id, lugarIds, cantidadAsignada: lugarIds.length },
      'Lugares del formato actualizados',
    );
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};

exports.listarLugaresOperativos = async (req, res, next) => {
  try {
    const formato = await FormatoCalidad.findOne({
      where: { id: req.params.id, estado: true },
    });
    if (!formato) return fail(res, 'Formato activo no encontrado', 404);

    const asignaciones = await FormatoLugarInspeccion.findAll({
      where: { formatoCalidadId: formato.id, estado: true },
      include: [
        {
          model: LugarInspeccion,
          as: 'lugar',
          where: { estado: true },
          required: true,
          include: [
            {
              model: CategoriaLugarInspeccion,
              as: 'categoria',
              where: { estado: true },
              required: true,
            },
          ],
        },
      ],
    });
    const categorias = new Map();
    for (const asignacion of asignaciones) {
      const lugar = asignacion.lugar.toJSON();
      const categoria = lugar.categoria;
      if (!categorias.has(categoria.id)) {
        categorias.set(categoria.id, { ...categoria, lugares: [] });
      }
      delete lugar.categoria;
      categorias.get(categoria.id).lugares.push(lugar);
    }
    const resultado = [...categorias.values()]
      .sort((a, b) => a.orden - b.orden)
      .map((categoria) => ({
        ...categoria,
        lugares: categoria.lugares.sort((a, b) => a.orden - b.orden),
      }));

    return ok(res, resultado);
  } catch (error) {
    return next(error);
  }
};
