import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.182.0/three.module.min.js";

const STORAGE_KEY = 'bezi-gift-wheel-october-v1';
const SAVE_VERSION = 1;
const GIFT_COUNT = 500;
const WHEEL_SEGMENT_COUNT = 28;
const FREE_SPIN_SEGMENT_COUNT = 4;
const GIFT_SEGMENT_COUNT = WHEEL_SEGMENT_COUNT - FREE_SPIN_SEGMENT_COUNT;
const FULL_TURN = Math.PI * 2;
const SPIN_DURATION_MS = 6200;
const RARITIES = [
  { id: 'common', label: 'Commun', count: 200, challenges: 3, color: '#89d16c', palette: ['#7fb85f', '#93d875', '#6da74e'] },
  { id: 'rare', label: 'Rare', count: 120, challenges: 5, color: '#70baff', palette: ['#4b8fcf', '#6ebcf2', '#4785c0'] },
  { id: 'epic', label: 'Épique', count: 80, challenges: 7, color: '#b58af7', palette: ['#8560c2', '#b18af0', '#704eb1'] },
  { id: 'legendary', label: 'Légendaire', count: 50, challenges: 10, color: '#ffa64f', palette: ['#d77c34', '#f2a64c', '#ba612b'] },
  { id: 'mythic', label: 'Mythique', count: 30, challenges: 15, color: '#ff686b', palette: ['#c84450', '#f56870', '#a82e42'] },
  { id: 'secret', label: 'Secret', count: 20, challenges: 20, color: '#fa86d0', palette: ['#bf69c6', '#ef8bcb', '#8c62d8'] }
];
const SPIN_REWARDS = [
  { id: 'spin-1', label: '+1 tour', amount: 1, color: '#f6cf83' },
  { id: 'spin-2', label: '+2 tours', amount: 2, color: '#f5ad63' },
  { id: 'spin-5', label: '+5 tours', amount: 5, color: '#db91ea' },
  { id: 'spin-10', label: '+10 tours', amount: 10, color: '#83d9da' }
];
const SHOP_OFFERS = [
  { spins: 1, coins: 10 }, { spins: 5, coins: 45 }, { spins: 10, coins: 80 },
  { spins: 25, coins: 180 }, { spins: 50, coins: 300 }, { spins: 100, coins: 500 }
];
const NAME_PARTS = ['Brume', 'Lueur', 'Velours', 'Éclat', 'Mystère', 'Minuit', 'Cendre', 'Lune', 'Sortilège', 'Épice', 'Fronde', 'Nocturne', 'Sorcier', 'Cristal', 'Citrouille', 'Rêve', 'Flamme', 'Ombre', 'Étoile', 'Potion'];
const GIFT_TYPES = ['citrouille', 'chat', 'fantôme', 'chauve-souris', 'chapeau', 'potion', 'lanterne', 'cristal', 'corbeau', 'araignée', 'bougie', 'masque', 'grimoire', 'bonbon', 'chaudron', 'hibou', 'lune', 'étoile', 'sorcier', 'toile'];
const GIFT_ICONS = ['🎃', '🐈‍⬛', '👻', '🦇', '🧙', '🧪', '🏮', '🔮', '🐦‍⬛', '🕷️', '🕯️', '🎭', '📜', '🍬', '⚗️', '🦉', '🌙', '✨', '🪄', '🕸️'];
const VARIANTS = ['Dorée', 'Spectrale', 'Holographique', 'Lunaire'];
const CHALLENGE_TEMPLATES = ['spins', 'coins', 'gifts', 'rarity', 'variants'];
const RARITY_BY_ID = new Map(RARITIES.map(rarity => [rarity.id, rarity]));
const RARITY_SYMBOLS = { common: '🟢', rare: '🔵', epic: '🟣', legendary: '🟠', mythic: '🔴', secret: '🌈' };
const gifts = buildGiftCatalog();
const giftById = new Map(gifts.map(gift => [gift.id, gift]));
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const dom = {
  canvas: document.querySelector('#gameCanvas'),
  spinButton: document.querySelector('#spinButton'),
  coinCount: document.querySelector('#coinCount'),
  spinCount: document.querySelector('#spinCount'),
  collectionCount: document.querySelector('#collectionCount'),
  miniCollection: document.querySelector('#miniCollection'),
  collectionBadge: document.querySelector('#collectionBadge'),
  collectionProgress: document.querySelector('#collectionProgress'),
  shopCoins: document.querySelector('#shopCoins'),
  spinButtonHint: document.querySelector('#spinButtonHint'),
  spinStatus: document.querySelector('#spinStatus'),
  raritySummary: document.querySelector('#raritySummary'),
  collectionGrid: document.querySelector('#collectionGrid'),
  collectionResults: document.querySelector('#collectionResults'),
  rarityFilters: document.querySelector('#rarityFilters'),
  selectedTitle: document.querySelector('#selectedTitle'),
  giftDetail: document.querySelector('#giftDetail'),
  challengeGrid: document.querySelector('#challengeGrid'),
  challengeRarity: document.querySelector('#challengeRarity'),
  challengeResults: document.querySelector('#challengeResults'),
  challengeCount: document.querySelector('#challengeCount'),
  challengeOverview: document.querySelector('#challengeOverview'),
  shopOffers: document.querySelector('#shopOffers'),
  musicToggle: document.querySelector('#musicToggle'),
  soundToggle: document.querySelector('#soundToggle'),
  effectsToggle: document.querySelector('#effectsToggle'),
  fullscreenButton: document.querySelector('#fullscreenButton'),
  welcomeModal: document.querySelector('#welcomeModal'),
  startGameButton: document.querySelector('#startGameButton'),
  rewardModal: document.querySelector('#rewardModal'),
  rewardCard: document.querySelector('.reward-card'),
  rewardHalo: document.querySelector('#rewardHalo'),
  rewardEyebrow: document.querySelector('#rewardEyebrow'),
  rewardTitle: document.querySelector('#rewardTitle'),
  rewardObject: document.querySelector('#rewardObject'),
  rewardName: document.querySelector('#rewardName'),
  rewardRarity: document.querySelector('#rewardRarity'),
  rewardFlavor: document.querySelector('#rewardFlavor'),
  closeRewardButton: document.querySelector('#closeRewardButton'),
  toast: document.querySelector('#toast'),
  backToGrid: document.querySelector('#backToGrid')
};

let state = loadState();
let currentView = 'wheel';
let collectionRarity = 'all';
let selectedGiftId = null;
let isSpinning = false;
let spinFrame = 0;
let spinStartedAt = 0;
let spinStartRotation = state.rotation;
let spinTargetRotation = state.rotation;
let lastTickIndex = null;
let currentOutcome = null;
let recoveredOutcome = null;
let wheelRenderer;
let wheelAvailable = false;
let wheelScene;
let wheelCamera;
let wheelGroup;
let wheelSegments = [];
let wheelSegmentMeshes = [];
let ambientObjects = [];
let wheelResizeObserver;
let lastFrameTime = 0;
let toastTimeout = 0;
let audioContext = null;
let musicGain = null;
let musicNodes = [];
let previewRenderer = null;
let previewScene = null;
let previewCamera = null;
let previewModel = null;
let previewCanvas = null;
let previewFrame = 0;
let previewResizeObserver = null;
let previewPointer = null;
let previewDrag = null;

function buildGiftCatalog() {
  const catalog = [];
  let globalIndex = 0;
  RARITIES.forEach((rarity, rarityIndex) => {
    for (let index = 0; index < rarity.count; index += 1) {
      const word = NAME_PARTS[(index + rarityIndex * 3) % NAME_PARTS.length];
      const typeIndex = (index * 7 + rarityIndex * 5) % GIFT_TYPES.length;
      const number = String(index + 1).padStart(3, '0');
      const hueOffset = ((index * 11 + rarityIndex * 17) % 31) - 15;
      const baseColor = new THREE.Color(rarity.palette[index % rarity.palette.length]);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      baseColor.setHSL((hsl.h + hueOffset / 360 + 1) % 1, hsl.s, Math.max(.3, Math.min(.72, hsl.l + ((index % 5) - 2) * .018)));
      catalog.push({
        id: `${rarity.id}-${number}`,
        rarityId: rarity.id,
        name: `${word} ${GIFT_TYPES[typeIndex]} ${number}`,
        icon: GIFT_ICONS[typeIndex],
        designIndex: globalIndex,
        color: `#${baseColor.getHexString()}`,
        description: `Un trésor ${rarity.label.toLowerCase()} de l'Édition Octobre, façonné autour d'un motif ${GIFT_TYPES[typeIndex]}.`,
        rarityIndex
      });
      globalIndex += 1;
    }
  });
  if (catalog.length !== GIFT_COUNT) throw new Error(`Le catalogue doit contenir ${GIFT_COUNT} cadeaux.`);
  return catalog;
}

