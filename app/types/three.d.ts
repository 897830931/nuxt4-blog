import * as THREE from 'three';

declare module '#app' {
  interface NuxtApp {
    $three: typeof THREE;
  }
}
