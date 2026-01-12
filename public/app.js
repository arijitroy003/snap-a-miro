// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const previewImage = document.getElementById('preview-image');
const clearBtn = document.getElementById('clear-btn');
const previewBtn = document.getElementById('preview-btn');
const convertBtn = document.getElementById('convert-btn');
const loadingSection = document.getElementById('loading-section');
const loadingText = document.getElementById('loading-text');
const analysisSection = document.getElementById('analysis-section');
const proceedBtn = document.getElementById('proceed-btn');
const successSection = document.getElementById('success-section');
const successMessage = document.getElementById('success-message');
const boardLink = document.getElementById('board-link');
const newUploadBtn = document.getElementById('new-upload-btn');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

let selectedFile = null;
let analysisResult = null;
let selectedModel = 'claude';

// Model toggle buttons
const modelBtns = document.querySelectorAll('.model-btn');
modelBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    modelBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedModel = btn.dataset.model;
  });
});

// Event Listeners
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', handleDragOver);
uploadZone.addEventListener('dragleave', handleDragLeave);
uploadZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
clearBtn.addEventListener('click', resetToUpload);
previewBtn.addEventListener('click', analyzeOnly);
convertBtn.addEventListener('click', convertToMiro);
proceedBtn.addEventListener('click', convertToMiro);
newUploadBtn.addEventListener('click', resetToUpload);
retryBtn.addEventListener('click', resetToUpload);

function handleDragOver(e) {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFile(file) {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    showError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    return;
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    showError('File too large. Maximum size is 10MB.');
    return;
  }

  selectedFile = file;
  showPreview(file);
}

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    hideAll();
    previewSection.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function analyzeOnly() {
  if (!selectedFile) return;

  const modelName = selectedModel === 'claude' ? 'Claude' : 'Gemini';
  showLoading(`Analyzing with ${modelName}...`);

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('model', selectedModel);

    const response = await fetch('/api/preview', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed');
    }

    analysisResult = data;
    showAnalysis(data.analysis);
  } catch (error) {
    showError(error.message);
  }
}

async function convertToMiro() {
  if (!selectedFile) return;

  const modelName = selectedModel === 'claude' ? 'Claude' : 'Gemini';
  showLoading(`Analyzing with ${modelName} and creating board...`);

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('model', selectedModel);

    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Conversion failed');
    }

    showSuccess(data);
  } catch (error) {
    showError(error.message);
  }
}

function showLoading(message) {
  hideAll();
  loadingText.textContent = message;
  loadingSection.classList.remove('hidden');
}

function showAnalysis(analysis) {
  hideAll();

  document.getElementById('stat-shapes').textContent = analysis.shapes || 0;
  document.getElementById('stat-connectors').textContent = analysis.connectors || 0;
  document.getElementById('stat-text').textContent = analysis.textBlocks || 0;
  document.getElementById('stat-stickies').textContent = analysis.stickyNotes || 0;

  analysisSection.classList.remove('hidden');
}

function showSuccess(data) {
  hideAll();

  successMessage.textContent = `Created "${data.title}" with ${data.itemCount} items`;
  boardLink.href = data.boardUrl;

  successSection.classList.remove('hidden');
}

function showError(message) {
  hideAll();
  errorMessage.textContent = message;
  errorSection.classList.remove('hidden');
}

function resetToUpload() {
  selectedFile = null;
  analysisResult = null;
  selectedModel = 'claude';
  fileInput.value = '';
  previewImage.src = '';

  // Reset model selector
  modelBtns.forEach((b) => b.classList.remove('active'));
  document.querySelector('.model-btn[data-model="claude"]')?.classList.add('active');

  hideAll();
  uploadZone.classList.remove('hidden');
}

function hideAll() {
  uploadZone.classList.add('hidden');
  previewSection.classList.add('hidden');
  loadingSection.classList.add('hidden');
  analysisSection.classList.add('hidden');
  successSection.classList.add('hidden');
  errorSection.classList.add('hidden');
}

// Initialize
resetToUpload();
