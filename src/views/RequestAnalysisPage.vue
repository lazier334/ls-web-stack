<template>
    <div class="request-analysis-page">
        <n-space vertical size="large" style="width: 100%">
            <!-- ===== 请求配置区域 ===== -->
            <n-card title="📤 请求配置" size="small">
                <n-space vertical size="medium">
                    <!-- URL -->
                    <n-input v-model:value="request.url" placeholder="请输入请求 URL (支持 http / https)" size="medium"
                        style="width: 100%">
                        <template #prefix>
                            <n-icon>
                                <LinkIcon />
                            </n-icon>
                        </template>
                    </n-input>

                    <!-- 请求方法 -->
                    <n-select v-model:value="request.method" :options="methodOptions" placeholder="选择 HTTP 方法"
                        size="medium" style="width: 200px" />

                    <!-- 请求头 -->
                    <div>
                        <h4>📋 请求头 (Headers)</h4>
                        <n-dynamic-tags v-model:value="request.headers" :tag-input-props="{ size: 'small' }"
                            :on-create="handleHeaderCreate"
                            placeholder="输入 key:value 后按回车，如：Content-Type:application/json" />
                    </div>

                    <!-- 请求体 -->
                    <div>
                        <h4>📦 请求体 (Body)</h4>
                        <n-input v-model:value="request.body" type="textarea"
                            placeholder='输入 JSON 或文本，如：{"name": "test"}' size="medium"
                            style="width: 100%; min-height: 100px" />
                    </div>

                    <!-- 发送请求按钮 -->
                    <n-button type="primary" size="medium" @click="sendRequest" :loading="loading" block>
                        🚀 发送请求
                    </n-button>
                </n-space>
            </n-card>

            <!-- ===== 响应展示区域 ===== -->
            <n-card title="📥 响应结果" size="small">
                <div v-if="response.status === null">
                    <n-empty description="暂无响应数据，请先发送请求" />
                </div>
                <div v-else>
                    <!-- 响应状态 -->
                    <n-alert :type="getStatusCodeType(response.status)" title="响应状态" :closable="false">
                        状态码: {{ response.status }} {{ getStatusCodeText(response.status) }}<br />
                        时间: {{ response.time }}ms
                    </n-alert>

                    <!-- 专属信息 -->
                    <div style="margin-top: 16px">
                        <h4>📋 栈源信息 (Response Stack)</h4>
                        <div style="margin-top: 8px">
                            <n-alert title="文件源路径 (ls-file-from)" :type="success">
                                <n-input :value="formatResponseHeader(response?.headers?.['ls-file-from'])" type="text"
                                    size="medium" />
                            </n-alert>
                        </div>
                        <div style="margin-top: 8px">
                            <n-alert title="响应堆栈 (ls-set-stack)" type="default">
                                <div>精简模式 <n-switch v-model:value="simpleLsSetStack" /></div>
                                <pre style="overflow: auto">{{
                                    formatResponseHeaderWithLsSetStack(response?.headers?.['ls-set-stack']) }}
                    </pre>
                            </n-alert>
                        </div>
                    </div>


                    <!-- 响应头 -->
                    <div style="margin-top: 16px">
                        <h4>📋 响应头 (Response Headers)</h4>
                        <n-dynamic-tags :value="formatHeadersForDisplay(response.headers)" :read-only="true"
                            tag-props="{ size: 'small' }" />
                    </div>

                    <!-- 响应体 -->
                    <div style="margin-top: 16px">
                        <h4>📦 响应体 (Response Body)</h4>
                        <n-input :value="formatResponseBody(response.body)" type="textarea" size="medium"
                            style="width: 100%; min-height: 200px" readonly />
                    </div>
                </div>
            </n-card>
        </n-space>
    </div>
</template>

<script>
import { ref } from 'vue';
import {
    NCard,
    NInput,
    NSelect,
    NButton,
    NSpace,
    NAlert,
    NDynamicTags,
    NEmpty,
    NIcon,
} from 'naive-ui';
import { Link as LinkIcon } from '@vicons/ionicons5';

