declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  const factory: () => Promise<import('./types').HeifLibrary>;
  export default factory;
}
