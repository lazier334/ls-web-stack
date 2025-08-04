<template>
  <div class="table-container">
    <!-- 使用标签页切换两个页面 -->
    <n-tabs v-model:value="activeTab">
      <!-- 标签1：数据列表 -->
      <n-tab-pane name="list" tab="数据列表">
        <!-- 操作按钮区域 -->
        <div class="table-actions">
          <n-button type="primary" @click="fetchData" icon-placement="left" style="margin-left:0">
            刷新数据 ({{ data.length }})
          </n-button>

          <n-button type="primary" strong secondary @click="scrollToBottom" icon-placement="left">
            前往底部
          </n-button>
        </div>
        <n-data-table :columns="columns" :data="data" :pagination="pagination" :bordered="false" :loading="loading" />
      </n-tab-pane>

      <!-- 标签2：请求分析页面 -->
      <n-tab-pane name="analysis" tab="请求分析">
        <!-- 这里放你的“请求分析”内容组件 -->
        <div style="width: 90vw;">
          <RequestAnalysisPage :analysisData="analysisData"></RequestAnalysisPage>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script>
import { NButton, useMessage, NTag } from "naive-ui";
import { defineComponent, h, ref, computed, onMounted } from "vue";
import RequestAnalysisPage from './RequestAnalysisPage.vue'; // 你要创建的分析页面组件

// 创建表格列定义
function createColumns({ play }) {
  return [
    {
      title: "No",
      key: "no",
      width: 50,
      fixed: "left",
      render(row, index) {
        return index + 1;
      }
    },
    {
      title: "名称 (Name)",
      key: "name",
      width: 100,
    },
    {
      title: "路径 (Path)",
      key: "path",
      width: 150,
      render(row) {
        let pathValue = row.path;
        let color = '#3b82f6';
        // 如果以 "reg:" 开头，则删除这4个字符
        if (pathValue && pathValue.startsWith('reg:')) {
          pathValue = pathValue.substring(4);
          color = '#ef4444';
        }

        return h(
          'span',
          { style: { color } },
          pathValue
        );
      }
    },
    {
      title: "正则表达式 (Regexp)",
      key: "regexp",
      width: 200,
      ellipsis: {
        tooltip: true
      },
      render(row) {
        let regexpValue = row.regexp;
        // 如果以 "reg:" 开头，则删除这4个字符
        if (regexpValue && regexpValue.startsWith('reg:')) {
          regexpValue = regexpValue.substring(4);
        }
        return regexpValue;
      }
    },
    {
      title: "备注 (Remark)",
      key: "remark",
      width: 150,
      ellipsis: {
        tooltip: true
      }
    },
    {
      title: "HTTP方法 (Method)",
      key: "methods",
      width: 200,
      render(row) {
        const methods = row.methods;

        // 渲染所有 NTag 标签
        const tags = methods.map(method =>
          h(
            NTag,
            {
              size: 'small',
              style: { marginRight: '6px', marginBottom: '4px' },
              type: 'info',
              bordered: false
            },
            { default: () => method }
          )
        );

        // 创建一个 ref 用于引用内容容器 DOM 元素
        const contentRef = ref(null);

        // 定义点击切换函数
        const toggleClass = (event) => {
          if (!contentRef.value) return;

          const el = contentRef.value;
          const hasExpanded = el.classList.contains('expanded');

          // 先清除所有相关 class
          el.classList.remove('collapsed', 'expanded');

          // 根据当前状态切换 class
          if (hasExpanded) {
            el.classList.add('collapsed');
            if (event?.currentTarget?.innerText != undefined) event.currentTarget.innerText = '展开';
          } else {
            el.classList.add('expanded');
            if (event?.currentTarget?.innerText != undefined) event.currentTarget.innerText = '收起';
          }
        };

        // 初始按钮文字
        const getButtonText = () => {
          if (!contentRef.value) return '展开';
          const el = contentRef.value;
          return el.classList.contains('expanded') ? '收起' : '展开';
        };

        return h('div', {}, [
          // 内容容器 div，绑定 ref 和动态 class
          h('div', {
            ref: contentRef,
            class: 'http-methods collapsed' // 基础 class
          }, tags),

          // 按钮：点击触发 toggleClass，文字根据当前 class 决定
          h(
            NButton,
            {
              size: 'tiny',
              tertiary: true,
              onClick: toggleClass,
              style: {
                outline: 'none',         // 去掉焦点轮廓线
                boxShadow: 'none',       // 去掉点击时的阴影
              }
            },
            {
              default: () => getButtonText()
            }
          )
        ]);
      }
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      fixed: "right",
      render(row) {
        return h(
          NButton,
          {
            strong: true,
            tertiary: true,
            size: "small",
            onClick: () => play ? play(row) : null
          },
          { default: () => "分析" }
        );
      }
    }
  ];
}

