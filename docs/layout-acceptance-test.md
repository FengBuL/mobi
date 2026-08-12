# 图片排版全预设验收文档

> 用途：一次性复制到公众号后台，逐个核对 26 个排版预设的实际效果。
> 每组下方标注了预设名和期望效果，对照着看即可。

---

## 1. 留白头图（`hero-image`）

期望：1 张图，单图居中展示，适合章节转场和重点截图

<section class="md-media-block md-media-block--quiet md-media-block--hero" data-layout-preset="hero-image" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 1</span>
<h3 class="md-media-block__title">留白头图</h3>
<p class="md-media-block__lead">单图居中展示，适合章节转场和重点截图</p>
</header>
<figure class="md-media-figure md-media-figure--hero" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/hero-image-0/800/500" alt="留白头图-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
</section>

---

## 2. 边框单图（`frame-single`）

期望：1 张图，单图加轻边框，适合产品图、插画和实拍

<section class="md-media-block md-media-block--frame" data-layout-preset="frame-single" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 2</span>
<h3 class="md-media-block__title">边框单图</h3>
<p class="md-media-block__lead">单图加轻边框，适合产品图、插画和实拍</p>
</header>
<figure class="md-media-figure md-media-figure--frame" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/frame-single-0/800/500" alt="边框单图-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
</section>

---

## 3. 长图视窗（`scroll-window`）

期望：1 张图，固定展示框内上下滑动长图，适合封面长海报和流程图

<section class="md-media-block md-media-block--frame md-media-block--scroll-window" data-layout-preset="scroll-window" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 3</span>
<h3 class="md-media-block__title">长图视窗</h3>
<p class="md-media-block__lead">固定展示框内上下滑动长图，适合封面长海报和流程图</p>
</header>
<figure class="md-media-figure md-media-figure--scroll">
<div class="md-media-scroll-window" style="--md-media-scroll-height:240px">
<img class="md-media-scroll-window__image" src="https://picsum.photos/seed/scroll-window-0/800/500" alt="长图视窗-图1" />
</div>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
</section>

---

## 4. 并排双图（`duo-gallery`）

期望：2 张图，两张图等权展示，适合前后对照和同类比较

<section class="md-media-block md-media-block--quiet" data-layout-preset="duo-gallery" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 4</span>
<h3 class="md-media-block__title">并排双图</h3>
<p class="md-media-block__lead">两张图等权展示，适合前后对照和同类比较</p>
</header>
<div class="md-media-grid md-media-grid--duo">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/duo-gallery-0/800/500" alt="并排双图-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/duo-gallery-1/800/500" alt="并排双图-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
</div>
</section>

---

## 5. 上下双图（`vertical-pair`）

期望：2 张图，两张图纵向连排，适合步骤拆解、前后铺陈和双段讲述

<section class="md-media-block md-media-block--quiet" data-layout-preset="vertical-pair" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 5</span>
<h3 class="md-media-block__title">上下双图</h3>
<p class="md-media-block__lead">两张图纵向连排，适合步骤拆解、前后铺陈和双段讲述</p>
</header>
<div class="md-media-grid md-media-grid--vertical-pair">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/vertical-pair-0/800/500" alt="上下双图-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/vertical-pair-1/800/500" alt="上下双图-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
</div>
</section>

---

## 6. 主次双图（`duo-focus`）

期望：2 张图，一张主图配一张辅助图，适合讲重点和补信息

<section class="md-media-block md-media-block--quiet" data-layout-preset="duo-focus" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 6</span>
<h3 class="md-media-block__title">主次双图</h3>
<p class="md-media-block__lead">一张主图配一张辅助图，适合讲重点和补信息</p>
</header>
<div class="md-media-grid md-media-grid--duo-focus">
<figure class="md-media-figure md-media-figure--focus" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/duo-focus-0/800/500" alt="主次双图-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/duo-focus-1/800/500" alt="主次双图-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
</div>
</section>

---

## 7. 三图均分（`triptych-gallery`）

期望：3 张图，三张图并排，适合步骤、案例或同主题组图

