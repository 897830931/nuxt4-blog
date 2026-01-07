import { defineNuxtPlugin } from '#app';
import * as THREE from 'three';

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.provide('three', THREE);
});