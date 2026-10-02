export function error(code: string, message: string): unknown {
  return { error: { code, message } };
}
