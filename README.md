# 🎨 Wasm-Powered Image Processor

A high-performance, on-device image processing application built with **C++**, **WebAssembly**, and **TypeScript**. This tool allows for professional-grade background removal and color enhancement directly in the browser with zero latency.

## ✨ Features
- **Chroma Key Background Removal**: Select any color with the eye-dropper or color picker and remove it using Euclidean distance thresholding.
- **Targeted Color Enhancement**: Select a specific color range and boost its saturation/vibrancy.
- **High Resolution Support**: Supports images up to 6000px while maintaining the original aspect ratio and resolution.
- **Wasm Engine**: Logic runs in a C++ module compiled to WebAssembly for near-native performance.
- **Zero-Copy Memory**: leverages the Wasm linear heap for efficient pixel manipulation.

---

## 🚀 Local Setup

### 1. Prerequisites
- **Node.js**: [Download here](https://nodejs.org/)
- **Emscripten SDK (emsdk)**: Required only if you want to modify the C++ logic.
  ```powershell
  git clone https://github.com/emscripten-core/emsdk.git
  cd emsdk
  ./emsdk install latest
  ./emsdk activate latest
  # Load environment
  ./emsdk_env.bat
  ```

### 2. Installation
```bash
npm install
```

### 3. Compilation (C++ to Wasm)
If you have `emsdk` installed and activated:
```bash
npm run compile-wasm
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Deployment to Vercel

Vercel is the recommended platform for this project. Since Vercel does not have `emsdk` pre-installed, follow the **"Build Artifacts"** approach for the most reliable deployment.

### Step 1: Build Locally
The Wasm binary must be generated locally before pushing to GitHub:
1. Run `npm run compile-wasm` (Ensures `public/processor.wasm` is up to date).
2. Ensure `public/processor.js` and `public/processor.wasm` are **NOT** in your `.gitignore`.

### Step 2: Push to GitHub/GitLab
Push your entire project (including the `public/` folder) to your repository.

### Step 3: Connect to Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New"** > **"Project"**.
3. Import your repository.
4. Vercel will auto-detect the **Vite** framework.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

---

## 📂 Project Structure
- `/cpp/processor.cpp`: Core C++ image processing logic.
- `/src/wasm-bridge.ts`: TypeScript wrapper managing Wasm memory/heap.
- `/src/main.ts`: UI logic, Canvas handling, and event management.
- `/public/`: Contains the compiled Wasm binary and assets.

## 🛠️ Developed by
Built with ❤️ using Senior Full-Stack Architecture principles and WebAssembly.
