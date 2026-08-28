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
    "act-column": "#",
    "act-gameday": "#",
    "act-specialweek": "#",
    "act-walkrun": "#",
    "act-speech": "#"
  };

  document.querySelectorAll("[data-apply]").forEach(function (a) {
    var url = GOOGLE_FORM_LINKS[a.getAttribute("data-apply")];
    if (url && url !== "#") {
      a.href = url;
    } else {
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
  });

  // activity.html shows exactly one of its 6 detail blocks, based on the
  // "#act-*" hash the "자세히 보기" link on the semester-guide timeline sends it.
  var detailBlocks = document.querySelectorAll(".activity-detail-block");
  if (detailBlocks.length) {
    var showActivityDetail = function () {
      var id = window.location.hash.replace("#", "") || detailBlocks[0].getAttribute("data-activity");
      detailBlocks.forEach(function (b) {
        b.classList.toggle("is-shown", b.getAttribute("data-activity") === id);
      });
    };
    window.addEventListener("hashchange", showActivityDetail);
    showActivityDetail();
  }
})();
