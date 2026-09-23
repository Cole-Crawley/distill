import { db } from './db'
import type { Card, TopicCategory } from '../types'

// Seeds a brand-new empty database with realistic demo notes, cards, relationships, and study history, so the app doesn't look empty on first run. Only runs if the documents table is completely empty.

// ── Simulating "time spent studying" ────────────────────────────────────
// Skips straight to plausible end-of-tier SM-2 states instead of replaying weeks of individual reviews.

type MasteryTier = 'mastered' | 'strong' | 'learning' | 'struggling' | 'new'

interface TierState {
  repetition: number
  easeFactor: number
  interval: number
  dueInDays: number // where `due` lands relative to today
  status: Card['status']
}

// Higher easeFactor/repetition/interval reads as higher mastery (see lib/mastery.ts); struggling/new cards are due today so the Study page has something to show.
const TIER_STATE: Record<MasteryTier, TierState> = {
  mastered: { repetition: 6, easeFactor: 3.1, interval: 60, dueInDays: 45, status: 'review' },
  strong: { repetition: 4, easeFactor: 2.7, interval: 21, dueInDays: 18, status: 'review' },
  learning: { repetition: 2, easeFactor: 2.3, interval: 6, dueInDays: 3, status: 'learning' },
  struggling: { repetition: 2, easeFactor: 1.6, interval: 1, dueInDays: 0, status: 'learning' },
  new: { repetition: 0, easeFactor: 2.5, interval: 0, dueInDays: 0, status: 'new' },
}

function daysFromNow(offset: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  date.setHours(12, 0, 0, 0)
  return date
}

function tierCardState(tier: MasteryTier) {
  const config = TIER_STATE[tier]
  return {
    repetition: config.repetition,
    easeFactor: config.easeFactor,
    interval: config.interval,
    due: daysFromNow(config.dueInDays),
    status: config.status,
  }
}

interface SeedCard {
  front: string
  back: string
  type: Card['type']
}

interface SeedDocument {
  title: string
  body: string
  summary: string
  topic: TopicCategory
  keywords: string[]
  tier: MasteryTier
  createdDaysAgo: number
  cards: SeedCard[]
}

