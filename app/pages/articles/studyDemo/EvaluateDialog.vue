<template>
  <Dialog :show="show" :width="curConfig.width" :config="curConfig" @closeDialog="closeDialog">
    <div class="output-container">
      <!-- think 部分 -->
      <div class="think-box">
        <!-- 当还处于思考阶段时显示 loading 图标和计时信息 -->
        <div class="loading-indicator">
          <i v-if="isThinking" class="el-icon-loading"></i>
          <i v-else class="el-icon-circle-check"></i>
          {{ isThinking ? '正在' : '已' }}深度思考 （用时 {{ elapsedSeconds }} 秒）
        </div>
        <!-- 当 think 部分输出完成后显示最终内容 -->
        <div v-html="thinkContent"></div>
      </div>
      <!-- markdown 部分 -->
      <div class="markdown-box" v-html="markdownHtml"></div>
    </div>
  </Dialog>
</template>

<script>
import Dialog from '@/components/Dialog/index.vue';
import { getCommonList } from '@/api/common';
import config from '@/utils/config';
import { marked } from 'marked';

export default {
  name: 'StreamingDialog',
  components: { Dialog },
  props: {
    saveApi: {
      type: Function,
      default: () => { }
    },
    config: {
      type: Object,
      default: () => { }
    },
    title: {
      type: String,
      default: '人才评价'
    }
  },
  data() {
    return {
      show: false,
      queryString: '',
      loading: false,
      summaryType: null,
      // 存储接收到的流数据（原始文本，可能包含 <think> 标签）
      streamContent: '',
      // 输出队列（用于打字机效果）
      outputQueue: '',
      outputInterval: null,
      outputSpeed: 20,
      // 计时相关
      thinkStartTime: null,
      elapsedSeconds: 0,
      thinkTimer: null
    };
  },
  computed: {
    // 拆分 streamContent 为 think 部分和 markdown 部分
    parsedContent() {
      if (this.streamContent.includes('<think>')) {
        if (this.streamContent.includes('</think>')) {
          const thinkMatch = this.streamContent.match(/<think>([\s\S]*?)<\/think>/);
          const thinkText = thinkMatch ? thinkMatch[1].trim() : '';
          const markdownPart = this.streamContent.replace(/<think>[\s\S]*?<\/think>/, '');
          return { think: marked(thinkText), markdown: marked(markdownPart) };
        } else {
          // 只检测到 <think>，未检测到 </think>
          const thinkMatch = this.streamContent.match(/<think>([\s\S]*)/);
          const thinkText = thinkMatch ? thinkMatch[1].trim() : '';
          return { think: marked(thinkText), markdown: '' };
        }
      } else {
        return { think: '', markdown: marked(this.streamContent) };
      }
    },
    thinkContent() {
      return this.parsedContent.think;
    },
    markdownHtml() {
      return this.parsedContent.markdown;
    },
    curConfig() {
      return {
        title: this.title || '价值评价',
        isShowCancel: false,
        isShowConfirm: false,
        cancelText: '取消',
        confirmText: '添加',
        width: '1000px',
        ...this.config
      };
    },
    // 当 streamContent 包含 <think> 但不包含 </think> 时，认为处于思考阶段
    isThinking() {
      return this.streamContent.includes('<think>') && !this.streamContent.includes('</think>');
    }
  },
  methods: {
    startThinkTimer() {
      // 如果计时器还未启动，则启动它
      if (!this.thinkStartTime) {
        this.thinkStartTime = Date.now();
      }
      if (!this.thinkTimer) {
        this.thinkTimer = setInterval(() => {
          // 更新 elapsedSeconds 显示当前思考时长
          this.elapsedSeconds = Math.floor((Date.now() - this.thinkStartTime) / 1000);
        }, 1000);
      }
    },
    stopThinkTimer() {
      if (this.thinkTimer) {
        clearInterval(this.thinkTimer);
        this.thinkTimer = null;
      }
    },
    async getSummaryType() {
      const res = await getCommonList('gtpSummaryType');
      this.summaryType = new Map(res.map(item => [item.description, item.name]));
      console.log('summaryType', this.summaryType);
    },
    async getData() {
      this.loading = true;
      console.log('获取数据');
      // 清空数据和计时状态
      this.streamContent = '';
      this.outputQueue = '';
      this.thinkStartTime = null;
      this.elapsedSeconds = 0;
      this.stopThinkTimer();

      // 假设 saveApi 返回正确的接口地址
      const endpoint = await this.saveApi({});
      console.log('接口地址', endpoint);
      let tokenKey = config.tokenKey;

      // 定时器：匀速输出 outputQueue 中的字符到 streamContent
      const startOutputTimer = () => {
        if (this.outputInterval) return;
        this.outputInterval = setInterval(() => {
          if (this.outputQueue.length > 0) {
            const char = this.outputQueue.charAt(0);
            this.outputQueue = this.outputQueue.slice(1);
            this.streamContent += char;
          }
        }, this.outputSpeed);
      };

      fetch('/api/information/gpt/summary/content/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": localStorage.getItem(tokenKey)
        },
        body: JSON.stringify({
          content: this.queryString,
          summaryType: this.summaryType.get(this.title)
        }),
        credentials: 'include'
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('网络响应错误');
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = ''; // 缓存未完整的 SSE 数据

          const read = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                if (buffer.trim()) {
                  processBuffer(buffer);
                }
                console.log('数据流读取完毕');
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const parts = buffer.split('\n\n');
              for (let i = 0; i < parts.length - 1; i++) {
                processBuffer(parts[i]);
              }
              buffer = parts[parts.length - 1];
              read();
            }).catch(err => {
              console.error('读取数据出错:', err);
            });
          };

          const processBuffer = (text) => {
            const eventStr = text.trim();
            if (!eventStr) return;
            let dataStr = '';
            const lines = eventStr.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataStr += line.replace(/^data:\s*/, '');
              }
            }
            try {
              const jsonData = JSON.parse(dataStr);
              if (
                jsonData.choices &&
                jsonData.choices.length > 0 &&
                jsonData.choices[0].delta &&
                jsonData.choices[0].delta.content
              ) {
                const content = jsonData.choices[0].delta.content;
                console.log('收到 SSE 数据：', content);
                // 将接收到的内容加入输出队列
                this.outputQueue += content;
                // 如果还未启动计时，则启动
                if (!this.thinkStartTime) {
                  this.startThinkTimer();
                }
                startOutputTimer();
                // 如果检测到输出中包含 </think>，认为 think 部分已完成，立即停止计时
                if (this.streamContent.includes('</think>')) {
                  this.stopThinkTimer();
                }
              }
            } catch (e) {
              console.error('JSON 解析错误:', e, dataStr);
            }
          };

          read();
        })
        .catch(error => {
          console.error('Fetch 请求出错:', error);
        })
        .finally(() => {
          this.loading = false;
          // 可选：当流数据结束时，停止计时
          this.stopThinkTimer();
        });
    },
    open(queryString) {
      this.streamContent = '';
      this.show = true;
      console.log('打开');
      this.queryString = queryString;

      this.getData();
    },
    closeDialog() {
      this.show = false;
      if (this.outputInterval) {
        clearInterval(this.outputInterval);
        this.outputInterval = null;
      }
      this.stopThinkTimer();
    }
  },
  created() {
    this.getSummaryType();
  }
};
</script>

<style scoped lang="scss">
.output-container {
  padding: 20px;
  max-height: 600px;
  overflow: auto;
}

.think-box {
  padding: 10px;
  background-color: #f9f9f9;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #909399;
    font-size: 14px;
    margin-bottom: 10px;
  }
}

.el-icon-circle-check {
  color: #4fd29d;
}

.markdown-box {


  padding: 10px;
  border-radius: 4px;

  :deep(*)  {
    margin-bottom: 8px;
  }

  :deep(hr) {
    visibility: hidden;
  }
}
</style>
