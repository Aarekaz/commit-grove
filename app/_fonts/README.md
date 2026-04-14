# Vendored fonts

Inter (Latin subset, weights 400 + 600), licensed under SIL Open Font
License 1.1. https://rsms.me/inter/

Vendored instead of fetched from a CDN so satori / `ImageResponse` can
read them synchronously without a network hop during OG image render.

To refresh: `pnpm add -D @fontsource/inter && cp
node_modules/@fontsource/inter/files/inter-latin-{400,600}-normal.woff
app/_fonts/Inter-{Regular,SemiBold}.woff && pnpm remove @fontsource/inter`.
