# Shared HEIC processing

Both Image Converter and Image Compressor use this pipeline. HEIC input is
limited to 32 MiB, 50,000,000 pixels, and 12,000 pixels per edge. JPEG/PNG limits
are unchanged. Output retains the existing bounded canvas policy.

- Inspection opens the container and selects the primary image without
  decoding pixels. A count of top-level images accompanies the dimensions.
- Single-image containers try native bitmap decoding with explicit output
  dimensions. A mismatched-size bitmap is closed and discarded.
- Multiple-image containers always use the worker so primary-image selection
  is explicit.
- The worker accesses the pinned libheif-js 1.23.5 low-level interleaved channel,
  resamples directly from its WASM-memory view with premultiplied-alpha area
  averaging, and transfers only bounded output pixels.
- It does **not** use `HeifImage.display()`, allocate a second full-resolution
  RGBA destination, or create a full-resolution source canvas.
- Every job has its own worker, terminated on completion, failure, timeout, or
  cancellation. Native image handles and bitmaps are released explicitly.

The decoder still needs full-resolution WASM memory. Worker resizing is **not**
decode-time downsampling and does not guarantee that a low-memory mobile browser
can process every 48 MP photo. Errors must not suggest that sending the same
corrupt/unsupported image to the compressor can repair it.

## Feasibility evidence and remaining gate

On the development Mac, synthetic 8064 × 6048 HEICs decoded in Chromium,
Firefox, and WebKit workers across three fresh-worker runs. The observed WASM
heap was approximately 260 MiB; only WebKit's native bitmap decoder accepted
the same HEIC. Smaller 5712 × 4284 HEICs used approximately 131 MiB of WASM heap.
These are synthetic-fixture measurements, not upper bounds for arbitrary files.

Automated fixtures verify dimensions, primary selection, rotation, downsizing,
and image content. Physical iPhone Safari, real iPhone HDR/wide-gamut inputs,
and real multi-image containers still require user-device validation before
claiming reliable mobile 48 MP support. Browser emulation is not a substitute.
