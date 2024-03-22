import { faker } from '@faker-js/faker';
import { PAGE_SIZE } from '../constants'

export const dummyData = (currentLength, minWordCount, maxWordCount) => {
  const items = [];
  const length = PAGE_SIZE;
  for (let i = 0; i < length; i++) {
    const wordCount =
      minWordCount +
      Math.floor(Math.random() * (maxWordCount - minWordCount));
    // For each item we take a UUID, an index and a value
    // UUID clashes here will be bad
    items.push({
      id: faker.string.uuid(),
      index: currentLength + i,
      value: "Item " + faker.word.words(wordCount)
    });
  }
  return items;
}
