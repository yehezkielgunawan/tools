declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  const factory: () => Promise<import('./heicTypes').HeifLibrary>;
  export default factory;
}
