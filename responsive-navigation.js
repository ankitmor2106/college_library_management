/**
 * responsive-navigation.js — Mobile-responsive sidebar navigation.
 *
 * Responsibilities:
 *   - Toggle the sidebar open/closed on mobile via the hamburger button
 *   - Close the sidebar when the overlay backdrop is clicked
 *   - Close the sidebar when a nav item is clicked (route change)
 *   - Close the sidebar when the ESC key is pressed
 *   - Keep aria-expanded on the hamburger in sync with sidebar state
 *   - Support full keyboard navigation (Enter/Space to activate nav items)
 *   - Trap nothing — this is a navigation sidebar, not a modal
 *
 * Usage:
 *   import { initResponsiveNav } from './responsive-navigation.js';
 *   initResponsiveNav();   // call once after DOMContentLoaded
 *
 * This module is self-contained and has zero external dependencies.
 * It reads and writes only CSS classes and ARIA attributes; it does
 * not touch location.hash or the router — that stays in app.js.
 */

/* ── SELECTORS ────────────────────────────────────────────── */

const SIDEBAR_ID          = 'sidebar';
const OVERLAY_ID          = 'sidebar-overlay';
const HAMBURGER_ID        = 'hamburger-btn';
const NAV_ITEM_SELECTOR   = '.nav-item';
const SIDEBAR_OPEN_CLASS  = 'sidebar--open';
const OVERLAY_SHOW_CLASS  = 'sidebar-overlay--visible';

/* ── STATE ────────────────────────────────────────────────── */

let sidebar    = null;
let overlay    = null;
let hamburger  = null;
let isOpen     = false;

/* ── CORE OPEN / CLOSE ────────────────────────────────────── */

/**
 * Open the sidebar (mobile only — on desktop the sidebar is always visible).
 */
function openSidebar() {
  if (!sidebar) return;
  isOpen = true;
  sidebar.classList.add(SIDEBAR_OPEN_CLASS);
  overlay.classList.add(OVERLAY_SHOW_CLASS);
  overlay.setAttribute('aria-hidden', 'false');
  hamburger.setAttribute('aria-expanded', 'true');
  // Move focus into the first nav item so keyboard users can navigate immediately
  const firstItem = sidebar.querySelector(NAV_ITEM_SELECTOR);
  if (firstItem) firstItem.focus();
}

/**
 * Close the sidebar and return focus to the hamburger button.
 * @param {boolean} [returnFocus=true] — set false when closing due to a nav click
 *   so focus naturally moves to the new page content instead.
 */
function closeSidebar(returnFocus = true) {
  if (!sidebar) return;
  isOpen = false;
  sidebar.classList.remove(SIDEBAR_OPEN_CLASS);
  overlay.classList.remove(OVERLAY_SHOW_CLASS);
  overlay.setAttribute('aria-hidden', 'true');
  hamburger.setAttribute('aria-expanded', 'false');
  if (returnFocus && hamburger) hamburger.focus();
}

/**
 * Toggle sidebar open/closed.
 */
function toggleSidebar() {
  isOpen ? closeSidebar() : openSidebar();
}

/* ── BREAKPOINT GUARD ─────────────────────────────────────── */

/**
 * Returns true when the viewport is narrow enough to show the hamburger.
 * Matches the @media (max-width: 768px) breakpoint in main.css.
 */
function isMobileViewport() {
  return window.matchMedia('(max-width: 768px)').matches;
}

/**
 * If the viewport widens back to desktop while the sidebar is open,
 * clean up the open state so the overlay doesn't linger.
 */
function handleResize() {
  if (!isMobileViewport() && isOpen) {
    closeSidebar(false);
  }
}

/* ── KEYBOARD NAVIGATION ──────────────────────────────────── */

/**
 * Allow keyboard users to activate a nav item with Enter or Space,
 * matching the behaviour expected of role="link" elements.
 */
function handleNavItemKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
}

/**
 * Global keydown handler — closes sidebar on ESC.
 */
function handleGlobalKeydown(e) {
  if (e.key === 'Escape' && isOpen) {
    closeSidebar(true);
  }
}

/* ── ROUTE CHANGE HOOK ────────────────────────────────────── */

/**
 * Call this after every route change (from app.js onRouteChange).
 * Closes the mobile sidebar so the new page isn't obscured.
 */
export function onRouteChange() {
  if (isMobileViewport() && isOpen) {
    closeSidebar(false); // don't return focus — page content is loading
  }
}

/* ── INIT ─────────────────────────────────────────────────── */

/**
 * Wire up all event listeners. Call once after DOMContentLoaded.
 */
export function initResponsiveNav() {
  sidebar   = document.getElementById(SIDEBAR_ID);
  overlay   = document.getElementById(OVERLAY_ID);
  hamburger = document.getElementById(HAMBURGER_ID);

  if (!sidebar || !overlay || !hamburger) {
    console.warn('[responsive-navigation] Required elements not found. Check IDs in index.html.');
    return;
  }

  /* Hamburger button */
  hamburger.addEventListener('click', toggleSidebar);

  /* Overlay backdrop click */
  overlay.addEventListener('click', () => closeSidebar(true));

  /* Nav items: close on click + keyboard activation */
  const navItems = sidebar.querySelectorAll(NAV_ITEM_SELECTOR);
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      if (isMobileViewport()) closeSidebar(false);
    });
    item.addEventListener('keydown', handleNavItemKeydown);
  });

  /* ESC key — global */
  document.addEventListener('keydown', handleGlobalKeydown);

  /* Viewport resize — clean up open state when switching to desktop */
  window.addEventListener('resize', handleResize);

  /* Initial ARIA state */
  hamburger.setAttribute('aria-expanded', 'false');
  overlay.setAttribute('aria-hidden', 'true');
}
