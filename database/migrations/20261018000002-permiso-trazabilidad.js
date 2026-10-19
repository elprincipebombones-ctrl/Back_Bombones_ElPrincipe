const NOMBRE = 'reportes.trazabilidad.ver';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `INSERT INTO permissions
          (id, nombre, descripcion, modulo, estado, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), :nombre, 'Consultar trazabilidad de producto', 'Reportes', true, NOW(), NOW())
         ON CONFLICT (nombre) DO NOTHING`,
        { replacements: { nombre: NOMBRE }, transaction },
      );
      await queryInterface.sequelize.query(
        `INSERT INTO role_permissions (rol_id, permiso_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.nombre = 'Administrador' AND p.nombre = :nombre
           AND NOT EXISTS (SELECT 1 FROM role_permissions rp
             WHERE rp.rol_id = r.id AND rp.permiso_id = p.id)`,
        { replacements: { nombre: NOMBRE }, transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permiso_id IN
          (SELECT id FROM permissions WHERE nombre = :nombre)`,
        { replacements: { nombre: NOMBRE }, transaction },
      );
      await queryInterface.sequelize.query('DELETE FROM permissions WHERE nombre = :nombre', {
        replacements: { nombre: NOMBRE },
        transaction,
      });
    });
  },
};
