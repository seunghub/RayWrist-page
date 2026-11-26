(() => {
  "use strict";
  const config = window.RAYWRIST_SITE || {};
  const gallery = window.RAYWRIST_GALLERY || {};
  const overview = document.getElementById("overview-video");
  const player = document.getElementById("rollout-video");
  const tabs = [...document.querySelectorAll("[data-benchmark]")];
  const panel = document.getElementById("benchmark-panel");
  const grid = document.getElementById("clip-grid");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeBenchmark = "libero";
  let activeClip = 0;

  document.querySelectorAll("[data-code-link]").forEach(link => {
    if (config.codeUrl) link.href = config.codeUrl;
  });
  if (config.paperUrl) {
    document.querySelectorAll("[data-paper-link]").forEach(link => {
      link.href = config.paperUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = "Read the paper on arXiv";
      link.querySelector(".soon")?.remove();
    });
  }

  const formatTime = seconds => {
    const value = Math.max(0, Math.floor(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  };
  const tryPlay = video => {
    const promise = video.play();
    if (promise && typeof promise.catch === "function") promise.catch(() => {});
  };

  function selectClip(index, play) {
    const group = gallery[activeBenchmark];
    const clip = group.clips[index];
    activeClip = index;
    player.pause();
    document.getElementById("rollout-error").hidden = true;
    document.getElementById("clip-title").textContent = clip.title;
    document.getElementById("clip-kind").textContent = clip.kind;
    document.getElementById("player-dataset").textContent = group.label;
    document.getElementById("clip-counter").textContent = `${index + 1} of ${group.clips.length}  /  ${formatTime(clip.duration)}`;
    document.getElementById("open-video").href = clip.src;
    document.getElementById("error-video-link").href = clip.src;
    player.poster = clip.poster;
    player.src = clip.src;
    player.dataset.clipId = clip.id;
    player.style.aspectRatio = `${clip.width} / ${clip.height}`;
    player.load();
    grid.querySelectorAll(".clip-button").forEach((button, i) => {
      button.classList.toggle("active", i === index);
      button.setAttribute("aria-pressed", String(i === index));
    });
    if (play) tryPlay(player);
  }

  function selectBenchmark(key, play = false) {
    if (!gallery[key]) return;
    activeBenchmark = key;
    const group = gallery[key];
    tabs.forEach(tab => {
      const selected = tab.dataset.benchmark === key;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.querySelector("span").textContent = `${gallery[tab.dataset.benchmark].clips.length} videos`;
    });
    panel.setAttribute("aria-labelledby", `tab-${key}`);
    panel.dataset.benchmark = key;
    document.getElementById("benchmark-subtitle").textContent = group.subtitle;
    document.getElementById("benchmark-description").textContent = group.description;
    grid.replaceChildren();
    group.clips.forEach((clip, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "clip-button";
      button.setAttribute("aria-label", `Play ${clip.title}`);
      button.setAttribute("aria-pressed", "false");
      button.dataset.clipId = clip.id;
      const image = document.createElement("img");
      image.src = clip.thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.width = 480;
      image.height = 405;
      const copy = document.createElement("span");
      copy.className = "thumb-copy";
      const title = document.createElement("span");
      title.className = "thumb-title";
      title.textContent = clip.title;
      const time = document.createElement("span");
      time.className = "thumb-time";
      time.textContent = formatTime(clip.duration);
      copy.append(title, time);
      button.append(image, copy);
      button.addEventListener("click", () => selectClip(index, true));
      grid.append(button);
    });
    selectClip(0, play);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectBenchmark(tab.dataset.benchmark, true));
    tab.addEventListener("keydown", event => {
      let target = null;
      if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") target = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = tabs.length - 1;
      if (target !== null) {
        event.preventDefault();
        tabs[target].focus();
        selectBenchmark(tabs[target].dataset.benchmark, false);
      }
    });
  });
  selectBenchmark("libero");
  window.RayWristGallery = { selectBenchmark, selectClip };

  const allVideos = [...document.querySelectorAll("video")];
  allVideos.forEach(video => {
    video.addEventListener("play", () => {
      allVideos.forEach(other => { if (other !== video) other.pause(); });
    });
    video.addEventListener("error", () => {
      if (video === overview || video === player) document.getElementById(video === overview ? "overview-error" : "rollout-error").hidden = false;
    });
  });
  overview.querySelectorAll("source").forEach(source => {
    source.addEventListener("error", () => { document.getElementById("overview-error").hidden = false; });
  });

  const soundButton = document.getElementById("sound-toggle");
  soundButton.addEventListener("click", () => {
    if (overview.muted) { overview.muted = false; tryPlay(overview); }
    else overview.muted = true;
  });
  overview.addEventListener("volumechange", () => {
    soundButton.textContent = overview.muted ? "Play with sound" : "Mute overview";
    soundButton.setAttribute("aria-pressed", String(!overview.muted));
  });
  if (reducedMotion) {
    overview.autoplay = false;
    overview.pause();
  } else {
    tryPlay(overview);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) allVideos.forEach(video => video.pause());
  });

  document.querySelectorAll("[data-show-benchmark]").forEach(button => {
    button.addEventListener("click", () => {
      selectBenchmark(button.dataset.showBenchmark, true);
      document.getElementById("rollouts").scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth" });
    });
  });

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  const closeMenu = () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
  };
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });

  const navLinks = [...nav.querySelectorAll("a")];
  navLinks[0].classList.add("active");
  window.addEventListener("scroll", () => {
    if (window.scrollY < 250) navLinks.forEach(link => link.classList.toggle("active", link.hash === "#overview"));
  }, { passive: true });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) navLinks.forEach(link => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: "-10% 0px -60% 0px", threshold: 0 });
    ["overview", "rollouts", "method", "attention", "efficiency", "results", "citation"].forEach(id => observer.observe(document.getElementById(id)));
  }

  document.getElementById("copy-citation").addEventListener("click", async event => {
    const text = document.getElementById("bibtex").textContent;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const field = document.createElement("textarea");
        field.value = text;
        field.style.position = "fixed";
        field.style.left = "-9999px";
        document.body.append(field);
        field.select();
        const copied = document.execCommand("copy");
        field.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      event.target.textContent = "Copied";
      document.getElementById("copy-status").textContent = "Citation copied to clipboard.";
      setTimeout(() => { event.target.textContent = "Copy citation"; }, 2200);
    } catch {
      document.getElementById("copy-status").textContent = "Select and copy the citation text below.";
    }
  });
})();
