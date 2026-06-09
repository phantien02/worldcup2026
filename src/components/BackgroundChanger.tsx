"use client";

import { useEffect } from "react";

const backgrounds = [
  '/images/bg/bg1.png',
  '/images/bg/bg2.png',
  '/images/bg/bg3.png',
  '/images/bg/bg4.png',
  '/images/bg/bg5.png',
  '/images/bg/bg6.png',
  '/images/bg/bg7.png',
  '/images/bg/bg8.png'
];

export default function BackgroundChanger() {
  useEffect(() => {
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    document.body.style.backgroundImage = `
      radial-gradient(ellipse at top right, rgba(111, 0, 255, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at bottom left, rgba(255, 0, 76, 0.1) 0%, transparent 50%),
      url('${randomBg}')
    `;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";
  }, []);

  return null;
}
