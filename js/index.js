document.querySelectorAll("img").forEach((img) => {
  img.addEventListener("click", (evt) => {
    const imgClone = evt.target.cloneNode(true);
    const dialog = document.createElement("dialog");
    dialog.appendChild(imgClone);
    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.addEventListener("click", (e) => {
      const rect = e.target.getBoundingClientRect();
      const clickedInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!clickedInDialog) {
        document.body.removeChild(e.target);
      }
    });
  });
});
