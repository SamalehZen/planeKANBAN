import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import githubBlackImage from "@/app/assets/logos/github-black.png?url";
import githubWhiteImage from "@/app/assets/logos/github-white.png?url";

const SLOGANS = [
  "Traçabilité totale, empreinte minimale.",
  "Tout suivre. Tout maîtriser.",
  "Chaque détail sous contrôle.",
];

const DISPLAY_DURATION = 3000;

export function HyperPlaneSloganCarousel() {
  const { resolvedTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const imageSrc = resolvedTheme === "dark" ? githubWhiteImage : githubBlackImage;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SLOGANS.length);
        setIsAnimating(false);
      }, 300);
    }, DISPLAY_DURATION);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-shrink-0 items-center gap-1.5 rounded-sm bg-layer-2 px-3 py-1.5 overflow-hidden"
      aria-label="HyperPLANE"
    >
      <img
        src={imageSrc}
        className="h-4 w-4 object-contain flex-shrink-0"
        alt="GitHub Logo"
        aria-hidden="true"
      />
      <span
        className={`
          text-11 font-medium whitespace-nowrap
          transition-all duration-300 ease-in-out
          ${isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
        `}
      >
        {SLOGANS[currentIndex]}
      </span>
    </div>
  );
}

export { HyperPlaneSloganCarousel as StarUsOnGitHubLink };
