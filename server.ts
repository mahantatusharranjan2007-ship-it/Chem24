import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { readFileSync } from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const firebaseConfig = JSON.parse(readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));

const app = express();
const PORT = 3000;

// Initialize Firebase
const appInstance = initializeApp(firebaseConfig);
const db = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);

app.use(express.json({ limit: '50mb' }));

// API Routes
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (keeps data fresh while eliminating intense Firestore reads)
const memoryCache: { [key: string]: CacheEntry<any> } = {};

function getCached<T>(key: string): T | null {
  const entry = memoryCache[key];
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCached<T>(key: string, data: T): void {
  memoryCache[key] = {
    data,
    timestamp: Date.now()
  };
}

function invalidateCacheStartsWith(prefix: string): void {
  for (const key of Object.keys(memoryCache)) {
    if (key.startsWith(prefix)) {
      delete memoryCache[key];
    }
  }
}

function isDeepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// Global settings
app.get('/api/settings', async (req, res) => {
  try {
    const cacheKey = 'settings_global';
    const cached = getCached<any>(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    const data = docSnap.exists() ? docSnap.data() : { isEditingDisabled: false };
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const data = req.body;
    const cacheKey = 'settings_global';
    const cached = getCached<any>(cacheKey);

    // Skip database write if identical to avoid unnecessary write costs
    if (cached !== null && isDeepEqual(cached, data)) {
      return res.json(data);
    }

    await setDoc(doc(db, 'settings', 'global'), data);
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in POST /api/settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.get('/api/classes', async (req, res) => {
  try {
    const cacheKey = 'classes_list';
    const cached = getCached<any[]>(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }
    const q = query(collection(db, 'classes'), orderBy('year', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

app.get('/api/classes/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const cacheKey = `class_${year}`;
    const cached = getCached<any>(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }
    const docSnap = await getDoc(doc(db, 'classes', year));
    const data = docSnap.exists() ? docSnap.data() : null;
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/classes/:year:", error);
    res.status(500).json({ error: "Failed to fetch class info" });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const { year, ...data } = req.body;
    const cacheKey = `class_${year}`;
    const fullPayload = { year, ...data };
    const cachedSingle = getCached<any>(cacheKey);

    if (cachedSingle !== null && isDeepEqual(cachedSingle, fullPayload)) {
      return res.json(fullPayload);
    }

    await setDoc(doc(db, 'classes', String(year)), fullPayload);
    setCached(cacheKey, fullPayload);
    invalidateCacheStartsWith('classes_list');
    res.json(fullPayload);
  } catch (error) {
    console.error("Error in POST /api/classes:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

app.put('/api/classes/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const cacheKey = `class_${year}`;
    const existingDataDocSnap = await getDoc(doc(db, 'classes', year));
    const mergedPayload = existingDataDocSnap.exists() 
      ? { ...existingDataDocSnap.data(), ...req.body }
      : { year: parseInt(year), ...req.body };

    const cachedSingle = getCached<any>(cacheKey);
    if (cachedSingle !== null && isDeepEqual(cachedSingle, mergedPayload)) {
       return res.json(mergedPayload);
    }

    await setDoc(doc(db, 'classes', year), req.body, { merge: true });
    setCached(cacheKey, mergedPayload);
    invalidateCacheStartsWith('classes_list');
    res.json(mergedPayload);
  } catch (error) {
    console.error("Error in PUT /api/classes/:year:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

app.get('/api/profiles', async (req, res) => {
  try {
    const { graduationYear } = req.query;
    const cacheKey = `profiles_list_${graduationYear || 'all'}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }
    let q = query(collection(db, 'profiles'));
    if (graduationYear) {
      q = query(q, where('graduationYear', '==', Number(graduationYear)));
    }
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => doc.data());
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `profile_${id}`;
    const cached = getCached<any>(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }
    const snapshot = await getDoc(doc(db, 'profiles', id));
    const data = snapshot.exists() ? snapshot.data() : null;
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/profiles/:id:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    const data = req.body;
    const id = String(data.id);
    const cacheKey = `profile_${id}`;
    const cachedSingle = getCached<any>(cacheKey);

    if (cachedSingle !== null && isDeepEqual(cachedSingle, data)) {
      return res.json(data);
    }

    await setDoc(doc(db, 'profiles', id), data, { merge: true });
    setCached(cacheKey, data);
    invalidateCacheStartsWith('profiles_list_');
    res.json(data);
  } catch (error) {
    console.error("Error in POST /api/profiles:", error);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

app.get('/api/photos', async (req, res) => {
  try {
    const { studentId } = req.query;
    const cacheKey = `photos_list_${studentId || 'all'}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }
    let q = query(collection(db, 'photos'));
    if (studentId) {
      q = query(q, where('studentId', '==', Number(studentId)));
    }
    q = query(q, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => doc.data());
    setCached(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/photos:", error);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

app.post('/api/photos', async (req, res) => {
  try {
    const data = req.body;
    await setDoc(doc(db, 'photos', data.id), data);
    invalidateCacheStartsWith('photos_list_');
    res.json(data);
  } catch (error) {
    console.error("Error in POST /api/photos:", error);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

app.delete('/api/photos/:id', async (req, res) => {
  try {
    await deleteDoc(doc(db, 'photos', req.params.id));
    invalidateCacheStartsWith('photos_list_');
    res.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/photos/:id:", error);
    res.status(500).json({ success: false, error: "Failed to delete photo" });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
