/**
 * 英語基本寫作：20 招定式（像圍棋定式）＋示範短文。
 * 句型整理自 PEEL / OREO、First-Then-Finally、sentence frames 等國小／ESL 常見教法。
 */

export const JOSEKI = [
  {
    id: "j01",
    n: 1,
    role: "起",
    name: "I like 開門",
    frame: "I like ____.\nMy favorite ____ is ____.",
    why: "先把主題講清楚。讀者一開頭就知道你要寫什麼。",
    samples: ["I like dogs.", "My favorite food is dumplings."],
    trap: "不要只寫 I like it. 要把 it 換成真正的東西。",
    tryHint: "寫兩句：I like … / My favorite … is …",
  },
  {
    id: "j02",
    n: 2,
    role: "起",
    name: "I think 開門",
    frame: "I think ____.\nIn my opinion, ____.",
    why: "意見文的第一手。先亮出你的看法，後面才好加理由。",
    samples: ["I think kids should play outside.", "In my opinion, reading is fun."],
    trap: "I think 後面要接完整句子，不要只寫 I think yes.",
    tryHint: "用 I think 寫一句你的看法。",
  },
  {
    id: "j03",
    n: 3,
    role: "起",
    name: "問句開門",
    frame: "Have you ever ____?\nDo you like ____?",
    why: "用問題把讀者拉進來，像下棋先佔角。後面再用 I 回答。",
    samples: ["Have you ever made a sandwich?", "Do you like rainy days?"],
    trap: "問完一定要自己回答，不要只丟一個問號。",
    tryHint: "寫一個問句，下一句用 I 回答。",
  },
  {
    id: "j04",
    n: 4,
    role: "承",
    name: "because 理由",
    frame: "I like it because ____.\nI think so because ____.",
    why: "because 是最值得先練的連接詞。有了它，句子才像在說理。",
    samples: [
      "I like dumplings because they are warm.",
      "I think reading helps because I learn new words.",
    ],
    trap: "because 後面不要再加 so。選一個就好。",
    tryHint: "把上一句加上 because …",
  },
  {
    id: "j05",
    n: 5,
    role: "承",
    name: "For example 舉例",
    frame: "For example, ____.\nOne day, ____.",
    why: "理由太空洞時，丟一件真的發生過的小事。",
    samples: [
      "For example, Mom makes pork dumplings on rainy days.",
      "One day I forgot my pencil, and Mina gave me one.",
    ],
    trap: "例子要具體：誰、做了什麼。不要寫 For example, it is good.",
    tryHint: "用 For example 寫一件真的小事。",
  },
  {
    id: "j06",
    n: 6,
    role: "承",
    name: "First Then Finally",
    frame: "First, ____. Then, ____.\nNext, ____. Finally, ____.",
    why: "寫步驟、寫一天的經過，靠這四顆棋就不會亂。",
    samples: [
      "First, I put bread on a plate. Then I add ham.",
      "Finally, we bought ice cream.",
    ],
    trap: "每步只寫一件事。不要 First 裡面塞三件。",
    tryHint: "用 First / Then / Finally 寫三步。",
  },
  {
    id: "j07",
    n: 7,
    role: "承",
    name: "故事時間線",
    frame: "One day, ____.\nAfter that, ____.\nIn the end, ____.",
    why: "記事、遊記用這條時間線，比亂跳日期清楚。",
    samples: [
      "One Saturday, Dad took me to the park.",
      "In the end, I was tired but happy.",
    ],
    trap: "One day 開場後，後面用 After that / In the end 接，不要一直 One day。",
    tryHint: "用這三句寫一件小事。",
  },
  {
    id: "j08",
    n: 8,
    role: "承",
    name: "There is 場景",
    frame: "There is a ____.\nThere are ____.",
    why: "先把畫面擺出來，讀者才能跟著看。",
    samples: [
      "There is a park near my home.",
      "There are tall trees and a blue slide.",
    ],
    trap: "一個用 is，兩個以上用 are。",
    tryHint: "寫一句 There is，一句 There are。",
  },
  {
    id: "j09",
    n: 9,
    role: "承",
    name: "I felt 感覺",
    frame: "I felt ____ because ____.\nIt made me feel ____.",
    why: "動作寫完要補感覺，文章才有溫度。",
    samples: [
      "I felt proud because I made it myself.",
      "The cold wind made me feel awake.",
    ],
    trap: "不要只寫 I was happy. 加上 because 更好。",
    tryHint: "寫 I felt … because …",
  },
  {
    id: "j10",
    n: 10,
    role: "承",
    name: "When / After 時間",
    frame: "When ____, I ____.\nAfter ____, I ____.",
    why: "把兩件事黏在同一時間點，比 and 再 and 更像作文。",
    samples: [
      "When the wind blows, I feel like I am flying.",
      "After I read the story, I told Mom about whales.",
    ],
    trap: "When 後面先寫事情，逗號後再寫你做什麼。",
    tryHint: "用 When 或 After 寫一句。",
  },
  {
    id: "j11",
    n: 11,
    role: "轉",
    name: "but 小轉",
    frame: "I wanted ____, but ____.\nIt was ____, but I still ____.",
    why: "事情不是一路順。一個 but 就讓文章有轉折。",
    samples: [
      "I felt tired, but I still wanted to play.",
      "The egg looked ugly, but I ate it all.",
    ],
    trap: "一句裡 but 用一次就好。",
    tryHint: "寫一句有 but 的轉折。",
  },
  {
    id: "j12",
    n: 12,
    role: "轉",
    name: "Although 大轉",
    frame: "Although ____, I still ____.",
    why: "比 but 更完整：先承認一件難的事，再說你還是做了。",
    samples: [
      "Although she is quiet, she always helps me.",
      "Although it was raining, we still went out.",
    ],
    trap: "Although 和 but 不要同時用。選一個。",
    tryHint: "用 Although …, I still … 寫一句。",
  },
  {
    id: "j13",
    n: 13,
    role: "轉",
    name: "有人說，但我",
    frame: "Some people think ____, but I think ____.",
    why: "意見文的「轉」：先聽另一邊，再守住自己的看法。",
    samples: [
      "Some people think she is shy, but I think she is brave.",
      "Some people think homework is boring, but I think it helps.",
    ],
    trap: "兩邊都要講完整，不要只寫 Some people think no.",
    tryHint: "寫一句 Some people think …, but I think …",
  },
  {
    id: "j14",
    n: 14,
    role: "轉",
    name: "both / but 比較",
    frame: "Both A and B are ____.\nA is ____, but B is ____.",
    why: "兩樣東西放在一起比，重點才會跳出來。",
    samples: [
      "Both the slide and the swing are fun, but I like the swing more.",
      "Cats are quiet, but dogs are loud.",
    ],
    trap: "比較完要選邊：I like … more.",
    tryHint: "比較兩樣東西，最後選一個。",
  },
  {
    id: "j15",
    n: 15,
    role: "合",
    name: "so / Therefore 結果",
    frame: "So I ____.\nTherefore, ____.",
    why: "前面講完原因，這裡收成結果。Therefore 比 so 正式一點。",
    samples: [
      "So a sandwich is easy and fun.",
      "Therefore, I hope every kid can read a little before bed.",
    ],
    trap: "so 放句首時，前面那段理由要先寫完。",
    tryHint: "用 So 或 Therefore 收一句。",
  },
  {
    id: "j16",
    n: 16,
    role: "合",
    name: "That is why 點題",
    frame: "That is why I ____.\nThis shows that ____.",
    why: "回頭扣主題，像圍棋收官。讀者知道你為什麼寫這篇。",
    samples: [
      "That is why dumplings make me happy after school.",
      "This shows that reading makes us smarter.",
    ],
    trap: "That is why 後面要接完整句，不要只寫 That is why.",
    tryHint: "用 That is why 或 This shows that 收尾。",
  },
  {
    id: "j17",
    n: 17,
    role: "合",
    name: "I hope 展望",
    frame: "I hope I can ____ again.\nI will ____ next time.",
    why: "記事、遊記常用：事情結束了，還想再來一次。",
    samples: [
      "I hope we can go again next week.",
      "I will make a sandwich for Dad next time.",
    ],
    trap: "I hope 後面用 I can / we can，比較自然。",
    tryHint: "用 I hope 或 I will 寫一句未來。",
  },
  {
    id: "j18",
    n: 18,
    role: "段",
    name: "三句微段落",
    frame: "1 主題：I like ____.\n2 細節：It is ____.\n3 理由：I like it because ____.",
    why: "六到八年級程度就能套。三句就成一段，再慢慢加長。",
    samples: [
      "I like the swing. It is high and fast. I like it because I feel like I am flying.",
    ],
    trap: "第三句不要重複第一句的詞，要加新資訊。",
    tryHint: "照 主題／細節／理由 寫三句。",
  },
  {
    id: "j19",
    n: 19,
    role: "段",
    name: "PEEL 一段",
    frame: "P 重點：I think ____.\nE 例子：For example, ____.\nE 說明：This means ____.\nL 扣題：This shows that ____.",
    why: "英國小學常見的一段法。重點→例子→說明→扣回題目。",
    samples: [
      "I think we should read every day. For example, a sea story taught me about whales. This means books give us new words. This shows that reading makes us smarter.",
    ],
    trap: "四句各做一件事。不要四句都在講同一個例子。",
    tryHint: "用 P-E-E-L 寫四句。",
  },
  {
    id: "j20",
    n: 20,
    role: "段",
    name: "OREO 意見文",
    frame: "O 看法：I think ____.\nR 理由：One reason is ____.\nE 例子：For example, ____.\nO 再看一次：That is why ____.",
    why: "意見文整篇骨架。像夾心餅：看法包住理由和例子。",
    samples: [
      "I think kids should play outside. One reason is that we need to move. For example, I run in the park after school. That is why outdoor play is important.",
    ],
    trap: "開頭和結尾的看法要同一邊，不要寫到後來改口。",
    tryHint: "用 O-R-E-O 寫四句意見文。",
  },
];

