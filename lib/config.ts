// All funnel copy and options live here. {her} = her name, {you} = his name.

export type Opt = { id: string; label: string; emoji?: string };

type Base = { n: number; id: string; block: "her" | "him" | "desire" | "result" | "pay"; q?: string; sub?: string };

export type Screen =
  | (Base & { kind: "start" })
  | (Base & { kind: "photo"; key: string; options: Opt[]; img: (eth: string, opt: string) => string })
  | (Base & { kind: "single"; key: string; options: Opt[] })
  | (Base & { kind: "multi"; key: string; options: Opt[]; exclusive?: string[] })
  | (Base & { kind: "herName" })
  | (Base & { kind: "youName" })
  | (Base & { kind: "transition"; img: string; title: string; text: string })
  | (Base & { kind: "fact" })
  | (Base & { kind: "factAi" })
  | (Base & { kind: "open"; key: string; chips: string[] })
  | (Base & { kind: "slider"; key: string; labels: string[] })
  | (Base & { kind: "rating"; key: string; low: string; high: string })
  | (Base & { kind: "loader" })
  | (Base & { kind: "email" })
  | (Base & { kind: "profile" })
  | (Base & { kind: "paywall" })
  | (Base & { kind: "checkout" })
  | (Base & { kind: "success" });

export const ETHNICITIES = ["caucasian", "asian", "latina", "black"];

