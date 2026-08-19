'use strict';

const { QueryTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const obtenerUno = (queryInterface, sql, replacements, transaction) =>
  queryInterface.sequelize.query(sql, { replacements, type: QueryTypes.SELECT, transaction })
    .then(([fila]) => fila);

const asegurarFormato = async (queryInterface, datos, tipoInspeccionId, transaction) => {
  let formato = await obtenerUno(
    queryInterface,
    'SELECT id FROM formatos_calidad WHERE codigo = :codigo',
    { codigo: datos.codigo },
    transaction,
  );
  const ahora = new Date();
  if (!formato) {
    formato = await obtenerUno(
      queryInterface,
      `INSERT INTO formatos_calidad
         (id, codigo, nombre, descripcion, tipo_inspeccion_id, estado, created_at, updated_at)
       VALUES (:id, :codigo, :nombre, :descripcion, :tipoInspeccionId, true, :ahora, :ahora)
       RETURNING id`,
      { id: uuidv4(), tipoInspeccionId, ahora, ...datos },
      transaction,
    );
  }
  let version = await obtenerUno(
    queryInterface,
    `SELECT id FROM versiones_formato
     WHERE formato_calidad_id = :formatoId AND numero_version = 1`,
    { formatoId: formato.id },
    transaction,
  );
  if (!version) {
    version = await obtenerUno(
      queryInterface,
      `INSERT INTO versiones_formato
         (id, formato_calidad_id, numero_version, fecha_vigencia_desde, estado_version,
          observaciones, created_at, updated_at)
       VALUES (:id, :formatoId, 1, :fecha, 'BORRADOR', :observaciones, :ahora, :ahora)
       RETURNING id`,
      {
        id: uuidv4(), formatoId: formato.id, fecha: '2026-08-17',
        observaciones: 'Ejemplo inicial de checklist reutilizable', ahora,
      },
      transaction,
    );
  }
  let seccion = await obtenerUno(
    queryInterface,
    `SELECT id FROM secciones_formato
     WHERE version_formato_id = :versionId AND nombre = :seccion`,
    { versionId: version.id, seccion: datos.seccion },
    transaction,
  );
  if (!seccion) {
    seccion = await obtenerUno(
      queryInterface,
      `INSERT INTO secciones_formato
         (id, version_formato_id, nombre, descripcion, orden, estado, created_at, updated_at)
       VALUES (:id, :versionId, :nombre, NULL, 1, true, :ahora, :ahora)
       RETURNING id`,
      { id: uuidv4(), versionId: version.id, nombre: datos.seccion, ahora },
      transaction,
    );
  }
  return seccion.id;
};

const asegurarChecklist = async (
  queryInterface, seccionId, nombre, criterioId, categorias, excluidos, transaction,
) => {
  const existente = await obtenerUno(
    queryInterface,
    `SELECT id FROM checklists_seccion
     WHERE seccion_formato_id = :seccionId AND nombre = :nombre`,
    { seccionId, nombre },
    transaction,
  );
  if (existente) {
    await queryInterface.sequelize.query(
      `UPDATE elementos_checklist ec SET
         codigo_snapshot = e.codigo,
         nombre_snapshot = e.nombre,
         updated_at = NOW()
       FROM elementos_inspeccion e
       WHERE ec.elemento_inspeccion_id = e.id AND ec.checklist_seccion_id = :checklistId`,
      { replacements: { checklistId: existente.id }, transaction },
    );
    return;
  }
  const ahora = new Date();
  const checklist = await obtenerUno(
    queryInterface,
    `INSERT INTO checklists_seccion
       (id, seccion_formato_id, criterio_inspeccion_id, nombre, descripcion,
        orden, estado, created_at, updated_at)
     VALUES (:id, :seccionId, :criterioId, :nombre, NULL, 1, true, :ahora, :ahora)
     RETURNING id`,
    { id: uuidv4(), seccionId, criterioId, nombre, ahora },
    transaction,
  );
  const elementos = await queryInterface.sequelize.query(
    `SELECT e.id, e.codigo, e.nombre
     FROM elementos_inspeccion e
     JOIN categorias_elemento c ON c.id = e.categoria_elemento_id
     WHERE c.codigo IN (:categorias) AND e.codigo NOT IN (:excluidos) AND e.estado = true
     ORDER BY c.orden, e.orden, e.nombre`,
    {
      replacements: { categorias, excluidos: excluidos.length ? excluidos : ['__NINGUNO__'] },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  if (elementos.length) {
    await queryInterface.bulkInsert('elementos_checklist', elementos.map((elemento, indice) => ({
      id: uuidv4(),
      checklist_seccion_id: checklist.id,
      elemento_inspeccion_id: elemento.id,
      codigo_snapshot: elemento.codigo,
      nombre_snapshot: elemento.nombre,
      orden: indice + 1,
      estado: true,
      created_at: ahora,
      updated_at: ahora,
    })), { transaction });
  }
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const tipo = await obtenerUno(
        queryInterface,
        `SELECT id FROM tipos_inspeccion WHERE codigo = 'LOCATIVA'`,
        {},
        transaction,
      );
      const criterio = await obtenerUno(
        queryInterface,
        `SELECT id FROM criterios_inspeccion WHERE codigo = 'LIMPIO_DESINFECTADO'`,
        {},
        transaction,
      );
      if (!tipo || !criterio) throw new Error('Faltan LOCATIVA o LIMPIO_DESINFECTADO');

      const seccionEquipos = await asegurarFormato(queryInterface, {
        codigo: 'VERIF_DIARIA_LYD',
        nombre: 'LISTADO DE VERIFICACIÓN DIARIA LYD',
        descripcion: 'Ejemplo de checklist reutilizable para limpieza y desinfección diaria',
        seccion: 'Equipos',
      }, tipo.id, transaction);
      await asegurarChecklist(
        queryInterface,
        seccionEquipos,
        'Limpieza y desinfección de equipos',
        criterio.id,
        ['EQUIPOS'],
        ['HORNO', 'TERMOMETRO'],
        transaction,
      );

      const formatoBanos = await obtenerUno(
        queryInterface,
        `SELECT id FROM formatos_calidad WHERE codigo = 'VERIF_LYD_BANOS'`,
        {},
        transaction,
      );
      if (formatoBanos) {
        await queryInterface.sequelize.query(
          `DELETE FROM secciones_formato
           WHERE nombre = 'Baños' AND version_formato_id IN
             (SELECT id FROM versiones_formato WHERE formato_calidad_id = :formatoId)`,
          { replacements: { formatoId: formatoBanos.id }, transaction },
        );
      }
      const datosBanos = {
        codigo: 'VERIF_LYD_BANOS',
        nombre: 'VERIFICACIÓN LIMPIEZA Y DESINFECCIÓN BAÑOS',
        descripcion: 'Ejemplo de checklist reutilizable para baños',
        seccion: 'Áreas',
      };
      const seccionAreas = await asegurarFormato(queryInterface, datosBanos, tipo.id, transaction);
      await asegurarChecklist(
        queryInterface,
        seccionAreas,
        'Limpieza y desinfección de áreas',
        criterio.id,
        ['AREAS_SUPERFICIES'],
        [],
        transaction,
      );
      const seccionSurtido = await asegurarFormato(
        queryInterface,
        { ...datosBanos, seccion: 'Surtido' },
        tipo.id,
        transaction,
      );
      await asegurarChecklist(
        queryInterface,
        seccionSurtido,
        'Verificación de surtido de baños',
        criterio.id,
        ['SURTIDO'],
        [],
        transaction,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('formatos_calidad', {
      codigo: ['VERIF_DIARIA_LYD', 'VERIF_LYD_BANOS'],
    });
  },
};
