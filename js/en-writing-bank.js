/**
 * 英語寫作：初級／中級／中高級。
 * 級名與「能做什麼」來自全民英檢；CEFR 對照來自 LTTC 寫作參照研究。
 * 句型與連接詞對齊 CEFR 寫作量表、劍橋 A2 Key／B1 Preliminary／B2 First 寫作評分。
 */

export const LEVELS = [
  {
    id: "elem",
    label: "初級",
    cefr: "A2",
    gept: "全民英檢初級",
    words: [40, 60],
    wordHint: "約 50 詞",
    canDo: "能寫簡單的句子及段落，如寫明信片、便條、賀卡及填表格等。對一般日常生活相關的事物，能以簡短的文字敘述或說明。",
    task: "GEPT 初級段落寫作：根據提示寫約 50 字，描寫圖片情節。先把句子寫對，再用 and / but / so / because 接起來。",
    cefrDo: "Can write a series of simple phrases and sentences linked with simple connectors like “and”, “but” and “because”.",
    sources: [
      {
        title: "LTTC 全民英檢初級〈檢測程度〉",
        url: "https://www.gept.org.tw/Exam_Intro/t01_introduction.asp",
        quote: "能寫簡單的句子及段落……對一般日常生活相關的事物，能以簡短的文字敘述或說明。段落寫作約 50 字。",
      },
      {
        title: "Council of Europe, CEFR (2001) Overall written production A2",
        url: "https://rm.coe.int/168045b15e",
        quote: "用 and / but / because 把簡單句子連成一小串。",
      },
      {
        title: "Cambridge A2 Key for Schools Writing checklist",
        url: "https://www.cambridgeenglish.org/Images/652767-a2-key-for-schools-writing-checklist-for-teachers.pdf",
        quote: "基本連接：and, but, so, because；也可用 First / then 排順序。",
      },
      {
        title: "LTTC-GEPT Research Reports：寫作與 CEFR 對照",
        url: "https://www.lttc.ntu.edu.tw/files/20221018103502557.pdf",
        quote: "全民英檢初級寫作對應 CEFR A2。",
      },
    ],
  },
  {
    id: "mid",
    label: "中級",
    cefr: "B1",
    gept: "全民英檢中級",
    words: [100, 130],
    wordHint: "約 120 詞 · 8～12 句",
    canDo: "能寫簡單的書信、故事及心得等。對於熟悉且與個人經歷相關的主題，能以簡易的文字表達。",
    task: "GEPT 中級作文：依文字提示寫約 120 字（8 至 12 個句子），可一段或分段。要能寫經歷，並簡短說明理由與打算。",
    cefrDo: "Can produce simple connected text on topics which are familiar or of personal interest. Can describe experiences and events, dreams, hopes and ambitions and briefly give reasons and explanations for opinions and plans.",
    sources: [
      {
        title: "LTTC 全民英檢中級〈檢測程度〉",
        url: "https://www.gept.org.tw/Exam_intro/t02_introduction.asp",
        quote: "能寫簡單的書信、故事及心得。作文約 120 字（8 至 12 個句子），可一段或分段。",
      },
      {
        title: "Council of Europe, CEFR (2001) Global scale B1",
        url: "https://rm.coe.int/168045b15e",
        quote: "寫熟悉主題的連貫短文；描述經歷，並簡短說明看法與計畫的理由。",
      },
      {
        title: "Cambridge B1 Preliminary for Schools Assessing writing",
        url: "https://www.cambridgeenglish.org/images/231794-cambridge-english-assessing-writing-performance-at-level-b1.pdf",
        quote: "組織：多種連接詞與銜接；語言：簡單句＋部分複雜句。",
      },
      {
        title: "LTTC-GEPT Research Reports：寫作與 CEFR 對照",
        url: "https://www.lttc.ntu.edu.tw/files/20221018103502557.pdf",
        quote: "全民英檢中級寫作對應 CEFR B1。",
      },
    ],
  },
  {
    id: "high",
    label: "中高級",
    cefr: "B2",
    gept: "全民英檢中高級",
    words: [150, 180],
    wordHint: "約 150～180 詞",
    canDo: "能寫一般的工作報告及書信等。除日常生活相關主題外，與工作相關的事物、時事及較複雜或抽象的概念皆能適當表達。",
    task: "GEPT 中高級引導寫作：150～180 詞，文體要合適。要能正反說理，說明優缺點，並分段收束。",
    cefrDo: "Can write clear, detailed text on a variety of subjects related to his/her field of interest. Can write an essay or report, passing on information or giving reasons in support of or against a particular point of view.",
    sources: [
      {
        title: "LTTC 全民英檢中高級〈檢測程度〉",
        url: "https://www.gept.org.tw/exam_intro/t03_introduction.asp",
        quote: "時事及較複雜或抽象的概念皆能適當表達。引導寫作 150～180 words in an appropriate style。",
      },
      {
        title: "Council of Europe, CEFR (2001) Overall written production B2",
        url: "https://rm.coe.int/168045b15e",
        quote: "寫清楚、有細節的文章；論說文要能支持或反對一個觀點，並說明各種選擇的優缺點。",
      },
      {
        title: "Cambridge B2 First for Schools Assessing writing",
        url: "https://www.cambridgeenglish.org/images/600975-teacher-guide-for-writing-b2-first-for-schools.pdf",
        quote: "組織完整、連貫；使用較多連接詞與銜接手段；論說文常需同意／不同意並作結論。",
      },
      {
        title: "LTTC-GEPT Research Reports：寫作與 CEFR 對照",
        url: "https://www.lttc.ntu.edu.tw/files/20221018103502557.pdf",
        quote: "全民英檢中高級寫作對應 CEFR B2。",
      },
    ],
  },
];

