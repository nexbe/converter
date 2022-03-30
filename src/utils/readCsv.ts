// @ts-nocheck
import csvToJson from "convert-csv-to-json";

// ## Helper function to validate CSV content, columns and rows
export function readCsv(file) {
  // valid Length not required I think (validLength)

  let json = csvToJson.parseSubArray("*", ":").getJsonFromCsv(file);
  let data = [];
  let errorMessage: string = null;

  for (const row: number in json) {
    const keys = Object.keys(json[row])[0].split(",");
    const values = json[row][keys].split(",");

    let dataRow = {};
    // # validate if csv column = preset column
    if (keys.length > 0) {
      // if (keys.length === validLength) {

      for (let i = 0; i < keys.length; i++) {
        // Validate Fields
        if (values[i] === undefined) {
          console.log(
            `Integration failed in ${file}. Values structure incorrect at row ${
              row + 1
            } column ${i + 1}`
          );
          // TODO Catch Log
          return {
            data: [],
            errorMessage: `Integration failed in ${file}. Values structure incorrect at row ${
              row + 1
            } column ${i + 1}`,
          };
        }
        // # Trim Values
        dataRow[keys[i]] = values[i].trim().split('"').join("");
      }
      // # collect data
      data.push(dataRow);
    } else {
      console.error(
        `Integrate failed in ${file}. File columns mismatch. This file contains ${keys.length} columns but ${validLength} columns is required.`
      );
      return {
        data: [],
        errorMessage: `Integrate failed in ${file}. File columns mismatch. This file contains ${keys.length} columns but ${validLength} columns is required.`,
      };
      // TODO Catch Log
    }
  }

  return { data, errorMessage };
}
