# WebUSB Discovery Application Plan

## 1. Project Initialization & Dependencies
- [x] Analyze existing Vite + React + TypeScript setup.
- [x] Install `@types/w3c-web-usb` for WebUSB TypeScript definitions.

## 2. Core Application Logic (src/App.tsx)
- [x] Initialize state for `devices` (list of `USBDevice`).
- [x] Implement `useEffect` hook for device enumeration and events.
- [x] Implement `requestDevice` for user interaction.

## 3. Descriptor-Focused UI Refactoring (src/DescriptorComponents.tsx)
- [x] Create `DeviceDescriptor` component mimicking standard USB Table 9-8.
- [x] Create `ConfigurationDescriptor` component mimicking Table 9-10.
- [x] Create `InterfaceDescriptor` component mimicking Table 9-12.
- [x] Create `EndpointDescriptor` component mimicking Table 9-13.
- [x] Implement technical field mapping (e.g., `idVendor`, `bDeviceClass`).
- [x] Implement hex and BCD formatting helpers.
- [x] Integrate `usb-classes.json` for human-readable Class/Subclass names.

## 4. Integration & Styling
- [x] Update `src/App.tsx` to use the new descriptor components.
- [x] Update `src/App.css` for technical, hierarchical styling.

## 5. Collapsible UI & Grid Layout
- [x] Refactor `DescriptorComponents.tsx` to include a `CollapsibleDescriptor` wrapper.
- [x] Make `ConfigurationDescriptor` and `InterfaceDescriptor` collapsible and **collapsed by default**.
- [x] Refactor `App.tsx` to use a `DeviceCard` component.
- [x] Set `DeviceCard` to be **expanded by default**.
- [x] Update `App.css` to use CSS Grid for the device list.
- [x] Style collapsible headers and card wrappers.

## 6. Dynamic Grid Update
- [x] Update `src/App.css` to remove `max-width` constraint from `.app-container`.
- [x] Ensure grid scales with viewport width using `auto-fill`.

## 7. Verification
- [x] Run TypeScript compiler (`tsc`) to ensure type safety.
- [x] Run Vite build (`npm run build`) to ensure production build succeeds.
