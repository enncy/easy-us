# easy-us API 文档与开发规范

> `easy-us` (easy user-script framework) 是一个浏览器用户脚本框架库，统一管理脚本的 **创建、UI 显示、数据联动、数据交互**。
> 当前版本：0.0.66 | 入口：[src/index.ts](src/index.ts)

---

## 目录

1. [快速开始](#1-快速开始)
2. [核心概念](#2-核心概念)
3. [API 参考](#3-api-参考)
   - 3.1 [start 启动函数](#31-start-启动函数)
   - 3.2 [Script 脚本](#32-script-脚本)
   - 3.3 [Project 工程](#33-project-工程)
   - 3.4 [Config 配置项](#34-config-配置项)
   - 3.5 [StoreProvider 存储器](#35-storeprovider-存储器)
   - 3.6 [CorsEventEmitter 跨域通信](#36-corseventemitter-跨域通信)
   - 3.7 [UI 工具 $ui](#37-ui-工具-ui)
   - 3.8 [DOM 工具](#38-dom-工具)
   - 3.9 [通用工具 $](#39-通用工具-)
   - 3.10 [油猴工具 $gm](#310-油猴工具-gm)
   - 3.11 [弹窗 / 消息 / 菜单](#311-弹窗--消息--菜单)
   - 3.12 [自定义元素](#312-自定义元素)
4. [事件系统](#4-事件系统)
5. [开发规范](#5-开发规范)
6. [构建与发布](#6-构建与发布)

---

## 1. 快速开始

```ts
import EUS from 'easy-us';
// 或按需导入
import { start, Script, Project, createRenderScript } from 'easy-us';

// 1. 定义脚本
const demoScript = new Script({
    name: '示例脚本',
    namespace: 'demo',
    matches: [['所有页面', /.*/]],
    configs: {
        notes: { defaultValue: '这是一个示例脚本' },
        count: {
            label: '执行次数',
            defaultValue: 3,
            attrs: { type: 'number', min: 0, max: 10 },
        },
    },
    onactive() {
        console.log('脚本已激活，当前次数：', this.cfg.count);
    },
    oncomplete() {
        console.log('页面加载完成');
    },
});

// 2. 定义工程
const project = Project.create({
    name: '示例工程',
    scripts: { demo: demoScript },
});

// 3. 启动（需要渲染 UI 时提供 renderConfig）
start({
    projects: [project],
    renderConfig: {
        renderScript: createRenderScript(),
        title: '我的脚本面板',
        styles: [],
        defaultPanelName: 'demo',
    },
});
```

---

## 2. 核心概念

| 概念 | 说明 |
|------|------|
| **Script** | 一个用户脚本单元，包含匹配规则、配置、生命周期钩子、暴露方法 |
| **Project** | 工程容器，聚合多个 Script，可限定域名 |
| **Config** | 脚本配置项声明，自动生成表单并双向绑定到存储 |
| **StoreProvider** | 存储抽象层，油猴环境用 `GMStoreProvider`，否则用 `MemoryStoreProvider` |
| **CustomWindow** | 悬浮窗 UI 容器（Shadow DOM），由 `renderScript` 驱动 |
| **CorsEventEmitter** | 跨域 / 跨 iframe 事件通讯，基于存储层的变更监听实现 |

### 运行时环境

- **油猴 / 脚本猫环境**：`typeof unsafeWindow !== 'undefined'` → 使用 `GMStoreProvider`，支持跨 tab 通信、持久化。
- **普通浏览器环境**：使用 `MemoryStoreProvider`，数据仅在内存中，跨 tab 通信不可用（见 [detect.md M1](detect.md)）。

### 生命周期

```
start()
  ├─ 解析匹配的 scripts（按 priority 降序）
  ├─ emit('start') + onstart          // 立即执行
  ├─ 分配 TAB_UID / 记录 TAB_URLS
  ├─ readyState: interactive
  │     └─ mount() + onactive
  ├─ readyState: complete
  │     └─ onactive (若未执行) + oncomplete
  ├─ hashchange      → onhashchange
  ├─ pushState/replaceState → onhistorychange / onhistorychanged
  └─ beforeunload    → onbeforeunload (返回 true 阻止离开)
```

---

## 3. API 参考

### 3.1 start 启动函数

**位置**：[src/utils/start.ts:36](src/utils/start.ts#L36)

```ts
async function start(startConfig: StartConfig): Promise<void>
```

**StartConfig**

| 字段 | 类型 | 说明 |
|------|------|------|
| `projects` | `Project[]` | 工程列表 |
| `mountElement?` | `HTMLElement \| Element` | 悬浮窗挂载点，默认 `document.body` |
| `renderConfig?` | `{ renderScript, title, styles, defaultPanelName }` | UI 渲染配置；省略则不渲染 UI |
| `onRender?` | `() => CustomWindow` | 自定义窗口创建 |

`renderConfig.renderScript` 通常由 [`createRenderScript()`](src/render/render.ts#L9) 创建，负责窗口自身设置（位置、字体、显隐等）。

---

### 3.2 Script 脚本

**位置**：[src/interfaces/script.ts:92](src/interfaces/script.ts#L92)

```ts
class Script<C extends ScriptConfigs, M extends ScriptMethods = ScriptMethods>
```

#### 构造参数 ScriptOptions

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 脚本名 |
| `namespace?` | `string` | 命名空间，避免 config 重名 |
| `matches` | `(string \| RegExp)[] \| [string, string\|RegExp][]` | 匹配链接 |
| `excludes?` | 同上 | 排除链接 |
| `configs?` | `ScriptConfigsProvider<C>` | 配置项对象或工厂函数 |
| `hideInPanel?` | `boolean` | 后台脚本，不显示面板 |
| `priority?` | `number` | 运行优先级，默认 0，大者优先 |
| `notes?` | `string[]` | 脚本提示（已弃用，建议用 `configs.notes`） |

#### 生命周期钩子

| 钩子 | 触发时机 |
|------|----------|
| `onstart` | 脚本加载时立即 |
| `onactive` | 页面初始化完成（元素可访问） |
| `oncomplete` | 页面完全加载 |
| `onhashchange` | 路由 hash 变化 |
| `onhistorychange` | history push/replace 时 |
| `onhistorychanged` | push/replace 完成后用新 URL 重新匹配 |
| `onrender` | 面板渲染时（切换面板会重复触发） |
| `onbeforeunload` | 页面离开，返回 `true` 阻止 |
| `onerror` | 脚本错误 |

> ⚠️ 注意：`onhashchange` 目前无法通过构造参数传入（见 [detect.md D3](detect.md)），需用 `script.on('hashchange', fn)`。

#### 实例成员

| 成员 | 类型 | 说明 |
|------|------|------|
| `cfg` | `Proxy` | 响应式配置对象，读写自动同步到存储 |
| `configs` | `C` | 已解析的配置声明 |
| `panel` | `ScriptPanelElement` | 面板元素（初始化后） |
| `header` | `HeaderElement` | 头部元素 |
| `methods` | `M` | 暴露给外部调用的方法 |
| `event` | `EventEmitter` | 自定义事件触发器（避免与生命周期事件冲突） |
| `priority` | `number` | 优先级 |

#### 方法

```ts
// 监听配置变化
script.onConfigChange('count', (curr, pre, remote) => { ... });
// 注销监听
script.offConfigChange(listener);
// 全路径名
script.fullName(); // => "projectName-name"
```

`methods` 工厂示例：

```ts
new Script({
    methods() {
        return {
            greet: (name: string) => `hello ${name}`,
        };
    },
});
// 外部调用：script.methods.greet('world')
```

> ⚠️ `methods` 当前未被错误包装捕获（见 [detect.md D4](detect.md)），调用方需自行 try/catch。

---

### 3.3 Project 工程

**位置**：[src/interfaces/project.ts:12](src/interfaces/project.ts#L12)

```ts
class Project<T extends Record<string, Script>>
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 工程名 |
| `domains?` | `string[]` | 限定域名，空则不限 |
| `scripts` | `T` | 脚本字典 |

```ts
Project.create({ name, domains, scripts });  // 工厂方法
```

构造时会自动为每个脚本设置 `projectName`。

---

### 3.4 Config 配置项

**位置**：[src/interfaces/config.ts:4](src/interfaces/config.ts#L4)

```ts
interface Config<T extends keyof ConfigTagMap = 'input', V = any>
```

`ConfigTagMap` 映射：`input → HTMLInputElement`、`select → HTMLSelectElement`、`textarea → HTMLTextAreaElement`。

| 字段 | 类型 | 说明 |
|------|------|------|
| `defaultValue` | `V` | 默认值（必填） |
| `label?` | `string` | 配置项标签，省略则不渲染到面板 |
| `tag?` | `'input' \| 'select' \| 'textarea'` | 表单类型，默认 `input` |
| `attrs?` | 表单元素属性 | 如 `{ type: 'number', min, max, step }` |
| `options?` | `string[][] \| {label,value,title?}[]` | select 选项 |
| `sync?` | `boolean` | 本地修改后同步回元素 |
| `separator?` | `string` | 在上方插入分隔符 |
| `showIf?` | `string \| [string, (curr,pre,store)=>boolean]` | 条件显隐 |
| `onload?` | `(this, el) => void` | 元素加载回调 |
| `extra?` | `any` | 自定义附加数据 |

示例：

```ts
configs: {
    mode: {
        label: '模式',
        tag: 'select',
        options: [
            { label: '简单', value: 'easy' },
            { label: '困难', value: 'hard', title: '挑战模式' },
        ],
        defaultValue: 'easy',
    },
    auto: {
        label: '自动执行',
        attrs: { type: 'checkbox' },
        defaultValue: false,
        showIf: 'mode',  // 仅当 mode 为真时显示
    },
}
```

#### 特殊配置项 `notes`

```ts
notes: { defaultValue: string }
```

渲染为面板顶部的提示板块，支持 HTML 字符串（可用 `$ui.notes()` 生成结构化提示）。

提示板块支持 **点击头部收缩 / 展开**，默认展开。收缩状态按脚本独立持久化，存储键为 `` `_notes_expanded_${script.fullName()}` ``（通过 `StoreProvider.get/set` 读写）。也可通过 `script.panel.setNotesExpanded(expanded)` / `script.panel.isNotesExpanded()` 编程控制。

#### 响应式读取

`script.cfg.<key>` 是 Proxy，读写自动同步存储：

```ts
script.cfg.count = 5;          // 写入存储 + 触发 change
console.log(script.cfg.count); // 从存储读取
```

---

### 3.5 StoreProvider 存储器

**位置**：[src/interfaces/store.provider.ts:10](src/interfaces/store.provider.ts#L10)

```ts
interface StoreProvider {
    get(key, defaultValue?): any;
    set(key, value): void;
    delete(key): any;
    list(): string[];
    getTab(key): Promise<any>;
    setTab(key, value): Promise<any>;
    addChangeListener(key, listener): number | void;
    removeChangeListener(listener): void;
    addTabChangeListener(key, listener): void | Promise<number>;
    removeTabChangeListener(key, listener): void;
}
```

- **持久存储**（`get/set/delete/list`）：油猴用 `GM_getValue` 等，浏览器用内存对象。
- **Tab 临时存储**（`getTab/setTab`）：油猴用 `GM_getTab/GM_saveTab`，浏览器用内存对象。
- **变更监听**：油猴用 `GM_addValueChangeListener` 实现跨 tab 监听。

内置常量（[src/utils/const.ts](src/utils/const.ts)）：

| 常量 | 值 | 说明 |
|------|----|------|
| `$const.TAB_UID` | `'_uid_'` | 当前 tab 唯一 id |
| `$const.TAB_URLS` | `'_urls_'` | 当前 tab 运行的页面链接列表 |
| `$const.TAB_CURRENT_PANEL_NAME` | `'_current_panel_name_'` | 当前显示的面板名 |

全局实例：`$store`（[src/utils/store.ts](src/utils/store.ts)），按环境自动选择实现。

---

### 3.6 CorsEventEmitter 跨域通信

**位置**：[src/interfaces/cors.ts:9](src/interfaces/cors.ts#L9)

允许跨 iframe / 跨 tab 通讯，基于存储层变更监听实现。

```ts
// 在子 iframe 中发起事件，主窗口处理后返回值
cors.emit('my-event', [arg1, arg2], (returnValue) => {
    console.log('收到返回值', returnValue);
});

// 在主窗口（self === top）监听
cors.on('my-event', async (args) => {
    return await doSomething(...args);  // 返回值传回发起端
});

cors.off('my-event');  // 注销（⚠️ 当前有 Bug，见 detect.md D2）
```

#### defineTopFunction

将一个函数定义为「只能在顶层 window 执行」的函数，子 iframe 调用时会自动通过 cors 转发到顶层执行并返回结果：

```ts
const topAlert = cors.defineTopFunction(async (msg: string) => {
    $modal.alert({ content: msg });
    return msg;
});
// 任意 iframe 中调用：
await topAlert('hello');
```

> ⚠️ 仅在油猴环境可用（见 [detect.md M1](detect.md)）。

---

### 3.7 UI 工具 $ui

**位置**：[src/utils/ui.ts:29](src/utils/ui.ts#L29)

#### `$ui.tooltip(target)`

为元素绑定自定义提示气泡（基于 `title` 属性），兼容移动端。鼠标移动到子元素（如滑块 thumb）不会误隐藏。

#### `$ui.scriptPanel(script, store, opts?)`

为脚本生成面板元素，渲染 notes、配置表单、主体。`opts.onload?(el)` 在元素加载时回调。

#### `$ui.configsArea(configElements)`

创建独立设置区域。

#### `$ui.configs(namespace, store, configs, onload?)`

根据 `configs` 声明批量生成 `ConfigElement`。

#### `$ui.notes(lines, tag?)`

创建多行提示文本，支持字符串 / 元素 / 二维数组：

```ts
$ui.notes([
    '第一行',
    ['第二行-1', '第二行-2'],
], 'ul');
```

#### `$ui.copy(name, value)`

生成复制按钮。

#### `$ui.preventText(opts)`

创建取消默认事件的文字按钮，超时未点击则执行默认事件。

```ts
$ui.preventText({
    name: '撤销',
    delay: 3,
    ondefault: () => doAction(),
    onprevent: () => cancelAction(),
});
```

#### `$ui.space(children, options?)`

将子元素用分隔符隔开，`options: { x?, y?, separator? }`。

#### `$ui.button(text, attrs?, handler?)`

创建 `input[type=button]`。

---

### 3.8 DOM 工具

**位置**：[src/utils/dom.ts](src/utils/dom.ts)

#### `h(element, attrsOrChildren?, childrenOrHandler?)`

创建元素，支持标签名或自定义元素构造函数，多重载：

```ts
h('div', { className: 'x' }, '文本')
h('div', { style: { color: 'red' } }, [child1, child2])
h('div', { className: 'x' }, (el) => { el.onclick = ... })
h(ConfigElement, { tag: 'input' })
```

- `style` 属性会通过 `Object.assign` 合并到 `el.style`。
- 其它属性通过 `Reflect.set` 赋值。
- 子元素数组中可传入自定义元素构造函数，自动转换标签名。

#### `$el<T>(selector, root?)` / `$$el<T>(selector, root?)`

querySelector / querySelectorAll 的类型增强版。

#### `enableElementDraggable(header, target, ondrag?)` / `enableElementTouchDraggable(...)`

使 `target` 可由 `header` 拖动。

---

### 3.9 通用工具 $

**位置**：[src/utils/common.ts:10](src/utils/common.ts#L10)

| 方法 | 说明 |
|------|------|
| `$.createConfigProxy(script)` | 创建响应式配置 Proxy |
| `$.getAllRawConfigs(scripts)` | 获取所有未处理配置 |
| `$.getMatchedScripts(projects, urls)` | 按 URL 匹配脚本 |
| `$.namespaceKey(ns, key)` | 生成命名空间键 `ns.key` |
| `$.uuid()` | 32 位无横杠 uuid |
| `$.random(min, max)` | 随机整数 |
| `$.sleep(ms)` | 延时 |
| `$.isInBrowser()` | 是否浏览器环境 |
| `$.onresize(el, handler)` | 监听窗口 resize，元素被移除时自动解绑 |
| `$.loadCustomElements(elements)` | 注册自定义元素（去重） |
| `$.isInTopWindow()` | 是否顶层 window |
| `$.createCenteredPopupWindow(url, name, opts)` | 创建居中弹窗 |
| `$.waitForElement(selector, opts?)` | 等待元素出现 |
| `$.waitFor(predicate, opts?)` | 等待条件成立 |

`resolveCustomElementName(el, target)`：将类名转为自定义元素标签名（驼峰转短横线）。

---

### 3.10 油猴工具 $gm

**位置**：[src/utils/tampermonkey.ts:12](src/utils/tampermonkey.ts#L12)

| 方法 | 说明 |
|------|------|
| `$gm.unsafeWindow` | 全局 unsafeWindow |
| `$gm.isInGMContext()` | 是否油猴环境（`GM_info` 是否定义） |
| `$gm.getInfos()` | 获取 `GM_info` |
| `$gm.getTab(cb)` | 获取全部 tab 对象 |
| `$gm.notification(content, options?)` | 系统通知 |
| `$gm.getMetadataFromScriptHead(key)` | 解析脚本头部的 `@key` 元数据 |

`notification` options：`extraTitle, onclick, ondone, important, duration(默认30s), silent(默认true)`。

---

### 3.11 弹窗 / 消息 / 菜单

**位置**：[src/render/render.ts](src/render/render.ts)

#### `$modal` 弹窗（替代原生 alert/confirm/prompt）

```ts
$modal.alert({ content: '提示', title: '标题' });
$modal.confirm({ content: '确认？', onConfirm: () => {...} });
$modal.prompt({ content: '输入：', inputDefaultValue: 'x', onConfirm: (val) => {...} });
$modal.simple({ content: '纯内容' });
```

ModalAttrs 关键字段：`content, title, onConfirm(val)=>bool|void, onCancel, onClose(val), maskCloseable(默认true), notification, duration, width, modalInputType('input'|'textarea')`。

非顶层 iframe 调用时自动通过 cors 转发到顶层窗口显示。

#### `$message` 消息提示

```ts
$message.info('内容');
$message.success({ content: '成功', duration: 3 });
$message.warn('警告');
$message.error('错误');
```

#### `$menu(label, config?)`

注册额外菜单栏按钮，`config.scriptPanelLink` 可指定点击后置顶的脚本面板。

#### `createRenderScript(config?)`

创建渲染脚本（窗口设置脚本），提供 `methods: { pin, minimize, setPosition, normal }`，以及 `fontsize / switchPoint / visual` 等配置。

#### `modal(type, attrs, parent?)` 底层函数

直接创建模态框元素，挂载到指定父节点（默认 `$win.container || $elements.root || document.body`）。

---

### 3.12 自定义元素

**位置**：[src/elements/](src/elements/)

所有自定义元素继承 `IElement`（[src/elements/interface.ts](src/elements/interface.ts)），实现标准 `connectedCallback` 等生命周期。

| 元素标签 | 类 | 说明 |
|----------|-----|------|
| `config-element` | `ConfigElement` | 配置表单元素，根据 Config 生成表单 |
| `container-element` | `ContainerElement` | 面板主体（header/body/footer） |
| `header-element` | `HeaderElement` | 头部 |
| `script-panel-element` | `ScriptPanelElement` | 脚本面板（separator/notes/configs/body） |
| `modal-element` | `ModalElement` | 弹窗（type: prompt/alert/confirm/simple） |
| `message-element` | `MessageElement` | 消息条（info/success/warn/error） |
| `dropdown-element` | `DropdownElement` | 下拉框（trigger: hover/click） |

通过 `h('config-element', {...})` 或 `h(ConfigElement, {...})` 创建。元素在 `connectedCallback` 中构建内部结构，**属性需在挂载前设置**。

`definedCustomElements` 数组在 `start` 时由 `$.loadCustomElements` 自动注册。

全局元素引用 `$elements`（[src/utils/elements.ts](src/utils/elements.ts)）：

| 字段 | 说明 |
|------|------|
| `tooltipContainer` | 全局提示气泡容器 |
| `root` | ShadowRoot 根 |
| `wrapper` | 外层面板 wrapper |
| `currentScriptPanel` | 当前显示的脚本面板 |

---

## 4. 事件系统

`easy-us` 有两套事件机制：

### 4.1 生命周期事件（CommonEventEmitter）

`Script` 继承 `CommonEventEmitter<ScriptEvent>`，提供类型安全的 `on / once / emit / off`。

```ts
script.on('complete', () => { ... });
script.emit('render', { panel, header });
```

事件名见 [ScriptEvent](src/interfaces/script.ts#L41)。注意 `script.event`（Node EventEmitter）是独立机制，用于自定义业务事件，避免与生命周期事件名冲突。

### 4.2 配置变更事件

```ts
const id = script.onConfigChange('count', (curr, pre, remote) => { ... });
script.offConfigChange(id);
```

`remote` 表示变更是否来自其它 tab。

### 4.3 跨域事件

见 [3.6 CorsEventEmitter](#36-corseventemitter-跨域通信)。

---

## 5. 开发规范

### 5.1 命名空间

- 每个脚本应提供唯一 `namespace`，避免不同脚本配置项键冲突。
- 配置存储键格式：`namespace.key`（无 namespace 时为 `key`）。

### 5.2 匹配规则

- `matches` / `excludes` 支持字符串（作为正则源）或 `[说明, 正则]` 元组。
- `Project.domains` 限定整组脚本的域名范围。

### 5.3 配置项声明

- 必须提供 `defaultValue`。
- 数值类配置应设置 `attrs: { type:'number', min, max }`（注意 min=0 的已知问题，见 [detect.md D5](detect.md)）。
- 复用 `$ui.notes()` 生成结构化提示，避免直接拼 HTML 字符串。

### 5.4 自定义元素

- 继承 `IElement`，在 `connectedCallback` 中构建 DOM。
- 通过 `definedCustomElements` 注册到 `CustomElementTagMap` 以获得 `h()` 类型支持。
- 标签名由类名自动转换（`HeaderElement` → `header-element`）。

### 5.5 跨域通讯

- 仅在油猴环境可用。
- 事件名全局唯一，建议加工程前缀避免冲突。
- 顶层 window 使用 `cors.on`，子 iframe 使用 `cors.emit` 或 `$modal` / `$message`（已内置转发）。

### 5.6 错误处理

- 脚本钩子（onstart 等）已被 `errorHandler` 包裹，抛错会触发 `scripterror` 事件并 `console.error`。
- 自定义业务代码建议在 `methods` 中显式 try/catch（见 [detect.md D4](detect.md)）。

### 5.7 样式

- 全局样式位于 [assets/css/style.css](assets/css/style.css) 与 [assets/less/style.less](assets/less/style.less)。
- 悬浮窗使用 **closed Shadow DOM**，样式与宿主页面隔离。
- 通过 `renderConfig.styles` 注入额外样式。

### 5.8 提交规范

项目使用 commitizen + cz-conventional-changelog，提交信息遵循 Conventional Commits（`feat:` / `fix:` / `perf:` / `docs:` 等）。

---

## 6. 构建与发布

### 构建

```bash
npm run build   # tsc + vite build + dts-bundle-generator
npm run dev     # vite watch 模式
```

- `tsc` 输出 CommonJS 声明到 `lib/`。
- `vite build` 输出 UMD 包 `dist/index.min.js`（全局名 `EUS`，未压缩以保留类名）。
- `dts-bundle-generator` 合并类型声明到 `dist/index.d.ts`。

### tsconfig 关键配置

- `target: es6` / `module: commonjs` / `strict: true`
- `lib: ['es2020', 'DOM']`

### 发布

```bash
npm run pub   # build + version patch + publish + git push --tags
```

### package.json files

发布包含：`lib`（CJS+类型）、`dist`（UMD）、`assets`（样式）。

### 模块导出

- 默认导出：`EUS` 命名空间（合并 utils/render/elements/interfaces）。
- 命名导出：`start`、`Script`、`Project`、`$ui`、`h`、`$`、`$gm`、`$store`、`$modal`、`$message`、`$menu`、`cors` 等。

---

## 附录：模块结构

```
src/
├── index.ts                  # 入口，默认导出 EUS
├── dts.ts                    # 类型声明打包入口
├── interfaces/               # 核心抽象
│   ├── script.ts             # Script / BaseScript
│   ├── project.ts            # Project
│   ├── config.ts             # Config 声明
│   ├── store.provider.ts     # StoreProvider + GM/Memory 实现
│   ├── cors.ts               # CorsEventEmitter
│   ├── common.ts             # CommonEventEmitter
│   └── custom-window.ts      # CustomWindow + modal()
├── elements/                 # Web Components
│   ├── config.ts             # ConfigElement
│   ├── container.ts          # ContainerElement
│   ├── header.ts             # HeaderElement
│   ├── script.panel.ts       # ScriptPanelElement
│   ├── modal.ts              # ModalElement
│   ├── message.ts            # MessageElement
│   ├── dropdown.ts           # DropdownElement
│   └── interface.ts          # IElement + CustomElementTagMap
├── render/
│   └── render.ts             # createRenderScript / $modal / $message / $menu
└── utils/
    ├── start.ts              # start() 启动函数
    ├── ui.ts                 # $ui 工具集
    ├── dom.ts                # h() / $el / 拖动
    ├── common.ts             # $ 通用工具
    ├── store.ts              # $store 全局实例
    ├── tampermonkey.ts        # $gm 油猴工具
    ├── elements.ts           # $elements 全局元素
    └── const.ts              # $const 常量
```
