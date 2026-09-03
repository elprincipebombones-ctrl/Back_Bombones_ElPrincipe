const Bodega = require('../../models/Inventario/Bodega');

const { ok, created, fail } = require('../../utils/response');

exports.listar = async (req, res, next) => {
    try {
        const bodegas = await Bodega.findAll({
            order: [['nombre', 'ASC']]
        });

        return ok(res, bodegas);
    } catch (err) {
        return next(err);
    }
};

exports.obtener = async (req, res, next) => {
    try {
        const bodega = await Bodega.findByPk(req.params.id);

        if (!bodega) {
            return fail(res, 'Bodega no encontrada', 404);
        }

        return ok(res, bodega);
    } catch (err) {
        return next(err);
    }
};

exports.crear = async (req, res, next) => {
    try {
        const {
            nombre,
            codigo,
            tipo,
            descripcion,
            direccion,
            responsableId,
            estado
        } = req.body;

        if (!nombre) {
            return fail(res, 'Falta el nombre', 400);
        }

        if (!codigo) {
            return fail(res, 'Falta el código', 400);
        }

        if (!tipo) {
            return fail(res, 'Falta el tipo de bodega', 400);
        }

        const bodegaExistente = await Bodega.findOne({
            where: {
                codigo
            }
        });

        if (bodegaExistente) {
            return fail(
                res,
                'Ya existe una bodega con ese código',
                409
            );
        }

        const bodega = await Bodega.create({
            nombre,
            codigo,
            tipo,
            descripcion,
            direccion,
            responsableId,
            estado: estado !== undefined ? estado : true
        });

        return created(res, bodega);
    } catch (err) {
        return next(err);
    }
};

exports.actualizar = async (req, res, next) => {
    try {
        const bodega = await Bodega.findByPk(req.params.id);

        if (!bodega) {
            return fail(res, 'Bodega no encontrada', 404);
        }

        if (
            req.body.codigo &&
            req.body.codigo !== bodega.codigo
        ) {
            const bodegaExistente = await Bodega.findOne({
                where: {
                    codigo: req.body.codigo
                }
            });

            if (
                bodegaExistente &&
                bodegaExistente.id !== bodega.id
            ) {
                return fail(
                    res,
                    'Ya existe una bodega con ese código',
                    409
                );
            }
        }

        await bodega.update(req.body);

        return ok(
            res,
            bodega,
            'Bodega actualizada'
        );
    } catch (err) {
        return next(err);
    }
};

exports.eliminar = async (req, res, next) => {
    try {
        const bodega = await Bodega.findByPk(req.params.id);

        if (!bodega) {
            return fail(res, 'Bodega no encontrada', 404);
        }

        await bodega.destroy();

        return ok(
            res,
            null,
            'Bodega eliminada'
        );
    } catch (err) {
        return next(err);
    }
};