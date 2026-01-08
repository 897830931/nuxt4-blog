import * as THREE from 'three';

declare module '#app' {
  interface NuxtApp {
    $three: typeof THREE;
  }
}

declare module 'heatmap.js' {
  const h337: {
    create: (config: any) => any
  }
  export default h337
}
