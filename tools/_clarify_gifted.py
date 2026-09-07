# -*- coding: utf-8 -*-
"""Clarify vague gifted-bank stems in place."""
import json
import re
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "js" / "gifted-bank.js"
text = p.read_text(encoding="utf-8")

BY_ID = {
    "f017": {
        "q": "一張紙對摺成兩層。只在其中一層剪一個小洞，而且沒剪到摺線。把紙打開後，洞有幾個？",
        "explain": "兩層各一個洞，打開後是 2 個。",
    },
    "f018": {
        "q": "正方形紙先對摺成三角形，再對摺一次。全部打開後，摺痕最接近哪一種？",
        "explain": "兩次對摺常留下交叉的摺痕。",
    },
    "g34f4": {
        "q": "字母 L 每次順時針轉 90 度。轉兩次（共 180 度）後，最像哪一個？",
        "options": ["倒過來的 L", "＋", "○", "還是原來的 L"],
        "explain": "轉兩次等於上下顛倒。",
    },
    "g56f1": {
        "q": "六個正方形：中間一列三個，上面中間再接一個、下面中間再接一個（像十字再多一格）。這樣能不能折成正方體？",
        "options": ["能", "不能", "會變成球", "沒有正方形"],
        "explain": "這種展開圖可以折成正方體。",
    },
    "g56f6": {
        "q": "一個立體從正面看是正方形，從上面看也是正方形。它最可能是什麼？",
        "options": ["正方體", "球", "圓柱", "三角形積木"],
        "explain": "正方體各面都是正方形。",
    },
    "e23-7": {
        "q": "記住：3、0、5、1。倒過來從後面唸是？",
        "explain": "從最後一個往回唸：1、5、0、3。",
    },
    "e34-5": {
        "q": "英文字母順序：K 的下下個是 M，M 的下下個是 P。P 的下下個是？",
        "explain": "每次跳過一個字母：P 下一是 Q，再下是 R。",
    },
    "e56-3": {
        "q": "記住：2、8、2、8、9。前面都是 2、8 反覆，最後一個換成什麼？",
        "explain": "最後一個不是 2 也不是 8，是 9。",
    },
    "e34-x13": {
        "q": "記住：2、4、8、3。哪一個不是「每次乘 2」？",
        "explain": "2×2＝4、4×2＝8，3 不是 8 的兩倍。",
    },
    "m56w1": {
        "q": "汽車 3 小時走 180 公里。平均一小時走幾公里？",
        "explain": "180÷3＝60。",
    },
    "m56w3": {
        "q": "甲和乙的比是 3 比 2。甲是 15 時，乙是多少？",
        "explain": "15÷3×2＝10。",
    },
    "l56a3": {
        "q": "「風像刀子」這種說法，是把風比成刀。這叫什麼？",
        "options": ["比喻（明喻）", "直接罵人", "只寫數字", "問路"],
        "explain": "用「像」把兩件事連起來。",
    },
    "l085": {
        "q": "「書包」兩個字，第一個字選哪一個？",
        "explain": "書包的「書」。",
    },
    "e34-6": {
        "q": "記住方向順序：上、右、下、左。這比較像哪一種轉法？",
        "explain": "上→右→下→左是順時針。",
    },
}


def parse_line(line):
    m = re.match(r"^  \{ (.+) \},?\s*$", line)
    if not m:
        return None
    return m.group(1)


def split_fields(body):
    # id, cat, grade, q, options, answer, explain
    mm = re.match(
        r'id: ("(?:\\.|[^"\\])*"), cat: ("(?:\\.|[^"\\])*"), grade: (\d+), q: ("(?:\\.|[^"\\])*"), options: (\[[^\]]+\]), answer: (\d+), explain: ("(?:\\.|[^"\\])*")',
        body,
    )
    return mm


def dumps_item(obj):
    opts = ", ".join(json.dumps(o, ensure_ascii=False) for o in obj["options"])
    return (
        "  { "
        f"id: {json.dumps(obj['id'])}, cat: {json.dumps(obj['cat'])}, grade: {obj['grade']}, "
        f"q: {json.dumps(obj['q'], ensure_ascii=False)}, options: [{opts}], answer: {obj['answer']}, "
        f"explain: {json.dumps(obj['explain'], ensure_ascii=False)}"
        " },"
    )


out = []
n_fp = n_fr = n_id = 0
for line in text.splitlines():
    mm = split_fields(parse_line(line) or "") if line.startswith("  { id:") else None
    if not mm:
        out.append(line)
        continue
    iid = json.loads(mm.group(1))
    obj = {
        "id": iid,
        "cat": json.loads(mm.group(2)),
        "grade": int(mm.group(3)),
        "q": json.loads(mm.group(4)),
        "options": json.loads(mm.group(5)),
        "answer": int(mm.group(6)),
        "explain": json.loads(mm.group(7)),
    }
    if iid in BY_ID:
        obj.update({k: v for k, v in BY_ID[iid].items()})
        n_id += 1
    if iid.startswith("fp") and obj["options"][-2:] == ["＋", "＝"]:
        used = set(obj["options"][:2])
        extra = [x for x in ["★", "◆", "○", "△", "□", "●"] if x not in used][:2]
        obj["options"] = obj["options"][:2] + extra
        obj["explain"] = "兩種圖形輪流出現，下一個接第二種。"
        n_fp += 1
    mfr = re.match(r"黑色在 (左|中|右)。", obj["q"])
    if iid.startswith("fr") and mfr:
        cur = mfr.group(1)
        nxt = {"左": "中", "中": "右", "右": "左"}[cur]
        rest = [x for x in ("左", "中", "右") if x != nxt]
        obj["q"] = (
            "格子排成一排，只有左、中、右三格。"
            "黑點每次往右邊走一格：在左就走到中，在中就走到右，在右就回到左。"
            f"現在黑點在「{cur}」這一格。再走一步，黑點會到哪一格？"
        )
        obj["options"] = [nxt, rest[0], rest[1], "三格都有"]
        obj["answer"] = 0
        obj["explain"] = "左→中→右→左，這樣循環。"
        n_fr += 1
    if obj["q"].startswith("記住這串，倒過來是？"):
        obj["q"] = obj["q"].replace(
            "記住這串，倒過來是？",
            "記住下面這串數字，從最後一個往回唸，順序是？",
        )
        obj["explain"] = "倒過來＝從右邊唸到左邊。"
    if obj["q"].startswith("記住：") and "第 3 個是" in obj["q"]:
        obj["q"] = obj["q"].replace("第 3 個是？", "從左邊數來第 3 個是哪一個？")
        obj["explain"] = "從左邊第一個開始數。"
    out.append(dumps_item(obj))

p.write_text("\n".join(out) + "\n", encoding="utf-8")
print("fp", n_fp, "fr", n_fr, "id", n_id)
