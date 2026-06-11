<?php
declare(strict_types=1);

function init_db(string $path): void {
  $dir = dirname($path);
  if (!is_dir($dir)) @mkdir($dir, 0775, true);

  $pdo = new PDO('sqlite:' . $path);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  $pdo->exec('PRAGMA foreign_keys = ON;');

  $pdo->exec('CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at INTEGER NOT NULL
  );');

  $pdo->exec('CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    asset TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    UNIQUE(user_id, asset),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );');

  $pdo->exec('CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    side TEXT NOT NULL,
    order_type TEXT NOT NULL,
    qty REAL NOT NULL,
    limit_price REAL,
    fill_price REAL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );');

  $pdo->exec('CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    side TEXT NOT NULL,
    qty REAL NOT NULL,
    entry_price REAL NOT NULL,
    opened_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );');

  $pdo->exec('CREATE TABLE IF NOT EXISTS invest_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    term_days INTEGER NOT NULL,
    roi_percent REAL NOT NULL,
    min_amount REAL NOT NULL,
    max_amount REAL,
    risk TEXT NOT NULL
  );');

  $pdo->exec('CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    expected_return REAL NOT NULL,
    status TEXT NOT NULL,
    payout_schedule TEXT,
    start_at INTEGER NOT NULL,
    end_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(plan_id) REFERENCES invest_plans(id)
  );');

  // Seed plans
  $count = (int)$pdo->query('SELECT COUNT(*) FROM invest_plans')->fetchColumn();
  if ($count === 0) {
    $stmt = $pdo->prepare('INSERT INTO invest_plans(id,name,term_days,roi_percent,min_amount,max_amount,risk) VALUES (?,?,?,?,?,?,?)');
    $stmt->execute(['starter_14','Starter 14D',14,6.0,50,null,'Low']);
    $stmt->execute(['growth_30','Growth 30D',30,15.0,100,5000,'Medium']);
    $stmt->execute(['pro_60','Pro 60D',60,35.0,250,20000,'High']);
  }
}
