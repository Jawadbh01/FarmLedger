// FarmLedger - Shared Utilities
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Format PKR ──────────────────────────────────────────────
export function formatPKR(n) {
  return '₨ ' + Number(n || 0).toLocaleString('en-PK');
}

// ── Today's date ─────────────────────────────────────────────
export function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Show Toast notification ───────────────────────────────────
export function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Get current user data from Firestore ─────────────────────
export async function getCurrentUserData() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { resolve(null); return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) resolve({ uid: user.uid, ...snap.data() });
        else resolve(null);
      } catch(e) { reject(e); }
    });
  });
}

// ── Require auth + role check ─────────────────────────────────
export function requireAuth(allowedRoles) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = '/index.html'; return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) { window.location.href = '/index.html'; return; }
        const data = snap.data();
        if (!allowedRoles.includes(data.role)) {
          redirectByRole(data.role); return;
        }
        resolve({ uid: user.uid, ...data });
      } catch(e) { window.location.href = '/index.html'; }
    });
  });
}

// ── Redirect user to their dashboard ─────────────────────────
export function redirectByRole(role) {
  const routes = {
    admin:    '/pages/admin.html',
    landlord: '/pages/landlord.html',
    manager:  '/pages/manager.html',
    farmer:   '/pages/farmer.html'
  };
  window.location.href = routes[role] || '/index.html';
}

// ── Generate readable ID ──────────────────────────────────────
export async function generateId(type) {
  const prefixes = { landlord: 'LND', manager: 'MGR', farmer: 'FRM', farm: 'FARM', activity: 'ACT', harvest: 'HRV' };
  const prefix = prefixes[type] || 'ID';
  const counterRef = doc(db, 'counters', type + 's');
  let newId;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const count = snap.exists() ? (snap.data().count || 0) + 1 : 1;
    tx.set(counterRef, { count });
    newId = `${prefix}-${String(count).padStart(3, '0')}`;
  });
  return newId;
}

// ── Get user by userId ────────────────────────────────────────
export async function getUserById(userId) {
  const q = query(collection(db, 'users'), where('userId', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

// ── Get all farms for landlord ────────────────────────────────
export async function getFarmsForLandlord(landlordId) {
  const q = query(collection(db, 'farms'), where('landlordId', '==', landlordId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Get farms for manager ─────────────────────────────────────
export async function getFarmsForManager(managerId) {
  const q = query(collection(db, 'farms'), where('managerId', '==', managerId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Get activities for farm ───────────────────────────────────
export async function getActivitiesForFarm(farmId) {
  const q = query(collection(db, 'activities'), where('farmId', '==', farmId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Get harvests for farm ─────────────────────────────────────
export async function getHarvestsForFarm(farmId) {
  const q = query(collection(db, 'harvests'), where('farmId', '==', farmId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Get farmers for manager ───────────────────────────────────
export async function getFarmersForManager(managerId) {
  const q = query(collection(db, 'users'), where('managerId', '==', managerId), where('role', '==', 'farmer'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Get managers for landlord ─────────────────────────────────
export async function getManagersForLandlord(landlordId) {
  const q = query(collection(db, 'users'), where('landlordId', '==', landlordId), where('role', '==', 'manager'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

// ── Add activity ──────────────────────────────────────────────
export async function addActivity(data) {
  const activityId = await generateId('activity');
  await addDoc(collection(db, 'activities'), {
    activityId, ...data, createdAt: serverTimestamp()
  });
  return activityId;
}

// ── Add harvest ───────────────────────────────────────────────
export async function addHarvest(data) {
  const harvestId = await generateId('harvest');
  await addDoc(collection(db, 'harvests'), {
    harvestId, ...data, createdAt: serverTimestamp()
  });
  return harvestId;
}

// ── Weather fetch ─────────────────────────────────────────────
export async function fetchWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    if (!res.ok) throw new Error('City not found');
    const data = await res.json();
    const cur = data.current_condition[0];
    const area = data.nearest_area[0];
    return {
      temp: cur.temp_C,
      feels: cur.FeelsLikeC,
      humidity: cur.humidity,
      wind: cur.windspeedKmph,
      desc: cur.weatherDesc[0].value,
      city: area.areaName[0].value + ', ' + area.country[0].value
    };
  } catch(e) { return null; }
}

// ── Print helper ──────────────────────────────────────────────
export function printSection(html, title = 'FarmLedger Report') {
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111}
      h1{color:#2e7d32;text-align:center;margin-bottom:4px}
      p.sub{text-align:center;color:#666;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th,td{border:1px solid #ccc;padding:9px 12px;text-align:left;font-size:13px}
      th{background:#e8f5e9;color:#2e7d32;font-weight:700}
      tr:nth-child(even) td{background:#f9f9f9}
      .summary{background:#f1f8e9;padding:14px;border-radius:8px;margin-bottom:18px}
      .summary span{margin-right:24px;font-weight:700}
      @media print{button{display:none}}
    </style></head>
    <body>
      <h1>🌾 FarmLedger</h1>
      <p class="sub">Generated: ${new Date().toLocaleString()}</p>
      ${html}
      <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
  w.document.close();
}

export { db, auth, doc, getDoc, collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, serverTimestamp };
