const { FormatoCalidad, TipoInspeccion, VersionFormato, sequelize } = require('../../models');
const { ok, created, fail } = require('../../utils/response');

const include = [
  { model: TipoInspeccion, as: 'tipoInspeccion' },
  { model: VersionFormato, as: 'versiones' },
];

exports.listar = async (_req, res, next) => {
  try {
    return ok(res, await FormatoCalidad.findAll({ include, order: [['nombre', 'ASC']] }));
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
    const formato = await FormatoCalidad.create(datosFormato, { transaction: transaccion });
    if (versionInicial) {
      await VersionFormato.create(
        { ...versionInicial, formatoCalidadId: formato.id },
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
    await formato.update(req.body);
    return ok(res, formato, 'Formato de calidad actualizado');
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
