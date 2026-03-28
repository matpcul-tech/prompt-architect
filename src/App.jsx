import { useState, useEffect, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   STORAGE LAYER — localStorage for browser persistence
   Your data stays in your browser across sessions.
   ═══════════════════════════════════════════════════════════ */
const KEYS = {
  APP_DATA: "prompt-architect:data-v2",
  SESSION:  "prompt-architect:session-v2",
};

const DEFAULT_DATA = {
  history: [],
  customTemplates: [],
  stats: {
    totalCreated: 0,
    totalEnhanced: 0,
    totalCopied: 0,
    bestScore: 0,
    firstUse: null,
    lastUse: null,
  },
};

const DEFAULT_SESSION = { fw: "crisp", fields: {}, tab: "build" };

async function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function storageSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

async function storageDel(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   FRAMEWORKS & TEMPLATES
   ═══════════════════════════════════════════════════════════ */
const FRAMEWORKS = [
  { id: "crisp", name: "C.R.I.S.P.", tag: "The all-rounder", icon: "◇", color: "#6ee7b7",
    fields: [
      { key: "context", label: "Context", hint: "Background the AI needs", ph: "e.g. I'm a Series B fintech startup expanding into European markets with 50K US users..." },
      { key: "role", label: "Role", hint: "Expert persona to assume", ph: "e.g. Act as a senior growth strategist who scaled 3 fintech companies from Series A to IPO..." },
      { key: "intent", label: "Intent", hint: "Exactly what you want", ph: "e.g. Create a 90-day European market entry playbook with country prioritization framework..." },
      { key: "scope", label: "Scope", hint: "Boundaries & constraints", ph: "e.g. Focus on UK, Germany, Netherlands. Budget cap €2M. Must comply with PSD2..." },
      { key: "parameters", label: "Parameters", hint: "Format, tone, length", ph: "e.g. Structured doc with executive summary, risk matrix, Gantt timeline. 3000 words, professional." },
    ],
  },
  { id: "chain", name: "Chain of Thought", tag: "Step-by-step reasoning", icon: "⟐", color: "#93c5fd",
    fields: [
      { key: "objective", label: "Objective", hint: "The end goal", ph: "e.g. Determine whether we should build or buy our data pipeline infrastructure..." },
      { key: "step1", label: "Step 1 — Gather", hint: "First reasoning phase", ph: "e.g. First, inventory our current data sources, volumes, latency requirements..." },
      { key: "step2", label: "Step 2 — Analyze", hint: "Second reasoning phase", ph: "e.g. Compare 3 build vs 3 buy options across cost, time-to-deploy, flexibility..." },
      { key: "step3", label: "Step 3 — Decide", hint: "Final reasoning phase", ph: "e.g. Recommend optimal path with decision matrix scoring 1-10 on 5 criteria..." },
      { key: "output", label: "Output Format", hint: "How to present results", ph: "e.g. Show reasoning at each step. End with single-page decision brief for CTO." },
    ],
  },
  { id: "persona", name: "Persona Depth", tag: "Expert character modeling", icon: "◉", color: "#c4b5fd",
    fields: [
      { key: "identity", label: "Identity", hint: "Who is this expert?", ph: "e.g. You are Maya Torres, former Head of Design at Airbnb, now consulting for hospitality startups..." },
      { key: "expertise", label: "Expertise", hint: "Knowledge areas", ph: "e.g. Design systems, user research, conversion optimization, accessibility standards..." },
      { key: "perspective", label: "Perspective", hint: "Worldview & biases", ph: "e.g. Beautiful design is functional design. Data-driven but trusts qualitative insights..." },
      { key: "task", label: "Task", hint: "What they should do", ph: "e.g. Audit our booking flow and identify the 3 highest-impact UX improvements..." },
      { key: "style", label: "Voice", hint: "Communication style", ph: "e.g. Direct and constructive. Use specific examples. Reference industry benchmarks." },
    ],
  },
  { id: "socratic", name: "Socratic", tag: "Question-driven exploration", icon: "∞", color: "#fca5a5",
    fields: [
      { key: "topic", label: "Topic", hint: "Subject to explore", ph: "e.g. Long-term economic impact of universal basic income in developed nations..." },
      { key: "assumption", label: "Challenge", hint: "Assumptions to question", ph: "e.g. Challenge the assumption that UBI reduces workforce participation..." },
      { key: "depth", label: "Depth", hint: "Analytical level", ph: "e.g. PhD-level analysis with behavioral economics, labor market theory, case studies..." },
      { key: "counterpoint", label: "Counterpoints", hint: "Opposing views", ph: "e.g. Include libertarian economists, Nordic welfare advocates, tech industry leaders..." },
      { key: "synthesis", label: "Synthesis", hint: "Conclusion goal", ph: "e.g. Framework mapping implementation conditions to likely outcomes across 3 scenarios." },
    ],
  },
  { id: "mega", name: "Mega Prompt", tag: "Maximum firepower", icon: "⬡", color: "#fcd34d",
    fields: [
      { key: "mission", label: "Mission", hint: "Overarching goal", ph: "e.g. Design a complete AI-powered customer support system for a 100K-user SaaS platform..." },
      { key: "audience", label: "Audience", hint: "Who consumes output", ph: "e.g. VP Engineering and CTO who approve budget and architecture decisions..." },
      { key: "constraints", label: "Rules", hint: "Hard boundaries", ph: "e.g. Integrate with Zendesk. Budget <$50K/year. 99.9% uptime. SOC 2 compliant." },
      { key: "examples", label: "References", hint: "Good/bad models", ph: "e.g. Inspired by Intercom's Resolution Bot. Avoid IBM Watson complexity trap." },
      { key: "quality", label: "Quality Gates", hint: "Success criteria", ph: "e.g. Include ROI projection, timeline, risk register, and week-1 POC scope." },
    ],
  },
];

const BUILTIN_TEMPLATES = [
  { cat: "Business", name: "Market Analysis", desc: "Competitive landscape & opportunity mapping", fw: "crisp", builtin: true, pre: { context: "I need a comprehensive competitive analysis for a new product.", role: "Act as a senior strategy consultant at Bain with 15+ years in competitive intelligence.", intent: "Produce a market analysis with competitor profiles, gaps, and recommendations.", scope: "North American B2B SaaS, mid-market ($10M–$500M ARR).", parameters: "Executive report: summary, competitor matrix, SWOT top 5, 3 recommendations. 2500 words." } },
  { cat: "Business", name: "Investor Memo", desc: "Fundraise narrative & financial story", fw: "mega", builtin: true, pre: { mission: "Draft a compelling Series A investment memo.", audience: "Partners at top-tier VC firms evaluating 100+ deals monthly.", constraints: "3-page max. Thesis, TAM/SAM/SOM, traction, team, use of funds.", examples: "Model after Sequoia's framework. Lead with market insight.", quality: "Partner wants a meeting after page 1. Every metric sourced." } },
  { cat: "Writing", name: "Thought Leadership", desc: "Authority-building long-form", fw: "persona", builtin: true, pre: { identity: "Senior content strategist who built 200K+ audiences.", expertise: "SEO long-form, narrative storytelling, thought leadership.", perspective: "Best content teaches something new. Substance over virality.", task: "Write comprehensive article with original thinking on [topic].", style: "Authoritative but conversational. Counterintuitive hook." } },
  { cat: "Writing", name: "Technical Docs", desc: "Developer-friendly API docs", fw: "crisp", builtin: true, pre: { context: "Engineering ships features faster than we document them.", role: "Act as a principal technical writer at Stripe.", intent: "Create developer-friendly docs reducing support tickets.", scope: "Auth, CRUD endpoints, errors, rate limits, webhooks.", parameters: "OpenAPI-style. Code in Python, JS, cURL. 5-min quickstart." } },
  { cat: "Code", name: "Architecture Review", desc: "System design evaluation", fw: "chain", builtin: true, pre: { objective: "Evaluate current architecture for 10x scale.", step1: "Map services, databases, queues, caching. Identify SPOFs.", step2: "Stress-test at 10x. Find bottlenecks.", step3: "3-stage migration in 4-week sprints with rollback.", output: "ADR format with diagrams, costs, risk register." } },
  { cat: "Code", name: "Code Review", desc: "Systematic quality analysis", fw: "mega", builtin: true, pre: { mission: "Comprehensive review: bugs, security, improvements.", audience: "The developer — constructive and educational.", constraints: "P0-P3 severity. Fix with code. Top 10 max.", examples: "Google code review style. Specific line references.", quality: "Developer learns from every piece of feedback." } },
  { cat: "Research", name: "Deep Analysis", desc: "Multi-perspective research", fw: "socratic", builtin: true, pre: { topic: "[Topic] — causes, implications, solutions.", assumption: "Challenge dominant narrative.", depth: "Graduate-level, cross-disciplinary.", counterpoint: "3+ schools of thought.", synthesis: "Decision framework with confidence levels." } },
  { cat: "Research", name: "Competitive Intel", desc: "Competitor deep-dive", fw: "chain", builtin: true, pre: { objective: "Build intelligence profile of [competitor].", step1: "Map 2-year product evolution.", step2: "Analyze GTM: segments, messaging, hiring.", step3: "Predict next moves. 3 counter-strategies.", output: "Intel brief: summary, findings, threat matrix." } },
];

const TIPS = [
  { t: "Be Ruthlessly Specific", b: "'Write a 1200-word blog post for engineering managers about CI/CD in a conversational tone with 3 code examples' massively outperforms 'write about CI/CD.'", i: "🎯" },
  { t: "Assign an Expert Persona", b: "'Act as a principal engineer at Netflix who designed microservices' produces far richer output than a generic request.", i: "🧠" },
  { t: "Show, Don't Tell", b: "One example of desired output beats a paragraph of abstract instructions.", i: "👁" },
  { t: "Chain Your Reasoning", b: "'First analyze X, then evaluate Y, finally recommend Z' prevents shallow conclusions.", i: "🔗" },
  { t: "Define Anti-Patterns", b: "'Do NOT use jargon. Do NOT exceed 800 words.' Negative constraints are powerful.", i: "🚫" },
  { t: "Add Quality Gates", b: "'Verify every claim has evidence' or 'Rate confidence 1-10 for each recommendation.'", i: "✅" },
  { t: "Specify Your Audience", b: "'Explain to a CFO with no technical background' produces completely different output than 'explain to a developer.'", i: "👥" },
];

/* ═══════════════ SCORING ═══════════════ */
function scorePrompt(text) {
  if (!text || text.length < 15) return { total: 0, dims: [], suggestions: [] };
  const t = text.toLowerCase(), sg = [];
  const sp = Math.min(100, 10 + ["specific","exactly","precisely","must","should","required","ensure","include","exclude","between","at least","no more than"].filter(w => t.includes(w)).length * 9 + Math.min(35, text.length / 20) + (text.match(/\d+/g) || []).length * 5);
  if (sp < 50) sg.push("Add specific numbers or measurable criteria");
  const cx = Math.min(100, 8 + ["background","context","situation","currently","because","given that","considering","working on","building","developing","our company","my team","the market","customers"].filter(w => t.includes(w)).length * 10 + (text.length > 300 ? 20 : text.length > 150 ? 10 : 0));
  if (cx < 50) sg.push("Add more background context about your situation");
  const sn = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const al = sn.length ? text.length / sn.length : text.length;
  const cl = Math.min(100, sn.length > 2 ? (al < 120 ? 85 : al < 200 ? 65 : 40) : 30);
  if (cl < 50) sg.push("Break into shorter, clearer sentences");
  const ac = Math.min(100, ["create","generate","write","analyze","list","compare","explain","build","design","evaluate","summarize","produce","draft","develop","recommend","identify","outline","assess","propose"].filter(w => t.includes(w)).length * 14 + 5);
  if (ac < 50) sg.push("Use stronger action verbs — create, analyze, recommend");
  const co = Math.min(100, ["words","format","tone","style","limit","avoid","don't","do not","maximum","minimum","between","under","page","bullet","paragraph","table","professional","structured"].filter(w => t.includes(w)).length * 12 + 5);
  if (co < 50) sg.push("Add format, length, and tone constraints");
  const dims = [{ name: "Specificity", score: Math.round(sp), color: "#6ee7b7" }, { name: "Context", score: Math.round(cx), color: "#c4b5fd" }, { name: "Clarity", score: Math.round(cl), color: "#93c5fd" }, { name: "Actionability", score: Math.round(ac), color: "#fcd34d" }, { name: "Constraints", score: Math.round(co), color: "#fca5a5" }];
  return { total: Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length), dims, suggestions: sg.slice(0, 3) };
}

function assemblePrompt(fwId, fields) {
  const fw = FRAMEWORKS.find(f => f.id === fwId);
  if (!fw) return "";
  const filled = fw.fields.filter(f => fields[f.key]?.trim());
  if (!filled.length) return "";
  return `[${fw.name} Framework]\n\n${filled.map(f => `## ${f.label}\n${fields[f.key].trim()}`).join("\n\n")}`;
}

/* ═══════════════ STYLES ═══════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap');
:root{--bg:#06080f;--bg1:#0c1019;--bg2:#121825;--bg3:#1a2235;--border:#1e2a3d;--text:#dfe6f0;--text2:#8b9bbf;--text3:#546080;--accent:#6ee7b7;--blue:#60a5fa;--mono:'JetBrains Mono',monospace;--sans:'Outfit',system-ui,sans-serif;--serif:'Newsreader',Georgia,serif}
*{box-sizing:border-box;margin:0;padding:0}
::selection{background:rgba(110,231,183,.2)}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--bg3);border-radius:5px}
textarea:focus,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
textarea::placeholder{color:var(--text3)}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.fu{animation:fadeUp .4s ease both}.s1{animation-delay:.05s}.s2{animation-delay:.1s}.s3{animation-delay:.15s}.s4{animation-delay:.2s}.s5{animation-delay:.25s}
`;

/* ═══════════════ COMPONENTS ═══════════════ */
function Ring({ score, size = 130 }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r, o = c - (score / 100) * c;
  const col = score >= 70 ? "#6ee7b7" : score >= 40 ? "#fcd34d" : "#f87171";
  return <div style={{ position: "relative", width: size, height: size }}><svg width={size} height={size}><circle cx={size/2} cy={size/2} r={r} fill={score>=70?"rgba(110,231,183,.06)":score>=40?"rgba(252,211,77,.06)":"rgba(248,113,113,.06)"} stroke="var(--bg3)" strokeWidth="6" opacity=".4"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="6" strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" style={{transition:"stroke-dashoffset .8s cubic-bezier(.4,0,.2,1),stroke .5s",transform:"rotate(-90deg)",transformOrigin:"center"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:size*.3,fontWeight:800,color:col,fontFamily:"var(--mono)",lineHeight:1}}>{score}</span><span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)",marginTop:2}}>/ 100</span></div></div>;
}

