// Intersection Observer for Scroll Reveals
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    // Select all sections or cards to reveal on scroll
    const revealElements = document.querySelectorAll('section, .card, .stat-card');
    revealElements.forEach(el => {
        // Initial state before reveal
        if (!el.classList.contains('animate-fade-in')) {
            el.style.opacity = "0";
            el.style.transform = "translateY(20px)";
            el.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
            observer.observe(el);
        }
    });

    // Mobile Navigation Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar && sidebarOverlay) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        });
    }

    // ═══════════════════════════════════════════════
    // SEAMLESS SPA AJAX PAGE ROUTER (BLINK-FREE)
    // ═══════════════════════════════════════════════
    const adminLayout = document.querySelector('.admin-layout');
    if (!adminLayout) return; // Only execute inside the portal

    // Save initial state for history navigation
    window.history.replaceState(
        { path: window.location.pathname + window.location.search }, 
        document.title, 
        window.location.href
    );

    // Intercept navigation links
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip external links, hash anchors, logout, file exports, or print statements
        if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
        if (href.startsWith('#') || href.startsWith('javascript:')) return;
        if (href.includes('/logout') || href.includes('/receipt') || href.includes('/export') || href.includes('/download')) return;

        // Confirm it's a local route
        const isLocal = href.startsWith('/') || href.startsWith(window.location.origin);
        if (!isLocal) return;

        e.preventDefault();
        loadPortalPage(href, true);
    });

    // Handle browser back/forward popstate
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.path) {
            loadPortalPage(e.state.path, false);
        } else {
            loadPortalPage(window.location.pathname + window.location.search, false);
        }
    });

    async function loadPortalPage(url, pushToHistory = true) {
        try {
            // Close mobile navigation drawer if open
            if (sidebar && sidebarOverlay) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }

            // 1. Smoothly fade out page layout
            adminLayout.style.opacity = '0';

            // Wait for transition to complete
            await new Promise(resolve => setTimeout(resolve, 200));

            // 2. Fetch the target page dynamically
            const response = await fetch(url);
            if (!response.ok) throw new Error('Dynamic fetch failed');
            const html = await response.text();

            // 3. Parse HTML and extract the layout
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newLayout = doc.querySelector('.admin-layout');

            if (!newLayout) {
                // Fallback: If page doesn't have an admin layout, perform full redirect
                window.location.href = url;
                return;
            }

            // 4. Update the page title
            document.title = doc.title;

            // 5. Update layout contents
            adminLayout.innerHTML = newLayout.innerHTML;

            // 6. Update document level variables / styling triggers
            const bodyClass = doc.body.className;
            if (bodyClass) document.body.className = bodyClass;

            // 7. Parse and execute newly fetched scripts
            const scripts = adminLayout.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                    newScript.async = false;
                } else {
                    newScript.textContent = script.textContent;
                }
                script.parentNode.replaceChild(newScript, script);
            });

            // 8. Re-trigger observer for cards and stats animation reveal
            const revealElements = adminLayout.querySelectorAll('section, .card, .stat-card');
            revealElements.forEach(el => {
                if (!el.classList.contains('animate-fade-in')) {
                    el.style.opacity = "0";
                    el.style.transform = "translateY(15px)";
                    el.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
                    observer.observe(el);
                }
            });

            // 9. Update navigation history
            if (pushToHistory) {
                window.history.pushState({ path: url }, doc.title, url);
            }

            // 10. Smoothly fade layout back in
            adminLayout.style.opacity = '1';

            // Scroll window to top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.warn('Navigation transition aborted, falling back:', error);
            window.location.href = url;
        }
    }
});
