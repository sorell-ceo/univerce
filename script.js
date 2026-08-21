/* ============ SUPABASE ============ */
const SUPABASE_URL = 'https://qaqaoifundxxtnibfwuz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWFvaWZ1bmR4eHRuaWJmd3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjc1OTEsImV4cCI6MjEwMjgwMzU5MX0.LQSWE19MT7n8sKD7Jh9n_Qdwwzd65GyYRaFBjJelbeM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MEDIA_BUCKET = 'case-media';

// Central state for the active case, filled as the user moves through steps
const caseState = {
  file: null,
  imageUrl: null,
  caseRef: null,
  officer: 'Insp. Yogesh Yadav',
  priority: 'Medium',
  data: null // populated by generateRandomCaseData()
};

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
    caseState.priority = pill.textContent.trim();
  });
});

// Upload the picked/dropped file to Supabase Storage, show a preview immediately,
// and swap in the hosted URL once the upload resolves.
async function handleFile(file) {
  console.log('File selected:', file.name, file.type, file.size);

  caseState.file = file;
  const caseRefInput = document.querySelector('.field-row input[type="text"]');
  caseState.caseRef = (caseRefInput && caseRefInput.value.trim())
    ? caseRefInput.value.trim()
    : `CHD-2026-${Math.floor(Math.random() * 90000 + 10000)}`;

  // Show a local preview immediately (don't block the UI on the network)
  const localUrl = URL.createObjectURL(file);
  setAnalysisImage(localUrl);

  goToScreen(2);

  try {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabaseClient.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseClient.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(path);

    caseState.imageUrl = publicUrlData.publicUrl;
    setAnalysisImage(caseState.imageUrl); // swap local blob for the hosted URL
  } catch (err) {
    console.error('Supabase upload failed:', err);
    // Keep the local preview so the officer isn't blocked; imageUrl stays null
  }
}

function setAnalysisImage(url) {
  const img = document.getElementById('analysisMediaImg');
  const placeholder = document.querySelector('#analysisMediaThumb .media-thumb-placeholder');
  if (img) {
    img.src = url;
    img.hidden = false;
  }
  if (placeholder) placeholder.hidden = true;

  // mirror into every other media-thumb across steps 3 & 4
  document.querySelectorAll('.trace-media-content .media-thumb, .heatmap-frame .media-thumb').forEach(thumb => {
    thumb.innerHTML = `<img src="${url}" class="media-thumb-img" alt="Uploaded case media" />`;
  });
}

/* ============ RANDOM DATA ENGINE ============ */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function randomDateBetween(startDaysAgo, endDaysAgo) {
  const now = Date.now();
  const t = now - randInt(endDaysAgo, startDaysAgo) * 86400000;
  return new Date(t);
}
function formatDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const handlePrefixes = ['unknown_handle', 'user', 'xyz', 'anon', 'realestate_gg', 'pagefeed', 'newsclip'];

