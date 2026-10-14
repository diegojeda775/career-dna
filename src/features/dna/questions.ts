import type { Dim, DnaWeights } from "./dimensions";

// COPS (Career Occupational Preference System) interest clusters.
export const COPS_CLUSTERS = {
  SP: "Science · Professional",
  SS: "Science · Skilled",
  TP: "Technology · Professional",
  TS: "Technology · Skilled",
  CE: "Consumer Economics",
  OD: "Outdoor",
  BP: "Business · Professional",
  BS: "Business · Skilled",
  CL: "Clerical & Records",
  CM: "Communication",
  AP: "Arts · Professional",
  AS: "Arts · Skilled",
  VP: "Service · Professional",
  VS: "Service · Skilled",
} as const;
export type CopsCluster = keyof typeof COPS_CLUSTERS;

export type SectionId = "dealbreakers" | "energy" | "wiring" | "world" | "deep";

export const SECTIONS: Record<SectionId, { title: string; intro: string }> = {
  dealbreakers: {
    title: "Your dealbreakers",
    intro: "Start with the hard lines. These filter out whole industries before we look for a match. Salary, remote work and travel come later, as filters on your results.",
  },
  energy: {
    title: "Energy or drain",
    intro: "Picture yourself spending a full afternoon on each task. Don't worry about skill or training. Would it charge you up or wear you out?",
  },
  wiring: {
    title: "How you're wired",
    intro: "Slide toward whichever side sounds more like you. There's no right answer, and most people land somewhere in between.",
  },
  world: {
    title: "Your work world",
    intro: "How much do you agree with each statement?",
  },
  deep: {
    title: "Deep dive",
    intro: "We've picked these based on your answers so far, to tell apart the niche careers that fit you.",
  },
};

export const SCALE_LABELS = {
  energy: ["Drains me", "Tiring", "Neutral", "Enjoyable", "Energizes me"],
  agree: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
} as const;

// Hard filters applied to careers. Each dealbreaker question sets one.
export type ConstraintKey =
  | "schedule"
  | "education"
  | "physical"
  | "danger"
  | "outdoor"
  | "medical"
  | "discovery";

export type ChoiceOption = { value: string; label: string; weights?: DnaWeights };

export type Question =
  | {
      id: string;
      section: SectionId;
      kind: "scale";
      scale: keyof typeof SCALE_LABELS;
      text: string;
      weights: DnaWeights;
      cluster?: CopsCluster;
      probe?: Dim[];
    }
  | { id: string; section: SectionId; kind: "spectrum"; left: string; right: string; weights: DnaWeights }
  | {
      id: string;
      section: SectionId;
      kind: "choice";
      text: string;
      help?: string;
      constraint: ConstraintKey;
      options: ChoiceOption[];
    };

const energy = (id: string, cluster: CopsCluster, text: string, weights: DnaWeights): Question => ({
  id, section: "energy", kind: "scale", scale: "energy", text, weights, cluster,
});
const spectrum = (id: string, left: string, right: string, weights: DnaWeights): Question => ({
  id, section: "wiring", kind: "spectrum", left, right, weights,
});
const agree = (id: string, text: string, weights: DnaWeights): Question => ({
  id, section: "world", kind: "scale", scale: "agree", text, weights,
});
const probe = (id: string, dims: Dim[], text: string, weights: DnaWeights): Question => ({
  id, section: "deep", kind: "scale", scale: "energy", text, weights, probe: dims,
});

