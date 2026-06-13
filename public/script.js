const video = document.getElementById('video');
const startBtn = document.getElementById('start-btn');
const retakeBtn = document.getElementById('retake-btn');
const downloadBtn = document.getElementById('download-btn');
const countdownEl = document.getElementById('countdown');
const flashEl = document.getElementById('flash');
const instructionEl = document.getElementById('instruction');

const cameraSection = document.getElementById('camera-section');
const resultSection = document.getElementById('result-section');

const stripCanvas = document.getElementById('strip-canvas');
const stripCtx = stripCanvas.getContext('2d');
const photoCanvas = document.getElementById('photo-canvas');
const photoCtx = photoCanvas.getContext('2d');

const qrcodeContainer = document.getElementById('qrcode');

let serverUrl = '';
let stream = null;
const NUM_PHOTOS = 3;
const COUNTDOWN_TIME = 3;
let capturedPhotos = [];
let bgImage = new Image();
bgImage.src = 'assets/frame/Frame Photo - Layer 1.png?v=' + new Date().getTime();
let bgImageLayer3 = new Image();
bgImageLayer3.src = 'assets/frame/Frame Photo Layer 3.png?v=' + new Date().getTime();

// Setup Strip Dimensions
const STRIP_WIDTH = 1200;
const STRIP_HEIGHT = 2400;
stripCanvas.width = STRIP_WIDTH;
stripCanvas.height = STRIP_HEIGHT;

const PHOTO_WIDTH = 1000;
const PHOTO_HEIGHT = 600; 
const PHOTO_X = 100;
const START_Y = 240;
const SPACING = 60;

// Initialize
async function init() {
    startCamera();
}

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        instructionEl.innerText = "Camera access denied or unavailable.";
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

// Capture Logic
startBtn.addEventListener('click', startCaptureSequence);

async function startCaptureSequence() {
    startBtn.classList.add('hidden');
    capturedPhotos = [];
    
    for (let i = 0; i < NUM_PHOTOS; i++) {
        instructionEl.innerText = `Photo ${i + 1} of ${NUM_PHOTOS}... Get ready!`;
        await runCountdown();
        capturePhoto();
        triggerFlash();
        await new Promise(r => setTimeout(r, 1000));
    }

    instructionEl.innerText = "Processing your strip...";
    generateStrip();
}

function playBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
}

function runCountdown() {
    return new Promise((resolve) => {
        let count = COUNTDOWN_TIME;
        countdownEl.innerText = count;
        countdownEl.classList.remove('hidden');
        playBeep();

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownEl.innerText = count;
                playBeep();
            } else {
                clearInterval(interval);
                countdownEl.classList.add('hidden');
                resolve();
            }
        }, 1000);
    });
}

function triggerFlash() {
    flashEl.classList.add('active');
    
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}

    setTimeout(() => flashEl.classList.remove('active'), 150);
}

function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    capturedPhotos.push(canvas.toDataURL('image/png'));
}

async function generateStrip() {
    stripCtx.clearRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);

    if (bgImage.complete) {
        stripCtx.drawImage(bgImage, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
    }

    const configs = [
        { rot: 4.07, x: 79.92, y: 121.23 },
        { rot: -7.77, x: 64, y: 710.14 },
        { rot: 1.94, x: 90.09, y: 1377.21 }
    ];

    for (let i = 0; i < capturedPhotos.length; i++) {
        if (!configs[i]) continue;

        const img = new Image();
        img.src = capturedPhotos[i];
        await new Promise(r => { img.onload = r; });

        const scale = Math.max(PHOTO_WIDTH / img.width, PHOTO_HEIGHT / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const srcX = (drawW - PHOTO_WIDTH) / 2 / scale;
        const srcY = (drawH - PHOTO_HEIGHT) / 2 / scale;

        stripCtx.save();
        stripCtx.translate(configs[i].x + PHOTO_WIDTH / 2, configs[i].y + PHOTO_HEIGHT / 2);
        stripCtx.rotate(configs[i].rot * Math.PI / 180);
        
        stripCtx.drawImage(img, 
            srcX, srcY, PHOTO_WIDTH / scale, PHOTO_HEIGHT / scale, 
            -PHOTO_WIDTH / 2, -PHOTO_HEIGHT / 2, PHOTO_WIDTH, PHOTO_HEIGHT 
        );

        stripCtx.lineWidth = 10.45;
        stripCtx.strokeStyle = '#F3C300';
        stripCtx.strokeRect(-PHOTO_WIDTH / 2, -PHOTO_HEIGHT / 2, PHOTO_WIDTH, PHOTO_HEIGHT);
        
        stripCtx.restore();
    }

    if (bgImageLayer3.complete) {
        stripCtx.drawImage(bgImageLayer3, 0, 0, STRIP_WIDTH, STRIP_HEIGHT);
    }

    showResult();
}

async function showResult() {
    stopCamera();
    cameraSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    const finalImageBase64 = stripCanvas.toDataURL('image/png');
    downloadBtn.href = finalImageBase64;

    try {
        // tmpfiles.org - Gratis, tanpa API key! File tersedia 24 jam.
        qrcodeContainer.innerHTML = '<div class="loader"></div><p style="color:#00f3ff; font-size:14px; margin-top:10px;">Uploading & Generating QR... 🚀</p>';

        // Konversi base64 ke Blob
        const base64Data = finalImageBase64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'image/png' });

        const formData = new FormData();
        formData.append('file', blob, 'photostrip.png');

        const res = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        const data = await res.json();
        console.log('tmpfiles.org response:', data);

        if (data.status === 'success' && data.data?.url) {
            // Konversi ke direct download link
            const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

            qrcodeContainer.innerHTML = '';

            // QRServer API — tidak perlu library JS tambahan
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(directUrl)}&bgcolor=ffffff&color=0a0a1a&ecc=H`;
            const qrImg = document.createElement('img');
            qrImg.src = qrUrl;
            qrImg.width = 200;
            qrImg.height = 200;
            qrImg.alt = 'QR Code';
            qrImg.style.borderRadius = '8px';
            qrcodeContainer.appendChild(qrImg);
        } else {
            throw new Error(data.message || 'Upload gagal.');
        }
    } catch (e) {
        console.error("Upload failed:", e);
        qrcodeContainer.innerHTML = `<p style="color:#ff00ea; font-size:13px;">Gagal generate QR 😢<br><span style="font-size:11px;opacity:0.7">${e.message}</span><br><br>Download manual aja ya!</p>`;
    }
}

retakeBtn.addEventListener('click', () => {
    capturedPhotos = [];
    resultSection.classList.add('hidden');
    cameraSection.classList.remove('hidden');
    startBtn.classList.remove('hidden');
    instructionEl.innerText = "Get ready to snap 3 galactic photos!";
    qrcodeContainer.innerHTML = '';
    startCamera();
});

init();
