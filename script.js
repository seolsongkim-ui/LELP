(function () {
  var STORAGE_KEY = "lelp_role";
  var body = document.body;
  var roleButtons = document.querySelectorAll("[data-role-btn]");
  var roleThumb = document.querySelector(".role-switch-thumb");

  // Slides the toggle's colored thumb to sit exactly behind whichever button
  // is active. Measured (not hardcoded) because "학생 · Student" and
  // "봉사자 · Volunteer" aren't the same width.
  function updateRoleThumb() {
    if (!roleThumb) return;
    var activeBtn = document.querySelector(".role-btn.active");
    if (!activeBtn) return;
    roleThumb.style.width = activeBtn.offsetWidth + "px";
    roleThumb.style.height = activeBtn.offsetHeight + "px";
    roleThumb.style.top = activeBtn.offsetTop + "px";
    roleThumb.style.transform = "translateX(" + activeBtn.offsetLeft + "px)";
    roleThumb.classList.toggle("is-volunteer", activeBtn.getAttribute("data-role-btn") === "volunteer");
  }

  function setRole(role, updateHash) {
    if (role !== "student" && role !== "volunteer") role = "student";
    body.setAttribute("data-role", role);
    roleButtons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-role-btn") === role;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    updateRoleThumb();
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch (e) {
      /* localStorage unavailable (e.g. sandboxed embed) — ignore */
    }
    // Only touch the URL hash on an explicit user toggle (updateHash !== false),
    // and only when it isn't already pointing at a real in-page anchor like
    // "#schedule" or "#apply" — otherwise we'd clobber a meaningful deep link.
    if (updateHash !== false && history.replaceState) {
      var currentHash = window.location.hash.replace("#", "");
      if (currentHash === "" || currentHash === "student" || currentHash === "volunteer") {
        history.replaceState(null, "", "#" + role);
      }
    }
  }

  roleButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setRole(btn.getAttribute("data-role-btn"));
    });
  });

  // initial role: URL hash > saved preference > default (student)
  var initial = "student";
  var rawHash = window.location.hash.replace("#", "");
  if (rawHash === "student" || rawHash === "volunteer") {
    initial = rawHash;
  } else {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "student" || saved === "volunteer") initial = saved;
    } catch (e) {
      /* ignore */
    }
  }
  // Don't touch history on the automatic initial call — preserve whatever
  // fragment (e.g. "#schedule", "#apply") brought the visitor to this page.
  setRole(initial, false);

  // Keep the thumb glued to the active button across resizes/breakpoints and
  // once webfonts finish swapping in (either can shift button widths).
  window.addEventListener("resize", updateRoleThumb);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateRoleThumb);
  }

  // Switching role can reflow the page (student/volunteer copy differs in
  // length), which can leave an anchor-linked page scrolled to the wrong
  // spot. Re-settle scroll to the real target anchor, if any, once layout
  // has stabilized post-role-switch.
  if (rawHash && rawHash !== "student" && rawHash !== "volunteer") {
    var anchorTarget = document.getElementById(rawHash);
    if (anchorTarget) {
      requestAnimationFrame(function () {
        anchorTarget.scrollIntoView({ block: "start" });
      });
    }
  }

  // highlight the current page in the header/mobile nav
  var currentFile = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a, .mobile-nav a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href.indexOf("#apply") !== -1) return; // the persistent Apply CTA link, not a page nav item
    var linkFile = href.split("#")[0] || "index.html";
    if (linkFile === currentFile) a.classList.add("active");
  });

  // mobile nav toggle
  var navToggle = document.querySelector(".nav-toggle");
  var mobileNav = document.querySelector(".mobile-nav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- sub-nav (index.html only): sticky offset + scroll-spy ----
  var subnav = document.querySelector(".subnav");
  if (subnav) {
    var siteHeader = document.querySelector(".site-header");
    var subnavLinks = subnav.querySelectorAll(".subnav-link");

    function updateHeaderOffset() {
      var headerH = siteHeader ? siteHeader.offsetHeight : 0;
      var subnavH = subnav.offsetHeight;
      document.documentElement.style.setProperty("--header-h", headerH + "px");
      // Extra 16px breathing room so a jumped-to section's heading isn't
      // flush against the sticky bars — this is what fixes "top gets cut off".
      document.documentElement.style.setProperty("--sticky-offset", headerH + subnavH + 16 + "px");
      // Lets the CSS pull the next section up under the (transparent) bar.
      document.documentElement.style.setProperty("--subnav-h", subnavH + "px");
    }
    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    // Center the tab group under THIS page's own link in the main nav
    // (e.g. "학기 안내" on index.html) — not hardcoded to one page. Falls
    // back to page-centered when that link isn't visible (e.g. on mobile,
    // where .main-nav is hidden behind the burger).
    var subnavInner = subnav.querySelector(".subnav-inner");
    var aboutLink = document.querySelector(".main-nav a[href='" + currentFile + "']");
    var mainNav = document.querySelector(".main-nav");
    function alignSubnavToAbout() {
      var mainNavVisible = mainNav && getComputedStyle(mainNav).display !== "none";
      var groupWidth = subnavInner.offsetWidth;
      var targetCenterX;
      if (mainNavVisible && aboutLink) {
        var r = aboutLink.getBoundingClientRect();
        targetCenterX = r.left + r.width / 2;
      } else {
        targetCenterX = window.innerWidth / 2;
      }
      var left = targetCenterX - groupWidth / 2;
      var pad = 16;
      if (left < pad) left = pad;
      if (left + groupWidth > window.innerWidth - pad) left = window.innerWidth - pad - groupWidth;
      subnavInner.style.marginLeft = left + "px";
    }
    alignSubnavToAbout();
    window.addEventListener("resize", alignSubnavToAbout);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(alignSubnavToAbout);
    }

    // Role switch can reflow the header (different copy length) — resettle shortly after.
    // The tab labels themselves are bilingual (e.g. "배경" vs "Background"), so
    // the active tab's width/position changes too — without re-running this,
    // the red thumb stays sized for the old language and overlaps the next tab.
    roleButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTimeout(function () {
          updateHeaderOffset();
          alignSubnavToAbout();
          updateSubnavThumb();
        }, 50);
      });
    });

    var sections = [];
    subnavLinks.forEach(function (a) {
      var id = a.getAttribute("href").replace("#", "");
      var el = document.getElementById(id);
      if (el) sections.push({ id: id, el: el, link: a });
    });

    var subnavThumb = subnav.querySelector(".subnav-thumb");
    function updateSubnavThumb() {
      if (!subnavThumb) return;
      var activeLink = subnav.querySelector(".subnav-link.active");
      if (!activeLink) return;
      subnavThumb.style.width = activeLink.offsetWidth + "px";
      subnavThumb.style.height = activeLink.offsetHeight + "px";
      subnavThumb.style.top = activeLink.offsetTop + "px";
      subnavThumb.style.transform = "translateX(" + activeLink.offsetLeft + "px)";
    }

    function setActiveTab(id) {
      subnavLinks.forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("href") === "#" + id);
      });
      updateSubnavThumb();
    }
    window.addEventListener("resize", updateSubnavThumb);
    // Default to the first tab so the thumb is visible immediately, even
    // before the scroll-spy below has anything to report.
    if (sections.length) setActiveTab(sections[0].id);

    // Clicking a tab triggers the browser's own smooth-scroll to that anchor
    // (`scroll-behavior: smooth` in CSS), which takes a few hundred ms. While
    // that animation is in flight, the IntersectionObserver below keeps
    // reporting whichever section is passing through the viewport at that
    // instant — including ones the scroll merely passes *over* — and stomps
    // the tab we just set active. E.g. click "Participants" then click
    // "Activities": the scroll animates back up past "Background", the
    // observer fires for it mid-flight, and the tab snaps to "Background"
    // instead of staying on "Activities". Suppress the observer's tab
    // updates until scrolling has actually settled.
    var ignoreObserver = false;
    var scrollSettleTimer = null;
    function onScrollTick() {
      clearTimeout(scrollSettleTimer);
      scrollSettleTimer = setTimeout(function () {
        window.removeEventListener("scroll", onScrollTick);
        ignoreObserver = false;
      }, 150);
    }
    function suppressObserverUntilScrollSettles() {
      ignoreObserver = true;
      window.addEventListener("scroll", onScrollTick, { passive: true });
      onScrollTick();
    }

    if (sections.length && "IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (ignoreObserver) return;
          entries.forEach(function (entry) {
            if (entry.isIntersecting) setActiveTab(entry.target.id);
          });
        },
        { rootMargin: "0px 0px -70% 0px" }
      );
      sections.forEach(function (s) {
        observer.observe(s.el);
      });
    }

    subnavLinks.forEach(function (a) {
      a.addEventListener("click", function () {
        suppressObserverUntilScrollSettles();
        setActiveTab(a.getAttribute("href").replace("#", ""));
      });
    });
  }
})();