function snapshotStats(source = state.stats) {
  return {
    totalSpins: source.totalSpins,
    coinsEarned: source.coinsEarned,
    giftsWon: source.giftsWon,
    variantsFound: source.variantsFound,
    rarityWins: Object.fromEntries(RARITIES.map(rarity => [rarity.id, source.rarityWins[rarity.id] || 0]))
  };
}

function createInitialState() {
  return {
    version: SAVE_VERSION,
    event: 'october-halloween',
    coins: 0,
    spins: 5,
    owned: {},
    challengeClaims: {},
    pendingOutcome: null,
    stats: { totalSpins: 0, coinsEarned: 0, giftsWon: 0, variantsFound: 0, rarityWins: Object.fromEntries(RARITIES.map(rarity => [rarity.id, 0])) },
    settings: { music: false, sound: true, effects: true, fullscreen: false },
    welcomeSeen: false,
    rotation: 0
  };
}

function safeInteger(value, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, maximum) : fallback;
}

function validatePendingOutcome(pending, owned) {
  if (!pending || typeof pending !== 'object') return null;
  if (pending.type === 'gift' && typeof pending.giftId === 'string' && giftById.has(pending.giftId) && !owned[pending.giftId]) {
    return { type: 'gift', giftId: pending.giftId, variant: VARIANTS.includes(pending.variant) ? pending.variant : null };
  }
  if (pending.type === 'spin' && SPIN_REWARDS.some(reward => reward.id === pending.rewardId)) return { type: 'spin', rewardId: pending.rewardId };
  if (pending.type === 'coins') return { type: 'coins' };
  return null;
}

function loadState() {
  const fresh = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || saved.version !== SAVE_VERSION || saved.event !== fresh.event) return fresh;
    const stats = saved.stats && typeof saved.stats === 'object' ? saved.stats : {};
    const rarityWins = Object.fromEntries(RARITIES.map(rarity => [rarity.id, safeInteger(stats.rarityWins?.[rarity.id]) ]));
    const owned = {};
    if (saved.owned && typeof saved.owned === 'object' && !Array.isArray(saved.owned)) {
      for (const [id, rawRecord] of Object.entries(saved.owned)) {
        const gift = giftById.get(id);
        if (!gift || !rawRecord || typeof rawRecord !== 'object') continue;
        const variant = VARIANTS.includes(rawRecord.variant) ? rawRecord.variant : null;
        const baseline = rawRecord.baseline && typeof rawRecord.baseline === 'object' ? rawRecord.baseline : {};
        owned[id] = {
          variant,
          acquiredAt: safeInteger(rawRecord.acquiredAt),
          baseline: {
            totalSpins: safeInteger(baseline.totalSpins),
            coinsEarned: safeInteger(baseline.coinsEarned),
            giftsWon: safeInteger(baseline.giftsWon),
            variantsFound: safeInteger(baseline.variantsFound),
            rarityWins: Object.fromEntries(RARITIES.map(rarity => [rarity.id, safeInteger(baseline.rarityWins?.[rarity.id])]))
          }
        };
      }
    }
    const challengeClaims = {};
    if (saved.challengeClaims && typeof saved.challengeClaims === 'object' && !Array.isArray(saved.challengeClaims)) {
      for (const [id, claimed] of Object.entries(saved.challengeClaims)) {
        const match = /^(common|rare|epic|legendary|mythic|secret)-\d{3}-\d{1,2}$/.exec(id);
        const giftId = match ? id.slice(0, id.lastIndexOf('-')) : '';
        const challengeIndex = match ? Number(id.slice(id.lastIndexOf('-') + 1)) : -1;
        const gift = giftById.get(giftId);
        const rarity = gift && RARITY_BY_ID.get(gift.rarityId);
        if (claimed === true && rarity && challengeIndex >= 0 && challengeIndex < rarity.challenges) challengeClaims[id] = true;
      }
    }
    return {
      ...fresh,
      coins: safeInteger(saved.coins, 0, 1_000_000_000_000),
      spins: safeInteger(saved.spins, 0, 1_000_000),
      owned,
      challengeClaims,
      pendingOutcome: validatePendingOutcome(saved.pendingOutcome, owned),
      stats: {
        totalSpins: safeInteger(stats.totalSpins),
        coinsEarned: safeInteger(stats.coinsEarned),
        giftsWon: safeInteger(stats.giftsWon),
        variantsFound: safeInteger(stats.variantsFound),
        rarityWins
      },
      settings: {
        music: saved.settings?.music === true,
        sound: saved.settings?.sound !== false,
        effects: saved.settings?.effects !== false,
        fullscreen: saved.settings?.fullscreen === true
      },
      welcomeSeen: saved.welcomeSeen === true,
      rotation: Number.isFinite(saved.rotation) ? saved.rotation % FULL_TURN : 0
    };
  } catch (_) {
    return fresh;
  }
}

function publicState() {
  return {
    event: state.event,
    coins: state.coins,
    spins: state.spins,
    collection: Object.entries(state.owned).map(([id, record]) => ({ id, variant: record.variant })),
    collectionCount: Object.keys(state.owned).length,
    totalGifts: GIFT_COUNT,
    completedChallenges: Object.keys(state.challengeClaims).length,
    settings: { ...state.settings },
    stats: snapshotStats()
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    showToast('La progression reste active pour cette session, mais le stockage du navigateur est indisponible.');
  }
  const bezi = window.Bezi;
  if (bezi && typeof bezi.setData === 'function') {
    try { bezi.setData(publicState()); } catch (_) { /* Le jeu ne dépend pas de l'hôte Bezi. */ }
  }
}

function registerDataRequest() {
  const bezi = window.Bezi;
  if (bezi && typeof bezi.onDataRequest === 'function') {
    try { bezi.onDataRequest(() => publicState()); } catch (_) { /* Le pont Bezi est facultatif. */ }
  }
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = text;
  return node;
}

function rarityColor(rarityId) {
  return RARITY_BY_ID.get(rarityId)?.color ?? '#ffd087';
}

function ownedCount(rarityId = null) {
  if (!rarityId) return Object.keys(state.owned).length;
  return Object.keys(state.owned).reduce((count, id) => count + (giftById.get(id)?.rarityId === rarityId ? 1 : 0), 0);
}

function remainingGifts() {
  return gifts.filter(gift => !state.owned[gift.id]);
}

function renderWallet() {
  const count = ownedCount();
  dom.coinCount.textContent = state.coins.toLocaleString('fr-FR');
  dom.spinCount.textContent = state.spins.toLocaleString('fr-FR');
  dom.collectionCount.textContent = `${count} / ${GIFT_COUNT}`;
  dom.miniCollection.textContent = `${count} / ${GIFT_COUNT}`;
  dom.collectionBadge.textContent = `${count} / ${GIFT_COUNT}`;
  dom.collectionProgress.textContent = `${count} / ${GIFT_COUNT}`;
  dom.shopCoins.textContent = state.coins.toLocaleString('fr-FR');
  dom.spinButtonHint.textContent = state.spins > 0 ? `${state.spins} ${state.spins === 1 ? 'TOUR DISPONIBLE' : 'TOURS DISPONIBLES'}` : 'ACHÈTE DES TOURS';
  dom.spinButton.disabled = isSpinning || state.spins <= 0 || !wheelAvailable;
  const spinTitle = dom.spinButton.querySelector('strong');
  if (spinTitle) spinTitle.textContent = isSpinning ? 'EN COURS' : 'TOURNER';
  dom.spinButton.setAttribute('aria-label', isSpinning ? 'La roue tourne' : state.spins > 0 ? `Tourner la roue, ${state.spins} tours disponibles` : 'Plus de tours disponibles');
  dom.spinStatus.textContent = !wheelAvailable ? 'WEBGL INDISPONIBLE' : isSpinning ? 'LA ROUE TOURNE' : state.spins > 0 ? 'PRÊTE À TOURNER' : 'ACHÈTE DES TOURS';
}

