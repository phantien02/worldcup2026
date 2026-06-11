'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

// Danh sách nhạc mặc định (Bạn có thể tự thay link file mp3 của bạn vào đây)
const SONGS = [
  {
    "title": "Goals",
    "artist": "LISA, Anitta, Rema",
    "url": "/music/01_-_LISA%2C%20Anitta%2C%20Rema%2C%20FIFA%20Sound%20-%20Goals%20(FIFA%20World%20Cup%202026%E2%84%A2)%20%5BOfficial%20Music%20Video%5D.m4a"
  },
  {
    "title": "Illuminate",
    "artist": "Jessie Reyez, Elyanna",
    "url": "/music/02_-_Jessie%20Reyez%2C%20Elyanna%2C%20FIFA%20Sound%20-%20Illuminate%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Lighter",
    "artist": "Jelly Roll, Carín León",
    "url": "/music/03_-_Jelly%20Roll%2C%20Car%C3%ADn%20Le%C3%B3n%2C%20FIFA%20Sound%20-%20Lighter%20(FIFA%20World%20Cup%202026%E2%84%A2)%20%5BOfficial%20Lyric%20Video%5D.m4a"
  },
  {
    "title": "Game Time",
    "artist": "Future, Tyla",
    "url": "/music/04_-_Future%2C%20Tyla%2C%20FIFA%20Sound%20-%20Game%20Time%20(FIFA%20World%20Cup%202026%E2%84%A2)%20%5BOfficial%20Music%20Video%5D.m4a"
  },
  {
    "title": "Lighter",
    "artist": "Jelly Roll, Carín León",
    "url": "/music/05_-_Jelly%20Roll%2C%20Car%C3%ADn%20Le%C3%B3n%2C%20FIFA%20Sound%20-%20Lighter%20(FIFA%20World%20Cup%202026%E2%84%A2)%20%5BOfficial%20Music%20Video%5D.m4a"
  },
  {
    "title": "Echo",
    "artist": "Daddy Yankee, Shenseea",
    "url": "/music/06_-_Daddy%20Yankee%2C%20Shenseea%2C%20FIFA%20Sound%20-%20Echo%20(FIFA%20World%20Cup%202026%E2%84%A2)%20%5BOfficial%20Music%20Video%5D.m4a"
  },
  {
    "title": "Por Ella",
    "artist": "Los Ángeles Azules, Belinda",
    "url": "/music/07_-_Los%20%C3%81ngeles%20Azules%2C%20Belinda%2C%20FIFA%20Sound%20-%20Por%20Ella%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Shaggy, Cimafunk, Zema - “Love Always Wins” (FIFA World Cup 2026)",
    "artist": "FIFA Sound",
    "url": "/music/08_-_Shaggy%2C%20Cimafunk%2C%20Zema%20-%C2%A0%E2%80%9CLove%20Always%20Wins%E2%80%9D%C2%A0(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "No Place Like Home",
    "artist": "Major Lazer, Nelly Furtado, Davido",
    "url": "/music/09_-_Major%20Lazer%2C%20Nelly%20Furtado%2C%20Davido%20%20-%20No%20Place%20Like%20Home%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Three Nations",
    "artist": "21 Savage, Nata Cano, French Montana",
    "url": "/music/10_-_21%20Savage%2C%20Nata%20Cano%2C%20French%20Montana%20%20-%20Three%20Nations%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Energy",
    "artist": "Ava Max, BIA",
    "url": "/music/11_-_Ava%20Max%2C%20BIA%20%20-%20Energy%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Show Me",
    "artist": "Ayra Starr, Latto",
    "url": "/music/12_-_Ayra%20Starr%2C%20Latto%20-%20Show%20Me%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Partidazo",
    "artist": "Danny Ocean",
    "url": "/music/13_-_Danny%20Ocean%20-%20Partidazo%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Mi Mexico Lindo",
    "artist": "Alejandro Fernández",
    "url": "/music/14_-_Alejandro%20Fern%C3%A1ndez%20-%20Mi%20Mexico%20Lindo%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "In The Stars (Remix)",
    "artist": "The Rolling Stones",
    "url": "/music/15_-_The%20Rolling%20Stones%20-%20In%20The%20Stars%20(Remix)%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "Blessings",
    "artist": "Stormzy, Fridayy, Angel",
    "url": "/music/16_-_Stormzy%2C%20Fridayy%2C%20Angel%20-%20Blessings%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  },
  {
    "title": "DNA",
    "artist": "Andrea Bocelli, David Guetta, EJAE, Megan Thee Stallion",
    "url": "/music/17_-_Andrea%20Bocelli%2C%20David%20Guetta%2C%20EJAE%2C%20Megan%20Thee%20Stallion%20-%20DNA%20(FIFA%20World%20Cup%202026%E2%84%A2).m4a"
  }
];

import { useAuth } from '@/components/AuthProvider';

// Thuật toán xáo trộn mảng Fisher-Yates
function shuffleArray(array: number[]) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function generateQueue(lastSongIndex: number = -1) {
  const indices = Array.from({ length: SONGS.length }, (_, i) => i);
  let shuffled = shuffleArray(indices);
  // Đảm bảo bài hát đầu tiên của danh sách mới không trùng với bài hát cuối cùng vừa phát
  if (lastSongIndex !== -1 && shuffled[0] === lastSongIndex && SONGS.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export default function BackgroundMusic() {
  const { user, loading } = useAuth();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const [queue, setQueue] = useState<number[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo danh sách phát xáo trộn
  useEffect(() => {
    setQueue(generateQueue(-1));
  }, []);

  // Mỗi khi chuyển bài (queueIndex thay đổi), gọi lệnh play()
  useEffect(() => {
    if (audioRef.current && queue.length > 0) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setShowPopup(true);
      }).catch(() => {
        // Bị trình duyệt chặn Autoplay
        setIsPlaying(false);
      });
    }
  }, [queueIndex, queue]);

  // Global listener để tự động bật nhạc ngay khi người dùng thao tác vào web (nếu bị chặn autoplay)
  useEffect(() => {
    if (isPlaying || isMuted || queue.length === 0) return;

    const unlockAudio = () => {
      if (audioRef.current && !isMuted) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setShowPopup(true);
        }).catch(() => {});
      }
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('scroll', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('scroll', unlockAudio);
    };
  }, [isPlaying, isMuted, queue]);

  const playNext = () => {
    setShowPopup(false);
    setTimeout(() => {
      if (queueIndex < queue.length - 1) {
        setQueueIndex(prev => prev + 1);
      } else {
        // Hết danh sách -> Tạo danh sách xáo trộn mới
        setQueue(generateQueue(queue[queue.length - 1]));
        setQueueIndex(0);
      }
    }, 100);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (!isPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          if (!showPopup) setShowPopup(true);
        }).catch(() => {});
      }
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showPopup) {
      timeout = setTimeout(() => setShowPopup(false), 10000);
    }
    return () => clearTimeout(timeout);
  }, [showPopup]);

  // CHỈ HIỂN THỊ NÚT VÀ PHÁT NHẠC KHI NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP
  if (loading || !user || queue.length === 0) return null;

  const currentSong = SONGS[queue[queueIndex]];

  return (
    <>
      <audio 
        ref={audioRef} 
        src={currentSong.url} 
        onEnded={playNext} 
        preload="auto"
      />

      <button
        onClick={toggleMute}
        className="hover-card"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          padding: '12px',
          borderRadius: '50%',
          background: 'rgba(22, 27, 34, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: isMuted ? 'rgba(255, 255, 255, 0.5)' : '#00d2ff',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        title="Tắt/Bật nhạc nền"
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      <div 
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: showPopup ? 'translate(-50%, 0)' : 'translate(-50%, -150%)',
          opacity: showPopup ? 1 : 0,
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <div 
          style={{
            background: 'rgba(9, 9, 12, 0.9)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(111, 0, 255, 0.4)',
            maxWidth: '300px',
            padding: '12px 20px',
            borderRadius: '50px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Music size={20} color="#00d2ff" style={{ flexShrink: 0, animation: 'pulse 2s infinite' }} />
          
          <div style={{ width: '200px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{
              display: 'inline-block',
              animation: 'marquee 8s linear infinite'
            }}>
              <span style={{ fontWeight: 'bold', color: 'white', marginRight: '16px' }}>
                {currentSong.title}
              </span>
              <span style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
                - {currentSong.artist}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(200px); }
          100% { transform: translateX(-100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}} />
    </>
  );
}
