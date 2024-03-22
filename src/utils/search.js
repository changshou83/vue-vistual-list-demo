export const binarySearch = (arr, x) => {
  let low = 0;
  let high = Array.isArray(arr)
    ? arr.length - 1
    : Object.keys(arr).length - 1;
  let mid;
  while (low < high) {
    mid = Math.floor((high + low) / 2);
    // Check if x is present at middle position
    if (arr[mid] == x) {
      break;
    } else if (arr[mid] > x) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  mid = Math.floor((high + low) / 2);
  if (x <= arr[mid]) return mid;
  else return mid + 1;
}

/**
Given a scroll top value, the map containing id of the each row as key and its vertical position from the top of the viewport in px and the number of total number of items available, find the index of the first node that is just above the current scroll top value or in simple words, find the index of the item that is just not seen by the user and is above the current scroll bar position
*/
export const findStartNode = (scrollTop, nodePositions, itemCount) => {
  let startRange = 0;
  let endRange = itemCount - 1;
  while (endRange !== startRange) {
    const middle = Math.floor((endRange - startRange) / 2 + startRange);
    if (
      nodePositions[middle] <= scrollTop &&
      nodePositions[middle + 1] > scrollTop
    ) {
      return middle;
    }
    if (middle === startRange) {
      // edge case - start and end range are consecutive
      return endRange;
    } else {
      if (nodePositions[middle] <= scrollTop) {
        startRange = middle;
      } else {
        endRange = middle;
      }
    }
  }
  return itemCount;
}