function renderRaritySummary() {
  dom.raritySummary.replaceChildren();
  for (const rarity of RARITIES) {
    const won = ownedCount(rarity.id);
    const row = el('div', 'rarity-line');
    row.style.setProperty('--rarity', rarity.color);
    const dot = el('span', 'rarity-dot');
    const label = el('span', '', rarity.label);
    const count = el('strong', '', `${won} / ${rarity.count}`);
    const track = el('div', 'rarity-track');
    const progress = el('i');
    progress.style.setProperty('--progress', `${won / rarity.count * 100}%`);
    track.append(progress);
    row.append(dot, label, count, track);
    dom.raritySummary.append(row);
  }
}

function buildCollectionFilters() {
  dom.rarityFilters.replaceChildren();
  const options = [{ id: 'all', label: 'Tous' }, ...RARITIES.map(rarity => ({ id: rarity.id, label: rarity.label }))];
  for (const option of options) {
    const button = el('button', 'filter-button', option.label);
    button.type = 'button';
    button.dataset.rarity = option.id;
    button.addEventListener('click', () => {
      collectionRarity = option.id;
      renderCollection();
    });
    dom.rarityFilters.append(button);
  }
}

function renderCollection() {
  const filtered = collectionRarity === 'all' ? gifts : gifts.filter(gift => gift.rarityId === collectionRarity);
  dom.collectionGrid.replaceChildren();
  for (const gift of filtered) {
    const owned = state.owned[gift.id];
    const rarity = RARITY_BY_ID.get(gift.rarityId);
    const card = el('button', `gift-card${owned ? '' : ' locked'}`);
    card.type = 'button';
    card.style.setProperty('--rarity', rarity.color);
    card.setAttribute('aria-label', owned ? `${gift.name}, ${rarity.label}${owned.variant ? `, variante ${owned.variant}` : ''}` : `Cadeau non découvert, rareté ${rarity.label}`);
    const icon = el('span', 'gift-emoji', owned ? gift.icon : '🎁');
    const name = el('strong', '', owned ? gift.name : 'À découvrir');
    const rarityLabel = el('small', '', rarity.label);
    card.append(icon, name, rarityLabel);
    if (!owned) card.append(el('span', 'gift-lock', '🔒'));
    card.addEventListener('click', () => {
      if (!owned) {
        showToast('Ce cadeau reste mystérieux. Tourne la roue pour le découvrir.');
        return;
      }
      selectedGiftId = gift.id;
      renderGiftDetail(gift.id);
      const sidePanel = document.querySelector('[data-side="collection"]');
      sidePanel?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
    dom.collectionGrid.append(card);
  }
  dom.collectionResults.textContent = `${filtered.length} cadeaux affichés · ${ownedCount()} obtenus`;
  for (const button of dom.rarityFilters.querySelectorAll('.filter-button')) {
    button.classList.toggle('active', button.dataset.rarity === collectionRarity);
    const rarity = RARITY_BY_ID.get(button.dataset.rarity);
    if (rarity) button.style.setProperty('--rarity', rarity.color);
  }
}

function renderGiftDetail(giftId) {
  const gift = giftById.get(giftId);
  const record = state.owned[giftId];
  if (!gift || !record) return;
  const rarity = RARITY_BY_ID.get(gift.rarityId);
  dom.selectedTitle.textContent = gift.name;
  dom.giftDetail.replaceChildren();
  const detail = el('div', 'detail-preview');
  detail.style.setProperty('--rarity', rarity.color);
  const modelCanvas = el('canvas', 'gift-model-canvas');
  modelCanvas.setAttribute('aria-label', `Modèle 3D manipulable : ${gift.name}`);
  const title = el('h3', '', gift.name);
  const rarityLabel = el('span', 'detail-rarity', rarity.label);
  const variantLine = el('p', '', record.variant ? `Variante : ${record.variant}. Fais glisser le modèle pour l'observer.` : 'Modèle 3D : fais glisser pour le faire tourner.');
  const description = el('p', '', gift.description);
  detail.append(modelCanvas, title, rarityLabel, variantLine, description);
  dom.giftDetail.append(detail);
  mountGiftPreview(gift, modelCanvas, record.variant);
}

function challengeId(gift, index) {
  return `${gift.id}-${index}`;
}

function challengeFor(gift, index) {
  const type = CHALLENGE_TEMPLATES[index % CHALLENGE_TEMPLATES.length];
  const record = state.owned[gift.id];
  const baseline = record?.baseline ?? snapshotStats();
  const step = Math.floor(index / CHALLENGE_TEMPLATES.length);
  if (type === 'spins') {
    const goal = 2 + step * 2;
    return { type, goal, progress: Math.min(goal, Math.max(0, state.stats.totalSpins - baseline.totalSpins)), title: `Série de rotations · ${goal}`, description: `Tourne la roue ${goal} fois après avoir découvert ce cadeau.`, rewardCoins: 8 + step * 2, rewardSpins: 0 };
  }
  if (type === 'coins') {
    const goal = 5 + step * 5;
    return { type, goal, progress: Math.min(goal, Math.max(0, state.stats.coinsEarned - baseline.coinsEarned)), title: `Réserve de pièces · ${goal}`, description: `Gagne ${goal} pièces après la découverte de ce cadeau.`, rewardCoins: 0, rewardSpins: 1 + (step > 2 ? 1 : 0) };
  }
  if (type === 'gifts') {
    const goal = 1 + (step % 3);
    return { type, goal, progress: Math.min(goal, Math.max(0, state.stats.giftsWon - baseline.giftsWon)), title: `Nouvelles découvertes · ${goal}`, description: `Obtiens ${goal} autre${goal > 1 ? 's' : ''} cadeau${goal > 1 ? 'x' : ''}.`, rewardCoins: 10 + step * 2, rewardSpins: 0 };
  }
  if (type === 'rarity') {
    const targetRarity = RARITIES[(gift.rarityIndex + index + 1) % RARITIES.length];
    const goal = 1 + (step % 2);
    const baselineWins = baseline.rarityWins?.[targetRarity.id] ?? 0;
    const currentWins = state.stats.rarityWins[targetRarity.id] ?? 0;
    return { type, targetRarity: targetRarity.id, goal, progress: Math.min(goal, Math.max(0, currentWins - baselineWins)), title: `Trouvaille ${targetRarity.label.toLowerCase()}`, description: `Obtiens ${goal} cadeau${goal > 1 ? 'x' : ''} de rareté ${targetRarity.label.toLowerCase()}.`, rewardCoins: 12 + step * 2, rewardSpins: 0 };
  }
  const goal = 1 + (step > 1 ? 1 : 0);
  return { type, goal, progress: Math.min(goal, Math.max(0, state.stats.variantsFound - baseline.variantsFound)), title: `Chasse aux variantes · ${goal}`, description: `Découvre ${goal} variante${goal > 1 ? 's' : ''} rare${goal > 1 ? 's' : ''}.`, rewardCoins: 15 + step * 3, rewardSpins: 1 };
}

function listOwnedChallenges(rarityFilter = 'all') {
  const result = [];
  for (const [giftId, record] of Object.entries(state.owned)) {
    const gift = giftById.get(giftId);
    const rarity = gift && RARITY_BY_ID.get(gift.rarityId);
    if (!gift || !rarity || (rarityFilter !== 'all' && gift.rarityId !== rarityFilter)) continue;
    for (let index = 0; index < rarity.challenges; index += 1) {
      result.push({ id: challengeId(gift, index), gift, index, challenge: challengeFor(gift, index), claimed: state.challengeClaims[challengeId(gift, index)] === true });
    }
  }
  return result;
}

function renderChallenges() {
  const filter = dom.challengeRarity.value || 'all';
  const challenges = listOwnedChallenges(filter);
  const completed = Object.keys(state.challengeClaims).length;
  dom.challengeCount.textContent = String(completed);
  dom.challengeGrid.replaceChildren();
  let claimable = 0;
  if (!challenges.length) dom.challengeGrid.append(el('div', 'detail-empty', 'Découvre un cadeau dans la roue pour débloquer ses défis spéciaux.'));
  for (const item of challenges) {
    const { gift, challenge, id, claimed } = item;
    const ready = !claimed && challenge.progress >= challenge.goal;
    if (ready) claimable += 1;
    const card = el('article', 'challenge-card');
    card.style.setProperty('--rarity', rarityColor(gift.rarityId));
    card.append(el('h3', '', challenge.title), el('span', 'challenge-gift', `${gift.icon} ${gift.name}`), el('p', '', challenge.description));
    const track = el('div', 'challenge-progress-track');
    const fill = el('i');
    fill.style.setProperty('--progress', `${Math.min(100, challenge.progress / challenge.goal * 100)}%`);
    track.append(fill);
    card.append(track);
    const bottom = el('div', 'challenge-bottom');
    const rewardText = `${challenge.rewardCoins ? `${challenge.rewardCoins} 🪙` : ''}${challenge.rewardCoins && challenge.rewardSpins ? ' · ' : ''}${challenge.rewardSpins ? `${challenge.rewardSpins} 🎡` : ''}`;
    bottom.append(el('small', '', `${claimed ? '✓ Récupéré' : `${challenge.progress} / ${challenge.goal}`} · ${rewardText}`));
    if (claimed) bottom.append(el('span', 'claimed', '✓ TERMINÉ'));
    else {
      const claimButton = el('button', 'secondary-button', ready ? 'RÉCUPÉRER' : 'EN COURS');
      claimButton.type = 'button';
      claimButton.disabled = !ready;
      claimButton.addEventListener('click', () => claimChallenge(id));
      bottom.append(claimButton);
    }
    card.append(bottom);
    dom.challengeGrid.append(card);
  }
  dom.challengeResults.textContent = `${challenges.length} défis · ${claimable} récompense${claimable === 1 ? '' : 's'} disponible${claimable === 1 ? '' : 's'}`;
  dom.challengeGrid.hidden = false;
  renderChallengeOverview();
}

function renderChallengeOverview() {
  dom.challengeOverview.replaceChildren();
  for (const rarity of RARITIES) {
    const tile = el('div');
    tile.style.setProperty('--rarity', rarity.color);
    const count = ownedCount(rarity.id);
    tile.append(el('b', '', `${rarity.label} · ${rarity.challenges} défis/cadeau`));
    tile.append(el('small', '', `${count} cadeau${count === 1 ? '' : 'x'} obtenu${count === 1 ? '' : 's'} · ${count * rarity.challenges} défis ouverts`));
    dom.challengeOverview.append(tile);
  }
}

function buildChallengeFilters() {
  dom.challengeRarity.replaceChildren();
  const allOption = el('option', '', 'Toutes les raretés');
  allOption.value = 'all';
  dom.challengeRarity.append(allOption);
  for (const rarity of RARITIES) {
    const option = el('option', '', rarity.label);
    option.value = rarity.id;
    dom.challengeRarity.append(option);
  }
}

function renderShop() {
  dom.shopOffers.replaceChildren();
  for (const offer of SHOP_OFFERS) {
    const row = el('div', 'shop-offer');
    const detail = el('div');
    detail.append(el('strong', '', `${offer.spins} ${offer.spins === 1 ? 'tour' : 'tours'}`), el('small', '', `${offer.coins} pièces`));
    const button = el('button', 'secondary-button', 'ACHETER');
    button.type = 'button';
    button.disabled = state.coins < offer.coins;
    button.addEventListener('click', () => buySpins(offer));
    row.append(detail, button);
    dom.shopOffers.append(row);
  }
}

function setView(view) {
  if (view !== 'collection' && currentView === 'collection' && dom.rewardModal.hidden) disposeGiftPreview();
  currentView = view;
  document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('[data-side]').forEach(card => { card.hidden = card.dataset.side !== view; });
  document.querySelectorAll('.content-screen').forEach(screen => { screen.hidden = screen.dataset.screen !== view; });
  if (view === 'collection') {
    renderCollection();
    if (selectedGiftId) renderGiftDetail(selectedGiftId);
  }
  if (view === 'challenges') renderChallenges();
  if (view === 'shop') renderShop();
}

function renderSettings() {
  dom.musicToggle.checked = state.settings.music;
  dom.soundToggle.checked = state.settings.sound;
  dom.effectsToggle.checked = state.settings.effects;
  dom.fullscreenButton.textContent = document.fullscreenElement ? 'DÉSACTIVER' : 'ACTIVER';
}

function render() {
  renderWallet();
  renderRaritySummary();
  renderSettings();
  setView(currentView);
  dom.welcomeModal.hidden = state.welcomeSeen;
  if (!state.welcomeSeen) document.body.classList.add('busy');
  else if (dom.rewardModal.hidden) document.body.classList.remove('busy');
}

function makeWheelSegments() {
  const available = remainingGifts();
  if (!available.length) {
    return [
      ...Array.from({ length: GIFT_SEGMENT_COUNT }, (_, index) => ({ kind: 'coins', label: '+1 pièce', color: '#bb823f', rarityId: null, slot: index, symbol: '🪙' })),
      ...SPIN_REWARDS.map(reward => ({ kind: 'spins', label: reward.label, color: reward.color, rewardId: reward.id, amount: reward.amount, symbol: '🎡' }))
    ];
  }
  const counts = RARITIES.map(rarity => ({ rarity, count: available.reduce((sum, gift) => sum + (gift.rarityId === rarity.id ? 1 : 0), 0), slots: 0, fraction: 0 }));
  const active = counts.filter(entry => entry.count > 0);
  for (const entry of active) entry.slots = 1;
  let slotsLeft = GIFT_SEGMENT_COUNT - active.length;
  const weightTotal = active.reduce((sum, entry) => sum + entry.count, 0);
  for (const entry of active) {
    const quota = slotsLeft * entry.count / weightTotal;
    const whole = Math.floor(quota);
    entry.slots += whole;
    entry.fraction = quota - whole;
  }
  let assigned = active.reduce((sum, entry) => sum + entry.slots, 0);
  while (assigned < GIFT_SEGMENT_COUNT) {
    const best = active.reduce((winner, entry) => !winner || entry.fraction > winner.fraction ? entry : winner, null);
    best.slots += 1;
    best.fraction = -1;
    assigned += 1;
  }
  let giftSlots = [];
  for (const entry of active) {
    for (let index = 0; index < entry.slots; index += 1) {
      giftSlots.push({ kind: 'gift', label: entry.rarity.label, rarityId: entry.rarity.id, color: entry.rarity.color, symbol: RARITY_SYMBOLS[entry.rarity.id] });
    }
  }
  giftSlots = seededShuffle(giftSlots, state.stats.totalSpins + Object.keys(state.owned).length + 47);
  const spinSlots = SPIN_REWARDS.map(reward => ({ kind: 'spins', label: reward.label, color: reward.color, rewardId: reward.id, amount: reward.amount, symbol: '🎡' }));
  const result = [];
  for (let index = 0; index < WHEEL_SEGMENT_COUNT; index += 1) {
    if (index % 7 === 3) result.push(spinSlots[(index + state.stats.totalSpins) % spinSlots.length]);
    else result.push(giftSlots.shift() ?? { kind: 'coins', label: '+1 pièce', color: '#bb823f', symbol: '🪙' });
  }
  return result;
}

function seededShuffle(items, seed) {
  const result = items.slice();
  let value = seed >>> 0;
  const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function makeSectorGeometry(start, end, radius, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(radius * Math.cos(start), radius * Math.sin(start));
  shape.absarc(0, 0, radius, start, end, false);
  shape.lineTo(0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .025, bevelSize: .018, bevelSegments: 2, curveSegments: 5 });
  geometry.translate(0, 0, -.01);
  return geometry;
}

function addPumpkin(parent, angle, radius, size = 1) {
  const pumpkin = new THREE.Group();
  const orange = new THREE.MeshStandardMaterial({ color: '#ef8139', roughness: .55, emissive: '#8a3114', emissiveIntensity: .14 });
  const ribGeometry = new THREE.SphereGeometry(.14 * size, 12, 10);
  for (let rib = 0; rib < 6; rib += 1) {
    const segment = new THREE.Mesh(ribGeometry, orange);
    segment.scale.set(.72, 1, .72);
    segment.rotation.z = rib * Math.PI / 3;
    segment.position.x = Math.cos(rib * Math.PI / 3) * .07 * size;
    segment.position.y = Math.sin(rib * Math.PI / 3) * .06 * size;
    pumpkin.add(segment);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035 * size, .05 * size, .13 * size, 7), new THREE.MeshStandardMaterial({ color: '#678549', roughness: .8 }));
  stem.position.y = .16 * size;
  pumpkin.add(stem);
  pumpkin.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, .22);
  pumpkin.rotation.z = angle;
  parent.add(pumpkin);
}

