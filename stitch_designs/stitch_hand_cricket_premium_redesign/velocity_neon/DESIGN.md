# Design System Specification: High-End Gaming Experience

## 1. Overview & Creative North Star
### Creative North Star: "The Neon Kineticist"
This design system rejects the static nature of traditional mobile interfaces in favor of a high-octane, AAA gaming aesthetic. We are not building a utility app; we are crafting a digital stadium. The "Neon Kineticist" philosophy centers on the tension between deep, infinite space and sharp, high-energy light.

To break the "standard template" look, this system utilizes **intentional asymmetry** and **overlapping planes**. Elements should feel as though they are floating in a pressurized vacuum, held together by magnetic force rather than rigid grids. We prioritize tonal depth over structural lines, ensuring the UI feels premium, immersive, and ultra-modern.

---

## 2. Colors & Surface Philosophy
The palette is built on a foundation of deep atmospheric navy, punctuated by high-frequency neon accents.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** Traditional lines create "visual noise" that cheapens the premium feel. Boundaries must be defined through:
*   **Background Shifts:** Using `surface-container-low` against `background`.
*   **Tonal Transitions:** Subtle vertical gradients that suggest an edge without drawing one.
*   **Light Bleed:** Using neon glows to imply the boundary of a container.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, semi-translucent glass panels.
*   **Background (`#0f131f`):** The base "void."
*   **Surface-Container-Low:** Used for secondary grouping or background sections.
*   **Surface-Container-High:** Reserved for interactive cards and primary modules.
*   **Glassmorphism Effect:** For floating overlays (modals/popups), use `on-surface` at 5% alpha with a `20px` backdrop-blur. This "frosted" look ensures the deep navy background bleeds through, maintaining a cohesive environmental feel.

### Signature Textures
Main CTAs must use a **Linear Gradient** (Top-Left to Bottom-Right) transitioning from `primary` (#4edea3) to `primary_container` (#10b981). This mimics the iridescent quality of high-end sports equipment.

---

## 3. Typography: The Tension of Tech
The typographic scale creates a dialogue between futuristic aggression and clean, functional legibility.

*   **Display & Headlines (Space Grotesk):** This is our "Technological Spine." It is wide, authoritative, and futuristic. Use `display-lg` for scoreboards and `headline-md` for screen titles. All headlines should be set to `uppercase` with a `0.05em` letter-spacing to enhance the architectural feel.
*   **Body & Labels (Manrope):** The "Human Element." Manrope provides a clean, neutral contrast to the aggressive headers. It ensures high readability for game rules, player stats, and settings. 
*   **Hierarchy Note:** Use `tertiary` (Amber/Gold) for critical tactical information (e.g., "Current Score" or "Wickets") to pull the eye away from the primary navigation.

---

## 4. Elevation & Depth
In a premium gaming UI, depth is achieved through light and atmospheric perspective, not drop shadows.

*   **The Layering Principle:** Stack `surface-container-lowest` cards atop `surface-container-low` sections. The shift in darkness creates a "sunken" or "lifted" effect naturally.
*   **Ambient Shadows:** For elements that must float (e.g., active game cards), use a diffused glow rather than a black shadow. The shadow should be `secondary` (#4cd7f6) at 8% opacity with a `32px` blur.
*   **The "Ghost Border" Fallback:** If a container requires definition against a complex background, use a 1px border of `outline-variant` at **15% opacity**. This creates a "glint" on the edge of the glass rather than a hard stroke.
*   **Neon Borders:** For high-priority states (e.g., "Your Turn"), use a 1.5px border of `primary` with a secondary `4px` outer glow (drop-shadow) of the same color.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `full` roundedness, uppercase `label-md` text. Add a subtle `0 0 15px` glow on hover/active states.
*   **Secondary:** Ghost style. Transparent background with a 1px `primary` border at 30% opacity.
*   **Tertiary:** Text-only with `secondary` (Cyan) color, used for "Cancel" or "Back" actions.

### Cards & Lists
*   **Rule:** No dividers. Use `16px` or `24px` vertical spacing to separate list items.
*   **Style:** Use `surface-container-high` with a `xl` (0.75rem) corner radius. The top-left corner should have a subtle "glint" gradient (White at 5% to Transparent).

### Score Chips
*   Compact pill shapes using `surface-variant`. For the "Active Run" or "Current Ball," use the `tertiary_container` (Amber) to signify high importance.

### Input Fields
*   **Style:** Underline only. Use `outline` color for the base. On focus, the underline transitions to `secondary` (Cyan) with a soft glow reflecting beneath the field.

### Hand Gesture Icons (Specialized)
*   Icons should be "inner-glow" style. Use `secondary_fixed_dim` for the stroke, with a subtle `2px` inner blur to make the icons look like neon gas tubes.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts (e.g., placing a scoreboard slightly off-center or overlapping a player avatar over a container edge).
*   **Do** utilize `backdrop-blur` (12px–20px) on all floating menus to maintain the AAA "Glass" aesthetic.
*   **Do** use `tertiary` (Gold/Amber) highlights for "Win" states or "Rare" achievements to convey premium value.

### Don't:
*   **Don't** use 100% opaque black. Always use the deep navy `background` (#0a0e1a) to keep the "atmosphere" alive.
*   **Don't** use standard Material Design drop shadows. They look "office-app" and kill the gaming immersion.
*   **Don't** clutter the screen with lines. If you feel the need to add a border, try increasing the margin or changing the surface tier first.
*   **Don't** use "default" system icons. Every icon must have a futuristic, tech-leaning geometric style.