'use strict';

const { v4: uuidv4 } = require('uuid');

const insertarFaltantes = async (queryInterface, tabla, registros) => {
  const [existentes] = await queryInterface.sequelize.query(`SELECT codigo FROM ${tabla}`);
  const codigos = new Set(existentes.map((registro) => registro.codigo));
  const ahora = new Date();
  const nuevos = registros
    .filter((registro) => !codigos.has(registro.codigo))
    .map((registro) => ({
      id: uuidv4(),
      descripcion: null,
      estado: true,
      created_at: ahora,
      updated_at: ahora,
      ...registro,
    }));
  if (nuevos.length) await queryInterface.bulkInsert(tabla, nuevos);
};

module.exports = {
  async up(queryInterface) {
    await insertarFaltantes(queryInterface, 'tipos_inspeccion', [
      { codigo: 'RECEPCION', nombre: 'Recepción' },
      { codigo: 'PROCESO', nombre: 'Proceso' },
      { codigo: 'ALMACENAMIENTO', nombre: 'Almacenamiento' },
      { codigo: 'LOCATIVA', nombre: 'Locativa' },
      { codigo: 'DESPACHO', nombre: 'Despacho' },
      { codigo: 'LABORATORIO', nombre: 'Laboratorio' },
    ]);
    await insertarFaltantes(queryInterface, 'unidades_medida', [
      { codigo: 'CELSIUS', nombre: 'Grados Celsius', simbolo: '°C' },
      { codigo: 'PH', nombre: 'pH', simbolo: 'pH' },
      { codigo: 'PORCENTAJE', nombre: 'Porcentaje', simbolo: '%' },
      { codigo: 'PPM', nombre: 'Partes por millón', simbolo: 'ppm' },
    ]);
    await insertarFaltantes(queryInterface, 'tipos_campo', [
      { codigo: 'TEXTO', nombre: 'Texto', permite_opciones: false, permite_unidad: false },
      {
        codigo: 'TEXTO_LARGO',
        nombre: 'Texto largo',
        permite_opciones: false,
        permite_unidad: false,
      },
      { codigo: 'NUMERO', nombre: 'Número', permite_opciones: false, permite_unidad: true },
      { codigo: 'SI_NO', nombre: 'Sí/No', permite_opciones: false, permite_unidad: false },
      {
        codigo: 'SELECCION_UNICA',
        nombre: 'Selección única',
        permite_opciones: true,
        permite_unidad: false,
      },
      {
        codigo: 'SELECCION_MULTIPLE',
        nombre: 'Selección múltiple',
        permite_opciones: true,
        permite_unidad: false,
      },
      { codigo: 'FECHA', nombre: 'Fecha', permite_opciones: false, permite_unidad: false },
      { codigo: 'HORA', nombre: 'Hora', permite_opciones: false, permite_unidad: false },
      {
        codigo: 'FECHA_HORA',
        nombre: 'Fecha y hora',
        permite_opciones: false,
        permite_unidad: false,
      },
      { codigo: 'ARCHIVO', nombre: 'Archivo', permite_opciones: false, permite_unidad: false },
    ]);
    await insertarFaltantes(queryInterface, 'niveles_severidad', [
      { codigo: 'BAJA', nombre: 'Baja', orden: 1 },
      { codigo: 'MEDIA', nombre: 'Media', orden: 2 },
      { codigo: 'ALTA', nombre: 'Alta', orden: 3 },
      { codigo: 'CRITICA', nombre: 'Crítica', orden: 4 },
    ]);
    await insertarFaltantes(queryInterface, 'tipos_accion', [
      { codigo: 'MARCAR_NO_CUMPLE', nombre: 'Marcar no cumple' },
      { codigo: 'GENERAR_ALERTA', nombre: 'Generar alerta' },
      { codigo: 'EXIGIR_OBSERVACION', nombre: 'Exigir observación' },
      { codigo: 'EXIGIR_EVIDENCIA', nombre: 'Exigir evidencia' },
      { codigo: 'BLOQUEAR_CONTINUIDAD', nombre: 'Bloquear continuidad' },
      { codigo: 'SOLICITAR_ACCION_CORRECTIVA', nombre: 'Solicitar acción correctiva' },
    ]);

    const [[celsius]] = await queryInterface.sequelize.query(
      `SELECT id FROM unidades_medida WHERE codigo = 'CELSIUS'`,
    );
    const [[ph]] = await queryInterface.sequelize.query(
      `SELECT id FROM unidades_medida WHERE codigo = 'PH'`,
    );
    const [[porcentaje]] = await queryInterface.sequelize.query(
      `SELECT id FROM unidades_medida WHERE codigo = 'PORCENTAJE'`,
    );
    const [[ppm]] = await queryInterface.sequelize.query(
      `SELECT id FROM unidades_medida WHERE codigo = 'PPM'`,
    );
    await insertarFaltantes(queryInterface, 'parametros_calidad', [
      { codigo: 'TEMPERATURA', nombre: 'Temperatura', unidad_medida_id: celsius.id },
      { codigo: 'PH', nombre: 'pH', unidad_medida_id: ph.id },
      { codigo: 'CLORO', nombre: 'Cloro', unidad_medida_id: ppm.id },
      { codigo: 'HUMEDAD', nombre: 'Humedad', unidad_medida_id: porcentaje.id },
      { codigo: 'COLOR', nombre: 'Color', unidad_medida_id: null },
      { codigo: 'OLOR', nombre: 'Olor', unidad_medida_id: null },
      { codigo: 'APARIENCIA', nombre: 'Apariencia', unidad_medida_id: null },
      { codigo: 'LIMPIEZA', nombre: 'Limpieza', unidad_medida_id: null },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('parametros_calidad', {
      codigo: ['TEMPERATURA', 'PH', 'CLORO', 'HUMEDAD', 'COLOR', 'OLOR', 'APARIENCIA', 'LIMPIEZA'],
    });
    await queryInterface.bulkDelete('tipos_accion', {
      codigo: [
        'MARCAR_NO_CUMPLE',
        'GENERAR_ALERTA',
        'EXIGIR_OBSERVACION',
        'EXIGIR_EVIDENCIA',
        'BLOQUEAR_CONTINUIDAD',
        'SOLICITAR_ACCION_CORRECTIVA',
      ],
    });
    await queryInterface.bulkDelete('niveles_severidad', {
      codigo: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'],
    });
    await queryInterface.bulkDelete('tipos_campo', {
      codigo: [
        'TEXTO',
        'TEXTO_LARGO',
        'NUMERO',
        'SI_NO',
        'SELECCION_UNICA',
        'SELECCION_MULTIPLE',
        'FECHA',
        'HORA',
        'FECHA_HORA',
        'ARCHIVO',
      ],
    });
    await queryInterface.bulkDelete('unidades_medida', {
      codigo: ['CELSIUS', 'PH', 'PORCENTAJE', 'PPM'],
    });
    await queryInterface.bulkDelete('tipos_inspeccion', {
      codigo: ['RECEPCION', 'PROCESO', 'ALMACENAMIENTO', 'LOCATIVA', 'DESPACHO', 'LABORATORIO'],
    });
  },
};
