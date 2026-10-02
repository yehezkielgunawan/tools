import { expect, test } from '@rstest/core';
import {
  changeOccasion,
  initialCard,
  validateCard,
} from '../src/tools/greeting-card/cardModel';

test('normalizes card text like the rendering service without losing message breaks', () => {
  const result = validateCard({
    ...initialCard,
    heading: '  Happy\n birthday!  ',
    recipient: '  José   García  ',
    message: '  Thank you!\r\nFor everything.  ',
    sender: '',
  });
  expect(result.errors).toEqual({});
  expect(result.value).toEqual({
    ...initialCard,
    heading: 'Happy birthday!',
    recipient: 'José García',
    message: 'Thank you!\nFor everything.',
    sender: '',
  });
});

test('accepts exact text boundaries and rejects overlong or empty required fields', () => {
  expect(
    validateCard({
      ...initialCard,
      heading: 'a'.repeat(80),
      message: 'a'.repeat(400),
      recipient: 'a'.repeat(60),
      sender: 'a'.repeat(60),
    }).value,
  ).not.toBeNull();
  const result = validateCard({
    ...initialCard,
    heading: 'a'.repeat(81),
    message: 'a'.repeat(401),
    recipient: 'a'.repeat(61),
    sender: 'a'.repeat(61),
  });
  expect(Object.keys(result.errors)).toEqual([
    'heading',
    'recipient',
    'message',
    'sender',
  ]);
  expect(result.value).toBeNull();
  expect(
    validateCard({ ...initialCard, heading: '  ', message: '\n' }).errors,
  ).toEqual({
    heading: 'Enter a heading.',
    message: 'Enter a message.',
  });
});

test('allows twelve normalized message lines but rejects thirteen', () => {
  expect(
    validateCard({ ...initialCard, message: Array(12).fill('Hi').join('\r\n') })
      .value,
  ).not.toBeNull();
  expect(
    validateCard({ ...initialCard, message: Array(13).fill('Hi').join('\n') })
      .errors.message,
  ).toMatch(/12 lines/);
});

test('changes only suggested wording when selecting a different occasion', () => {
  const appreciation = changeOccasion(initialCard, 'thank-you');
  expect(appreciation.heading).not.toBe(initialCard.heading);
  expect(appreciation.message).not.toBe(initialCard.message);
  expect(appreciation.occasion).toBe('thank-you');
  const customized = {
    ...initialCard,
    heading: 'Well done, Alex!',
    recipient: 'Alex',
    sender: 'Sam',
    theme: 'cool' as const,
  };
  const next = changeOccasion(customized, 'congratulations');
  expect(next.heading).toBe(customized.heading);
  expect(next.message).not.toBe(initialCard.message);
  expect(next.recipient).toBe('Alex');
  expect(next.sender).toBe('Sam');
  expect(next.theme).toBe('cool');
  expect(
    changeOccasion(
      { ...customized, message: 'Our very own message.' },
      'general',
    ).message,
  ).toBe('Our very own message.');
});
