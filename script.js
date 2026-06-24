const chapters = [
  {
    file: "01-coordinate-descent.md",
    label: "1. Coordinate Descent",
    title: "Coordinate Descent: The First Move",
  },
  {
    file: "02-reading-the-run.md",
    label: "2. Reading the Run",
    title: "Reading the Run: Perception Before Movement",
  },
  {
    file: "03-tuning-under-a-budget.md",
    label: "3. Tuning Under a Budget",
    title: "Tuning Under a Budget: Rationing the Move",
  },
  {
    file: "04-borrowing-a-start-point.md",
    label: "4. Borrowing a Start Point",
    title: "Borrowing a Start Point: Scaling as a Prior, Not an Answer",
  },
  {
    file: "05-literature-grounding.md",
    label: "5. Literature Grounding",
    title: "Literature Grounding: Reading the Field Before the Run",
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listType = null;
  let inCode = false;
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      html.push(`<h${level} id="${slugify(text)}">${renderInline(text)}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^\s*-\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
}

function currentChapter() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("doc") || chapters[0].file;
  return chapters.find((chapter) => chapter.file === requested) || chapters[0];
}

function setActiveChapter(file) {
  document.querySelectorAll("[data-doc-link]").forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("data-doc-link") === file);
  });
}

function renderPager(chapter) {
  const pager = document.querySelector("[data-chapter-pager]");
  if (!pager) return;

  const index = chapters.findIndex((item) => item.file === chapter.file);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const links = [];

  if (previous) {
    links.push(
      `<a href="chapter.html?doc=${previous.file}"><span>Previous</span><strong>${previous.title}</strong></a>`,
    );
  }

  if (next) {
    links.push(
      `<a href="chapter.html?doc=${next.file}"><span>Next</span><strong>${next.title}</strong></a>`,
    );
  }

  pager.innerHTML = links.join("");
}

async function loadChapter() {
  const container = document.querySelector("#chapter-content");
  if (!container) return;

  const chapter = currentChapter();
  const label = document.querySelector("[data-chapter-label]");
  document.title = `${chapter.title} | The Art of Tuning`;
  if (label) label.textContent = chapter.label;
  setActiveChapter(chapter.file);
  renderPager(chapter);

  try {
    const response = await fetch(chapter.file);
    if (!response.ok) throw new Error(`Could not load ${chapter.file}`);
    const markdown = await response.text();
    container.innerHTML = renderMarkdown(markdown);
  } catch {
    container.innerHTML = `
      <h1>${renderInline(chapter.title)}</h1>
      <p>The chapter could not be loaded. Open the source file directly:
      <a href="${chapter.file}">${chapter.file}</a>.</p>
    `;
  }
}

loadChapter();
