# MyArad visual theme

Palette based on the supplied `download (1).jfif` swatches and the user's explicit colours:

- Deep ink: `#3D0000`
- Butter accent: `#FFEB99`
- Primary blue: `#8E93CB`
- Periwinkle surface: `#C5C9EC`
- Light paper: `#F1F3FF`

The user's correction selects blue `#8E93CB` as the dominant colour, with
`#FFEB99` and `#3D0000` reserved for accents. `src/features/city/brand.css`
owns the city interface theme and loads after the existing layout stylesheet.
Keep layout and resize rules in `city.css`; put palette and motion rules in
`brand.css`. Native authentication views use the same colours in `auth-ui.tsx`.

Typography pairs Manrope headings with DM Sans body text. Font files are bundled
through expo-font on native screens and inside the city WebView, so typography
does not depend on a request to Google Fonts. Native tokens live in
`src/features/design-system.ts`; reusable themed components use the same palette.

Motion uses short opacity/transform transitions on buttons, result cards and
panels, without animating layout dimensions or interfering with Leaflet panning.
Native buttons animate a subtle scale on press and release; Expo Router screens
fade over 220ms. `prefers-reduced-motion` disables decorative web/WebView motion,
and the shared native MotionProvider listens to the operating system preference.
Pressed opacity feedback remains available with reduced motion enabled.
Map imagery and documentary photographs retain their original colours.
