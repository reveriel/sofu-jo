/* =========================================================
   送付状 作成ツール — script.js
   純粋なフロントエンドのみ。外部通信は行いません。
   （FAX送付状・メール送付状・簡易送付状を1フォームから生成）
   ========================================================= */
(function () {
  'use strict';

  var SHARE_URL = 'https://www.reveriel.com/sofu-jo/';

  /* ---------------------------------------------------------
     ユーティリティ
     --------------------------------------------------------- */

  function $(id) { return document.getElementById(id); }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 全角数字を半角に直してから整数化（0以上）
  function toCount(v) {
    var s = String(v == null ? '' : v)
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/[^\d]/g, '');
    if (s === '') return 0;
    var n = parseInt(s, 10);
    return (isFinite(n) && n >= 0) ? n : 0;
  }

  // 数値 → 漢数字（一・二・三…十一…）
  function kanjiNumber(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 0) return '';
    if (n === 0) return '〇';
    if (n >= 10000) return String(n);
    var digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    var units = ['', '十', '百', '千'];
    var s = String(n), out = '', len = s.length;
    for (var i = 0; i < len; i++) {
      var d = parseInt(s.charAt(i), 10);
      var pos = len - 1 - i;
      if (d === 0) continue;
      out += (d === 1 && pos > 0 ? '' : digits[d]) + units[pos];
    }
    return out;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // ISO → 西暦 / 和暦の年月日
  function fmtDate(iso, mode) {
    if (!iso) return '';
    var p = String(iso).split('-');
    if (p.length < 3) return String(iso);
    var y = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return String(iso);
    if (mode === 'wareki') {
      var era, ey;
      if (y >= 2019) { era = '令和'; ey = y - 2018; }
      else if (y >= 1989) { era = '平成'; ey = y - 1988; }
      else if (y >= 1926) { era = '昭和'; ey = y - 1925; }
      else { era = ''; ey = y; }
      var ys = (era && ey === 1) ? '元' : String(ey);
      return era + ys + '年' + m + '月' + d + '日';
    }
    return y + '年' + m + '月' + d + '日';
  }

  /* ---------------------------------------------------------
     テンプレート定義
     --------------------------------------------------------- */

  var TEMPLATES = {
    fax:    { title: 'FAX送付状',    toFax: true,  fromFax: true,  email: true,  body: true, note: true },
    email:  { title: 'メール送付状', toFax: false, fromFax: false, email: true,  body: true, note: true },
    simple: { title: '送付状',       toFax: false, fromFax: false, email: false, body: false, note: false }
  };

  /* ---------------------------------------------------------
     本文プリセット（生成本文は常に日本語）
     --------------------------------------------------------- */

  var PRESETS = [
    {
      key: 'teinei',
      ja: '時候の挨拶つき（FAX・郵送向け）',
      zh: '含季节问候（FAX・邮寄用）',
      text: '拝啓　貴社ますますご清栄のこととお慶び申し上げます。\n' +
            '平素は格別のご高配を賜り、厚く御礼申し上げます。\n' +
            'さて、このたび下記の書類をお送りいたしますので、ご査収のほどよろしくお願い申し上げます。\n' +
            'ご不明な点がございましたら、お気軽にご連絡いただけますと幸いです。\n' +
            '何卒よろしくお願い申し上げます。\n' +
            '敬具'
    },
    {
      key: 'standard',
      ja: '定番・簡潔（メール向け）',
      zh: '标准简洁（邮件用）',
      text: 'いつもお世話になっております。\n' +
            'このたび、下記の書類を送付いたします。ご査収のほどよろしくお願い申し上げます。\n' +
            'ご不明な点がございましたら、どうぞお気軽にお知らせください。\n' +
            '引き続きよろしくお願いいたします。'
    },
    {
      key: 'apology',
      ja: 'お詫び・遅延のお知らせ',
      zh: '致歉・延迟通知',
      text: '平素より大変お世話になっております。\n' +
            'このたびは、ご連絡が遅くなりましたことを深くお詫び申し上げます。\n' +
            '下記の書類をお送りいたしますので、ご査収のほどよろしくお願い申し上げます。\n' +
            '今後このようなことがないよう、社内体制を整えてまいります。\n' +
            '何卒よろしくお願い申し上げます。'
    },
    {
      key: 'jimu',
      ja: '書類送付（事務的）',
      zh: '文件寄送（事务性）',
      text: 'お世話になっております。\n' +
            '下記の書類をお送りいたします。ご査収のほどよろしくお願い申し上げます。\n' +
            'ご確認のうえ、ご不明な点がございましたらご連絡くださいませ。\n' +
            'よろしくお願いいたします。'
    }
  ];

  /* ---------------------------------------------------------
     記入例
     --------------------------------------------------------- */

  var SAMPLE = {
    date: todayISO(),
    template: 'fax',
    toCompany: '株式会社山田商事',
    toDept: '営業部',
    toName: '田中 太郎',
    toFax: '03-1234-5678',
    fromCompany: '株式会社サンプル',
    fromDept: '営業部',
    fromName: '佐藤 花子',
    fromTel: '03-0000-0000',
    fromFax: '03-0000-0001',
    fromEmail: 'sato@example.co.jp',
    subject: '御見積書の送付について',
    honpyo: '1',
    tenpu: '2',
    useKanji: false,
    note: 'ご不明な点がございましたら、上記担当までご連絡ください。',
    body: PRESETS[1].text
  };

  /* ---------------------------------------------------------
     多言語辞書（画面UIのみ／送付状本文は常に日本語）
     --------------------------------------------------------- */

  var I18N = {
    brandName:   { ja: '送付状 作成ツール', zh: '送付状 生成工具' },
    tagline:     { ja: '無料・登録不要・ブラウザだけで完結', zh: '免费・无需注册・浏览器内完成' },
    btnPrint:    { ja: '印刷 / PDF保存', zh: '打印 / 保存 PDF' },
    btnReset:    { ja: 'リセット', zh: '清空重填' },
    btnSample:   { ja: '記入例を入れる', zh: '一键填入示例' },
    btnLang:     { ja: '中文', zh: '日本語' },

    formTitle:   { ja: '送付状をかんたん作成', zh: '快速生成送付状' },
    formHint:    { ja: '左に入力すると右のプレビューにすぐ反映されます。最後に「印刷 / PDF保存」でA4の送付状を出力できます。',
                   zh: '在左侧填写，右侧预览实时更新。最后点「打印 / 保存 PDF」即可输出 A4 送付状。' },

    legendTpl:   { ja: 'テンプレートを選ぶ', zh: '选择模板' },
    tplFax:      { ja: 'FAX送付状', zh: 'FAX 送付状' },
    tplEmail:    { ja: 'メール送付状', zh: '邮件送付状' },
    tplSimple:   { ja: '簡易送付状', zh: '简易送付状' },
    tplHint:     { ja: 'FAX送付状はFAX番号欄つき、メール送付状はメール本文向けの文体、簡易送付状は件名と枚数だけのシンプル版です。',
                   zh: 'FAX 送付状带传真号栏；邮件送付状适合邮件正文语气；简易送付状仅含件名与枚数。' },

    legendDate:  { ja: '日付', zh: '日期' },
    lblDate:     { ja: '送付日', zh: '寄送日期' },
    lblDateFormat: { ja: '年月日の表示', zh: '年月日显示' },
    optSeireki:  { ja: '西暦', zh: '西历' },
    optWareki:   { ja: '和暦', zh: '和历' },

    legendTo:    { ja: '宛先（送る相手）', zh: '收件方（收件人）' },
    lblToCompany:{ ja: '会社名・組織名', zh: '公司名 / 组织名' },
    phToCompany: { ja: '例：株式会社山田商事', zh: '例：株式会社山田商事' },
    lblToDept:   { ja: '部署名', zh: '部门名' },
    phToDept:    { ja: '例：営業部', zh: '例：営業部' },
    lblToName:   { ja: '担当者名', zh: '负责人姓名' },
    phToName:    { ja: '例：田中 太郎', zh: '例：田中 太郎' },
    lblToFax:    { ja: '宛先FAX番号', zh: '收件方传真号' },
    phToFax:     { ja: '例：03-1234-5678', zh: '例：03-1234-5678' },
    hintTo:      { ja: '担当者名を入れると「様」、入れない場合は会社名に「御中」を自動で付けます。',
                   zh: '填写负责人姓名时自动加「様」，未填写时自动在公司名后加「御中」。' },

    legendFrom:  { ja: '差出人（自分の情報）', zh: '寄件方（自己的信息）' },
    lblFromCompany: { ja: '会社名・組織名', zh: '公司名 / 组织名' },
    phFromCompany:  { ja: '例：株式会社サンプル', zh: '例：株式会社サンプル' },
    lblFromDept: { ja: '部署名', zh: '部门名' },
    phFromDept:  { ja: '例：営業部', zh: '例：営業部' },
    lblFromName: { ja: '氏名', zh: '姓名' },
    phFromName:  { ja: '例：佐藤 花子', zh: '例：佐藤 花子' },
    lblFromTel:  { ja: 'TEL', zh: '电话 TEL' },
    phTel:       { ja: '例：03-0000-0000', zh: '例：03-0000-0000' },
    lblFromFax:  { ja: 'FAX', zh: '传真 FAX' },
    phFax:       { ja: '例：03-0000-0001', zh: '例：03-0000-0001' },
    lblFromEmail:{ ja: 'メールアドレス', zh: '邮箱地址' },
    phEmail:     { ja: '例：sato@example.co.jp', zh: '例：sato@example.co.jp' },

    legendContent: { ja: '件名と送付枚数', zh: '件名与寄送枚数' },
    lblSubject:  { ja: '件名', zh: '件名（主题）' },
    phSubject:   { ja: '例：御見積書の送付について', zh: '例：御見積書の送付について' },
    lblHonpyo:   { ja: '本紙の枚数', zh: '本纸张数' },
    lblTenpu:    { ja: '添付書類の枚数', zh: '附件张数' },
    chkKanji:    { ja: '枚数を漢数字（一・二・三…）で表示する', zh: '枚数以汉字数字（一・二・三…）显示' },
    hintCount:   { ja: '合計枚数は本紙＋添付書類で自動計算し、文書の最後に「以上」を表示します。',
                   zh: '合计张数＝本纸＋附件，自动计算，并在文末显示「以上」。' },

    legendBody:  { ja: '本文（挨拶文）', zh: '正文（问候语）' },
    lblBodyPreset: { ja: '本文テンプレート', zh: '正文模板' },
    lblBody:     { ja: '本文（自由に編集できます）', zh: '正文（可自由编辑）' },
    phBody:      { ja: '本文を入力してください', zh: '请输入正文' },
    optCustom:   { ja: '—— 自由入力（プリセットを使わない）——', zh: '—— 自由输入（不使用预设）——' },

    legendNote:  { ja: '備考（任意）', zh: '备注（可选）' },
    lblNote:     { ja: '備考・連絡事項', zh: '备注 / 联络事项' },
    phNote:      { ja: '例：ご不明な点は上記担当までご連絡ください。', zh: '例：ご不明な点は上記担当までご連絡ください。' },
    hintNote:    { ja: '空欄の場合は、プレビューと印刷結果に備考欄は表示されません。',
                   zh: '留空时，预览与打印结果中不显示备注栏。' },
    emptyField:  { ja: '（未入力）', zh: '（未输入）' },

    previewLabel:{ ja: 'プレビュー（A4 縦）', zh: '预览（A4 纵向）' },

    docLabelSubject: { ja: '件名', zh: '件名' },
    docLabelCount:   { ja: '送付枚数', zh: '送付枚数' },
    docLabelNote:    { ja: '備考', zh: '備考' },
    docHonorificChu: { ja: '御中', zh: '御中' },
    docHonorificSama:{ ja: '様', zh: '様' },

    seoH2: { ja: '送付状の書き方と無料テンプレート',
             zh: '送付状的写法与免费模板' },
    seoP1: { ja: '送付状（添え状）は、FAXやメール・郵送で書類を送るときに必ず添える「カバーレター」です。相手が「誰から・何が・何枚届いたか」をひと目で確認できるようにする役割があります。本ツールは、日本で一般的に使われている送付状の書式をもとに、宛先・差出人・件名・送付枚数・挨拶文を入力するだけで、無料で送付状のテンプレートを作成できるツールです。',
             zh: '送付状（附信）是在用 FAX、邮件或邮寄方式寄送文件时必须附上的「封面信」。它的作用是让收件人一眼就能确认「谁寄来的、寄了什么、共几张」。本工具依据日本通用的送付状格式，只需填写收件方、寄件方、件名、寄送枚数与问候语，即可免费生成送付状模板。' },
    seoH3a: { ja: 'FAX送付状の書き方', zh: 'FAX 送付状的写法' },
    seoP2: { ja: 'FAX送付状には、①送付日、②宛先（会社名・部署名・担当者名＋「様」）、③差出人（会社名・部署名・氏名・TEL・FAX番号）、④件名、⑤送付枚数、⑥簡単な挨拶文を記載します。配置は、宛先を左上、差出人を右下に置くのが一般的です。本文のあとに「記」と書き、件名と送付枚数を箇条書きにし、最後を「以上」で締めます。送付枚数（本紙＋添付書類）を必ず書くことで、FAXの途中抜けや紛失を防げます。',
             zh: 'FAX 送付状需填写：①寄送日期，②收件方（公司名・部门・负责人＋「様」），③寄件方（公司名・部门・姓名・TEL・FAX 号），④件名，⑤寄送枚数，⑥简短问候语。一般把收件方放左上、寄件方放右下。正文之后写「記」，分条列出件名与寄送枚数，最后以「以上」收尾。务必写明寄送枚数（本纸＋附件），可防止 FAX 中途缺页或丢失。' },
    seoH3b: { ja: 'メール送付状の書き方', zh: '邮件送付状的写法' },
    seoP3: { ja: 'メールで書類を送る場合は、件名に「〇〇の送付について」と用件を書き、本文の冒頭に「いつもお世話になっております」などの挨拶を入れます。続けて「下記の書類を送付いたします」と用件を述べ、宛先・差出人・件名・送付枚数（添付ファイル名があればそれも）をまとめ、最後に「ご査収のほどよろしくお願い申し上げます」で締めます。',
             zh: '用邮件寄送文件时，主题写「〇〇の送付について」说明事由，正文开头加「いつもお世話になっております」等问候语。接着用「下記の書類を送付いたします」说明事由，并汇总收件方・寄件方・件名・寄送枚数（有附件文件名也一并写明），最后以「ご査収のほどよろしくお願い申し上げます」收尾。' },
    seoH3c: { ja: '送付枚数の「以上」とは', zh: '寄送枚数中的「以上」是什么' },
    seoP4: { ja: '「以上」は、記載事項がそこで終わりであることを示す書き方です。送付枚数の合計とあわせて「以上」を書くことで、書類が途中で抜けていないことを相手が確認できます。本ツールでは、本紙と添付書類の枚数から合計を自動計算し、文書の最後に「以上」を自動で表示します。',
             zh: '「以上」表示记载事项到此结束。将「以上」与寄送枚数合计一并写出，收件人即可确认文件没有中途缺漏。本工具会根据本纸与附件张数自动计算合计，并在文末自动显示「以上」。' },
    seoH3d: { ja: 'よくある質問', zh: '常见问题' },
    faqQ1: { ja: '無料で使えますか？', zh: '可以免费使用吗？' },
    faqA1: { ja: 'はい。完全無料で、会員登録も不要です。すべての処理はお使いのブラウザ内で完結し、入力内容がサーバーへ送信されることはありません。',
             zh: '可以。完全免费，无需注册。所有处理都在你的浏览器内完成，输入内容不会发送到服务器。' },
    faqQ2: { ja: '作成した送付状はそのまま提出できますか？', zh: '生成的送付状可以直接提交吗？' },
    faqA2: { ja: '本ツールは一般的な送付状の書式をもとに作成しています。実際の運用では、貴社・取引先の書式や慣例に合わせて内容を調整のうえご使用ください。',
             zh: '本工具基于通用的送付状格式生成。实际使用时，请根据贵司或客户的格式与惯例调整后再使用。' },
    faqQ3: { ja: 'PDFとして保存できますか？', zh: '可以保存为 PDF 吗？' },
    faqA3: { ja: '「印刷 / PDF保存」ボタンから、お使いのブラウザの印刷機能を使ってPDFとして保存したり、そのまま印刷したりできます。',
             zh: '点击「打印 / 保存 PDF」按钮，即可通过浏览器的打印功能保存为 PDF 或直接打印。' },

    shareTitle:  { ja: 'このツールをシェアする', zh: '分享这个工具' },
    shareX:      { ja: 'X で共有', zh: '分享到 X' },
    shareLine:   { ja: 'LINE で共有', zh: '分享到 LINE' },
    shareCopy:   { ja: 'リンクをコピー', zh: '复制链接' },
    shareCopied: { ja: 'コピーしました', zh: '已复制' },

    footerText:  { ja: '送付状 作成ツール — FAX送付状・メール送付状を無料でつくるテンプレート',
                   zh: '送付状 生成工具 — 免费制作 FAX / 邮件送付状模板' },
    footerFeedback: { ja: 'ご意見・フィードバック', zh: '意见反馈' },
    footerFab:   { ja: 'ご意見・フィードバック', zh: '意见反馈' },
    footerGuide: { ja: '送付状の書き方ガイド', zh: '送付状写法指南' },
    footerPrivacy: { ja: 'プライバシーポリシー', zh: '隐私政策' },
    footerCompany: { ja: '運営者情報', zh: '运营者信息' },
    relatedLabel:{ ja: '関連ツール：', zh: '相关工具：' },

    guideNavH2:  { ja: '送付状の書き方ガイド', zh: '送付状写法指南' },
    guideNavLink:{ ja: '送付状の書き方・FAX送付状のマナーと例文ガイド', zh: '送付状的写法・FAX 送付状礼仪与例文指南' },
    guideNavDesc:{ ja: '拝啓・敬具などの頭語と結語、記書きと「以上」、宛名の敬称（様・御中）、添付書類の数え方、FAX・メール送付状のマナーを例文つきで解説します。',
                   zh: '讲解「拝啓・敬具」等头语与结语、「記」与「以上」的写法、收件人敬称（様・御中）、附件张数的数法，以及 FAX／邮件的送付状礼仪，并附例文。' },
    guideNavLink2:{ ja: 'FAX送付状のマナーと書き方・ビジネス文書の基本', zh: 'FAX 送付状的礼仪与写法・商务文书基础' },
    guideNavDesc2:{ ja: '頭語と結語、宛名の敬称（様・御中・行・宛）、送付枚数と「以上」、送信確認、再送時のお詫び文の例文をまとめます。',
                    zh: '汇总头语与结语、收件人敬称（様・御中・行・宛）、送付张数与「以上」、发送确认，以及重发时的致歉文例。' },
    guideNavLink3:{ ja: 'メール送付状の書き方・件名と本文のマナー', zh: '邮件送付状的写法・主题与正文礼仪' },
    guideNavDesc3:{ ja: '件名の付け方、To・Cc・Bccの使い分け、添付ファイルの命名・容量・形式のマナー、送信前チェックリストを例文つきで解説します。',
                    zh: '讲解主题的写法、To・Cc・Bcc 的区分使用、附件的命名・容量・格式礼仪，以及发送前检查清单，并附例文。' },

    shareText:   { ja: '送付状（FAX・メール）のテンプレートを無料で作成できるツール。宛先・件名・枚数を入れるだけでA4の送付状が作れます。',
                   zh: '免费生成送付状（FAX・邮件）模板的工具，填写收件方・件名・枚数即可生成 A4 送付状。' }
  };

  var lang = 'ja';

  function tr(key) {
    var e = I18N[key];
    if (!e) return '';
    return e[lang] || e.ja || '';
  }

  function applyI18n(next) {
    lang = next;
    document.documentElement.lang = (lang === 'zh') ? 'zh-CN' : 'ja';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var entry = I18N[el.getAttribute('data-i18n')];
      if (entry && entry[lang]) el.textContent = entry[lang];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var entry = I18N[el.getAttribute('data-i18n-ph')];
      if (entry && entry[lang]) el.setAttribute('placeholder', entry[lang]);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var entry = I18N[el.getAttribute('data-i18n-aria')];
      if (entry && entry[lang]) el.setAttribute('aria-label', entry[lang]);
    });

    var langBtn = $('langBtn');
    if (langBtn) langBtn.textContent = I18N.btnLang[lang];

    buildPresetOptions();
  }

  /* ---------------------------------------------------------
     状態の読み書き
     --------------------------------------------------------- */

  var state = {
    template: 'fax',
    dateFormat: 'seireki'
  };

  var FIELD_IDS = ['date', 'toCompany', 'toDept', 'toName', 'toFax',
    'fromCompany', 'fromDept', 'fromName', 'fromTel', 'fromFax', 'fromEmail',
    'subject', 'honpyo', 'tenpu', 'note', 'body'];

  function readForm() {
    FIELD_IDS.forEach(function (id) {
      var el = $(id);
      if (el) state[id] = el.value;
    });
    var k = $('useKanji');
    if (k) state.useKanji = k.checked;
    return state;
  }

  function writeForm(s) {
    FIELD_IDS.forEach(function (id) {
      var el = $(id);
      if (el && Object.prototype.hasOwnProperty.call(s, id)) el.value = s[id] == null ? '' : s[id];
    });
    if ($('useKanji')) $('useKanji').checked = !!s.useKanji;
    if (s.template) setTemplate(s.template, true);
    if (s.dateFormat) setDateFormat(s.dateFormat, true);
  }

  /* ---------------------------------------------------------
     本文プリセット
     --------------------------------------------------------- */

  function buildPresetOptions() {
    var sel = $('bodyPreset');
    if (!sel) return;
    var cur = sel.value;
    var html = '<option value="custom">' + esc(tr('optCustom')) + '</option>';
    PRESETS.forEach(function (p, i) {
      html += '<option value="' + i + '">' + esc(p[lang] || p.ja) + '</option>';
    });
    sel.innerHTML = html;
    // 現在の本文がプリセットと一致するならそれを選択状態に保つ
    var body = $('body') ? $('body').value : '';
    var matched = 'custom';
    PRESETS.forEach(function (p, i) {
      if (p.text === body) matched = String(i);
    });
    sel.value = matched;
    if (cur !== '' && cur !== 'custom' && cur !== matched) sel.value = cur;
  }

  /* ---------------------------------------------------------
     送付状の描画
     --------------------------------------------------------- */

  function countStr(n) {
    return state.useKanji ? kanjiNumber(n) : String(n);
  }

  function buildCountText(h, t) {
    var total = h + t;
    var parts = '本紙 ' + countStr(h) + ' 枚';
    if (t > 0) parts += ' ＋ 添付書類 ' + countStr(t) + ' 枚';
    parts += '（合計 ' + countStr(total) + ' 枚）';
    return parts;
  }

  function bodyHTML(text) {
    var lines = String(text || '').split(/\r?\n/)
      .map(function (s) { return s.replace(/\s+$/, ''); })
      .filter(function (s) { return s.trim().length > 0; });
    if (!lines.length) return '';
    return '<div class="doc-body">' + lines.map(function (l) {
      return '<p>' + esc(l) + '</p>';
    }).join('') + '</div>';
  }

  function render() {
    readForm();
    var t = TEMPLATES[state.template] || TEMPLATES.fax;
    var h = toCount(state.honpyo);
    var tp = toCount(state.tenpu);
    if (state.honpyo === '' || state.honpyo == null) h = 1;

    var html = '';

    // 日付・タイトル
    html += '<div class="doc-top">';
    html += '<p class="doc-date" id="docDate">' + esc(fmtDate(state.date, state.dateFormat)) + '</p>';
    html += '<h1 class="doc-title" id="docTitle">' + esc(t.title) + '</h1>';
    html += '</div>';

    // 宛先・差出人
    var toCompany = String(state.toCompany || '').trim();
    var toDept = String(state.toDept || '').trim();
    var toName = String(state.toName || '').trim();
    var toFax = String(state.toFax || '').trim();

    var toBlock = '';
    if (toCompany) {
      toBlock += '<p class="to-org">' + esc(toCompany) +
        (!toName ? ' <span class="honorific">御中</span>' : '') + '</p>';
    }
    if (toDept) toBlock += '<p class="to-sub">' + esc(toDept) + '</p>';
    if (toName) toBlock += '<p class="to-sub">' + esc(toName) + ' <span class="honorific">様</span></p>';
    if (t.toFax && toFax) toBlock += '<p class="to-fax">FAX：' + esc(toFax) + '</p>';
    if (!toBlock) toBlock = '<p class="to-org ph-empty">　</p>';

    var fromCompany = String(state.fromCompany || '').trim();
    var fromDept = String(state.fromDept || '').trim();
    var fromName = String(state.fromName || '').trim();
    var fromTel = String(state.fromTel || '').trim();
    var fromFax = String(state.fromFax || '').trim();
    var fromEmail = String(state.fromEmail || '').trim();

    var fromBlock = '';
    if (fromCompany) fromBlock += '<p>' + esc(fromCompany) + '</p>';
    if (fromDept) fromBlock += '<p>' + esc(fromDept) + '</p>';
    if (fromName) fromBlock += '<p class="from-name">' + esc(fromName) + '</p>';
    if (fromTel) fromBlock += '<p class="from-meta">TEL：' + esc(fromTel) + '</p>';
    if (t.fromFax && fromFax) fromBlock += '<p class="from-meta">FAX：' + esc(fromFax) + '</p>';
    if (t.email && fromEmail) fromBlock += '<p class="from-meta">Email：' + esc(fromEmail) + '</p>';
    if (!fromBlock) fromBlock = '<p class="ph-empty">　</p>';

    html += '<div class="doc-parties">' +
      '<div class="doc-to">' + toBlock + '</div>' +
      '<div class="doc-from">' + fromBlock + '</div>' +
      '</div>';

    // 本文
    if (t.body) html += bodyHTML(state.body);

    // 記
    var subject = String(state.subject || '').trim();
    var note = String(state.note || '').trim();

    var items = '';
    items += '<div class="doc-item"><dt>件名</dt><dd id="docSubject">' +
      (subject ? esc(subject) : '<span class="doc-empty">' + esc(tr('emptyField')) + '</span>') + '</dd></div>';
    items += '<div class="doc-item"><dt>送付枚数</dt><dd id="docCount">' +
      esc(buildCountText(h, tp)) + '</dd></div>';

    html += '<div class="doc-marker">記</div>';
    html += '<dl class="doc-items">' + items + '</dl>';

    if (t.note && note) {
      html += '<p class="doc-note" id="docNote"><span class="doc-note-label">備考：</span>' + esc(note) + '</p>';
    }

    html += '<p class="doc-end" id="docEnd">以上</p>';

    $('paper').innerHTML = html;
  }

  /* ---------------------------------------------------------
     テンプレート・日付形式の切り替え
     --------------------------------------------------------- */

  function setTemplate(key, silent) {
    if (!TEMPLATES[key]) key = 'fax';
    state.template = key;
    document.querySelectorAll('.seg-btn[data-tpl]').forEach(function (b) {
      var on = b.getAttribute('data-tpl') === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // テンプレート依存のフィールド表示
    var t = TEMPLATES[key];
    if ($('toFaxField')) $('toFaxField').hidden = !t.toFax;
    if ($('fromFaxField')) $('fromFaxField').hidden = !t.fromFax;
    if ($('fromEmailField')) $('fromEmailField').hidden = !t.email;
    if (!silent) render();
  }

  function setDateFormat(mode, silent) {
    state.dateFormat = (mode === 'wareki') ? 'wareki' : 'seireki';
    document.querySelectorAll('.seg-btn[data-datefmt]').forEach(function (b) {
      var on = b.getAttribute('data-datefmt') === state.dateFormat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (!silent) render();
  }

  /* ---------------------------------------------------------
     共有
     --------------------------------------------------------- */

  function shareText() { return tr('shareText'); }

  function shareX() {
    window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText()) +
      '&url=' + encodeURIComponent(SHARE_URL), '_blank', 'noopener');
  }

  function shareLine() {
    window.open('https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(SHARE_URL) +
      '&text=' + encodeURIComponent(shareText()), '_blank', 'noopener');
  }

  function fallbackCopy(done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = SHARE_URL;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) { /* クリップボードが使えない環境では何もしない */ }
  }

  function copyLink() {
    var label = $('shareCopyLabel');
    var done = function () {
      if (!label) return;
      label.textContent = tr('shareCopied');
      setTimeout(function () { label.textContent = tr('shareCopy'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SHARE_URL).then(done, function () { fallbackCopy(done); });
    } else {
      fallbackCopy(done);
    }
  }

  /* ---------------------------------------------------------
     初期化
     --------------------------------------------------------- */

  function init() {
    // 日付の初期値
    if ($('date') && !$('date').value) $('date').value = todayISO();
    // 本文の初期値（定番プリセット）
    if ($('body') && !$('body').value) $('body').value = PRESETS[1].text;

    buildPresetOptions();
    setTemplate('fax', true);
    setDateFormat('seireki', true);

    // 入力のたびに再描画
    var form = document.querySelector('.form-pane');
    if (form) {
      form.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'bodyPreset') return;
        render();
        if (e.target && e.target.id === 'body') syncPresetSelect();
      });
      form.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'bodyPreset') return;
        render();
      });
    }

    // テンプレート切替
    document.querySelectorAll('.seg-btn[data-tpl]').forEach(function (b) {
      b.addEventListener('click', function () { setTemplate(b.getAttribute('data-tpl')); });
    });

    // 日付表示の切替
    document.querySelectorAll('.seg-btn[data-datefmt]').forEach(function (b) {
      b.addEventListener('click', function () { setDateFormat(b.getAttribute('data-datefmt')); });
    });

    // 本文プリセット
    if ($('bodyPreset')) {
      $('bodyPreset').addEventListener('change', function () {
        var v = $('bodyPreset').value;
        if (v !== 'custom') {
          var p = PRESETS[parseInt(v, 10)];
          if (p) { $('body').value = p.text; state.body = p.text; }
        }
        render();
      });
    }

    // 印刷
    ['printBtn', 'printBtn2'].forEach(function (id) {
      var b = $(id);
      if (b) b.addEventListener('click', function () { window.print(); });
    });

    // 記入例
    if ($('sampleBtn')) {
      $('sampleBtn').addEventListener('click', function () {
        writeForm(SAMPLE);
        render();
      });
    }

    // リセット
    if ($('resetBtn')) {
      $('resetBtn').addEventListener('click', function () {
        FIELD_IDS.forEach(function (id) {
          var el = $(id);
          if (el) el.value = '';
        });
        $('date').value = todayISO();
        $('honpyo').value = '1';
        $('tenpu').value = '0';
        $('body').value = PRESETS[1].text;
        $('useKanji').checked = false;
        setTemplate('fax', true);
        setDateFormat('seireki', true);
        syncPresetSelect();
        render();
      });
    }

    // 言語切替
    if ($('langBtn')) {
      $('langBtn').addEventListener('click', function () {
        applyI18n(lang === 'zh' ? 'ja' : 'zh');
        render();
      });
    }

    // 共有
    if ($('shareXBtn')) $('shareXBtn').addEventListener('click', shareX);
    if ($('shareLineBtn')) $('shareLineBtn').addEventListener('click', shareLine);
    if ($('shareCopyBtn')) $('shareCopyBtn').addEventListener('click', copyLink);
    if ($('shareUrlText')) $('shareUrlText').textContent = SHARE_URL;

    applyI18n(lang);
    render();
  }

  function syncPresetSelect() {
    var sel = $('bodyPreset');
    if (!sel) return;
    var body = $('body').value;
    var matched = 'custom';
    PRESETS.forEach(function (p, i) { if (p.text === body) matched = String(i); });
    sel.value = matched;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* テスト・デバッグ用に公開（画面の挙動には影響しない） */
  window.SofuJoApp = {
    kanjiNumber: kanjiNumber,
    fmtDate: fmtDate,
    toCount: toCount,
    templates: function () { return Object.keys(TEMPLATES); },
    presets: function () { return PRESETS.map(function (p) { return p.key; }); },
    presetCount: function () { return PRESETS.length; },
    currentTemplate: function () { return state.template; },
    setTemplate: setTemplate,
    setDateFormat: setDateFormat,
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    docText: function () {
      var p = $('paper');
      return p ? p.textContent.replace(/\s+/g, ' ').trim() : '';
    },
    setLang: function (l) { applyI18n(l); render(); },
    setValues: function (o) {
      readForm();
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) state[k] = o[k];
      writeForm(state);
      render();
    },
    render: render
  };
})();
