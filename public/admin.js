/**
 * admin.js — School Management System Admin Panel
 * Handles: Dark Mode, Sidebar, Number Counters, Chart.js, Micro-interactions
 * Skills: antigravity-design-expert, web-performance-optimization, wcag-audit-patterns
 */

(function () {
  'use strict';

  /* ── 1. DARK MODE ─────────────────────────────────────────── */
  const THEME_KEY = 'adm-theme';

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('admDarkToggle');
    if (btn) {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    if (stored) {
      applyTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  /* ── 2. SIDEBAR (Collapsible Groups & Mobile) ─────────────── */
  function initSidebar() {
    const sidebar  = document.getElementById('admSidebar');
    const toggleBtn = document.getElementById('admHamburger');
    const closeBtn = document.getElementById('admSidebarClose');
    const overlay = document.getElementById('admSidebarBackdrop');

    const SIDEBAR_STATE_KEY = 'adm-sidebar-collapsed';

    if (!sidebar) return;

    // ── Desktop Collapsible State ──
    if (localStorage.getItem(SIDEBAR_STATE_KEY) === 'true') {
      sidebar.classList.add('collapsed');
    }

    // ── Group Accordion Logic (CSS Grid Transition) ──
    const groups = sidebar.querySelectorAll('.adm-nav-group');
    groups.forEach(group => {
      const header = group.querySelector('.adm-nav-group-header');
      if (!header) return;

      header.addEventListener('click', () => {
        // Expand sidebar if collapsed on desktop
        if (sidebar.classList.contains('collapsed') && window.innerWidth > 768) {
          sidebar.classList.remove('collapsed');
          localStorage.setItem(SIDEBAR_STATE_KEY, 'false');
        }

        const isOpen = group.classList.contains('is-open');

        // Optional: Accordion behavior (close others)
        // groups.forEach(g => { g.classList.remove('is-open'); g.querySelector('.adm-nav-group-header').setAttribute('aria-expanded', 'false'); });

        if (isOpen) {
          group.classList.remove('is-open');
          header.setAttribute('aria-expanded', 'false');
        } else {
          group.classList.add('is-open');
          header.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // ── Mobile Drawer & Desktop Toggle ──
    function openMobileSidebar() {
      sidebar.style.transform = 'translateX(0)';
      if (overlay) overlay.style.display = 'block';
      document.body.style.overflow = 'hidden'; // Lock body scroll
      sidebar.setAttribute('aria-hidden', 'false');
      if (closeBtn) closeBtn.style.display = 'flex';
    }

    function closeMobileSidebar() {
      sidebar.style.transform = '';
      if (overlay) overlay.style.display = 'none';
      document.body.style.overflow = '';
      sidebar.setAttribute('aria-hidden', 'true');
      if (closeBtn) closeBtn.style.display = 'none';
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          openMobileSidebar();
        } else {
          const isCollapsed = sidebar.classList.toggle('collapsed');
          localStorage.setItem(SIDEBAR_STATE_KEY, isCollapsed);
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);
    if (overlay) overlay.addEventListener('click', closeMobileSidebar);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && window.innerWidth <= 768 && sidebar.getAttribute('aria-hidden') === 'false') {
        closeMobileSidebar();
      }
    });

    // Close mobile sidebar on link click
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) closeMobileSidebar();
      });
    });

    // Handle resize resets
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        sidebar.style.transform = '';
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        if (closeBtn) closeBtn.style.display = 'none';
        sidebar.setAttribute('aria-hidden', 'false');
      } else {
        if (sidebar.style.transform !== 'translateX(0)') {
          sidebar.setAttribute('aria-hidden', 'true');
        }
      }
    });
  }

  /* ── 3. KPI CARD ENTRANCE ANIMATIONS ─────────────────────── */
  function initKpiAnimations() {
    const cards = document.querySelectorAll('.adm-kpi-card');
    if (!cards.length) return;

    // Use IntersectionObserver for performance (web-performance-optimization)
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const card = entry.target;
            const delay = parseFloat(card.dataset.delay || 0);
            setTimeout(function () {
              card.classList.add('adm-card-visible');
            }, delay);
            observer.unobserve(card);
          }
        });
      }, { threshold: 0.1 });

      cards.forEach(function (card, i) {
        card.dataset.delay = i * 60;
        observer.observe(card);
      });
    } else {
      // Fallback — just show cards immediately
      cards.forEach(function (card) { card.classList.add('adm-card-visible'); });
    }
  }

  /* ── 4. ANIMATED NUMBER COUNTER ──────────────────────────── */
  function animateCounter(el) {
    const raw = el.dataset.target || el.textContent;
    // Handle numeric strings like "Rs. 12500" or "1234"
    const numMatch = raw.replace(/,/g, '').match(/\d+(\.\d+)?/);
    if (!numMatch) return;

    const target = parseFloat(numMatch[0]);
    const prefix = raw.substring(0, raw.indexOf(numMatch[0]));
    const suffix = raw.substring(raw.indexOf(numMatch[0]) + numMatch[0].length);
    const duration = 1200;
    const start = performance.now();

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * target);
      el.textContent = prefix + current.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    el.textContent = prefix + '0' + suffix;
    requestAnimationFrame(step);
  }

  function initCounters() {
    const counters = document.querySelectorAll('.adm-kpi-value[data-target]');
    if (!counters.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });

      counters.forEach(function (el) { observer.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ── 5. CHART.JS — DASHBOARD CHARTS ─────────────────────── */
  function initCharts() {
    if (typeof Chart === 'undefined') return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';
    const labelColor = isDark ? '#64748B' : '#94A3B8';

    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.display = false;

    // ── Area Chart: Fee Collection Trend
    const feeCanvas = document.getElementById('admFeeChart');
    if (feeCanvas) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const feeData = [28000, 35000, 31000, 42000, 38000, 45000];

      new Chart(feeCanvas, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            data: feeData,
            borderColor: '#4F6EF7',
            borderWidth: 2,
            pointBackgroundColor: '#4F6EF7',
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            backgroundColor: function (ctx) {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 180);
              gradient.addColorStop(0, 'rgba(79,110,247,0.18)');
              gradient.addColorStop(1, 'rgba(79,110,247,0)');
              return gradient;
            },
            tension: 0.45
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            tooltip: {
              backgroundColor: isDark ? '#1A2235' : '#0F172A',
              titleColor: '#FFFFFF',
              bodyColor: '#94A3B8',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10,
              callbacks: {
                label: function(ctx) { return ' Rs. ' + ctx.parsed.y.toLocaleString(); }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: labelColor }
            },
            y: {
              grid: { color: gridColor, drawBorder: false },
              border: { display: false },
              ticks: {
                color: labelColor,
                callback: function (v) { return 'Rs.' + (v / 1000) + 'k'; }
              }
            }
          }
        }
      });
    }

    // ── Doughnut Chart: Student Distribution
    const distCanvas = document.getElementById('admDistChart');
    if (distCanvas) {
      new Chart(distCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
          datasets: [{
            data: [32, 28, 24, 16],
            backgroundColor: ['#4F6EF7', '#10B981', '#F59E0B', '#8B5CF6'],
            borderColor: isDark ? '#111827' : '#FFFFFF',
            borderWidth: 3,
            hoverBorderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                color: labelColor,
                padding: 14,
                usePointStyle: true,
                pointStyleWidth: 8,
                font: { size: 11, weight: '500' }
              }
            },
            tooltip: {
              backgroundColor: isDark ? '#1A2235' : '#0F172A',
              titleColor: '#FFFFFF',
              bodyColor: '#94A3B8',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              cornerRadius: 10,
              padding: 10,
              callbacks: {
                label: function (ctx) { return ' ' + ctx.label + ': ' + ctx.parsed + '%'; }
              }
            }
          }
        }
      });
    }
  }

  /* ── 6. BANNER DISMISS ────────────────────────────────────── */
  function initBannerDismiss() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('.adm-banner-close')) {
        const banner = e.target.closest('.adm-banner');
        if (banner) {
          banner.style.transition = 'opacity 0.25s, transform 0.25s';
          banner.style.opacity = '0';
          banner.style.transform = 'translateY(-8px)';
          setTimeout(function () { banner.remove(); }, 260);
        }
      }
    });
  }

  /* ── 8. MODAL WINDOWS (Added for general portals) ─────────── */
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    var closeBtn = modal.querySelector('.adm-modal-close-btn') || modal.querySelector('button');
    if (closeBtn) closeBtn.focus();
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Click outside to close modals
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('adm-modal-overlay')) {
      window.closeModal(e.target.id);
    }
  });

  // ESC key to close active modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.adm-modal-overlay.active');
      if (activeModal) window.closeModal(activeModal.id);
    }
  });

  /* ── 7. INIT ──────────────────────────────────────────────── */
  // Apply theme ASAP (before DOMContentLoaded) to prevent FOUC
  initTheme();

  document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initKpiAnimations();
    initCounters();
    initBannerDismiss();

    // Dark mode toggle button
    const darkBtn = document.getElementById('admDarkToggle');
    if (darkBtn) darkBtn.addEventListener('click', toggleTheme);

    // Re-apply theme icon after DOM loads
    const stored = getStoredTheme();
    if (stored) applyTheme(stored);

    // Chart.js loads async — wait for it
    if (typeof Chart !== 'undefined') {
      initCharts();
    } else {
      const chartScript = document.getElementById('chartJsScript');
      if (chartScript) {
        chartScript.addEventListener('load', initCharts);
      }
    }
  });

})();
