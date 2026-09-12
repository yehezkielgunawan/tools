# tools.yehezgun.com — MVP Plan

## 1. Project Overview

`tools.yehezgun.com` is a personal web-based toolbox containing lightweight utilities that run primarily on the client side.

The initial goal is to build a simple, maintainable foundation that can be expanded with additional tools over time without requiring major architectural changes.

The MVP will contain two tools:

1. WhatsApp Link Generator
2. JSON Formatter

Both tools will run entirely in the browser and will not require authentication, a database, or a backend API.

---

## 2. MVP Goals

The MVP should establish the core architecture for future tools while keeping the first release small.

Primary goals:

- Create a reusable application shell.
- Establish a scalable tool registration system.
- Support independent routes for every tool.
- Keep tools fully client-side whenever possible.
- Provide responsive desktop and mobile layouts.
- Support light and dark themes.
- Keep the bundle modular through lazy loading.
- Make adding future tools straightforward.
- Deploy the application as a static website.

---

## 3. Technology Stack

### Frontend

- React
- TypeScript
- Rspack

### Styling

- Tailwind CSS
- daisyUI

### Routing

- React Router

### Icons

- Lucide React

### Package Manager

- pnpm

### Code Quality

- ESLint
- Prettier

### Testing

- Vitest

Browser-level testing with Playwright can be added later when the application grows.

---

## 4. Application Architecture

The application will follow a feature-based architecture.

```text
tools.yehezgun.com
        │
        ▼
Application Shell
        │
        ├── Header
        ├── Navigation
        ├── Theme
        └── Tool Registry
                │
                ├── WhatsApp Link Generator
                │
                └── JSON Formatter
```

Each tool should contain its own UI and business logic.

Shared application functionality should remain outside individual tools.

---

