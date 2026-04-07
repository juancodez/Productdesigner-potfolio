/* ============================================
   PORTFOLIO SCRIPT — Juan Gomez Vara
   ============================================ */

(() => {
  'use strict';

  // ============================================
  // INTERACTIVE DOT GRID
  // Ported from the original Framer component:
  // dots scatter randomly inside distortionRadius,
  // lerp back to origin when cursor leaves.
  // ============================================
  class DotGrid {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx    = canvas.getContext('2d');
      this.dots   = [];
      this.mouse  = { x: -1e4, y: -1e4 };
      this.needsUpdate = true;
      this.raf = null;

      // Defaults — override per-canvas via data-* attributes on the <canvas>
      const d = canvas.dataset;
      this.cfg = {
        dotSize           : parseFloat(d.dotSize)            || 2.0,
        dotSpacing        : parseFloat(d.dotSpacing)         || 22,
        distortionRadius  : parseFloat(d.distortionRadius)   || 110,
        distortionStrength: parseFloat(d.distortionStrength) || 32,
        animationSpeed    : parseFloat(d.animationSpeed)     || 0.055,
      };

      this._onResize = this._resize.bind(this);
      this._onMove   = this._onMouseMove.bind(this);
      this._onLeave  = this._onMouseLeave.bind(this);
      this._init();
    }

    _init() {
      this._resize();
      const ro = new ResizeObserver(() => this._resize());
      ro.observe(this.canvas.parentElement);
      this.canvas.parentElement.addEventListener('mousemove',  this._onMove);
      this.canvas.parentElement.addEventListener('mouseleave', this._onLeave);
      this._tick();
    }

    _resize() {
      const el = this.canvas.parentElement;
      this.canvas.width  = el.offsetWidth;
      this.canvas.height = el.offsetHeight;
      this._buildDots(this.canvas.width, this.canvas.height);
      this.needsUpdate = true;
    }

    _buildDots(w, h) {
      const { dotSpacing } = this.cfg;
      const cols = Math.ceil(w / dotSpacing);
      const rows = Math.ceil(h / dotSpacing);
      this.dots = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * dotSpacing + dotSpacing / 2;
          const y = row * dotSpacing + dotSpacing / 2;
          this.dots.push({
            originalX: x, originalY: y,
            currentX:  x, currentY:  y,
            randomOffsetX: 0, randomOffsetY: 0,
            isRandomized: false,
            col, row,
          });
        }
      }
    }

    _onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.needsUpdate = true;
    }

    _onMouseLeave() {
      this.mouse.x = -1e4;
      this.mouse.y = -1e4;
      this.needsUpdate = true;
    }

    _tick(ts = 0) {
      const dt = Math.min(ts - (this._lastTs || ts), 50);
      this._lastTs = ts;
      this._dt = dt;
      if (this.needsUpdate) {
        this._draw();
      }
      this.raf = requestAnimationFrame((t) => this._tick(t));
    }

    _draw() {
      const { ctx, canvas, dots, cfg, mouse } = this;
      const { dotSpacing, dotSize, distortionRadius, distortionStrength, animationSpeed } = cfg;
      // Delta-time corrected lerp factor — normalises to 60 fps so the
      // animation feels identical regardless of canvas size / frame rate.
      const dtFactor = this._dt > 0 ? this._dt / 16.667 : 1;
      const lerpK = 1 - Math.pow(1 - animationSpeed, dtFactor);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      // Idle dots — clearly visible but not overwhelming
      const idleColor   = isDark ? 'rgba(255,255,255,0.98)' : 'rgba(21,29,60,0.70)';
      const activeColor = isDark ? 'rgba(255,255,255,1.00)' : 'rgba(21,29,60,1.00)';

      const mouseCol   = Math.floor(mouse.x / dotSpacing);
      const mouseRow   = Math.floor(mouse.y / dotSpacing);
      const checkRange = Math.ceil(distortionRadius / dotSpacing) + 1;

      // Two separate paths: idle and active (different opacity)
      const idlePath   = new Path2D();
      const activePath = new Path2D();
      let hasMoving = false;

      for (const dot of dots) {
        let targetX = dot.originalX;
        let targetY = dot.originalY;
        let isActive = false;

        const nearMouse =
          Math.abs(dot.col - mouseCol) <= checkRange &&
          Math.abs(dot.row - mouseRow) <= checkRange;

        if (nearMouse) {
          const dx = mouse.x - dot.originalX;
          const dy = mouse.y - dot.originalY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < distortionRadius) {
            if (!dot.isRandomized) {
              dot.randomOffsetX = (Math.random() - 0.5) * distortionStrength * 2;
              dot.randomOffsetY = (Math.random() - 0.5) * distortionStrength * 2;
              dot.isRandomized  = true;
            }
            targetX  = dot.originalX + dot.randomOffsetX;
            targetY  = dot.originalY + dot.randomOffsetY;
            isActive = true;
          } else {
            dot.isRandomized = false;
          }
        } else {
          dot.isRandomized = false;
        }

        dot.currentX += (targetX - dot.currentX) * lerpK;
        dot.currentY += (targetY - dot.currentY) * lerpK;

        // A displaced dot stays "active" until it nearly returns
        const displaced = Math.hypot(dot.currentX - dot.originalX, dot.currentY - dot.originalY);
        if (displaced > 0.5) isActive = true;

        if (Math.abs(dot.currentX - targetX) > 0.08 || Math.abs(dot.currentY - targetY) > 0.08) {
          hasMoving = true;
        }

        const r    = dotSize / 2;
        const path = isActive ? activePath : idlePath;
        path.moveTo(dot.currentX + r, dot.currentY);
        path.arc(dot.currentX, dot.currentY, r, 0, Math.PI * 2);
      }

      ctx.fillStyle = idleColor;
      ctx.fill(idlePath);
      ctx.fillStyle = activeColor;
      ctx.fill(activePath);

      this.needsUpdate = hasMoving;
    }
  }

  // Boot the dot grid
  const dotCanvas = document.getElementById('dotGrid');
  if (dotCanvas) new DotGrid(dotCanvas);

  // ============================================
  // HAMBURGER MENU
  // ============================================
  const hamburger   = document.getElementById('navHamburger');
  const mobileMenu  = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    const openMenu = () => {
      hamburger.classList.add('is-open');
      mobileMenu.classList.add('is-open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
    };
    const closeMenu = () => {
      hamburger.classList.remove('is-open');
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    };

    hamburger.addEventListener('click', () => {
      hamburger.classList.contains('is-open') ? closeMenu() : openMenu();
    });

    // Close when any mobile link is clicked
    mobileMenu.querySelectorAll('.mobile-nav-link, .btn-primary').forEach(el => {
      el.addEventListener('click', closeMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ============================================
  // THEME TOGGLE
  // ============================================
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('portfolio-theme') || 'light';
  html.setAttribute('data-theme', savedTheme);

  themeToggle?.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('portfolio-theme', next);
  });

  // ============================================
  // CUSTOM CURSOR
  // ============================================
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  let mx = -100, my = -100;
  let fx = -100, fy = -100;

  if (cursor && follower) {
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
    });

    // Smooth follower
    const animateFollower = () => {
      fx += (mx - fx) * 0.12;
      fy += (my - fy) * 0.12;
      follower.style.left = fx + 'px';
      follower.style.top = fy + 'px';
      requestAnimationFrame(animateFollower);
    };
    animateFollower();
  }

  // ============================================
  // MAGNETIC BUTTONS
  // ============================================
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      el.style.transition = 'none';
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      el.style.transform = `translate(${dx * 0.28}px, ${dy * 0.28}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      el.style.transform = 'translate(0, 0)';
    });
  });

  // ============================================
  // SCROLL ANIMATIONS (IntersectionObserver)
  // ============================================
  const animatables = document.querySelectorAll('[data-animate]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = parseInt(el.dataset.delay || 0);
      setTimeout(() => {
        el.classList.add('animated');
      }, delay);
      observer.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  animatables.forEach(el => observer.observe(el));

  // Hero animates immediately on load (index .hero and case-study .cs-hero)
  window.addEventListener('load', () => {
    document.querySelectorAll('.hero [data-animate], .cs-hero [data-animate]').forEach(el => {
      const delay = parseInt(el.dataset.delay || 0);
      setTimeout(() => el.classList.add('animated'), delay + 100);
    });

    // Page header on projects page
    document.querySelectorAll('.page-header [data-animate]').forEach(el => {
      const delay = parseInt(el.dataset.delay || 0);
      setTimeout(() => el.classList.add('animated'), delay + 100);
    });
  });

  // ============================================
  // NAV — scroll behavior
  // ============================================
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > 80) {
      nav?.classList.add('scrolled');
    } else {
      nav?.classList.remove('scrolled');
    }
    lastScroll = current;
  }, { passive: true });

  // ============================================
  // PROJECT CURSOR PREVIEW (projects page)
  // ============================================
  const preview = document.getElementById('projectPreview');
  const previewImg = document.getElementById('projectPreviewImg');

  if (preview && previewImg) {
    let px = 0, py = 0;
    let targetX = 0, targetY = 0;
    let isActive = false;

    const movePreview = () => {
      if (!isActive) return;
      px += (targetX - px) * 0.1;
      py += (targetY - py) * 0.1;
      preview.style.left = px + 'px';
      preview.style.top = py + 'px';
      requestAnimationFrame(movePreview);
    };

    document.querySelectorAll('.project-row').forEach(row => {
      row.addEventListener('mouseenter', (e) => {
        const bg = row.dataset.previewBg;
        const text = row.dataset.previewText;
        previewImg.style.background = bg;
        previewImg.textContent = text;
        preview.classList.add('active');
        isActive = true;
        movePreview();
      });

      row.addEventListener('mousemove', (e) => {
        targetX = e.clientX + 24;
        targetY = e.clientY - preview.offsetHeight / 2;
        // Keep in viewport
        const maxX = window.innerWidth - preview.offsetWidth - 20;
        const maxY = window.innerHeight - preview.offsetHeight - 20;
        targetX = Math.min(targetX, maxX);
        targetY = Math.max(20, Math.min(targetY, maxY));
      });

      row.addEventListener('mouseleave', () => {
        preview.classList.remove('active');
        isActive = false;
      });
    });
  }

  // ============================================
  // SMOOTH PAGE TRANSITIONS
  // ============================================
  const transition = document.createElement('div');
  transition.className = 'page-transition';
  document.body.appendChild(transition);

  // Entrance animation
  setTimeout(() => { transition.classList.add('exit'); }, 100);

  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    // Only intercept local page links
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      transition.classList.remove('exit');
      transition.classList.add('enter');
      setTimeout(() => {
        window.location.href = href;
      }, 500);
    });
  });

  // ============================================
  // PARALLAX ON HERO BLOBS
  // ============================================
  const blobs = document.querySelectorAll('.blob');
  if (blobs.length) {
    document.addEventListener('mousemove', (e) => {
      const px = (e.clientX / window.innerWidth - 0.5) * 2;
      const py = (e.clientY / window.innerHeight - 0.5) * 2;
      blobs.forEach((blob, i) => {
        const factor = (i + 1) * 12;
        blob.style.transform = `translate(${px * factor}px, ${py * factor}px)`;
      });
    }, { passive: true });
  }

  // ============================================
  // FOOTER GRAPHIC — parallax scroll
  // ============================================
  const footerGraphic = document.querySelector('.footer-graphic');
  if (footerGraphic) {
    window.addEventListener('scroll', () => {
      const rect = footerGraphic.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        const progress = 1 - rect.top / window.innerHeight;
        footerGraphic.style.transform = `translateX(${progress * -60}px)`;
      }
    }, { passive: true });
  }

  // ============================================
  // STAGGER GRID ITEMS
  // ============================================
  document.querySelectorAll('.projects-grid .project-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 80}ms`;
  });

  // ============================================
  // FOOTER DOT GRID — three-phase sphere animation
  //
  // Phase 1 · idle      : dots rest at grid positions (hero colors).
  // Phase 2 · converging: on hover, dots within attractRadius are pulled
  //                        toward the surface of a rotating 3-D sphere
  //                        centred on the cursor. Lambertian shading makes
  //                        the rotation read as genuinely three-dimensional.
  // Phase 3 · imploding : after 1.5 s the sphere collapses — every dot
  //                        rushes toward the nucleus (cursor centre) and
  //                        fades to zero, creating an "implosion" flash.
  // On mouseleave the animation resets instantly to idle.
  // ============================================
  class FooterDotGrid {
    constructor(canvas) {
      this.canvas          = canvas;
      this.ctx             = canvas.getContext('2d');
      this.dots            = [];
      this.mouse           = { x: -1e4, y: -1e4 };
      this.needsUpdate     = true;
      this.rotation        = 0;
      this.phase           = 'idle';   // 'idle' | 'converging' | 'imploding'
      this.implosionT      = 0;        // 0 → 1 during implosion
      this._implodeTimer   = null;

      this.cfg = {
        dotSize       : 2.0,
        dotSpacing    : 22,
        sphereRadius  : 100,
        attractRadius : 210,
        speed         : 0.07,
        implosionSpeed: 0.022,   // completes in ~0.75 s at 60 fps
      };

      this._init();
    }

    _init() {
      this._resize();
      new ResizeObserver(() => this._resize()).observe(this.canvas.parentElement);
      const footer = this.canvas.parentElement;

      footer.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.needsUpdate = true;

        // Start convergence on the very first move into the footer
        if (this.phase === 'idle') {
          this.phase       = 'converging';
          this.implosionT  = 0;
          this.rotation    = 0;
          clearTimeout(this._implodeTimer);
          this._implodeTimer = setTimeout(() => {
            if (this.phase === 'converging') {
              this.phase      = 'imploding';
              this.implosionT = 0;
            }
          }, 1100);
        }
      });

      footer.addEventListener('mouseleave', () => {
        clearTimeout(this._implodeTimer);
        this.mouse.x    = -1e4;
        this.mouse.y    = -1e4;
        this.phase      = 'idle';
        this.implosionT = 0;
        this.needsUpdate = true;
      });

      this._tick();
    }

    _resize() {
      const el = this.canvas.parentElement;
      this.canvas.width  = el.offsetWidth;
      this.canvas.height = el.offsetHeight;
      this._build();
      this.needsUpdate = true;
    }

    _build() {
      const { dotSpacing } = this.cfg;
      const cols = Math.ceil(this.canvas.width  / dotSpacing) + 1;
      const rows = Math.ceil(this.canvas.height / dotSpacing) + 1;
      this.dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * dotSpacing + dotSpacing / 2;
          const y = r * dotSpacing + dotSpacing / 2;
          this.dots.push({ ox: x, oy: y, x, y });
        }
      }
    }

    _tick(ts = 0) {
      const dt = Math.min(ts - (this._lastTs || ts), 50);
      this._lastTs = ts;
      this._dt = dt;
      const { phase, cfg } = this;

      if (phase === 'converging') {
        this.rotation   += 0.008;
        this.needsUpdate = true;
      } else if (phase === 'imploding') {
        this.rotation   += 0.008;
        this.implosionT  = Math.min(1, this.implosionT + cfg.implosionSpeed);
        this.needsUpdate = true;
      }

      if (this.needsUpdate) this._drawFrame();
      requestAnimationFrame((t) => this._tick(t));
    }

    _drawFrame() {
      const { ctx, canvas, dots, cfg, phase } = this;
      const { sphereRadius, attractRadius, speed, dotSize } = cfg;
      const mx   = this.mouse.x;
      const my   = this.mouse.y;
      const cosR = Math.cos(this.rotation);
      const sinR = Math.sin(this.rotation);
      const rDot = dotSize / 2;

      // Smooth-step easing for implosion (0 → 1)
      const t    = this.implosionT;
      const ease = t * t * (3 - 2 * t);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
      const [R, G, B] = isDark ? [255, 255, 255] : [21, 29, 60];
      const idleAlpha = isDark ? 0.98 : 0.70;

      const idlePath = new Path2D();
      let hasMoving  = false;

      for (const dot of dots) {
        const dx   = dot.ox - mx;
        const dy   = dot.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // ── Compute sphere-surface target for this dot ──────────
        let stX = dot.ox, stY = dot.oy; // sphere-surface target
        let normalZ  = 0;
        let innerDot = false;
        let outerPull = 0;

        if (phase !== 'idle') {
          if (dist < sphereRadius) {
            const z3D  = Math.sqrt(Math.max(0, sphereRadius * sphereRadius - dist * dist));
            const xRot = dx * cosR - z3D * sinR;
            const zRot = dx * sinR + z3D * cosR;
            stX     = mx + xRot;
            stY     = my + dy;
            normalZ = zRot / sphereRadius;
            innerDot = true;
          } else if (dist < attractRadius) {
            const nx   = dx / dist;
            const ny   = dy / dist;
            stX        = mx + nx * sphereRadius * cosR;
            stY        = my + ny * sphereRadius;
            outerPull  = Math.pow(1 - (dist - sphereRadius) / (attractRadius - sphereRadius), 2);
          }
        }

        // ── Resolve final position target based on phase ─────────
        let tX = dot.ox, tY = dot.oy;

        if (phase === 'converging') {
          if (innerDot) {
            tX = stX; tY = stY;
          } else if (outerPull > 0) {
            tX = dot.ox + (stX - dot.ox) * outerPull;
            tY = dot.oy + (stY - dot.oy) * outerPull;
          }
        } else if (phase === 'imploding') {
          if (innerDot || outerPull > 0) {
            // Collapse from sphere surface toward nucleus
            tX = stX + (mx - stX) * ease;
            tY = stY + (my - stY) * ease;
          }
        }

        // Delta-time corrected lerp — same perceived speed on any canvas size.
        const dtFactor = this._dt > 0 ? this._dt / 16.667 : 1;
        const baseK = 1 - Math.pow(1 - speed, dtFactor);
        const lerpK = phase === 'imploding' ? 1 - Math.pow(1 - speed * 2.5, dtFactor) : baseK;
        dot.x += (tX - dot.x) * lerpK;
        dot.y += (tY - dot.y) * lerpK;
        if (Math.abs(dot.x - tX) > 0.06 || Math.abs(dot.y - tY) > 0.06) hasMoving = true;

        // Opacity scale: fades toward 0 as implosion completes
        const imploseFade = phase === 'imploding' ? 1 - ease : 1;

        // ── Draw ──────────────────────────────────────────────────
        if (phase !== 'idle' && (innerDot || outerPull > 0)) {
          if (innerDot) {
            let opacity, dotR;
            if (normalZ >= 0) {
              opacity = Math.min(1, (0.15 + 0.85 * normalZ) * 2.18) * imploseFade;
              dotR    = rDot * (0.4 + 0.6 * normalZ);
            } else {
              opacity = Math.max(0, (0.15 + normalZ * 0.6) * 2.18) * imploseFade;
              dotR    = rDot * 0.35;
            }
            if (opacity > 0.01) {
              ctx.beginPath();
              ctx.arc(dot.x, dot.y, Math.max(0.2, dotR), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${R},${G},${B},${opacity.toFixed(3)})`;
              ctx.fill();
            }
          } else {
            // Outer halo dot
            const opacity = outerPull * (isDark ? 1.0 : 0.764) * imploseFade;
            if (opacity > 0.02) {
              ctx.beginPath();
              ctx.arc(dot.x, dot.y, rDot * (0.4 + 0.6 * outerPull), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${R},${G},${B},${opacity.toFixed(3)})`;
              ctx.fill();
            } else {
              idlePath.moveTo(dot.x + rDot, dot.y);
              idlePath.arc(dot.x, dot.y, rDot, 0, Math.PI * 2);
            }
          }
        } else {
          idlePath.moveTo(dot.x + rDot, dot.y);
          idlePath.arc(dot.x, dot.y, rDot, 0, Math.PI * 2);
        }
      }

      ctx.fillStyle = `rgba(${R},${G},${B},${idleAlpha})`;
      ctx.fill(idlePath);

      // Keep animating during active phases; stop when everything settles
      this.needsUpdate = hasMoving
        || phase === 'converging'
        || (phase === 'imploding' && this.implosionT < 1);
    }
  }

  // Boot footer dot grid
  const footerCanvas = document.getElementById('footerDotGrid');
  if (footerCanvas) new FooterDotGrid(footerCanvas);

})();
