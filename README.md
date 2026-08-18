<!-- ⚠️ Best viewed in VS Code Markdown Preview -->
<!-- In GitHub this file may look unformatted or misaligned -->

<div align="center" style="font-size:28px; font-weight:700; color:#4ec9b0;">
✨ RentVerse ✨
</div>

---

<div align="center" style="font-size:18px; font-weight:700; color:#aaaaaa;">
RentVerse is a modern real estate investment platform that combines traditional property investing with cryptocurrency payments. Built with React and Tailwind CSS, it mirrors the functionality of Arrived.com while adding blockchain-based transaction capabilities.
</div>

---
![Dashboard Overview](public/home.jpg)
---

# 🌐 RentVerse Demo
---

RentVerse is a demo platform showcasing a next-generation real-estate experience powered by cryptocurrency payments, interactive 3D property visualization, and a fully responsive, component-driven architecture.

---

## ✨ Key Features

- 💱 Cryptocurrency-enabled property transactions  
- 📱 Mobile-responsive interface  
- 🔍 SEO-optimized architecture  
- 📊 Real-time market data integration  
- 🏡 Interactive 3D property visualization  
- 🔗 Smart contract integration for secure blockchain transactions  

---

![Dashboard Overview](public/client.png)
---

## 🧩 Core Pages and Components

### 1. 🏠 Home Page
- Hero section with value proposition  
- Featured properties grid  
- “Why Choose Us” crypto benefits section  
- Step-by-step investment guide  
- Latest blog previews  
- Community section  

### 2. 🏘️ Properties Page
- Searchable and filterable property grid  
- Advanced search options  
- Detailed property cards  
- Three.js-powered 3D viewer  

### 3. 👥 About Us Page
- Mission and vision overview  
- Team member profiles  
- Platform statistics and milestones  

### 4. ✍️ Blog Section
- Category-based filtering  
- Blog search functionality  
- Author profiles  
- Social sharing options  

---

## 🧱 Development Guidelines

### 🧩 Component Standards
- Follow atomic design principles  
- Use TypeScript for type safety  
- Apply Tailwind breakpoints for responsiveness  
- Add comments and maintain documentation  

### 🔧 State Management
- React Context for shared global state  
- Redux for complex or multi-layered data flows  
- Minimal local component state  

### 🔐 Security Practices
- Validate all user inputs  
- Secure wallet connection handling  
- Follow blockchain transaction best practices  
- Run regular dependency and security audits  

---

## 🤝 Contributing

We welcome contributions! Please follow the workflow below:

1. 📌 Create a new feature branch  
2. 🧪 Write tests for added functionality  
3. 📝 Document new or updated features  
4. 🎯 Maintain consistent coding style  
5. 🔁 Submit a pull request with a clear description  

---

## 🙏 Acknowledgments

Inspired by Arrived.com and supported by the open-source work of the React and Tailwind CSS communities.

---

# How to run the project

## 1. Install

```bash
git clone <your-fork-url>
cd test_demo
npm install
```

## 2. Environment

The server reads `server/config/.config.env` (note: **not** `.env`).

```bash
cp server/config/config.env.example server/config/.config.env
```

The example values are enough to boot. MongoDB is not required — the app runs
without a database (`connectDatabase()` is disabled in `server/server.js`), and
the smart contract API does not use one.

The blockchain settings live at the bottom of that file:

```
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
REAL_ESTATE_ADDRESS=
ESCROW_ADDRESS=
SERVER_WALLET_PRIVATE_KEY=      # optional, admin writes only
```

`.config.env` is gitignored — never commit it.

## 3. Run

| Command | What it does |
|---|---|
| `npm start` | API + React dev server together |
| `npm run server` | API only — http://localhost:4000 |
| `npm run client` | React only — http://localhost:3000 |
| `npm run chain` | Local Hardhat node on :8545 |
| `npm run chain:deploy` | Deploys both contracts locally and fills in the addresses |
| `npm run compile` | Compiles `/contracts` |

### Full local stack, including the chain

```bash
npm run chain          # terminal 1 — local node
npm run chain:deploy   # terminal 2 — deploys + seeds one listed property
npm start              # terminal 3 — API + frontend
```

`chain:deploy` writes `REAL_ESTATE_ADDRESS` / `ESCROW_ADDRESS` into
`.config.env` and seeds property #1 (20 ETH, 5 ETH earnest), so the home page's
"Straight from the Contracts" panel has live data to show.

Without a running chain the app still works: the contract endpoints return
`503` and the home page degrades to a short notice.

> **Note on Node 25:** `react-scripts` fails to load its `jest` ESLint plugin on
> very recent Node versions. If `npm start` reports
> `Failed to load plugin 'jest'`, run the client with
> `DISABLE_ESLINT_PLUGIN=true npm run client`.

---

# Features added in this iteration

## 🌗 Light / dark theme

- Class-based Tailwind dark mode (`darkMode: 'class'`), toggled on `<html>`.
- `ThemeContext` is the single source of truth: it persists the choice in
  `localStorage` and follows the OS preference until the user picks a side.
- An inline script in `public/index.html` applies the theme **before first
  paint**, so there is no white flash on reload in dark mode.
- The toggle sits in the navbar (desktop and mobile) and every page —
  not just the home page — carries `dark:` variants, so the design stays
  consistent across the app.

Key files: [`tailwind.config.js`](tailwind.config.js),
[`src/context/ThemeContext.jsx`](src/context/ThemeContext.jsx),
[`src/components/common/ThemeToggle.jsx`](src/components/common/ThemeToggle.jsx),
[`src/index.css`](src/index.css).

## 👛 Wallet connection

- `WalletContext` wraps EIP-1193 (`window.ethereum`) with ethers v5: connect,
  address, balance, network name, and live `accountsChanged` / `chainChanged`
  handling.
- A previously approved session is restored silently with `eth_accounts` (no
  popup on reload); "disconnect" clears local session state.
- Reachable directly from the first page — in the navbar **and** as the primary
  hero call to action.

Key files: [`src/context/WalletContext.jsx`](src/context/WalletContext.jsx),
[`src/components/common/ConnectWalletButton.jsx`](src/components/common/ConnectWalletButton.jsx).

## ⛓️ Smart contract API

`/api/contract/*` — reads on-chain state and prepares transactions for the
`RealEstate` and `Escrow` contracts. Full design notes, endpoint table and
examples: **[docs/CONTRACT_API.md](docs/CONTRACT_API.md)**.

The home page consumes it through
[`src/services/contractApi.js`](src/services/contractApi.js) to render live
contract state, proving the layer end to end.
