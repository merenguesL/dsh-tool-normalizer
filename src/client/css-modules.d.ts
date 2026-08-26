/** CSS Module imports resolve to scoped class-name maps at build time. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
