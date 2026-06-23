import { parse } from '@vue/compiler-sfc';
import { describe, expect, it } from 'vitest';
import { VAPOR_CAPABILITY, isVaporSfc } from '../src/template/vapor.js';

function descriptorOf(src: string) {
  return parse(src, { filename: 'C.vue' }).descriptor;
}

describe('isVaporSfc', () => {
  it('exposes the vue:vapor capability token', () => {
    expect(VAPOR_CAPABILITY).toBe('vue:vapor');
  });

  it('returns true for <script setup vapor>', () => {
    expect(
      isVaporSfc(descriptorOf('<script setup vapor>const a = 1;</script>')),
    ).toBe(true);
  });

  it('returns true for <template vapor>', () => {
    expect(isVaporSfc(descriptorOf('<template vapor><div /></template>'))).toBe(
      true,
    );
  });

  it('returns false for a plain SFC', () => {
    expect(
      isVaporSfc(descriptorOf('<script setup>const a = 1;</script>')),
    ).toBe(false);
  });

  it('returns false when vapor is a string value (not a boolean attr)', () => {
    expect(
      isVaporSfc(
        descriptorOf('<script setup vapor="false">const a = 1;</script>'),
      ),
    ).toBe(false);
  });

  it('returns false for a template-only SFC without vapor', () => {
    expect(isVaporSfc(descriptorOf('<template><div /></template>'))).toBe(
      false,
    );
  });
});
