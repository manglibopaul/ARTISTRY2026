import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('aninaya.db');
const targets = ['Users', 'Sellers'];

const getTables = () => new Promise((resolve, reject) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) return reject(err);
    resolve(rows.map(row => row.name));
  });
});

const run = async () => {
  try {
    const tables = new Set(await getTables());
    for (const name of targets) {
      if (!tables.has(name)) {
        console.log('Table not found:', name);
        continue;
      }
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM ${name}`, (err) => {
          if (err) return reject(err);
          console.log('Cleared', name);
          resolve();
        });
      });
    }
  } catch (err) {
    console.error('Failed to clear accounts:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
};

run();
