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
    const scrollPercent = window.scrollY / (document.body.offsetHeight - window.innerHeight);
    inner.style.width = `${scrollPercent * 100}%`
  });
}
