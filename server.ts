import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
const app = express();
const PORT = 3000;

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.sendStatus(200); } else { next(); }
});
app.use(express.json());

// ── SUPABASE ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// ── GEMINI ────────────────────────────────────────────────────
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// ── EVENTS PAR DÉFAUT ─────────────────────────────────────────
const defaultEvents = [
  { id: "e1", titre: "Atelier Aquarelle & Nature", description: "Dessinez les fleurs de saison.", lieu: "Salon d'Art des Sages", heure: "14:30", emoji: "🎨", raison: "Stimule la motricité fine." },
  { id: "e2", titre: "Histoires et Récits de Limoges", description: "Contes et légendes du Limousin.", lieu: "Médiathèque des Halles", heure: "16:00", emoji: "📚", raison: "Entretient la mémoire." },
  { id: "e3", titre: "Gym douce & Relaxation", description: "Exercices sur chaise adaptés.", lieu: "Salle du Parc Vert", heure: "10:30", emoji: "🧘", raison: "Adapté à la mobilité modérée." },
  { id: "e4", titre: "Botanique et Herboristerie", description: "Confection de tisanes bienfaisantes.", lieu: "Jardin d'Hiver", heure: "11:00", emoji: "🌸", raison: "Correspond à votre amour des plantes." }
];

// ── AUTH MIDDLEWARE ───────────────────────────────────────────
function securityMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers['authorization'];
  if (auth === 'user123' || auth === 'admin456') {
    (req as any).userRole = auth === 'admin456' ? 'admin' : 'user';
    (req as any).userId = auth;
    next();
  } else {
    res.status(401).json({ error: "Accès refusé." });
  }
}

// ── ROUTE 1 : POST /suggest ───────────────────────────────────
app.post("/suggest", securityMiddleware, async (req, res) => {
  const { transcript, userId = "user123" } = req.body;

  // Charger profil depuis Supabase
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // Charger events depuis Supabase
  const { data: events } = await supabase
    .from("events")
    .select("*");

  const activeProfile = profile || { prenom: "Suzanne", age: 82, mobilite: "Modérée", interets: "Art, Botanique", sujets_eviter: "Guerre, Maladie" };
  const activeEvents = (events && events.length > 0) ? events : defaultEvents;

  const heure = new Date().getHours();
  const momentJour = heure < 12 ? "matin" : heure < 18 ? "après-midi" : "soir";

  if (!ai) {
    res.json(fallbackReply(transcript, activeProfile, activeEvents));
    return;
  }

  try {
    const prompt = `
Tu es Memoria, un compagnon vocal bienveillant pour ${activeProfile.prenom}, ${activeProfile.age} ans.
Mobilité : ${activeProfile.mobilite}. Intérêts : ${activeProfile.interets}.
SUJETS À ÉVITER : ${activeProfile.sujets_eviter}.
Moment : ${momentJour}.
La personne dit : "${transcript}"

Événements disponibles : ${JSON.stringify(activeEvents)}

Réponds en JSON :
{
  "assistantMessage": "Message chaleureux 3-4 phrases courtes",
  "suggestions": [{ "eventId": "...", "titre": "...", "description": "...", "lieu": "...", "heure": "...", "emoji": "...", "raison": "..." }]
}`.trim();

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(geminiResponse.text?.trim() || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Erreur Gemini:", error);
    res.json(fallbackReply(transcript, activeProfile, activeEvents));
  }
});

// ── ROUTE 2 : POST /participate ───────────────────────────────
app.post("/participate", securityMiddleware, async (req, res) => {
  const { userId, eventId } = req.body;
  await supabase.from("participations").insert({ user_id: userId, event_id: eventId });
  res.json({ ok: true });
});

// ── ROUTE 3 : GET /events ─────────────────────────────────────
app.get("/events", securityMiddleware, async (req, res) => {
  const { data } = await supabase.from("events").select("*");
  res.json(data && data.length > 0 ? data : defaultEvents);
});

// ── ROUTE 4 : GET /profile/:userId ───────────────────────────
app.get("/profile/:userId", securityMiddleware, async (req, res) => {
  const { data } = await supabase.from("profiles").select("*").eq("id", req.params.userId).single();
  res.json(data || {});
});

// ── ROUTE 5 : POST /profile/:userId ──────────────────────────
app.post("/profile/:userId", securityMiddleware, async (req, res) => {
  const { userId } = req.params;
  const { data } = await supabase.from("profiles").upsert({ id: userId, ...req.body }).select().single();
  res.json(data);
});

// ── ROUTE 6 : GET /participations/:userId ────────────────────
app.get("/participations/:userId", securityMiddleware, async (req, res) => {
  const { data } = await supabase.from("participations").select("*").eq("user_id", req.params.userId);
  res.json(data || []);
});

// ── ROUTE 7 : GET/POST /messages ─────────────────────────────
app.get("/messages/:userId", securityMiddleware, async (req, res) => {
  const { data } = await supabase.from("messages").select("*").eq("user_id", req.params.userId).order("created_at", { ascending: false });
  res.json(data || []);
});

app.post("/messages", securityMiddleware, async (req, res) => {
  const { data } = await supabase.from("messages").insert(req.body).select().single();
  res.json(data);
});
// ── ROUTE TTS Voxtral (Mistral) ───────────────────────────
app.post("/speak", securityMiddleware, async (req, res) => {
  const { text, voice = "fr_marie_happy" } = req.body;
  try {
    const response = await fetch("https://api.mistral.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "voxtral-mini-tts-2603",
        input: text,
        voice: voice,
        response_format: "mp3"
      })
    });
    if (!response.ok) throw new Error("Erreur Voxtral");
    const data = await response.json();
    const audioBuffer = Buffer.from(data.audio_data, "base64");
    res.set("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (err) {
    console.error("Erreur Voxtral:", err);
    res.status(500).json({ error: "TTS indisponible" });
  }
});
// ── PAGE HTML ─────────────────────────────────────────────────
app.get("/", (req, res, next) => {
  if (req.accepts('html')) { res.redirect('/memoai.html'); } else { next(); }
});

// ── FALLBACK LOCAL ────────────────────────────────────────────
function fallbackReply(transcript: string, profile: any, events: any[]) {
  return {
    assistantMessage: `Je vous entends, ${profile.prenom}. Votre bien-être est ma priorité. Voici une activité qui pourrait vous plaire aujourd'hui.`,
    suggestions: [events[0]]
  };
}

// ── VITE + DÉMARRAGE ──────────────────────────────────────────
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const staticBuildPath = path.join(process.cwd(), 'dist');
    app.use(express.static(staticBuildPath));
    app.get('*', (req, res) => { res.sendFile(path.join(staticBuildPath, 'index.html')); });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Memoria actif sur http://localhost:${PORT}`);
    console.log(`✅ Supabase connecté : ${process.env.SUPABASE_URL}`);
  });
}

configureServer();