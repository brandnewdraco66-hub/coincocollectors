import express from "express";
import { ethers } from "ethers";
import collectors from "./collectors.js";

const router = express.Router();

// In-memory store for mining state
const activeMining = {};
const userBalances = {};

// Get mining time for an instance (based on collector ID)
const getMiningTime = (instanceId) => {
  // Parse collector ID from instanceId (e.g., "starter-1" -> 0, "instance-1-1" -> 1)
  const collectorId = instanceId.startsWith("starter") ? 0 : parseInt(instanceId.split("-")[1]) || 0;
  const collector = collectors[collectorId];
  return collector ? collector.miningTime * 1000 : 900000; // default 15min
};

// Start mining for a single instance
router.post("/start", async (req, res) => {
  try {
    const { wallet, instanceId, miningTimeMs, incomePerSecond, signature } = req.body;

    const message = `START_MINING:${wallet}:${instanceId}`;
    const recovered = ethers.verifyMessage(message, signature);

    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(403).json({ error: "Wallet mismatch" });
    }

    if (activeMining[instanceId]) {
      return res.status(409).json({ error: "Already mining" });
    }

    const startTime = Date.now();
    const endTime = startTime + miningTimeMs;

    activeMining[instanceId] = {
      wallet,
      startTime,
      endTime,
      startedAt: startTime,
      lastClaimAt: startTime, // Initialize lastClaimAt
      incomePerSecond: incomePerSecond || 0.00277777778
    };

    return res.json({ 
      startTime, 
      endTime,
      startedAt: startTime,
      lastClaimAt: startTime
    });
  } catch (err) {
    console.error("Start mining error:", err);
    return res.status(401).json({ error: "Invalid signature" });
  }
});

// Batch start mining
router.post("/batch-start", async (req, res) => {
  const { wallet, instances, nonce, signature } = req.body;

  if (!wallet || !instances || !signature || !nonce) {
    return res.status(400).json({ error: "Missing data" });
  }

  const message = `BATCH_START:${wallet}:${instances.map(i => i.instanceId).join(",")}:${nonce}`;

  let recovered;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch {
    return res.status(401).json({ error: "Invalid signature" });
  }

  if (recovered.toLowerCase() !== wallet.toLowerCase()) {
    return res.status(403).json({ error: "Wallet mismatch" });
  }

  const now = Date.now();
  const started = {};

  for (const inst of instances) {
    const { instanceId, miningTimeMs, incomePerSecond } = inst;
    
    if (activeMining[instanceId]) continue;

    const endTime = now + miningTimeMs;

    activeMining[instanceId] = {
      wallet,
      startTime: now,
      endTime,
      startedAt: now,
      lastClaimAt: now,
      incomePerSecond: incomePerSecond || 0.00277777778
    };

    started[instanceId] = {
      startTime: now,
      endTime,
      startedAt: now,
      lastClaimAt: now
    };
  }

  return res.json({ activeMining: started });
});

// Get mining status
router.get("/status", (req, res) => {
  const { wallet } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ error: "Wallet required" });
  }

  // Filter active mining for this wallet
  const walletMining = {};
  const now = Date.now();

  for (const [instanceId, data] of Object.entries(activeMining)) {
    if (data.wallet.toLowerCase() === wallet.toLowerCase()) {
      // Clean up expired mining
      if (now >= data.endTime) {
        delete activeMining[instanceId];
        continue;
      }

      walletMining[instanceId] = {
        startTime: data.startTime,
        endTime: data.endTime,
        startedAt: data.startedAt,
        lastClaimAt: data.lastClaimAt || data.startedAt,
        incomePerSecond: data.incomePerSecond
      };
    }
  }

  return res.json({
    activeMining: walletMining,
    balance: userBalances[wallet.toLowerCase()] || 0
  });
});

// Claim single instance income
router.post("/claim-single", async (req, res) => {
  try {
    const { wallet, instanceId, message, signature } = req.body;

    // Verify signature
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(403).json({ error: "Wallet mismatch" });
    }

    const mining = activeMining[instanceId];
    
    if (!mining) {
      return res.status(400).json({ error: "Not mining" });
    }

    if (mining.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(403).json({ error: "Not your instance" });
    }

    const now = Date.now();
    const lastClaim = mining.lastClaimAt || mining.startedAt;
    
    // Calculate earned CNP since last claim
    const elapsedMs = now - lastClaim;
    const elapsedSeconds = elapsedMs / 1000;
    const earned = elapsedSeconds * mining.incomePerSecond;

    console.log("Claim calculation:", {
      instanceId,
      now,
      lastClaim,
      elapsedMs,
      elapsedSeconds,
      incomePerSecond: mining.incomePerSecond,
      earned
    });

    // Update balance
    const walletKey = wallet.toLowerCase();
    userBalances[walletKey] = (userBalances[walletKey] || 0) + earned;

    // Update lastClaimAt to NOW - this resets the accumulation
    mining.lastClaimAt = now;

    console.log("Updated mining state:", {
      instanceId,
      newLastClaimAt: mining.lastClaimAt,
      totalBalance: userBalances[walletKey]
    });

    return res.json({
      earned,
      totalCnp: userBalances[walletKey],
      newLastClaimAt: mining.lastClaimAt
    });
  } catch (err) {
    console.error("Claim single error:", err);
    return res.status(500).json({ error: "Claim failed" });
  }
});

// Bulk claim all active mining
router.post("/claim", async (req, res) => {
  try {
    const { wallet, message, signature } = req.body;

    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(403).json({ error: "Wallet mismatch" });
    }

    const walletKey = wallet.toLowerCase();
    const now = Date.now();
    let totalEarned = 0;

    // Find all active mining for this wallet
    for (const [instanceId, mining] of Object.entries(activeMining)) {
      if (mining.wallet.toLowerCase() === walletKey) {
        const lastClaim = mining.lastClaimAt || mining.startedAt;
        const elapsedMs = now - lastClaim;
        const elapsedSeconds = elapsedMs / 1000;
        const earned = elapsedSeconds * mining.incomePerSecond;

        totalEarned += earned;

        // Update lastClaimAt
        mining.lastClaimAt = now;
      }
    }

    // Update balance
    userBalances[walletKey] = (userBalances[walletKey] || 0) + totalEarned;

    return res.json({
      earned: totalEarned,
      totalCnp: userBalances[walletKey]
    });
  } catch (err) {
    console.error("Claim error:", err);
    return res.status(500).json({ error: "Claim failed" });
  }
});

export default router;