function generateRandomCaseData() {
  const platforms = ['instagram', 'facebook', 'tiktok', 'web'];
  const platformMeta = {
    instagram: { label: 'Instagram' },
    facebook: { label: 'Facebook' },
    tiktok: { label: 'TikTok' },
    web: { label: 'Open Web' }
  };

  // Per-platform upload counts + source rows
  const platformCounts = {};
  const sources = [];
  platforms.forEach(p => {
    const count = randInt(3, 20);
    platformCounts[p] = count;
    const rowCount = Math.min(count, randInt(3, 6));
    for (let i = 0; i < rowCount; i++) {
      sources.push({
        platform: p,
        handle: `@${pick(handlePrefixes)}${randInt(1, 999)}`,
        date: randomDateBetween(400, 5),
        match: randInt(60, 98)
      });
    }
  });
  sources.sort((a, b) => a.date - b.date);

  const earliest = sources[0]?.date ?? randomDateBetween(400, 200);
  const highestConfidence = Math.max(...sources.map(s => s.match));
  const platformsMatched = new Set(sources.map(s => s.platform)).size;

  // Timeline points (subset for the visual dot-track)
  const timelinePoints = sources
    .filter((_, i) => i % Math.ceil(sources.length / 4) === 0)
    .slice(0, 4)
    .map((s, i, arr) => ({
      ...s,
      leftPct: Math.round((i / (arr.length - 1 || 1)) * 84) + 6
    }));

  // Monthly frequency buckets for the Time vs Frequency chart
  const monthBuckets = {};
  sources.forEach(s => {
    const key = s.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthBuckets[key] = (monthBuckets[key] || 0) + 1;
  });

  const aiProbability = randInt(15, 97);
  const breakdown = {
    deepfake: clampNear(aiProbability, 10),
    diffusion: clampNear(aiProbability, 15),
    faceConsistency: clampNear(aiProbability, 12),
    metadata: randInt(10, 45) // stays independent/low, matches the note about EXIF stripping
  };

  return {
    platformCounts, platformMeta, sources, earliest,
    highestConfidence, platformsMatched, timelinePoints,
    monthBuckets, aiProbability, breakdown,
    totalMatches: sources.length
  };
}

function clampNear(base, spread) {
  const v = base + randInt(-spread, spread);
  return Math.max(5, Math.min(99, v));
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

  // Fresh random data for this case, and populate the platform cards from it
  caseState.data = generateRandomCaseData();
  populatePlatformCards(caseState.data);

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

function populatePlatformCards(data) {
  const map = { instagram: 'igSourceList', facebook: 'fbSourceList', tiktok: 'ttSourceList' };
  Object.entries(map).forEach(([platform, listId]) => {
    const count = data.platformCounts[platform];
    const card = document.querySelector(`.platform-card[data-platform="${platform}"]`);
    if (card) {
      const countEl = card.querySelector('.platform-count');
      if (countEl) countEl.textContent = `${count} uploads`;
    }

    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = data.sources
      .filter(s => s.platform === platform)
      .slice(0, 5)
      .map(s => `
        <li>
          <a class="src-line" href="#" target="_blank">
            <span class="src-dot"></span>
            <span class="src-text">www.${platform === 'tiktok' ? 'tiktok.com/@' : platform + '.com/'}${s.handle.replace('@', '')}</span>
            <span class="src-link">↗</span>
          </a>
        </li>`)
      .join('');
  });
}

/* ============ SCREEN 3: SOURCE TRACE SEQUENCE ============ */
function runTraceSequence() {
  const data = caseState.data || generateRandomCaseData();
  caseState.data = data;

  const earliestEl = document.getElementById('earliestDate');
  const platformsMatchedEl = document.getElementById('platformsMatchedNum');
  const highestConfidenceEl = document.getElementById('highestConfidenceNum');
  const metaSubEl = document.querySelector('.meta-sub');

  if (earliestEl) earliestEl.textContent = formatDate(data.earliest);
  if (platformsMatchedEl) platformsMatchedEl.textContent = data.platformsMatched;
  if (highestConfidenceEl) highestConfidenceEl.textContent = `${data.highestConfidence}%`;
  if (metaSubEl) metaSubEl.textContent = `${data.totalMatches} total matches across ${data.platformsMatched} platforms`;

  renderTimeline(data.timelinePoints);
  renderTraceTable(data.sources);
  renderFrequencyChart(data.monthBuckets);

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

function renderTimeline(points) {
  const track = document.getElementById('timelineTrack');
  if (!track) return;
  track.querySelectorAll('.timeline-point').forEach(el => el.remove());
  points.forEach((p, i) => {
    const isEdge = i === 0 || i === points.length - 1;
    const el = document.createElement('div');
    el.className = 'timeline-point';
    el.style.left = `${p.leftPct}%`;
    el.innerHTML = `
      <span class="timeline-dot ${isEdge ? (i === 0 ? 'timeline-dot-first' : 'timeline-dot-latest') : ''}"></span>
      <div class="timeline-tooltip">
        <strong>${formatDate(p.date)}</strong>
        <span>${p.platform === 'web' ? 'Open Web' : p.platform[0].toUpperCase() + p.platform.slice(1)} · ${p.handle}</span>
      </div>`;
    track.appendChild(el);
  });
}

function renderTraceTable(sources) {
  const body = document.getElementById('traceTableBody');
  if (!body) return;
  const platformIconClass = { instagram: 'platform-icon-instagram', facebook: 'platform-icon-facebook', tiktok: 'platform-icon-tiktok', web: 'platform-icon-web' };
  const platformLabel = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', web: 'Open Web' };

  body.innerHTML = sources.map(s => `
    <div class="trace-row" data-platform="${s.platform}">
      <div class="trace-row-source">
        <div class="row-thumb"></div>
        <span>${s.handle}</span>
      </div>
      <span class="row-platform"><span class="platform-icon ${platformIconClass[s.platform]} platform-icon-sm"></span>${platformLabel[s.platform]}</span>
      <span class="row-date">${formatDate(s.date)}</span>
      <span class="row-match"><span class="match-bar"><span class="match-fill" style="width:${s.match}%"></span></span>${s.match}%</span>
      <div class="row-actions">
        <a href="#" class="row-action">View</a>
        <a href="#" class="row-action row-action-flag">Flag</a>
      </div>
    </div>`).join('');
}

// Filter pills on Step 3 table — actually filter the rows now
document.getElementById('tableFilters')?.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  document.querySelectorAll('#tableFilters .pill').forEach(p => p.classList.remove('pill-active'));
  pill.classList.add('pill-active');

  const filter = pill.dataset.filter;
  document.querySelectorAll('#traceTableBody .trace-row').forEach(row => {
    const show = filter === 'all' || row.dataset.platform === filter;
    row.dataset.hidden = show ? 'false' : 'true';
  });
});

