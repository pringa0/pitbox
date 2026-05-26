import React from 'react';
import { useState, useEffect } from "react";

// ─── CLAUDE API ───────────────────────────────────────────
async function callClaude(messages, system = "") {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callClaudeJSON(messages, system = "") {
  const text = await callClaude(
    messages,
    system + "\n\nRespond with ONLY valid JSON. No markdown fences, no explanation."
  );
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

// ─── COUNTRY CONFIG ───────────────────────────────────────
const CC = {
  jp: { name: "日本", cycleYears: 2, label: "以降2年ごと" },
  uk: { name: "UK (MOT)", cycleYears: 1, label: "以降1年ごと" },
  manual: { name: "その他", cycleYears: null, label: "手動設定" },
};

// ─── INSPECTION SCHEDULE BUILDER ─────────────────────────
function buildInspSched(firstDateStr, cycleYears) {
  const parts = firstDateStr.split("/");
  if (parts.length < 2) return null;
  const yr = parseInt(parts[0]);
  const mo = parseInt(parts[1]);
  if (isNaN(yr) || isNaN(mo)) return null;
  const sched = [{ yr, mo, label: "初回車検" }];
  let ny = yr;
  for (let i = 0; i < 4; i++) {
    ny += cycleYears;
    sched.push({ yr: ny, mo, label: "車検" });
  }
  return sched;
}

// ─── STYLES ───────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=JetBrains+Mono:wght@400;600&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

:root {
  --bg: #060606;
  --s1: #0e0e0e;
  --s2: #161616;
  --bd: #1e1e1e;
  --bd2: #2a2a2a;
  --text: #ddd;
  --muted: #666;
  --dim: #333;
  --acc: #e8ff00;
  --red: #ff4d00;
  --g1: #00e676;
  --g2: #ff9100;
  --g3: #ff4d00;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Noto Sans JP', sans-serif;
  font-weight: 300;
}

.app {
  max-width: 440px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* TOPBAR */
.topbar {
  background: var(--s1);
  border-bottom: 1px solid var(--bd);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 90;
}
.logo { font-size: 18px; font-weight: 500; letter-spacing: 2px; }
.logo-tag { font-size: 11px; color: var(--muted); margin-top: 1px; font-style: italic; }
.car-sub { font-size: 11px; color: var(--muted); margin-top: 1px; font-family: 'JetBrains Mono', monospace; }

/* BOTTOM NAV */
.bnav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  background: var(--s1);
  border-top: 1px solid var(--bd);
  display: flex;
  z-index: 90;
}
.nb {
  flex: 1;
  background: none;
  border: none;
  color: var(--muted);
  padding: 10px 0 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  transition: color 0.2s;
}
.nb.on { color: var(--text); }
.nb.disabled { opacity: 0.35; cursor: not-allowed; }

/* SCREEN */
.screen { flex: 1; padding: 16px 16px 90px; overflow-y: auto; }

/* TYPOGRAPHY */
.h2 { font-size: 18px; font-weight: 500; margin-bottom: 4px; }
.h3 { font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.sub { font-size: 13px; color: var(--muted); line-height: 1.7; margin-bottom: 16px; }

/* STEPS */
.steps { display: flex; gap: 4px; margin-bottom: 20px; }
.step-dot { flex: 1; height: 3px; background: var(--bd2); border-radius: 2px; transition: background 0.3s; }
.step-dot.done { background: var(--text); }
.step-dot.now { background: var(--dim); }

/* FORM */
.fg { margin-bottom: 12px; }
.fl {
  font-size: 11px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  display: block;
  margin-bottom: 5px;
  letter-spacing: 1px;
}
.fi {
  width: 100%;
  background: var(--s2);
  border: 1px solid var(--bd);
  color: var(--text);
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;
  border-radius: 0;
  -webkit-appearance: none;
  transition: border-color 0.2s;
}
.fi:focus { border-color: var(--acc); }
.frow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.frow3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

/* COUNTRY / CYCLE BUTTONS */
.country-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.cbtn {
  background: var(--s2);
  border: 1px solid var(--bd);
  color: var(--text);
  padding: 12px 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}
.cbtn.on { border-color: var(--acc); background: var(--s1); }
.cbtn-flag { font-size: 20px; display: block; margin-bottom: 3px; }
.cbtn-name { font-size: 12px; font-weight: 500; }
.cbtn-sub { font-size: 10px; color: var(--muted); margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

/* INSPECTION PREVIEW */
.insp-box {
  background: var(--s2);
  border: 1px solid var(--bd);
  padding: 12px 14px;
  margin-top: 8px;
  margin-bottom: 4px;
}
.insp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--bd);
}
.insp-item { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12px; }
.insp-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.insp-dot.first { background: var(--text); }
.insp-dot.next { background: var(--bd2); }

/* BUTTONS */
.btn {
  width: 100%;
  background: var(--acc);
  color: #000;
  border: none;
  font-size: 14px;
  font-weight: 500;
  padding: 13px;
  cursor: pointer;
  margin-top: 4px;
  transition: opacity 0.2s;
}
.btn:hover { opacity: 0.88; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost {
  width: 100%;
  background: none;
  border: 1px solid var(--bd);
  color: var(--muted);
  font-size: 13px;
  padding: 11px;
  cursor: pointer;
  margin-top: 8px;
}
.btn-ghost:hover { border-color: var(--acc); color: var(--acc); }
.btn-sm {
  background: none;
  border: 1px solid var(--bd);
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 1px;
  padding: 4px 9px;
  cursor: pointer;
}
.btn-sm:hover { border-color: var(--acc); color: var(--acc); }

/* AI BOX */
.ai-box {
  background: var(--s1);
  border: 1px solid rgba(232,255,0,0.15);
  padding: 14px;
  margin: 12px 0;
}
.ai-hd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 2px;
  color: var(--acc);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--acc); animation: blink 1.2s infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
.ai-body { font-size: 13px; line-height: 1.85; white-space: pre-wrap; }

/* LOADING */
.ld {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--muted);
}
.ld-dots { display: flex; gap: 4px; }
.ld-d { width: 5px; height: 5px; border-radius: 50%; background: var(--acc); animation: blink 1.2s infinite; }
.ld-d:nth-child(2) { animation-delay: 0.2s; }
.ld-d:nth-child(3) { animation-delay: 0.4s; }

/* WARN */
.warn {
  background: rgba(255,77,0,0.07);
  border: 1px solid rgba(255,77,0,0.18);
  padding: 10px 13px;
  font-size: 11px;
  color: #ff6633;
  line-height: 1.65;
  margin: 10px 0;
}

/* CATEGORY CARDS */
.cat-card { background: var(--s1); border: 1px solid var(--bd); margin-bottom: 8px; overflow: hidden; }
.cat-hd { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; }
.cat-hd.sel { background: rgba(232,255,0,0.04); }
.cat-name { font-size: 13px; font-weight: 500; }
.cat-body { border-top: 1px solid var(--bd); padding: 10px 14px; }
.cat-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--dim); cursor: pointer; }
.cat-item:last-of-type { border-bottom: none; }
.cb { width: 16px; height: 16px; border: 1px solid var(--bd2); flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; font-size: 11px; transition: all 0.15s; }
.cb.on { background: var(--acc); border-color: var(--acc); color: #000; font-weight: 700; }
.item-name { font-size: 13px; }
.item-desc { font-size: 11px; color: var(--muted); margin-top: 1px; }
.custom-add { display: flex; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--dim); }
.custom-input { flex: 1; background: var(--bg); border: 1px solid var(--bd); color: var(--text); font-size: 12px; padding: 8px 10px; outline: none; }
.custom-input:focus { border-color: var(--acc); }
.custom-btn { background: none; border: 1px solid var(--bd); color: var(--muted); font-size: 18px; padding: 0 12px; cursor: pointer; }
.custom-btn:hover { border-color: var(--acc); color: var(--acc); }