export const SCREENS: Screen[] = [
  { n: 1, id: "start", block: "her", kind: "start" },
  {
    n: 2, id: "ethnicity", block: "her", kind: "photo", key: "ethnicity",
    q: "Who is waiting for you tonight?", sub: "Select her ethnicity",
    options: [
      { id: "caucasian", label: "Caucasian" },
      { id: "asian", label: "Asian" },
      { id: "latina", label: "Latina" },
      { id: "black", label: "Black" },
    ],
    img: (_e, o) => `/img/common/ethnicity/${o}.jpg`,
  },
  {
    n: 3, id: "face", block: "her", kind: "photo", key: "face",
    q: "Pick her face", sub: "Which one catches your eye?",
    options: [
      { id: "cute", label: "Cute" },
      { id: "elegant", label: "Elegant" },
      { id: "sultry", label: "Sultry" },
      { id: "natural", label: "Natural" },
    ],
    img: (e, o) => `/img/${e}/face/${o}.jpg`,
  },
  {
    n: 4, id: "bust", block: "her", kind: "photo", key: "bust",
    q: "Her bust size?",
    options: [
      { id: "small", label: "Small" },
      { id: "medium", label: "Medium" },
      { id: "large", label: "Large" },
      { id: "extra-large", label: "Extra large" },
    ],
    img: (e, o) => `/img/${e}/bust/${o}.jpg`,
  },
  {
    n: 5, id: "body", block: "her", kind: "photo", key: "body",
    q: "Her body type?",
    options: [
      { id: "slim", label: "Slim" },
      { id: "athletic", label: "Athletic" },
      { id: "curvy", label: "Curvy" },
      { id: "petite", label: "Petite" },
    ],
    img: (e, o) => `/img/${e}/body/${o}.jpg`,
  },
  {
    n: 6, id: "hair", block: "her", kind: "photo", key: "hair",
    q: "Her hair color?",
    options: [
      { id: "blonde", label: "Blonde" },
      { id: "brunette", label: "Brunette" },
      { id: "black", label: "Black" },
      { id: "red", label: "Red" },
    ],
    img: (e, o) => `/img/${e}/hair/${o}.jpg`,
  },
  {
    n: 7, id: "tone", block: "her", kind: "single", key: "her_tone",
    q: "How should she talk to you?",
    options: [
      { id: "sweet", label: "Sweet and caring", emoji: "🥰" },
      { id: "playful", label: "Playful and teasing", emoji: "😜" },
      { id: "calm", label: "Calm and wise", emoji: "🌙" },
      { id: "bold", label: "Bold and flirty", emoji: "🔥" },
    ],
  },
  { n: 8, id: "her_name", block: "her", kind: "herName", q: "Give her a name", sub: "It's how she will introduce herself" },
  {
    n: 9, id: "almost_ready", block: "her", kind: "transition", img: "/img/common/transition/almost-ready.jpg",
    title: "{her} is almost ready.",
    text: "Now help {her} get to know you. A few questions about your days and evenings, so she fits into your life.",
  },
  {
    n: 10, id: "work", block: "him", kind: "single", key: "work_type",
    q: "What does your workday look like?", sub: "{her} will fit around your schedule",
    options: [
      { id: "office", label: "Full-time, 9 to 6", emoji: "💼" },
      { id: "remote", label: "Remote, from home", emoji: "🏠" },
      { id: "shifts", label: "Shifts or nights", emoji: "🌃" },
      { id: "business", label: "My own business", emoji: "📈" },
      { id: "other", label: "Something else", emoji: "✨" },
    ],
  },
  {
    n: 11, id: "lonely", block: "him", kind: "single", key: "lonely_freq",
    q: "How often do you feel lonely in the evenings?", sub: "Be honest, it stays between you two",
    options: [
      { id: "almost_every", label: "Almost every evening" },
      { id: "few_week", label: "A few times a week" },
      { id: "sometimes", label: "Sometimes" },
      { id: "rarely", label: "Rarely" },
    ],
  },
  {
    n: 12, id: "tell", block: "him", kind: "single", key: "support_source",
    q: "When something happens during your day, who do you tell?",
    options: [
      { id: "partner", label: "My partner", emoji: "💑" },
      { id: "friend", label: "A friend, sometimes", emoji: "🍻" },
      { id: "nobody", label: "Nobody really", emoji: "🤷" },
      { id: "myself", label: "I keep it to myself", emoji: "🤐" },
    ],
  },
  {
    n: 13, id: "pains", block: "him", kind: "multi", key: "pains",
    q: "What's the hardest part of your evenings?", sub: "Pick all that fit",
    options: [
      { id: "no_one", label: "No one to talk to", emoji: "😶" },
      { id: "tired", label: "Too tired to go out", emoji: "😮‍💨" },
      { id: "replaying", label: "Replaying the day in my head", emoji: "🔁" },
      { id: "scrolling", label: "Scrolling until 2 am", emoji: "📱" },
      { id: "fine", label: "Honestly, my evenings are fine", emoji: "🙂" },
    ],
    exclusive: ["fine"],
  },
  {
    n: 14, id: "evening_end", block: "him", kind: "multi", key: "evening_end",
    q: "How do your evenings usually end?", sub: "Pick all that fit",
    options: [
      { id: "scrolling", label: "Scrolling my phone", emoji: "📱" },
      { id: "porn", label: "Watching porn", emoji: "🔞" },
      { id: "tv_gaming", label: "TV or gaming", emoji: "🎮" },
      { id: "exhausted", label: "Falling asleep exhausted", emoji: "😴" },
      { id: "with_someone", label: "With someone I love", emoji: "❤️" },
    ],
  },
  {
    n: 14, id: "evening_text", block: "him", kind: "open", key: "evening_text",
    q: "In your own words: what would make your evenings better?", sub: "Optional",
    chips: ["Someone to talk to", "Less scrolling", "Feeling wanted"],
  },
  { n: 15, id: "fact_friends", block: "him", kind: "fact" },
  {
    n: 16, id: "wants", block: "him", kind: "multi", key: "wants",
    q: "What do you want most at the end of the day?", sub: "Pick all that fit",
    options: [
      { id: "listen", label: "Someone to listen", emoji: "👂" },
      { id: "laugh", label: "Someone to laugh with", emoji: "😂" },
      { id: "wanted", label: "Someone who wants me", emoji: "❤️‍🔥" },
      { id: "switch_off", label: "Help me switch off", emoji: "🛋️" },
    ],
  },
  {
    n: 17, id: "bad_day", block: "him", kind: "single", key: "bad_day_action",
    q: "You had a bad day. What should {her} do first?",
    options: [
      { id: "ask", label: "Ask what happened", emoji: "💬" },
      { id: "reassure", label: "Tell me it'll be OK", emoji: "🤗" },
      { id: "distract", label: "Take my mind off it", emoji: "🎈" },
      { id: "seduce", label: "Seduce me", emoji: "😏" },
    ],
  },
  {
    n: 18, id: "talk_time", block: "him", kind: "single", key: "talk_time",
    q: "When do you usually have time to talk?", sub: "So {her} is there when you are free",
    options: [
      { id: "after_work", label: "Right after work", emoji: "🌆" },
      { id: "late", label: "Late at night", emoji: "🌙" },
      { id: "morning_evening", label: "Morning and evening", emoji: "☀️" },
      { id: "varies", label: "Different every day", emoji: "🔀" },
    ],
  },
  {
    n: 19, id: "age", block: "him", kind: "single", key: "age_band",
    q: "How old are you?",
    options: [
      { id: "18-24", label: "18–24" },
      { id: "25-34", label: "25–34" },
      { id: "35-44", label: "35–44" },
      { id: "45+", label: "45+" },
    ],
  },
  { n: 20, id: "your_name", block: "him", kind: "youName", q: "What should {her} call you?", sub: "Only she will see it" },
  {
    n: 21, id: "behind_you", block: "desire", kind: "transition", img: "/img/common/transition/behind-you.jpg",
    title: "And when the day is behind you…",
    text: "A few more questions, so {her} knows exactly what you like.",
  },
  {
    n: 22, id: "sex_drive", block: "desire", kind: "slider", key: "sex_drive",
    q: "How strong is your sex drive?", sub: "{her} will match your energy",
    labels: ["Low", "Mild", "Moderate", "High", "Very high"],
  },
  {
    n: 23, id: "sex_satisfaction", block: "desire", kind: "rating", key: "sex_satisfaction",
    q: "How satisfied have you been with your sex life in the past 3 months?", sub: "Rate from 1 to 5",
    low: "Not at all", high: "Very satisfied",
  },
  {
    n: 23, id: "boldness", block: "desire", kind: "slider", key: "boldness",
    q: "How bold can {her} get?", sub: "You can change it any time",
    labels: ["Sweet", "Flirty", "Teasing", "Daring", "Anything goes"],
  },
  {
    n: 24, id: "open_to", block: "desire", kind: "multi", key: "open_to",
    q: "What are you open to?", sub: "Pick all that fit",
    options: [
      { id: "photos", label: "Spicy photos", emoji: "📸" },
      { id: "voice", label: "Voice messages", emoji: "🎧" },
      { id: "roleplay", label: "Role-play", emoji: "🎭" },
      { id: "dirty_talk", label: "Dirty talk", emoji: "💋" },
      { id: "surprise", label: "Not sure yet, surprise me", emoji: "🎁" },
    ],
    exclusive: ["surprise"],
  },
  {
    n: 25, id: "likes_text", block: "desire", kind: "open", key: "likes_text",
    q: "Anything else {her} should know about what you like?", sub: "Optional",
    chips: ["Slow and teasing", "Take the lead", "Lots of compliments"],
  },
  {
    n: 26, id: "scenario", block: "desire", kind: "photo", key: "scenario",
    q: "Pick your favourite scenario", sub: "{her} will start from here",
    options: [
      { id: "welcome-home", label: "Welcome home" },
      { id: "date-night", label: "Date night" },
      { id: "office-crush", label: "Office crush" },
      { id: "late-call", label: "Late call" },
    ],
    img: (e, o) => (e === "caucasian" ? `/img/common/scenario/${o}.jpg` : `/img/${e}/scenario/${o}.jpg`),
  },
  { n: 27, id: "loader", block: "result", kind: "loader" },
  { n: 28, id: "profile", block: "result", kind: "profile" },
  { n: 29, id: "fact_ai", block: "result", kind: "factAi" },
  { n: 30, id: "email", block: "result", kind: "email", q: "Enter your email to save {her}", sub: "Save her profile and start chatting." },
  { n: 31, id: "paywall", block: "pay", kind: "paywall" },
  { n: 32, id: "checkout", block: "pay", kind: "checkout" },
  { n: 33, id: "success", block: "pay", kind: "success" },
];

