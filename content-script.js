// Goodbye GPT - DOM-only ChatGPT conversation deleter

(function () {
  'use strict';

  const BTN_ID = 'goodbye-gpt-btn';
  const DELAY_MENU = 450;
  const DELAY_MODAL = 700;
  const DELAY_BETWEEN = 1200;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function waitPresent(selector, root = document, timeoutMs = 3000) {
    const t0 = performance.now();
    return new Promise((resolve) => {
      function check() {
        const el = root.querySelector(selector);
        if (el) return resolve(el);
        if (performance.now() - t0 >= timeoutMs) return resolve(null);
        setTimeout(check, 30);
      }
      check();
    });
  }

  const OPTIONS_SELECTORS = [
    'button[data-testid^="history-item-"][data-testid$="-options"]',
    'button[aria-label*="options"]',
  ];

  function getOptionsButtons() {
    for (const sel of OPTIONS_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return Array.from(els);
      } catch (_) {}
    }
    return [];
  }

  function getIdFromButton(btn) {
    const row = btn.closest('li') || btn.closest('[role="listitem"]') || btn.parentElement?.closest('[role="group"]') || btn.parentElement;
    const link = row?.querySelector?.('a[href^="/c/"]');
    const m = link?.getAttribute?.('href')?.match(/\/c\/([a-f0-9-]+)/i);
    return m ? m[1] : null;
  }

  function clickDeleteMenuItem() {
    const item = document.querySelector('[role="menuitem"][data-testid="delete-chat-menu-item"]');
    if (item) {
      item.click();
      return true;
    }
    for (const el of document.querySelectorAll('[role="menuitem"]')) {
      const t = (el.textContent || '').toLowerCase();
      if (t.includes('delete') || t.includes('supprimer')) {
        el.click();
        return true;
      }
    }
    return false;
  }

  async function clickConfirmButton() {
    const modal = await waitPresent('[data-testid="modal-delete-conversation-confirmation"]', document, 2500)
      || document.querySelector('[role="dialog"]');
    if (!modal) return false;

    const confirmBtn = modal.querySelector('[data-testid="delete-conversation-confirm-button"]')
      || modal.querySelector('button.btn-danger')
      || Array.from(modal.querySelectorAll('button')).find(b => /delete|supprimer/i.test(b.textContent || ''));
    if (confirmBtn) {
      confirmBtn.click();
      return true;
    }
    return false;
  }

  async function deleteViaButton(btn) {
    if (!btn || !document.contains(btn)) return false;

    btn.click();
    await wait(DELAY_MENU);

    if (!clickDeleteMenuItem()) return false;
    await wait(DELAY_MODAL);

    return await clickConfirmButton();
  }

  async function deleteAllConversations() {
    const btn = document.getElementById(BTN_ID);
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = 'Suppression en cours...';

    const skipIds = new Set();
    let ok = 0;
    let fail = 0;
    let consecutiveFails = 0;

    try {
      while (true) {
        let buttons = getOptionsButtons();
        let toProcess = buttons.filter(b => {
          const id = getIdFromButton(b);
          return id && !skipIds.has(id);
        });

        if (toProcess.length === 0) {
          await wait(1500);
          toProcess = getOptionsButtons().filter(b => !skipIds.has(getIdFromButton(b)));
          if (toProcess.length === 0) break;
        }

        const target = toProcess[0];
        if (!target) break;

        const id = getIdFromButton(target);

        try {
          const success = await deleteViaButton(target);
          if (success) {
            ok++;
            consecutiveFails = 0;
          } else {
            if (id) skipIds.add(id);
            fail++;
            consecutiveFails++;
          }
        } catch (err) {
          if (id) skipIds.add(id);
          fail++;
          consecutiveFails++;
          console.warn('[Goodbye GPT]', err);
        }

        if (consecutiveFails >= 8) break;
        await wait(DELAY_BETWEEN);
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