export default defineComponent({
  components: {
    RequestAnalysisPage,
  },
  setup() {
    const message = useMessage();

    // 状态管理
    /** @type {[{"name":null,"path":"/demo","regexp":"reg:/^\\/demo[\\/#\\?]?$/i","opts":{"end":true,"name":null,"sensitive":false,"strict":false,"prefix":""},"paramNames":[],"methods":["HEAD","ACL","BIND","CHECKOUT","CONNECT","COPY","DELETE","GET","HEAD","LINK","LOCK","M-SEARCH","MERGE","MKACTIVITY","MKCALENDAR","MKCOL","MOVE","NOTIFY","OPTIONS","PATCH","POST","PROPFIND","PROPPATCH","PURGE","PUT","QUERY","REBIND","REPORT","SEARCH","SOURCE","SUBSCRIBE","TRACE","UNBIND","UNLINK","UNLOCK","UNSUBSCRIBE"],"remark":"动态路由"}]} */
    const data = ref([]); // 全部数据
    const loading = ref(false); // 加载状态
    const analysisData = ref({
      url: '',
      method: 'GET',
      headers: [], // 格式：["Content-Type:application/json", "Authorization:Bearer xxx"]
      body: '',
    });

    // 分页配置
    const paginationReactive = ref({
      page: 1,
      pageSize: 10,
      showSizePicker: true,
      pageSizes: [10, 30, 50, 100, 300, 500, 1000, 5000, 10000, 300000, 1000000],
      onChange: (page) => {
        paginationReactive.value.page = page
      },
      onUpdatePageSize: (pageSize) => {
        if (pageSize != undefined) paginationReactive.value.pageSize = pageSize;
        paginationReactive.value.page = 1
      }
    });

    // 默认选中 "数据列表" 标签
    const activeTab = ref('list');

    // 从API获取数据
    const fetchData = async () => {
      try {
        loading.value = true;
        // 调用API接口
        const response = await fetch('/system/getAllRouter');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        data.value = result.data;
        message.success('数据加载成功');
        paginationReactive.value.onUpdatePageSize();
      } catch (error) {
        console.error('获取数据失败:', error);
        message.error('数据加载失败，请重试');
      } finally {
        loading.value = false;
      }
    };

    // 播放操作
    const play = (row) => {
      analysisData.value.url = row.path;
      message.info(`已选择 ${row.path}`);
      activeTab.value = 'analysis';
    };

    // 组件挂载时获取数据
    onMounted(() => {
      fetchData();
    });

    const scrollToBottom = () => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth' // 平滑滚动，可去掉
      });
    };

    return {
      data,
      columns: createColumns({ play }),
      pagination: paginationReactive,
      loading,
      fetchData,
      scrollToBottom,
      activeTab,
      analysisData
    };
  }
});

</script>

<style scoped>
.table-container {
  padding: 16px;
}

.table-actions {
  margin-bottom: 16px;
  text-align: left;
}

.table-actions>* {
  margin-left: 16px;
}

.n-tabs-nav--bar-type.n-tabs-nav--top.n-tabs-nav {
  position: sticky;
  top: 0;
}
</style>

<style>
/* 默认：只显示一行，超出隐藏 */
.http-methods.collapsed {
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  flex-wrap: nowrap;
  /* 可选：限制为单行标签的大致高度 */
  height: 24px;
}

/* 展开状态：允许换行，显示全部 */
.http-methods.expanded {
  white-space: normal;
  overflow: visible;
  display: flex;
  flex-wrap: wrap;
}

.http-methods>.n-tag {
  font-size: 60%;
}
</style>
