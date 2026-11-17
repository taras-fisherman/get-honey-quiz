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
  const [plan, setPlan] = useState("12m");
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
    setA({}); setHerName(""); setYouName(""); setEmail(""); setPlan("12m");
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
      <div className="start-img"><img src="/img/common/start/hero.jpg" alt="" /></div>
      <div className="pill">2-MINUTE QUIZ · 18+</div>
      <h1 className="hook">She&apos;s been waiting to hear about your day.</h1>
      <p className="sub">Create your AI girlfriend in 2 minutes. She listens first, then she is all yours.</p>
      <Bottom>
        <button className="btn" onClick={next}>Meet her</button>
        <p className="fine">By continuing you confirm you are 18+ and agree to the Terms of Use and Privacy Policy.</p>
        <p className="fine">Concept funnel for Get Honey · demo, no real payments.</p>
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
    const custom = p.herName.trim() !== "" && !NAME_CHIPS.includes(p.herName.trim());
    p.answer("her_name_custom", custom ? "true" : "false");
    p.next();
  };
  return (
    <div className="col">
      <QHead q={p.s.q} sub={p.s.sub} t={t} />
      <input className="input" placeholder="Type her name" maxLength={20} value={p.herName}
        onChange={(e) => p.setHerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <div className="chips">
        {NAME_CHIPS.map((c) => (
          <button key={c} className={`chip ${p.herName === c ? "on" : ""}`} onClick={() => p.setHerName(c)}>{c}</button>
        ))}
      </div>
      <Bottom><button className="btn" onClick={go}>Continue</button></Bottom>
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
      <div className="fact-num">15%</div>
      <h1 className="title">You&apos;re not the only one.</h1>
      <p className="sub">15% of men in the US say they have no close friends at all. In 1990 it was 3%.</p>
      <div className="bars">
        <div className="bar-row"><span>1990</span><div className="bar"><div style={{ width: "20%" }} /></div><b>3%</b></div>
        <div className="bar-row"><span>2021</span><div className="bar"><div style={{ width: "100%" }} /></div><b>15%</b></div>
      </div>
      <p className="source">Source: Survey Center on American Life, 2021</p>
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
  const [asked, setAsked] = useState(false);
  const [popup, setPopup] = useState(false);
  useEffect(() => {
    if (popup) return;
    if (pct >= 100) { const id = setTimeout(p.next, 600); return () => clearTimeout(id); }
    if (pct >= 55 && !asked) { setPopup(true); return; }
    const id = setTimeout(() => setPct((x) => Math.min(100, x + 1)), 40);
    return () => clearTimeout(id);
  }, [pct, popup, asked]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (v: "yes" | "no") => { p.answer("wants_photos", v); setAsked(true); setPopup(false); };
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
      <div className="card fact-card">
        <b>Companionship is the #1 way people use AI in 2025.</b>
        <span className="source">Source: Harvard Business Review, 2025</span>
      </div>
      {popup && (
        <div className="modal-bg">
          <div className="modal">
            <p className="title small">{p.t("Would you like {her} to send you photos?")}</p>
            <div className="row2">
              <button className="btn ghost" onClick={() => choose("no")}>No</button>
              <button className="btn" onClick={() => choose("yes")}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- 28 Email ----------
function Email(p: ViewProps) {
  const valid = EMAIL_RE.test(p.email.trim());
  const go = () => { if (!valid) return; track("email_submitted", { valid: true }); p.next(); };
  return (
    <div className="col">
      <img className="avatar" src={`/img/${p.eth}/portrait/profile.jpg`} alt="" />
      <QHead q={p.s.q} sub={p.s.sub} t={p.t} />
      <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
        value={p.email} onChange={(e) => p.setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      <p className="fine left">🔒 Your email stays private. No spam and nothing explicit in your inbox.</p>
      <p className="fine left">Demo: the email is not stored or sent anywhere.</p>
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

// ---------- 29 Profile ----------
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
      <Bottom><button className="btn" onClick={p.next}>See my plan</button></Bottom>
    </div>
  );
}

// ---------- 30 Paywall ----------
function Paywall(p: ViewProps) {
  const { t, a } = p;
  const wants = ((a.wants as string[]) || []).map((w) => WANT_PHRASE[w]).filter(Boolean).slice(0, 2);
  const motive = wants.length === 2
    ? `You said you want ${wants[0]} and ${wants[1]}. ${p.her} is both.`
    : wants.length === 1 ? `You said you want ${wants[0]}. ${p.her} is exactly that.` : "";
  const tags = [
    WORK_TAG[a.work_type as string],
    ["almost_every", "few_week"].includes(a.lonely_freq as string) ? "Lonely evenings" : "",
    SCENARIO_LABEL[a.scenario as string],
  ].filter(Boolean);
  const opener = a.work_type === "shifts" ? "Long shift?" : a.work_type === "remote" ? "Stuck at home all day?" : "Long day?";
  const msg = `Hey ${p.you || "you"}. ${opener} Come here, tell me everything…`;
  const pick = (id: string) => {
    p.setPlan(id);
    const pl = PLANS.find((x) => x.id === id)!;
    track("plan_selected", { plan: id, price: pl.price });
  };
  const cta = <button className="btn" onClick={p.next}>{t("Reply to {her}")}</button>;
  return (
    <div className="col pw">
      <div className="portrait wide"><img src={`/img/${p.eth}/portrait/paywall.jpg`} alt="" /></div>
      <h1 className="title">{t("{her} is waiting to hear about your day")}</h1>
      {motive && <p className="sub">{motive}</p>}
      {!!tags.length && <div className="tags">{tags.map((x) => <span key={x} className="tag">{x}</span>)}</div>}

      <div className="card chat">
        <div className="chat-head"><img src={`/img/${p.eth}/portrait/profile.jpg`} alt="" /><b>{p.her}</b><span>● online</span></div>
        <div className="bubble">{msg}</div>
        <div className="locked">🔒 Reply to unlock</div>
      </div>

      <div className="card">
        <div className="card-title">What you get</div>
        {[t("Chat with {her} any time"), "Sweet when you need it, flirty when you want it", "Spicy photos, voice and role-play, just for you", "Her look and personality, exactly as you chose"].map((x) => (
          <div key={x} className="kline">✓ {x}</div>
        ))}
      </div>

      <div className="plans">
        {PLANS.map((pl) => (
          <button key={pl.id} className={`plan ${p.plan === pl.id ? "on" : ""}`} onClick={() => pick(pl.id)}>
            {pl.best && <span className="best">BEST VALUE</span>}
            <span className="radio">{p.plan === pl.id ? "●" : ""}</span>
            <span className="plan-main"><b>{pl.label}</b><small>then {pl.renew}</small></span>
            <span className="plan-price"><b>${pl.price}</b><small>${(pl.price / pl.days).toFixed(2)} / day</small></span>
          </button>
        ))}
      </div>
      {cta}
      <div className="trust"><span>🔒 Discreet billing</span><span>✕ Cancel anytime in 2 taps</span><span>🛡 Your chats are private</span></div>

      <div className="card fact-card">
        <b>Almost 1 in 5 US adults (19%) have chatted with an AI romantic partner.</b>
        <span className="source">Source: Wheatley Institute, Counterfeit Connections, 2025</span>
      </div>

      <div className="card placeholder">
        <div className="card-title">Reviews</div>
        <p className="fine left">Placeholder: real Get Honey reviews about evenings and support go here. We do not show invented reviews.</p>
      </div>

      <div className="card mb">
        <div className="card-title">3-day money-back guarantee</div>
        <p className="fine left">Not the right fit? Contact support within 3 days for a full refund.</p>
      </div>

      <div className="faq">
        <details><summary>Is it discreet?</summary><p>Yes. The charge has a neutral name on your statement, and your chats are private.</p></details>
        <details><summary>Can I cancel any time?</summary><p>Yes, in 2 taps in your account settings. You keep access until the end of the paid period.</p></details>
        <details><summary>Is {p.her} a real person?</summary><p>No. {p.her} is an AI companion, created from your answers. She is available any time you are.</p></details>
      </div>
      {cta}
      <p className="fine">Your plan renews automatically at the price shown after the first period. Demo: no payment is taken.</p>
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