export const DEALBREAKERS: Question[] = [
  {
    id: "d_schedule", section: "dealbreakers", kind: "choice", constraint: "schedule",
    text: "Which schedules could you live with?",
    options: [
      { value: "standard", label: "Weekdays, regular hours only", weights: { structure: 0.3 } },
      { value: "shifts", label: "Shifts are fine if they're predictable" },
      { value: "any", label: "Anything goes: nights, weekends, on-call, 2-weeks-on/2-weeks-off", weights: { variety: 0.3, adrenaline: 0.2 } },
    ],
  },
  {
    id: "d_education", section: "dealbreakers", kind: "choice", constraint: "education",
    text: "How much training are you willing to do before your first paycheck in a new field?",
    options: [
      { value: "1", label: "Months, not years (short certificate or on-the-job)" },
      { value: "2", label: "Up to ~2 years (apprenticeship, associate degree, academy)" },
      { value: "3", label: "A 4-year degree is fine" },
      { value: "4", label: "Graduate school is fine" },
    ],
  },
  {
    id: "d_physical", section: "dealbreakers", kind: "choice", constraint: "physical",
    text: "How physical can the work be?",
    options: [
      { value: "desk", label: "Mostly seated, please", weights: { physical: -0.8 } },
      { value: "moderate", label: "On my feet and moving around is fine" },
      { value: "heavy", label: "Bring on lifting, climbing and sweat", weights: { physical: 0.8, hands_on: 0.2 } },
    ],
  },
  {
    id: "d_danger", section: "dealbreakers", kind: "choice", constraint: "danger",
    text: "Physical danger on the job: heights, deep water, fire, high voltage?",
    options: [
      { value: "none", label: "Hard no", weights: { adrenaline: -0.8 } },
      { value: "calculated", label: "Calculated, well-trained risk is okay" },
      { value: "thrill", label: "Honestly? That sounds exciting", weights: { adrenaline: 0.8 } },
    ],
  },
  {
    id: "d_outdoor", section: "dealbreakers", kind: "choice", constraint: "outdoor",
    text: "Weather and the outdoors?",
    options: [
      { value: "indoor", label: "Climate-controlled indoors only", weights: { nature: -0.5 } },
      { value: "mix", label: "A mix is fine" },
      { value: "outdoor", label: "Outside in all weather is my happy place", weights: { nature: 0.8 } },
    ],
  },
  {
    id: "d_medical", section: "dealbreakers", kind: "choice", constraint: "medical",
    text: "Blood, needles, bodily fluids or medical procedures?",
    options: [
      { value: "no", label: "Absolutely not" },
      { value: "ok", label: "I can handle it" },
    ],
  },
  {
    id: "d_discovery", section: "dealbreakers", kind: "choice", constraint: "discovery",
    text: "How adventurous should your matches be?",
    help: "Like a music app's discovery setting. You can change this later on the results page.",
    options: [
      { value: "0", label: "Mostly careers I'd recognize" },
      { value: "1", label: "A mix of familiar and unexpected" },
      { value: "2", label: "Show me careers I've never heard of" },
    ],
  },
];

