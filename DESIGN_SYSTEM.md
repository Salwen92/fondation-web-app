# Fondation Design System - 2025
## AI-Powered Documentation Generation Platform

### 🎯 Design Philosophy

Based on 2025 design trends and the specific needs of an AI-powered CLI tool, Fondation combines:
- **AI-First Experience**: Emotionally intelligent interfaces that adapt to developer workflows
- **Modern Minimalism**: Clean, focused UI with purposeful animations
- **Developer Aesthetic**: Terminal-inspired elements with modern polish
- **Accessibility**: WCAG compliant, keyboard-first navigation

### 🎨 Color System

#### Dark Theme (Default)
```css
/* Backgrounds - Deep space with subtle gradients */
--background: 222 47% 11%;           /* #0a0e27 - Deep space blue */
--background-gradient-from: 224 71% 4%;  /* #030712 - Near black */
--background-gradient-to: 222 47% 8%;    /* #060911 - Deep navy */

/* Foreground - High contrast text */
--foreground: 210 40% 98%;          /* #fafafa - Pure white */
--foreground-muted: 215 20% 65%;    /* #a1a1aa - Muted gray */

/* Card & Surface - Glass morphism */
--card: 222 47% 13%;                /* #0f1629 - Dark blue surface */
--card-hover: 222 47% 15%;          /* #131b35 - Hover state */
--card-border: 222 47% 20%;         /* #1a2341 - Subtle border */

/* Primary - Electric cyan (AI accent) */
--primary: 193 100% 50%;            /* #00D9FF - Electric cyan */
--primary-foreground: 222 47% 11%;  /* Dark text on cyan */
--primary-glow: 193 100% 50% / 0.3; /* Glow effect */

/* Secondary - Neon purple */
--secondary: 267 100% 64%;          /* #9945FF - Neon purple */
--secondary-foreground: 210 40% 98%; /* White text */

/* Accent - Matrix green (success) */
--accent: 142 100% 50%;             /* #00FF88 - Matrix green */
--accent-foreground: 222 47% 11%;   /* Dark text */

/* Status Colors */
--success: 142 100% 50%;            /* #00FF88 - Green */
--warning: 38 92% 50%;              /* #f59e0b - Orange */
--error: 0 84% 60%;                 /* #ef4444 - Red */
--info: 199 89% 48%;                /* #0ea5e9 - Blue */

/* Interactive Elements */
--border: 222 47% 20%;              /* #1a2341 - Subtle borders */
--input: 222 47% 18%;               /* #162037 - Input background */
--ring: 193 100% 50%;               /* #00D9FF - Focus ring */
--selection: 193 100% 50% / 0.2;    /* Selection highlight */
```

#### Light Theme
```css
/* Backgrounds - Clean with subtle depth */
--background: 0 0% 100%;             /* #ffffff - Pure white */
--background-gradient-from: 210 20% 98%; /* #f9fafb - Off white */
--background-gradient-to: 220 13% 95%;   /* #f1f5f9 - Light gray */

/* Foreground - Optimized contrast */
--foreground: 222 47% 11%;          /* #0a0e27 - Deep blue */
--foreground-muted: 215 16% 47%;    /* #64748b - Muted gray */

/* Card & Surface - Elevated surfaces */
--card: 0 0% 100%;                  /* #ffffff - White */
--card-hover: 210 20% 98%;          /* #f9fafb - Hover state */
--card-border: 214 32% 91%;         /* #e2e8f0 - Light border */

/* Primary - Deep cyan */
--primary: 193 95% 35%;             /* #0891b2 - Deep cyan */
--primary-foreground: 0 0% 100%;    /* White text */
--primary-glow: 193 95% 35% / 0.1;  /* Subtle glow */

/* Secondary - Royal purple */
--secondary: 267 85% 45%;           /* #7c3aed - Royal purple */
--secondary-foreground: 0 0% 100%;  /* White text */

/* Accent - Emerald green */
--accent: 142 76% 36%;              /* #059669 - Emerald */
--accent-foreground: 0 0% 100%;     /* White text */

/* Status Colors */
--success: 142 76% 36%;             /* #059669 - Green */
--warning: 38 92% 50%;              /* #f59e0b - Orange */
--error: 0 72% 51%;                 /* #dc2626 - Red */
--info: 199 89% 48%;                /* #0ea5e9 - Blue */

/* Interactive Elements */
--border: 214 32% 91%;              /* #e2e8f0 - Borders */
--input: 210 20% 98%;               /* #f9fafb - Input background */
--ring: 193 95% 35%;                /* #0891b2 - Focus ring */
--selection: 193 95% 35% / 0.1;     /* Selection highlight */
```

### 📐 Typography

