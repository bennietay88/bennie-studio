/**
 * Work around Zod's two prose comments that Rollup treats as malformed PURE
 * annotations. Leave executable code and real tree-shaking markers untouched.
 * Remove this once the upstream comments have been corrected.
 */
export function normalizeZodDocumentationComments(code: string, id: string): string {
  const file = id.replace(/\\/g, "/").split("?")[0];
  if (!/\/node_modules\/zod\/v4\/core\/(?:util|regexes)\.js$/.test(file)) return code;
  return code
    .replace(/(\/\/ Wrapped in a \x60)@__PURE__(\x60 IIFE:)/g, "$1PURE$2")
    .replace(/(\* esbuild will not drop a \x60)@__PURE__(\x60 call whose own argument)/g, "$1PURE$2");
}
