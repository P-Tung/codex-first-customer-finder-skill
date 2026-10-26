# Vietnam SME Lead Finder

Use these instructions when a user asks to find, qualify, review, or manage potential business customers in Vietnam in this repository.

## Keep each search configurable

- Treat the user's current description as this run's ICP. Do not turn an example industry, company size, score threshold, or buying signal into a permanent default.
- If the user says only “SMEs that need AI automation,” treat agency AI automation setup as the offer and use broad SME discovery. State working assumptions and ask one concise question only when a missing detail would materially change the shortlist.
- Preserve user-supplied target profile, quality profile, exclusions, geography, and lead count. Use report-generator defaults only where the user has not specified a preference.
- Distinguish an actual public request for automation from weaker triggers such as funding, expansion, hiring, or manual customer operations. Never present a trigger as confirmed purchase intent.

## Start and verify the dashboard

1. Read `first-customer-finder/SKILL.md`, plus its Vietnam source and report-artifact references before live research.
2. Run `./lead-finder doctor`. If the bundled dashboard is missing, run `./lead-finder setup`.
3. Run `./lead-finder start --no-open`, then `./lead-finder status`. Only report it running after the local health check succeeds. The app uses a per-user macOS LaunchAgent and binds to `127.0.0.1` only.
4. Read `./lead-finder brief` before adding results. Preserve statuses and notes; never reset contacted or ignored companies.

If macOS or Codex asks permission to install the per-user LaunchAgent, explain that it keeps the local dashboard available between Codex commands and is not exposed to the network. Wait for approval. Do not bypass permission prompts. On failure, inspect `~/Library/Application Support/VietnamLeadFinder/server.log` and report the observed error.

## Research and import

- Follow the existing skill's research process, evidence rules, schema, and generator. Search in Vietnamese with and without diacritics, and English variants.
- Use publicly accessible company sources: official websites, Vietnamese directories such as Trang Vàng Việt Nam, public business registration records where useful, public LinkedIn/Facebook pages and posts, job listings, company announcements, funding news, trade or association directories, forums, and search engines.
- Inspect original pages where possible. Keep company identity separate from pain, intent, or timing evidence. Record source URLs, signal date, check date, and uncertainty. A directory listing alone is not demand evidence.
- Do not bypass sign-in, access private groups, infer personal emails or phone numbers, use data brokers, or contact prospects. Funding and hiring are timing clues, not proof of purchase intent.
- Record phone, email, LinkedIn, and Facebook only when an original public source explicitly lists them as company contact details. Add the source URL for each field; leave missing fields blank. Do not guess, enrich, or infer.
- Create a fresh product-scoped run folder under `outputs/first-customer-finder/`. Generate and validate v2 `analysis.json`, Markdown, and CSV using the included Python helpers. Import only validated JSON with `./lead-finder import <absolute-analysis.json-path>`.
- Verify imported counts with `./lead-finder brief`, confirm `./lead-finder status`, then open `http://127.0.0.1:4317` in Comet. If browser control is unavailable, provide the URL and state that visual opening remains for the user.
- Report added and duplicate counts, evidence coverage, caveats, and report/CSV paths. Never describe a prospect as a confirmed buyer.

Update statuses or notes only when the user asks. Never send outreach, submit forms, follow accounts, or modify an external CRM.
