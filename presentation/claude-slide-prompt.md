# Claude Prompt: Generate Ekklesia Presentation Slides in Egyptian Arabic

## Your Task

You are a presentation designer and copywriter. Create a complete, visually-described slide deck for **Ekklesia** — a church management platform — targeted at **church leaders** (pastors, priests, elders, ministry leaders) in Egypt and the Arabic-speaking world.

**Every single word of text on every slide must be in Egyptian Arabic (العامية المصرية).** Not formal Modern Standard Arabic — use the natural, warm, conversational Egyptian dialect that church leaders in Egypt actually speak. For example: "إنت عارف" not "أنت تعلم", "بيضيع" not "يُفقد", "الناس" not "الأشخاص", "دلوقتي" not "الآن".

---

## About the App

**Ekklesia (إكليسيا)** is a complete church management platform built specifically for churches in the Middle East and Arabic-speaking world. The name comes from the Greek word Ἐκκλησία used in the New Testament for the gathered assembly of believers.

### What is ALREADY built and working today (95% complete):

**1. Visitor Pipeline (نظام الزوار)**
- Public QR code form: print one QR code, place it at the church entrance. Visitors scan with their phone and fill a simple form (name, phone, age range, how they heard about the church).
- Instant WhatsApp welcome message sent automatically the moment a visitor submits.
- Each visitor is auto-assigned to a specific leader for follow-up.
- 48-hour SLA countdown: if the assigned leader doesn't follow up within 48 hours (configurable per church), the system escalates with red alerts on the admin dashboard.
- Visitor status pipeline tracks: New → Assigned → Contacted → Converted to Member.
- One-click conversion from visitor to full church member — all data carries over.
- Dashboard widget shows total new visitors, SLA violations, and conversion funnel.

**2. Attendance & At-Risk Detection (الحضور وكشف المخاطر)**
- Group leaders take attendance in under 60 seconds: open the gathering on their phone, tap names who showed up, submit. Default is absent — you only mark who came.
- Supports statuses: present, absent, excused, late.
- System automatically detects members with 2+ consecutive absences and flags them as "at risk" (في خطر).
- Group leader dashboard shows at-risk members prominently with "last seen" date and days absent count.
- Leaders can log follow-up notes: "Called Tuesday, he's traveling" or "Visited her at home, she's going through a hard time."
- Admin dashboard shows at-risk members across ALL groups — full church visibility with zero blind spots.
- 12-week rolling attendance trend charts for every group.

