// Accessible Modal Component (plain JS)
// Usage: const modal = new Modal({ title: 'New Deck', content: htmlStringOrNode });
// modal.open(); modal.close(); modal.destroy();

class Modal {
  constructor({ title = "", content = "" } = {}) {
    this.title = title;
    this.content = content;
    this._previouslyFocused = null;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._init();
  }

  _init() {
    this.container = document.createElement("div");
    this.container.className = "modal-overlay";
    this.container.setAttribute("role", "dialog");
    this.container.setAttribute("aria-modal", "true");
    this.container.setAttribute("aria-hidden", "true");
    this.container.innerHTML = `
			<div class="modal" role="dialog" aria-labelledby="modal-title">
				<header class="modal-header">
					<h3 id="modal-title" class="modal-title">${this.title}</h3>
					<button class="modal-close" aria-label="Close dialog">✕</button>
				</header>
				<div class="modal-body"></div>
			</div>`;

    this._body = this.container.querySelector(".modal-body");
    this._closeBtn = this.container.querySelector(".modal-close");
    this._closeBtn.addEventListener("click", () => this.close());

    if (typeof this.content === "string") {
      this._body.innerHTML = this.content;
    } else if (this.content instanceof Node) {
      this._body.appendChild(this.content);
    }

    document.body.appendChild(this.container);
    this._focusableSelector = [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "object",
      "embed",
      "[contenteditable]",
      '[tabindex]:not([tabindex^="-"])',
    ].join(",");
  }

  open() {
    this._previouslyFocused = document.activeElement;
    document.querySelector("main")?.setAttribute("aria-hidden", "true");
    document.querySelector("nav")?.setAttribute("aria-hidden", "true");
    this.container.setAttribute("aria-hidden", "false");
    this.container.classList.add("open");
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("focus", this._onFocus, true);
    const focusables = this._getFocusable();
    (focusables[0] || this._closeBtn).focus();
  }

  close() {
    this.container.setAttribute("aria-hidden", "true");
    this.container.classList.remove("open");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("focus", this._onFocus, true);
    if (this._previouslyFocused && this._previouslyFocused.focus) {
      this._previouslyFocused.focus();
    }
    document.querySelector("main")?.removeAttribute("aria-hidden");
    document.querySelector("nav")?.removeAttribute("aria-hidden");
  }

