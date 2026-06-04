export interface Project {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  description: string;
  detailedDescription: string;
  client: string;
  year: string;
  services: string[];
  url?: string;
  isDemo?: boolean;
  isBuilding?: boolean;
  colSpanDesktop: number;
  marginTopDesktop?: string;
  aspectRatio: string;
}

export interface JournalPost {
  id: string;
  title: string;
  date: string;
  readTime: string;
  category: string;
  excerpt: string;
}
