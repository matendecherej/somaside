// ============================================================
//  home.js — Story feed, genre filters, likes & bookmarks
//  Now connected to the real backend API
// ============================================================

function initHome() {
  const params = new URLSearchParams(window.location.search);
  const genreParam = params.get('genre') || 'All';
  renderFeed(genreParam);
  initFilters(genreParam);
}

// ── Render ───────────────────────────────────────────────────
async function renderFeed(activeGenre) {
  const grid = document.getElementById("storyGrid");
  if (!grid) return;

  grid.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; grid-column:1/-1; padding:3rem;">Loading stories…</p>`;

  try {
    const genre   = activeGenre === "All" ? "" : activeGenre;
    const stories = await fetchStories(genre);

    if (!stories.length) {
      grid.innerHTML = `<p style="color:rgba(255,255,255,0.4); text-align:center; grid-column:1/-1; padding:3rem;">No stories yet — be the first to write one!</p>`;
      return;
    }

    const user = getUser();

    grid.innerHTML = stories.map(story => storyCard(story)).join("");



    grid.querySelectorAll(".story-card").forEach(card => {
      card.addEventListener("click", () => {
        window.location.href = `story.html?id=${card.dataset.id}`;
      });
    });

    observeCards();

  } catch (err) {
    grid.innerHTML = `<p style="color:#ff8f8f; text-align:center; grid-column:1/-1; padding:3rem;">Could not load stories. Is the server running?</p>`;
    console.error(err);
  }
}

// ── Card HTML ─────────────────────────────────────────────────
function storyCard(story) {
  const genreClass = story.genre.toLowerCase();
  const rating = story.contentRating || "PG"; // fallback if missing
  const ratingClass = rating.toLowerCase().replace(/[^a-z0-9]/g, "");

  const coverStyle = story.coverImage
    ? `background-image: url('${story.coverImage}');`
    : `background: linear-gradient(135deg, #3d1260, #7b2fbe);`;

  return `
    <article class="story-card" data-id="${story._id}" tabindex="0" role="button" aria-label="Read ${story.title}">
      <div class="card-cover-only" style="${coverStyle}"></div>
      <span class="genre-badge-overlay ${genreClass}">${story.genre}</span>
      <span class="rating-badge-overlay rating-${ratingClass}">${rating}</span>
    </article>
  `;
}
// ── Filters ───────────────────────────────────────────────────
function initFilters(activeGenre = 'All') {
  const container = document.getElementById("genreFilters");
  if (!container) return;

  const genres = ["All", "Story", "Poem", "Song", "Folklore", "Romance", "Fantasy", "Thriller", "Mystery", "SciFi", "Drama", "Satire", "Children"];

  container.innerHTML = genres.map(g => `
    <button class="filter-btn ${g === activeGenre ? 'active' : ''}" data-genre="${g}">${g}</button>
  `).join("");

  container.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderFeed(btn.dataset.genre);
      // Keep the URL in sync so the filter is shareable/bookmarkable
      const url = new URL(window.location);
      btn.dataset.genre === 'All' ? url.searchParams.delete('genre') : url.searchParams.set('genre', btn.dataset.genre);
      history.replaceState({}, '', url);
    });
  });
}

// ── Like handler ──────────────────────────────────────────────
async function handleLike(storyId, btn) {
  if (!getToken()) {
    alert("Please log in to like stories.");
    return;
  }
  try {
    const { likes, liked } = await likeStory(storyId);
    btn.querySelector(".like-icon").textContent = liked ? "❤️" : "🤍";
    btn.querySelector(".like-count").textContent = likes;
    btn.classList.toggle("liked", liked);
  } catch (err) {
    console.error("Like failed:", err.message);
  }
}

// ── Bookmark handler ──────────────────────────────────────────
async function handleBookmark(storyId, btn) {
  if (!getToken()) {
    alert("Please log in to bookmark stories.");
    return;
  }
  try {
    const { bookmarked } = await bookmarkStory(storyId);
    btn.textContent = bookmarked ? "🔖" : "📄";
    btn.classList.toggle("active", bookmarked);
  } catch (err) {
    console.error("Bookmark failed:", err.message);
  }
}

// ── Scroll reveal ─────────────────────────────────────────────
function observeCards() {
  const cards = document.querySelectorAll(".story-card");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add("visible"), i * 80);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  cards.forEach(c => io.observe(c));
}
