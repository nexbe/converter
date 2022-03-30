export function isEmptyArray(arg: Object) {
  return !(Array.isArray(arg) && arg.length > 0);
}
