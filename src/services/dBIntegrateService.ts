import { fetchRequestUrl } from "../utils/fetchRequestUrl";
import { chunkArray } from "../utils/checkArray";
import { CsvFile } from "../types/csvFiles-Interface";

export async function dBIntegrateServices(
  csvFiles: any[],
  strapiApiInsert: string,
  strapi_payload_name: string
) {
  try {
    // ## Iterate csvFiles in the folder
    for (const csvFile of csvFiles) {
      // ### Limit lines to 50 for each iteration
      const chunks: any = chunkArray(csvFile.data, 50);

      // ### Iterate each file lines
      for (let eachChunkFile of chunks) {
        // ### POST REQUEST to access strapi for data validation
        await fetchRequestUrl(strapiApiInsert, "POST", {
          body: JSON.stringify({
            [strapi_payload_name]: eachChunkFile,
          }),
        });
      }
    }
  } catch (e) {
    console.error("error message", e);
    throw e;
  }
}