import {app} from "./app";
import nodemailer from "nodemailer";
import {emailSetting} from "./config/emailSetting";

const start =  () => {

//Creating a Nodemailer Transport instance
  let transporter = nodemailer.createTransport(emailSetting.transport)

//Verifying the Nodemailer Transport instance
  transporter.verify((error, success) => {
    if (error) {
      console.error(error);
      throw error
    } else {
      console.log('Server is ready to take messages');
    }
  });

  const port = process.env.PORT || '3200'
  app.listen(port, () => {
    console.log(`Listening on port ${port}!!`);
  });
};

start();