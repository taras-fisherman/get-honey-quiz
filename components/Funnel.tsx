"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SCREENS, QUESTION_IDS, PLANS, Screen, Opt,
  WORK_LINE, WORK_TAG, LONELY_LINE, TALK_LINE, WANT_PHRASE, SCENARIO_LABEL,
} from "@/lib/config";
import { initAnalytics, track, setUserProps } from "@/lib/analytics";
import PaySecure from "@/components/PaySecure";
import { siApple, siVisa, siMastercard, siAmericanexpress } from "simple-icons";

type Answers = Record<string, string | string[] | number>;

export function pathForScreen(i: number) {
  return i <= 0 ? "/" : `/step-${SCREENS[i].id.replace(/_/g, "-")}`;
}
function screenFromPath(path: string) {
  const slug = path.replace(/^\/+|\/+$/g, "").replace(/^step-/, "").replace(/-/g, "_");
  const i = SCREENS.findIndex((x) => x.id === slug);
  return i < 0 ? 0 : i;
}

const NAME_CHIPS = ["Mia", "Chloe", "Ava", "Lily"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Funnel() {
  const [idx, setIdx] = useState(-1); // -1 until the URL is read on the client
  const [hist, setHist] = useState<number[]>([]);
  const [a, setA] = useState<Answers>({});
  const [herName, setHerName] = useState("");
  const [youName, setYouName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("3m");
  const startedAt = useRef<number>(0);
  const started = useRef(false);

  const s = SCREENS[Math.max(0, idx)];
  const her = herName.trim() || "Mia";
  const you = youName.trim();
  const eth = (a.ethnicity as string) || "caucasian";
  const t = (str?: string) => (str || "").replaceAll("{her}", her).replaceAll("{you}", you);

  // ---------- URLs: every screen has its own address (/step-<id>) ----------
  useEffect(() => {
    setIdx(screenFromPath(window.location.pathname));
    const onPop = () => {
      setIdx(screenFromPath(window.location.pathname));
      setHist((h) => h.slice(0, -1));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = (to: number, mode: "push" | "replace" = "push") => {
    const url = pathForScreen(to) + window.location.search;
    if (mode === "push") window.history.pushState({ idx: to }, "", url);
    else window.history.replaceState({ idx: to }, "", url);
    setIdx(to);
  };

  // ---------- analytics ----------
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (idx < 0) return;
    window.scrollTo(0, 0);
    if (s.id === "start" && !started.current) {
      started.current = true;
      startedAt.current = Date.now();
      const p = new URLSearchParams(window.location.search);
      track("funnel_started", {
        utm_source: p.get("utm_source") || undefined,
        utm_campaign: p.get("utm_campaign") || undefined,
        utm_content: p.get("utm_content") || undefined,
        variant: p.get("variant") || "evening_support",
      });
    }
    track("screen_viewed", { screen_id: s.id, screen_index: s.n, block: s.block });
    if (s.kind === "profile") track("profile_viewed");
    if (s.kind === "paywall") track("paywall_viewed");
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload her images once the ethnicity is known.
  useEffect(() => {
    if (!a.ethnicity) return;
    const e = a.ethnicity as string;
    const list: string[] = [];
    for (const sc of SCREENS) if (sc.kind === "photo" && sc.id !== "ethnicity") sc.options.forEach((o) => list.push(sc.img(e, o.id)));
    list.push(`/img/${e}/portrait/profile.jpg`, `/img/${e}/portrait/paywall.jpg`);
    list.forEach((src) => { const im = new Image(); im.src = src; });
  }, [a.ethnicity]);

  // ---------- navigation ----------
  const next = () => {
    if (s.id === "scenario") track("quiz_completed", { duration_sec: Math.round((Date.now() - startedAt.current) / 1000) });
    setHist((h) => [...h, idx]);
    go(Math.min(idx + 1, SCREENS.length - 1));
  };
  const back = () => {
    if (hist.length) window.history.back(); // popstate restores the screen
    else if (idx > 0) go(idx - 1, "replace"); // opened by direct link: step back in order
  };
  const restart = () => {
    setA({}); setHerName(""); setYouName(""); setEmail(""); setPlan("3m");
    setHist([]); started.current = false; go(0);
  };

  const answer = (key: string, value: string | string[] | number, extra: Record<string, unknown> = {}) => {
    setA((prev) => ({ ...prev, [key]: value }));
    setUserProps({ [key]: value as string });
    track("answer_selected", {
      question_id: key,
      ...(typeof value === "number" ? { value } : { answer_id: value }),
      ...extra,
    });
  };

  // ---------- header ----------
  const qPos = QUESTION_IDS.indexOf(s.id);
  const showHeader = !["start", "loader", "success", "checkout"].includes(s.kind);

  if (idx < 0) return <main className="app" />;
  return (
    <main className="app">
      {showHeader && (
        <header className="hdr">
          <button className="back" onClick={back} aria-label="Back" disabled={idx <= 0}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="brand">Get Honey</div>
          <div className="count">{qPos >= 0 ? `${qPos + 1}/${QUESTION_IDS.length}` : ""}</div>
          {qPos >= 0 && (
            <div className="progress"><div style={{ width: `${((qPos + 1) / QUESTION_IDS.length) * 100}%` }} /></div>
          )}
        </header>
      )}
      <div className="screen" key={s.id}>
        <ScreenView
          s={s} a={a} t={t} her={her} you={you} eth={eth}
          herName={herName} setHerName={setHerName}
          youName={youName} setYouName={setYouName}
          email={email} setEmail={setEmail}
          plan={plan} setPlan={setPlan}
          answer={answer} setOpen={(k, v) => setA((prev) => ({ ...prev, [k]: v }))}
          next={next} back={back} restart={restart}
        />
      </div>
    </main>
  );
}

type ViewProps = {
  s: Screen; a: Answers; t: (s?: string) => string; her: string; you: string; eth: string;
  herName: string; setHerName: (v: string) => void;
  youName: string; setYouName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  plan: string; setPlan: (v: string) => void;
  answer: (k: string, v: string | string[] | number, extra?: Record<string, unknown>) => void;
  setOpen: (k: string, v: string) => void;
  next: () => void; back: () => void; restart: () => void;
};

function ScreenView(p: ViewProps) {
  const { s, t } = p;
  switch (s.kind) {
    case "start": return <Start next={p.next} />;
    case "photo": return <PhotoQ {...p} s={s} />;
    case "single": return <SingleQ {...p} s={s} />;
    case "multi": return <MultiQ {...p} s={s} />;
    case "herName": return <HerName {...p} />;
    case "youName": return <YouName {...p} />;
    case "transition":
      return (
        <div className="col">
          <img className="hero-img" src={transitionImg(s.id, p.a, p.eth, s.img)} alt="" />
          <h1 className="title">{t(s.title)}</h1>
          <p className="sub">{t(s.text)}</p>
          <Bottom><button className="btn" onClick={p.next}>Continue</button></Bottom>
        </div>
      );
    case "fact": return <Fact next={p.next} />;
    case "factAi": return <FactAi next={p.next} t={t} />;
    case "open": return <OpenQ {...p} s={s} />;
    case "slider": return <SliderQ {...p} s={s} />;
    case "loader": return <Loader {...p} />;
    case "email": return <Email {...p} />;
    case "profile": return <Profile {...p} />;
    case "paywall": return <Paywall {...p} />;
    case "checkout": return <Checkout {...p} />;
    case "success": return <Success {...p} />;
  }
}

// Transitions show her as he built her: 09 = his hair pick, 21 = his body pick.
function transitionImg(id: string, a: Answers, eth: string, fallback: string) {
  if (id === "almost_ready" && a.hair) return `/img/${eth}/hair/${a.hair}.jpg`;
  if (id === "behind_you" && a.body) return `/img/${eth}/body/${a.body}.jpg`;
  return fallback;
}

function Bottom({ children }: { children: React.ReactNode }) {
  return <div className="bottom">{children}</div>;
}

function QHead({ q, sub, t }: { q?: string; sub?: string; t: (s?: string) => string }) {
  return (
    <>
      <h1 className="q">{t(q)}</h1>
      {sub && <p className="sub">{t(sub)}</p>}
    </>
  );
}

// ---------- 01 Start ----------
function Start({ next }: { next: () => void }) {
  return (
    <div className="col start">
      <div className="start-img">
        <img src="/img/common/start/hero.jpg" alt="" />
      </div>
      <div className="pill">2-MINUTE QUIZ · 18+</div>
      <h1 className="hook">She&apos;s been waiting to hear about your day.</h1>
      <p className="sub">Create your AI girlfriend in 2 minutes. She listens first, then she is all yours.</p>
      <Bottom>
        <button className="btn" onClick={next}>Meet her</button>
        <p className="fine">
          By continuing you confirm you are 18+ and agree to the{" "}
          <a className="legal" href="https://get-honey.today/legal/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Use</a>
          {" "}and{" "}
          <a className="legal" href="https://get-honey.today/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </Bottom>
    </div>
  );
}

// ---------- photo / single / multi ----------
function PhotoQ(p: ViewProps & { s: Extract<Screen, { kind: "photo" }> }) {
  const { s, t } = p;
  const [sel, setSel] = useState<string>((p.a[s.key] as string) || "");
  const pick = (o: Opt) => {
    setSel(o.id);
    p.answer(s.key, o.id);
    setTimeout(p.next, 280);
  };
  return (
    <div className="col">
      <QHead q={s.q} sub={s.sub} t={t} />
      <div className="grid">
        {s.options.map((o) => (
          <button key={o.id} className={`photo ${sel === o.id ? "on" : ""}`} onClick={() => pick(o)}>
            <img src={s.img(p.eth, o.id)} alt={o.label}
              onError={(e) => { if (s.id === "scenario" && !e.currentTarget.src.includes("/common/")) e.currentTarget.src = `/img/common/scenario/${o.id}.jpg`; }} />
            <span className="photo-label">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SingleQ(p: ViewProps & { s: Extract<Screen, { kind: "single" }> }) {
  const { s, t } = p;
  const [sel, setSel] = useState<string>((p.a[s.key] as string) || "");
  const pick = (o: Opt) => {
    setSel(o.id);
    p.answer(s.key, o.id);
    setTimeout(p.next, 280);
  };
  return (
    <div className="col">
      <QHead q={s.q} sub={s.sub} t={t} />
      <div className="list">
        {s.options.map((o) => (
          <button key={o.id} className={`ans ${sel === o.id ? "on" : ""}`} onClick={() => pick(o)}>
            {o.emoji && <span className="emo">{o.emoji}</span>}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiQ(p: ViewProps & { s: Extract<Screen, { kind: "multi" }> }) {
  const { s, t } = p;
  const [sel, setSel] = useState<string[]>((p.a[s.key] as string[]) || []);
  const toggle = (id: string) => {
    setSel((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (s.exclusive?.includes(id)) return [id];
      return [...cur.filter((x) => !s.exclusive?.includes(x)), id];
    });
  };
  return (
    <div className="col">
      <QHead q={s.q} sub={s.sub} t={t} />
      <div className="list">
        {s.options.map((o) => (
          <button key={o.id} className={`ans ${sel.includes(o.id) ? "on" : ""}`} onClick={() => toggle(o.id)}>
            {o.emoji && <span className="emo">{o.emoji}</span>}
            <span className="grow">{o.label}</span>
            <span className={`check ${sel.includes(o.id) ? "on" : ""}`}>{sel.includes(o.id) ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      <Bottom>
        <button className="btn" disabled={!sel.length} onClick={() => { p.answer(s.key, sel); p.next(); }}>Continue</button>
      </Bottom>
    </div>
  );
}

// ---------- names ----------
function HerName(p: ViewProps) {
  const { t } = p;
  const go = () => {
    if (!p.herName.trim()) return;
    const custom = !NAME_CHIPS.includes(p.herName.trim());
    p.answer("her_name_custom", custom ? "true" : "false");
    p.next();
  };
  return (
    <div className="col">
      <QHead q={p.s.q} sub={p.s.sub} t={t} />
      <input className="input" placeholder="Type her name" maxLength={20} value={p.herName}
        onChange={(e) => p.setHerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <p className="chips-label">Can&apos;t think of one? Pick one of these</p>
      <div className="chips">
        {NAME_CHIPS.map((c) => (
          <button key={c} className={`chip ${p.herName === c ? "on" : ""}`} onClick={() => p.setHerName(c)}>{c}</button>
        ))}
      </div>
      <Bottom><button className="btn" disabled={!p.herName.trim()} onClick={go}>Continue</button></Bottom>
    </div>
  );
}

function YouName(p: ViewProps) {
  const { t } = p;
  const go = (skipped: boolean) => {
    if (skipped) p.setYouName("");
    p.answer("his_name_given", skipped || !p.youName.trim() ? "false" : "true");
    p.next();
  };
  return (
    <div className="col">
      <QHead q={p.s.q} sub={p.s.sub} t={t} />
      <input className="input" placeholder="Your name" maxLength={20} value={p.youName}
        onChange={(e) => p.setYouName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go(false)} />
      <Bottom>
        <button className="btn" disabled={!p.youName.trim()} onClick={() => go(false)}>Continue</button>
        <button className="link" onClick={() => go(true)}>Skip</button>
      </Bottom>
    </div>
  );
}

// ---------- 15 Fact ----------
function Fact({ next }: { next: () => void }) {
  return (
    <div className="col">
      <div className="fact-num">1 in 2</div>
      <div className="people" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <svg key={i} className={i % 2 === 0 ? "on" : ""} viewBox="0 0 24 40" width="26" height="44">
            <circle cx="12" cy="7" r="6" />
            <path d="M3 40V22a9 9 0 0 1 18 0v18z" />
          </svg>
        ))}
      </div>
      <h1 className="title">You&apos;re not the only one.</h1>
      <p className="sub">About 1 in 2 adults in America say they feel lonely. Wanting someone to talk to at the end of the day is completely normal.</p>
      <p className="source center-text">Source: U.S. Surgeon General&apos;s Advisory on Loneliness and Isolation, 2023</p>
      <Bottom><button className="btn" onClick={next}>Continue</button></Bottom>
    </div>
  );
}

// ---------- open text ----------
function OpenQ(p: ViewProps & { s: Extract<Screen, { kind: "open" }> }) {
  const { s, t } = p;
  const [text, setText] = useState<string>((p.a[s.key] as string) || "");
  const submit = (skipped: boolean) => {
    const v = skipped ? "" : text.trim();
    p.setOpen(s.key, v);
    track("open_text_submitted", { question_id: s.key, skipped: skipped || !v, length: v.length, text: v.slice(0, 200) });
    p.next();
  };
  const addChip = (c: string) => setText((cur) => (cur.trim() ? `${cur.trim()}, ${c.toLowerCase()}` : c).slice(0, 200));
  return (
    <div className="col">
      <QHead q={s.q} sub={s.sub} t={t} />
      <textarea className="input area" maxLength={200} placeholder="Type anything…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="counter">{text.length}/200</div>
      <div className="chips">
        {s.chips.map((c) => <button key={c} className="chip" onClick={() => addChip(c)}>+ {c}</button>)}
      </div>
      <Bottom>
        <button className="btn" disabled={!text.trim()} onClick={() => submit(false)}>Continue</button>
        <button className="link" onClick={() => submit(true)}>Skip</button>
      </Bottom>
    </div>
  );
}

// ---------- slider ----------
function SliderQ(p: ViewProps & { s: Extract<Screen, { kind: "slider" }> }) {
  const { s, t } = p;
  const [v, setV] = useState<number>((p.a[s.key] as number) || 3);
  return (
    <div className="col">
      <QHead q={s.q} sub={s.sub} t={t} />
      <div className="slider-box">
        <div className="slider-val">{s.labels[v - 1]}</div>
        <input type="range" min={1} max={5} step={1} value={v} onChange={(e) => setV(Number(e.target.value))}
          className="range" style={{ ["--pct" as string]: `${((v - 1) / 4) * 100}%` }} />
        <div className="slider-ends"><span>{s.labels[0]}</span><span>{s.labels[4]}</span></div>
      </div>
      <Bottom><button className="btn" onClick={() => { p.answer(s.key, v); p.next(); }}>Continue</button></Bottom>
    </div>
  );
}

// ---------- 27 Loader ----------
// Excerpts from the reviews Get Honey shows on its own paywall.
const LOADER_QUOTES = [
  { name: "Mike Myers", initials: "MM", color: "#f4a6c0", text: "Audio calls – excellent quality" },
  { name: "Shaun", initials: "SH", color: "#9fe0b4", text: "Feels quite friendly and natural to talk to, not robotic" },
  { name: "Mike Myers", initials: "MM", color: "#f4a6c0", text: "Pictures sent for any prompt I can think of" },
  { name: "Shaun", initials: "SH", color: "#9fe0b4", text: "I've ended up using it way more than I thought I would" },
  { name: "Mike Myers", initials: "MM", color: "#f4a6c0", text: "Very responsive, and videos are very interactive" },
];

function FactAi({ next, t }: { next: () => void; t: (s?: string) => string }) {
  const rows = [
    { label: "Companionship & emotional support", w: 100, on: true },
    { label: "Organizing my life", w: 82, on: false },
    { label: "Finding purpose", w: 70, on: false },
  ];
  return (
    <div className="col">
      <div className="ai-illu" aria-hidden="true">
        <span className="ai-bubble b1">How was your day?</span>
        <span className="ai-heart">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="#fff"><path d="M12 21s-7.5-4.4-9.6-9.2C.9 8.3 3.1 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 2.9 1.5-1.8 3-2.9 5.1-2.9 3.8 0 6 3.8 4.5 7.3C19.5 16.6 12 21 12 21z" /></svg>
        </span>
        <span className="ai-bubble b2">Tell me everything ❤️</span>
      </div>
      <h1 className="title">{t("You're in good company")}</h1>
      <p className="sub">According to <b className="hl">Harvard Business Review</b>, companionship and emotional support is the <b className="hl">#1 way</b> people use AI.</p>
      <div className="card ai-rank">
        <div className="colhead">TOP USES OF AI IN 2025</div>
        {rows.map((r, k) => (
          <div key={r.label} className={`rank-row ${r.on ? "on" : ""}`}>
            <span className="rank-n">#{k + 1}</span>
            <span className="rank-body"><span>{r.label}</span><span className="rank-bar"><i style={{ width: `${r.w}%`, animationDelay: `${k * 0.15}s` }} /></span></span>
          </div>
        ))}
        <span className="source">Source: Harvard Business Review, “How People Are Really Using Gen AI in 2025”</span>
      </div>
      <Bottom><button className="btn" onClick={next}>Continue</button></Bottom>
    </div>
  );
}

function Loader(p: ViewProps) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (pct >= 100) { const id = setTimeout(p.next, 600); return () => clearTimeout(id); }
    const id = setTimeout(() => setPct((x) => Math.min(100, x + 1)), 80);
    return () => clearTimeout(id);
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = (label: string, from: number, to: number) => {
    const done = pct >= to;
    const local = Math.max(0, Math.min(100, Math.round(((pct - from) / (to - from)) * 100)));
    return (
      <div className="lstep">
        <span>{label}</span>
        <span className={done ? "ok" : ""}>{done ? "✓" : `${local}%`}</span>
      </div>
    );
  };
  return (
    <div className="col center">
      <div className="ring" style={{ ["--pct" as string]: `${pct * 3.6}deg` }}><span>{pct}%</span></div>
      <h1 className="title">{p.t("Matching {her} to your life…")}</h1>
      <div className="lsteps">
        {step("Her look", 0, 33)}
        {step("Her personality", 33, 66)}
        {step("Your schedule", 66, 100)}
      </div>
      <div className="marquee" aria-label="What users say">
        <div className="marquee-track">
          {[...LOADER_QUOTES, ...LOADER_QUOTES].map((q, k) => (
            <div key={k} className="mq-card">
              <div className="mq-head"><span className="rev-ava sm" style={{ background: q.color }}>{q.initials}</span><b>{q.name}</b><span className="stars">★★★★★</span></div>
              <p>“{q.text}”</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- 29 Email ----------
const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "icloud.com", "outlook.com", "hotmail.com", "aol.com"];

function Email(p: ViewProps) {
  const [focus, setFocus] = useState(false);
  const [consent, setConsent] = useState(false);
  const value = p.email.trim();
  const valid = EMAIL_RE.test(value);
  const [local, typedDomain = ""] = value.split("@");
  const suggestions = local && !local.includes(" ")
    ? EMAIL_DOMAINS.filter((d) => d.startsWith(typedDomain.toLowerCase()))
        .map((d) => `${local}@${d}`)
        .filter((x) => x !== value)
        .slice(0, 5)
    : [];
  const go = () => {
    if (!valid) return;
    track("email_submitted", { valid: true, marketing_consent: consent });
    p.next();
  };
  return (
    <div className="col">
      <img className="avatar" src={`/img/${p.eth}/portrait/profile.jpg`} alt="" />
      <QHead q={p.s.q} sub={p.s.sub} t={p.t} />
      <div className="email-wrap">
        <input className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          placeholder="you@email.com" value={p.email}
          onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
          onChange={(e) => p.setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        {focus && suggestions.length > 0 && (
          <div className="suggest">
            {suggestions.map((x) => (
              <button key={x} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => p.setEmail(x)}>{x}</button>
            ))}
          </div>
        )}
      </div>
      <p className="fine left">🔒 Your email stays private. No spam and nothing explicit in your inbox.</p>
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span className={`box ${consent ? "on" : ""}`}>{consent ? "✓" : ""}</span>
        <span>
          I want to receive emails from Get Honey about new features and special offers. I can unsubscribe at any time. See the{" "}
          <a className="legal" href="https://get-honey.today/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </span>
      </label>
      <Bottom><button className="btn" disabled={!valid} onClick={go}>Continue</button></Bottom>
    </div>
  );
}

// ---------- personalization helpers ----------
function pains(a: Answers) {
  const opts = (SCREENS.find((x) => x.id === "pains") as Extract<Screen, { kind: "multi" }>).options;
  const sel = ((a.pains as string[]) || []).filter((x) => x !== "fine");
  if (!sel.length) return [{ emoji: "🙂", label: "Evenings are fine" }, { emoji: "🥱", label: "Could be more fun" }];
  return sel.slice(0, 3).map((id) => { const o = opts.find((x) => x.id === id)!; return { emoji: o.emoji, label: o.label }; });
}

function knows(a: Answers) {
  const lines: string[] = [];
  const w = WORK_LINE[a.work_type as string]; if (w) lines.push(w);
  const l = LONELY_LINE[a.lonely_freq as string]; if (l) lines.push(l);
  const tt = TALK_LINE[a.talk_time as string]; if (tt) lines.push(tt);
  return lines;
}

function quote(a: Answers) {
  const q = ((a.evening_text as string) || "").trim();
  if (!q) return "";
  return q.length > 80 ? q.slice(0, 79) + "…" : q;
}

// ---------- 28 Profile ----------
function Profile(p: ViewProps) {
  const { t, a } = p;
  const q = quote(a);
  return (
    <div className="col">
      <div className="portrait"><img src={`/img/${p.eth}/portrait/profile.jpg`} alt="" /><div className="portrait-name">{p.her}<span>● online</span></div></div>
      <h1 className="title">{t("{her} is made for your evenings")}</h1>
      <div className="card compare">
        <div>
          <div className="colhead">NOW</div>
          {pains(a).map((x) => <div key={x.label} className="citem dim">{x.emoji} {x.label}</div>)}
        </div>
        <div>
          <div className="colhead accent">{t("WITH {her}").toUpperCase()}</div>
          {["She asks how it went", "She listens first", "Then she is all yours"].map((x) => <div key={x} className="citem">💬 {x}</div>)}
        </div>
      </div>
      <div className="card">
        <div className="card-title">{t("What {her} knows about you")}</div>
        {knows(a).map((l) => <div key={l} className="kline">✓ {l}</div>)}
        {q && <div className="kline quote">You said: “{q}”</div>}
      </div>
      <Bottom><button className="btn" onClick={p.next}>{t("Start chatting with {her}")}</button></Bottom>
    </div>
  );
}

// ---------- 30 Paywall ----------
let offerStartedAt = 0; // survives back/forward inside one visit
let giftShown = false;
function offerSeconds() {
  if (typeof window === "undefined") return 600;
  const v = Number(new URLSearchParams(window.location.search).get("offer_seconds"));
  return v > 0 ? v : 600;
}
function offerLeft() {
  if (!offerStartedAt) offerStartedAt = Date.now();
  return Math.max(0, offerSeconds() - Math.floor((Date.now() - offerStartedAt) / 1000));
}
export function offerExpired() {
  return offerStartedAt > 0 && offerLeft() === 0;
}
function useCountdown() {
  const [left, setLeft] = useState(offerLeft);
  useEffect(() => {
    const id = setInterval(() => setLeft(offerLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return { label: `${mm}:${ss}`, expired: left === 0 };
}

// Reviews as shown on Get Honey's own paywall (get-honey.today, 16 Nov 2026).
const REVIEWS = [
  {
    name: "Mike Myers", initials: "MM", color: "#f4a6c0", meta: "US · 2 reviews", title: "good",
    text: "I liked the experience\nAudio calls – excellent quality\nPictures sent for any prompt I can think of\nVideos are also very interactive\nI don't know what LLM model they use, but it has good quality and is very responsive",
  },
  {
    name: "Shaun", initials: "SH", color: "#9fe0b4", meta: "GB · 1 review", title: "The AI actually feels quite friendly...",
    text: "The AI actually feels quite friendly and natural to talk to, not robotic like some others I've tried. All in all, it's been a fun little app that I've ended up using way more than I thought I would.",
  },
];

const RESEARCH = [
  { stat: "1 in 2", text: "adults in America say they feel lonely", src: "U.S. Surgeon General, 2023" },
  { stat: "#1", text: "way people use AI is companionship and emotional support", src: "Harvard Business Review, 2025" },
  { stat: "19%", text: "of US adults have already chatted with an AI romantic partner", src: "Wheatley Institute, 2025" },
];

function Paywall(p: ViewProps) {
  const { t, a } = p;
  const { label: timer, expired } = useCountdown();
  useEffect(() => { if (expired) track("discount_expired"); }, [expired]);
  const [gift, setGift] = useState(false);
  const [sticky, setSticky] = useState(false);
  const plansRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const cta2Ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (giftShown) return;
    giftShown = true;
    const id = setTimeout(() => setGift(!offerExpired()), 400);
    return () => clearTimeout(id);
  }, []);
  // Sticky CTA once the first CTA has scrolled out of view.
  useEffect(() => {
    const onScroll = () => {
      const r = ctaRef.current?.getBoundingClientRect();
      const r2 = cta2Ref.current?.getBoundingClientRect();
      const secondInView = !!r2 && r2.top < window.innerHeight && r2.bottom > 0;
      setSticky(!!r && r.bottom < 130 && !secondInView);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const claim = () => { setGift(false); track("discount_popup_claimed"); };
  const toPlans = () => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const wants = ((a.wants as string[]) || []).map((w) => WANT_PHRASE[w]).filter(Boolean).slice(0, 2);
  const motive = wants.length === 2
    ? `You said you want ${wants[0]} and ${wants[1]}. ${p.her} is both.`
    : wants.length === 1 ? `You said you want ${wants[0]}. ${p.her} is exactly that.` : "";
  const scenario = SCENARIO_LABEL[a.scenario as string];
  const tags = [
    WORK_TAG[a.work_type as string],
    ["almost_every", "few_week"].includes(a.lonely_freq as string) ? "Lonely evenings" : "",
    scenario,
  ].filter(Boolean);
  const opener = a.work_type === "shifts" ? "Long shift?" : a.work_type === "remote" ? "Stuck at home all day?" : "Long day?";
  const msg = `Hey ${p.you || "you"}. ${opener} Come here, tell me everything…`;
  const teasers = [
    a.bust ? `/img/${p.eth}/bust/${a.bust}.jpg` : `/img/${p.eth}/portrait/profile.jpg`,
    a.body ? `/img/${p.eth}/body/${a.body}.jpg` : `/img/${p.eth}/portrait/paywall.jpg`,
    a.hair ? `/img/${p.eth}/hair/${a.hair}.jpg` : `/img/${p.eth}/portrait/profile.jpg`,
  ];
  const pick = (id: string) => {
    p.setPlan(id);
    const pl = PLANS.find((x) => x.id === id)!;
    track("plan_selected", { plan: id, price: expired ? pl.old : pl.price, discount: !expired });
  };
  const benefits = [
    ["💬", t("Flirty chats with {her}, any time of day")],
    ["🧠", "She remembers your chats and what you like"],
    ["📸", "Spicy photos and videos, just for you"],
    ["🎧", "Voice messages in her voice"],
    ["🎭", scenario ? `Role-play, starting with “${scenario}”` : "Role-play scenarios"],
    ["🥰", "Sweet when you need it, flirty when you want it"],
    ["✨", "Her look and personality, exactly as you chose"],
  ];
  const ctaLabel = t("Reply to {her}");
  const selected = PLANS.find((x) => x.id === p.plan) || PLANS[1];
  const plansBlock = (ref: React.RefObject<HTMLButtonElement | null>) => (
    <>
      <div className="plans">
        {PLANS.filter((x) => !x.upsell).map((pl) => (
          <button key={pl.id} className={`plan ${p.plan === pl.id ? "on" : ""} ${pl.popular ? "popular" : ""}`} onClick={() => pick(pl.id)}>
            {pl.popular && <span className="badge pop">MOST POPULAR</span>}
            {pl.best && <span className="badge best">BEST VALUE</span>}
            <span className="radio">{p.plan === pl.id ? "✓" : ""}</span>
            <span className="plan-main"><b>{pl.label}</b>{!expired && <small>then {pl.renew}</small>}</span>
            {expired ? (
              <span className="plan-price">
                <b>${pl.old}</b>
                <small>${(pl.old / pl.days).toFixed(2)} / day</small>
              </span>
            ) : (
              <span className="plan-price">
                <span className="save">-{Math.round((1 - pl.price / pl.old) * 100)}%</span>
                <s>${pl.old}</s>
                <b>${pl.price}</b>
                <small>${(pl.price / pl.days).toFixed(2)} / day</small>
              </span>
            )}
          </button>
        ))}
      </div>
      <button ref={ref} className="btn cta" onClick={p.next}>{ctaLabel}</button>
      <PaySecure />
      <p className="disclaimer">
        By selecting a payment method and proceeding, you agree that if you don&apos;t cancel prior to the end of the current period,
        you will automatically be charged the full price of ${selected.old} {selected.every} until you cancel in settings. Learn more in{" "}
        <a className="legal" href="https://get-honey.today/legal/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
      </p>
    </>
  );

  return (
    <div className="col pw">
      <div className="timer">
        <div>{expired ? <><small>Your personal discount</small><b>Expired</b></> : <><small>Your discount is reserved for</small><b>{timer}</b></>}</div>
        {!expired && <button onClick={toPlans}>Get discount</button>}
      </div>

      <div className="portrait wide"><img src={`/img/${p.eth}/portrait/paywall.jpg`} alt="" /></div>
      <h1 className="title">{(p.you ? `${p.you}, ` : "") + t("{her} is waiting to hear about your day")}</h1>
      {motive && <p className="sub">{motive}</p>}
      {!!tags.length && <div className="tags">{tags.map((x) => <span key={x} className="tag">{x}</span>)}</div>}

      <div className="card chat">
        <div className="chat-head"><img src={`/img/${p.eth}/portrait/profile.jpg`} alt="" /><b>{p.her}</b><span>● online</span></div>
        <div className="bubble">{msg}</div>
        <div className="teasers">
          {teasers.map((src, i) => (
            <div key={i} className="teaser"><img src={src} alt="" /><span>🔒</span></div>
          ))}
        </div>
        <div className="locked">{t("🔒 {her} sent you 3 photos · Reply to unlock")}</div>
      </div>

      <div className="card">
        <div className="card-title">What you get</div>
        {benefits.map(([e, x]) => <div key={x} className="kline"><span className="bi">{e}</span>{x}</div>)}
      </div>

      <h2 className="offer-title" ref={plansRef}>{(p.you ? `${p.you}, ` : "") + t("{her} is waiting to send you her hot photos")}</h2>
      {expired
        ? <div className="offer-head">Your personal discount has expired</div>
        : <div className="offer-head">Your personal discount: <span className="pct">up to -60%</span></div>}
      {plansBlock(ctaRef)}

      <div className="reviews">
        <h2 className="section-title">What our users say about our AI models</h2>
        {REVIEWS.map((r) => (
          <div key={r.name} className="card review">
            <div className="rev-head">
              <span className="rev-ava" style={{ background: r.color }}>{r.initials}</span>
              <span className="rev-who"><b>{r.name}</b><small>{r.meta}</small></span>
              <span className="stars">★★★★★</span>
            </div>
            <p className="rev-title">{r.title}</p>
            <p>{r.text}</p>
          </div>
        ))}
      </div>

      <h2 className="section-title">{t("{her}'s behaviour is built on research into what men need")}</h2>
      <div className="research">
        <div className="card-title">What the research says</div>
        {RESEARCH.map((r) => (
          <div key={r.src} className="rrow">
            <span className="rstat">{r.stat}</span>
            <span className="rtext">{r.text}<small>{r.src}</small></span>
          </div>
        ))}
      </div>

      <h2 className="section-title">Frequently asked questions</h2>
      <div className="faq">
        <details><summary>Does she remember our conversations?</summary><p>Yes. {p.her} remembers what you tell her and what you like, so every chat picks up where you left off.</p></details>
        <details><summary>What happens after I pay?</summary><p>You get instant access to {p.her} in your browser: chat, photos and voice messages. No app to install.</p></details>
        <details><summary>Is it discreet?</summary><p>Yes. The charge has a neutral name on your statement, and your chats are private.</p></details>
        <details><summary>Can I cancel any time?</summary><p>Yes, in 2 taps in your account settings. You keep access until the end of the paid period.</p></details>
        <details><summary>Is {p.her} a real person?</summary><p>No. {p.her} is an AI companion, created from your answers. She is available any time you are.</p></details>
      </div>

      <h2 className="offer-title small">{t(expired ? "Meet {her} tonight" : "Get your discount and meet {her} tonight")}</h2>
      {plansBlock(cta2Ref)}

      <div className="card guarantee">
        <div className="seal" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <div>
          <div className="card-title">Money-back guarantee</div>
          <p className="fine left">We&apos;re so confident you&apos;ll love your experience that we offer a full money-back guarantee. If you&apos;re not completely satisfied within the first 3 days, simply contact our support team and we&apos;ll refund your purchase — no questions asked.</p>
        </div>
      </div>
      <p className="fine">The discounted price applies to the first period. Then your plan renews automatically at the regular price shown above.</p>

      {sticky && (
        <div className="sticky-cta">
          <div className="sticky-in">
            <span>{expired ? <><small>Discount</small><b>Expired</b></> : <><small>Discount ends in</small><b>{timer}</b></>}</span>
            <button className="btn cta" onClick={p.next}>{ctaLabel}</button>
          </div>
        </div>
      )}

      {gift && (
        <div className="modal-bg">
          <div className="modal gift">
            <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }).map((_, i) => <i key={i} />)}</div>
            <div className="gift-emoji">🎁</div>
            <p className="woo">Woo-hoo!</p>
            <p className="sub">{t("We'd like to give you a personal first-time introductory discount, so you can meet {her} tonight")}</p>
            <div className="big-off">up to <b>60%</b> OFF</div>
            <button className="btn" onClick={claim}>Claim my discount</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 32 Checkout ----------
let upsellShown = false;
function useWallet(): "apple" | "google" | "both" {
  const [w, setW] = useState<"apple" | "google" | "both">("both");
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua))) setW("apple");
    else if (/Android/.test(ua)) setW("google");
  }, []);
  return w;
}

function AppleMark({ size = 22 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="#fff" aria-hidden="true"><path d={siApple.path} /></svg>;
}
function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
function ApplePayButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="wallet-btn" onClick={onClick} aria-label="Pay with Apple Pay">
      <AppleMark size={26} /><span>Pay</span>
    </button>
  );
}
function GooglePayButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="wallet-btn" onClick={onClick} aria-label="Pay with Google Pay">
      <GoogleG size={24} /><span>Pay</span>
    </button>
  );
}

const fmt = (n: number) => `$${n.toFixed(2)}`;

function Checkout(p: ViewProps) {
  const wallet = useWallet();
  const { label: timer, expired } = useCountdown();
  const [method, setMethod] = useState<"fast" | "card">("fast");
  const [upsell, setUpsell] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", name: "" });

  // Upsell 3 -> 6 months, once per visit, only for the preselected 3-month plan.
  useEffect(() => {
    if (p.plan === "3m" && !upsellShown) {
      upsellShown = true;
      const id = setTimeout(() => { setUpsell(true); track("upsell_shown", { from: "3m", to: "6m" }); }, 500);
      return () => clearTimeout(id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pl = PLANS.find((x) => x.id === p.plan) || PLANS[1];
  const discount = expired ? 0 : pl.old - pl.price;
  const total = expired ? pl.old : pl.price;
  const pct = Math.round((discount / pl.old) * 100);
  const six = PLANS.find((x) => x.id === "6m")!;
  const three = PLANS.find((x) => x.id === "3m")!;

  const pay = (via: string) => {
    track("demo_purchase_completed", { plan: pl.id, price: total, discount: !expired, method: via });
    p.next();
  };
  const choose = (m: "fast" | "card") => { setMethod(m); track("payment_method_selected", { method: m }); };

  const cardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const cardExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d; };
  const cardOk = card.number.replace(/\s/g, "").length >= 15 && card.exp.replace(/\D/g, "").length === 4 && card.cvc.length >= 3;

  return (
    <div className="col co">
      <div className="co-top">
        <button className="co-close" aria-label="Close" onClick={() => { setExitAsk(true); track("exit_intent_shown"); }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#9a9ca5" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {!expired && <span className="co-timer">⏱ Your discount reserved for {timer}</span>}
      </div>
      <h1 className="title co-title">{p.t("{her} is one tap away")}</h1>

      <div className="co-box">
        <div className="co-label">Select your payment method</div>
        <div className="co-methods">
          <button className={`co-method ${method === "fast" ? "on" : ""}`} onClick={() => choose("fast")}>
            <b>Fast checkout</b>
            <span className="co-mini">
              <span className="wmini"><AppleMark size={14} />Pay</span>
              <span className="wmini"><GoogleG size={13} />Pay</span>
            </span>
          </button>
          <button className={`co-method ${method === "card" ? "on" : ""}`} onClick={() => choose("card")}>
            <b>Card payment</b>
            <span className="co-mini cards">
              {[siVisa, siMastercard, siAmericanexpress].map((l) => (
                <span key={l.slug} className="paylogo xs"><svg viewBox="0 0 24 24"><path d={l.path} fill={`#${l.hex}`} /></svg></span>
              ))}
            </span>
          </button>
        </div>

        <div className="co-sum">
          <div className="sumrow"><span>{pl.months}-month plan</span><span>{fmt(pl.old)}</span></div>
          {!expired && <div className="sumrow off"><span>{pct}% introductory discount</span><span>−{fmt(discount)}</span></div>}
          <div className="sumrow total"><span>Total today</span><b>{fmt(total)}</b></div>
          {!expired && <div className="saved">🔥 You just saved {fmt(discount)} ({pct}% off)</div>}
        </div>

        {method === "fast" ? (
          <div className="co-pay">
            {wallet !== "google" && <ApplePayButton onClick={() => pay("apple_pay")} />}
            {wallet !== "apple" && <GooglePayButton onClick={() => pay("google_pay")} />}
          </div>
        ) : (
          <div className="co-card">
            <input className="input" inputMode="numeric" autoComplete="off" placeholder="Card number" value={card.number}
              onChange={(e) => setCard({ ...card, number: cardNumber(e.target.value) })} />
            <div className="row2">
              <input className="input" inputMode="numeric" autoComplete="off" placeholder="MM / YY" value={card.exp}
                onChange={(e) => setCard({ ...card, exp: cardExp(e.target.value) })} />
              <input className="input" inputMode="numeric" autoComplete="off" placeholder="CVC" value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </div>
            <input className="input" autoComplete="off" placeholder="Name on card" value={card.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })} />
            <button className="btn cta" disabled={!cardOk} onClick={() => pay("card")}>Pay {fmt(total)}</button>
          </div>
        )}
        <p className="fine">Demo checkout for the test task: nothing is charged, card details are not stored or sent.</p>
        <PaySecure />
        <p className="disclaimer">
          By selecting a payment method and proceeding, you agree that if you don&apos;t cancel prior to the end of the current period,
          you will automatically be charged the full price of {fmt(pl.old)} {pl.every} until you cancel in settings. Learn more in{" "}
          <a className="legal" href="https://get-honey.today/legal/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
        </p>
      </div>

      {upsell && (
        <div className="modal-bg">
          <div className="modal upsell">
            <button className="modal-x" aria-label="Close" onClick={() => { setUpsell(false); track("upsell_declined"); }}>✕</button>
            <span className="badge-inline">SPECIAL OFFER</span>
            <p className="title small">Upgrade to 6 months and save more</p>
            <p className="sub">Most men who start with 3 months keep going anyway. The 6-month plan is the best price per day, so you get twice the time for much less than two 3-month plans.</p>
            <div className="up-compare">
              <div><small>3 months</small><b>{fmt(three.price / three.days)}</b><small>per day</small></div>
              <div className="on"><small>6 months</small><b>{fmt(six.price / six.days)}</b><small>per day</small></div>
            </div>
            <p className="up-price">{expired ? fmt(six.old) : <><s>{fmt(six.old)}</s> <b>{fmt(six.price)}</b></>} for 6 months</p>
            <button className="btn cta" onClick={() => { p.setPlan("6m"); setUpsell(false); track("upsell_accepted", { plan: "6m", price: expired ? six.old : six.price }); }}>Yes, give me 6 months</button>
            <button className="link" onClick={() => { setUpsell(false); track("upsell_declined"); }}>No thanks, keep 3 months</button>
          </div>
        </div>
      )}

      {exitAsk && (
        <div className="modal-bg">
          <div className="modal exit">
            <div className="gift-emoji">😢</div>
            <p className="title small">Are you sure you want to skip your one-time introductory discount?</p>
            <p className="sub">{p.t("{her} is ready and waiting for you. This discount won't be offered again.")}</p>
            {!expired && <div className="big-off">save <b>{pct}%</b> today</div>}
            <button className="btn cta" onClick={() => { setExitAsk(false); track("exit_discount_kept"); }}>Keep my discount</button>
            <button className="link" onClick={() => { setExitAsk(false); track("exit_discount_skipped"); p.back(); }}>Skip discount</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 32 Success ----------
function Success(p: ViewProps) {
  return (
    <div className="col center success">
      <div className="portrait round"><img src={`/img/${p.eth}/portrait/profile.jpg`} alt="" /></div>
      <h1 className="title">You&apos;re in.</h1>
      <p className="sub">{p.t("In the real product, {her} would be waiting for you tonight.")}</p>
      <Bottom><button className="btn ghost" onClick={p.restart}>Start over</button></Bottom>
    </div>
  );
}


