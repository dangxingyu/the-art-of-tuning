const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");
const copyButton = document.querySelector("[data-copy-ledger]");
const ledgerTemplate = document.querySelector("[data-ledger-template]");

function closeMenu() {
  if (!header || !menuButton) return;
  header.classList.remove("is-open");
  document.body.classList.remove("nav-open");
  menuButton.setAttribute("aria-expanded", "false");
}

if (header && menuButton) {
  menuButton.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    document.body.classList.toggle("nav-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

if (nav) {
  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      closeMenu();
    }
  });
}

if (copyButton && ledgerTemplate) {
  const initialLabel = copyButton.querySelector("span")?.textContent || "Copy";

  copyButton.addEventListener("click", async () => {
    const text = ledgerTemplate.textContent || "";

    try {
      await navigator.clipboard.writeText(text);
      const label = copyButton.querySelector("span");
      if (label) label.textContent = "Copied";
      window.setTimeout(() => {
        if (label) label.textContent = initialLabel;
      }, 1600);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(ledgerTemplate);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  });
}
