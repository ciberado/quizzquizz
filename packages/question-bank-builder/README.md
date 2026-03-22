# Question Bank Builder (`@quizzquizz/question-bank-builder`)

A TypeScript CLI tool that reads JSONL question banks, enriches them with AI (Amazon Bedrock via LangGraph), classifies them by topic, and generates Markdown question-bank files compatible with the [`@quizzquizz/question-bank`](../question-bank/) parser.

> **Standalone offline tool** — not started by `npm run dev`. Run it manually when you need to produce or update question banks under `question-banks/`.

## Architecture Overview

The package is organized into focused modules:

- **`cli.ts`**: Entry point handling command-line arguments via yargs
- **`transform.ts`**: Core transformation engine with format detection and conversion
- **`markdown.ts`**: Markdown parser/serializer using unified/remark ecosystem
- **`ai_samples.ts`**: Handles AI-JSON format (array-based structure with discussion fields)
- **`enrich.ts`**: AI enrichment using LangGraph ReAct agents with Amazon Bedrock
- **`types.ts`**: TypeScript definitions for all data structures
- **`logger.ts`**: Winston-based logging with daily rotation and structured output
- **`utils.ts`**: Shared utilities for title inference and slug formatting

## Quick Start

```bash
# Build the package
npm run build -w @quizzquizz/question-bank-builder

# Classify JSONL questions with a topic taxonomy → per-category Markdown quiz files
npx question-bank-builder classify \
  --input samples/source.jsonl \
  --topics samples/topics.json \
  --output-dir ../../question-banks/science/ \
  --prefix physics \
  --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --aws-region us-east-1

# Transform + enrich + split by topic → Markdown files into question-banks/
npx question-bank-builder \
  --input input.json \
  --output-dir ../../question-banks/ \
  --prefix saa-c03 \
  --enrich \
  --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --aws-region us-east-1

# Process only first 5 questions for testing
npx question-bank-builder \
  --input large-bank.json \
  --output-dir output/ \
  --prefix test \
  --enrich --limit 5 \
  --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --aws-region us-east-1
```

## Supported Formats

### 1. Markdown (.md)
Human-readable format with structured headings for questions, answers, topics, services, and metadata.

```markdown
# Quiz Title

## Question 1

Question prompt paragraph

### Correct answers
* Single correct answer

### Incorrect answers  
* Distractor A
* Distractor B
* Distractor C

### Topics
* exam-topic-1
* exam-topic-2

### Services
* aws-service-1
* aws-service-2

### Metadata
* Category: Quiz title
* Difficulty: medium
* Type: multiple
* Hint: Optional enrichment metadata

### Discussion
* Optional community notes
```

The **Topics** section contains AWS exam topics this question covers (e.g., "shared-responsibility-model", "well-architected-framework").
The **Services** section lists AWS services mentioned or requiring knowledge (e.g., "amazon-ec2", "aws-iam", "amazon-s3").

### 2. JSON - Trivia Server Format
Standard format used by the trivia-server package:

```json
{
  "title": "AWS basic networking", 
  "response_code": 0,
  "results": [
    {
      "category": "AWS basic networking",
      "type": "multiple", 
      "difficulty": "medium",
      "question": "...",
      "correct_answer": "...",
      "incorrect_answers": ["..."],
      "topics": ["vpc-fundamentals", "network-isolation"],
      "services": ["amazon-vpc", "aws-regions"],
      "metadata": {
        "hint": "Optional metadata"
      }
    }
  ]
}
```

### 3. AI-JSON Format
Array-based format optimized for AI training/testing:

```json
[
  {
    "code": "Question 1",
    "question": "...", 
    "correct": ["..."],
    "incorrect": ["...", "...", "..."],
    "topics": ["shared-responsibility-model", "security-best-practices"],
    "services": ["aws-iam", "aws-iam-identity-center"],
    "discussion": ["Community discussion entries"],
    "category": "Topic",
    "difficulty": "medium"
  }
]
```

## Compatibility with QuizzQuizz

The Markdown files this tool generates follow the [QuizzQuizz question-bank format](../../vibe/QUESTION-BANK-FORMAT.md):

- `# Question Bank: <name>`, `## Metadata`, `## Questions`, `### <id>` structure
- `**Difficulty**`, `**Topics**`, `**Tags**`, `**Time Limit**` per-question attributes
- `- [x]` / `- [ ]` answer syntax with auto-generated answer IDs

