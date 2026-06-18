import type { Component } from 'vue';

export interface AlertConfig {
  icon: Component;
  label: string;
  labelColor: string;
  tint: string;
}

export interface CalloutConfig {
  icon: Component;
  bg: string;
  border: string;
  borderLeft: string;
  label: string;
  labelColor: string;
}