export const ENERGY: Question[] = [
  // Science · Professional
  energy("e01", "SP", "Reading a research paper to figure out why an experiment failed", { investigative: 1, analytical: 0.6, abstract: 0.4 }),
  energy("e02", "SP", "Diagnosing a puzzling problem from a confusing set of symptoms", { investigative: 0.9, analytical: 0.5, pressure: 0.3 }),
  energy("e03", "SP", "Designing an experiment to test whether a new fertilizer actually works", { investigative: 1, nature: 0.4, structure: 0.3 }),
  energy("e04", "SP", "Comparing 20 years of satellite images to track how a glacier has changed", { investigative: 0.7, nature: 0.6, tech: 0.3, autonomy: 0.3 }),
  energy("e05", "SP", "Looking through a microscope to identify a mystery microorganism", { investigative: 0.9, detail: 0.7 }),
  // Science · Skilled
  energy("e06", "SS", "Running the same lab test on 40 samples and logging every result precisely", { detail: 1, organizing: 0.5, investigative: 0.4, variety: -0.5 }),
  energy("e07", "SS", "Wading into rivers and streams to collect water samples", { nature: 0.8, investigative: 0.5, physical: 0.3 }),
  energy("e08", "SS", "Calibrating sensitive equipment until the readings are perfect", { detail: 0.9, mechanical: 0.6, tech: 0.3 }),
  energy("e09", "SS", "Dusting a crime scene for fingerprints and bagging evidence", { investigative: 0.8, detail: 0.8, pressure: 0.3, adrenaline: 0.3 }),
  energy("e10", "SS", "Positioning a patient and operating a medical imaging scanner", { helping: 0.5, tech: 0.5, detail: 0.5, social: 0.3 }),
  // Technology · Professional
  energy("e11", "TP", "Hunting down the one line of code that's causing a bug", { tech: 1, analytical: 0.7, detail: 0.6 }),
  energy("e12", "TP", "Trying (legally) to break into a computer system to find its weak spots", { tech: 1, investigative: 0.6, adrenaline: 0.3, autonomy: 0.3 }),
  energy("e13", "TP", "Designing a machine part in 3D software", { tech: 0.6, mechanical: 0.7, creative: 0.4, detail: 0.4 }),
  energy("e14", "TP", "Building a model that predicts next month's sales from messy data", { analytical: 1, tech: 0.7, abstract: 0.4 }),
  energy("e15", "TP", "Figuring out the most efficient routes for 500 delivery trucks", { analytical: 0.9, organizing: 0.5, abstract: 0.3 }),
  // Technology · Skilled
  energy("e16", "TS", "Rebuilding an engine and hearing it fire up for the first time", { mechanical: 1, hands_on: 0.9 }),
  energy("e17", "TS", "Climbing a 300-foot wind turbine to replace a part", { mechanical: 0.7, hands_on: 0.7, adrenaline: 0.9, physical: 0.8, nature: 0.3 }),
  energy("e18", "TS", "Welding two pieces of steel into one seamless joint", { hands_on: 1, mechanical: 0.5, detail: 0.5, physical: 0.5 }),
  energy("e19", "TS", "Wiring an electrical panel so everything works on the first try", { hands_on: 0.8, mechanical: 0.8, detail: 0.6 }),
  energy("e20", "TS", "Troubleshooting why a factory robot keeps stopping", { mechanical: 0.8, tech: 0.6, analytical: 0.5, pressure: 0.3 }),
  // Consumer Economics
  energy("e21", "CE", "Perfecting a recipe through a dozen small tweaks", { creative: 0.6, hands_on: 0.6, detail: 0.5, investigative: 0.3 }),
  energy("e22", "CE", "Planning a week of meals around someone's strict dietary needs", { helping: 0.6, organizing: 0.5, investigative: 0.3 }),
  energy("e23", "CE", "Altering a garment so it fits someone perfectly", { hands_on: 0.8, detail: 0.8, creative: 0.4 }),
  energy("e24", "CE", "Working a busy kitchen line during the dinner rush", { pressure: 0.9, physical: 0.6, hands_on: 0.6, social: 0.3 }),
  // Outdoor
  energy("e25", "OD", "Tracking a wild animal's movements across a forest", { nature: 1, animals: 0.8, investigative: 0.4, autonomy: 0.4 }),
  energy("e26", "OD", "Planting and caring for 200 trees on a hillside", { nature: 0.9, physical: 0.8, hands_on: 0.6 }),
  energy("e27", "OD", "Training a dog to perform a complex task", { animals: 1, helping: 0.3, hands_on: 0.3 }),
  energy("e28", "OD", "Spending a week on a research boat mapping the ocean floor", { nature: 0.7, travel: 0.7, adrenaline: 0.4, investigative: 0.4 }),
  energy("e29", "OD", "Operating heavy machinery to clear and grade land", { hands_on: 0.7, mechanical: 0.6, physical: 0.5, nature: 0.4 }),
  // Business · Professional
  energy("e30", "BP", "Negotiating a contract until both sides shake hands", { persuading: 1, leading: 0.5, social: 0.6, pressure: 0.4 }),
  energy("e31", "BP", "Deciding which of three projects gets the budget", { leading: 1, analytical: 0.5, pressure: 0.4 }),
  energy("e32", "BP", "Writing a five-year plan to grow a small business", { leading: 0.7, abstract: 0.6, analytical: 0.4, structure: 0.4 }),
  energy("e33", "BP", "Pitching an idea to a room of skeptical executives", { persuading: 0.9, visibility: 0.7, social: 0.5, pressure: 0.5 }),
  energy("e34", "BP", "Digging into a company's finances to decide if it's a good investment", { analytical: 0.9, investigative: 0.4, abstract: 0.3 }),
  // Business · Skilled
  energy("e35", "BS", "Convincing a customer that a product is right for them", { persuading: 1, social: 0.7 }),
  energy("e36", "BS", "Running a store's daily operations and staff schedule", { leading: 0.7, organizing: 0.7, social: 0.5 }),
  energy("e37", "BS", "Cold-calling 30 potential clients in an afternoon", { persuading: 0.9, social: 0.6, pressure: 0.4 }),
  energy("e38", "BS", "Booking performers and haggling over fees for an event", { persuading: 0.8, organizing: 0.5, social: 0.6, variety: 0.4 }),
  // Clerical
  energy("e39", "CL", "Turning 2,000 messy files into a clean, searchable system", { organizing: 1, detail: 0.8, structure: 0.6 }),
  energy("e40", "CL", "Double-checking a big spreadsheet for errors", { detail: 1, organizing: 0.6, analytical: 0.3 }),
  energy("e41", "CL", "Converting doctors' notes into precise billing codes", { detail: 0.9, organizing: 0.8, variety: -0.4, social: -0.3 }),
  energy("e42", "CL", "Keeping a busy team's complicated schedule running smoothly", { organizing: 0.9, structure: 0.7, social: 0.3 }),
  energy("e43", "CL", "Making sure a company follows every regulation that applies to it", { organizing: 0.7, detail: 0.7, structure: 0.6, analytical: 0.3 }),
  // Communication
  energy("e44", "CM", "Writing instructions so clear that anyone could follow them", { words: 1, detail: 0.5, helping: 0.3 }),
  energy("e45", "CM", "Interviewing someone and turning it into a compelling story", { words: 1, social: 0.5, creative: 0.5, investigative: 0.3 }),
  energy("e46", "CM", "Interpreting a conversation between two people in real time", { words: 0.9, social: 0.6, pressure: 0.6, helping: 0.3 }),
  energy("e47", "CM", "Editing someone else's writing to make it sharper", { words: 0.9, detail: 0.7 }),
  energy("e48", "CM", "Searching old records to piece together a forgotten history", { words: 0.6, investigative: 0.8, detail: 0.4, autonomy: 0.4 }),
  // Arts · Professional
  energy("e49", "AP", "Designing the look and feel of an app", { creative: 1, tech: 0.5, helping: 0.2 }),
  energy("e50", "AP", "Composing music or sound for a film scene", { creative: 1, autonomy: 0.4, tech: 0.3 }),
  energy("e51", "AP", "Designing a garden or public park", { creative: 0.8, nature: 0.7, abstract: 0.4 }),
  energy("e52", "AP", "Inventing the rules and levels of a new game", { creative: 0.9, abstract: 0.6, tech: 0.4 }),
  energy("e53", "AP", "Planning the lighting and atmosphere for a live concert", { creative: 0.8, tech: 0.4, pressure: 0.4, variety: 0.4 }),
  // Arts · Skilled
  energy("e54", "AS", "Restoring a damaged antique painting stroke by stroke", { creative: 0.6, detail: 1, hands_on: 0.7, autonomy: 0.4 }),
  energy("e55", "AS", "Building a set or props for a stage show", { hands_on: 0.9, creative: 0.8 }),
  energy("e56", "AS", "Photographing or filming an event", { creative: 0.8, variety: 0.5, travel: 0.3 }),
  energy("e57", "AS", "Crafting jewelry or a musical instrument by hand", { hands_on: 1, creative: 0.7, detail: 0.8, autonomy: 0.5 }),
  energy("e58", "AS", "Applying special-effects makeup to turn an actor into a creature", { creative: 0.9, hands_on: 0.8, detail: 0.6 }),
  // Service · Professional
  energy("e59", "VP", "Counseling someone through a hard life decision", { helping: 1, empathy: 0.8, social: 0.6 }),
  energy("e60", "VP", "Teaching a new skill to a group of beginners", { helping: 0.8, words: 0.4, social: 0.7, visibility: 0.4 }),
  energy("e61", "VP", "Helping a family understand a complicated medical diagnosis", { helping: 0.9, empathy: 0.7, words: 0.5, investigative: 0.3 }),
  energy("e62", "VP", "Designing a therapy plan to help someone walk again", { helping: 0.9, investigative: 0.4, hands_on: 0.4, physical: 0.3 }),
  // Service · Skilled
  energy("e63", "VS", "Arriving first at an emergency and taking charge", { pressure: 1, adrenaline: 0.8, helping: 0.7, leading: 0.4 }),
  energy("e64", "VS", "Guiding a group of travelers through a new city", { social: 0.9, travel: 0.7, visibility: 0.5, variety: 0.6 }),
  energy("e65", "VS", "Making a stranger feel welcome and cared for", { helping: 0.8, social: 0.8, empathy: 0.6 }),
  energy("e66", "VS", "Patrolling a site and keeping people safe", { adrenaline: 0.6, physical: 0.5, pressure: 0.5, leading: 0.3 }),
];

