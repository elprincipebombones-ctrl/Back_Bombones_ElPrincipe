const siguienteCodigoCalidad = async (database, transaction) => {
  const [[fila]] = await database.query(
    "SELECT nextval('calidad_codigo_interno_seq')::text AS consecutivo",
    { transaction },
  );
  return `CA-${String(fila.consecutivo).padStart(6, '0')}`;
};

module.exports = { siguienteCodigoCalidad };
