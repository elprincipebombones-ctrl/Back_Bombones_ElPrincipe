'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const [[existe]] = await queryInterface.sequelize.query(
      `SELECT id FROM formatos_calidad WHERE codigo = 'TEMP-CAVA'`,
    );
    if (existe) return;

    const buscar = async (tabla, codigo) => {
      const [[registro]] = await queryInterface.sequelize.query(
        `SELECT id FROM ${tabla} WHERE codigo = ?`,
        { replacements: [codigo] },
      );
      if (!registro)
        throw new Error(`No existe ${tabla}.${codigo}; ejecute primero el seeder de catálogos`);
      return registro.id;
    };
    const tipoInspeccionId = await buscar('tipos_inspeccion', 'ALMACENAMIENTO');
    const unidadId = await buscar('unidades_medida', 'CELSIUS');
    const parametroId = await buscar('parametros_calidad', 'TEMPERATURA');
    const tipoCampoId = await buscar('tipos_campo', 'NUMERO');
    const severidadId = await buscar('niveles_severidad', 'ALTA');
    const tiposAccion = await Promise.all(
      ['MARCAR_NO_CUMPLE', 'EXIGIR_OBSERVACION', 'GENERAR_ALERTA'].map((codigo) =>
        buscar('tipos_accion', codigo),
      ),
    );
    const ahora = new Date();
    const comun = { created_at: ahora, updated_at: ahora };
    const formatoId = uuidv4();
    const versionId = uuidv4();
    const seccionId = uuidv4();
    const campoId = uuidv4();
    const reglaId = uuidv4();

    await queryInterface.bulkInsert('formatos_calidad', [
      {
        id: formatoId,
        codigo: 'TEMP-CAVA',
        nombre: 'Control de temperatura cuarto frío',
        descripcion: 'Ejemplo de configuración del motor de calidad',
        tipo_inspeccion_id: tipoInspeccionId,
        estado: true,
        ...comun,
      },
    ]);
    await queryInterface.bulkInsert('versiones_formato', [
      {
        id: versionId,
        formato_calidad_id: formatoId,
        numero_version: 1,
        fecha_vigencia_desde: ahora,
        fecha_vigencia_hasta: null,
        estado_version: 'BORRADOR',
        observaciones: 'Versión de prueba para validar relaciones',
        publicado_por: null,
        fecha_publicacion: null,
        ...comun,
      },
    ]);
    await queryInterface.bulkInsert('secciones_formato', [
      {
        id: seccionId,
        version_formato_id: versionId,
        nombre: 'Mediciones',
        descripcion: null,
        orden: 1,
        estado: true,
        ...comun,
      },
    ]);
    await queryInterface.bulkInsert('campos_formato', [
      {
        id: campoId,
        seccion_formato_id: seccionId,
        parametro_calidad_id: parametroId,
        tipo_campo_id: tipoCampoId,
        unidad_medida_id: unidadId,
        codigo: 'TEMPERATURA',
        etiqueta: 'Temperatura',
        descripcion: null,
        texto_ayuda: 'Registre la temperatura observada en °C',
        es_obligatorio: true,
        orden: 1,
        valor_minimo: null,
        valor_maximo: null,
        precision_decimal: 1,
        permite_observacion: true,
        requiere_evidencia: false,
        estado: true,
        ...comun,
      },
    ]);
    await queryInterface.bulkInsert('reglas_calidad', [
      {
        id: reglaId,
        campo_formato_id: campoId,
        codigo: 'TEMP_FUERA_RANGO',
        nombre: 'Temperatura fuera de rango',
        descripcion: null,
        nivel_severidad_id: severidadId,
        mensaje_incumplimiento: 'La temperatura debe estar entre 0 y 4 °C',
        operador_logico: 'AND',
        estado: true,
        ...comun,
      },
    ]);
    await queryInterface.bulkInsert('condiciones_regla', [
      {
        id: uuidv4(),
        regla_calidad_id: reglaId,
        tipo_condicion: 'RANGO',
        operador: 'FUERA_DE_RANGO',
        valor_1: '0',
        valor_2: '4',
        valor_json: null,
        orden: 1,
        estado: true,
        ...comun,
      },
    ]);
    await queryInterface.bulkInsert(
      'acciones_regla',
      tiposAccion.map((tipoAccionId, indice) => ({
        id: uuidv4(),
        regla_calidad_id: reglaId,
        tipo_accion_id: tipoAccionId,
        configuracion: null,
        orden: indice + 1,
        estado: true,
        ...comun,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('formatos_calidad', { codigo: 'TEMP-CAVA' });
  },
};
