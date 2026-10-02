export const occasions = {
  birthday: {
    label: 'Birthday',
    heading: 'Happy birthday!',
    message:
      "Here's to another year of little joys, big adventures, and all the things that make you smile.",
  },
  congratulations: {
    label: 'Congratulations',
    heading: 'Look at you go!',
    message:
      "You worked for this, and it shows. Celebrating you and everything that's still to come.",
  },
  'thank-you': {
    label: 'Appreciation',
    heading: 'A little note of thanks',
    message:
      'Your kindness made a difference. Thank you for being there, and for being you.',
  },
  general: {
    label: 'Just because',
    heading: 'Thinking of you',
    message:
      'No special occasion. Just a little reminder that you mean a lot to me.',
  },
} as const;

export const templates = {
  minimal: 'Minimal',
  celebratory: 'Celebratory',
  elegant: 'Elegant',
} as const;

export const palettes = {
  warm: 'Rose & cream',
  cool: 'Blue & mist',
  neutral: 'Ink & paper',
} as const;

export const sizes = {
  square: { label: 'Square', width: 1080, height: 1080 },
  portrait: { label: 'Portrait', width: 1080, height: 1350 },
} as const;

export const textLimits = {
  heading: 80,
  recipient: 60,
  message: 400,
  sender: 60,
} as const;

export type Occasion = keyof typeof occasions;
export type TextField = keyof typeof textLimits;

export interface CardInput {
  occasion: Occasion;
  template: keyof typeof templates;
  theme: keyof typeof palettes;
  size: keyof typeof sizes;
  heading: string;
  recipient: string;
  message: string;
  sender: string;
}

export type CardErrors = Partial<Record<keyof CardInput, string>>;

export const initialCard: CardInput = {
  occasion: 'birthday',
  template: 'minimal',
  theme: 'warm',
  size: 'square',
  heading: occasions.birthday.heading,
  recipient: '',
  message: occasions.birthday.message,
  sender: '',
};

export function changeOccasion(card: CardInput, occasion: Occasion): CardInput {
  const previous = occasions[card.occasion];
  const next = occasions[occasion];
  return {
    ...card,
    occasion,
    heading: card.heading === previous.heading ? next.heading : card.heading,
    message: card.message === previous.message ? next.message : card.message,
  };
}

export function validateCard(card: CardInput): {
  value: CardInput | null;
  errors: CardErrors;
} {
  const normalized = { ...card };
  const errors: CardErrors = {};
  for (const field of Object.keys(textLimits) as TextField[]) {
    const value = card[field].replace(/\r\n?/g, '\n').trim();
    if ((field === 'heading' || field === 'message') && !value) {
      errors[field] = `Enter a ${field}.`;
    } else if (value.length > textLimits[field]) {
      errors[field] = `Use ${textLimits[field]} characters or fewer.`;
    } else if (field === 'message' && value.split('\n').length > 12) {
      errors[field] = 'Use 12 lines or fewer so your message stays readable.';
    }
    normalized[field] =
      field === 'message' ? value : value.replace(/\s+/g, ' ');
  }
  return {
    value: Object.keys(errors).length ? null : normalized,
    errors,
  };
}