const SEED_DOCUMENTS: SeedDocument[] = [
  {
    title: 'Neural Network Fundamentals',
    body: 'Neural networks learn by adjusting the weights on connections between simple, neuron-like units. Backpropagation computes how much each weight contributed to the error and nudges it in the direction that reduces that error, layer by layer, using the chain rule from calculus.',
    summary:
      'MAIN ARGUMENT: Neural networks learn by adjusting weighted connections through backpropagation.\nKEY POINTS:\n- Inspired by biological neurons but mathematically simplified\n- Backpropagation uses the chain rule to compute gradients\n- Activation functions introduce non-linearity, letting networks model complex patterns\n- Overfitting is controlled with regularisation, dropout, and validation splits\nIMPLICATIONS: These fundamentals are the prerequisite for understanding architectures like Transformers or CNNs.',
    topic: 'machine-learning',
    keywords: ['Neural Networks', 'Backpropagation', 'Activation Functions', 'Deep Learning'],
    tier: 'mastered',
    createdDaysAgo: 24,
    cards: [
      { type: 'qa', front: 'What is backpropagation?', back: 'An algorithm that computes the gradient of the loss with respect to each weight using the chain rule, so the network knows how to adjust every weight.' },
      { type: 'qa', front: 'Why do neural networks need activation functions?', back: "To introduce non-linearity. Without them, stacking layers would collapse into a single linear transformation." },
      { type: 'cloze', front: '[...] is a technique that randomly disables neurons during training to reduce overfitting.', back: 'Dropout' },
      { type: 'qa', front: 'What does an epoch mean in training?', back: 'One complete pass through the entire training dataset.' },
      { type: 'definition', front: 'Gradient descent', back: 'An optimisation algorithm that iteratively adjusts parameters in the direction that most reduces the loss function.' },
      { type: 'qa', front: 'What commonly causes vanishing gradients?', back: 'Very deep networks using saturating activation functions like sigmoid, where gradients shrink as they propagate backward.' },
    ],
  },
  {
    title: 'Attention Is All You Need',
    body: 'The Transformer architecture replaces recurrence entirely with self-attention, letting every token in a sequence attend to every other token in parallel. Positional encodings are added so the model retains a sense of order despite having no recurrence.',
    summary:
      "MAIN ARGUMENT: The Transformer architecture replaces recurrence entirely with self-attention.\nKEY POINTS:\n- Self-attention lets every token attend to every other token in parallel\n- Positional encodings inject sequence order since there's no recurrence\n- Multi-head attention lets the model attend to different representation subspaces at once\n- Transformers scale better than RNNs because they parallelise across the sequence\nIMPLICATIONS: This architecture underpins nearly all modern large language models.",
    topic: 'machine-learning',
    keywords: ['Transformers', 'Self-Attention', 'Positional Encoding', 'Neural Networks'],
    tier: 'strong',
    createdDaysAgo: 19,
    cards: [
      { type: 'qa', front: 'What problem does self-attention solve compared to RNNs?', back: 'It allows parallel processing of a whole sequence instead of processing tokens one at a time.' },
      { type: 'cloze', front: 'Since Transformers have no recurrence, [...] are added to give the model a sense of token order.', back: 'positional encodings' },
      { type: 'qa', front: 'What is multi-head attention?', back: 'Running several attention operations in parallel, each learning to focus on different relationships in the data.' },
      { type: 'definition', front: 'Self-attention', back: 'A mechanism where each token in a sequence computes a weighted representation of all other tokens, including itself.' },
      { type: 'qa', front: 'Why do Transformers scale well on GPUs?', back: 'Because self-attention processes the whole sequence in parallel rather than sequentially like an RNN.' },
    ],
  },
  {
    title: 'Photosynthesis and Cellular Respiration',
    body: "Photosynthesis converts light energy into glucose and releases oxygen as a byproduct. Cellular respiration runs the reverse: breaking glucose down in the presence of oxygen to release usable energy as ATP. Together they form the energy cycle most life depends on.",
    summary:
      'MAIN ARGUMENT: Photosynthesis and cellular respiration are complementary energy-conversion processes.\nKEY POINTS:\n- Photosynthesis converts light energy into glucose, releasing oxygen\n- Cellular respiration breaks glucose back down to release usable energy (ATP)\n- The two processes form a cycle balancing atmospheric oxygen and CO2\n- Chlorophyll absorbs light mainly in the red and blue wavelengths\nIMPLICATIONS: This cycle underlies nearly all energy flow in living ecosystems.',
    topic: 'science',
    keywords: ['Photosynthesis', 'Cellular Respiration', 'Chlorophyll', 'ATP'],
    tier: 'mastered',
    createdDaysAgo: 22,
    cards: [
      { type: 'qa', front: 'What is the main pigment that absorbs light in photosynthesis?', back: 'Chlorophyll' },
      { type: 'cloze', front: 'Photosynthesis produces [...] as a waste product.', back: 'oxygen' },
      { type: 'qa', front: 'What molecule stores usable energy in cells?', back: 'ATP (adenosine triphosphate)' },
      { type: 'definition', front: 'Cellular respiration', back: 'The process of breaking down glucose in the presence of oxygen to release energy as ATP.' },
      { type: 'qa', front: 'Which wavelengths of light does chlorophyll absorb best?', back: 'Red and blue light.' },
      { type: 'qa', front: 'What gas do plants absorb from the atmosphere for photosynthesis?', back: 'Carbon dioxide' },
    ],
  },
  {
    title: 'The Roman Republic',
    body: 'The Roman Republic split power between elected consuls, the Senate, and popular assemblies, relying as much on unwritten norms as on formal law. Rapid territorial expansion strained that balance and fed the civil conflict that eventually ended the Republic.',
    summary:
      "MAIN ARGUMENT: The Roman Republic's system of checks and balances shaped Western political thought.\nKEY POINTS:\n- Power was split between elected consuls, the Senate, and popular assemblies\n- The Republic relied on unwritten norms as much as formal law\n- Expansion strained the constitution and fuelled civil conflict\n- The Republic collapsed into the Roman Empire under Augustus in 27 BCE\nIMPLICATIONS: Many modern constitutional systems borrow directly from Roman republican structures.",
    topic: 'history',
    keywords: ['Roman Republic', 'Senate', 'Consuls', 'Ancient Rome'],
    tier: 'new',
    createdDaysAgo: 2,
    cards: [
      { type: 'qa', front: 'Who held the highest elected office in the Roman Republic?', back: 'The two consuls, who served one-year terms and could veto each other.' },
      { type: 'definition', front: 'Senate', back: 'An assembly of Roman elders and former magistrates that advised on law and foreign policy.' },
      { type: 'qa', front: 'In what year did the Roman Republic end?', back: ' 27 BCE, when Augustus became the first emperor.' },
      { type: 'cloze', front: "The Roman Republic's system of [...] and balances influenced later constitutions.", back: 'checks' },
      { type: 'qa', front: "What fuelled much of the Republic's late civil conflict?", back: 'Strain from rapid territorial expansion and growing inequality between elites and common citizens.' },
    ],
  },
  {
    title: 'REST API Design Principles',
    body: 'REST treats resources, not actions, as the core abstraction: nouns addressed by URLs, with HTTP verbs expressing the action. Statelessness means every request must carry all the context needed to process it, since the server keeps no session between calls.',
    summary:
      'MAIN ARGUMENT: Good REST API design treats resources, not actions, as the core abstraction.\nKEY POINTS:\n- Resources are nouns, addressed by URLs; HTTP verbs express the action\n- Statelessness means each request must carry all context needed to process it\n- Proper status codes communicate outcomes without clients parsing response bodies\n- Versioning strategy should be decided early to avoid breaking existing clients\nIMPLICATIONS: Consistent REST conventions make APIs predictable and easier to document.',
    topic: 'technology',
    keywords: ['REST', 'API Design', 'HTTP', 'Statelessness'],
    tier: 'learning',
    createdDaysAgo: 11,
    cards: [
      { type: 'qa', front: 'What HTTP method is typically used to partially update a resource?', back: 'PATCH' },
      { type: 'definition', front: 'Statelessness', back: 'Each API request must contain all information needed to process it; the server keeps no session context between requests.' },
      { type: 'qa', front: "What status code means 'created successfully'?", back: '201 Created' },
      { type: 'cloze', front: 'In REST, URLs should represent [...] rather than actions.', back: 'resources' },
      { type: 'qa', front: 'Why is API versioning important?', back: "It lets you evolve an API without breaking clients that depend on the older behaviour." },
    ],
  },
  {
    title: 'Lean Startup Methodology',
    body: 'The Lean Startup approach treats a business plan as a set of testable hypotheses rather than a fixed roadmap. A Minimum Viable Product tests the riskiest assumption with the least possible effort, and the Build-Measure-Learn loop turns customer feedback into the next iteration.',
    summary:
      "MAIN ARGUMENT: Startups succeed by validating assumptions through rapid, measurable experiments.\nKEY POINTS:\n- Build-Measure-Learn is the core iterative loop\n- A Minimum Viable Product tests a hypothesis with the least effort possible\n- Vanity metrics feel good but don't inform decisions; actionable metrics do\n- Pivoting is a structured course correction, not a failure\nIMPLICATIONS: Treating a business plan as testable hypotheses reduces wasted effort on unvalidated ideas.",
    topic: 'business',
    keywords: ['Lean Startup', 'MVP', 'Build-Measure-Learn', 'Pivot'],
    tier: 'struggling',
    createdDaysAgo: 15,
    cards: [
      { type: 'qa', front: 'What does MVP stand for in Lean Startup?', back: 'Minimum Viable Product' },
      { type: 'definition', front: 'Pivot', back: "A structured change in strategy after testing shows the current approach isn't working, without abandoning the overall vision." },
      { type: 'qa', front: 'What is the core iterative loop in Lean Startup?', back: 'Build-Measure-Learn' },
      { type: 'cloze', front: "[...] metrics look impressive but don't help decision-making, unlike actionable metrics.", back: 'Vanity' },
      { type: 'qa', front: 'Why build an MVP instead of a full product?', back: 'To test a core hypothesis with customers using the least time and resources possible.' },
    ],
  },
  {
    title: 'Sleep and Circadian Rhythms',
    body: "Circadian rhythms are regulated by the suprachiasmatic nucleus, the brain's master clock, which syncs to light exposure. Blue light in particular suppresses melatonin production, and a full sleep cycle, alternating REM and non-REM stages, takes roughly 90 minutes.",
    summary:
      "MAIN ARGUMENT: Circadian rhythms regulate sleep through internal biological clocks synced to light.\nKEY POINTS:\n- The suprachiasmatic nucleus acts as the brain's master clock\n- Light exposure, especially blue light, suppresses melatonin production\n- Sleep cycles through REM and non-REM stages roughly every 90 minutes\n- Chronic circadian disruption is linked to metabolic and mood disorders\nIMPLICATIONS: Consistent light exposure and sleep timing meaningfully affect long-term health.",
    topic: 'health',
    keywords: ['Circadian Rhythm', 'Sleep', 'Melatonin', 'REM Sleep'],
    tier: 'learning',
    createdDaysAgo: 9,
    cards: [
      { type: 'qa', front: "What brain structure acts as the body's master clock?", back: 'The suprachiasmatic nucleus (SCN)' },
      { type: 'definition', front: 'Melatonin', back: "A hormone released in response to darkness that signals the body it's time to sleep." },
      { type: 'qa', front: 'Roughly how long is one full sleep cycle?', back: 'About 90 minutes' },
      { type: 'cloze', front: '[...] light exposure in the evening is particularly disruptive to melatonin production.', back: 'Blue' },
      { type: 'qa', front: 'What sleep stage is associated with vivid dreaming?', back: 'REM (Rapid Eye Movement) sleep' },
      { type: 'qa', front: 'What health issues are linked to chronic circadian disruption?', back: 'Metabolic disorders and mood disorders.' },
    ],
  },
  {
    title: 'Climate Change: Causes and Effects',
    body: 'Human greenhouse gas emissions, mainly from burning fossil fuels, are the dominant driver of recent global warming. CO2 and methane trap heat by absorbing infrared radiation, and feedback loops like melting ice reducing reflectivity can accelerate the process further.',
    summary:
      'MAIN ARGUMENT: Human greenhouse gas emissions are the dominant driver of recent global warming.\nKEY POINTS:\n- CO2 and methane trap heat by absorbing infrared radiation\n- Fossil fuel combustion is the largest single source of emissions\n- Feedback loops, like melting ice reducing reflectivity, can accelerate warming\n- Effects include rising sea levels, extreme weather, and ecosystem disruption\nIMPLICATIONS: Mitigation requires both emissions reduction and adaptation planning.',
    topic: 'science',
    keywords: ['Climate Change', 'Greenhouse Gases', 'Global Warming', 'Carbon Emissions'],
    tier: 'learning',
    createdDaysAgo: 7,
    cards: [
      { type: 'qa', front: 'What are the two main greenhouse gases driving climate change?', back: 'Carbon dioxide and methane' },
      { type: 'definition', front: 'Feedback loop', back: 'A process where an initial change amplifies itself, e.g. melting ice reduces reflectivity, causing more warming and more melting.' },
      { type: 'qa', front: 'What is the largest human source of CO2 emissions?', back: 'Burning fossil fuels' },
      { type: 'cloze', front: 'Greenhouse gases trap heat by absorbing [...] radiation.', back: 'infrared' },
      { type: 'qa', front: 'Name one effect of rising global temperatures on oceans.', back: 'Rising sea levels from thermal expansion and melting ice sheets.' },
    ],
  },
  {
    title: 'Docker and Containerization',
    body: 'Containers package an application with everything it needs to run consistently anywhere, sharing the host OS kernel rather than bundling a full guest OS like a virtual machine does. Dockerfiles declaratively describe how to build an image layer by layer.',
    summary:
      'MAIN ARGUMENT: Containers package an application with everything it needs to run consistently anywhere.\nKEY POINTS:\n- Containers share the host OS kernel, making them lighter than virtual machines\n- Images are immutable snapshots; containers are running instances of images\n- Dockerfiles declaratively describe how to build an image layer by layer\n- Container orchestration (e.g. Kubernetes) manages scaling and networking across many containers\nIMPLICATIONS: Containerisation is foundational to modern, portable deployment pipelines.',
    topic: 'technology',
    keywords: ['Docker', 'Containers', 'DevOps', 'Kubernetes'],
    tier: 'new',
    createdDaysAgo: 1,
    cards: [
      { type: 'qa', front: "What's the key difference between a container and a virtual machine?", back: 'Containers share the host OS kernel, so they start faster and use fewer resources than VMs, which each run a full guest OS.' },
      { type: 'definition', front: 'Docker image', back: 'An immutable snapshot containing an application and everything it needs to run; containers are running instances of an image.' },
      { type: 'qa', front: 'What file declares how to build a Docker image?', back: 'A Dockerfile' },
      { type: 'cloze', front: 'Tools like Kubernetes handle container [...]: scaling, networking, and scheduling across many machines.', back: 'orchestration' },
    ],
  },
]

