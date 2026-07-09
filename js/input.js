// Merges keyboard, mouse and touch into one actions object.

export const actions = {
  left: false,
  right: false,
  jump: false,      // held
  jumpPressed: false, // edge-triggered, consumed by the game each frame
  mow: false,
};

const keys = {
  left: ['ArrowLeft', 'KeyA', 'KeyQ'],       // KeyQ: AZERTY friends
  right: ['ArrowRight', 'KeyD'],
  jump: ['ArrowUp', 'KeyW', 'KeyZ'],
  mow: ['Space', 'KeyJ', 'KeyX'],
};

const callbacks = { shop: null, fullscreen: null, mute: null, any: null };
export function onHotkey(name, fn) { callbacks[name] = fn; }

function setFromKey(code, down) {
  if (keys.left.includes(code)) actions.left = down;
  if (keys.right.includes(code)) actions.right = down;
  if (keys.jump.includes(code)) {
    if (down && !actions.jump) actions.jumpPressed = true;
    actions.jump = down;
  }
  if (keys.mow.includes(code)) actions.mow = down;
}

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    callbacks.any?.();
    setFromKey(e.code, true);
    if (e.code === 'KeyB' || e.code === 'KeyE') callbacks.shop?.();
    if (e.code === 'KeyF') callbacks.fullscreen?.();
    if (e.code === 'KeyM') callbacks.mute?.();
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => setFromKey(e.code, false));

  // mouse: hold to mow
  canvas.addEventListener('mousedown', () => { callbacks.any?.(); actions.mow = true; });
  window.addEventListener('mouseup', () => { actions.mow = false; });
  window.addEventListener('blur', () => {
    actions.left = actions.right = actions.jump = actions.mow = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // touch buttons
  bindTouch('tc-left', (d) => { actions.left = d; });
  bindTouch('tc-right', (d) => { actions.right = d; });
  bindTouch('tc-jump', (d) => {
    if (d && !actions.jump) actions.jumpPressed = true;
    actions.jump = d;
  });
  bindTouch('tc-mow', (d) => { actions.mow = d; });

  // reveal touch controls on the first touch anywhere
  window.addEventListener('touchstart', showTouchControls, { once: true, passive: true });
  if (window.matchMedia('(pointer: coarse)').matches) showTouchControls();
}

function showTouchControls() {
  document.getElementById('touch-controls').classList.remove('hidden');
}

function bindTouch(id, set) {
  const el = document.getElementById(id);
  const down = (e) => { e.preventDefault(); callbacks.any?.(); set(true); };
  const up = (e) => { e.preventDefault(); set(false); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('pointerleave', up);
}
