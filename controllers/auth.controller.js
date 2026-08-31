const { Usuario, Rol, Permiso, Menu } = require('../models');
const { ok, fail } = require('../utils/response');
const { generarToken, generarRefreshToken, verificarRefreshToken } = require('../utils/jwt');

const construirRespuestaSesion = (usuario) => {
  const rol = usuario.rol;
  const permisos = (rol?.permisos || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    modulo: p.modulo,
  }));
  const menus = (rol?.menus || [])
    .filter((m) => m.estado)
    .sort((a, b) => a.orden - b.orden)
    .map((m) => ({
      id: m.id,
      nombre: m.nombre,
      ruta: m.ruta,
      icono: m.icono,
      orden: m.orden,
      estado: m.estado,
    }));

  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      estado: usuario.estado,
    },
    rol: rol ? { id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion } : null,
    permisos,
    menus,
  };
};

// exports.login = async (req, res, next) => {
//   console.log('Login request body:', req.body.correo); // Debugging line
//   console.log('Login request body:', req.body.password); // Debug
//   try {
//     const { correo, password } = req.body;
//     const usuario = await Usuario.scope('withPassword').findOne({
//       where: { correo },
//       include: [
//         {
//           model: Rol,
//           as: 'rol',
//           include: [
//             { model: Permiso, as: 'permisos', through: { attributes: [] } },
//             { model: Menu, as: 'menus', through: { attributes: [] } },
//           ],
//         },
//       ],
//     });

//     if (!usuario) return fail(res, 'Credenciales inválidas', 401);
//     if (!usuario.estado) return fail(res, 'Usuario inactivo', 401);

//     const valido = await usuario.validarPassword(password);
//     if (!valido) return fail(res, 'Credenciales inválidas', 401);

//     const payload = { id: usuario.id, correo: usuario.correo };
//     const token = generarToken(payload);
//     const refreshToken = generarRefreshToken(payload);

//     const data = { token, refreshToken, ...construirRespuestaSesion(usuario) };
//     return ok(res, data, 'Sesión iniciada');
//   } catch (err) {
//     return next(err);
//   }
// };

exports.login = async (req, res, next) => {
  try {
    const inicio = Date.now();

    const { correo, password } = req.body;

    console.log('1. Inicio login:', Date.now() - inicio, 'ms');

    const usuario = await Usuario.scope('withPassword').findOne({
      where: { correo },
      include: [
        {
          model: Rol,
          as: 'rol',
          include: [
            {
              model: Permiso,
              as: 'permisos',
              through: { attributes: [] }
            },
            {
              model: Menu,
              as: 'menus',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });

    console.log(
      '2. Consulta usuario + rol + permisos + menus:',
      Date.now() - inicio,
      'ms'
    );

    if (!usuario) {
      return fail(res, 'Credenciales inválidas', 401);
    }

    if (!usuario.estado) {
      return fail(res, 'Usuario inactivo', 401);
    }

    const valido = await usuario.validarPassword(password);

    console.log(
      '3. Validación password:',
      Date.now() - inicio,
      'ms'
    );

    if (!valido) {
      return fail(res, 'Credenciales inválidas', 401);
    }

    const payload = {
      id: usuario.id,
      correo: usuario.correo
    };

    const token = generarToken(payload);
    const refreshToken = generarRefreshToken(payload);

    console.log(
      '4. Tokens generados:',
      Date.now() - inicio,
      'ms'
    );

    const data = {
      token,
      refreshToken,
      ...construirRespuestaSesion(usuario)
    };

    console.log(
      '5. Respuesta construida:',
      Date.now() - inicio,
      'ms'
    );

    return ok(res, data, 'Sesión iniciada');

  } catch (err) {
    return next(err);
  }
};
exports.refresh = async (req, res, _next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verificarRefreshToken(refreshToken);
    const usuario = await Usuario.findByPk(decoded.id);
    if (!usuario || !usuario.estado) return fail(res, 'Usuario no válido', 401);

    const payload = { id: usuario.id, correo: usuario.correo };
    return ok(res, {
      token: generarToken(payload),
      refreshToken: generarRefreshToken(payload),
    });
  } catch (err) {
    return fail(res, 'Refresh token inválido o expirado', 401);
  }
};

exports.perfil = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      include: [
        {
          model: Rol,
          as: 'rol',
          include: [
            { model: Permiso, as: 'permisos', through: { attributes: [] } },
            { model: Menu, as: 'menus', through: { attributes: [] } },
          ],
        },
      ],
    });
    return ok(res, construirRespuestaSesion(usuario));
  } catch (err) {
    return next(err);
  }
};
