const ObjectProto = Object.prototype;
const ObjectToString = Object.prototype.toString;

export function isObject(input: unknown): input is object {
  return input != null && typeof input === "object";
}

export function isPlainObject(
  input: unknown,
): input is object & Record<string, unknown> {
  if (!input || typeof input !== "object") return false;
  const proto = Object.getPrototypeOf(input);
  if (proto === null) return true;
  return (
    (proto === ObjectProto ||
      Object.getPrototypeOf(proto) === null) &&
    ObjectToString.call(input) === "[object Object]"
  );
}
