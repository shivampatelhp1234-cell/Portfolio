(() => {
  const FRAME_COUNT = 240;
  const FRAME_PATH = (index) => `./frames/frame_${String(index + 1).padStart(4, '0')}.jpg`;

  const canvas = document.getElementById('frame-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scrollTrack = document.getElementById('scroll-track');
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-progress');
  const loaderText = document.getElementById('loader-text');

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let targetFrame = 0;
  let currentFrame = 0;
  let lastRenderedFrame = -1;
  let needsRedraw = true;

  // Set canvas resolution according to device pixel ratio for crisp rendering
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for optimal performance
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    needsRedraw = true;
  }

  // Draw frame with 'object-fit: cover' behavior (centered, scaled to fill)
  function renderFrame(index) {
    let img = images[index];

    // If target frame hasn't loaded yet, find the closest available frame
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < FRAME_COUNT; offset++) {
        const prev = images[index - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          img = prev;
          break;
        }
        const next = images[index + offset];
        if (next && next.complete && next.naturalWidth > 0) {
          img = next;
          break;
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
      drawX = (cw - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    lastRenderedFrame = index;
  }

  // Calculate target frame index from scroll position
  function updateScrollTarget() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));
    targetFrame = progress * (FRAME_COUNT - 1);
  }

  // Smooth animation loop using Linear Interpolation (LERP)
  function tick() {
    const delta = targetFrame - currentFrame;

    // Smooth dampening factor (0.08 produces an ultra-smooth cinematic feel)
    if (Math.abs(delta) > 0.001) {
      currentFrame += delta * 0.085;
    } else {
      currentFrame = targetFrame;
    }

    const frameToRender = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.round(currentFrame))
    );

    if (frameToRender !== lastRenderedFrame || needsRedraw) {
      renderFrame(frameToRender);
      needsRedraw = false;
    }

    requestAnimationFrame(tick);
  }

  // Preload frames with progressive feedback
  function preloadImages() {
    return new Promise((resolve) => {
      // 1. Immediately load frame 0 and render it as soon as it's ready
      const firstImg = new Image();
      firstImg.src = FRAME_PATH(0);
      images[0] = firstImg;

      firstImg.onload = () => {
        loadedCount++;
        renderFrame(0);
        checkProgress();
      };
      firstImg.onerror = () => {
        checkProgress();
      };

      // 2. Load remaining frames
      for (let i = 1; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.src = FRAME_PATH(i);
        images[i] = img;

        img.onload = () => {
          loadedCount++;
          checkProgress();
        };
        img.onerror = () => {
          loadedCount++;
          checkProgress();
        };
      }

      function checkProgress() {
        const pct = Math.floor((loadedCount / FRAME_COUNT) * 100);
        if (loaderBar) loaderBar.style.width = `${pct}%`;
        if (loaderText) loaderText.textContent = `Loading ${pct}%`;

        if (loadedCount >= FRAME_COUNT) {
          setTimeout(() => {
            if (loader) loader.classList.add('loaded');
            resolve();
          }, 200);
        }
      }
    });
  }

  // Initialize
  function init() {
    resizeCanvas();
    updateScrollTarget();

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    window.addEventListener('resize', () => {
      resizeCanvas();
      updateScrollTarget();
    });

    preloadImages();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