<section class="md-media-block md-media-block--quiet" data-layout-preset="triptych-gallery" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 7</span>
<h3 class="md-media-block__title">三图均分</h3>
<p class="md-media-block__lead">三张图并排，适合步骤、案例或同主题组图</p>
</header>
<div class="md-media-grid md-media-grid--triptych">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/triptych-gallery-0/800/500" alt="三图均分-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/triptych-gallery-1/800/500" alt="三图均分-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/triptych-gallery-2/800/500" alt="三图均分-图3" />
</span>
<figcaption class="md-media-figure__caption">图注 3</figcaption>
</figure>
</div>
</section>

---

## 8. 纵向三联（`vertical-strip`）

期望：3 张图，三张图纵向排列，适合流程截图、案例串讲和节奏型叙事

<section class="md-media-block md-media-block--quiet" data-layout-preset="vertical-strip" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 8</span>
<h3 class="md-media-block__title">纵向三联</h3>
<p class="md-media-block__lead">三张图纵向排列，适合流程截图、案例串讲和节奏型叙事</p>
</header>
<div class="md-media-grid md-media-grid--vertical-strip">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/vertical-strip-0/800/500" alt="纵向三联-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/vertical-strip-1/800/500" alt="纵向三联-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/vertical-strip-2/800/500" alt="纵向三联-图3" />
</span>
<figcaption class="md-media-figure__caption">图注 3</figcaption>
</figure>
</div>
</section>

---

## 9. 胶片三联（`filmstrip-gallery`）

期望：3 张图，更细长的三联版式，适合人物、实物和细节切片

<section class="md-media-block md-media-block--quiet" data-layout-preset="filmstrip-gallery" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 9</span>
<h3 class="md-media-block__title">胶片三联</h3>
<p class="md-media-block__lead">更细长的三联版式，适合人物、实物和细节切片</p>
</header>
<div class="md-media-grid md-media-grid--filmstrip">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/filmstrip-gallery-0/800/500" alt="胶片三联-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/filmstrip-gallery-1/800/500" alt="胶片三联-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/filmstrip-gallery-2/800/500" alt="胶片三联-图3" />
</span>
<figcaption class="md-media-figure__caption">图注 3</figcaption>
</figure>
</div>
</section>

---

## 10. 上下叠图（`stack-gallery`）

期望：3 张图，一张横向主图，下方两张辅助图，适合专题封面

<section class="md-media-block md-media-block--quiet" data-layout-preset="stack-gallery" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 10</span>
<h3 class="md-media-block__title">上下叠图</h3>
<p class="md-media-block__lead">一张横向主图，下方两张辅助图，适合专题封面</p>
</header>
<div class="md-media-grid md-media-grid--stacked">
<figure class="md-media-figure md-media-figure--stack-hero" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/stack-gallery-0/800/500" alt="上下叠图-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<div class="md-media-grid md-media-grid--stacked-tail">
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/stack-gallery-1/800/500" alt="上下叠图-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/stack-gallery-2/800/500" alt="上下叠图-图3" />
</span>
<figcaption class="md-media-figure__caption">图注 3</figcaption>
</figure>
</div>
</div>
</section>

---

## 11. 主次拼贴（`mosaic-focus`）

期望：3 张图，左大右小的杂志式拼图，适合活动回顾和产品展示

<section class="md-media-block md-media-block--quiet" data-layout-preset="mosaic-focus" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 11</span>
<h3 class="md-media-block__title">主次拼贴</h3>
<p class="md-media-block__lead">左大右小的杂志式拼图，适合活动回顾和产品展示</p>
</header>
<div class="md-media-grid md-media-grid--mosaic">
<figure class="md-media-figure md-media-figure--focus" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/mosaic-focus-0/800/500" alt="主次拼贴-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<div class="md-media-grid md-media-grid--mosaic-side">
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/mosaic-focus-1/800/500" alt="主次拼贴-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/mosaic-focus-2/800/500" alt="主次拼贴-图3" />
</span>
<figcaption class="md-media-figure__caption">图注 3</figcaption>
</figure>
</div>
</div>
</section>

---

## 12. 左图右文（`split-left`）

期望：1 张图，图片负责引导，右侧用标题和摘要压住阅读节奏

