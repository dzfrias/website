const expandImgs = document.getElementsByClassName("expand-img");
for (let div of expandImgs) {
  const btn = div.children[0];
  const dialog = div.children[1];
  btn.addEventListener("click", () => dialog.showModal());
  dialog.addEventListener("click", (e) => {
    const rect = e.target.getBoundingClientRect();
    const clickedInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!clickedInDialog) {
      dialog.close();
    }
  });
}

const tocItems = new Map();
function linkAnchors(element) {
  for (const child of element.children) {
    switch (child.tagName) {
      case "OL":
        linkAnchors(child);
        break;
      case "LI":
        const anchor = child.firstElementChild;
        tocItems.set(anchor.href, anchor);
        for (let i = 1; i < child.children.length; i++) {
          const nextChild = child.children[i];
          linkAnchors(nextChild);
        }
      default:
        break;
    }
  }
}

linkAnchors(document.getElementsByClassName("toc")[0].firstElementChild);

const headerAnchors = Array.from(
  document.getElementsByClassName("header-anchor"),
);
headerAnchors.sort((a, b) => {
  return a.getBoundingClientRect().y - b.getBoundingClientRect().y;
});
let lastKnownScrollPosition = 0;
let ticking = false;
let current = null;
document.addEventListener("scroll", () => {
  lastKnownScrollPosition = window.scrollY;

  if (!ticking) {
    window.requestAnimationFrame(() => {
      if (current) {
        current.ariaCurrent = "false";
      }
      const closest = Array.from(headerAnchors).sort((a, b) => {
        const aY = a.getBoundingClientRect().top;
        const bY = b.getBoundingClientRect().top;
        return Math.abs(aY) - Math.abs(bY);
      })[0];
      tocItems.get(closest.href).ariaCurrent = "location";
      current = tocItems.get(closest.href);
      ticking = false;
    });

    ticking = true;
  }
});

for (const progressBar of document.getElementsByClassName("progress-bar")) {
  const inner = progressBar.firstElementChild;
  document.addEventListener("scroll", () => {
    const scrollPercent =
      window.scrollY / (document.body.offsetHeight - window.innerHeight);
    inner.style.width = `${scrollPercent * 100}%`;
  });
}

const fnrefs = document.querySelectorAll('a[id^="fnref"]');
const footnotes = document.getElementsByClassName("footnote-item");
const rightSection = document.getElementById("main-right");
for (let i = 0; i < fnrefs.length; i++) {
  const anchor = fnrefs[i];
  const footnote = footnotes[i];
  const paragraph = footnote.children[0].cloneNode(true);
  let container;
  anchor.addEventListener("mouseover", () => {
    container = document.createElement("aside");
    rightSection.appendChild(container);
    container.classList.add("footnote-preview");
    container.appendChild(paragraph);
    container.style.position = "absolute";
    container.style.top =
      anchor.getBoundingClientRect().top + window.scrollY + "px";
    container.style.opacity = "100%";
  });
  anchor.addEventListener("mouseleave", () => {
    container.style.opacity = "0%";
    container.addEventListener("transitionend", () => container.remove());
  });
}

function selectFootnotes() {
  const hash = location.hash.slice(1);
  if (!hash.startsWith("fn") || hash.startsWith("fnref")) {
    for (const footenote of footnotes) {
      footenote.ariaCurrent = null;
    }
    return;
  }
  for (const footenote of footnotes) {
    footenote.ariaCurrent = "false";
  }
  const footnote = document.getElementById(hash);
  footnote.ariaCurrent = "true";
}
selectFootnotes();
window.onhashchange = selectFootnotes;
