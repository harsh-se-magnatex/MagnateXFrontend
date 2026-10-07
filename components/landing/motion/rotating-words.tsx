'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const EASE_EXPO = [0.4, 0, 0.2, 1] as const;
/** The system's spring — entrance pops only, never state changes. */
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

type RotatingWordsProps = {
  words: readonly string[];
  /** One colour per word, cycled. Semantic `--brand-*-text` tokens only. */
  colors?: readonly string[];
  /** Milliseconds each word stays on screen. */
  interval?: number;
  /** Seconds between each letter's roll. */
  stagger?: number;
  className?: string;
};

/**
 * One slot inside a static sentence whose word rolls through a list, letter
 * by letter: the outgoing word lifts out the top, the incoming one rises from
 * below with a slight spring, and the slot's width eases to the new word so
 * the rest of the line glides instead of jumping.
 *
 * The first word renders on the server with no animation, so crawlers and
 * no-JS visitors read a complete sentence. Under reduced motion the slot
 * stays on that first word.
 */
export function RotatingWords({
  words,
  colors,
  interval = 2800,
  stagger = 0.024,
  className,
}: RotatingWordsProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number | 'auto'>('auto');
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduceMotion || words.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [reduceMotion, words.length, interval]);

  // Measure the word currently in flow. A ResizeObserver rather than a
  // one-off read, because the webfont swapping in changes every width.
  useEffect(() => {
    const el = wordRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  const word = words[index] ?? '';
  const color = colors?.length ? colors[index % colors.length] : undefined;

  return (
    <motion.span
      className={cn('rotating-words', className)}
      animate={{ width }}
      transition={{ duration: 0.45, ease: EASE_EXPO }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={index}
          ref={wordRef}
          className="rotating-words__word"
          style={color ? { color } : undefined}
        >
          {Array.from(word).map((char, i) => (
            <motion.span
              key={i}
              className="rotating-words__char"
              initial={{ y: '105%', opacity: 0 }}
              animate={{
                y: '0%',
                opacity: 1,
                transition: {
                  delay: i * stagger,
                  duration: 0.55,
                  ease: EASE_SPRING,
                },
              }}
              exit={{
                y: '-105%',
                opacity: 0,
                transition: {
                  delay: i * stagger * 0.5,
                  duration: 0.3,
                  ease: EASE_EXPO,
                },
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
