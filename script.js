(function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header scroll state ---------- */
  var header = document.querySelector('header');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 24) header.classList.add('is-scrolled');
    else header.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- scroll reveal ---------- */
  var revealTargets = document.querySelectorAll('[data-vnr-id], [data-reveal-to]');

  function reveal(el) {
    if (el.classList.contains('is-visible')) return;
    el.classList.add('is-visible');
    el.style.opacity = '1';
    el.style.transform = el.getAttribute('data-reveal-to') || 'none';
    var revealLeft = el.getAttribute('data-reveal-left');
    var revealTop = el.getAttribute('data-reveal-top');
    if (revealLeft !== null) el.style.left = revealLeft;
    if (revealTop !== null) el.style.top = revealTop;
  }

  if (reducedMotion) {
    revealTargets.forEach(reveal);
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var group = entry.target.getAttribute('data-vnr-id');
          if (group) {
            document.querySelectorAll('[data-vnr-group="' + group + '"]').forEach(reveal);
          }
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('[data-vnr-id]').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- design/discover/return: 02·03 spread reveal ---------- */
  var ddrSection = document.querySelector('.vnr-ddr-section');
  if (ddrSection) {
    var ddrSlides = ddrSection.querySelectorAll('.vnr-ddr-slide');
    var ddrArrows = ddrSection.querySelectorAll('.vnr-arrow-wrap');
    var spreadDdr = function () {
      ddrSlides.forEach(function (el) { el.classList.add('is-revealed'); });
      ddrArrows.forEach(function (el) { el.classList.add('is-drawn'); });
    };
    if (reducedMotion) {
      spreadDdr();
    } else {
      var ddrObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            spreadDdr();
            ddrObserver.disconnect();
          }
        });
      }, { threshold: 0.38 });
      ddrObserver.observe(ddrSection);
    }
  }

  /* ---------- TASTE circle -> origin section ---------- */
  var tasteCircle = document.querySelector('[aria-label="TASTE 컬렉션으로 이동"]');
  if (tasteCircle) {
    var goToOrigin = function () {
      var el = document.getElementById('taste-origin');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tasteCircle.addEventListener('click', goToOrigin);
    tasteCircle.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToOrigin(); }
    });
  }

  /* ---------- tea carousel: free-drag infinite marquee ---------- */
  var carousel = document.querySelector('[data-vnr-id="tea-scroll"]');
  var track = carousel && carousel.querySelector('.vnr-track');
  if (carousel && track) {
    var allCards = Array.prototype.slice.call(track.children);
    var CARD_STATES = ['정돈', '선명함', '몰입', '편안함', '생동감', '여운', '이완'];
    var cardOffsets = [];

    var AUTO_SPEED = 0.022; // px per ms
    var FRICTION = 0.94; // per ~16ms frame, applied to inertia velocity
    var MIN_VELOCITY = 0.01; // px/ms, below this inertia stops

    var setWidth = 0;
    var pos = 0; // current scroll offset in px (content moves left as pos increases)
    var state = 'auto'; // 'auto' | 'dragging' | 'coasting'
    var velocity = 0; // px/ms, used while coasting
    var lastTs = null;

    var dragging = false;
    var dragStartX = 0;
    var dragStartPos = 0;
    var lastMoveX = 0;
    var lastMoveTs = 0;
    var recentVelocity = 0;

    function measure() {
      // one set = allCards.length / 3 cards; width is exactly a third of the
      // fully laid-out track since all three sets are identical clones.
      setWidth = track.scrollWidth / 3;
      cardOffsets = allCards.map(function (c) { return c.offsetLeft; });
    }

    function applyTransform() {
      track.style.transform = 'translateX(' + (-pos) + 'px)';
    }

    function wrap() {
      if (setWidth <= 0) return;
      while (pos >= setWidth * 1.5) pos -= setWidth;
      while (pos < setWidth * 0.5) pos += setWidth;
    }

    /* passive state indicator: highlights the keyword matching whichever
       card currently sits at the carousel's left edge. Not interactive. */
    var chips = document.querySelectorAll('.vnr-state-item');
    var chipByLabel = {};
    chips.forEach(function (chip) { chipByLabel[chip.textContent.trim()] = chip; });
    var activeChip = null;
    var activeCard = null;
    function setActiveCard(idx) {
      var card = allCards[idx];
      if (card && card !== activeCard) {
        if (activeCard) activeCard.classList.remove('is-active-card');
        card.classList.add('is-active-card');
        activeCard = card;
      }
    }
    function updateIndicator() {
      if (!cardOffsets.length) return;
      var idx = 0;
      for (var i = 0; i < cardOffsets.length; i++) {
        if (cardOffsets[i] <= pos) idx = i; else break;
      }
      var label = CARD_STATES[idx % CARD_STATES.length];
      var chip = chipByLabel[label];
      if (chip && chip !== activeChip) {
        if (activeChip) activeChip.classList.remove('is-selected');
        chip.classList.add('is-selected');
        activeChip = chip;
      }
      setActiveCard(idx);
    }

    /* clicking a keyword chip jumps the carousel to that card */
    chips.forEach(function (chip) {
      chip.style.cursor = 'pointer';
      chip.addEventListener('click', function () {
        var label = chip.textContent.trim();
        var stateIdx = CARD_STATES.indexOf(label);
        if (stateIdx === -1 || !cardOffsets.length) return;
        var currentIdx = 0;
        for (var i = 0; i < cardOffsets.length; i++) {
          if (cardOffsets[i] <= pos) currentIdx = i; else break;
        }
        var candidates = [];
        for (var j = stateIdx; j < allCards.length; j += CARD_STATES.length) candidates.push(j);
        var bestIdx = candidates[0];
        var bestDist = Infinity;
        candidates.forEach(function (c) {
          var d = Math.abs(c - currentIdx);
          if (d < bestDist) { bestDist = d; bestIdx = c; }
        });
        pos = cardOffsets[bestIdx];
        state = 'auto';
        velocity = 0;
        wrap();
        applyTransform();
        updateIndicator();
      });
    });

    function tick(ts) {
      if (lastTs === null) lastTs = ts;
      var dt = Math.min(ts - lastTs, 48);
      lastTs = ts;

      if (state === 'auto' && !reducedMotion) {
        pos += AUTO_SPEED * dt;
      } else if (state === 'coasting') {
        pos += velocity * dt;
        var decay = Math.pow(FRICTION, dt / 16.67);
        velocity *= decay;
        if (Math.abs(velocity) < MIN_VELOCITY) {
          state = 'auto';
          velocity = 0;
        }
      }
      wrap();
      applyTransform();
      updateIndicator();
      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', function () {
      var before = setWidth;
      measure();
      if (before > 0 && setWidth > 0) pos = pos * (setWidth / before);
      wrap();
      applyTransform();
    }, { passive: true });

    /* free drag: track follows the pointer 1:1, weak inertia on release */
    carousel.addEventListener('pointerdown', function (e) {
      dragging = true;
      state = 'dragging';
      velocity = 0;
      dragStartX = e.clientX;
      dragStartPos = pos;
      lastMoveX = e.clientX;
      lastMoveTs = performance.now();
      recentVelocity = 0;
      carousel.classList.add('vnr-dragging');
      if (carousel.setPointerCapture && e.pointerId != null) {
        try { carousel.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      pos = dragStartPos - (e.clientX - dragStartX);
      wrap();
      applyTransform();
      var now = performance.now();
      var dt = now - lastMoveTs;
      if (dt > 0) {
        recentVelocity = -(e.clientX - lastMoveX) / dt;
      }
      lastMoveX = e.clientX;
      lastMoveTs = now;
    });
    window.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('vnr-dragging');
      if (Math.abs(recentVelocity) > MIN_VELOCITY) {
        state = 'coasting';
        velocity = recentVelocity;
      } else {
        state = 'auto';
      }
    });
    window.addEventListener('pointercancel', function () {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('vnr-dragging');
      state = 'auto';
    });
    carousel.addEventListener('mouseenter', function () { if (!dragging) carousel.dataset.hover = '1'; });
    carousel.addEventListener('mouseleave', function () { delete carousel.dataset.hover; });

    measure();
    var imgs = track.querySelectorAll('img');
    var pending = imgs.length;
    if (pending) {
      imgs.forEach(function (img) {
        if (img.complete) { pending--; return; }
        img.addEventListener('load', function () { measure(); }, { once: true });
      });
    }
    // start centred on the middle (real) set
    pos = setWidth;
    applyTransform();
    requestAnimationFrame(tick);

    function nudge(dir) {
      state = 'coasting';
      velocity = dir * 0.65;
    }
    var prevBtn = document.querySelector('button[data-tea-nav]');
    var nextBtn = document.querySelector('button[aria-label="다음"]');
    if (prevBtn) prevBtn.addEventListener('click', function () { nudge(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { nudge(1); });
  }
})();
