const { FormatoCalidad, TipoInspeccion, ProgramaCalidad, VersionFormato, sequelize } = require('../../models');
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
  if (!programa.estado && programa.id !== programaActualId) return 'El programa seleccionado está inactivo';
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
    return ok(res, await FormatoCalidad.findAll({
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
    }));
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
    return ok(res, await FormatoCalidad.findByPk(formato.id, { include }), 'Formato de calidad actualizado');
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