function addCandle(parent, angle, radius) {
  const candle = new THREE.Group();
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.075, .09, .34, 12), new THREE.MeshStandardMaterial({ color: '#e7cda5', roughness: .82 }));
  candle.add(wax);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.065, .17, 10), new THREE.MeshStandardMaterial({ color: '#ffb23f', emissive: '#ff5a19', emissiveIntensity: 1.3, roughness: .3 }));
  flame.position.y = .24;
  candle.add(flame);
  candle.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, .22);
  candle.rotation.z = angle + Math.PI / 2;
  candle.userData.flame = flame;
  parent.add(candle);
  ambientObjects.push(candle);
}

function addWeb(scene, x, y, z) {
  const points = [];
  const center = new THREE.Vector3(x, y, z);
  for (let ray = 0; ray < 5; ray += 1) {
    const angle = ray * Math.PI / 8;
    points.push(center.clone(), center.clone().add(new THREE.Vector3(Math.cos(angle) * .37, Math.sin(angle) * .37, 0)));
  }
  for (let ring = 1; ring <= 3; ring += 1) {
    const radius = ring * .105;
    for (let ray = 0; ray < 10; ray += 1) {
      const angleA = ray * Math.PI / 5;
      const angleB = (ray + 1) * Math.PI / 5;
      points.push(center.clone().add(new THREE.Vector3(Math.cos(angleA) * radius, Math.sin(angleA) * radius, 0)), center.clone().add(new THREE.Vector3(Math.cos(angleB) * radius, Math.sin(angleB) * radius, 0)));
    }
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const web = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#d8c9dd', transparent: true, opacity: .35 }));
  scene.add(web);
}

function initializeWheel() {
  if (!dom.canvas) return;
  if (!window.WebGLRenderingContext) {
    dom.spinButton.disabled = true;
    dom.spinStatus.textContent = 'WEBGL INDISPONIBLE';
    showToast('Ce navigateur ne peut pas afficher la roue 3D : active WebGL ou essaie un navigateur compatible.');
    return;
  }
  wheelScene = new THREE.Scene();
  wheelScene.background = null;
  wheelCamera = new THREE.OrthographicCamera(-4.3, 4.3, 4.3, -4.3, .1, 50);
  wheelCamera.position.set(0, 0, 12);
  wheelCamera.lookAt(0, 0, 0);
  try {
    wheelRenderer = new THREE.WebGLRenderer({ canvas: dom.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (_) {
    dom.canvas.hidden = true;
    dom.spinButton.disabled = true;
    dom.spinStatus.textContent = 'WEBGL INDISPONIBLE';
    showToast('Le rendu 3D n’a pas pu démarrer sur cet appareil.');
    return;
  }
  wheelRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  wheelRenderer.outputColorSpace = THREE.SRGBColorSpace;
  wheelRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  wheelRenderer.toneMappingExposure = 1.2;
  wheelScene.add(new THREE.AmbientLight('#fff0d7', 2.15));
  const keyLight = new THREE.PointLight('#ffab62', 32, 14, 2);
  keyLight.position.set(-3, 4, 5);
  wheelScene.add(keyLight);
  const fillLight = new THREE.PointLight('#b18cf0', 20, 12, 2);
  fillLight.position.set(4, -3, 4);
  wheelScene.add(fillLight);

  wheelGroup = new THREE.Group();
  wheelScene.add(wheelGroup);
  const backBoard = new THREE.Mesh(new THREE.CylinderGeometry(3.68, 3.68, .25, 96), new THREE.MeshStandardMaterial({ color: '#392236', metalness: .62, roughness: .32 }));
  backBoard.rotation.x = Math.PI / 2;
  backBoard.position.z = -.13;
  wheelGroup.add(backBoard);
  const outerRim = new THREE.Mesh(new THREE.TorusGeometry(3.67, .1, 10, 120), new THREE.MeshStandardMaterial({ color: '#f2b65f', metalness: .78, roughness: .22, emissive: '#723b18', emissiveIntensity: .35 }));
  outerRim.position.z = .17;
  wheelGroup.add(outerRim);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(.63, .065, 8, 52), new THREE.MeshStandardMaterial({ color: '#f4d18a', metalness: .72, roughness: .24 }));
  innerRim.position.z = .29;
  wheelGroup.add(innerRim);

  const tickMaterial = new THREE.MeshStandardMaterial({ color: '#fff0b4', emissive: '#ffb658', emissiveIntensity: .28, metalness: .6, roughness: .25 });
  for (let index = 0; index < 56; index += 1) {
    const angle = index / 56 * FULL_TURN;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(index % 7 === 0 ? .07 : .045, 8, 6), tickMaterial);
    bead.position.set(Math.cos(angle) * 3.55, Math.sin(angle) * 3.55, .24);
    wheelGroup.add(bead);
  }
  for (let index = 0; index < 6; index += 1) addPumpkin(wheelGroup, index * FULL_TURN / 6 + .18, 3.39, index % 2 ? .8 : 1);
  for (let index = 0; index < 4; index += 1) addCandle(wheelGroup, Math.PI / 4 + index * Math.PI / 2, 2.93);
  addWeb(wheelScene, -2.9, 2.55, .15);
  addWeb(wheelScene, 2.85, -2.7, .15);
  ambientObjects = ambientObjects.filter(object => object.userData.flame);
  for (let index = 0; index < 16; index += 1) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(.018 + (index % 3) * .008, 6, 6), new THREE.MeshBasicMaterial({ color: index % 2 ? '#ffcc80' : '#c59dff', transparent: true, opacity: .72 }));
    particle.userData.offset = index * .61;
    particle.userData.radius = 3.9 + (index % 4) * .13;
    wheelScene.add(particle);
    ambientObjects.push(particle);
  }
  rebuildWheelSegments();
  wheelGroup.rotation.z = state.rotation;
  resizeWheel();
  if (typeof ResizeObserver !== 'undefined') {
    wheelResizeObserver = new ResizeObserver(resizeWheel);
    wheelResizeObserver.observe(dom.canvas.parentElement);
  } else window.addEventListener('resize', resizeWheel);
  requestAnimationFrame(animateWheel);
  wheelAvailable = true;
  renderWallet();
}

