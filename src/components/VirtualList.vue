<script setup>
import throttle from 'lodash.throttle';
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick
} from 'vue';
import { bus } from '../utils/bus';
import { binarySearch, findStartNode } from '../utils/search';
import { doesBrowserSupportPassiveScroll } from '../utils/checkBrowserSupport';
import useDummyData from '../hooks/useDummyData';
import { PAGE_SIZE, EMIT_ENABLED } from '../constants'

const { dummy } = useDummyData();

const props = defineProps({
  // TODO
  overscan: {
    type: Number,
    default: 0
  }
})

const root = ref(null);
// 包含所有列表项的最外层 div 的高度
const rootHeight = ref(0);
// 每行的高度
const heights = ref([]);
// 每页总高度
// 在第 0 页上，假设所有 PAGE_SIZE 行加起来为 2000
// 在第 1 页上，假设所有 PAGE_SIZE 行加起来为 2500，那么
// 滚动页面高度: [2000, 4500]
// 第 1 页 = 第 0 页 PAGE_SIZE 项目的高度 + 第 1 页 PAGE_SIZE 项目的高度
const rollingPageHeights = ref([]);
// 最小行的高度
const smallestRowHeight = ref(Number.MAX_SAFE_INTEGER);
// 最大行高度
const largestRowHeight = ref(Number.MIN_SAFE_INTEGER);
// 记录垂直移动间隔大小，以便在隐藏项目时让滚动条不会受到干扰
const translateY = ref(0);
// 所有页中所有行的总高度
const viewportHeight = ref(0);

// 当前项目是否作为无限滚动的一部分加载？如果您收到 AJAX 调用，则很方便
const loading = ref(false);
// 是否应该从此组件发出与数据更改相对应的事件？调试用
// 在生产中禁用此功能以减少发出事件
const emitEnabled = ref(EMIT_ENABLED);

// 当前页的索引，每页有 PAGE_SIZE 项
const pageIndex = ref(0);
// DOM 上第一个列表项的索引
const startIndex = ref(0);
// DOM 上最后一个列表项的索引
const endIndex = ref(PAGE_SIZE);

// 所有项目的列表，其中的子集将在 DOM 上呈现
const items = ref([]);
const itemRefs = reactive({});

// 当前滚动位置
const scrollTop = ref(0);

// 当前页中所有行的行偏移量
const rowPositions = computed(() => {
  // 截取出当前页所有的行高
  const currentHeights = heights.value.slice(
    pageIndex.value * PAGE_SIZE,
    (pageIndex.value + 1) * PAGE_SIZE
  );
  // 从第零页滚动到当前页的位移量，即基础偏移量
  let totalDisplacement =
    rollingPageHeights.value[pageIndex.value - 1] || 0;
  // 通过 页偏移 和 行高 计算出 行偏移
  let displacements = [];
  for (let i = 0; i < currentHeights.length; i++) {
    displacements.push(totalDisplacement);
    totalDisplacement += currentHeights[i];
  }
  displacements.push(totalDisplacement);
  // 返回值用来寻找在当前页中滚动的起始索引点
  return displacements;
});

// 监听滚动高度，更新页数，起始行和终止行的位置
watch(scrollTop, () => {
  // 根据滚动距离和页偏移计算页数
  pageIndex.value = binarySearch(
    rollingPageHeights.value,
    scrollTop.value
  );
  // 根据滚动距离和行偏移计算当前页起始行的位置
  const startNodeIndex = Math.max(
    0,
    findStartNode(
      scrollTop.value,
      rowPositions.value,
      rowPositions.value.length
    )
  );
  // 根据起始行在当前页的位置和页数计算起始行在所有项中的位置
  startIndex.value = pageIndex.value * PAGE_SIZE + startNodeIndex;
  // 计算终止行在所有项的位置
  endIndex.value =
    startIndex.value + Math.floor(rootHeight.value / smallestRowHeight.value);
  // 设置垂直位移以保证滚动条正常显示
  translateY.value = rowPositions.value[startNodeIndex];
})