function Bar({ name, score, color }) {
  return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><span style={{width:85,fontSize:11,color:"var(--text2)",fontFamily:"var(--mono)",textAlign:"right",flexShrink:0}}>{name}</span><div style={{flex:1,height:5,background:"var(--bg3)",borderRadius:3,overflow:"hidden"}}><div style={{width:`${score}%`,height:"100%",background:color,borderRadius:3,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/></div><span style={{width:26,fontSize:10,color,fontFamily:"var(--mono)",fontWeight:700,textAlign:"right"}}>{score}</span></div>;
}

function Field({ field: f, value: v, onChange, index: i }) {
  const [fc, sfc] = useState(false);
  return <div className={`fu s${Math.min(i+1,5)}`} style={{marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:600,color:fc?"var(--accent)":"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1.5,transition:"color .2s"}}><span style={{width:20,height:20,borderRadius:5,background:v?.trim()?"var(--accent)":"var(--bg3)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:v?.trim()?"var(--bg)":"var(--text3)",fontWeight:800,transition:"all .3s"}}>{v?.trim()?"✓":i+1}</span>{f.label}</label><span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)",fontStyle:"italic"}}>{f.hint}</span></div><textarea value={v||""} onChange={e=>onChange(e.target.value)} onFocus={()=>sfc(true)} onBlur={()=>sfc(false)} placeholder={f.ph} rows={3} style={{width:"100%",padding:"11px 13px",borderRadius:8,border:`1px solid ${fc?"var(--accent)":"var(--border)"}`,background:fc?"rgba(110,231,183,.02)":"var(--bg1)",color:"var(--text)",fontSize:13.5,resize:"vertical",fontFamily:"var(--sans)",lineHeight:1.65,transition:"all .2s",boxShadow:fc?"0 0 0 3px rgba(110,231,183,.06)":"none"}}/></div>;
}

function SaveModal({ fw, fields, onSave, onClose }) {
  const [n, sn] = useState(""), [d, sd] = useState(""), [c, sc] = useState("Custom");
  return <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.7)",animation:"fadeIn .2s"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:"100%",maxWidth:440,animation:"scaleIn .2s"}}><h3 style={{margin:"0 0 4px",fontSize:18,fontWeight:700,color:"var(--text)"}}>Save as Template</h3><p style={{fontSize:12,color:"var(--text3)",margin:"0 0 20px"}}>Save your current {fw?.name} config as a reusable template.</p><div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Name *</label><input value={n} onChange={e=>sn(e.target.value)} placeholder="e.g. My Sales Pitch" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg1)",color:"var(--text)",fontSize:13,fontFamily:"var(--sans)"}}/></div><div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Description</label><input value={d} onChange={e=>sd(e.target.value)} placeholder="What this does" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg1)",color:"var(--text)",fontSize:13,fontFamily:"var(--sans)"}}/></div><div style={{marginBottom:20}}><label style={{fontSize:11,fontWeight:700,color:"var(--text2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:5}}>Category</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Custom","Business","Writing","Code","Research"].map(x=><button key={x} onClick={()=>sc(x)} style={{padding:"6px 14px",borderRadius:6,border:"1px solid",fontSize:11,cursor:"pointer",fontWeight:600,fontFamily:"var(--mono)",borderColor:c===x?"var(--accent)":"var(--border)",background:c===x?"rgba(110,231,183,.06)":"transparent",color:c===x?"var(--accent)":"var(--text3)"}}>{x}</button>)}</div></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:13,cursor:"pointer"}}>Cancel</button><button onClick={()=>{if(n.trim())onSave({name:n.trim(),desc:d.trim()||"Custom template",cat:c,fw:fw?.id,pre:{...fields},builtin:false,id:Date.now()})}} disabled={!n.trim()} style={{padding:"9px 18px",borderRadius:8,border:"none",background:n.trim()?"var(--accent)":"var(--bg3)",color:n.trim()?"var(--bg)":"var(--text3)",fontSize:13,fontWeight:700,cursor:n.trim()?"pointer":"not-allowed"}}>Save</button></div></div></div>;
}

