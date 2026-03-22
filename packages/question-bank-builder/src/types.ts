/** A single answer option inside a question. */
export interface Answer {
  text: string;
  correct: boolean;
}

/** One question in a bank. */
export interface RawQuestion {
  /** Stable identifier within its bank (e.g. "Q001"). Auto-assigned if missing. */
  id: string;
  /** Free-text question body. */
  question: string;
  /** Ordered answer options. At least one must have correct=true. */
  answers: Answer[];
  difficulty: "easy" | "medium" | "hard";
  /** Primary topic — used for file splitting. */
  primary_topic: string;
  /** All topics this question belongs to. */
  topics: string[];
  /** Fine-grained tags (e.g. "s3-versioning", "iam-roles"). */
  tags: string[];
  /** Per-question time limit in seconds. Falls back to bank default. */
  time_limit?: number;
  /** AI-assessed question quality (1-5 score + rationale). */
  quality?: { score: number; rationale: string };
}

/** A collection of questions, typically serialised as a `.md` file. */
export interface QuestionBank {
  /** Human-readable bank name (becomes `# Question Bank: <name>`). */
  title: string;
  /** Canonical topic list established in Phase 1; every question's primary_topic is from this set. */
  topics: string[];
  /** Bank-level default time in seconds. */
  default_time_limit: number;
  /** Optional one-line description. */
  description?: string;
  questions: RawQuestion[];
}

export interface BuilderOptions {
  inputPath: string;
  outputDir?: string;
  enrich?: boolean;
  bankPrefix?: string;
}

export interface EnrichmentConfig {
  bedrockModelId: string;
  awsRegion: string;
  concurrency?: number;
  limit?: number;
  topicBatchSize?: number;
}