(function () {
  // TODO: replace "#" with each activity's real Google Form URL once provided.
  var GOOGLE_FORM_LINKS = {
    "act-penpal": "#",
    "act-column": "https://forms.gle/TzREhkxF6MA5W6cC7",
    "act-gameday": "https://forms.gle/b7eg8q9X6Q3tGDEs9",
    "act-specialweek": "https://forms.gle/XbjJxeTN7cMNERNP7",
    "act-walkrun": "#",
    // Points at the in-site application form, not a Google Form. A "#..."
    // value is treated as an in-page link below: same tab, no new window.
    "act-speech": "#act-speech-apply",
    // Not open yet: the ceremony's apply buttons stay in the muted "모집 예정" state.
    "act-ceremony": "#"
  };

  // Announced opening dates for forms that aren't live yet — shown on the
  // detail apply button and the card badge instead of the generic 모집 예정.
  // Remove an entry once its real form URL goes into GOOGLE_FORM_LINKS.
  var FORM_OPEN_DATES = {
    // Pen pal sign-ups never ran through a Google Form — the team sends the
    // application over KakaoTalk, so the button says so instead of "모집 예정".
    "act-penpal": { ko: "신청서는 카카오톡으로 전송 예정", en: "Application form will be sent via KakaoTalk" },
    // The contest and the ceremony are separate pages, so each waiting
    // label says which one it is rather than both reading "모집 예정".
    "act-speech": { ko: "대회 모집 예정", en: "Contest opening soon" },
    "act-ceremony": { ko: "수료식 모집 예정", en: "Ceremony opening soon" }
  };

  // Sign-ups closed by hand, whatever the dates say — the roster filled up or
  // the team stopped taking entries early.
  var ACTIVITY_CLOSED = ["act-penpal"];

  // Each activity's last day, inclusive. Once it is past, sign-ups close even
  // when no separate application deadline was announced for it.
  var ACTIVITY_END_DATES = {
    "act-penpal": "2026-11-28",
    "act-column": "2026-11-30",
    "act-gameday": "2026-09-19",
    "act-specialweek": "2026-10-05",
    "act-walkrun": "2026-10-24",
    "act-speech": "2026-11-28",
    "act-ceremony": "2026-11-28"
  };

  // Application deadlines, inclusive. Between the deadline and the activity's
  // own last day the card reads "모집 마감" instead of "모집 중", and the apply
  // buttons stop linking to a form that no longer accepts entries.
  var ACTIVITY_CLOSE_DATES = {
    "act-gameday": "2026-09-15",
    "act-column": "2026-09-16",
    "act-specialweek": "2026-09-23"
  };

  function activityDate(map, id) {
    if (!id) return null;
    if (map[id]) return map[id];
    // Per-option keys look like "act-specialweek-movie" — fall back to the activity.
    var base = Object.keys(map).filter(function (key) { return id.indexOf(key + "-") === 0; })[0];
    return base ? map[base] : null;
  }

  function isAfter(date) {
    return !!date && new Date() > new Date(date + "T23:59:59");
  }

  // One closed state, not two: sign-ups are shut once either the application
  // deadline or the activity's own last day has gone by, and the card simply
  // reads "모집 마감" — no separate faded "past activity" treatment.
  function isClosedActivity(id) {
    if (!id) return false;
    var closedByHand = ACTIVITY_CLOSED.some(function (key) { return id === key || id.indexOf(key + "-") === 0; });
    return closedByHand || isAfter(activityDate(ACTIVITY_CLOSE_DATES, id)) || isAfter(activityDate(ACTIVITY_END_DATES, id));
  }

  document.querySelectorAll("[data-apply]").forEach(function (a) {
    var key = a.getAttribute("data-apply");
    var url = GOOGLE_FORM_LINKS[key];
    if (isClosedActivity(key)) {
      a.classList.add("btn-upcoming");
      a.removeAttribute("target");
      a.innerHTML = '<span data-r-student>모집 마감</span><span data-r-volunteer>Applications Closed</span>';
      a.addEventListener("click", function (e) { e.preventDefault(); });
      return;
    }
    if (url && url !== "#") {
      a.href = url;
      // An in-site destination ("#act-speech-apply") must open in this tab,
      // so drop the new-window attributes a Google Form link needs.
      if (url.charAt(0) === "#") {
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
    } else {
      // Form not posted yet — show a disabled "모집 예정" state instead of
      // an apply button that goes nowhere. Flips back to 신청하기 on its own
      // once a real URL replaces "#" in GOOGLE_FORM_LINKS above.
      var openAt = FORM_OPEN_DATES[key];
      a.classList.add("btn-upcoming");
      a.removeAttribute("target");
      a.innerHTML = '<span data-r-student>' + (openAt ? openAt.ko : "모집 예정") + '</span><span data-r-volunteer>' + (openAt ? openAt.en : "Opening Soon") + '</span>';
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
  });

  // Each activity card on the semester-guide (#sg-activities) shows a
  // recruitment-status badge — "모집 예정" until a real form URL exists,
  // then "모집 중" automatically, so nobody has to remember to flip it by
  // hand when a form link goes in above. A card's own "자세히 보고 신청"
  // button already points either straight to a real external form (e.g.
  // the Walk & Run card) or to "activity.html#<id>"; for the latter this
  // checks every GOOGLE_FORM_LINKS key for that id (a card can map to more
  // than one apply button, e.g. Special Week's movie/doc options) and
  // counts it as open once any one of them is a real, non-"#" URL.
  document.querySelectorAll(".ac-card").forEach(function (card) {
    var btn = card.querySelector(".ac-btn");
    var statusEl = card.querySelector(".ac-status");
    if (!btn || !statusEl) return;
    var href = btn.getAttribute("href") || "";
    var isOpen;
    var actId = card.getAttribute("data-activity");
    if (href.indexOf("activity.html#") === 0) {
      actId = href.split("#")[1];
      isOpen = Object.keys(GOOGLE_FORM_LINKS).some(function (key) {
        return (key === actId || key.indexOf(actId + "-") === 0) && GOOGLE_FORM_LINKS[key] !== "#";
      });
    } else {
      isOpen = !!href && href !== "#";
    }
    var studentSpan = statusEl.querySelector("[data-r-student]");
    var volunteerSpan = statusEl.querySelector("[data-r-volunteer]");
    if (isClosedActivity(actId)) {
      statusEl.classList.remove("ac-status-upcoming");
      statusEl.classList.remove("ac-status-open");
      statusEl.classList.add("ac-status-closed");
      if (studentSpan) studentSpan.textContent = "모집 마감";
      if (volunteerSpan) volunteerSpan.textContent = "Applications Closed";
      return;
    }
    if (isOpen) {
      statusEl.classList.remove("ac-status-upcoming");
      statusEl.classList.add("ac-status-open");
      if (studentSpan) studentSpan.textContent = "모집 중";
      if (volunteerSpan) volunteerSpan.textContent = "Now Recruiting";
    } else if (actId) {
      // Still upcoming, but with an announced opening date: show it.
      var openAt = null;
      Object.keys(FORM_OPEN_DATES).some(function (key) {
        if (key === actId || key.indexOf(actId + "-") === 0) { openAt = FORM_OPEN_DATES[key]; return true; }
        return false;
      });
      if (openAt) {
        if (studentSpan) studentSpan.textContent = openAt.ko;
        if (volunteerSpan) volunteerSpan.textContent = openAt.en;
      }
    }
  });

  
  // activity.html shows exactly one of its 6 detail blocks, based on the
  // "#act-*" hash the "자세히 보기" link on the semester-guide timeline sends it.
  var detailBlocks = document.querySelectorAll(".activity-detail-block");
  if (detailBlocks.length) {
    var showActivityDetail = function () {
      var id = window.location.hash.replace("#", "") || detailBlocks[0].getAttribute("data-activity");
      /* A page that is not published yet (data-unpublished) cannot be entered, not even by its address. */
      var wanted = Array.prototype.filter.call(detailBlocks, function (b) { return b.getAttribute("data-activity") === id; })[0];
      if (wanted && wanted.hasAttribute("data-unpublished")) {
        window.location.replace("index.html#sg-activities");
        return;
      }
      detailBlocks.forEach(function (b) {
        b.classList.toggle("is-shown", b.getAttribute("data-activity") === id);
      });
    };
    window.addEventListener("hashchange", showActivityDetail);
    showActivityDetail();
  }
})();

(function () {
  // Past-activities photo carousel: seamless infinite loop via cloned
  // end-slides (wrapping past the last slide animates into a lookalike
  // clone, then snaps invisibly back to the real first slide — no
  // visible jump), auto-advance every 3s, prev/next buttons, dot nav,
  // and drag/swipe. Non-active slides sit faded/blurred, peeking in
  // from the viewport edges.
  var AUTOPLAY_MS = 3000;

  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".carousel-track");
    var originalSlides = Array.prototype.slice.call(root.querySelectorAll(".carousel-slide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll(".carousel-dot"));
    var prevBtn = root.querySelector(".carousel-arrow-prev");
    var nextBtn = root.querySelector(".carousel-arrow-next");
    var viewport = root.querySelector(".carousel-viewport");
    if (!track || !originalSlides.length) return;

    var realCount = originalSlides.length;

    // Clone the first and last slide onto the opposite ends of the
    // track so the loop point has a lookalike to animate into.
    var firstClone = originalSlides[0].cloneNode(true);
    var lastClone = originalSlides[realCount - 1].cloneNode(true);
    firstClone.setAttribute("aria-hidden", "true");
    lastClone.setAttribute("aria-hidden", "true");
    track.appendChild(firstClone);
    track.insertBefore(lastClone, originalSlides[0]);

    var slideEls = Array.prototype.slice.call(track.children);
    var current = 1; // index into slideEls; slideEls[1] is real slide 0

    function setActiveClass() {
      slideEls.forEach(function (el, i) {
        el.classList.toggle("is-active", i === current);
      });
      var realIndex = (current - 1 + realCount) % realCount;
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === realIndex); });
    }

    function center(instant) {
      var activeEl = slideEls[current];
      var viewportW = viewport.getBoundingClientRect().width;
      var slideW = activeEl.getBoundingClientRect().width;
      var shift = (viewportW - slideW) / 2 - activeEl.offsetLeft;
      if (instant) {
        track.style.transition = "none";
        track.style.transform = "translateX(" + shift + "px)";
        void track.offsetHeight; // force reflow so the transition re-enables cleanly
        track.style.transition = "";
      } else {
        track.style.transform = "translateX(" + shift + "px)";
      }
    }

    // After animating into a cloned end-slide, snap invisibly back to the
    // matching real slide — this is what makes the loop seamless. A timer
    // (matched to the CSS transition duration) drives this rather than
    // "transitionend", which can fail to fire on a backgrounded/throttled
    // tab or get cancelled by an interrupted transition.
    var wrapTimer = null;
    function scheduleWrapCheck() {
      if (wrapTimer) clearTimeout(wrapTimer);
      wrapTimer = setTimeout(function () {
        if (current === slideEls.length - 1) {
          current = 1;
          render(true);
        } else if (current === 0) {
          current = slideEls.length - 2;
          render(true);
        }
      }, 520);
    }

    function render(instant) {
      setActiveClass();
      center(instant);
      if (!instant) scheduleWrapCheck();
    }

    function goTo(i) {
      // Clamped so rapid clicking past a clone before the wrap check
      // runs can't push current out of the track's real bounds.
      current = Math.max(0, Math.min(i, slideEls.length - 1));
      render(false);
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    var timer = null;
    function stopAutoplay() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function startAutoplay() {
      stopAutoplay();
      var reduceMotion = false;
      try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
      if (reduceMotion) return;
      timer = setInterval(next, AUTOPLAY_MS);
    }

    function restartAutoplay() { startAutoplay(); }

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restartAutoplay(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restartAutoplay(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i + 1); restartAutoplay(); });
    });

    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);

    // Drag/swipe: works for both touch and mouse via pointer events.
    if (viewport) {
      var dragStartX = null;
      viewport.addEventListener("pointerdown", function (e) {
        dragStartX = e.clientX;
        stopAutoplay();
      });
      viewport.addEventListener("pointerup", function (e) {
        if (dragStartX === null) return;
        var dx = e.clientX - dragStartX;
        if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
        dragStartX = null;
        startAutoplay();
      });
      viewport.addEventListener("pointerleave", function () { dragStartX = null; });
    }

    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { next(); restartAutoplay(); }
      if (e.key === "ArrowLeft") { prev(); restartAutoplay(); }
    });

    // Re-center on resize since the shift is computed in pixels.
    window.addEventListener("resize", function () { render(true); });

    render(true);
    startAutoplay();
  });
})();