function DataModal({ ad, onClose, onReset }) {
  const [cf, scf] = useState(false);
  const dy = ad.stats.firstUse ? Math.floor((Date.now() - new Date(ad.stats.firstUse).getTime()) / 864e5) : 0;
  return <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.7)",animation:"fadeIn .2s"}} onClick={onClose}><div onClick={e=>e.stopPropagation()} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:16,padding:28,width:"100%",maxWidth:420,animation:"scaleIn .2s"}}><h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:"var(--text)"}}>Your Data & Stats</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>{[{l:"Saved",v:ad.stats.totalCreated},{l:"Enhanced",v:ad.stats.totalEnhanced},{l:"Copied",v:ad.stats.totalCopied},{l:"Best Score",v:ad.stats.bestScore},{l:"History",v:ad.history.length},{l:"Templates",v:ad.customTemplates.length},{l:"Days Active",v:dy||"<1"}].map(s=><div key={s.l} style={{background:"var(--bg1)",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:18,fontWeight:800,color:"var(--accent)",fontFamily:"var(--mono)"}}>{s.v}</div><div style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)"}}>{s.l}</div></div>)}</div>{!cf?<button onClick={()=>scf(true)} style={{width:"100%",padding:10,borderRadius:8,border:"1px solid rgba(248,113,113,.3)",background:"rgba(248,113,113,.05)",color:"#f87171",fontSize:12,cursor:"pointer",fontFamily:"var(--mono)"}}>Reset All Data</button>:<div style={{padding:14,borderRadius:8,border:"1px solid rgba(248,113,113,.3)",background:"rgba(248,113,113,.05)"}}><p style={{fontSize:12,color:"#fca5a5",margin:"0 0 10px"}}>Permanently delete everything?</p><div style={{display:"flex",gap:8}}><button onClick={()=>scf(false)} style={{flex:1,padding:8,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:12,cursor:"pointer"}}>Cancel</button><button onClick={onReset} style={{flex:1,padding:8,borderRadius:6,border:"none",background:"#dc2626",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Delete</button></div></div>}<button onClick={onClose} style={{width:"100%",padding:10,borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:12,cursor:"pointer",fontFamily:"var(--mono)",marginTop:8}}>Close</button></div></div>;
}

/* ═══════════════════════════════════════════════════════════
   MAIN APPLICATION
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [fw, setFw] = useState("crisp");
  const [flds, setFlds] = useState({});
  const [enh, setEnh] = useState("");
  const [isE, setIsE] = useState(false);
  const [shE, setShE] = useState(false);
  const [cp, setCp] = useState(false);
  const [tab, setTab] = useState("build");
  const [cat, setCat] = useState("Business");

  // Persistent state
  const [ad, setAd] = useState(DEFAULT_DATA);
  const [ready, setReady] = useState(false);
  const [ss, setSs] = useState("");
  const [shH, setShH] = useState(false);
  const [shSM, setShSM] = useState(false);
  const [shDM, setShDM] = useState(false);

  // Derived
  const asm = useMemo(() => assemblePrompt(fw, flds), [fw, flds]);
  const sc = useMemo(() => scorePrompt(asm), [asm]);
  const fwk = FRAMEWORKS.find(f => f.id === fw);
  const fc = fwk?.fields.filter(f => flds[f.key]?.trim()).length || 0;
  const allT = useMemo(() => [...BUILTIN_TEMPLATES, ...ad.customTemplates], [ad.customTemplates]);
  const cats = useMemo(() => { const c = [...new Set(allT.map(t => t.cat))]; if (c.includes("Custom")) { c.splice(c.indexOf("Custom"), 1); c.unshift("Custom"); } return c; }, [allT]);
  const dsp = shE && enh ? enh : asm;

  // ── Load on mount ──
  useEffect(() => {
    let m = true;
    (async () => {
      const [d, s] = await Promise.all([storageGet(KEYS.APP_DATA, DEFAULT_DATA), storageGet(KEYS.SESSION, DEFAULT_SESSION)]);
      if (!m) return;
      setAd({ history: Array.isArray(d.history) ? d.history : [], customTemplates: Array.isArray(d.customTemplates) ? d.customTemplates : [], stats: { ...DEFAULT_DATA.stats, ...(d.stats || {}) } });
      if (s.fw) setFw(s.fw);
      if (s.fields && Object.keys(s.fields).length) setFlds(s.fields);
      if (s.tab) setTab(s.tab);
      setReady(true);
    })();
    return () => { m = false; };
  }, []);

  // ── Auto-save session (debounced 800ms) ──
  const st = useRef(null);
  useEffect(() => { if (!ready) return; if (st.current) clearTimeout(st.current); st.current = setTimeout(() => storageSet(KEYS.SESSION, { fw, fields: flds, tab }), 800); return () => { if (st.current) clearTimeout(st.current); }; }, [fw, flds, tab, ready]);

  // ── Auto-save app data (debounced 500ms) ──
  const dt = useRef(null);
  useEffect(() => { if (!ready) return; if (dt.current) clearTimeout(dt.current); dt.current = setTimeout(() => storageSet(KEYS.APP_DATA, ad), 500); return () => { if (dt.current) clearTimeout(dt.current); }; }, [ad, ready]);

  useEffect(() => { setEnh(""); setShE(false); }, [flds, fw]);

  // ── Actions ──
  const hF = (k, v) => setFlds(p => ({ ...p, [k]: v }));
  const hCp = t => { navigator.clipboard.writeText(t); setCp(true); setTimeout(() => setCp(false), 2e3); setAd(p => ({ ...p, stats: { ...p.stats, totalCopied: p.stats.totalCopied + 1 } })); };
  const apT = t => { setFw(t.fw); setFlds(t.pre); setTab("build"); };
  const clr = () => { setFlds({}); setEnh(""); setShE(false); };

  const save = () => {
    if (!asm.trim()) return;
    setSs("saving");
    const entry = { id: Date.now(), framework: fwk.name, fwId: fw, prompt: shE && enh ? enh : asm, fields: { ...flds }, score: sc.total, date: new Date().toLocaleDateString(), ts: Date.now() };
    setAd(p => ({ ...p, history: [entry, ...p.history].slice(0, 50), stats: { ...p.stats, totalCreated: p.stats.totalCreated + 1, bestScore: Math.max(p.stats.bestScore, sc.total), firstUse: p.stats.firstUse || new Date().toISOString(), lastUse: new Date().toISOString() } }));
    setSs("saved"); setTimeout(() => setSs(""), 2e3);
  };

  const loadH = e => { setFw(e.fwId); setFlds(e.fields); setShH(false); };
  const delH = (id, e) => { e.stopPropagation(); setAd(p => ({ ...p, history: p.history.filter(h => h.id !== id) })); };
  const saveCT = t => { setAd(p => ({ ...p, customTemplates: [t, ...p.customTemplates].slice(0, 30) })); setShSM(false); setCat(t.cat); setTab("templates"); };
  const delCT = (id, e) => { e.stopPropagation(); setAd(p => ({ ...p, customTemplates: p.customTemplates.filter(t => t.id !== id) })); };
  const reset = async () => { await storageDel(KEYS.APP_DATA); await storageDel(KEYS.SESSION); setAd(DEFAULT_DATA); setFlds({}); setFw("crisp"); setTab("build"); setShDM(false); };

  const exp = () => { const c = shE && enh ? enh : asm; const b = new Blob([c], { type: "text/markdown" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `prompt-${Date.now()}.md`; a.click(); URL.revokeObjectURL(u); };

  // ── AI Enhancement ──
  // Calls /api/enhance (your backend proxy). If you haven't set up
  // the backend yet, it shows a helpful message instead of crashing.
  const enhance = async () => {
    if (!asm.trim() || isE) return;
    setIsE(true); setShE(true);
    try {
      const r = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: asm }),
      });
      if (r.ok) {
        const data = await r.json();
        setEnh(data.enhanced || "Enhancement returned empty. Try again.");
        setAd(p => ({ ...p, stats: { ...p.stats, totalEnhanced: p.stats.totalEnhanced + 1, firstUse: p.stats.firstUse || new Date().toISOString() } }));
      } else {
        throw new Error("API returned " + r.status);
      }
    } catch {
      setEnh("AI Enhancement needs a backend API to work.\n\nThe rest of the app (frameworks, scoring, templates, history) works perfectly without it.\n\nTo enable AI Enhancement, deploy the backend proxy from prompt-architect-api.zip to Vercel and add your Anthropic API key.\n\nSee the README in that zip for step-by-step instructions.");
    }
    setIsE(false);
  };

  // ── Loading ──
  if (!ready) return <div style={{minHeight:"100vh",background:"#06080f",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{CSS}</style><div style={{textAlign:"center",animation:"fadeIn .5s"}}><div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#6ee7b7,#60a5fa)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"#06080f",fontFamily:"var(--mono)",margin:"0 auto 12px"}}>P</div><p style={{color:"#546080",fontSize:13,fontFamily:"var(--sans)"}}>Loading your workspace...</p></div></div>;

  /* ═══════════════ RENDER ═══════════════ */
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"var(--sans)",position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>
      {shSM && <SaveModal fw={fwk} fields={flds} onSave={saveCT} onClose={() => setShSM(false)} />}
      {shDM && <DataModal ad={ad} onClose={() => setShDM(false)} onReset={reset} />}

      {/* BG */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}><div style={{position:"absolute",top:"-30%",left:"-15%",width:"55%",height:"55%",background:"radial-gradient(ellipse,rgba(110,231,183,.04) 0%,transparent 70%)",filter:"blur(100px)"}}/><div style={{position:"absolute",bottom:"-25%",right:"-10%",width:"45%",height:"45%",background:"radial-gradient(ellipse,rgba(96,165,250,.03) 0%,transparent 70%)",filter:"blur(100px)"}}/><div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(110,231,183,.03) 1px,transparent 1px)",backgroundSize:"40px 40px",opacity:.4}}/></div>

      <div style={{position:"relative",zIndex:1,maxWidth:1320,margin:"0 auto",padding:"20px 16px 60px"}}>
        {/* HEADER */}
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,var(--accent),var(--blue))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:800,color:"var(--bg)",fontFamily:"var(--mono)"}}>P</div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,fontWeight:700,letterSpacing:-.5}}>Prompt Architect</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:"rgba(110,231,183,.1)",color:"var(--accent)",fontFamily:"var(--mono)",fontWeight:700}}>PRO</span></div>
              <span style={{fontSize:11,color:"var(--text3)",fontFamily:"var(--mono)"}}>{ad.stats.totalCreated > 0 ? `${ad.stats.totalCreated} prompts · Best: ${ad.stats.bestScore}` : "Engineer perfect prompts, every time"}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={() => setShDM(true)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:12,cursor:"pointer",fontFamily:"var(--mono)"}}>⚙</button>
            <button onClick={() => setShH(!shH)} style={{padding:"8px 14px",borderRadius:8,border:"1px solid var(--border)",background:shH?"var(--bg2)":"transparent",color:"var(--text2)",fontSize:12,cursor:"pointer",fontFamily:"var(--mono)"}}>↻ History{ad.history.length > 0 ? ` (${ad.history.length})` : ""}</button>
          </div>
        </header>

        {/* HISTORY */}
        {shH && <div style={{marginBottom:20,animation:"scaleIn .2s"}}><div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:20,maxHeight:320,overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:13,fontWeight:700,color:"var(--text2)",fontFamily:"var(--mono)"}}>Saved Prompts</span><button onClick={() => setShH(false)} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:16}}>✕</button></div>{ad.history.length === 0 ? <p style={{color:"var(--text3)",fontSize:13,textAlign:"center",padding:20}}>No saved prompts yet.</p> : ad.history.map(h => <div key={h.id} onClick={() => loadH(h)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)",marginBottom:6,cursor:"pointer",background:"var(--bg1)"}}><div><span style={{fontSize:13,fontWeight:600}}>{h.framework}</span><span style={{fontSize:11,color:"var(--text3)",marginLeft:10}}>{h.date}</span></div><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:11,fontFamily:"var(--mono)",color:h.score>=70?"var(--accent)":h.score>=40?"#fcd34d":"#f87171",fontWeight:700}}>{h.score}</span><button onClick={e => delH(h.id, e)} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:13,padding:"2px 6px"}}>✕</button></div></div>)}</div></div>}

        {/* TABS */}
        <div style={{display:"flex",gap:3,marginBottom:24,background:"var(--bg1)",borderRadius:10,padding:3,maxWidth:440,border:"1px solid var(--border)"}}>
          {[["build","Build"],["templates","Templates"],["guide","Guide"]].map(([id, l]) => <button key={id} onClick={() => setTab(id)} style={{flex:1,padding:"10px 6px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"var(--sans)",transition:"all .2s",background:tab===id?"var(--bg3)":"transparent",color:tab===id?"var(--text)":"var(--text3)"}}>{l}</button>)}
        </div>

        {/* TEMPLATES */}
        {tab === "templates" && <div style={{maxWidth:900,animation:"fadeUp .3s"}}><h2 style={{fontFamily:"var(--serif)",fontSize:28,fontWeight:400,marginBottom:4}}>Templates</h2><p style={{color:"var(--text3)",fontSize:13,marginBottom:20}}>{ad.customTemplates.length > 0 ? `${ad.customTemplates.length} custom template${ad.customTemplates.length > 1 ? "s" : ""} saved.` : "One click to load. Save your own from Build tab."}</p><div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{cats.map(c => <button key={c} onClick={() => setCat(c)} style={{padding:"7px 18px",borderRadius:6,border:"1px solid",fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:"var(--mono)",borderColor:cat===c?"var(--accent)":"var(--border)",background:cat===c?"rgba(110,231,183,.06)":"transparent",color:cat===c?"var(--accent)":"var(--text3)"}}>{c}</button>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>{allT.filter(t => t.cat === cat).map((t, i) => <div key={t.id || i} style={{position:"relative"}}><button onClick={() => apT(t)} className={`fu s${Math.min(i+1,5)}`} style={{textAlign:"left",padding:"18px 20px",borderRadius:12,border:"1px solid var(--border)",background:"var(--bg2)",cursor:"pointer",color:"var(--text)",display:"block",width:"100%"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:6}}><span style={{fontSize:15,fontWeight:700}}>{t.name}</span><span style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:"rgba(110,231,183,.08)",color:"var(--accent)",fontFamily:"var(--mono)",fontWeight:700,flexShrink:0}}>{FRAMEWORKS.find(f => f.id === t.fw)?.name}</span></div><p style={{fontSize:12,color:"var(--text3)",margin:"0 0 10px",lineHeight:1.5}}>{t.desc}</p><span style={{fontSize:11,color:"var(--accent)",fontWeight:600,fontFamily:"var(--mono)"}}>Load →</span></button>{!t.builtin && <button onClick={e => delCT(t.id, e)} style={{position:"absolute",top:8,right:8,background:"var(--bg3)",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:11,padding:"4px 8px",borderRadius:4,zIndex:2}}>✕</button>}</div>)}</div></div>}

        {/* GUIDE */}
        {tab === "guide" && <div style={{maxWidth:740,animation:"fadeUp .3s"}}><h2 style={{fontFamily:"var(--serif)",fontSize:28,fontWeight:400,marginBottom:4}}>Prompt Engineering Playbook</h2><p style={{color:"var(--text3)",fontSize:13,marginBottom:24}}>Seven principles that separate amateur prompts from professional ones.</p><div style={{background:"var(--bg2)",borderRadius:16,border:"1px solid var(--border)",overflow:"hidden"}}>{TIPS.map((tip, i) => <div key={i} className={`fu s${Math.min(i+1,5)}`} style={{padding:"20px 24px",borderBottom:i<TIPS.length-1?"1px solid var(--border)":"none"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:18}}>{tip.i}</span><h4 style={{margin:0,color:"var(--accent)",fontSize:14,fontWeight:700}}>{tip.t}</h4></div><p style={{margin:0,color:"var(--text2)",fontSize:13.5,lineHeight:1.75,paddingLeft:36}}>{tip.b}</p></div>)}</div></div>}

        {/* BUILD */}
        {tab === "build" && <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:20,alignItems:"start"}}>
          <div>
            <div style={{marginBottom:20}}><span style={{fontSize:11,fontWeight:700,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:2,marginBottom:10,display:"block"}}>Framework</span><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:6}}>{FRAMEWORKS.map(f => <button key={f.id} onClick={() => {setFw(f.id);setFlds({})}} style={{padding:"12px 14px",borderRadius:10,border:"1px solid",cursor:"pointer",textAlign:"left",transition:"all .2s",borderColor:fw===f.id?f.color+"66":"var(--border)",background:fw===f.id?f.color+"0a":"var(--bg2)",color:"var(--text)"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><span style={{fontSize:14,color:fw===f.id?f.color:"var(--text3)"}}>{f.icon}</span><span style={{fontSize:13,fontWeight:700}}>{f.name}</span></div><span style={{fontSize:10,color:"var(--text3)"}}>{f.tag}</span></button>)}</div></div>

            <div style={{background:"var(--bg2)",borderRadius:14,border:"1px solid var(--border)",padding:"20px 22px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,color:fwk?.color}}>{fwk?.icon}</span><span style={{fontSize:16,fontWeight:700}}>{fwk?.name}</span><span style={{fontSize:11,color:"var(--text3)",fontFamily:"var(--mono)"}}>{fc}/{fwk?.fields.length}</span></div><div style={{display:"flex",gap:6}}>{fc > 0 && <><button onClick={() => setShSM(true)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid rgba(110,231,183,.2)",background:"rgba(110,231,183,.04)",color:"var(--accent)",fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>Save as Template</button><button onClick={clr} style={{padding:"5px 12px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>Clear</button></>}</div></div>
              <div style={{height:3,background:"var(--bg3)",borderRadius:2,marginBottom:18,overflow:"hidden"}}><div style={{width:`${(fc/(fwk?.fields.length||1))*100}%`,height:"100%",background:`linear-gradient(90deg,${fwk?.color},var(--blue))`,borderRadius:2,transition:"width .4s cubic-bezier(.4,0,.2,1)"}}/></div>
              {fwk?.fields.map((f, i) => <Field key={f.key} field={f} value={flds[f.key]} onChange={v => hF(f.key, v)} index={i} />)}
            </div>

            {asm && <div style={{marginTop:16,background:"var(--bg2)",borderRadius:14,border:"1px solid var(--border)",overflow:"hidden",animation:"fadeUp .3s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px",borderBottom:"1px solid var(--border)",background:"var(--bg1)",flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:700,color:shE&&enh?"var(--accent)":"var(--text2)",fontFamily:"var(--mono)"}}>{shE&&enh?"⚡ Enhanced":"Assembled"}</span><span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)"}}>{dsp.split(/\s+/).filter(Boolean).length}w</span></div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {enh && <button onClick={() => setShE(!shE)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>{shE?"Original":"Enhanced ⚡"}</button>}
                  <button onClick={exp} style={{padding:"5px 10px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>↓</button>
                  <button onClick={save} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${ss==="saved"?"var(--accent)":"var(--border)"}`,background:ss==="saved"?"rgba(110,231,183,.06)":"transparent",color:ss==="saved"?"var(--accent)":"var(--text3)",fontSize:11,cursor:"pointer",fontFamily:"var(--mono)",transition:"all .2s"}}>{ss==="saved"?"✓ Saved":"★ Save"}</button>
                  <button onClick={() => hCp(dsp)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${cp?"var(--accent)":"var(--border)"}`,background:cp?"rgba(110,231,183,.06)":"transparent",color:cp?"var(--accent)":"var(--text3)",fontSize:11,cursor:"pointer",fontFamily:"var(--mono)",transition:"all .2s"}}>{cp?"✓ Copied":"Copy"}</button>
                </div>
              </div>
              <pre style={{padding:"16px 18px",margin:0,fontSize:12.5,lineHeight:1.7,color:"var(--text2)",whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"var(--mono)",maxHeight:360,overflowY:"auto"}}>{dsp}</pre>
            </div>}
          </div>

          {/* RIGHT */}
          <div style={{position:"sticky",top:20}}>
            <div style={{background:"var(--bg2)",borderRadius:14,border:"1px solid var(--border)",padding:22,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:11,fontWeight:700,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:2}}>Quality Score</span>{sc.total > 0 && <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,fontFamily:"var(--mono)",fontWeight:700,background:sc.total>=70?"rgba(110,231,183,.1)":sc.total>=40?"rgba(252,211,77,.1)":"rgba(248,113,113,.1)",color:sc.total>=70?"var(--accent)":sc.total>=40?"#fcd34d":"#f87171"}}>{sc.total>=70?"Excellent":sc.total>=40?"Good":"Needs work"}</span>}</div>
              <div style={{display:"flex",justifyContent:"center",marginBottom:18}}><Ring score={sc.total} /></div>
              {sc.dims.map(d => <Bar key={d.name} {...d} />)}
              {sc.suggestions.length > 0 && <div style={{marginTop:14,padding:"12px 14px",borderRadius:8,background:"var(--bg1)",border:"1px solid var(--border)"}}><span style={{fontSize:10,fontWeight:700,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:8}}>Improve</span>{sc.suggestions.map((s, i) => <div key={i} style={{display:"flex",gap:7,marginBottom:i<sc.suggestions.length-1?6:0,fontSize:12,color:"var(--text2)",lineHeight:1.5}}><span style={{color:"var(--accent)",flexShrink:0}}>→</span><span>{s}</span></div>)}</div>}
            </div>

            <button onClick={enhance} disabled={!asm.trim()||isE} style={{width:"100%",padding:"14px 20px",borderRadius:10,border:"none",cursor:asm.trim()&&!isE?"pointer":"not-allowed",background:asm.trim()?"linear-gradient(135deg,#059669,#10b981,#34d399)":"var(--bg3)",backgroundSize:"200% 100%",animation:isE?"shimmer 1.5s infinite linear":"none",color:asm.trim()?"#fff":"var(--text3)",fontSize:14,fontWeight:700,fontFamily:"var(--sans)",transition:"all .3s",marginBottom:12,boxShadow:asm.trim()?"0 4px 20px rgba(16,185,129,.2)":"none",opacity:isE?.75:1}}>{isE?"Enhancing...":"⚡ AI Enhance"}</button>

            {asm && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>{[{l:"Words",v:asm.split(/\s+/).filter(Boolean).length},{l:"Chars",v:asm.length},{l:"Fields",v:`${fc}/${fwk?.fields.length}`}].map(s => <div key={s.l} style={{background:"var(--bg2)",borderRadius:8,border:"1px solid var(--border)",padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:17,fontWeight:800,color:"var(--blue)",fontFamily:"var(--mono)"}}>{s.v}</div><div style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{s.l}</div></div>)}</div>}

            <div style={{background:"var(--bg2)",borderRadius:12,border:"1px solid var(--border)",padding:16}}>
              <span style={{fontSize:10,fontWeight:700,color:"var(--text3)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:2,display:"block",marginBottom:10}}>Quick Actions</span>
              {[{l:"📋 Templates",a:()=>setTab("templates")},{l:fc?"💾 Save template":"💾 Load template",a:()=>fc?setShSM(true):setTab("templates")},{l:"🎯 Playbook",a:()=>setTab("guide")},{l:"🗑 Clear",a:clr}].map((x, i) => <button key={i} onClick={x.a} style={{width:"100%",padding:9,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:i===3?"var(--text3)":"var(--text2)",fontSize:12,cursor:"pointer",fontFamily:"var(--sans)",marginBottom:i<3?6:0,textAlign:"left",paddingLeft:14}}>{x.l}</button>)}
            </div>
          </div>
        </div>}

        <footer style={{marginTop:48,textAlign:"center",padding:"20px 0",borderTop:"1px solid var(--border)"}}><p style={{fontSize:11,color:"var(--text3)",fontFamily:"var(--mono)"}}>Prompt Architect — Built for the next generation of AI-native workers</p></footer>
      </div>
    </div>
  );
}
