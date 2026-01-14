// server/collectors.js
// SERVER-SIDE SOURCE OF TRUTH
// ALL VALUES USED FOR ECONOMY & ANTI-CHEAT

const collectors = {
  0: {
    name: "Starter Coin Collector",
    incomePerSecond: 0.00277777778, // 10 CNP / hour
    miningTime: 900,                // 15 min (seconds)
    maxLevel: 50
  },

  1: {
    name: "Coin Collector",
    incomePerSecond: 0.00833333333, // 30 CNP / hour
    miningTime: 1800,               // 30 min
    maxLevel: 50
  },

  2: {
    name: "Albin Wallin",
    incomePerSecond: 0.0333333333,  // 120 CNP / hour
    miningTime: 3600,               // 1h
    maxLevel: 100
  },

  3: {
    name: "9-5 Slave",
    incomePerSecond: 0.0833333333,  // 300 CNP / hour
    miningTime: 3600,               // 1h
    maxLevel: 75
  },

  4: {
    name: "Thug",
    incomePerSecond: 0.166666667,   // 600 CNP / hour
    miningTime: 7200,               // 2h
    maxLevel: 60
  },

  5: {
    name: "Dealer",
    incomePerSecond: 0.416666667,   // 1500 CNP / hour
    miningTime: 900,                // 15 min
    maxLevel: 50
  },

  6: {
    name: "Distributor",
    incomePerSecond: 0.833333333,   // 3000 CNP / hour
    miningTime: 28800,              // 8h
    maxLevel: 40
  }
};

export default collectors;