<section class="md-media-block md-media-combo md-media-combo--editorial" data-layout-preset="split-left" style="--md-media-block-width:100%">
<div class="md-media-combo__figure">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/split-left-0/800/500" alt="左图右文-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
</div>
<div class="md-media-combo__content">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 12</span>
<h3 class="md-media-block__title">左图右文</h3>
<p class="md-media-block__lead">图片负责引导，右侧用标题和摘要压住阅读节奏</p>
</header>
<div class="md-media-content">
<h4 class="md-media-content__title">这里填写正文标题</h4>
<p class="md-media-content__body">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</p>
<p class="md-media-content__meta">这里填写补充说明、时间、地点或一句简短结论。</p>
<a class="md-media-content__link" href="https://example.com" target="_blank" rel="noreferrer">延伸阅读</a>
</div>
</div>
</section>

---

## 13. 右图左文（`split-right`）

期望：1 张图，和左图右文互补，适合在文章中交替出现

<section class="md-media-block md-media-combo md-media-combo--editorial md-media-combo--reverse" data-layout-preset="split-right" style="--md-media-block-width:100%">
<div class="md-media-combo__figure">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/split-right-0/800/500" alt="右图左文-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
</div>
<div class="md-media-combo__content">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 13</span>
<h3 class="md-media-block__title">右图左文</h3>
<p class="md-media-block__lead">和左图右文互补，适合在文章中交替出现</p>
</header>
<div class="md-media-content">
<h4 class="md-media-content__title">这里填写正文标题</h4>
<p class="md-media-content__body">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</p>
<p class="md-media-content__meta">这里填写补充说明、时间、地点或一句简短结论。</p>
<a class="md-media-content__link" href="https://example.com" target="_blank" rel="noreferrer">延伸阅读</a>
</div>
</div>
</section>

---

## 14. 下沉卡片（`spotlight-card`）

期望：1 张图，图片在上，说明卡片在下，适合案例、产品和亮点块

<section class="md-media-block md-media-combo md-media-combo--spotlight" data-layout-preset="spotlight-card" style="--md-media-block-width:100%">
<figure class="md-media-figure md-media-figure--hero" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/spotlight-card-0/800/500" alt="下沉卡片-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<div class="md-media-combo__spotlight-card">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 14</span>
<h3 class="md-media-block__title">下沉卡片</h3>
<p class="md-media-block__lead">图片在上，说明卡片在下，适合案例、产品和亮点块</p>
</header>
<div class="md-media-content">
<h4 class="md-media-content__title">这里填写正文标题</h4>
<p class="md-media-content__body">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</p>
<p class="md-media-content__meta">这里填写补充说明、时间、地点或一句简短结论。</p>
<a class="md-media-content__link" href="https://example.com" target="_blank" rel="noreferrer">延伸阅读</a>
</div>
</div>
</section>

---

## 15. 图片横注（`caption-band`）

期望：1 张图，纯图片为主，只在下方保留短标题和一句摘要

<section class="md-media-block md-media-combo md-media-combo--caption-band" data-layout-preset="caption-band" style="--md-media-block-width:100%">
<figure class="md-media-figure md-media-figure--hero" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/caption-band-0/800/500" alt="图片横注-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<div class="md-media-combo__caption-band">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 15</span>
<h3 class="md-media-block__title">图片横注</h3>
<p class="md-media-block__lead">纯图片为主，只在下方保留短标题和一句摘要</p>
</header>
<div class="md-media-content md-media-content--compact">
<h4 class="md-media-content__title">这里填写正文标题</h4>
<p class="md-media-content__body">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</p>
<p class="md-media-content__meta">这里填写补充说明、时间、地点或一句简短结论。</p>
<a class="md-media-content__link" href="https://example.com" target="_blank" rel="noreferrer">延伸阅读</a>
</div>
</div>
</section>

---

## 16. 双卡故事（`story-pair`）

期望：2 张图，两张图分别配标题和摘要，适合推荐位与双观点并列

