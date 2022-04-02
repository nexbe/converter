export function convertToDate(dateString: string) {
  //  Convert a "dd/MM/yyyy" string into a Date object
  let d = dateString.split("/");
  return new Date(d[2] + "/" + d[1] + "/" + d[0]);
}

export function convertContinuedStringToDate(dateString: string) {
  let d = [dateString.slice(0, 4), "/", dateString.slice(4)].join("");
  return new Date([d.slice(0, 7), "/", d.slice(7)].join("")).toISOString();

}