/* PLAN ITEMS */
.pi { background: var(--s1); border-left: 2px solid var(--bd2); padding: 13px 14px; margin-bottom: 8px; }
.pi.urgent { border-left-color: var(--g1); }
.pi.high { border-left-color: var(--g2); }
.pi.medium { border-left-color: var(--g3); }
.pi.low { border-left-color: var(--muted); }
.pi-name { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.pi-meta { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.pi-acts { display: flex; gap: 6px; flex-wrap: wrap; }

/* BADGES */
.badge { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1px; padding: 2px 6px; }
.b-planned { background: rgba(68,138,255,0.1); color: #448aff; border: 1px solid rgba(68,138,255,0.2); }
.b-wip { background: rgba(255,145,0,0.1); color: var(--g2); border: 1px solid rgba(255,145,0,0.2); }
.b-done { background: rgba(0,230,118,0.1); color: var(--g1); border: 1px solid rgba(0,230,118,0.2); }
.b-hold { background: rgba(85,85,85,0.1); color: var(--muted); border: 1px solid rgba(85,85,85,0.2); }

/* NOTES */
.note-wrap { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--dim); }
.note-input { width: 100%; background: var(--bg); border: 1px solid var(--bd); color: var(--text); font-size: 12px; padding: 7px 10px; outline: none; margin-bottom: 6px; }
.note-input:focus { border-color: var(--acc); }
.note-card { background: var(--bg); border-left: 1px solid var(--acc); padding: 7px 9px; margin-top: 5px; font-size: 11px; line-height: 1.6; }
.note-card a { color: var(--acc); }
.note-date { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--dim); margin-top: 3px; }

/* VERSION BAR */
.vbar { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px; }
.vtag { background: var(--s1); border: 1px solid var(--bd); font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); padding: 4px 10px; white-space: nowrap; cursor: pointer; flex-shrink: 0; }
.vtag.on { border-color: var(--acc); color: var(--acc); }
.vtag.add { border-style: dashed; }

