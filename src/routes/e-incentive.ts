import express, { Request, Response } from "express";
import { csvFilesValidateService } from "../services/csvFilesValidateService";
import { csvFilesValidateUniqueService } from "../services/csvFilesValidateUniqueService";
import { convertToDate } from "../utils/convertToDateFormat";
import { dBIntegrateServices } from "../services/dBIntegrateService";
import { CsvFile } from "../types/csvFiles-Interface";
import { dBValidateFileSetService } from "../services/dbValidateFileSetService";
import { csvFilesToBackup } from "../services/csvFilesToBackup";
import { csvFilesToErrorFolder } from "../services/csvFilesToErrorFolder";

/*
 * <Functions / Services Usages>
 * csvFilesValidateService
 * csvFilesValidateUniqueService - self
 * onAssignClaimSaleContentType - self
 * dBValidateFileSetService
 * dBIntegrateServices
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 *
 * <Sub Function>
 * formatIncentivePayload - self
 * assignAcknowledgement - self
 * assignAcknowledgementRemarks - self
 * assignAcknowledgementAttachments -self
 * */

/*
<REFERENCE>
E_INCENTIVE_DIR="./files/sp-e-incentive/CSV"
E_INCENTIVE_HEADER_FILENAME="Acknowledge, AcknowledgeAttachment, AcknowledgeRemarks"
E_INCENTIVE_HEADER_ACKNOWLEDGE="Acknowledge"
E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT="AcknowledgeAttachment"
E_INCENTIVE_HEADER_ACKNOWLEDGE_REMARK="AcknowledgeRemarks"
FOLDER_INCENTIVE="sp-e-incentive"
* */

const router = express.Router();

// ## Format Payload
const formatIncentivePayload = async (
  validCsvFile: any[],
  incentiveApi: string,
  attachmentApi: string,
  incentivePayloadName: string,
  incentiveAttachmentPayloadName: string,
  E_INCENTIVE_HEADER_ACKNOWLEDGE: string,
  E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT: string,
) => {

  const incentive = validCsvFile.filter((file) => file.header === E_INCENTIVE_HEADER_ACKNOWLEDGE)
  const attachment = validCsvFile.filter((file) => file.header === E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT)

  return [
    {
      data: incentive,
      strapiApi: incentiveApi,
      payloadName: incentivePayloadName
    },
    {
      data: attachment,
      strapiApi: attachmentApi,
      payloadName: incentiveAttachmentPayloadName
    }
  ]
}

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

// ## Helper Main function
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

// # METHOD: GET REQUEST
// # /api/eIncentive

router.get("/e_incentive_integrate", async (req: Request, res: Response) => {
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

  if (!process.env.FOLDER_INCENTIVE) {
    throw new Error("FOLDER_INCENTIVE variable not found");
  }

  // ### Filenames and Paths
  const DIRECTORY = process.env.E_INCENTIVE_DIR;
  const HEADER_FILENAMES = process.env.E_INCENTIVE_HEADER_FILENAME.split(", ");
  const FOLDER_NAME = process.env.FOLDER_INCENTIVE;
  const E_INCENTIVE_HEADER_ACKNOWLEDGE = process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE;
  const E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT= process.env.E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT;

  // API Calls - /api/<strapiAPI_InsertIncentive>
  const strapiAPI_Validate = "e-incentive-validate";
  const strapiAPI_InsertIncentive = "e-incentive-batch";
  const strapiAPI_InsertAttachment = "e-incentive-attachment-batch"

  // API Payload assigned
  const strapi_payloadIncentive_name = "eIncentives";
  const strapi_payloadAttachment_name = "attachments";

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
      // await sendEmail(FOLDER_NAME, message, csvCollection);

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
     // await sendEmail(FOLDER_NAME, message, inValidContents);

      return res.status(200).json(message);
    }


    // # Validate selected file from set of files.
    const { invalidFilesValidationDB, successFilesValidationDB } =
      await dBValidateFileSetService(validContents, strapiAPI_Validate, E_INCENTIVE_HEADER_ACKNOWLEDGE);

    if (invalidFilesValidationDB.length > 0) {
      // Move files to error folder
       await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

      const message = `${FOLDER_NAME} integration failed. Incomplete or existing data records to proceed`;
     //  await sendEmail(FOLDER_NAME, message, invalidFilesValidationDB);
      return res.status(200).json(message);
    }

    // Format payload before insert
    const formatedIncentivesPayload = await formatIncentivePayload(
      validContents,
      strapiAPI_InsertIncentive,
      strapiAPI_InsertAttachment,
      strapi_payloadIncentive_name,
      strapi_payloadAttachment_name,
      E_INCENTIVE_HEADER_ACKNOWLEDGE,
      E_INCENTIVE_HEADER_ACKNOWLEDGE_ATTACHMENT
    );

    // Insert into Database through strapi Apis
    for (const item of formatedIncentivesPayload) {
      await dBIntegrateServices(
        item.data,
        item.strapiApi,
        item.payloadName,
      );
    }

    // Backup Folder
    await csvFilesToBackup(DIRECTORY, csvCollection);

    return res.json("E-Incentive integration was completed.");
  } catch (error) {
    throw error;
  }
});

export { router as eIncentive };
