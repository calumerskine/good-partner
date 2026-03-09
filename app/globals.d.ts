/// <reference types="node" />

declare module "*.ttf" {
  const value: string;
  export default value;
}

type Stat<T> = T[keyof T];
type Stats<T> = Stat<T>[];