export const JOSEKI = [
  {
    id: "je01",
    level: "elem",
    n: 1,
    role: "句",
    name: "完整句：誰＋做＋什麼",
    frame: "I ____ ____.\nShe ____ ____.",
    why: "初級第一關是把句子寫完整。GEPT 初級寫作一半是單句改寫、合併、重組，就是在練這個骨架。",
    basis: "GEPT 初級寫作第一部分：句子改寫、合併、重組。重點是內容、文法、用字、標點與大小寫。",
    basisUrl: "https://www.gept.org.tw/Exam_Intro/t01_introduction.asp",
    samples: ["I eat dumplings.", "Dad rides a bike in the park."],
    trap: "不要只寫 Dumplings. 或 Fun. 要有主詞和動詞。",
    tryHint: "寫兩句完整句：誰做了什麼。",
  },
  {
    id: "je02",
    level: "elem",
    n: 2,
    role: "起",
    name: "生活開門：I like / There is",
    frame: "I like ____.\nThere is a ____.\nThere are ____.",
    why: "初級能寫的是日常生活。先點出喜歡的東西，或先把畫面擺出來。",
    basis: "GEPT 初級：對一般日常生活相關的事物，能以簡短的文字敘述或說明。",
    basisUrl: "https://www.gept.org.tw/Exam_Intro/t01_introduction.asp",
    samples: ["I like dumplings.", "There is a park near my home."],
    trap: "一個東西用 There is，兩個以上用 There are。",
    tryHint: "寫一句 I like，一句 There is 或 There are。",
  },
  {
    id: "je03",
    level: "elem",
    n: 3,
    role: "承",
    name: "and 把兩件事接起來",
    frame: "I ____, and I ____.\nIt is ____ and ____.",
    why: "CEFR A2 最基本的連接就是 and。兩件相關的事先用 and，不要一直句號切斷。",
    basis: "CEFR A2：用 and / but / because 連接簡單句子。劍橋 A2 寫作清單也把 and 列為基本連接詞。",
    basisUrl: "https://www.cambridgeenglish.org/Images/652767-a2-key-for-schools-writing-checklist-for-teachers.pdf",
    samples: [
      "Mom makes dumplings, and the kitchen smells good.",
      "I go to the park, and we ride bikes.",
    ],
    trap: "and 兩邊都要能獨立成句，不要寫 I like and dumplings.",
    tryHint: "用 and 把兩件相關的事寫成一句。",
  },
  {
    id: "je04",
    level: "elem",
    n: 4,
    role: "轉",
    name: "but 說不一樣的一面",
    frame: "I like ____, but I don't like ____.\nIt is ____, but ____.",
    why: "A2 的轉折用 but 就夠。先講一件，再講相反或限制。",
    basis: "CEFR A2 連接詞含 but。劍橋 A2 Key 寫作清單：and, but, so, because。",
    basisUrl: "https://www.cambridgeenglish.org/Images/652767-a2-key-for-schools-writing-checklist-for-teachers.pdf",
    samples: [
      "I like the swing, but the slide is fun too.",
      "I am tired, but I still want to play.",
    ],
    trap: "一句裡 but 用一次。不要 Although ... but ...。",
    tryHint: "寫一句有 but 的對比。",
  },
  {
    id: "je05",
    level: "elem",
    n: 5,
    role: "承",
    name: "because 補原因",
    frame: "I like it because ____.\nI eat them because ____.",
    why: "有 because，句子才從「喜歡」變成「說明」。這是 A2 連句裡最值得先練的一個。",
    basis: "CEFR A2 Overall written production：linked with simple connectors like “and”, “but” and “because”.",
    basisUrl: "https://rm.coe.int/168045b15e",
    samples: [
      "I eat dumplings after school because I am hungry.",
      "I like the park because I can ride a bike.",
    ],
    trap: "because 後面不要再加 so。選一個。",
    tryHint: "把一句喜好加上 because。",
  },
  {
    id: "je06",
    level: "elem",
    n: 6,
    role: "合",
    name: "so 收成結果",
    frame: "I am hungry, so I ____.\nIt is fun, so I ____.",
    why: "前面是原因，後面是結果。劍橋 A2 把 so 和 and / but / because 列在同一組基本連接。",
    basis: "Cambridge A2 Key Writing checklist：basic linking words such as and, but, so, because.",
    basisUrl: "https://www.cambridgeenglish.org/Images/652767-a2-key-for-schools-writing-checklist-for-teachers.pdf",
    samples: [
      "I am hungry, so I eat dumplings.",
      "The park is near my home, so I go there after school.",
    ],
    trap: "so 前面要先寫完整原因，不要只寫 So I happy.",
    tryHint: "用 so 寫一句「原因 → 結果」。",
  },
  {
    id: "je07",
    level: "elem",
    n: 7,
    role: "承",
    name: "First / then / finally 排順序",
    frame: "First, ____. Then, ____.\nFinally, ____.",
    why: "看圖或寫一天，用這三個詞讀者才跟得上。劍橋 A2 範卷評語就點名 First; then。",
    basis: "Cambridge A2 Key Assessing writing 範卷：First; then; When we arrived 用來排敘事順序。",
    basisUrl: "https://assets.cambridgeenglish.org/schools/CER%206647%20V1c%20JUL20_Teacher%20Guide%20for%20Writing%20A2%20Key%20for%20Schools.pdf",
    samples: [
      "First, I put bread on a plate. Then I add ham.",
      "Finally, we buy ice cream.",
    ],
    trap: "每步只寫一件事。",
    tryHint: "用 First / Then / Finally 寫三步。",
  },
  {
    id: "je08",
    level: "elem",
    n: 8,
    role: "段",
    name: "看圖／生活：約 50 詞一小段",
    frame: "1 誰在哪\n2 做了什麼（and / then）\n3 感覺或 because\n目標約 50 詞",
    why: "初級整段不要寫長。把誰、在哪、做什麼、為什麼寫完，就對上 GEPT 看圖約 50 字。",
    basis: "GEPT 初級段落寫作：根據提示寫一篇約 50 字的文章描寫圖片的情節。",
    basisUrl: "https://www.gept.org.tw/Exam_Intro/t01_introduction.asp",
    samples: [
      "There is a park near my home. I go there with Dad, and we ride bikes. I like the swing because it is high. I am happy at the park.",
    ],
    trap: "不要堆很多形容詞。把四件事講清楚比寫長重要。",
    tryHint: "選一張生活畫面，寫約 50 詞。",
  },
  {
    id: "jm01",
    level: "mid",
    n: 1,
    role: "起",
    name: "時間線：One day / After that / In the end",
    frame: "One day / Last Saturday, ____.\nAfter that, ____.\nIn the end, ____.",
    why: "中級要寫故事和經歷。先把時間排成一條線，再補細節，才是「連貫短文」不是句子清單。",
    basis: "CEFR B1：描述 experiences and events。GEPT 中級：能寫簡單的故事。",
    basisUrl: "https://www.gept.org.tw/Exam_intro/t02_introduction.asp",
    samples: [
      "Last Saturday, Dad took me to the park.",
      "In the end, I was tired but happy.",
    ],
    trap: "開場用一次 One day／Last Saturday，後面改 After that，不要重複 One day。",
    tryHint: "用這三句寫一件真的經歷。",
  },
  {
    id: "jm02",
    level: "mid",
    n: 2,
    role: "承",
    name: "When / After 時間從句",
    frame: "When ____, I ____.\nAfter I ____, I ____.",
    why: "中級開始要有「部分複雜句」。把兩件事黏在同一時間，比一直 and 更像作文。",
    basis: "Cambridge B1 Preliminary 寫作 Language：a range of simple and some complex grammatical forms.",
    basisUrl: "https://www.cambridgeenglish.org/images/231794-cambridge-english-assessing-writing-performance-at-level-b1.pdf",
    samples: [
      "When the wind blew, I felt like I was flying.",
      "After I read the story, I told Mom about whales.",
    ],
    trap: "When 後面先寫事情，逗號後再寫你做什麼。",
    tryHint: "用 When 或 After 寫兩句。",
  },
  {
    id: "jm03",
    level: "mid",
    n: 3,
    role: "承",
    name: "心得：I felt … because",
    frame: "I felt ____ because ____.\nIt made me feel ____.",
    why: "GEPT 中級明文要會寫「心得」。動作寫完補感覺和原因，才從流水帳變成經歷。",
    basis: "GEPT 中級：能寫簡單的書信、故事及心得。CEFR B1：describe experiences and impressions。",
    basisUrl: "https://www.gept.org.tw/Exam_intro/t02_introduction.asp",
    samples: [
      "I felt proud because I made the sandwich myself.",
      "The long walk made me feel tired, but I was still happy.",
    ],
    trap: "不要只寫 I was happy. 一定要 because。",
    tryHint: "寫 I felt … because …",
  },
  {
    id: "jm04",
    level: "mid",
    n: 4,
    role: "承",
    name: "看法＝理由＋例子",
    frame: "I think ____.\nOne reason is ____.\nFor example, ____.",
    why: "B1 要能「簡短說明看法的理由」。空口說 I think 不夠，要跟一件真事。",
    basis: "CEFR B1：briefly give reasons and explanations for opinions and plans.",
    basisUrl: "https://rm.coe.int/168045b15e",
    samples: [
      "I think we should read every day. One reason is that books give us new words. For example, a sea story taught me about whales.",
    ],
    trap: "例子要有人、有時候。不要寫 For example, it is good.",
    tryHint: "寫看法、一個理由、一個例子。",
  },
  {
    id: "jm05",
    level: "mid",
    n: 5,
    role: "轉",
    name: "Although 讓步（比 but 高一階）",
    frame: "Although ____, I still ____.",
    why: "中級轉折不要只會 but。Although 是完整從句，屬於劍橋 B1 要的「部分複雜句」。",
    basis: "Cambridge B1：some complex grammatical forms。Although 和 but 選一個，不要並用。",
    basisUrl: "https://www.cambridgeenglish.org/images/231794-cambridge-english-assessing-writing-performance-at-level-b1.pdf",
    samples: [
      "Although she is quiet, she always helps me.",
      "Although I was tired, I still wanted to play.",
    ],
    trap: "不要寫 Although ... but ...。",
    tryHint: "用 Although …, I still … 寫一句。",
  },
  {
    id: "jm06",
    level: "mid",
    n: 6,
    role: "合",
    name: "That is why / Therefore 扣題",
    frame: "That is why I ____.\nTherefore, ____.",
    why: "前面講完經歷或理由，最後要扣回主題。這是 B1「把較短意群連成線性段落」的收尾。",
    basis: "CEFR B1 Overall written production：linking a series of shorter discrete elements into a linear sequence.",
    basisUrl: "https://rm.coe.int/168045b15e",
    samples: [
      "That is why I like to sit with Mina.",
      "Therefore, I hope I can read a little before bed.",
    ],
    trap: "That is why 後面要完整句。",
    tryHint: "用 That is why 或 Therefore 收一句。",
  },
  {
    id: "jm07",
    level: "mid",
    n: 7,
    role: "合",
    name: "I hope / I will 寫打算",
    frame: "I hope I can ____.\nNext time I will ____.",
    why: "CEFR B1 明文包含 hopes and ambitions。故事或心得結束後，補下一步。",
    basis: "CEFR B1：describe dreams, hopes and ambitions and briefly give reasons and explanations for … plans.",
    basisUrl: "https://rm.coe.int/168045b15e",
    samples: [
      "I hope we can go to the park again next week.",
      "Next time I will make a sandwich for Dad.",
    ],
    trap: "I hope 後面常用 I can / we can。",
    tryHint: "用 I hope 或 I will 寫一句未來。",
  },
  {
    id: "jm08",
    level: "mid",
    n: 8,
    role: "段",
    name: "8～12 句、約 120 詞",
    frame: "開頭 1～2 句（時間或看法）\n中間 5～8 句（經過＋理由＋例子）\n結尾 1～2 句（心得或打算）\n目標約 120 詞",
    why: "這不是自訂字數，是 GEPT 中級作文題面規定。可一段，也可分三段，但句子要連得起來。",
    basis: "GEPT 中級英文作文：長度約 120 字（8 至 12 個句子）。可以是一個完整的段落，也可以分段。",
    basisUrl: "https://www.gept.org.tw/Exam_intro/t02_introduction.asp",
    samples: [
      "先寫經歷或看法，中間用 After that / For example / Although 往下接，最後 That is why 或 I hope。數一下是不是 8 到 12 句。",
    ],
    trap: "不要寫成 20 句清單。每句要接下句。",
    tryHint: "選熟悉的經歷，寫 8 到 12 句。",
  },
  {
    id: "jh01",
    level: "high",
    n: 1,
    role: "起",
    name: "引言先亮立場",
    frame: "In my view, ____.\nThis essay will explain why ____.",
    why: "中高級是引導寫作，要有合適文體。開頭不要敘事，先告訴讀者你站哪一邊。",
    basis: "GEPT 中高級：Write an essay of 150~180 words in an appropriate style. CEFR B2：essay giving reasons in support of or against a point of view.",
    basisUrl: "https://www.gept.org.tw/exam_intro/t03_introduction.asp",
    samples: [
      "In my view, children should not have homework every night.",
      "This essay will explain why books still matter in a world of screens.",
    ],
    trap: "不要用 I like 當中高級開頭。先講主張。",
    tryHint: "用 In my view 寫一句立場。",
  },
  {
    id: "jh02",
    level: "high",
    n: 2,
    role: "承",
    name: "一段一個主題句",
    frame: "One important reason is that ____.\nAnother point is that ____.",
    why: "B2 要「清楚、有細節、有組織」。一段只打一個論點，其餘句子都在撐它。",
    basis: "Cambridge B2 First 寫作 Organisation：generally well organised and coherent, using a variety of linking words and cohesive devices.",
    basisUrl: "https://www.cambridgeenglish.org/images/600975-teacher-guide-for-writing-b2-first-for-schools.pdf",
    samples: [
      "One important reason is that homework late at night makes children too tired to learn the next day.",
    ],
    trap: "一段不要同時講兩個相反的主張。",
    tryHint: "寫一個主題句，再加兩句說明。",
  },
  {
    id: "jh03",
    level: "high",
    n: 3,
    role: "轉",
    name: "正反：Some people … However …",
    frame: "Some people argue that ____.\nHowever, I believe ____ because ____.",
    why: "CEFR B2 要求能支持或反對一個觀點。先公平寫出另一邊，再用 However 守住自己。",
    basis: "CEFR B2：giving reasons in support of or against a particular point of view.",
    basisUrl: "https://rm.coe.int/168045b15e",
    samples: [
      "Some people argue that daily homework helps children remember lessons. However, I believe rest and reading at home are more useful, because tired children cannot think clearly.",
    ],
    trap: "兩邊都要寫完整原因，不要只寫 Some people are wrong.",
    tryHint: "寫兩句：別人的看法，再 However 你的看法。",
  },
  {
    id: "jh04",
    level: "high",
    n: 4,
    role: "轉",
    name: "優缺點 advantages / disadvantages",
    frame: "One advantage of ____ is that ____.\nOn the other hand, a disadvantage is that ____.",
    why: "CEFR B2 論說文還要能說明各種選擇的優缺點。這是中高級和中級最大的差別：中級說「我覺得」，中高級要能兩邊秤。",
    basis: "CEFR B2：explaining the advantages and disadvantages of various options.",
    basisUrl: "https://rm.coe.int/168045b15e",
    samples: [
      "One advantage of phones is that children can call home. On the other hand, a disadvantage is that games take away reading time.",
    ],
    trap: "優缺點講完要選邊，不要停在中間。",
    tryHint: "寫一個 advantage，一個 On the other hand。",
  },
  {
    id: "jh05",
    level: "high",
    n: 5,
    role: "轉",
    name: "讓步：Even though / Despite",
    frame: "Even though ____, ____.\nDespite this, ____.",
    why: "中高級評分看「各類句型」。Even though、Despite 比 Although 再正式，用來承認反證後仍守立場。",
    basis: "GEPT 中高級引導寫作 5 級：能靈活且妥切的運用字彙及各類句型結構。3 級則是「使用較難的字彙或複雜句時常有錯誤」。",
    basisUrl: "https://www.gept.org.tw/exam_intro/t03_introduction.asp",
    samples: [
      "Even though homework can review the day's lesson, too much of it steals sleep.",
      "Despite this, I still think a short reading habit is better than another worksheet.",
    ],
    trap: "Despite 後面接名詞或 this，不要接完整句（那是 Although）。",
    tryHint: "用 Even though 或 Despite this 寫一句讓步。",
  },
  {
    id: "jh06",
    level: "high",
    n: 6,
    role: "承",
    name: "銜接：In addition / As a result",
    frame: "In addition, ____.\nAs a result, ____.",
    why: "B2 組織分數看銜接手段多不多。不要全文都 because。加成用 In addition，結果用 As a result。",
    basis: "Cambridge B2 Organisation：a variety of linking words and cohesive devices（不是只有 and / but）。",
    basisUrl: "https://www.cambridgeenglish.org/images/600975-teacher-guide-for-writing-b2-first-for-schools.pdf",
    samples: [
      "In addition, children need time to play outside.",
      "As a result, they come to school more awake the next morning.",
    ],
    trap: "同一段不要堆三個 In addition。一個就好。",
    tryHint: "在已有的理由後面加 In addition 或 As a result。",
  },
  {
    id: "jh07",
    level: "high",
    n: 7,
    role: "題",
    name: "題目拉到習慣、3C、學習",
    frame: "題目不要停在「我喜歡」。\n改問：應不應該／哪一種比較好。",
    why: "中高級 can-do 已超出日常生活：時事與較抽象的概念。題目要會從「我的星期六」升到「該不該每天寫功課」。",
    basis: "GEPT 中高級：除日常生活相關主題外，與工作相關的事物、時事及較複雜或抽象的概念皆能適當表達。",
    basisUrl: "https://www.gept.org.tw/exam_intro/t03_introduction.asp",
    samples: [
      "Should children have homework every night?",
      "Are screens more useful than books for learning?",
    ],
    trap: "仍可用自己的生活當例子，但主題句必須是主張，不是日記。",
    tryHint: "把一件生活事改寫成「應不應該」的題目。",
  },
  {
    id: "jh08",
    level: "high",
    n: 8,
    role: "合",
    name: "In conclusion 收束 150～180 詞",
    frame: "In conclusion, ____.\nFor these reasons, I would argue that ____.",
    why: "中高級要分段、要有結尾。字數 150～180 是題面規定，不是寫越長越好。",
    basis: "GEPT 中高級引導寫作：150～180 words。過短（少於 40 字）視同未答。劍橋 B2 論說文需 drawing a conclusion。",
    basisUrl: "https://www.gept.org.tw/exam_intro/t03_introduction.asp",
    samples: [
      "In conclusion, children learn better with rest and a short reading time than with piles of homework.",
    ],
    trap: "結論不要突然換立場。開頭 In my view 和結尾 For these reasons 要同一邊。",
    tryHint: "用 In conclusion 重寫你的立場，不要加新論點。",
  },
];

