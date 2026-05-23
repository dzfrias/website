const mainSVG = `
<svg aria-hidden="true" focusable="false" width="100%" height="100%" viewBox="3 7 18 10" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M19.5 16.5L19.5 4.5L18.75 3.75H9L8.25 4.5L8.25 7.5L5.25 7.5L4.5 8.25V20.25L5.25 21H15L15.75 20.25V17.25H18.75L19.5 16.5ZM15.75 15.75L15.75 8.25L15 7.5L9.75 7.5V5.25L18 5.25V15.75H15.75ZM6 9L14.25 9L14.25 19.5L6 19.5L6 9Z"/>
</svg>
`
const altSVG = `
<svg aria-hidden="true" focusable="false" width="80%" height="80%" viewBox="0 0 1920 1920" xmlns="http://www.w3.org/2000/svg">
<path d="M1827.701 303.065 698.835 1431.801 92.299 825.266 0 917.564 698.835 1616.4 1919.869 395.234z" fill-rule="evenodd"/>
</svg>
`
const css = `
button {
  width: 33px;
  height: 33px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 5px;
  margin: 0;
  border-width: 0;
  background-color: var(--copy-button-background, transparent);
}

button:not(:disabled):hover {
  cursor: pointer;
}

button > svg {
  fill: var(--copy-button-color, white);
}
`

class CopyButton extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });
    const button = document.createElement("button");
    button.ariaLabel = "Copy";
    button.innerHTML = mainSVG;
    shadow.appendChild(button);

    const textTargetId = this.getAttribute("data-target");
    const textTarget = document.getElementById(textTargetId);
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(textTarget.textContent)
        .then(() => {
          button.innerHTML = altSVG;
          button.disabled = true;
          setTimeout(() => {
            button.innerHTML = mainSVG;
            button.disabled = false;
          }, 500);
        })
        .catch(err => alert("Failed to copy:", err));
    });

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
  }
}

customElements.define("copy-button", CopyButton);
