/* ============================================================
   Interactive Resume — vanilla JavaScript (no framework)
   Features:
   - Edit any text (contenteditable)
   - Auto-save to localStorage
   - Material Wave (ripple) on any [data-ripple] element
   - Add / remove experience, bullets, education, skills, languages
   - Reset to default data
   - "Download PDF" via window.print() + print CSS
   ============================================================ */

(function () {
  "use strict";

  // -------------------- Default data --------------------
  const STORAGE_KEY = "interactive-resume:v1";

  const defaultData = {
    name: "Alex Morgan",
    title: "Senior Frontend Engineer",
    location: "San Francisco, CA",
    email: "alex.morgan@example.com",
    phone: "+1 (415) 555-0142",
    website: "alexmorgan.dev",
    summary:
      "Frontend engineer with 8+ years crafting performant, accessible interfaces for fintech, design tools, and developer platforms. Comfortable owning a feature end to end, from contract design through deployment, and partnering closely with design and product.",
    experience: [
      {
        id: "exp-1",
        role: "Senior Frontend Engineer",
        company: "Northwind Studio",
        period: "2022 — Present",
        bullets: [
          "Led the rebuild of the design canvas, cutting input latency by 38% and lifting NPS by 11 points.",
          "Owned the component system across 6 product surfaces, with documented tokens and accessibility audits.",
          "Mentored 4 engineers; ran a weekly frontend guild on patterns, tooling, and code review.",
        ],
      },
      {
        id: "exp-2",
        role: "Frontend Engineer",
        company: "Lattice Pay",
        period: "2019 — 2022",
        bullets: [
          "Shipped the merchant dashboard from zero to 12k MAU, including charts, exports, and role-based access.",
          "Migrated a legacy Backbone app to React + TypeScript with no regressions and a 22% bundle reduction.",
        ],
      },
      {
        id: "exp-3",
        role: "Software Engineer",
        company: "Foundry Labs",
        period: "2017 — 2019",
        bullets: [
          "Built internal tooling that reduced support resolution time by 40%.",
          "Introduced Storybook-driven development and visual regression testing.",
        ],
      },
    ],
    education: [
      {
        id: "edu-1",
        degree: "B.Sc. Computer Science",
        school: "University of California, Berkeley",
        period: "2013 — 2017",
      },
    ],
    skills: [
      "TypeScript",
      "React",
      "Next.js",
      "Vite",
      "Node.js",
      "GraphQL",
      "Tailwind CSS",
      "Playwright",
      "Figma",
      "Design Systems",
    ],
    languages: [
      { id: "lng-1", name: "English", level: "Native" },
      { id: "lng-2", name: "Spanish", level: "Conversational" },
    ],
  };

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaultData);
      const parsed = JSON.parse(raw);
      return Object.assign(clone(defaultData), parsed);
    } catch (e) {
      return clone(defaultData);
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore quota errors */
    }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -------------------- State --------------------
  let state = loadData();

  // -------------------- Initials --------------------
  function computeInitials(name) {
    const parts = (name || "").trim().split(/\s+/);
    const letters = parts.slice(0, 2).map(function (p) {
      return p[0] ? p[0].toUpperCase() : "";
    });
    return letters.join("") || "CV";
  }

  function refreshInitials() {
    document.getElementById("initials").textContent = computeInitials(state.name);
  }

  // -------------------- Material Wave ripple --------------------
  function attachRipple(el, event) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const span = document.createElement("span");
    span.className = "ripple-effect";
    span.style.width = size + "px";
    span.style.height = size + "px";
    span.style.left = x + "px";
    span.style.top = y + "px";
    // Avoid messing with caret in contentEditable hosts
    span.setAttribute("contenteditable", "false");
    span.setAttribute("aria-hidden", "true");

    el.appendChild(span);
    span.addEventListener("animationend", function () {
      span.remove();
    });
  }

  document.addEventListener("pointerdown", function (e) {
    let target = e.target;
    while (target && target !== document.body) {
      if (target.dataset && target.dataset.ripple !== undefined) {
        attachRipple(target, e);
        return;
      }
      target = target.parentElement;
    }
  });

  // -------------------- Editable wiring --------------------
  // Bind any [data-bind="key"] element to a top-level state field
  function bindTopLevelEditables() {
    const nodes = document.querySelectorAll("[data-bind]");
    nodes.forEach(function (node) {
      const key = node.getAttribute("data-bind");
      node.textContent = state[key] != null ? state[key] : "";
      node.addEventListener("input", function () {
        state[key] = node.innerText;
        if (key === "name") refreshInitials();
        saveData();
      });
      attachKeyHandler(node);
    });
  }

  function attachKeyHandler(el) {
    if (el.dataset.multiline === "true") return;
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  }

  // -------------------- Render: Experience --------------------
  function renderExperience() {
    const list = document.getElementById("experience-list");
    list.innerHTML = "";
    const tpl = document.getElementById("tpl-experience");
    const tplBullet = document.getElementById("tpl-bullet");
    const tplBulletAdd = document.getElementById("tpl-bullet-add");

    state.experience.forEach(function (job) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = job.id;

      bindField(node, "role", job, function () {
        saveData();
      });
      bindField(node, "company", job, function () {
        saveData();
      });
      bindField(node, "period", job, function () {
        saveData();
      });

      const ul = node.querySelector('[data-field="bullets"]');
      job.bullets.forEach(function (text, idx) {
        const li = tplBullet.content.firstElementChild.cloneNode(true);
        const span = li.querySelector(".bullet-text");
        span.textContent = text;
        span.addEventListener("input", function () {
          job.bullets[idx] = span.innerText;
          saveData();
        });
        li.querySelector('[data-action="remove-bullet"]').addEventListener("click", function () {
          job.bullets.splice(idx, 1);
          renderExperience();
          saveData();
        });
        ul.appendChild(li);
      });
      const addLi = tplBulletAdd.content.firstElementChild.cloneNode(true);
      addLi.querySelector('[data-action="add-bullet"]').addEventListener("click", function () {
        job.bullets.push("New responsibility or result.");
        renderExperience();
        saveData();
      });
      ul.appendChild(addLi);

      node.querySelector('[data-action="remove-exp"]').addEventListener("click", function () {
        state.experience = state.experience.filter(function (j) {
          return j.id !== job.id;
        });
        renderExperience();
        saveData();
      });

      list.appendChild(node);
    });
  }

  // -------------------- Render: Education --------------------
  function renderEducation() {
    const list = document.getElementById("education-list");
    list.innerHTML = "";
    const tpl = document.getElementById("tpl-education");

    state.education.forEach(function (edu) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = edu.id;

      bindField(node, "degree", edu, saveData);
      bindField(node, "school", edu, saveData);
      bindField(node, "period", edu, saveData);

      node.querySelector('[data-action="remove-edu"]').addEventListener("click", function () {
        state.education = state.education.filter(function (x) {
          return x.id !== edu.id;
        });
        renderEducation();
        saveData();
      });

      list.appendChild(node);
    });
  }

  // -------------------- Render: Skills --------------------
  function renderSkills() {
    const list = document.getElementById("skills-list");
    list.innerHTML = "";
    const tpl = document.getElementById("tpl-skill");
    const tplAdd = document.getElementById("tpl-skill-add");

    state.skills.forEach(function (skill, idx) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      const span = node.querySelector(".skill-text");
      span.textContent = skill;
      span.addEventListener("input", function () {
        state.skills[idx] = span.innerText;
        saveData();
      });
      attachKeyHandler(span);
      node.querySelector('[data-action="remove-skill"]').addEventListener("click", function () {
        state.skills.splice(idx, 1);
        renderSkills();
        saveData();
      });
      list.appendChild(node);
    });

    const addBtn = tplAdd.content.firstElementChild.cloneNode(true);
    addBtn.addEventListener("click", function () {
      state.skills.push("New skill");
      renderSkills();
      saveData();
    });
    list.appendChild(addBtn);
  }

  // -------------------- Render: Languages --------------------
  function renderLanguages() {
    const list = document.getElementById("languages-list");
    list.innerHTML = "";
    const tpl = document.getElementById("tpl-language");

    state.languages.forEach(function (lang) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = lang.id;
      bindField(node, "name", lang, saveData);
      bindField(node, "level", lang, saveData);
      node.querySelector('[data-action="remove-lang"]').addEventListener("click", function () {
        state.languages = state.languages.filter(function (x) {
          return x.id !== lang.id;
        });
        renderLanguages();
        saveData();
      });
      list.appendChild(node);
    });
  }

  // -------------------- Helper: bind [data-field] inside a cloned node to an object key --------------------
  function bindField(root, fieldName, target, onChange) {
    const el = root.querySelector('[data-field="' + fieldName + '"]');
    if (!el) return;
    el.textContent = target[fieldName];
    el.addEventListener("input", function () {
      target[fieldName] = el.innerText;
      if (onChange) onChange();
    });
    attachKeyHandler(el);
  }

  // -------------------- Toolbar actions --------------------
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.hidden = false;
    toast.style.animation = "none";
    // re-trigger animation
    void toast.offsetWidth;
    toast.style.animation = "";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.hidden = true;
    }, 2400);
  }

  function handleDownload() {
    const btn = document.getElementById("download-btn");
    const label = document.getElementById("download-label");
    if (btn.disabled) return;
    btn.disabled = true;
    const previousTitle = document.title;
    const safe =
      (state.name || "").trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_\-]/g, "") || "resume";
    document.title = "Resume_" + safe;
    label.textContent = "Preparing…";
    showToast("Choose 'Save as PDF' in the print dialog");

    function restore() {
      document.title = previousTitle;
      btn.disabled = false;
      label.textContent = "Download PDF";
      window.removeEventListener("afterprint", restore);
    }
    window.addEventListener("afterprint", restore);

    setTimeout(function () {
      try {
        window.print();
      } catch (err) {
        console.error(err);
        showToast("Could not open the print dialog");
        restore();
      }
    }, 120);
  }

  function handleReset() {
    if (!confirm("Reset resume to the example template? Your edits will be lost.")) return;
    state = clone(defaultData);
    saveData();
    renderAll();
    showToast("Resume reset to example");
  }

  // -------------------- Add buttons --------------------
  function addExperience() {
    state.experience.push({
      id: uid("exp"),
      role: "Role",
      company: "Company",
      period: "Year — Year",
      bullets: ["Describe a key result or responsibility."],
    });
    renderExperience();
    saveData();
  }

  function addEducation() {
    state.education.push({
      id: uid("edu"),
      degree: "Degree",
      school: "School",
      period: "Year — Year",
    });
    renderEducation();
    saveData();
  }

  function addLanguage() {
    state.languages.push({ id: uid("lng"), name: "Language", level: "Level" });
    renderLanguages();
    saveData();
  }

  // -------------------- Render all --------------------
  function renderAll() {
    // Top-level fields
    document.querySelectorAll("[data-bind]").forEach(function (node) {
      const key = node.getAttribute("data-bind");
      node.textContent = state[key] != null ? state[key] : "";
    });
    refreshInitials();
    renderExperience();
    renderEducation();
    renderSkills();
    renderLanguages();
  }

  // -------------------- Boot --------------------
  document.addEventListener("DOMContentLoaded", function () {
    bindTopLevelEditables();
    refreshInitials();
    renderExperience();
    renderEducation();
    renderSkills();
    renderLanguages();

    document.getElementById("reset-btn").addEventListener("click", handleReset);
    document.getElementById("download-btn").addEventListener("click", handleDownload);
    document.getElementById("add-exp").addEventListener("click", addExperience);
    document.getElementById("add-edu").addEventListener("click", addEducation);
    document.getElementById("add-lang").addEventListener("click", addLanguage);
  });
})();
