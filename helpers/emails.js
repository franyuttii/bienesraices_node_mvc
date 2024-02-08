import nodemailer from 'nodemailer';

const emailRegistro = async (datos) => {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
    });

    const {email, nombre, token} = datos;
    
    //Enviar el email
    await transport.sendMail({
        from: 'BienesRaices.com', 
        to: email,
        subject: 'Confirma tu cuenta',
        text: 'Confirma tu cuenta en bienesraices.com',
        html: `
            <p>Hola ${nombre}</p>
            <p>Confirma tu cuenta en el siguiente enlace</p>
            <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/confirmar/${token}">Confirmar Cuenta</a>
            <p>Si no has sido tu, ignora este mensaje</p>
        `,
    })
}

const emailOlvidePassword = async (datos) => {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
    });

    const {email, nombre, token} = datos;
    
    //Enviar el email
    await transport.sendMail({
        from: 'BienesRaices.com', 
        to: email,
        subject: 'Restablece tu passowrd',
        text: 'Restablece tu password en bienesraices.com',
        html: `
            <p>Hola ${nombre}</p>
            <p>Has solicitado restablecer tu password en bienesraices.com</p>
            <p>Sigue el siguiente enlace para generar un nuevo password:</p>
            <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/olvide-password/${token}">Restablecer contraseña</a>
            <p>Si no has sido tu, ignora este mensaje</p>
        `,
    })
}

export {
    emailRegistro, 
    emailOlvidePassword
}