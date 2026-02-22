# Deploying Wasm Image Processor to Vercel

Since this project uses WebAssembly and C++, the deployment process requires that the `.wasm` and `.js` (glue code) are built locally and included in your repository, or built during the Vercel deployment if tools are available.

## Recommended Approach: Include Build Artifacts

Vercel build environments do not come pre-installed with `emsdk` (Emscripten). The easiest way to deploy is to compile locally and push the results.

### 1. Build Locally
Run the compilation command on your machine:
```bash
npm run compile-wasm
```
This updates `public/processor.js` and `public/processor.wasm`.

### 2. Prepare Source
Ensure your `.gitignore` does **not** exclude the `public/processor.*` files.

### 3. Vercel Configuration
Vercel automatically detects the Vite project. Your settings should be:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4. Deploy
You can deploy via the Vercel Dashboard or CLI:
```bash
vercel --prod
```

---

## Alternative: Build on Vercel (Advanced)

If you want to compile C++ *during* the Vercel build, you would need to use a custom build script that downloads `emsdk`.

1. Create a `vercel-build.sh`:
```bash
# Example script to install emsdk on the fly (Slows down build significantly)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..
npm run compile-wasm
npm run build
```

2. Update `package.json`:
```json
"scripts": {
  "build": "sh vercel-build.sh"
}
```

**Note**: The "Include Build Artifacts" method is highly recommended for faster deployments and better stability.
