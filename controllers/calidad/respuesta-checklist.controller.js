const {
  sequelize,
  Inspeccion,
  ElementoChecklist,
  ChecklistSeccion,
  CriterioInspeccion,
  AccionCriterio,
  TipoAccion,
  RespuestaElementoChecklist,
  Desviacion,
  AccionCorrectiva,
} = require('../../models');
const { ok } = require('../../utils/response');
const { ApiError } = require('../../utils/ApiError');
const { validarEditable } = require('../../services/calidad/bloqueo-diario.service');
const { crearSnapshot } = require('../../services/calidad/campos-accion-correctiva.service');

exports.guardar = async (req, res, next) => {
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
      const seleccion = await ElementoChecklist.findOne({
        where: { id: entrada.elementoChecklistId, estado: true },
        include: [
          {
            model: ChecklistSeccion,
            as: 'checklist',
            required: true,
            where: { estado: true },
            include: [
              {
                model: CriterioInspeccion,
                as: 'criterio',
                required: true,
                include: [
                  {
                    model: AccionCriterio,
                    as: 'acciones',
                    where: { estado: true },
                    required: false,
                    include: [{ model: TipoAccion, as: 'tipoAccion', where: { estado: true } }],
                  },
                ],
              },
            ],
          },
        ],
        transaction,
      });
      if (!seleccion || seleccion.checklist.seccionFormatoId === undefined) {
        throw new ApiError('Elemento de checklist no encontrado', 422);
      }
      const checklist = seleccion.checklist;
      const seccion = await sequelize.models.SeccionFormato.findOne({
        where: { id: checklist.seccionFormatoId, versionFormatoId: inspeccion.versionFormatoId },
        transaction,
      });
      if (!seccion) throw new ApiError('El elemento no pertenece a la versión inspeccionada', 422);
      const criterio = checklist.criterio;
      const noCumple = entrada.resultado === 'NO_CUMPLE';
      const exigeObservacion = criterio.acciones.some(
        (accion) => accion.tipoAccion?.codigo === 'EXIGIR_OBSERVACION',
      );
      if (noCumple && exigeObservacion && !entrada.observacion?.trim()) {
        throw new ApiError(`La observación es obligatoria para ${seleccion.nombreSnapshot}`, 422);
      }

      const [respuesta] = await RespuestaElementoChecklist.upsert(
        {
          inspeccionId: inspeccion.id,
          checklistSeccionId: checklist.id,
          elementoChecklistId: seleccion.id,
          elementoInspeccionId: seleccion.elementoInspeccionId,
          criterioInspeccionId: criterio.id,
          resultado: entrada.resultado,
          cumple: !noCumple,
          observacion: entrada.observacion?.trim() || null,
          guardadoPor: req.usuario.id,
          fechaGuardado: new Date(),
        },
        { transaction, returning: true },
      );

      if (noCumple) {
        const [desviacion] = await Desviacion.findOrCreate({
          where: { respuestaElementoChecklistId: respuesta.id },
          defaults: {
            inspeccionId: inspeccion.id,
            respuestaInspeccionId: null,
            reglaCalidadId: null,
            nivelSeveridadId: criterio.nivelSeveridadId,
            descripcion: criterio.pregunta,
            mensaje: criterio.mensajeIncumplimiento,
            estado: 'ABIERTA',
            fechaDeteccion: new Date(),
            detectadaPor: req.usuario.id,
          },
          transaction,
        });
        const accionesPorCodigo = new Map(
          criterio.acciones.map((accion) => [accion.tipoAccion.codigo, accion]),
        );
        const accionPrincipal = accionesPorCodigo.get('SOLICITAR_ACCION_CORRECTIVA');
        if (accionPrincipal) {
          const [accionCorrectiva, creada] = await AccionCorrectiva.findOrCreate({
            where: { desviacionId: desviacion.id, tipoAccionId: accionPrincipal.tipoAccionId },
            defaults: {
              descripcion: criterio.mensajeIncumplimiento || criterio.pregunta,
              fechaAsignacion: new Date(),
            },
            transaction,
          });
          if (creada) {
            await crearSnapshot({
              accionCorrectivaId: accionCorrectiva.id,
              criterioInspeccionId: criterio.id,
              transaction,
            });
          }
        }
        if (accionesPorCodigo.has('BLOQUEAR_CONTINUIDAD')) {
          await inspeccion.update({ estado: 'PENDIENTE_ACCION' }, { transaction });
        }
      }
      guardadas.push(respuesta);
    }

    if (inspeccion.estado === 'BORRADOR') {
      await inspeccion.update({ estado: 'EN_PROCESO' }, { transaction });
    }
    await transaction.commit();
    return ok(res, guardadas, 'Checklist guardado');
  } catch (error) {
    await transaction.rollback();
    return next(error);
  }
};
