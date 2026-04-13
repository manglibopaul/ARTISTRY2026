import fs from 'fs';
import path from 'path';

const storePath = path.join(path.dirname(new URL(import.meta.url).pathname), '../uploads/receipt-mapping.json');

function ensureStore() {
  try {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(storePath)) fs.writeFileSync(storePath, JSON.stringify({}), 'utf8');
  } catch (e) {
    // ignore
  }
}

export function readAll() {
  try {
    ensureStore();
    const raw = fs.readFileSync(storePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

export function getReceiptForOrder(orderId) {
  const all = readAll();
  return all[String(orderId)] || null;
}

export function setReceiptForOrder(orderId, receiptPath) {
  try {
    ensureStore();
    const all = readAll();
    all[String(orderId)] = receiptPath;
    fs.writeFileSync(storePath, JSON.stringify(all, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.warn('Failed to persist receipt mapping:', e.message || e);
    return false;
  }
}

export default { readAll, getReceiptForOrder, setReceiptForOrder };
