// Game.jsx - FULL FIXAD VERSION (2026-01-04) – Fixad av Grok
import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import collectorsData from "../data/collectors";
import Shop from "./Shop";
import About from "./About";
import CollectorMiningCard from "./CollectorMiningCard";
import ProfilePopup from "./ProfilePopup";
import useMining from "../hooks/useMining";


const ensureStarterCollector = (instances = []) => {
  const hasStarter = instances.some(i => i.instanceId === "starter-1");

  if (hasStarter) return instances;

  const starterTemplate = collectorsData.find(c => c.id === 0);
  
  return [
    {
      instanceId: "starter-1",
      collectorId: 0,
      level: 1,
      currentIncome: starterTemplate ? starterTemplate.incomePerSecond : 0.00177777778
    },
    ...instances,
  ];
};


const API_URL = "http://localhost:3001/api";

// Contract constants
const CNC_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Demo contract address
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// Formatering för tal
const formatNumber = (num) => {
  if (num === undefined || num === null) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 100_000) return (num / 1_000).toFixed(0) + "k";
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toLocaleString();
};

const formatTime = (seconds) => {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

// Leaderboard data - now loaded from localStorage or empty for real rankings

export default function Game({ cnp, setCnp, showToast }) {
  const [activeMining, setActiveMining] = useState({});
  const [cnpMinedToday, setCnpMinedToday] = useState(0);
  const [cnpMinedAllTime, setCnpMinedAllTime] = useState(0);
  const [lastResetDate, setLastResetDate] = useState(new Date().toISOString().slice(0, 10));
  const [ownedInstances, setOwnedInstances] = useState([]);
  const [currentTab, setCurrentTab] = useState("DASHBOARD");
  const [lastMineDate, setLastMineDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalIncomePerSecond, setTotalIncomePerSecond] = useState(0);
  const [starterRefresh, setStarterRefresh] = useState(0);
  const [starterLastClaimTime, setStarterLastClaimTime] = useState(null);
  const [totalCNC, setTotalCNC] = useState(0);
  // Demo version - no wallet connection needed
  // const [walletAddress, setWalletAddress] = useState("");
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  // const [provider, setProvider] = useState(null);
  // const [signer, setSigner] = useState(null);
  // const [totalCNC, setTotalCNC] = useState(0);
  const [lastPayoutDate, setLastPayoutDate] = useState(null);
  const [timeToPayout, setTimeToPayout] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [collectorCap, setCollectorCap] = useState(25);
  const [promoCode, setPromoCode] = useState("");
  const [redeemedCodes, setRedeemedCodes] = useState([]);
  const [username, setUsername] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [currentProfileId, setCurrentProfileId] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);
  const profilePopupShownRef = useRef(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const ownedInstancesRef = useRef([]);
  const lastCollectionTimeRef = useRef({});
  // Demo version - wallet states defined but not used for connection
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const { miningStatus, getMiningStatus } = useMining({
    activeMining,
    setActiveMining,
    ownedInstancesRef
  });

  useEffect(() => {
    ownedInstancesRef.current = ownedInstances;
  }, [ownedInstances]);



  useEffect(() => {
    // Force re-render every second for starter collector display, but pause when profile popup is shown
    if (showProfilePopup) return;

    const interval = setInterval(() => {
      setStarterRefresh(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showProfilePopup]);

  // Initialize starter last claim time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`lastClaimTime_starter-1`);
    if (stored) {
      setStarterLastClaimTime(parseInt(stored));
    }
  }, []);

  // Demo version - no wallet required, player starts with starter collector



  const getUpgradeCost = (instance) => {
    const template = collectorsData.find(c => c.id === instance.collectorId);
    return template ? Math.floor(template.upgradeBaseCost * Math.pow(template.upgradeCostMultiplier, instance.level - 1)) : 0;
  };





  const getIncomePerHour = (baseIncome, multiplier = 1) => {
    const result = Math.floor(baseIncome * 3600 * multiplier);
    return formatNumber(result);
  };

  const getIncomePerCycle = (baseIncome, miningTimeMs, multiplier = 1) => {
    const cycleSeconds = miningTimeMs / 1000;
    const result = Math.floor(baseIncome * cycleSeconds * multiplier);
    return formatNumber(result);
  };

  const activateAllCollectors = async () => {
    const inactiveInstances = ownedInstances.filter(i => !activeMining[i.instanceId]);

    if (inactiveInstances.length === 0) {
      showToast("All collectors already mining", "info");
      return;
    }

    try {
      // Start mining for each inactive collector
      const startPromises = inactiveInstances.map(instance =>
        startInstanceMining(instance.instanceId, instance.collectorId)
      );

      await Promise.all(startPromises);

      showToast(`Started ${inactiveInstances.length} collectors`, "success");
    } catch (error) {
      console.error("Error starting multiple collectors:", error);
      showToast("Failed to start some collectors", "error");
    }
  };

  const claimIncome = async () => {
    if (Object.keys(activeMining).length === 0) {
      showToast("No active mining to claim", "info");
      return;
    }

    try {
      // Demo version - calculate total claimable CNP locally
      const totalEarned = getTotalCollectableCNP();

      if (totalEarned <= 0) {
        showToast("No CNP to claim yet", "info");
        return;
      }

      setCnp(prev => {
        const newCnp = prev + totalEarned;
        saveGame();
        return newCnp;
      });

      // Update mined stats
      setCnpMinedToday(prev => prev + totalEarned);
      setCnpMinedAllTime(prev => prev + totalEarned);

      // Update all active mining with new lastClaimAt to reset display to 0
      const now = Date.now();
      setActiveMining(prev => {
        const updated = { ...prev };
        for (const instanceId in updated) {
          updated[instanceId] = {
            ...updated[instanceId],
            lastClaimAt: now
          };
          // Store in ref too
          lastCollectionTimeRef.current[instanceId] = now;
          // Update localStorage for persistence
          localStorage.setItem(`lastClaimTime_${instanceId}`, now.toString());
        }
        console.log("Updated all activeMining with lastClaimAt:", now);
        return updated;
      });

      showToast(`Claimed ${formatNumber(totalEarned)} CNP! Mining continues...`, "success");
    } catch (err) {
      console.error(err);
      showToast("Claim error - check console", "error");
    }
  };

  const collectInstanceIncome = async (instanceId) => {
    console.log("Collecting for instance:", instanceId);

    try {
      // Demo version - calculate claimable CNP locally for this instance
      const instance = ownedInstances.find(i => i.instanceId === instanceId);
      if (!instance) {
        showToast("Instance not found", "error");
        return;
      }

      const miningStatus = activeMining[instanceId];
      if (!miningStatus) {
        showToast("Collector not mining", "error");
        return;
      }

      const effectiveIncome = instance.currentIncome;
      // For starter collector, use the dedicated state; for others, use miningStatus
      const lastClaimTime = instanceId === "starter-1"
        ? starterLastClaimTime || miningStatus?.lastClaimAt || miningStatus?.startedAt
        : miningStatus?.lastClaimAt || miningStatus?.startedAt;
      const accumulatedCNP = lastClaimTime
        ? ((Date.now() - lastClaimTime) / 1000) * effectiveIncome
        : 0;

      if (accumulatedCNP < 0.01) {
        showToast("No CNP to collect yet", "info");
        return;
      }

      // Add earned CNP to balance
      setCnp(prev => {
        const newCnp = prev + accumulatedCNP;
        saveGame();
        return newCnp;
      });

      // Update mined stats
      setCnpMinedToday(prev => prev + accumulatedCNP);
      setCnpMinedAllTime(prev => prev + accumulatedCNP);

      // Store the collection time in ref to prevent fetchStatus from overwriting
      const newLastClaimAt = Date.now();
      lastCollectionTimeRef.current[instanceId] = newLastClaimAt;

      // For non-starter collectors, update activeMining; starter is handled separately
      if (instanceId !== "starter-1") {
        // Immediately update activeMining with new lastClaimAt to reset display to 0
        setActiveMining(prev => {
          const updated = { ...prev };
          if (updated[instanceId]) {
            updated[instanceId] = {
              ...updated[instanceId],
              lastClaimAt: newLastClaimAt
            };
          }
          console.log("Updated activeMining for", instanceId, "with lastClaimAt:", newLastClaimAt);
          return updated;
        });
      } else {
        // For starter collector, update the dedicated state
        setStarterLastClaimTime(newLastClaimAt);
      }

      // Update localStorage for persistence
      localStorage.setItem(`lastClaimTime_${instanceId}`, newLastClaimAt.toString());

      saveGame();

      showToast(`Collected ${formatNumber(Math.floor(accumulatedCNP))} CNP! Mining continues...`, "success");
    } catch (err) {
      console.error("Collect exception:", err);
      showToast("Collect error - check console", "error");
    }
  };

  const upgradeInstance = async (instanceId) => {
    console.log("upgradeInstance called with:", instanceId);
    const instance = ownedInstances.find(i => i.instanceId === instanceId);
    if (!instance) {
      console.log("Instance not found:", instanceId);
      showToast("Instance not found", "error");
      return;
    }

    const template = collectorsData.find(c => c.id === instance.collectorId);
    const upgradeCost = getUpgradeCost(instance);
    console.log("Upgrade check:", { cnp, upgradeCost, instanceLevel: instance.level, maxLevel: template?.maxLevel || 50 });

    if (cnp < upgradeCost) {
      console.log("Cannot afford upgrade");
      showToast("You can't afford this upgrade", "error");
      return;
    }

    if (instance.level >= (template?.maxLevel || 50)) {
      console.log("Max level reached");
      showToast("Max level reached!", "info");
      return;
    }

    try {
      console.log("Upgrading:", { instanceId, upgradeCost });

      // Demo version - deduct CNP and upgrade locally
      setCnp(prev => {
        const newCnp = prev - upgradeCost;
        saveGame();
        return newCnp;
      });

      // Calculate new income based on upgrade
      const newLevel = instance.level + 1;
      const newIncome = instance.currentIncome * (template?.upgradeIncomeMultiplier || 1.1);

      // Update the instance locally
      setOwnedInstances(prev =>
        prev.map(inst =>
          inst.instanceId === instanceId
            ? { ...inst, level: newLevel, currentIncome: newIncome }
            : inst
        )
      );

      showToast(`Upgraded to level ${newLevel}!`, "success");
    } catch (err) {
      console.error("Upgrade exception:", err);
      showToast("Upgrade error - check console", "error");
    }
  };

  const sellInstance = async (instanceId) => {
    console.log("sellInstance called with:", instanceId);
    const instance = ownedInstances.find(i => i.instanceId === instanceId);
    if (!instance) {
      console.log("Instance not found:", instanceId);
      showToast("Instance not found", "error");
      return;
    }

    if (instance.collectorId === 0) {
      showToast("Cannot sell starter collector", "error");
      return;
    }

    const template = collectorsData.find(c => c.id === instance.collectorId);
    if (!template) {
      showToast("Collector template not found", "error");
      return;
    }

    const refund = Math.floor(template.baseCost / 2);

    try {
      console.log("Selling:", { instanceId, refund });

      // Add refund to CNP
      setCnp(prev => {
        const newCnp = prev + refund;
        saveGame();
        return newCnp;
      });

      // Remove from owned instances
      setOwnedInstances(prev => prev.filter(inst => inst.instanceId !== instanceId));

      // If mining, stop mining
      if (activeMining[instanceId]) {
        setActiveMining(prev => {
          const updated = { ...prev };
          delete updated[instanceId];
          return updated;
        });
        // Remove from localStorage
        localStorage.removeItem(`lastClaimTime_${instanceId}`);
      }

      showToast(`Sold for ${formatNumber(refund)} CNP!`, "success");
    } catch (err) {
      console.error("Sell exception:", err);
      showToast("Sell error - check console", "error");
    }
  };

  const getActiveIncomePerSecond = () => {
    return Object.keys(activeMining).reduce((sum, id) => {
      const inst = ownedInstancesRef.current.find(i => i.instanceId === id);
      return inst ? sum + getIncome(inst) : sum;
    }, 0);
  };

  const getTotalCollectableCNP = () => {
    return Object.keys(activeMining).reduce((sum, id) => {
      const inst = ownedInstancesRef.current.find(i => i.instanceId === id);
      if (!inst) return sum;

      const miningStatus = activeMining[id];
      const effectiveIncome = inst.currentIncome;

      const lastClaimTime = miningStatus?.lastClaimAt || miningStatus?.startedAt;
      const accumulatedCNP = lastClaimTime
        ? ((Date.now() - lastClaimTime) / 1000) * effectiveIncome
        : 0;

      return sum + accumulatedCNP;
    }, 0);
  };

  const getStorageKey = (base) => {
    // Demo version - always use guest
    return `${base}_guest`;
  };

  const saveGame = () => {
    const state = {
      ownedInstances,
      activeMining,
      cnp,
      cnpMinedToday,
      cnpMinedAllTime,
      lastResetDate,
      collectorCap,
      redeemedCodes,
      profiles,
      currentProfileId,
      username,
      totalCNC,
      // Add more if needed, e.g., leaderboard (if not backend-fetched)
    };
    const gameKey = currentProfileId ? `coinCollectors_state_${currentProfileId}` : 'coinCollectors_state_guest';
    try {
      localStorage.setItem(gameKey, JSON.stringify(state));
      // Also save profiles globally
      localStorage.setItem('coinCollectors_profiles', JSON.stringify(profiles));
    } catch (error) {
      console.error('Failed to save game:', error); // Handle storage quota issues
    }
  };



  const handleBuySuccess = (newInstances) => {
    setOwnedInstances(prev => [...prev, ...newInstances]);
    saveGame(); // Explicit save after buy
  };



  const createProfile = (profileName) => {
    if (profiles.length >= 5) {
      showToast("Maximum 5 profiles allowed", "error");
      return;
    }

    const newProfile = {
      id: Date.now().toString(),
      name: profileName,
      createdAt: new Date().toISOString(),
    };

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    setCurrentProfileId(newProfile.id);
    setUsername(profileName);
    setShowProfilePopup(false);

    // Reset game state for new profile
    setCnp(0);
    setTotalCNC(0);
    setOwnedInstances(ensureStarterCollector([]));
    setActiveMining({});
    setCnpMinedToday(0);
    setCnpMinedAllTime(0);
    setCollectorCap(25);
    setRedeemedCodes([]);
    setLastResetDate(new Date().toISOString().slice(0, 10));

    // Save profiles globally
    localStorage.setItem('coinCollectors_profiles', JSON.stringify(updatedProfiles));

    showToast(`Profile "${profileName}" created!`, "success");
  };

  const selectProfile = (profileId) => {
    setCurrentProfileId(profileId);
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setUsername(profile.name);
    }
    setShowProfilePopup(false);

    // Load game state for the selected profile
    const gameKey = `coinCollectors_state_${profileId}`;
    const savedGameJson = localStorage.getItem(gameKey);
    if (savedGameJson) {
      try {
        const savedGame = JSON.parse(savedGameJson);
        setCnp(savedGame.cnp ?? 0);
        setTotalCNC(savedGame.totalCNC ?? 0);
        setOwnedInstances(ensureStarterCollector(savedGame.ownedInstances ?? []));
        setActiveMining(savedGame.activeMining ?? {});
        setCnpMinedToday(savedGame.cnpMinedToday ?? 0);
        setCnpMinedAllTime(savedGame.cnpMinedAllTime ?? 0);
        setCollectorCap(savedGame.collectorCap ?? 25);
        setRedeemedCodes(savedGame.redeemedCodes ?? []);
        setLastResetDate(savedGame.lastResetDate ?? new Date().toISOString().slice(0, 10));
      } catch (e) {
        console.error('Failed to load profile game state:', e);
        // Reset to defaults for this profile
        setCnp(0);
        setTotalCNC(0);
        setOwnedInstances(ensureStarterCollector([]));
        setActiveMining({});
        setCnpMinedToday(0);
        setCnpMinedAllTime(0);
        setCollectorCap(25);
        setRedeemedCodes([]);
        setLastResetDate(new Date().toISOString().slice(0, 10));
      }
    } else {
      // No saved state for this profile, start fresh
      setCnp(0);
      setTotalCNC(0);
      setOwnedInstances(ensureStarterCollector([]));
      setActiveMining({});
      setCnpMinedToday(0);
      setCnpMinedAllTime(0);
      setCollectorCap(25);
      setRedeemedCodes([]);
      setLastResetDate(new Date().toISOString().slice(0, 10));
    }

    showToast(`Switched to profile "${profile?.name}"`, "success");
  };

  const deleteProfile = (profileId) => {
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    setProfiles(updatedProfiles);

    // Remove the profile-specific localStorage key
    localStorage.removeItem(`coinCollectors_state_${profileId}`);

    if (currentProfileId === profileId) {
      if (updatedProfiles.length > 0) {
        selectProfile(updatedProfiles[0].id);
      } else {
        setCurrentProfileId(null);
        setUsername("");
        setShowProfilePopup(true);
      }
    }

    // Save updated profiles globally
    localStorage.setItem('coinCollectors_profiles', JSON.stringify(updatedProfiles));

    showToast("Profile deleted", "info");
  };

  const getProfileStats = (profileId) => {
    const gameKey = `coinCollectors_state_${profileId}`;
    const savedGameJson = localStorage.getItem(gameKey);
    if (savedGameJson) {
      try {
        const savedGame = JSON.parse(savedGameJson);
        const cnp = savedGame.cnp ?? 0;
        const collectors = Array.isArray(savedGame.ownedInstances) ? savedGame.ownedInstances.length : 0;
        return { cnp, collectors };
      } catch (e) {
        return { cnp: 0, collectors: 0 };
      }
    }
    return { cnp: 0, collectors: 0 };
  };

  // Demo version - no wallet connection needed
  // const verifyWalletConnection = async () => {
  //   if (!window.ethereum) return;
  //   // ... wallet verification code ...
  // };

  const disconnectWallet = () => {
    setWalletAddress("");
    setIsLoggedIn(false);
    setProvider(null);
    setSigner(null);
    localStorage.removeItem("walletAddress");
    resetGameState();
    setTotalCNC(0);
    showToast("Wallet disconnected", "info");
  };

  const resetGameState = () => {
    setCnp(0);
    setTotalCNC(0);
    setLastPayoutDate(null);
    setCnpMinedToday(0);
    setCnpMinedAllTime(0);
    setLastResetDate(new Date().toISOString().slice(0, 10));
    setOwnedInstances([]);
    // Save game after resetting
    setTimeout(() => saveGame(), 0);
  };

  // Demo version - no wallet connection needed
  // const fetchCNCBalance = async () => {
  //   if (!provider || !walletAddress) return;
  //   // ... fetch CNC balance code ...
  // };

 

  const getIncome = (instance) => {
    return instance.currentIncome;
  };

  const loadGame = () => {
    try {
      // Load profiles globally
      const savedProfilesJson = localStorage.getItem('coinCollectors_profiles');
      const savedProfiles = savedProfilesJson ? JSON.parse(savedProfilesJson) : [];
      setProfiles(savedProfiles);

      // Determine current profile
      let currentProfileIdToUse = currentProfileId;
      if (!currentProfileIdToUse && savedProfiles.length > 0) {
        currentProfileIdToUse = savedProfiles[0].id;
        setCurrentProfileId(currentProfileIdToUse);
        setUsername(savedProfiles[0].name);
      }

      const gameKey = currentProfileIdToUse ? `coinCollectors_state_${currentProfileIdToUse}` : 'coinCollectors_state_guest';
      let savedGameJson = localStorage.getItem(gameKey);

      // If no profile-specific state, try to migrate from old demo key
      if (!savedGameJson) {
        const oldKey = 'coinCollectorsDemo_state';
        savedGameJson = localStorage.getItem(oldKey);
        if (savedGameJson) {
          // Migrate to new key
          localStorage.setItem(gameKey, savedGameJson);
          localStorage.removeItem(oldKey);
        }
      }

      if (savedGameJson) {
        try {
          const savedGame = JSON.parse(savedGameJson);
          console.log('Loading saved game:', savedGame);
          setCnp(savedGame.cnp ?? 0);
          setTotalCNC(savedGame.totalCNC ?? 0);
          setLastPayoutDate(savedGame.lastPayoutDate ?? null);
          setCnpMinedAllTime(savedGame.cnpMinedAllTime ?? 0);
          setActiveMining(savedGame.activeMining ?? {});
          setCollectorCap(savedGame.collectorCap ?? 25);
          setRedeemedCodes(savedGame.redeemedCodes ?? []);
          setUsername(savedGame.username ?? '');

          const todayStr = new Date().toISOString().slice(0, 10);
          const savedLastReset = savedGame.lastResetDate ?? todayStr;
          if (savedLastReset !== todayStr) {
            setCnpMinedToday(0);
            setLastResetDate(todayStr);
          } else {
            setCnpMinedToday(savedGame.cnpMinedToday ?? 0);
            setLastResetDate(savedLastReset);
          }

         const fixedInstances = ensureStarterCollector(
          Array.isArray(savedGame.ownedInstances) ? savedGame.ownedInstances : []
        );
        setOwnedInstances(fixedInstances);

        // Initialize leaderboard as empty for real rankings
        setLeaderboard([]);

        } catch (e) {
          console.error('Failed to load game:', e);
          // Fall back to demo starter values
          setCnp(0);
          setOwnedInstances(ensureStarterCollector([]));
          setActiveMining({});
          setCnpMinedToday(0);
          setCnpMinedAllTime(0);
          setLastResetDate(new Date().toISOString().slice(0, 10));
          setCollectorCap(25);
          setRedeemedCodes([]);
        }
      } else {
        // No saved game, set demo starter values
        setCnp(0);
        setOwnedInstances(ensureStarterCollector([]));
        setActiveMining({});
        setCnpMinedToday(0);
        setCnpMinedAllTime(0);
        setLastResetDate(new Date().toISOString().slice(0, 10));
        setCollectorCap(25);
        setRedeemedCodes([]);
      }

      // Set game loaded after all loading is complete
      setGameLoaded(true);

    } catch (e) {
      console.warn("Load failed, starting fresh with starter", e);
      resetGameState();
      setGameLoaded(true);
    }
  };

  // Update leaderboard when CNP or username changes
  const updateLeaderboard = () => {
    if (!username) return;

    setLeaderboard(prev => {
      const playerEntry = { rank: 0, name: username, cnp: Math.floor(cnp), address: walletAddress || "No wallet" };
      const withoutPlayer = prev.filter(p => p.name !== username);
      const newLeaderboard = [...withoutPlayer, playerEntry]
        .sort((a, b) => b.cnp - a.cnp)
        .slice(0, 10)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      localStorage.setItem(getStorageKey("leaderboard"), JSON.stringify(newLeaderboard));
      return newLeaderboard;
    });
  };

  useEffect(() => {
    loadGame();
    // Demo version - no wallet connection needed
    // verifyWalletConnection();
  }, []);

  // Auto-save useEffect that watches these states and saves JSON.stringify to 'coinCollectorsDemo_state'
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveGame();
    }
  }, [cnp, ownedInstances, activeMining, cnpMinedToday, cnpMinedAllTime, lastResetDate, collectorCap, redeemedCodes]);

  // Mark as loaded after loadGame
  useEffect(() => {
    if (gameLoaded) {
      hasLoadedRef.current = true;
    }
  }, [gameLoaded]);

  // Handle profile popup display after game is fully loaded (only once)
  useEffect(() => {
    if (gameLoaded && !currentProfileId && !profilePopupShownRef.current) {
      profilePopupShownRef.current = true;
      setShowProfilePopup(true);
    }
  }, [gameLoaded]);

  useEffect(() => {
    if (walletAddress) {
      loadGame();
    }
  }, [walletAddress]);

  useEffect(() => {
    updateLeaderboard();
  }, [cnp, username]);






  // Demo version - no wallet connection needed
  // useEffect(() => {
  //   if (window.ethereum) {
  //     const handleAccountsChanged = (accounts) => {
  //       if (accounts.length === 0) {
  //         disconnectWallet();
  //       } else {
  //         const newAddress = accounts[0];
  //         setWalletAddress(newAddress);
  //         localStorage.setItem("walletAddress", newAddress);
  //         showToast("Wallet account changed", "info");
  //       }
  //     };

  //     window.ethereum.on('accountsChanged', handleAccountsChanged);

  //     return () => {
  //       window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
  //     };
  //   }
  // }, []);

  useEffect(() => {
    setTotalIncomePerSecond(getActiveIncomePerSecond());
  }, [activeMining]);

  useEffect(() => {
    if (isLoggedIn) {
      document.body.classList.add('wallet-connected');
    } else {
      document.body.classList.remove('wallet-connected');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Pause countdown updates when profile popup is shown to prevent re-renders
    if (showProfilePopup) return;

    const updateCountdown = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const todayStr = now.toISOString().slice(0, 10);

      // Reset mined today at midnight
      if (lastResetDate !== todayStr) {
        setCnpMinedToday(0);
        setLastResetDate(todayStr);
      }

      if (dayOfWeek === 0 && lastPayoutDate !== todayStr && cnp > 0) {
        triggerPayout();
      }

      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(0, 0, 0, 0);

      const diffMs = nextSunday - now;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeToPayout({ days, hours, minutes, seconds });
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [cnp, lastPayoutDate, showToast, lastResetDate, showProfilePopup]);

  useEffect(() => {
    if (!provider || !walletAddress) return;

    const contract = new ethers.Contract(CNC_CONTRACT_ADDRESS, ERC20_ABI, provider);

    const handleTransfer = (from, to, value) => {
      if (
        from.toLowerCase() === walletAddress.toLowerCase() ||
        to.toLowerCase() === walletAddress.toLowerCase()
      ) {
        fetchCNCBalance();
      }
    };

    contract.on("Transfer", handleTransfer);

    return () => {
      contract.off("Transfer", handleTransfer);
    };
  }, [provider, walletAddress]);

  const startInstanceMining = async (instanceId, collectorId) => {
    try {
      // Demo version - start mining locally
      const now = Date.now();
      setActiveMining(prev => ({
        ...prev,
        [instanceId]: {
          startedAt: now,
          collectorId
        }
      }));
      saveGame();
      showToast("Mining started!", "success");
    } catch (err) {
      console.error(err);
      showToast("Mining start error", "error");
    }
  };



  const signInWithMetaMask = async () => {
    if (!window.ethereum) {
      showToast("MetaMask not detected!", "error");
      return;
    }

    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const network = await ethProvider.getNetwork();

      if (Number(network.chainId) !== 56) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x38" }], // BSC
          });
        } catch (err) {
          showToast("Please switch to BNB Smart Chain in MetaMask", "error");
          return;
        }
      }

      const sig = await ethProvider.getSigner();
      setProvider(ethProvider);
      setSigner(sig);
      setWalletAddress(address);
      setIsLoggedIn(true);
      localStorage.setItem("walletAddress", address);

      // Save game after signing in
      setTimeout(() => saveGame(), 0);

      showToast("Wallet connected!", "success");

      fetchCNCBalance();

    } catch (err) {
      console.error(err);
      showToast("Wallet connection failed", "error");
    }
  };



  const handleExpandCollectors = () => {
    if (cnp >= 1000) {
      setCnp(prev => prev - 1000);
      setCollectorCap(prev => prev + 25);
      saveGame();
      showToast("Collector capacity expanded to 50 slots!", "success");
    } else {
      showToast("You need 1,000 CNP to expand!", "error");
    }
  };

  const redeemPromoCode = () => {
    const code = promoCode.toUpperCase().trim();
    if (!code) {
      showToast("Please enter a code!", "error");
      return;
    }

    if (redeemedCodes.includes(code)) {
      showToast("Code already redeemed!", "info");
      return;
    }

    let reward = 0;
    if (code === "CNC2026") {
      reward = 1000;
    } else if (code === "CNCBETA2026") {
      reward = 2500;
    } else if (code === "CNCTOKEN") {
      reward = 500;
    } else {
      showToast("Invalid code. Try again!", "error");
      return;
    }

    setCnp(prev => prev + reward);
    setRedeemedCodes(prev => [...prev, code]);
    saveGame();
    showToast(`🎉 Code redeemed! You received ${formatNumber(reward)} CNP!`, "success");
    setPromoCode("");
  };

  // Username popup component
  const UsernamePopup = () => {
    const [inputUsername, setInputUsername] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = () => {
      const trimmed = inputUsername.trim();
      if (trimmed.length < 4 || trimmed.length > 10) {
        setError("Username must be 4-10 characters long");
        return;
      }

      // Check uniqueness against leaderboard
      const existingUsernames = leaderboard.map(p => p.name.toLowerCase());
      if (existingUsernames.includes(trimmed.toLowerCase())) {
        setError("Username already taken");
        return;
      }

      setUsername(trimmed);
      setShowUsernamePopup(false);
      saveGame();
      showToast(`Welcome, ${trimmed}!`, "success");
    };

    return (
      <div className="username-popup-overlay">
        <div className="username-popup glass">
          <h2>Welcome to Coin Collectors!</h2>
          <p>Choose a unique username (4-10 characters)</p>
          <input
            type="text"
            id="username-input"
            name="username"
            autocomplete="username"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            placeholder="Enter username..."
            maxLength={10}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <p className="error-text">{error}</p>}
          <button onClick={handleSubmit} disabled={!inputUsername.trim()}>
            Start Playing
          </button>
        </div>
      </div>
    );
  };



  // Render helpers
  const freeCollector = ownedInstances.find((inst) => inst.collectorId === 0);
  const paidCollectors = ownedInstances.filter((inst) => inst.collectorId !== 0);

  // Temporär debug: Kolla vad ownedInstances innehåller (ta bort sen)

  return (
    <div className="game-layout">
      {showUsernamePopup && gameLoaded && <UsernamePopup />}
      {showProfilePopup && gameLoaded && (
        <ProfilePopup
          profiles={profiles}
          createProfile={createProfile}
          selectProfile={selectProfile}
          getProfileStats={getProfileStats}
        />
      )}
      <aside className="sidebar">
        <h1 className="sidebar-title">Coin Collectors (BETA)</h1>
        <nav className="sidebar-nav">
          <button
            className={currentTab === "DASHBOARD" ? "sidebar-btn active" : "sidebar-btn"}
            onClick={() => setCurrentTab("DASHBOARD")}
          >
            Dashboard
          </button>
          <button
            className={currentTab === "SHOP" ? "sidebar-btn active" : "sidebar-btn"}
            onClick={() => setCurrentTab("SHOP")}
          >
            Shop
          </button>
          <button
            className={currentTab === "LEADERBOARD" ? "sidebar-btn active" : "sidebar-btn"}
            onClick={() => setCurrentTab("LEADERBOARD")}
          >
            Leaderboard
          </button>

          <button
            className={currentTab === "ABOUT" ? "sidebar-btn active" : "sidebar-btn"}
            onClick={() => setCurrentTab("ABOUT")}
          >
            About
          </button>
          <button
            className={currentTab === "CONTACT" ? "sidebar-btn active" : "sidebar-btn"}
            onClick={() => setCurrentTab("CONTACT")}
          >
            Contact
          </button>
          <button
            className={currentTab === "CHART" ? "sidebar-btn active" : "sidebar-btn"}
            onClick={() => setCurrentTab("CHART")}
          >
            Chart
          </button>
        </nav>
        <button
          className="sidebar-btn change-profile-btn"
          onClick={() => setShowProfilePopup(true)}
          title="Change Profile"
        >
          Change Profile
        </button>



      </aside>

      <main className="main-content">
        {currentTab === "DASHBOARD" && (
          <>
            {/* Promo Code UI */}
            <div className="promo-code-panel glass fade-in">
              <h3 className="promo-title">🎁 Redeem Promo Codes</h3>
              <p className="promo-subtitle">Enter codes to earn extra CNP income!</p>
              <div className="promo-input-group">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code..."
                  className="promo-input"
                  onKeyPress={(e) => e.key === 'Enter' && redeemPromoCode()}
                />
                <button
                  onClick={redeemPromoCode}
                  className="btn-redeem"
                  disabled={!promoCode.trim()}
                >
                  Redeem
                </button>
              </div>
            </div>

            {/* Starter Collector (gratis) - HERO LAYOUT */}
            {freeCollector && (() => {
              const template = collectorsData.find(c => c.id === freeCollector.collectorId);
              const miningStatus = getMiningStatus(freeCollector);
              const isMining = Boolean(miningStatus?.startedAt);
              const currentIncome = freeCollector.currentIncome || 0;
              const effectiveIncome = currentIncome;

              // Calculate accumulated since last claim (or since start if never claimed)
              const lastClaimTime = starterLastClaimTime || miningStatus?.lastClaimAt || miningStatus?.startedAt;
              const accumulatedCNP = isMining && lastClaimTime
                ? ((Date.now() - lastClaimTime) / 1000) * effectiveIncome
                : 0;

              const progress = isMining && template
                ? Math.min((Date.now() - miningStatus.startedAt) / template.miningTime, 1)
                : 0;

              // Debug logging
              if (isMining) {
                console.log("Starter collector:", {
                  currentIncome,
                  effectiveIncome,
                  elapsedSeconds: (Date.now() - miningStatus.startedAt) / 1000,
                  accumulatedCNP,
                  miningTime: template.miningTime,
                  miningStatus
                });
              }

              // Format functions
              const formatMiningTime = (ms) => {
                const totalSeconds = ms / 1000;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = Math.floor(totalSeconds % 60);

                if (hours > 0) {
                  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
                } else if (minutes > 0) {
                  return seconds > 0 ? `${minutes}min ${seconds}s` : `${minutes}min`;
                } else {
                  return `${seconds}s`;
                }
              };

              const formatElapsedTime = (seconds) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);

                if (hours > 0) {
                  return `${hours}h ${minutes}min`;
                } else if (minutes > 0) {
                  return `${minutes}min ${secs}s`;
                } else {
                  return `${secs}s`;
                }
              };

              return (
                <div className="starter-hero-card starter-special starter-hero-middle">
                  <div className="free-collector-badge">This collector is free</div>
                  <div className="starter-hero-content-middle">
                    <h2 className="starter-hero-title">{template.name}</h2>
                    <p className="starter-hero-quote">"{template.quote}"</p>

                    <div className="starter-hero-stats">
                      <div className="hero-stat">
                        <span>Mining Time:</span>
                        <strong>{formatMiningTime(template.miningTime)}</strong>
                      </div>

                      <div className="hero-stat">
                        <span>Per Hour:</span>
                        <strong>{formatNumber(getIncomePerHour(currentIncome))} CNP</strong>
                      </div>

                      <div className="hero-stat">
                        <span>Level:</span>
                        <strong>{freeCollector.level} / 50</strong>
                      </div>

                      <div className="hero-stat">
                        <span>Per Cycle:</span>
                        <strong>{formatNumber(getIncomePerCycle(currentIncome, template.miningTime))} CNP</strong>
                      </div>

                      <div className="hero-stat">
                        <span>Upgrade Cost:</span>
                        <strong>{formatNumber(getUpgradeCost(freeCollector))} CNP</strong>
                      </div>

                      <div className="hero-stat">
                        <span>Claimable:</span>
                        <strong>
                          {accumulatedCNP >= 1
                            ? formatNumber(Math.floor(accumulatedCNP))
                            : accumulatedCNP.toFixed(2)}{" "}
                          CNP
                        </strong>
                      </div>
                    </div>

                    {/* Progress bar under stats */}
                    <div className="starter-progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress * 100}%` }}
                      ></div>
                    </div>

                    {/* Action buttons in the middle */}
                    <div className="hero-btn-group starter-actions-middle">
                      {isMining ? (
                        <button
                          className="btn-activate-hero"
                          onClick={() => collectInstanceIncome(freeCollector.instanceId)}
                        >
                          COLLECT
                        </button>
                      ) : (
                        <button
                          className="btn-activate-hero"
                          onClick={() => startInstanceMining(freeCollector.instanceId, freeCollector.collectorId)}
                        >
                          ACTIVATE
                        </button>
                      )}
                      <button
                        className="btn-upgrade-dashboard"
                        onClick={() => upgradeInstance(freeCollector.instanceId)}
                      >
                        UPGRADE
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Förbättrad Active Mining Income Panel – kompakt, modern och färgglad */}
            {/* Förbättrad Active Mining Income Panel – Boost i vänstra nedre hörnet */}
            <div className="active-income-panel glass fade-in">
  {/* Header med bara titel och ikon */}
  <div className="income-header">
    <div className="income-title-section">
      <div className="income-icon-pulse">💰</div>
      <div>
        <h3 className="income-title">Active Mining Income</h3>
        <p className="income-subtitle">Real-time rewards from your collectors</p>
      </div>
    </div>
  </div>

  {/* Huvudvärde */}
  <div className="income-main-display">
    <div className="income-big-number">
      {formatNumber(Math.floor(totalIncomePerSecond * 3600))}
      <span className="income-unit">CNP / h</span>
    </div>

    {/* Stats */}
    <div className="income-stats-grid">
      <div className="income-stat-item">
        <span className="stat-label">Mined today</span>
        <strong className="stat-value">{formatNumber(Math.floor(cnpMinedToday))} CNP</strong>
      </div>

      <div className="income-stat-item">
        <span className="stat-label">Alltime mined</span>
        <strong className="stat-value">{formatNumber(Math.floor(cnpMinedAllTime))} CNP</strong>
      </div>

      <div className="income-stat-item">
        <span className="stat-label">Active collectors</span>
        <strong className="stat-value">
          {Object.keys(activeMining).length} / {collectorCap}
        </strong>
      </div>

      <div className="income-stat-item">
        <span className="stat-label">Collectable now</span>
        <strong className="stat-value highlight">
          {formatNumber(Math.floor(getTotalCollectableCNP()))} CNP
        </strong>
      </div>
    </div>
  </div>

  {/* Action-knappar centrerade under stats */}
  <div className="income-action-buttons">
    <button onClick={claimIncome}>
      Claim Income
    </button>

    <button
      onClick={activateAllCollectors}
      disabled={ownedInstances.length === Object.keys(activeMining).length}
      className="activate-all-btn"
      title={
        ownedInstances.length === Object.keys(activeMining).length
          ? "All collectors are already mining"
          : "Start mining on all inactive collectors"
      }
    >
      <span className="btn-text">
        {ownedInstances.length === Object.keys(activeMining).length ? "All Active" : "Activate All"}
      </span>
    </button>
  </div>


</div>

            {/* Dina köpta collectors */}
            <h2 className="collector-header">My Collectors</h2>

            {/* Collector Expansion Card - Show when at cap */}
            {ownedInstances.length >= collectorCap && (
              <div className="collector-expansion-card">
                <div className="expansion-header">
                  <h3>🎉 Collector Limit Reached!</h3>
                  <p>You've hit the maximum of {collectorCap} collectors. Expand your empire!</p>
                </div>
                <div className="expansion-content">
                  <div className="expansion-offer">
                    <div className="expansion-details">
                      <h4>Buy 25 More Slots</h4>
                      <p>Unlock additional collector slots to continue building your mining empire.</p>
                      <div className="expansion-cost">
                        <span className="cost-amount">1,000 CNP</span>
                      </div>
                    </div>
                    <button
                      className="btn-expand-collectors"
                      onClick={() => {
                        if (cnp >= 1000) {
                          setCnp(prev => prev - 1000);
                          setCollectorCap(prev => prev + 25);
                          showToast("Collector capacity expanded to 50 slots!", "success");
                        } else {
                          showToast("You need 1,000 CNP to expand!", "error");
                        }
                      }}
                      disabled={cnp < 1000}
                    >
                      EXPAND NOW
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paidCollectors.length === 0 ? (
              <div className="empty-dashboard glass fade-in">
                Go to the Shop to buy more collectors!
              </div>
            ) : (
            <div className="collectors-grid" style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', justifyContent: 'center', padding: '20px' }}>
              {paidCollectors.map((instance) => {
                const template = collectorsData.find(c => c.id === instance.collectorId);
                if (!template) return null;

                const miningStatus = activeMining[instance.instanceId];

                return (
                  <CollectorMiningCard
                    key={instance.instanceId}
                    instance={instance}
                    template={template}
                    miningStatus={miningStatus}
                    isStarter={instance.instanceId === "starter-1"}
                    isLoggedIn={true}
                    cnp={cnp}
                    upgradeCost={getUpgradeCost(instance)}
                    onActivate={() => startInstanceMining(instance.instanceId, instance.collectorId)}
                    onUpgrade={() => upgradeInstance(instance.instanceId)}
                    onSell={() => sellInstance(instance.instanceId)}
                    onCollect={() => collectInstanceIncome(instance.instanceId)}
                    formatNumber={formatNumber}
                    getIncomePerHour={getIncomePerHour}
                    getIncomePerCycle={getIncomePerCycle}
                  />
                );
              })}

              {paidCollectors.length < 8 &&
        Array.from({ length: 8 - paidCollectors.length }, (_, i) => (
          <div key={`empty-slot-${i}`} className="empty-collector-slot glass">
            <h3>No Collector</h3>
            <p>This slot is empty</p>
            <button 
              className="btn-go-to-shop"
              onClick={() => setCurrentTab("SHOP")}
            >
              Go to Shop →
            </button>
          </div>
        ))}

            </div>
            )}
          </>
        )}

        {currentTab === "SHOP" && (
          <Shop
            cnp={cnp}
            collectors={collectorsData}
            setCnp={setCnp}
            setOwnedInstances={setOwnedInstances}
            showToast={showToast}
            onBuySuccess={handleBuySuccess}
            ownedInstances={ownedInstances}
            collectorCap={collectorCap}
          />
        )}



        {currentTab === "LEADERBOARD" && (
          <div className="tab-content glass fade-in leaderboard-page">
            <h2 className="collector-header glow-border">Leaderboard – Top Collectors</h2>
            <div className="leaderboard-list">
              {leaderboard.map((player) => (
                <div key={player.rank} className="leaderboard-entry">
                  <span className="rank">#{player.rank}</span>
                  <span className="player-name">{player.name}</span>
                  <span className="player-score">{formatNumber(player.cnp)} CNP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === "ABOUT" && <About />}
        
        {currentTab === "CONTACT" && (
          <div className="tab-content glass fade-in">
            <h2 className="collector-header glow-border">Contact</h2>

            <div className="social-grid">
              <a href="https://discord.gg/JqMYANc8kV" className="social-link" target="_blank" rel="noopener noreferrer">
                <img src="/images/discord-logo.png" alt="Discord Logo" />
                <span>Discord</span>
              </a>
              <a href="https://twitter.com/collectors2moon" className="social-link" target="_blank" rel="noopener noreferrer">
                <img src="/images/twitter-logo.png" alt="Twitter Logo" />
                <span>Twitter (X)</span>
              </a>
              <a href="https://instagram.com/coincollectors2moon" className="social-link" target="_blank" rel="noopener noreferrer">
                <img src="/images/instagram-logo.png" alt="Instagram Logo" />
                <span>Instagram</span>
              </a>
              <a href="https://t.me/cnc2moon" className="social-link" target="_blank" rel="noopener noreferrer">
                <img src="/images/telegram-logo.png" alt="Telegram Logo" />
                <span>Telegram</span>
              </a>
            </div>
          </div>
        )}

{currentTab === "CHART" && (
  <div className="tab-content glass fade-in">
    <h2 className="collector-header glow-border">Chart</h2>
    <p>Real-time crypto chart coming soon!</p>

    {/* Presale-sektion – fet och omissbar */}
    <div className="presale-section">
       <img src="/images/cncSOL.jpg" className="presale-image" alt="Telegram Logo" />

      
      <a 
        href="https://tools.smithii.io/launch/Coin-Collector-" 
        target="_blank" 
        rel="noopener noreferrer"
        className="presale-button"
      >
        <span className="pulse">JOIN PRESALE NOW</span>
        <span className="arrow">→</span>
      </a>

      <p className="presale-text">
        Limited spots • Best price • Don't miss out
      </p>
    </div>
  </div>
)}


   
      </main>

        
      
    </div>

      
  );
  
};