function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @type {Array<{id:string,title:string,zhTitle:string,kind:string,used:number[],body:string,steps:string[],tips:string[]}>}
 */
const ESSAY_RAW = [
  {
    id: "e01",
    title: "My Favorite Food",
    zhTitle: "我最愛吃的食物",
    kind: "喜好",
    used: [1, 4, 5, 16, 18],
    body: `I like dumplings. My favorite food is dumplings.

I like them because they are warm and a little salty. For example, on rainy days Mom makes pork dumplings, and the kitchen smells good.

That is why dumplings make me happy after school.`,
    steps: [
      "起：第 1 招，直接說喜歡什麼",
      "承：第 4 招 because，再說第 5 招舉一件真事",
      "合：第 16 招 That is why 扣回主題",
    ],
    tips: ["這篇就是第 18 招「三句微段落」拉長成三段", "例子裡要有人（Mom）和時候（rainy days）"],
  },
  {
    id: "e02",
    title: "A Fun Saturday",
    zhTitle: "好玩的星期六",
    kind: "記事",
    used: [6, 7, 9, 11, 17],
    body: `One Saturday, Dad took me to the park.

First, we rode bikes on the path. Then we saw a small dog chasing a ball. After that, I felt tired, but I still wanted to play.

Finally, we bought ice cream. I hope we can go again next week.`,
    steps: [
      "起：第 7 招 One Saturday 打開時間",
      "承：第 6 招 First / Then，中間夾第 9 招感覺",
      "轉：第 11 招 but（累了還想玩）",
      "合：Finally 收那天，第 17 招 I hope 看下次",
    ],
    tips: ["記事先排時間，再補感覺", "but 只要一個，轉折就夠了"],
  },
  {
    id: "e03",
    title: "My Best Friend",
    zhTitle: "我的好朋友",
    kind: "記人",
    used: [1, 5, 12, 13, 16],
    body: `My best friend is Mina. She sits next to me.

One day I forgot my pencil, and she gave me a new one. Although she is quiet, she always helps me.

Some people think she is shy, but I think she is brave. That is why I like to sit with her.`,
    steps: [
      "起：先寫是誰、在哪裡",
      "承：第 5 招 One day 一件小事當證據",
      "轉：第 12 招 Although，再加第 13 招有人說但我",
      "合：第 16 招 That is why",
    ],
    tips: ["記人不要只寫 She is nice", "用一件小事證明她好"],
  },
  {
    id: "e04",
    title: "We Should Read Every Day",
    zhTitle: "我們應該每天閱讀",
    kind: "意見",
    used: [2, 5, 10, 19, 20],
    body: `I think we should read every day.

One reason is that books help us learn new words. For example, after I read a story about the sea, I could tell Mom about whales.

This shows that reading makes us smarter. Therefore, I hope every kid can read a little before bed.`,
    steps: [
      "起：第 2 招 I think 亮出看法",
      "承：OREO 的理由 + 第 5 招例子，例子裡用第 10 招 After",
      "合：This shows that 扣題，Therefore 加展望",
    ],
    tips: ["這篇同時是第 19 招 PEEL 和第 20 招 OREO", "開頭 I think 和結尾 This shows 要同一邊"],
  },
  {
    id: "e05",
    title: "How I Make a Sandwich",
    zhTitle: "我怎麼做三明治",
    kind: "做法",
    used: [3, 6, 9, 10, 15],
    body: `Have you ever made a sandwich? I can make one.

First, I put bread on a plate. Then I add cheese and ham. Next, I put another piece of bread on top. Finally, I cut it in half.

When I take a bite, I feel proud because I made it myself. So a sandwich is easy and fun.`,
    steps: [
      "起：第 3 招問句開門，下一句自己答",
      "承：第 6 招四步 First Then Next Finally",
      "合：第 10 招 When + 第 9 招感覺，第 15 招 So 收",
    ],
    tips: ["做法文每步一個動作", "最後補感覺，才不像說明書"],
  },
  {
    id: "e06",
    title: "The Park Near My Home",
    zhTitle: "我家附近的公園",
    kind: "寫景",
    used: [8, 10, 14, 7, 17],
    body: `There is a park near my home. There are tall trees and a blue slide.

Both the slide and the swing are fun, but I like the swing more. When the wind blows, I feel like I am flying.

In the end, I always say, "See you tomorrow, park!" I hope I can go there after school again.`,
    steps: [
      "起：第 8 招 There is / There are 擺場景",
      "轉：第 14 招 both / but 選邊",
      "承：第 10 招 When 寫感覺",
      "合：第 7 招 In the end，第 17 招 I hope",
    ],
    tips: ["寫景先畫面、再比較、再感覺", "一句對話讓結尾更活"],
  },
];

export const ESSAYS = ESSAY_RAW.map((e) => ({
  ...e,
  words: wordCount(e.body),
}));

export function josekiByN(n) {
  return JOSEKI.find((j) => j.n === n) || null;
}
