// =============================================
// Duplicates Page — Figurinhas repetidas
// =============================================

let duplicateStickers = [];
let allCatalogStickers = [];
let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;

  currentUserProfile = await getCurrentProfile();
  await loadDuplicates();
});

/**
 * Carrega figurinhas repetidas e o catálogo completo
 */
async function loadDuplicates() {
  try {
    showDupLoader();
    const [dupes, catalog] = await Promise.all([
      userStickersApi.duplicates(),
      stickersApi.list()
    ]);

    duplicateStickers = dupes;
    allCatalogStickers = catalog;

    renderDuplicatesList();
    hideDupLoader();
  } catch (error) {
    hideDupLoader();
    showDupToast('Erro ao carregar repetidas', 'error');
    console.error(error);
  }
}

/**
 * Renderiza a lista de figurinhas repetidas
 */
function renderDuplicatesList() {
  const listEl = document.getElementById('duplicates-list');
  if (!listEl) return;

  if (duplicateStickers.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-title">Nenhuma figurinha repetida</div>
        <div class="empty-state-text">Abra mais pacotinhos no seu álbum para conseguir figurinhas repetidas!</div>
        <a href="album.html" class="btn btn-primary">Ir para o Álbum</a>
      </div>
    `;
    return;
  }

  // Contador total de repetidas
  const totalExtra = duplicateStickers.reduce((sum, us) => sum + (us.quantity - 1), 0);
  
  document.getElementById('dup-count').textContent = `${totalExtra} figurinha${totalExtra > 1 ? 's' : ''} repetida${totalExtra > 1 ? 's' : ''}`;

  listEl.innerHTML = duplicateStickers.map(us => {
    const sticker = us.sticker;
    const extra = us.quantity - 1;
    const rarityClass = sticker.rarity === 'lendário' ? 'lendario' : sticker.rarity;

    return `
      <div class="trade-card">
        <div class="trade-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="sticker-image-container" style="width:48px; height:64px; flex-shrink:0;">
              ${sticker.image_url 
                ? `<img class="sticker-image" src="${sticker.image_url}" alt="${sticker.name}">` 
                : `<div class="sticker-placeholder" style="font-size:1.5rem;">⚽</div>`
              }
            </div>
            <div>
              <div style="font-weight:600; font-size:0.9375rem;">${sticker.name}</div>
              <div style="font-size:0.75rem; color:var(--color-text-muted);">${sticker.team} · #${sticker.number}</div>
              <span class="rarity-badge ${rarityClass}">${sticker.rarity}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="sticker-qty-badge" style="position:static; width:auto; height:auto; padding:4px 12px; border-radius:var(--radius-full); font-size:0.8125rem;">
              x${extra} extra${extra > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div class="trade-actions">
          <button class="btn btn-gold btn-sm btn-full" onclick="openTradeFromDuplicate(${sticker.id}, '${sticker.name.replace(/'/g, "\\'")}')">
            🔄 Oferecer para Troca
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Abrir modal de troca a partir de uma figurinha repetida
 */
function openTradeFromDuplicate(stickerId, stickerName) {
  // Redirecionar para a página de trocas com parâmetros
  window.location.href = `trades.html?offer=${stickerId}&offerName=${encodeURIComponent(stickerName)}`;
}

// =============================================
// Utilities
// =============================================
function showDupLoader() {
  const loader = document.getElementById('page-loader');
  const content = document.getElementById('dup-content');
  if (loader) loader.style.display = 'flex';
  if (content) content.style.display = 'none';
}

function hideDupLoader() {
  const loader = document.getElementById('page-loader');
  const content = document.getElementById('dup-content');
  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'block';
}

function showDupToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}
