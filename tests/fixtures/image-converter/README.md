# Image Converter fixtures

These small synthetic fixtures contain no personal photos.

- `artwork.svg`: red-to-blue gradient clipped to leave a transparent right edge.
- `transparent.png`: rasterization of that SVG using the existing Sharp dependency.
- `oriented.jpg`: the same image flattened onto white, with EXIF orientation 6.
- `photo.heic`: the PNG encoded as HEIC using macOS `sips`.
- `rotated.heic`: the same HEIC with a 90-degree container rotation (`irot`).

Regenerate the binary fixtures from the repository root:

```sh
node --input-type=module -e 'import sharp from "sharp"; const dir="tests/fixtures/image-converter/"; await sharp(dir+"artwork.svg").png().toFile(dir+"transparent.png"); await sharp(dir+"artwork.svg").flatten({background:"#fff"}).withMetadata({orientation:6}).jpeg().toFile(dir+"oriented.jpg");'
rtk proxy sips -s format heic tests/fixtures/image-converter/transparent.png --out tests/fixtures/image-converter/photo.heic
rtk proxy sips --rotate 90 tests/fixtures/image-converter/photo.heic --out tests/fixtures/image-converter/rotated.heic
```

The JPEG and rotated HEIC's displayed dimensions are 32 × 48; the PNG, SVG, and original HEIC are
48 × 32. These fixtures supplement, not replace, testing real iPhone
portrait photos, HDR inputs, and multi-image containers before release.
