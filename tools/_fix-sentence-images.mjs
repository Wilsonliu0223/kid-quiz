/**
 * 依「題目主體」重配句子圖（不要只吃答句的 big/small 等形容詞）。
 */
import fs from "node:fs";

/** hint + \t + english → 圖檔 */
const IMAGE_BY_QA = {
  "How's the weather?\tIt is sunny.": "sunny.jpg",
  "How's the weather?\tIt is cloudy.": "cloudy.jpg",
  "How's the weather?\tIt is windy.": "windy.jpg",
  "How's the weather?\tIt is rainy.": "rainy.jpg",
  "How's the weather?\tIt is snowy.": "snowy.jpg",
  "Is it sunny?\tYes, it is sunny.": "sunny.jpg",
  "Is it rainy?\tYes, it is rainy.": "rainy.jpg",
  "Is there a strawberry?\tYes, there is a strawberry.": "strawberry.jpg",
  "Are there two strawberries?\tYes, there are two strawberries.": "strawberry.jpg",
  "Are there many strawberries?\tYes, there are many strawberries.": "strawberry.jpg",
  "Are there many tomatoes?\tYes, there are many tomatoes.": "tomato.jpg",
  "Is there a monkey behind the tree?\tYes, there is a monkey behind the tree.": "monkey.jpg",
  "Are there two monkeys in front of the tree?\tYes, there are two monkeys in front of the tree.": "monkey.jpg",
  "Are there many monkeys near the tree?\tYes, there are many monkeys near the tree.": "monkey.jpg",
  "Is the monkey behind the box?\tNo, it is not behind the box. It is in front of the box.": "monkey.jpg",
  "Is the dog next to the box?\tYes, it is next to the box.": "next-to.jpg",
  "Is the dog on the box?\tYes, it is on the box.": "on.jpg",
  "Is the dog in the box?\tYes, it is in the box.": "in.jpg",
  "Is the dog under the box?\tYes, it is under the box.": "under.jpg",
  "Is the dog between the boxes?\tYes, it is between the boxes.": "between.jpg",
  "How much is it?\tIt is thirty dollars.": "dollars.jpg",
  "How much is the guitar?\tIt is thirty dollars.": "guitar.jpg",
  "Are you a magician?\tNo, I am not a magician. I am a student.": "magician.jpg",
  "Are you a student?\tYes, I am a student.": "student.jpg",
  "Are you magicians?\tNo, we are not magicians. We are students.": "magician.jpg",
  "Are you watching TV?\tYes, I am watching TV.": "watch-tv.jpg",
  "Are you watching TV?\tYes, we are watching TV.": "watch-tv.jpg",
  "Is Lucy watching TV?\tYes, she is watching TV.": "watch-tv.jpg",
  "Can you ride a bike?\tYes, I can ride a bike.": "ride-a-bike.jpg",
  "Can you ride a bike?\tNo, I cannot ride a bike.": "ride-a-bike.jpg",
  "What can you do?\tI can make a cake.": "make-a-cake.jpg",
  "What can Nini do?\tShe can ride a bike.": "ride-a-bike.jpg",
  "Can you make a cake?\tYes, I can make a cake.": "make-a-cake.jpg",
  "Can you fly a kite?\tYes, I can fly a kite.": "fly-a-kite.jpg",
  "Can you take a picture?\tYes, I can take a picture.": "take-a-picture.jpg",
  "Do you have a dog?\tYes, I have a dog.": "dog.jpg",
  "Does he have a dog?\tYes, he has a dog.": "dog.jpg",
  "Does she have a violin?\tYes, she has a violin.": "violin.jpg",
  "What does Abby have?\tShe has a violin.": "violin.jpg",
  "Where are you?\tI am in the bedroom.": "bedroom.jpg",
  "Where are you from?\tI am from Taiwan.": "taiwan.jpg",
  "Are you from the USA?\tYes, I am from the USA.": "the-usa.jpg",
  "Are you from England?\tYes, I am from England.": "england.jpg",
  "Are you from China?\tYes, I am from China.": "china.jpg",
  "Where are you going?\tI am going to the market.": "market.jpg",
  "Where's Nick going?\tHe is going to the library.": "library.jpg",
  "Is she going to the supermarket?\tYes, she is going to the supermarket.": "supermarket.jpg",
  "Where's Tom?\tHe is in the living room.": "living-room.jpg",
  "Is he in the bathroom?\tYes, he is in the bathroom.": "bathroom.jpg",
  "Is she in the kitchen?\tYes, she is in the kitchen.": "kitchen.jpg",
  "Are they in the dining room?\tYes, they are in the dining room.": "dining-room.jpg",
  "Is he in the office?\tYes, he is in the office.": "office.jpg",
  "Is Eric excited?\tNo, he is not excited. He is bored.": "bored.jpg",
  "Is he bored?\tYes, he is bored.": "bored.jpg",
  "Is she rich?\tYes, she is rich.": "rich.jpg",
  "Is he poor?\tYes, he is poor.": "poor.jpg",
  "Is the arm long?\tYes, it is long.": "arm.jpg",
  "Is the foot short?\tYes, it is short.": "foot.jpg",
  "Is the lion big?\tYes, it is big.": "lion.jpg",
  "Is the monkey small?\tYes, it is small.": "monkey.jpg",
  "Is he taking a bath?\tYes, he is taking a bath.": "take-a-bath.jpg",
  "Is she doing her homework?\tYes, she is doing her homework.": "do-my-homework.jpg",
  "Is he riding a bike?\tYes, he is riding a bike.": "ride-a-bike.jpg",
  "Is she flying a kite?\tYes, she is flying a kite.": "fly-a-kite.jpg",
  "Is he taking a picture?\tYes, he is taking a picture.": "take-a-picture.jpg",
  "Is she making a cake?\tYes, she is making a cake.": "make-a-cake.jpg",
  "Can you see?\tYes, I can see.": "see.jpg",
  "Can you hear?\tYes, I can hear.": "hear.jpg",
  "Can you smell?\tYes, I can smell.": "smell.jpg",
  "Where's the teacher?\tHe is in the library.": "teacher.jpg",
  "Is there a piano?\tYes, there is a piano.": "piano.jpg",
  "Are there many bears?\tYes, there are many bears.": "bear.jpg",
  "Is there a tiger?\tYes, there is a tiger.": "tiger.jpg",
};

const lines = fs
  .readFileSync("docs/tj5-unit21-句子-貼上試算表.txt", "utf8")
  .trim()
  .split(/\r?\n/);
const out = ["課次\t類型\t中文\t提示\t英文\t圖片"];
const miss = [];
for (const line of lines.slice(1)) {
  const p = line.split("\t");
  const key = `${p[3].trim()}\t${p[4].trim()}`;
  const file = IMAGE_BY_QA[key];
  if (!file) miss.push(key);
  out.push([p[0], p[1], p[2], p[3], p[4], file ? `assets/tj5-vocab/${file}` : ""].join("\t"));
}
fs.writeFileSync("docs/tj5-unit21-句子-貼上試算表.txt", `${out.join("\n")}\n`, "utf8");
fs.writeFileSync(
  "tools/_sentence-image-map.json",
  JSON.stringify(IMAGE_BY_QA, null, 2),
  "utf8",
);
console.log("rows", out.length - 1, "miss", miss.length);
if (miss.length) console.log(miss);