// Myers-Briggs-style spectrums. Moving right adds the weights; moving left subtracts them.
export const WIRING: Question[] = [
  // Introversion ↔ Extraversion
  spectrum("w01", "I recharge alone or with one close friend", "I recharge in a lively group", { social: 1 }),
  spectrum("w02", "I think things through before I speak", "I figure out what I think by talking it out", { social: 0.8 }),
  spectrum("w03", "Quiet, deep work with few interruptions", "A buzzing room full of people", { social: 0.8, variety: 0.2 }),
  spectrum("w04", "A day of back-to-back meetings sounds exhausting", "A day of back-to-back meetings sounds energizing", { social: 1 }),
  spectrum("w05", "I'd rather be the expert behind the scenes", "I'd rather be the face out front", { visibility: 1, social: 0.4 }),
  spectrum("w06", "Small talk with strangers drains me", "Small talk with strangers comes easily", { social: 0.9, persuading: 0.3 }),
  spectrum("w07", "I like working closely with a team", "I like working mostly on my own", { autonomy: 1, social: -0.5 }),
  // Sensing ↔ Intuition
  spectrum("w08", "I trust facts, details and experience", "I trust patterns, hunches and possibilities", { abstract: 1 }),
  spectrum("w09", "Give me clear, practical instructions", "Let me figure out the big picture myself", { abstract: 0.8, autonomy: 0.3 }),
  spectrum("w10", "I enjoy improving something that already works", "I enjoy inventing something that doesn't exist yet", { abstract: 0.8, creative: 0.4, variety: 0.3 }),
  spectrum("w11", "I want concrete, hands-on results", "I want ideas, theories and strategies", { abstract: 1, hands_on: -0.6 }),
  spectrum("w12", "I notice small details others miss", "I notice connections others miss", { abstract: 0.8, detail: -0.6 }),
  spectrum("w13", "I learn best by doing", "I learn best by understanding the theory first", { abstract: 0.8, hands_on: -0.4 }),
  spectrum("w14", "Work grounded in the here and now", "Work focused on what's coming next", { abstract: 0.8 }),
  // Thinking ↔ Feeling
  spectrum("w15", "When deciding, logic and consistency matter most", "When deciding, people's feelings and values matter most", { empathy: 1, analytical: -0.5 }),
  spectrum("w16", "I'd rather be respected for being right", "I'd rather be appreciated for being kind", { empathy: 0.9 }),
  spectrum("w17", "Blunt, honest feedback is a gift", "Feedback should be delivered gently", { empathy: 0.8 }),
  spectrum("w18", "I'm drawn to solving technical problems", "I'm drawn to solving people problems", { empathy: 0.8, helping: 0.6, tech: -0.4 }),
  spectrum("w19", "A fair rule should apply to everyone equally", "Rules should bend for individual circumstances", { empathy: 0.8, structure: -0.3 }),
  spectrum("w20", "Debating a point is fun", "Debating a point is stressful", { empathy: 0.7, persuading: -0.4 }),
  spectrum("w21", "Meaningful work means cracking hard problems", "Meaningful work means changing someone's life", { empathy: 0.8, helping: 0.7 }),
  // Perceiving ↔ Judging
  spectrum("w22", "I keep my options open and decide late", "I like decisions made and plans set", { structure: 1 }),
  spectrum("w23", "Deadlines motivate me at the last minute", "I finish early so I'm never rushed", { structure: 0.9 }),
  spectrum("w24", "I love when every day is different", "I love a predictable routine", { structure: 0.6, variety: -1 }),
  spectrum("w25", "My workspace is creative chaos", "My workspace is organized", { structure: 0.8, organizing: 0.5 }),
  spectrum("w26", "When things go sideways, I improvise", "When things go sideways, I want a checklist", { structure: 0.9, adrenaline: -0.3 }),
  spectrum("w27", "I juggle many projects at once", "I finish one project before starting the next", { structure: 0.7, variety: -0.5 }),
  spectrum("w28", "Rules and procedures feel limiting", "Rules and procedures make me feel secure", { structure: 0.8, autonomy: -0.4 }),
];

