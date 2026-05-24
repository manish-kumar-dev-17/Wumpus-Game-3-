const SIZE = 4;
const START = { x: 0, y: 0 };
const DIRS = [
  { name: "North", key: "north", dx: 0, dy: -1 },
  { name: "East", key: "east", dx: 1, dy: 0 },
  { name: "South", key: "south", dx: 0, dy: 1 },
  { name: "West", key: "west", dx: -1, dy: 0 }
];

const ASSETS = {
  explorer: "assets/explorer.svg",
  wumpus: "assets/wumpus.svg",
  pit: "assets/pit.svg",
  gold: "assets/gold.svg",
  breeze: "assets/breeze.svg",
  stench: "assets/stench.svg"
};

const REVEAL_WORLD = true;
const USE_REFERENCE_LAYOUT = true;

const boardEl = document.querySelector("#board");
const logEl = document.querySelector("#log");
const perceptsEl = document.querySelector("#percepts");
const memoryEl = document.querySelector("#memory");
const scoreEl = document.querySelector("#score");
const arrowStateEl = document.querySelector("#arrowState");
const facingEl = document.querySelector("#facing");
const gameStateEl = document.querySelector("#gameState");
const autoBtn = document.querySelector("#autoBtn");

let state;
let autoTimer = null;

function key(pos) {
  return `${pos.x},${pos.y}`;
}

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

function inBounds(pos) {
  return pos.x >= 0 && pos.x < SIZE && pos.y >= 0 && pos.y < SIZE;
}

function neighbors(pos) {
  return DIRS
    .map(dir => ({ x: pos.x + dir.dx, y: pos.y + dir.dy }))
    .filter(inBounds);
}

function randomCell(blocked) {
  const options = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const pos = { x, y };
      if (!blocked.has(key(pos))) options.push(pos);
    }
  }
  return options[Math.floor(Math.random() * options.length)];
}

function createWorld() {
  if (USE_REFERENCE_LAYOUT) {
    return {
      wumpus: { x: 0, y: 2 },
      gold: { x: 1, y: 2 },
      pits: new Set(["2,0", "2,2", "3,3"]),
      wumpusAlive: true
    };
  }

  const blocked = new Set([key(START), "1,0", "0,1"]);
  const wumpus = randomCell(blocked);
  blocked.add(key(wumpus));
  const gold = randomCell(blocked);
  blocked.add(key(gold));

  const pits = new Set();
  while (pits.size < 3) {
    const pit = randomCell(blocked);
    pits.add(key(pit));
    blocked.add(key(pit));
  }

  return { wumpus, gold, pits, wumpusAlive: true };
}

function newGame() {
  stopAuto();
  state = {
    world: createWorld(),
    player: { ...START },
    dir: 1,
    score: 0,
    hasArrow: true,
    hasGold: false,
    over: false,
    won: false,
    bumped: false,
    screamed: false,
    visited: new Set([key(START)]),
    safe: new Set([key(START)]),
    suspected: new Map(),
    log: ["The explorer enters the cave at [1,1]."]
  };
  applyPercepts();
  render();
}

function currentPercepts() {
  const here = state.player;
  const around = neighbors(here);
  const world = state.world;
  const hasPitNear = around.some(pos => world.pits.has(key(pos)));
  const hasWumpusNear = world.wumpusAlive && around.some(pos => same(pos, world.wumpus));
  const percepts = [];
  if (hasPitNear) percepts.push("Breeze");
  if (hasWumpusNear) percepts.push("Stench");
  if (same(here, world.gold) && !state.hasGold) percepts.push("Glitter");
  if (state.bumped) percepts.push("Bump");
  if (state.screamed) percepts.push("Scream");
  if (percepts.length === 0) percepts.push("Clear");
  return percepts;
}

function applyPercepts() {
  const percepts = currentPercepts();
  const hereKey = key(state.player);
  state.visited.add(hereKey);
  state.safe.add(hereKey);

  const clear = !percepts.includes("Breeze") && !percepts.includes("Stench");
  for (const pos of neighbors(state.player)) {
    const posKey = key(pos);
    if (clear) {
      state.safe.add(posKey);
      state.suspected.delete(posKey);
    } else if (!state.visited.has(posKey) && !state.safe.has(posKey)) {
      const tags = state.suspected.get(posKey) || new Set();
      if (percepts.includes("Breeze")) tags.add("P?");
      if (percepts.includes("Stench")) tags.add("W?");
      state.suspected.set(posKey, tags);
    }
  }
}

function addLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 8);
}

function endGame(won, message) {
  state.over = true;
  state.won = won;
  state.score += won ? 1000 : -1000;
  addLog(message);
  stopAuto();
}