function rebuildWheelSegments() {
  if (!wheelGroup) return;
  for (const mesh of wheelSegmentMeshes) {
    wheelGroup.remove(mesh);
    if (!mesh.isSprite) mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) mesh.material.forEach(material => { material.map?.dispose(); material.dispose(); });
    else { mesh.material.map?.dispose(); mesh.material.dispose(); }
  }
  wheelSegmentMeshes = [];
  wheelSegments = makeWheelSegments();
  const step = FULL_TURN / wheelSegments.length;
  wheelSegments.forEach((segment, index) => {
    const start = -Math.PI / 2 + index * step;
    const end = start + step;
    const geometry = makeSectorGeometry(start, end, 3.48, .17);
    const material = new THREE.MeshStandardMaterial({ color: segment.color, roughness: .39, metalness: .17, emissive: segment.color, emissiveIntensity: .075, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = .035;
    mesh.userData.segmentIndex = index;
    wheelGroup.add(mesh);
    wheelSegmentMeshes.push(mesh);
    const markerAngle = start + step / 2;
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.105, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff0ce', emissive: segment.color, emissiveIntensity: .34, metalness: .35, roughness: .28 }));
    marker.position.set(Math.cos(markerAngle) * 2.83, Math.sin(markerAngle) * 2.83, .27);
    wheelGroup.add(marker);
    wheelSegmentMeshes.push(marker);
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = 96;
    glyphCanvas.height = 96;
    const glyphContext = glyphCanvas.getContext('2d');
    if (glyphContext) {
      glyphContext.textAlign = 'center';
      glyphContext.textBaseline = 'middle';
      glyphContext.font = '58px system-ui, sans-serif';
      glyphContext.fillText(segment.symbol ?? '✦', 48, 51);
      const glyphTexture = new THREE.CanvasTexture(glyphCanvas);
      glyphTexture.colorSpace = THREE.SRGBColorSpace;
      const glyph = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture, transparent: true, depthWrite: false }));
      glyph.scale.set(.46, .46, 1);
      glyph.position.set(Math.cos(markerAngle) * 2.1, Math.sin(markerAngle) * 2.1, .31);
      wheelGroup.add(glyph);
      wheelSegmentMeshes.push(glyph);
    }
  });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.56, .6, .25, 40), new THREE.MeshStandardMaterial({ color: '#493246', metalness: .54, roughness: .3 }));
  core.rotation.x = Math.PI / 2;
  core.position.z = .29;
  wheelGroup.add(core);
  wheelSegmentMeshes.push(core);
}

function resizeWheel() {
  if (!wheelRenderer || !dom.canvas) return;
  const rect = dom.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  wheelRenderer.setSize(width, height, false);
  const aspect = width / height;
  const viewSize = 4.3;
  const halfWidth = aspect >= 1 ? viewSize * aspect : viewSize;
  const halfHeight = aspect >= 1 ? viewSize : viewSize / aspect;
  wheelCamera.left = -halfWidth;
  wheelCamera.right = halfWidth;
  wheelCamera.top = halfHeight;
  wheelCamera.bottom = -halfHeight;
  wheelCamera.updateProjectionMatrix();
}

