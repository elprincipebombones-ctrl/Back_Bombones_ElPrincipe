'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.addColumn(
        'parametros_calidad',
        'tipo_campo_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'tipos_campo', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'valor_minimo',
        { type: Sequelize.DECIMAL, allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'valor_maximo',
        { type: Sequelize.DECIMAL, allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'precision_decimal',
        { type: Sequelize.INTEGER, allowNull: true },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'es_obligatorio_default',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'permite_observacion_default',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'requiere_evidencia_default',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        options,
      );
      await queryInterface.addColumn(
        'parametros_calidad',
        'bloquear_al_guardar_default',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        options,
      );

      await queryInterface.addColumn(
        'reglas_calidad',
        'parametro_calidad_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'parametros_calidad', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        options,
      );
      await queryInterface.addColumn(
        'reglas_calidad',
        'resultado',
        { type: Sequelize.STRING(20), allowNull: true },
        options,
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE reglas_calidad ALTER COLUMN campo_formato_id DROP NOT NULL',
        options,
      );

      await queryInterface.sequelize.query(
        `
        WITH origen AS (
          SELECT DISTINCT ON (parametro_calidad_id)
            parametro_calidad_id, tipo_campo_id, unidad_medida_id, valor_minimo,
            valor_maximo, precision_decimal, es_obligatorio, permite_observacion,
            requiere_evidencia, bloquear_al_guardar
          FROM campos_formato
          WHERE parametro_calidad_id IS NOT NULL
          ORDER BY parametro_calidad_id, updated_at DESC
        )
        UPDATE parametros_calidad p SET
          tipo_campo_id = origen.tipo_campo_id,
          unidad_medida_id = COALESCE(p.unidad_medida_id, origen.unidad_medida_id),
          valor_minimo = origen.valor_minimo,
          valor_maximo = origen.valor_maximo,
          precision_decimal = origen.precision_decimal,
          es_obligatorio_default = origen.es_obligatorio,
          permite_observacion_default = origen.permite_observacion,
          requiere_evidencia_default = origen.requiere_evidencia,
          bloquear_al_guardar_default = origen.bloquear_al_guardar
        FROM origen WHERE origen.parametro_calidad_id = p.id
      `,
        options,
      );
      await queryInterface.sequelize.query(
        `
        UPDATE parametros_calidad
        SET tipo_campo_id = (SELECT id FROM tipos_campo WHERE codigo =
          CASE WHEN unidad_medida_id IS NULL THEN 'SI_NO' ELSE 'NUMERO' END)
        WHERE tipo_campo_id IS NULL
      `,
        options,
      );
      await queryInterface.sequelize.query(
        `
        UPDATE parametros_calidad p SET
          valor_minimo = COALESCE(p.valor_minimo, inferido.valor_1::numeric),
          valor_maximo = COALESCE(p.valor_maximo, inferido.valor_2::numeric)
        FROM (
          SELECT c.parametro_calidad_id, cr.valor_1, cr.valor_2,
            ROW_NUMBER() OVER (PARTITION BY c.parametro_calidad_id ORDER BY r.created_at) posicion
          FROM reglas_calidad r
          JOIN campos_formato c ON c.id = r.campo_formato_id
          JOIN condiciones_regla cr ON cr.regla_calidad_id = r.id
          WHERE cr.operador IN ('ENTRE', 'FUERA_DE_RANGO')
        ) inferido
        WHERE inferido.parametro_calidad_id = p.id AND inferido.posicion = 1
      `,
        options,
      );
      await queryInterface.sequelize.query(
        `
        UPDATE reglas_calidad r SET parametro_calidad_id = c.parametro_calidad_id,
          resultado = COALESCE(resultado, 'NO_CUMPLE')
        FROM campos_formato c WHERE c.id = r.campo_formato_id
      `,
        options,
      );
      await queryInterface.sequelize.query(
        `
        UPDATE reglas_calidad r SET estado = false
        WHERE parametro_calidad_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM condiciones_regla c WHERE c.regla_calidad_id = r.id AND c.estado)
      `,
        options,
      );
      await queryInterface.sequelize.query(
        `
        UPDATE reglas_calidad SET campo_formato_id = NULL
        WHERE parametro_calidad_id IS NOT NULL
      `,
        options,
      );

      await queryInterface.removeConstraint(
        'reglas_calidad',
        'uq_reglas_calidad_campo_codigo',
        options,
      );
      await queryInterface.addIndex('parametros_calidad', ['tipo_campo_id'], {
        name: 'ix_parametros_calidad_tipo_campo',
        transaction,
      });
      await queryInterface.addIndex('reglas_calidad', ['parametro_calidad_id'], {
        name: 'ix_reglas_calidad_parametro',
        transaction,
      });
      await queryInterface.addIndex('reglas_calidad', ['parametro_calidad_id', 'codigo'], {
        unique: true,
        name: 'uq_reglas_calidad_parametro_codigo',
        where: { parametro_calidad_id: { [Sequelize.Op.ne]: null } },
        transaction,
      });
      await queryInterface.addConstraint('reglas_calidad', {
        fields: ['resultado'],
        type: 'check',
        name: 'ck_reglas_calidad_resultado',
        where: { resultado: ['CUMPLE', 'NO_CUMPLE'] },
        transaction,
      });

      const buscar = async (tabla, codigo) => {
        const [[registro]] = await queryInterface.sequelize.query(
          `SELECT id FROM ${tabla} WHERE codigo = :codigo`,
          { replacements: { codigo }, transaction },
        );
        if (!registro) throw new Error(`No existe ${tabla}.${codigo}`);
        return registro.id;
      };
      const ahora = new Date();
      const comun = { created_at: ahora, updated_at: ahora };
      const numeroId = await buscar('tipos_campo', 'NUMERO');
      const altaId = await buscar('niveles_severidad', 'ALTA');
      const mgId = await buscar('unidades_medida', 'MG_L');
      const phUnidadId = await buscar('unidades_medida', 'PH');

      const [[volver]] = await queryInterface.sequelize.query(
        `SELECT id FROM tipos_accion WHERE codigo = 'VOLVER_A_MEDIR'`,
        options,
      );
      if (!volver) {
        await queryInterface.bulkInsert(
          'tipos_accion',
          [
            {
              id: uuidv4(),
              codigo: 'VOLVER_A_MEDIR',
              nombre: 'Volver a medir',
              descripcion: 'Solicita registrar una nueva medición de verificación',
              estado: true,
              ...comun,
            },
          ],
          options,
        );
      }

      const [[cloroActual]] = await queryInterface.sequelize.query(
        `SELECT id FROM parametros_calidad WHERE codigo IN ('CLORO_AGUA_POTABLE', 'CLORO')
         ORDER BY CASE WHEN codigo = 'CLORO_AGUA_POTABLE' THEN 0 ELSE 1 END LIMIT 1`,
        options,
      );
      if (!cloroActual) throw new Error('No existe el parámetro base CLORO');
      await queryInterface.sequelize.query(
        `
        UPDATE parametros_calidad SET codigo='CLORO_AGUA_POTABLE', nombre='Cloro agua potable',
          tipo_campo_id=:tipo, unidad_medida_id=:unidad, valor_minimo=0.3, valor_maximo=2,
          precision_decimal=2, es_obligatorio_default=true, bloquear_al_guardar_default=true,
          permite_observacion_default=true, requiere_evidencia_default=false, updated_at=:ahora
        WHERE id=:id
      `,
        { replacements: { tipo: numeroId, unidad: mgId, ahora, id: cloroActual.id }, transaction },
      );
      const phId = await buscar('parametros_calidad', 'PH');
      await queryInterface.sequelize.query(
        `
        UPDATE parametros_calidad SET nombre='pH agua potable', tipo_campo_id=:tipo,
          unidad_medida_id=:unidad, valor_minimo=6.5, valor_maximo=9,
          precision_decimal=2, es_obligatorio_default=true, bloquear_al_guardar_default=true,
          permite_observacion_default=true, requiere_evidencia_default=false, updated_at=:ahora
        WHERE id=:id
      `,
        { replacements: { tipo: numeroId, unidad: phUnidadId, ahora, id: phId }, transaction },
      );

      const accionIds = {};
      for (const codigo of ['GENERAR_ALERTA', 'VOLVER_A_MEDIR', 'SOLICITAR_ACCION_CORRECTIVA']) {
        accionIds[codigo] = await buscar('tipos_accion', codigo);
      }
      const crearEscenario = async ({
        parametroId,
        codigo,
        nombre,
        operador,
        valor1,
        valor2,
        resultado,
        mensaje,
        acciones,
        descripcionAccion,
      }) => {
        const [[existente]] = await queryInterface.sequelize.query(
          `SELECT id FROM reglas_calidad WHERE parametro_calidad_id=:parametroId AND codigo=:codigo`,
          { replacements: { parametroId, codigo }, transaction },
        );
        const reglaId = existente?.id || uuidv4();
        if (existente) {
          await queryInterface.sequelize.query(
            `
            UPDATE reglas_calidad SET nombre=:nombre, nivel_severidad_id=:severidad,
              mensaje_incumplimiento=:mensaje, resultado=:resultado, estado=true,
              campo_formato_id=NULL, updated_at=:ahora WHERE id=:id
          `,
            {
              replacements: {
                nombre,
                severidad: resultado === 'NO_CUMPLE' ? altaId : null,
                mensaje,
                resultado,
                ahora,
                id: reglaId,
              },
              transaction,
            },
          );
        } else {
          await queryInterface.bulkInsert(
            'reglas_calidad',
            [
              {
                id: reglaId,
                parametro_calidad_id: parametroId,
                campo_formato_id: null,
                codigo,
                nombre,
                descripcion: null,
                nivel_severidad_id: resultado === 'NO_CUMPLE' ? altaId : null,
                mensaje_incumplimiento: mensaje,
                operador_logico: 'AND',
                resultado,
                estado: true,
                ...comun,
              },
            ],
            options,
          );
        }
        await queryInterface.bulkDelete(
          'condiciones_regla',
          { regla_calidad_id: reglaId },
          options,
        );
        await queryInterface.bulkDelete('acciones_regla', { regla_calidad_id: reglaId }, options);
        await queryInterface.bulkInsert(
          'condiciones_regla',
          [
            {
              id: uuidv4(),
              regla_calidad_id: reglaId,
              tipo_condicion: 'RANGO',
              operador,
              valor_1: String(valor1),
              valor_2: valor2 === null ? null : String(valor2),
              valor_json: null,
              orden: 1,
              estado: true,
              ...comun,
            },
          ],
          options,
        );
        if (acciones.length) {
          await queryInterface.bulkInsert(
            'acciones_regla',
            acciones.map((codigoAccion, indice) => ({
              id: uuidv4(),
              regla_calidad_id: reglaId,
              tipo_accion_id: accionIds[codigoAccion],
              configuracion:
                descripcionAccion && indice === 0
                  ? JSON.stringify({ descripcion: descripcionAccion })
                  : null,
              orden: indice + 1,
              estado: true,
              ...comun,
            })),
            options,
          );
        }
      };

      const escenarios = [
        {
          parametroId: cloroActual.id,
          codigo: 'CLORO_BAJO',
          nombre: 'Cloro por debajo del rango',
          operador: 'MENOR_QUE',
          valor1: 0.3,
          valor2: null,
          resultado: 'NO_CUMPLE',
          mensaje: 'Cloro residual por debajo de 0.3 mg/l.',
          acciones: ['GENERAR_ALERTA', 'VOLVER_A_MEDIR', 'SOLICITAR_ACCION_CORRECTIVA'],
        },
        {
          parametroId: cloroActual.id,
          codigo: 'CLORO_NORMAL',
          nombre: 'Cloro dentro del rango',
          operador: 'ENTRE',
          valor1: 0.3,
          valor2: 2,
          resultado: 'CUMPLE',
          mensaje: 'Valor dentro del rango permitido.',
          acciones: [],
        },
        {
          parametroId: cloroActual.id,
          codigo: 'CLORO_ALTO',
          nombre: 'Cloro por encima del rango',
          operador: 'MAYOR_QUE',
          valor1: 2,
          valor2: null,
          resultado: 'NO_CUMPLE',
          mensaje: 'Cloro residual superior a 2.0 mg/l.',
          acciones: ['GENERAR_ALERTA', 'SOLICITAR_ACCION_CORRECTIVA'],
          descripcionAccion: 'Ajustar concentración de cloro.',
        },
        {
          parametroId: phId,
          codigo: 'PH_BAJO',
          nombre: 'pH por debajo del rango',
          operador: 'MENOR_QUE',
          valor1: 6.5,
          valor2: null,
          resultado: 'NO_CUMPLE',
          mensaje: 'pH por debajo de 6.5.',
          acciones: ['GENERAR_ALERTA', 'VOLVER_A_MEDIR', 'SOLICITAR_ACCION_CORRECTIVA'],
        },
        {
          parametroId: phId,
          codigo: 'PH_NORMAL',
          nombre: 'pH dentro del rango',
          operador: 'ENTRE',
          valor1: 6.5,
          valor2: 9,
          resultado: 'CUMPLE',
          mensaje: 'Valor dentro del rango permitido.',
          acciones: [],
        },
        {
          parametroId: phId,
          codigo: 'PH_ALTO',
          nombre: 'pH por encima del rango',
          operador: 'MAYOR_QUE',
          valor1: 9,
          valor2: null,
          resultado: 'NO_CUMPLE',
          mensaje: 'pH superior a 9.0.',
          acciones: ['GENERAR_ALERTA', 'VOLVER_A_MEDIR', 'SOLICITAR_ACCION_CORRECTIVA'],
        },
      ];
      for (const escenario of escenarios) await crearEscenario(escenario);
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.bulkDelete(
        'reglas_calidad',
        {
          codigo: ['CLORO_BAJO', 'CLORO_NORMAL', 'CLORO_ALTO', 'PH_BAJO', 'PH_NORMAL', 'PH_ALTO'],
        },
        options,
      );
      await queryInterface.sequelize.query(
        `
        WITH origen AS (
          SELECT DISTINCT ON (parametro_calidad_id) parametro_calidad_id, id
          FROM campos_formato
          WHERE parametro_calidad_id IS NOT NULL
          ORDER BY parametro_calidad_id, updated_at DESC
        )
        UPDATE reglas_calidad r SET campo_formato_id = origen.id
        FROM origen
        WHERE r.campo_formato_id IS NULL
          AND r.parametro_calidad_id = origen.parametro_calidad_id
      `,
        options,
      );
      await queryInterface.removeConstraint(
        'reglas_calidad',
        'ck_reglas_calidad_resultado',
        options,
      );
      await queryInterface.removeIndex(
        'reglas_calidad',
        'uq_reglas_calidad_parametro_codigo',
        options,
      );
      await queryInterface.removeIndex('reglas_calidad', 'ix_reglas_calidad_parametro', options);
      await queryInterface.removeIndex(
        'parametros_calidad',
        'ix_parametros_calidad_tipo_campo',
        options,
      );
      await queryInterface.addConstraint('reglas_calidad', {
        fields: ['campo_formato_id', 'codigo'],
        type: 'unique',
        name: 'uq_reglas_calidad_campo_codigo',
        transaction,
      });
      await queryInterface.removeColumn('reglas_calidad', 'resultado', options);
      await queryInterface.removeColumn('reglas_calidad', 'parametro_calidad_id', options);
      await queryInterface.sequelize.query(
        'ALTER TABLE reglas_calidad ALTER COLUMN campo_formato_id SET NOT NULL',
        options,
      );
      for (const columna of [
        'bloquear_al_guardar_default',
        'requiere_evidencia_default',
        'permite_observacion_default',
        'es_obligatorio_default',
        'precision_decimal',
        'valor_maximo',
        'valor_minimo',
        'tipo_campo_id',
      ]) {
        await queryInterface.removeColumn('parametros_calidad', columna, options);
      }
    });
  },
};
