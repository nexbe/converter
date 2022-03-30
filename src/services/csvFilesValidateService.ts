import { readCsv } from "../utils/readCsv";
import { validateDirectory } from "../utils/validateDirectory";
import { BadRequestError } from "../errors/bad-request-error";
import { isEmpty } from "../utils/isEmptyObject";
import { CsvFile } from "../types/csvFiles-Interface";

// Check file existence in the directory regards given filesNames
// Check total files required by the serves

export async function csvFilesValidateService(
  DIRECTORY: string,
  HEADER_FILENAMES: string[]
) {
  // ### Helper - Validate path only read CSV files
  const csvFiles = await validateDirectory(DIRECTORY);

  const csvDistinctFileName: any = {};
  // # Group files in Array by header filename
  for (const headerFileName of HEADER_FILENAMES) {
    for (const file of csvFiles) {
      // # To extract header from csvFiles
      const csvHeaderFile = file.name.slice(0, file.name.indexOf("_"));

      // # Group up in array for same header name
      if (headerFileName === csvHeaderFile) {
        csvDistinctFileName[csvHeaderFile] =
          csvDistinctFileName[csvHeaderFile] || [];
        csvDistinctFileName[csvHeaderFile].push(file.name);
      }
    }
  }

  if (isEmpty(csvDistinctFileName)) {
    // why catch ugly
    throw new BadRequestError(`file not exist in ${DIRECTORY}`);
  }

  let csvCollection: any = [];

  // # iterate files in the CSV folder
  for (const header of HEADER_FILENAMES) {
    if (csvDistinctFileName[header] !== undefined) {
      for (const csvFileName of csvDistinctFileName[header]) {
        // # Iterate file's column and read fields
        const filePath = `${DIRECTORY}/${csvFileName}`;

        let csvRead = readCsv(filePath);

        // Create an object
        const payload: CsvFile = {
          data: csvRead.data,
          errorMessage: csvRead.errorMessage,
          fileName: csvFileName,
          header,
        };

        // push object to collection
        csvCollection.push(payload);
      }
    }
  }

  const invalidCsvFiles = csvCollection.filter(
    (item: any) => item.data.length < 1
  );
  const validCsvFiles = csvCollection.filter(
    (item: any) => item.data.length > 0
  );

  return { invalidCsvFiles, validCsvFiles, csvCollection };
}
