import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSfcDescriptorCache,
  parseSfcDescriptor,
} from '../../src/sfc/parse-sfc-descriptor.js';
import { check } from '../../src/sfc/rules/no-mixed-options-and-composition-api.js';
import type { Diagnostic } from '../../src/types.js';

const RULE_ID = 'vue-doctor/sfc/no-mixed-options-and-composition-api';

let counter = 0;

async function diagnose(content: string): Promise<Diagnostic[]> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-sfc-rule-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  const descriptor = await parseSfcDescriptor(path);
  if (!descriptor) throw new Error('expected descriptor');
  return check({ file: path, descriptor }).diagnostics;
}

beforeEach(() => {
  clearSfcDescriptorCache();
});

describe('no-mixed-options-and-composition-api — fires', () => {
  it('flags a single disallowed option on a plain object export', async () => {
    const diags = await diagnose(
      '<script setup lang="ts">const x = 1;</script>\n' +
        '<script lang="ts">export default { data() { return {}; } };</script>',
    );
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
    expect(diags[0]?.severity).toBe('error');
    expect(diags[0]?.source).toBe('sfc');
    expect(diags[0]?.message).toContain('Mixed Options API');
    expect(diags[0]?.message).toContain(
      'https://vuejs.org/api/sfc-script-setup.html#usage-alongside-normal-script',
    );
    expect(diags[0]?.recommendation).toBeTruthy();
    expect(diags[0]?.column).toBeGreaterThan(0);
  });

  it('flags one diagnostic per offending option', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default { data() {}, methods: {} };</script>',
    );
    expect(diags).toHaveLength(2);
  });

  it('flags defineComponent({ data }) form', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default defineComponent({ data() {} });</script>',
    );
    expect(diags).toHaveLength(1);
  });

  it('flags const C = defineComponent({ methods }); export default C (binding)', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>\nimport { defineComponent } from "vue";\nconst C = defineComponent({ methods: {} });\nexport default C;\n</script>',
    );
    expect(diags).toHaveLength(1);
  });

  it('skips spread elements and flags the disallowed option', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default { ...mixin, data() {} };</script>',
    );
    expect(diags).toHaveLength(1);
  });

  it('resolves the matching binding past unrelated declarators', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>\nconst { a } = src;\nconst k = 1;\nconst C = defineComponent({ watch: {} });\nexport default C;\n</script>',
    );
    expect(diags).toHaveLength(1);
  });
});

describe('no-mixed-options-and-composition-api — does not fire', () => {
  it('ignores options-only keys', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default { name: "Foo", inheritAttrs: false, components: {}, setup() {} };</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire when only <script setup> is present', async () => {
    const diags = await diagnose('<script setup>const x = 1;</script>');
    expect(diags).toHaveLength(0);
  });

  it('does not fire when only <script> with data is present', async () => {
    const diags = await diagnose(
      '<script>export default { data() {} };</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire when there is no export default', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n<script>const a = 1;</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a non-defineComponent call', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default other({ data() {} });</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for defineComponent() with no argument', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default defineComponent();</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for defineComponent(Identifier) argument', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default defineComponent(Options);</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a non-object/call/identifier default export', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default function Foo() {};</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a binding whose call callee is not an identifier', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>\nconst C = ns.defineComponent({ data() {} });\nexport default C;\n</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a binding with no initializer', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>\nlet C;\nexport default C;\n</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a binding that resolves to a non-defineComponent call', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>\nconst C = other({ data() {} });\nexport default C;\n</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a binding initialized to a non-call expression', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>\nconst C = { data() {} };\nexport default C;\n</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('does not fire for a default-exported identifier with no binding', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default Whatever;</script>',
    );
    expect(diags).toHaveLength(0);
  });

  it('ignores string-literal (non-identifier) keys', async () => {
    const diags = await diagnose(
      '<script setup>const x = 1;</script>\n' +
        '<script>export default { "data"() {} };</script>',
    );
    expect(diags).toHaveLength(0);
  });
});

describe('no-mixed-options-and-composition-api — location mapping', () => {
  it('maps the diagnostic line to the real .vue line of the option', async () => {
    const content = [
      '<template>',
      '  <div>{{ x }}</div>',
      '</template>',
      '',
      '<script setup lang="ts">',
      'const x = 1;',
      '</script>',
      '',
      '<script lang="ts">',
      'export default {',
      "  name: 'Foo',",
      '  data() {',
      '    return { y: 2 };',
      '  },',
      '};',
      '</script>',
      '',
    ].join('\n');
    const diags = await diagnose(content);
    expect(diags).toHaveLength(1);
    expect(diags[0]?.line).toBe(12);
  });
});
