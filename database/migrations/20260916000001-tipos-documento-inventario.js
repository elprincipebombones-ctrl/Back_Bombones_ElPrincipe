'use strict';
module.exports = {
  async up(q, S) {
    await q.sequelize.transaction(async (transaction) => {
      await q.sequelize.query(
        'ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_documento_check',
        { transaction },
      );
      await q.changeColumn(
        'movimientos_inventario',
        'tipo_documento',
        { type: S.STRING(3), allowNull: false },
        { transaction },
      );
      await q.sequelize.query(
        `ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_tipo_documento_check
        CHECK (tipo_documento IN ('EN','SA','AJ','TR','AJN','AJS','TRN','TRS'))`,
        { transaction },
      );
      // Preserve receipt documents, legacy ambiguous movements and document numbers.
      await q.sequelize.query(
        `UPDATE movimientos_inventario SET tipo_documento=CASE
        WHEN origen='AJUSTE_CONTEO' AND tipo_documento='EN' THEN 'AJN'
        WHEN origen='AJUSTE_CONTEO' AND tipo_documento='SA' THEN 'AJS'
        WHEN origen='TRASLADO' AND tipo_documento='EN' THEN 'TRN'
        WHEN origen='TRASLADO' AND tipo_documento='SA' THEN 'TRS'
        ELSE tipo_documento END
        WHERE origen IN ('AJUSTE_CONTEO','TRASLADO') AND tipo_documento IN ('EN','SA')`,
        { transaction },
      );
    });
  },
  async down() {
    throw new Error(
      'Los tipos de documentos aplicados requieren una migración de recuperación explícita.',
    );
  },
};