// Which notes an earlier "Clarify with AI" pass would plausibly have linked,
// expressed as [sourceIndex, targetIndex, strength, reason] into SEED_DOCUMENTS.
const SEED_RELATIONSHIPS: Array<[number, number, number, string]> = [
  [1, 0, 0.75, 'Both cover core deep learning architecture concepts, with the Transformer building directly on neural network fundamentals.'],
  [7, 2, 0.55, 'Both involve the carbon cycle: photosynthesis absorbs the CO2 that greenhouse gas emissions increase.'],
  [8, 4, 0.65, 'Both are core backend engineering practices commonly used together in deployment pipelines.'],
]

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

// A varied spread of fake study sessions over the last couple of weeks, so the Progress dashboard's charts show real shape.
function buildSeedSessions(): Array<{ completedAt: Date; cardCount: number; correctCount: number; durationMs: number }> {
  const sessionPlans = [
    { daysAgo: 16, cardCount: 5, correctRate: 0.6 },
    { daysAgo: 14, cardCount: 8, correctRate: 0.75 },
    { daysAgo: 13, cardCount: 4, correctRate: 0.75 },
    { daysAgo: 11, cardCount: 9, correctRate: 0.78 },
    { daysAgo: 9, cardCount: 6, correctRate: 0.83 },
    { daysAgo: 8, cardCount: 7, correctRate: 0.86 },
    { daysAgo: 6, cardCount: 5, correctRate: 0.8 },
    { daysAgo: 5, cardCount: 10, correctRate: 0.9 },
    { daysAgo: 3, cardCount: 6, correctRate: 0.83 },
    { daysAgo: 2, cardCount: 8, correctRate: 0.88 },
    { daysAgo: 1, cardCount: 7, correctRate: 0.86 },
  ]

  return sessionPlans.map(plan => ({
    completedAt: daysFromNow(-plan.daysAgo),
    cardCount: plan.cardCount,
    correctCount: Math.round(plan.cardCount * plan.correctRate),
    durationMs: plan.cardCount * (12000 + Math.round(Math.random() * 8000)),
  }))
}

