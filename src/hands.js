// Map hand values to their assets
import fistImg from '/assets/hands/fist.png';
import hand1Img from '/assets/hands/hand_1.png';
import hand2Img from '/assets/hands/hand_2.png';
import hand3Img from '/assets/hands/hand_3.png';
import hand4Img from '/assets/hands/hand_4.png';

// Hand image/emoji map
export const HAND_IMAGES = {
  fist: fistImg,
  1: hand1Img,
  2: hand2Img,
  3: hand3Img,
  4: hand4Img,
  5: null, // fallback to emoji
  6: null, // fallback to emoji
};

export const HAND_EMOJIS = {
  fist: '✊',
  1: '☝️',
  2: '✌️',
  3: '🤟',
  4: '🖖',
  5: '🖐️',
  6: '👍',
};

export const FINGER_LABELS = {
  1: '1 Run',
  2: '2 Runs',
  3: '3 Runs',
  4: '4 Runs',
  5: '5 Runs',
  6: 'SIX! 👍',
};

/**
 * Get the hand display element for a given value
 */
export function getHandDisplay(value) {
  const img = HAND_IMAGES[value];
  if (img) {
    return { type: 'image', src: img };
  }
  return { type: 'emoji', emoji: HAND_EMOJIS[value] || '✊' };
}
