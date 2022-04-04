import express, { Request, Response } from "express";
import { csvFilesValidateService } from "../services/csvFilesValidateService";
import {
  convertContinuedStringToDate,
  convertToDate,
} from "../utils/convertToDateFormat";
import { dBValidateService } from "../services/dBValidateService";
import { dBIntegrateServices } from "../services/dBIntegrateService";
import { csvFilesToBackup } from "../services/csvFilesToBackup";
import { isEmptyArray } from "../utils/isEmptyArray";
import { csvFilesToErrorFolder } from "../services/csvFilesToErrorFolder";
import { sendEmail } from "../services/sendEmail";
import { CsvFile } from "../types/csvFiles-Interface";

/*
 * <Main Function>
 * csvFilesValidateService
 * onAssignClaimSaleContentType - self
 * dBValidateService
 * dBIntegrateServices
 * onNotifyVendor - self
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 * */

/*
EPAYMENT_VOUCHER_DIR="./files/sp-epayment-voucher/CSV"
EPAYMENT_VOUCHER_HEADER_FILENAME="VOUCHER"
FOLDER_EPAYMENT_VOUCHER="sp-epayment-voucher"
* */

const router = express.Router();

// ## Helper Main function
async function onAssignPaymentVoucherContentType(csvFile: CsvFile[]) {
  const csvCollection: any = [];

  // Loop Start
  for (const validCsvFile of csvFile as CsvFile[]) {
    let hasInvalidDate: boolean[] = [];
    const dataContentType: any = [];

    validCsvFile.data.map((csvData: any) => {
      const transactionDate = convertContinuedStringToDate(csvData["TDate"]);
      const uploadDate = convertToDate(csvData["LastUpdate"]);

      const datesList = [transactionDate.toString(), uploadDate.toString()];

      // Collect booleans of date validations
      hasInvalidDate.push(datesList.includes("Invalid Date"));

      // Assign and Collect contentType
      dataContentType.push({
        voucherNo: csvData["VoucherNo"],
        chequeNoRefNo: csvData["RefNo"],
        amount: csvData["Amount"],
        paymentMethod: csvData["PaymentMethod"],
        bankCode: csvData["BankCode"],
        transactionDate,
        uploadDate,
        vendor: csvData["VendorNo"],
        company: csvData["CompNo"],
      });
    });

    // Create record
    const payload: CsvFile = {
      data: dataContentType,
      hasInvalidDate: hasInvalidDate.includes(true),
      errorMessage: hasInvalidDate.includes(true)
        ? "Contains invalid date format"
        : null,
      fileName: validCsvFile.fileName,
      header: validCsvFile.header,
    };

    // Collect records
    csvCollection.push(payload);
  }
  // Loop Ended

  const invalidContents = csvCollection.filter(
    (item: any) => item.hasInvalidDate
  );
  const validContents = csvCollection.filter(
    (item: any) => !item.hasInvalidDate
  );

  return { invalidContents, validContents };
}

// # METHOD GET Request
router.get(
  "/e_payment_voucher_integrate",
  async (req: Request, res: Response) => {
    if (!process.env.EPAYMENT_VOUCHER_DIR) {
      throw new Error("EPAYMENT_VOUCHER_DIR variable not found");
    }

    if (!process.env.EPAYMENT_VOUCHER_HEADER_FILENAME) {
      throw new Error("EPAYMENT_VOUCHER_HEADER_FILENAME variable not found");
    }

    if (!process.env.FOLDER_EPAYMENT_VOUCHER) {
      throw new Error("FOLDER_EPAYMENT_VOUCHER variable not found");
    }

    // ### Filename, column length and Path
    const DIRECTORY = process.env.EPAYMENT_VOUCHER_DIR;
    const HEADER_FILENAMES =
      process.env.EPAYMENT_VOUCHER_HEADER_FILENAME.split(", ");
    const FOLDER_NAME = process.env.FOLDER_EPAYMENT_VOUCHER;

    // ### Strapi Apis names to call
    const strapiAPI_Validate = "e-payment-voucher-validate";
    const strapiAPI_Insert = "e-payment-voucher-batch";
    const strapi_payload_name = "ePaymentVouchers";

    try {
      const { invalidCsvFiles, validCsvFiles, csvCollection } =
        await csvFilesValidateService(DIRECTORY, HEADER_FILENAMES);

      const { invalidContents, validContents } =
        await onAssignPaymentVoucherContentType(validCsvFiles);

      const { invalidFilesValidationDB, successFilesValidationDB } =
        await dBValidateService(validContents, strapiAPI_Validate);

      if (!isEmptyArray(successFilesValidationDB)) {
        await dBIntegrateServices(
          successFilesValidationDB,
          strapiAPI_Insert,
          strapi_payload_name
        );

        await csvFilesToBackup(DIRECTORY, successFilesValidationDB);
      }

      // Collect all InvalidFiles
      const joinInvalidFiles = [
        ...invalidCsvFiles,
        ...invalidContents,
        ...invalidFilesValidationDB,
      ];

      if (!isEmptyArray(joinInvalidFiles)) {
        console.log("joinInvalidFiles", joinInvalidFiles);

        // Move files to error folder
        await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

        // Send Email Notification
        // const message = `${FOLDER_NAME} integration failed.`;
        //
        // await sendEmail(FOLDER_NAME, message, joinInvalidFiles);
      }

      return res.json("SP-Payment-Voucher integration was completed.");
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
);

export { router as ePaymentVoucher };
