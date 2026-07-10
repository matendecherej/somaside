// ============================================================
//  main.js — Shared navbar logic only
//  Page init (initHome, initStory etc.) is now called directly
//  in each HTML file's own <script> block.
// ============================================================

function initNavbar() {
  const toggle   = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  if (toggle && navLinks) {
    toggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // Close menu when a link is clicked (mobile)
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks?.classList.remove("active");
    });
  });

  // Mark active link based on current filename
  const currentFile = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentFile) link.classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", initNavbar);