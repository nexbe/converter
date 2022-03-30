import { readdir } from "fs/promises";
import path from "path";
import { BadRequestError } from "../errors/bad-request-error";

// ### Helper - Validate path and only read CSV files
export async function validateDirectory(DIRECTORY: string) {
  const files = await readdir(DIRECTORY, { withFileTypes: true });
  let csvFiles: any = [];

  if (files.length > 0) {
    csvFiles = files.filter((file) => path.extname(file.name) === ".csv");

    if (csvFiles.length < 1) {
      throw new BadRequestError("CSV files are not exist");
    }
  }
  return csvFiles;
}
