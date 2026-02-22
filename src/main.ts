import { ImageProcessor } from './wasm-bridge';

// Types
interface ProcessSettings {
    targetColor: [number, number, number];
    threshold: number;
}

interface ImageItem {
    id: string;
    file: File;
    name: string;
    format: string;
    width: number;
    height: number;
    originalImageData: ImageData;
    processedImageData: ImageData | null;
    settings: ProcessSettings;
    status: 'pending' | 'done';
}

declare const JSZip: any;

const MAX_UPLOADS = 50;
const processor = new ImageProcessor();
let queue: ImageItem[] = [];
let currentIndex: number = -1;

// --- DOM ELEMENTS ---
const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })!;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const addImagesBtn = document.getElementById('addImagesBtn') as HTMLButtonElement;
const imageQueueContainer = document.getElementById('imageQueue') as HTMLDivElement;
const queueCountLabel = document.getElementById('queueCount') as HTMLSpanElement;
const batchProcessBtn = document.getElementById('batchProcessBtn') as HTMLButtonElement;
const clearAllBtn = document.getElementById('clearAllBtn') as HTMLButtonElement;
const noImageOverlay = document.getElementById('noImageOverlay') as HTMLDivElement;
// const dropZone = document.getElementById('dropZone') as HTMLDivElement;

const thresholdSlider = document.getElementById('thresholdSlider') as HTMLInputElement;
const thresholdVal = document.getElementById('thresholdVal') as HTMLSpanElement;
const removeColorPicker = document.getElementById('removeColorPicker') as HTMLInputElement;
const colorPreview = document.getElementById('colorPreview') as HTMLDivElement;

const applyAllSettingsBtn = document.getElementById('applyAllSettingsBtn') as HTMLButtonElement;
const removeBgBtn = document.getElementById('removeBgBtn') as HTMLButtonElement;

// Progress
const progressOverlay = document.getElementById('progressOverlay') as HTMLDivElement;
const progressCircle = document.getElementById('progressCircle') as unknown as SVGCircleElement;
const progressPercent = document.getElementById('progressPercent') as HTMLSpanElement;
const queueIndexLabel = document.getElementById('queueIndex') as HTMLSpanElement;
const progressDetail = document.getElementById('progressDetail') as HTMLSpanElement;

// Stats
const canvasRes = document.getElementById('canvasRes') as HTMLSpanElement;

// --- HELPERS ---
function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Ensure Wasm is loaded
processor.init().then(() => console.log('Wasm Engine Active'));

// --- QUEUE MANAGEMENT ---
async function handleFiles(files: FileList) {
    const filesToLoad = Array.from(files).slice(0, MAX_UPLOADS - queue.length);
    if (!filesToLoad.length) return;

    noImageOverlay.classList.add('hidden');

    for (const file of filesToLoad) {
        const item = await createItem(file);
        queue.push(item);
        updateQueueUI();
    }

    if (currentIndex === -1) selectImage(0);
}

