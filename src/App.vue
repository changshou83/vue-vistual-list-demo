<script setup>
import { reactive, onMounted, onUnmounted } from 'vue'
import { bus } from './utils/bus'
import VirtualList from './components/VirtualList.vue';

const store = reactive({});
onMounted(() => {
  const events = [
    "scroll-top",
    "viewport-height",
    "heights",
    "page-positions",
    "translate-y",
    "page-start-index",
    "start-index",
    "end-index",
    "smallest-height",
    "largest-height",
    "root-height",
    "row-positions",
    "visible-items"
  ];
  for (let event of events) {
    bus.on(event, (value) => {
      store[event] = value;
    });
  }
})
onUnmounted(() => {
  bus.all.clear();
})
</script>

<template>
  <h1 class="title">
    Vue.js Virtual + Infinite Scroll + Dynamic Row Heights + Arrow Key Navigation + No Libraries
  </h1>
  <p class="subtitle">
    No hardcoding of heights necessary for each row. Set emitEnabled to false
    for max performance. Tested with <span id="large_num">50000</span> items...
  </p>
  <div id="list_detail">
    <div id="list">
      <virtual-list :overscan="5" />
    </div>
    <div id="detail">
      <table>
        <tbody>
          <tr>
            <th class="caption">Root Container Height</th>
            <td>{{store['root-height']}} px</td>
          </tr>
          <tr>
            <th class="caption">Viewport Height</th>
            <td>{{store['viewport-height']}} px</td>
          </tr>
          <tr>
            <th class="caption">Smallest Row Height</th>
            <td>{{store['smallest-height']}} px</td>
          </tr>
          <tr>
            <th class="caption">Largest Row Height</th>
            <td>{{store['largest-height']}} px</td>
          </tr>
          <tr>
            <th class="caption">Scroll Top</th>
            <td>{{store['scroll-top']}} px</td>
          </tr>
          <tr>
            <th class="caption">Page Index</th>
            <td>{{store['page-start-index']}}</td>
          </tr>
          <tr>
            <th class="caption">Start Index</th>
            <td>{{store['start-index']}}</td>
          </tr>
          <tr>
            <th class="caption">End Index</th>
            <td>{{store['end-index']}}</td>
          </tr>
          <tr>
            <th class="caption">Translate Y</th>
            <td>{{store['translate-y']}} px</td>
          </tr>
        </tbody>
      </table>
      <p><b>Visible Item Indices on DOM</b> {{store['visible-items']}}</p>
      <p><b>Total Height Till Current Page</b> {{store['page-positions']}}</p>
      <p>
        <b>Row's Vertical Displacement From Viewport Top</b>
        {{store['row-positions']}}
      </p>
      <p><b>Heights</b> {{store['heights']}}</p>
    </div>
  </div>
</template>

<style scoped>
#list_detail {
  display: flex;
  height: 70%;
}

#list {
  flex: 2;
  height: 100%;
}

#detail {
  flex: 1;
  padding: 1rem;
  overflow: auto;
  height: 100%;
}

.title {
  color: white;
  text-align: center;
}

.subtitle {
  color: orange;
  text-align: center;
}

table {
  width: 100%;
  table-layout: fixed;
  text-align: center;
}

th.caption {
  text-align: left;
  color: #00BEF4;
  font-weight: 100;
  padding: 0.5rem 0;
}

td {
  text-align: left;
}

b{
  font-weight: 100;
  color: #00BEF4;
}

#large_num {
  color: red;
}
</style>