export default {
    name: 'RequestAnalysisPage',
    components: {
        NCard,
        NInput,
        NSelect,
        NButton,
        NSpace,
        NAlert,
        NDynamicTags,
        NEmpty,
        NIcon,
        LinkIcon,
    },
    props: {
        analysisData: {
            type: Object,       // 假设你还要传递一个对象
            default: () => ({}), // 默认值为空对象
        },
    },
    setup(props) {
        // 请求相关
        const requestOrg = props?.analysisData || {
            url: '',
            method: 'GET',
            headers: [], // 格式：["Content-Type:application/json", "Authorization:Bearer xxx"]
            body: '',
        };
        const request = ref(requestOrg);

        const response = ref({
            status: null,     // 状态码，如 200
            body: '',         // 响应体
            headers: {},      // 响应头对象
            time: 0,          // 请求耗时（毫秒）
        });

        const loading = ref(false);

        // HTTP 方法选项
        const methodOptions = [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' },
        ];

        // 发送请求
        const sendRequest = async () => {
            if (!request.value.url) {
                window.alert('请输入 URL');
                return;
            }

            loading.value = true;
            const startTime = Date.now();

            try {
                // 构造 headers 对象
                const headers = {};
                request.value.headers.forEach((h) => {
                    const [key, value] = h.split(':').map((s) => s.trim());
                    if (key && value) {
                        headers[key] = value;
                    }
                });

                // 构造 fetch options
                const options = {
                    method: request.value.method,
                    headers,
                };

                // 如果不是 GET，且有请求体，则添加 body
                if (request.value.method !== 'GET' && request.value.body) {
                    try {
                        // 尝试解析为 JSON（如果用户输入的是 JSON）
                        let body = eval(`(${request.value.body})`);
                        if (typeof body != 'object' || body == null) throw new Error('数据不是object类型或者为null');
                        options.body = JSON.stringify(body);
                        options.headers['Content-Type'] = 'application/json';
                    } catch (e) {
                        // 否则直接作为文本发送
                        options.body = request.value.body;
                        console.log('计算参数失败', e)
                    }
                }

                const res = await fetch(request.value.url, options);
                const resBody = await res.text(); // 读取原始响应体
                const resHeaders = {};
                res.headers.forEach((value, key) => {
                    resHeaders[key] = value;
                });

                response.value = {
                    status: res.status,
                    body: resBody,
                    headers: resHeaders,
                    time: Date.now() - startTime,
                };
            } catch (error) {
                response.value = {
                    status: null,
                    body: `请求失败: ${error.message}`,
                    headers: {},
                    time: 0,
                };
            } finally {
                loading.value = false;
            }
        };

        // 格式化请求头显示（用于 DynamicTags 只读展示）
        const formatHeadersForDisplay = (headers) => {
            return Object.entries(headers).map(([k, v]) => `${k}:${v}`);
        };

        // 格式化响应体显示（简单处理，可扩展为 JSON 高亮等）
        const formatResponseBody = (body) => {
            return body || '(空响应)';
        };

        // 格式化响应头，会尝试 decodeURI 解码
        const formatResponseHeader = (body) => {
            let re = body || '(无)';
            return decodeURI(re);
        };

        const simpleLsSetStack = ref(true);
        const deleteKeyword = [
            'Error: Stack Information',
            'at Object.set [as body]',
            'at Object.body',
            'at dispatch',
            '/node_modules/',
            'at process.processTicksAndRejections',
        ];
        // 格式化响应头的 ls-set-stack 字段
        const formatResponseHeaderWithLsSetStack = (stackBody) => {
            let re = formatResponseHeader(stackBody);
            try {
                re = JSON.parse(re).join('\n\n')
            } catch (err) {
                console.error('对象转换失败', err)
            }
            if (simpleLsSetStack.value) {
                re = re.split('\n').filter(str => !deleteKeyword.some(word => str.includes(word))).join('\n')
            }
            return re;
        };

        // 获取状态码类型（用于 Alert 组件颜色）
        const getStatusCodeType = (status) => {
            if (status >= 200 && status < 300) return 'success';
            if (status >= 400 && status < 500) return 'warning';
            if (status >= 500) return 'error';
            return 'info';
        };

        // 获取状态码文本描述
        const getStatusCodeText = (status) => {
            const map = {
                200: 'OK',
                201: 'Created',
                204: 'No Content',
                400: 'Bad Request',
                401: 'Unauthorized',
                403: 'Forbidden',
                404: 'Not Found',
                500: 'Internal Server Error',
            };
            return map[status] || 'Unknown';
        };

        // 处理用户输入的 header（key:value）
        const handleHeaderCreate = (tag) => {
            // 可以做校验，这里直接返回 tag
            return tag;
        };

        return {
            request,
            response,
            loading,
            methodOptions,
            sendRequest,
            formatHeadersForDisplay,
            formatResponseBody,
            formatResponseHeader,
            formatResponseHeaderWithLsSetStack,
            getStatusCodeType,
            getStatusCodeText,
            handleHeaderCreate,
            simpleLsSetStack
        };
    },
};
</script>

<style scoped>
.request-analysis-page {
    padding: 16px;
}
</style>