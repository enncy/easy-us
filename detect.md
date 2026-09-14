# easy-us 代码审查报告

> 审查范围：`src/` 全量源码（v0.0.66）
> 审查时间：2026-07-03
> 审查维度：正确性 / 健壮性 / 一致性 / 可维护性 / 性能

## 概览

整体架构清晰：以 `Script` / `Project` 为核心模型，`StoreProvider` 抽象存储层（油猴 / 内存双实现），`CustomWindow` + Web Components 负责面板 UI，`CorsEventEmitter` 处理跨域（跨 iframe）通信。类型系统设计较好（`h()` 的多重载、`ConfigTagMap` 映射）。

但在存储层、跨域事件、脚本钩子装配等处存在若干 **确定性 Bug** 与若干健壮性隐患，下面按严重程度分级列出。

---

## 🔴 严重（确定性 Bug）

### D1. `MemoryStoreProvider.removeChangeListener` 操作了错误的 Map
**位置**：[src/interfaces/store.provider.ts:102-110](src/interfaces/store.provider.ts#L102-L110)

`addChangeListener` 将监听器写入 `storeListeners`，但 `removeChangeListener` 遍历的却是 `tabListeners`：

```ts
removeChangeListener(listener: EventListener): void {
    MemoryStoreProvider.tabListeners.forEach((lis, key) => {  // ← 应为 storeListeners
        ...
    });
}
```

**后果**：在非油猴环境（MemoryStoreProvider）下，`script.offConfigChange`、`ConfigElement` 中 `sync` 监听器、`cors` 临时监听器等 **永远无法被移除**，造成内存泄漏与重复触发。

**修复**：遍历 `storeListeners`，或统一与 `GMStoreProvider` 一样按返回的 id 移除。

---

### D2. `CorsEventEmitter.off` 的 key 拼接与 `on` 不一致，导致永久失效
**位置**：[src/interfaces/cors.ts:126-133](src/interfaces/cors.ts#L126-L133)

`on` 中存入 `eventMap` 的 key 是 `uid + '.' + this.eventKey(name)`，而 `off` 查找时只用了 `this.eventKey(name)`：

```ts
on(name, handler) {
    const key = uid + '.' + this.eventKey(name);   // 带 uid 前缀
    this.eventMap.set(key, id);
}
off(name) {
    const key = this.eventKey(name);                // ← 缺少 uid 前缀
    const originId = this.eventMap.get(key);        // 永远 undefined
}
```

**后果**：`cors.off()` 永远无法真正注销监听器，`GM_addValueChangeListener` 注册的监听不会被 `GM_removeValueChangeListener` 移除。

**修复**：`off` 需要同样拿到 uid 后拼接 key，或让 `eventMap` 直接以 `name` 为键（uid 在运行时对同一 tab 是固定的）。

---

### D3. `Script` 构造函数未装配 `onhashchange` 钩子
**位置**：[src/interfaces/script.ts:140-191](src/interfaces/script.ts#L140-L191)

构造函数解构了 `onstart / onactive / oncomplete / onbeforeunload / onrender / onhistorychange / onhistorychanged`，但 **遗漏了 `onhashchange`**。同时 `ScriptOptions & {...}` 的内联类型里也没有 `onhashchange`。

而 [start.ts:117-122](src/utils/start.ts#L117-L122) 明确调用了 `script.onhashchange?.(startConfig)`。

**后果**：用户无法像其它钩子那样通过构造参数传入 `onhashchange`，只能改用 `script.on('hashchange', ...)`。与其它钩子的使用方式不一致，属于 API 缺陷。

**修复**：在解构参数与内联类型中补上 `onhashchange`，并 `this.onhashchange = this.errorHandler(onhashchange)`。

---

### D4. `Script.methods` 的错误包装是死代码，方法永远不会被 `errorHandler` 包裹
**位置**：[src/interfaces/script.ts:181-190](src/interfaces/script.ts#L181-L190)

```ts
this.methods = methods?.bind(this)() || Object.create({});
if (this.methods) {
    for (const key in methods) {   // ← methods 是函数，for...in 遍历其可枚举属性（通常为空）
        if (Reflect.has(this.methods, key) && typeof this.methods[key] !== 'function') {
            Reflect.set(this.methods, key, this.errorHandler(this.methods[key]));
        }
    }
}
```

`methods` 是 `(this) => M` 的工厂函数，`for...in` 遍历函数对象本身几乎不会进入循环体；即便进入，`this.methods[key]` 已是函数（`!== 'function'` 为 false），也不会包装。

**后果**：暴露给外部的 `script.methods.xxx()` 抛错时不会被 `scripterror` 事件捕获，违背了 `errorHandler` 的设计意图。

**修复**：遍历 `this.methods`（返回值对象），并对每个函数属性做 `errorHandler` 包装：
```ts
for (const key in this.methods) {
    if (typeof this.methods[key] === 'function') {
        this.methods[key] = this.errorHandler(this.methods[key]) as any;
    }
}
```

---

### D5. `ConfigElement` 数值校验在 `min=0` 或 `max=0` 时失效
**位置**：[src/elements/config.ts:136-143](src/elements/config.ts#L136-L143)

```ts
const _min = min ? parseFloat(min) : undefined;
const _max = max ? parseFloat(max) : undefined;
if (_min && val < _min) { ... }
else if (_max && val > _max) { ... }
```

`min: 0` 时 `parseFloat('0')` 为 `0`，`min ?` 判定为假 → `_min` 变成 `undefined`，下限校验被跳过；`_min &&` 同样在 0 时为假。

**后果**：当配置项合法下限为 0（如「重置次数」「延迟秒数」）时，用户输入负数不会被钳制到 0。

**修复**：用 `min !== undefined` 判断，而非真值判断：
```ts
const _min = min !== undefined ? parseFloat(min) : undefined;
if (_min !== undefined && val < _min) { ... }
```

---

### D6. `MemoryStoreProvider.setTab` 传入的 `pre` 是 Promise 而非旧值
**位置**：[src/interfaces/store.provider.ts:91-94](src/interfaces/store.provider.ts#L91-L94)

```ts
async setTab(key: string, value: any) {
    Reflect.set(MemoryStoreProvider._source.tab, key, value);
    MemoryStoreProvider.tabListeners.get(key)?.forEach((lis) => lis(value, this.getTab(key)));
    //                                                                          ^^^^^^^^^^^^^^ 返回 Promise<any>
}
```

`this.getTab(key)` 返回 `Promise`，作为 `pre`（旧值）传给监听器，与 `StoreProvider` 接口契约 `(curr, pre) => void` 不符。

**修复**：先捕获旧值再覆盖：
```ts
const pre = Reflect.get(MemoryStoreProvider._source.tab, key);
Reflect.set(MemoryStoreProvider._source.tab, key, value);
MemoryStoreProvider.tabListeners.get(key)?.forEach((lis) => lis(value, pre));
```

---

## 🟠 中等（健壮性 / 一致性问题）

### M1. `CorsEventEmitter` 在非油猴环境下完全不工作
**位置**：[src/interfaces/cors.ts:92-116](src/interfaces/cors.ts#L92-L116)

`on` 的处理器内有 `if (remote)` 守卫，而 `MemoryStoreProvider.addChangeListener` 触发监听时 `remote` 为 `undefined`。因此在本地开发（非 GM）环境下跨域事件永远不会被处理。

**建议**：这是设计限制（跨 tab 通信依赖 `GM_addValueChangeListener`），但应在文档中明确说明，或在 MemoryStoreProvider 中模拟 `remote=true` 以支持本地调试。

### M2. `MemoryStoreProvider.addChangeListener` 返回 `void`，与 `GMStoreProvider` 返回 `number` 不一致
**位置**：[src/interfaces/store.provider.ts:96](src/interfaces/store.provider.ts#L96)

`cors.ts` 中 `const id = $store.addChangeListener(...) || 0;` 依赖返回值，Memory 实现返回 void → id 恒为 0。若同 key 注册多个监听器，`removeChangeListener` 无法区分。建议统一返回一个自增 id。

### M3. `CustomWindow.mount` 在父元素无子节点时会抛错
**位置**：[src/interfaces/custom-window.ts:492-495](src/interfaces/custom-window.ts#L492-L495)

```ts
parent.children[$.random(0, parent.children.length - 1)].after(this.wrapper);
```

若 `parent.children.length === 0`，`children[-1]` 为 `undefined`，`.after` 抛 `TypeError`。默认挂载到 `document.body` 一般有子节点，但用户自定义 `mountElement` 时可能为空。

**修复**：`parent.children.length ? parent.children[...].after(this.wrapper) : parent.append(this.wrapper)`。

### M4. `CustomWindow.handlePosition` 重置位置后未刷新局部变量
**位置**：[src/interfaces/custom-window.ts:160-172](src/interfaces/custom-window.ts#L160-L172)

越界时调用 `config.store.setPosition(10, 10)`，但后续仍用旧的 `pos.x / pos.y` 设置 `style.left/top`，导致首次越界时窗口仍显示在错误位置（下一次拖动才纠正）。

**修复**：重置后 `pos = { x: 10, y: 10 }` 或重新读取。

### M5. `DropdownElement` hover 模式存在与 tooltip 相同的 `mouseout` 子元素误触发问题
**位置**：[src/elements/dropdown.ts:24-34](src/elements/dropdown.ts#L24-L34)

`triggerElement.onmouseout` / `content.onmouseout` 在鼠标移入子元素时也会触发，可能导致下拉框闪烁。建议改用 `mouseleave`（不冒泡）。

### M6. `createConfigProxy` 的 `get` 陷阱有写入副作用
**位置**：[src/utils/common.ts:22-26](src/utils/common.ts#L22-L26)

```ts
get(target, propertyKey) {
    const value = $store.get(...);
    Reflect.set(target, propertyKey, value);  // ← 在 getter 中写 target
    return value;
}
```

在读取时修改目标对象属于反模式，可能干扰 `Object.keys` / 序列化等行为，且当 store 中无值时会用 `undefined` 覆盖已设置的默认值。建议去掉 `Reflect.set`，或仅在值非 undefined 时回填。

### M7. `createConfigProxy` 对 `notes` 的处理依赖 `namespace`
**位置**：[src/utils/common.ts:37-40](src/utils/common.ts#L37-L40)

`if (script.namespace) { proxy.notes = ... }` —— 无 namespace 的脚本不会写入 `notes` 默认值，导致 `script.cfg.notes` 在无命名空间时为 `undefined`。行为不一致。

### M8. `Script.errorHandler` 未保留原函数返回值类型
**位置**：[src/interfaces/script.ts:214-227](src/interfaces/script.ts#L214-L227)

`onbeforeunload` 期望返回 `boolean` 用于阻止离开页面。`errorHandler` 在正常路径 `return func?.apply(this, args)` 可以保留，但在 catch 分支无返回值（返回 `undefined`）。当前 `beforeunload` 逻辑 `if (script.onbeforeunload?.(...))` 能容忍，但语义上 `errorHandler` 吞掉了错误返回。建议在 catch 中显式 `return false` 或不包装 `onbeforeunload`。

---

## 🟡 轻微（代码质量 / 可维护性）

### L1. `cors.ts` 顶层 `window.onload` 覆盖风险
**位置**：[src/interfaces/cors.ts:168-184](src/interfaces/cors.ts#L168-L184)

直接赋值 `window.onload = ...` 会覆盖其它脚本注册的 `load` 监听。建议改用 `window.addEventListener('load', ...)`。

### L2. `getFuncId` 哈希存在碰撞风险
**位置**：[src/interfaces/cors.ts:191-205](src/interfaces/cors.ts#L191-L205)

对函数源码做 32 位整数哈希后取 `toString(36)` 并 padStart 到 16 位，不同函数可能碰撞（前缀全 0）。`defineTopFunction` 依赖其作为事件名，碰撞会导致两个不同函数被路由到同一处理器。建议加入函数名或随机后缀。

### L3. `start.ts` 中 `onactive` 的 `active` 守卫仅覆盖 `interactive` 分支
**位置**：[src/utils/start.ts:76-112](src/utils/start.ts#L76-L112)

`complete` 分支在 `readystatechange` 中没有等价守卫。虽然浏览器正常只会进入一次 `complete`，但若被脚本派发合成 `readystatechange` 事件会重复触发 `oncomplete`。建议同样加 `complete` 标志位。

### L4. `enableElementDraggable` 中 `e = e || window.event` 冗余
**位置**：[src/utils/dom.ts:208](src/utils/dom.ts#L208)、[src/utils/dom.ts:222](src/utils/dom.ts#L222)、[src/utils/dom.ts:254](src/utils/dom.ts#L254)、[src/utils/dom.ts:268](src/utils/dom.ts#L268)

`addEventListener` 回调中 `e` 必有值，`window.event` 回退是 IE 时代遗留，可移除。

### L5. `h()` 当 `attrsOrChildren` 为空数组时被当作 children 处理
**位置**：[src/utils/dom.ts:136](src/utils/dom.ts#L136)

`Array.isArray([])` 为真，空数组会进入 children 分支（无副作用），但语义上 `h('div', {})` 与 `h('div', [])` 行为不同，建议对空对象/空数组做显式区分以避免歧义。

### L6. `ConfigElement.connectedCallback` 中 `attrs` 可能为 `undefined` 却被 `for...in`
**位置**：[src/elements/config.ts:172](src/elements/config.ts#L172)

`for (const key in this.attrs)` 在 `this.attrs` 为 undefined 时 `for...in` 不报错（返回无迭代），但与上方 `switch` 中频繁访问 `this.attrs?.type` 的可选链风格不一致。建议统一可选链或提前默认值。

### L7. `ModalElement` 中 `modalInput` 初始为 `input`，textarea 模式下会创建两个 input 元素
**位置**：[src/elements/modal.ts:25](src/elements/modal.ts#L25)、[src/elements/modal.ts:83-85](src/elements/modal.ts#L83-L85)

类字段初始化 `h('input', ...)` 已经创建了一个 input，textarea 分支又重新赋值并创建 textarea，原 input 被丢弃。虽不影响功能，但有轻微内存浪费。建议延迟初始化。

### L8. `$store` 的环境判定与 `$gm.isInGMContext()` 判定标准不同
**位置**：[src/utils/store.ts:3-4](src/utils/store.ts#L3-L4)

`$store` 用 `unsafeWindow` 是否存在判定，`$gm.isInGMContext()` 用 `GM_info` 是否存在判定。两者在大多数场景一致，但理论上存在 `unsafeWindow` 已注入而 `GM_info` 未定义的边缘情况（取决于脚本管理器）。建议统一判定标准。

### L9. `custom-window.ts` 中 `console.log('message', type, attrs)` 残留调试日志
**位置**：[src/interfaces/custom-window.ts:214](src/interfaces/custom-window.ts#L214)

`initCorsMessageSystem` 中留有 `console.log`，每次跨域消息都会打印，建议移除。

### L10. `start.ts` `beforeunload` 中 `emit('beforeunload')` 未传递 `startConfig`
**位置**：[src/utils/start.ts:162-176](src/utils/start.ts#L162-L176)

与其它事件 `emit('active', startConfig)` 风格不一致，`beforeunload` 事件无参数。若用户通过 `script.on('beforeunload')` 监听则拿不到配置。建议对齐。

---

## ✅ 已修复（本次审查期间）

### F1. tooltip 在滑块 thumb 上消失
**位置**：[src/utils/ui.ts:86](src/utils/ui.ts#L86)

`mouseout` 在鼠标移入子元素（如 `<input type="range">` 的 thumb 伪元素）时触发，导致 tooltip 误隐藏。已删除 `target.addEventListener('mouseout', hideTitle)`，仅保留 `mouseleave`。

---

## 修复优先级建议

| 优先级 | 编号 | 影响 |
|--------|------|------|
| P0 | D1, D2 | 内存泄漏 / 监听器无法注销 |
| P0 | D3, D4 | 钩子与方法错误处理失效 |
| P1 | D5, D6 | 数值校验 / 旧值传递错误 |
| P1 | M3, M4 | 边界崩溃 / 位置显示错误 |
| P2 | M1, M2, M5~M8 | 一致性 / 健壮性 |
| P3 | L1~L10 | 代码质量 |

---

## 总结

`easy-us` 在架构与类型设计上质量较高，但在 **存储层的 Memory 实现一致性**、**跨域事件的生命周期管理**、**脚本钩子装配完整性** 三处集中存在确定性缺陷（D1-D4），建议优先修复。其余多为边界条件与一致性问题，可逐步迭代。
