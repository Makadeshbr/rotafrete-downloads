/// <reference types="nativewind/types" />

// Tipagem para NativeWind funcionar com TypeScript
declare module "nativewind" {
  export function styled<T>(component: T): T;
}
