# Plane Design System - Guide d'Intégration

Ce guide explique comment intégrer le design system Plane dans votre projet (kaneoKANBAN ou autre).

## Table des matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Configuration TypeScript](#configuration-typescript)
4. [Intégration avec Next.js](#intégration-avec-nextjs)
5. [Import du CSS Global](#import-du-css-global)
6. [Utilisation des Composants](#utilisation-des-composants)
7. [Liste des Composants Disponibles](#liste-des-composants-disponibles)
8. [Dépendances Clés](#dépendances-clés)

---

## Prérequis

- **Node.js**: >= 22.18.0
- **pnpm**: >= 10.24.0
- **TypeScript**: 5.8.3

```bash
# Vérifier les versions
node --version  # >= 22.18.0
pnpm --version  # >= 10.24.0
```

---

## Installation

### 1. Copier le design system

Copiez le dossier `exported-design-system/` à la racine de votre projet ou dans un sous-dossier dédié.

### 2. Installer les dépendances

```bash
cd exported-design-system
pnpm install
```

### 3. Builder les packages

```bash
pnpm build
```

---

## Configuration TypeScript

Ajoutez les paths suivants dans votre `tsconfig.json` :

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@plane/propel/*": ["exported-design-system/packages/propel/src/*"],
      "@plane/propel": ["exported-design-system/packages/propel/src"],
      "@plane/ui/*": ["exported-design-system/packages/ui/src/*"],
      "@plane/ui": ["exported-design-system/packages/ui/src"],
      "@plane/types/*": ["exported-design-system/packages/types/src/*"],
      "@plane/types": ["exported-design-system/packages/types/src"],
      "@plane/constants/*": ["exported-design-system/packages/constants/src/*"],
      "@plane/constants": ["exported-design-system/packages/constants/src"],
      "@plane/hooks/*": ["exported-design-system/packages/hooks/src/*"],
      "@plane/hooks": ["exported-design-system/packages/hooks/src"],
      "@plane/utils/*": ["exported-design-system/packages/utils/src/*"],
      "@plane/utils": ["exported-design-system/packages/utils/src"],
      "@plane/editor/*": ["exported-design-system/packages/editor/src/*"],
      "@plane/editor": ["exported-design-system/packages/editor/src"],
      "@plane/i18n/*": ["exported-design-system/packages/i18n/src/*"],
      "@plane/i18n": ["exported-design-system/packages/i18n/src"],
      "@plane/services/*": ["exported-design-system/packages/services/src/*"],
      "@plane/services": ["exported-design-system/packages/services/src"],
      "@plane/shared-state/*": ["exported-design-system/packages/shared-state/src/*"],
      "@plane/shared-state": ["exported-design-system/packages/shared-state/src"],
      "@plane/tailwind-config/*": ["exported-design-system/packages/tailwind-config/*"],
      "@plane/tailwind-config": ["exported-design-system/packages/tailwind-config"]
    }
  }
}
```

---

## Intégration avec Next.js

### next.config.js

Ajoutez les packages à transpiler :

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@plane/propel",
    "@plane/ui",
    "@plane/types",
    "@plane/constants",
    "@plane/hooks",
    "@plane/utils",
    "@plane/editor",
    "@plane/i18n",
    "@plane/services",
    "@plane/shared-state",
    "@plane/tailwind-config",
  ],
};

module.exports = nextConfig;
```

### Configuration Tailwind

Dans votre `tailwind.config.js` :

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./exported-design-system/packages/propel/src/**/*.{js,ts,jsx,tsx}",
    "./exported-design-system/packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [
    require("./exported-design-system/packages/tailwind-config"),
  ],
};
```

---

## Import du CSS Global

Dans votre fichier CSS principal (ex: `globals.css`) :

```css
/* Import des styles Tailwind de base */
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

/* Import des styles du design system Plane */
@import "@plane/tailwind-config/index.css";
@import "@plane/tailwind-config/variables.css";
@import "@plane/tailwind-config/animations.css";

/* Optionnel: styles de l'éditeur */
/* @import "@plane/editor/styles/editor.css"; */
```

---

## Utilisation des Composants

### Exemple avec @plane/propel

```typescript
import { Button } from "@plane/propel/button";
import { Avatar } from "@plane/propel/avatar";
import { Badge } from "@plane/propel/badge";
import { Card } from "@plane/propel/card";
import { Dialog } from "@plane/propel/dialog";
import { Tooltip } from "@plane/propel/tooltip";

export function MyComponent() {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar
          src="/avatar.png"
          name="John Doe"
          size="md"
        />
        <div>
          <h3>John Doe</h3>
          <Badge variant="success">Active</Badge>
        </div>
      </div>
      <Tooltip content="Click to save">
        <Button variant="primary" size="md">
          Save
        </Button>
      </Tooltip>
    </Card>
  );
}
```

### Exemple avec @plane/ui

```typescript
import { Avatar, AvatarGroup } from "@plane/ui";
import { Button, ToggleSwitch } from "@plane/ui";
import { CustomMenu, CustomSelect } from "@plane/ui";
import { Breadcrumbs } from "@plane/ui";

export function HeaderComponent() {
  return (
    <header>
      <Breadcrumbs>
        <Breadcrumbs.BreadcrumbItem label="Home" link="/" />
        <Breadcrumbs.BreadcrumbItem label="Projects" link="/projects" />
      </Breadcrumbs>
      
      <AvatarGroup>
        <Avatar name="User 1" />
        <Avatar name="User 2" />
      </AvatarGroup>
    </header>
  );
}
```

### Exemple avec les types

```typescript
import type { TUser, TWorkspace, TProject } from "@plane/types";
import type { TCycle, TModule } from "@plane/types";
import type { TIssue, TIssueActivity } from "@plane/types";

interface MyProps {
  user: TUser;
  workspace: TWorkspace;
  project: TProject;
}
```

### Exemple avec les constantes

```typescript
import { 
  ISSUE_PRIORITIES, 
  ISSUE_DISPLAY_FILTERS,
  STATE_GROUPS 
} from "@plane/constants";

const priorities = ISSUE_PRIORITIES.map(p => ({
  value: p.key,
  label: p.title,
}));
```

### Exemple avec les hooks

```typescript
import { useLocalStorage } from "@plane/hooks";
import { useOutsideClickDetector } from "@plane/hooks";

function MyComponent() {
  const [theme, setTheme] = useLocalStorage("theme", "light");
  const ref = useRef(null);
  
  useOutsideClickDetector(ref, () => {
    console.log("Clicked outside");
  });
  
  return <div ref={ref}>...</div>;
}
```

### Exemple avec les utilitaires

```typescript
import { cn } from "@plane/utils";
import { formatDate, calculateDuration } from "@plane/utils";

const className = cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
);
```

---

## Liste des Composants Disponibles

### @plane/propel (50+ composants)

| Catégorie | Composants |
|-----------|------------|
| **Boutons** | Button, IconButton |
| **Formulaires** | Input, Switch, Calendar |
| **Affichage** | Avatar, Badge, Banner, Card, Pill, Skeleton |
| **Navigation** | Tabs, TabNavigation, Menu, Breadcrumbs |
| **Overlays** | Dialog, Popover, Tooltip, ContextMenu, Command |
| **Feedback** | Toast, Spinners (Circular, CircularBar) |
| **Layout** | Accordion, Collapsible, ScrollArea, Separator |
| **Données** | Table, Combobox |
| **Charts** | AreaChart, BarChart, LineChart, PieChart, RadarChart, ScatterChart, TreeMap |
| **Icons** | 100+ icônes (State, Priority, Layouts, Actions, etc.) |
| **Emoji** | EmojiPicker, EmojiReaction |
| **Empty State** | CompactEmptyState, DetailedEmptyState |
| **Portal** | Portal, ModalPortal |

### @plane/ui (32 groupes)

| Catégorie | Composants |
|-----------|------------|
| **Auth** | AuthForm, AuthInput, AuthPasswordInput |
| **Avatar** | Avatar, AvatarGroup |
| **Breadcrumbs** | Breadcrumbs, NavigationDropdown |
| **Button** | Button, ToggleSwitch |
| **Dropdowns** | CustomMenu, CustomSelect, CustomSearchSelect, ComboBox |
| **Form Fields** | Input, Textarea, Checkbox, ColorPicker, PasswordInput |
| **Modals** | AlertModal, ModalCore |
| **Progress** | CircularProgressIndicator, LinearProgressIndicator, ProgressBar, RadialProgress |
| **Tables** | Table (avec types) |
| **Tabs** | Tabs, TabList |
| **Sortable** | Sortable, Draggable |
| **Popovers** | Popover, PopoverMenu |
| **Others** | Loader, Tooltip, Tag, Row, Card, FavoriteStar, DragHandle, DropIndicator |

### @plane/editor

- DocumentEditor (éditeur collaboratif)
- RichTextEditor
- LiteTextEditor
- Extensions (Mentions, Tables, Code, Images, etc.)

### @plane/i18n

- Support pour 20 langues
- Hooks: useTranslation
- Provider: TranslationProvider

---

## Dépendances Clés

```json
{
  "dependencies": {
    "tailwindcss": "4.1.17",
    "@headlessui/react": "^1.7.19",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@base-ui-components/react": "1.0.0-beta.3",
    "framer-motion": "^12.23.0",
    "recharts": "^2.15.1",
    "@tanstack/react-table": "^8.21.3",
    "lucide-react": "0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "3.4.0",
    "class-variance-authority": "0.7.1",
    "cmdk": "^1.1.1",
    "react-day-picker": "9.5.0",
    "@atlaskit/pragmatic-drag-and-drop": "1.7.4",
    "@tiptap/react": "^2.11.5",
    "mobx": "6.12.0",
    "mobx-react": "9.1.1"
  },
  "peerDependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
```

---

## Structure des Fichiers

```
exported-design-system/
├── packages/
│   ├── tailwind-config/     # Design tokens, variables CSS, animations
│   ├── propel/              # 50+ composants UI principaux
│   ├── ui/                  # 32 groupes de composants additionnels
│   ├── types/               # Types TypeScript
│   ├── constants/           # Constantes de l'application
│   ├── hooks/               # Hooks React réutilisables
│   ├── utils/               # Fonctions utilitaires
│   ├── editor/              # Éditeur rich-text
│   ├── i18n/                # Internationalisation (20 langues)
│   ├── services/            # Services API
│   └── shared-state/        # État partagé (MobX)
├── apps/
│   ├── web/                 # Application web principale
│   ├── admin/               # Panel d'administration
│   └── space/               # Application publique
├── package.json             # Package.json racine configuré
├── pnpm-workspace.yaml      # Configuration workspace pnpm
├── tsconfig.json            # Config TypeScript de base
└── postcss.config.js        # Config PostCSS
```

---

## Support

Pour toute question sur l'intégration, consultez:
- Les fichiers source dans `packages/*/src/`
- Les stories Storybook dans `packages/propel/src/**/*.stories.tsx`
- La documentation du projet Plane original

---

*Exporté depuis planeKANBAN - Design System v1.0.0*