export async function seedDemoDataIfEmpty(): Promise<void> {
  const existingCount = await db.documents.count()
  if (existingCount > 0) return // real (or already-seeded) data exists — never overwrite it

  const documentIds: number[] = []

  for (const seedDoc of SEED_DOCUMENTS) {
    const documentId = await db.documents.add({
      title: seedDoc.title,
      rawText: seedDoc.body,
      contentHtml: `<p>${seedDoc.body}</p>`,
      summary: seedDoc.summary,
      wordCount: wordCount(seedDoc.body),
      sourceType: 'text',
      topic: seedDoc.topic,
      topicKeywords: seedDoc.keywords,
      createdAt: daysFromNow(-seedDoc.createdDaysAgo),
      cardCount: seedDoc.cards.length,
    })
    documentIds.push(documentId)

    await db.cards.bulkAdd(
      seedDoc.cards.map(card => ({
        documentId,
        front: card.front,
        back: card.back,
        type: card.type,
        createdAt: daysFromNow(-seedDoc.createdDaysAgo),
        ...tierCardState(seedDoc.tier),
      }))
    )
  }

  await db.relationships.bulkAdd(
    SEED_RELATIONSHIPS.map(([sourceIndex, targetIndex, strength, reason]) => ({
      sourceDocumentId: documentIds[sourceIndex],
      targetDocumentId: documentIds[targetIndex],
      relationshipType: 'related',
      strength,
      reason,
      createdAt: new Date(),
    }))
  )

  await db.sessions.bulkAdd(buildSeedSessions())
}