export const WORLD: Question[] = [
  agree("v01", "I want to see a tangible result at the end of each day, something built, fixed or finished", { hands_on: 0.6, mechanical: 0.3 }),
  agree("v02", "I'd happily work somewhere remote (a ship, a rig, a national park) for weeks at a time", { travel: 0.9, adrenaline: 0.5, nature: 0.5 }),
  agree("v03", "I do my best work when the stakes are high and every second counts", { pressure: 1, adrenaline: 0.6 }),
  agree("v04", "I want to be my own boss, or close to it", { autonomy: 1, leading: 0.3 }),
  agree("v05", "Being publicly recognized for my work matters to me", { visibility: 1 }),
  agree("v06", "I'd choose a stable, secure job over an exciting, uncertain one", { structure: 0.6, adrenaline: -0.6, variety: -0.4 }),
  agree("v07", "I want my work to directly help a specific person I can see", { helping: 1, empathy: 0.5 }),
  agree("v08", "I'd enjoy working with animals every day", { animals: 1 }),
  agree("v09", "I'd enjoy a job where I'm constantly learning new technology", { tech: 0.9, variety: 0.4 }),
  agree("v10", "Working with numbers all day sounds satisfying", { analytical: 1, detail: 0.3 }),
  agree("v11", "I'd like to lead a team and be accountable for its results", { leading: 1, social: 0.3, pressure: 0.3 }),
  agree("v12", "I enjoy physical work that leaves me tired at the end of the day", { physical: 1, hands_on: 0.5 }),
  agree("v13", "I stay calm in situations that make other people panic", { pressure: 0.9, adrenaline: 0.5 }),
  agree("v14", "I'd enjoy being on stage, on camera or on a microphone", { visibility: 1, social: 0.5 }),
  agree("v15", "I like being on the move: different sites, different cities", { travel: 0.9, variety: 0.6 }),
  agree("v16", "I'm the person friends call when something needs fixing", { mechanical: 0.8, hands_on: 0.7, helping: 0.3 }),
  agree("v17", "I enjoy persuading people to see things my way", { persuading: 1 }),
  agree("v18", "I'd enjoy work that's mostly writing", { words: 1, autonomy: 0.3 }),
  agree("v19", "Being outdoors lifts my mood more than almost anything", { nature: 1 }),
  agree("v20", "I'm fascinated by how the human body works", { investigative: 0.6, helping: 0.5 }),
  agree("v21", "I'm drawn to crime, mysteries and solving cases", { investigative: 0.9, adrenaline: 0.3, detail: 0.3 }),
  agree("v22", "I care a lot about making things beautiful", { creative: 1 }),
  agree("v23", "I like making sure things are done properly and by the book", { organizing: 0.8, structure: 0.6, detail: 0.5 }),
  agree("v24", "I'd rather work with ideas than with things or people", { abstract: 0.8, hands_on: -0.5, social: -0.4 }),
];

