# LLM Provider Strategy

**Status:** Active decision  
**Last updated:** 2026-04-04  

---

## Decision Summary

| Phase | Provider | Reason |
|---|---|---|
| Phase 5 MVP (now) | **Groq** | Free tier, OpenAI-compatible API, no infrastructure overhead |
| Post-Phase 6 (production) | **Ollama (self-hosted)** | Zero per-request cost, data stays in VPC, no third-party dependency |

---

## Phase 5 MVP — Groq

### Why Groq

- **Free tier**: 14,400 requests/day — more than sufficient for a portfolio app
- **OpenAI-compatible wire format** — the `GroqLLMAdapter` is a near-copy of `OpenAILLMAdapter`, only the base URL and model name change
- **No infrastructure**: no extra servers, no GPU, nothing to operate
- **Fast**: Groq's LPU hardware delivers noticeably lower latency than OpenAI on equivalent models
- **No credit card required**: key provisioned instantly at [console.groq.com](https://console.groq.com)

### Models available on free tier

| Model | Context | Speed | Best for |
|---|---|---|---|
| `llama-3.1-8b-instant` | 128k | Very fast | Default recommendation |
| `llama-3.3-70b-versatile` | 128k | Moderate | Higher quality responses |
| `mixtral-8x7b-32768` | 32k | Fast | Longer conversations |

**Recommended default:** `llama-3.1-8b-instant` — fast, capable for financial Q&A, well within free limits.

### Env vars to set

```
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
```

---

## Post-Phase 6 — Ollama (Self-Hosted)

### Why Ollama

- **Zero per-request cost** — the only cost is the EC2 instance running the model
- **Data never leaves the VPC** — all chat context (watchlist, prices, alerts) stays private
- **No rate limits** — handles burst traffic from premium users without throttling
- **OpenAI-compatible API** — Ollama exposes `/v1/chat/completions`, making the adapter swap trivial
- **Model flexibility** — any open-weight model can be swapped without code changes

### Recommended model

**`llama3.2:3b`** (Meta Llama 3.2, 3 billion parameters)

- Fits in 8 GB RAM — runs on a `t3.large` with no GPU
- Quantised to ~2 GB on disk (GGUF Q4 format)
- Capable enough for portfolio Q&A
- Response quality is lower than GPT-4o-mini but fully adequate for the use case

Upgrade path if quality is insufficient: `llama3.1:8b` (requires 16 GB RAM → `t3.xlarge`).

---

## Ollama Infrastructure Plan

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  AWS VPC (private subnet)                               │
│                                                         │
│  ┌──────────────────┐       ┌──────────────────────┐   │
│  │  ECS Fargate     │ HTTP  │  EC2 Ollama instance  │   │
│  │  NestJS backend  │──────▶│  port 11434           │   │
│  │  (existing)      │       │  llama3.2:3b          │   │
│  └──────────────────┘       └──────────────────────┘   │
│                                       │                 │
│                               ┌───────┴──────┐         │
│                               │  EBS volume  │         │
│                               │  ~20 GB gp3  │         │
│                               │  (model files)│        │
│                               └──────────────┘         │
└─────────────────────────────────────────────────────────┘
```

- Ollama runs on a **separate EC2 instance** in the same private subnet as ECS Fargate
- NestJS calls it over the VPC private IP — no public internet, no data egress costs
- The model is stored on an attached EBS volume so it survives instance restarts

### Instance recommendation

| Option | Instance | vCPU | RAM | Est. $/mo | Notes |
|---|---|---|---|---|---|
| **Minimum viable** | `t3.large` spot | 2 | 8 GB | ~$19 | `llama3.2:3b` only, ~2–5s/response |
| **Recommended** | `t3.xlarge` spot | 4 | 16 GB | ~$38 | `llama3.1:8b`, ~3–6s/response |
| **GPU (if needed)** | `g4dn.xlarge` spot | 4 | 16 GB + T4 | ~$115 | Sub-second response, any 7B model |

> **Spot pricing** cuts on-demand cost by ~65–70%. Ollama is resumable — if the spot instance is reclaimed, ECS restarts the container and reloads the model in ~30s. The model files persist on the EBS volume.

### EBS storage

| Item | Size | Cost |
|---|---|---|
| `llama3.2:3b` (Q4 quantised) | ~2 GB | |
| OS + Ollama binary | ~4 GB | |
| Headroom for model upgrades | ~14 GB | |
| **Total: `gp3` 20 GB** | | **~$1.60/mo** |

### Security

- EC2 instance placed in **private subnet** — no public IP, no inbound internet
- Security group allows inbound TCP 11434 **only from the ECS Fargate security group**
- IAM instance profile with no extra permissions needed (Ollama makes no AWS API calls)

### Deployment approach

1. EC2 `user_data` script installs Ollama and pulls the model on first boot:
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama pull llama3.2:3b
   systemctl enable ollama
   ```
2. Model files stored on the EBS volume (mounted at `/var/ollama`) — survive reboots
3. Terraform module in `infra/modules/ollama/` provisions the instance, security group, and EBS volume
4. `OLLAMA_BASE_URL=http://<private-ip>:11434` injected into ECS task via Secrets Manager

### Cost comparison

| Scenario | Monthly cost | Notes |
|---|---|---|
| Groq (MVP) | **$0** | Free tier: 14,400 req/day |
| Ollama `t3.large` spot | **~$21** | Instance + EBS |
| Ollama `t3.xlarge` spot | **~$40** | Instance + EBS |
| OpenAI `gpt-4o-mini` | ~$5–20 | Depends on usage (~$0.15/1M tokens) |

**Verdict:** For a live portfolio app with active premium users, Ollama on a `t3.large` spot pays for itself almost immediately vs OpenAI — and eliminates the per-request cost entirely.

---

## Adapter Implementation Plan

Both Groq and Ollama use the OpenAI wire format. The factory pattern already in place makes this a one-line env var change:

```
# Groq (MVP)
LLM_PROVIDER=groq

# Ollama (production)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://10.0.1.45:11434   # private VPC IP
OLLAMA_MODEL=llama3.2:3b
```

The `OllamaLLMAdapter` and `GroqLLMAdapter` are both thin wrappers around `OpenAILLMAdapter` with a different `baseUrl` and no `Authorization` header for Ollama. Implementation deferred to Phase 6.

---

## Tech Debt

| Item | Notes |
|---|---|
| `GroqLLMAdapter` | Build in Phase 5 implementation step |
| `OllamaLLMAdapter` | Build alongside Terraform Ollama module in Phase 6 |
| Auto-scaling Ollama | Not needed for v1 — single instance is sufficient at launch |
| Model quality evaluation | Run A/B prompts across `llama3.2:3b` vs `llama3.1:8b` before committing to production model |