The builder's internal `RawQuestion` type is a superset of what the downstream parser (`@quizzquizz/question-bank`) expects. Extra fields like `primary_topic` and `quality` are either serialised as informational Markdown attributes (silently ignored by the runtime parser) or used only for file-splitting decisions.

**Generated `.md` files can be copied directly into `question-banks/` and loaded by the API server without modification.**

## Data Flow & Transform Process

1. **Input Detection**: Auto-detects format by file extension (`.md`, `.json`) or explicit `--input-format`
2. **Parse**: Loads content using format-specific parsers:
   - Markdown: unified/remark AST parsing with custom node handlers
   - JSON: Direct JSON.parse with normalization based on structure detection
   - AI-JSON: Array structure validation and field mapping
3. **Normalize**: Converts to internal `QuestionBank` structure with `RawQuestion[]`
4. **Enrich (Optional)**: AI enhancement via LangGraph ReAct agents
5. **Serialize**: Outputs to target format with proper structure

## Internal Data Model

Core TypeScript interfaces:

```typescript
interface RawQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  topics?: string[];
  services?: string[];
  metadata?: Record<string, string>;
  discussion?: string[];
  correct_explanation?: string;
  incorrect_explanations?: string[];
}

interface QuestionBank {
  title: string;
  questions: RawQuestion[];
}
```

## CLI Options Reference

### Core Options
- `--input` (`-i`): Source question bank path (required)
- `--output` (`-o`): Destination file (defaults to input with opposite extension)
- `--input-format`: Force format detection (`markdown`, `json`, `ai-json`, `auto`)
- `--output-format`: Target format (`markdown`, `json`, `ai-json`)
- `--verbose` (`-v`): Enable debug logging for detailed trace output

### AI Enrichment Options
- `--enrich`: Enable Amazon Bedrock enrichment via LangGraph
- `--limit`: Limit number of questions to process and output (e.g., `--limit 10` processes first 10 questions only)
- `--enrichment-profile`: Apply preset configuration:
  - `difficulty-balancer`: Adjust difficulty labels for AWS certification level
  - `explain-like-i5`: Simplify language for beginners
  - `topic-extractor`: Focus on identifying exam topics and AWS services
- `--bedrock-model-id`: Bedrock model ID (e.g., `anthropic.claude-3-haiku-20240307-v1:0`)
- `--aws-region`: AWS region for Bedrock API
- `--instruction`: Custom enrichment prompt (overrides profile)
- `--metadata-keys`: Comma-separated metadata keys to request from AI
- `--extract-topics`: Enable automatic topic extraction (default: true)
- `--extract-services`: Enable automatic AWS service identification (default: true)
- `--exam-guide`: Path to exam guide file for topic/service reference
- `--concurrency`: Number of concurrent enrichment workers (default: 1)

## AWS Exam Integration

### Topics and Services Support

The question-bank-builder automatically identifies and tags questions with relevant AWS exam topics and services:

- **Topics**: Exam concepts like "shared-responsibility-model", "well-architected-framework", "high-availability"
- **Services**: AWS services like "amazon-ec2", "aws-iam", "amazon-s3", "aws-lambda"

These are extracted during AI enrichment or can be manually specified in Markdown format.

## AI Enrichment System

### LangGraph Integration
The enrichment system uses LangGraph's ReAct (Reasoning + Acting) agents with Amazon Bedrock. The agent:

1. **Analyzes** each question for clarity, difficulty alignment, and educational value
2. **Reasons** about improvements needed based on instruction/profile
3. **Acts** by generating enhanced question content and metadata
4. **Validates** that transformations maintain question integrity

### Enrichment Profiles

**`difficulty-balancer`**
- Ensures difficulty labels match AWS certification expectations
- Adds rationale, target audience, and topic metadata
- Focuses on associate-level alignment

**`explain-like-i5`**
- Rewrites for accessibility to AWS beginners
- Adds hint and summary metadata fields
- Simplifies technical language while preserving accuracy

### Concurrency & Reliability

Environment variables for production tuning:

- `ENRICH_CONCURRENCY` (default `3`): Simultaneous Bedrock API workers
- `ENRICH_MAX_RETRIES` (default `3`): Retry attempts per question
- `ENRICH_RETRY_BASE_MS` (default `500`): Exponential backoff base delay

**Limited Processing**: Use `--limit N` to process only the first N questions from the input. This is useful for:
- **Testing enrichment**: Quick validation on small subsets before processing large datasets
- **Incremental processing**: Breaking large question banks into manageable chunks  
- **Cost control**: Limiting AI API usage during development
- **Quality sampling**: Generating enriched samples for review