async function createItem(file: File): Promise<ImageItem> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d', { alpha: true })!;
                tempCtx.drawImage(img, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, img.width, img.height);

                resolve({
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    name: file.name,
                    format: file.type,
                    width: img.width,
                    height: img.height,
                    originalImageData: imageData,
                    processedImageData: null,
                    settings: { targetColor: [0, 255, 0], threshold: 30 },
                    status: 'pending'
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

function updateQueueUI() {
    imageQueueContainer.innerHTML = '';
    queueCountLabel.textContent = `${queue.length} / ${MAX_UPLOADS} Images`;

    if (queue.length === 0) {
        noImageOverlay.classList.remove('hidden');
        batchProcessBtn.classList.add('hidden');
        clearAllBtn.classList.add('hidden');
        return;
    }

    batchProcessBtn.classList.remove('hidden');
    clearAllBtn.classList.remove('hidden');

    queue.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = `group p-3 bg-slate-800/40 rounded-2xl border border-slate-800 flex items-center justify-between transition-all hover:bg-slate-800 ${index === currentIndex ? 'border-indigo-500 ring-1 ring-indigo-500/50' : ''}`;
        
        card.innerHTML = `
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase flex-shrink-0">
                    ${item.status === 'done' ? '✓' : item.name.split('.').pop()}
                </div>
                <div class="overflow-hidden">
                    <p class="text-[11px] font-bold text-slate-300 truncate">${item.name}</p>
                    <p class="text-[9px] font-black uppercase text-slate-600">${item.width}PX</p>
                </div>
            </div>
            <div class="flex gap-2">
                ${item.status === 'done' ? `
                    <button class="dl-single p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors" title="Download PNG">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-width="2.5"/></svg>
                    </button>
                ` : ''}
                <button class="remove-single p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                </button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.remove-single')) {
                removeItem(index);
            } else if (target.closest('.dl-single')) {
                downloadItem(index);
            } else {
                selectImage(index);
            }
        });

        imageQueueContainer.appendChild(card);
    });
}

function selectImage(index: number) {
    currentIndex = index;
    const item = queue[index];
    
    canvas.width = item.width;
    canvas.height = item.height;
    ctx.putImageData(item.processedImageData || item.originalImageData, 0, 0);

    // Update UI controls to match this item's settings
    removeColorPicker.value = rgbToHex(...item.settings.targetColor);
    thresholdSlider.value = item.settings.threshold.toString();
    thresholdVal.textContent = item.settings.threshold.toString();
    colorPreview.style.backgroundColor = removeColorPicker.value;

    canvasRes.textContent = `Res: ${item.width} x ${item.height}`;
    updateQueueUI();
}

function removeItem(index: number) {
    queue.splice(index, 1);
    if (currentIndex === index) {
        currentIndex = queue.length > 0 ? 0 : -1;
    } else if (currentIndex > index) {
        currentIndex--;
    }
    updateQueueUI();
    if (currentIndex !== -1) selectImage(currentIndex);
}

// --- PIPELINE ---
async function processAll() {
    if (!queue.length) return;

    progressOverlay.style.display = 'flex';
    
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        
        // Update Progress
        const percent = Math.round(((i + 1) / queue.length) * 100);
        progressPercent.textContent = `${percent}%`;
        queueIndexLabel.textContent = `Processing ${i + 1} / ${queue.length}`;
        progressDetail.textContent = item.name;
        
        if (progressCircle) {
            const offset = 283 - (283 * percent) / 100;
            progressCircle.style.setProperty('stroke-dashoffset', offset.toString());
        }

        await new Promise((resolve) => requestAnimationFrame(async () => {
             // Essential: Copy original data and remove background using item-specific settings
             const workingData = new Uint8ClampedArray(item.originalImageData.data);
             
             processor.removeBackground(
                 workingData,
                 item.width,
                 item.height,
                 item.settings.targetColor,
                 item.settings.threshold
             );

             item.processedImageData = new ImageData(workingData, item.width, item.height);
             item.status = 'done';
             resolve(true);
        }));
    }

    setTimeout(() => {
        progressOverlay.style.display = 'none';
        updateQueueUI();
        if (currentIndex !== -1) selectImage(currentIndex);
        downloadAllAsZip(); // Automatically trigger ZIP after batch
    }, 500);
}

async function processSingle() {
    if (currentIndex === -1) return;
    const item = queue[currentIndex];
    
    // Update settings for local item before processing
    item.settings.targetColor = hexToRgb(removeColorPicker.value);
    item.settings.threshold = parseInt(thresholdSlider.value);

    // Visual feedback
    removeBgBtn.textContent = 'Processing...';
    removeBgBtn.disabled = true;

    await new Promise((resolve) => setTimeout(resolve, 100)); // UI Breath

    const workingData = new Uint8ClampedArray(item.originalImageData.data);
    processor.removeBackground(
        workingData,
        item.width,
        item.height,
        item.settings.targetColor,
        item.settings.threshold
    );

    item.processedImageData = new ImageData(workingData, item.width, item.height);
    item.status = 'done';
    
    ctx.putImageData(item.processedImageData, 0, 0);
    removeBgBtn.textContent = 'Process Current';
    removeBgBtn.disabled = false;
    updateQueueUI();
}

async function downloadItem(index: number) {
    const item = queue[index];
    const data = item.processedImageData || item.originalImageData;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = item.width;
    tempCanvas.height = item.height;
    const tempCtx = tempCanvas.getContext('2d', { alpha: true })!;
    tempCtx.putImageData(data, 0, 0);

    // Forces PNG to preserve transparency
    tempCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `removed_bg_${item.name.replace(/\.[^/.]+$/, "")}.png`;
        a.click();
    }, 'image/png');
}

async function downloadAllAsZip() {
    const zip = new JSZip();
    const processed = queue.filter(it => it.status === 'done' && it.processedImageData);
    
    if (!processed.length) return;

    for (const item of processed) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = item.width;
        tempCanvas.height = item.height;
        tempCanvas.getContext('2d', { alpha: true })!.putImageData(item.processedImageData!, 0, 0);
        
        const blob = await new Promise<Blob>((res) => tempCanvas.toBlob(res as any, 'image/png'));
        zip.file(`${item.name.replace(/\.[^/.]+$/, "")}.png`, blob);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WasmStudio_Batch_${Date.now()}.zip`;
    a.click();
}

// --- EVENTS ---
addImagesBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files) handleFiles(files);
});

// Color Picker / Sliders
removeColorPicker.addEventListener('input', () => {
    colorPreview.style.backgroundColor = removeColorPicker.value;
    if (currentIndex !== -1) {
        queue[currentIndex].settings.targetColor = hexToRgb(removeColorPicker.value);
    }
});

thresholdSlider.addEventListener('input', () => {
    thresholdVal.textContent = thresholdSlider.value;
    if (currentIndex !== -1) {
        queue[currentIndex].settings.threshold = parseInt(thresholdSlider.value);
    }
});

// Sync Logic
applyAllSettingsBtn.addEventListener('click', () => {
    if (currentIndex === -1) return;
    const currentSettings = {
        targetColor: hexToRgb(removeColorPicker.value),
        threshold: parseInt(thresholdSlider.value)
    };

    queue.forEach(item => {
        item.settings = { ...currentSettings };
    });
    
    alert(`Applied ${removeColorPicker.value} (Thr: ${thresholdSlider.value}) to all ${queue.length} images.`);
});

// Processing
removeBgBtn.addEventListener('click', processSingle);
batchProcessBtn.addEventListener('click', processAll);

clearAllBtn.addEventListener('click', () => {
    queue = [];
    currentIndex = -1;
    updateQueueUI();
});

// Eye-dropper
canvas.addEventListener('mousedown', (e) => {
    if (currentIndex === -1) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    
    removeColorPicker.value = hex;
    colorPreview.style.backgroundColor = hex;
    
    // Auto-update item settings
    queue[currentIndex].settings.targetColor = [pixel[0], pixel[1], pixel[2]];
});
