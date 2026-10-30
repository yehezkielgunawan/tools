export interface MemeTemplate {
  id: string;
  name: string;
  blankUrl: string;
  captionCount: number;
  sourceUrl?: string;
}

export interface MemeCaption {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontScale: number;
  color: string;
  outlineColor: string;
}

export interface PreparedMemeImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  release: () => void;
}
