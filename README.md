# Pepper Pal

Official Peppercoin community assistant for Telegram.

## Overview

Pepper Pal is a Telegram bot that serves as an official information assistant for the Peppercoin community. It provides instant access to official resources, answers questions about Peppercoin, and helps onboard new community members.

**What Pepper Pal does:**
- Provides instant access to official links and resources via quick commands
- Answers Peppercoin-related questions using AI with comprehensive knowledge base
- Shares contract addresses, exchange listings, and network details
- Assists with onboarding new community members
- Guides users on buying, staking, and governance

**What Pepper Pal does NOT do:**
- Price predictions or trading advice
- Financial recommendations
- Security audits or scam detection
- Wallet or transaction analysis

## Requirements

- Node.js 18.0.0 or higher
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- OpenRouter API key (for AI-powered responses)
- Vercel account (for production deployment)

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pepperpal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   BOT_TOKEN=your_bot_token_here
   BOT_USERNAME=YourBotUsername
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=your_openrouter_model_name
   ```

4. **Run the bot**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

### Production Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete production deployment guide to Vercel.

**Quick deployment checklist:**
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel
4. Deploy → Get webhook URL
5. Set Telegram webhook
6. Follow [PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md)

**Emergency procedures:** See [ROLLBACK.md](ROLLBACK.md)

## Commands

### User Commands

#### Quick Commands (Static Responses)
Instant access to official resources - no AI processing required.

| Command | Description |
|---------|-------------|
| `/website` | Official Peppercoin website |
| `/contract` | PEPPER token contract address |
| `/buy` | How to buy PEPPER (exchanges and DEX) |
| `/stake` | Staking information and Pepper Inc |
| `/governance` | Pepper Inc governance details |
| `/twitter` or `/x` | Official Twitter/X account |
| `/telegram` | Official Telegram community |
| `/coingecko` | CoinGecko listing page |
| `/explorer` | Chiliz Chain block explorer |
| `/chain` | Chiliz Chain network details |
| `/links` | All official links in one message |
| `/tokenomics` | Token supply and distribution info |

#### General Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and bot introduction |
| `/help` | Show all commands and usage instructions |
| `/ask <question>` | Ask a question about Peppercoin (AI-powered) |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/mode` | View or change bot mode (normal/silent/maintenance) |
| `/refresh_knowledge` | Reload knowledge files from disk |
| `/knowledge_status` | View knowledge system status and version |
| `/health` | View bot health and system status |
| `/stats` | View aggregate usage metrics |

## Bot Modes (Admin Only)

Administrators can control bot behavior using `/mode <mode>`:

| Mode | Behavior |
|------|----------|
| `normal` | Default behavior, responds as expected |
| `silent` | Ignores all group messages |
| `maintenance` | Replies with maintenance notice only |

## Group Chat Behavior

In group chats, Pepper Pal only responds when:
- Mentioned directly (`@PepperPal_Bot`)
- A command is used (`/start`, `/help`)

This keeps conversations clean and prevents spam.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | Yes | Telegram bot token from BotFather |
| `BOT_USERNAME` | Yes | Bot username without @ |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for AI features |
| `OPENROUTER_MODEL` | No | Model to use (default: xiaomi/mimo-v2-flash:free) |
| `OPENROUTER_TEMPERATURE` | No | Response randomness 0-1 (default: 0.1) |
| `OPENROUTER_MAX_TOKENS` | No | Max response tokens (default: 800) |
| `OPENROUTER_TIMEOUT_MS` | No | Request timeout ms (default: 30000) |
| `ADMIN_USER_IDS` | No | Comma-separated admin user IDs |
| `RATE_LIMIT_MAX` | No | Max messages per window (default: 5) |
| `RATE_LIMIT_WINDOW` | No | Rate limit window in seconds (default: 60) |
| `LOG_LEVEL` | No | DEBUG, INFO, WARN, ERROR (default: INFO) |
| `NODE_ENV` | No | development or production |

## Project Structure

