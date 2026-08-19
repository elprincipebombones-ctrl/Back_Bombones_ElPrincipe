const db = require('../models');

const tablasOperativas = [
  'inspecciones',
  'respuestas_inspeccion',
  'respuestas_opciones',
  'desviaciones',
  'acciones_correctivas',
  'seguimientos_accion_correctiva',
  'evidencias_accion_correctiva',
];

const ejecutar = async () => {
  const [tablas] = await db.sequelize.query(
    `SELECT count(*)::int total FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN(:tablas)`,
    { replacements: { tablas: tablasOperativas } },
  );
  const [fks] = await db.sequelize.query(
    `SELECT count(*)::int total FROM information_schema.table_constraints
     WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
       AND table_name IN(:tablas)`,
    { replacements: { tablas: tablasOperativas } },
  );
  const [indices] = await db.sequelize.query(
    `SELECT count(*)::int total FROM pg_indexes
     WHERE schemaname = 'public' AND tablename IN(:tablas)`,
    { replacements: { tablas: tablasOperativas } },
  );
  const permisos = await db.Permiso.count({
    where: { modulo: ['Inspecciones', 'AccionesCorrectivas', 'Desviaciones'] },
  });
  const ultima = await db.Inspeccion.findOne({
    order: [['created_at', 'DESC']],
    include: [
      { model: db.RespuestaInspeccion, as: 'respuestas' },
      {
        model: db.Desviacion,
        as: 'desviaciones',
        include: [
          {
            model: db.AccionCorrectiva,
            as: 'accionesCorrectivas',
            include: [
              { model: db.SeguimientoAccionCorrectiva, as: 'seguimientos' },
              { model: db.EvidenciaAccionCorrectiva, as: 'evidencias' },
            ],
          },
        ],
      },
    ],
  });
  const acciones = ultima?.desviaciones[0]?.accionesCorrectivas || [];
  console.log(
    JSON.stringify(
      {
        tablas: tablas[0].total,
        clavesForaneas: fks[0].total,
        indices: indices[0].total,
        permisos,
        ultimaInspeccion: ultima
          ? {
              id: ultima.id,
              estado: ultima.estado,
              respuesta: ultima.respuestas[0]?.valorNumero,
              bloqueada: ultima.respuestas[0]?.bloqueada,
              desviacion: ultima.desviaciones[0]?.estado,
              acciones: acciones.length,
              accionesCerradas: acciones.filter((accion) => accion.estado === 'CERRADA').length,
              seguimientos: acciones.reduce((total, accion) => total + accion.seguimientos.length, 0),
              evidencias: acciones.reduce((total, accion) => total + accion.evidencias.length, 0),
            }
          : null,
      },
      null,
      2,
    ),
  );
};

ejecutar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());
