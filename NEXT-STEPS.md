# sofu-jo（送付状 作成ツール）— 迭代方案 NEXT-STEPS

> 产品：送付状（FAX・邮件・简易）作成工具｜纯静态站｜https://www.reveriel.com/sofu-jo/
> 战略三方向：①内容层补日语 SEO 教程页 ②日本 ASP 联盟 ③继续滚工具
> 本次迭代主题：**ASP 落审硬性合规补齐 + 内容层首篇教程**
> 状态：已完成（未部署）

---

## 一、现状盘点（迭代前）

| 文件 | 状态 |
| --- | --- |
| `index.html` | 单页工具：3 模板（FAX／メール／簡易）+ 4 预置文案，中⇄日界面切换。canonical 绝对 URL、WebApplication+FAQPage JSON-LD、分享裂变、反馈 FAB、beacon 均已就位 |
| `script.js` / `style.css` | i18n 字典 + 样式；`@media print` 已隐藏 `.no-print/.feedback-fab/.site-header/.site-footer` |
| `sitemap.xml` | 仅首页 1 条 |
| 缺失 | ❌ プライバシーポリシー ❌ 運営者情報 ❌ 教程内容页 → **ASP 落审主因** |

**ASP 落审根因**：日本 ASP（A8 / もしも / バリューコマース等）人工审核要求站点具备「運営者情報 / プライバシーポリシー / お問い合わせ」三项，纯工具页无法通过。

**法务口径（沿用既有矩阵标准）**：运营者 `GUO XING`，仅披露「大阪府大阪市」；不公开电话与详细地址；邮箱仅在对方要求时经反馈表单提供。

---

## 二、本次交付（方案 → 实施）

### 1. `privacy.html`（新规・日文）
- 9 节：基本方针 / 取得信息 / Cloudflare Web Analytics / Google フォーム / 第三方提供 / 安全管理 / Cookie / 变更 / 咨询窗口。
- 核心表述：**入力内容はサーバーへ送信されず、ブラウザ内のみで処理**（送付状涉及取引先名称・电话・FAX，隐私敏感度高，此条是信任基础）。
- 结尾 `legal-contact` 块披露 `GUO XING（大阪府大阪市）`，指向 `company.html` 的表单咨询路径。
- canonical 指向自身；OG 复用 `og-image.png`；含 beacon token。

### 2. `company.html`（新规・日文）
- 運営者情報表：サービス名 / **運営者 GUO XING** / **所在地 大阪府大阪市** / お問い合わせ / サービス内容 / 利用料金（無料）。
- 免除因公开邮箱带来的垃圾邮件与合规负担：咨询统一走 Google フォーム，必要时在表单留联系方式。
- 免責事項（ひな形性质、外部链接免责）+ 相关页互链。

### 3. `index.html` 页脚改造
- 新增一行 `footer-links`：`送付状の書き方ガイド ・ プライバシーポリシー ・ 運営者情報 ・ ご意見・フィードバック`（前三项均为新增，反馈原有）。
- 正文新增 **「送付状の書き方ガイド」内链区块**（`guide-nav`），把工具页权重导向教程页 → 满足互链要求。
- `script.js` 补 i18n key：`footerGuide / footerPrivacy / footerCompany / guideNavH2 / guideNavLink / guideNavDesc`（中⇄日均有值，切换后不空白）。

### 4. `kakikata.html`（新规・SEO 教程页）
- 标题：**送付状の書き方・FAX送付状のマナーと例文ガイド**
- 正文 **3,572 个日文字**（要求 1200+，超额 2.9 倍），10 个 H2 结构化分节：
  1. 送付状とは？役割と基本構成（7 要素）
  2. 頭語と結語「拝啓」と「敬具」の使い方（拝啓／敬具・前略／草々・謹啓／謹言・急啓 对照表）
  3. 「記」と「以上」の書き方
  4. 宛名の敬称「様」「御中」の使い分け（含「行」「宛」修正）
  5. 添付書類の数え方と送付枚数の書き方（本紙／添付／合計 表 + 記書き例）
  6. 送付状の例文（拝啓〜敬具 完整范例）
  7. FAX送付状のマナー（6 条：置放位置・号码明记・枚数・黑字・确认电话・误送信）
  8. メール送付状のマナー（6 条）
  9. よくある質問（FAQ）