function animateWheel(time = 0) {
  if (!wheelRenderer || !wheelScene) return;
  const delta = Math.min(.06, Math.max(0, (time - lastFrameTime) / 1000 || 0));
  lastFrameTime = time;
  if (wheelGroup && !isSpinning) wheelGroup.rotation.z += delta * .035;
  for (const object of ambientObjects) {
    if (object.userData.flame) {
      object.userData.flame.visible = state.settings.effects;
      const flicker = state.settings.effects ? 1 + Math.sin(time * .009 + object.position.x) * .07 : 1;
      object.userData.flame.scale.set(flicker, flicker, flicker);
    } else if (object.userData.radius) {
      object.visible = state.settings.effects;
      const phase = time * .00023 + object.userData.offset;
      object.position.set(Math.cos(phase) * object.userData.radius, Math.sin(phase) * object.userData.radius, .48 + Math.sin(phase * 1.7) * .18);
    }
  }
  wheelRenderer.render(wheelScene, wheelCamera);
  requestAnimationFrame(animateWheel);
}

function chooseOutcome() {
  if (!remainingGifts().length) {
    return Math.random() < FREE_SPIN_SEGMENT_COUNT / WHEEL_SEGMENT_COUNT
      ? { type: 'spin', reward: SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)] }
      : { type: 'coins', amount: 1 };
  }
  if (Math.random() < FREE_SPIN_SEGMENT_COUNT / WHEEL_SEGMENT_COUNT) {
    return { type: 'spin', reward: SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)] };
  }
  const available = remainingGifts();
  const gift = available[Math.floor(Math.random() * available.length)];
  const variantChance = gift.rarityId === 'secret' ? .32 : gift.rarityId === 'mythic' ? .24 : gift.rarityId === 'legendary' ? .18 : .11;
  const variant = Math.random() < variantChance ? VARIANTS[Math.floor(Math.random() * VARIANTS.length)] : null;
  return { type: 'gift', gift, variant };
}

function findTargetSegment(outcome) {
  const matching = [];
  wheelSegments.forEach((segment, index) => {
    if (outcome.type === 'gift' && segment.kind === 'gift' && segment.rarityId === outcome.gift.rarityId) matching.push(index);
    if (outcome.type === 'spin' && segment.kind === 'spins' && segment.rewardId === outcome.reward.id) matching.push(index);
    if (outcome.type === 'coins' && segment.kind === 'coins') matching.push(index);
  });
  return matching.length ? matching[Math.floor(Math.random() * matching.length)] : Math.floor(Math.random() * wheelSegments.length);
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function beginSpin() {
  if (isSpinning || state.spins <= 0 || !wheelGroup) return;
  ensureAudio();
  if (state.settings.music) startMusic();
  isSpinning = true;
  state.spins -= 1;
  currentOutcome = chooseOutcome();
  state.pendingOutcome = currentOutcome.type === 'gift'
    ? { type: 'gift', giftId: currentOutcome.gift.id, variant: currentOutcome.variant }
    : currentOutcome.type === 'spin'
      ? { type: 'spin', rewardId: currentOutcome.reward.id }
      : { type: 'coins' };
  rebuildWheelSegments();
  const targetSegment = findTargetSegment(currentOutcome);
  const segmentStep = FULL_TURN / wheelSegments.length;
  const winningCenter = -Math.PI / 2 + (targetSegment + .5) * segmentStep;
  const pointerAngle = Math.PI / 2;
  const currentRotation = wheelGroup.rotation.z;
  const alignment = positiveModulo(pointerAngle - winningCenter - currentRotation, FULL_TURN);
  const fullRotations = reducedMotion ? 3 : 7;
  spinStartRotation = currentRotation;
  spinTargetRotation = currentRotation + fullRotations * FULL_TURN + alignment;
  spinStartedAt = performance.now();
  const tickBoundary = pointerAngle - (-Math.PI / 2);
  lastTickIndex = Math.floor((currentRotation - tickBoundary) / segmentStep);
  isSpinning = true;
  dom.spinStatus.textContent = 'LA ROUE TOURNE';
  dom.spinButton.querySelector('strong').textContent = 'EN COURS';
  playStartSound();
  saveState();
  renderWallet();
  spinFrame = requestAnimationFrame(updateSpin);
}

function easeInOutCubic(value) {
  return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function updateSpin(now) {
  const duration = reducedMotion ? 1900 : SPIN_DURATION_MS;
  const progress = Math.min(1, (now - spinStartedAt) / duration);
  const eased = easeInOutCubic(progress);
  const angle = spinStartRotation + (spinTargetRotation - spinStartRotation) * eased;
  wheelGroup.rotation.z = angle;
  state.rotation = angle % FULL_TURN;
  const step = FULL_TURN / wheelSegments.length;
  const tickBoundary = Math.PI;
  const tickIndex = Math.floor((angle - tickBoundary) / step);
  if (lastTickIndex !== null && tickIndex > lastTickIndex) {
    const tickCount = Math.min(18, tickIndex - lastTickIndex);
    for (let index = 0; index < tickCount; index += 1) playPointerTick(Math.min(1, eased + index * .005));
    lastTickIndex = tickIndex;
  }
  if (progress < 1) {
    spinFrame = requestAnimationFrame(updateSpin);
    return;
  }
  wheelGroup.rotation.z = spinTargetRotation % FULL_TURN;
  state.rotation = wheelGroup.rotation.z;
  finishSpin();
}

function awardOutcome(outcome) {
  state.stats.totalSpins += 1;
  state.coins = Math.min(1_000_000_000_000, state.coins + 1);
  state.stats.coinsEarned += 1;
  if (outcome.type === 'gift') {
    const { gift, variant } = outcome;
    if (!state.owned[gift.id]) {
      state.stats.giftsWon += 1;
      state.stats.rarityWins[gift.rarityId] = (state.stats.rarityWins[gift.rarityId] || 0) + 1;
      if (variant) state.stats.variantsFound += 1;
      state.owned[gift.id] = { variant, acquiredAt: state.stats.totalSpins, baseline: snapshotStats() };
    }
  } else if (outcome.type === 'spin') {
    state.spins = Math.min(1_000_000, state.spins + outcome.reward.amount);
  }
  state.pendingOutcome = null;
}

function restoreInterruptedSpin() {
  const pending = state.pendingOutcome;
  if (!pending) return null;
  let outcome = null;
  if (pending.type === 'gift') {
    const gift = giftById.get(pending.giftId);
    if (gift) outcome = { type: 'gift', gift, variant: pending.variant };
  } else if (pending.type === 'spin') {
    const reward = SPIN_REWARDS.find(item => item.id === pending.rewardId);
    if (reward) outcome = { type: 'spin', reward };
  } else if (pending.type === 'coins') outcome = { type: 'coins', amount: 1 };
  if (!outcome) {
    state.pendingOutcome = null;
    return null;
  }
  awardOutcome(outcome);
  state.rotation = Number.isFinite(state.rotation) ? state.rotation : 0;
  saveState();
  return outcome;
}

function finishSpin() {
  isSpinning = false;
  awardOutcome(currentOutcome);
  saveState();
  render();
  playTone(390, .3, 'triangle', .04, 145);
  playVictorySound(currentOutcome.type === 'gift' ? currentOutcome.gift.rarityId : currentOutcome.type);
  openReward(currentOutcome);
}

function beginPointerSpin() {
  if (isSpinning) return;
  beginSpin();
}

function rarityFlavor(rarityId) {
  const flavours = {
    common: 'Une découverte chaleureuse rejoint ta collection.',
    rare: 'Une lueur bleue accompagne cette trouvaille rare.',
    epic: 'Un éclat magique révèle ton cadeau épique.',
    legendary: 'Les flammes dorées célèbrent ce trésor légendaire.',
    mythic: 'La roue s’illumine : un cadeau mythique est à toi.',
    secret: 'Dans un voile de mystère, un secret se dévoile.'
  };
  return flavours[rarityId] ?? 'Une récompense de la roue t’attend.';
}

function openReward(outcome) {
  const rewardColor = outcome.type === 'gift' ? rarityColor(outcome.gift.rarityId) : outcome.type === 'spin' ? outcome.reward.color : '#ffd087';
  dom.rewardCard.className = `modal-card reward-card rarity-${outcome.type === 'gift' ? outcome.gift.rarityId : 'bonus'}`;
  dom.rewardCard.style.setProperty('--reward-color', rewardColor);
  dom.rewardHalo.style.setProperty('--reward-color', rewardColor);
  dom.rewardObject.replaceChildren();
  if (outcome.type === 'gift') {
    const { gift, variant } = outcome;
    const rarity = RARITY_BY_ID.get(gift.rarityId);
    dom.rewardEyebrow.textContent = variant ? 'VARIANTE RARE DÉCOUVERTE' : 'NOUVEAU CADEAU';
    dom.rewardTitle.textContent = gift.rarityId === 'secret' ? 'Un secret se révèle' : 'C’est gagné !';
    dom.rewardName.textContent = gift.name;
    dom.rewardRarity.textContent = `${rarity.label.toUpperCase()}${variant ? ` · ${variant.toUpperCase()}` : ''}`;
    dom.rewardFlavor.textContent = rarityFlavor(gift.rarityId);
    const canvas = el('canvas', 'reward-model-canvas');
    dom.rewardObject.append(canvas);
    mountGiftPreview(gift, canvas, variant);
    if (currentView === 'collection') renderCollection();
  } else if (outcome.type === 'spin') {
    dom.rewardEyebrow.textContent = 'BONUS DE LA ROUE';
    dom.rewardTitle.textContent = 'Des tours en plus !';
    dom.rewardName.textContent = outcome.reward.label;
    dom.rewardRarity.textContent = 'TOURS GRATUITS';
    dom.rewardFlavor.textContent = 'Le bonus est ajouté immédiatement à ton compteur.';
    dom.rewardObject.append(el('span', '', '🎡'));
  } else {
    dom.rewardEyebrow.textContent = 'BONUS DE LA ROUE';
    dom.rewardTitle.textContent = 'Une pièce de plus';
    dom.rewardName.textContent = '+1 pièce';
    dom.rewardRarity.textContent = 'PIÈCES';
    dom.rewardFlavor.textContent = 'Tu as découvert les 500 cadeaux : les tours continuent de rapporter des pièces.';
    dom.rewardObject.append(el('span', '', '🪙'));
  }
  if (outcome.type !== 'gift') saveState();
  renderWallet();
  dom.rewardModal.hidden = false;
  document.body.classList.add('busy');
  dom.closeRewardButton.focus();
}

function closeReward() {
  dom.rewardModal.hidden = true;
  if (state.welcomeSeen) document.body.classList.remove('busy');
  disposeGiftPreview();
  if (currentView === 'collection' && selectedGiftId) renderGiftDetail(selectedGiftId);
  rebuildWheelSegments();
  renderWallet();
}

function claimChallenge(id) {
  const item = listOwnedChallenges('all').find(entry => entry.id === id);
  if (!item || item.claimed || item.challenge.progress < item.challenge.goal) return;
  state.challengeClaims[id] = true;
  state.coins = Math.min(1_000_000_000_000, state.coins + item.challenge.rewardCoins);
  state.spins = Math.min(1_000_000, state.spins + item.challenge.rewardSpins);
  state.stats.coinsEarned += item.challenge.rewardCoins;
  saveState();
  playPurchaseSound();
  showToast(`Récompense récupérée : ${item.challenge.rewardCoins ? `${item.challenge.rewardCoins} pièces` : ''}${item.challenge.rewardCoins && item.challenge.rewardSpins ? ' et ' : ''}${item.challenge.rewardSpins ? `${item.challenge.rewardSpins} tour(s)` : ''}.`);
  render();
}

function buySpins(offer) {
  if (state.coins < offer.coins) return;
  state.coins -= offer.coins;
  state.spins = Math.min(1_000_000, state.spins + offer.spins);
  saveState();
  playPurchaseSound();
  showToast(`${offer.spins} ${offer.spins === 1 ? 'tour ajouté' : 'tours ajoutés'} à ton compteur.`);
  renderWallet();
  renderShop();
}

function showToast(message) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => dom.toast.classList.remove('visible'), 3200);
}

