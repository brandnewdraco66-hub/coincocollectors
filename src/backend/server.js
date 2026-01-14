const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const collectors = require("./collectors"); // Object {0: {...}}

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   FILES & DATA
========================= */

const USERS_FILE = path.join(__dirname, "users.json");
const TIME_WINDOW = 5 * 60 * 1000; // 5 min för timestamp

/* =========================
   UTIL
========================= */

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}



function getUser(wallet) {
  const users = loadUsers();
  const w = wallet.toLowerCase();

  if (!users[w]) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    users[w] = {
      wallet: w,
      cnp: 0,
      activeMining: {},
      ownedInstances: [],
      boosted: { collectors: [], endTime: 0 },
      minedToday: 0,          // ← NYTT
      minedAllTime: 0,        // ← NYTT
      lastResetDate: today    // ← NYTT – för att veta när vi senast resetade daglig mined
    };
  }

  // 🛡️ säkerställ array (för gamla users)
  if (!Array.isArray(users[w].ownedInstances)) {
    users[w].ownedInstances = [];
  }

  // ✅ auto-ge starter collector
  const hasStarter = users[w].ownedInstances.some(
    i => i.instanceId === "starter-1"
  );

  if (!hasStarter) {
    const starterCollector = collectors[0];
    users[w].ownedInstances.push({
      instanceId: "starter-1",
      collectorId: 0,
      level: 1,
      currentIncome: starterCollector.incomePerSecond
    });
  }

  // Säkerställ att gamla användare också får fälten (om de saknas)
  if (users[w].minedToday === undefined) users[w].minedToday = 0;
  if (users[w].minedAllTime === undefined) users[w].minedAllTime = 0;
  if (!users[w].lastResetDate) users[w].lastResetDate = new Date().toISOString().slice(0, 10);

  saveUsers(users);
  return users[w];
}


/* =========================
   SIGNATURE VERIFY (SAFE)
========================= */

function verifySignature(wallet, message, signature) {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}

/* =========================
   EARNINGS (CONTINUOUS MINING)
========================= */

function calculateEarnings(instance, collector) {
  const now = Date.now();
  const elapsedMs = now - instance.startedAt;
  const elapsedSeconds = elapsedMs / 1000;

  // Calculate total earned based on elapsed time
  const totalEarned = collector.incomePerSecond * elapsedSeconds;

  return {
    earned: totalEarned,
    elapsedSeconds
  };
}

/* =========================
   START MINING
========================= */

