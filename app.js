const prompt = document.getElementById("prompt");
const send = document.getElementById("send");
const tasks = document.getElementById("tasks");
const mobileMenu = document.getElementById("mobileMenu");
const explorer = document.getElementById("explorer");

function addTask(text) {
  const item = document.createElement("div");
  item.className = "task";
  const icon = document.createElement("span");
  icon.className = "task-icon";
  icon.textContent = "◉";
  const label = document.createElement("span");
  label.textContent = text;
  const status = document.createElement("strong");
  status.textContent = "Working...";
  item.append(icon, label, status);
  tasks.prepend(item);

  window.setTimeout(() => {
    status.textContent = "Done ✓";
    status.style.color = "#08e6d1";
  }, 900);
}

function runPrompt() {
  const value = prompt.value.trim();
  if (!value) {
    prompt.focus();
    return;
  }
  addTask("KIO Copilot: " + value);
  prompt.value = "";
  prompt.focus();
}

send.addEventListener("click", runPrompt);
prompt.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    runPrompt();
  }
});

mobileMenu.addEventListener("click", () => {
  const isOpen = explorer.classList.toggle("mobile-open");
  mobileMenu.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.setAttribute("aria-label", isOpen ? "Đóng trình khám phá" : "Mở trình khám phá");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && explorer.classList.contains("mobile-open")) {
    explorer.classList.remove("mobile-open");
    mobileMenu.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll("[data-tree-toggle]").forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.treeToggle;
    const children = document.querySelector(`[data-tree-children="${key}"]`);
    if (!children) return;
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    const chevron = button.querySelector(".chevron");
    if (chevron) chevron.textContent = expanded ? "›" : "⌄";
    children.hidden = expanded;
  });
});

document.querySelectorAll(".tree-row.file").forEach(row => {
  row.tabIndex = 0;
  row.addEventListener("click", () => {
    document.querySelectorAll(".tree-row.file").forEach(file => file.classList.remove("selected"));
    row.classList.add("selected");
  });
  row.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      row.click();
    }
  });
});

document.querySelectorAll(".rail-btn").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".rail-btn").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
  });
});

document.querySelectorAll(".quick-links button").forEach(button => {
  button.addEventListener("click", () => {
    const original = button.innerHTML;
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
    window.setTimeout(() => {
      button.classList.remove("selected");
      button.setAttribute("aria-pressed", "false");
    }, 700);
  });
});

console.log("KIO.AI Copilot UI ready");
