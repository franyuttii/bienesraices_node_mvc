import { check, validationResult } from "express-validator";
import bcrypt from 'bcrypt';
import Usuario from "../models/Usuario.js";
import { generarJWT, generarId} from "../helpers/tokens.js";
import { emailRegistro, emailOlvidePassword } from "../helpers/emails.js";
import { where } from "sequelize";

const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar sesión',
        csrfToken: req.csrfToken(),
    })
};

const autenticar = async (req, res) => {
    await check('email').isEmail().withMessage('El email es obligatorio').run(req);
    await check('password').notEmpty().withMessage('La contraseña es obligatoria').run(req);

    let resultado = validationResult(req);
    //Verificar si hay errores
    if(!resultado.isEmpty()) {
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })   
    }

    const { email, password } = req.body

    //Comprobar si el usuario existe 
    const usuario = await Usuario.findOne({where: {email}});
    if(!usuario) {
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario no existe'}],
        })   
    }

    //Comprobar si el usuario esta confirmado
    if(!usuario.confirmado) {
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'Tu cuenta no ha sido confirmada, revisa tu correo electrónico'}],
        })   
    }

    //Revisar si el password es correcto
    if(!usuario.verificarPassword(password)) {
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'La contraseña es incorrecta'}],
        })   
    }

    //Autenticar al usuario
    const token = generarJWT({id: usuario.id, nombre: usuario.nombre});

    //Almacenar en una cookie
    return res.cookie('_token', token, {
        httpOnly: true,
        // secure: true,
        // sameSite: true,
    }).redirect('/mis-propiedades')
}

const cerrarSesion = (req, res) => {
    return res.clearCookie('_token').status(200).redirect('/auth/login')
}

const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina: 'Crear Cuenta', 
        csrfToken: req.csrfToken(),
    })
};

const registrar = async (req, res) => {
    //Validación de los campos
    await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req);
    await check('email').isEmail().withMessage('El email es obligatorio').run(req);
    await check('password').isByteLength({min: 6}).withMessage('La contraseña debe tener al menos 6 caracteres').run(req);
    await check('repetir_password').equals(req.body.password).withMessage('Las contraseñas no coinciden').run(req);

    let resultado = validationResult(req);
    //Verificar si hay errores
    if(!resultado.isEmpty()) {
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre, 
                email: req.body.email,
            },
        })   
    }

    //Extraer los datos 
    const {nombre, email, password} = req.body;

    //Verificar que el usuario no este registrado
    const existeUsuario = await Usuario.findOne({where: {email}});
    if(existeUsuario) {
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario ya esta registrado'}],
            usuario: {
                nombre: req.body.nombre, 
                email: req.body.email,
            }
        })   
    }

    // Crear usuario
    const usuario = await Usuario.create({
        nombre,
        email,
        password, 
        token: generarId(),
    })

    //Enviar correo electrónico de confirmación
    emailRegistro({
        nombre: usuario.nombre,
        email: usuario.email,
        token: usuario.token,
    })


    //Mostrar mensaje de confirmación
    res.render('templates/mensaje', {
        pagina: 'Cuenta Creada Correctamente',
        mensaje: 'Hemos enviado un correo electrónico para confirmar tu cuenta',
    })
}

//Funcion que verifica el token y cambia el estado del usuario
const confirmar = async (req, res) => {
    const {token} = req.params; 

    //Verificar que el token sea valido
    const usuario = await Usuario.findOne({where: {token}});

    if(!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Error al confirmar tu cuenta', 
            mensaje: 'El token no es valido, solicita uno nuevo',
            error: true,
        })
    }

    //Confirmar el usuario
    usuario.token = null; 
    usuario.confirmado = true;
    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Cuenta confirmada', 
        mensaje: 'La cuenta se ha confirmado correctamente',
    })
}

const formularioOlvidePassword = (req, res) => {
    res.render('auth/olvide-password', {
        pagina: 'Restablecer Contraseña',
        csrfToken: req.csrfToken(),
    })
};

const resetPassword = async (req, res) => {
    //Validación de los campos
    await check('email').isEmail().withMessage('El email es obligatorio').run(req);

    let resultado = validationResult(req);
    
    //Verificar si hay errores
    if(!resultado.isEmpty()) {
        return res.render('auth/olvide-password', {
            pagina: 'Restablecer Contraseña',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })   
    }

    //Buscar el usuario
    const {email} = req.body;
    const usuario = await Usuario.findOne({where: {email}})
    
    if(!usuario) {
        return res.render('auth/olvide-password', {
            pagina: 'Restablecer Contraseña',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El email no pertenece a ningún usuario'}],
        })   
    }

    //Generar un token y envia el email
    usuario.token = generarId();
    await usuario.save();

    //Enviar un email 
    emailOlvidePassword({
        email: usuario.email, 
        nombre: usuario.nombre,
        token: usuario.token,
    });

    //Mostrar mensaje de confirmación
    res.render('templates/mensaje', {
        pagina: 'Restablecer Contraseña',
        mensaje: 'Hemos enviado un correo electrónico con las instrucciones para restablecer tu contraseña',
    })
}

const comprobarToken = async (req, res) => {
    const {token} = req.params;

    const usuario = await Usuario.findOne({where: {token}});

    if(!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Restablecer Contraseña', 
            mensaje: 'Hubo un error al validar tu información, intenta de nuevo',
            error: true,
        })        
    }

    //Mostar formulario para generar un nuevo password
    res.render('auth/reset-password', {
        pagina: 'Restablecer contraseña',
        csrfToken: req.csrfToken(),
    })
}

const nuevoPassword = async(req, res) => {
    //Validar el password
    await check('password').isLength({min: 6}).withMessage('El password debe ser de al menos 6 caracteres').run(req);
    let resultado = validationResult(req);

    //Verificar si hay errores
    if(!resultado.isEmpty()) {
        res.render('auth/reset-password', {
            pagina: 'Restablecer contraseña',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }

    const { token } = req.params; 
    const { password } = req.body; 

    //Identificar quien hizo el cambio 
    const usuario = await Usuario.findOne({where: {token}});

    // Hashear el nuevo password
    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(password, salt);
    usuario.token = null; 

    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Contraseña restablecida', 
        mensaje: 'La contraseña se cambió correctamente',
    })
}

export {
    formularioLogin,
    autenticar,
    cerrarSesion,
    formularioRegistro,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resetPassword,
    comprobarToken, 
    nuevoPassword,
}