// 核心方法
function init() {
  // 插入虚拟数据
  const insertedItems = dummy(items.value.length);
  items.value.push(...insertedItems);
  // 绑定事件
  const opt = doesBrowserSupportPassiveScroll() ? { passive: true } : false
  root.value.addEventListener("scroll", handleScroll, opt);
  window.addEventListener("keydown", handleKeyDown);
  // 在 DOM 上渲染项目时添加项目后，更新高度和其他属性
  nextTick(() => {
    update(insertedItems);
    emitEnabled.value && emit();
  });
}
function update(insertedItems) {
  for (let i = 0; i < insertedItems.length; i++) {
    const { id, index } = insertedItems[i];
    if (itemRefs[id]) {
      // 更新行高
      const height = itemRefs[id].scrollHeight;
      heights.value[index] = height;
      largestRowHeight.value = Math.max(height, largestRowHeight.value);
      smallestRowHeight.value = Math.min(height, smallestRowHeight.value);
      // 更新页偏移
      const pageIndex = Math.floor(index / PAGE_SIZE);
      if (!rollingPageHeights.value[pageIndex]) {
        if(pageIndex === 0) {
          rollingPageHeights.value[pageIndex] = 0
        } else {
          rollingPageHeights.value[pageIndex] = rollingPageHeights.value[pageIndex - 1];
        }
      }
      rollingPageHeights.value[pageIndex] += height;
    }
  }
  // 更新根容器高度
  rootHeight.value = root.value.offsetHeight;
  // 更新视口高度
  viewportHeight.value = rollingPageHeights.value[
    rollingPageHeights.value.length - 1
  ];
}
onMounted(() => {
  init();
  const ro = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const cr = entry.contentRect;
      console.log("Element:", entry.target, cr);
      rootHeight.value = cr.height;
      emitEnabled.value && emit();
    }
  });
  ro.observe(root.value);
})
onUnmounted(() => {
  root.value.removeEventListener("scroll", handleScroll);
  window.removeEventListener("keydown", handleKeyDown);
})
// 滚动 & 选择
// 当前选中项的id，默认设置为0
const selectedIndex = ref(0);
function select(itemId) {
  selectedIndex.value = itemId;
}
function scrollTo(index) {
  const pageIndex = Math.floor(index / PAGE_SIZE);

  const currentHeights = heights.value.slice(
    pageIndex * PAGE_SIZE,
    (pageIndex + 1) * PAGE_SIZE
  );
  let totalDisplacement = rollingPageHeights.value[pageIndex - 1] || 0;
  let displacements = [];
  for (let i = 0; i < currentHeights.length; i++) {
    displacements.push(totalDisplacement);
    totalDisplacement += currentHeights[i];
  }
  displacements.push(totalDisplacement);
  const top = displacements[index % PAGE_SIZE];
  const isVisible =
    top >= scrollTop.value && top <= scrollTop.value + root.value.offsetHeight;
  if (!isVisible) {
    root.value.scrollTo({
      left: 0,
      top: displacements[index % PAGE_SIZE],
      behavior: "smooth"
    });
  }
}
function handleKeyDown(event) {
  switch (event.keyCode) {
    // 如果使用左箭头键和上箭头键移动到上一项
    case 37:
    case 38:
      if (selectedIndex.value > 0) {
        select(selectedIndex.value - 1);
        scrollTo(selectedIndex.value);
      }
      event.preventDefault();
      break;
    // 如果是右箭头键和下箭头键则移至下一项
    case 39:
    case 40:
      if (selectedIndex.value < items.value.length - 1) {
        select(selectedIndex.value + 1);
        scrollTo(selectedIndex.value);
      }
      event.preventDefault();
      break;
  }
}
// 无限滚动
const handleScroll = throttle(function() {
  const { scrollTop: rootScrollTop, offsetHeight, scrollHeight } = root.value;
  scrollTop.value = rootScrollTop;
  emitEnabled.value && emit();
  // 距离底部 10px 时加载新数据
  if (rootScrollTop + offsetHeight >= scrollHeight - 10) {
    loadMore();
  }
}, 17)
function loadMore() {
  loading.value = true;
  setTimeout(() => {
    // 插入虚拟数据
    const insertedItems = dummy(items.value.length);
    items.value.push(...insertedItems);
    // 在此阶段将此处的结束索引更新为页面大小非常重要
    // 如果您在第 0 页上有 50 个项目并加载了另外 50 个项目，则 endIndex 设置为 100
    // 如果没有这一步，DOM 上的 50 个新项目将不会被渲染，因此我们无法获得它们的高度
    const pageIndex = Math.floor(items.value[items.value.length - 1].index / PAGE_SIZE)
    endIndex.value = (pageIndex + 1) * PAGE_SIZE;
    // 在 DOM 上渲染项目时添加项目后，更新高度和其他属性
    nextTick(() => {
      update(insertedItems);
      emitEnabled.value && emit();
      loading.value = false;
    });
  }, 1);
}
// 广播最新相关属性，用于调试
function emit() {
  bus.emit("scroll-top", scrollTop.value);
  bus.emit("viewport-height", viewportHeight.value);
  bus.emit("heights", heights.value);
  bus.emit("page-positions", rollingPageHeights.value);
  bus.emit("translate-y", translateY.value);
  bus.emit("page-start-index", pageIndex.value);
  bus.emit("start-index", startIndex.value);
  bus.emit("end-index", endIndex.value);
  bus.emit("smallest-height", smallestRowHeight.value);
  bus.emit("largest-height", largestRowHeight.value);
  bus.emit("root-height", rootHeight.value);
  bus.emit("row-positions", rowPositions.value);
  bus.emit(
    "visible-items",
    visibleItems.value.map((item) => item.index)
  );
}

// 在 DOM 上呈现的列表项的子集
const visibleItems = computed(() => {
  return items.value.slice(startIndex.value, endIndex.value);
});
// 设置垂直平移间隔以保持滚动条完整
const spacerStyle = computed(() => {
  return {
    willChange: "auto",
    transform: "translateY(" + translateY.value + "px)"
  };
});
/**
 * 设置视口的高度
 * 对于所有项目高度相等的列表，视口高度 = 项目数 x 每个项目的高度
 * 对于所有项目高度不同的列表，它是每行高度的总和
 */
const viewportStyle = computed(() => {
  return {
    height: viewportHeight.value + "px",
    overflow: "hidden",
    position: "relative",
    willChange: "auto"
  };
})
</script>

<template>
  <div id="root" ref="root">
    <div id="viewport" ref="viewport" :style="viewportStyle">
      <div id="spacer" ref="spacer" :style="spacerStyle">
        <div
          v-for="i in visibleItems"
          :key="i.id"
          :ref="el => {
            itemRefs[i.id] = el
          }"
          :data-index="i.index"
          :class="['list-item', i.index === selectedIndex ? 'selected': '']"
          @click="select(i.index)"
        >
          <div>{{ i.index + ' ' + i.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#root {
  height: 100%;
  overflow: auto;
}
.list-item {
  padding: 0.75rem 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 0, 0.4);
}

.selected {
  background: midnightblue;
}
</style>
