const {
  Desviacion,
  FormatoCalidad,
  Inspeccion,
  OrdenProduccion,
  OrdenProduccionDetalle,
  Producto,
  TipoInspeccion,
  UnidadMedida,
  Usuario,
  VersionFormato,
} = require('../../models');
const { ApiError } = require('../../utils/ApiError');
const { fechaActual } = require('./bloqueo-diario.service');

const usuarioPublico = ['id', 'nombre', 'correo'];

const obtenerOrden = async (ordenId, transaction, bloquear = false) => {
  const orden = await OrdenProduccion.findByPk(ordenId, {
    transaction,
    ...(bloquear ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!orden) throw new ApiError('Orden de producción no encontrada', 404);
  if (orden.estado !== 'EN_PRODUCCION') {
    throw new ApiError('La pestaña Calidad solo está disponible para OT en producción', 409);
  }
  const detalles = await OrdenProduccionDetalle.findAll({
    where: { ordenProduccionId: orden.id },
    include: [
      {
        model: Producto,
        as: 'productoTerminado',
        include: [{ model: UnidadMedida, as: 'unidadMedida' }],
      },
    ],
    transaction,
  });
  orden.setDataValue('detalles', detalles);
  orden.detalles = detalles;
  return orden;
};

const formatosPublicados = async () => {
  const formatos = await FormatoCalidad.findAll({
    where: { estado: true },
    include: [
      {
        model: TipoInspeccion,
        as: 'tipoInspeccion',
        where: { codigo: 'PRODUCCION', estado: true },
        required: true,
      },
      {
        model: VersionFormato,
        as: 'versiones',
        where: { estadoVersion: 'PUBLICADO' },
        required: true,
      },
    ],
    order: [['nombre', 'ASC']],
  });
  return formatos.map((formato) => {
    const data = formato.toJSON();
    data.versionPublicada = data.versiones[0];
    delete data.versiones;
    return data;
  });
};

const listarInspecciones = async (ordenId) => {
  await obtenerOrden(ordenId);
  const inspecciones = await Inspeccion.findAll({
    where: { ordenProduccionId: ordenId },
    include: [
      {
        model: VersionFormato,
        as: 'version',
        include: [{ model: FormatoCalidad, as: 'formato' }],
      },
      { model: Producto, as: 'producto', include: [{ model: UnidadMedida, as: 'unidadMedida' }] },
      { model: Usuario, as: 'iniciador', attributes: usuarioPublico },
      { model: Desviacion, as: 'desviaciones', attributes: ['id'], required: false },
    ],
    order: [['fechaInicio', 'DESC']],
  });
  return inspecciones.map((registro) => {
    const data = registro.toJSON();
    data.resultado = ['CERRADA', 'CERRADA_INCOMPLETA'].includes(data.estado)
      ? data.desviaciones?.length
        ? 'NO_CUMPLE'
        : 'CUMPLE'
      : null;
    return data;
  });
};

const obtenerContexto = async (ordenId) => {
  const [orden, formatos, inspecciones] = await Promise.all([
    obtenerOrden(ordenId),
    formatosPublicados(),
    listarInspecciones(ordenId),
  ]);
  const productos = orden.detalles.map((detalle) => ({
    ...detalle.productoTerminado.toJSON(),
    lotes: [],
  }));
  const resumenFormatos = formatos.map((formato) => {
    const ejecuciones = inspecciones.filter(
      (inspeccion) => inspeccion.version?.formato?.id === formato.id,
    );
    const abiertas = ejecuciones.some(
      (inspeccion) => !['CERRADA', 'CERRADA_INCOMPLETA'].includes(inspeccion.estado),
    );
    return {
      ...formato,
      cantidadInspecciones: ejecuciones.length,
      estadoEjecucion: !ejecuciones.length ? 'PENDIENTE' : abiertas ? 'EN_PROCESO' : 'COMPLETADA',
    };
  });
  return { orden, productos, formatos: resumenFormatos, inspecciones };
};

const iniciar = async ({ ordenId, formatoId, productoId, lote, usuarioId, transaction }) => {
  const orden = await obtenerOrden(ordenId, transaction, true);
  const version = await VersionFormato.findOne({
    where: { formatoCalidadId: formatoId, estadoVersion: 'PUBLICADO' },
    include: [
      {
        model: FormatoCalidad,
        as: 'formato',
        where: { estado: true },
        include: [
          {
            model: TipoInspeccion,
            as: 'tipoInspeccion',
            where: { codigo: 'PRODUCCION', estado: true },
            required: true,
          },
        ],
      },
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!version) throw new ApiError('El formato no tiene una versión PUBLICADA de Producción', 409);

  let producto = null;
  if (productoId) {
    const idsValidos = new Set(orden.detalles.map((detalle) => detalle.productoTerminadoId));
    if (!idsValidos.has(productoId)) {
      throw new ApiError('El producto seleccionado no pertenece a esta OT', 422);
    }
    producto = orden.detalles.find(
      (detalle) => detalle.productoTerminadoId === productoId,
    )?.productoTerminado;
  }
  if (lote) {
    throw new ApiError(
      'Esta OT todavía no tiene lotes de PT generados; inicia la inspección sin lote',
      422,
    );
  }
  return Inspeccion.create(
    {
      versionFormatoId: version.id,
      lugarInspeccionId: null,
      ordenProduccionId: orden.id,
      productoId: producto?.id ?? null,
      lote: null,
      fechaVencimiento: null,
      fechaInspeccion: await fechaActual(transaction),
      estado: 'EN_PROCESO',
      iniciadaPor: usuarioId,
      fechaInicio: new Date(),
    },
    { transaction },
  );
};

module.exports = { formatosPublicados, listarInspecciones, obtenerContexto, iniciar };
