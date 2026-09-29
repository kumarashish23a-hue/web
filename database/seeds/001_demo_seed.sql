-- 001_demo_seed.sql — FICTIONAL DEMO data only.
-- Every website / model / plan row has is_demo = true.
-- NEVER real company names, real pricing, or real limits.
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING, so it can be re-run safely.

-- ---------------------------------------------------------- providers ---
INSERT INTO providers (id, name, slug, website_url, description) VALUES
  ('11111111-1111-1111-1111-000000000001', 'Nova Labs',    'nova-labs',    'https://example.com/nova-labs',    'Fictional demo provider. DEMO data — not real.'),
  ('11111111-1111-1111-1111-000000000002', 'Fable Systems','fable-systems','https://example.com/fable-systems','Fictional demo provider. DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------- categories ---
-- The 20 categories from the brief.
INSERT INTO categories (id, name, slug, description, icon, sort_order) VALUES
  ('22222222-2222-2222-2222-000000000001', 'Coding',           'coding',           'Code generation, completion, and debugging', 'code',      1),
  ('22222222-2222-2222-2222-000000000002', 'Reasoning',        'reasoning',        'Step-by-step reasoning and problem solving',  'brain',     2),
  ('22222222-2222-2222-2222-000000000003', 'Research',         'research',         'Research assistance and cited answers',       'flask',     3),
  ('22222222-2222-2222-2222-000000000004', 'Image Generation', 'image-generation', 'Text-to-image and image editing',             'image',     4),
  ('22222222-2222-2222-2222-000000000005', 'Video Generation', 'video-generation', 'Text-to-video and video editing',             'video',     5),
  ('22222222-2222-2222-2222-000000000006', 'Audio',            'audio',            'Audio processing and generation',             'audio',     6),
  ('22222222-2222-2222-2222-000000000007', 'Music',            'music',            'Music generation and editing',                'music',     7),
  ('22222222-2222-2222-2222-000000000008', 'Voice',            'voice',            'Voice synthesis and cloning',                 'mic',       8),
  ('22222222-2222-2222-2222-000000000009', 'Speech-to-Text',   'speech-to-text',   'Transcription of speech to text',             'captions',  9),
  ('22222222-2222-2222-2222-000000000010', 'Writing',          'writing',          'Writing, editing, and drafting assistance',   'pen',      10),
  ('22222222-2222-2222-2222-000000000011', 'PDF / Documents',  'pdf-documents',    'Q&A and summarization over documents',        'file-text',11),
  ('22222222-2222-2222-2222-000000000012', 'AI Agents',        'ai-agents',        'Autonomous agents that take actions',         'bot',      12),
  ('22222222-2222-2222-2222-000000000013', 'Search',           'search',           'AI-powered search and retrieval',             'search',   13),
  ('22222222-2222-2222-2222-000000000014', 'Vision',           'vision',           'Image and video understanding',               'eye',      14),
  ('22222222-2222-2222-2222-000000000015', 'Computer Use',     'computer-use',     'Agents that operate computer interfaces',     'monitor',  15),
  ('22222222-2222-2222-2222-000000000016', 'Developer / API',  'developer-api',    'APIs and developer tooling',                  'terminal', 16),
  ('22222222-2222-2222-2222-000000000017', 'Productivity',     'productivity',     'Everyday productivity workflows',             'zap',      17),
  ('22222222-2222-2222-2222-000000000018', 'Education',        'education',        'Learning and tutoring',                       'book',     18),
  ('22222222-2222-2222-2222-000000000019', 'Marketing',        'marketing',        'Marketing content and campaigns',             'megaphone',19),
  ('22222222-2222-2222-2222-000000000020', 'Design',           'design',           'Design assistance and asset generation',      'palette',  20)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------- capabilities ---
INSERT INTO capabilities (id, name, slug, description) VALUES
  ('33333333-3333-3333-3333-000000000001', 'Text Generation',       'text-generation',       'Generate natural-language text'),
  ('33333333-3333-3333-3333-000000000002', 'Code Completion',       'code-completion',       'Autocomplete and generate code'),
  ('33333333-3333-3333-3333-000000000003', 'Image Generation',      'image-generation',      'Generate images from text prompts'),
  ('33333333-3333-3333-3333-000000000004', 'Text to Image',         'text-to-image',         'Render images from text descriptions'),
  ('33333333-3333-3333-3333-000000000005', 'Video Generation',      'video-generation',      'Generate video clips from prompts'),
  ('33333333-3333-3333-3333-000000000006', 'Text to Speech',        'text-to-speech',        'Synthesize speech from text'),
  ('33333333-3333-3333-3333-000000000007', 'Speech Recognition',    'speech-recognition',    'Transcribe spoken audio to text'),
  ('33333333-3333-3333-3333-000000000008', 'Voice Cloning',         'voice-cloning',         'Clone a voice from a sample'),
  ('33333333-3333-3333-3333-000000000009', 'Music Generation',      'music-generation',      'Compose music from prompts'),
  ('33333333-3333-3333-3333-000000000010', 'Document Q&A',          'document-qa',           'Answer questions over documents'),
  ('33333333-3333-3333-3333-000000000011', 'Summarization',         'summarization',         'Condense long text into summaries'),
  ('33333333-3333-3333-3333-000000000012', 'Translation',           'translation',           'Translate between languages'),
  ('33333333-3333-3333-3333-000000000013', 'Web Search',            'web-search',            'Search the web with cited results'),
  ('33333333-3333-3333-3333-000000000014', 'Chat',                  'chat',                  'Conversational chat interface'),
  ('33333333-3333-3333-3333-000000000015', 'Image Editing',         'image-editing',         'Edit existing images with prompts'),
  ('33333333-3333-3333-3333-000000000016', 'Code Debugging',        'code-debugging',        'Find and fix bugs in code'),
  ('33333333-3333-3333-3333-000000000017', 'Data Analysis',         'data-analysis',         'Analyze datasets and explain results'),
  ('33333333-3333-3333-3333-000000000018', 'OCR',                   'optical-character-recognition', 'Extract text from images')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------- websites ---
INSERT INTO ai_websites (id, name, slug, tagline, description, official_url, is_open_source, beginner_friendly, is_demo) VALUES
  ('44444444-4444-4444-4444-000000000001', 'Astra AI',     'astra-ai',
   'A friendly AI assistant for chat, writing, and reasoning.',
   'Fictional demo website: chat with an AI assistant that helps with writing and reasoning tasks. DEMO data — not real.',
   'https://example.com/astra-ai', false, true, true),
  ('44444444-4444-4444-4444-000000000002', 'CanvasForge',  'canvasforge',
   'Generate and edit images and design assets.',
   'Fictional demo website: text-to-image generation and simple image editing tools. DEMO data — not real.',
   'https://example.com/canvasforge', false, true, true),
  ('44444444-4444-4444-4444-000000000003', 'EchoVoice',    'echovoice',
   'Natural text-to-speech and voice cloning.',
   'Fictional demo website: synthesize speech in many voices and clone voices from short samples. DEMO data — not real.',
   'https://example.com/echovoice', false, true, true),
  ('44444444-4444-4444-4444-000000000004', 'DocuMind',     'documind',
   'Ask questions over your PDFs and documents.',
   'Fictional demo website: upload documents and ask questions about their contents. DEMO data — not real.',
   'https://example.com/documind', true, true, true),
  ('44444444-4444-4444-4444-000000000005', 'ResearchBase', 'researchbase',
   'AI-powered research search with cited sources.',
   'Fictional demo website: research assistant that searches sources and cites them. DEMO data — not real.',
   'https://example.com/researchbase', false, false, true),
  ('44444444-4444-4444-4444-000000000006', 'ClipGenius',   'clipgenius',
   'Turn scripts into short marketing videos.',
   'Fictional demo website: generate short marketing videos from a text script. DEMO data — not real.',
   'https://example.com/clipgenius', false, true, true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------ models ---
INSERT INTO ai_models (id, provider_id, name, slug, description, model_type, is_open_source, license,
                       context_window_tokens, input_modalities, output_modalities, api_available, is_demo) VALUES
  ('55555555-5555-5555-5555-000000000001', '11111111-1111-1111-1111-000000000001', 'AstraChat-1', 'astrachat-1',
   'Fictional demo chat model. DEMO data — not real.', 'chat', false, NULL,
   128000, ARRAY['text'], ARRAY['text'], true, true),
  ('55555555-5555-5555-5555-000000000002', '11111111-1111-1111-1111-000000000002', 'ForgeCanvas-XL', 'forgecanvas-xl',
   'Fictional demo image model. DEMO data — not real.', 'image', false, NULL,
   NULL, ARRAY['text'], ARRAY['image'], true, true),
  ('55555555-5555-5555-5555-000000000003', '11111111-1111-1111-1111-000000000002', 'EchoVox-1', 'echovox-1',
   'Fictional demo voice model. DEMO data — not real.', 'voice', false, NULL,
   NULL, ARRAY['text'], ARRAY['audio'], true, true),
  ('55555555-5555-5555-5555-000000000004', '11111111-1111-1111-1111-000000000001', 'DocuMind-Reader', 'documind-reader',
   'Fictional demo document-understanding model. DEMO data — not real.', 'multimodal', true, 'Apache-2.0 (fictional demo)',
   64000, ARRAY['text','image'], ARRAY['text'], true, true),
  ('55555555-5555-5555-5555-000000000005', '11111111-1111-1111-1111-000000000001', 'ScopeBase-Retriever', 'scopebase-retriever',
   'Fictional demo retrieval model. DEMO data — not real.', 'embedding', false, NULL,
   32000, ARRAY['text'], ARRAY['text'], true, true),
  ('55555555-5555-5555-5555-000000000006', '11111111-1111-1111-1111-000000000002', 'ClipCraft-1', 'clipcraft-1',
   'Fictional demo video model. DEMO data — not real.', 'video', false, NULL,
   NULL, ARRAY['text'], ARRAY['video'], false, true)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------- website <-> categories ---
INSERT INTO website_categories (website_id, category_id) VALUES
  ('44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000002'), -- astra: reasoning
  ('44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000010'), -- astra: writing
  ('44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000017'), -- astra: productivity
  ('44444444-4444-4444-4444-000000000001','22222222-2222-2222-2222-000000000018'), -- astra: education
  ('44444444-4444-4444-4444-000000000002','22222222-2222-2222-2222-000000000004'), -- canvasforge: image-generation
  ('44444444-4444-4444-4444-000000000002','22222222-2222-2222-2222-000000000020'), -- canvasforge: design
  ('44444444-4444-4444-4444-000000000002','22222222-2222-2222-2222-000000000019'), -- canvasforge: marketing
  ('44444444-4444-4444-4444-000000000003','22222222-2222-2222-2222-000000000008'), -- echovoice: voice
  ('44444444-4444-4444-4444-000000000003','22222222-2222-2222-2222-000000000006'), -- echovoice: audio
  ('44444444-4444-4444-4444-000000000003','22222222-2222-2222-2222-000000000009'), -- echovoice: speech-to-text
  ('44444444-4444-4444-4444-000000000003','22222222-2222-2222-2222-000000000007'), -- echovoice: music
  ('44444444-4444-4444-4444-000000000004','22222222-2222-2222-2222-000000000011'), -- documind: pdf-documents
  ('44444444-4444-4444-4444-000000000004','22222222-2222-2222-2222-000000000003'), -- documind: research
  ('44444444-4444-4444-4444-000000000004','22222222-2222-2222-2222-000000000017'), -- documind: productivity
  ('44444444-4444-4444-4444-000000000005','22222222-2222-2222-2222-000000000003'), -- researchbase: research
  ('44444444-4444-4444-4444-000000000005','22222222-2222-2222-2222-000000000013'), -- researchbase: search
  ('44444444-4444-4444-4444-000000000005','22222222-2222-2222-2222-000000000018'), -- researchbase: education
  ('44444444-4444-4444-4444-000000000006','22222222-2222-2222-2222-000000000005'), -- clipgenius: video-generation
  ('44444444-4444-4444-4444-000000000006','22222222-2222-2222-2222-000000000019'), -- clipgenius: marketing
  ('44444444-4444-4444-4444-000000000006','22222222-2222-2222-2222-000000000020')  -- clipgenius: design
ON CONFLICT DO NOTHING;

-- ------------------------------------------------ model <-> categories ---
INSERT INTO model_categories (model_id, category_id) VALUES
  ('55555555-5555-5555-5555-000000000001','22222222-2222-2222-2222-000000000002'), -- astrachat-1: reasoning
  ('55555555-5555-5555-5555-000000000001','22222222-2222-2222-2222-000000000010'), -- astrachat-1: writing
  ('55555555-5555-5555-5555-000000000002','22222222-2222-2222-2222-000000000004'), -- forgecanvas-xl: image-generation
  ('55555555-5555-5555-5555-000000000002','22222222-2222-2222-2222-000000000020'), -- forgecanvas-xl: design
  ('55555555-5555-5555-5555-000000000003','22222222-2222-2222-2222-000000000008'), -- echovox-1: voice
  ('55555555-5555-5555-5555-000000000003','22222222-2222-2222-2222-000000000006'), -- echovox-1: audio
  ('55555555-5555-5555-5555-000000000004','22222222-2222-2222-2222-000000000011'), -- documind-reader: pdf-documents
  ('55555555-5555-5555-5555-000000000004','22222222-2222-2222-2222-000000000003'), -- documind-reader: research
  ('55555555-5555-5555-5555-000000000005','22222222-2222-2222-2222-000000000013'), -- scopebase-retriever: search
  ('55555555-5555-5555-5555-000000000005','22222222-2222-2222-2222-000000000003'), -- scopebase-retriever: research
  ('55555555-5555-5555-5555-000000000006','22222222-2222-2222-2222-000000000005'), -- clipcraft-1: video-generation
  ('55555555-5555-5555-5555-000000000006','22222222-2222-2222-2222-000000000019')  -- clipcraft-1: marketing
ON CONFLICT DO NOTHING;

-- -------------------------------------------- model <-> capabilities ---
INSERT INTO model_capabilities (model_id, capability_id) VALUES
  ('55555555-5555-5555-5555-000000000001','33333333-3333-3333-3333-000000000001'), -- astrachat-1: text-generation
  ('55555555-5555-5555-5555-000000000001','33333333-3333-3333-3333-000000000014'), -- astrachat-1: chat
  ('55555555-5555-5555-5555-000000000001','33333333-3333-3333-3333-000000000011'), -- astrachat-1: summarization
  ('55555555-5555-5555-5555-000000000001','33333333-3333-3333-3333-000000000012'), -- astrachat-1: translation
  ('55555555-5555-5555-5555-000000000002','33333333-3333-3333-3333-000000000003'), -- forgecanvas-xl: image-generation
  ('55555555-5555-5555-5555-000000000002','33333333-3333-3333-3333-000000000004'), -- forgecanvas-xl: text-to-image
  ('55555555-5555-5555-5555-000000000002','33333333-3333-3333-3333-000000000015'), -- forgecanvas-xl: image-editing
  ('55555555-5555-5555-5555-000000000003','33333333-3333-3333-3333-000000000006'), -- echovox-1: text-to-speech
  ('55555555-5555-5555-5555-000000000003','33333333-3333-3333-3333-000000000008'), -- echovox-1: voice-cloning
  ('55555555-5555-5555-5555-000000000003','33333333-3333-3333-3333-000000000009'), -- echovox-1: music-generation
  ('55555555-5555-5555-5555-000000000004','33333333-3333-3333-3333-000000000010'), -- documind-reader: document-qa
  ('55555555-5555-5555-5555-000000000004','33333333-3333-3333-3333-000000000011'), -- documind-reader: summarization
  ('55555555-5555-5555-5555-000000000004','33333333-3333-3333-3333-000000000018'), -- documind-reader: ocr
  ('55555555-5555-5555-5555-000000000005','33333333-3333-3333-3333-000000000013'), -- scopebase-retriever: web-search
  ('55555555-5555-5555-5555-000000000005','33333333-3333-3333-3333-000000000017'), -- scopebase-retriever: data-analysis
  ('55555555-5555-5555-5555-000000000006','33333333-3333-3333-3333-000000000005')  -- clipcraft-1: video-generation
ON CONFLICT DO NOTHING;

-- ------------------------------------------------ website <-> models ---
INSERT INTO website_models (id, website_id, model_id, access_status, notes) VALUES
  ('66666666-6666-6666-6666-000000000001','44444444-4444-4444-4444-000000000001','55555555-5555-5555-5555-000000000001','free_tier','Demo free tier. DEMO data — not real.'),
  ('66666666-6666-6666-6666-000000000002','44444444-4444-4444-4444-000000000002','55555555-5555-5555-5555-000000000002','free_trial','Demo 7-day trial. DEMO data — not real.'),
  ('66666666-6666-6666-6666-000000000003','44444444-4444-4444-4444-000000000003','55555555-5555-5555-5555-000000000003','free','Demo free access. DEMO data — not real.'),
  ('66666666-6666-6666-6666-000000000004','44444444-4444-4444-4444-000000000004','55555555-5555-5555-5555-000000000004','free_tier','Demo free tier. DEMO data — not real.'),
  ('66666666-6666-6666-6666-000000000005','44444444-4444-4444-4444-000000000005','55555555-5555-5555-5555-000000000005','free','Demo free access. DEMO data — not real.'),
  ('66666666-6666-6666-6666-000000000006','44444444-4444-4444-4444-000000000006','55555555-5555-5555-5555-000000000006','paid','Demo paid-only. DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------ plans ---
INSERT INTO plans (id, website_id, name, kind, billing_cycle, price_amount, price_currency, price_per, is_demo) VALUES
  ('77777777-7777-7777-7777-000000000001','44444444-4444-4444-4444-000000000001','Starter','freemium','monthly',0,'USD','per month',true),
  ('77777777-7777-7777-7777-000000000002','44444444-4444-4444-4444-000000000001','Pro','subscription','monthly',20,'USD','per month',true),
  ('77777777-7777-7777-7777-000000000003','44444444-4444-4444-4444-000000000002','Free Trial','free_trial','none',0,'USD','per trial',true),
  ('77777777-7777-7777-7777-000000000004','44444444-4444-4444-4444-000000000002','Creator','subscription','monthly',12,'USD','per month',true),
  ('77777777-7777-7777-7777-000000000005','44444444-4444-4444-4444-000000000003','Free','free','none',0,'USD',NULL,true),
  ('77777777-7777-7777-7777-000000000006','44444444-4444-4444-4444-000000000004','Basic','freemium','monthly',0,'USD','per month',true),
  ('77777777-7777-7777-7777-000000000007','44444444-4444-4444-4444-000000000004','Team','subscription','yearly',99,'USD','per year',true),
  ('77777777-7777-7777-7777-000000000008','44444444-4444-4444-4444-000000000005','Free','free','none',0,'USD',NULL,true),
  ('77777777-7777-7777-7777-000000000009','44444444-4444-4444-4444-000000000006','Pro','paid','monthly',25,'USD','per month',true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------ plan limits ---
INSERT INTO plan_limits (id, plan_id, limit_kind, limit_value, limit_unit, description) VALUES
  ('88888888-8888-8888-8888-000000000001','77777777-7777-7777-7777-000000000001','requests_per_day',50,'requests','Demo free-tier daily limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000002','77777777-7777-7777-7777-000000000002','requests_per_day',1000,'requests','Demo paid daily limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000003','77777777-7777-7777-7777-000000000003','images_per_day',5,'images','Demo trial daily image limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000004','77777777-7777-7777-7777-000000000004','images_per_day',200,'images','Demo paid daily image limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000005','77777777-7777-7777-7777-000000000005','requests_per_month',10000,'requests','Demo free monthly limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000006','77777777-7777-7777-7777-000000000006','requests_per_day',20,'requests','Demo free-tier daily limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000007','77777777-7777-7777-7777-000000000007','requests_per_day',500,'requests','Demo paid daily limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000008','77777777-7777-7777-7777-000000000008','requests_per_day',100,'requests','Demo free daily limit. DEMO data — not real.'),
  ('88888888-8888-8888-8888-000000000009','77777777-7777-7777-7777-000000000009','videos_per_day',10,'videos','Demo paid daily video limit. DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------- website payment methods ---
INSERT INTO website_payment_methods (website_id, payment_method_id) VALUES
  ('44444444-4444-4444-4444-000000000001',(SELECT id FROM payment_methods WHERE code='credit_card')),
  ('44444444-4444-4444-4444-000000000001',(SELECT id FROM payment_methods WHERE code='upi')),
  ('44444444-4444-4444-4444-000000000001',(SELECT id FROM payment_methods WHERE code='paypal')),
  ('44444444-4444-4444-4444-000000000002',(SELECT id FROM payment_methods WHERE code='credit_card')),
  ('44444444-4444-4444-4444-000000000003',(SELECT id FROM payment_methods WHERE code='upi')),
  ('44444444-4444-4444-4444-000000000003',(SELECT id FROM payment_methods WHERE code='paypal')),
  ('44444444-4444-4444-4444-000000000004',(SELECT id FROM payment_methods WHERE code='credit_card')),
  ('44444444-4444-4444-4444-000000000004',(SELECT id FROM payment_methods WHERE code='debit_card')),
  ('44444444-4444-4444-4444-000000000004',(SELECT id FROM payment_methods WHERE code='upi')),
  ('44444444-4444-4444-4444-000000000006',(SELECT id FROM payment_methods WHERE code='credit_card')),
  ('44444444-4444-4444-4444-000000000006',(SELECT id FROM payment_methods WHERE code='debit_card'))
ON CONFLICT DO NOTHING;

-- ----------------------------------------------- access requirements ---
-- Mixed: some need no card at all, some require a card.
INSERT INTO access_requirements (id, website_id, account_required, email_verification, phone_verification,
                                 credit_card_required, debit_card_required, payment_method_required,
                                 payment_required, minimum_age, notes) VALUES
  ('99999999-9999-9999-9999-000000000001','44444444-4444-4444-4444-000000000001',
   true, true, false, false, false, false, false, NULL, 'Free tier needs no card. DEMO data — not real.'),
  ('99999999-9999-9999-9999-000000000002','44444444-4444-4444-4444-000000000002',
   true, false, false, true, false, true, false, NULL, 'Trial asks for a card. DEMO data — not real.'),
  ('99999999-9999-9999-9999-000000000003','44444444-4444-4444-4444-000000000003',
   false, false, false, false, false, false, false, NULL, 'No account needed for the free tier. DEMO data — not real.'),
  ('99999999-9999-9999-9999-000000000004','44444444-4444-4444-4444-000000000004',
   true, true, false, false, false, false, false, NULL, 'Account with email verification. DEMO data — not real.'),
  ('99999999-9999-9999-9999-000000000005','44444444-4444-4444-4444-000000000005',
   false, false, false, false, false, false, false, NULL, 'Open access, no account. DEMO data — not real.'),
  ('99999999-9999-9999-9999-000000000006','44444444-4444-4444-4444-000000000006',
   true, false, false, true, false, true, true, NULL, 'Paid plan requires a card. DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------- regional availability ---
INSERT INTO regional_availability (id, website_id, country_code, available, notes) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000001','44444444-4444-4444-4444-000000000001','US',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000002','44444444-4444-4444-4444-000000000001','IN',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000003','44444444-4444-4444-4444-000000000001','GB',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000004','44444444-4444-4444-4444-000000000001','DE',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000005','44444444-4444-4444-4444-000000000002','US',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000006','44444444-4444-4444-4444-000000000002','IN',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000007','44444444-4444-4444-4444-000000000002','GB',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000008','44444444-4444-4444-4444-000000000002','DE',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000009','44444444-4444-4444-4444-000000000003','US',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000010','44444444-4444-4444-4444-000000000003','IN',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000011','44444444-4444-4444-4444-000000000003','GB',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000012','44444444-4444-4444-4444-000000000003','DE',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000013','44444444-4444-4444-4444-000000000004','US',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000014','44444444-4444-4444-4444-000000000004','IN',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000015','44444444-4444-4444-4444-000000000005','US',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000016','44444444-4444-4444-4444-000000000005','IN',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000017','44444444-4444-4444-4444-000000000005','GB',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000018','44444444-4444-4444-4444-000000000006','US',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000019','44444444-4444-4444-4444-000000000006','IN',true,'DEMO data — not real.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-000000000020','44444444-4444-4444-4444-000000000006','CN',false,'Demo example of an unavailable region. DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------- cancellation policies ---
INSERT INTO cancellation_policies (id, website_id, can_cancel, method, timing, auto_renewal,
                                   access_after_cancel, refund_info, source_url) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000001','44444444-4444-4444-4444-000000000001',true,'Settings → Billing → Cancel plan','Immediate',true,
   'Access until end of billing period','Fictional demo refund policy. DEMO data — not real.','https://example.com/astra-ai/billing'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000002','44444444-4444-4444-4444-000000000002',true,'Settings → Billing → Cancel plan','Immediate',true,
   'Access until end of billing period','Fictional demo refund policy. DEMO data — not real.','https://example.com/canvasforge/billing'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000003','44444444-4444-4444-4444-000000000003',true,'No subscription to cancel','N/A',false,
   'Free tier has no billing','N/A. DEMO data — not real.','https://example.com/echovoice/pricing'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000004','44444444-4444-4444-4444-000000000004',true,'Settings → Billing → Cancel plan','Immediate',true,
   'Access until end of billing period','Fictional demo refund policy. DEMO data — not real.','https://example.com/documind/billing'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000005','44444444-4444-4444-4444-000000000005',true,'No subscription to cancel','N/A',false,
   'Free tier has no billing','N/A. DEMO data — not real.','https://example.com/researchbase/pricing'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-000000000006','44444444-4444-4444-4444-000000000006',true,'Settings → Billing → Cancel plan','Immediate',true,
   'Access until end of billing period','Fictional demo refund policy. DEMO data — not real.','https://example.com/clipgenius/billing')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------ api access ---
INSERT INTO api_access (id, website_id, has_api, free_tier, pricing_text, rate_limits_text, docs_url) VALUES
  ('cccccccc-cccc-cccc-cccc-000000000001','44444444-4444-4444-4444-000000000001',true,true,'Fictional demo API pricing. DEMO data — not real.','Fictional demo rate limits. DEMO data — not real.','https://example.com/astra-ai/docs'),
  ('cccccccc-cccc-cccc-cccc-000000000002','44444444-4444-4444-4444-000000000002',true,false,'Fictional demo API pricing. DEMO data — not real.','Fictional demo rate limits. DEMO data — not real.','https://example.com/canvasforge/docs'),
  ('cccccccc-cccc-cccc-cccc-000000000003','44444444-4444-4444-4444-000000000003',true,true,'Fictional demo API pricing. DEMO data — not real.','Fictional demo rate limits. DEMO data — not real.','https://example.com/echovoice/docs'),
  ('cccccccc-cccc-cccc-cccc-000000000004','44444444-4444-4444-4444-000000000004',true,true,'Fictional demo API pricing. DEMO data — not real.','Fictional demo rate limits. DEMO data — not real.','https://example.com/documind/docs'),
  ('cccccccc-cccc-cccc-cccc-000000000005','44444444-4444-4444-4444-000000000005',true,true,'Fictional demo API pricing. DEMO data — not real.','Fictional demo rate limits. DEMO data — not real.','https://example.com/researchbase/docs'),
  ('cccccccc-cccc-cccc-cccc-000000000006','44444444-4444-4444-4444-000000000006',false,false,NULL,NULL,NULL)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------- sources ---
INSERT INTO sources (id, source_type, url, page_title, retrieved_at, notes) VALUES
  ('dddddddd-dddd-dddd-dddd-000000000001','official_pricing','https://example.com/astra-ai/pricing','Astra AI pricing page',now(),'DEMO data — not real.'),
  ('dddddddd-dddd-dddd-dddd-000000000002','official_docs','https://example.com/researchbase/docs','ResearchBase API docs',now(),'DEMO data — not real.'),
  ('dddddddd-dddd-dddd-dddd-000000000003','official_terms','https://example.com/clipgenius/terms','ClipGenius terms of service',now(),'DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------- verification records ---
-- All rows are 'unverified'. Nothing here may ever be 'verified'.
INSERT INTO verification_records (id, entity_type, entity_id, claim, status, source_id, notes) VALUES
  ('eeeeeeee-eeee-eeee-eeee-000000000001','website','44444444-4444-4444-4444-000000000001','Astra AI offers a free tier','unverified','dddddddd-dddd-dddd-dddd-000000000001','DEMO data — not real.'),
  ('eeeeeeee-eeee-eeee-eeee-000000000002','model','55555555-5555-5555-5555-000000000003','EchoVox-1 supports text-to-speech','unverified',NULL,'DEMO data — not real.'),
  ('eeeeeeee-eeee-eeee-eeee-000000000003','plan','77777777-7777-7777-7777-000000000002','Astra AI Pro costs 20 USD per month (fictional price)','unverified','dddddddd-dddd-dddd-dddd-000000000001','DEMO data — not real.'),
  ('eeeeeeee-eeee-eeee-eeee-000000000004','access_requirement','99999999-9999-9999-9999-000000000006','ClipGenius paid plan requires a credit card','unverified',NULL,'DEMO data — not real.'),
  ('eeeeeeee-eeee-eeee-eeee-000000000005','website','44444444-4444-4444-4444-000000000006','ClipGenius is available in India','unverified',NULL,'DEMO data — not real.')
ON CONFLICT (id) DO NOTHING;