/* TIMELINE */
.tl { position: relative; padding-left: 22px; }
.tl::before { content: ''; position: absolute; left: 5px; top: 0; bottom: 0; width: 1px; background: var(--bd); }
.tl-item { position: relative; margin-bottom: 18px; }
.tl-dot { position: absolute; left: -19px; top: 3px; width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--bd2); background: var(--bg); }
.tl-dot.now { background: var(--acc); border-color: var(--acc); box-shadow: 0 0 7px rgba(232,255,0,0.4); }
.tl-dot.done { background: var(--g1); border-color: var(--g1); }
.tl-when { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); margin-bottom: 2px; }
.tl-what { font-size: 13px; margin-bottom: 2px; }
.tl-sub { font-size: 11px; color: var(--muted); }

/* INQUIRY */
.lang-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--bd); margin-bottom: 12px; }
.lang-btn { background: var(--s2); border: none; color: var(--muted); font-size: 13px; padding: 9px; cursor: pointer; }
.lang-btn.on { background: var(--acc); color: #000; }
.mailto-link { display: block; width: 100%; background: var(--s2); border: 1px solid var(--acc); color: var(--acc); font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 2px; padding: 13px; text-align: center; text-decoration: none; margin-top: 10px; }

.div { height: 1px; background: var(--bd); margin: 18px 0; }
.pri-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; padding: 6px 0; border-bottom: 1px solid var(--bd); margin-bottom: 10px; }
`;

// ─── APP ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("setup");
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState("jp");
  const [cycle, setCycleVal] = useState(2);
  const [car, setCar] = useState({ name: "", model: "", year: "", insp: "" });
  const [aiVerify, setAiVerify] = useState("");
  const [categories, setCategories] = useState([]);
  const [openCats, setOpenCats] = useState({});
  const [selected, setSelected] = useState({});
  const [customInputs, setCustomInputs] = useState({});
  const [advice, setAdvice] = useState(null);
  const [plans, setPlans] = useState([]);
  const [versions, setVersions] = useState(["Plan v1"]);
  const [activeVer, setActiveVer] = useState("Plan v1");
  const [notes, setNotes] = useState({});
  const [noteInputs, setNoteInputs] = useState({});
  const [openNotes, setOpenNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [setupDone, setSetupDone] = useState(false);
  const [inquiryItem, setInquiryItem] = useState(null);
  const [inquiryLang, setInquiryLang] = useState("ja");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryDraft, setInquiryDraft] = useState("");

  const cycleYears = country === "manual" ? cycle : CC[country].cycleYears;

  const inspSched = car.insp ? buildInspSched(car.insp, cycleYears) : null;

  // ── STEP 1: Verify ──
  const handleVerify = async () => {
    if (!car.name) return;
    setLoading(true); setLoadingMsg("Claudeが確認中...");
    const desc = `車名: ${car.name}${car.model ? "、型式: " + car.model : ""}${car.year ? "、年式: " + car.year + "年" : ""}`;
    const verifyRes = await callClaude(
      [{ role: "user", content: desc }],
      "あなたは自動車カスタマイズの専門家です。入力された車の情報を確認し、日本語で簡潔に：1) 車の確認（型式・年式が未入力でも分かる範囲で補足）、2) カスタマイズで知っておくべき重要な注意点を2〜3点。3〜5文で。型式や年式が不明でも一般的な情報で回答してください。"
    );
    setAiVerify(verifyRes);
    setLoadingMsg("カテゴリを生成中...");
    const catRes = await callClaudeJSON(
      [{ role: "user", content: desc }],
      'あなたは自動車カスタマイズの専門家です。この車に適したカスタマイズカテゴリとアイテムをJSONで生成。形式: [{"id":"engine","label":"Engine","labelJa":"エンジン","items":[{"id":"i1","label":"アイテム名","desc":"説明15字以内"}]}]。8〜12カテゴリ、各3〜6アイテム。JSON only.'
    );
    if (catRes) setCategories(catRes);
    setLoading(false);
    setStep(2);
  };

  // ── STEP 3: Advice ──
  const handleAdvice = async () => {
    setLoading(true); setLoadingMsg("Claudeがプランを分析中...");
    const itemList = Object.values(selected).map(s => `${s.catName}: ${s.item.label}`).join(", ");
    const carDesc = `車: ${car.name}${car.model ? " " + car.model : ""}${car.year ? " (" + car.year + ")" : ""}`;
    const res = await callClaudeJSON(
      [{ role: "user", content: `${carDesc}、選択: ${itemList}${car.insp ? "、初回車検: " + car.insp : ""}、国: ${CC[country].name}` }],
      'あなたは自動車カスタマイズの専門家です。選択アイテムを分析し最適なプランをJSONで。形式: {"summary":"全体アドバイス100字以内","warning":"注意（必ず金額はショップやパーツにより大きく異なります。必ず実際に確認してください。を含む）","items":[{"catId":"","catName":"","label":"","priority":"urgent|high|medium|low","reason":"理由20字以内","timing":"推奨時期","priceRange":"概算価格帯","dependency":"依存関係(なければ空)"}],"missing":["推奨追加アイテム2〜3個"]}。JSON only.'
    );
    if (res) {
      setAdvice(res);
      setPlans((res.items || []).map((item, i) => ({ ...item, id: i, status: "planned" })));
    }
    setLoading(false);
    setStep(4);
  };

  // ── Finalize ──
  const finalize = () => { setSetupDone(true); setScreen("plan"); };

  // ── Toggle item ──
  const toggleItem = (catId, catName, item) => {
    const key = `${catId}::${item.id}`;
    setSelected(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { catId, catName, item };
      return next;
    });
  };

  const addCustom = (cat) => {
    const val = (customInputs[cat.id] || "").trim();
    if (!val) return;
    const id = `c_${Date.now()}`;
    const key = `${cat.id}::${id}`;
    setSelected(prev => ({ ...prev, [key]: { catId: cat.id, catName: cat.labelJa || cat.label, item: { id, label: val, desc: "カスタム追加" } } }));
    setCustomInputs(prev => ({ ...prev, [cat.id]: "" }));
  };

  // ── Status cycle ──
  const cycleStatus = (id) => {
    const cycle = ["planned", "wip", "done", "hold"];
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: cycle[(cycle.indexOf(p.status) + 1) % cycle.length] } : p));
  };

  // ── Notes ──
  const addNote = (key) => {
    const inp = noteInputs[key] || {};
    if (!inp.memo && !inp.url) return;
    setNotes(prev => ({ ...prev, [key]: [...(prev[key] || []), { ...inp, date: new Date().toLocaleDateString("ja-JP") }] }));
    setNoteInputs(prev => ({ ...prev, [key]: {} }));
  };

  // ── Inquiry ──
  const startInquiry = async (item) => {
    setInquiryItem(item);
    setInquiryDraft("");
    setInquiryEmail("");
    setScreen("inquiry");
    setLoading(true); setLoadingMsg("メールアドレスを検索中...");
    const res = await callClaude(
      [{ role: "user", content: `${item.label}（${car.name}用）のメーカーまたは取扱ショップのメールアドレス。` }],
      "メールアドレスが見つかった場合はそのアドレスのみ。見つからなければ「不明」のみ。説明不要。"
    );
    setInquiryEmail(res.includes("@") ? res.trim() : "");
    setLoading(false);
  };

  const genDraft = async () => {
    if (!inquiryItem) return;
    setLoading(true); setLoadingMsg("メール文章を生成中...");
    const lang = inquiryLang === "ja" ? "日本語" : "English";
    const draft = await callClaude(
      [{ role: "user", content: `車: ${car.name}${car.model ? " " + car.model : ""}、アイテム: ${inquiryItem.label}` }],
      `プロの問い合わせメールを${lang}で作成。確認内容: 適合確認・在庫・価格。件名と本文を含める。簡潔に。`
    );
    setInquiryDraft(draft);
    setLoading(false);
  };

  // ── Reset ──
  const reset = () => {
    if (!window.confirm("すべてリセットしますか？")) return;
    setCar({ name: "", model: "", year: "", insp: "" });
    setAiVerify(""); setCategories([]); setSelected({}); setAdvice(null);
    setPlans([]); setStep(1); setSetupDone(false); setScreen("setup");
    setVersions(["Plan v1"]); setActiveVer("Plan v1"); setNotes({}); setOpenNotes({});
    setInquiryItem(null); setInquiryDraft(""); setCountry("jp"); setCycleVal(2);
  };

  // ── RENDERS ──────────────────────────────────────────────

  const renderSetup = () => {
    const selCount = Object.keys(selected).length;
    return (
      <div className="screen">
        <div className="steps">
          {[1,2,3,4].map(n => <div key={n} className={`step-dot${step > n ? " done" : step === n ? " now" : ""}`} />)}
        </div>

        {/* STEP 1 */}
        <div className="h2">あなたの愛車を教えてください</div>
        <p className="sub">型式や年式が分からなくても大丈夫です。</p>

        <div className="fg">
          <label className="fl">国</label>
          <div className="country-grid">
            {[
              { id: "jp", flag: "🇯🇵", name: "日本", sub: "以降2年ごと" },
              { id: "uk", flag: "🇬🇧", name: "UK", sub: "以降1年ごと" },
              { id: "manual", flag: "🌐", name: "その他", sub: "手動設定" },
            ].map(c => (
              <button key={c.id} className={`cbtn${country === c.id ? " on" : ""}`} onClick={() => setCountry(c.id)}>
                <span className="cbtn-flag">{c.flag}</span>
                <div className="cbtn-name">{c.name}</div>
                <div className="cbtn-sub">{c.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {country === "manual" && (
          <div className="fg">
            <label className="fl">車検サイクル</label>
            <div className="frow3">
              {[1,2,3].map(n => (
                <button key={n} className={`cbtn${cycle === n ? " on" : ""}`} onClick={() => setCycleVal(n)}>
                  <div className="cbtn-name">{n === 1 ? "毎年" : `${n}年ごと`}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="fg">
          <label className="fl">車名 <span style={{color:"#ff4d00",fontSize:10}}>必須</span></label>
          <input className="fi" value={car.name} onChange={e => setCar(c => ({...c, name: e.target.value}))} placeholder="例: GR Corolla, BRZ, Civic Type R..." disabled={step > 1} />
        </div>
        <div className="frow">
          <div className="fg">
            <label className="fl">型式 <span style={{opacity:0.6,fontSize:10,marginLeft:4}}>任意</span></label>
            <input className="fi" value={car.model} onChange={e => setCar(c => ({...c, model: e.target.value}))} placeholder="例: GZEA14H" disabled={step > 1} />
          </div>
          <div className="fg">
            <label className="fl">年式 <span style={{opacity:0.6,fontSize:10,marginLeft:4}}>任意</span></label>
            <input className="fi" value={car.year} onChange={e => setCar(c => ({...c, year: e.target.value}))} placeholder="例: 2023" disabled={step > 1} />
          </div>
        </div>

        <div className="fg">
          <label className="fl">初回車検日 <span style={{opacity:0.6,fontSize:10,marginLeft:4}}>任意</span></label>
          <input className="fi" value={car.insp} onChange={e => setCar(c => ({...c, insp: e.target.value}))} placeholder="例: 2026/08" disabled={step > 1} />
          {inspSched && step === 1 && (
            <div className="insp-box">
              <div className="insp-row"><span>{CC[country].name}</span><span>{CC[country].label}</span></div>
              {inspSched.map((s, i) => (
                <div key={i} className="insp-item">
                  <div className={`insp-dot ${i === 0 ? "first" : "next"}`} />
                  <span style={{color: i === 0 ? "var(--text)" : "var(--muted)"}}>{s.yr}/{String(s.mo).padStart(2,"0")} {s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {step === 1 && (
          <>
            <button className="btn" onClick={handleVerify} disabled={loading || !car.name}>
              {loading ? "確認中..." : "Claudeで入力内容をチェック →"}
            </button>
            {loading && <div className="ld"><div className="ld-dots"><div className="ld-d"/><div className="ld-d"/><div className="ld-d"/></div>{loadingMsg}</div>}
          </>
        )}

        {/* STEP 2: Claudeの確認結果 */}
        {step >= 2 && (
          <>
            <div className="div" />
            <div className="h2">Claudeからの確認結果</div>
            <div className="ai-box">
              <div className="ai-hd"><span className="ai-dot"/>CLAUDE</div>
              <div className="ai-body">{aiVerify}</div>
            </div>
            {step === 2 && (
              <button className="btn" onClick={() => setStep(3)}>カスタマイズアイテムを選ぶ →</button>
            )}
          </>
        )}

        {/* STEP 3: アイテム選択 */}
        {step >= 3 && (
          <>
            <div className="div" />
            <div className="h2">何をカスタマイズしたいですか？</div>
            <p className="sub">気になるカテゴリを開いて選んでください。</p>
            {categories.map(cat => {
              const count = Object.keys(selected).filter(k => k.startsWith(cat.id + "::")).length;
              const isOpen = openCats[cat.id];
              return (
                <div key={cat.id} className="cat-card">
                  <div className={`cat-hd${count > 0 ? " sel" : ""}`} onClick={() => setOpenCats(p => ({...p, [cat.id]: !p[cat.id]}))}>
                    <span className="cat-name">{cat.labelJa || cat.label}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {count > 0 && <span style={{fontSize:11,color:"var(--g1)",fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>}
                      <span style={{fontSize:18,color:"var(--muted)"}}>{isOpen ? "−" : "+"}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="cat-body">
                      {cat.items.map(item => {
                        const key = `${cat.id}::${item.id}`;
                        const on = !!selected[key];
                        return (
                          <div key={item.id} className="cat-item" onClick={() => toggleItem(cat.id, cat.labelJa || cat.label, item)}>
                            <div className={`cb${on ? " on" : ""}`}>{on ? "✓" : ""}</div>
                            <div>
                              <div className="item-name">{item.label}</div>
                              {item.desc && <div className="item-desc">{item.desc}</div>}
                            </div>
                          </div>
                        );
                      })}
                      <div className="custom-add">
                        <input className="custom-input" placeholder="カスタム追加..." value={customInputs[cat.id] || ""} onChange={e => setCustomInputs(p => ({...p, [cat.id]: e.target.value}))} onKeyDown={e => e.key === "Enter" && addCustom(cat)} />
                        <button className="custom-btn" onClick={() => addCustom(cat)}>+</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {selCount > 0 && step === 3 && (
              <>
                <button className="btn" onClick={handleAdvice} disabled={loading}>
                  {loading ? "分析中..." : `Claudeにプランを作ってもらう（${selCount}項目） →`}
                </button>
                {loading && <div className="ld"><div className="ld-dots"><div className="ld-d"/><div className="ld-d"/><div className="ld-d"/></div>{loadingMsg}</div>}
              </>
            )}
          </>
        )}

        {/* STEP 4: アドバイス */}
        {step >= 4 && advice && (
          <>
            <div className="div" />
            <div className="h2">Claudeのアドバイス</div>
            <div className="ai-box">
              <div className="ai-hd"><span className="ai-dot"/>CLAUDE</div>
              <div className="ai-body">{advice.summary}</div>
            </div>
            <div className="warn">{advice.warning}</div>
            {advice.missing?.length > 0 && (
              <div className="ai-box" style={{borderColor:"rgba(255,145,0,0.2)"}}>
                <div className="ai-hd" style={{color:"var(--g2)"}}>💡 見落としがちなアイテム</div>
                <div className="ai-body">{advice.missing.map(m => `• ${m}`).join("\n")}</div>
              </div>
            )}
            <button className="btn" onClick={finalize}>プランを確定する →</button>
          </>
        )}
      </div>
    );
  };

  const renderPlan = () => {
    const priLabel = { urgent: "今すぐ", high: "早めに", medium: "余裕があれば", low: "将来的に" };
    const statusBadge = { planned: "b-planned", wip: "b-wip", done: "b-done", hold: "b-hold" };
    const statusLabel = { planned: "予定", wip: "進行中", done: "完了", hold: "保留" };
    return (
      <div className="screen">
        <div className="h2">My Plan</div>
        <div className="vbar">
          {versions.map(v => <div key={v} className={`vtag${v === activeVer ? " on" : ""}`} onClick={() => setActiveVer(v)}>{v}</div>)}
          <div className="vtag add" onClick={() => { const n = `Plan v${versions.length + 1}`; setVersions(p => [...p, n]); setActiveVer(n); }}>+ 新バージョン</div>
        </div>
        {["urgent","high","medium","low"].map(pri => {
          const items = plans.filter(p => p.priority === pri);
          if (!items.length) return null;
          return (
            <div key={pri}>
              <div className="pri-label">{priLabel[pri]}</div>
              {items.map(item => {
                const key = `${item.catId}::${item.label}`;
                const itemNotes = notes[key] || [];
                const noteOpen = openNotes[key];
                return (
                  <div key={item.id} className={`pi ${pri}`}>
                    <div className="pi-name">{item.label}</div>
                    <div className="pi-meta">
                      <span>{item.catName}</span>
                      <span className={`badge ${statusBadge[item.status]}`}>{statusLabel[item.status]}</span>
                      {item.priceRange && <span>{item.priceRange}</span>}
                    </div>
                    {item.reason && <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>→ {item.reason}</div>}
                    {item.timing && <div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>⏱ {item.timing}</div>}
                    {item.dependency && <div style={{fontSize:11,color:"var(--g2)",marginBottom:6}}>⚠ {item.dependency}</div>}
                    <div className="pi-acts">
                      <button className="btn-sm" onClick={() => cycleStatus(item.id)}>状態変更</button>
                      <button className="btn-sm" onClick={() => startInquiry(item)}>📧 問い合わせ</button>
                      <button className="btn-sm" onClick={() => setOpenNotes(p => ({...p, [key]: !p[key]}))}>
                        📝 メモ{itemNotes.length ? ` (${itemNotes.length})` : ""}
                      </button>
                    </div>
                    {noteOpen && (
                      <div className="note-wrap">
                        <input className="note-input" placeholder="URL（動画・商品等）" value={noteInputs[key]?.url || ""} onChange={e => setNoteInputs(p => ({...p, [key]: {...(p[key]||{}), url: e.target.value}}))} />
                        <input className="note-input" placeholder="メモ..." value={noteInputs[key]?.memo || ""} onChange={e => setNoteInputs(p => ({...p, [key]: {...(p[key]||{}), memo: e.target.value}}))} />
                        <button className="btn-sm" onClick={() => addNote(key)}>ADD</button>
                        {itemNotes.map((n, i) => (
                          <div key={i} className="note-card">
                            {n.url && <div><a href={n.url} target="_blank" rel="noreferrer">{n.url.length > 45 ? n.url.slice(0,45)+"..." : n.url}</a></div>}
                            {n.memo && <div>{n.memo}</div>}
                            <div className="note-date">{n.date}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {!plans.length && <p style={{fontSize:13,color:"var(--muted)",textAlign:"center",padding:"40px 0"}}>SETUPでプランを作成してください</p>}
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="screen">
      <div className="h2">スケジュール</div>
      {inspSched ? (
        <>
          <div className="h3">車検スケジュール（{CC[country].name}）</div>
          <div className="insp-box">
            <div className="insp-row"><span>初回車検日から自動計算</span><span>{CC[country].label}</span></div>
            {inspSched.map((s, i) => (
              <div key={i} className="insp-item">
                <div className={`insp-dot ${i === 0 ? "first" : "next"}`} />
                <span style={{color: i === 0 ? "var(--text)" : "var(--muted)"}}>{s.yr}/{String(s.mo).padStart(2,"0")} {s.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{fontSize:13,color:"var(--muted)",marginBottom:16}}>SETUPで初回車検日を入力するとスケジュールが表示されます。</p>
      )}
      <div className="div" />
      <div className="h3">タイムライン</div>
      <div className="tl">
        {plans.length ? plans.slice(0,6).map((p, i) => (
          <div key={p.id} className="tl-item">
            <div className={`tl-dot${i === 0 ? " now" : ""}`} />
            <div className="tl-when">{p.timing || "時期未定"}</div>
            <div className="tl-what">{p.label}</div>
            <div className="tl-sub">{p.catName}</div>
          </div>
        )) : (
          <div className="tl-item"><div className="tl-dot now" /><div className="tl-when">NOW</div><div className="tl-what">プランを設定してください</div></div>
        )}
      </div>
    </div>
  );

  const renderInquiry = () => (
    <div className="screen">
      <div className="h2">問い合わせ</div>
      {inquiryItem ? (
        <>
          <div className="h3" style={{marginBottom:12}}>{inquiryItem.label}</div>
          <div className="fg">
            <label className="fl">送付先メールアドレス</label>
            {loading
              ? <div className="ld"><div className="ld-dots"><div className="ld-d"/><div className="ld-d"/><div className="ld-d"/></div>{loadingMsg}</div>
              : <input className="fi" value={inquiryEmail} onChange={e => setInquiryEmail(e.target.value)} placeholder="メールアドレス（自動検索 or 手動入力）" />
            }
          </div>
          <div className="fg">
            <label className="fl">言語</label>
            <div className="lang-row">
              <button className={`lang-btn${inquiryLang === "ja" ? " on" : ""}`} onClick={() => setInquiryLang("ja")}>日本語</button>
              <button className={`lang-btn${inquiryLang === "en" ? " on" : ""}`} onClick={() => setInquiryLang("en")}>English</button>
            </div>
          </div>
          <button className="btn" onClick={genDraft} disabled={loading}>
            {loading ? "生成中..." : "メール文章を生成する"}
          </button>
          {inquiryDraft && (
            <>
              <div className="ai-box" style={{marginTop:14}}>
                <div className="ai-hd"><span className="ai-dot"/>GENERATED DRAFT</div>
                <div className="ai-body">{inquiryDraft}</div>
              </div>
              {inquiryEmail && (
                <a className="mailto-link" href={`mailto:${inquiryEmail}?subject=${encodeURIComponent(inquiryItem.label + " お問い合わせ")}&body=${encodeURIComponent(inquiryDraft)}`}>
                  📧 メーラーで開く
                </a>
              )}
            </>
          )}
          <button className="btn-ghost" onClick={() => setScreen("plan")}>← プランに戻る</button>
        </>
      ) : (
        <p className="sub">プラン画面のアイテムから「問い合わせ」を選んでください。</p>
      )}
    </div>
  );

  return (
    <>
      <style>{S}</style>
      <div className="app">
        <div className="topbar">
          <div>
            <div className="logo">PITBOX</div>
            <div className="logo-tag">こだわりの一台を、計画的に。</div>
          </div>
          <div style={{textAlign:"right"}}>
            {car.name && <div className="car-sub">{car.name}{car.model ? " " + car.model : ""}</div>}
            {setupDone && <button onClick={reset} style={{marginTop:4,fontSize:10,color:"var(--red)",background:"none",border:"1px solid var(--bd)",padding:"4px 8px",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>RESET</button>}
          </div>
        </div>

        {screen === "setup" && renderSetup()}
        {screen === "plan" && renderPlan()}
        {screen === "schedule" && renderSchedule()}
        {screen === "inquiry" && renderInquiry()}

        <div className="bnav">
          {[
            { id: "setup", icon: "⚙️", label: "SETUP" },
            { id: "plan", icon: "📋", label: "PLAN" },
            { id: "schedule", icon: "📅", label: "SCHEDULE" },
            { id: "inquiry", icon: "📧", label: "INQUIRY" },
          ].map(nav => (
            <button
              key={nav.id}
              className={`nb${screen === nav.id ? " on" : ""}${!setupDone && nav.id !== "setup" ? " disabled" : ""}`}
              onClick={() => (setupDone || nav.id === "setup") && setScreen(nav.id)}
            >
              <span style={{fontSize:18}}>{nav.icon}</span>
              {nav.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
