declare module 'react-holo-card-effect' {
  import { ComponentType, HTMLAttributes } from 'react';

  export interface HoloCardProps extends HTMLAttributes<HTMLDivElement> {
    text: string;
    className?: string;
  }

  export const HoloCard: ComponentType<HoloCardProps>;
} 