function moveForward() {
  if (state.over) return;
  state.bumped = false;
  state.screamed = false;
  const dir = DIRS[state.dir];
  const next = { x: state.player.x + dir.dx, y: state.player.y + dir.dy };
  state.score -= 1;

  if (!inBounds(next)) {
    state.bumped = true;
    addLog("The cave wall blocks the move.");
    render();
    return;
  }

  state.player = next;
  addLog(`Moved to [${next.x + 1},${next.y + 1}].`);

  if (state.world.pits.has(key(next))) {
    endGame(false, "The explorer fell into a pit.");
  } else if (state.world.wumpusAlive && same(next, state.world.wumpus)) {
    endGame(false, "The Wumpus caught the explorer.");
  } else if (state.hasGold && same(next, START)) {
    endGame(true, "The explorer escaped with the gold.");
  } else {
    applyPercepts();
  }
  render();
}

function turn(amount) {
  if (state.over) return;
  state.bumped = false;
  state.screamed = false;
  state.dir = (state.dir + amount + DIRS.length) % DIRS.length;
  state.score -= 1;
  addLog(`Turned ${amount < 0 ? "left" : "right"}.`);
  applyPercepts();
  render();
}

function shoot() {
  if (state.over || !state.hasArrow) return;
  state.bumped = false;
  state.screamed = false;
  state.hasArrow = false;
  state.score -= 10;
  const dir = DIRS[state.dir];
  let arrow = { ...state.player };

  while (true) {
    arrow = { x: arrow.x + dir.dx, y: arrow.y + dir.dy };
    if (!inBounds(arrow)) break;
    if (state.world.wumpusAlive && same(arrow, state.world.wumpus)) {
      state.world.wumpusAlive = false;
      state.screamed = true;
      addLog("The arrow struck the Wumpus.");
      applyPercepts();
      render();
      return;
    }
  }

  addLog("The arrow vanished into the dark.");
  applyPercepts();
  render();
}

function grab() {
  if (state.over || state.hasGold || !same(state.player, state.world.gold)) return;
  state.bumped = false;
  state.screamed = false;
  state.hasGold = true;
  state.score += 100;
  addLog("Gold secured.");
  if (same(state.player, START)) {
    endGame(true, "The explorer escaped with the gold.");
  }
  render();
}

function maybeExit() {
  if (state.hasGold && same(state.player, START)) {
    endGame(true, "The explorer escaped with the gold.");
    render();
  }
}

function rotateToward(target) {
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const targetDir = DIRS.findIndex(dir => dir.dx === Math.sign(dx) && dir.dy === Math.sign(dy));
  if (targetDir === -1 || targetDir === state.dir) return false;
  const rightSteps = (targetDir - state.dir + DIRS.length) % DIRS.length;
  turn(rightSteps <= 2 ? 1 : -1);
  return true;
}

function stepAgent() {
  if (state.over) return;
  const percepts = currentPercepts();

  if (percepts.includes("Glitter")) {
    grab();
    return;
  }

  if (state.hasGold) {
    const routeHome = bestPath(state.player, START, cell => state.visited.has(key(cell)) || state.safe.has(key(cell)));
    if (routeHome.length > 1) {
      moveAlong(routeHome[1]);
    } else {
      maybeExit();
    }
    return;
  }

  const safeFrontier = neighbors(state.player).find(pos => state.safe.has(key(pos)) && !state.visited.has(key(pos)));
  if (safeFrontier) {
    moveAlong(safeFrontier);
    return;
  }

  const path = nearestSafeUnknown();
  if (path.length > 1) {
    moveAlong(path[1]);
    return;
  }

  if (percepts.includes("Stench") && state.hasArrow) {
    shoot();
    return;
  }

  const retreat = bestPath(state.player, START, cell => state.visited.has(key(cell)));
  if (retreat.length > 1) {
    moveAlong(retreat[1]);
  } else {
    addLog("Agent paused: no safe frontier remains.");
    stopAuto();
    render();
  }
}

function moveAlong(next) {
  if (rotateToward(next)) return;
  moveForward();
}

function nearestSafeUnknown() {
  let best = [];
  for (const safeKey of state.safe) {
    if (state.visited.has(safeKey)) continue;
    const [x, y] = safeKey.split(",").map(Number);
    const path = bestPath(state.player, { x, y }, cell => state.safe.has(key(cell)));
    if (path.length && (!best.length || path.length < best.length)) best = path;
  }
  return best;
}

function bestPath(from, to, passable) {
  const queue = [[from]];
  const seen = new Set([key(from)]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (same(last, to)) return path;
    for (const next of neighbors(last)) {
      const nextKey = key(next);
      if (seen.has(nextKey) || !passable(next)) continue;
      seen.add(nextKey);
      queue.push([...path, next]);
    }
  }
  return [];
}

function toggleAuto() {
  if (autoTimer) {
    stopAuto();
    return;
  }
  autoBtn.textContent = "Pause Agent";
  autoBtn.setAttribute("aria-pressed", "true");
  autoTimer = window.setInterval(stepAgent, 650);
}

function stopAuto() {
  if (autoTimer) window.clearInterval(autoTimer);
  autoTimer = null;
  autoBtn.textContent = "Run Agent";
  autoBtn.setAttribute("aria-pressed", "false");
}