  destroy() {
    this.close();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  _getFocusable() {
    return Array.from(
      this.container.querySelectorAll(this._focusableSelector),
    ).filter(
      (el) =>
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el === document.activeElement,
    );
  }

  _onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key === "Tab") {
      const focusables = this._getFocusable();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  _onFocus(e) {
    if (!this.container.contains(e.target)) {
      const focusables = this._getFocusable();
      (focusables[0] || this._closeBtn).focus();
      e.stopPropagation();
    }
  }
}

// App wiring: in-memory decks + CRUD + UI
document.addEventListener("DOMContentLoaded", () => {
  const newDeckBtn = document.getElementById("new-deck-btn");
  if (!newDeckBtn) return;

  const deckListEl = document.getElementById("deck-list");
  const deckTitleEl = document.getElementById("deck-title");
  const editDeckBtn = document.getElementById("edit-deck-btn");
  const deleteDeckBtn = document.getElementById("delete-deck-btn");

  const formHtml = `
    <form id="new-deck-form">
      <label for="deck-name">Deck name</label>
      <input id="deck-name" autofocus name="name" type="text" required minlength="1" maxlength="100" />
      <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
        <button type="button" class="btn" id="cancel-deck">Cancel</button>
        <button type="submit" class="btn btn-primary">Create</button>
      </div>
    </form>`;

  let decks = [
    {
      id: "d1",
      title: "Sample Deck",
      cards: [{ id: "c1", q: "What is 2+2?", a: "4" }],
    },
    { id: "d2", title: "Spanish Basics", cards: [] },
    { id: "d3", title: "Math Facts", cards: [] },
  ];
  let activeDeckId = decks[0].id;

  function persist() {
    try {
      if (window.storage && typeof window.storage.saveState === "function") {
        window.storage.saveState(
          "state",
          { decks: decks, activeDeckId: activeDeckId },
          1,
        );
      }
    } catch (err) {
      console.error("Persist error:", err);
    }
  }

  try {
    if (window.storage && typeof window.storage.loadState === "function") {
      const saved = window.storage.loadState("state", 1);
      if (saved && Array.isArray(saved.decks) && saved.decks.length > 0) {
        decks = saved.decks;
        activeDeckId = saved.activeDeckId || decks[0].id;
      }
    }
  } catch (err) {
    console.error("Load state error:", err);
  }

  function generateId(prefix = "d") {
    return prefix + Date.now() + Math.random().toString(36).slice(2, 9);
  }

  function findDeck(id) {
    return decks.find((d) => d.id === id);
  }

  function renderDeckList() {
    deckListEl.innerHTML = "";
    const emptyDecksEl = document.getElementById("empty-decks");

    if (decks.length === 0) {
      if (emptyDecksEl) {
        emptyDecksEl.hidden = false;
        setTimeout(() => emptyDecksEl.querySelector("button")?.focus(), 0);
      }
      deckListEl.setAttribute("aria-hidden", "true");
      return;
    }

    if (emptyDecksEl) emptyDecksEl.hidden = true;
    deckListEl.removeAttribute("aria-hidden");

    decks.forEach((d) => {
      const li = document.createElement("li");
      li.className = "deck-item" + (d.id === activeDeckId ? " active" : "");
      li.tabIndex = 0;
      li.dataset.id = d.id;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", `${d.title}, ${d.cards.length} cards`);
      li.textContent = `${d.title} (${d.cards.length})`;
      li.addEventListener("click", () => setActiveDeck(d.id));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveDeck(d.id);
        }
      });
      deckListEl.appendChild(li);
    });
  }

  function setActiveDeck(id) {
    activeDeckId = id;
    const deck = findDeck(id);
    if (deck) {
      deckTitleEl.textContent = deck.title;
      renderDeckList();
      renderCard(deck);
      persist();
    }
  }

  function createDeck(title) {
    const id = generateId("d");
    decks.push({ id, title, cards: [] });
    renderDeckList();
    setActiveDeck(id);
    persist();
  }

  function updateDeck(id, newTitle) {
    const d = findDeck(id);
    if (!d) return;
    d.title = newTitle;
    renderDeckList();
    if (id === activeDeckId) deckTitleEl.textContent = newTitle;
    persist();
  }

  function deleteDeck(id) {
    const idx = decks.findIndex((d) => d.id === id);
    if (idx === -1) return;
    decks.splice(idx, 1);

    if (decks.length === 0) {
      deckTitleEl.textContent = "No Decks";
      activeDeckId = null;
      renderDeckList();
      renderCard(null);
      persist();
      return;
    }

    activeDeckId = decks[Math.max(0, idx - 1)].id;
    renderDeckList();
    setActiveDeck(activeDeckId);
    persist();
  }

  function renderCard(deck) {
    const cardFront = document.querySelector("#card-front");
    const cardBack = document.querySelector("#card-back");
    const cardEl = document.getElementById("card");
    const emptyCardsEl = document.getElementById("empty-cards");

    if (!deck) {
      if (emptyCardsEl) emptyCardsEl.hidden = true;
      if (cardFront) cardFront.textContent = "";
      if (cardBack) cardBack.textContent = "";
      if (cardEl) cardEl.classList.remove("is-flipped");
      cardEl?.setAttribute("aria-hidden", "true");
      return;
    }

    if (deck.cards.length === 0) {
      if (emptyCardsEl) {
        emptyCardsEl.hidden = false;
        setTimeout(() => emptyCardsEl.querySelector("button")?.focus(), 0);
      }
      if (cardFront) cardFront.textContent = "";
      if (cardBack) cardBack.textContent = "";
      if (cardEl) cardEl.classList.remove("is-flipped");
      cardEl?.setAttribute("aria-hidden", "true");
      return;
    }

    if (emptyCardsEl) emptyCardsEl.hidden = true;
    cardEl?.removeAttribute("aria-hidden");

    if (typeof deck._index === "undefined") deck._index = 0;
    deck._index = Math.max(0, Math.min(deck._index, deck.cards.length - 1));
    const c = deck.cards[deck._index];

    if (cardFront) cardFront.textContent = c.q;
    if (cardBack) cardBack.textContent = c.a;
    if (cardEl) cardEl.classList.remove("is-flipped");
  }

  let newDeckModal = null;

  newDeckBtn.addEventListener("click", () => {
    if (!newDeckModal) {
      newDeckModal = new Modal({ title: "New Deck", content: formHtml });
    }
    newDeckModal.open();
  });

  document.body.addEventListener("click", (e) => {
    if (e.target && e.target.id === "cancel-deck") {
      e.preventDefault();
      if (newDeckModal) newDeckModal.close();
    }
  });

  document.body.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "new-deck-form") {
      e.preventDefault();
      const input = e.target.querySelector("#deck-name");
      const name = input.value.trim();

      if (!name) {
        input.setCustomValidity("Please enter a deck name");
        input.reportValidity();
        return;
      }

      input.setCustomValidity("");
      createDeck(name);

      if (newDeckModal) {
        newDeckModal.close();
        e.target.reset();
      }
    }
  });

  // initial render
  renderDeckList();
  if (activeDeckId) setActiveDeck(activeDeckId);

  // Empty-state action wiring
  const newDeckEmptyBtn = document.getElementById("new-deck-empty");
  if (newDeckEmptyBtn)
    newDeckEmptyBtn.addEventListener("click", () => newDeckBtn.click());

  const newCardEmptyBtn = document.getElementById("new-card-empty");
  if (newCardEmptyBtn)
    newCardEmptyBtn.addEventListener("click", () =>
      document.getElementById("new-card-btn")?.click(),
    );

  // FIXED: Edit deck with proper cleanup
  if (editDeckBtn) {
    editDeckBtn.addEventListener("click", () => {
      const deck = findDeck(activeDeckId);
      if (!deck) return;

      const editForm = `
        <form id="edit-deck-form">
          <label for="edit-deck-name">Deck name</label>
          <input id="edit-deck-name" name="name" type="text" value="${escapeHtml(deck.title)}" required minlength="1" maxlength="100" autofocus />
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
            <button type="button" class="btn" id="cancel-edit">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>`;

      const editModal = new Modal({ title: "Edit Deck", content: editForm });
      editModal.open();

      const handleEditClick = (e) => {
        if (e.target && e.target.id === "cancel-edit") {
          cleanup();
        }
      };

      const handleEditSubmit = (e) => {
        if (e.target && e.target.id === "edit-deck-form") {
          e.preventDefault();
          const input = e.target.querySelector("#edit-deck-name");
          const newName = input.value.trim();

          if (!newName) {
            input.setCustomValidity("Please enter a deck name");
            input.reportValidity();
            return;
          }

          input.setCustomValidity("");
          updateDeck(deck.id, newName);
          cleanup();
        }
      };

      const cleanup = () => {
        editModal.close();
        editModal.destroy();
        document.body.removeEventListener("click", handleEditClick);
        document.body.removeEventListener("submit", handleEditSubmit);
      };

      document.body.addEventListener("click", handleEditClick);
      document.body.addEventListener("submit", handleEditSubmit);
    });
  }

  // FIXED: Delete deck with proper cleanup
  if (deleteDeckBtn) {
    deleteDeckBtn.addEventListener("click", () => {
      const deck = findDeck(activeDeckId);
      if (!deck) return;

      const confirmHtml = `
        <div>
          <p>Delete "${escapeHtml(deck.title)}"? This cannot be undone.</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button id="cancel-delete" class="btn">Cancel</button>
            <button id="confirm-delete" class="btn btn-danger">Delete</button>
          </div>
        </div>`;

      const confirmModal = new Modal({
        title: "Delete Deck",
        content: confirmHtml,
      });
      confirmModal.open();

      const handleDeleteClick = (e) => {
        if (e.target && e.target.id === "cancel-delete") {
          cleanup();
        }
        if (e.target && e.target.id === "confirm-delete") {
          deleteDeck(deck.id);
          cleanup();
        }
      };

      const cleanup = () => {
        confirmModal.close();
        confirmModal.destroy();
        document.body.removeEventListener("click", handleDeleteClick);
      };

      document.body.addEventListener("click", handleDeleteClick);
    });
  }

  // Debounced search
  const searchInput = document.getElementById("search");
  const searchCountEl = document.getElementById("search-count");

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function performSearch(query) {
    const deck = findDeck(activeDeckId);
    if (!deck) return;

    const q = String(query || "")
      .trim()
      .toLowerCase();

    if (!q) {
      if (searchCountEl) searchCountEl.textContent = "";
      deck._index = 0;
      renderCard(deck);
      return;
    }

    const matches = deck.cards
      .map((c, i) => ({ c, i }))
      .filter(
        ({ c }) =>
          String(c.q || "")
            .toLowerCase()
            .includes(q) ||
          String(c.a || "")
            .toLowerCase()
            .includes(q),
      );

    if (searchCountEl) {
      searchCountEl.textContent = `${matches.length} match${matches.length !== 1 ? "es" : ""}`;
    }

    if (matches.length > 0) {
      deck._index = matches[0].i;
      renderCard(deck);
    } else {
      const cardFront = document.querySelector("#card-front");
      const cardBack = document.querySelector("#card-back");
      const cardEl = document.getElementById("card");
      if (cardFront)
        cardFront.textContent = `No matches for "${escapeHtml(query)}"`;
      if (cardBack) cardBack.textContent = "";
      if (cardEl) cardEl.classList.remove("is-flipped");
    }
  }

  const debouncedSearch = debounce(performSearch, 300);
  if (searchInput) {
    searchInput.addEventListener("input", (e) =>
      debouncedSearch(e.target.value),
    );
  }

  /* Card CRUD */
  function createCard(deckId, q, a) {
    const d = findDeck(deckId);
    if (!d) return;
    const id = generateId("c");
    d.cards.push({ id, q, a });
    d._index = d.cards.length - 1;
    if (deckId === activeDeckId) renderCard(d);
    renderDeckList();
    persist();
  }

  function updateCard(deckId, cardId, q, a) {
    const d = findDeck(deckId);
    if (!d) return;
    const card = d.cards.find((c) => c.id === cardId);
    if (!card) return;
    card.q = q;
    card.a = a;
    if (deckId === activeDeckId) renderCard(d);
    persist();
  }

  function deleteCard(deckId, cardId) {
    const d = findDeck(deckId);
    if (!d) return;
    const idx = d.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    d.cards.splice(idx, 1);
    if (d._index >= d.cards.length) d._index = Math.max(0, d.cards.length - 1);
    if (deckId === activeDeckId) renderCard(d);
    renderDeckList();
    persist();
  }

  // Delegated click handler for card controls
  document.body.addEventListener("click", (e) => {
    const target = e.target;
    if (!target) return;

    // Prev
    if (target.id === "prev-btn") {
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      deck._index = Math.max(0, (deck._index || 0) - 1);
      renderCard(deck);
    }

    // Next
    if (target.id === "next-btn") {
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      deck._index = Math.min(deck.cards.length - 1, (deck._index || 0) + 1);
      renderCard(deck);
    }

    // Flip
    if (target.id === "flip-btn") {
      const cardEl = document.getElementById("card");
      if (cardEl) cardEl.classList.toggle("is-flipped");
    }

    // Shuffle
    if (target.id === "shuffle-btn") {
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      for (let i = deck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
      }
      deck._index = 0;
      renderCard(deck);
      persist();
    }

    // New Card
    if (target.id === "new-card-btn") {
      const newCardForm = `
        <form id="new-card-form">
          <label for="new-q">Question</label>
          <input id="new-q" name="q" type="text" required minlength="1" maxlength="500" autofocus />
          <label for="new-a" style="margin-top:8px;">Answer</label>
          <input id="new-a" name="a" type="text" required minlength="1" maxlength="500" />
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
            <button type="button" class="btn" id="cancel-new-card">Cancel</button>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>`;

      const newCardModal = new Modal({
        title: "New Card",
        content: newCardForm,
      });
      newCardModal.open();

      const handleClick = (ev) => {
        if (ev.target && ev.target.id === "cancel-new-card") {
          cleanup();
        }
      };

      const handleSubmit = (ev) => {
        if (ev.target && ev.target.id === "new-card-form") {
          ev.preventDefault();
          const qInput = ev.target.querySelector("#new-q");
          const aInput = ev.target.querySelector("#new-a");
          const q = qInput.value.trim();
          const a = aInput.value.trim();

          if (!q || !a) {
            if (!q) {
              qInput.setCustomValidity("Please enter a question");
              qInput.reportValidity();
            }
            if (!a) {
              aInput.setCustomValidity("Please enter an answer");
              aInput.reportValidity();
            }
            return;
          }

          qInput.setCustomValidity("");
          aInput.setCustomValidity("");
          createCard(activeDeckId, q, a);
          cleanup();
        }
      };

      const cleanup = () => {
        newCardModal.close();
        newCardModal.destroy();
        document.body.removeEventListener("click", handleClick);
        document.body.removeEventListener("submit", handleSubmit);
      };

      document.body.addEventListener("click", handleClick);
      document.body.addEventListener("submit", handleSubmit);
    }

    // Edit Card
    if (target.id === "edit-card-btn") {
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      const idx = deck._index || 0;
      const card = deck.cards[idx];

      const editForm = `
        <form id="edit-card-form" data-card-id="${card.id}">
          <label for="edit-q">Question</label>
          <input id="edit-q" name="q" type="text" value="${escapeHtml(card.q)}" required minlength="1" maxlength="500" autofocus />
          <label for="edit-a" style="margin-top:8px;">Answer</label>
          <input id="edit-a" name="a" type="text" value="${escapeHtml(card.a)}" required minlength="1" maxlength="500" />
          <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
            <button type="button" class="btn" id="cancel-edit-card">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>`;

      const editModal = new Modal({ title: "Edit Card", content: editForm });
      editModal.open();

      const handleClick = (ev) => {
        if (ev.target && ev.target.id === "cancel-edit-card") {
          cleanup();
        }
      };

      const handleSubmit = (ev) => {
        if (ev.target && ev.target.id === "edit-card-form") {
          ev.preventDefault();
          const qInput = ev.target.querySelector("#edit-q");
          const aInput = ev.target.querySelector("#edit-a");
          const q = qInput.value.trim();
          const a = aInput.value.trim();
          const cardId = ev.target.dataset.cardId;

          if (!q || !a || !cardId) {
            if (!q) {
              qInput.setCustomValidity("Please enter a question");
              qInput.reportValidity();
            }
            if (!a) {
              aInput.setCustomValidity("Please enter an answer");
              aInput.reportValidity();
            }
            return;
          }

          qInput.setCustomValidity("");
          aInput.setCustomValidity("");
          updateCard(activeDeckId, cardId, q, a);
          cleanup();
        }
      };

      const cleanup = () => {
        editModal.close();
        editModal.destroy();
        document.body.removeEventListener("click", handleClick);
        document.body.removeEventListener("submit", handleSubmit);
      };

      document.body.addEventListener("click", handleClick);
      document.body.addEventListener("submit", handleSubmit);
    }

    // Delete Card
    if (target.id === "delete-card-btn") {
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      const idx = deck._index || 0;
      const card = deck.cards[idx];

      const confirmHtml = `
        <div>
          <p>Delete this card? This cannot be undone.</p>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
            <button id="cancel-delete-card" class="btn">Cancel</button>
            <button id="confirm-delete-card" class="btn btn-danger" data-card-id="${card.id}">Delete</button>
          </div>
        </div>`;

      const confirmModal = new Modal({
        title: "Delete Card",
        content: confirmHtml,
      });
      confirmModal.open();

      const handleClick = (ev) => {
        if (ev.target && ev.target.id === "cancel-delete-card") {
          cleanup();
        }
        if (ev.target && ev.target.id === "confirm-delete-card") {
          const cardId = ev.target.dataset.cardId;
          if (!cardId) return;
          deleteCard(activeDeckId, cardId);
          cleanup();
        }
      };

      const cleanup = () => {
        confirmModal.close();
        confirmModal.destroy();
        document.body.removeEventListener("click", handleClick);
      };

      document.body.addEventListener("click", handleClick);
    }
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    const modalOpen = document.body.classList.contains("modal-open");
    const inputFocused =
      document.activeElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);

    if (modalOpen || inputFocused) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      deck._index = Math.max(0, (deck._index || 0) - 1);
      renderCard(deck);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const deck = findDeck(activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      deck._index = Math.min(deck.cards.length - 1, (deck._index || 0) + 1);
      renderCard(deck);
    }
    if (e.code === "Space") {
      e.preventDefault();
      const cardEl = document.getElementById("card");
      if (cardEl) cardEl.classList.toggle("is-flipped");
    }
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});

