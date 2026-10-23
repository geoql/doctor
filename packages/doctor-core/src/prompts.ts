// Parser-free entry for hosts that only render rule prompts (the docs Worker).
// The root entry imports oxc-parser, whose `browser` export condition resolves
// to a WASM binding that a Cloudflare Worker bundle cannot (and need not) load.
export { renderAgentPlaybook, renderRulePrompt } from './rule-prompt.js';
