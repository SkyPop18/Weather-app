# Claymorphism Design System

## Overview

**Claymorphism** is a playful, friendly design style that makes UI elements look like soft, inflated 3D clay objects. It combines super-rounded corners, layered shadows for volume, pastel colors, and inner highlights to create bubbly, touchable-looking interfaces.

**Origin:** Emerged in 2021 as a natural evolution of neomorphism — adding color, depth, and personality. Inspired by 3D render aesthetics and claymation.

**Best for:** Mobile apps, onboarding flows, kids' apps, gamified UIs, health/wellness apps, e-commerce.

---

## Design Tokens

### Colors
```
Background:    #f0e6d3 (warm sand)
Surface:       #b8e6d0 (mint green)
Primary:       #f4a261 (warm orange)
Secondary:     #d4bbf0 (lavender)
Tertiary:      #f9c5d1 (blush pink)
Accent:        #7ec8e3 (sky blue)
Text:          #3d3d3d
Text Light:    #6b6b6b
```

### Shadows
```
Clay:     8px 8px 16px rgba(0,0,0,0.15), 
          inset -3px -3px 8px rgba(0,0,0,0.08), 
          inset 3px 3px 8px rgba(255,255,255,0.5)
          
Subtle:   4px 4px 8px rgba(0,0,0,0.1), 
          inset -2px -2px 4px rgba(0,0,0,0.05), 
          inset 2px 2px 4px rgba(255,255,255,0.4)
          
Pressed:  inset 4px 4px 8px rgba(0,0,0,0.15), 
          inset -2px -2px 6px rgba(255,255,255,0.3)
```

### Border Radius
```
Standard:  20px
Large:     28px
XL:        36px
Pill:      50px
Circle:    50%
```

### Typography
```
Font Family:   'Inter', 'Nunito', sans-serif
Heading:       700-800 weight
Body:          400-600 weight
```

---

## CSS Variables

```css
:root {
  /* Colors */
  --clay-bg: #f0e6d3;
  --clay-surface: #b8e6d0;
  --clay-primary: #f4a261;
  --clay-secondary: #d4bbf0;
  --clay-pink: #f9c5d1;
  --clay-blue: #7ec8e3;
  --clay-text: #3d3d3d;
  --clay-text-light: #6b6b6b;
  
  /* Shadows */
  --clay-shadow: 
    8px 8px 16px rgba(0,0,0,0.15), 
    inset -3px -3px 8px rgba(0,0,0,0.08), 
    inset 3px 3px 8px rgba(255,255,255,0.5);
  --clay-shadow-sm: 
    4px 4px 8px rgba(0,0,0,0.1), 
    inset -2px -2px 4px rgba(0,0,0,0.05), 
    inset 2px 2px 4px rgba(255,255,255,0.4);
  --clay-pressed: 
    inset 4px 4px 8px rgba(0,0,0,0.15), 
    inset -2px -2px 6px rgba(255,255,255,0.3);
  
  /* Radius */
  --clay-radius: 20px;
  --clay-radius-lg: 28px;
  --clay-radius-xl: 36px;
  --clay-radius-pill: 50px;
  
  /* Transitions */
  --clay-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Component Recipes

### Button
```css
.clay-button {
  background: var(--clay-primary);
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: var(--clay-radius-pill);
  font-weight: 700;
  font-size: 1rem;
  box-shadow: var(--clay-shadow);
  cursor: pointer;
  transition: var(--clay-transition);
}

.clay-button:hover {
  transform: translateY(-2px);
  box-shadow: 
    10px 10px 20px rgba(0,0,0,0.18), 
    inset -3px -3px 8px rgba(0,0,0,0.08), 
    inset 3px 3px 8px rgba(255,255,255,0.5);
}

.clay-button:active {
  transform: translateY(1px);
  box-shadow: var(--clay-pressed);
}
```

### Card
```css
.clay-card {
  background: var(--clay-surface);
  border-radius: var(--clay-radius-lg);
  padding: 28px;
  box-shadow: var(--clay-shadow);
  transition: var(--clay-transition);
}

.clay-card:hover {
  transform: translateY(-4px);
}
```

### Input Field
```css
.clay-input {
  background: rgba(255, 255, 255, 0.6);
  border: none;
  padding: 14px 22px;
  border-radius: var(--clay-radius);
  box-shadow: var(--clay-pressed);
  font-size: 1rem;
  color: var(--clay-text);
  outline: none;
  width: 100%;
  transition: var(--clay-transition);
}

.clay-input:focus {
  box-shadow: var(--clay-pressed), 0 0 0 3px rgba(244, 162, 97, 0.3);
}
```

### Toggle Switch
```css
.clay-toggle {
  width: 58px;
  height: 30px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: var(--clay-pressed);
  position: relative;
  cursor: pointer;
}

.clay-toggle .knob {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--clay-primary);
  box-shadow: var(--clay-shadow-sm);
  position: absolute;
  top: 3px;
  left: 3px;
  transition: var(--clay-transition);
}

.clay-toggle.active .knob {
  left: 31px;
  background: var(--clay-blue);
}
```

### Progress Bar
```css
.clay-progress {
  height: 14px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow: var(--clay-pressed);
  overflow: hidden;
}

.clay-progress-fill {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, var(--clay-primary), var(--clay-pink));
  box-shadow: inset 2px 2px 4px rgba(255,255,255,0.3);
}
```

---

## Do's and Don'ts

### ✅ Do
- Use pastel, warm color palettes — think "friendly"
- Apply generous border-radius (20px+)
- Layer inner + outer shadows for the 3D "inflated" look
- Keep it playful and organic
- Use inner highlights (white inset shadow) to simulate light reflection

### ❌ Don't
- Use sharp corners — they kill the clay illusion
- Use dark, muted colors — pastels and brights only
- Forget the inner shadow — it's what makes it "clay" vs just "rounded"
- Overdo the 3D effect — keep it subtle and consistent
- Use for serious/formal applications (banking, legal, etc.)

---

## Accessibility Notes

⚠️ **Moderate accessibility considerations:**

- **Contrast:** Pastel backgrounds with light text can be problematic. Ensure text is dark enough (4.5:1 ratio minimum).
- **Inner shadows:** They reduce the visible text area slightly. Ensure adequate padding.
- **Focus states:** Add clear focus indicators since the soft appearance can obscure focus.

```css
.clay-button:focus-visible {
  outline: 3px solid var(--clay-text);
  outline-offset: 3px;
}
```
