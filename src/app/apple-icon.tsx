import { ImageResponse } from 'next/og';
import { IconMotiv } from './icon-motiv';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<IconMotiv groesse={180} />, size);
}
