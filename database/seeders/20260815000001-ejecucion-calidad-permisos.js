'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const nombresPermiso = [
      'inspecciones.ver',
      'inspecciones.crear',
      'inspecciones.editar',
      'inspecciones.cerrar',
      'acciones_correctivas.ver',
      'acciones_correctivas.editar',
      'acciones_correctivas.cerrar',
      'desviaciones.ver',
      'desviaciones.editar',
      'desviaciones.cerrar',
    ];
    const [existentes] = await queryInterface.sequelize.query(
      `SELECT id, nombre FROM permissions WHERE nombre IN (${nombresPermiso.map(() => '?').join(',')})`,
      { replacements: nombresPermiso },
    );
    const mapa = new Map(existentes.map((permiso) => [permiso.nombre, permiso.id]));
    const nuevos = nombresPermiso
      .filter((nombre) => !mapa.has(nombre))
      .map((nombre) => {
        const id = uuidv4();
        mapa.set(nombre, id);
        return {
          id,
          nombre,
          descripcion: nombre.replace('.', ' '),
          modulo: nombre.startsWith('inspecciones.')
            ? 'Inspecciones'
            : nombre.startsWith('desviaciones.')
              ? 'Desviaciones'
              : 'AccionesCorrectivas',
          estado: true,
          createdAt: ahora,
          updatedAt: ahora,
        };
      });
    if (nuevos.length) await queryInterface.bulkInsert('permissions', nuevos);

    const [[administrador]] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE nombre = 'Administrador' LIMIT 1`,
    );
    if (!administrador) throw new Error('No existe el rol Administrador');
    const [asignados] = await queryInterface.sequelize.query(
      'SELECT permiso_id FROM role_permissions WHERE rol_id = ?',
      { replacements: [administrador.id] },
    );
    const idsAsignados = new Set(asignados.map((registro) => registro.permiso_id));
    const relaciones = [...mapa.values()]
      .filter((id) => !idsAsignados.has(id))
      .map((id) => ({ rol_id: administrador.id, permiso_id: id }));
    if (relaciones.length) await queryInterface.bulkInsert('role_permissions', relaciones);

    const [[usuarioAdmin]] = await queryInterface.sequelize.query(
      `SELECT id FROM usuarios WHERE rol_id = ? AND estado = true ORDER BY "createdAt" LIMIT 1`,
      { replacements: [administrador.id] },
    );
    if (!usuarioAdmin) throw new Error('No existe un usuario Administrador activo');

    const [[version]] = await queryInterface.sequelize.query(
      `SELECT vf.id
       FROM versiones_formato vf
       INNER JOIN formatos_calidad fc ON fc.id = vf.formato_calidad_id
       WHERE fc.codigo = 'TEMP-CAVA' AND vf.numero_version = 1
       LIMIT 1`,
    );
    if (!version) throw new Error('No existe la versión 1 del formato TEMP-CAVA');
    await queryInterface.bulkUpdate(
      'versiones_formato',
      {
        estado_version: 'PUBLICADO',
        publicado_por: usuarioAdmin.id,
        fecha_publicacion: ahora,
        updated_at: ahora,
      },
      { id: version.id },
    );

    const [[campo]] = await queryInterface.sequelize.query(
      `SELECT cf.id
       FROM campos_formato cf
       INNER JOIN secciones_formato sf ON sf.id = cf.seccion_formato_id
       WHERE sf.version_formato_id = ? AND cf.codigo = 'TEMPERATURA'
       LIMIT 1`,
      { replacements: [version.id] },
    );
    if (!campo) throw new Error('No existe el campo TEMPERATURA de TEMP-CAVA');
    await queryInterface.bulkUpdate(
      'campos_formato',
      { bloquear_al_guardar: true, updated_at: ahora },
      { id: campo.id },
    );

    const [[regla]] = await queryInterface.sequelize.query(
      `SELECT rc.id
       FROM reglas_calidad rc
       INNER JOIN parametros_calidad pc ON pc.id = rc.parametro_calidad_id
       WHERE pc.codigo = 'TEMPERATURA' AND rc.codigo = 'TEMP_FUERA_RANGO'
       LIMIT 1`,
    );
    if (!regla) throw new Error('No existe la regla TEMP_FUERA_RANGO');
    const codigos = ['EXIGIR_EVIDENCIA', 'SOLICITAR_ACCION_CORRECTIVA'];
    const [tipos] = await queryInterface.sequelize.query(
      `SELECT id, codigo FROM tipos_accion WHERE codigo IN (${codigos.map(() => '?').join(',')})`,
      { replacements: codigos },
    );
    for (const tipo of tipos) {
      const [[existe]] = await queryInterface.sequelize.query(
        'SELECT id FROM acciones_regla WHERE regla_calidad_id = ? AND tipo_accion_id = ? LIMIT 1',
        { replacements: [regla.id, tipo.id] },
      );
      if (!existe) {
        await queryInterface.bulkInsert('acciones_regla', [
          {
            id: uuidv4(),
            regla_calidad_id: regla.id,
            tipo_accion_id: tipo.id,
            configuracion: null,
            orden: tipo.codigo === 'EXIGIR_EVIDENCIA' ? 4 : 5,
            estado: true,
            created_at: ahora,
            updated_at: ahora,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const nombresPermiso = [
      'inspecciones.ver',
      'inspecciones.crear',
      'inspecciones.editar',
      'inspecciones.cerrar',
      'acciones_correctivas.ver',
      'acciones_correctivas.editar',
      'acciones_correctivas.cerrar',
      'desviaciones.ver',
      'desviaciones.editar',
      'desviaciones.cerrar',
    ];
    const [permisos] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE nombre IN (${nombresPermiso.map(() => '?').join(',')})`,
      { replacements: nombresPermiso },
    );
    if (permisos.length) {
      await queryInterface.bulkDelete('role_permissions', {
        permiso_id: permisos.map((p) => p.id),
      });
    }
    await queryInterface.bulkDelete('permissions', { nombre: nombresPermiso });
  },
};
