export interface WasmModule {
  _remove_background: (buffer: number, width: number, height: number, tr: number, tg: number, tb: number, threshold: number) => void;
  _enhance_color: (buffer: number, width: number, height: number, tr: number, tg: number, tb: number, threshold: number, boost: number) => void;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPU8: Uint8Array;
}

declare const createModule: () => Promise<WasmModule>;

export class ImageProcessor {
  private module: WasmModule | null = null;

  async init() {
    if (this.module) return;
    // @ts-ignore
    this.module = await createModule();
  }

  removeBackground(data: Uint8ClampedArray, width: number, height: number, targetColor: [number, number, number], threshold: number) {
    if (!this.module) throw new Error("Wasm module not initialized");

    const size = data.length;
    const ptr = this.module._malloc(size);
    if (ptr === 0) throw new Error("Wasm Malloc failed: Out of Memory");
    
    // Copy data to Wasm heap
    this.module.HEAPU8.set(new Uint8Array(data.buffer, data.byteOffset, data.length), ptr);

    this.module._remove_background(ptr, width, height, targetColor[0], targetColor[1], targetColor[2], threshold);

    // Copy back from Wasm heap
    const result = new Uint8ClampedArray(this.module.HEAPU8.buffer, ptr, size);
    data.set(result);

    this.module._free(ptr);
  }

  enhanceColor(data: Uint8ClampedArray, width: number, height: number, targetColor: [number, number, number], threshold: number, boostFactor: number) {
    if (!this.module) throw new Error("Wasm module not initialized");

    const size = data.length;
    const ptr = this.module._malloc(size);
    if (ptr === 0) throw new Error("Wasm Malloc failed: Out of Memory");

    this.module.HEAPU8.set(new Uint8Array(data.buffer, data.byteOffset, data.length), ptr);

    this.module._enhance_color(ptr, width, height, targetColor[0], targetColor[1], targetColor[2], threshold, boostFactor);

    const result = new Uint8ClampedArray(this.module.HEAPU8.buffer, ptr, size);
    data.set(result);

    this.module._free(ptr);
  }
}
