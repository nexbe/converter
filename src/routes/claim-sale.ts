import express, { Request, Response } from "express";
import { csvFilesValidateService } from "../services/csvFilesValidateService";
import { convertToDate } from "../utils/convertToDateFormat";
import { dBValidateService } from "../services/dBValidateService";
import { dBIntegrateServices } from "../services/dBIntegrateService";
import { csvFilesToBackup } from "../services/csvFilesToBackup";
import { isEmptyArray } from "../utils/isEmptyArray";
import { csvFilesToErrorFolder } from "../services/csvFilesToErrorFolder";
import { sendEmail } from "../services/sendEmail";
import { fetchRequestUrl } from "../utils/fetchRequestUrl";
import { CsvFile } from "../types/csvFiles-Interface";
import Logger from "../lib/logger";

/*
 * <Function / Services Usage>
 * csvFilesValidateService
 * onAssignClaimSaleContentType - self
 * dBValidateService
 * dBIntegrateServices
 * onNotifyVendor - self
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 * */

/* < REFs >
CLAIM_SALE_DIR="./files/sp-claim-sale/CSV"
CLAIM_SALE_HEADER_FILENAME="ClaimSalesReportHeader"
FOLDER_CLAIM_SALE="sp-claim-sale"
* */

// ## ClaimSale Helper Vendor Notify Function - special case
async function onNotifyVendor(
  csvFiles: CsvFile[],
  strapiApiNotifyVendor: string
) {
  try {
    // Extract Vendors
    const unflattenVendors = csvFiles.map((item) =>
      item.data.map((dataItem) => dataItem.vendor)
    );
    const flattenVendors = unflattenVendors.flat();
    const uniqueVendors = [...new Set(flattenVendors)];

    const payload = JSON.stringify({
      vendors: uniqueVendors,
      emailBody: "There are new claim sales for your vendor. Please check.",
    });

    // ### POST REQUEST to notify vendor ( original code )
    await fetchRequestUrl(strapiApiNotifyVendor, "POST", {
      body: payload,
    });
  } catch (e) {
    throw e;
  }
}

// ## ClaimSale Helper Main function
async function onAssignClaimSaleContentType(csvFile: CsvFile[]) {
  const csvCollection: any = [];

  // Loop Start
  for (const validCsvFile of csvFile as CsvFile[]) {
    let hasInvalidDate: boolean[] = [];
    const dataContentType: any = [];

    validCsvFile.data.map((csvData: any) => {
      const rspStartDate = convertToDate(csvData["RSPStartDate"]);
      const rspEndDate = convertToDate(csvData["RSPEndDate"]);
      const uploadDate = convertToDate(csvData["CreateDate"]);

      const datesList = [
        rspStartDate.toString(),
        rspEndDate.toString(),
        uploadDate.toString(),
      ];

      // Collect booleans of date validations
      hasInvalidDate.push(datesList.includes("Invalid Date"));

      // Assign and Collect contentType
      dataContentType.push({
        rspStartDate,
        rspEndDate,
        uploadDate,
        batchNo: csvData["BatchNo"],
        claimAmount: csvData["SupplierClaimAmount"],
        // TODO variable taxInvoice?
        taxtInvoice: csvData["IsTaxInvoiceFileFound"],
        saleReport: csvData["Remark"],
        excelFile: csvData["FilePath"],
        vendor: csvData["VendorCode"],
        company: csvData["BuyerCode"],
        claimID: csvData["ClaimID"],
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

const router = express.Router();

// # METHOD: GET REQUEST
// # /api/claimSale

router.get("/claim_sale_integrate", async (req: Request, res: Response) => {
  if (!process.env.CLAIM_SALE_DIR) {
    throw new Error("CLAIM_SALE_DIR variable not found");
  }

  if (!process.env.CLAIM_SALE_HEADER_FILENAME) {
    throw new Error("CLAIM_SALE_FILENAME variable not found");
  }

  if (!process.env.FOLDER_CLAIM_SALE) {
    throw new Error("FOLDER_CLAIM_SALE variable not found");
  }

  // ### Filenames, and Paths
  const DIRECTORY = process.env.CLAIM_SALE_DIR;
  const HEADER_FILENAMES = process.env.CLAIM_SALE_HEADER_FILENAME.split(", ");
  const FOLDER_NAME = process.env.FOLDER_CLAIM_SALE;

  // ### Strapi APIs names to call
  const strapiAPI_Validate = "claim-sale-validate";
  const strapiAPI_Insert = "claim-sale-batch";
  const strapiApi_Notify_Vendor = "claim-sale-notify";
  const strapi_payload_name = "claimSales";

  try {
    const { invalidCsvFiles, validCsvFiles, csvCollection } =
      await csvFilesValidateService(DIRECTORY, HEADER_FILENAMES);

    const { invalidContents, validContents } =
      await onAssignClaimSaleContentType(validCsvFiles);

    const { invalidFilesValidationDB, successFilesValidationDB } =
      await dBValidateService(validContents, strapiAPI_Validate);

    if (!isEmptyArray(successFilesValidationDB)) {
      await dBIntegrateServices(
        successFilesValidationDB,
        strapiAPI_Insert,
        strapi_payload_name
      );

      // On sales Claim have function to notify vendor for now
      // No Function Call on Strapi. < INCOMPLETE >
      // await onNotifyVendor(successFilesValidationDB, strapiApi_Notify_Vendor);

      // Backup files
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
      const message = `${FOLDER_NAME} integration failed.`;

      await sendEmail(FOLDER_NAME, message, joinInvalidFiles);
    }

    return res.json("SP-Claim-Sale integration was completed.");
  } catch (error) {
    Logger.error(error);
    throw error;
  }
});

export { router as claimSale };