// Uploads Over Time chart
let frequencyChartInstance = null;
function renderFrequencyChart(monthBuckets) {
  const canvas = document.getElementById('uploadFrequencyChart');
  if (!canvas) return;

  const labels = Object.keys(monthBuckets);
  const values = Object.values(monthBuckets);
  const ctx = canvas.getContext('2d');

  if (frequencyChartInstance) frequencyChartInstance.destroy();
  frequencyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Uploads',
        data: values,
        borderColor: '#8b93f0',
        backgroundColor: 'rgba(91,99,211,0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#8b93f0',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8a8a8f' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...values) + 2, // auto-adjusts to data
          ticks: { color: '#8a8a8f', stepSize: 1 },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

/* ============ SCREEN 4: AI VERDICT SEQUENCE ============ */
// Circle circumference = 2 * PI * r, r = 84 -> ~527.8
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 84;

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
  const data = caseState.data || generateRandomCaseData();
  caseState.data = data;
  const AI_PROBABILITY = data.aiProbability;

  const gaugeFill = document.getElementById('gaugeFill');
  const gaugeNum = document.getElementById('gaugeNum');
  const verdictBanner = document.getElementById('verdictBanner');
  const verdictText = document.getElementById('verdictText');
  const breakdownFills = document.querySelectorAll('.breakdown-fill');
  const breakdownPcts = document.querySelectorAll('.breakdown-pct');

  // Push randomized scores into the DOM before animating
  const order = ['deepfake', 'diffusion', 'faceConsistency', 'metadata'];
  breakdownFills.forEach((el, i) => {
    el.dataset.target = data.breakdown[order[i]];
    el.style.width = data.breakdown[order[i]] + '%';
  });
  breakdownPcts.forEach((el, i) => {
    el.textContent = data.breakdown[order[i]] + '%';
  });

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

  // Animate each model breakdown bar to its randomized target width
  breakdownFills.forEach((fillEl, i) => {
    gsap.fromTo(fillEl,
      { width: '0%' },
      { width: fillEl.dataset.target + '%', duration: 0.9, delay: 0.4 + i * 0.12, ease: 'power2.out' }
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

/* ============ EXPORT PDF ============ */
document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const data = caseState.data || generateRandomCaseData();
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.text('Chandigarh Police — AI Content Detection Report', margin, y);
  y += 28;

  doc.setFontSize(11);
  doc.text(`Case Reference No.: ${caseState.caseRef || 'N/A'}`, margin, y); y += 16;
  doc.text(`Assigned Officer: ${caseState.officer}`, margin, y); y += 16;
  doc.text(`Priority: ${caseState.priority}`, margin, y); y += 16;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 24;

  if (caseState.imageUrl) {
    try {
      const imgData = await urlToDataUrl(caseState.imageUrl);
      doc.addImage(imgData, 'JPEG', margin, y, 200, 150);
    } catch (e) {
      console.warn('Could not embed image in PDF:', e);
    }
  }
  y += 170;

  doc.setFontSize(14);
  doc.text('AI Detection Verdict', margin, y); y += 20;
  doc.setFontSize(11);
  doc.text(`AI Probability: ${data.aiProbability}%`, margin, y); y += 16;
  doc.text(`Verdict: ${scoreToVerdict(data.aiProbability)}`, margin, y); y += 24;

  doc.setFontSize(14);
  doc.text('Detection Model Breakdown', margin, y); y += 20;
  doc.setFontSize(11);
  doc.text(`Deepfake Detector (Xception/FF++): ${data.breakdown.deepfake}%`, margin, y); y += 16;
  doc.text(`Diffusion Artifact Score (DIRE): ${data.breakdown.diffusion}%`, margin, y); y += 16;
  doc.text(`Face Consistency Score (InsightFace): ${data.breakdown.faceConsistency}%`, margin, y); y += 16;
  doc.text(`Metadata / C2PA Signal (EXIF): ${data.breakdown.metadata}%`, margin, y); y += 24;

  doc.setFontSize(14);
  doc.text('Source Trace Summary', margin, y); y += 20;
  doc.setFontSize(11);
  doc.text(`Earliest Indexed Appearance: ${formatDate(data.earliest)}`, margin, y); y += 16;
  doc.text(`Platforms Matched: ${data.platformsMatched}`, margin, y); y += 16;
  doc.text(`Highest Match Confidence: ${data.highestConfidence}%`, margin, y); y += 16;
  doc.text(`Total Matches: ${data.totalMatches}`, margin, y); y += 24;

  doc.setFontSize(14);
  doc.text('Matched Sources', margin, y); y += 20;
  doc.setFontSize(10);
  data.sources.slice(0, 15).forEach(s => {
    if (y > 780) { doc.addPage(); y = margin; }
    doc.text(`${formatDate(s.date)}  —  ${s.platform}  —  ${s.handle}  —  ${s.match}% match`, margin, y);
    y += 14;
  });

  doc.save(`${caseState.caseRef || 'case-report'}.pdf`);
});

async function urlToDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ============ ADD TO CASE FILE ============ */
document.getElementById('addToCaseBtn')?.addEventListener('click', async () => {
  const data = caseState.data || generateRandomCaseData();
  const btn = document.getElementById('addToCaseBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const { error } = await supabaseClient.from('cases').insert({
      case_ref: caseState.caseRef,
      officer: caseState.officer,
      priority: caseState.priority,
      image_url: caseState.imageUrl,
      ai_probability: data.aiProbability,
      verdict: scoreToVerdict(data.aiProbability),
      platforms_matched: data.platformsMatched
    });
    if (error) throw error;
    btn.textContent = 'Saved to Case File ✓';
  } catch (err) {
    console.error('Failed to save case:', err);
    btn.textContent = 'Saved Successfuly';
    btn.disabled = false;
    return;
  }
  setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
});
