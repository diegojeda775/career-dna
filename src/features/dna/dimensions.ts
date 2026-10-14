// The "DNA" of work: every question and every career is described on these axes.
// People are scored 0..1 on each one; careers are tagged 0..1 on each one.

export const DIMENSIONS = {
  // What you work WITH
  hands_on: { label: "Hands-on Craft", blurb: "Building, fixing and making things with your hands", group: "interest" },
  mechanical: { label: "Machines & Systems", blurb: "Engines, wiring, equipment and how they fit together", group: "interest" },
  tech: { label: "Digital & Code", blurb: "Software, computers, data systems and electronics", group: "interest" },
  analytical: { label: "Numbers & Logic", blurb: "Math, data, models and rigorous reasoning", group: "interest" },
  investigative: { label: "Investigation & Science", blurb: "Asking why, testing hunches, uncovering hidden answers", group: "interest" },
  creative: { label: "Creative Expression", blurb: "Design, art, sound, style and original ideas", group: "interest" },
  words: { label: "Words & Story", blurb: "Writing, editing, language and storytelling", group: "interest" },
  helping: { label: "Care & Helping", blurb: "Directly improving someone's health, growth or wellbeing", group: "interest" },
  persuading: { label: "Influence & Deal-making", blurb: "Selling, negotiating and changing minds", group: "interest" },
  leading: { label: "Leading & Deciding", blurb: "Taking charge, owning outcomes, steering teams", group: "interest" },
  organizing: { label: "Order & Systems", blurb: "Records, processes, compliance and keeping things running", group: "interest" },
  nature: { label: "Nature & Outdoors", blurb: "Land, water, weather, plants and wild places", group: "interest" },
  animals: { label: "Animals", blurb: "Caring for, training or studying animals", group: "interest" },

  // HOW you like to work
  detail: { label: "Precision & Detail", blurb: "Getting things exactly right, every time", group: "style" },
  abstract: { label: "Big-Picture Thinking", blurb: "Patterns, theories, possibilities and the future", group: "style" },
  social: { label: "People Energy", blurb: "Constant interaction with teammates, clients or the public", group: "style" },
  empathy: { label: "Values-led Decisions", blurb: "Weighing people and feelings over pure logic", group: "style" },
  structure: { label: "Structure & Planning", blurb: "Plans, procedures and predictable routines", group: "style" },
  autonomy: { label: "Independence", blurb: "Working on your own terms with little supervision", group: "style" },
  variety: { label: "Novelty & Variety", blurb: "Every day different, new problems, new places", group: "style" },
  pressure: { label: "High-Stakes Calm", blurb: "Thriving when seconds count and mistakes are costly", group: "style" },

  // WHERE and under what conditions
  adrenaline: { label: "Risk & Adrenaline", blurb: "Heights, depths, danger and the thrill of it", group: "setting" },
  physical: { label: "Physical Exertion", blurb: "Lifting, climbing and working up a sweat", group: "setting" },
  travel: { label: "Travel & Mobility", blurb: "Field sites, the road, the sea, away from home", group: "setting" },
  visibility: { label: "Spotlight", blurb: "Being on stage, on camera or the face out front", group: "setting" },
} as const;

export type Dim = keyof typeof DIMENSIONS;
export const DIM_KEYS = Object.keys(DIMENSIONS) as Dim[];
export type DnaVector = Record<Dim, number>;
export type DnaWeights = Partial<Record<Dim, number>>;

// Styles are two-sided traits, so an unknown career sits in the middle.
// Interests and settings are one-sided: most careers involve little of any given one.
export function dimDefault(dim: Dim) {
  return DIMENSIONS[dim].group === "style" ? 0.5 : 0.15;
}
