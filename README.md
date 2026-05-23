# Modlist.org - Mod Sharing Platform

Modlist.org is a premium, high-fidelity full-stack mod repository and sharing platform for rhythm games (such as *A Dance of Fire and Ice* and *Rhythm Doctor*). Built on **Nuxt 3** and **MongoDB**, it incorporates verified creator badges, automated OAuth authentication, and strict moderation workflows.

---

## ├── Project Structure

The project is structured as a unified Nuxt 3 full-stack application:

```
├── app/                          # Frontend Layer
│   ├── assets/
│   │   └── css/main.css          # Custom styling with glassmorphism & glows
│   ├── composables/
│   │   └── useAuth.ts            # Reactive authentication composable
│   ├── layouts/
│   │   └── default.vue           # Global navigation with logo & auth profile
│   ├── locales/
│   │   ├── en-US.json            # English translations
│   │   └── ko-KR.json            # Korean translations
│   └── pages/
│       ├── index.vue             # Homepage with advanced filtering & mod grid
│       ├── admin.vue             # Administrator moderation queue
│       ├── pending.vue           # Creator pending queue & invitations panel
│       ├── submit.vue            # Mod registration form
│       ├── edit/[slug].vue       # Mod metadata editing form
│       └── mods/[slug].vue       # Mod details, version history & update submission
│
├── server/                       # Backend Layer
│   ├── api/                      # Serverless backend endpoints
│   │   ├── admin/                # Moderation (approval, unapproval, user roles)
│   │   ├── auth/                 # Discord OAuth login/callback lifecycle
│   │   ├── mods/                 # Mod CRUD, version uploads, downloads count
│   │   └── users/                # User profile search
│   ├── middleware/
│   │   └── auth.ts               # Decodes token & populates user session
│   ├── models/
│   │   ├── User.ts               # MongoDB Mongoose User model
│   │   └── Mod.ts                # MongoDB Mongoose Mod model with subschemas
│   ├── plugins/
│   │   └── mongodb.ts            # Mongoose connection initiator
│   └── utils/
│       └── jwt.ts                # JWT authentication signing and verifying utilities
│
├── public/                       # Static public assets
├── nuxt.config.ts                # Server module settings & environment variables
└── docker-compose.yml            # Docker container configurations for local MongoDB
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

- **Framework**: [Nuxt 3](https://nuxt.com/) (Vue 3, Serverless Backend, TypeScript)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/)
- **UI Library**: `overlayer-ui` (Aesthetics modeled on high-fidelity glowing dark themes)
- **CSS**: Vanilla CSS & TailwindCSS
- **Localization**: `@nuxtjs/i18n` (Multi-language translation support)

---

## ⚙️ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)
- [MongoDB](https://www.mongodb.com/) (Local server or MongoDB Atlas)

### 2. Set Up Environment Variables
Create a `.env` file in the root directory and configure the variables (see `.env.example`):
```env
# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017/modlist

# Discord Developer Portal Applications Credentials
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback

# JWT Token Secret
JWT_SECRET=generate-a-secure-random-key-here

# Admin Discord User IDs (comma-separated, e.g. "123456789012345678,987654321098765432")
ADMIN_DISCORD_IDS=your_discord_id
```

### 3. Spin Up Local Database (Optional)
If you have Docker installed, you can launch a local MongoDB container:
```bash
docker-compose up -d
```

### 4. Install Dependencies
```bash
bun install
# or
npm install
```

### 5. Run Local Development Server
```bash
bun run dev
# or
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build

To compile and build the Nuxt application for production:

```bash
bun run build
# or
npm run build
```
Launch the compiled Node.js build:
```bash
node .output/server/index.mjs
```
