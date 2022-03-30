import express, { Request, Response } from "express";
import { csvFilesValidateService } from "../services/csvFilesValidateService";
import { csvFilesValidateUniqueService } from "../services/csvFilesValidateUniqueService";
import { convertToDate } from "../utils/convertToDateFormat";
import { dBValidateService } from "../services/dBValidateService";
import { csvFilesToErrorFolder } from "../services/csvFilesToErrorFolder";
import { sendEmail } from "../services/sendEmail";
import { dBIntegrateServices } from "../services/dBIntegrateService";
import { csvFilesToBackup } from "../services/csvFilesToBackup";
import {CsvFile} from "../types/csvFiles-Interface";

/*
 * <Main Functions>
 * csvFilesValidateService
 * csvFilesValidateUniqueService - self
 * onAssignClaimSaleContentType - self
 * dBValidateService
 * dBIntegrateServices
 * onNotifyVendor - self
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 *
 * <Sub Function>
 * assignAcknowledgement - self
 * assignAcknowledgementRemarks - self
 * assignAcknowledgementAttachments -self
 * */

const router = express.Router();

// ## File Acknowledgement
const assignAcknowledgement = async (validCsvFile: any) => {
  const data: any = [];
  const hasInvalidDate: any = [];

  validCsvFile.data.forEach((element: any) => {
    const date = convertToDate(element["PeriodDate"]);
    const uploadDate = convertToDate(element["UploadDate"]);
    const confirmDate = convertToDate(element["ClosingDate"]);
    const confirmByDate = convertToDate(element["AcknowledgeDate"]);

    const datesList = [
      date.toString(),
      uploadDate.toString(),
      confirmDate.toString(),
      confirmByDate.toString(),
    ];

    // Collect booleans of date validations
    hasInvalidDate.push(datesList.includes("Invalid Date"));

    data.push({
      refNo: element["ReferenceNo"],
      vendor: element["VendorCode"],
      buyerCode: element["BuyerCode"],
      date,
      amount: element["Amount"],
      uploadDate,
      status: element["AcknowledgeStatus"],
      confirmDate,
      confirmByDate,
    });
  });

  // Create record
  const payload: CsvFile = {
    data,
    hasInvalidDate: hasInvalidDate.includes(true),
    errorMessage: hasInvalidDate.includes(true)
      ? "Contains invalid date format"
      : null,
    fileName: validCsvFile.fileName,
    header: validCsvFile.header,
  };

  return payload;
};

// ## File Acknowledgement Remark
const assignAcknowledgementRemarks = async (validCsvFile: any) => {
  const data: any = [];

  validCsvFile.data.forEach((element: any) => {
    data.push({
      refNo: element["ReferenceNo"],
      remarks: element["Remarks"],
    });
  });

  // Create record
  const payload: CsvFile = {
    data,
    hasInvalidDate: false,
    errorMessage: null,
    fileName: validCsvFile.fileName,
    header: validCsvFile.header,
  };

  return payload;
};

// ## File Acknowledgement Attachments
const assignAcknowledgementAttachments = async (validCsvFile: any) => {
  const data: any = [];

  validCsvFile.data.forEach((element: any) => {
    data.push({
      refNo: element["ReferenceNo"],
      description: element["Description"],
      fileName: element["UploadFileName"],
      attachment: element["FilePath"],
    });
  });

  // Create record
  const payload: CsvFile = {
    data,
    hasInvalidDate: false,
    errorMessage: null,
    fileName: validCsvFile.fileName,
    header: validCsvFile.header,
  };

  return payload;
};

// ## Helper function
async function onAssignIncentiveContentType(csvFile: CsvFile[]) {
  const csvCollection: any = [];
  let response;
  // Loop Start

  await Promise.all(
    csvFile.map(async (validCsvFile: any) => {
      if (validCsvFile.header === process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE) {
        response = await assignAcknowledgement(validCsvFile);
        csvCollection.push(response);
      }

      if (
        validCsvFile.header ===
        process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE_REMARK
      ) {
        response = await assignAcknowledgementRemarks(validCsvFile);
        csvCollection.push(response);
      }

      if (
        validCsvFile.header ===
        process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT
      ) {
        response = await assignAcknowledgementAttachments(validCsvFile);
        csvCollection.push(response);
      }
    })
  );

  const inValidContents = csvCollection.filter(
    (item: any) => item.hasInvalidDate
  );
  const validContents = csvCollection.filter(
    (item: any) => !item.hasInvalidDate
  );

  return { inValidContents, validContents };
}