<section class="md-media-block md-media-block--quiet" data-layout-preset="story-pair" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 16</span>
<h3 class="md-media-block__title">双卡故事</h3>
<p class="md-media-block__lead">两张图分别配标题和摘要，适合推荐位与双观点并列</p>
</header>
<div class="md-media-story-grid">
<article class="md-media-story-card">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/story-pair-0/800/500" alt="双卡故事-图1" />
</span>
<figcaption class="md-media-figure__caption">图注 1</figcaption>
</figure>
<div class="md-media-content md-media-content--story">
<h4 class="md-media-content__title">这里填写卡片标题</h4>
<p class="md-media-content__body">这里填写这一张图对应的简短说明。</p>
</div>
</article>
<article class="md-media-story-card">
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/story-pair-1/800/500" alt="双卡故事-图2" />
</span>
<figcaption class="md-media-figure__caption">图注 2</figcaption>
</figure>
<div class="md-media-content md-media-content--story">
<h4 class="md-media-content__title">这里填写卡片标题</h4>
<p class="md-media-content__body">这里填写这一张图对应的简短说明。</p>
</div>
</article>
</div>
</section>

---

## 17. 拍立得相框（`polaroid-single`）

期望：1 张图，白色厚相框加底部留白，适合生活照、现场随拍和人物照

<section class="md-media-block md-media-block--quiet" data-layout-preset="polaroid-single" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 17</span>
<h3 class="md-media-block__title">拍立得相框</h3>
<p class="md-media-block__lead">白色厚相框加底部留白，适合生活照、现场随拍和人物照</p>
</header>
<div class="md-media-x-polaroid" style="padding:0.85rem 0.85rem 1.1rem;border:1px solid #ececec;border-radius:6px;background:#ffffff;box-shadow:0 14px 32px rgba(15,23,42,0.15);">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame" style="border-radius:2px;">
<img class="md-media-figure__image" src="https://picsum.photos/seed/polaroid-single-0/800/500" alt="拍立得相框-图1" style="border-radius:2px;" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.85rem 0.3rem 0;font-size:0.82em;line-height:1.6;text-align:center;color:#6b7280;">图注 1</figcaption>
</figure>
</div>
</section>

---

## 18. 投影卡片图（`shadow-card-single`）

期望：1 张图，大圆角配柔和投影，图片像卡片一样浮起来，适合产品图和界面图

<section class="md-media-block md-media-block--quiet" data-layout-preset="shadow-card-single" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 18</span>
<h3 class="md-media-block__title">投影卡片图</h3>
<p class="md-media-block__lead">大圆角配柔和投影，图片像卡片一样浮起来，适合产品图和界面图</p>
</header>
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px;overflow:visible;">
<span class="md-media-figure__frame" style="border-radius:20px;border:1px solid rgba(15,23,42,0.06);box-shadow:0 18px 40px rgba(15,23,42,0.2);">
<img class="md-media-figure__image" src="https://picsum.photos/seed/shadow-card-single-0/800/500" alt="投影卡片图-图1" style="border-radius:20px;" />
</span>
<figcaption class="md-media-figure__caption" style="padding:1rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
</section>

---

## 19. 满栏直角图（`full-bleed-single`）

期望：1 张图，去掉圆角贴满栏宽，图注左对齐加细分割线，适合封面和大场景

<section class="md-media-block md-media-block--quiet" data-layout-preset="full-bleed-single" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 19</span>
<h3 class="md-media-block__title">满栏直角图</h3>
<p class="md-media-block__lead">去掉圆角贴满栏宽，图注左对齐加细分割线，适合封面和大场景</p>
</header>
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame" style="border-radius:0;">
<img class="md-media-figure__image" src="https://picsum.photos/seed/full-bleed-single-0/800/500" alt="满栏直角图-图1" style="border-radius:0;" />
</span>
<figcaption class="md-media-figure__caption" style="margin-top:0.65rem;padding:0.6rem 0 0;border-top:1px solid #e5e7eb;font-size:0.8em;line-height:1.6;text-align:left;">图注 1</figcaption>
</figure>
</section>

---

## 20. 左右对比（`compare-pair`）

期望：2 张图，两张图中间加分隔线，左右各带一个角标，适合改版前后和方案对照