```css
/* Font Stack */
--font-sans: 'Geist Sans', system-ui, -apple-system, sans-serif;
--font-mono: 'Geist Mono', 'SF Mono', Consolas, monospace;

/* Type Scale - Perfect Fourth (1.333) */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.5rem;      /* 24px */
--text-2xl: 2rem;       /* 32px */
--text-3xl: 2.666rem;   /* 42px */
--text-4xl: 3.555rem;   /* 56px */
--text-5xl: 4.74rem;    /* 75px */

/* Font Weights */
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 🎭 Component Styles

#### Buttons
- **Primary**: Gradient background with glow effect on hover
- **Secondary**: Solid color with scale transform
- **Ghost**: Transparent with subtle hover background
- **Destructive**: Red with pulse animation on hover
- **AI**: Special button with animated gradient border

#### Cards
- **Glass Morphism**: backdrop-blur, semi-transparent background
- **Elevation**: Multiple shadow layers for depth
- **Interactive**: Scale and glow on hover
- **Terminal Style**: Monospace font, dark background for code/logs

#### Forms
- **Floating Labels**: Labels that animate on focus
- **Input Groups**: Connected inputs with seamless borders
- **Validation**: Real-time with smooth error animations
- **AI Suggestions**: Inline predictive text

### ✨ Animations & Transitions

```css
/* Timing Functions */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);

/* Durations */
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 400ms;
--duration-slower: 600ms;

/* Micro-animations */
- Button hover: scale(1.02) with glow
- Card hover: translateY(-2px) with shadow
- Loading: Shimmer effect with gradient animation
- Success: Check mark draw with bounce
- Error: Shake animation with red pulse
```

### 🎨 Special Effects

#### Gradients
```css
/* Hero Gradient */
background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);

/* Mesh Gradient */
background: 
  radial-gradient(at 40% 20%, var(--primary) 0px, transparent 50%),
  radial-gradient(at 80% 0%, var(--secondary) 0px, transparent 50%),
  radial-gradient(at 40% 50%, var(--accent) 0px, transparent 50%);

/* Animated Gradient */
background: linear-gradient(270deg, var(--primary), var(--secondary), var(--accent));
background-size: 400% 400%;
animation: gradient-shift 10s ease infinite;
```

#### Glass Morphism
```css
background: rgba(var(--card-rgb), 0.7);
backdrop-filter: blur(10px);
border: 1px solid rgba(var(--border-rgb), 0.2);
box-shadow: 
  0 8px 32px 0 rgba(31, 38, 135, 0.37),
  inset 0 0 0 1px rgba(255, 255, 255, 0.1);
```

### 🚀 Implementation Strategy

#### Phase 1: Core Components
1. Update color variables in globals.css
2. Implement dark mode as default
3. Add gradient backgrounds
4. Enhance button and card components
5. Add micro-animations

#### Phase 2: Advanced Features
1. Implement glass morphism effects
2. Add loading skeletons with shimmer
3. Create terminal-style components
4. Add command palette UI
5. Implement AI-powered interactions

#### Phase 3: Polish
1. Add particle effects for hero sections
2. Implement smooth page transitions
3. Add keyboard shortcuts overlay
4. Create custom scrollbar styles
5. Add sound effects (optional)

### 📱 Responsive Design

#### Breakpoints
```css
--screen-sm: 640px;   /* Mobile landscape */
--screen-md: 768px;   /* Tablet */
--screen-lg: 1024px;  /* Desktop */
--screen-xl: 1280px;  /* Large desktop */
--screen-2xl: 1536px; /* Ultra-wide */
```

#### Mobile-First Approach
- Touch-friendly tap targets (min 44px)
- Swipe gestures for navigation
- Bottom sheet pattern for mobile modals
- Thumb-zone optimized actions

### ♿ Accessibility

- **Color Contrast**: WCAG AAA compliance
- **Focus Indicators**: Clear, high-contrast focus rings
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML, ARIA labels
- **Motion**: Respects prefers-reduced-motion
- **Font Size**: Scalable, respects user preferences

### 🎯 Performance Targets

- **Lighthouse Score**: >95
- **First Contentful Paint**: <1.2s
- **Time to Interactive**: <2.5s
- **Bundle Size Impact**: <30KB for animations
- **CSS Size**: <50KB gzipped

### 🔧 Technical Implementation

#### CSS Architecture
- CSS Variables for theming
- Tailwind for utility classes
- CSS Modules for component styles
- PostCSS for optimization

#### Animation Libraries
- Framer Motion for complex animations
- CSS animations for micro-interactions
- Lottie for icon animations (optional)

### 📝 Component Examples

#### Login Page
- Animated gradient background
- Glass morphism card
- GitHub logo with pulse effect
- Typewriter text animation
- Particle effect backdrop

#### Dashboard
- Collapsible sidebar with icons
- Real-time data cards with shimmer loading
- Charts with smooth transitions
- Terminal-style activity log
- Command palette (Cmd+K)

#### Repository Cards
- Hover: Scale + glow effect
- Status indicator with pulse
- Progress bars with gradient fill
- Quick actions on hover
- Skeleton loading state

This design system creates a cohesive, modern, and performant user experience that aligns with 2025 trends while maintaining the technical excellence expected from an AI-powered developer tool.