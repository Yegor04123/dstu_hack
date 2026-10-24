import { useState, useEffect } from "react";
import styles from "./LennaCharacter.module.css";

type Props = {
  messages: string[];
  autoPlay?: boolean;
  messageDelay?: number;
};

export function LennaCharacter({
  messages,
  autoPlay = false,
  messageDelay = 3500,
}: Props) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (autoPlay && messages.length > 1) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => {
          if (prev >= messages.length - 1) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, messageDelay);

      return () => clearInterval(interval);
    }
  }, [autoPlay, messages.length, messageDelay]);

  const isFinalMessage = currentMessageIndex === messages.length - 1;

  return (
    <div className={styles.container}>
      <div className={styles.character}>
        <img
          src="/assets/lenna/lenna-neutral.svg"
          alt="Лена"
          className={styles.image}
        />

        <div className={`${styles.speechBubble} ${isFinalMessage ? styles.finalBubble : ""}`}>
          <div className={styles.speechText}>
            {messages[currentMessageIndex]}
          </div>
          <div className={styles.speechTail} />
        </div>
      </div>
    </div>
  );
}
