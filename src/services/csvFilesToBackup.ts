const { promisify } = require("util");
const fs = require("fs");
const renameFile = promisify(fs.rename);
import { CsvFile } from "../types/csvFiles-Interface";

export async function csvFilesToBackup(directory: string, csvFiles: CsvFile[]) {
  console.log("directory", directory);
  try {
    // Create new folder backup if not existed
    if (!fs.existsSync(`${directory}/backup`)) {
      fs.mkdirSync(`${directory}/backup`);
    }

    return await Promise.all(
      csvFiles.map(async (csv) => {
        const currentPath = `${directory}/${csv.fileName}`;
        let newPath = `${directory}/backup/${csv.fileName}`;

        await renameFile(currentPath, newPath);
      })
    );
  } catch (e) {
    throw e;
  }
}
