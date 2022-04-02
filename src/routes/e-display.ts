import express, { Request, Response } from "express";
import { csvFilesValidateService } from "../services/csvFilesValidateService";
import { csvFilesValidateUniqueService } from "../services/csvFilesValidateUniqueService";
import { csvFilesToErrorFolder } from "../services/csvFilesToErrorFolder";
import { sendEmail } from "../services/sendEmail";
import { CsvFile } from "../types/csvFiles-Interface";
import { convertContinuedStringToDate } from "../utils/convertToDateFormat";
import { dBIntegrateServices } from "../services/dBIntegrateService";
import { csvFilesToBackup } from "../services/csvFilesToBackup";
import { dBValidateFileSetService } from "../services/dbValidateFileSetService";

/*
 * <Functions / Services Usages>
 * csvFilesValidateService
 * csvFilesValidateUniqueService - self
 * onAssignEdisplayContentType - self
 * dBValidateFileSetService
 * dBIntegrateServices
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 *
 * <Sub Function>
 * assignEdisplayPUS37 - self
 * assignEdisplayBillsPUS36 - self
 * mergeEdisplayFileSet -self
 *
 * */

/*
< Refs >
E_DISPLAY_DIR="./files/sp-edisplay/CSV"
E_DISPLAY_HEADER_FILENAME="PUS37, PUS36"
E_DISPLAY_NAME="PUS37"
E_DISPLAY_BILLS="PUS36"
FOLDER_EDISPLAY="sp-edisplay"
*/


// Merge File Set
const mergeEdisplayFileSet = async(validCsvFile: any[], edisplays: string, bills: string) => {
	let collection = []
	let data = []

	// Flatten depth Arrays
	const eDisplays = validCsvFile.filter((file) => file.header === edisplays).map(item => item.data).flat()
	const eBills = validCsvFile.filter((file) => file.header === bills).map(item => item.data).flat()

	// Merge / join between eDisplay and eBill
	for (const eDisplay of eDisplays) {
		for (const eBill of eBills) {
			if (eDisplay.refNo === eBill.refNo) {
				data.push({
					...eDisplay,
					...eBill,
				})
			}
		}
	}

	collection.push({ data });
	return collection;
}

// ## File PUS37
const assignEdisplayPUS37 = async (validCsvFile: any) => {
	let hasInvalidDate: boolean[] = [];
	const data: any = [];

	validCsvFile.data.forEach((element: any) => {
		const startDate = convertContinuedStringToDate(element['SDMFRDT'])
		const	endDate = convertContinuedStringToDate(element['SDMTODT'])
		const	confirmDate = convertContinuedStringToDate(element['SHTCNFD'])
		const	uploadDate = convertContinuedStringToDate(element['SWTSNDD'])

		const datesList = [
			startDate.toString(),
			endDate.toString(),
			confirmDate.toString(),
			uploadDate.toString(),
		];
		// Collect booleans of date validations
		hasInvalidDate.push(datesList.includes("Invalid Date"));

		data.push({
			refNo: element['SHTREFN'],
			vendor: element['SHMVNNO'],
			buyerCode: element['SZMBYCD'],
			incentiveCode: element['SHMDIDS'],
			startDate,
			endDate,
			confirmDate,
			uploadDate
		});
	});

	// Create record
	const payload: CsvFile = {
		data,
		hasInvalidDate: hasInvalidDate.includes(true),
		errorMessage:	hasInvalidDate.includes(true)
			? "Contains invalid date format"
			: null,
		fileName: validCsvFile.fileName,
		header: validCsvFile.header,
	};

	return payload;
};

// ## File PUS36
const assignEdisplayBillsPUS36 = async (validCsvFile: any) => {
	const data: any = [];

	validCsvFile.data.forEach((element: any) => {
		data.push({
			refNo: element['SHTREFN'],
			seqNo: element['SHTSEQN'],
			billNo: element['SHTIREF'],
			remark: element['SFILENM'],
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
async function onAssignEdisplayContentType(csvFile: CsvFile[]) {
	const csvCollection: any = [];
	let response;
	// Loop Start

	await Promise.all(
		csvFile.map(async (validCsvFile: any) => {
			if (validCsvFile.header === process.env.E_DISPLAY_NAME) {
				response = await assignEdisplayPUS37(validCsvFile);
				csvCollection.push(response);
			}

			if (
				validCsvFile.header ===
				process.env.E_DISPLAY_BILLS
			) {
				response = await assignEdisplayBillsPUS36(validCsvFile);
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

const router = express.Router();

// # ROUTER GET
router.get("/edisplay_integrate", async (req: Request, res: Response) => {

	if (!process.env.E_DISPLAY_DIR) {
		throw new Error("E_DISPLAY_DIR variable not found");
	}

	if (!process.env.E_DISPLAY_HEADER_FILENAME) {
		throw new Error("E_DISPLAY_HEADER_FILENAME variable not found");
	}

	if (!process.env.E_DISPLAY_NAME) {
		throw new Error("E_DISPLAY_NAME variable not found");
	}

	if (!process.env.E_DISPLAY_BILLS) {
		throw new Error("E_DISPLAY_BILLS variable not found");
	}

	if (!process.env.FOLDER_EDISPLAY) {
		throw new Error("FOLDER_EDISPLAY variable not found");
	}

	// ### Filename and Path
	const DIRECTORY = process.env.E_DISPLAY_DIR;
	const HEADER_FILENAMES = process.env.E_DISPLAY_HEADER_FILENAME.split(", ");
	const FOLDER_NAME = process.env.FOLDER_EDISPLAY;

	const E_DISPLAY_NAME = process.env.E_DISPLAY_NAME;
	const E_DISPLAY_BILLS = process.env.E_DISPLAY_BILLS;

	// ### Strapi Apis names to call
	const strapiAPI_Validate = "e-displays-validate";
	const strapiAPI_Insert = "e-displays-batch";
	const strapi_payload_name = "edisplays";

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
			//await sendEmail(FOLDER_NAME, message, csvCollection);

			return res.status(200).json(message);
		}

		// Do checking on strapi content type. No error will be thrown.
		const { inValidContents, validContents } =
			await onAssignEdisplayContentType(validCsvFiles);

		// check if any files has invalidContent. End It
		if (inValidContents.length > 0) {
			// Move files to error folder
			await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

			// Send Email Notification
			const message = `${FOLDER_NAME} integration failed. CSVs has invalid columns or values.`;
			// await sendEmail(FOLDER_NAME, message, inValidContents);

			return res.status(200).json(message);
		}

		const { invalidFilesValidationDB } =
			await dBValidateFileSetService(validContents, strapiAPI_Validate, E_DISPLAY_NAME);

		if (invalidFilesValidationDB.length > 0) {
			console.log('invalidFilesValidationDB', invalidFilesValidationDB)
			// Move files to error folder
			await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

			const message = `${FOLDER_NAME} integration failed. Incomplete or existing data records to proceed`;
			// await sendEmail(FOLDER_NAME, message, invalidFilesValidationDB);
			return res.status(200).json(message);
		}

		const formatedValidData = await mergeEdisplayFileSet(validContents, E_DISPLAY_NAME, E_DISPLAY_BILLS)


		// // Insert Database
		await dBIntegrateServices (
			formatedValidData,
			strapiAPI_Insert,
			strapi_payload_name
		);

		// Backup Folder
		await csvFilesToBackup(DIRECTORY, csvCollection);
		return res.json("E-Display integration was completed.");
	} catch (error) {
		throw error;
	}

})

export { router as eDisplay };
