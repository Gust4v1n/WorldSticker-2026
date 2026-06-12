// =============================================
// Album Page — Lógica principal do álbum
// =============================================

let allStickers = [];
let userStickers = [];
let currentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  const profile = await checkAuth();
  if (!profile) return;

  currentProfile = profile;
  renderHeader();
  await loadAlbumData();
  setupOpenPackButton();
});

/**
 * Renderiza o header com dados do usuário
 */
function renderHeader() {
  const headerEl = document.getElementById('header-bar');
  if (!headerEl || !currentProfile) return;

  const initial = (currentProfile.username || 'U')[0].toUpperCase();
  headerEl.innerHTML = `
    <div class="header-user">
      <div class="header-avatar">${initial}</div>
      <div>
        <div class="header-greeting">Bem-vindo de volta 👋</div>
        <div class="header-name">${currentProfile.username}</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-ghost btn-sm" onclick="logout()" title="Sair">🚪</button>
    </div>
  `;
}

/**
 * Carrega figurinhas do catálogo e coleção do usuário
 */
async function loadAlbumData() {
  try {
    showLoader();
    const [catalog, collection] = await Promise.all([
      stickersApi.list(),
      userStickersApi.list()
    ]);

    allStickers = catalog;
    userStickers = collection;

    renderStats();
    renderProgress();
    renderStickerGrid();
    hideLoader();
  } catch (error) {
    hideLoader();
    showToast('Erro ao carregar álbum', 'error');
    console.error(error);
  }
}

/**
 * Renderiza as estatísticas
 */
function renderStats() {
  const statsEl = document.getElementById('stats-row');
  if (!statsEl) return;

  const total = allStickers.length;
  const owned = userStickers.filter(us => us.quantity > 0).length;
  const duplicates = userStickers.filter(us => us.quantity > 1).reduce((sum, us) => sum + (us.quantity - 1), 0);

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${owned}</div>
      <div class="stat-label">Obtidas</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${total - owned}</div>
      <div class="stat-label">Faltam</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${duplicates}</div>
      <div class="stat-label">Repetidas</div>
    </div>
  `;
}

/**
 * Renderiza a barra de progresso
 */
function renderProgress() {
  const progressEl = document.getElementById('progress-container');
  if (!progressEl) return;

  const total = allStickers.length;
  const owned = userStickers.filter(us => us.quantity > 0).length;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;

  progressEl.innerHTML = `
    <div class="progress-header">
      <span class="progress-label">Progresso do Álbum</span>
      <span class="progress-value">${owned}/${total} (${pct}%)</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${pct}%"></div>
    </div>
  `;
}

/**
 * Renderiza o grid de figurinhas
 */
function renderStickerGrid() {
  const gridEl = document.getElementById('sticker-grid');
  if (!gridEl) return;

  // Mapeamento: sticker_id → user_sticker
  const ownedMap = {};
  userStickers.forEach(us => {
    ownedMap[us.sticker_id] = us;
  });

  gridEl.innerHTML = allStickers.map(sticker => {
    const userSticker = ownedMap[sticker.id];
    const isOwned = userSticker && userSticker.quantity > 0;
    const qty = userSticker ? userSticker.quantity : 0;
    const rarityClass = `rarity-${sticker.rarity === 'lendário' ? 'lendario' : sticker.rarity}`;
    const ownedClass = isOwned ? 'owned' : 'not-owned';

    return `
      <div class="sticker-card ${ownedClass} ${rarityClass}" 
           onclick="${isOwned && !userSticker.is_pasted ? `pasteSticker(${userSticker.id})` : ''}"
           title="${sticker.name} - ${sticker.team}${isOwned ? ' (clique para colar)' : ''}">
        <span class="sticker-number">#${sticker.number}</span>
        ${qty > 1 ? `<span class="sticker-qty-badge">x${qty}</span>` : ''}
        <div class="sticker-image-container">
          ${sticker.image_url 
            ? `<img class="sticker-image" src="${sticker.image_url}" alt="${sticker.name}" loading="lazy">` 
            : `<div class="sticker-placeholder">⚽</div>`
          }
        </div>
        <div class="sticker-name">${sticker.name}</div>
        <div class="sticker-team">${sticker.team}</div>
        <span class="rarity-badge ${sticker.rarity === 'lendário' ? 'lendario' : sticker.rarity}">${sticker.rarity}</span>
      </div>
    `;
  }).join('');
}

/**
 * Colar figurinha no álbum
 */
async function pasteSticker(userStickerId) {
  try {
    await userStickersApi.paste(userStickerId);
    showToast('Figurinha colada no álbum! ✨', 'success');
    await loadAlbumData();
  } catch (error) {
    showToast(error.message || 'Erro ao colar figurinha', 'error');
  }
}

/**
 * Configura o botão de abrir pacotinho
 */
function setupOpenPackButton() {
  const btn = document.getElementById('open-pack-btn');
  if (!btn) return;

  btn.addEventListener('click', openPack);
}

/**
 * Abrir pacotinho de figurinhas
 */
async function openPack() {
  const btn = document.getElementById('open-pack-btn');
  if (btn) btn.disabled = true;

  try {
    const result = await userStickersApi.openPack();
    showPackReveal(result.stickers);
    await loadAlbumData();
  } catch (error) {
    showToast(error.message || 'Erro ao abrir pacotinho', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Mostra a animação de revelação do pacotinho
 */
function showPackReveal(stickers) {
  const overlay = document.getElementById('pack-overlay');
  const container = document.getElementById('pack-stickers');
  if (!overlay || !container) return;

  container.innerHTML = stickers.map((s, i) => {
    const sticker = s.sticker;
    const isNew = s.is_new;
    return `
      <div class="pack-sticker ${isNew ? 'new-sticker' : 'duplicate-sticker'}" 
           style="animation-delay: ${i * 0.15}s">
        <div class="sticker-image-container" style="height:80px;">
          ${sticker.image_url 
            ? `<img class="sticker-image" src="${sticker.image_url}" alt="${sticker.name}">` 
            : `<div class="sticker-placeholder" style="font-size:1.5rem;">⚽</div>`
          }
        </div>
        <div class="sticker-name" style="font-size:0.625rem;">${sticker.name}</div>
        <span class="pack-sticker-label ${isNew ? 'new' : 'duplicate'}">
          ${isNew ? '✨ NOVA!' : '🔁 REPETIDA'}
        </span>
      </div>
    `;
  }).join('');

  overlay.classList.add('active');
}

/**
 * Fechar a revelação do pacotinho
 */
function closePackReveal() {
  const overlay = document.getElementById('pack-overlay');
  if (overlay) overlay.classList.remove('active');
}

// =============================================
// Utilities
// =============================================
function showLoader() {
  const loader = document.getElementById('page-loader');
  const content = document.getElementById('album-content');
  if (loader) loader.style.display = 'flex';
  if (content) content.style.display = 'none';
}

function hideLoader() {
  const loader = document.getElementById('page-loader');
  const content = document.getElementById('album-content');
  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'block';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}