// Adaptive pool: only the probes that match someone's strongest signals get asked.
export const PROBES: Question[] = [
  probe("p01", ["hands_on", "adrenaline"], "Diving underwater in a dry suit to inspect and repair a pier", { adrenaline: 0.8, hands_on: 0.8, physical: 0.6, nature: 0.3 }),
  probe("p02", ["hands_on", "helping"], "Fitting and adjusting a custom prosthetic limb for someone", { hands_on: 0.8, helping: 0.8, detail: 0.6 }),
  probe("p03", ["hands_on", "creative"], "Rebuilding the inside of a 100-year-old violin", { hands_on: 0.9, detail: 0.9, creative: 0.6 }),
  probe("p04", ["mechanical"], "Installing and servicing the elevators in a skyscraper", { mechanical: 0.9, hands_on: 0.6, adrenaline: 0.4 }),
  probe("p05", ["mechanical", "detail"], "Checking a jet's electronics before it's cleared for takeoff", { mechanical: 0.8, tech: 0.6, detail: 0.8, pressure: 0.4 }),
  probe("p06", ["mechanical", "hands_on"], "Opening a high-security safe for a customer who's locked out", { mechanical: 0.8, hands_on: 0.7, variety: 0.3 }),
  probe("p07", ["tech", "investigative"], "Recovering deleted files from a phone for a court case", { tech: 0.9, investigative: 0.8, detail: 0.6 }),
  probe("p08", ["tech"], "Monitoring hacker forums to predict the next cyberattack", { tech: 0.8, investigative: 0.8, abstract: 0.4 }),
  probe("p09", ["tech", "mechanical"], "Piloting an underwater robot from a ship's control room", { tech: 0.8, mechanical: 0.6, travel: 0.5, nature: 0.3 }),
  probe("p10", ["tech", "creative"], "Scripting how characters behave in a video game", { tech: 0.8, creative: 0.7 }),
  probe("p11", ["analytical"], "Calculating how likely a hurricane is to bankrupt an insurance company", { analytical: 1, abstract: 0.4, pressure: 0.3 }),
  probe("p12", ["analytical"], "Analyzing player stats to help a team draft its next star", { analytical: 0.9, tech: 0.4 }),
  probe("p13", ["analytical", "investigative"], "Tracing hidden money through hundreds of transactions to expose fraud", { analytical: 0.8, investigative: 0.8, detail: 0.7 }),
  probe("p14", ["investigative", "nature"], "Reading a volcano's gas levels to predict an eruption", { investigative: 0.9, nature: 0.7, adrenaline: 0.5 }),
  probe("p15", ["investigative", "adrenaline"], "Working out how a fire started by sifting through the ashes", { investigative: 0.9, adrenaline: 0.4, detail: 0.6, physical: 0.3 }),
  probe("p16", ["investigative", "helping"], "Explaining someone's DNA test results and what they mean for their family", { investigative: 0.6, helping: 0.8, empathy: 0.7, words: 0.4 }),
  probe("p17", ["investigative", "creative"], "Inventing a new flavor for a snack company in a lab", { investigative: 0.7, creative: 0.6, detail: 0.5 }),
  probe("p18", ["creative"], "Recording the sound of footsteps and punches for a movie", { creative: 0.9, hands_on: 0.5, detail: 0.6 }),
  probe("p19", ["creative", "abstract"], "Designing an immersive escape room or museum exhibit", { creative: 0.9, abstract: 0.5, hands_on: 0.4 }),
  probe("p20", ["creative", "detail"], "Drawing precise illustrations of human anatomy for textbooks", { creative: 0.8, detail: 0.8, investigative: 0.4 }),
  probe("p21", ["words"], "Writing the short bits of text that guide people through an app", { words: 0.9, tech: 0.4, helping: 0.3 }),
  probe("p22", ["words", "pressure"], "Captioning a live TV broadcast as it happens", { words: 0.8, pressure: 0.7, detail: 0.7 }),
  probe("p23", ["words", "organizing"], "Digitizing and cataloging a collection of rare letters", { words: 0.5, organizing: 0.8, detail: 0.7, investigative: 0.4 }),
  probe("p24", ["helping"], "Using play to help a child get ready for surgery", { helping: 1, empathy: 0.8, creative: 0.3 }),
  probe("p25", ["helping", "creative"], "Using music or games as therapy for someone recovering from an injury", { helping: 0.9, creative: 0.5 }),
  probe("p26", ["helping", "empathy"], "Guiding a grieving family through planning a funeral", { helping: 0.9, empathy: 0.9, organizing: 0.5 }),
  probe("p27", ["empathy", "persuading"], "Mediating a dispute until two angry people reach an agreement", { persuading: 0.6, empathy: 0.6, social: 0.6, pressure: 0.5 }),
  probe("p28", ["persuading", "visibility"], "Calling a fast-paced live auction", { persuading: 0.8, visibility: 0.9, pressure: 0.6 }),
  probe("p29", ["persuading", "tech"], "Explaining a complex technical product to a buyer and closing the deal", { persuading: 0.8, tech: 0.6, social: 0.5 }),
  probe("p30", ["persuading", "leading"], "Representing an athlete or artist and negotiating their contract", { persuading: 0.9, leading: 0.4, pressure: 0.4 }),
  probe("p31", ["persuading", "empathy"], "Asking a wealthy donor to fund a cause you believe in", { persuading: 0.8, empathy: 0.5, social: 0.6 }),
  probe("p32", ["pressure", "detail"], "Guiding dozens of airplanes safely through busy airspace", { pressure: 1, detail: 0.8, analytical: 0.4, structure: 0.5 }),
  probe("p33", ["organizing", "detail"], "Inspecting a building's safety systems against code", { detail: 0.8, organizing: 0.6, mechanical: 0.3 }),
  probe("p34", ["organizing", "analytical"], "Estimating exactly what a construction project will cost", { analytical: 0.7, detail: 0.8, organizing: 0.5 }),
  probe("p35", ["animals"], "Caring for sharks and rays at a public aquarium", { animals: 1, nature: 0.5, hands_on: 0.4 }),
  probe("p36", ["nature", "physical"], "Using ropes to climb a giant tree and prune it safely", { nature: 0.8, physical: 0.8, adrenaline: 0.7 }),
  probe("p37", ["nature", "autonomy"], "Enforcing hunting and fishing laws deep in the backcountry", { nature: 0.9, adrenaline: 0.5, leading: 0.3, autonomy: 0.6 }),
  probe("p38", ["nature", "creative"], "Drawing up plans to restore a damaged wetland", { nature: 0.8, creative: 0.5, analytical: 0.4 }),
  probe("p39", ["adrenaline", "physical"], "Parachuting into a remote forest to fight a wildfire", { adrenaline: 1, physical: 1, nature: 0.6 }),
  probe("p40", ["adrenaline", "mechanical"], "Repairing live high-voltage power lines after a storm", { adrenaline: 0.9, mechanical: 0.6, physical: 0.7 }),
  probe("p41", ["helping", "pressure"], "Treating a patient in the back of a medical helicopter", { helping: 0.8, pressure: 1, adrenaline: 0.8 }),
  probe("p42", ["adrenaline", "travel"], "Flying a small plane into remote wilderness airstrips", { adrenaline: 0.8, travel: 0.8, nature: 0.6, tech: 0.3 }),
  probe("p43", ["travel", "social"], "Leading a two-week expedition through Patagonia", { travel: 0.9, leading: 0.6, nature: 0.7, social: 0.5 }),
  probe("p44", ["travel", "analytical"], "Flying into a disaster zone to assess damage for insurance claims", { travel: 0.9, analytical: 0.5, helping: 0.4, pressure: 0.5 }),
  probe("p45", ["abstract", "leading"], "Redesigning how a whole company's teams work together", { abstract: 0.8, leading: 0.5, empathy: 0.4, analytical: 0.4 }),
  probe("p46", ["abstract", "investigative"], "Researching why people get confused by a product", { investigative: 0.7, empathy: 0.5, tech: 0.4, abstract: 0.4 }),
  probe("p47", ["abstract", "organizing"], "Planning how a neighborhood should grow over the next 20 years", { abstract: 0.9, organizing: 0.4, helping: 0.3 }),
  probe("p48", ["visibility", "words"], "Producing and hosting a podcast episode", { visibility: 0.8, words: 0.7, creative: 0.6 }),
  probe("p49", ["detail", "creative"], "Grading a rough gemstone under magnification and planning how to cut it", { detail: 0.9, creative: 0.6, hands_on: 0.6 }),
  probe("p50", ["organizing", "tech"], "Building a searchable archive out of ten years of a company's emails", { organizing: 0.9, tech: 0.6, investigative: 0.4 }),
  probe("p51", ["leading", "travel"], "Commanding a cargo ship's bridge through a storm at sea", { leading: 0.8, travel: 0.8, pressure: 0.8, adrenaline: 0.5 }),
];

export const PROBE_COUNT = 25;

export const CORE_QUESTIONS = [...DEALBREAKERS, ...ENERGY, ...WIRING, ...WORLD];
export const ALL_QUESTIONS = [...CORE_QUESTIONS, ...PROBES];
export const QUESTION_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
export const TOTAL_QUESTIONS = CORE_QUESTIONS.length + PROBE_COUNT;