When using `--limit` with `--enrich`, the CLI efficiently loads the full question bank but only processes the limited subset during enrichment, ensuring the output file contains only the processed questions without copying the entire original dataset.

**Exam Guide Integration**: Use `--exam-guide path/to/guide.md` to constrain enrichment to specific exam topics and AWS services. The exam guide should contain lists of relevant concepts and services that the AI will use to ensure questions align with certification requirements. Combine with `--extract-topics` and `--extract-services` to automatically identify and tag relevant exam domains.

**Error Handling**: Questions that fail enrichment after retries are logged as warnings but don't halt the overall process.

### AWS Configuration

Required for enrichment operations:

```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# Run with enrichment
npx question-bank-builder --input input.md --enrich --output enriched.json
```

## Logging & Observability

### Winston Integration
- **Console**: Colorized structured logs with timestamps
- **File**: Daily rotation in `packages/question-bank-builder/logs/`
- **Levels**: `error`, `warn`, `info` (default), `debug` (with `--verbose`)

### Key Log Events
- Format detection and normalization steps
- Question-by-question enrichment progress
- Retry attempts and failure reasons
- Performance metrics (timing, throughput)

Example debug output:
```
2024-12-11T10:30:15.123Z debug: Loading question bank {"filePath":"/path/to/input.md","requestedFormat":"auto","resolvedFormat":"markdown"}
2024-12-11T10:30:15.234Z info: Enrichment run starting {"questionCount":10,"profile":"difficulty-balancer"}
2024-12-11T10:30:15.567Z debug: Invoking enrichment agent {"promptPreview":"Review each trivia question and ensure..."}
```

## Implementation Details

### Format Detection Logic
- **Auto-detection**: Based on file extension (`.md`/`.markdown` → markdown, `.json` → json)
- **JSON Disambiguation**: Arrays detect as `ai-json`, objects with `results` array detect as `json`
- **Override**: Explicit `--input-format` bypasses detection

### Markdown AST Processing
Uses unified/remark pipeline:
1. **Parse**: String → MDAST (Markdown Abstract Syntax Tree)
2. **Traverse**: Walk heading hierarchy to identify question boundaries
3. **Extract**: Pull question text, answers, metadata from structured sections
4. **Validate**: Ensure required fields (prompt, correct/incorrect answers) present

Key parsing rules:
- `# Heading` → Quiz title
- `## Heading` → Question boundary  
- `### Correct answers` → List items become correct answers
- `### Incorrect answers` → List items become distractors
- `### Metadata` → Key:Value pairs in list items
- `### Discussion` → Free-form content for community notes

### JSON Normalization
Handles structural variations:
- **Server format**: `{title, response_code, results: [...]}` structure
- **AI format**: Direct arrays or array-wrapped content
- **Field mapping**: Maps between naming conventions (`correct_answer` vs `correct`)

### Error Recovery
- **Malformed questions**: Log warnings, skip individual questions
- **Missing sections**: Apply sensible defaults (medium difficulty, multiple type)
- **Invalid JSON**: Surface parse errors with file context
- **Network issues**: Exponential backoff with jitter for AI enrichment

## Common Usage Patterns

### Batch Processing
```bash
# Convert all markdown files in questions directory
for file in packages/trivia-server/questions/*.md; do
  npx question-bank-builder --input "$file" --output-format json
done

# Process large datasets in chunks
npx question-bank-builder --input large-bank.json --output chunk1.json --enrich --limit 50 --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 --aws-region us-east-1
npx question-bank-builder --input large-bank.json --output chunk2.json --enrich --limit 50 --offset 50 --bedrock-model-id anthropic.claude-3-haiku-20240307-v1:0 --aws-region us-east-1
```

### AI Enhancement Workflow
```bash
# 1. Convert source material to markdown
npx question-bank-builder --input scraped-questions.json --input-format ai-json --output draft.md

# 2. Test enrichment on small subset first with exam constraints
npx question-bank-builder --input draft.md --enrich --limit 3 --exam-guide aws-practitioner-key-lists.md --extract-topics --extract-services --output test-enriched.json

# 3. Enrich full dataset for AWS certification alignment
npx question-bank-builder --input draft.md --enrich --exam-guide aws-practitioner-key-lists.md --extract-topics --extract-services --enrichment-profile difficulty-balancer --output balanced.json

# 4. Further enrich for accessibility while maintaining exam focus
npx question-bank-builder --input balanced.json --enrich --enrichment-profile explain-like-i5 --output final.md
```

