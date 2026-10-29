const PERMISO = 'reportes.trazabilidad_calidad.ver';
const INDICE = 'reportes_inspecciones_fecha_inicio_idx';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const indices = await queryInterface.showIndex('inspecciones', { transaction });
      if (!indices.some((indice) => indice.fields[0]?.attribute === 'fecha_inicio')) {
        await queryInterface.addIndex('inspecciones', ['fecha_inicio'], {
          name: INDICE,
          transaction,
        });
      }
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), :permiso, 'Consultar y exportar trazabilidad de calidad', 'Reportes', true, NOW(), NOW())
         ON CONFLICT (nombre) DO NOTHING`,
        { replacements: { permiso: PERMISO }, transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador' AND p.nombre = :permiso
           AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.rol_id = r.id AND rp.permiso_id = p.id)`,
        { replacements: { permiso: PERMISO }, transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${INDICE}`, { transaction });
      await queryInterface.sequelize.query(
        'DELETE FROM role_permissions WHERE permiso_id IN (SELECT id FROM permissions WHERE nombre = :permiso)',
        { replacements: { permiso: PERMISO }, transaction },
      );
      await queryInterface.sequelize.query('DELETE FROM permissions WHERE nombre = :permiso', {
        replacements: { permiso: PERMISO },
        transaction,
      });
    });
  },
};
