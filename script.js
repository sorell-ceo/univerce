const uploadCard = document.querySelector('.upload-card');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.querySelector('.btn-primary');
const dragBtn = document.querySelector('.btn-secondary');

// Click "Upload Image/Video" opens file picker
uploadBtn.addEventListener('click', () => fileInput.click());
dragBtn.addEventListener('click', () => fileInput.click());

// Drag & drop visual feedback
['dragenter', 'dragover'].forEach(evt => {
  uploadCard.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadCard.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(evt => {
  uploadCard.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadCard.classList.remove('drag-over');
  });
});

uploadCard.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
  console.log('File selected:', file.name, file.type, file.size);
  // Hook point: this is where Step 1 -> Step 2 (Analysis) transition would fire
  // e.g. sessionStorage.setItem('uploadedFile', file.name); window.location = 'analysis.html';
}