// Question screens get the "x/22" counter.
// Screen numbers follow the order above.
SCREENS.forEach((s, i) => { s.n = i + 1; });

const QUESTION_KINDS = new Set(["photo", "single", "multi", "herName", "youName", "open", "slider", "rating"]);
export const QUESTION_IDS = SCREENS.filter((s) => QUESTION_KINDS.has(s.kind)).map((s) => s.id);

export const PLANS = [
  { id: "1m", months: 1, label: "1 month", price: 24.99, old: 49.99, renew: "$49.99 / month", days: 30, popular: false, best: false, upsell: false, every: "every month" },
  { id: "3m", months: 3, label: "3 months", price: 49.99, old: 109.99, renew: "$109.99 / 3 months", days: 90, popular: true, best: false, upsell: false, every: "every 3 months" },
  { id: "12m", months: 12, label: "12 months", price: 119.99, old: 299.99, renew: "$299.99 / year", days: 365, popular: false, best: true, upsell: false, every: "every year" },
  // Offered only as an upsell at checkout for the preselected 3-month plan (price is our hypothesis, not a Get Honey plan).
  { id: "6m", months: 6, label: "6 months", price: 79.99, old: 179.99, renew: "$179.99 / 6 months", days: 180, popular: false, best: false, upsell: true, every: "every 6 months" },
];

// ---------- personalization ----------

export const WORK_LINE: Record<string, string> = {
  office: "You work full-time, 9 to 6",
  remote: "You work from home",
  shifts: "You work shifts or nights",
  business: "You run your own business",
};
export const WORK_TAG: Record<string, string> = {
  office: "9 to 6",
  remote: "Works from home",
  shifts: "Shifts & nights",
  business: "Own business",
};
export const LONELY_LINE: Record<string, string> = {
  almost_every: "Evenings feel lonely almost every day",
  few_week: "Evenings feel lonely a few times a week",
  sometimes: "Some evenings feel lonely",
  rarely: "You rarely feel lonely",
};
export const TALK_LINE: Record<string, string> = {
  after_work: "Best time to talk: right after work",
  late: "Best time to talk: late at night",
  morning_evening: "Best time to talk: morning and evening",
  varies: "Best time to talk: it changes every day",
};
export const WANT_PHRASE: Record<string, string> = {
  listen: "someone to listen",
  laugh: "someone to laugh with",
  wanted: "someone who wants you",
  switch_off: "a way to switch off",
};
export const SCENARIO_LABEL: Record<string, string> = {
  "welcome-home": "Welcome home",
  "date-night": "Date night",
  "office-crush": "Office crush",
  "late-call": "Late call",
};
