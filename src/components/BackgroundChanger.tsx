"use client";

import { useEffect, useState } from "react";

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
  '/images/bg/stadium_sofi_1782294704066.png',
  '/images/bg/stadium_bc_place.png',
  '/images/bg/stadium_akron.png',
  '/images/bg/stadium_bbva.png'
];

function shuffleArray(array: string[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function BackgroundChanger() {
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Clear any previous body background styling
    document.body.style.backgroundImage = '';
    setShuffled(shuffleArray(backgrounds));
  }, []);

  useEffect(() => {
    if (shuffled.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= shuffled.length) {
          const newShuffled = shuffleArray(backgrounds);
          if (newShuffled[0] === shuffled[shuffled.length - 1]) {
            [newShuffled[0], newShuffled[1]] = [newShuffled[1], newShuffled[0]];
          }
          setShuffled(newShuffled);
          return 0;
        }
        return next;
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [shuffled]);

  if (shuffled.length === 0) return null;

  return (
    <>
      {backgrounds.map((bg) => (
        <div
          key={bg}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -2,
            backgroundImage: `url('${bg}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: bg === shuffled[currentIndex] ? 1 : 0,
            transition: 'opacity 2s ease-in-out',
            filter: 'contrast(1.1) saturate(1.15)',
            willChange: 'opacity'
          }}
        />
      ))}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          backgroundImage: `
            radial-gradient(ellipse at top right, rgba(111, 0, 255, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at bottom left, rgba(255, 0, 76, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none'
        }}
      />
    </>
  );
}
