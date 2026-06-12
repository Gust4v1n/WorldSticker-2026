// =============================================
// Trades Page — Central de Trocas com Realtime
// =============================================

let availableTrades = [];
let myTrades = [];
let catalogStickers = [];
let myCollection = [];
let currentTab = 'available';
let tradeProfile = null;
let realtimeChannel = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;

  tradeProfile = await getCurrentProfile();
  await loadTradesData();
  setupTabs();
  setupTradeModal();
  setupRealtimeSubscription();
  checkUrlParams();
});

/**
 * Carrega dados necessários para a página de trocas
 */
async function loadTradesData() {
  try {
    showTradeLoader();
    const [trades, mine, catalog, collection] = await Promise.all([
      tradesApi.list(),
      tradesApi.my(),
      stickersApi.list(),
      userStickersApi.list()
    ]);

    availableTrades = trades;
    myTrades = mine;
    catalogStickers = catalog;
    myCollection = collection;

    renderTrades();
    hideTradeLoader();
  } catch (error) {
    hideTradeLoader();
    showTradeToast('Erro ao carregar trocas', 'error');
    console.error(error);
  }
}

/**
 * Configura Realtime para atualizações (Removido por segurança, o backend não está expondo web sockets por enquanto)
 */
function setupRealtimeSubscription() {
  // Realtime direto via Supabase foi removido.
  // Atualizações de estado agora acontecem na ação do usuário ou reload.
}

/**
 * Trata atualizações em tempo real
 */
async function handleRealtimeUpdate(payload) {
  showTradeToast('Trocas atualizadas em tempo real! ⚡', 'info');
  await loadTradesData();
}

/**
 * Configura os tabs de filtro
 */
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderTrades();
    });
  });
}

/**
 * Renderiza as trocas baseado no tab ativo
 */
function renderTrades() {
  const listEl = document.getElementById('trades-list');
  if (!listEl) return;

  let trades;
  if (currentTab === 'available') {
    // Trocas pendentes de outros usuários
    trades = availableTrades.filter(t => t.proposer_id !== (tradeProfile && tradeProfile.id));
  } else if (currentTab === 'mine') {
    // Minhas propostas pendentes
    trades = myTrades.filter(t => t.proposer_id === (tradeProfile && tradeProfile.id) && t.status === 'pending');
  } else {
    // Histórico (aceitas e rejeitadas)
    trades = myTrades.filter(t => t.status !== 'pending');
  }

  if (trades.length === 0) {
    const messages = {
      available: { icon: '🔄', title: 'Nenhuma troca disponível', text: 'Seja o primeiro a propor uma troca!' },
      mine: { icon: '📤', title: 'Nenhuma proposta ativa', text: 'Proponha uma troca a partir das suas figurinhas repetidas.' },
      history: { icon: '📜', title: 'Nenhum histórico', text: 'Seu histórico de trocas aparecerá aqui.' }
    };
    const msg = messages[currentTab];
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${msg.icon}</div>
        <div class="empty-state-title">${msg.title}</div>
        <div class="empty-state-text">${msg.text}</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = trades.map(trade => renderTradeCard(trade)).join('');
}

/**
 * Renderiza um card de troca
 */
function renderTradeCard(trade) {
  const proposer = trade.proposer;
  const offered = trade.offered_sticker;
  const wanted = trade.wanted_sticker;
  const isMyTrade = tradeProfile && trade.proposer_id === tradeProfile.id;
  const timeAgo = getTimeAgo(trade.created_at);

  let actions = '';
  if (trade.status === 'pending') {
    if (isMyTrade) {
      actions = `
        <div class="trade-actions">
          <button class="btn btn-danger btn-sm btn-full" onclick="cancelTrade(${trade.id})">
            ✕ Cancelar
          </button>
        </div>
      `;
    } else {
      actions = `
        <div class="trade-actions">
          <button class="btn btn-primary btn-sm" style="flex:2;" onclick="acceptTrade(${trade.id})">
            ✓ Aceitar Troca
          </button>
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="rejectTrade(${trade.id})">
            ✕
          </button>
        </div>
      `;
    }
  }

  const statusBadge = trade.status !== 'pending' 
    ? `<span class="status-badge ${trade.status}">${trade.status === 'accepted' ? '✓ Aceita' : '✕ Rejeitada'}</span>`
    : '';

  return `
    <div class="trade-card">
      <div class="trade-header">
        <div class="trade-user">
          <div class="trade-avatar">${proposer ? proposer.username[0].toUpperCase() : '?'}</div>
          <div>
            <div class="trade-username">${proposer ? proposer.username : 'Usuário'}</div>
            <div class="trade-time">${timeAgo}</div>
          </div>
        </div>
        ${statusBadge}
      </div>
      <div class="trade-exchange">
        <div class="trade-sticker-mini">
          <div style="font-size:0.5625rem; color:var(--color-text-muted); margin-bottom:4px; text-transform:uppercase; font-weight:600;">Oferece</div>
          ${offered.image_url 
            ? `<img class="trade-sticker-mini-img" src="${offered.image_url}" alt="${offered.name}">` 
            : `<div class="trade-sticker-mini-placeholder">⚽</div>`
          }
          <div class="trade-sticker-mini-name">${offered.name}</div>
          <div class="trade-sticker-mini-team">${offered.team}</div>
        </div>
        <div class="trade-arrow">⇄</div>
        <div class="trade-sticker-mini">
          <div style="font-size:0.5625rem; color:var(--color-text-muted); margin-bottom:4px; text-transform:uppercase; font-weight:600;">Quer</div>
          ${wanted.image_url 
            ? `<img class="trade-sticker-mini-img" src="${wanted.image_url}" alt="${wanted.name}">` 
            : `<div class="trade-sticker-mini-placeholder">⚽</div>`
          }
          <div class="trade-sticker-mini-name">${wanted.name}</div>
          <div class="trade-sticker-mini-team">${wanted.team}</div>
        </div>
      </div>
      ${actions}
    </div>
  `;
}

// =============================================
// Trade Actions
// =============================================

async function acceptTrade(tradeId) {
  try {
    await tradesApi.accept(tradeId);
    showTradeToast('Troca realizada com sucesso! 🎉', 'success');
    await loadTradesData();
  } catch (error) {
    showTradeToast(error.message || 'Erro ao aceitar troca', 'error');
  }
}

async function rejectTrade(tradeId) {
  try {
    await tradesApi.reject(tradeId);
    showTradeToast('Troca rejeitada', 'info');
    await loadTradesData();
  } catch (error) {
    showTradeToast(error.message || 'Erro ao rejeitar troca', 'error');
  }
}

async function cancelTrade(tradeId) {
  try {
    await tradesApi.cancel(tradeId);
    showTradeToast('Troca cancelada', 'info');
    await loadTradesData();
  } catch (error) {
    showTradeToast(error.message || 'Erro ao cancelar troca', 'error');
  }
}

// =============================================
// Trade Modal — Propor nova troca
// =============================================

function setupTradeModal() {
  const openBtn = document.getElementById('new-trade-btn');
  const closeBtn = document.getElementById('modal-close-btn');
  const overlay = document.getElementById('trade-modal');
  const form = document.getElementById('trade-form');

  if (openBtn) openBtn.addEventListener('click', openTradeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeTradeModal);
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeTradeModal();
  });
  if (form) form.addEventListener('submit', submitTrade);
}

