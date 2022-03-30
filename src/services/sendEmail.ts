
import ejs from "ejs";
import nodemailer from "nodemailer";
import { emailSetting } from "../config/emailSetting";
import path from "path";
import {CsvFile} from "../types/csvFiles-Interface";

export async function sendEmail(
  name: string,
  title: string,
  csvFiles: CsvFile[]
) {
  const templatePath = path.join(
    process.cwd(),
    "templates",
    "integrationFailed.ejs"
  );

  //Creating a Nodemailer Transport instance
  let transporter = nodemailer.createTransport(emailSetting.transport);

  //Verifying the Nodemailer Transport instance
  transporter.verify((error, success) => {
    if (error) {
      console.error(error);
      throw error;
    } else {
      console.log("Server is ready to take messages");
    }
  });

  const payload: any = {
    title,
    csvFiles,
  };

  ejs.renderFile(
    templatePath,
    { data: payload },
    function (err: any, data: any) {
      if (err) {
        console.log(err);
      } else {
        const mainOptions = {
          from: "1073113@gmail.com",
          to: "1073113@gmail.com",
          subject: `Integration Failed - ${new Date().toString()}`,
          html: data,
        };

        transporter.sendMail(mainOptions, function (err, info) {
          if (err) {
            console.log("Email unsuccessful send", err);
            throw err;
          } else {
            console.log("Email successful send");
            return true;
          }
        });
      }
    }
  );

  return true;
}