- **JSON-LD**：`Article`（headline/datePublished/dateModified/author/publisher/mainEntityOfPage/image）+ `FAQPage`（4 问，与页面 FAQ 一一对应）。
- canonical 指向自身；`og:image` 复用 `https://www.reveriel.com/sofu-jo/og-image.png`。
- **首页 CTA 3 处**：顶部 `guide-cta-box`、正文「送付状の例文」段内链、底部 `guide-cta-foot`（另加 header 按钮）= 达标。
- 互链：面包屑回首页、footer 回 3 页、`guide-related` 指向首页 + 見積書 / 納品書工具 + 運営者情報。

### 5. 共享样式 `guide.css`
- 从矩阵既有 `guide.css`（mitsumori 版，含 `.legal-*` 与 `.guide-*`）复用，继承 `style.css` 的 CSS 变量与暗色模式；`@media print` 隐藏 guide 的 CTA/FAB/面包屑。

### 6. `sitemap.xml` 更新
- 从 1 条扩为 4 条：首页 / kakikata.html / privacy.html / company.html，`lastmod` 2026-10-12。

---

## 三、验证结果

| 校验项 | 命令 / 方式 | 结果 |
| --- | --- | --- |
| JS 语法 | `node --check script.js` | ✅ OK |
| Sitemap XML | `xml.dom.minidom.parse('sitemap.xml')` | ✅ 良构 |
| JSON-LD | 解析全部 `<script type="application/ld+json">` | ✅ index(2 节点) / kakikata(Article+FAQPage) 均合法 JSON |
| canonical 自身 | 四页扫描 | ✅ 各自绝对 URL |
| beacon token | 四页扫描 | ✅ 均含 `6fc01bf3ac5e457ba1bd16b91e5b653e` |
| 反馈 FAB | 四页扫描 | ✅ 均存在 |
| 教程字数 | 去标签统计 | ✅ 3,572 日文字（≥1200） |
| 首页 CTA | 正文统计 | ✅ 3 处 |
| headless Chrome | `--dump-dom` 四页 | ✅ 均正常渲染，无页面级 JS 报错（stderr 仅 macOS/GPU 环境噪声） |
| 响应式 | 强制 390px 宽度测量 | ✅ `body.scrollW=390`，表格/例文块无横向溢出（`scrollWidth ≤ offsetWidth`） |

---

## 四、后续规划（下一轮候选）

**P0（上线即做）**
1. 部署后向 Google Search Console 提交新 `sitemap.xml`，请求收录 `kakikata.html`。
2. 重提 ASP 审核（先 A8.net，附 privacy/company 链接）。
3. 教程页接入 1 个日本 ASP 联盟位（例：文房具／ビジネス用品・FAX 関連），落审通过后先挂低干扰位。

**P1（内容层滚雪球）**
- 再补 2 篇教程（承接内链，形成 topic cluster）：
  - 「送付状 テンプレート 無料｜word/excel との使い分け」
  - 「添え状と送付状の違い／時候の挨拶 一覧（月別）」
- 每篇沿用同一模板：Article+FAQPage JSON-LD、≥1200 字、≥3 处首页 CTA、面包屑 + guide-related 互链。

**P2（产品层）**
- 增加「御中／様」自动判定提示的 i18n 说明（现已在提示行，可升级为输入校验）。
- 数据层抽象留接口（memory: web-first-app-later），为将来后端模板同步预留。

**合规提醒**
- 若未来引入 AdSense／ASP，需在 privacy.html 第 3 节外补「広告配信事業者」与第三方 Cookie 段落。
- 「特定商取引法に基づく表記」目前不需要（服务免费、无交易），上付费功能时必须补。

---

## 五、本轮变更文件清单

```
新增  privacy.html          プライバシーポリシー（日文）
新增  company.html          運営者情報（GUO XING / 大阪府大阪市）
新增  kakikata.html         SEO 教程页（Article+FAQPage，3572 字）
新增  guide.css             教程/法务页共享样式（自矩阵复用）
新增  NEXT-STEPS.md         本文件
修改  index.html            页脚 3 链接 + 書き方ガイド内链区块
修改  script.js             i18n 补 6 个 key
修改  style.css             footer-links / guide-nav 样式
修改  sitemap.xml           1 条 → 4 条
```

> 未部署（按指令）。部署时注意相对路径 `kakikata.html / privacy.html / company.html` 在 `/sofu-jo/` 目录下解析，与现有 `og-image.png` 同目录，无需改绝对路径。