function render() {
  renderBoard();
  renderPanel();
  renderMemory();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let y = SIZE - 1; y >= 0; y -= 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const pos = { x, y };
      const posKey = key(pos);
      const seen = state.visited.has(posKey) || REVEAL_WORLD;
      const percepts = perceptsFor(pos);
      const cell = document.createElement("div");
      cell.className = `cell ${seen ? "seen" : "unseen"} ${same(pos, state.player) ? "current" : ""}`;

      if (seen || state.over) {
        const effects = document.createElement("div");
        effects.className = "effects";
        if (percepts.includes("Stench")) effects.append(marker("S", "stench", "Stench"));
        if (percepts.includes("Breeze")) effects.append(marker("B", "breeze", "Breeze"));
        cell.append(effects);
      }

      const icons = document.createElement("div");
      icons.className = "icons";
      if (seen || state.over) {
        if (state.world.pits.has(posKey)) icons.append(sprite("pit", "Pit"));
        if (!state.hasGold && same(pos, state.world.gold)) icons.append(sprite("gold", "Gold"));
        if (state.world.wumpusAlive && same(pos, state.world.wumpus)) icons.append(sprite("wumpus", "Wumpus"));
      }
      if (same(pos, state.player)) icons.append(sprite("explorer", "Explorer", DIRS[state.dir].key));
      cell.append(icons);

      const badges = document.createElement("div");
      badges.className = "badges";
      if (state.safe.has(posKey)) badges.append(badge("Safe", "safe"));
      if (state.suspected.has(posKey)) {
        for (const label of state.suspected.get(posKey)) badges.append(badge(label, "risk"));
      }
      cell.append(badges);
      boardEl.append(cell);
    }
  }
}

function marker(letter, type, label) {
  const el = document.createElement("span");
  el.className = `percept-marker ${type}`;
  el.setAttribute("aria-label", label);
  el.innerHTML = `<span class="waves">~~~</span><strong>${letter}</strong>`;
  return el;
}

function perceptsFor(pos) {
  const around = neighbors(pos);
  const result = [];
  if (around.some(next => state.world.pits.has(key(next)))) result.push("Breeze");
  if (state.world.wumpusAlive && around.some(next => same(next, state.world.wumpus))) result.push("Stench");
  return result;
}

function sprite(type, label, extra = "") {
  const el = document.createElement("img");
  el.className = `sprite ${type} ${extra}`;
  el.src = ASSETS[type];
  el.alt = label;
  el.draggable = false;
  return el;
}

function badge(label, type) {
  const el = document.createElement("span");
  el.className = `badge ${type}`;
  el.textContent = label;
  return el;
}

function renderPanel() {
  scoreEl.textContent = state.score;
  arrowStateEl.textContent = state.hasArrow ? "Ready" : "Spent";
  facingEl.textContent = DIRS[state.dir].name;
  gameStateEl.textContent = state.over ? (state.won ? "Escaped" : "Lost") : "Exploring";

  perceptsEl.innerHTML = "";
  for (const percept of currentPercepts()) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = percept;
    perceptsEl.append(chip);
  }

  logEl.innerHTML = "";
  for (const item of state.log) {
    const li = document.createElement("li");
    li.textContent = item;
    logEl.append(li);
  }

  const disabled = state.over;
  document.querySelector("#moveBtn").disabled = disabled;
  document.querySelector("#turnLeftBtn").disabled = disabled;
  document.querySelector("#turnRightBtn").disabled = disabled;
  document.querySelector("#shootBtn").disabled = disabled || !state.hasArrow;
  document.querySelector("#grabBtn").disabled = disabled || state.hasGold || !same(state.player, state.world.gold);
  document.querySelector("#stepBtn").disabled = disabled;
}

function renderMemory() {
  memoryEl.innerHTML = "";
  for (let y = SIZE - 1; y >= 0; y -= 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const posKey = `${x},${y}`;
      const cell = document.createElement("div");
      const isVisited = state.visited.has(posKey);
      const isFrontier = state.safe.has(posKey) && !isVisited;
      cell.className = `memory-cell ${isVisited ? "visited" : ""} ${isFrontier ? "frontier" : ""}`;
      cell.textContent = isVisited ? "Seen" : isFrontier ? "Open" : state.suspected.has(posKey) ? [...state.suspected.get(posKey)].join(" ") : "--";
      memoryEl.append(cell);
    }
  }
}

document.querySelector("#newGameBtn").addEventListener("click", newGame);
document.querySelector("#moveBtn").addEventListener("click", moveForward);
document.querySelector("#turnLeftBtn").addEventListener("click", () => turn(-1));
document.querySelector("#turnRightBtn").addEventListener("click", () => turn(1));
document.querySelector("#shootBtn").addEventListener("click", shoot);
document.querySelector("#grabBtn").addEventListener("click", grab);
document.querySelector("#stepBtn").addEventListener("click", stepAgent);
autoBtn.addEventListener("click", toggleAuto);

window.addEventListener("keydown", event => {
  if (event.key === "ArrowUp") moveForward();
  if (event.key === "ArrowLeft") turn(-1);
  if (event.key === "ArrowRight") turn(1);
  if (event.key.toLowerCase() === "s") shoot();
  if (event.key.toLowerCase() === "g") grab();
});

newGame();
