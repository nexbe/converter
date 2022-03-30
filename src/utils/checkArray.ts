// ## Helper function to create array chunk and limits
export function chunkArray(arr: any, chunkSize: any) {
  if (chunkSize <= 0) {
    return false;
  }
  const chunkSizes = [];
  for (let i = 0, len = arr.length; i < len; i += chunkSize)
    chunkSizes.push(arr.slice(i, i + chunkSize));
  return chunkSizes;
}
