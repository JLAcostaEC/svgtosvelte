export type CasingFormat = 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case';

export type Options = {
  prefix?: string;
  suffix?: string;
  casing: CasingFormat;
  useTypeScript?: boolean;
  attributes?: string[];
  filter?: string[];
  exclude?: string[];
  registry?: boolean;
};

export type FileWithOverrides = {
  file: string;
  overrides: AttributeOverride[];
};

export type AttributeOverride = {
  attr: string;
  value: string;
};
