const {
  sequelize,
  Inspeccion,
  CampoFormato,
  ParametroCalidad,
  SeccionFormato,
  TipoCampo,
  OpcionCampo,
  RespuestaInspeccion,
  RespuestaOpcion,
} = require('../../models');
const { ok } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');
const { evaluarRespuesta, esVacio } = require('../../services/calidad/evaluador-reglas.service');
const { validarEditable } = require('../../services/calidad/bloqueo-diario.service');

const dato = (body, camel, snake) => body[camel] ?? body[snake];

const normalizar = (body) => ({
  campoFormatoId: dato(body, 'campoFormatoId', 'campo_formato_id'),
  valorTexto: dato(body, 'valorTexto', 'valor_texto'),
  valorNumero: dato(body, 'valorNumero', 'valor_numero'),
  valorBooleano: dato(body, 'valorBooleano', 'valor_booleano'),
  valorFecha: dato(body, 'valorFecha', 'valor_fecha'),
  valorHora: dato(body, 'valorHora', 'valor_hora'),
  valorFechaHora: dato(body, 'valorFechaHora', 'valor_fecha_hora'),
  valorJson: dato(body, 'valorJson', 'valor_json'),
  observacion: body.observacion ?? null,
  opciones: Array.isArray(body.opciones) ? body.opciones : [],
});

const validarTipoValor = (campo, respuesta) => {
  const tipo = campo.tipoCampo.codigo;
  const valorPorTipo = {
    TEXTO: respuesta.valorTexto,
    TEXTO_LARGO: respuesta.valorTexto,
    ARCHIVO: respuesta.valorTexto,
    NUMERO: respuesta.valorNumero,
    SI_NO: respuesta.valorBooleano,
    FECHA: respuesta.valorFecha,
    HORA: respuesta.valorHora,
    FECHA_HORA: respuesta.valorFechaHora,
  };
  if (tipo === 'NUMERO' && respuesta.valorNumero !== undefined && !Number.isFinite(Number(respuesta.valorNumero))) {
    throw new ApiError(`El campo ${campo.etiqueta} requiere un valor numérico`, 422);
  }
  if (tipo === 'SI_NO' && respuesta.valorBooleano !== undefined && typeof respuesta.valorBooleano !== 'boolean') {
    throw new ApiError(`El campo ${campo.etiqueta} requiere un valor booleano`, 422);
  }
  if (tipo === 'SELECCION_UNICA' && respuesta.opciones.length > 1) {
    throw new ApiError(`El campo ${campo.etiqueta} solo permite una opción`, 422);
  }
  const esSeleccion = ['SELECCION_UNICA', 'SELECCION_MULTIPLE'].includes(tipo);
  const esObligatorio = campo.parametro
    ? campo.parametro.esObligatorioDefault
    : campo.esObligatorio;
  if (esObligatorio && (esSeleccion ? !respuesta.opciones.length : esVacio(valorPorTipo[tipo]))) {
    throw new ApiError(`El campo ${campo.etiqueta} es obligatorio`, 422);
  }
  if (!esSeleccion && !(tipo in valorPorTipo)) {
    throw new ApiError(`Tipo de campo ${tipo} no soportado para ejecución`, 422);
  }
};

exports.guardarRespuestas = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const inspeccion = await Inspeccion.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!inspeccion) throw new ApiError('Inspección no encontrada', 404);
    await validarEditable(inspeccion, transaction);

    const guardadas = [];
    for (const entrada of req.body.respuestas) {
      const datos = normalizar(entrada);
      const campo = await CampoFormato.findOne({
        where: { id: datos.campoFormatoId, estado: true },
        include: [
          { model: TipoCampo, as: 'tipoCampo', required: true },
          { model: ParametroCalidad, as: 'parametro', required: false },
          {
            model: SeccionFormato,
            as: 'seccion',
            required: true,
            where: { versionFormatoId: inspeccion.versionFormatoId, estado: true },
          },
        ],
        transaction,
      });
      if (!campo) {
        throw new ApiError('El campo no pertenece a la versión de esta inspección', 422);
      }
      validarTipoValor(campo, datos);

      const opciones = datos.opciones.length
        ? await OpcionCampo.findAll({
            where: { id: datos.opciones, campoFormatoId: campo.id, estado: true },
            transaction,
          })
        : [];
      if (opciones.length !== new Set(datos.opciones).size) {
        throw new ApiError(`Una opción no pertenece al campo ${campo.etiqueta}`, 422);
      }

      let respuesta = await RespuestaInspeccion.findOne({
        where: { inspeccionId: inspeccion.id, campoFormatoId: campo.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const bloquearAlGuardar = campo.parametro
        ? campo.parametro.bloquearAlGuardarDefault
        : campo.bloquearAlGuardar;
      if (respuesta && bloquearAlGuardar) {
        throw new ApiError(
          `“${campo.etiqueta}” está configurado para bloquearse después del primer guardado y no puede modificarse.`,
          409,
        );
      }
      const valores = {
        valorTexto: datos.valorTexto ?? null,
        valorNumero: datos.valorNumero ?? null,
        valorBooleano: datos.valorBooleano ?? null,
        valorFecha: datos.valorFecha ?? null,
        valorHora: datos.valorHora ?? null,
        valorFechaHora: datos.valorFechaHora ?? null,
        valorJson: datos.valorJson ?? null,
        observacion: datos.observacion,
        guardadoPor: req.usuario.id,
        fechaGuardado: new Date(),
        bloqueada: bloquearAlGuardar,
      };
      if (respuesta) {
        await respuesta.update(valores, { transaction });
      } else {
        respuesta = await RespuestaInspeccion.create(
          {
            ...valores,
            inspeccionId: inspeccion.id,
            campoFormatoId: campo.id,
            // El bloqueo es una decisión explícita del parámetro y queda registrado
            // también en la respuesta para conservar su trazabilidad.
          },
          { transaction },
        );
      }
      await RespuestaOpcion.destroy({ where: { respuestaInspeccionId: respuesta.id }, transaction });
      if (opciones.length) {
        await RespuestaOpcion.bulkCreate(
          opciones.map((opcion) => ({ respuestaInspeccionId: respuesta.id, opcionCampoId: opcion.id })),
          { transaction },
        );
      }
      await evaluarRespuesta({
        inspeccion,
        respuesta,
        campo,
        opciones,
        usuarioId: req.usuario.id,
        transaction,
      });
      guardadas.push(respuesta);
    }

    if (inspeccion.estado === 'BORRADOR') {
      await inspeccion.update({ estado: 'EN_PROCESO' }, { transaction });
    }

    await transaction.commit();
    return ok(res, guardadas, 'Respuestas guardadas y reglas evaluadas');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};
