# Modlist.org - Mod Sharing Platform

Modlist.org is a high-fidelity full-stack mod repository and sharing platform for rhythm games (such as *A Dance of Fire and Ice* and *Rhythm Doctor*). Built on **Nuxt** and runs on **Cloudflare Workers** with **D1** and **R2**, it incorporates verified creator badges, automated OAuth authentication, and strict moderation workflows.

---

## ├── Project Structure

```
├── app/                    # Frontend (pages, layouts, composables, locales)
├── server/
│   ├── api/                # API endpoints (admin, auth, mods, users)
│   ├── db/
│   │   ├── schema.ts       # Drizzle schema for D1
│   │   └── migrations/     # SQL migrations (drizzle-kit generate)
│   ├── middleware/auth.ts  # Resolves the session user from the JWT cookie / Bearer token
│   ├── routes/logos/       # Serves mod logos from R2
│   └── utils/              # DB access, mod hydration, JWT, webhooks
├── scripts/mongo-to-d1.mjs # One-shot MongoDB -> D1/R2 migration
├── nuxt.config.ts
└── wrangler.jsonc          # Worker, D1 and R2 bindings
```

---

## 🚀 Key Features

### 1. Advanced Multi-Select Filters
- **Multi-Game Filtering**: Filter mods for multiple target games (e.g. ADOFAI and Rhythm Doctor) simultaneously.
- **Multi-Category Filtering**: Narrow down search results by selecting multiple tag categories (UI/UX, Gameplay, Utility, Visuals, Library).
- **Interactive Tag Badges**: Dynamic dismissible tag badges are displayed below the controls for easy category/game toggling and one-click resets.

### 2. Collaborator Invitation & Security System
- To prevent security risks (such as adding popular developers to malicious mods without consent), added collaborators must accept invitations.
- **Staging invitations**: When submitting or editing a mod, newly added collaborators are placed in a `pendingCollaboratorIds` array.
- **Invitations panel**: Invited creators see pending invitations on their dashboard (`/pending`) and can choose to **Accept** or **Decline**. Once accepted, they are moved to active collaborators and gain editing permissions.

### 3. Non-Blocking Metadata Edit Review System
- When a creator edits a mod's **Name**, **Summary**, or **Description**, the live mod page remains approved and visible to the public with its original details.
- The modifications are staged inside `pendingEdit` on the database.
- **Interactive Preview Banner**: Authors and admins see a warning banner at the top of the mod detail page with a **"Preview Changes" (수정사항 미리보기)** toggle. Active toggling swaps the live display details with the proposed changes in real-time.
- **Admin Side-by-Side Review Grid**: Admins review proposed edits in the admin panel with a visual grid comparing previous details and a split-pane view for description diffs.

### 4. Version Updates & Approval
- Creators can submit new releases (version number, download URL, changelog) directly from the mod details sidebar.
- If the developer is not a *Verified Creator* or *Admin*, the new version must be reviewed and approved by an administrator before becoming available for public download.

### 5. Discord OAuth2 Authentication
- Integration with Discord login logs users in, stores profile sessions, and automatically updates avatars/display names in the background.

---

## 🛠️ Technology Stack

- **Framework**: [Nuxt](https://nuxt.com/) (Vue 3, Nitro `cloudflare_module` preset, TypeScript)
- **Hosting**: Cloudflare Workers (static assets via Workers Assets)
- **Database**: Cloudflare D1 via [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: Cloudflare R2 for mod logos
- **CSS**: TailwindCSS
- **Localization**: `@nuxtjs/i18n`

---

## ⚙️ Getting Started

```bash
bun install
cp .env.example .dev.vars        # fill in Discord OAuth + JWT secret
bun run db:migrate:local         # create the local D1 schema
bun run dev                      # http://localhost:3000 (local D1/R2 emulated by wrangler)
```

`bun run preview` builds and runs the real Worker bundle locally with `wrangler dev`.

### Schema changes

Edit `server/db/schema.ts`, then `bun run db:generate` to create a migration in `server/db/migrations/`.

---

## 📦 Deployment

```bash
npx wrangler login
bun run deploy   # nuxt build -> apply D1 migrations -> wrangler deploy
```

Secrets are Worker secrets named `NUXT_*` (see `.env.example`), e.g. `npx wrangler secret put NUXT_JWT_SECRET`.
