document.querySelectorAll(".expand-img").forEach((div) => {
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
});
