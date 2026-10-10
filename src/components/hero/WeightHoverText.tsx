import type { CSSProperties } from 'react'
import './WeightHoverText.css'

type WeightHoverTextProps = {
  text: string
  fromWeight?: number
  toWeight?: number
  staggerDuration?: number
  className?: string
}

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

/** Keeps normal word wrapping and reserves each letter's heavier width. */
export function WeightHoverText({
  text,
  fromWeight = 700,
  toWeight = 800,
  staggerDuration = 14,
  className = '',
}: WeightHoverTextProps) {
  const characterCount = Array.from(segmenter.segment(text)).length
  let characterIndex = 0

  return (
    <span
      className={`weight-hover-text ${className}`}
      style={{
        '--weight-from': fromWeight,
        '--weight-to': toWeight,
      } as CSSProperties}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/u).map((word, wordIndex) => {
          if (/^\s+$/u.test(word)) {
            characterIndex += Array.from(segmenter.segment(word)).length
            return word
          }

          return (
            <span className="weight-hover-word" key={wordIndex}>
              {Array.from(segmenter.segment(word), ({ segment: letter }) => {
                const index = characterIndex++
                return (
                  <span
                    className="weight-hover-letter"
                    data-letter={letter}
                    key={index}
                    style={{
                      '--letter-delay': `${Math.min(index * staggerDuration, 180)}ms`,
                      '--letter-return-delay': `${Math.min(index * 5, 70)}ms`,
                      '--letter-position': `${index / Math.max(characterCount - 1, 1) * 100}%`,
                    } as CSSProperties}
                  >
                    <span className="weight-hover-glyph">{letter}</span>
                  </span>
                )
              })}
            </span>
          )
        })}
      </span>
    </span>
  )
}
