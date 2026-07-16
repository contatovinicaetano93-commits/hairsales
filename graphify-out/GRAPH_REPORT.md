# Graph Report - .  (2026-07-15)

## Corpus Check
- 225 files · ~173,373 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1248 nodes · 3651 edges · 88 communities (57 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 62
- Community 64
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 83
- Community 84
- Community 86
- Community 87

## God Nodes (most connected - your core abstractions)
1. `getSql()` - 110 edges
2. `ok()` - 104 edges
3. `handleError()` - 92 edges
4. `err()` - 88 edges
5. `getBrand()` - 55 edges
6. `ROM Brasil` - 32 edges
7. `ROM Iguatemi` - 32 edges
8. `logEvent()` - 27 edges
9. `requireStock()` - 25 edges
10. `fetchAllAvecReport()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `ROM Brasil` --uses--> `typescript`  [0.95]
  pitch-henrique.md, README.md, deploy/SETUP-IGUATEMI.md → package.json
- `ROM Iguatemi` --uses--> `typescript`  [0.95]
  pitch-henrique.md, deploy/SETUP-IGUATEMI.md → package.json
- `Instance Isolation` --applies_to--> `ROM Brasil`  [0.9]
  deploy/SETUP-IGUATEMI.md → pitch-henrique.md, README.md, deploy/SETUP-IGUATEMI.md
- `ROM Brasil` --uses--> `Admin Role`  [0.9]
  pitch-henrique.md, README.md, deploy/SETUP-IGUATEMI.md → README.md, docs/relatorio-diretoria-rom-brasil.md
- `ROM Brasil` --implements--> `API-first Architecture`  [0.9]
  pitch-henrique.md, README.md, deploy/SETUP-IGUATEMI.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **** — admin_role, staff_role, financeiro_role, estoque_role [0.95]
- **** — rom_brasil, rom_iguatemi, cerebro_waltter [0.95]
- **** — webhook_avec, webhook_whatsapp, webhook_telegram, cron_sync_avec [0.9]
- **** — avec, evolution_api, telegram, anthropic_claude [0.9]
- **** — vercel, neon, github [0.95]
- **** — phase_0_today, phase_1_diagnostics, phase_2_digital_brand, phase_3_content, phase_4_platform [0.9]
- **** — rom_brasil, rom_iguatemi [0.95]
- **** — investment_line_infra, investment_line_labor [0.95]

## Communities (88 total, 31 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (64): authorize(), executeSync(), GET(), parseMode(), POST(), GET(), notLinkedMessage(), POST() (+56 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (55): Admin Role, Claude (Anthropic), API-first Architecture, Avec, Briefing Intelligence, Cérebro Waltter, contact_events Table, Cron Sync Avec (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (36): POST(), PATCH(), GET(), GET(), Ctx, PATCH(), GET(), GET() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (45): computeDurationMinutes(), ENTRADA_HINTS, inferMovementType(), normalize0011ReactivationRow(), normalizeAppointmentRow(), normalizeAttendanceRow(), normalizeCancellationRow(), normalizeClientRow() (+37 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (36): Ctx, DELETE(), createSchema, GET(), POST(), Ctx, DELETE(), createSchema (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (33): normalizeP1AcquisitionRow(), normalizeP2BirthdayRow(), normalizeP2ChannelRow(), normalizeP2RatingRow(), normalizeP3NewClientsRow(), AvecMapperKind, AvecReportDef, AvecReportTier (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (29): GET(), getLastAvecSync(), recordSyncRun(), getSql(), buildSalonContext(), SalonContext, computeSalonIntelligence(), getDailyGoal() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (33): asMonth(), asQuarter(), asStage(), GET(), POST(), runDelivery(), BuildDirectorReportOptions, esc() (+25 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (29): POST(), GET(), Account, AuthOptions, AuthRole, AuthSession, canViewRevenue(), createSessionToken() (+21 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (28): Ctx, GET(), handleClienteCommand(), briefPrompt(), buildRuleBrief(), generateBrief(), contact, EnrichedService (+20 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (32): academy, concept, dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (28): Ctx, derivePreferredPro(), GET(), isUnsetPreference(), patchSchema, ServiceHint, Ctx, POST() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (19): ContactListItem, listContactsWithSummary(), ContactRow, computeRecommendations(), enrichServices(), ActionItem, JoinedService, urgencyForServices() (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (27): fetchAllAvecReport(), periodRange(), guessServiceCategory(), isHairService(), isNailService(), AvecSyncRun, beginAvecSyncRun(), findOrCreateService() (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (22): LastVisitCard(), LastVisitData, AddServiceSheet(), ClientStats, Contact, ContactDetailPage(), ContactEvent, EditContactSheet() (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (16): Ctx, POST(), execute(), GET(), parseMode(), POST(), GET(), POST() (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (18): AdminSessionBar(), AppShell(), STANDALONE_PATHS, BottomNav(), FINANCE_BOTTOM_NAV, STOCK_BOTTOM_NAV, DesktopSidebar(), ADMIN_NAV (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (19): Ctx, POST(), createSchema, GET(), POST(), Ctx, DELETE(), createSchema (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (19): POST(), secretariaPrompt(), staffOnlyMessage(), TelegramUpdate, welcomeMessage(), askAI(), fallbackReply(), getAiModel() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (17): POST(), logEvent(), normalizeSearchText(), formatCatalogForPrompt(), SALON_CATALOG, buildSystemPrompt(), formatHistory(), handleWhatsAppMessage() (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (22): formatTruncationWarning(), getFastStockReports(), getFullStockReports(), getStockReports(), beginRun(), describeStockSyncPlan(), emptyStats(), finishRun() (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (22): NormalizedStockAlert, NormalizedStockMovement, NormalizedStockPosition, NormalizedStockPurchase, getLatestSnapshot(), applyStockAlert(), CreateManualMovementInput, getStockValuationSnapshot() (+14 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (14): POST(), requireAuth(), RomSeedPreset, ContactStatus, listSeedPresets(), PRESETS, resolveSeedPresetFromBody(), runSeed() (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (13): BriefSheet(), BriefSheetProps, HojeData, HojePage(), PlaybookItem, ScheduleItem, fmtDuration(), isEmbedUrl() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (18): fmtAvecDate(), getAvecReportRegistry(), avg(), buildQuarterRow(), daysSince(), emptyMonthRow(), fetch0011Quarter(), fetch0021Month() (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (13): matchDirectorProfessional(), normalizeProKey(), pros, BRASIL_DIRECTOR_PROFESSIONALS, IGUATEMI_DIRECTOR_PROFESSIONALS, listDirectorProfessionals(), ROSTERS, DirectorProfessional (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (13): Session, LogoutButton(), Props, SectionCard(), EstoqueDiagnosticoPage(), fmtIso(), HealthStatus, StockSyncRun (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (12): BRANDS, getDefaultSeedPreset(), getRomPanelId(), parseRomPanelId(), parseSeedPreset(), RomBrand, defaultProductionHost(), EvolutionApiAdapter (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (17): buildDaniReactivation(), buildMockReturnBlocks(), buildMonthsForPro(), buildQuartersForPro(), buildReactivation(), buildSyntheticReactivation(), daysSince(), defaultSelectedMonth() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (15): Ctx, PATCH(), schema, asRecord(), EVENT_ALIASES, ingestAvecWebhook(), normalizeAvecWebhookBody(), NormalizedAvecWebhook (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (12): Avatar(), CHANNEL_LABEL, PrimaryButton(), STATUS_LABEL, STATUS_TONE, StatusPill(), Contact, ContatosPage() (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (17): @anthropic-ai/sdk, exceljs, @neondatabase/serverless, next, dependencies, @anthropic-ai/sdk, exceljs, @neondatabase/serverless (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (11): buildMonthOptions(), buildQuarterOptions(), defaultMonthKey(), defaultQuarterKey(), MONTH_LABELS, MONTHS, previousQuarterKey(), QUARTERS (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.32
Nodes (13): buildDirectorReport(), comparisonMonthSet(), defaultCompareQuarter(), defaultSelectedQuarter(), label0011(), label0021(), MONTH_PT, monthsInComparableQuarter() (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.21
Nodes (13): buildRecallWhatsAppMessage(), ReactivationClient, buildClientWhatsAppMessage(), ClientMessageContact, ClientMessageService, daysSince(), firstName(), formatVisitDate() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (8): AdminPage(), AvecStatus, ContactRow, fmtIso(), HealthStatus, KpiData, LoadState, ScheduleRow

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (12): CountBadge(), InfoBanner(), EstoquePage(), StockAlert, StockKpis, StockMovement, StockProduct, StockValuationBucket (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (12): HealthItem(), ActionItem, aggregateByChannel(), aggregateByDay(), AvecStatus, DashboardPage(), KpiData, PerformanceData (+4 more)

### Community 39 - "Community 39"
Cohesion: 0.23
Nodes (12): addDays(), GET(), ProfessionalWithDelta, ensureSalonP1Table(), getLatestSalonP1Daily(), getSalonP1Daily(), getSalonP1DailyNear(), P1AcquisitionRow (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.21
Nodes (9): DeltaTag(), currentMonthKey(), FinanceCategory, FinanceExpense, FinanceiroPage(), FinanceKpiBucket, FinanceKpis, fmtDelta() (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (12): labelMonth(), monthsInQuarter(), MonthKey, fetchTmComparison(), monthKeyFromDate(), monthRange(), previousMonthKey(), previousQuarterKey() (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.30
Nodes (11): allMonthsUpTo(), fetchProfessionalProfileMonths(), buildMockRevenueBlocks(), aggregateQuarterRevenue(), quarterOfMonth(), buildProfessionalProfileWorkbook(), groupByYear(), MONTH_PT (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.36
Nodes (9): financeSummary(), POST(), staffOnlyMessage(), stockSummary(), TelegramUpdate, welcomeMessage(), computeStockKpis(), listAlerts() (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.36
Nodes (9): config, isFinancePath(), isOnboardingPath(), isProtectedApi(), isProtectedPage(), isPublicApi(), isStockPath(), middleware() (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.36
Nodes (6): check_unit(), fail(), json_ok(), pass(), post-deploy-verification.sh script, warn()

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, start, test, test:watch, verify:deploy

### Community 47 - "Community 47"
Cohesion: 0.36
Nodes (6): HealthForSetup, PRIORITY_LABEL, SetupChecklist(), isItemConfigured(), SETUP_ITEMS, SetupItem

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (5): Avec 0011 - Retorno, Avec 0021 - Faturamento, Cron Director Report, Director Report, Resend API

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **302 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+297 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSql()` connect `Community 6` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 29`, `Community 39`, `Community 41`, `Community 43`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `getBrand()` connect `Community 18` to `Community 0`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 7`, `Community 6`, `Community 9`, `Community 42`, `Community 43`, `Community 16`, `Community 49`, `Community 19`, `Community 23`, `Community 27`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `ok()` connect `Community 2` to `Community 0`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 39`, `Community 11`, `Community 43`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 29`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _302 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05744888023369036 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06233766233766234 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10957910014513789 - nodes in this community are weakly interconnected._