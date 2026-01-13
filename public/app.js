// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');

// Initialize theme from localStorage or system preference
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  if (newTheme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  localStorage.setItem('theme', newTheme);
}

// Initialize theme on load
initTheme();

// Theme toggle click handler
themeToggle?.addEventListener('click', toggleTheme);

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
let selectedModel = 'gemini';
let selectedTheme = 'default';

// Model toggle buttons (segmented control)
const modelBtns = document.querySelectorAll('.segment[data-model]');
modelBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    modelBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedModel = btn.dataset.model;
  });
});

// Theme toggle buttons (color pills)
const themeBtns = document.querySelectorAll('.color-pill[data-theme]');
themeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    themeBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTheme = btn.dataset.theme;
  });
});

// Glossary input
const glossaryInput = document.getElementById('glossary-input');
const glossaryFileInput = document.getElementById('glossary-file');
const glossaryFileName = document.getElementById('glossary-file-name');

// Handle glossary file upload
glossaryFileInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    // Parse CSV or text file - handle both comma and newline separated values
    let terms = text
      .split(/[\n,]/)
      .map(term => term.trim())
      .filter(term => term.length > 0);

    // Append to existing glossary
    const existing = glossaryInput.value.trim();
    if (existing) {
      glossaryInput.value = existing + ', ' + terms.join(', ');
    } else {
      glossaryInput.value = terms.join(', ');
    }

    glossaryFileName.textContent = file.name + ` (${terms.length} terms)`;
  } catch (error) {
    console.error('Failed to read glossary file:', error);
    glossaryFileName.textContent = 'Error reading file';
  }
});

function getGlossary() {
  return glossaryInput?.value?.trim() || '';
}

// AI Prompt input
const aiPromptInput = document.getElementById('ai-prompt-input');

function getAiPrompt() {
  return aiPromptInput?.value?.trim() || '';
}

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
    formData.append('glossary', getGlossary());
    formData.append('theme', selectedTheme);
    formData.append('aiPrompt', getAiPrompt());

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
    formData.append('glossary', getGlossary());
    formData.append('theme', selectedTheme);
    formData.append('aiPrompt', getAiPrompt());

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
  selectedModel = 'gemini';
  selectedTheme = 'default';
  fileInput.value = '';
  previewImage.src = '';

  // Reset model selector
  modelBtns.forEach((b) => b.classList.remove('active'));
  document.querySelector('.segment[data-model="gemini"]')?.classList.add('active');

  // Reset theme selector
  themeBtns.forEach((b) => b.classList.remove('active'));
  document.querySelector('.color-pill[data-theme="default"]')?.classList.add('active');

  // Reset file inputs but keep glossary text (user might want to reuse it)
  if (glossaryFileInput) glossaryFileInput.value = '';
  if (glossaryFileName) glossaryFileName.textContent = '';

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