function audioEnabled() {
  return state.settings.sound;
}

function ensureAudio() {
  if (audioContext) {
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  try {
    audioContext = new Context();
    return audioContext;
  } catch (_) {
    return null;
  }
}

function playTone(frequency, duration, type = 'sine', volume = .05, endFrequency = null) {
  if (!audioEnabled()) return;
  const context = ensureAudio();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, endFrequency), now + duration);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + .02);
}

function playStartSound() {
  playTone(180, .42, 'sawtooth', .035, 460);
  playTone(92, .5, 'sine', .04, 165);
}

function playPointerTick(speed) {
  if (!audioEnabled()) return;
  playTone(1450 + speed * 520, .035, 'square', .014 + speed * .009, 740 + speed * 230);
}

function playVictorySound(rarityId) {
  if (!audioEnabled()) return;
  const base = { common: 540, rare: 640, epic: 740, legendary: 840, mythic: 960, secret: 1120, spin: 700, coins: 560 }[rarityId] ?? 610;
  playTone(base, .34, 'sine', .075, base * 1.45);
  window.setTimeout(() => playTone(base * 1.25, .46, 'triangle', .055, base * 1.8), 110);
  if (rarityId === 'secret' || rarityId === 'mythic') window.setTimeout(() => playTone(base * 1.7, .6, 'sine', .045, base * 1.2), 190);
}

function playPurchaseSound() {
  playTone(580, .16, 'triangle', .045, 880);
  window.setTimeout(() => playTone(760, .19, 'sine', .04, 1100), 90);
}

function stopMusic() {
  for (const node of musicNodes) {
    try { node.stop(); } catch (_) { /* Un oscillateur déjà arrêté n'a plus besoin d'être libéré. */ }
  }
  musicNodes = [];
  musicGain = null;
}

function startMusic() {
  const context = ensureAudio();
  if (!context || musicGain) return;
  musicGain = context.createGain();
  musicGain.gain.value = .012;
  musicGain.connect(context.destination);
  for (const [frequency, type] of [[65.41, 'sine'], [98, 'triangle'], [130.81, 'sine']]) {
    const oscillator = context.createOscillator();
    const voiceGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    voiceGain.gain.value = type === 'triangle' ? .23 : .3;
    oscillator.connect(voiceGain);
    voiceGain.connect(musicGain);
    oscillator.start();
    musicNodes.push(oscillator, voiceGain);
  }
}

function mountGiftPreview(gift, canvas, variant = null) {
  disposeGiftPreview();
  if (!canvas || !window.WebGLRenderingContext) return;
  previewCanvas = canvas;
  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(34, 1, .1, 20);
  previewCamera.position.set(0, .35, 3.35);
  previewCamera.lookAt(0, 0, 0);
  previewRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  previewScene.add(new THREE.HemisphereLight('#fff1de', '#28182d', 2.1));
  const key = new THREE.DirectionalLight('#fff0d2', 3.1);
  key.position.set(-2, 3, 4);
  previewScene.add(key);
  const rim = new THREE.PointLight(rarityColor(gift.rarityId), 16, 9);
  rim.position.set(2, -1, 2);
  previewScene.add(rim);
  previewModel = makeGiftModel(gift, variant);
  previewScene.add(previewModel);
  const resize = () => {
    if (!previewRenderer || !previewCanvas) return;
    const rect = previewCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    previewRenderer.setSize(Math.floor(rect.width), Math.floor(rect.height), false);
    previewCamera.aspect = rect.width / rect.height;
    previewCamera.updateProjectionMatrix();
  };
  if (typeof ResizeObserver !== 'undefined') {
    previewResizeObserver = new ResizeObserver(resize);
    previewResizeObserver.observe(canvas);
  } else window.addEventListener('resize', resize);
  resize();
  previewPointer = canvas;
  previewDrag = null;
  canvas.addEventListener('pointerdown', onPreviewPointerDown);
  canvas.addEventListener('pointermove', onPreviewPointerMove);
  canvas.addEventListener('pointerup', onPreviewPointerUp);
  canvas.addEventListener('pointercancel', onPreviewPointerUp);
  canvas.addEventListener('wheel', onPreviewWheel, { passive: true });
  previewFrame = requestAnimationFrame(animatePreview);
}