/* Minimal CSS for modal */
const style = document.createElement("style");
style.textContent = `
.modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.5);z-index:1000;opacity:0;pointer-events:none;transition:opacity 0.2s ease}
.modal-overlay.open{opacity:1;pointer-events:auto}
.modal{background:var(--card,#fff);color:var(--text,#020617);min-width:280px;max-width:520px;border-radius:12px;padding:16px;box-shadow:0 10px 30px rgba(2,6,23,0.4)}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.modal-title{margin:0;font-size:1.125rem}
.modal-close{background:transparent;border:none;font-size:1.5rem;cursor:pointer;padding:4px 8px;line-height:1;color:var(--text,#020617)}
.modal-close:hover{opacity:0.7}
.modal-close:focus{outline:2px solid var(--primary,#3b82f6);outline-offset:2px;border-radius:4px}
.modal-body label{display:block;margin-bottom:4px;font-weight:500}
.modal-body input[type="text"]{width:100%;padding:8px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:1rem;box-sizing:border-box}
.modal-body input[type="text"]:focus{outline:2px solid var(--primary,#3b82f6);outline-offset:1px}
.modal-body input:invalid{border-color:var(--danger,#dc2626)}
body.modal-open{overflow:hidden}
.btn-primary{background:var(--primary,#3b82f6);color:white}
.btn-primary:hover{background:var(--primary-dark,#2563eb)}
.btn-danger{background:var(--danger,#dc2626);color:white}
.btn-danger:hover{background:var(--danger-dark,#b91c1c)}
`;
document.head.appendChild(style);
