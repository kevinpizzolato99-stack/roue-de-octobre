(() => {
  'use strict';

  const STORAGE_KEY = 'bezi-gift-wheel-rebuilt-v2';
  const EVENT_REMINDER_DATE = new Date(2026, 9, 4, 6, 0, 0, 0);
  const EVENT_GIFT_DATE = new Date(2026, 9, 4, 12, 0, 0, 0);
  const EVENT_GIFT_END = new Date(2026, 9, 4, 13, 0, 0, 0);
  const EVENT_GIFT_COINS = 500;
  const FULL_TURN = Math.PI * 2;
  const gifts = createGiftCatalog();
  const segments = [
    { label: 'Petit cadeau', icon: '🎁', color: '#9a4f83', type: 'gift' },
    { label: '+2 pièces', icon: '🪙', color: '#b96b34', type: 'coins', amount: 2 },
    { label: '+1 tour', icon: '🎡', color: '#557f9e', type: 'spins', amount: 1 },
    { label: 'Cadeau rare', icon: '💜', color: '#7655a0', type: 'gift' },
    { label: '+5 pièces', icon: '✨', color: '#a95835', type: 'coins', amount: 5 },
    { label: 'Surprise', icon: '🎃', color: '#8d4b72', type: 'gift' },
    { label: '+2 tours', icon: '🎟️', color: '#567a72', type: 'spins', amount: 2 },
    { label: '+10 pièces', icon: '🪙', color: '#af6838', type: 'coins', amount: 10 },
    { label: 'Cadeau mystère', icon: '👻', color: '#67549a', type: 'gift' },
    { label: '+1 pièce', icon: '⭐', color: '#98613e', type: 'coins', amount: 1 },
    { label: 'Cadeau lunaire', icon: '🌙', color: '#486f85', type: 'gift' },
    { label: '+3 pièces', icon: '🔮', color: '#8b4f89', type: 'coins', amount: 3 }
  ];
  const challenges = [
    { id: 'spin-5', title: 'Premiers tours', description: 'Effectue 5 tours au total.', goal: 5, stat: 'totalSpins', reward: 8, rewardType: 'spins', rewardLabel: '+8 tours' },
    { id: 'gift-3', title: 'Collectionneur', description: 'Découvre 3 cadeaux différents.', goal: 3, stat: 'giftsWon', reward: 8, rewardType: 'coins', rewardLabel: '+8 pièces' },
    { id: 'coins-20', title: 'Petit trésor', description: 'Gagne 20 pièces avec la roue.', goal: 20, stat: 'coinsEarned', reward: 12, rewardType: 'coins', rewardLabel: '+12 pièces' }
  ];
  const offers = [
    { spins: 1, cost: 10, label: 'Une chance de plus', icon: '🎡' },
    { spins: 5, cost: 40, label: 'Le petit pack', icon: '🎟️' },
    { spins: 15, cost: 100, label: 'Le grand pack', icon: '🎃' }
  ];
  const dom = {
    canvas: document.querySelector('#gameCanvas'), spin: document.querySelector('#spinButton'),
    coins: document.querySelector('#coinCount'), spins: document.querySelector('#spinCount'),
    collectionCount: document.querySelector('#collectionCount'), miniCollection: document.querySelector('#miniCollection'),
    collectionBadge: document.querySelector('#collectionBadge'), collectionTotal: document.querySelector('#collectionTotal'),
    collectionProgressBar: document.querySelector('#collectionProgressBar'), spinHint: document.querySelector('#spinButtonHint'),
    spinStatus: document.querySelector('#spinStatus'), quickTitle: document.querySelector('#quickChallengeTitle'),
    quickText: document.querySelector('#quickChallengeText'), quickProgress: document.querySelector('#quickChallengeProgress'),
    giftGrid: document.querySelector('#giftGrid'), collectionFilter: document.querySelector('#collectionFilter'),
    collectionResults: document.querySelector('#collectionResults'), challengeList: document.querySelector('#challengeList'),
    challengeRewards: document.querySelector('#challengeRewards'), shopCoins: document.querySelector('#shopCoins'),
    shopOffers: document.querySelector('#shopOffers'), effects: document.querySelector('#effectsToggle'),
    sounds: document.querySelector('#soundToggle'), music: document.querySelector('#musicToggle'),
    rewardModal: document.querySelector('#rewardModal'), rewardEyebrow: document.querySelector('#rewardEyebrow'),
    rewardTitle: document.querySelector('#rewardTitle'), rewardObject: document.querySelector('#rewardObject'),
    rewardName: document.querySelector('#rewardName'), rewardCopy: document.querySelector('#rewardCopy'),
    eventCountdown: document.querySelector('#eventCountdown')
  };
  let state = loadState();
  let rotation = 0;
  let spinning = false;
  let canvasContext = dom.canvas.getContext('2d');
  let audioContext = null;
  let masterGain = null;
  let musicTimer = null;
  let musicChordIndex = 0;
  let rewardModalMode = 'reward';
  let eventAnnouncementDismissed = false;

  function createGiftCatalog() {
    const names = ['Brume', 'Lueur', 'Velours', 'Éclat', 'Mystère', 'Minuit', 'Cendre', 'Lune', 'Sortilège', 'Nocturne', 'Cristal', 'Citrouille', 'Flamme', 'Ombre', 'Étoile', 'Potion', 'Sorcier', 'Spectre', 'Rêve', 'Encre'];
    const objects = ['Citrouille', 'Chat noir', 'Fantôme', 'Chauve-souris', 'Chapeau', 'Potion', 'Lanterne', 'Cristal', 'Corbeau', 'Araignée', 'Bougie', 'Masque', 'Grimoire', 'Bonbon', 'Chaudron', 'Hibou', 'Lune', 'Étoile', 'Balai', 'Toile'];
    const icons = ['🎃', '🐈‍⬛', '👻', '🦇', '🧙', '🧪', '🏮', '🔮', '🐦‍⬛', '🕷️', '🕯️', '🎭', '📜', '🍬', '⚗️', '🦉', '🌙', '✨', '🪄', '🕸️'];
    return Array.from({ length: 500 }, (_, id) => ({ id, name: `${names[Math.floor(id / 25)]} ${objects[id % 20]}`, icon: icons[id % 20] }));
  }

  function defaultState() {
    return { coins: 0, spins: 5, collection: [], totalSpins: 0, giftsWon: 0, coinsEarned: 0, claimedChallenges: [], effects: true, sounds: true, music: false, eventGiftClaimed: false };
  }

  function loadState() {
    const fallback = defaultState();
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      return {
        ...fallback,
        coins: nonNegativeInteger(saved.coins, fallback.coins),
        spins: nonNegativeInteger(saved.spins, fallback.spins),
        collection: Array.isArray(saved.collection) ? [...new Set(saved.collection.map(Number).filter(id => Number.isInteger(id) && id >= 0 && id < gifts.length))] : [],
        totalSpins: nonNegativeInteger(saved.totalSpins, 0),
        giftsWon: nonNegativeInteger(saved.giftsWon, 0),
        coinsEarned: nonNegativeInteger(saved.coinsEarned, 0),
        claimedChallenges: Array.isArray(saved.claimedChallenges) ? saved.claimedChallenges.filter(id => challenges.some(challenge => challenge.id === id)) : [],
        effects: saved.effects !== false,
        sounds: saved.sounds !== false,
        music: saved.music === true,
        eventGiftClaimed: saved.eventGiftClaimed === true
      };
    } catch {
      return fallback;
    }
  }

  function nonNegativeInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
  }

  function saveState() {
    const snapshot = getPublicState();
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Storage can be disabled for local files. */ }
    if (window.Bezi && typeof window.Bezi.setData === 'function') {
      try { window.Bezi.setData(snapshot); } catch { /* Keep local play working if the optional host bridge is unavailable. */ }
    }
  }

  function registerAutoSave() {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        saveState();
        stopMusic();
        if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
      } else if (state.music) {
        startMusic();
      }
    };
    window.addEventListener('pagehide', saveState);
    window.addEventListener('beforeunload', saveState);
    document.addEventListener('visibilitychange', saveWhenHidden);
  }

  function getPublicState() {
    return {
      coins: state.coins, spins: state.spins, collection: [...state.collection],
      totalSpins: state.totalSpins, giftsWon: state.giftsWon,
      coinsEarned: state.coinsEarned, claimedChallenges: [...state.claimedChallenges],
      effects: state.effects, sounds: state.sounds, music: state.music,
      eventGiftClaimed: state.eventGiftClaimed
    };
  }

  function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(audioContext.destination);
      return audioContext;
    } catch {
      audioContext = null;
      masterGain = null;
      return null;
    }
  }

  function playTone(frequency, startTime, duration, volume, waveform = 'sine', attack = 0.02) {
    const context = getAudioContext();
    if (!context || !masterGain) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.linearRampToValueAtTime(volume, startTime + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  function playWheelTick() {
    if (!state.sounds) return;
    const context = getAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(920, now);
    oscillator.frequency.exponentialRampToValueAtTime(390, now + 0.045);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(0.045, now + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }

  function playRewardSound() {
    if (!state.sounds) return;
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const startTime = context.currentTime + index * 0.12;
      playTone(frequency, startTime, 0.72, 0.085, 'sine', 0.025);
      if (index > 0) playTone(frequency * 1.5, startTime + 0.035, 0.48, 0.025, 'sine', 0.03);
    });
  }

  function playAmbientChord() {
    const context = getAudioContext();
    if (!context || !state.music) return;
    const chords = [
      [261.63, 329.63, 392.00],
      [220.00, 261.63, 329.63],
      [174.61, 220.00, 261.63],
      [196.00, 246.94, 293.66]
    ];
    const chord = chords[musicChordIndex % chords.length];
    musicChordIndex += 1;
    chord.forEach((frequency, index) => playTone(frequency, context.currentTime + index * 0.16, 2.8, 0.018, 'sine', 0.65));
  }

  function startMusic() {
    const context = getAudioContext();
    if (!context || !state.music) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    if (musicTimer !== null) return;
    playAmbientChord();
    musicTimer = window.setInterval(playAmbientChord, 2800);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function registerBridge() {
    if (window.Bezi && typeof window.Bezi.onDataRequest === 'function') {
      try { window.Bezi.onDataRequest(() => getPublicState()); } catch { /* Browser version does not require the host bridge. */ }
    }
  }

  function render() {
    renderWheel();
    const total = state.collection.length;
    dom.coins.textContent = String(state.coins);
    dom.spins.textContent = String(state.spins);
    dom.collectionCount.textContent = `${total} / ${gifts.length}`;
    dom.miniCollection.textContent = `${total} / ${gifts.length}`;
    dom.collectionBadge.textContent = `${total} / ${gifts.length}`;
    dom.collectionTotal.textContent = `${total} / ${gifts.length}`;
    dom.collectionProgressBar.style.width = `${total / gifts.length * 100}%`;
    dom.spinHint.textContent = `${state.spins} ${state.spins === 1 ? 'TOUR DISPONIBLE' : 'TOURS DISPONIBLES'}`;
    dom.spin.disabled = spinning || state.spins < 1;
    dom.spinStatus.textContent = spinning ? 'LA ROUE TOURNE…' : state.spins > 0 ? 'PRÊTE À TOURNER' : 'PLUS DE TOURS';
    dom.effects.checked = state.effects;
    dom.sounds.checked = state.sounds;
    dom.music.checked = state.music;
    document.body.classList.toggle('no-effects', !state.effects);
    dom.challengeRewards.textContent = String(state.claimedChallenges.length);
    dom.shopCoins.textContent = String(state.coins);
    renderQuickChallenge();
    renderCollection();
    renderChallenges();
    renderShop();
  }

  function renderWheel() {
    const rect = dom.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !canvasContext) return;
    const size = Math.min(rect.width, rect.height);
    const center = size / 2;
    const radius = size * .45;
    const step = FULL_TURN / segments.length;
    canvasContext.clearRect(0, 0, rect.width, rect.height);
    canvasContext.save();
    canvasContext.translate(rect.width / 2, rect.height / 2);
    canvasContext.rotate(rotation);
    segments.forEach((segment, index) => {
      const start = -Math.PI / 2 + index * step;
      const end = start + step;
      canvasContext.beginPath();
      canvasContext.moveTo(0, 0);
      canvasContext.arc(0, 0, radius, start, end);
      canvasContext.closePath();
      canvasContext.fillStyle = segment.color;
      canvasContext.fill();
      canvasContext.strokeStyle = '#ffe3bd88';
      canvasContext.lineWidth = Math.max(1.5, size * .004);
      canvasContext.stroke();
      const middle = start + step / 2;
      const labelRadius = radius * .72;
      canvasContext.save();
      canvasContext.translate(Math.cos(middle) * labelRadius, Math.sin(middle) * labelRadius);
      canvasContext.rotate(middle + Math.PI / 2);
      canvasContext.textAlign = 'center';
      canvasContext.textBaseline = 'middle';
      canvasContext.font = `${Math.round(size * .044)}px system-ui, sans-serif`;
      canvasContext.fillStyle = '#fff7eb';
      canvasContext.shadowColor = '#180f20';
      canvasContext.shadowBlur = 4;
      canvasContext.fillText(segment.icon, 0, -size * .032);
      canvasContext.font = `700 ${Math.round(size * .023)}px system-ui, sans-serif`;
      canvasContext.fillText(segment.label, 0, size * .025, size * .15);
      canvasContext.restore();
    });
    canvasContext.beginPath();
    canvasContext.arc(0, 0, radius, 0, FULL_TURN);
    canvasContext.strokeStyle = '#ffd68c';
    canvasContext.lineWidth = Math.max(5, size * .018);
    canvasContext.stroke();
    canvasContext.restore();
    canvasContext.save();
    canvasContext.translate(rect.width / 2, rect.height / 2);
    canvasContext.beginPath();
    canvasContext.arc(0, 0, size * .095, 0, FULL_TURN);
    canvasContext.fillStyle = '#2a1830';
    canvasContext.fill();
    canvasContext.strokeStyle = '#ffe0a0';
    canvasContext.lineWidth = Math.max(3, size * .012);
    canvasContext.stroke();
    canvasContext.font = `${Math.round(size * .071)}px system-ui, sans-serif`;
    canvasContext.textAlign = 'center';
    canvasContext.textBaseline = 'middle';
    canvasContext.fillText('🎃', 0, 1);
    canvasContext.restore();
  }

  function resizeCanvas() {
    const rect = dom.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    dom.canvas.width = Math.round(rect.width * ratio);
    dom.canvas.height = Math.round(rect.height * ratio);
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    renderWheel();
  }

  function spin() {
    if (spinning || state.spins < 1) return;
    const context = getAudioContext();
    if (context && context.state === 'suspended') context.resume().catch(() => {});
    if (state.music) startMusic();
    spinning = true;
    state.spins -= 1;
    state.totalSpins += 1;
    state.coins += 1;
    state.coinsEarned += 1;
    saveState();
    render();
    const index = Math.floor(Math.random() * segments.length);
    const step = FULL_TURN / segments.length;
    const normalized = ((rotation % FULL_TURN) + FULL_TURN) % FULL_TURN;
    const targetModulo = (FULL_TURN - ((index + .5) * step % FULL_TURN)) % FULL_TURN;
    const delta = (targetModulo - normalized + FULL_TURN) % FULL_TURN;
    const startRotation = rotation;
    const totalRotation = startRotation + FULL_TURN * (5 + Math.floor(Math.random() * 3)) + delta;
    const startedAt = performance.now();
    const duration = 4300;
    let lastTickSector = Math.floor(startRotation / step);

    function animate(now) {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      rotation = startRotation + (totalRotation - startRotation) * eased;
      const tickSector = Math.floor(rotation / step);
      if (tickSector !== lastTickSector) {
        lastTickSector = tickSector;
        playWheelTick();
      }
      renderWheel();
      if (t < 1) {
        requestAnimationFrame(animate);
        return;
      }
      rotation = totalRotation;
      spinning = false;
      const result = award(segments[index]);
      saveState();
      render();
      showReward(result);
    }
    requestAnimationFrame(animate);
  }

  function award(segment) {
    if (segment.type === 'coins') {
      state.coins += segment.amount;
      state.coinsEarned += segment.amount;
      return { icon: segment.icon, title: `+${segment.amount} ${segment.amount > 1 ? 'pièces' : 'pièce'}`, copy: 'Ton portefeuille vient d’être mis à jour.' };
    }
    if (segment.type === 'spins') {
      state.spins += segment.amount;
      return { icon: segment.icon, title: `+${segment.amount} ${segment.amount > 1 ? 'tours' : 'tour'}`, copy: 'Tu peux déjà relancer la roue !' };
    }
    const available = gifts.filter(gift => !state.collection.includes(gift.id));
    if (available.length === 0) {
      state.coins += 10;
      state.coinsEarned += 10;
      return { icon: '🎉', title: 'Collection complète !', copy: 'Tu as découvert les 500 cadeaux : voici 10 pièces bonus.' };
    }
    const gift = available[Math.floor(Math.random() * available.length)];
    state.collection.push(gift.id);
    state.giftsWon += 1;
    return { icon: gift.icon, title: gift.name, copy: 'Nouveau cadeau ajouté à ta collection !' };
  }

  function isEventDay(date) {
    return date.getFullYear() === EVENT_GIFT_DATE.getFullYear()
      && date.getMonth() === EVENT_GIFT_DATE.getMonth()
      && date.getDate() === EVENT_GIFT_DATE.getDate();
  }

  function showEventAnnouncement() {
    rewardModalMode = 'event-announcement';
    dom.rewardEyebrow.textContent = 'À NE PAS MANQUER';
    dom.rewardTitle.textContent = 'Rappel : cadeau à 12 h !';
    dom.rewardObject.textContent = '🎁';
    dom.rewardName.textContent = `${EVENT_GIFT_COINS} pièces à récupérer`;
    dom.rewardCopy.textContent = 'Le cadeau unique sera disponible aujourd’hui, dimanche 4 octobre, de 12 h à 13 h (heure locale).';
    dom.eventCountdown.hidden = true;
    document.querySelector('#closeRewardButton').textContent = 'D’ACCORD';
    dom.rewardModal.hidden = false;
    document.querySelector('#closeRewardButton').focus();
  }

  function updateEventCountdown() {
    if (rewardModalMode !== 'event-claim') return;
    const remainingSeconds = Math.max(0, Math.ceil((EVENT_GIFT_END.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    dom.eventCountdown.textContent = `Temps restant : ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (remainingSeconds === 0) expireEventGift();
  }

  function showScheduledGift() {
    if (state.eventGiftClaimed || Date.now() < EVENT_GIFT_DATE.getTime() || Date.now() >= EVENT_GIFT_END.getTime()) return;
    rewardModalMode = 'event-claim';
    dom.rewardEyebrow.textContent = 'CADEAU EXCEPTIONNEL';
    dom.rewardTitle.textContent = 'Un cadeau unique t’attend !';
    dom.rewardObject.textContent = '🎁';
    dom.rewardName.textContent = `${EVENT_GIFT_COINS} pièces`;
    dom.rewardCopy.textContent = 'Disponible le dimanche 4 octobre 2026, de 12 h à 13 h (heure locale). Réclame ton cadeau avant la fin du compte à rebours.';
    dom.eventCountdown.hidden = false;
    document.querySelector('#closeRewardButton').textContent = 'RÉCUPÉRER MES 500 PIÈCES';
    dom.rewardModal.hidden = false;
    updateEventCountdown();
    document.querySelector('#closeRewardButton').focus();
  }

  function expireEventGift() {
    if (rewardModalMode !== 'event-claim') return;
    rewardModalMode = 'event-expired';
    dom.rewardEyebrow.textContent = 'OFFRE TERMINÉE';
    dom.rewardTitle.textContent = 'Le cadeau n’est plus disponible';
    dom.rewardObject.textContent = '⏰';
    dom.rewardName.textContent = 'La période est terminée';
    dom.rewardCopy.textContent = 'Cette offre unique était disponible le dimanche 4 octobre, de 12 h à 13 h.';
    dom.eventCountdown.textContent = 'Temps restant : 00:00';
    document.querySelector('#closeRewardButton').textContent = 'FERMER';
  }

  function claimEventGift() {
    if (rewardModalMode !== 'event-claim' || state.eventGiftClaimed) return;
    const now = Date.now();
    if (now < EVENT_GIFT_DATE.getTime()) return;
    if (now >= EVENT_GIFT_END.getTime()) {
      expireEventGift();
      return;
    }
    state.coins += EVENT_GIFT_COINS;
    state.eventGiftClaimed = true;
    saveState();
    render();
    rewardModalMode = 'event-confirmation';
    dom.rewardEyebrow.textContent = 'CADEAU RÉCUPÉRÉ';
    dom.rewardTitle.textContent = '500 pièces ajoutées !';
    dom.rewardObject.textContent = '🪙';
    dom.rewardName.textContent = 'Cadeau unique';
    dom.rewardCopy.textContent = 'Les 500 pièces ont été ajoutées à ton portefeuille.';
    dom.eventCountdown.hidden = true;
    document.querySelector('#closeRewardButton').textContent = 'CONTINUER À JOUER';
  }

  function checkScheduledGift() {
    const now = Date.now();
    if (state.eventGiftClaimed) return;
    if (now < EVENT_GIFT_DATE.getTime()) {
      if (isEventDay(new Date(now)) && now >= EVENT_REMINDER_DATE.getTime() && !eventAnnouncementDismissed && dom.rewardModal.hidden) showEventAnnouncement();
      return;
    }
    if (now >= EVENT_GIFT_END.getTime()) {
      if (!dom.rewardModal.hidden && rewardModalMode === 'event-claim') expireEventGift();
      return;
    }
    if (rewardModalMode === 'event-announcement') {
      showScheduledGift();
      return;
    }
    if (spinning || !dom.rewardModal.hidden) return;
    showScheduledGift();
  }

  function registerScheduledGift() {
    const delay = Math.max(0, EVENT_GIFT_DATE.getTime() - Date.now());
    window.setTimeout(checkScheduledGift, delay);
    window.setInterval(() => {
      if (rewardModalMode === 'event-claim') updateEventCountdown();
      checkScheduledGift();
    }, 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (rewardModalMode === 'event-claim') updateEventCountdown();
        checkScheduledGift();
      }
    });
    checkScheduledGift();
  }

  function showReward(result) {
    if (state.sounds) playRewardSound();
    rewardModalMode = 'reward';
    dom.eventCountdown.hidden = true;
    dom.rewardEyebrow.textContent = result.copy.includes('Nouveau cadeau') ? 'NOUVEAU CADEAU' : 'RÉCOMPENSE OBTENUE';
    dom.rewardTitle.textContent = result.copy.includes('Collection complète') ? 'Collection complète !' : 'C’est gagné !';
    dom.rewardObject.textContent = result.icon;
    dom.rewardName.textContent = result.title;
    dom.rewardCopy.textContent = result.copy;
    document.querySelector('#closeRewardButton').textContent = 'CONTINUER À JOUER';
    dom.rewardModal.hidden = false;
    document.querySelector('#closeRewardButton').focus();
  }

  function renderCollection() {
    const filter = dom.collectionFilter.value;
    const owned = new Set(state.collection);
    const visible = gifts.filter(gift => filter === 'all' || (filter === 'owned' ? owned.has(gift.id) : !owned.has(gift.id)));
    dom.collectionResults.textContent = `${visible.length} cadeau${visible.length === 1 ? '' : 'x'}`;
    dom.giftGrid.innerHTML = visible.map(gift => {
      const unlocked = owned.has(gift.id);
      return `<article class="gift-card ${unlocked ? 'owned' : ''}"><div class="gift-emoji">${unlocked ? gift.icon : '🔒'}</div><div class="gift-name">${unlocked ? escapeHtml(gift.name) : 'Cadeau mystérieux'}</div><div class="gift-lock">${unlocked ? 'Découvert' : 'À découvrir'}</div></article>`;
    }).join('');
  }

  function renderChallenges() {
    dom.challengeList.innerHTML = challenges.map(challenge => {
      const progress = state[challenge.stat];
      const claimed = state.claimedChallenges.includes(challenge.id);
      const complete = progress >= challenge.goal;
      const percent = Math.min(100, progress / challenge.goal * 100);
      return `<article class="challenge-item"><p class="eyebrow">DÉFI ${claimed ? 'TERMINÉ' : 'OPTIONNEL'}</p><h2>${escapeHtml(challenge.title)}</h2><p>${escapeHtml(challenge.description)}</p><div class="progress-track"><span style="width:${percent}%"></span></div><p>${Math.min(progress, challenge.goal)} / ${challenge.goal} · <span class="challenge-reward">${challenge.rewardLabel}</span></p><button class="secondary-button" data-claim="${challenge.id}" ${!complete || claimed ? 'disabled' : ''} type="button">${claimed ? 'RÉCOMPENSE RÉCUPÉRÉE' : complete ? 'RÉCUPÉRER' : 'EN COURS'}</button></article>`;
    }).join('');
  }

  function renderQuickChallenge() {
    const challenge = challenges.find(item => !state.claimedChallenges.includes(item.id)) || challenges[0];
    const progress = state[challenge.stat];
    dom.quickTitle.textContent = challenge.title;
    dom.quickText.textContent = `${challenge.description} Récompense : ${challenge.rewardLabel}.`;
    dom.quickProgress.style.width = `${Math.min(100, progress / challenge.goal * 100)}%`;
  }

  function renderShop() {
    dom.shopOffers.innerHTML = offers.map(offer => `<article class="offer-card"><div class="offer-emoji">${offer.icon}</div><h2>${offer.label}</h2><p>Ajoute ${offer.spins} ${offer.spins === 1 ? 'tour' : 'tours'} à ta réserve.</p><div class="price">${offer.cost} 🪙</div><button class="secondary-button" data-buy="${offer.spins}" type="button" ${state.coins < offer.cost ? 'disabled' : ''}>ACHETER</button></article>`).join('');
  }

  function claimChallenge(id) {
    const challenge = challenges.find(item => item.id === id);
    if (!challenge || state.claimedChallenges.includes(id) || state[challenge.stat] < challenge.goal) return;
    state.claimedChallenges.push(id);
    if (challenge.rewardType === 'spins') state.spins += challenge.reward;
    else state.coins += challenge.reward;
    saveState();
    render();
  }

  function buySpins(amount) {
    const offer = offers.find(item => item.spins === amount);
    if (!offer || state.coins < offer.cost) return;
    state.coins -= offer.cost;
    state.spins += offer.spins;
    saveState();
    render();
  }

  function setPage(pageName) {
    document.querySelectorAll('[data-screen]').forEach(section => {
      const active = section.dataset.screen === pageName;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });
    document.querySelectorAll('.nav-button').forEach(button => button.classList.toggle('active', button.dataset.page === pageName));
    if (pageName === 'wheel') requestAnimationFrame(resizeCanvas);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', () => setPage(button.dataset.page)));
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => setPage(button.dataset.go)));
  dom.spin.addEventListener('click', spin);
  dom.collectionFilter.addEventListener('change', renderCollection);
  dom.effects.addEventListener('change', () => { state.effects = dom.effects.checked; saveState(); render(); });
  dom.sounds.addEventListener('change', () => {
    state.sounds = dom.sounds.checked;
    if (state.sounds) {
      const context = getAudioContext();
      if (context && context.state === 'suspended') context.resume().catch(() => {});
    }
    saveState();
    render();
  });
  dom.music.addEventListener('change', () => {
    state.music = dom.music.checked;
    if (state.music) startMusic();
    else stopMusic();
    saveState();
    render();
  });
  dom.challengeList.addEventListener('click', event => {
    const button = event.target.closest('[data-claim]');
    if (button) claimChallenge(button.dataset.claim);
  });
  dom.shopOffers.addEventListener('click', event => {
    const button = event.target.closest('[data-buy]');
    if (button) buySpins(Number(button.dataset.buy));
  });
  document.querySelector('#closeRewardButton').addEventListener('click', () => {
    if (rewardModalMode === 'event-claim') {
      claimEventGift();
      return;
    }
    if (rewardModalMode === 'event-announcement') eventAnnouncementDismissed = true;
    dom.rewardModal.hidden = true;
    dom.spin.focus();
    checkScheduledGift();
  });
  dom.rewardModal.addEventListener('click', event => {
    if (event.target === dom.rewardModal && rewardModalMode !== 'event-claim') {
      if (rewardModalMode === 'event-announcement') eventAnnouncementDismissed = true;
      dom.rewardModal.hidden = true;
      checkScheduledGift();
    }
  });
  window.addEventListener('resize', resizeCanvas);
  registerBridge();
  registerAutoSave();
  render();
  saveState();
  resizeCanvas();
  registerScheduledGift();
})();
