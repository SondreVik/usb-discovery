# Collapsible Descriptors & Grid Layout Plan

## 1. Refactor Components (src/DescriptorComponents.tsx)
-   Update `ConfigurationDescriptor` and `InterfaceDescriptor` to be collapsible.
-   Add local state (`isExpanded`) to manage visibility of fields and nested descriptors.
-   Add a clickable header with a toggle indicator (e.g., `[+]` / `[-]`).
-   Default state: Expanded.

## 2. Refactor App Logic (src/App.tsx)
-   **Grid Layout**: Change the container for devices to a responsive grid.
-   **Collapsible Device Cards**:
    -   Move the "card" logic into a new `DeviceCard` component (internal or external).
    -   Implement state `isExpanded` for the card itself.
    -   When collapsed, show only the `device-summary` (Product Name, VID/PID).
    -   When expanded, show the summary + `DeviceDescriptor`.

## 3. Styling (src/App.css)
-   **Grid**: Update `.device-list` to use CSS Grid (e.g., `grid-template-columns: repeat(auto-fill, minmax(400px, 1fr))`).
-   **Masonry/Alignment**: Use `align-items: start` to ensure cards don't stretch weirdly if heights differ.
-   **Interactive Elements**: Add `cursor: pointer` and hover styles for headers.
-   **Transitions**: Add basic transitions for expanding/collapsing content (optional, but good for UX).

## 4. Verification
-   Verify clicking the device header toggles the full descriptor view.
-   Verify clicking descriptor headers (Config, Interface) toggles their content.
-   Verify the layout adapts to screen width (responsive grid).
