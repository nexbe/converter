import {app} from "./app";
import nodemailer from "nodemailer";
import {emailSetting} from "./config/emailSetting";
import Logger from "./lib/logger";

const start =  () => {

  Logger.info(`Application is Running at ${process.env.NODE_ENV}`)
   //Creating a Nodemailer Transport instance
  let transporter = nodemailer.createTransport(emailSetting.transport)

  //Verifying the Nodemailer Transport instance
  transporter.verify((error, success) => {
    if (error) {
      Logger.error("Email Transport Error", error);
      throw error
    } else {
      console.log('Server is ready to take messages');
    }
  });

  const port = process.env.PORT || '3200'
  app.listen(port, () => {
    Logger.info(`Listening on port ${port}!!`)
  });
};

start();