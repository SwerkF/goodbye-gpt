// Goodbye GPT - DOM-only ChatGPT conversation deleter

(function () {
  'use strict';

  const BTN_ID = 'goodbye-gpt-btn';
  const DELAY_MENU = 350;
  const DELAY_MODAL = 500;
  const DELAY_BETWEEN = 600;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function waitPresent(selector, root = document, timeoutMs = 2500) {
    const t0 = performance.now();
    return new Promise((resolve) => {
      function check() {
        const el = root.querySelector(selector);
        if (el) return resolve(el);
        if (performance.now() - t0 >= timeoutMs) return resolve(null);
        setTimeout(check, 25);
      }
      check();
    });
  }

  const SELECTORS = {
    conversationLinks: [
      '#history a[draggable="true"][href^="/c/"]',
      '#history a[href^="/c/"]',
      'a[href^="/c/"]',
    ],
    optionsButton: [
      'button[data-testid^="history-item-"][data-testid$="-options"]',
      'button[aria-label*="options"]',
    ],
    deleteMenuItem: [
      '[role="menuitem"][data-testid="delete-chat-menu-item"]',
      'div[role="menuitem"]',
    ],
    modal: [
      'div[data-testid="modal-delete-conversation-confirmation"]',
      '[role="dialog"]',
    ],
    confirmButton: [
      'button[data-testid="delete-conversation-confirm-button"]',
      'button.btn-danger',
      'button[class*="danger"]',
    ],
  };

  function findFirst(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  function findAll(selectors) {
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return Array.from(els);
      } catch (_) {}
    }
    return [];
  }

  function getConversationRows() {
    const links = findAll(SELECTORS.conversationLinks);
    const rows = new Set();

    for (const link of links) {
      let row = link.closest('li') || link.closest('[role="listitem"]') || link.parentElement;
      while (row && !getOptionsButton(row)) {
        row = row.parentElement;
      }
      if (row && !rows.has(row)) {
        rows.add(row);
      }
    }

    return Array.from(rows);
  }

  function getOptionsButton(row) {
    for (const sel of SELECTORS.optionsButton) {
      try {
        const btn = row.querySelector(sel);
        if (btn) return btn;
      } catch (_) {}
    }
    return null;
  }

  function clickDeleteMenuItem() {
    const deleteItem = document.querySelector('[role="menuitem"][data-testid="delete-chat-menu-item"]');
    if (deleteItem) {
      deleteItem.click();
      return true;
    }

    const items = document.querySelectorAll('[role="menuitem"]');
    for (const item of items) {
      const t = (item.textContent || '').toLowerCase();
      if (t.includes('delete') || t.includes('supprimer')) {
        item.click();
        return true;
      }
    }
    return false;
  }

  async function clickConfirmButton() {
    const modal = await waitPresent(SELECTORS.modal[0], document, 2000) || findFirst(SELECTORS.modal);
    if (!modal) return false;

    for (const sel of SELECTORS.confirmButton) {
      try {
        const btn = modal.querySelector(sel);
        if (btn) {
          btn.click();
          return true;
        }
      } catch (_) {}
    }

    const buttons = modal.querySelectorAll('button');
    for (const btn of buttons) {
      const t = (btn.textContent || '').toLowerCase();
      if (t.includes('delete') || t.includes('supprimer')) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  async function deleteOneConversation(row) {
    const optionsBtn = getOptionsButton(row);
    if (!optionsBtn) return false;

    optionsBtn.click();
    await wait(DELAY_MENU);

    const deleteClicked = clickDeleteMenuItem();
    if (!deleteClicked) return false;

    await wait(DELAY_MODAL);

    const confirmClicked = await clickConfirmButton();
    if (!confirmClicked) return false;

    return true;
  }

  async function deleteAllConversations() {
    const btn = document.getElementById(BTN_ID);
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = 'Suppression en cours...';

    let total = 0;
    let ok = 0;
    let fail = 0;

    try {
      while (true) {
        const rows = getConversationRows();
        if (rows.length === 0) break;

        total += rows.length;

        for (const row of rows) {
          try {
            const success = await deleteOneConversation(row);
            if (success) ok++;
            else fail++;
          } catch (err) {
            fail++;
            console.warn('[Goodbye GPT] Erreur:', err);
          }
          await wait(DELAY_BETWEEN);
        }

        await wait(400);
      }

      btn.textContent = `Terminé (${ok} supprimées${fail > 0 ? `, ${fail} échecs` : ''})`;
    } catch (err) {
      console.error('[Goodbye GPT]', err);
      btn.textContent = 'Erreur - Réessayer';
    } finally {
      btn.disabled = false;
      setTimeout(() => {
        if (btn.textContent !== 'Supprimer tous les chats') {
          btn.textContent = 'Supprimer tous les chats';
        }
      }, 3000);
    }
  }

  function createButton() {
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = 'Supprimer tous les chats';
    btn.type = 'button';

    Object.assign(btn.style, {
      position: 'fixed',
      top: '6%',
      left: '60%',
      transform: 'translate(-50%, -50%)',
      zIndex: '2147483647',
      padding: '10px 16px',
      border: 'none',
      borderRadius: '10px',
      background: '#ef4444',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });

    btn.addEventListener('click', () => deleteAllConversations(), { passive: true });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#dc2626';
      btn.style.transform = 'translate(-50%, -50%) scale(1.02)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#ef4444';
      btn.style.transform = 'translate(-50%, -50%)';
    });

    document.body.appendChild(btn);
  }

  function ensureButton() {
    if (!document.body) return;
    if (!document.getElementById(BTN_ID)) createButton();
  }

  function boot() {
    if (!document.body) {
      requestAnimationFrame(boot);
      return;
    }

    ensureButton();

    const observer = new MutationObserver(() => ensureButton());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(ensureButton, 2000);
  }

  boot();
})();