function openTradeModal() {
  const modal = document.getElementById('trade-modal');
  if (!modal) return;

  // Popular selects com figurinhas
  populateOfferSelect();
  populateWantedSelect();

  modal.classList.add('active');
}

function closeTradeModal() {
  const modal = document.getElementById('trade-modal');
  if (modal) modal.classList.remove('active');
}

function populateOfferSelect() {
  const select = document.getElementById('offer-select');
  if (!select) return;

  // Apenas figurinhas com quantity > 1 (repetidas)
  const dupes = myCollection.filter(us => us.quantity > 1);

  select.innerHTML = '<option value="">Selecione uma figurinha...</option>' +
    dupes.map(us => {
      const s = us.sticker;
      return `<option value="${s.id}">#${s.number} ${s.name} (${s.team}) — x${us.quantity - 1} extra</option>`;
    }).join('');
}

function populateWantedSelect() {
  const select = document.getElementById('wanted-select');
  if (!select) return;

  // Figurinhas que o usuário NÃO tem
  const ownedIds = new Set(myCollection.filter(us => us.quantity > 0).map(us => us.sticker_id));
  const missing = catalogStickers.filter(s => !ownedIds.has(s.id));

  select.innerHTML = '<option value="">Selecione uma figurinha...</option>' +
    missing.map(s => {
      return `<option value="${s.id}">#${s.number} ${s.name} (${s.team})</option>`;
    }).join('');
}

async function submitTrade(e) {
  e.preventDefault();

  const offeredId = document.getElementById('offer-select').value;
  const wantedId = document.getElementById('wanted-select').value;

  if (!offeredId || !wantedId) {
    showTradeToast('Selecione as figurinhas para a troca', 'error');
    return;
  }

  try {
    await tradesApi.create({
      offered_sticker_id: parseInt(offeredId),
      wanted_sticker_id: parseInt(wantedId)
    });
    showTradeToast('Proposta de troca criada! 🔄', 'success');
    closeTradeModal();
    await loadTradesData();
  } catch (error) {
    showTradeToast(error.message || 'Erro ao criar proposta', 'error');
  }
}

/**
 * Verifica parâmetros da URL (vindo da página de repetidas)
 */
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get('offer');

  if (offerId) {
    // Abrir modal com a figurinha já selecionada
    setTimeout(() => {
      openTradeModal();
      const select = document.getElementById('offer-select');
      if (select) select.value = offerId;
    }, 500);
  }
}

// =============================================
// Utilities
// =============================================

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function showTradeLoader() {
  const loader = document.getElementById('page-loader');
  const content = document.getElementById('trades-content');
  if (loader) loader.style.display = 'flex';
  if (content) content.style.display = 'none';
}

function hideTradeLoader() {
  const loader = document.getElementById('page-loader');
  const content = document.getElementById('trades-content');
  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'block';
}

function showTradeToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

// Cleanup ao sair da página (realtime removido)
