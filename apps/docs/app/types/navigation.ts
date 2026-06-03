export interface NavSection {
  title: string;
  path: string;
  children: NavItem[];
}

export interface NavItem {
  title: string;
  path: string;
}
