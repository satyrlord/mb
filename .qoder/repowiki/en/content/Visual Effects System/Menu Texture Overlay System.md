# Menu Texture Overlay System

<cite>
**Referenced Files in This Document**
- [menu-texture.ts](file://src/menu-texture.ts)
- [menu-texture.test.ts](file://tests/menu-texture.test.ts)
- [styles.css](file://styles.css)
- [styles.winfx.css](file://styles.winfx.css)
- [index.html](file://index.html)
- [index.ts](file://src/index.ts)
- [README.md](file://README.md)
- [texture-attribution.test.ts](file://tests/texture-attribution.test.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document describes the menu texture overlay system responsible for managing background textures and visual layering in the main menu. It explains the texture loading mechanism, overlay positioning system, responsive texture scaling, CSS-based texture effects, z-index management, and blending modes. It also provides practical examples of customization, theme integration patterns, performance optimization strategies, and guidelines for texture asset management and cross-device scaling.

## Project Structure
The menu texture overlay system spans several modules:
- JavaScript module that defines supported textures, applies them to the menu frame, and manages asynchronous loading.
- Stylesheet that defines the layered background using CSS custom properties and pseudo-elements.
- Test suite validating behavior and asset presence.
- HTML entry that declares the menu frame and associated DOM structure.
- Application bootstrap that orchestrates texture application and easter egg interactions.

```mermaid
graph TB
A["index.html<br/>Menu frame declaration"] --> B["src/index.ts<br/>Bootstrap and event wiring"]
B --> C["src/menu-texture.ts<br/>Texture definitions and loader"]
C --> D["styles.css<br/>Menu background layers and z-index"]
D --> E["styles.winfx.css<br/>Additional blend and filter effects"]
F["tests/menu-texture.test.ts<br/>Unit tests"] --> C
G["tests/texture-attribution.test.ts<br/>Asset attribution tests"] --> C
H["README.md<br/>Credits and asset references"] --> C
```

**Diagram sources**
- [index.html:27-38](file://index.html#L27-L38)
- [index.ts:500-520](file://src/index.ts#L500-L520)
- [menu-texture.ts:10-71](file://src/menu-texture.ts#L10-L71)
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)
- [menu-texture.test.ts:61-85](file://tests/menu-texture.test.ts#L61-L85)
- [texture-attribution.test.ts:6-14](file://tests/texture-attribution.test.ts#L6-L14)
- [README.md:222-225](file://README.md#L222-L225)

**Section sources**
- [index.html:27-38](file://index.html#L27-L38)
- [index.ts:500-520](file://src/index.ts#L500-L520)
- [menu-texture.ts:10-71](file://src/menu-texture.ts#L10-L71)
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)
- [menu-texture.test.ts:61-85](file://tests/menu-texture.test.ts#L61-L85)
- [texture-attribution.test.ts:6-14](file://tests/texture-attribution.test.ts#L6-L14)
- [README.md:222-225](file://README.md#L222-L225)

## Core Components
- Menu texture definitions and loader: Defines supported extensions, default fallback, and emoji-pack-specific textures. Applies CSS custom properties to the menu element and handles asynchronous image loading with fallback on error.
- Menu frame and layered backgrounds: Uses CSS custom properties and pseudo-elements to render a textured background with blending and opacity controls.
- Integration points: Bootstrap wires texture application on menu display and responds to easter egg interactions.

Key responsibilities:
- Texture loading and switching with stable fallbacks.
- CSS-driven overlay positioning and sizing.
- Z-index stacking for layered visuals.
- Blend modes and filters for artistic effects.

**Section sources**
- [menu-texture.ts:10-71](file://src/menu-texture.ts#L10-L71)
- [menu-texture.ts:73-130](file://src/menu-texture.ts#L73-L130)
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)

## Architecture Overview
The system uses a two-layer background approach:
- Base layer: A pseudo-element renders the primary menu texture with configurable size and position.
- Overlay layer: An additional pseudo-element adds a subtle noise and soft-light blend for atmospheric effect.

The JavaScript component sets CSS custom properties on the menu frame element, enabling dynamic switching between emoji-pack textures while maintaining a stable fallback during transitions.

```mermaid
sequenceDiagram
participant Boot as "Bootstrap (index.ts)"
participant Menu as "Menu Frame (#menuFrame)"
participant Loader as "Image Loader"
participant CSS as "Styles (styles.css)"
Boot->>Menu : "applyMenuTexture(packId)"
Boot->>Menu : "set fallback CSS variables"
Boot->>Loader : "new Image()"
Loader-->>Boot : "onload/onerror"
Boot->>Menu : "set pack texture CSS variables"
CSS-->>Menu : "render : : before and : : after layers"
```

**Diagram sources**
- [index.ts:500-520](file://src/index.ts#L500-L520)
- [menu-texture.ts:94-130](file://src/menu-texture.ts#L94-L130)
- [styles.css:722-747](file://styles.css#L722-L747)

## Detailed Component Analysis

### Texture Loading and Switching
The loader:
- Validates supported extensions for menu textures.
- Sets CSS custom properties for image, size, and position on the menu element.
- Creates an Image instance to asynchronously load the requested texture.
- On successful load, applies the requested texture; on error, falls back to the default.
- Prevents race conditions by checking a dataset guard before applying results.

```mermaid
flowchart TD
Start(["applyMenuTexture(packId)"]) --> GetDef["Lookup MENU_TEXTURES[packId]"]
GetDef --> SetFallback["Set fallback CSS vars on menu element"]
SetFallback --> CheckImage{"Image API available?"}
CheckImage --> |No| End(["Exit"])
CheckImage --> |Yes| CreateImg["Create Image loader"]
CreateImg --> Load["loader.src = requested image path"]
Load --> OnLoad{"onload fired?"}
OnLoad --> |Yes| GuardCheck1{"dataset matches requested path?"}
GuardCheck1 --> |Yes| ApplyPack["Apply pack texture CSS vars"]
GuardCheck1 --> |No| End
OnLoad --> |No| OnError{"onerror fired?"}
OnError --> |Yes| GuardCheck2{"dataset matches requested path?"}
GuardCheck2 --> |Yes| ApplyFallback["Apply fallback CSS vars"]
GuardCheck2 --> |No| End
ApplyPack --> End
ApplyFallback --> End
```

**Diagram sources**
- [menu-texture.ts:94-130](file://src/menu-texture.ts#L94-L130)

**Section sources**
- [menu-texture.ts:22-28](file://src/menu-texture.ts#L22-L28)
- [menu-texture.ts:73-86](file://src/menu-texture.ts#L73-L86)
- [menu-texture.ts:94-130](file://src/menu-texture.ts#L94-L130)
- [menu-texture.test.ts:87-176](file://tests/menu-texture.test.ts#L87-L176)

### Overlay Positioning and Responsive Scaling
The menu frame uses CSS custom properties to control:
- Background image URL.
- Background size (e.g., cover).
- Background position (e.g., center).

These properties are set dynamically by the loader and consumed by pseudo-elements to render the background layer. The menu container itself maintains a relative position and z-index stacking to ensure foreground content appears above the background.

```mermaid
classDiagram
class MenuFrame {
+CSS custom properties
+pseudo-element : : before
+pseudo-element : : after
+z-index stacking
}
class PseudoBefore {
+background-image
+background-position
+background-size
+opacity
+filters
}
class PseudoAfter {
+noise texture
+mix-blend-mode
+filters
+z-index
}
MenuFrame --> PseudoBefore : "renders"
MenuFrame --> PseudoAfter : "renders"
```

**Diagram sources**
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.css:722-747](file://styles.css#L722-L747)

**Section sources**
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.css:722-747](file://styles.css#L722-L747)

### CSS-Based Effects, Z-Index, and Blending Modes
The menu background employs:
- A primary background layer via pseudo-element ::before with configurable size and position.
- An overlay layer via pseudo-element ::after featuring a noise texture, soft-light blend, and subtle filters.
- Foreground content placed with higher z-index to ensure readability.

Blend modes and filters:
- Soft-light blend mode on the overlay layer creates a subtle atmospheric effect.
- Filters such as blur and contrast enhance the visual texture without impacting readability.

Z-index management:
- The menu frame establishes a stacking context.
- The overlay pseudo-element uses a lower z-index than the foreground content.
- The base pseudo-element acts as the background layer beneath the overlay.

**Section sources**
- [styles.css:722-747](file://styles.css#L722-L747)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)

### Theme Integration Patterns
The system integrates with themes through:
- CSS custom properties for background images and sizing.
- Tailwind and DaisyUI utilities for consistent UI styling around the menu.
- Emoji pack selection driving the texture choice, ensuring thematic alignment with icon sets.

Integration points:
- Bootstrap applies the selected emoji pack’s texture when displaying the menu.
- The easter egg interaction forces the default texture, providing a thematic surprise.

**Section sources**
- [index.ts:500-520](file://src/index.ts#L500-L520)
- [index.ts:1015-1021](file://src/index.ts#L1015-L1021)
- [menu-texture.ts:30-71](file://src/menu-texture.ts#L30-L71)

### Practical Examples
- Applying a specific emoji pack texture on menu display.
- Falling back to the default texture when the requested texture fails to load.
- Immediately reverting to the default texture via an easter egg interaction.

Validation:
- Tests confirm that the loader sets the correct CSS variables and handles load errors gracefully.
- Asset attribution tests verify that menu textures are credited appropriately.

**Section sources**
- [menu-texture.test.ts:87-176](file://tests/menu-texture.test.ts#L87-L176)
- [texture-attribution.test.ts:6-14](file://tests/texture-attribution.test.ts#L6-L14)
- [README.md:222-225](file://README.md#L222-L225)

## Dependency Analysis
The menu texture overlay system exhibits low coupling and clear separation of concerns:
- JavaScript loader depends on DOM APIs and CSS custom properties.
- Styles define the visual layering and effects independently of JavaScript.
- Tests validate behavior and asset presence without relying on external resources.

```mermaid
graph LR
JS["menu-texture.ts"] --> DOM["menu element"]
DOM --> CSS1["styles.css"]
CSS1 --> CSS2["styles.winfx.css"]
Tests["menu-texture.test.ts"] --> JS
Tests2["texture-attribution.test.ts"] --> JS
HTML["index.html"] --> JS
HTML --> CSS1
```

**Diagram sources**
- [menu-texture.ts:73-130](file://src/menu-texture.ts#L73-L130)
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)
- [menu-texture.test.ts:61-85](file://tests/menu-texture.test.ts#L61-L85)
- [texture-attribution.test.ts:6-14](file://tests/texture-attribution.test.ts#L6-L14)
- [index.html:27-38](file://index.html#L27-L38)

**Section sources**
- [menu-texture.ts:73-130](file://src/menu-texture.ts#L73-L130)
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)
- [menu-texture.test.ts:61-85](file://tests/menu-texture.test.ts#L61-L85)
- [texture-attribution.test.ts:6-14](file://tests/texture-attribution.test.ts#L6-L14)
- [index.html:27-38](file://index.html#L27-L38)

## Performance Considerations
- Asynchronous texture loading: The loader defers to the Image API and applies the texture only after load, preventing blocking and ensuring immediate fallback stability.
- Stable fallbacks: The system always shows a fallback texture while the requested texture loads, minimizing perceived latency.
- CSS-driven rendering: Backgrounds are rendered via CSS pseudo-elements, avoiding heavy DOM manipulation and leveraging GPU-accelerated compositing.
- Blend and filter costs: The overlay uses soft-light blend and subtle filters; keep filter intensity moderate to balance visual appeal and performance.
- Cross-device scaling: The menu frame relies on CSS custom properties for background sizing and positioning, allowing consistent scaling across devices without JavaScript calculations.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Texture not updating: Verify that the loader sets the correct CSS variables and that the dataset guard prevents stale results.
- Fallback not applied on error: Confirm that the loader’s error handler sets the default texture and that the dataset guard matches the requested path.
- Missing assets: Ensure that menu textures exist and are referenced correctly; tests validate asset presence and supported extensions.
- Blend artifacts: Adjust opacity and filter settings on the overlay layer to prevent over-blending with foreground content.

**Section sources**
- [menu-texture.test.ts:87-176](file://tests/menu-texture.test.ts#L87-L176)
- [menu-texture.ts:113-127](file://src/menu-texture.ts#L113-L127)
- [styles.css:722-747](file://styles.css#L722-L747)

## Conclusion
The menu texture overlay system provides a robust, CSS-driven solution for background texture management and visual layering. It balances performance with visual polish through asynchronous loading, stable fallbacks, and carefully layered pseudo-elements with blend modes and filters. The system integrates cleanly with the application bootstrap and supports theme-based customization via emoji pack selection.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Texture Asset Management Guidelines
- Naming convention: Use consistent naming for menu textures aligned with emoji pack IDs.
- Supported formats: Prefer widely supported raster formats; validate extensions in the loader.
- Attribution: Maintain credits for artwork and inspirations as demonstrated by the attribution tests and README.
- Optimization: Compress textures and consider vector formats where appropriate to reduce bundle size.

**Section sources**
- [menu-texture.ts:3-8](file://src/menu-texture.ts#L3-L8)
- [menu-texture.test.ts:68-84](file://tests/menu-texture.test.ts#L68-L84)
- [texture-attribution.test.ts:6-14](file://tests/texture-attribution.test.ts#L6-L14)
- [README.md:222-225](file://README.md#L222-L225)

### Cross-Device Scaling Strategies
- CSS custom properties: Use CSS variables for background sizing and positioning to adapt to various viewport sizes.
- Relative units: Combine viewport-relative units with CSS custom properties for scalable layouts.
- Layered backgrounds: Keep the background layer separate from foreground content to ensure readability across devices.

**Section sources**
- [styles.css:707-752](file://styles.css#L707-L752)
- [styles.winfx.css:489-545](file://styles.winfx.css#L489-L545)