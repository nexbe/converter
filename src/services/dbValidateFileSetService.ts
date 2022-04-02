import { fetchRequestUrl } from "../utils/fetchRequestUrl";
import { chunkArray } from "../utils/checkArray";
import { CsvFile } from "../types/csvFiles-Interface";

// Check if incomplete or existing record in database

export async function dBValidateFileSetService(
	csvFiles: CsvFile[],
	strapiApiValidate: string,
	fileHeaderName: string
) {
	let invalidFilesValidationDB: CsvFile[] = [];
	let successFilesValidationDB: CsvFile[] = [];

	// ## Iterate csvFiles in the folder
	for (const csvFile of csvFiles) {

		if(csvFile.header === fileHeaderName) {
			// ### Define valid or invalid file for collection
			let isValid = true;

			// ### Limit lines to 50 for each iteration
			const chunks: any = chunkArray(csvFile.data, 50);

			// ### Iterate each file lines
			for (let eachChunkFile of chunks) {

				// ### POST REQUEST to access strapi for data validation
				const response = await fetchRequestUrl(strapiApiValidate, "POST", {
					body: JSON.stringify({
						headers: eachChunkFile,
					}),
				});

				if (!response.success) {
					// ### Create and collect error file message
					const payload: CsvFile = {
						data: [],
						fileName: csvFile.fileName,
						errorMessage: response.message,
						header: csvFile.header,
					};

					invalidFilesValidationDB.push(payload);

					isValid = false;
					break;
				}
			}
			//  ### Create and collect success file message
			if (isValid) successFilesValidationDB.push(csvFile);
		}
	}
	// End Loop
	 return { invalidFilesValidationDB, successFilesValidationDB };
}
