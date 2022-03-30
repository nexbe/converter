// Check if filenames has any duplicates
// Ensure that I'm accepting 3 files.
// If files exist and number of files = total files required. Proceed further ..

import { CsvFile } from "../types/csvFiles-Interface";

export async function csvFilesValidateUniqueService(
  DIRECTORY: string,
  HEADER_FILENAMES: string[],
  csvFiles: CsvFile[]
) {
  // Initialize total files length
  const totalFilesRequired: number = HEADER_FILENAMES.length;

  // Get file header names (array)
  const fileHeaders = csvFiles.map((file) => {
    return file.header;
  });

  if (fileHeaders.length > 0 && fileHeaders.length === totalFilesRequired) {
    // Check if header name has any duplicates
    const isDuplicate = fileHeaders.some((item, idx) => {
      return fileHeaders.indexOf(item) !== idx;
    });

    return !isDuplicate;
  }
  return false;
}
