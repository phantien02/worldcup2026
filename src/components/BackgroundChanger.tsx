"use client";

import { useEffect } from "react";

const backgrounds = [
  '/images/bg/stadium_arrowhead_1782294729503.png',
  '/images/bg/stadium_att_1782294683401.png',
  '/images/bg/stadium_azteca_1782294657290.png',
  '/images/bg/stadium_bmo_1782294824289.png',
  '/images/bg/stadium_gillette_1782294795981.png',
  '/images/bg/stadium_hardrock_1782294808464.png',
  '/images/bg/stadium_levis_1782294781078.png',
  '/images/bg/stadium_lincoln_1782294755516.png',
  '/images/bg/stadium_lumen_1782294767185.png',
  '/images/bg/stadium_mercedes_1782294718063.png',
  '/images/bg/stadium_metlife_1782294670674.png',
  '/images/bg/stadium_nrg_1782294742593.png',
  '/images/bg/stadium_sofi_1782294704066.png'
];

export default function BackgroundChanger() {
  useEffect(() => {
    // Add smooth transition for background changes
    document.body.style.transition = "background-image 1.5s ease-in-out";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";

    const setRandomBackground = () => {
      const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
      document.body.style.backgroundImage = `
        radial-gradient(ellipse at top right, rgba(111, 0, 255, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at bottom left, rgba(255, 0, 76, 0.1) 0%, transparent 50%),
        url('${randomBg}')
      `;
    };

    // Set initial background
    setRandomBackground();

    // Set interval to change background every 10 seconds
    const intervalId = setInterval(setRandomBackground, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
