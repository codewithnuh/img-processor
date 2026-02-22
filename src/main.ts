import { ImageProcessor } from './wasm-bridge';

const processor = new ImageProcessor();
let originalImageData: ImageData | null = null;

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const uploadBtn = document.getElementById('uploadBtn') as HTMLButtonElement;
const uploadPlaceholder = document.getElementById('uploadPlaceholder') as HTMLDivElement;

const thresholdSlider = document.getElementById('thresholdSlider') as HTMLInputElement;
const thresholdVal = document.getElementById('thresholdVal') as HTMLSpanElement;
const removeColorPicker = document.getElementById('removeColorPicker') as HTMLInputElement;

const enhanceThresholdSlider = document.getElementById('enhanceThresholdSlider') as HTMLInputElement;
const enhanceThresholdVal = document.getElementById('enhanceThresholdVal') as HTMLSpanElement;
const enhanceColorPicker = document.getElementById('enhanceColorPicker') as HTMLInputElement;
const boostSlider = document.getElementById('boostSlider') as HTMLInputElement;
const boostVal = document.getElementById('boostVal') as HTMLSpanElement;

const colorPreview = document.getElementById('colorPreview') as HTMLDivElement;
const rgbLabel = document.getElementById('rgbLabel') as HTMLSpanElement;
const removeBgBtn = document.getElementById('removeBgBtn') as HTMLButtonElement;
const enhanceBtn = document.getElementById('enhanceBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

// Helper to convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Initialize Wasm
processor.init().then(() => {
    console.log('Wasm Engine Ready');
}).catch(err => {
    console.error('Failed to init Wasm:', err);
});

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const width = img.width;
                const height = img.height;
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                originalImageData = ctx.getImageData(0, 0, width, height);
                uploadPlaceholder.classList.add('hidden');
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
});

// Eye-dropper Tool
canvas.addEventListener('mousedown', (e) => {
    if (!originalImageData) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    
    // Update both pickers or pick active based on context (default to remove for mouse interaction)
    removeColorPicker.value = hex;
    enhanceColorPicker.value = hex;
    
    colorPreview.style.backgroundColor = hex;
    rgbLabel.textContent = `RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
});

thresholdSlider.addEventListener('input', () => {
    thresholdVal.textContent = thresholdSlider.value;
});

enhanceThresholdSlider.addEventListener('input', () => {
    enhanceThresholdVal.textContent = enhanceThresholdSlider.value;
});

boostSlider.addEventListener('input', () => {
    boostVal.textContent = boostSlider.value;
});

removeBgBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    requestAnimationFrame(() => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
            processor.removeBackground(
                imageData.data, 
                canvas.width, 
                canvas.height, 
                hexToRgb(removeColorPicker.value), 
                parseInt(thresholdSlider.value)
            );
            ctx.putImageData(imageData, 0, 0);
        } catch (e: any) {
            console.error('Processing Error:', e);
            alert(`Processing error: ${e.message || 'Unknown error'}`);
        }
    });
});

enhanceBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    requestAnimationFrame(() => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
            processor.enhanceColor(
                imageData.data,
                canvas.width,
                canvas.height,
                hexToRgb(enhanceColorPicker.value),
                parseInt(enhanceThresholdSlider.value),
                parseFloat(boostSlider.value)
            );
            ctx.putImageData(imageData, 0, 0);
        } catch (e: any) {
            console.error('Processing Error:', e);
            alert(`Processing error: ${e.message || 'Unknown error'}`);
        }
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
    }
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'processed-image.png';
    link.href = canvas.toDataURL();
    link.click();
});