// # GET method
// # /api/eIncentive

router.get("/api/eIncentive", async (req: Request, res: Response) => {
  // ## Env Variables
  if (!process.env.E_INCENTIVE_DIR) {
    throw new Error("E_INCENTIVE_DIR variable not found");
  }

  if (!process.env.E_INCENTIVE_HEADER_FILENAME) {
    throw new Error("E_INCENTIVE_HEADER_FILENAME variable not found");
  }

  if (!process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE) {
    throw new Error("E_INCENTIVE_HEADER_ACKNOWLEDGE variable not found");
  }

  if (!process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE_REMARK) {
    throw new Error("E_INCENTIVE_HEADER_ACKNOWLEDGE_REMARK variable not found");
  }

  if (!process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT) {
    throw new Error(
      "E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT variable not found"
    );
  }

  if (!process.env.PATH_INCENTIVE) {
    throw new Error("PATH_INCENTIVE variable not found");
  }

  // ### Filename, column length and Path
  const DIRECTORY = process.env.E_INCENTIVE_DIR;
  const HEADER_FILENAMES = process.env.E_INCENTIVE_HEADER_FILENAME.split(", ");
  const FOLDER_NAME = process.env.PATH_INCENTIVE;

  // ### Csv Column Length
  // const E_INCENTIVE_COLUMN_LENGTH = parseInt(process.env.E_INCENTIVE_COLUMN_LENGTH);
  // const E_INCENTIVE_REMARK_COLUMN_LENGTH = parseInt(process.env.E_INCENTIVE_REMARK_COLUMN_LENGTH);
  // const E_INCENTIVE_ATTACHMENT_COLUMN_LENGTH = parseInt(process.env.E_INCENTIVE_ATTACHMENT_COLUMN_LENGTH);

  // ### Strapi URLs
  const strapiAPI_Validate = "e-incentive-validate";
  const strapiAPI_Insert = "e-incentive-batch";
  const strapi_payload_name = "eIncentives";

  try {
    const { invalidCsvFiles, validCsvFiles, csvCollection } =
      await csvFilesValidateService(DIRECTORY, HEADER_FILENAMES);

    // # This Service meant for CSV folder who has more than one different filenames
    const isValid = await csvFilesValidateUniqueService(
      DIRECTORY,
      HEADER_FILENAMES,
      validCsvFiles
    );

    if (!isValid) {
      // Move files to error folder
      await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

      //Send Email Notification
      const message = `${FOLDER_NAME} integration failed. Incomplete or duplicate files to integrate.`;
      await sendEmail(FOLDER_NAME, message, csvCollection);

      return res.status(200).json(message);
    }

    // Do checking on strapi content type. No error will be thrown.
    const { inValidContents, validContents } =
      await onAssignIncentiveContentType(validCsvFiles);

    // check if any files has invalidContent. End It
    if (inValidContents.length > 0) {
      // Move files to error folder
      await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

      // Send Email Notification
      const message = `${FOLDER_NAME} integration failed. CSVs has invalid columns or values.`;
      await sendEmail(FOLDER_NAME, message, inValidContents);

      return res.status(200).json(message);
    }

    const { invalidFilesValidationDB, successFilesValidationDB } =
      await dBValidateService(validContents, strapiAPI_Validate);

    if (invalidFilesValidationDB.length > 0) {
      // Move files to error folder
      await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

      const message = `${FOLDER_NAME} integration failed. Incomplete or existing data records to proceed`;
      await sendEmail(FOLDER_NAME, message, invalidFilesValidationDB);
      return res.status(200).json(message);
    }

    // Insert Database
    await dBIntegrateServices(
      successFilesValidationDB,
      strapiAPI_Insert,
      strapi_payload_name
    );

    // Backup Folder
    await csvFilesToBackup(DIRECTORY, csvCollection);

    return res.json("E-Incentive integration success.");
  } catch (error) {
    throw error;
  }
});

export { router as eIncentive };
