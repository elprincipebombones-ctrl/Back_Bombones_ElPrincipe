const {
  ReglaCalidad,
  CondicionRegla,
  AccionRegla,
  TipoAccion,
  Desviacion,
  AccionCorrectiva,
} = require('../../models');
const { ApiError } = require('../../utils/ApiError');
const { crearSnapshot } = require('./campos-accion-correctiva.service');

const valorRespuesta = (respuesta, opciones = []) => {
  if (opciones.length) return opciones.map((opcion) => opcion.valor);
  for (const atributo of [
    'valorNumero',
    'valorBooleano',
    'valorFecha',
    'valorHora',
    'valorFechaHora',
    'valorTexto',
    'valorJson',
  ]) {
    const valor = respuesta[atributo];
    if (valor !== null && valor !== undefined) return valor;
  }
  return null;
};

const esVacio = (valor) =>
  valor === null ||
  valor === undefined ||
  valor === '' ||
  (Array.isArray(valor) && valor.length === 0);

const comparable = (valor) => {
  if (typeof valor === 'boolean' || typeof valor === 'number') return valor;
  if (valor === 'true' || valor === 'false') return valor === 'true';
  const numero = Number(valor);
  return valor !== '' && Number.isFinite(numero) ? numero : String(valor);
};

const listaCondicion = (condicion) => {
  if (Array.isArray(condicion.valorJson)) return condicion.valorJson.map(String);
  if (condicion.valor1 === null || condicion.valor1 === undefined) return [];
  return String(condicion.valor1)
    .split(',')
    .map((item) => item.trim());
};

const evaluarCondicion = (condicion, valor) => {
  const actual = comparable(valor);
  const primero = comparable(condicion.valor1);
  const segundo = comparable(condicion.valor2);

  switch (condicion.operador) {
    case 'IGUAL':
      return actual === primero;
    case 'DIFERENTE':
      return actual !== primero;
    case 'MAYOR_QUE':
      return Number(actual) > Number(primero);
    case 'MAYOR_IGUAL':
      return Number(actual) >= Number(primero);
    case 'MENOR_QUE':
      return Number(actual) < Number(primero);
    case 'MENOR_IGUAL':
      return Number(actual) <= Number(primero);
    case 'ENTRE':
      return Number(actual) >= Number(primero) && Number(actual) <= Number(segundo);
    case 'FUERA_DE_RANGO':
      return Number(actual) < Number(primero) || Number(actual) > Number(segundo);
    case 'EN_LISTA': {
      const lista = listaCondicion(condicion);
      const valores = Array.isArray(valor) ? valor : [valor];
      return valores.some((item) => lista.includes(String(item)));
    }
    case 'NO_EN_LISTA': {
      const lista = listaCondicion(condicion);
      const valores = Array.isArray(valor) ? valor : [valor];
      return valores.every((item) => !lista.includes(String(item)));
    }
    case 'VACIO':
      return esVacio(valor);
    case 'NO_VACIO':
      return !esVacio(valor);
    default:
      return false;
  }
};

const reglaSeActiva = (regla, valor) => {
  const resultados = regla.condiciones
    .filter((condicion) => condicion.estado)
    .map((condicion) => evaluarCondicion(condicion, valor));
  if (!resultados.length) return false;
  return regla.operadorLogico === 'OR' ? resultados.some(Boolean) : resultados.every(Boolean);
};

const evaluarRespuesta = async ({
  inspeccion,
  respuesta,
  campo,
  opciones,
  usuarioId,
  transaction,
}) => {
  const propietario = campo.parametroCalidadId
    ? { parametroCalidadId: campo.parametroCalidadId }
    : { campoFormatoId: campo.id };
  const reglas = await ReglaCalidad.findAll({
    where: { ...propietario, estado: true },
    include: [
      { model: CondicionRegla, as: 'condiciones', where: { estado: true }, required: false },
      {
        model: AccionRegla,
        as: 'acciones',
        where: { estado: true },
        required: false,
        include: [{ model: TipoAccion, as: 'tipoAccion', where: { estado: true }, required: true }],
      },
    ],
    transaction,
  });
  const valor = valorRespuesta(respuesta, opciones);

  for (const regla of reglas) {
    const activa = reglaSeActiva(regla, valor);
    const existente = await Desviacion.findOne({
      where: { respuestaInspeccionId: respuesta.id, reglaCalidadId: regla.id },
      transaction,
    });

    if (!activa || regla.resultado === 'CUMPLE') {
      if (existente && inspeccion.estado === 'BORRADOR') await existente.destroy({ transaction });
      continue;
    }

    const [desviacion] = await Desviacion.findOrCreate({
      where: { respuestaInspeccionId: respuesta.id, reglaCalidadId: regla.id },
      defaults: {
        inspeccionId: inspeccion.id,
        nivelSeveridadId: regla.nivelSeveridadId,
        descripcion: regla.descripcion,
        mensaje: regla.mensajeIncumplimiento,
        estado: 'ABIERTA',
        fechaDeteccion: new Date(),
        detectadaPor: usuarioId,
      },
      transaction,
    });

    const accionesPorCodigo = new Map(
      regla.acciones.map((accion) => [accion.tipoAccion.codigo, accion]),
    );
    if (accionesPorCodigo.has('EXIGIR_OBSERVACION') && !respuesta.observacion?.trim()) {
      throw new ApiError(
        `“${campo.etiqueta}” no cumple la regla “${regla.nombre}”. Debes registrar una observación.`,
        422,
      );
    }
    const accionPrincipal = accionesPorCodigo.get('SOLICITAR_ACCION_CORRECTIVA');
    if (accionPrincipal) {
      const [accionCorrectiva, creada] = await AccionCorrectiva.findOrCreate({
        where: { desviacionId: desviacion.id, tipoAccionId: accionPrincipal.tipoAccionId },
        defaults: {
          descripcion: accionPrincipal.configuracion?.descripcion || regla.mensajeIncumplimiento,
          responsableId: accionPrincipal.configuracion?.responsable_id || null,
          fechaAsignacion: new Date(),
          fechaLimite: accionPrincipal.configuracion?.fecha_limite || null,
        },
        transaction,
      });
      if (creada) {
        await crearSnapshot({
          accionCorrectivaId: accionCorrectiva.id,
          parametroCalidadId: campo.parametroCalidadId,
          transaction,
        });
      }
    }
    if (accionesPorCodigo.has('BLOQUEAR_CONTINUIDAD')) {
      await inspeccion.update({ estado: 'PENDIENTE_ACCION' }, { transaction });
    }
  }
};

module.exports = { evaluarCondicion, reglaSeActiva, evaluarRespuesta, valorRespuesta, esVacio };
