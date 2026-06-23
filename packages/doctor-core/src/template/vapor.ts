import type { SFCDescriptor } from '@vue/compiler-sfc';

export const VAPOR_CAPABILITY = 'vue:vapor';

/**
 * Detect whether an SFC opts into Vue Vapor mode. Vapor is enabled per-block
 * via a boolean `vapor` attribute on `<script setup vapor>` or `<template vapor>`
 * (Vue 3.6+). A string value (e.g. `vapor="false"`) does not enable it.
 */
export function isVaporSfc(descriptor: SFCDescriptor): boolean {
  if (descriptor.scriptSetup?.attrs?.['vapor'] === true) return true;
  if (descriptor.template?.attrs?.['vapor'] === true) return true;
  return false;
}
