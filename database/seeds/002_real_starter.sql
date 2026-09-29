-- 002_real_starter.sql — REAL, source-backed starter records.
--
-- Research pass: 2026-09-29 (web research of official pricing / docs / terms pages).
-- Every row has is_demo = false.
-- Verification status: PARTIALLY_VERIFIED at best. Nothing is marked 'verified'.
-- Each claim has a sources row (official URL, source_type, page title, retrieved 2026-09-29)
-- and a verification_records row with an honest caveat in notes.
-- Fields that could not be confirmed on an official page were OMITTED (left null)
-- or documented in notes — never guessed.
-- ADMIN RE-VERIFICATION IS REQUIRED before any of this is treated as verified.
--
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING, safe to re-run.

-- ---------------------------------------------------------- providers ---
INSERT INTO providers (id, name, slug, website_url, description) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'OpenAI',       'openai',       'https://openai.com',       'AI research and deployment company; maker of ChatGPT and GPT models.'),
  ('c1000000-0000-4000-8000-000000000002', 'Anthropic',    'anthropic',    'https://www.anthropic.com','AI safety and research company; maker of Claude.'),
  ('c1000000-0000-4000-8000-000000000003', 'Google',       'google',       'https://www.google.com',   'Maker of Gemini models and the Gemini assistant.'),
  ('c1000000-0000-4000-8000-000000000004', 'Microsoft',    'microsoft',    'https://www.microsoft.com','Maker of Microsoft Copilot.'),
  ('c1000000-0000-4000-8000-000000000005', 'Perplexity',   'perplexity',   'https://www.perplexity.ai','Maker of the Perplexity AI answer engine and Sonar models.'),
  ('c1000000-0000-4000-8000-000000000006', 'GitHub',       'github',       'https://github.com',       'Maker of GitHub Copilot.'),
  ('c1000000-0000-4000-8000-000000000007', 'Meta',         'meta',         'https://www.meta.com',     'Maker of the Llama family of models.'),
  ('c1000000-0000-4000-8000-000000000008', 'Mistral AI',   'mistral',      'https://mistral.ai',       'Maker of Mistral open models.'),
  ('c1000000-0000-4000-8000-000000000009', 'Stability AI', 'stability-ai', 'https://stability.ai',     'Maker of Stable Diffusion image models.'),
  ('c1000000-0000-4000-8000-00000000000a', 'ElevenLabs',   'elevenlabs',   'https://elevenlabs.io',    'AI voice platform; maker of Eleven voice models.'),
  ('c1000000-0000-4000-8000-00000000000b', 'Midjourney',   'midjourney',   'https://www.midjourney.com','Self-funded AI research lab; maker of Midjourney image models.'),
  ('c1000000-0000-4000-8000-00000000000c', 'Moonshot AI',  'moonshot-ai',  'https://www.moonshot.ai',  'Maker of the Kimi family of models.'),
  ('c1000000-0000-4000-8000-00000000000d', 'Z.AI',         'z-ai',         'https://www.z.ai',         'Maker of the GLM family of models.'),
  ('c1000000-0000-4000-8000-00000000000e', 'Hugging Face', 'hugging-face', 'https://huggingface.co',   'Collaboration platform and model hub for AI.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------- websites ---
INSERT INTO ai_websites (id, name, slug, tagline, description, official_url, is_open_source, beginner_friendly,
                         monitoring_status, last_checked_at, is_demo) VALUES
  ('c2000000-0000-4000-8000-000000000001', 'ChatGPT', 'chatgpt',
   'Chat, Work, Create & Code with AI',
   'OpenAI web-based AI assistant for chatting, working, creating, and coding. The free tier is open to everyone; paid plans add more usage, advanced reasoning models, and features like deep research and image creation.',
   'https://chatgpt.com/', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000002', 'Claude', 'claude',
   NULL,
   'Anthropic AI assistant on web, iOS, Android, and desktop — chat, code generation and execution, web search, file creation, projects, and integrations with outside apps via connectors.',
   'https://claude.ai/', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000003', 'Google Gemini', 'gemini',
   NULL,
   'Google AI assistant used with a Google account. A developer API exists with a free tier for Flash models; consumer paid upgrades are sold through Google One.',
   'https://gemini.google/', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000004', 'Microsoft Copilot', 'microsoft-copilot',
   'AI built for work',
   'Microsoft AI assistant that connects with your work content and apps, bringing leading AI models together to help create finished work. Runs on desktop, mobile, and web, and is integrated into Word, Excel, PowerPoint, Outlook, and Teams.',
   'https://copilot.microsoft.com', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000005', 'Perplexity', 'perplexity',
   NULL,
   'AI-powered search and answer engine that gives cited answers to questions, plus an agentic Computer that builds apps, docs, and tools.',
   'https://www.perplexity.ai', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000006', 'GitHub Copilot', 'github-copilot',
   'Your AI coding agent',
   'AI coding assistant built into GitHub and major IDEs (VS Code, Visual Studio, JetBrains, Neovim, CLI, GitHub Mobile), offering code completions, chat, and agentic coding workflows, backed by models from GitHub, OpenAI, Anthropic, Google, and others.',
   'https://github.com/features/copilot', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000007', 'Groq', 'groq',
   'The premier neocloud for fast inference',
   'AI infrastructure company offering high-speed LLM inference on proprietary LPU hardware through the GroqCloud API (OpenAI-compatible).',
   'https://groq.com', false, false, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000008', 'Hugging Face', 'huggingface',
   'The AI community building the future.',
   'Collaboration platform and model hub for hosting and sharing public AI models, datasets, and Spaces apps across text, image, video, audio, and 3D; also sells compute and organization plans.',
   'https://huggingface.co', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-000000000009', 'Midjourney', 'midjourney',
   NULL,
   'Self-funded AI research lab whose image-generation models are used through a web app at midjourney.com. Subscription-only; generations are billed by GPU compute time.',
   'https://www.midjourney.com', false, true, 'current', '2026-09-29', false),
  ('c2000000-0000-4000-8000-00000000000a', 'ElevenLabs', 'elevenlabs',
   NULL,
   'AI voice platform offering text-to-speech, speech-to-text, voice cloning, dubbing, sound effects, music generation, and conversational AI voice agents, metered in credits.',
   'https://elevenlabs.io', false, true, 'current', '2026-09-29', false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------ models ---
INSERT INTO ai_models (id, provider_id, name, slug, description, model_type, is_open_source, license,
                       context_window_tokens, input_modalities, output_modalities, api_available, is_demo) VALUES
  ('c3000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','GPT-5.5 Instant','gpt-5-5-instant',
   'Default model for ChatGPT free and Go plans (limited access on the free tier), per the official pricing page.',
   'chat', false, NULL, NULL, ARRAY['text'], ARRAY['text'], false, false),
  ('c3000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','GPT-5.6','gpt-5-6',
   'Advanced reasoning model included in the ChatGPT Plus plan, per the official pricing page.',
   'chat', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000001','GPT-5.6 Terra','gpt-5-6-terra',
   'OpenAI model offered as a selectable model on Perplexity Pro, per the official Pro page.',
   'chat', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-000000000004','c1000000-0000-4000-8000-000000000002','Claude Opus 5.5','claude-opus-5-5',
   'Anthropic model for long-running agentic coding and knowledge work, per official platform docs.',
   'multimodal', false, NULL, 1000000, ARRAY['text','image'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000005','c1000000-0000-4000-8000-000000000002','Claude Sonnet 5.5','claude-sonnet-5-5',
   'Anthropic model: the best combination of speed and intelligence, per official platform docs.',
   'multimodal', false, NULL, 1000000, ARRAY['text','image'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000006','c1000000-0000-4000-8000-000000000002','Claude Haiku 4.5','claude-haiku-4-5',
   'Anthropic fastest model with near-frontier intelligence, per official platform docs.',
   'multimodal', false, NULL, 200000, ARRAY['text','image'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000007','c1000000-0000-4000-8000-000000000002','Claude Sonnet 5','claude-sonnet-5',
   'Anthropic model offered as a selectable model on Perplexity Pro, per the official Pro page.',
   'chat', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-000000000008','c1000000-0000-4000-8000-000000000003','Gemini 3.8 Flash','gemini-3-8-flash',
   'Google workhorse model (announced 2026-09-02); available in the Gemini app and the Developer API.',
   'multimodal', false, NULL, NULL, NULL, NULL, true, false),
  ('c3000000-0000-4000-8000-000000000009','c1000000-0000-4000-8000-000000000003','Gemini 3.7 Flash','gemini-3-7-flash',
   'Google model offered as a selectable model on Perplexity Pro, per the official Pro page.',
   'chat', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-00000000000a','c1000000-0000-4000-8000-000000000001','GPT-5','gpt-5',
   'OpenAI model that powers Microsoft Copilot for both free and paid users, per Microsoft.',
   'multimodal', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-00000000000b','c1000000-0000-4000-8000-000000000005','Sonar 2','sonar-2',
   'Perplexity in-house answer-engine model, per the official Pro page. Offered via the Sonar API.',
   'chat', false, NULL, NULL, NULL, NULL, true, false),
  ('c3000000-0000-4000-8000-00000000000c','c1000000-0000-4000-8000-000000000006','GPT-5.3-Codex','gpt-5-3-codex',
   'Long-term support / base coding model in GitHub Copilot, per official GitHub docs.',
   'code', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-00000000000d','c1000000-0000-4000-8000-000000000001','GPT-4o mini','gpt-4o-mini',
   'Utility model available in GitHub Copilot, per official GitHub docs.',
   'chat', false, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-00000000000e','c1000000-0000-4000-8000-00000000000c','Kimi K3','kimi-k3',
   'Moonshot AI model offered on Perplexity and in GitHub Copilot; described as open-weight in GitHub docs.',
   'chat', true, NULL, NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-00000000000f','c1000000-0000-4000-8000-000000000007','Llama 3.3 70B Instruct','llama-3-3-70b-instruct',
   'Meta 70B instruction-tuned LLM (128k context per model card); Hub access requires accepting the Llama 3.3 Community License.',
   'chat', false, 'LLAMA 3.3 COMMUNITY LICENSE AGREEMENT', 128000, ARRAY['text'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000010','c1000000-0000-4000-8000-000000000001','GPT OSS 120B','gpt-oss-120b',
   'OpenAI open-weight model served on GroqCloud, per the official docs models page.',
   'chat', true, NULL, 131072, ARRAY['text'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000011','c1000000-0000-4000-8000-000000000001','GPT OSS 20B','gpt-oss-20b',
   'OpenAI open-weight model served on GroqCloud, per the official docs models page.',
   'chat', true, NULL, 131072, ARRAY['text'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000012','c1000000-0000-4000-8000-000000000001','Whisper large v3','whisper-large-v3',
   'OpenAI speech-to-text model served on GroqCloud; 100 MB max audio file, per the official docs models page.',
   'stt', false, NULL, NULL, ARRAY['audio'], ARRAY['text'], true, false),
  ('c3000000-0000-4000-8000-000000000013','c1000000-0000-4000-8000-000000000008','Mistral 7B v0.3','mistral-7b-v0-3',
   'Mistral AI 7B LLM hosted on the Hugging Face Hub, Apache-2.0 licensed.',
   'chat', true, 'Apache-2.0', NULL, NULL, NULL, false, false),
  ('c3000000-0000-4000-8000-000000000014','c1000000-0000-4000-8000-000000000009','Stable Diffusion XL Base 1.0','stable-diffusion-xl-base-1-0',
   'Stability AI diffusion-based text-to-image model hosted on the Hugging Face Hub, under the CreativeML Open RAIL++-M License.',
   'image', false, 'CreativeML Open RAIL++-M', NULL, ARRAY['text'], ARRAY['image'], false, false),
  ('c3000000-0000-4000-8000-000000000015','c1000000-0000-4000-8000-00000000000a','Eleven v3','eleven-v3',
   'ElevenLabs most expressive text-to-speech model, with inline audio tags and multi-speaker dialogue (per official SDK and third-party guides).',
   'voice', false, NULL, NULL, ARRAY['text'], ARRAY['audio'], true, false),
  ('c3000000-0000-4000-8000-000000000016','c1000000-0000-4000-8000-00000000000a','Eleven Multilingual v2','eleven-multilingual-v2',
   'ElevenLabs text-to-speech model focused on stability and accent accuracy (per official SDK and third-party guides).',
   'voice', false, NULL, NULL, ARRAY['text'], ARRAY['audio'], true, false),
  ('c3000000-0000-4000-8000-000000000017','c1000000-0000-4000-8000-00000000000b','Midjourney V8','midjourney-v8',
   'Midjourney image-generation model line; current default version per third-party guides — exact version not officially confirmed.',
   'image', false, NULL, NULL, ARRAY['text'], ARRAY['image'], false, false),
  ('c3000000-0000-4000-8000-000000000018','c1000000-0000-4000-8000-00000000000d','GLM 5.2','glm-5-2',
   'Z.AI model (hosted in the US) offered as a selectable model on Perplexity Pro, per the official Pro page.',
   'chat', false, NULL, NULL, NULL, NULL, false, false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------- website <-> categories ---
INSERT INTO website_categories (website_id, category_id) VALUES
  ('c2000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000002'), -- chatgpt: reasoning
  ('c2000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000010'), -- chatgpt: writing
  ('c2000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000001'), -- chatgpt: coding
  ('c2000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000003'), -- chatgpt: research
  ('c2000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000017'), -- chatgpt: productivity
  ('c2000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000018'), -- chatgpt: education
  ('c2000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000002'), -- claude: reasoning
  ('c2000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000010'), -- claude: writing
  ('c2000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000001'), -- claude: coding
  ('c2000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000003'), -- claude: research
  ('c2000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000017'), -- claude: productivity
  ('c2000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000018'), -- claude: education
  ('c2000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000002'), -- gemini: reasoning
  ('c2000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000010'), -- gemini: writing
  ('c2000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000003'), -- gemini: research
  ('c2000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000017'), -- gemini: productivity
  ('c2000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000001'), -- gemini: coding
  ('c2000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000018'), -- gemini: education
  ('c2000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000002'), -- copilot: reasoning
  ('c2000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000010'), -- copilot: writing
  ('c2000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000017'), -- copilot: productivity
  ('c2000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000001'), -- copilot: coding
  ('c2000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000003'), -- copilot: research
  ('c2000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000013'), -- perplexity: search
  ('c2000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000003'), -- perplexity: research
  ('c2000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000010'), -- perplexity: writing
  ('c2000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000017'), -- perplexity: productivity
  ('c2000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000018'), -- perplexity: education
  ('c2000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000001'), -- github-copilot: coding
  ('c2000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000016'), -- github-copilot: developer-api
  ('c2000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000012'), -- github-copilot: ai-agents
  ('c2000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000017'), -- github-copilot: productivity
  ('c2000000-0000-4000-8000-000000000007','22222222-2222-2222-2222-000000000016'), -- groq: developer-api
  ('c2000000-0000-4000-8000-000000000007','22222222-2222-2222-2222-000000000001'), -- groq: coding
  ('c2000000-0000-4000-8000-000000000007','22222222-2222-2222-2222-000000000002'), -- groq: reasoning
  ('c2000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000016'), -- huggingface: developer-api
  ('c2000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000003'), -- huggingface: research
  ('c2000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000004'), -- huggingface: image-generation
  ('c2000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000001'), -- huggingface: coding
  ('c2000000-0000-4000-8000-000000000009','22222222-2222-2222-2222-000000000004'), -- midjourney: image-generation
  ('c2000000-0000-4000-8000-000000000009','22222222-2222-2222-2222-000000000020'), -- midjourney: design
  ('c2000000-0000-4000-8000-000000000009','22222222-2222-2222-2222-000000000019'), -- midjourney: marketing
  ('c2000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000008'), -- elevenlabs: voice
  ('c2000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000006'), -- elevenlabs: audio
  ('c2000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000009'), -- elevenlabs: speech-to-text
  ('c2000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000007'), -- elevenlabs: music
  ('c2000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000012')  -- elevenlabs: ai-agents
ON CONFLICT DO NOTHING;

-- ------------------------------------------------ model <-> categories ---
INSERT INTO model_categories (model_id, category_id) VALUES
  ('c3000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-000000000001','22222222-2222-2222-2222-000000000017'),
  ('c3000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-000000000002','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000003','22222222-2222-2222-2222-000000000003'),
  ('c3000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-000000000004','22222222-2222-2222-2222-000000000012'),
  ('c3000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-000000000005','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-000000000006','22222222-2222-2222-2222-000000000017'),
  ('c3000000-0000-4000-8000-000000000007','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000007','22222222-2222-2222-2222-000000000003'),
  ('c3000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-000000000008','22222222-2222-2222-2222-000000000003'),
  ('c3000000-0000-4000-8000-000000000009','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000009','22222222-2222-2222-2222-000000000003'),
  ('c3000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000017'),
  ('c3000000-0000-4000-8000-00000000000a','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-00000000000b','22222222-2222-2222-2222-000000000013'),
  ('c3000000-0000-4000-8000-00000000000b','22222222-2222-2222-2222-000000000003'),
  ('c3000000-0000-4000-8000-00000000000b','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-00000000000c','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-00000000000c','22222222-2222-2222-2222-000000000016'),
  ('c3000000-0000-4000-8000-00000000000c','22222222-2222-2222-2222-000000000012'),
  ('c3000000-0000-4000-8000-00000000000d','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-00000000000d','22222222-2222-2222-2222-000000000017'),
  ('c3000000-0000-4000-8000-00000000000e','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-00000000000e','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-00000000000f','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-00000000000f','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-00000000000f','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-000000000010','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000010','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-000000000011','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000011','22222222-2222-2222-2222-000000000001'),
  ('c3000000-0000-4000-8000-000000000012','22222222-2222-2222-2222-000000000009'),
  ('c3000000-0000-4000-8000-000000000012','22222222-2222-2222-2222-000000000006'),
  ('c3000000-0000-4000-8000-000000000012','22222222-2222-2222-2222-000000000016'),
  ('c3000000-0000-4000-8000-000000000013','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000013','22222222-2222-2222-2222-000000000010'),
  ('c3000000-0000-4000-8000-000000000014','22222222-2222-2222-2222-000000000004'),
  ('c3000000-0000-4000-8000-000000000014','22222222-2222-2222-2222-000000000020'),
  ('c3000000-0000-4000-8000-000000000015','22222222-2222-2222-2222-000000000008'),
  ('c3000000-0000-4000-8000-000000000015','22222222-2222-2222-2222-000000000006'),
  ('c3000000-0000-4000-8000-000000000016','22222222-2222-2222-2222-000000000008'),
  ('c3000000-0000-4000-8000-000000000016','22222222-2222-2222-2222-000000000006'),
  ('c3000000-0000-4000-8000-000000000017','22222222-2222-2222-2222-000000000004'),
  ('c3000000-0000-4000-8000-000000000017','22222222-2222-2222-2222-000000000020'),
  ('c3000000-0000-4000-8000-000000000017','22222222-2222-2222-2222-000000000019'),
  ('c3000000-0000-4000-8000-000000000018','22222222-2222-2222-2222-000000000002'),
  ('c3000000-0000-4000-8000-000000000018','22222222-2222-2222-2222-000000000003')
ON CONFLICT DO NOTHING;

-- -------------------------------------------- model <-> capabilities ---
INSERT INTO model_capabilities (model_id, capability_id) VALUES
  ('c3000000-0000-4000-8000-000000000001','33333333-3333-3333-3333-000000000014'), -- chat
  ('c3000000-0000-4000-8000-000000000001','33333333-3333-3333-3333-000000000001'), -- text-generation
  ('c3000000-0000-4000-8000-000000000001','33333333-3333-3333-3333-000000000011'), -- summarization
  ('c3000000-0000-4000-8000-000000000001','33333333-3333-3333-3333-000000000012'), -- translation
  ('c3000000-0000-4000-8000-000000000002','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000002','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000002','33333333-3333-3333-3333-000000000002'), -- code-completion
  ('c3000000-0000-4000-8000-000000000002','33333333-3333-3333-3333-000000000016'), -- code-debugging
  ('c3000000-0000-4000-8000-000000000002','33333333-3333-3333-3333-000000000017'), -- data-analysis
  ('c3000000-0000-4000-8000-000000000003','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000003','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000003','33333333-3333-3333-3333-000000000017'),
  ('c3000000-0000-4000-8000-000000000004','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000004','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000004','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-000000000004','33333333-3333-3333-3333-000000000016'),
  ('c3000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-000000000016'),
  ('c3000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-000000000011'),
  ('c3000000-0000-4000-8000-000000000005','33333333-3333-3333-3333-000000000012'),
  ('c3000000-0000-4000-8000-000000000006','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000006','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000006','33333333-3333-3333-3333-000000000011'),
  ('c3000000-0000-4000-8000-000000000007','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000007','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000008','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000008','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000008','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-000000000008','33333333-3333-3333-3333-000000000013'), -- web-search (Search grounding)
  ('c3000000-0000-4000-8000-000000000009','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000009','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-00000000000a','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-00000000000a','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-00000000000a','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-00000000000b','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-00000000000b','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-00000000000b','33333333-3333-3333-3333-000000000013'),
  ('c3000000-0000-4000-8000-00000000000c','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-00000000000c','33333333-3333-3333-3333-000000000016'),
  ('c3000000-0000-4000-8000-00000000000c','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-00000000000d','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-00000000000d','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-00000000000e','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-00000000000e','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-00000000000f','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-00000000000f','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-00000000000f','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-00000000000f','33333333-3333-3333-3333-000000000012'),
  ('c3000000-0000-4000-8000-000000000010','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000010','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000010','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-000000000011','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000011','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000011','33333333-3333-3333-3333-000000000002'),
  ('c3000000-0000-4000-8000-000000000012','33333333-3333-3333-3333-000000000007'), -- speech-recognition
  ('c3000000-0000-4000-8000-000000000013','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000013','33333333-3333-3333-3333-000000000001'),
  ('c3000000-0000-4000-8000-000000000014','33333333-3333-3333-3333-000000000004'), -- text-to-image
  ('c3000000-0000-4000-8000-000000000014','33333333-3333-3333-3333-000000000003'), -- image-generation
  ('c3000000-0000-4000-8000-000000000015','33333333-3333-3333-3333-000000000006'), -- text-to-speech
  ('c3000000-0000-4000-8000-000000000016','33333333-3333-3333-3333-000000000006'),
  ('c3000000-0000-4000-8000-000000000017','33333333-3333-3333-3333-000000000004'),
  ('c3000000-0000-4000-8000-000000000017','33333333-3333-3333-3333-000000000003'),
  ('c3000000-0000-4000-8000-000000000018','33333333-3333-3333-3333-000000000014'),
  ('c3000000-0000-4000-8000-000000000018','33333333-3333-3333-3333-000000000001')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------ website <-> models ---
INSERT INTO website_models (id, website_id, model_id, access_status, notes) VALUES
  ('c4000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','free_tier','Limited access on the free tier, per official pricing page.'),
  ('c4000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000002','paid','Plus plan model, per official pricing page.'),
  ('c4000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000005','free_tier','Free tier covers everyday questions (usage limits on rolling 5-hour windows), per official FAQ.'),
  ('c4000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000006','free_tier','Free tier covers everyday questions, per official FAQ.'),
  ('c4000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000002','c3000000-0000-4000-8000-000000000004','paid','Most capable tier; paid plans only.'),
  ('c4000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000003','c3000000-0000-4000-8000-000000000008','free_tier','Free tier has limited access to certain models; paid API tier unlocks the most advanced models.'),
  ('c4000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000004','c3000000-0000-4000-8000-00000000000a','free_tier','GPT-5 powers Copilot for both free and paid users, per Microsoft.'),
  ('c4000000-0000-4000-8000-000000000008','c2000000-0000-4000-8000-000000000005','c3000000-0000-4000-8000-00000000000b','free_tier','In-house model; free plan has limited usage.'),
  ('c4000000-0000-4000-8000-000000000009','c2000000-0000-4000-8000-000000000005','c3000000-0000-4000-8000-000000000003','paid','Selectable on paid tiers, per official Pro page.'),
  ('c4000000-0000-4000-8000-00000000000a','c2000000-0000-4000-8000-000000000005','c3000000-0000-4000-8000-000000000009','paid','Selectable on paid tiers, per official Pro page.'),
  ('c4000000-0000-4000-8000-00000000000b','c2000000-0000-4000-8000-000000000005','c3000000-0000-4000-8000-000000000007','paid','Selectable on paid tiers, per official Pro page.'),
  ('c4000000-0000-4000-8000-00000000000c','c2000000-0000-4000-8000-000000000005','c3000000-0000-4000-8000-00000000000e','paid','Selectable on paid tiers, per official Pro page.'),
  ('c4000000-0000-4000-8000-00000000000d','c2000000-0000-4000-8000-000000000005','c3000000-0000-4000-8000-000000000018','paid','Selectable on paid tiers, per official Pro page.'),
  ('c4000000-0000-4000-8000-00000000000e','c2000000-0000-4000-8000-000000000006','c3000000-0000-4000-8000-00000000000c','free_tier','Free plan gets auto model selection with limited AI credits; paid plans unlock full picker.'),
  ('c4000000-0000-4000-8000-00000000000f','c2000000-0000-4000-8000-000000000006','c3000000-0000-4000-8000-00000000000d','free_tier','Utility model; free plan gets auto model selection with limited AI credits.'),
  ('c4000000-0000-4000-8000-000000000010','c2000000-0000-4000-8000-000000000006','c3000000-0000-4000-8000-00000000000e','free_tier','Open-weight model listed in official supported-models docs.'),
  ('c4000000-0000-4000-8000-000000000011','c2000000-0000-4000-8000-000000000007','c3000000-0000-4000-8000-000000000010','free_tier','Rate-limited free developer tier, per official docs models page.'),
  ('c4000000-0000-4000-8000-000000000012','c2000000-0000-4000-8000-000000000007','c3000000-0000-4000-8000-000000000011','free_tier','Rate-limited free developer tier, per official docs models page.'),
  ('c4000000-0000-4000-8000-000000000013','c2000000-0000-4000-8000-000000000007','c3000000-0000-4000-8000-000000000012','free_tier','Rate-limited free developer tier, per official docs models page.'),
  ('c4000000-0000-4000-8000-000000000014','c2000000-0000-4000-8000-000000000007','c3000000-0000-4000-8000-00000000000f','paid','Listed as Contact Sales / Enterprise on the official docs models page.'),
  ('c4000000-0000-4000-8000-000000000015','c2000000-0000-4000-8000-000000000008','c3000000-0000-4000-8000-00000000000f','free','Hosted free on the public Hub (gated license acceptance required).'),
  ('c4000000-0000-4000-8000-000000000016','c2000000-0000-4000-8000-000000000008','c3000000-0000-4000-8000-000000000013','free','Hosted free on the public Hub under Apache-2.0.'),
  ('c4000000-0000-4000-8000-000000000017','c2000000-0000-4000-8000-000000000008','c3000000-0000-4000-8000-000000000014','free','Hosted free on the public Hub under CreativeML Open RAIL++-M.'),
  ('c4000000-0000-4000-8000-000000000018','c2000000-0000-4000-8000-000000000009','c3000000-0000-4000-8000-000000000017','paid','Subscription-only service; no free tier (third-party consensus).'),
  ('c4000000-0000-4000-8000-000000000019','c2000000-0000-4000-8000-00000000000a','c3000000-0000-4000-8000-000000000015','free_tier','Free plan reportedly includes 10,000 credits/month (third-party; official page inaccessible).'),
  ('c4000000-0000-4000-8000-00000000001a','c2000000-0000-4000-8000-00000000000a','c3000000-0000-4000-8000-000000000016','free_tier','Free plan reportedly includes 10,000 credits/month (third-party; official page inaccessible).')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------ plans ---
-- NOTE: price_amount is left NULL wherever the official page did not show a
-- static, fetchable price (ChatGPT Go/Plus/Pro, Copilot bundles, Midjourney,
-- ElevenLabs). Plan NAMES and KINDS come from official pages unless noted.
INSERT INTO plans (id, website_id, name, kind, billing_cycle, price_amount, price_currency, price_per, is_demo) VALUES
  ('c5000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Free','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000001','Go','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000001','Plus','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000001','Pro','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000001','Business','subscription','monthly',NULL,NULL,'standard seat $20/mo billed annually or $25/mo monthly; premium seat $100/mo billed annually or $125/mo monthly',false),
  ('c5000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000001','Enterprise','subscription','none',NULL,NULL,'custom pricing',false),
  ('c5000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000002','Free','free','none',0,'USD','per month',false),
  ('c5000000-0000-4000-8000-000000000008','c2000000-0000-4000-8000-000000000002','Pro','subscription','monthly',20,'USD','per month',false),
  ('c5000000-0000-4000-8000-000000000009','c2000000-0000-4000-8000-000000000002','Max','subscription','monthly',100,'USD','per month',false),
  ('c5000000-0000-4000-8000-00000000000a','c2000000-0000-4000-8000-000000000002','Team','subscription','monthly',NULL,NULL,'per seat',false),
  ('c5000000-0000-4000-8000-00000000000b','c2000000-0000-4000-8000-000000000002','Enterprise','subscription','none',20,'USD','per seat per month',false),
  ('c5000000-0000-4000-8000-00000000000c','c2000000-0000-4000-8000-000000000003','Gemini (free)','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-00000000000d','c2000000-0000-4000-8000-000000000003','Google One AI Premium','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-00000000000e','c2000000-0000-4000-8000-000000000003','Gemini Developer API — Free tier','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-00000000000f','c2000000-0000-4000-8000-000000000003','Gemini Developer API — Pay as you go','usage_based','usage',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000010','c2000000-0000-4000-8000-000000000004','Copilot (free)','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000011','c2000000-0000-4000-8000-000000000004','Microsoft 365 Copilot — Individuals','subscription','monthly',9.99,'USD','per month',false),
  ('c5000000-0000-4000-8000-000000000012','c2000000-0000-4000-8000-000000000004','Microsoft 365 Copilot — Business','subscription','monthly',23.50,'USD','per user per month',false),
  ('c5000000-0000-4000-8000-000000000013','c2000000-0000-4000-8000-000000000004','Microsoft 365 Copilot — Enterprise','subscription','monthly',30.00,'USD','per user per month',false),
  ('c5000000-0000-4000-8000-000000000014','c2000000-0000-4000-8000-000000000005','Free','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000015','c2000000-0000-4000-8000-000000000005','Pro','subscription','monthly',17,'USD','per month, billed annually',false),
  ('c5000000-0000-4000-8000-000000000016','c2000000-0000-4000-8000-000000000005','Max (name unconfirmed)','subscription','monthly',167,'USD','per month, billed annually',false),
  ('c5000000-0000-4000-8000-000000000017','c2000000-0000-4000-8000-000000000006','Free','free','none',0,'USD','per month',false),
  ('c5000000-0000-4000-8000-000000000018','c2000000-0000-4000-8000-000000000006','Pro','subscription','monthly',10,'USD','per month',false),
  ('c5000000-0000-4000-8000-000000000019','c2000000-0000-4000-8000-000000000006','Pro+','subscription','monthly',39,'USD','per month',false),
  ('c5000000-0000-4000-8000-00000000001a','c2000000-0000-4000-8000-000000000006','Max','subscription','monthly',100,'USD','per month',false),
  ('c5000000-0000-4000-8000-00000000001b','c2000000-0000-4000-8000-000000000006','Business','subscription','monthly',19,'USD','per user per month',false),
  ('c5000000-0000-4000-8000-00000000001c','c2000000-0000-4000-8000-000000000006','Enterprise','subscription','monthly',39,'USD','per user per month',false),
  ('c5000000-0000-4000-8000-00000000001d','c2000000-0000-4000-8000-000000000007','Developer (free tier)','free','none',0,'USD','per month',false),
  ('c5000000-0000-4000-8000-00000000001e','c2000000-0000-4000-8000-000000000007','Paid developer tier','usage_based','usage',NULL,NULL,'per token',false),
  ('c5000000-0000-4000-8000-00000000001f','c2000000-0000-4000-8000-000000000008','Free','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000020','c2000000-0000-4000-8000-000000000008','PRO','subscription','monthly',9,'USD','per month',false),
  ('c5000000-0000-4000-8000-000000000021','c2000000-0000-4000-8000-000000000009','Basic','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000022','c2000000-0000-4000-8000-000000000009','Standard','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000023','c2000000-0000-4000-8000-000000000009','Pro','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000024','c2000000-0000-4000-8000-000000000009','Mega','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000025','c2000000-0000-4000-8000-00000000000a','Free','free','none',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000026','c2000000-0000-4000-8000-00000000000a','Starter','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000027','c2000000-0000-4000-8000-00000000000a','Creator','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000028','c2000000-0000-4000-8000-00000000000a','Pro','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-000000000029','c2000000-0000-4000-8000-00000000000a','Scale','subscription','monthly',NULL,NULL,NULL,false),
  ('c5000000-0000-4000-8000-00000000002a','c2000000-0000-4000-8000-00000000000a','Enterprise','paid','none',NULL,NULL,'custom quote',false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------ plan limits ---
-- Only limits with exact official numbers are recorded.
INSERT INTO plan_limits (id, plan_id, limit_kind, limit_value, limit_unit, description) VALUES
  ('c6000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000017','other',2000,'code completions','2,000 code completions per month on the Free plan; chat/agent features on a limited (unstated) AI-credit allowance. Official feature page.'),
  ('c6000000-0000-4000-8000-000000000002','c5000000-0000-4000-8000-00000000001f','other',NULL,'USD','Inference Providers: $0.10/month credits for Free users (official docs).'),
  ('c6000000-0000-4000-8000-000000000003','c5000000-0000-4000-8000-000000000020','other',NULL,'USD','PRO: $2.00/month inference credits; 8x Spaces quota incl. up to 40 min RTX Pro 6000 Blackwell daily (official).'),
  ('c6000000-0000-4000-8000-000000000004','c5000000-0000-4000-8000-00000000001d','other',NULL,NULL,'Developer-plan rate limits per model (official docs models page): GPT OSS 120B 250K TPM / 1K RPM; GPT OSS 20B 250K TPM / 1K RPM; Whisper large v3 200K ASH / 300 RPM; Whisper turbo 400K ASH / 400 RPM.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------- website payment methods ---
-- Only payment methods explicitly listed on official billing/help pages.
INSERT INTO website_payment_methods (website_id, payment_method_id, notes) VALUES
  ('c2000000-0000-4000-8000-000000000001',(SELECT id FROM payment_methods WHERE code='credit_card'),'OpenAI Help Center: credit and debit cards in all countries.'),
  ('c2000000-0000-4000-8000-000000000001',(SELECT id FROM payment_methods WHERE code='debit_card'),'OpenAI Help Center: credit and debit cards in all countries.'),
  ('c2000000-0000-4000-8000-000000000001',(SELECT id FROM payment_methods WHERE code='upi'),'India: UPI for Go and Plus plans (OpenAI Help Center).'),
  ('c2000000-0000-4000-8000-000000000001',(SELECT id FROM payment_methods WHERE code='other'),'UK/EEA bank debit via Link (where supported); GoPay (ID), Pix (BR), Kakao Pay/Naver Pay/local cards (KR) — plan-dependent.'),
  ('c2000000-0000-4000-8000-000000000002',(SELECT id FROM payment_methods WHERE code='credit_card'),'Listed on the official Anthropic pricing page.'),
  ('c2000000-0000-4000-8000-000000000002',(SELECT id FROM payment_methods WHERE code='other'),'ACH and invoicing/net terms listed on the official Anthropic pricing page.')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------- access requirements ---
INSERT INTO access_requirements (id, website_id, account_required, email_verification, phone_verification,
                                 credit_card_required, debit_card_required, payment_method_required,
                                 payment_required, minimum_age, notes) VALUES
  ('c7000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',
   false, false, false, false, false, false, false, NULL,
   'Free tier requires no card. Account requirement and minimum age NOT confirmed on official pages loaded (research 2026-09-29).'),
  ('c7000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002',
   true, false, false, false, false, false, false, 18,
   'Sign-in gate on claude.ai. 18+ per Anthropic consumer terms (official support article cited via third-party; URL not captured). Free tier needs no card.'),
  ('c7000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003',
   true, false, false, false, false, false, false, 18,
   'Google account sign-in required. 18+ age limits stated on the Google One plans page. Free tier needs no card.'),
  ('c7000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000004',
   false, false, false, false, false, false, false, NULL,
   'Free tier requires no card. Account requirement and minimum age NOT confirmed on official pages loaded (research 2026-09-29).'),
  ('c7000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000005',
   false, false, false, false, false, false, false, NULL,
   'Account, card, phone, and age requirements NOT stated on official pages viewed (research 2026-09-29).'),
  ('c7000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000006',
   true, false, false, false, false, false, false, NULL,
   'Requires a GitHub account (opt-in), per official FAQ. Card/phone/age NOT confirmed on official pages viewed.'),
  ('c7000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000007',
   true, false, false, false, false, false, false, NULL,
   'API key via console.groq.com. Card requirement NOT confirmed on official pages viewed (third-party sources report no card).'),
  ('c7000000-0000-4000-8000-000000000008','c2000000-0000-4000-8000-000000000008',
   true, false, false, false, false, false, false, NULL,
   'Account required for API calls (user access token) and paid features; browsing public hub content needs none. Card requirement NOT confirmed.'),
  ('c7000000-0000-4000-8000-000000000009','c2000000-0000-4000-8000-000000000009',
   true, false, false, false, false, false, false, 13,
   'Sign-in with Discord or Google account (third-party reported). 13+ per official Terms of Service section 2. No free tier exists.'),
  ('c7000000-0000-4000-8000-00000000000a','c2000000-0000-4000-8000-00000000000a',
   true, false, false, false, false, false, false, NULL,
   'Account required (third-party consensus; official pages inaccessible to researcher). Card/phone/age NOT confirmed.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------- cancellation policies ---
INSERT INTO cancellation_policies (id, website_id, can_cancel, method, timing, auto_renewal,
                                   access_after_cancel, refund_info, source_url) VALUES
  ('c8000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',true,
   'Settings > Account/Billing > Manage > Cancel subscription; app-store subscriptions cancelled in those stores',
   'Immediate',true,'Plan stays active until end of billing period',
   'Payments non-refundable except where required by law; 14-day cooling-off with prorated refund per ChatGPT Terms.',
   'https://help.openai.com'),
  ('c8000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002',true,
   'Settings > Billing > Cancel (web/desktop); Organization settings > Billing (Team/Enterprise); app stores in respective stores',
   'Cancel at least 24h before the renewal date to avoid the next charge',true,'Plan stays active until end of billing period',
   'Generally non-refundable; EEA/UK 14-day withdrawal period with in-app refund request.',
   'https://www.anthropic.com/pricing'),
  ('c8000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003',true,
   NULL,'Immediate',true,NULL,NULL,
   'https://one.google.com/about/plans'),
  ('c8000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000008',true,
   'huggingface.co/subscribe/pro or account billing settings (exact steps not detailed on fetched pages)',
   'Immediate',true,NULL,NULL,
   'https://huggingface.co/pro'),
  ('c8000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000009',true,
   'Manage Subscription / account page at midjourney.com/account (third-party reported steps)',
   'Immediate',true,'Access retained until end of current period',
   'No refund for the current subscription period; you will not be charged after it ends. Official ToS.',
   'https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service'),
  ('c8000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-00000000000a',true,
   'Via your account; takes effect at end of the current subscription period',
   'End of current period',true,'Access retained until end of current period',
   'No refund of subscription fees already paid. Per archived official ToS snapshot (non-EEA).',
   'https://elevenlabs.io')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------ api access ---
INSERT INTO api_access (id, website_id, has_api, free_tier, pricing_text, rate_limits_text, docs_url) VALUES
  ('c9000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',false,false,
   'API is offered separately via OpenAI Platform (platform.openai.com), not via chatgpt.com.',NULL,NULL),
  ('c9000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002',true,false,
   'Claude Fable 5.1 $10/$50, Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5 per MTok in/out (official docs); Batch API 50% discount. Free API tier not confirmed.',
   NULL,'https://docs.anthropic.com'),
  ('c9000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003',true,true,
   'Flash models $0.75 in / $3.75 out per 1M tokens through Dec 31, 2026, then $1.50/$7.50 from Jan 1, 2027; free tier free of charge (content may be used to improve products); Grounding with Google Search: 5,000 free requests/month on the paid tier, then $14/1,000 requests.',
   'Higher rate limits on the paid tier (official docs).','https://ai.google.dev/gemini-api/docs/pricing'),
  ('c9000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000004',false,false,
   'No public API stated on the official page.',NULL,NULL),
  ('c9000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000005',true,false,
   'Search API $5.00/1K requests ($1.00/1K fast search); Agent API web_search $0.0025/invocation, fetch_url $0.0005, people/finance_search $0.005, sandbox $0.03/session; embeddings from $0.004/1M tokens (official docs). Sonar token rates not enumerated on the page viewed; free API tier not confirmed.',
   NULL,'https://docs.perplexity.ai'),
  ('c9000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000006',false,false,
   'No public standalone Copilot API.',NULL,'https://docs.github.com/en/copilot'),
  ('c9000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000007',true,true,
   'GPT OSS 120B $0.15/$0.60, GPT OSS 20B $0.075/$0.30, qwen3.8-27b $0.80/$4.00 per 1M in/out; Whisper large v3 $0.111/hr, Turbo $0.04/hr; Llama 3.1 8B instant, Llama 3.3 70B versatile, MiniMax M2.7: Contact Sales (official docs models page).',
   'Per-model RPM/TPM limits on the free developer tier; up to 10x higher on the paid tier.','https://console.groq.com/docs'),
  ('c9000000-0000-4000-8000-000000000008','c2000000-0000-4000-8000-000000000008',true,true,
   'Inference Providers: $0.10/mo free credits; PRO $2.00/mo; extra usage pay-as-you-go at provider rates, no Hugging Face markup (official docs).',
   NULL,'https://huggingface.co/docs/inference-providers'),
  ('c9000000-0000-4000-8000-000000000009','c2000000-0000-4000-8000-000000000009',false,false,
   'No public/self-serve API; automated access is prohibited by the ToS.',NULL,NULL),
  ('c9000000-0000-4000-8000-00000000000a','c2000000-0000-4000-8000-00000000000a',true,false,
   'Credit-metered API (per official SDK repo). Free plan reportedly includes API access — third-party, not officially confirmed (official pages inaccessible).',
   NULL,'https://elevenlabs.io/docs/api-reference')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------- sources ---
INSERT INTO sources (id, source_type, url, page_title, retrieved_at, notes) VALUES
  ('cb000000-0000-4000-8000-000000000001','other','https://chatgpt.com/','ChatGPT: Chat, Work, Create & Code with AI','2026-09-29','Homepage tagline and description.'),
  ('cb000000-0000-4000-8000-000000000002','official_pricing','https://openai.com/chatgpt/pricing','ChatGPT Plans | Free, Go, Plus, Pro, Business, and Enterprise','2026-09-29','Plan names/kinds, free-tier phrasing, billing-cycle FAQ. Prices render via JS and did not appear as static text — left null.'),
  ('cb000000-0000-4000-8000-000000000003','official_pricing','https://openai.com/api/pricing/','Business Pricing | OpenAI','2026-09-29','This URL now serves Business seat pricing. Standard seat $20/mo billed annually ($25 monthly); Premium seat $100/mo annually ($125 monthly).'),
  ('cb000000-0000-4000-8000-000000000004','official_billing','https://help.openai.com/en/articles/10421635-multicurrency-billing','Multi-currency billing | OpenAI Help Center','2026-09-29','Payment methods. Accessed via archive dated 2026-03-10; live URL not separately confirmed.'),
  ('cb000000-0000-4000-8000-000000000005','official_terms','https://openai.com/policies/terms-of-use','Terms of Use | OpenAI','2026-09-29','Cancellation, auto-renewal, refunds, price-notice, cooling-off. Content verified via opentermsarchive mirrors.'),
  ('cb000000-0000-4000-8000-000000000006','official_pricing','https://claude.ai/','Sign in - Claude','2026-09-29','Free $0, Pro $17/$20, Max from $100, "No commitment, cancel anytime".'),
  ('cb000000-0000-4000-8000-000000000007','official_pricing','https://www.anthropic.com/pricing','Plans & Pricing | Claude by Anthropic','2026-09-29','Plan prices, free-tier phrasing, payment options, cancellation + refund FAQ, 24-hour rule.'),
  ('cb000000-0000-4000-8000-000000000008','official_model_page','https://docs.anthropic.com/en/docs/about-claude/models','Models overview - Claude Platform Docs','2026-09-29','Model names, 1M/200K context windows, text+image input, text output.'),
  ('cb000000-0000-4000-8000-000000000009','official_docs','https://docs.anthropic.com/en/docs/about-claude/pricing','Pricing - Claude Platform Docs','2026-09-29','Per-model API pricing (Fable 5.1 $10/$50, Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5 per MTok).'),
  ('cb000000-0000-4000-8000-00000000000a','other','https://gemini.google/','Google Gemini','2026-09-29','JS shell; little static content. Account sign-in observed.'),
  ('cb000000-0000-4000-8000-00000000000b','official_pricing','https://ai.google.dev/gemini-api/docs/pricing','Gemini Developer API pricing','2026-09-29','API tiers, free-tier terms, per-model token pricing, Search grounding pricing.'),
  ('cb000000-0000-4000-8000-00000000000c','official_cancellation','https://one.google.com/about/plans','Plans & Pricing to Upgrade Your Cloud Storage - Google One','2026-09-29','"Cancel anytime"; 18+ age limits. Little static text rendered.'),
  ('cb000000-0000-4000-8000-00000000000d','official_model_page','https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/','Introducing Gemini 3.8 Flash and 3.8 Flash Cyber','2026-09-29','Gemini 3.8 Flash announcement (2026-09-02).'),
  ('cb000000-0000-4000-8000-00000000000e','official_pricing','https://www.microsoft.com/en-us/microsoft-copilot','AI built for work','2026-09-29','Plan labels, prices ($9.99 / $23.50 / $30.00), description. Formal plan names partially confirmed (carousel labels).'),
  ('cb000000-0000-4000-8000-00000000000f','official_model_page','https://www.microsoft.com/en-us/microsoft-copilot/for-individuals/do-more-with-ai/general-ai/whats-new-with-gpt-5-in-copilot','What''s New with GPT-5 in Copilot','2026-09-29','"GPT-5 powers Copilot for both free and paid users". Surfaced via search; page body not separately opened.'),
  ('cb000000-0000-4000-8000-000000000010','other','https://www.perplexity.ai','Perplexity AI','2026-09-29','Homepage description and answer-engine positioning.'),
  ('cb000000-0000-4000-8000-000000000011','official_pricing','https://www.perplexity.ai/pro','Perplexity Pro','2026-09-29','Free/Pro/Max-tier plans, annual prices ($17 / $167), model list, features. $167 tier name not labeled on page.'),
  ('cb000000-0000-4000-8000-000000000012','official_docs','https://docs.perplexity.ai/getting-started/pricing','Pricing - Perplexity','2026-09-29','Search/Agent/Embeddings API pricing; Sonar API docs.'),
  ('cb000000-0000-4000-8000-000000000013','official_pricing','https://github.com/features/copilot','GitHub Copilot · Your AI coding agent','2026-09-29','Plan names, free limits (2,000 completions/mo), AI-credit mechanics. Dollar prices third-party-corroborated.'),
  ('cb000000-0000-4000-8000-000000000014','official_docs','https://docs.github.com/en/copilot/reference/ai-models/supported-models','Supported AI models in GitHub Copilot','2026-09-29','Model providers and named models; Kimi K2.7 Code/K3 and DeepSeek named as open-weight.'),
  ('cb000000-0000-4000-8000-000000000015','official_pricing','https://groq.com/pricing','Groq','2026-09-29','"The premier neocloud for fast inference" positioning; pricing page renders marketing copy only (JS-heavy).'),
  ('cb000000-0000-4000-8000-000000000016','official_model_page','https://console.groq.com/docs/models','Supported Models - GroqDocs','2026-09-29','Full model list, per-model prices, context windows, developer-plan rate limits.'),
  ('cb000000-0000-4000-8000-000000000017','official_docs','https://console.groq.com/docs','GroqDocs','2026-09-29','GroqCloud API docs; OpenAI-compatible endpoints.'),
  ('cb000000-0000-4000-8000-000000000018','other','https://huggingface.co','Hugging Face – The AI community building the future.','2026-09-29','Homepage tagline and hub description.'),
  ('cb000000-0000-4000-8000-000000000019','official_pricing','https://huggingface.co/pricing','Pricing - Hugging Face','2026-09-29','Compute and storage tables.'),
  ('cb000000-0000-4000-8000-00000000001a','official_pricing','https://huggingface.co/pro','PRO Account - Hugging Face','2026-09-29','$9/mo, benefits, "Cancel anytime".'),
  ('cb000000-0000-4000-8000-00000000001b','official_docs','https://huggingface.co/docs/inference-providers/en/pricing','Pricing and Billing · Hugging Face','2026-09-29','Credit table ($0.10 free / $2.00 PRO), no-markup billing.'),
  ('cb000000-0000-4000-8000-00000000001c','official_model_page','https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0','stabilityai/stable-diffusion-xl-base-1.0 · Hugging Face','2026-09-29','Model card: diffusion text-to-image, CreativeML Open RAIL++-M license.'),
  ('cb000000-0000-4000-8000-00000000001d','official_model_page','https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct','meta-llama/Llama-3.3-70B-Instruct · Hugging Face','2026-09-29','Model card: Llama 3.3 Community License, 128k context, gated access.'),
  ('cb000000-0000-4000-8000-00000000001e','official_model_page','https://huggingface.co/mistralai/Mistral-7B-v0.3','mistralai/Mistral-7B-v0.3 · Hugging Face','2026-09-29','Model card; Apache-2.0 license confirmed via Instruct-v0.3 README metadata.'),
  ('cb000000-0000-4000-8000-00000000001f','other','https://www.midjourney.com','Midjourney','2026-09-29','About section: lab known for building the most beautiful AI models.'),
  ('cb000000-0000-4000-8000-000000000020','official_terms','https://docs.midjourney.com/hc/en-us/articles/32083055291277-Terms-of-Service','Terms of Service','2026-09-29','Age 13+, cancel anytime, no refund for current period. Content verified via opentermsarchive mirror; direct fetch blocked.'),
  ('cb000000-0000-4000-8000-000000000021','other','https://elevenlabs.io','ElevenLabs','2026-09-29','Official site blocked from fetch (policy); listed for provenance only. Pricing/limits are third-party-reported.'),
  ('cb000000-0000-4000-8000-000000000022','official_docs','https://github.com/elevenlabs/elevenlabs-python','elevenlabs/elevenlabs-python','2026-09-29','Official SDK repo: model IDs (eleven_v3, eleven_multilingual_v2, eleven_flash_v2_5, eleven_turbo_v2_5) and docs URLs.'),
  ('cb000000-0000-4000-8000-000000000023','other','https://github.com/shreyash0712/fineprinted/blob/HEAD/data/snapshots/elevenlabs.io/elevenlabs-terms-of-service-non-eea-/7456603035d72886e7889d5fdf3f08bd24150ade395d5ee7c4509dda4b4601fe.md','ElevenLabs Terms of Service snapshot','2026-09-29','Archived snapshot of the official ElevenLabs ToS (non-EEA): cancel anytime, auto-renew, no refund of paid fees.'),
  ('cb000000-0000-4000-8000-000000000024','official_cancellation','https://help.openai.com','OpenAI Help Center','2026-09-29','Cancellation steps for ChatGPT subscriptions.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------- verification records ---
-- ALL rows are PARTIALLY_VERIFIED. Nothing here is 'verified'.
-- Caveats are stated in notes; admin re-verification is required.
INSERT INTO verification_records (id, entity_type, entity_id, claim, status, source_id, notes) VALUES
  ('cc000000-0000-4000-8000-000000000001','website','c2000000-0000-4000-8000-000000000001',
   'ChatGPT plans (Free, Go, Plus, Pro, Business, Enterprise), free-tier terms, payment methods, and cancellation terms as stated on official pages.',
   'partially_verified','cb000000-0000-4000-8000-000000000002',
   'Research pass 2026-09-29. Plan prices for Go/Plus/Pro did not render as static text (JS) — intentionally left null. Account requirement and minimum age not confirmed.'),
  ('cc000000-0000-4000-8000-000000000002','website','c2000000-0000-4000-8000-000000000002',
   'Claude plans (Free $0, Pro $20/mo, Max from $100/mo, Team, Enterprise $20/seat), free-tier usage phrasing, cancellation and refund terms.',
   'partially_verified','cb000000-0000-4000-8000-000000000007',
   'Research pass 2026-09-29. 18+ from official support article cited via third-party; URL not captured. Payment table column alignment was unclear in fetch.'),
  ('cc000000-0000-4000-8000-000000000003','website','c2000000-0000-4000-8000-000000000003',
   'Gemini Developer API tiers and pricing; "Cancel anytime" and 18+ age limits on Google One plans.',
   'partially_verified','cb000000-0000-4000-8000-00000000000b',
   'Research pass 2026-09-29. Consumer plan prices and free-tier limits did not render on official pages — left null. Needs a browser re-check.'),
  ('cc000000-0000-4000-8000-000000000004','website','c2000000-0000-4000-8000-000000000004',
   'Microsoft Copilot plan labels and prices ($9.99 / $23.50 / $30.00); GPT-5 powers Copilot for free and paid users.',
   'partially_verified','cb000000-0000-4000-8000-00000000000e',
   'Research pass 2026-09-29. Formal plan names partially confirmed (carousel labels). Cancellation/billing details not confirmed.'),
  ('cc000000-0000-4000-8000-000000000005','website','c2000000-0000-4000-8000-000000000005',
   'Perplexity plans (Free, Pro $17/mo billed annually, Max-tier $167/mo billed annually) and selectable models.',
   'partially_verified','cb000000-0000-4000-8000-000000000011',
   'Research pass 2026-09-29. $167 tier name not labeled on page. Free-tier numbers, cancellation, and payment methods not stated — omitted.'),
  ('cc000000-0000-4000-8000-000000000006','website','c2000000-0000-4000-8000-000000000006',
   'GitHub Copilot plan names, free limits (2,000 completions/month), AI-credit mechanics, and model providers.',
   'partially_verified','cb000000-0000-4000-8000-000000000013',
   'Research pass 2026-09-29. Dollar prices third-party-corroborated, not captured on the official page in this pass. Full model picker list partially confirmed.'),
  ('cc000000-0000-4000-8000-000000000007','website','c2000000-0000-4000-8000-000000000007',
   'GroqCloud model list, per-model token prices, context windows, and developer-plan rate limits.',
   'partially_verified','cb000000-0000-4000-8000-000000000016',
   'Research pass 2026-09-29. Card/phone/age/payment/cancellation not stated on official pages — omitted.'),
  ('cc000000-0000-4000-8000-000000000008','website','c2000000-0000-4000-8000-000000000008',
   'Hugging Face Free/PRO plans, inference credits, PRO "Cancel anytime", and Inference Providers API.',
   'partially_verified','cb000000-0000-4000-8000-000000000019',
   'Research pass 2026-09-29. Team/Enterprise seat prices not confirmed on fetched official pages — omitted.'),
  ('cc000000-0000-4000-8000-000000000009','website','c2000000-0000-4000-8000-000000000009',
   'Midjourney is subscription-only (no free tier); ToS facts: 13+, cancel anytime, no refund for the current period.',
   'partially_verified','cb000000-0000-4000-8000-000000000020',
   'Research pass 2026-09-29. Plan names and prices are login-gated; figures are third-party-reported and intentionally left null.'),
  ('cc000000-0000-4000-8000-00000000000a','website','c2000000-0000-4000-8000-00000000000a',
   'ElevenLabs voice platform; models from the official SDK; cancellation/auto-renewal/refund per archived ToS snapshot.',
   'partially_verified','cb000000-0000-4000-8000-000000000022',
   'Research pass 2026-09-29. Official site blocked from fetch; pricing/limits are third-party-reported and intentionally left null. Weakest-sourced record.'),
  ('cc000000-0000-4000-8000-00000000000b','model','c3000000-0000-4000-8000-000000000001',
   'GPT-5.5 Instant is the default model for ChatGPT free and Go plans, with limited access on the free tier.',
   'partially_verified','cb000000-0000-4000-8000-000000000002','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000000c','model','c3000000-0000-4000-8000-000000000002',
   'GPT-5.6 is the advanced reasoning model included in the ChatGPT Plus plan.',
   'partially_verified','cb000000-0000-4000-8000-000000000002','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000000d','model','c3000000-0000-4000-8000-000000000003',
   'GPT-5.6 Terra (OpenAI) is offered as a selectable model on Perplexity Pro.',
   'partially_verified','cb000000-0000-4000-8000-000000000011','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000000e','model','c3000000-0000-4000-8000-000000000004',
   'Claude Opus 5.5: 1M token context, text+image input, text output, for long-running agentic work.',
   'partially_verified','cb000000-0000-4000-8000-000000000008','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000000f','model','c3000000-0000-4000-8000-000000000005',
   'Claude Sonnet 5.5: 1M token context, text+image input, text output; best speed/intelligence balance.',
   'partially_verified','cb000000-0000-4000-8000-000000000008','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000010','model','c3000000-0000-4000-8000-000000000006',
   'Claude Haiku 4.5: 200K token context, fastest model with near-frontier intelligence.',
   'partially_verified','cb000000-0000-4000-8000-000000000008','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000011','model','c3000000-0000-4000-8000-000000000007',
   'Claude Sonnet 5 (Anthropic) is offered as a selectable model on Perplexity Pro.',
   'partially_verified','cb000000-0000-4000-8000-000000000011','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000012','model','c3000000-0000-4000-8000-000000000008',
   'Gemini 3.8 Flash announced 2026-09-02; available in the Gemini app and the Developer API.',
   'partially_verified','cb000000-0000-4000-8000-00000000000d','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000013','model','c3000000-0000-4000-8000-000000000009',
   'Gemini 3.7 Flash (Google) is offered as a selectable model on Perplexity Pro.',
   'partially_verified','cb000000-0000-4000-8000-000000000011','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000014','model','c3000000-0000-4000-8000-00000000000a',
   'GPT-5 (OpenAI) powers Microsoft Copilot for both free and paid users.',
   'partially_verified','cb000000-0000-4000-8000-00000000000f','Research pass 2026-09-29. Source surfaced via search; page body not separately opened.'),
  ('cc000000-0000-4000-8000-000000000015','model','c3000000-0000-4000-8000-00000000000b',
   'Sonar 2 is Perplexity''s in-house answer-engine model; offered via the Sonar API.',
   'partially_verified','cb000000-0000-4000-8000-000000000011','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000016','model','c3000000-0000-4000-8000-00000000000c',
   'GPT-5.3-Codex is the long-term support / base coding model in GitHub Copilot.',
   'partially_verified','cb000000-0000-4000-8000-000000000014','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000017','model','c3000000-0000-4000-8000-00000000000d',
   'GPT-4o mini (OpenAI) is a utility model available in GitHub Copilot.',
   'partially_verified','cb000000-0000-4000-8000-000000000014','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-000000000018','model','c3000000-0000-4000-8000-00000000000e',
   'Kimi K3 (Moonshot AI) is offered on Perplexity and in GitHub Copilot; described as open-weight in GitHub docs.',
   'partially_verified','cb000000-0000-4000-8000-000000000014','Research pass 2026-09-29. License text not stated on pages viewed.'),
  ('cc000000-0000-4000-8000-000000000019','model','c3000000-0000-4000-8000-00000000000f',
   'Llama 3.3 70B Instruct (Meta): 128k context; Llama 3.3 Community License; Hub access requires license acceptance.',
   'partially_verified','cb000000-0000-4000-8000-00000000001d','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000001a','model','c3000000-0000-4000-8000-000000000010',
   'GPT OSS 120B (OpenAI): open-weight, 131,072 context, served on GroqCloud with developer-tier rate limits.',
   'partially_verified','cb000000-0000-4000-8000-000000000016','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000001b','model','c3000000-0000-4000-8000-000000000011',
   'GPT OSS 20B (OpenAI): open-weight, 131,072 context, served on GroqCloud with developer-tier rate limits.',
   'partially_verified','cb000000-0000-4000-8000-000000000016','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000001c','model','c3000000-0000-4000-8000-000000000012',
   'Whisper large v3 (OpenAI): speech-to-text, served on GroqCloud; 100 MB max audio file.',
   'partially_verified','cb000000-0000-4000-8000-000000000016','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000001d','model','c3000000-0000-4000-8000-000000000013',
   'Mistral 7B v0.3 (Mistral AI): Apache-2.0 licensed, hosted on the Hugging Face Hub.',
   'partially_verified','cb000000-0000-4000-8000-00000000001e','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000001e','model','c3000000-0000-4000-8000-000000000014',
   'Stable Diffusion XL Base 1.0 (Stability AI): diffusion text-to-image; CreativeML Open RAIL++-M license.',
   'partially_verified','cb000000-0000-4000-8000-00000000001c','Research pass 2026-09-29.'),
  ('cc000000-0000-4000-8000-00000000001f','model','c3000000-0000-4000-8000-000000000015',
   'Eleven v3 (ElevenLabs): text-to-speech model IDs and docs from the official SDK repo.',
   'partially_verified','cb000000-0000-4000-8000-000000000022','Research pass 2026-09-29. Language counts are third-party-reported.'),
  ('cc000000-0000-4000-8000-000000000020','model','c3000000-0000-4000-8000-000000000016',
   'Eleven Multilingual v2 (ElevenLabs): text-to-speech model IDs from the official SDK repo.',
   'partially_verified','cb000000-0000-4000-8000-000000000022','Research pass 2026-09-29. Language counts are third-party-reported.'),
  ('cc000000-0000-4000-8000-000000000021','model','c3000000-0000-4000-8000-000000000017',
   'Midjourney V8: image-generation model line used through midjourney.com (subscription-only).',
   'partially_verified','cb000000-0000-4000-8000-00000000001f','Research pass 2026-09-29. Exact current version third-party-reported; not officially confirmed.'),
  ('cc000000-0000-4000-8000-000000000022','model','c3000000-0000-4000-8000-000000000018',
   'GLM 5.2 (Z.AI) is offered as a selectable model on Perplexity Pro.',
   'partially_verified','cb000000-0000-4000-8000-000000000011','Research pass 2026-09-29.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------- monitoring checks ---
INSERT INTO monitoring_checks (id, website_id, checked_at, status, findings) VALUES
  ('cd000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000004','c2000000-0000-4000-8000-000000000004','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000005','c2000000-0000-4000-8000-000000000005','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000006','c2000000-0000-4000-8000-000000000006','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000007','c2000000-0000-4000-8000-000000000007','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000008','c2000000-0000-4000-8000-000000000008','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-000000000009','c2000000-0000-4000-8000-000000000009','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.'),
  ('cd000000-0000-4000-8000-00000000000a','c2000000-0000-4000-8000-00000000000a','2026-09-29','current','Initial research pass (2026-09-29) by database import. Admin re-verification required before launch.')
ON CONFLICT (id) DO NOTHING;