<section class="md-media-block md-media-block--quiet" data-layout-preset="compare-pair" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 20</span>
<h3 class="md-media-block__title">左右对比</h3>
<p class="md-media-block__lead">两张图中间加分隔线，左右各带一个角标，适合改版前后和方案对照</p>
</header>
<div class="md-media-x-compare" style="display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);gap:0.68rem;align-items:stretch;">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/compare-pair-0/800/500" alt="左右对比-图1" />
<span class="md-media-x-badge" style="position:absolute;z-index:2;left:12px;top:12px;display:inline-block;padding:0.24em 0.72em;border-radius:999px;background:var(--md-primary-color);color:#ffffff;font-size:0.72em;font-weight:700;line-height:1.6;letter-spacing:0.02em;">这里填写卡片标题</span>
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
<span class="md-media-x-divider" style="display:block;width:1px;background:#e5e7eb;"></span>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/compare-pair-1/800/500" alt="左右对比-图2" />
<span class="md-media-x-badge" style="position:absolute;z-index:2;left:12px;top:12px;display:inline-block;padding:0.24em 0.72em;border-radius:999px;background:var(--md-primary-color);color:#ffffff;font-size:0.72em;font-weight:700;line-height:1.6;letter-spacing:0.02em;">这里填写卡片标题</span>
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 2</figcaption>
</figure>
</div>
</section>

---

## 21. 杂志跨页（`magazine-spread`）

期望：2 张图，两张图零间距无缝拼接，外圆角内细缝，适合全景和连续画面

<section class="md-media-block md-media-block--quiet" data-layout-preset="magazine-spread" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 21</span>
<h3 class="md-media-block__title">杂志跨页</h3>
<p class="md-media-block__lead">两张图零间距无缝拼接，外圆角内细缝，适合全景和连续画面</p>
</header>
<div class="md-media-x-grid" style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:0;align-items:start;">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame" style="border-radius:18px 0 0 18px;">
<img class="md-media-figure__image" src="https://picsum.photos/seed/magazine-spread-0/800/500" alt="杂志跨页-图1" style="border-radius:18px 0 0 18px;" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame" style="border-radius:0 18px 18px 0;border-left:1px solid rgba(255,255,255,0.55);">
<img class="md-media-figure__image" src="https://picsum.photos/seed/magazine-spread-1/800/500" alt="杂志跨页-图2" style="border-radius:0 18px 18px 0;" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 2</figcaption>
</figure>
</div>
</section>

---

## 22. 四宫格（`quad-grid`）

期望：4 张图，2×2 等分方图，适合活动返图、素材集和同系列展示

<section class="md-media-block md-media-block--quiet" data-layout-preset="quad-grid" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 22</span>
<h3 class="md-media-block__title">四宫格</h3>
<p class="md-media-block__lead">2×2 等分方图，适合活动返图、素材集和同系列展示</p>
</header>
<div class="md-media-x-grid" style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:0.5rem;align-items:start;">
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/quad-grid-0/800/500" alt="四宫格-图1" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/quad-grid-1/800/500" alt="四宫格-图2" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/quad-grid-2/800/500" alt="四宫格-图3" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 3</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/quad-grid-3/800/500" alt="四宫格-图4" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 4</figcaption>
</figure>
</div>
</section>

---

## 23. 一主三副（`hero-trio`）

期望：4 张图，上方一张主图压场，下方三张小图补细节，适合专题头图

<section class="md-media-block md-media-block--quiet" data-layout-preset="hero-trio" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 23</span>
<h3 class="md-media-block__title">一主三副</h3>
<p class="md-media-block__lead">上方一张主图压场，下方三张小图补细节，适合专题头图</p>
</header>
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/hero-trio-0/800/500" alt="一主三副-图1" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
<div class="md-media-x-grid" style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:0.45rem;align-items:start;margin-top:0.5rem;">
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/hero-trio-1/800/500" alt="一主三副-图2" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 2</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/hero-trio-2/800/500" alt="一主三副-图3" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 3</figcaption>
</figure>
<figure class="md-media-figure" style="--md-media-aspect:4 / 3;--md-media-ratio-percent:75%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/hero-trio-3/800/500" alt="一主三副-图4" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 4</figcaption>
</figure>
</div>
</section>

