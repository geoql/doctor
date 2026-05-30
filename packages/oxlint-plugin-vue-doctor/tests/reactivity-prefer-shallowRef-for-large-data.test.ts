import { describe, expect, it } from 'vitest';
import { preferShallowRefForLargeData } from '../src/rules/reactivity/prefer-shallowRef-for-large-data.js';
import { runRule } from './run-rule.js';

const rule = preferShallowRefForLargeData;

const bigArray = `[${Array.from({ length: 101 }, () => '1').join(',')}]`;
const boundaryArray = `[${Array.from({ length: 100 }, () => '1').join(',')}]`;
const bigObject = `{${Array.from({ length: 51 }, (_, i) => `a${i}:1`).join(',')}}`;
const boundaryObject = `{${Array.from({ length: 50 }, (_, i) => `a${i}:1`).join(',')}}`;

describe('reactivity/prefer-shallowRef-for-large-data', () => {
  it('fires on a ref initialized with a large array literal', () => {
    const reports = runRule(rule, `const r = ref(${bigArray});`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('shallowRef');
    expect(reports[0]!.message).toContain('vuejs.org');
  });

  it('fires on a ref initialized with a large object literal', () => {
    const reports = runRule(rule, `const r = ref(${bigObject});`);
    expect(reports).toHaveLength(1);
  });

  it('fires on a ref initialized from $fetch', () => {
    const reports = runRule(rule, `const r = ref($fetch('/api/items'));`);
    expect(reports).toHaveLength(1);
  });

  it('fires on a ref initialized from useFetch', () => {
    const reports = runRule(rule, `const r = ref(useFetch('/api/items'));`);
    expect(reports).toHaveLength(1);
  });

  it('fires on a ref initialized from axios.get', () => {
    const reports = runRule(rule, `const r = ref(axios.get('/api/items'));`);
    expect(reports).toHaveLength(1);
  });

  it('fires on a ref initialized from an awaited $fetch', () => {
    const reports = runRule(rule, `const r = ref(await $fetch('/api/items'));`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on a ref with a small primitive', () => {
    const reports = runRule(rule, `const r = ref(0);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref with a small array literal', () => {
    const reports = runRule(rule, `const r = ref([1, 2, 3]);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref with an array at the 100-element boundary', () => {
    const reports = runRule(rule, `const r = ref(${boundaryArray});`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref with a small object literal', () => {
    const reports = runRule(rule, `const r = ref({ a: 1 });`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref with an object at the 50-property boundary', () => {
    const reports = runRule(rule, `const r = ref(${boundaryObject});`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref initialized from an unrelated call', () => {
    const reports = runRule(rule, `const r = ref(makeState());`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref initialized from axios.post', () => {
    const reports = runRule(rule, `const r = ref(axios.post('/api'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref initialized from a non-axios member get', () => {
    const reports = runRule(rule, `const r = ref(client.get('/api'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref from a nested-member get call', () => {
    const reports = runRule(rule, `const r = ref(http.api.get('/x'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref from a computed-member get call', () => {
    const reports = runRule(rule, `const r = ref(axios['get']('/x'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a ref from a curried call', () => {
    const reports = runRule(rule, `const r = ref(make()('/x'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when ref has no arguments', () => {
    const reports = runRule(rule, `const r = ref();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on shallowRef or other factories', () => {
    const reports = runRule(rule, `const r = shallowRef(${bigArray});`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a member-expression ref call', () => {
    const reports = runRule(rule, `const r = obj.ref(${bigArray});`);
    expect(reports).toEqual([]);
  });
});
