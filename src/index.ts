import { app } from "./app";
import nodemailer from "nodemailer";
import { emailSetting } from "./config/emailSetting";
import Logger from "./lib/logger";

/* < REF >
API_URL="http://localhost:1337/"
PORT=3300

# EMAIL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
MAIL_USERNAME="1073113@gmail.com"
MAIL_PASSWORD=

SENDER="1073113@gmail.com"
RECIPIENT="1073113@gmail.com"
* */

const start = () => {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST variable not found");
  }
  if (!process.env.SMTP_PORT) {
    throw new Error("SMTP_HOST variable not found");
  }
  if (!process.env.SENDER) {
    throw new Error("SENDER variable not found");
  }
  if (!process.env.RECIPIENT) {
    throw new Error("RECIPIENT variable not found");
  }
  if (!process.env.MAIL_USERNAME) {
    throw new Error("MAIL_PASSWORD variable not found");
  }
  if (!process.env.MAIL_PASSWORD) {
    throw new Error("MAIL_PASSWORD variable not found");
  }
  if (!process.env.MAIL_PASSWORD) {
    throw new Error("MAIL_PASSWORD variable not found");
  }
  if (!process.env.API_URL) {
    throw new Error("API_URL variable not found");
  }
  if (!process.env.PORT) {
    throw new Error("PORT variable not found");
  }

  Logger.info(`Application is Running at ${process.env.NODE_ENV} environment.`);
  //Creating a Nodemailer Transport instance
  let transporter = nodemailer.createTransport(emailSetting.transport);

  //Verifying the Nodemailer Transport instance
  transporter.verify((error, success) => {
    if (error) {
      Logger.error("Email Transport Error", error);
      throw error;
    } else {
      console.log("Server is ready to take messages");
    }
  });

  const port = process.env.PORT || "3200";
  app.listen(port, () => {
    Logger.info(`Listening on port ${port}!!`);
  });
};

start();
