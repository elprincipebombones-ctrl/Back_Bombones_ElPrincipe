'use strict';

const { QueryTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const categorias = [
  { codigo: 'EQUIPOS', nombre: 'Equipos', orden: 1 },
  { codigo: 'UTENSILIOS', nombre: 'Utensilios', orden: 2 },
  { codigo: 'AREAS_SUPERFICIES', nombre: 'Áreas y superficies', orden: 3 },
  { codigo: 'SURTIDO', nombre: 'Surtido', orden: 4 },
];

const elementos = {
  EQUIPOS: [
    ['BALANZAS', 'Balanzas'],
    ['BASCULAS', 'Básculas'],
    ['CLIPADORA', 'Clipadora'],
    ['DESHUESADORA', 'Deshuesadora'],
    ['DESPRESADORA_POLLO', 'Despresadora de pollo'],
    ['DOSIFICADOR_SALSAS', 'Dosificador de salsas'],
    ['EMBUTIDORA', 'Embutidora'],
    ['EMPACADORA_BANDEJAS', 'Empacadora de bandejas'],
    ['HORNO', 'Horno'],
    ['LICUADORA_SALSA_1', 'Licuadora salsa #1'],
    ['LICUADORA_SALSA_2', 'Licuadora salsa #2'],
    ['LICUADORA_BATIDO', 'Licuadora batido'],
    ['MEZCLADOR_1_MOLIDA', 'Mezclador #1 Molida'],
    ['MEZCLADOR_1_ADOBO', 'Mezclador #1 Adobo'],
    ['TERMOMETRO', 'Termómetro'],
  ],
  UTENSILIOS: [
    ['GUANTES', 'Guantes'],
    ['CUCHILLOS', 'Cuchillos'],
    ['TABLAS', 'Tablas'],
    ['RECIPIENTES', 'Recipientes'],
    ['BALDES', 'Baldes'],
    ['CANASTAS', 'Canastas'],
    ['MESAS', 'Mesas'],
  ],
  AREAS_SUPERFICIES: [
    ['PISOS', 'Pisos'],
    ['PAREDES', 'Paredes'],
    ['PUERTAS_DIVISORES', 'Puertas y divisores'],
    ['ESPEJOS', 'Espejos'],
    ['LOCKERS', 'Lockers'],
    ['INTERRUPTORES_ILUMINACION', 'Interruptores de iluminación'],
    ['TOMACORRIENTES', 'Tomas corrientes'],
    ['LAMPARAS', 'Lámparas'],
    ['SANITARIOS', 'Sanitarios'],
    ['LAVAMANOS', 'Lavamanos'],
    ['CANECAS_BASURA', 'Canecas de basura'],
  ],
  SURTIDO: [
    ['DISPENSADOR_JABON_MANOS', 'Dispensador de jabón de manos'],
    ['DISPENSADOR_DESINFECTANTE', 'Dispensador de desinfectante'],
    ['SECADOR_MANOS', 'Secador de manos'],
    ['JABON_MANOS', 'Jabón para manos'],
    ['DESINFECTANTE', 'Desinfectante'],
    ['PAPEL_HIGIENICO', 'Papel higiénico'],
  ],
};

const upsertCodigo = async (queryInterface, tabla, registro, transaction) => {
  const columnas = Object.keys(registro);
  const nombres = columnas.join(', ');
  const valores = columnas.map((columna) => `:${columna}`).join(', ');
  const actualizaciones = columnas
    .filter((columna) => !['id', 'codigo', 'created_at'].includes(columna))
    .map((columna) => `${columna} = EXCLUDED.${columna}`)
    .join(', ');
  const [fila] = await queryInterface.sequelize.query(
    `INSERT INTO ${tabla} (${nombres}) VALUES (${valores})
     ON CONFLICT (codigo) DO UPDATE SET ${actualizaciones}
     RETURNING id`,
    { replacements: registro, type: QueryTypes.SELECT, transaction },
  );
  return fila.id;
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const ahora = new Date();
      const categoriaIds = {};
      for (const categoria of categorias) {
        categoriaIds[categoria.codigo] = await upsertCodigo(
          queryInterface,
          'categorias_elemento',
          {
            id: uuidv4(),
            descripcion: null,
            estado: true,
            created_at: ahora,
            updated_at: ahora,
            ...categoria,
          },
          transaction,
        );
      }

      for (const [codigoCategoria, lista] of Object.entries(elementos)) {
        for (const [indice, [codigo, nombre]] of lista.entries()) {
          await upsertCodigo(
            queryInterface,
            'elementos_inspeccion',
            {
              id: uuidv4(),
              categoria_elemento_id: categoriaIds[codigoCategoria],
              codigo,
              nombre,
              descripcion: null,
              orden: indice + 1,
              estado: true,
              created_at: ahora,
              updated_at: ahora,
            },
            transaction,
          );
        }
      }

      const [[tipoSiNo], [severidadAlta]] = await Promise.all([
        queryInterface.sequelize.query(`SELECT id FROM tipos_campo WHERE codigo = 'SI_NO'`, {
          type: QueryTypes.SELECT,
          transaction,
        }),
        queryInterface.sequelize.query(`SELECT id FROM niveles_severidad WHERE codigo = 'ALTA'`, {
          type: QueryTypes.SELECT,
          transaction,
        }),
      ]);
      if (!tipoSiNo || !severidadAlta) {
        throw new Error('Faltan los catálogos SI_NO o severidad ALTA para crear los criterios.');
      }

      const criterios = [
        {
          codigo: 'LIMPIO_DESINFECTADO',
          nombre: 'Limpio y desinfectado',
          pregunta: '¿El elemento se encuentra limpio y desinfectado?',
          mensaje_incumplimiento: 'El elemento no se encuentra limpio y desinfectado.',
        },
        {
          codigo: 'CUMPLE_CONDICION',
          nombre: 'Cumple condición',
          pregunta: '¿El elemento cumple con la condición requerida?',
          mensaje_incumplimiento: 'El elemento no cumple con la condición esperada.',
        },
      ];
      const criterioIds = [];
      for (const criterio of criterios) {
        criterioIds.push(
          await upsertCodigo(
            queryInterface,
            'criterios_inspeccion',
            {
              id: uuidv4(),
              tipo_campo_id: tipoSiNo.id,
              resultado_esperado: 'CUMPLE',
              permite_observacion: true,
              requiere_evidencia: false,
              nivel_severidad_id: severidadAlta.id,
              estado: true,
              created_at: ahora,
              updated_at: ahora,
              ...criterio,
            },
            transaction,
          ),
        );
      }

      const acciones = await queryInterface.sequelize.query(
        `SELECT id, codigo FROM tipos_accion
         WHERE codigo IN ('GENERAR_ALERTA', 'EXIGIR_OBSERVACION', 'SOLICITAR_ACCION_CORRECTIVA')`,
        { type: QueryTypes.SELECT, transaction },
      );
      const ordenAccion = new Map([
        ['GENERAR_ALERTA', 1],
        ['EXIGIR_OBSERVACION', 2],
        ['SOLICITAR_ACCION_CORRECTIVA', 3],
      ]);
      for (const criterioId of criterioIds) {
        for (const accion of acciones) {
          await queryInterface.sequelize.query(
            `INSERT INTO acciones_criterio
               (id, criterio_inspeccion_id, tipo_accion_id, orden, estado, created_at, updated_at)
             VALUES (:id, :criterioId, :tipoAccionId, :orden, true, :ahora, :ahora)
             ON CONFLICT (criterio_inspeccion_id, tipo_accion_id)
             DO UPDATE SET orden = EXCLUDED.orden, estado = true, updated_at = EXCLUDED.updated_at`,
            {
              replacements: {
                id: uuidv4(),
                criterioId,
                tipoAccionId: accion.id,
                orden: ordenAccion.get(accion.codigo),
                ahora,
              },
              transaction,
            },
          );
        }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DELETE FROM acciones_criterio WHERE criterio_inspeccion_id IN
          (SELECT id FROM criterios_inspeccion WHERE codigo IN ('LIMPIO_DESINFECTADO', 'CUMPLE_CONDICION'))`,
        { transaction },
      );
      await queryInterface.bulkDelete(
        'criterios_inspeccion',
        {
          codigo: ['LIMPIO_DESINFECTADO', 'CUMPLE_CONDICION'],
        },
        { transaction },
      );
      await queryInterface.bulkDelete(
        'elementos_inspeccion',
        {
          codigo: Object.values(elementos)
            .flat()
            .map(([codigo]) => codigo),
        },
        { transaction },
      );
      await queryInterface.bulkDelete(
        'categorias_elemento',
        {
          codigo: categorias.map(({ codigo }) => codigo),
        },
        { transaction },
      );
    });
  },
};
