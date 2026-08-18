/* ============ SCREEN CONTROLLER ============ */
// Handles switching between Step 1 -> 2 -> 3 -> 4, animating both
// the main content area and the shared stepper up top.

const screens = document.querySelectorAll('.screen');
const stepperSteps = document.querySelectorAll('.step');

function goToScreen(stepNumber) {
  const current = document.querySelector('.screen.screen-active');
  const next = document.querySelector(`.screen[data-screen="${stepNumber}"]`);

  if (!next || current === next) return;

  // Update stepper state immediately
  stepperSteps.forEach(step => {
    step.classList.toggle('active', Number(step.dataset.step) <= stepNumber);
  });

  // Animate out current screen, then animate in next screen
  gsap.to(current, {
    opacity: 0,
    y: -12,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      current.classList.remove('screen-active');
      gsap.set(current, { clearProps: 'all' });

      next.classList.add('screen-active');
      gsap.fromTo(next,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );

      // Screen-specific enter animations
      if (stepNumber === 2) runAnalysisSequence();
    }
  });
}

/* ============ SCREEN 1: UPLOAD LOGIC ============ */
const uploadCard = document.querySelector('.upload-card');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const dragBtn = document.getElementById('dragBtn');

uploadBtn.addEventListener('click', () => fileInput.click());
dragBtn.addEventListener('click', () => fileInput.click());

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
  // Move to Step 2 (Analysis) once a file is picked/dropped
  goToScreen(2);
}

/* ============ SCREEN 2: ANALYSIS SEQUENCE ============ */
// Drives the progress bar fill and staggers in the search-results list.
// In the real build, swap the setTimeout/tween below for actual
// backend polling — call updateProgress(pct) as real progress comes in.

function runAnalysisSequence() {
  const fill = document.getElementById('progressFill');
  const percentLabel = document.getElementById('progressPercent');
  const resultItems = document.querySelectorAll('#resultsList li');

  // Reset state every time we enter this screen
  gsap.set(fill, { width: '0%' });
  gsap.set(resultItems, { opacity: 0, y: 6 });
  percentLabel.textContent = '0%';

  const progressObj = { value: 0 };

  gsap.to(progressObj, {
    value: 100,
    duration: 5,
    ease: 'power1.inOut',
    onUpdate: () => {
      const pct = Math.round(progressObj.value);
      fill.style.width = pct + '%';
      percentLabel.textContent = pct + '%';
    },
    onComplete: () => {
      // Reveal search results once progress lands, staggered
      gsap.to(resultItems, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.12,
        ease: 'power2.out'
      });
    }
  });
}