---

## 24. 编号图注（`numbered-figure`）

期望：1 张图，图片左上角带编号角标，下方是左对齐竖线图注，适合步骤讲解

<section class="md-media-block md-media-block--quiet" data-layout-preset="numbered-figure" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 24</span>
<h3 class="md-media-block__title">编号图注</h3>
<p class="md-media-block__lead">图片左上角带编号角标，下方是左对齐竖线图注，适合步骤讲解</p>
</header>
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/numbered-figure-0/800/500" alt="编号图注-图1" />
<span class="md-media-x-badge" style="position:absolute;z-index:2;left:12px;top:12px;display:inline-block;padding:0.24em 0.72em;border-radius:999px;background:var(--md-primary-color);color:#ffffff;font-size:0.72em;font-weight:700;line-height:1.6;letter-spacing:0.02em;">这里填写卡片标题</span>
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
<div class="md-media-x-copy" style="margin-top:0.75rem;padding:0.1rem 0 0.1rem 0.75rem;border-left:3px solid var(--md-primary-color);">
<p class="md-media-content__title" style="margin:0;font-size:0.94em;line-height:1.5;">这里填写正文标题</p>
<p class="md-media-content__body" style="margin:0.4rem 0 0;font-size:0.86em;line-height:1.72;">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</p>
</div>
</section>

---

## 25. 渐变标题图（`gradient-caption`）

期望：1 张图，标题直接压在图片底部的渐变遮罩上，适合封面图和栏目头图

<section class="md-media-block md-media-block--quiet" data-layout-preset="gradient-caption" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 25</span>
<h3 class="md-media-block__title">渐变标题图</h3>
<p class="md-media-block__lead">标题直接压在图片底部的渐变遮罩上，适合封面图和栏目头图</p>
</header>
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/gradient-caption-0/800/500" alt="渐变标题图-图1" />
<span class="md-media-x-copy" style="position:absolute;z-index:2;left:0;right:0;bottom:0;display:block;padding:2.6rem 1rem 0.95rem;background-image:linear-gradient(to top, rgba(15,23,42,0.88), rgba(15,23,42,0.52) 46%, rgba(15,23,42,0));">
<span class="md-media-content__title" style="display:block;margin:0;color:#ffffff;font-size:1.02em;font-weight:700;line-height:1.45;">这里填写正文标题</span>
<span class="md-media-content__body" style="display:block;margin:0.35rem 0 0;color:rgba(255,255,255,0.84);font-size:0.82em;line-height:1.65;">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</span>
</span>
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
</section>

---

## 26. 引用配图（`quote-figure`）

期望：1 张图，图片下方接一段竖线引用文字和署名，适合观点、金句和访谈

<section class="md-media-block md-media-block--quiet" data-layout-preset="quote-figure" style="--md-media-block-width:100%">
<header class="md-media-block__header">
<span class="md-media-block__label">预设 26</span>
<h3 class="md-media-block__title">引用配图</h3>
<p class="md-media-block__lead">图片下方接一段竖线引用文字和署名，适合观点、金句和访谈</p>
</header>
<figure class="md-media-figure" style="--md-media-aspect:16 / 9;--md-media-ratio-percent:56.25%;--md-media-min-height:240px">
<span class="md-media-figure__frame">
<img class="md-media-figure__image" src="https://picsum.photos/seed/quote-figure-0/800/500" alt="引用配图-图1" />
</span>
<figcaption class="md-media-figure__caption" style="padding:0.62rem 0.2rem 0;font-size:0.82em;line-height:1.6;text-align:center;">图注 1</figcaption>
</figure>
<div class="md-media-x-copy" style="margin-top:0.85rem;padding:0.1rem 0 0.1rem 0.9rem;border-left:3px solid var(--md-primary-color);">
<p class="md-media-content__body" style="margin:0;font-size:0.94em;line-height:1.85;">这里填写正文摘要。建议用两到三句话说明重点，不要堆太多字。</p>
<p class="md-media-content__meta" style="margin:0.55rem 0 0;font-size:0.8em;line-height:1.6;text-align:right;">— 这里填写正文标题</p>
</div>
</section>

---