app.post("/api/mining/start", (req, res) => {
  try {
    const { wallet, instanceId, collectorId, message, signature } = req.body;

    if (!verifySignature(wallet, message, signature)) {
      return res.status(401).json({ error: "Bad signature" });
    }

    const parts = message.split(':');
    if (parts[0] !== 'START_MINING' || parts[1] !== instanceId) {
      return res.status(400).json({ error: "Invalid message" });
    }
    const timestamp = parseInt(parts[2]);
    if (Math.abs(Date.now() - timestamp) > TIME_WINDOW) {
      return res.status(400).json({ error: "Timestamp expired" });
    }

    const users = loadUsers();
    const user = getUser(wallet);

    const owned = user.ownedInstances.find(
      i =>
        i.instanceId === instanceId &&
        i.collectorId === Number(collectorId)
    );

    if (!owned) {
      return res.status(403).json({ error: "Not owned" });
    }

    if (user.activeMining[instanceId]) {
      return res.status(400).json({ error: "Already mining" });
    }

    const collector = collectors[Number(collectorId)];
    if (!collector) {
      return res.status(404).json({ error: "Collector not found" });
    }

    const startTime = Date.now();
    const endTime = startTime + (collector.miningTime * 1000);

    user.activeMining[instanceId] = {
      collectorId: Number(collectorId),
      startedAt: startTime
    };

    users[wallet.toLowerCase()] = user;
    saveUsers(users);

    res.json({ 
      success: true,
      startTime,
      endTime
    });
  } catch (e) {
    console.error("START ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   STATUS
========================= */

app.get("/api/mining/status", (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.json({ activeMining: {}, cnp: 0, ownedInstances: [], boosted: { collectors: [], endTime: 0 } });

  const users = loadUsers();
  const user = users[wallet.toLowerCase()];
  if (!user) return res.json({ activeMining: {}, cnp: 0, ownedInstances: [], boosted: { collectors: [], endTime: 0 } });

  const now = Date.now();
  const cleanedActiveMining = {};

  for (const [instanceId, inst] of Object.entries(user.activeMining || {})) {
    const collector = collectors[inst.collectorId];
    if (!collector) continue;

    const miningEndTime = inst.startedAt + (collector.miningTime * 1000);
    
    if (now < miningEndTime) {
      cleanedActiveMining[instanceId] = inst;
    }
  }

  user.activeMining = cleanedActiveMining;
  users[wallet.toLowerCase()] = user;
  saveUsers(users);

    res.json({
      activeMining: cleanedActiveMining,
      cnp: user.cnp || 0,
      ownedInstances: user.ownedInstances || [],
      boosted: user.boosted || { collectors: [], endTime: 0 },
      minedToday: user.minedToday || 0,          // ← NYTT
      minedAllTime: user.minedAllTime || 0,      // ← NYTT
      lastResetDate: user.lastResetDate || new Date().toISOString().slice(0, 10)  // ← NYTT
    });
});

/* =========================
   CLAIM (CONTINUOUS MINING)
========================= */

app.post("/api/mining/claim", (req, res) => {
  const { wallet, message, signature } = req.body;
  if (!wallet) return res.status(400).json({ error: "Missing wallet" });

  if (!verifySignature(wallet, message, signature)) {
    return res.status(401).json({ error: "Bad signature" });
  }

  const parts = message.split(':');
  if (parts[0] !== 'CLAIM_MINING') {
    return res.status(400).json({ error: "Invalid message" });
  }
  const timestamp = parseInt(parts[1]);
  if (Math.abs(Date.now() - timestamp) > TIME_WINDOW) {
    return res.status(400).json({ error: "Timestamp expired" });
  }

  const users = loadUsers();
  const user = users[wallet.toLowerCase()];
  if (!user) return res.status(404).json({ error: "No user" });

  let claimed = 0;
  const now = Date.now();

  // Kolla om det är en ny dag → reset minedToday
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastResetDate !== today) {
    user.minedToday = 0;
    user.lastResetDate = today;
  }

  for (const [instanceId, inst] of Object.entries(user.activeMining || {})) {
    const collector = collectors[inst.collectorId];
    const instance = user.ownedInstances.find(i => i.instanceId === instanceId);
    if (!collector || !instance) continue;

    const lastClaimAt = inst.lastClaimAt || inst.startedAt;
    const elapsedMs = now - lastClaimAt;
    const elapsedSeconds = elapsedMs / 1000;

    // Check if boosted
    const isBoosted = user.boosted && user.boosted.collectors && user.boosted.collectors.includes(instanceId) && now < user.boosted.endTime;
    const multiplier = isBoosted ? 1.2 : 1; // Assuming BOOST_MULTIPLIER is 1.2
    const effectiveIncome = instance.currentIncome * multiplier;

    const reward = effectiveIncome * elapsedSeconds;

    if (reward > 0) {
      claimed += reward;

      // Uppdatera lastClaimAt så det fortsätter ticka från nu
      user.activeMining[instanceId].lastClaimAt = now;
    }
  }

  if (claimed > 0) {
    user.cnp += claimed;
    user.minedToday += claimed;      // ← SPARA TILL IDAG
    user.minedAllTime += claimed;    // ← SPARA ALL TIME
  }

  saveUsers(users);

  res.json({
    claimed,
    totalCnp: user.cnp,
    minedToday: user.minedToday,
    minedAllTime: user.minedAllTime
  });
});

/* =========================
   CLAIM SINGLE COLLECTOR
========================= */

app.post("/api/mining/claim-single", (req, res) => {
  console.log("📥 Claim-single request received:", req.body);
  
  const { wallet, instanceId, message, signature } = req.body;
  if (!wallet || !instanceId) {
    console.log("❌ Missing parameters");
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (!verifySignature(wallet, message, signature)) {
    console.log("❌ Bad signature");
    return res.status(401).json({ error: "Bad signature" });
  }

  const parts = message.split(':');
  if (parts[0] !== 'CLAIM_SINGLE' || parts[1] !== instanceId) {
    console.log("❌ Invalid message format");
    return res.status(400).json({ error: "Invalid message" });
  }
  const timestamp = parseInt(parts[2]);
  if (Math.abs(Date.now() - timestamp) > TIME_WINDOW) {
    console.log("❌ Timestamp expired");
    return res.status(400).json({ error: "Timestamp expired" });
  }

  const users = loadUsers();
  const user = users[wallet.toLowerCase()];
  if (!user) {
    console.log("❌ No user found");
    return res.status(404).json({ error: "No user" });
  }

  if (!user.activeMining[instanceId]) {
    console.log("❌ Not mining:", instanceId);
    console.log("Active mining:", user.activeMining);
    return res.status(400).json({ error: "Not mining" });
  }

  const inst = user.activeMining[instanceId];
  const collector = collectors[inst.collectorId];
  const instance = user.ownedInstances.find(i => i.instanceId === instanceId);

  let earned = 0;
  if (collector && instance) {
    const now = Date.now();
    const lastClaimTime = inst.lastClaimAt || inst.startedAt;
    const elapsedMs = now - lastClaimTime;
    const elapsedSeconds = elapsedMs / 1000;

    // Check if boosted
    const isBoosted = user.boosted && user.boosted.collectors && user.boosted.collectors.includes(instanceId) && now < user.boosted.endTime;
    const multiplier = isBoosted ? 1.2 : 1; // Assuming BOOST_MULTIPLIER is 1.2
    const effectiveIncome = instance.currentIncome * multiplier;

    earned = effectiveIncome * elapsedSeconds;

    user.cnp += earned;

    console.log(`✅ Earned ${earned} CNP for ${instanceId} (boosted: ${isBoosted})`);
    console.log(`Setting lastClaimAt to ${now} (was ${lastClaimTime})`);

    // Update last claim time (but keep original startedAt)
    user.activeMining[instanceId].lastClaimAt = now;

    console.log(`After update:`, user.activeMining[instanceId]);
  }

  saveUsers(users);

  console.log("✅ Claim-single success");
  res.json({
    success: true,
    earned,
    totalCnp: user.cnp
  });
});

/* =========================
   BUY COLLECTOR
========================= */

app.post("/api/buy/collector", (req, res) => {
  console.log("📥 Buy request received:", req.body);
  
  const { wallet, newInstances, message, signature } = req.body;
  if (!wallet || !newInstances || !Array.isArray(newInstances)) {
    console.log("❌ Missing parameters");
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (!verifySignature(wallet, message, signature)) {
    console.log("❌ Bad signature");
    return res.status(401).json({ error: "Bad signature" });
  }

  const parts = message.split(':');
  if (parts[0] !== 'BUY_COLLECTORS') {
    console.log("❌ Invalid message format");
    return res.status(400).json({ error: "Invalid message" });
  }
  const timestamp = parseInt(parts[2]);
  if (Math.abs(Date.now() - timestamp) > TIME_WINDOW) {
    console.log("❌ Timestamp expired");
    return res.status(400).json({ error: "Timestamp expired" });
  }

  const users = loadUsers();
  const user = getUser(wallet);

  // Add instances to user's collection
  newInstances.forEach(inst => {
    const collector = collectors[inst.collectorId];
    if (!collector) {
      console.log("⚠️ Unknown collector:", inst.collectorId);
      return;
    }

    // Create proper instance with correct income
    const properInstance = {
      instanceId: inst.instanceId,
      collectorId: inst.collectorId,
      level: 1,
      currentIncome: collector.incomePerSecond
    };

    user.ownedInstances.push(properInstance);
    console.log(`✅ Added ${collector.name} (${inst.instanceId})`);
  });

  users[wallet.toLowerCase()] = user;
  saveUsers(users);

  console.log(`✅ Purchase complete: ${newInstances.length} collectors added`);
  res.json({
    success: true,
    ownedInstances: user.ownedInstances
  });
});

/* =========================
   BATCH START MINING
========================= */

app.post("/api/mining/batch-start", (req, res) => {
  console.log("📥 Batch start request received:", req.body);

  const { wallet, instanceIds, nonce, message, signature } = req.body;
  if (!wallet || !instanceIds || !Array.isArray(instanceIds)) {
    console.log("❌ Missing parameters");
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (!verifySignature(wallet, message, signature)) {
    console.log("❌ Bad signature");
    return res.status(401).json({ error: "Bad signature" });
  }

  const parts = message.split(':');
  if (parts[0] !== 'Coin Collectors – Batch Mining Start' || parts[1] !== wallet || parts[2] !== instanceIds.join(",") || parts[3] !== nonce) {
    console.log("❌ Invalid message format");
    return res.status(400).json({ error: "Invalid message" });
  }
  const timestamp = parseInt(parts[4]);
  if (Math.abs(Date.now() - timestamp) > TIME_WINDOW) {
    console.log("❌ Timestamp expired");
    return res.status(400).json({ error: "Timestamp expired" });
  }

  const users = loadUsers();
  const user = users[wallet.toLowerCase()];
  if (!user) {
    console.log("❌ No user found");
    return res.status(404).json({ error: "No user" });
  }

  const activeMining = {};
  const now = Date.now();

  for (const instanceId of instanceIds) {
    const instance = user.ownedInstances.find(i => i.instanceId === instanceId);
    if (!instance) {
      console.log("❌ Instance not found:", instanceId);
      return res.status(404).json({ error: `Instance not found: ${instanceId}` });
    }

    if (user.activeMining[instanceId]) {
      console.log("❌ Already mining:", instanceId);
      return res.status(400).json({ error: `Already mining: ${instanceId}` });
    }

    const collector = collectors[instance.collectorId];
    if (!collector) {
      console.log("❌ Collector not found for instance:", instanceId);
      return res.status(404).json({ error: `Collector not found for instance: ${instanceId}` });
    }

    const startTime = now;
    const endTime = startTime + (collector.miningTime * 1000);

    activeMining[instanceId] = {
      collectorId: instance.collectorId,
      startedAt: startTime
    };
  }

  // Update user's active mining
  user.activeMining = { ...user.activeMining, ...activeMining };
  saveUsers(users);

  console.log(`✅ Batch started ${instanceIds.length} collectors`);
  res.json({
    success: true,
    activeMining
  });
});

/* =========================
   UPGRADE COLLECTOR
========================= */

app.post("/api/upgrade/collector", (req, res) => {
  console.log("📥 Upgrade request received:", req.body);
  
  const { wallet, instanceId, message, signature } = req.body;
  if (!wallet || !instanceId) {
    console.log("❌ Missing parameters");
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (!verifySignature(wallet, message, signature)) {
    console.log("❌ Bad signature");
    return res.status(401).json({ error: "Bad signature" });
  }

  const parts = message.split(':');
  if (parts[0] !== 'UPGRADE_COLLECTOR' || parts[1] !== instanceId) {
    console.log("❌ Invalid message format");
    return res.status(400).json({ error: "Invalid message" });
  }
  const timestamp = parseInt(parts[2]);
  if (Math.abs(Date.now() - timestamp) > TIME_WINDOW) {
    console.log("❌ Timestamp expired");
    return res.status(400).json({ error: "Timestamp expired" });
  }

  const users = loadUsers();
  const user = users[wallet.toLowerCase()];
  if (!user) {
    console.log("❌ No user found");
    return res.status(404).json({ error: "No user" });
  }

  const instance = user.ownedInstances.find(i => i.instanceId === instanceId);
  if (!instance) {
    console.log("❌ Instance not found:", instanceId);
    return res.status(404).json({ error: "Instance not found" });
  }

  const collector = collectors[instance.collectorId];
  if (!collector) {
    console.log("❌ Collector not found");
    return res.status(404).json({ error: "Collector not found" });
  }

  // Check max level
  if (instance.level >= collector.maxLevel) {
    console.log("❌ Max level reached");
    return res.status(400).json({ error: "Max level reached" });
  }

  // Calculate upgrade cost (assuming you have upgradeBaseCost and upgradeCostMultiplier in collectors)
  const upgradeCost = Math.floor(
    (collector.upgradeBaseCost || 25) * Math.pow(collector.upgradeCostMultiplier || 1.4, instance.level - 1)
  );

  // Check if user has enough CNP
  if (user.cnp < upgradeCost) {
    console.log("❌ Not enough CNP:", user.cnp, "needed:", upgradeCost);
    return res.status(400).json({ error: "Not enough CNP" });
  }

  // Deduct cost
  user.cnp -= upgradeCost;

  // Upgrade level
  instance.level += 1;

  // Increase income by 10% per level
  const incomeIncrease = collector.incomePerSecond * 0.1;
  instance.currentIncome = (instance.currentIncome || collector.incomePerSecond) + incomeIncrease;

  saveUsers(users);

  console.log(`✅ Upgraded ${instanceId} to level ${instance.level}`);
  res.json({
    success: true,
    newLevel: instance.level,
    newIncome: instance.currentIncome,
    totalCnp: user.cnp
  });
});

/* =========================
   SERVER
========================= */

app.listen(3001, () => {
  console.log("🔥 Backend running on http://localhost:3001");
});