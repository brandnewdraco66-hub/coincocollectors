const fs = require('fs');
const USERS_FILE = './users.json';

let users = {};

try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load users:', err);
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function getUser(wallet) {
  const lowerWallet = wallet.toLowerCase();

  if (!users[lowerWallet]) {
    users[lowerWallet] = {
      wallet: lowerWallet,
      cnp: 0,
      activeMining: {},
      ownedInstances: [
        {
          instanceId: "starter-1",
          collectorId: 0,
          level: 1
        }
      ],
      boosted: { collectors: [], endTime: 0 }
    };
    saveUsers();
  }

  return users[lowerWallet];
}


module.exports = { getUser, saveUsers };