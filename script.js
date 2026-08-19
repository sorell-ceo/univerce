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
      if (stepNumber === 3) runTraceSequence();
      if (stepNumber === 4) runVerdictSequence();
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

// Priority pill selection (Step 1 case details)
document.querySelectorAll('.pill-select .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    pill.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('pill-active'));
    pill.classList.add('pill-active');
  });
});

function handleFile(file) {
  console.log('File selected:', file.name, file.type, file.size);
  // Move to Step 2 (Analysis) once a file is picked/dropped
  goToScreen(2);
}

/* ============ SCREEN 2: ANALYSIS SEQUENCE ============ */
// Drives the progress bar fill, cycles status text, and staggers
// in the platform result cards once the scan completes.
// In the real build, swap the tween below for actual backend polling —
// call updateProgress(pct) as real progress comes in.
const analysisStages = [
  'Extracting facial features…',
  'Querying reverse image index…',
  'Cross-referencing social platforms…',
  'Compiling results…'
];

function runAnalysisSequence() {
  const fill = document.getElementById('progressFill');
  const percentLabel = document.getElementById('progressPercent');
  const statusLabel = document.getElementById('progressStatus');
  const platformCards = document.querySelectorAll('.platform-card');

  // Reset state every time we enter this screen
  gsap.set(fill, { width: '0%' });
  gsap.set(platformCards, { opacity: 0, y: 10 });
  percentLabel.textContent = '0%';
  statusLabel.textContent = analysisStages[0];

  const progressObj = { value: 0 };
  let lastStageIndex = 0;

  gsap.to(progressObj, {
    value: 100,
    duration: 5,
    ease: 'power1.inOut',
    onUpdate: () => {
      const pct = Math.round(progressObj.value);
      fill.style.width = pct + '%';
      percentLabel.textContent = pct + '%';

      const stageIndex = Math.min(
        analysisStages.length - 1,
        Math.floor((pct / 100) * analysisStages.length)
      );
      if (stageIndex !== lastStageIndex) {
        lastStageIndex = stageIndex;
        statusLabel.textContent = analysisStages[stageIndex];
      }
    },
    onComplete: () => {
      statusLabel.textContent = 'Scan complete';
      gsap.to(platformCards, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.12,
        ease: 'power2.out'
      });
    }
  });
}

/* ============ SCREEN 3: SOURCE TRACE SEQUENCE ============ */
function runTraceSequence() {
  const timelinePoints = document.querySelectorAll('.timeline-point');
  const tableRows = document.querySelectorAll('.trace-row');
  const summaryCard = document.querySelector('.trace-summary-card');

  gsap.set(timelinePoints, { opacity: 0, scale: 0.4 });
  gsap.set(tableRows, { opacity: 0, y: 8 });
  gsap.set(summaryCard, { opacity: 0, y: 8 });

  const tl = gsap.timeline();
  tl.to(summaryCard, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' })
    .to(timelinePoints, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      stagger: 0.1,
      ease: 'back.out(2)'
    }, '-=0.15')
    .to(tableRows, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      stagger: 0.08,
      ease: 'power2.out'
    }, '-=0.2');
}

// Filter pills on Step 3 table (visual only)
document.querySelectorAll('.table-filters .pill').forEach(pill => {
  pill.addEventListener('click', () => {
    pill.parentElement.querySelectorAll('.pill').forEach(p => p.classList.remove('pill-active'));
    pill.classList.add('pill-active');
  });
});

/* ============ SCREEN 4: AI VERDICT SEQUENCE ============ */
// Circle circumference = 2 * PI * r, r = 84 -> ~527.8
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 84;
const AI_PROBABILITY = 87; // demo value — wire to real backend score

function scoreToColor(pct) {
  if (pct >= 70) return '#e2685f';   // danger / red
  if (pct >= 40) return '#e0a854';   // warning / amber
  return '#5bc98a';                  // safe / green
}

function scoreToVerdict(pct) {
  if (pct >= 70) return 'High Likelihood of AI Manipulation';
  if (pct >= 40) return 'Moderate Likelihood — Further Review Advised';
  return 'Low Likelihood of AI Manipulation';
}

function runVerdictSequence() {
  const gaugeFill = document.getElementById('gaugeFill');
  const gaugeNum = document.getElementById('gaugeNum');
  const verdictBanner = document.getElementById('verdictBanner');
  const verdictText = document.getElementById('verdictText');
  const breakdownFills = document.querySelectorAll('.breakdown-fill');
  const breakdownPcts = document.querySelectorAll('.breakdown-pct');

  const color = scoreToColor(AI_PROBABILITY);

  // Reset
  gaugeFill.style.stroke = color;
  gsap.set(gaugeFill, { strokeDasharray: GAUGE_CIRCUMFERENCE, strokeDashoffset: GAUGE_CIRCUMFERENCE });
  gsap.set(breakdownFills, { width: '0%' });
  verdictBanner.style.background = `${color}1a`;
  verdictBanner.style.borderColor = `${color}4d`;
  verdictBanner.style.color = color;
  document.querySelector('.verdict-dot').style.background = color;
  verdictText.textContent = scoreToVerdict(AI_PROBABILITY);

  const counter = { value: 0 };
  gsap.to(counter, {
    value: AI_PROBABILITY,
    duration: 1.3,
    delay: 0.2,
    ease: 'power2.out',
    onUpdate: () => {
      gaugeNum.textContent = Math.round(counter.value) + '%';
    }
  });

  const offset = GAUGE_CIRCUMFERENCE - (AI_PROBABILITY / 100) * GAUGE_CIRCUMFERENCE;
  gsap.to(gaugeFill, {
    strokeDashoffset: offset,
    duration: 1.3,
    delay: 0.2,
    ease: 'power3.out'
  });

  // Animate each model breakdown bar to its target width (read from inline style)
  breakdownFills.forEach((fillEl, i) => {
    const target = fillEl.style.width;
    gsap.fromTo(fillEl,
      { width: '0%' },
      { width: target, duration: 0.9, delay: 0.4 + i * 0.12, ease: 'power2.out' }
    );
  });

  gsap.fromTo(breakdownPcts,
    { opacity: 0 },
    { opacity: 1, duration: 0.4, delay: 0.4, stagger: 0.12 }
  );

  gsap.fromTo('.media-heatmap-card',
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.4, delay: 0.15, ease: 'power2.out' }
  );
}

// Heatmap toggle
const heatmapToggle = document.getElementById('heatmapToggle');
const heatmapOverlay = document.getElementById('heatmapOverlay');

heatmapToggle.addEventListener('click', () => {
  const isOn = heatmapToggle.classList.toggle('on');
  heatmapOverlay.classList.toggle('visible', isOn);
});
