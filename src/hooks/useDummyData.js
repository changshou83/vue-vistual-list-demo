import { dummyData } from "../utils/dummy"
import { ref } from 'vue';

export default function useDummyData() {
  const minWordCount = ref(3);
  const maxWordCount = ref(50);

  return {
    minWordCount,
    maxWordCount,
    dummy: (current) => dummyData(current, minWordCount.value, maxWordCount.value)
  }
}
