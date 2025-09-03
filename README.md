# TreeJS Monorepo

A UI test project showcasing a Three.js scene (3D model) with Tailwind CSS and React Router v7, packaged in a TurboRepo monorepo.

## Structure

```
├── apps/
│   └── remix-app/          # React Router v7 app with Tailwind CSS
├── packages/               # Shared packages (future use)
├── package.json           # Root package.json with workspace configuration
├── turbo.json             # TurboRepo configuration
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm 10+

### Installation

1. Install dependencies from the root:
```bash
npm install
```

2. Install dependencies for all workspaces:
```bash
npm install --workspaces
```

### Development

Run all apps in development mode:
```bash
npm run dev
```

Or run a specific app:
```bash
npm run dev --workspace=@treejs-monorepo/remix-app
```

### Building

Build all apps:
```bash
npm run build
```

Build a specific app:
```bash
npm run build --workspace=@treejs-monorepo/remix-app
```

### Type Checking

Run type checking across all workspaces:
```bash
npm run type-check
```

## Apps

### Remix App (`apps/remix-app`)

A React Router v7 application with:
- TypeScript support
- Tailwind CSS configured and imported
- Uses Three.js to render a 3D scene (GLTF model).

To run individually:
```bash
cd apps/remix-app
npm run dev
```

The app includes proper Tailwind CSS imports in `app/root.tsx` as requested.

## About this UI test (Three.js)

This repository is a UI test project built with Three.js, React Router v7, and Tailwind CSS. The Remix app loads a GLB model from `apps/remix-app/public/models/model.glb` and demonstrates smooth tab-driven camera transitions and animated specs.

Quickstart:
```bash
npm install
npm run dev
```

Run only the Remix app:
```bash
cd apps/remix-app
npm run dev
```

## Scripts

- `npm run dev` - Start development servers for all apps
- `npm run build` - Build all apps for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run linting (when configured)
- `npm run clean` - Clean build artifacts

## Notes

- The project is set up with TypeScript by default
- If TreeJS requires JSX instead of TypeScript, we can convert the project
- Tailwind CSS is properly configured and imported in the root component
- TurboRepo handles caching and parallel execution of tasks