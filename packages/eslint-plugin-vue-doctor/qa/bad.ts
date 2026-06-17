// Vue 3 doctor — manual QA fixture.
// Each line is intentionally picked to fire one rule from the recommended preset.
const auth = localStorage.setItem('authToken', 'abc'); // security/no-auth-token-in-web-storage
void auth;
eval('1+1'); // security/no-eval-like
const s = 'foo—bar'; // no-em-dash-in-str
const apiKey = 'sk-abc'; // security/no-secrets-in-source
console.log(apiKey);
export {};