function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const ESSAY_RAW = [
  {
    id: "ee01",
    level: "elem",
    title: "My Favorite Food",
    zhTitle: "我最愛吃的食物",
    kind: "生活敘述",
    used: ["je02", "je03", "je05", "je08"],
    vocab: [
      { word: "dumplings", zh: "水餃" },
      { word: "salty", zh: "鹹的" },
      { word: "rainy", zh: "下雨的" },
      { word: "hungry", zh: "肚子餓" },
    ],
    notes: [
      "這篇只有一段，剛好是初級約 50 詞。第一句 I like dumplings 先把題目講完。接著寫味道（warm / salty），再用 and 接廚房的畫面，because 說為什麼吃，so 收成感覺。最後一句回到 I like，不要開新主題。",
    ],
    body: `I like dumplings. They are warm and a little salty. Mom makes them on rainy days, and the kitchen smells good. I eat them after school because I am hungry, so I feel happy. I like dumplings a lot at home.`,
    steps: [
      "先寫完整句：主詞 I / They / Mom，後面一定有動詞。不要只寫 Dumplings. 或 Good.",
      "開門用 I like + 具體食物。這是初級「日常生活敘述」，不是空讚美。",
      "中間用 and 接畫面（kitchen smells good），用 because 說原因（hungry），用 so 收結果（feel happy）。這三個是 CEFR A2／劍橋 A2 規定要會的連接詞。",
      "結尾再點一次 I like dumplings，讓讀者知道主題沒跑掉。整篇對齊約 50 詞即可。",
    ],
    tips: [
      "橘色底的是本篇生字，點一下可查意思和聽發音。其他英文也可以點。",
      "自己寫時，把 dumplings 換成你真的愛吃的東西，味道和原因也一起換。",
    ],
  },
  {
    id: "ee02",
    level: "elem",
    title: "At the Park",
    zhTitle: "在公園",
    kind: "看圖／場景",
    used: ["je02", "je04", "je07", "je08"],
    vocab: [
      { word: "path", zh: "小徑、步道" },
      { word: "swing", zh: "盪鞦韆" },
      { word: "slide", zh: "溜滑梯" },
      { word: "Finally", zh: "最後" },
    ],
    notes: [
      "像在描一張圖。There is 先擺公園，First / Then / Finally 排你做的事。and 加看到小狗，but 比較鞦韆和溜滑梯。最後一句寫感覺，不要再加新地點。",
    ],
    body: `There is a park near my home. First, I go there with Dad. Then we ride bikes on the path, and I see a small dog. I like the swing, but the slide is fun too. Finally, I am happy at the park.`,
    steps: [
      "看圖／寫景先寫「有什麼」：There is a park。一個用 is，兩個以上才用 There are。",
      "再用 First, Then, Finally 把動作排成順序。劍橋 A2 範卷就是看有沒有排好。",
      "中間用 and 加一件看到的事，用 but 比較兩樣東西（swing / slide）。初級轉折用 but 就夠。",
      "結尾回到公園這個地點，寫 I am happy。整篇仍約 50 詞。",
    ],
    tips: [
      "橘色底是本篇生字，點一下可查。其他英文也可以點。",
      "寫自己的公園時，換成你真的玩的設施；每步只寫一件事。",
    ],
  },
  {
    id: "em01",
    level: "mid",
    title: "A Fun Saturday",
    zhTitle: "好玩的星期六",
    kind: "故事／經歷",
    used: ["jm01", "jm02", "jm03", "jm05", "jm07", "jm08"],
    vocab: [
      { word: "chasing", zh: "追趕" },
      { word: "Although", zh: "雖然" },
      { word: "together", zh: "在一起" },
      { word: "loudly", zh: "大聲地" },
    ],
    notes: [
      "開頭用 Last Saturday 打開真實經歷，再用 and 補當天的畫面。這是中級「故事」，不是 I like 開門。",
      "中段用 First / Then / After that 往下走。I felt tired because 是心得。Although 比 but 高一階：先承認想坐下，再說還是想玩。",
      "When we were leaving 是時間從句。I felt happy because 再收一次心得，I hope 寫打算。數一下句子應在 8～12 句。",
    ],
    body: `Last Saturday, Dad took me to the park near our home. The sky was blue, and many families were there.

First, we rode bikes on the path. Then we saw a small dog chasing a ball, and I laughed so loudly that Dad laughed too. After that, I felt tired because we had walked for a long time. Although I wanted to sit down, I still asked Dad to stay a little longer.

When we were leaving, we bought ice cream by the gate. I felt happy because we were together, and the ice cream was cold and sweet. I hope we can go again next week.`,
    steps: [
      "中級要寫經歷：用 Last Saturday / One day 開場，不要再用 I like 當第一句。",
      "把一天排成線：First → Then → After that。中間夾 I felt … because，才叫「心得」不是流水帳。",
      "Although … I still … 是讓步複雜句。不要寫 Although ... but ...。",
      "When 從句把「離開時」黏在買冰的動作上。結尾 I hope 寫下次打算（CEFR B1 的 hopes / plans）。",
      "寫完數句子：8 到 12 句、約 120 詞。可分成三段，像這篇一樣。",
    ],
    tips: [
      "橘色生字可點查。把公園換成你真的去過的地方，感覺和 because 也要換真的。",
      "感覺句若沒有 because，讀起來會空。",
    ],
  },
  {
    id: "em02",
    level: "mid",
    title: "Why I Like Reading",
    zhTitle: "我為什麼喜歡閱讀",
    kind: "心得／看法",
    used: ["jm04", "jm02", "jm06", "jm07", "jm08"],
    vocab: [
      { word: "whales", zh: "鯨魚" },
      { word: "calm", zh: "平靜的" },
      { word: "Therefore", zh: "所以、因此" },
      { word: "notebook", zh: "筆記本" },
    ],
    notes: [
      "這篇是看法文，不是日記。第一句 I think we should … 先亮主張，even if 承認「就算很忙」。",
      "中段兩個理由：學單字、讓自己平靜。每個理由後面都有 For example 或 When 的真事，才叫「簡短說明理由」。",
      "That is why 扣回喜歡閱讀。Therefore 接計畫 I hope。開頭 I think 和結尾 That is why 要同一邊。",
    ],
    body: `I think we should read a little every day, even if we are busy with school.

One reason is that books help us learn new words. For example, after I read a story about the sea, I could tell Mom about whales and how they swim. Another reason is that reading makes me calm. When I read before bed, I stop thinking about homework and I feel ready to sleep. I also like to write down one new word in a small notebook.

That is why I like reading at night. Therefore, I hope I can finish one short book this month and tell Dad the whole story.`,
    steps: [
      "看法文第一句用 I think / I believe，不要用 Last Saturday。這是 CEFR B1「簡短說明看法」。",
      "每個理由只打一件事：One reason … For example …；Another reason … When …。例子要有人、有時候。",
      "after I read / When I read 是時間從句，比一直 and 更像中級。",
      "結尾 That is why 點題，Therefore + I hope 寫計畫。不要在結論突然改口說閱讀沒有用。",
    ],
    tips: [
      "橘色生字可點查。兩個理由就夠，不要列十點。",
      "把 whales 換成你真的讀過的故事，句子才站得住。",
    ],
  },
  {
    id: "eh01",
    level: "high",
    title: "Should Children Have Homework Every Night?",
    zhTitle: "孩子該不該每天寫功課？",
    kind: "引導寫作／論說",
    used: ["jh01", "jh02", "jh03", "jh05", "jh06", "jh07", "jh08"],
    vocab: [
      { word: "argue", zh: "主張、認為" },
      { word: "However", zh: "然而" },
      { word: "worksheets", zh: "學習單、練習卷" },
      { word: "Despite", zh: "儘管如此" },
      { word: "conclusion", zh: "結論" },
    ],
    notes: [
      "引言先亮立場 In my view，再一句解釋為什麼。中高級開頭不是 I like，是主張。",
      "第二段先寫別人的看法 Some people argue，再用 However 守住自己。Even though 承認短複習有用，但作業太多會搶睡眠。",
      "第三段 In addition 加第二個論點，As a result 寫結果。Despite this 讓步後仍看到反面事實。",
      "In conclusion 重申立場，不要加新論點，也不可以換邊。字數對齊 150～180 詞。",
    ],
    body: `In my view, children should not have homework every night. School already takes many hours, and home time should include rest, play, and reading.

Some people argue that daily homework helps children remember the day's lesson. However, I believe too much work after dinner makes them too tired to think clearly the next morning. Even though a short review can be useful, piles of worksheets steal sleep and make family time disappear.

In addition, children need time to play outside and talk with their family about the day. As a result, they come to school more awake and they are kinder to classmates. Despite this, many families still sit at the table until late, copying answers they do not understand.

In conclusion, a little practice is enough for most children. For these reasons, I would argue that rest and a short reading habit help children more than homework every night.`,
    steps: [
      "題目是「應不應該」，屬中高級抽象題。第一段用 In my view 亮邊，第二句才解釋。",
      "正反論點要完整：Some people argue … However, I believe … because …。兩邊都要有原因。",
      "Even though / Despite 是讓步。Despite this 後面接完整句；Despite 不能直接接 I think。",
      "In addition 加論點，As a result 寫後果。同一段不要堆三個 In addition。",
      "結論只收回立場。開頭 not every night 和結尾 rest and reading 必須同一邊。",
    ],
    tips: [
      "橘色生字可點查。例子可用自己家的晚上，但主題句必須是主張。",
      "寫完數詞數：少於 150 再加一個說明，超過 180 就刪重複句。",
    ],
  },
  {
    id: "eh02",
    level: "high",
    title: "Screens or Books?",
    zhTitle: "螢幕還是書？",
    kind: "優缺點／時事",
    used: ["jh01", "jh04", "jh03", "jh06", "jh08"],
    vocab: [
      { word: "advantage", zh: "優點" },
      { word: "disadvantage", zh: "缺點" },
      { word: "replace", zh: "取代" },
      { word: "characters", zh: "故事角色" },
      { word: "habit", zh: "習慣" },
    ],
    notes: [
      "開頭就選邊：書比螢幕更適合學習。even though 先承認手機也有用，這是讓步，不是改口。",
      "這段先秤優缺點：advantage / On the other hand, a disadvantage。再接 Some people … However … 守住「紙本書記得比較住」。",
      "In addition 把場景拉到家人一起讀。As a result 寫結果。Even though 再用自己的真實習慣當例子。",
      "結論給可執行的做法：先讀書，需要時才用螢幕。不要停在「兩邊都好」。",
    ],
    body: `In my view, books are still better than screens for learning, even though phones are useful in daily life.

One advantage of screens is that children can find facts quickly and call home when they need help. On the other hand, a disadvantage is that games and videos take away quiet time and make it hard to sleep. Some people argue that a tablet can replace a book because it holds many stories. However, I believe a paper book helps us slow down, look at the words, and remember more.

In addition, reading a story together is easier than sharing a small phone. As a result, families talk more about the characters and the ending. Even though I use a screen for homework pictures, I still keep a book by my bed.

In conclusion, screens are tools, but books build the habit of thinking. For these reasons, I would argue that children should read a book first, then use a screen if they still need it.`,
    steps: [
      "CEFR B2 要能寫優缺點。先公平寫 screens 的好處，再用 On the other hand 寫壞處。",
      "寫完優缺點一定要選邊。這篇選 books，所以 However 後面不能說螢幕比較好。",
      "抽象題仍可用自己的床邊書當例子，但主題句是主張，不是日記。",
      "In conclusion 給下一步：先讀書再看螢幕。讀者要知道你要他做什麼。",
    ],
    tips: [
      "橘色生字可點查。advantage / disadvantage 成對出現，不要只寫一邊。",
      "目標 150～180 詞。結論不要突然說「其實手機就好」。",
    ],
  },
];

export const ESSAYS = ESSAY_RAW.map((e) => ({
  ...e,
  words: wordCount(e.body),
}));

export function levelById(id) {
  return LEVELS.find((x) => x.id === id) || LEVELS[0];
}

export function josekiById(id) {
  return JOSEKI.find((j) => j.id === id) || null;
}

export function josekiForLevel(levelId) {
  return JOSEKI.filter((j) => j.level === levelId);
}

export function essaysForLevel(levelId) {
  return ESSAYS.filter((e) => e.level === levelId);
}