## 5. Proposed Directory Structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ToolLayout.tsx
│   │
│   └── ui/
│       ├── CopyButton.tsx
│       └── ToolCard.tsx
│
├── tools/
│   ├── registry.ts
│   │
│   ├── whatsapp-link/
│   │   ├── WhatsAppLinkGenerator.tsx
│   │   ├── generateWhatsAppLink.ts
│   │   ├── normalizePhoneNumber.ts
│   │   └── index.ts
│   │
│   └── json-formatter/
│       ├── JsonFormatter.tsx
│       ├── jsonUtils.ts
│       └── index.ts
│
├── hooks/
│   ├── useClipboard.ts
│   └── useLocalStorage.ts
│
├── lib/
│   └── utilities.ts
│
├── styles/
│   └── index.css
│
├── main.tsx
└── env.d.ts
```

---

## 6. Tool Registry

A centralized tool registry should be created from the beginning.

The registry will contain metadata used by:

- Homepage tool cards
- Routing
- Search
- Categories
- Future command palette
- Future favorites
- Future recently used tools

Example structure:

```ts
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  path: string;
  category: string;
  keywords: string[];
}
```

Example registry:

```ts
export const tools: ToolDefinition[] = [
  {
    id: "whatsapp-link",
    name: "WhatsApp Link Generator",
    description:
      "Generate WhatsApp links with optional prefilled messages.",
    path: "/generator/whatsapp-link",
    category: "generator",
    keywords: [
      "whatsapp",
      "wa",
      "message",
      "link",
    ],
  },
  {
    id: "json-formatter",
    name: "JSON Formatter",
    description:
      "Format, validate, and minify JSON.",
    path: "/developer/json-formatter",
    category: "developer",
    keywords: [
      "json",
      "formatter",
      "validator",
      "developer",
    ],
  },
];
```

---

# 7. Application Routes

Initial routes:

```text
/
```

Homepage.

```text
/generator/whatsapp-link
```

WhatsApp Link Generator.

```text
/developer/json-formatter
```

JSON Formatter.

A fallback route should also be provided for unknown URLs.

```text
/*
```

This should display a simple 404 page with navigation back to the homepage.

---

# 8. Homepage

The MVP homepage should remain simple.

It should contain:

- Site name
- Short description
- Light/dark theme toggle
- Available tool cards
- Tool category labels

Example layout:

```text
┌────────────────────────────────────────────┐
│ Yehezgun Tools                        ☾    │
├────────────────────────────────────────────┤
│                                            │
│ Simple tools for everyday tasks.           │
│                                            │
│ Generator                                  │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ WhatsApp Link Generator                │ │
│ │ Generate wa.me links easily.           │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Developer                                  │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ JSON Formatter                         │ │
│ │ Format and validate JSON.              │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

Search functionality is not required for the first MVP but the architecture should allow it to be added later.

---

# 9. WhatsApp Link Generator

## Purpose

Generate a WhatsApp `wa.me` link without manually constructing the URL.

## Inputs

### Phone Number

Required.

Examples:

```text
08123456789
```

```text
628123456789
```

```text
+628123456789
```

### Message

Optional.

Example:

```text
Hello, I would like to ask about your service.
```

---

## Phone Number Normalization

The generator should normalize common Indonesian number formats.

Example:

```text
08123456789
```

becomes:

```text
628123456789
```

The following:

```text
+628123456789
```

should also become:

```text
628123456789
```

The normalized phone number should contain only digits.

---

## Generated Link

Without a message:

```text
https://wa.me/628123456789
```

With a message:

```text
https://wa.me/628123456789?text=Hello%20there
```

Message content must be safely URL encoded.

---

## Features

The WhatsApp Link Generator should support:

- Phone number input
- Optional message
- Automatic phone normalization
- Basic phone validation
- Generated link preview
- Copy link button
- Open WhatsApp button
- Reset or clear button

---

## Validation

The application should reject:

- Empty phone numbers
- Invalid characters
- Clearly invalid phone number lengths

Errors should be shown close to the relevant input.

---

# 10. JSON Formatter

## Purpose

Provide a simple client-side utility for working with JSON.

The tool should never send pasted JSON to a remote server.

---

## Features

The JSON Formatter should support:

- JSON input textarea
- Format / prettify
- Minify
- Validate
- Copy output
- Clear editor
- Parsing error feedback

---

## Format

Input:

```json
{"name":"Yehezgun","role":"Software Engineer","active":true}
```

Output:

```json
{
  "name": "Yehezgun",
  "role": "Software Engineer",
  "active": true
}
```

Default indentation:

```text
2 spaces
```

---

## Minify

Input:

```json
{
  "name": "Yehezgun",
  "active": true
}
```

Output:

```json
{"name":"Yehezgun","active":true}
```

---

## Validation

Valid JSON should display a success indicator.

Invalid JSON should display a meaningful error.

Example:

```text
Unexpected token at position 42
```

The tool should not silently modify invalid JSON.

---

# 11. Shared UI Components

A small number of reusable components should be introduced during the MVP.

## ToolCard

Used by the homepage.

Responsibilities:

- Icon
- Tool name
- Description
- Link to tool page

---

## ToolLayout

Shared layout for every tool.

Example:

```text
Tool Name

Short description explaining what the tool does.

┌─────────────────────────────────┐
│                                 │
│          Tool interface         │
│                                 │
└─────────────────────────────────┘

🔒 Runs locally in your browser.
```

---

## CopyButton

Reusable clipboard component.

Used initially by:

- WhatsApp Link Generator
- JSON Formatter

---

# 12. Privacy Principle

The project should follow a browser-first philosophy.

For client-side tools, the UI should clearly communicate:

```text
Runs locally in your browser.
Your data is not uploaded to a server.
```

For the MVP:

```text
WhatsApp Link Generator → client-side
JSON Formatter          → client-side
```

No user-provided content should be sent to an external API.

---

# 13. State Management

No global state management library is required for the MVP.

Avoid:

- Redux
- Zustand
- MobX

Tool-specific state should remain local.

Example:

```ts
const [phone, setPhone] = useState("");
const [message, setMessage] = useState("");
```

Global application state should remain minimal.

Potential global state:

```text
theme
```

Theme preference may be stored using:

```text
localStorage
```

---

# 14. Theme

Support:

```text
light
dark
```

Use daisyUI's theme system.

The user's preference should be persisted locally.

Suggested priority:

```text
Saved preference
        ↓
System preference
        ↓
Default theme
```

---

# 15. Responsive Design

The application should support:

- Desktop
- Tablet
- Mobile

Tools should remain functional on narrow mobile screens.

Recommended content width:

```text
max-w-4xl
```

or similar.

Avoid layouts that require horizontal scrolling for normal usage.

The JSON editor may use horizontal scrolling internally for long lines.

---

# 16. Accessibility

The MVP should include basic accessibility support.

Requirements:

- Inputs have labels.
- Buttons have clear names.
- Error states are understandable without relying only on color.
- Keyboard navigation works.
- Focus states remain visible.
- Sufficient color contrast in light and dark themes.

---

# 17. Error Handling

Tools should fail gracefully.

Examples:

### WhatsApp Generator

```text
Please enter a valid phone number.
```

### JSON Formatter

```text
Invalid JSON: Unexpected token } at position 28.
```

Unexpected application-level errors should not result in a completely blank page.

---

# 18. Testing

Utility logic should be tested independently from the React components.

## WhatsApp Generator Tests

Test cases should include:

```text
08123456789
→
628123456789
```

```text
+628123456789
→
628123456789
```

```text
628123456789
→
628123456789
```

Test:

- Empty numbers
- Invalid characters
- Message encoding
- URL generation

---

## JSON Formatter Tests

Test:

- Valid JSON formatting
- Valid JSON minification
- Nested objects
- Arrays
- Strings containing special characters
- Invalid JSON
- Empty input

---

# 19. Performance

Each tool should eventually support lazy loading.

Example:

```ts
const WhatsAppLinkGenerator = lazy(
  () => import("../tools/whatsapp-link")
);

const JsonFormatter = lazy(
  () => import("../tools/json-formatter")
);
```

This allows future tools to be added without forcing every visitor to download every tool.

For the two-tool MVP, bundle size is not critical, but the architecture should support code splitting from the start.

---

# 20. Deployment

The MVP should be deployable as static assets.

Recommended initial flow:

```text
GitHub Repository
      │
      ▼
CI/CD
      │
      ▼
pnpm build
      │
      ▼
Rspack Production Build
      │
      ▼
Static Hosting
      │
      ▼
tools.yehezgun.com
```

Suitable hosting platforms include:

- Cloudflare Pages
- Vercel
- Netlify

No server runtime is required for the MVP.

---

# 21. MVP Development Order

## Phase 1 — Project Foundation

- Initialize repository
- Configure pnpm
- Configure Rspack
- Configure React
- Configure TypeScript
- Configure Tailwind
- Configure daisyUI
- Configure ESLint
- Configure Prettier

---

## Phase 2 — Application Shell

Implement:

- Application router
- Header
- Base layout
- Light/dark theme
- Homepage
- Tool cards
- Tool registry
- 404 page

---

## Phase 3 — WhatsApp Link Generator

Implement:

- Phone number input
- Message input
- Number normalization
- Validation
- URL generation
- Copy action
- Open WhatsApp action
- Unit tests

---

## Phase 4 — JSON Formatter

Implement:

- JSON editor
- Format function
- Minify function
- Validation
- Error display
- Copy action
- Clear action
- Unit tests

---

## Phase 5 — Polish

Review:

- Mobile layout
- Desktop layout
- Dark mode
- Keyboard navigation
- Loading states
- Error states
- Clipboard behavior
- Browser compatibility

---

## Phase 6 — Deployment

- Configure production build
- Configure hosting
- Configure SPA route fallback
- Configure `tools.yehezgun.com`
- Test production deployment
- Release `v0.1.0`

---

# 22. MVP Acceptance Criteria

The MVP is considered complete when:

- `tools.yehezgun.com` is publicly accessible.
- Homepage displays all available tools.
- WhatsApp Link Generator works correctly.
- JSON Formatter works correctly.
- Both tools have dedicated URLs.
- Client-side routing works on direct page refresh.
- Light mode works.
- Dark mode works.
- Theme preference persists.
- Layout works on mobile.
- Layout works on desktop.
- Clipboard actions work.
- Invalid input produces readable errors.
- No tool data is uploaded externally.
- Core utility functions have tests.
- Production build succeeds without errors.

---

# 23. Out of Scope for MVP

The following should intentionally be postponed:

- Authentication
- User accounts
- Backend API
- Database
- URL shortener
- Analytics dashboard
- Cloud synchronization
- Favorites
- Recently used tools
- Command palette
- Tool search
- PWA support
- Offline caching
- Image processing
- File uploads
- Web Workers

These can be added after the core architecture has been validated.

---

# 24. Post-MVP Candidates

Potential next tools:

### Developer

- Base64 Encoder / Decoder
- UUID Generator
- JWT Decoder
- URL Encoder / Decoder
- Unix Timestamp Converter
- Hash Generator

### Generator

- QR Code Generator
- Random Password Generator

### Text

- Case Converter
- Word Counter
- Slug Generator

### Image

- Image Compressor
- Image Resizer
- Image Converter

Eventually, tools requiring persistence can introduce a small backend layer.

---

# 25. MVP Summary

The first release of `tools.yehezgun.com` will intentionally remain small:

```text
tools.yehezgun.com
│
├── Homepage
│
├── WhatsApp Link Generator
│
└── JSON Formatter
```

Technical foundation:

```text
Rspack
+
React
+
TypeScript
+
Tailwind CSS
+
daisyUI
+
React Router
```

Architectural principle:

> Keep each tool isolated, keep shared infrastructure small, and keep processing in the browser unless a tool fundamentally requires server-side functionality.

The purpose of `v0.1` is not to build a large toolbox immediately. It is to establish a clean foundation that allows future utilities to be added with minimal architectural overhead.