(function () {
  // Timeline page: fade out schedule items whose end date (data-end,
  // an ISO date on each .timeline-row) has already passed.
  var rows = document.querySelectorAll(".timeline-row[data-end]");
  if (!rows.length) return;

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  rows.forEach(function (row) {
    var end = new Date(row.getAttribute("data-end") + "T23:59:59");
    if (end < today) {
      row.classList.add("is-past");
    }
  });
})();

(function () {
  // Columnist page: 컬럼반/에세이반 tab switcher — each panel carries that
  // class's own character, level requirement, and themes; everything shared
  // by both classes lives outside the tabs.
  document.querySelectorAll("[data-class-tabs]").forEach(function (root) {
    var btns = root.querySelectorAll(".class-tab-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-tab");
        btns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        root.querySelectorAll("[data-tab-panel]").forEach(function (p) {
          p.classList.toggle("is-shown", p.getAttribute("data-tab-panel") === id);
        });
      });
    });
  });
})();

/* ---------- Speech Contest sign-up popup ----------
   Every page gets it from here rather than repeating the markup in seven
   HTML files. Opens shortly after load, closes on the buttons, the backdrop
   or Esc; the checkbox snoozes it for a day (storage is wrapped because a
   private window or blocked site data makes it throw); it is for students
   only, and it stops opening by itself once the application deadline has
   passed. The fwr-* class names come from the first announcement this slot
   carried (Freedom Walk & Run); they are kept so the styling stays as it was. */
