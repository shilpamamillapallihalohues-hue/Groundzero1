import { useState } from 'react';
import { Sparkles } from 'lucide-react';

const FILM_QUOTES = [
  { quote: "Every great film was once just an idea.", author: "Anonymous" },
  { quote: "Cinema is the most beautiful fraud in the world.", author: "Jean-Luc Godard" },
  { quote: "A film is never really good unless the camera is an eye in the head of a poet.", author: "Orson Welles" },
  { quote: "Movies are like an expensive form of therapy for me.", author: "Tim Burton" },
  { quote: "The length of a film should be directly related to the endurance of the human bladder.", author: "Alfred Hitchcock" },
  { quote: "Film is a battleground: love, hate, violence, action, death. In a word, emotion.", author: "Samuel Fuller" },
  { quote: "A story should have a beginning, a middle, and an end... but not necessarily in that order.", author: "Jean-Luc Godard" },
  { quote: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { quote: "All you need to make a movie is a girl and a gun.", author: "Jean-Luc Godard" },
  { quote: "The screen is a magic medium. It has such power that it can retain interest as it conveys emotions and moods that no other art form can hope to tackle.", author: "Stanley Kubrick" },
  { quote: "A director makes only one movie in his life. Then he breaks it into pieces and makes it again.", author: "Jean Renoir" },
  { quote: "You don't have to be a genius to make a good movie, but you do have to have a passion.", author: "Martin Scorsese" },
  { quote: "Every frame is a painting.", author: "Anonymous" },
  { quote: "Great stories happen to those who can tell them.", author: "Ira Glass" },
  { quote: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { quote: "Creativity takes courage.", author: "Henri Matisse" },
  { quote: "Art is not what you see, but what you make others see.", author: "Edgar Degas" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "In dreams begin responsibilities.", author: "W.B. Yeats" },
  { quote: "Imagination is the beginning of creation.", author: "George Bernard Shaw" },
];


function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Burning the midnight oil";
}

interface WelcomeQuoteProps {
  userName?: string;
  tagline?: string;
}

export function WelcomeQuote({ userName, tagline }: WelcomeQuoteProps) {
  const [quote] = useState(() => {
    const randomIndex = Math.floor(Math.random() * FILM_QUOTES.length);
    return FILM_QUOTES[randomIndex];
  });
  const [greeting] = useState(getTimeOfDayGreeting);

  const displayName = userName || 'Creator';

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card via-card/95 to-muted/40 px-5 py-4 md:px-6 md:py-5">
      {/* Ambient glow effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      
      <div className="relative">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>{greeting}, {displayName}!</span>
        </div>
        
        {tagline ? (
          <p className="text-lg md:text-xl font-semibold text-foreground leading-snug tracking-tight">
            {tagline}
          </p>
        ) : (
          <blockquote className="text-lg md:text-xl font-semibold text-foreground leading-snug tracking-tight">
            "{quote.quote}"
          </blockquote>
        )}
      </div>
    </div>
  );
}