**3. Groups & Ministries (المجموعات والخدمات)**
- Organize the church into Ministries (e.g., Youth Ministry, Women's Ministry, Worship) and Groups within those ministries (e.g., Youth Group A, Youth Group B).
- Each group has: a leader, optional co-leader, meeting day/time, location, max member count, open/closed status.
- Group types: small group, youth, women, men, family, prayer, other.
- Group Health Score — automatically calculated from: attendance rate trend, prayer request activity, member growth/decline. Displayed as color-coded indicators (green/yellow/red).
- Prayer requests tracked per gathering: members submit requests, leaders track status (active → answered → archived), privacy controls (leader-only vs. group-visible).
- Gathering notes and topics logged per meeting.
- Ministry member management with roles: member, leader, co-leader.

**4. Multi-Channel Communication (التواصل متعدد القنوات)**
- **WhatsApp** (primary channel) — via 360dialog/Twilio WhatsApp Business API. Template-based messages in Arabic and English.
- **Email** — via Resend. HTML emails with RTL support for Arabic.
- **Push Notifications** — via Firebase Cloud Messaging. Works on any device with the PWA installed.
- **In-App Notifications** — always sent as baseline. Notification center in the app with read/unread status.
- Each member sets their preferred notification channel (WhatsApp, email, push, all, or none).
- The dispatcher automatically routes to the right channel based on preference.
- Automated triggers (no manual effort):
  - Gathering reminders: sent 24 hours before every group meeting
  - Visitor assignment: leader gets notified instantly when assigned a new visitor
  - At-risk alerts: leader notified when a member hits 2+ consecutive absences
  - Visitor SLA escalation: admin alerted when 48-hour follow-up deadline passes
  - Event reminders: sent before church events
  - Serving invitations: volunteer gets WhatsApp message with their role assignment
- Targeted announcements: send to whole church, specific ministry, specific group, by role, by gender, by status, or custom audience.
- Full delivery tracking and logging for every notification sent.

**5. Events & Service Planning (الفعاليات وتخطيط الخدمات)**
- Create events: title (EN/AR), description, date/time, location, capacity, visibility (public/members-only), registration required toggle.
- Event templates: save recurring event structures (Sunday service, Wednesday prayer, monthly conference) with pre-defined segments and service needs. Create new events from templates in one click.
- Event segments: break events into parts (worship 30min, sermon 45min, communion 15min) each linked to a ministry.
- Service staffing / volunteer management:
  - Define service needs per event: "Need 3 worship team members, 2 sound operators, 4 ushers, 2 children's ministry workers"
  - Assign specific people to roles with bilingual role labels
  - Each assignee gets a WhatsApp invitation with their role details
  - Accept/Decline workflow — assignees respond in the app
  - Coverage dashboard: confirmed vs. needed for every role, days before the event
  - Ministry leaders see service requests for their teams
- Member registration (in-app) and public registration (via link — auto-adds to visitor pipeline).
- Check-in on event day with tap interface.
- Event registration list with attendance tracking.

**6. Serving Teams (فرق الخدمة)**
- Create serving areas: worship, sound, ushers, children's ministry, setup, greeting, photography, etc.
- Each area has a dedicated leader, color code, optional ministry link, description.
- Three scheduling modes:
  - **Recurring**: same volunteers every week (auto-assigned, just get reminders)
  - **Rotating**: volunteers alternate (week A team / week B team)
  - **Invited**: coordinator manually assigns per event
- Serving slots with date, time, max volunteers.
- Member sign-up tracking (signed_up → confirmed → cancelled).
- Member profiles show full serving history — recognize faithful servants.

**7. Songs & Worship (الترانيم والتسبيح)**
- Song library with **11,128 pre-imported Arabic worship songs** from the Tasbe7na (تسبحنا) collection.
- Each song: title (EN/AR), artist, lyrics (EN/AR), tags, tempo, key, chord charts, audio links, YouTube links.
- Full-text search on title, lyrics, and artist — optimized for Arabic text with fuzzy search and diacritics normalization.
- Setlist builder: create ordered setlists for worship services, linked to event service plans. Drag-to-reorder, key overrides per song.
- **Presenter mode**: full-screen lyrics display for projection during worship. Customizable: background color, text color, font family (Arabic/English fonts), font size. Slide-by-slide navigation through lyrics.
- Song display settings per song (custom colors, fonts).

**8. Bible Integration (الكتاب المقدس)**
- Multi-version support via API.Bible:
  - Arabic: Van Dyck (فان دايك), Arabic Bible
  - English: ESV, NIV
- Each church sets a default Bible version; each member can override with their personal preference.
- Book → Chapter → Verse navigation.
- Full-text search across all versions with results optimized for Arabic (trigram indexing).
- Personal bookmarks with notes.
- Personal highlights with multiple colors (yellow, green, blue, pink, orange).
- **Bible presenter mode**: display scripture full-screen during sermons. Clean, large text for projection.
- Server-side API proxy — Bible API keys never exposed to the browser.
- Bible verse caching to reduce API calls.

**9. Coptic Orthodox Liturgy (القداس القبطي)**
- Full Coptic Orthodox liturgy content accessible through the presenter.
- Prayer content and hymns in three scripts: Arabic, English, and Coptic.
- Language toggle buttons to switch between scripts during services.
- Scroll mode and structured view options for different presentation styles.

**10. Pastoral Care & Outreach (الرعاية الروحية والتواصل الخارجي)**
- Pastoral notes on member profiles:
  - Types: general, visit, phone call, counseling, prayer
  - Sensitive flag: notes marked "sensitive" are visible only to super_admin (senior pastor)
  - Follow-up date: set a date, system reminds you on that day
  - Care timeline: every interaction displayed chronologically on the member's profile
- Outreach module:
  - Track member visitation by pastoral staff
  - Schedule follow-up visits
  - Visit notes and outcomes
  - "Needs follow-up" flag for at-risk members
  - City-based filtering for visit planning
  - Total visit count per member
- Admin dashboard shows all overdue follow-ups across all pastoral staff.

**11. Leadership Dashboard & Reports (لوحة القيادة والتقارير)**
- **Super Admin Dashboard**:
  - KPI cards: active members (with trend), new visitors (with SLA alerts), attendance rate (weekly + trend), upcoming events
  - Visitor pipeline visualization: new → assigned → contacted → converted (with counts)
  - Group health dashboard: all groups with member count, attendance rate, at-risk count, trend arrows
  - Attention items list: SLA violations, at-risk members, unfilled serving slots, active prayer requests, overdue outreach follow-ups
  - Upcoming this week: events, gatherings, serving slots
  - 12-week attendance trend chart
- **Ministry Leader Dashboard**:
  - Ministry overview: member count, group count, attendance rate
  - Attendance trend chart for their ministry
  - Upcoming events for the ministry
  - Service assignments for their teams
  - Group health snapshot for their groups
  - Attention items specific to their ministry
- **Group Leader Dashboard**:
  - Group member list with status indicators
  - At-risk members with days absent count
  - Recent prayer requests with status
  - Assigned visitor count
  - Attendance trends for their group
  - Recent gatherings with attendance rates
- **Member Dashboard**:
  - Personal KPIs: attendance rate, milestone count, group count, unread notifications
  - My Groups cards (with leader name, next gathering date)
  - Upcoming events I'm registered for
  - Serving slot assignments
  - Recent announcements (pinned + recent)
- Reports:
  - Attendance reports (filterable by group, date range) with CSV export
  - Member growth reports
  - Visitor conversion reports
  - Prayer activity dashboard

**12. Financial Management (الإدارة المالية)**
- **Donations**: record giving with payment method (cash, check, bank transfer, credit card, online, mobile, in-kind), amount, currency, exchange rate, fund designation, donor info, anonymity toggle, tax deductibility, tithe tracking, frequency (one-time/recurring).
- **Funds**: create restricted/unrestricted giving categories (tithes, offerings, missions, building, benevolence).
- **Campaigns**: fundraising campaigns with goals, start/end dates, public/private visibility, pledge support, progress tracking.
- **Pledges**: commitment tracking with installment schedules.
- **Expense Requests**: staff/volunteers submit reimbursement requests → leadership approves/rejects with notes → full audit trail (submitted_by, approved_by, approved_at).
- **Budgets**: annual/quarterly/monthly budgets with line items by account. Actual vs. planned tracking.
- **Chart of Accounts**: full accounting structure (assets, liabilities, equity, income, expenses).
- **Fiscal Years**: annual accounting periods with open/closed status.
- **Transactions**: complete transaction ledger with posting status and audit trail.
- **Bank Reconciliation**: match bank statements to internal transactions.
- **Deposit Batches**: group donations for deposit tracking.
- **Giving Statements**: generate tax receipts for members.
- **"My Giving" page**: members see their own donation history, year-to-date and month-to-date totals, donation breakdown by fund and method, active pledges, receipt generation. No need to call the finance office.
- **Admin Finance Dashboard**: fund balances, month/YTD income and expense charts, pending expense requests, active campaigns with progress, recent donations, quick actions.

**13. Announcements (الإعلانات)**
- Create announcements with title and body (bilingual EN/AR).
- Status: draft, published, archived.
- Pin important announcements to the top.
- Set expiration dates.
- Targeted delivery: whole church, specific ministry, specific group, or custom audience.
- Multi-channel broadcast: WhatsApp, email, in-app, push.
- Scheduled delivery (cron-based).
- Member announcement feed with pinned and recent sections.

**14. Permissions & Security (الأذونات والأمان)**
- 4 roles: Member (عضو), Group Leader (قائد مجموعة), Ministry Leader (قائد خدمة), Super Admin (مسؤول أعلى).
- 21 granular permission keys: can_view_members, can_manage_members, can_view_visitors, can_manage_visitors, can_manage_events, can_manage_templates, can_manage_serving, can_manage_announcements, can_view_reports, can_manage_songs, can_view_prayers, can_manage_outreach, can_view_finances, can_manage_finances, can_manage_donations, can_view_own_giving, can_manage_budgets, can_approve_expenses, can_submit_expenses, can_manage_campaigns, can_reconcile_bank.
- 3-layer permission resolution: hardcoded role defaults → church-level role customization → user-specific overrides (additive only — can grant, never revoke).
- Audit logging: tracks who accessed what, when, with full change history.
- Permission audit log with detailed change tracking.
- Role suggestions based on group/ministry involvement.
- Row-Level Security (RLS) on every database table — complete data isolation between churches.

**15. Multi-Church Support (دعم تعدد الكنائس)**
- Fully multi-tenant: every table filtered by church_id.
- Self-service church registration.
- Users can belong to multiple churches and switch between them.
- Per-church configuration: logo, primary color, welcome message, timezone, country, denomination, default Bible version, SLA hours, notification preferences, feature flags.
- Feature flags per church: advanced_reporting, sms_notifications, api_access, custom_fields, audit_log_ui, outreach_module, song_presenter.

**16. Bilingual Arabic/English (ثنائي اللغة)**
- Full RTL layout for Arabic — every component, every screen.
- Auto-detection by geolocation (Arabic countries default to Arabic).
- Manual language toggle always available.
- All database fields support dual entry: name + name_ar, title + title_ar, etc.
- Message catalogs: 65KB+ English translations, 81KB+ Arabic translations, 81KB+ Egyptian Arabic translations.
- Date/time localization per locale.
- Notification templates in both languages, sent based on user preference.

**17. Progressive Web App (تطبيق ويب تقدمي)**
- Installable on any device — add to home screen, looks like a native app.
- No app store needed. No forced updates. Always latest version.
- Offline support via service worker.
- Push notifications via Firebase Cloud Messaging.
- Works on Android, iOS, Windows, Mac, any browser.
- Standalone display mode.

---

### What is PLANNED for the future (not yet built):

1. **Online Giving via Stripe** — Members give directly through the app with credit/debit card or bank transfer. Automatic receipts.
2. **Advanced Analytics / BI Dashboard** — Deeper trend analysis, engagement scoring, predictive indicators for member retention.
3. **SMS Notifications** — Add SMS as a channel (infrastructure code exists, Twilio SMS not yet activated).
4. **Custom Fields Per Church** — Churches define their own data fields on member profiles, events, and groups.
5. **Bulk Data Import/Export** — Import existing member lists from Excel/CSV. Export any dataset.
6. **Rich Email Templates** — Branded, designed church emails with drag-and-drop builder.
7. **API Access for External Integrations** — REST API keys for connecting other tools.
8. **Media Sharing in Groups** — Photos, videos, and files shared within group feeds.
9. **Dedicated Mobile App** — Native iOS and Android apps (in addition to the PWA).
10. **AI-Powered Insights** — Smart recommendations for engagement, volunteer matching, attendance predictions.

---

## Slide Design Instructions

Create **18 main slides + 4 appendix slides**. For each slide, provide:

1. **Slide number and title** (in Egyptian Arabic)
2. **Visual layout description**: describe exactly what the slide looks like — background color/gradient, text placement, icons, illustrations, charts, screenshots, comparison tables. Be specific enough that a designer can build it.
3. **All text content** (in Egyptian Arabic — عامية مصرية, warm and conversational, the way a pastor in Cairo would talk to his leadership team)
4. **Speaker notes** (in Egyptian Arabic — what the presenter says out loud while showing this slide)

### Tone and Language Rules:
- **Egyptian Arabic throughout**: "إنت", "ده", "بتاع", "عشان", "دلوقتي", "كده", "بيحصل", "مفيش"
- **Pastoral and warm**: talk like a caring church leader, not a software salesman
- **Use church terminology naturally**: "خدام", "اجتماع", "رعاية", "تسبيح", "عشور", "تقدمات", "افتقاد", "الراعي", "أب الاعتراف"
- **No technical jargon**: never mention Next.js, Supabase, PostgreSQL, RLS, API, Firebase, React, or any programming terms
- **Relatable examples**: reference real church scenarios — "لما حد بييجي الكنيسة أول مرة", "قائد المجموعة بيكلم ١٥ واحد يوم الجمعة بالليل", "الأمين المالي قاعد على إكسل"
- **Numbers and statistics**: use Arabic numerals (١، ٢، ٣) throughout

### Visual Style:
- **Clean, modern, professional** — not flashy or corporate
- **Primary color palette**: deep navy (#1a1a2e), warm gold (#d4a843), white (#ffffff), light gray (#f5f5f5)
- **Accent colors**: soft green for "implemented" features, warm amber for "coming soon"
- **Typography**: large, readable text. Headlines in bold. Minimal text per slide — the details are in speaker notes.
- **Icons**: use simple, clean line icons (Lucide-style) for each feature
- **Screenshots**: where noted, describe placeholder positions for actual app screenshots
- **Arabic text alignment**: right-aligned throughout. RTL layout.

### Slide Structure:

**Slides 1-3: Pain & Problem**
- Slide 1: Title slide with Ekklesia logo, tagline, and subtitle
- Slide 2: "The Problem" — 5 pain points church leaders face daily
- Slide 3: "The Cost" — what happens when these problems go unsolved (lost visitors, drifting members, burned-out leaders)

**Slide 4: Solution Introduction**
- Introduce Ekklesia as the answer — one platform, Arabic-first, works everywhere

**Slides 5-14: What's Already Built (feature walkthrough)**
- Slide 5: Visitor Pipeline (QR code → WhatsApp welcome → SLA tracking → conversion)
- Slide 6: Attendance & At-Risk Detection (60-second attendance, automatic at-risk flagging)
- Slide 7: Groups & Ministries (health scores, prayer tracking, oversight)
- Slide 8: Communication (WhatsApp-first, 4 channels, automated triggers)
- Slide 9: Events (templates, registration, check-in, service staffing)
- Slide 10: Serving Teams (scheduling, invitations, coverage dashboard)
- Slide 11: Arabic/English Bilingual (native RTL, 11,000+ songs, Coptic liturgy, Bible)
- Slide 12: Pastoral Care (notes, sensitivity controls, follow-up reminders, outreach)
- Slide 13: Financial Management (donations, funds, campaigns, expenses, budgets, reconciliation, My Giving page)
- Slide 14: Role-Based Dashboards (what each role sees — pastor, ministry leader, group leader, member)

**Slide 15: Security & Privacy**
- Data isolation, audit logging, no third-party sharing

**Slide 16: Future Roadmap**
- What's coming: Stripe giving, advanced analytics, SMS, custom fields, mobile app, AI insights

**Slide 17: Comparison with Alternatives**
- Table comparing Ekklesia vs. Planning Center vs. Breeze vs. ChurchTrac

**Slide 18: Getting Started / Call to Action**
- 5-step onboarding process, "your church can be live in one week"

**Appendix Slides (A-D):**
- A: Song Library & Presenter Mode (detailed)
- B: Bible Integration (detailed)
- C: Coptic Orthodox Liturgy Resources (detailed)
- D: Permission System (detailed)

---

## Critical Reminders

1. **EVERYTHING in Egyptian Arabic** — every title, bullet, speaker note, label, and call-to-action
2. **Clearly separate "Already Built" (slides 5-14) from "Coming Soon" (slide 16)** — this is critical for credibility
3. **Include ALL the feature details** provided above — don't summarize or skip anything. Every bullet point from the feature descriptions should appear somewhere in the slides or speaker notes.
4. **Speaker notes should be detailed** — 4-8 sentences per slide, conversational, as if the presenter is actually talking to a room of 20 church leaders sitting around a table
5. **Visual descriptions should be specific** — "blue gradient background with white text, centered title at 48pt, three icon-cards arranged horizontally below" not just "nice layout"
6. **The comparison table (Slide 17) must be accurate** — Ekklesia's competitors (Planning Center, Breeze, ChurchTrac) genuinely do NOT offer Arabic support, WhatsApp notifications, or automated visitor SLA tracking
7. **End with a strong call to action** — "خلينا نحجز ٣٠ دقيقة نمشي معاك على بيانات كنيستك الحقيقية"
