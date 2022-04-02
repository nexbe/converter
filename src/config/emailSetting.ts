import path from "path";

export const emailSetting :any = {
    transport:{
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        requireTLS: true,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        },
        tls: {
            // do not fail on invalid certs
            rejectUnauthorized: true,
        },
    },
    templatePath: path.join(__dirname, 'templates', 'integrationFailed.ejs'),
};

