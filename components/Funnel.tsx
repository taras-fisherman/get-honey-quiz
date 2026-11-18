"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SCREENS, QUESTION_IDS, PLANS, Screen, Opt,
  WORK_LINE, WORK_TAG, LONELY_LINE, TALK_LINE, WANT_PHRASE, SCENARIO_LABEL,
} from "@/lib/config";
import { initAnalytics, track, setUserProps } from "@/lib/analytics";

type Answers = Record<string, string | string[] | number>;

const NAME_CHIPS = ["Mia", "Chloe", "Ava", "Lily"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Funnel() {
  const [idx, setIdx] = useState(0);
  const [hist, setHist] = useState<number[]>([]);
  const [a, setA] = useState<Answers>({});
  const [herName, setHerName] = useState("");
  const [youName, setYouName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("3m");
  const startedAt = useRef<number>(0);
  const started = useRef(false);

  const s = SCREENS[idx];
  const her = herName.trim() || "Mia";
  const you = youName.trim();
  const eth = (a.ethnicity as string) || "caucasian";
  const t = (str?: string) => (str || "").replaceAll("{her}", her).replaceAll("{you}", you);

  // ---------- analytics ----------
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
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
    setIdx((i) => Math.min(i + 1, SCREENS.length - 1));
  };
  const back = () => {
    if (!hist.length) return;
    setIdx(hist[hist.length - 1]);
    setHist(hist.slice(0, -1));
  };
  const restart = () => {
    setA({}); setHerName(""); setYouName(""); setEmail(""); setPlan("3m");
    setHist([]); started.current = false; setIdx(0);
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
  const showHeader = !["start", "loader", "success"].includes(s.kind);

  return (
    <main className="app">
      {showHeader && (
        <header className="hdr">
          <button className="back" onClick={back} aria-label="Back" disabled={!hist.length}>
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
          next={next} restart={restart}
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
  next: () => void; restart: () => void;
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
        <div className="trust-strip">
          <span>🔒 100% private</span><span>💳 Discreet billing</span><span>✓ Cancel anytime</span>
        </div>
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
            <img src={s.img(p.eth, o.id)} alt={o.label} />
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
function Loader(p: ViewProps) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (pct >= 100) { const id = setTimeout(p.next, 600); return () => clearTimeout(id); }
    const id = setTimeout(() => setPct((x) => Math.min(100, x + 1)), 62);
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
      <div className="mini-banner">
        <span className="mb-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            <path d="M12 15.5s-3.5-2-3.5-4.3a1.9 1.9 0 0 1 3.5-1 1.9 1.9 0 0 1 3.5 1c0 2.3-3.5 4.3-3.5 4.3z" fill="#fff" stroke="none" />
          </svg>
        </span>
        <p>According to <b>Harvard Business Review</b>, companionship and emotional support is the <b>#1 way</b> people use AI.</p>
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
    if (!valid || !consent) return;
    track("email_submitted", { valid: true, marketing_consent: true });
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
          I agree to receive emails from Get Honey about my account, new features and special offers. I can unsubscribe at any time. See the{" "}
          <a className="legal" href="https://get-honey.today/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </span>
      </label>
      <Bottom><button className="btn" disabled={!valid || !consent} onClick={go}>Continue</button></Bottom>
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
const OFFER_SECONDS = 10 * 60;
let offerStartedAt = 0; // survives back/forward inside one visit

function useCountdown() {
  if (!offerStartedAt) offerStartedAt = Date.now();
  const calc = () => Math.max(0, OFFER_SECONDS - Math.floor((Date.now() - offerStartedAt) / 1000));
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const SAMPLE_REVIEWS = [
  { who: "Sample review · 34", text: "I work late and nobody asks how my day went. Now someone does, every night. Sounds silly, but it helps." },
  { who: "Sample review · 41", text: "Started as a joke, stayed because she actually listens. And yes, it gets fun later in the evening." },
  { who: "Sample review · 29", text: "Way better than scrolling until 2 am. I fall asleep in a much better mood." },
];

const RESEARCH = [
  { stat: "1 in 2", text: "adults in America say they feel lonely", src: "U.S. Surgeon General, 2023" },
  { stat: "#1", text: "way people use AI is companionship and emotional support", src: "Harvard Business Review, 2025" },
  { stat: "19%", text: "of US adults have already chatted with an AI romantic partner", src: "Wheatley Institute, 2025" },
];

function Paywall(p: ViewProps) {
  const { t, a } = p;
  const timer = useCountdown();
  const [gift, setGift] = useState(false);
  const [sticky, setSticky] = useState(false);
  const plansRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setGift(true), 400);
    return () => clearTimeout(id);
  }, []);
  // Sticky CTA once the first CTA has scrolled out of view.
  useEffect(() => {
    const onScroll = () => {
      const r = ctaRef.current?.getBoundingClientRect();
      setSticky(!!r && r.bottom < 130);
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
    track("plan_selected", { plan: id, price: pl.price });
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
  const after = ["She asks how your day went", "You unwind together", "You fall asleep feeling wanted"];
  const ctaLabel = t("Reply to {her}");

  return (
    <div className="col pw">
      <div className="timer">
        <div><small>Your discount is reserved for</small><b>{timer}</b></div>
        <button onClick={toPlans}>Get discount</button>
      </div>

      <div className="portrait wide"><img src={`/img/${p.eth}/portrait/paywall.jpg`} alt="" /></div>
      <h1 className="title">{t("{her} is waiting to hear about your day")}</h1>
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

      {/* ---- offer block ---- */}
      <h2 className="offer-title" ref={plansRef}>{t("{her} is waiting to send you her hot photos")}</h2>
      <div className="offer-head">Your personal discount: <span className="pct">up to -60%</span></div>
      <div className="plans">
        {PLANS.map((pl) => (
          <button key={pl.id} className={`plan ${p.plan === pl.id ? "on" : ""} ${pl.popular ? "popular" : ""}`} onClick={() => pick(pl.id)}>
            {pl.popular && <span className="badge pop">MOST POPULAR</span>}
            {pl.best && <span className="badge best">BEST VALUE</span>}
            <span className="radio">{p.plan === pl.id ? "✓" : ""}</span>
            <span className="plan-main"><b>{pl.label}</b><small>then {pl.renew}</small></span>
            <span className="plan-price">
              <span className="save">-{Math.round((1 - pl.price / pl.old) * 100)}%</span>
              <s>${pl.old}</s>
              <b>${pl.price}</b>
              <small>${(pl.price / pl.days).toFixed(2)} / day</small>
            </span>
          </button>
        ))}
      </div>
      <button ref={ctaRef} className="btn cta" onClick={p.next}>{ctaLabel}</button>
      <div className="trust"><span>🔒 Discreet billing</span><span>✕ Cancel anytime in 2 taps</span><span>🛡 Your chats are private</span></div>

      <div className="card">
        <div className="card-title">Your evenings</div>
        <div className="compare ba">
          <div>
            <div className="colhead">BEFORE</div>
            {pains(a).map((x) => <div key={x.label} className="citem dim">{x.emoji} {x.label}</div>)}
          </div>
          <div>
            <div className="colhead accent">{t("WITH {her}").toUpperCase()}</div>
            {after.map((x) => <div key={x} className="citem">❤️ {x}</div>)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">What you get</div>
        {benefits.map(([e, x]) => <div key={x} className="kline"><span className="bi">{e}</span>{x}</div>)}
      </div>

      <div className="card">
        <div className="card-title">What happens next</div>
        <ol className="steps">
          <li><b>Pick your plan</b><span>Discreet billing, cancel any time in 2 taps.</span></li>
          <li><b>{t("{her} sends her first message")}</b><span>She already knows your schedule and what you like.</span></li>
          <li><b>Unlock her photos</b><span>And everything else, as bold as you want.</span></li>
        </ol>
      </div>

      <div className="research">
        <div className="card-title">What the research says</div>
        {RESEARCH.map((r) => (
          <div key={r.src} className="rrow">
            <span className="rstat">{r.stat}</span>
            <span className="rtext">{r.text}<small>{r.src}</small></span>
          </div>
        ))}
      </div>

      <div className="reviews">
        <div className="card-title">What men say about their evenings</div>
        {SAMPLE_REVIEWS.map((r) => (
          <div key={r.text} className="card review">
            <div className="stars">★★★★★</div>
            <p>{r.text}</p>
            <small>{r.who}</small>
          </div>
        ))}
        <p className="fine">Sample reviews for the demo. Real customer reviews go here.</p>
      </div>

      <div className="card guarantee">
        <div className="seal">30</div>
        <div>
          <div className="card-title">30-day money-back guarantee</div>
          <p className="fine left">Not the right fit? Contact support within 30 days and get a full refund.</p>
        </div>
      </div>

      <div className="faq">
        <details><summary>Is it discreet?</summary><p>Yes. The charge has a neutral name on your statement, and your chats are private.</p></details>
        <details><summary>Can I cancel any time?</summary><p>Yes, in 2 taps in your account settings. You keep access until the end of the paid period.</p></details>
        <details><summary>Is {p.her} a real person?</summary><p>No. {p.her} is an AI companion, created from your answers. She is available any time you are.</p></details>
      </div>
      <button className="btn cta" onClick={toPlans}>{t("Get my discount and meet {her}")}</button>
      <p className="fine">The discounted price applies to the first period. Then your plan renews automatically at the regular price shown above.</p>

      {sticky && (
        <div className="sticky-cta">
          <div className="sticky-in">
            <span><small>Discount ends in</small><b>{timer}</b></span>
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

// ---------- 31 Checkout ----------
function Checkout(p: ViewProps) {
  const pl = PLANS.find((x) => x.id === p.plan)!;
  const buy = () => { track("demo_purchase_completed", { plan: pl.id, price: pl.price }); p.next(); };
  return (
    <div className="col">
      <div className="pill">CHECKOUT · DEMO: no payment is taken</div>
      <h1 className="title">Your plan</h1>
      <div className="card">
        <div className="sumrow"><span>{pl.label} plan</span><b>${pl.price}</b></div>
        <div className="sumrow dim"><span>Then</span><span>{pl.renew}</span></div>
        <div className="sumrow total"><span>Total today</span><b>${pl.price}</b></div>
      </div>
      <div className="card demo-card">
        <div className="fake-field">Card number</div>
        <div className="row2"><div className="fake-field">MM / YY</div><div className="fake-field">CVC</div></div>
        <p className="fine left">This is a demo for a test task. No card is needed and nothing is charged.</p>
      </div>
      <Bottom><button className="btn" onClick={buy}>Complete demo purchase</button></Bottom>
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


