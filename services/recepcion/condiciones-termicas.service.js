const numeroONull = (valor) =>
  valor === null || valor === undefined || valor === '' ? null : Number(valor);

const evaluarTemperatura = (condicion, temperatura) => {
  const valor = Number(temperatura);
  const minima = numeroONull(condicion?.temperaturaMinima);
  const maxima = numeroONull(condicion?.temperaturaMaxima);

  if (!condicion || !Number.isFinite(valor)) return false;

  // El límite superior de CONGELADO es exclusivo: debe ser menor de 0 °C.
  if (condicion.codigo === 'CONGELADO') {
    return maxima !== null && valor < maxima;
  }

  return (minima === null || valor >= minima) && (maxima === null || valor <= maxima);
};

const describirRango = (condicion) => {
  const minima = numeroONull(condicion?.temperaturaMinima);
  const maxima = numeroONull(condicion?.temperaturaMaxima);

  if (condicion?.codigo === 'CONGELADO' && maxima !== null) return `< ${maxima} °C`;
  if (minima !== null && maxima !== null) return `${minima} a ${maxima} °C`;
  if (minima !== null) return `≥ ${minima} °C`;
  if (maxima !== null) return `≤ ${maxima} °C`;
  return 'Sin límites configurados';
};

module.exports = { evaluarTemperatura, describirRango };