function makeGiftModel(gift, variant) {
  const group = new THREE.Group();
  const hueMaterial = new THREE.MeshStandardMaterial({ color: gift.color, roughness: .34, metalness: .24 });
  const accent = new THREE.Color(rarityColor(gift.rarityId));
  if (variant === 'Dorée') accent.set('#ffd45f');
  if (variant === 'Spectrale') accent.set('#9bf0ed');
  if (variant === 'Holographique') accent.set('#d3a1ff');
  if (variant === 'Lunaire') accent.set('#f0e8ff');
  const ribbonMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: .26, metalness: .55, emissive: accent, emissiveIntensity: .12 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#3a2434', roughness: .68 });
  const bodyGeometries = [
    new THREE.BoxGeometry(1, .76, .68), new THREE.SphereGeometry(.48, 18, 14), new THREE.DodecahedronGeometry(.49, 0),
    new THREE.IcosahedronGeometry(.48, 1), new THREE.OctahedronGeometry(.52, 0), new THREE.CylinderGeometry(.39, .46, .82, 9),
    new THREE.ConeGeometry(.48, .86, 8), new THREE.TorusKnotGeometry(.31, .12, 54, 8), new THREE.TorusGeometry(.36, .15, 12, 28),
    new THREE.TetrahedronGeometry(.56, 0), new THREE.SphereGeometry(.47, 9, 7), new THREE.CylinderGeometry(.48, .32, .82, 6),
    new THREE.DodecahedronGeometry(.51, 1), new THREE.IcosahedronGeometry(.52, 0), new THREE.OctahedronGeometry(.46, 1),
    new THREE.ConeGeometry(.48, .76, 5), new THREE.TorusGeometry(.39, .12, 7, 18), new THREE.BoxGeometry(.88, .88, .88),
    new THREE.SphereGeometry(.49, 26, 9), new THREE.CylinderGeometry(.42, .42, .8, 12)
  ];
  const box = new THREE.Mesh(bodyGeometries[gift.designIndex % bodyGeometries.length], hueMaterial);
  box.position.y = -.1;
  group.add(box);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.04, .16, .75), ribbonMaterial);
  lid.position.y = .34;
  group.add(lid);
  const verticalRibbon = new THREE.Mesh(new THREE.BoxGeometry(.15, .91, .71), ribbonMaterial);
  verticalRibbon.position.y = -.055;
  group.add(verticalRibbon);
  const horizontalRibbon = new THREE.Mesh(new THREE.BoxGeometry(.98, .13, .71), ribbonMaterial);
  horizontalRibbon.position.y = -.11;
  group.add(horizontalRibbon);
  const bowLeft = new THREE.Mesh(new THREE.TorusGeometry(.15, .045, 8, 16, Math.PI * 1.6), ribbonMaterial);
  bowLeft.position.set(-.11, .48, .06);
  bowLeft.rotation.z = Math.PI * .15;
  group.add(bowLeft);
  const bowRight = bowLeft.clone();
  bowRight.position.x = .11;
  bowRight.rotation.z = Math.PI * .85;
  group.add(bowRight);
  const buttonGeometry = [
    new THREE.DodecahedronGeometry(.19, 0),
    new THREE.SphereGeometry(.17, 14, 10),
    new THREE.ConeGeometry(.16, .3, 7),
    new THREE.OctahedronGeometry(.18, 0),
    new THREE.TorusKnotGeometry(.12, .045, 48, 8)
  ][gift.designIndex % 5];
  const emblem = new THREE.Mesh(buttonGeometry, new THREE.MeshStandardMaterial({ color: accent, metalness: .48, roughness: .27, emissive: accent, emissiveIntensity: .16 }));
  emblem.position.set(0, .55, .06);
  group.add(emblem);
  const sideDot = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), darkMaterial);
  sideDot.position.set(.31, -.05, .36);
  group.add(sideDot);
  group.rotation.x = -.12;
  return group;
}

function animatePreview() {
  if (!previewRenderer || !previewScene || !previewCamera || !previewModel) return;
  if (!previewDrag) previewModel.rotation.y += .006;
  previewModel.rotation.z += .0008;
  previewRenderer.render(previewScene, previewCamera);
  previewFrame = requestAnimationFrame(animatePreview);
}

function onPreviewPointerDown(event) {
  previewDrag = { x: event.clientX, y: event.clientY };
  previewCanvas?.setPointerCapture?.(event.pointerId);
}

function onPreviewPointerMove(event) {
  if (!previewDrag || !previewModel) return;
  const deltaX = event.clientX - previewDrag.x;
  const deltaY = event.clientY - previewDrag.y;
  previewModel.rotation.y += deltaX * .012;
  previewModel.rotation.x = Math.max(-.7, Math.min(.7, previewModel.rotation.x + deltaY * .009));
  previewDrag = { x: event.clientX, y: event.clientY };
}

function onPreviewPointerUp() {
  previewDrag = null;
}

function onPreviewWheel(event) {
  if (previewCamera) previewCamera.position.z = Math.max(2.4, Math.min(4.2, previewCamera.position.z + Math.sign(event.deltaY) * .12));
}

function disposeGiftPreview() {
  if (previewFrame) cancelAnimationFrame(previewFrame);
  previewFrame = 0;
  if (previewResizeObserver) previewResizeObserver.disconnect();
  previewResizeObserver = null;
  if (previewCanvas) {
    previewCanvas.removeEventListener('pointerdown', onPreviewPointerDown);
    previewCanvas.removeEventListener('pointermove', onPreviewPointerMove);
    previewCanvas.removeEventListener('pointerup', onPreviewPointerUp);
    previewCanvas.removeEventListener('pointercancel', onPreviewPointerUp);
    previewCanvas.removeEventListener('wheel', onPreviewWheel);
  }
  if (previewScene) previewScene.traverse(object => {
    if (object.geometry && !object.isSprite) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) { material.map?.dispose(); material.dispose(); }
  });
  if (previewRenderer) previewRenderer.dispose();
  previewRenderer = null;
  previewScene = null;
  previewCamera = null;
  previewModel = null;
  previewCanvas = null;
  previewDrag = null;
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const request = document.documentElement.requestFullscreen?.();
    if (request && typeof request.then === 'function') request.then(() => {
      state.settings.fullscreen = true;
      saveState();
      renderSettings();
    }).catch(() => showToast('Le plein écran doit être activé par une action directe dans le navigateur.'));
    else showToast('Le plein écran n’est pas disponible dans ce navigateur.');
  } else {
    document.exitFullscreen?.().then(() => {
      state.settings.fullscreen = false;
      saveState();
      renderSettings();
    }).catch(() => {});
  }
}

function installEventListeners() {
  dom.spinButton.addEventListener('click', beginPointerSpin);
  document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.querySelectorAll('[data-open-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.openView)));
  dom.challengeRarity.addEventListener('change', renderChallenges);
  dom.startGameButton.addEventListener('click', () => {
    state.welcomeSeen = true;
    saveState();
    dom.welcomeModal.hidden = true;
    document.body.classList.remove('busy');
    ensureAudio();
    if (state.settings.music) startMusic();
  });
  dom.closeRewardButton.addEventListener('click', closeReward);
  dom.rewardModal.addEventListener('click', event => { if (event.target === dom.rewardModal) closeReward(); });
  dom.backToGrid.addEventListener('click', () => { selectedGiftId = null; dom.selectedTitle.textContent = 'Collection'; dom.giftDetail.replaceChildren(el('div', 'detail-empty', 'Sélectionne un cadeau obtenu pour découvrir son modèle 3D, sa rareté et sa variante.')); disposeGiftPreview(); });
  dom.musicToggle.addEventListener('change', () => {
    state.settings.music = dom.musicToggle.checked;
    if (state.settings.music) startMusic(); else stopMusic();
    saveState();
  });
  dom.soundToggle.addEventListener('change', () => { state.settings.sound = dom.soundToggle.checked; saveState(); if (state.settings.sound) playPurchaseSound(); });
  dom.effectsToggle.addEventListener('change', () => { state.settings.effects = dom.effectsToggle.checked; saveState(); document.body.classList.toggle('reduced-effects', !state.settings.effects); });
  dom.fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    state.settings.fullscreen = Boolean(document.fullscreenElement);
    saveState();
    renderSettings();
  });
  dom.challengeRarity.addEventListener('change', renderChallenges);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dom.rewardModal.hidden) closeReward();
  });
  window.addEventListener('pagehide', saveState);
}

function startGame() {
  recoveredOutcome = restoreInterruptedSpin();
  buildCollectionFilters();
  buildChallengeFilters();
  dom.giftDetail.append(el('div', 'detail-empty', 'Sélectionne un cadeau obtenu pour découvrir son modèle 3D, sa rareté et sa variante.'));
  installEventListeners();
  registerDataRequest();
  render();
  initializeWheel();
  if (recoveredOutcome) openReward(recoveredOutcome);
  document.body.classList.toggle('reduced-effects', !state.settings.effects);
}

startGame();