### Quality Assurance
```bash
# Round-trip test (should preserve content fidelity)
npx question-bank-builder --input original.md --output temp.json
npx question-bank-builder --input temp.json --output roundtrip.md
diff original.md roundtrip.md

# Validate JSON structure
npx question-bank-builder --input questions.md --output-format json
node -e "console.log(JSON.parse(require('fs').readFileSync('questions.json')).results.length)"
```

### Integration with Trivia Server
```bash
# Generate compatible question banks
npx question-bank-builder --input source.md --output packages/trivia-server/questions/new-topic.json

# Verify server can load the output
cd packages/trivia-server && npm run dev
# Check logs for successful question bank loading
```

## File Structure & Dependencies

### Source Organization
```
src/
├── cli.ts           # yargs command-line interface
├── transform.ts     # Core conversion orchestration  
├── markdown.ts      # unified/remark Markdown processing
├── ai_samples.ts    # AI-JSON format handling
├── enrich.ts        # LangGraph + Bedrock AI enrichment
├── types.ts         # TypeScript interfaces
├── logger.ts        # Winston structured logging
├── utils.ts         # Shared utilities
├── env.ts           # Environment configuration loading
└── index.ts         # Module exports
```

### Key Dependencies
- **CLI**: `yargs` for argument parsing with type safety
- **Markdown**: `unified` + `remark-parse` + `remark-stringify` for AST processing
- **AI**: `@langchain/langgraph` + `@langchain/aws` for Bedrock integration
- **Logging**: `winston` + `winston-daily-rotate-file` for production logging
- **Build**: `typescript` + `ts-node` for development and compilation

### Output Artifacts
- **Compiled JS**: `dist/` directory with type declarations
- **CLI binary**: `dist/cli.js` installed as `question-bank-builder` command
- **Logs**: `packages/question-bank-builder/logs/` with daily rotation
- **Temp files**: None (all operations are atomic file writes)

## Troubleshooting

### Common Issues

**"Unable to determine input format"**
- Add explicit `--input-format markdown|json|ai-json`
- Check file extension is `.md`, `.json`

**"Markdown question missing prompt/answers"** 
- Verify heading structure (`### Correct answers`, `### Incorrect answers`)
- Ensure list items under answer sections
- Check for typos in section headings

**"Bedrock enrichment requires both --bedrock-model-id and --aws-region"**
- Set environment variables: `AWS_REGION`, `BEDROCK_MODEL_ID`
- Or use CLI flags: `--aws-region us-east-1 --bedrock-model-id anthropic.claude-3-haiku...`
- Verify AWS credentials are configured

**Enrichment times out or fails**
- Reduce `ENRICH_CONCURRENCY` (default 3)
- Increase `ENRICH_MAX_RETRIES` (default 3) 
- Check AWS service quotas for Bedrock
- Use `--verbose` for detailed error traces

## Evolution & Extension Guide

### Adding New Formats

**1. Define Type Interface**
```typescript
// In types.ts
interface MyCustomFormat {
  questions: CustomQuestion[];
  metadata: FormatMetadata;
}
```

**2. Create Format Module**  
```typescript
// In src/my_format.ts
export function parseCustomFormat(content: string): QuestionBank { }
export function serializeCustomFormat(bank: QuestionBank): MyCustomFormat { }
```

**3. Update Transform Engine**
```typescript
// In transform.ts - detectFormat()
if (content.includes('customFormatMarker')) return 'my-format';

// In loadQuestionBank() and saveQuestionBank()
if (resolvedFormat === 'my-format') {
  return parseCustomFormat(data);
}
```

**4. Add CLI Support**
```typescript
// In cli.ts
.option("input-format", {
  choices: ["markdown", "json", "ai-json", "my-format", "auto"] as const,
})
```

### Custom Enrichment Profiles

**Built-in Profile Pattern:**
```typescript
// In enrich.ts
const ENRICHMENT_PRESETS: Record<string, EnrichmentPreset> = {
  "aws-solutions-architect": {
    instruction: "Enhance questions for AWS Solutions Architect Associate level. Focus on architectural decision-making, cost optimization, and service integration patterns.",
    metadataKeys: ["architecture_domain", "cost_consideration", "integration_pattern"]
  },
  "beginner-friendly": {
    instruction: "Simplify technical jargon and add contextual explanations. Ensure questions test fundamental understanding rather than memorization.",
    metadataKeys: ["simplified_explanation", "prerequisite_knowledge", "related_concepts"]
  }
}
```

