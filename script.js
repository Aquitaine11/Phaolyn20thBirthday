// ---------- Reveal message (keeps your existing button onclick) ----------
window.revealMessage = function revealMessage() {
  const surprise = document.getElementById("surprise");
  if (!surprise) return;
  surprise.classList.toggle("show");
};

// ---------- Floating Decorations (hearts/petals) ----------
(function setupFloating() {
  const container = document.querySelector(".floating-container");
  if (!container) return;

  function createFloating() {
    const el = document.createElement("div");
    el.className = "floating";
    el.textContent = Math.random() > 0.6 ? "🌸" : "💚"; // mix of icons
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = (14 + Math.random() * 26) + "px";
    el.style.opacity = 0.85;
    el.style.animationDuration = (4 + Math.random() * 5) + "s";
    container.appendChild(el);
    // Remove after animation to keep DOM light
    setTimeout(() => el.remove(), 12000);
  }

  setInterval(createFloating, 700);
})();


// ---------- DOM Ready: Music sync, Carousel + Lightbox ----------
document.addEventListener("DOMContentLoaded", function () {
  /* ------------------ MUSIC: cross-page persistence + video pause ------------------ */
  (function setupMusic() {
    const MUSIC_TIME_KEY = "bgMusicTime";
    const MUSIC_PLAY_KEY = "bgMusicPlaying";
    const bg = document.getElementById("bg-music");
    if (!bg) return;

    // Try to restore saved time & play state
    const savedTime = parseFloat(localStorage.getItem(MUSIC_TIME_KEY) || "0");
    const savedPlaying = localStorage.getItem(MUSIC_PLAY_KEY) === "true";

    function applySavedState() {
      try {
        if (!isNaN(savedTime) && savedTime > 0 && bg.duration && savedTime < bg.duration) {
          bg.currentTime = savedTime;
        }
      } catch (e) {
        // setting currentTime before metadata may throw; we handle via loadedmetadata below
      }

      if (savedPlaying) {
        bg.play().catch(() => {
          // autoplay blocked — we'll try again on first user interaction below
        });
      }
    }

    // If metadata already available, apply now, otherwise wait for it
    if (bg.readyState > 0) {
      applySavedState();
    } else {
      bg.addEventListener("loadedmetadata", applySavedState, { once: true });
    }

    // Pause music when the page's main video plays, resume after video pauses/ends if music was playing
    const video = document.querySelector(".video-section video");
    if (video) {
      video.addEventListener("play", () => {
        if (!bg.paused) {
          bg._wasPlayingBeforeVideo = true;
          bg.pause();
        } else {
          bg._wasPlayingBeforeVideo = false;
        }
      });

      ["pause", "ended"].forEach((ev) =>
        video.addEventListener(ev, () => {
          if (bg._wasPlayingBeforeVideo) {
            bg.play().catch(() => {});
            bg._wasPlayingBeforeVideo = false;
          }
        })
      );
    }

    // Throttle saving currentTime to localStorage (every ~1s during playback)
    let saveTimeout = null;
    bg.addEventListener("timeupdate", () => {
      if (saveTimeout) return;
      saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem(MUSIC_TIME_KEY, String(bg.currentTime));
        } catch (e) {}
        saveTimeout = null;
      }, 1000);
    });

    // Save play/pause state immediately on change
    bg.addEventListener("play", () => {
      try {
        localStorage.setItem(MUSIC_PLAY_KEY, "true");
      } catch (e) {}
    });
    bg.addEventListener("pause", () => {
      try {
        localStorage.setItem(MUSIC_PLAY_KEY, "false");
      } catch (e) {}
    });

    // Also persist on pagehide/beforeunload
    const persist = () => {
      try {
        localStorage.setItem(MUSIC_TIME_KEY, String(bg.currentTime));
        localStorage.setItem(MUSIC_PLAY_KEY, String(!bg.paused));
      } catch (e) {}
    };
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);

    // If autoplay was blocked, try again on first user interaction (click/tap)
    const resumeOnInteraction = () => {
      const wantPlaying = localStorage.getItem(MUSIC_PLAY_KEY) === "true";
      if (wantPlaying) bg.play().catch(() => {});
      document.removeEventListener("click", resumeOnInteraction);
      document.removeEventListener("touchstart", resumeOnInteraction);
    };
    document.addEventListener("click", resumeOnInteraction);
    document.addEventListener("touchstart", resumeOnInteraction);
  })();


  /* ------------------ CAROUSEL + LIGHTBOX (unchanged logic) ------------------ */
  (function setupCarousel() {
    const track = document.querySelector(".carousel-track");
    if (!track) return;

    const slides = Array.from(track.children);
    const prevBtn = document.querySelector(".carousel-arrow.prev");
    const nextBtn = document.querySelector(".carousel-arrow.next");

    // Lightbox elements (optional)
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const closeBtn = document.querySelector(".lightbox-close");
    const lbPrev = document.querySelector(".lightbox-arrow.prev");
    const lbNext = document.querySelector(".lightbox-arrow.next");

    let currentIndex = Math.floor(slides.length / 2); // start centered
    let currentTranslateX = 0;

    function setActive(i) {
      slides.forEach((s, idx) => s.classList.toggle("active", idx === i));
    }

    // Centers the active slide by adding just the needed delta to currentTranslateX
    function centerActive(animate = true) {
      setActive(currentIndex);

      const container = track.parentElement; // .carousel-container
      const containerRect = container.getBoundingClientRect();
      const activeRect = slides[currentIndex].getBoundingClientRect();

      const containerCenter = containerRect.left + containerRect.width / 2;
      const activeCenter = activeRect.left + activeRect.width / 2;
      const delta = containerCenter - activeCenter;

      if (!animate) {
        track.style.transition = "none";
      } else {
        track.style.transition = "transform 0.6s ease";
      }

      currentTranslateX += delta;
      track.style.transform = `translateX(${currentTranslateX}px)`;

      // restore transition for future moves if we disabled it
      if (!animate) {
        requestAnimationFrame(() => (track.style.transition = "transform 0.6s ease"));
      }
    }

    function goTo(i) {
      currentIndex = (i + slides.length) % slides.length;
      centerActive(true);
    }

    // Arrows
    prevBtn?.addEventListener("click", () => goTo(currentIndex - 1));
    nextBtn?.addEventListener("click", () => goTo(currentIndex + 1));

    // Clicking a side preview: if it's not the active one, center it;
    // if it is active, open the lightbox (if present)
    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => {
        if (i === currentIndex) {
          if (lightbox && lightboxImg) {
            lightboxImg.src = slide.querySelector("img").src;
            lightbox.style.display = "flex";
          }
        } else {
          goTo(i);
        }
      });
    });

    // Lightbox controls (only if markup exists)
    if (lightbox && lightboxImg) {
      closeBtn?.addEventListener("click", () => (lightbox.style.display = "none"));
      window.addEventListener("click", (e) => {
        if (e.target === lightbox) lightbox.style.display = "none";
      });

      lbNext?.addEventListener("click", () => {
        goTo(currentIndex + 1);
        lightboxImg.src = slides[currentIndex].querySelector("img").src;
      });
      lbPrev?.addEventListener("click", () => {
        goTo(currentIndex - 1);
        lightboxImg.src = slides[currentIndex].querySelector("img").src;
      });
    }

    // First paint & on resize (no animation jump)
    centerActive(false);
    window.addEventListener("resize", () => centerActive(false));
  })();

});

document.addEventListener("DOMContentLoaded", () => {
  const bgMusic = document.getElementById("bg-music");
  const video = document.getElementById("birthday-video");

  if (video && bgMusic) {
    video.addEventListener("play", () => bgMusic.pause());
    video.addEventListener("pause", () => bgMusic.play());
    video.addEventListener("ended", () => bgMusic.play());
  }
});

// 📩 Letter modal functionality
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("letterModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const letterCards = document.querySelectorAll(".letter-card");

  letterCards.forEach(card => {
    card.addEventListener("click", () => {
      modal.style.display = "flex"; // ✅ keep flex for centering
      modalTitle.textContent = card.dataset.title;
      modalBody.textContent = card.dataset.body;
    });
  });
});

function closeLetter() {
  document.getElementById("letterModal").style.display = "none";
}


