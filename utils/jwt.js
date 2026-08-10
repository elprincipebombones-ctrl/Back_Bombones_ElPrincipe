const jwt = require('jsonwebtoken');

const generarToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '1d',
  });

const generarRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

const verificarToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
const verificarRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = { generarToken, generarRefreshToken, verificarToken, verificarRefreshToken };