**Dynamic Profile Loading:**
```typescript
// Future enhancement: load profiles from external config
const profilePath = process.env.ENRICHMENT_PROFILES_PATH;
const customProfiles = profilePath ? require(profilePath) : {};
const allProfiles = { ...ENRICHMENT_PRESETS, ...customProfiles };
```

### Markdown Extensions

**New Section Types:**
```typescript
// In markdown.ts - buildQuestionFromNodes()
if (headingText === "prerequisites") {
  result.prerequisites = extractListValues(section);
} else if (headingText === "explanations") {
  result.detailed_explanation = section.map(extractText).join("\n");
}
```

**Custom Metadata Processing:**
```typescript
// Support nested metadata structures
if (key.includes('.')) {
  const [parent, child] = key.split('.');
  metadata[parent] = metadata[parent] || {};
  metadata[parent][child] = value;
}
```

### AI Enrichment Extensions

**Custom Model Integration:**
```typescript
// In enrich.ts - support multiple AI providers
async function createEnrichmentAgent(config: EnrichmentConfig) {
  if (config.provider === 'openai') {
    return createOpenAIAgent(config);
  } else if (config.provider === 'anthropic-direct') {
    return createAnthropicAgent(config);  
  }
  return createBedrockAgent(config); // default
}
```

**Enrichment Pipelines:**
```typescript
// Sequential enrichment stages
const stages = [
  { profile: 'difficulty-balancer', target: 'difficulty_metadata' },
  { profile: 'explain-like-i5', target: 'accessibility_metadata' },
  { profile: 'aws-exam-prep', target: 'exam_metadata' }
];

for (const stage of stages) {
  bank = await enrichQuestionBank(bank, config, stage.profile);
}
```

### Performance Optimizations

**Streaming Processing:**
```typescript
// For large question banks
async function* streamQuestionEnrichment(questions: RawQuestion[]) {
  for (const question of questions) {
    yield await enrichSingleQuestion(question);
  }
}
```

**Caching Layer:**
```typescript
// Cache enrichment results
const enrichmentCache = new Map<string, EnrichedQuestion>();
const questionHash = crypto.createHash('md5').update(question.question).digest('hex');
```

**Parallel Format Support:**
```typescript
// Convert to multiple formats simultaneously 
await Promise.all([
  saveQuestionBank(bank, 'output.json', 'json'),
  saveQuestionBank(bank, 'output.md', 'markdown'),
  saveQuestionBank(bank, 'output-ai.json', 'ai-json')
]);
```

### Integration Opportunities

**Web Service Mode:**
```typescript
// Express.js API for format conversion
app.post('/transform', async (req, res) => {
  const { content, inputFormat, outputFormat } = req.body;
  const result = await transformQuestionBank(content, { inputFormat, outputFormat });
  res.json(result);
});
```

**VS Code Extension:**
```typescript
// Command palette integration
vscode.commands.registerCommand('trivia.convertQuestionBank', async () => {
  const editor = vscode.window.activeTextEditor;
  const content = editor?.document.getText();
  const converted = await transformQuestionBank(content, options);
  // Display in new editor tab
});
```

**GitHub Actions Integration:**
```yaml
# .github/workflows/validate-questions.yml
- name: Validate Question Banks
  run: |
    npx question-bank-builder --input "questions/*.md" --output-format json --validate-only
```

### Monitoring & Analytics

**Enrichment Quality Metrics:**
```typescript
interface EnrichmentMetrics {
  questionsProcessed: number;
  enrichmentLatency: number[];
  failureRate: number;
  tokenUsage: number;
  qualityScores: number[];
}
```

**Content Analysis:**
```typescript
// Track question bank evolution
function analyzeQuestionBank(bank: QuestionBank): BankAnalytics {
  return {
    difficultyDistribution: countByDifficulty(bank.questions),
    categorySpread: countByCategory(bank.questions),
    averageAnswerLength: computeAverageAnswerLength(bank.questions),
    vocabularyComplexity: analyzeVocabulary(bank.questions)
  };
}
```

This documentation serves as a comprehensive reference for understanding, using, and evolving the question-bank-builder package. It captures both the current implementation details and provides guidance for future enhancements.
