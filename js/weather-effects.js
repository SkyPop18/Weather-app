(() => {
  'use strict';

  const CSS = `

    #we-canvas {
      position: fixed; top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none;
      z-index: 0;
      transition: opacity 520ms ease;
    }
    #we-back {
      position: fixed; inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
      transition: opacity 520ms ease;
    }
    #we-front {
      position: fixed; inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 9999;
      transition: opacity 520ms ease;
    }

    .we-sun-glow {
      position: absolute;
      top: -180px; right: -180px;
      width: 650px; height: 650px;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(255, 200, 100, 0.22) 0%,
        rgba(255, 200, 100, 0.06) 45%,
        transparent 70%
      );
      animation: weSunPulse 5s ease-in-out infinite;
    }
    @keyframes weSunPulse {
      0%, 100% { transform: scale(1); opacity: 0.65; }
      50%      { transform: scale(1.1); opacity: 1; }
    }

    .we-rays-wrap {
      position: absolute; inset: 0;
      overflow: hidden;
    }
    .we-ray {
      position: absolute;
      top: -60px; right: 80px;
      width: 110px; height: 120%;
      background: linear-gradient(
        180deg,
        rgba(255, 220, 150, 0.1) 0%,
        rgba(255, 220, 150, 0.02) 50%,
        transparent 100%
      );
      transform-origin: top right;
      animation: weRayPulse 10s ease-in-out infinite;
    }
    @keyframes weRayPulse {
      0%, 100% { opacity: 0.15; }
      50%      { opacity: 0.45; }
    }

    .we-shimmer {
      position: absolute;
      top: 0; left: -60%;
      width: 30%; height: 100%;
      background: linear-gradient(
        105deg,
        transparent 30%,
        rgba(255,255,255,0.06) 50%,
        transparent 70%
      );
      animation: weShimmerSweep 8s ease-in-out infinite;
    }
    @keyframes weShimmerSweep {
      0%   { transform: translateX(0); }
      100% { transform: translateX(calc(100vw + 200%)); }
    }

    .we-cloud {
      position: absolute;
      left: 0;
      border-radius: 50%;
      background: rgba(200, 210, 225, 0.22);
      filter: blur(45px);
      will-change: transform;
      animation: weCloudDrift linear infinite;
    }
    @keyframes weCloudDrift {
      from { transform: translateX(-130%); }
      to   { transform: translateX(calc(100vw + 130%)); }
    }

    .we-fog-layer {
      position: absolute;
      left: -15%; width: 130%;
      border-radius: 50%;
      background: rgba(200, 210, 220, 0.12);
      filter: blur(55px);
      animation: weFogDrift ease-in-out infinite;
    }
    @keyframes weFogDrift {
      0%, 100% { transform: translateX(0); }
      50%      { transform: translateX(4%); }
    }

    .we-mist {
      position: absolute;
      bottom: -30px; left: -5%;
      width: 110%; height: 150px;
      background: linear-gradient(to top, rgba(180, 200, 220, 0.22), transparent);
      filter: blur(28px);
      animation: weFogDrift 20s ease-in-out infinite;
    }

    .we-glass-drop {
      position: absolute;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      background: radial-gradient(
        circle at 30% 25%,
        rgba(255, 255, 255, 0.5),
        rgba(255, 255, 255, 0.12) 50%,
        rgba(200, 220, 255, 0.06) 100%
      );
      box-shadow:
        0 1px 3px rgba(0,0,0,0.06),
        inset 0 1px 2px rgba(255,255,255,0.35);
      will-change: transform;
    }

    .we-ripple {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid rgba(150, 200, 255, 0.3);
      background: transparent;
      pointer-events: none;
      animation: weRippleExpand 1.2s ease-out forwards;
    }
    @keyframes weRippleExpand {
      0%   { transform: scale(0); opacity: 0.7; }
      100% { transform: scale(1); opacity: 0; }
    }

    .we-lightning {
      position: fixed; inset: 0;
      background: rgba(255,255,255,0);
      pointer-events: none;
      z-index: 10000;
    }

    @media (prefers-reduced-motion: reduce) {
      #we-canvas,
      #we-back,
      #we-front,
      .we-lightning {
        display: none !important;
      }
    }
  `;

  const styleTag = document.createElement('style');
  styleTag.id = 'we-styles';
  styleTag.textContent = CSS;
  document.head.appendChild(styleTag);

  class WeatherEffects {

    constructor() {
      this.current = null;
      this.canvas = null;
      this.ctx = null;
      this.w = 0;
      this.h = 0;
      this.dpr = 1;
      this.particles = [];
      this.particleType = null;
      this.raf = null;
      this.lastTs = 0;
      this.visible = true;
      this.transitioning = false;
      this.pending = null;
      this._timeouts = [];

      this.backEl = null;
      this.frontEl = null;
      this.lightningEl = null;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', (e) => {
          this.reducedMotion = e.matches;
          if (e.matches) this._clearAll();
        });

      this._init();
    }

    _init() {
      if (this.reducedMotion) return;

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'we-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');

      this.backEl = document.createElement('div');
      this.backEl.id = 'we-back';
      this.backEl.setAttribute('aria-hidden', 'true');

      this.frontEl = document.createElement('div');
      this.frontEl.id = 'we-front';
      this.frontEl.setAttribute('aria-hidden', 'true');

      this.lightningEl = document.createElement('div');
      this.lightningEl.className = 'we-lightning';
      this.lightningEl.setAttribute('aria-hidden', 'true');

      const app = document.querySelector('.app-container');
      document.body.insertBefore(this.canvas, app);
      document.body.insertBefore(this.backEl, app);
      document.body.appendChild(this.frontEl);
      document.body.appendChild(this.lightningEl);

      this.ctx = this.canvas.getContext('2d');
      this._resize();

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 150);
      });

      document.addEventListener('visibilitychange', () => {
        this.visible = !document.hidden;
        if (this.visible && !this.raf) {
          this.lastTs = performance.now();
          this._loop();
        }
      });

      this._loop();
    }

    _resize() {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      if (this.canvas) {
        this.canvas.width = this.w * this.dpr;
        this.canvas.height = this.h * this.dpr;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    }

    setWeather(type) {
      if (this.reducedMotion) return;
      if (type === this.current && !this.transitioning) return;

      if (this.transitioning) {
        this.pending = type;
        return;
      }

      this._transitionTo(type);
    }

    destroy() {
      this._clearAll();
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.canvas?.remove();
      this.backEl?.remove();
      this.frontEl?.remove();
      this.lightningEl?.remove();
      document.getElementById('we-styles')?.remove();
    }

    _transitionTo(type) {
      this.transitioning = true;

      if (this.canvas) this.canvas.style.opacity = '0';
      if (this.backEl) this.backEl.style.opacity = '0';
      if (this.frontEl) this.frontEl.style.opacity = '0';

      const t = setTimeout(() => {
        this._clearAll();
        this.current = type;
        this._setupWeather(type);

        if (this.canvas) this.canvas.style.opacity = '1';
        if (this.backEl) this.backEl.style.opacity = '1';
        if (this.frontEl) this.frontEl.style.opacity = '1';

        this.transitioning = false;

        if (this.pending) {
          const next = this.pending;
          this.pending = null;
          this.setWeather(next);
        }
      }, 540);
      this._timeouts.push(t);
    }

    _clearAll() {

      this._timeouts.forEach(t => clearTimeout(t));
      this._timeouts = [];

      this.particles = [];
      this.particleType = null;
      if (this.ctx) this.ctx.clearRect(0, 0, this.w, this.h);

      if (this.backEl) this.backEl.innerHTML = '';
      if (this.frontEl) this.frontEl.innerHTML = '';

      if (this.lightningEl) {
        this.lightningEl.style.background = 'rgba(255,255,255,0)';
      }
    }

    _setupWeather(type) {
      switch (type) {
        case 'clear':        this._setupClear(); break;
        case 'cloudy':       this._setupCloudy(); break;
        case 'rain':         this._setupRain(); break;
        case 'thunderstorm': this._setupThunderstorm(); break;
        case 'snow':         this._setupSnow(); break;
        case 'fog':          this._setupFog(); break;
      }
    }

    _setupClear() {
      this._createSunParticles();
      this._addSunGlow();
      this._addLightRays();
      this._addShimmer();
    }

    _setupCloudy() {
      this._addClouds(6);
      this._addFogLayers(2);
    }

    _setupRain() {
      this._createRainParticles();
      this._addClouds(3);
      this._addMist();
      this._startRipples();
      this._startGlassRain();
    }

    _setupThunderstorm() {
      this._createRainParticles();
      this._addClouds(4);
      this._addMist();
      this._startRipples();
      this._startGlassRain();
      this._startLightning();
    }

    _setupSnow() {
      this._createSnowParticles();
    }

    _setupFog() {
      this._addFogLayers(5);
      this._addClouds(3);
    }

    _loop() {
      const tick = (ts) => {
        if (!this.visible) {
          this.raf = null;
          return;
        }

        const dt = Math.min((ts - this.lastTs) / 1000, 0.05); // cap 50 ms
        this.lastTs = ts;

        this._render(dt, ts / 1000);
        this.raf = requestAnimationFrame(tick);
      };

      this.lastTs = performance.now();
      this.raf = requestAnimationFrame(tick);
    }

    _render(dt, time) {
      if (!this.ctx || this.particles.length === 0) return;
      this.ctx.clearRect(0, 0, this.w, this.h);

      switch (this.particleType) {
        case 'sun':  this._drawSun(dt, time); break;
        case 'rain': this._drawRain(dt); break;
        case 'snow': this._drawSnow(dt, time); break;
      }
    }

    _createSunParticles() {
      this.particleType = 'sun';
      this.particles = [];

      for (let i = 0; i < 45; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          r: 2 + Math.random() * 5,
          speed: 5 + Math.random() * 12,
          angle: Math.random() * Math.PI * 2,
          turn: (Math.random() - 0.5) * 0.8,
          opacity: 0.15 + Math.random() * 0.25,
          pulseRate: 0.3 + Math.random() * 0.6,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    }

    _drawSun(dt, time) {
      const ctx = this.ctx;

      for (const p of this.particles) {

        p.angle += p.turn * dt;
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.y += Math.sin(p.angle) * p.speed * dt;

        if (p.x < -40) p.x = this.w + 40;
        if (p.x > this.w + 40) p.x = -40;
        if (p.y < -40) p.y = this.h + 40;
        if (p.y > this.h + 40) p.y = -40;

        const pulse = 0.5 + 0.5 * Math.sin(time * p.pulseRate + p.pulsePhase);
        const alpha = p.opacity * pulse;

        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = '#ffdc96';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    _createRainParticles() {
      this.particleType = 'rain';
      this.particles = [];

      const angle = 0.15;

      for (let i = 0; i < 200; i++) {
        const speed = 400 + Math.random() * 250;
        const vx = Math.sin(angle) * speed;
        const vy = Math.cos(angle) * speed;
        const mag = Math.sqrt(vx * vx + vy * vy);
        this.particles.push({
          x: Math.random() * (this.w + 120) - 60,
          y: Math.random() * this.h * 1.2 - this.h * 0.1,
          vx, vy,
          nx: vx / mag,
          ny: vy / mag,
          len: 10 + Math.random() * 14,
          layer: 1,
        });
      }

      for (let i = 0; i < 35; i++) {
        const speed = 600 + Math.random() * 350;
        const vx = Math.sin(angle) * speed;
        const vy = Math.cos(angle) * speed;
        const mag = Math.sqrt(vx * vx + vy * vy);
        this.particles.push({
          x: Math.random() * (this.w + 120) - 60,
          y: Math.random() * this.h * 1.2 - this.h * 0.1,
          vx, vy,
          nx: vx / mag,
          ny: vy / mag,
          len: 22 + Math.random() * 20,
          layer: 2,
        });
      }
    }

    _drawRain(dt) {
      const ctx = this.ctx;
      ctx.lineCap = 'round';

      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > this.h + 40) {
          p.y = -(p.len + Math.random() * 100);
          p.x = Math.random() * (this.w + 120) - 60;
        }
        if (p.x > this.w + 80) p.x = -60;
      }

      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#a0d2ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of this.particles) {
        if (p.layer !== 1) continue;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.nx * p.len, p.y + p.ny * p.len);
      }
      ctx.stroke();

      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const p of this.particles) {
        if (p.layer !== 2) continue;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.nx * p.len, p.y + p.ny * p.len);
      }
      ctx.stroke();

      ctx.globalAlpha = 1;
    }

    _createSnowParticles() {
      this.particleType = 'snow';
      this.particles = [];

      for (let i = 0; i < 110; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          r: 1.5 + Math.random() * 3.5,
          speed: 22 + Math.random() * 50,
          drift: 20 + Math.random() * 40,
          driftSpeed: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          opacity: 0.4 + Math.random() * 0.5,
          alpha: 0.5,
        });
      }
    }

    _drawSnow(dt, time) {
      const ctx = this.ctx;
      const fadeStart = this.h * 0.82;

      for (const p of this.particles) {

        p.y += p.speed * dt;
        p.x += Math.sin(time * p.driftSpeed + p.phase) * p.drift * dt;

        if (p.y > fadeStart) {
          p.alpha = p.opacity * Math.max(0, 1 - (p.y - fadeStart) / (this.h * 0.18));
        } else {
          p.alpha = p.opacity;
        }

        if (p.y > this.h + 12) {
          p.y = -12 - Math.random() * 40;
          p.x = Math.random() * this.w;
        }
        if (p.x < -25) p.x = this.w + 25;
        if (p.x > this.w + 25) p.x = -25;

        ctx.globalAlpha = p.alpha * 0.22;
        ctx.fillStyle = '#dce6f2';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    _addSunGlow() {
      const el = document.createElement('div');
      el.className = 'we-sun-glow';
      this.backEl.appendChild(el);
    }

    _addLightRays() {
      const wrap = document.createElement('div');
      wrap.className = 'we-rays-wrap';
      const angles = [-22, -6, 10, 24];

      angles.forEach((a, i) => {
        const ray = document.createElement('div');
        ray.className = 'we-ray';
        ray.style.transform = `rotate(${a}deg)`;
        ray.style.right = `${50 + i * 70}px`;
        ray.style.animationDelay = `${i * 2.5}s`;
        ray.style.animationDuration = `${8 + i * 2}s`;
        wrap.appendChild(ray);
      });
      this.backEl.appendChild(wrap);
    }

    _addShimmer() {
      const el = document.createElement('div');
      el.className = 'we-shimmer';
      this.backEl.appendChild(el);
    }

    _addClouds(count) {
      for (let i = 0; i < count; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'we-cloud';
        const size = 250 + Math.random() * 350;
        cloud.style.width = size + 'px';
        cloud.style.height = (size * 0.45) + 'px';
        cloud.style.top = (Math.random() * 55) + '%';
        cloud.style.animationDuration = (45 + Math.random() * 45) + 's';
        cloud.style.animationDelay = (Math.random() * -80) + 's';
        cloud.style.opacity = String(0.1 + Math.random() * 0.18);
        this.backEl.appendChild(cloud);
      }
    }

    _addFogLayers(count) {
      for (let i = 0; i < count; i++) {
        const fog = document.createElement('div');
        fog.className = 'we-fog-layer';
        const h = 80 + Math.random() * 200;
        fog.style.height = h + 'px';
        fog.style.bottom = (i * 55 + Math.random() * 40) + 'px';
        fog.style.animationDuration = (20 + Math.random() * 18) + 's';
        fog.style.animationDelay = (Math.random() * -30) + 's';
        fog.style.opacity = String(0.08 + Math.random() * 0.14);
        this.backEl.appendChild(fog);
      }
    }

    _addMist() {
      const el = document.createElement('div');
      el.className = 'we-mist';
      this.backEl.appendChild(el);
    }

    _startGlassRain() {
      const MAX = 20;
      let active = 0;

      const spawn = () => {
        if (active >= MAX) return;
        if (this.current !== 'rain' && this.current !== 'thunderstorm') return;
        active++;

        const drop = document.createElement('div');
        drop.className = 'we-glass-drop';
        const size = 4 + Math.random() * 7;
        const dur = 8000 + Math.random() * 7000;

        drop.style.width = size + 'px';
        drop.style.height = (size * 1.3) + 'px';
        drop.style.left = (Math.random() * 92 + 4) + '%';
        drop.style.top = (Math.random() * 25) + '%';
        drop.style.opacity = '0.65';
        drop.style.transition =
          `transform ${dur}ms linear, ` +
          `opacity ${dur * 0.25}ms ease ${dur * 0.75}ms`;

        this.frontEl.appendChild(drop);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            drop.style.transform = `translateY(${this.h * 0.8}px)`;
            drop.style.opacity = '0';
          });
        });

        const t = setTimeout(() => {
          drop.remove();
          active--;
        }, dur + 400);
        this._timeouts.push(t);
      };

      for (let i = 0; i < 8; i++) {
        const t = setTimeout(spawn, i * 350);
        this._timeouts.push(t);
      }

      const schedule = () => {
        const delay = 400 + Math.random() * 800;
        const t = setTimeout(() => {
          if (this.current !== 'rain' && this.current !== 'thunderstorm') return;
          spawn();
          schedule();
        }, delay);
        this._timeouts.push(t);
      };
      schedule();
    }

    _startRipples() {
      const schedule = () => {
        const delay = 250 + Math.random() * 500;
        const t = setTimeout(() => {
          if (this.current !== 'rain' && this.current !== 'thunderstorm') return;

          const ripple = document.createElement('div');
          ripple.className = 'we-ripple';
          const size = 12 + Math.random() * 24;
          ripple.style.width = size + 'px';
          ripple.style.height = (size * 0.35) + 'px';
          ripple.style.left = (Math.random() * 88 + 6) + '%';
          ripple.style.bottom = (Math.random() * 12 + 3) + '%';
          this.backEl.appendChild(ripple);

          ripple.addEventListener('animationend', () => ripple.remove(), { once: true });

          schedule();
        }, delay);
        this._timeouts.push(t);
      };
      schedule();
    }

    _startLightning() {
      const flash = () => {
        if (this.current !== 'thunderstorm') return;

        const dur = 100 + Math.random() * 50;
        const brightness = 0.12 + Math.random() * 0.08;
        this.lightningEl.style.background = `rgba(255,255,255,${brightness})`;

        const t1 = setTimeout(() => {
          this.lightningEl.style.background = 'rgba(255,255,255,0)';
        }, dur);
        this._timeouts.push(t1);

        if (Math.random() < 0.3) {
          const gap = dur + 80 + Math.random() * 120;
          const t2 = setTimeout(() => {
            if (this.current !== 'thunderstorm') return;
            const b2 = 0.06 + Math.random() * 0.06;
            this.lightningEl.style.background = `rgba(255,255,255,${b2})`;

            const t3 = setTimeout(() => {
              this.lightningEl.style.background = 'rgba(255,255,255,0)';
            }, 70 + Math.random() * 40);
            this._timeouts.push(t3);
          }, gap);
          this._timeouts.push(t2);
        }

        const nextDelay = 6000 + Math.random() * 6000;
        const t4 = setTimeout(flash, nextDelay);
        this._timeouts.push(t4);
      };

      const t = setTimeout(flash, 2000 + Math.random() * 4000);
      this._timeouts.push(t);
    }
  }

  window.WeatherEffects = WeatherEffects;
  window.weatherEffects = new WeatherEffects();

})();
