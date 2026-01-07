
# 本目录为项目样式基石，保持整洁、统一、可扩展

## 目录位置

`style/` 目录位于项目根目录下，负责管理项目的全局样式。

## 功能概述

`style/` 目录用于 **集中管理项目的全局样式,业务样式请写在`@/assets/scss`目录下**，包括：

- 全局 CSS/SCSS 变量
- 基础样式重置（reset / normalize）
- 全局公共类（`.text-center`、`.clearfix` 等）
- 主题配置（暗黑模式、主题色切换）
- Element Plus 样式覆盖
- 全局动画、过渡效果

---

## 目录结构

style/
├── common.scss      # 全局 SCSS 变量（颜色、字体、间距）
├── font.scss         # 全局字体样式
├── _functions.scss      # SCSS 函数（如 rem 转换）
├── mixin.scss          # 全局混入（响应式、椭圆、文本截断）
├── normalize.css           # 重置浏览器默认样式
├── theme.scss          # 主题样式（暗黑模式、主题色切换）
├── transition.scss      # 全局过渡效果
├── element        # Element Plus 样式覆盖
│   ├── index.scss  # Element Plus 样式覆盖
│   └── dark.scss          # Element Plus 暗黑模式样式
└── index.scss           # 主入口：导入所有样式