(function () {
  var KEY = "lelp-speech-modal-snoozed-until";
  var APPLY_END = "2026-10-28";
  if (new Date() > new Date(APPLY_END + "T23:59:59")) return;
  try { if (Number(localStorage.getItem(KEY) || 0) > Date.now()) return; } catch (e) { /* storage unavailable */ }
  if (document.getElementById("fwr-modal")) return;

  var html =
    '<div class="fwr-modal" id="fwr-modal" role="dialog" aria-modal="true" aria-labelledby="fwr-title" data-r-student hidden>' +
    '  <div class="fwr-dialog">' +
    '    <button type="button" class="fwr-close" data-fwr-close aria-label="닫기 / Close">&times;</button>' +
    '    <span class="fwr-icon"><svg class="ic" aria-hidden="true"><use href="#ic-mic"/></svg></span>' +
    '    <span class="fwr-eyebrow">11.28 (토) · 오프라인</span>' +
    '    <h2 id="fwr-title">스피치 콘테스트<br>참가 신청이 열렸습니다</h2>' +
    '    <p>영어를 잘하는 대회가 아니라, 나의 이야기를 전하는 자리입니다. 전문가와 함께하는 코칭 세션으로 준비하고, 신청은 10월 28일까지입니다.</p>' +
    '    <p class="fwr-credit">' +
    '      <svg class="ic" aria-hidden="true"><use href="#ic-megaphone"/></svg>' +
    '      <span>이번 학기 필수 활동에 참가하지 않은 학생은 <strong>마지막 기회</strong>이니 꼭 참여하시기 바랍니다.</span>' +
    '    </p>' +
    '    <div class="fwr-actions">' +
    '      <a class="btn btn-primary" href="activity.html#act-speech" data-fwr-apply>스피치 콘테스트 신청하기</a>' +
    '      <button type="button" class="fwr-later" data-fwr-close>나중에 볼게요</button>' +
    '    </div>' +
    '    <label class="fwr-snooze">' +
    '      <input type="checkbox" id="fwr-snooze">' +
    '      <span>오늘 하루 보지 않기</span>' +
    '    </label>' +
    '  </div>' +
    '</div>';

  var holder = document.createElement("div");
  holder.innerHTML = html;
  var modal = holder.firstElementChild;
  document.body.appendChild(modal);

  var lastFocus = null;
  function close() {
    var snooze = document.getElementById("fwr-snooze");
    if (snooze && snooze.checked) {
      try { localStorage.setItem(KEY, String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e) { /* storage unavailable */ }
    }
    modal.classList.remove("is-open");
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function open() {
    /* The contest is for students; on the volunteer side there is nothing to show. */
    if (document.body.getAttribute("data-role") === "volunteer") return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var apply = modal.querySelector("[data-fwr-apply]");
    if (apply) apply.focus();
  }

  modal.querySelectorAll("[data-fwr-close]").forEach(function (btn) {
    btn.addEventListener("click", close);
  });
  modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
  var apply = modal.querySelector("[data-fwr-apply]");
  if (apply) apply.addEventListener("click", function () { setTimeout(close, 100); });

  setTimeout(open, 600);
})();

/* Application forms — the speech contest and the ceremony each open as a
   dialog from their own apply buttons, so nobody leaves the page they were
   reading. The buttons keep their "#...-apply" href, which also keeps the
   activity card reading 모집 중; the click is intercepted here. Both forms
   behave the same way; only the checks at the end differ. */
(function () {
  /* Where the speech-contest sheet listens (a Google Apps Script web app). */
  var SPEECH_ENDPOINT = "https://script.google.com/macros/s/AKfycbzATJE8IhoBFtSW_Ppnj6zVMs7SX3wUfk3RPPL3S0qYMU-4vbS0dwBBLniD1fd-3vhE-g/exec";

  function setUp(modalId, href, check, send) {
  var modal = document.getElementById(modalId);
  if (!modal) return;
  var dialog = modal.querySelector(".sfm-dialog");
  var body = modal.querySelector(".sfm-body");
  var lastFocus = null;

  function close() {
    modal.classList.remove("is-open");
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    dialog.scrollTop = 0;
    body.scrollTop = 0;
    clearErrors();
    unsend();
    stampRole();
    dialog.focus();
  }
  /* After a send the dialog shows its thank-you panel; the next time it opens
     the form is blank again and the button works. */
  function unsend() {
    var btn = modal.querySelector(".sf-submit");
    if (btn) btn.disabled = false;
    if (!modal.classList.contains("is-sent")) return;
    modal.classList.remove("is-sent");
    modal.querySelectorAll("input[type=text],input[type=email],textarea").forEach(function (v) { v.value = ""; });
    modal.querySelectorAll("input[type=radio],input[type=checkbox]").forEach(function (c) { c.checked = false; });
  }
  /* The sheet needs to know which side of the site the entry came from, and
     the page already knows — so nobody is asked to pick their role. */
  function stampRole() {
    var f = modal.querySelector("[data-role-field]");
    if (f) f.value = document.body.getAttribute("data-role") === "volunteer" ? "volunteer" : "student";
  }

  document.querySelectorAll('a[href="' + href + '"]').forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); open(); });
  });
  modal.querySelectorAll("[data-sf-close]").forEach(function (b) { b.addEventListener("click", close); });
  modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    /* Keep Tab inside the dialog — behind it the whole page is still there. */
    var f = modal.querySelectorAll('button, a[href], input, textarea, select, [tabindex="-1"]');
    var list = [];
    for (var i = 0; i < f.length; i++) {
      if (f[i] !== dialog && f[i].offsetParent !== null) list.push(f[i]);
    }
    if (!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
  });

  /* Checks before anything is sent. The submit itself is not wired to a
     spreadsheet yet, so a filled-in form says so instead of pretending. */
  function clearErrors() {
    modal.querySelectorAll(".sf-q").forEach(function (q) { q.classList.remove("is-missing"); });
    modal.querySelectorAll(".sf-err").forEach(function (p) { p.remove(); });
    var done = modal.querySelector(".sf-done");
    if (done) done.remove();
  }
  function fail(q, msg) {
    q.classList.add("is-missing");
    var p = document.createElement("p");
    p.className = "sf-err";
    p.textContent = msg;
    q.appendChild(p);
  }
  function qOf(el) { return el ? el.closest(".sf-q") : null; }
  function field(n) { return modal.querySelector('[name="' + n + '"]'); }
  function checked(name) { return modal.querySelector('input[name="' + name + '"]:checked'); }

  /* Placeholders cannot hold the two language spans the rest of the page uses,
     so they are swapped here whenever the role switch moves. */
  function placeholders() {
    var en = document.body.getAttribute("data-role") === "volunteer";
    modal.querySelectorAll("[data-ph-en]").forEach(function (el) {
      if (!el.getAttribute("data-ph-ko")) el.setAttribute("data-ph-ko", el.placeholder);
      el.placeholder = en ? el.getAttribute("data-ph-en") : el.getAttribute("data-ph-ko");
    });
  }
  placeholders();
  new MutationObserver(function () {
    placeholders();
    clearErrors();  /* messages already on screen would be in the old language */
  }).observe(document.body, { attributes: true, attributeFilter: ["data-role"] });

  /* A question stops complaining as soon as it is answered. */
  function unflag(e) {
    var q = e.target.closest ? e.target.closest(".sf-q") : null;
    if (!q || !q.classList.contains("is-missing")) return;
    q.classList.remove("is-missing");
    var p = q.querySelector(".sf-err");
    if (p) p.remove();
  }
  modal.addEventListener("input", unflag, true);
  modal.addEventListener("change", unflag, true);

  var submit = modal.querySelector(".sf-submit");
  if (submit) submit.addEventListener("click", function () {
    clearErrors();
    var EN = document.body.getAttribute("data-role") === "volunteer";
    var bad = [];
    check({ EN: EN, bad: bad, qOf: qOf, field: field, checked: checked, modal: modal });

    if (bad.length) {
      bad.forEach(function (b) { fail(b[0], b[1]); });
      var top = bad[0][0].getBoundingClientRect().top - body.getBoundingClientRect().top;
      body.scrollTop += top - 12;
      return;
    }
    var done = modal.querySelector(".sf-done");
    if (!done) {
      done = document.createElement("p");
      done.className = "sf-done";
      modal.querySelector(".sfm-foot").appendChild(done);
    }
    done.classList.remove("is-error");
    stampRole();
    if (!send) {
      done.textContent = EN
        ? "Everything is filled in. Sending is not connected yet, so nothing has been submitted."
        : "작성은 모두 끝났습니다. 아직 접수 연결 전이라 제출되지는 않았습니다.";
      return;
    }
    /* Apps Script answers from another origin, so the reply is opaque: all the
       page can know is that the request left. It fails loudly only when the
       network does, which is when the person needs to try again. */
    submit.disabled = true;
    done.textContent = EN ? "Sending…" : "전송하는 중…";
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);
    var params = new URLSearchParams(send.build({ field: field, checked: checked, modal: modal }));
    fetch(send.url, { method: "POST", mode: "no-cors", body: params, signal: ctrl.signal })
      .then(function () {
        clearTimeout(timer);
        done.remove();
        modal.classList.add("is-sent");
        dialog.scrollTop = 0;
      })
      .catch(function () {
        clearTimeout(timer);
        submit.disabled = false;
        done.classList.add("is-error");
        done.textContent = EN
          ? "Could not send. Check your connection and try again."
          : "전송하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.";
      });
  });
  }

  setUp("sf-modal", "#act-speech-apply", function (h) {
    var name = h.field("sf-name");
    var nameEn = h.field("sf-name-en");
    var mail = h.field("sf-email");
    var free = h.modal.querySelector(".sf-free");
    if (!name.value.trim()) h.bad.push([h.qOf(name), h.EN ? "Please enter your name." : "이름을 입력해 주세요."]);
    if (!nameEn.value.trim()) h.bad.push([h.qOf(nameEn), h.EN ? "Please enter your name in English." : "영어 이름을 입력해 주세요."]);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.value.trim())) h.bad.push([h.qOf(mail), h.EN ? "Please enter a valid email address." : "메일 주소를 정확히 입력해 주세요."]);
    /* A Korean mobile number, typed with or without hyphens. */
    var phone = h.field("sf-phone");
    if (!/^01[016789]\d{7,8}$/.test(phone.value.replace(/\D/g, ""))) h.bad.push([h.qOf(phone), h.EN ? "Please enter a valid mobile number, e.g. 010-1234-5678." : "휴대폰 번호를 정확히 입력해 주세요. (예: 010-1234-5678)"]);
    if (!h.checked("sf-level")) h.bad.push([h.qOf(h.field("sf-level")), h.EN ? "Please pick your current book." : "현재 교재 레벨을 선택해 주세요."]);
    var topicQ = h.qOf(h.field("sf-topic"));
    if (!h.checked("sf-topic")) h.bad.push([topicQ, h.EN ? "Please pick a topic." : "스피치 주제를 선택해 주세요."]);
    else if (free.offsetParent !== null && !free.value.trim()) h.bad.push([topicQ, h.EN ? "Tell us what your own topic is about." : "자유 주제의 내용을 적어 주세요."]);
    if (!h.checked("sf-dinner")) h.bad.push([h.qOf(h.field("sf-dinner")), h.EN ? "Please tell us about dinner." : "저녁 식사 참석 여부를 선택해 주세요."]);
    else {
      /* The meal question is only asked of the people who are staying. */
      var dq = h.qOf(h.field("sf-diet"));
      var dOther = h.field("sf-diet-other");
      if (dq.offsetParent !== null) {
        if (!h.checked("sf-diet")) h.bad.push([dq, h.EN ? "Please tell us what you eat." : "식사 선호를 선택해 주세요."]);
        else if (dOther.offsetParent !== null && !dOther.value.trim()) h.bad.push([dq, h.EN ? "Tell us what to leave out." : "어떤 음식인지 적어 주세요."]);
      }
    }
    if (h.modal.querySelectorAll('input[name="sf-ack"]:checked').length < 3) h.bad.push([h.qOf(h.field("sf-ack")), h.EN ? "Please tick each of the three items." : "세 항목을 모두 확인하고 체크해 주세요."]);
  }, {
    url: SPEECH_ENDPOINT,
    build: function (h) {
      /* The sheet always gets the Korean wording, whichever side of the site
         the page was showing, so every row reads the same. */
      function ko(el) {
        var s = el && el.querySelector("[data-r-student]");
        return s ? s.textContent.trim() : "";
      }
      function label(input) { return ko(input && input.closest("label")); }
      /* Always sent hyphenated: a bare run of digits would be read as a number by the
         sheet and lose its leading zero. */
      function hyphenate(v) {
        var d = v.replace(/\D/g, "");
        return d.length === 11 ? d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7)
                               : d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
      }
      var free = h.modal.querySelector(".sf-free");
      var dq = h.field("sf-diet").closest(".sf-q");
      var dietOn = !!dq && dq.offsetParent !== null;
      var dOther = h.field("sf-diet-other");
      return {
        form: "speech",
        name: h.field("sf-name").value.trim(),
        nameEn: h.field("sf-name-en").value.trim(),
        email: h.field("sf-email").value.trim(),
        phone: hyphenate(h.field("sf-phone").value),
        level: label(h.checked("sf-level")),
        topic: label(h.checked("sf-topic")),
        topicFree: free && free.offsetParent !== null ? free.value.trim() : "",
        dinner: label(h.checked("sf-dinner")),
        diet: dietOn ? label(h.checked("sf-diet")) : "",
        dietOther: dietOn && dOther.offsetParent !== null ? dOther.value.trim() : "",
        question: h.modal.querySelector("textarea").value.trim()
      };
    }
  });

  setUp("cf-modal", "#act-ceremony-apply", function (h) {
    var name = h.field("cf-name");
    var mail = h.field("cf-email");
    var diet = h.qOf(h.field("cf-diet"));
    var other = h.modal.querySelector(".sf-free");
    if (!name.value.trim()) h.bad.push([h.qOf(name), h.EN ? "Please enter your name." : "이름을 입력해 주세요."]);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.value.trim())) h.bad.push([h.qOf(mail), h.EN ? "Please enter a valid email address." : "메일 주소를 정확히 입력해 주세요."]);
    if (!h.checked("cf-dinner")) h.bad.push([h.qOf(h.field("cf-dinner")), h.EN ? "Please tell us about dinner." : "저녁 식사 참석 여부를 선택해 주세요."]);
    /* The meal question is only asked of the people who are staying. */
    else if (diet.offsetParent !== null) {
      if (!h.checked("cf-diet")) h.bad.push([diet, h.EN ? "Please tell us what you eat." : "식사 선호를 선택해 주세요."]);
      else if (other.offsetParent !== null && !other.value.trim()) h.bad.push([diet, h.EN ? "Tell us what to leave out." : "어떤 음식인지 적어 주세요."]);
    }
  });
})();
