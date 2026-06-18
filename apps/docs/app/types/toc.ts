export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface TocLink {
  id: string;
  text: string;
  depth: number;
  children?: TocLink[];
}
