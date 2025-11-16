const fs = require('fs');
const DB_FILE = './fixtures/db.json';
const initial = { orders: [], users: [{ id:'u_demo', email:'demo@example.com' }], stats: { purchases: 0, refunds: 0 } };
fs.writeFileSync(DB_FILE, JSON.stringify(initial,null,2));
console.log('🌱 Seeded demo data.');
