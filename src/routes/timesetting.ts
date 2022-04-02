import express, { Request, Response } from "express";
import { csvFilesValidateService } from "../services/csvFilesValidateService";
import { dBValidateService } from "../services/dBValidateService";
import { isEmptyArray } from "../utils/isEmptyArray";
import { csvFilesToBackup } from "../services/csvFilesToBackup";
import { csvFilesToErrorFolder } from "../services/csvFilesToErrorFolder";
import { CsvFile } from "../types/csvFiles-Interface";
import { convertToDate } from "../utils/convertToDateFormat";
import { dBIntegrateServices } from "../services/dBIntegrateService";

/*
 * <Function / Service Usage>
 * csvFilesValidateService
 * onAssignTimeSettingContentType - self
 * dBValidateService
 * dBIntegrateServices
 * csvFilesToBackup
 * csvFilesToErrorFolder
 * sendEmail
 * */

/* < REFs >
TIMESETTING_DIR="./files/sp-timesetting/CSV"
TIMESETTING_HEADER_FILENAME="timesettings"
FOLDER_TIME_SETTING="sp-timesetting"
* */

// ## TimeSetting Helper function
async function onAssignTimeSettingContentType(csvFile: CsvFile[]) {
	const csvCollection: any = [];

	// Loop Start
	for (const validCsvFile of csvFile as CsvFile[]) {
		const dataContentType: any = [];

		validCsvFile.data.map((csvData: any) => {
			// Assign and Collect contentType
			dataContentType.push({
				outletCode: csvData['outletcode'],
				settings: [
					{ no: 1, day: csvData['daymon'], time: csvData['timemon'] },
					{ no: 2, day: csvData['daytue'], time: csvData['timetue'] },
					{ no: 3, day: csvData['daywed'], time: csvData['timewed'] },
					{ no: 4, day: csvData['daythu'], time: csvData['timethu'] },
					{ no: 5, day: csvData['dayfri'], time: csvData['timefri'] },
					{ no: 6, day: csvData['daysat'], time: csvData['timesat'] },
					{ no: 7, day: csvData['daysun'], time: csvData['timesun'] },
					{ no: 8, modified: csvData['modifydate'] },
					{ no: 9, status: csvData['status'] },
				],
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

const router = express.Router();

// # METHOD: GET REQUEST
// # /api/timesetting
router.get("/time_settings_integrate", async (req: Request, res: Response) => {

	if (!process.env.TIMESETTING_DIR) {
		throw new Error("E_TIMESETTING_DIR variable not found");
	}

	if (!process.env.TIMESETTING_HEADER_FILENAME) {
		throw new Error("TIMESETTING_HEADER_FILENAME variable not found");
	}

	if (!process.env.FOLDER_TIME_SETTING) {
		throw new Error("FOLDER_TIME_SETTING variable not found");
	}

	// ### Filename, column length and Path
	const DIRECTORY = process.env.TIMESETTING_DIR;
	const HEADER_FILENAMES = process.env.TIMESETTING_HEADER_FILENAME.split(", ");
	const FOLDER_NAME = process.env.FOLDER_TIME_SETTING;

	// ### Strapi URLs
	const strapiAPI_Validate = "time-settings-validate";
	const strapiAPI_Insert = "outlets-time-settings-batch";
	const strapi_payload_name = "timeSettings";

	try {
		const { invalidCsvFiles, validCsvFiles, csvCollection } =
			await csvFilesValidateService(DIRECTORY, HEADER_FILENAMES);

		const { invalidContents, validContents } =
			await onAssignTimeSettingContentType(validCsvFiles);

		const { invalidFilesValidationDB, successFilesValidationDB } =
			await dBValidateService(validContents, strapiAPI_Validate);

		if (!isEmptyArray(successFilesValidationDB)) {
			await dBIntegrateServices(
			  successFilesValidationDB,
			  strapiAPI_Insert,
			  strapi_payload_name
			);

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
			console.log('joinInvalidFiles', joinInvalidFiles)

			// Move files to error folder
			await csvFilesToErrorFolder(DIRECTORY, FOLDER_NAME);

			// Send Email Notification
			// const message = `${FOLDER_NAME} integration failed.`;
			//
			// await sendEmail(FOLDER_NAME, message, joinInvalidFiles);
		}

		return res.json("SP-TimeSetting integration was completed.");
	} catch (error) {
		console.error(error);
		throw error;
	}
})

export { router as timesetting };