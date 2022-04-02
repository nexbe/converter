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

/*
 * <Main Function>
 * csvFilesValidateService
 * onAssignInventoryContentType - self
 * dBValidateService
 * dBIntegrateServices
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 * */

/*
INVENTORY_LIST_DIR="./files/sp-inventory-list/CSV"
INVENTORY_LIST_HEADER_FILENAME="EInventory"
FOLDER_INVENTORY_LIST="sp-inventory-list"
* */

const router = express.Router();

// ## Helper Main function
async function onAssignInventoryContentType(csvFile: CsvFile[]) {
	const csvCollection: any = [];

	// Loop Start
	for (const validCsvFile of csvFile as CsvFile[]) {

		const dataContentType: any = [];

		validCsvFile.data.map((csvData: any) => {
				// Assign and Collect contentType
			dataContentType.push({
				item: csvData['ItemCode'],
				poQty: csvData['POQty'],
				poUdm: csvData['POUOM'],
				poDate: new Date(csvData['PODate']),
				gidQty: csvData['GIDQty'],
				gidUdm: csvData['GIDUOM'],
				gidDate: new Date(csvData['GIDDate']),
				etdDate: new Date(csvData['ETDDate']),
				vendor: csvData['VendorCode'],
				description: csvData['ItemDescription'],
				uom: csvData['SalesUOM'],
				wholeQty: csvData['SalesUOMQty'],
				looseQty: csvData['SalesUOMLooseQty'],
				expiryDateMin: new Date(csvData['ExpiryDate_Min']),
				expiryDateMax: new Date(csvData['ExpiryDate_Max']),
				size: csvData['ConvRate'],
				palletSize: csvData['PalletConvRate'],
				// company: element['BarCode'],
			});
		});

		// Create record
		const payload: CsvFile = {
			data: dataContentType,
			hasInvalidDate: false,
			errorMessage: null,
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

// # METHOD Get Request
// # /api/inventory

router.get("/inventory_list_integrate", async (req: Request, res: Response) => {
	if (!process.env.INVENTORY_LIST_DIR) {
		throw new Error("INVENTORY_LIST_DIR variable not found");
	}

	if (!process.env.INVENTORY_LIST_HEADER_FILENAME) {
		throw new Error("INVENTORY_LIST_HEADER_FILENAME variable not found");
	}

	if (!process.env.FOLDER_INVENTORY_LIST) {
		throw new Error("FOLDER_INVENTORY_LIST variable not found");
	}

	// ### Filename, column length and Path
	const DIRECTORY = process.env.INVENTORY_LIST_DIR;
	const HEADER_FILENAMES = process.env.INVENTORY_LIST_HEADER_FILENAME.split(", ");
	const FOLDER_NAME = process.env.FOLDER_INVENTORY_LIST;

	// ### Strapi Apis names to call
	const strapiAPI_Validate = "inventory-list-validate";
	const strapiAPI_Insert = "inventory-list-batch";
	const strapi_payload_name = "inventoryLists";

	try {
		const { invalidCsvFiles, validCsvFiles, csvCollection } =
			await csvFilesValidateService(DIRECTORY, HEADER_FILENAMES);

		const { invalidContents, validContents } =
			await onAssignInventoryContentType(validCsvFiles);

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
			console.log('joinInvalidFiles', joinInvalidFiles)
			// Move files to error folder
			await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

			// Send Email Notification
			// const message = `${FOLDER_NAME} integration failed.`;
			//
			// await sendEmail(FOLDER_NAME, message, joinInvalidFiles);
		}

		return res.json("SP-Inventory integration was completed.");
	} catch (error) {
		console.error(error);
		throw error;
	}
});

export { router as inventory };
