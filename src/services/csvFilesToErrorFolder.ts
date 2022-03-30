import * as path from "path";

const { promisify } = require('util');
const fs = require('fs');
const renameFile = promisify(fs.rename);

import {readdir} from "fs/promises";
import {isEmptyArray} from "../utils/isEmptyArray";
import {BadRequestError} from "../errors/bad-request-error";


export async function csvFilesToErrorFolder (directory:string, folderName: string) {

  let errorFilesPath: string = path.join(
    process.cwd(),
    "errorFiles",
    folderName,
  );

  //  Create new folder backup if not existed
  if (!fs.existsSync(errorFilesPath)) {
    fs.mkdirSync(errorFilesPath, { recursive: true });
  }

  const files = await readdir(directory, {withFileTypes: true});

  if(isEmptyArray(files)) {
    throw new BadRequestError(`${directory} is empty`)
  }
  return await Promise.all(
    files.map(async file => {

      const fileName = path.basename(file.name)

      // TODO need to improve
      if(fileName !== "backup"){
        const currentPath = `${directory}/${fileName}`
        let newPath = `${process.cwd()}/errorFiles/${folderName}/${fileName}`;

        await renameFile(currentPath, newPath);
      }
    }))
  }