```
pepperpal/
├── src/
│   ├── bot.js              # Telegraf initialization and command registration
│   ├── config.js           # Environment configuration
│   ├── middleware/
│   │   ├── mentionOnly.js  # Group mention filter
│   │   ├── ignoreBots.js   # Bot message filter
│   │   └── rateLimit.js    # Per-user rate limiting
│   ├── handlers/
│   │   ├── start.js        # /start command
│   │   ├── help.js         # /help command
│   │   ├── ask.js          # /ask command (AI-powered)
│   │   ├── quick.js        # Quick commands (static responses)
│   │   └── fallback.js     # Default message handler
│   ├── admin/
│   │   ├── adminCheck.js   # Admin verification
│   │   └── modes.js        # Bot mode management
│   ├── ai/
│   │   ├── openrouterClient.js  # OpenRouter API client
│   │   ├── systemPrompt.js      # AI behavior rules (v2.2.0)
│   │   ├── responder.js         # AI response pipeline
│   │   └── validator.js         # Response validation
│   ├── knowledge/
│   │   ├── peppercoin.md   # Comprehensive Peppercoin knowledge base
│   │   ├── version.json    # Knowledge version metadata
│   │   ├── loader.js       # Knowledge loading & caching
│   │   ├── validator.js    # File validation logic
│   │   └── refresher.js    # Admin refresh handlers
│   ├── safety/
│   │   ├── duplicateGuard.js    # Duplicate request suppression
│   │   ├── responseLimiter.js   # Response length guards
│   │   └── outputSanitizer.js   # Final output safety filter + markdown stripping
│   ├── monitoring/
│   │   ├── stats.js        # Aggregate metrics tracking
│   │   ├── health.js       # /health command handler
│   │   └── statsHandler.js # /stats command handler
│   └── utils/
│       └── logger.js       # Structured logging
├── index.js                # Entry point
├── package.json
├── .env.example
└── README.md
```

## Knowledge System

Pepper Pal uses a comprehensive, file-based knowledge system as the single source of truth for Peppercoin information.

### Knowledge Files

- `src/knowledge/peppercoin.md` — Comprehensive Peppercoin information (11,366+ characters)
  - Quick reference table
  - Tokenomics (8.88 quadrillion max supply)
  - How-to guides (buying, staking, wallet setup)
  - 25+ FAQs covering common questions
  - Official links and resources
  - Safety guidelines and scam warnings
- `src/knowledge/version.json` — Version metadata and last update date

## Safety System

Pepper Pal includes multiple layers of abuse resistance and quality controls.

### Duplicate Suppression

- Identical questions from the same user within 30 seconds are silently ignored
- Uses simple string hashing (no external dependencies)
- Auto-cleanup: max 1000 entries, old entries pruned automatically
- Prevents spam and accidental double-sends

### Response Limiting

- **Hard max**: 3000 characters (increased from 2000 for comprehensive answers)
- **Soft max**: 200 words (AI instructed to target this)
- **Newline limit**: Max 12 newlines (warning at 12+, max 2 consecutive)
- Truncation prefers sentence boundaries when possible

### Output Sanitization

Final safety filter applied to all AI responses before delivery:
- Strips markdown formatting (bold, italic, code, strikethrough)
- Smart URL filtering (keeps official domains, removes unknown links)
- Blocks trading/speculation language that slipped through
- Removes email addresses
- Catches edge cases the AI validator might miss
- Normalizes whitespace and excessive newlines

### Defense in Depth

```
User Question
    │
    ▼
Rate Limiting (per-user cooldown)
    │
    ▼
Duplicate Detection (30s window)
    │
    ▼
AI Response Generation
    │
    ▼
AI Response Validation (topic guardrails)
    │
    ▼
Response Length Limiting (hard/soft caps)
    │
    ▼
Output Sanitization (final filter)
    │
    ▼
Delivered to User
```

## Monitoring

Pepper Pal provides lightweight operational visibility for admins.

### /health Command

Admin-only command showing:
- Current bot mode (normal/silent/maintenance)
- Knowledge version and last update
- AI configuration status (model, provider)
- System prompt version (v2.2.0)
- Uptime and readiness

### /stats Command

Admin-only command showing aggregate metrics:
- Total questions received
- Questions answered vs fallback responses
- AI errors and validation failures
- Rate limit hits and duplicate suppressions
- Sanitization failures

### Privacy Commitment

- **No user data** stored in stats
- **No message content** logged or tracked
- **Aggregate counts only** — nothing identifiable
- All stats are ephemeral (reset on restart)

## Recent Updates

### v2.2.0 (January 2026)
- ✅ Added 12 quick commands for instant access to official resources
- ✅ Expanded knowledge base from ~70 lines to 11,366+ characters
- ✅ Updated system prompt to v2.2.0 with plain text formatting
- ✅ Added markdown stripping to prevent literal formatting display
- ✅ Reduced AI response verbosity (200 word target)
- ✅ Tightened newline limits (max 12, max 2 consecutive)
- ✅ Smart URL filtering (allows official domains only)
- ✅ Commands now appear in Telegram autocomplete menu
- ✅ Improved validator and sanitizer for better response quality

### Quick Commands Added
`/website`, `/contract`, `/buy`, `/stake`, `/governance`, `/twitter`, `/x`, `/telegram`, `/coingecko`, `/explorer`, `/chain`, `/links`, `/tokenomics`

## License

MIT
