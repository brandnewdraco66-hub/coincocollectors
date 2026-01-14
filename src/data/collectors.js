// src/data/collectors.js - Med unika quotes till varje collector
// src/data/collectors.js - Med unika quotes till varje collector
// NU MED INDIVIDUELLA UPGRADE-STATS (upgradeBaseCost och upgradeCostMultiplier) – ÄNDRA HÄR FÖR VARJE COLLECTOR
// src/data/collectors.js - Nu med maxLevel för varje collector
// src/data/collectors.js
// FRONTEND-ONLY DATA (UI, visuals, upgrade-info)
// ⚠️ Economy is validated SERVER-SIDE – these values are DISPLAY ONLY

const collectors = [
  {
    id: 0,
    name: "Starter Coin Collector",
    baseCost: 0,
    baseIncome: 10,              // CNP / hour (DISPLAY ONLY)
    incomePerSecond: 0.00277777778, // MUST MATCH SERVER
    miningTime: 900000,          // ms (15 min = 900 seconds * 1000) – UI progress only
    quote: "Your journey to riches begins here!",
    image: "/images/starter.png",
    upgradeBaseCost: 25,
    upgradeCostMultiplier: 1.4,
    maxLevel: 50
  },

  {
    id: 1,
    name: "Coin Collector",
    baseCost: 500,
    baseIncome: 30,
    incomePerSecond: 0.00833333333,
    miningTime: 1800000,         // 30 min
    quote: "Every coin counts in the journey to freedom.",
    image: "/images/collectors/1.png",
    upgradeBaseCost: 75,
    upgradeCostMultiplier: 1.6,
    maxLevel: 50
  },

  {
    id: 2,
    name: "Albin Wallin",
    baseCost: 5000,
    baseIncome: 120,
    incomePerSecond: 0.0333333333,
    miningTime: 3600000,         // 1h
    quote: "Quiet grind, loud results.",
    image: "/images/collectors/2.png",
    upgradeBaseCost: 300,
    upgradeCostMultiplier: 1.8,
    maxLevel: 100
  },

  {
    id: 3,
    name: "9-5 Slave",
    baseCost: 13000,
    baseIncome: 300,
    incomePerSecond: 0.0833333333,
    miningTime: 3600000,
    quote: "Trading time for money... until I escape.",
    image: "/images/collectors/3.png",
    upgradeBaseCost: 750,
    upgradeCostMultiplier: 2.0,
    maxLevel: 75
  },

  {
    id: 4,
    name: "Thug",
    baseCost: 30000, //25000
    baseIncome: 600,
    incomePerSecond: 0.166666667,
    miningTime: 7200000,         // 2h
    quote: "Street smart, crypto rich.",
    image: "/images/collectors/4.png",
    upgradeBaseCost: 1500,
    upgradeCostMultiplier: 2.2,
    maxLevel: 60
  },

  {
    id: 5,
    name: "Dealer",
    baseCost: 75000,
    baseIncome: 1500,
    incomePerSecond: 0.416666667,
    miningTime: 900000,          // 15 min
    quote: "I don't sell dreams... I deliver profits.",
    image: "/images/collectors/5.png",
    upgradeBaseCost: 4000,
    upgradeCostMultiplier: 2.4,
    maxLevel: 50
  },

  {
    id: 6,
    name: "Distributor",
    baseCost: 200000,
    baseIncome: 3000,
    incomePerSecond: 0.833333333,
    miningTime: 28800000,        // 8h
    quote: "Supply meets demand. Always.",
    image: "/images/collectors/6.png",
    upgradeBaseCost: 10000,
    upgradeCostMultiplier: 2.7,
    maxLevel: 40
  }
];

export default collectors;

  // Lägg till maxLevel på alla framtida collectors du aktiverar!
 // { 
  //  id: 7, 
  //  name: "Cartel Sicario", 
  //  baseIncome: 90, 
  //  baseCost: 1250, 
  //  image: "/images/collectors/7.png", 
  //  miningTime: 38400000,
  //  quote: "Loyalty pays better than fear."
 // },
  //{ 
  //  id: 8, 
   // name: "Doctor", 
   // baseIncome: 110, 
   // baseCost: 1500, 
   // image: "/images/collectors/8.png", 
  //  miningTime: 76800000,
  //  quote: "First, do no harm... to my portfolio."
 // },
 // { 
  //  id: 9, 
 //   name: "IT Worker", 
  //  baseIncome: 160, 
  //  baseCost: 2000, 
  //  image: "/images/collectors/9.png", 
  //  miningTime: 153600000,
  //  quote: "Code by day, stack sats by night."
 // },
  //{ 
  //  id: 10, 
  //  name: "Brez", 
  //  baseIncome: 200, 
  //  baseCost: 3000, 
  //  image: "/images/collectors/10.png", 
  //  miningTime: 307200000,
  //  quote: "Discipline is the real flex."
 // },
 // { 
  //  id: 11, 
  //  name: "TJR", 
  //  baseIncome: 250, 
  //  baseCost: 5000, 
  //  image: "/images/collectors/11.png", 
  //  miningTime: 614400000,
  //  quote: "Energy is currency. Spend it wisely."
  //},
 // { 
  //  id: 12, 
  //  name: "Luke Belmar", 
  //  baseIncome: 300, 
  //  baseCost: 7500, 
  //  image: "/images/collectors/12.png", 
  //  miningTime: 1228800000,
  //  quote: "Knowledge compounds faster than money."
  //},
  //{ 
  //  id: 13, 
  //  name: "Tristan Tate", 
  //  baseIncome: 400, 
  //  baseCost: 10000, 
  //  image: "/images/collectors/13.png", 
  //  miningTime: 2457600000,
  //  quote: "Real men build empires in silence."
  //},
  //{ 
  //  id: 14, 
  //  name: "Andrew Tate", 
  //  baseIncome: 700, 
  //  baseCost: 20000, 
  //  image: "/images/collectors/14.png", 
  //  miningTime: 4915200000,
  //  quote: "What color is your Bugatti?"
  //},