// const { verificarToken } = require('../utils/jwt');
// const { fail } = require('../utils/response');
// const { Usuario, Rol, Permiso, Menu } = require('../models');

// module.exports = async (req, res, next) => {
//   try {
//     const header = req.headers.authorization;
//     if (!header || !header.startsWith('Bearer ')) {
//       return fail(res, 'Token no proporcionado', 401);
//     }
//     const token = header.split(' ')[1];
//     const decoded = verificarToken(token);

//     const usuario = await Usuario.findByPk(decoded.id, {
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

//     if (!usuario || !usuario.estado) {
//       return fail(res, 'Usuario no válido o inactivo', 401);
//     }

//     req.usuario = usuario;
//     req.permisos = (usuario.rol?.permisos || []).map((p) => p.nombre);
//     next();
//   } catch (err) {
//     return fail(res, 'Token inválido o expirado', 401);
//   }
// };
const { verificarToken } = require('../utils/jwt');
const { fail } = require('../utils/response');
const { Usuario, Rol, Permiso } = require('../models');

/*
|--------------------------------------------------------------------------
| CACHE DE PERMISOS POR ROL
|--------------------------------------------------------------------------
| Evita consultar los permisos del mismo rol en cada petición.
|
| Estructura:
| {
|   rolId: {
|     permisos: ['Usuarios.Ver', 'Roles.Ver'],
|     expiresAt: 123456789
|   }
| }
|
*/

const permisosCache = new Map();

const CACHE_TTL = 60 * 1000; // 60 segundos


/*
|--------------------------------------------------------------------------
| Obtener permisos del rol
|--------------------------------------------------------------------------
*/

const obtenerPermisosRol = async (rolId) => {

  const ahora = Date.now();

  const cache = permisosCache.get(rolId);

  // Si existe y todavía está vigente
  if (cache && cache.expiresAt > ahora) {
    return cache.permisos;
  }

  /*
  |--------------------------------------------------------------------------
  | Consulta únicamente permisos
  |--------------------------------------------------------------------------
  */

  const permisos = await Permiso.findAll({
    attributes: ['nombre'],
    include: [
      {
        model: Rol,
        as: 'roles',
        attributes: [],
        through: {
          attributes: []
        },
        where: {
          id: rolId
        }
      }
    ],
    where: {
      estado: true
    }
  });

  const nombresPermisos = permisos.map(
    permiso => permiso.nombre
  );

  /*
  |--------------------------------------------------------------------------
  | Guardar en cache
  |--------------------------------------------------------------------------
  */

  permisosCache.set(rolId, {
    permisos: nombresPermisos,
    expiresAt: ahora + CACHE_TTL
  });

  return nombresPermisos;
};


/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
|--------------------------------------------------------------------------
*/

module.exports = async (req, res, next) => {

  try {

    console.time('AUTH-TOTAL');

    /*
    |--------------------------------------------------------------------------
    | 1. Obtener Authorization
    |--------------------------------------------------------------------------
    */

    const header = req.headers.authorization;

    if (
      !header ||
      !header.startsWith('Bearer ')
    ) {

      console.timeEnd('AUTH-TOTAL');

      return fail(
        res,
        'Token no proporcionado',
        401
      );
    }


    /*
    |--------------------------------------------------------------------------
    | 2. Extraer token
    |--------------------------------------------------------------------------
    */

    const token = header.split(' ')[1];


    /*
    |--------------------------------------------------------------------------
    | 3. Verificar JWT
    |--------------------------------------------------------------------------
    */

    const decoded = verificarToken(token);


    /*
    |--------------------------------------------------------------------------
    | 4. Buscar usuario
    |--------------------------------------------------------------------------
    |
    | IMPORTANTE:
    |
    | Antes teníamos:
    |
    | Usuario
    |   └── Rol
    |       ├── Permisos
    |       └── Menús
    |
    | Ahora solamente:
    |
    | Usuario
    |   └── Rol
    |
    */

    console.time('AUTH-USER-DB');

    const usuario = await Usuario.findByPk(
      decoded.id,
      {
        attributes: [
          'id',
          'nombre',
          'correo',
          'estado',
          'rolId'
        ],

        include: [
          {
            model: Rol,
            as: 'rol',

            attributes: [
              'id',
              'nombre',
              'descripcion',
              'estado'
            ]
          }
        ]
      }
    );

    console.timeEnd('AUTH-USER-DB');


    /*
    |--------------------------------------------------------------------------
    | 5. Validar usuario
    |--------------------------------------------------------------------------
    */

    if (!usuario) {

      console.timeEnd('AUTH-TOTAL');

      return fail(
        res,
        'Usuario no válido',
        401
      );
    }


    if (!usuario.estado) {

      console.timeEnd('AUTH-TOTAL');

      return fail(
        res,
        'Usuario inactivo',
        401
      );
    }


    /*
    |--------------------------------------------------------------------------
    | 6. Validar rol
    |--------------------------------------------------------------------------
    */

    if (
      !usuario.rol ||
      !usuario.rol.estado
    ) {

      console.timeEnd('AUTH-TOTAL');

      return fail(
        res,
        'Rol no válido o inactivo',
        403
      );
    }


    /*
    |--------------------------------------------------------------------------
    | 7. Obtener permisos
    |--------------------------------------------------------------------------
    */

    console.time('AUTH-PERMISSIONS');

    const permisos = await obtenerPermisosRol(
      usuario.rol.id
    );

    console.timeEnd('AUTH-PERMISSIONS');


    /*
    |--------------------------------------------------------------------------
    | 8. Guardar información en request
    |--------------------------------------------------------------------------
    */

    req.usuario = usuario;

    req.permisos = permisos;


    /*
    |--------------------------------------------------------------------------
    | 9. Continuar
    |--------------------------------------------------------------------------
    */

    console.timeEnd('AUTH-TOTAL');

    next();

  } catch (err) {

    console.error(
      '[AUTH ERROR]',
      err.message
    );

    return fail(
      res,
      'Token inválido o expirado',
      401
    );
  }
};


/*
|--------------------------------------------------------------------------
| LIMPIAR CACHE
|--------------------------------------------------------------------------
|
| Esto nos servirá posteriormente cuando:
|
| - Se actualicen permisos
| - Se elimine un permiso
| - Se modifique un rol
|
*/

module.exports.limpiarCachePermisos = (rolId) => {

  if (rolId) {

    permisosCache.delete(rolId);

    return;
  }

  permisosCache.clear();
};