import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import IsopodGameAdmin from './admin.jsx';
// ===== Firebase 配置 =====
const firebaseConfig = {
  apiKey: "AIzaSyDzi3KciwtJvbRXZMiNyHwbuHYRSEQPoG4",
  authDomain: "isopods-95355.firebaseapp.com",
  projectId: "isopods-95355",
  storageBucket: "isopods-95355.firebasestorage.app",
  messagingSenderId: "301871631574",
  appId: "1:301871631574:web:db41cf5c196c39c19acd77"
};

let db = null;
let auth = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase未配置，排行榜功能将禁用');
}

// ===== 20张卡片定义 =====
const cardDefinitions = [
  { id: 1, name: "卡片 1", description: "答对1道题目", rarity: "普通", condition: { type: "total_correct", value: 1 }, image: "card_10.png" },
  { id: 2, name: "卡片 2", description: "累计答对10道题目", rarity: "普通", condition: { type: "total_correct", value: 10 }, image: "card_2.png" },
  { id: 3, name: "卡片 3", description: "累计答对30道题目", rarity: "普通", condition: { type: "total_correct", value: 30 }, image: "card_3.png" },
  { id: 4, name: "卡片 4", description: "累计答对50道题目", rarity: "普通", condition: { type: "total_correct", value: 50 }, image: "card_4.png" },
  { id: 5, name: "卡片 5", description: "累计答对100道题目", rarity: "稀有", condition: { type: "total_correct", value: 100 }, image: "card_5.png" },
  { id: 6, name: "卡片 6", description: "简单难度满分1次", rarity: "普通", condition: { type: "perfect_easy", value: 1 }, image: "card_6.png" },
  { id: 7, name: "卡片 7", description: "简单难度累计答对100道题目", rarity: "普通", condition: { type: "easy_correct", value: 100 }, image: "card_7.png" },
  { id: 8, name: "卡片 8", description: "简单难度满分3次", rarity: "稀有", condition: { type: "perfect_easy", value: 3 }, image: "card_8.png" },
  { id: 9, name: "卡片 9", description: "简单难度累计答对200道题目", rarity: "稀有", condition: { type: "easy_correct", value: 200 }, image: "card_9.png" },
  { id: 10, name: "卡片 10", description: "简单难度满分5次", rarity: "稀有", condition: { type: "perfect_easy", value: 5 }, image: "card_1.png" },
  { id: 11, name: "卡片 11", description: "困难难度满分1次", rarity: "稀有", condition: { type: "perfect_hard", value: 1 }, image: "card_11.png" },
  { id: 12, name: "卡片 12", description: "困难难度累计答对50道题目", rarity: "稀有", condition: { type: "hard_correct", value: 50 }, image: "card_12.png" },
  { id: 13, name: "卡片 13", description: "困难难度满分3次", rarity: "非常稀有", condition: { type: "perfect_hard", value: 3 }, image: "card_13.png" },
  { id: 14, name: "卡片 14", description: "困难难度累计答对150道题目", rarity: "非常稀有", condition: { type: "hard_correct", value: 150 }, image: "card_14.png" },
  { id: 15, name: "卡片 15", description: "困难难度满分5次", rarity: "非常稀有", condition: { type: "perfect_hard", value: 5 }, image: "card_15.png" },
  { id: 16, name: "卡片 16", description: "地狱难度满分1次", rarity: "非常稀有", condition: { type: "perfect_hell", value: 1 }, image: "card_16.png" },
  { id: 17, name: "卡片 17", description: "地狱难度累计答对30道题目", rarity: "非常稀有", condition: { type: "hell_correct", value: 30 }, image: "card_17.png" },
  { id: 18, name: "卡片 18", description: "地狱难度满分2次", rarity: "传说", condition: { type: "perfect_hell", value: 2 }, image: "card_18.png" },
  { id: 19, name: "卡片 19", description: "累计答对200道题目（全难度）", rarity: "传说", condition: { type: "total_correct", value: 200 },image: "card_19.png" },
  { id: 20, name: "卡片 20", description: "累计答对300道题目（终极成就）", rarity: "传说", condition: { type: "total_correct", value: 300 }, image: "card_20.png" }
];

// ===== 初始化卡片收集 =====
const initializeCardCollection = () => {
  const saved = localStorage.getItem('card_collection');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    collected_cards: [],
    total_correct: 0,
    easy_correct: 0,
    hard_correct: 0,
    hell_correct: 0,
    perfect_easy: 0,
    perfect_hard: 0,
    perfect_hell: 0,
  };
};




// ===== 音效生成 =====
const playSound = (type) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'correct') {
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'wrong') {
      oscillator.frequency.value = 300;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } else if (type === 'timeout') {
      oscillator.frequency.value = 600;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } else if (type === 'unlock') {
      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    }
  } catch (e) {
    console.log('音效播放失败');
  }
};

// ===== 默认题库 =====
const defaultQuestions = {
  "easy": [
  {
  q: { 
    type: "image", 
    content: "/questions/isopod_木星.png",
    prompt: "這是哪一種鼠婦？"  // ← 加这个说明
  },
  options: [
    { type: "text", content: "熊貓王鼠婦" },
    { type: "text", content: "木星鼠婦" },
    { type: "text", content: "檸檬藍鼠婦" },
    { type: "text", content: "琥珀鼠婦" }
  ],
  correct: 1,
  explanation: "這是木星鼠婦！"
},
{
  q: { 
    type: "image", 
    content: "/questions/isopod_白寫.png",
    prompt: "這是哪一種鼠婦？"  // 
  },
  options: [
    { type: "text", content: "乳牛鼠婦" },
    { type: "text", content: "大麥町鼠婦" },
    { type: "text", content: "白寫鼠婦" },
    { type: "text", content: "雪霸鼠婦" }
  ],
  correct: 2,
  explanation: "這是白寫鼠婦！"
},
{
  q: { 
    type: "image", 
    content: "/questions/公母.png",
    prompt: "這一張圖片公母分辨？"  
  },
  options: [
    { type: "text", content: "左公左公" },
    { type: "text", content: "左公右母" },
    { type: "text", content: "左母右公" },
    { type: "text", content: "左母右母" }
  ],
  correct: 1,
  explanation: "左公右母"
},
{
  q: { 
    type: "text", 
    content: "哪一種是羊蹄角?",
  },
  options: [
    { type: "image", content: "/questions/波羅蜜葉.png" },  // ← 改成图片
    { type: "image", content: "/questions/桑葉.png" },
    { type: "image", content: "/questions/羊蹄角.png" },
    { type: "image", content: "/questions/構樹葉.png" }
  ],
  correct: 2,  // 第一张图片是正确答案
  explanation: "這是羊蹄角"
},
{
  q: { 
    type: "text", 
    content: "哪一種是波羅蜜葉?",
  },
  options: [
    { type: "image", content: "/questions/波羅蜜葉.png" },  // ← 改成图片
    { type: "image", content: "/questions/桑葉.png" },
    { type: "image", content: "/questions/羊蹄角.png" },
    { type: "image", content: "/questions/構樹葉.png" }
  ],
  correct: 0,  // 第一张图片是正确答案
  explanation: "這是波羅蜜葉"
},
 {
      "q": {
        "type": "text",
        "content": "鼠婦盒中那種生物最不容易出現？"
      },
      "options": [
        {
          "type": "text",
          "content": "跳蟲"
        },
        {
          "type": "text",
          "content": "木蚋"
        },
        {
          "type": "text",
          "content": "蟎"
        },
        {
          "type": "text",
          "content": "跳蚤"
        }
      ],
      "correct": 3,
      "explanation": "跳蚤"
    },
	{
      "q": {
        "type": "text",
        "content": "葉子發霉對鼠婦的影響，下面那個無關？"
      },
      "options": [
        {
          "type": "text",
          "content": "可能會躲寶寶"
        },
        {
          "type": "text",
          "content": "苞子有可能造成身體過敏"
        },
        {
          "type": "text",
          "content": "發霉的葉子不會那麼愛吃"
        },
        {
          "type": "text",
          "content": "發霉會更愛吃"
        }
      ],
      "correct": 3,
      "explanation": "發霉會更愛吃無關"
    },
	{
      "q": {
        "type": "text",
        "content": "用土做悶葉的一開始提倡者是誰？"
      },
      "options": [
        {
          "type": "text",
          "content": "米米"
        },
        {
          "type": "text",
          "content": "鳥姐"
        },
        {
          "type": "text",
          "content": "阿米"
        },
        {
          "type": "text",
          "content": "-43"
        }
      ],
      "correct": 1,
      "explanation": "鳥姐"
    },
	 {
      "q": {
        "type": "text",
        "content": "麥飯石功能不含下面那一個？"
      },
      "options": [
        {
          "type": "text",
          "content": "富含礦物質與微量元素"
        },
        {
          "type": "text",
          "content": "具有保水性"
        },
        {
          "type": "text",
          "content": "提供攀爮做運動"
        },
        {
          "type": "text",
          "content": "從石頭上澆水容易滲透至土裡不積水"
        }
      ],
      "correct": 2,
      "explanation": "不含提供攀爮做運動"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦在生物學上屬於哪個門？"
      },
      "options": [
        {
          "type": "text",
          "content": "節肢動物門"
        },
        {
          "type": "text",
          "content": "軟體動物門"
        },
        {
          "type": "text",
          "content": "環節動物門"
        },
        {
          "type": "text",
          "content": "脊索動物門"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦在生物學上屬於節肢動物門"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦屬於節肢動物門中的哪一個亞門？"
      },
      "options": [
        {
          "type": "text",
          "content": "多足亞門"
        },
        {
          "type": "text",
          "content": "甲殼亞門"
        },
        {
          "type": "text",
          "content": "螯肢亞門"
        },
        {
          "type": "text",
          "content": "六足亞門"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦屬於甲殼亞門"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦屬於甲殼亞門的哪一個綱？"
      },
      "options": [
        {
          "type": "text",
          "content": "鰓足綱"
        },
        {
          "type": "text",
          "content": "頭胸綱"
        },
        {
          "type": "text",
          "content": "軟甲綱"
        },
        {
          "type": "text",
          "content": "介形綱"
        }
      ],
      "correct": 2,
      "explanation": "鼠婦屬於軟甲綱"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦屬於軟甲綱的哪一個目？"
      },
      "options": [
        {
          "type": "text",
          "content": "端足目"
        },
        {
          "type": "text",
          "content": "等足目 Isopoda"
        },
        {
          "type": "text",
          "content": "十足目"
        },
        {
          "type": "text",
          "content": "磷蝦目"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦屬於等足目 Isopoda"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦在分類上與龍蝦、螃蟹等水生生物有親緣關係嗎？"
      },
      "options": [
        {
          "type": "text",
          "content": "沒有，完全不同類"
        },
        {
          "type": "text",
          "content": "有，同屬於甲殼類"
        },
        {
          "type": "text",
          "content": "僅遠親，屬於昆蟲類"
        },
        {
          "type": "text",
          "content": "屬於蛛形類"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦與龍蝦、螃蟹同屬於甲殼類"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦與昆蟲最大的生物學差異之一在於鼠婦有幾對步足？"
      },
      "options": [
        {
          "type": "text",
          "content": "3對，共6隻腳"
        },
        {
          "type": "text",
          "content": "5對，共10隻腳"
        },
        {
          "type": "text",
          "content": "7對，共14隻腳"
        },
        {
          "type": "text",
          "content": "9對，共18隻腳"
        }
      ],
      "correct": 2,
      "explanation": "鼠婦有7對步足，共14隻腳"
    },
    {
      "q": {
        "type": "text",
        "content": "悶葉的主要作用是？"
      },
      "options": [
        {
          "type": "text",
          "content": "鼠婦愛好玩"
        },
        {
          "type": "text",
          "content": "放盒裡好看"
        },
        {
          "type": "text",
          "content": "裝飾用而已"
        },
        {
          "type": "text",
          "content": "好吃不發霉"
        }
      ],
      "correct": 3,
      "explanation": "悶葉不易發霉，容易入□"
    },
    {
      "q": {
        "type": "text",
        "content": "一般昆蟲具有翅膀，寵物鼠婦成體是否有翅膀？"
      },
      "options": [
        {
          "type": "text",
          "content": "有一對翅膀"
        },
        {
          "type": "text",
          "content": "有兩對翅膀"
        },
        {
          "type": "text",
          "content": "退化成平衡棒"
        },
        {
          "type": "text",
          "content": "完全沒有"
        }
      ],
      "correct": 3,
      "explanation": "寵物鼠婦成體完全沒有翅膀"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的腹部通常具有類似魚類的什麼構造來進行呼吸？"
      },
      "options": [
        {
          "type": "text",
          "content": "氣管與微氣管"
        },
        {
          "type": "text",
          "content": "書肺"
        },
        {
          "type": "text",
          "content": "偽氣管 / 氣鰓"
        },
        {
          "type": "text",
          "content": "肺泡"
        }
      ],
      "correct": 2,
      "explanation": "鼠婦的腹部通常具有偽氣管或氣鰓來進行呼吸"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦呼吸需要什麼樣的環境條件？"
      },
      "options": [
        {
          "type": "text",
          "content": "必須維持乾燥以避免窒息"
        },
        {
          "type": "text",
          "content": "必須維持濕潤才能進行氣體交換"
        },
        {
          "type": "text",
          "content": "完全無水的高溫環境"
        },
        {
          "type": "text",
          "content": "真空密封環境"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦呼吸必須維持濕潤才能進行氣體交換"
    },
    {
      "q": {
        "type": "text",
        "content": "俗稱的「團子蟲」或「滾蟲」受到驚嚇時會發生什麼事？"
      },
      "options": [
        {
          "type": "text",
          "content": "原地起飛逃跑"
        },
        {
          "type": "text",
          "content": "分泌大量毒液"
        },
        {
          "type": "text",
          "content": "將身體捲曲成完美球體"
        },
        {
          "type": "text",
          "content": "變色與環境融合"
        }
      ],
      "correct": 2,
      "explanation": "團子蟲受到驚嚇時會將身體捲曲成完美球體"
    },
    {
      "q": {
        "type": "text",
        "content": "所有種類的鼠婦都能將身體完全捲成球狀嗎？"
      },
      "options": [
        {
          "type": "text",
          "content": "可以，全部都能"
        },
        {
          "type": "text",
          "content": "不行，只有部分種類可以"
        },
        {
          "type": "text",
          "content": "只有幼體可以，成體不行"
        },
        {
          "type": "text",
          "content": "只有夜晚才可以"
        }
      ],
      "correct": 1,
      "explanation": "只有部分種類的鼠婦可以將身體完全捲成球狀"
    },
    {
      "q": {
        "type": "text",
        "content": "當無法完全捲成球狀時，鼠婦通常會採取什麼防禦姿態？"
      },
      "options": [
        {
          "type": "text",
          "content": "平趴貼地或逃竄，部分會假死"
        },
        {
          "type": "text",
          "content": "主動向敵人發動攻擊"
        },
        {
          "type": "text",
          "content": "將身體高高豎起"
        },
        {
          "type": "text",
          "content": "發出高頻聲音嚇退敵害"
        }
      ],
      "correct": 0,
      "explanation": "無法完全捲成球狀時，鼠婦通常會平趴貼地或逃竄，部分會假死"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦在生態系中扮演什麼角色，主要加速有機質分解？"
      },
      "options": [
        {
          "type": "text",
          "content": "頂級掠食者"
        },
        {
          "type": "text",
          "content": "初級生產者"
        },
        {
          "type": "text",
          "content": "清道夫 / 分解者"
        },
        {
          "type": "text",
          "content": "傳授花粉者"
        }
      ],
      "correct": 2,
      "explanation": "鼠婦在生態系中扮演清道夫或分解者"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養寵物鼠婦時，飼養箱內最重要的鋪底介質是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "純沙子石礫"
        },
        {
          "type": "text",
          "content": "腐植土 / 泥炭土 / 椰纖土"
        },
        {
          "type": "text",
          "content": "木屑"
        },
        {
          "type": "text",
          "content": "衛生紙"
        }
      ],
      "correct": 1,
      "explanation": "飼養寵物鼠婦時最重要的鋪底介質是腐植土、泥炭土或椰纖土"
    },
    {
      "q": {
        "type": "text",
        "content": "為了提供鼠婦鈣質與磨牙、硬化外殼，飼養箱內必須長期放置什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "墨魚骨 / 鈣塊"
        },
        {
          "type": "text",
          "content": "鐵塊"
        },
        {
          "type": "text",
          "content": "木片"
        },
        {
          "type": "text",
          "content": "指甲"
        }
      ],
      "correct": 0,
      "explanation": "飼養箱內必須長期放置墨魚骨或鈣塊以提供鈣質"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養環境中不可或缺的碳源與躲避處是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "塑膠玩具"
        },
        {
          "type": "text",
          "content": "落葉 / 枯葉"
        },
        {
          "type": "text",
          "content": "金屬網"
        },
        {
          "type": "text",
          "content": "海綿"
        }
      ],
      "correct": 1,
      "explanation": "飼養環境中不可或缺的碳源與躲避處是落葉或枯葉"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦在成長過程中會分段脫去外殼，這種現象稱為甚麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "變態"
        },
        {
          "type": "text",
          "content": "蛻皮 / 脫殼 Ecdysis"
        },
        {
          "type": "text",
          "content": "羽化"
        },
        {
          "type": "text",
          "content": "休眠"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦分段脫去外殼的現象稱為蛻皮或脫殼"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的蛻皮過程通常是分幾次完成的？"
      },
      "options": [
        {
          "type": "text",
          "content": "一次性直接脫完"
        },
        {
          "type": "text",
          "content": "分前後兩段，俗稱「分段蛻皮」"
        },
        {
          "type": "text",
          "content": "分三段脫完"
        },
        {
          "type": "text",
          "content": "分四段脫完"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦的蛻皮過程通常分前後兩段完成"
    },
    {
      "q": {
        "type": "text",
        "content": "剛蛻皮完的鼠婦外殼通常呈現什麼狀態？"
      },
      "options": [
        {
          "type": "text",
          "content": "堅硬且呈深黑色"
        },
        {
          "type": "text",
          "content": "柔軟、呈白色或半透明"
        },
        {
          "type": "text",
          "content": "帶有刺狀硬殼"
        },
        {
          "type": "text",
          "content": "完全消失沒有外殼"
        }
      ],
      "correct": 1,
      "explanation": "剛蛻皮完的鼠婦外殼柔軟、呈白色或半透明"
    },
    {
      "q": {
        "type": "text",
        "content": "剛蛻皮的鼠婦會將自己脫下來的舊殼怎麼處理？"
      },
      "options": [
        {
          "type": "text",
          "content": "直接丟棄不管"
        },
        {
          "type": "text",
          "content": "埋入土裡做肥料"
        },
        {
          "type": "text",
          "content": "通常會吃掉以回收鈣質與營養"
        },
        {
          "type": "text",
          "content": "送給同伴吃"
        }
      ],
      "correct": 2,
      "explanation": "剛蛻皮的鼠婦通常會吃掉舊殼以回收鈣質與營養"
    },
    {
      "q": {
        "type": "text",
        "content": "絕大多數寵物鼠婦適宜的環境溫度大約落在攝氏幾度之間？"
      },
      "options": [
        {
          "type": "text",
          "content": "10°C 至 15°C 左右"
        },
        {
          "type": "text",
          "content": "20°C 至 28°C 左右"
        },
        {
          "type": "text",
          "content": "32°C 至 40°C 左右"
        },
        {
          "type": "text",
          "content": "40°C 以上"
        }
      ],
      "correct": 1,
      "explanation": "絕大多數寵物鼠婦適宜的環境溫度大約在 20°C 至 28°C 左右"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養環境若長期處於高溫（如超過 30°C 以上）對多數鼠婦會造成什麼影響？"
      },
      "options": [
        {
          "type": "text",
          "content": "生長速度變快數倍"
        },
        {
          "type": "text",
          "content": "顏色變得更鮮豔"
        },
        {
          "type": "text",
          "content": "容易熱衰竭死亡"
        },
        {
          "type": "text",
          "content": "進入冬眠狀態"
        }
      ],
      "correct": 2,
      "explanation": "長期處於高溫容易導致多數鼠婦熱衰竭死亡"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養盒內通常需要設置什麼來平衡濕度？"
      },
      "options": [
        {
          "type": "text",
          "content": "全乾沙灘區"
        },
        {
          "type": "text",
          "content": "完全淹水區"
        },
        {
          "type": "text",
          "content": "乾濕分離區 / 局部保濕水苔"
        },
        {
          "type": "text",
          "content": "強力烘乾機"
        }
      ],
      "correct": 2,
      "explanation": "飼養盒內通常需要設置乾濕分離區或局部保濕水苔來平衡濕度"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼不能讓整個鼠婦飼養盒長期處於滴水的大水淹狀態？"
      },
      "options": [
        {
          "type": "text",
          "content": "會導致鼠婦窒息死亡"
        },
        {
          "type": "text",
          "content": "會讓鼠婦長出翅膀"
        },
        {
          "type": "text",
          "content": "會使鼠婦體型變大"
        },
        {
          "type": "text",
          "content": "會將鼠婦洗乾淨"
        }
      ],
      "correct": 0,
      "explanation": "長期處於大水淹狀態會導致鼠婦窒息死亡"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的主要食物來源之一，可以用來補充蛋白質的是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "塑膠廢料"
        },
        {
          "type": "text",
          "content": "枯木 / 白木 / 魚飼料 / 昆蟲凍餌"
        },
        {
          "type": "text",
          "content": "純淨自來水"
        },
        {
          "type": "text",
          "content": "細沙"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦可食用枯木、白木、魚飼料或昆蟲凍餌來補充蛋白質"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦喜歡陰暗潮濕的環境，牠們對強烈光線有什麼行為反應？"
      },
      "options": [
        {
          "type": "text",
          "content": "正趨光性，會主動靠近光源"
        },
        {
          "type": "text",
          "content": "負趨光性，會迅速逃往陰暗處"
        },
        {
          "type": "text",
          "content": "完全不受光線影響"
        },
        {
          "type": "text",
          "content": "見到強光會唱歌"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦具有負趨光性，會迅速逃往陰暗處"
    },
    {
      "q": {
        "type": "text",
        "content": "常見超會生的「橘色鼠婦」屬於哪一種常見的基礎入門品種？"
      },
      "options": [
        {
          "type": "text",
          "content": "橘光滑鼠婦"
        },
        {
          "type": "text",
          "content": "黃頭鴨"
        },
        {
          "type": "text",
          "content": "斑馬鼠婦"
        },
        {
          "type": "text",
          "content": "熊貓鼠婦"
        }
      ],
      "correct": 0,
      "explanation": "橘色鼠婦屬於橘色光滑鼠婦 (Porcellio laevis 'Orange')"
    },
    {
      "q": {
        "type": "text",
        "content": "熊貓王鼠婦的學名所屬屬別為何？"
      },
      "options": [
        {
          "type": "text",
          "content": "Cubaris"
        },
        {
          "type": "text",
          "content": "Armadillidium"
        },
        {
          "type": "text",
          "content": "Porcellio laevis"
        },
        {
          "type": "text",
          "content": "Merulanella"
        }
      ],
      "correct": 0,
      "explanation": "熊貓王鼠婦的學名屬於 Cubaris sp. Panda King"
    },
    {
      "q": {
        "type": "text",
        "content": "乳牛鼠婦（Dairy Cow）具有什麼外觀特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "全透明無色"
        },
        {
          "type": "text",
          "content": "白色身體帶有不規則黑色斑點"
        },
        {
          "type": "text",
          "content": "鮮紅色帶黃條紋"
        },
        {
          "type": "text",
          "content": "深藍色帶螢光"
        }
      ],
      "correct": 1,
      "explanation": "乳牛鼠婦具有白色身體帶不規則黑色斑點的外觀"
    },
    {
      "q": {
        "type": "text",
        "content": "乳牛鼠婦的繁殖能力與生長速度通常如何？"
      },
      "options": [
        {
          "type": "text",
          "content": "極快、食量大、非常多產"
        },
        {
          "type": "text",
          "content": "極慢、數年才生一次"
        },
        {
          "type": "text",
          "content": "無法在人工環境繁殖"
        },
        {
          "type": "text",
          "content": "一生只產一隻幼體"
        }
      ],
      "correct": 0,
      "explanation": "乳牛鼠婦的繁殖能力極快、食量大且非常多產"
    },
    {
      "q": {
        "type": "text",
        "content": "下面那一種是土王？"
      },
      "options": [
        {
          "type": "text",
          "content": "木星"
        },
        {
          "type": "text",
          "content": "大新三色"
        },
        {
          "type": "text",
          "content": "螢火蟲"
        },
        {
          "type": "text",
          "content": "琥珀"
        }
      ],
      "correct": 1,
      "explanation": "大新三色土王"
    },
    {
      "q": {
        "type": "text",
        "content": "俗稱「捲球鼠婦」的代表性常見種，學名為什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "Armadillidium vulgare"
        },
        {
          "type": "text",
          "content": "Trichorhina tomentosa"
        },
        {
          "type": "text",
          "content": "Porcellio dilatatus"
        },
        {
          "type": "text",
          "content": "Cubaris murina"
        }
      ],
      "correct": 0,
      "explanation": "捲球鼠婦的代表性常見種學名為 Armadillidium vulgare"
    },
    {
      "q": {
        "type": "text",
        "content": "捲球鼠婦（Armadillidium vulgare）最經典的野生斑紋是什麼顏色？"
      },
      "options": [
        {
          "type": "text",
          "content": "亮桃紅色帶紫點"
        },
        {
          "type": "text",
          "content": "灰黑帶有黃白色小斑點"
        },
        {
          "type": "text",
          "content": "純白色無雜斑"
        },
        {
          "type": "text",
          "content": "螢光綠帶黑條紋"
        }
      ],
      "correct": 1,
      "explanation": "捲球鼠婦最經典的野生斑紋為灰黑帶有黃白色小斑點"
    },
    {
      "q": {
        "type": "text",
        "content": "斑馬鼠婦（Armadillidium maculatum）的外觀有什麼顯著特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "黃底帶有明顯的黑色直條紋，像斑馬"
        },
        {
          "type": "text",
          "content": "全身長滿尖刺"
        },
        {
          "type": "text",
          "content": "擁有巨大像螃蟹的雙螯"
        },
        {
          "type": "text",
          "content": "身體呈透明圓形"
        }
      ],
      "correct": 0,
      "explanation": "斑馬鼠婦外觀為黃底帶有明顯的黑色直條紋"
    },
    {
      "q": {
        "type": "text",
        "content": "斑馬鼠婦原產於哪一個國家？"
      },
      "options": [
        {
          "type": "text",
          "content": "日本北海道"
        },
        {
          "type": "text",
          "content": "克羅埃西亞等地中海區域"
        },
        {
          "type": "text",
          "content": "巴西熱帶雨林"
        },
        {
          "type": "text",
          "content": "冰島火山區"
        }
      ],
      "correct": 1,
      "explanation": "斑馬鼠婦原產於克羅埃西亞等地中海區域"
    },
    {
      "q": {
        "type": "text",
        "content": "白侏儒鼠婦（Trichorhina tomentosa）在生態缸（Bioactive setup）中常被當作什麼角色？"
      },
      "options": [
        {
          "type": "text",
          "content": "清潔大隊 / 活餌 / 清除線蟲與黴菌"
        },
        {
          "type": "text",
          "content": "觀賞花卉裝飾"
        },
        {
          "type": "text",
          "content": "空氣淨化器"
        },
        {
          "type": "text",
          "content": "土壤挖掘機"
        }
      ],
      "correct": 0,
      "explanation": "白侏儒鼠婦在生態缸中常被當作清潔大隊與清除線蟲黴菌的角色"
    },
    {
      "q": {
        "type": "text",
        "content": "白侏儒鼠婦是否能夠將身體捲成球狀？"
      },
      "options": [
        {
          "type": "text",
          "content": "可以，捲得很完美"
        },
        {
          "type": "text",
          "content": "不能"
        },
        {
          "type": "text",
          "content": "只有受傷時可以"
        },
        {
          "type": "text",
          "content": "老了以後才能"
        }
      ],
      "correct": 1,
      "explanation": "侏儒白鼠婦不能將身體捲成球狀"
    },
    {
      "q": {
        "type": "text",
        "content": "絕大多數的白侏儒鼠婦（Trichorhina tomentosa）性別組成通常全都是什麼性別？"
      },
      "options": [
        {
          "type": "text",
          "content": "全部都是雄性"
        },
        {
          "type": "text",
          "content": "雌雄各半"
        },
        {
          "type": "text",
          "content": "雌性，透過孤雌生殖繁殖"
        },
        {
          "type": "text",
          "content": "無性別可言"
        }
      ],
      "correct": 2,
      "explanation": "絕大多數白侏儒鼠婦全都是雌性，透過孤雌生殖繁殖"
    },
    {
      "q": {
        "type": "text",
        "content": "觀賞寵物鼠婦時，飼養容器通常需要具備什麼設計以維持空氣流通？"
      },
      "options": [
        {
          "type": "text",
          "content": "通風孔 / 透氣網"
        },
        {
          "type": "text",
          "content": "完全密封無孔洞"
        },
        {
          "type": "text",
          "content": "水冷循環扇"
        },
        {
          "type": "text",
          "content": "高溫加熱器"
        }
      ],
      "correct": 0,
      "explanation": "飼養容器需要具備通風孔或透氣網以維持空氣流通"
    },
    {
      "q": {
        "type": "text",
        "content": "如果飼養盒完全密閉且沒有通風，會導致什麼問題？"
      },
      "options": [
        {
          "type": "text",
          "content": "鼠婦會長得更胖"
        },
        {
          "type": "text",
          "content": "悶熱、滋生細菌、二氧化碳過高致死"
        },
        {
          "type": "text",
          "content": "完全沒有影響"
        },
        {
          "type": "text",
          "content": "鼠婦會學會冬眠"
        }
      ],
      "correct": 1,
      "explanation": "完全密閉無通風會導致悶熱、滋生細菌與二氧化碳過高致死"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的糞便外觀通常呈現什麼形狀？"
      },
      "options": [
        {
          "type": "text",
          "content": "圓球形小珍珠"
        },
        {
          "type": "text",
          "content": "細長的絲狀物"
        },
        {
          "type": "text",
          "content": "微小的長條狀顆粒"
        },
        {
          "type": "text",
          "content": "液態狀黏液"
        }
      ],
      "correct": 2,
      "explanation": "鼠婦的糞便外觀通常呈現微小的長條狀顆粒"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦幼體（Mancae）剛出生時，外觀與成體有何差異？"
      },
      "options": [
        {
          "type": "text",
          "content": "顏色較淡、體型極小、少一對步足"
        },
        {
          "type": "text",
          "content": "外殼已經非常堅硬且呈黑色"
        },
        {
          "type": "text",
          "content": "比成體還要大兩倍"
        },
        {
          "type": "text",
          "content": "長有成對的翅膀"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦幼體剛出生時顏色較淡、體型極小且少一對步足"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦幼體剛孵化時通常是由母體的什麼構造保護？"
      },
      "options": [
        {
          "type": "text",
          "content": "背上的硬殼"
        },
        {
          "type": "text",
          "content": "育幼囊 / Marsupium"
        },
        {
          "type": "text",
          "content": "口器中的暫存袋"
        },
        {
          "type": "text",
          "content": "尾巴的氣泡"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦幼體剛孵化時由母體的育幼囊保護"
    },
    {
      "q": {
        "type": "text",
        "content": "母鼠婦腹部的育幼囊位於哪裡？"
      },
      "options": [
        {
          "type": "text",
          "content": "頭部的下方口器旁"
        },
        {
          "type": "text",
          "content": "腹部腹面的育兒袋結構"
        },
        {
          "type": "text",
          "content": "尾節的末端"
        },
        {
          "type": "text",
          "content": "背甲的正中央"
        }
      ],
      "correct": 1,
      "explanation": "母鼠婦的育幼囊位於腹部腹面的育兒袋結構"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦是否屬於昆蟲？"
      },
      "options": [
        {
          "type": "text",
          "content": "是，屬於節肢動物門昆蟲綱"
        },
        {
          "type": "text",
          "content": "不是，是甲殼類"
        },
        {
          "type": "text",
          "content": "屬於軟體動物"
        },
        {
          "type": "text",
          "content": "屬於環節動物"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦不是昆蟲，而是甲殼類"
    },
    {
      "q": {
        "type": "text",
        "content": "寵物鼠婦死亡時，外殼通常會變成麼顏色？"
      },
      "options": [
        {
          "type": "text",
          "content": "變得更加烏黑發亮"
        },
        {
          "type": "text",
          "content": "通常會變成粉紅色、橘紅色或全白色"
        },
        {
          "type": "text",
          "content": "變成螢光綠色"
        },
        {
          "type": "text",
          "content": "外殼完全透明消失"
        }
      ],
      "correct": 1,
      "explanation": "寵物鼠婦死亡時外殼通常會變成粉紅色、橘紅色或全白色"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼飼養鼠婦需要鋪設一定深度的底土（例如 5 公分以上）？"
      },
      "options": [
        {
          "type": "text",
          "content": "為了讓鼠婦玩耍"
        },
        {
          "type": "text",
          "content": "提供挖洞、保濕與產卵空間"
        },
        {
          "type": "text",
          "content": "防止飼養箱重量太輕"
        },
        {
          "type": "text",
          "content": "讓植物長得更快"
        }
      ],
      "correct": 1,
      "explanation": "鋪設一定深度的底土可以提供挖洞、保濕與產卵空間"
    },
    {
      "q": {
        "type": "text",
        "content": "餵食鼠婦蔬菜時，最需要注意什麼食安問題？"
      },
      "options": [
        {
          "type": "text",
          "content": "農藥殘留，必須清洗乾淨並擦乾"
        },
        {
          "type": "text",
          "content": "蔬菜必須煮熟並加鹽調味"
        },
        {
          "type": "text",
          "content": "只能餵食有機高級水果"
        },
        {
          "type": "text",
          "content": "蔬菜必須先冷凍三天"
        }
      ],
      "correct": 0,
      "explanation": "餵食蔬菜最需要注意農藥殘留，必須清洗乾淨並擦乾"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦可以餵食水果嗎？可以，但需要注意什麼現象？"
      },
      "options": [
        {
          "type": "text",
          "content": "容易腐爛長果蠅或發霉，需適量餵食並盡快清除殘渣"
        },
        {
          "type": "text",
          "content": "水果會讓鼠婦中毒身亡"
        },
        {
          "type": "text",
          "content": "水果會使鼠婦外殼脫落"
        },
        {
          "type": "text",
          "content": "完全不需要清理殘渣"
        }
      ],
      "correct": 0,
      "explanation": "餵食水果需注意容易腐爛長果蠅或發霉，應適量餵食並盡快清除殘渣"
    }
  ],
  "hard": [
    {
      "q": {
        "type": "text",
        "content": "下面那個不能增色木星/檸檬藍？"
      },
      "options": [
        {
          "type": "text",
          "content": "養在暗處"
        },
        {
          "type": "text",
          "content": "餵食藍綠藻（又稱螺旋藻）"
        },
        {
          "type": "text",
          "content": "餵食蛋白質飼料"
        },
        {
          "type": "text",
          "content": "餵食增豔食物，如南極蝦乾、南瓜、胡蘿蔔"
        }
      ],
      "correct": 2,
      "explanation": "餵食蛋白質飼料"
    },
	{
      "q": {
        "type": "text",
        "content": "鼠婦在陸地生活面臨的最大生理挑戰是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "水分蒸發與排泄物氨氣處理"
        },
        {
          "type": "text",
          "content": "尋找適合的飛行獵物"
        },
        {
          "type": "text",
          "content": "抵抗紫外線輻射傷害"
        },
        {
          "type": "text",
          "content": "維持體溫恆定與冬眠"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦在陸地生活面臨的最大生理挑戰是水分蒸發與排泄物氨氣處理"
    },
    {
      "q": {
        "type": "text",
        "content": "陸生等足類動物（鼠婦）的排泄主要以哪種形式排出以節省水分？"
      },
      "options": [
        {
          "type": "text",
          "content": "大量清澈的稀釋尿液"
        },
        {
          "type": "text",
          "content": "氨氣直接氣化或排出固態尿酸/氨鹽"
        },
        {
          "type": "text",
          "content": "完全不排泄廢物"
        },
        {
          "type": "text",
          "content": "經由口器吐出結晶體"
        }
      ],
      "correct": 1,
      "explanation": "陸生等足類主要以氨氣直接氣化或排出固態尿酸/氨鹽來節省水分"
    },
    {
      "q": {
        "type": "text",
        "content": "根據寵物飼養的分類習慣，常見的陸生鼠婦主要可劃分為哪四大科？"
      },
      "options": [
        {
          "type": "text",
          "content": "Armadillidae 卷甲蟲科、Armadillidiidae 球鼠婦科、Porcellionidae 鼠婦科、Philosciidae 平滑鼠婦科"
        },
        {
          "type": "text",
          "content": "昆蟲綱、甲殼綱、多足綱、蛛形綱"
        },
        {
          "type": "text",
          "content": "陸棲科、水棲科、洞穴科、沙漠科"
        },
        {
          "type": "text",
          "content": "捲球科、跳躍科、攀爬科、鑽地科"
        }
      ],
      "correct": 0,
      "explanation": "常見的陸生鼠婦主要可劃分為 Armadillidae、Armadillidiidae、Porcellionidae、Philosciidae 四大科"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris 屬（例如黃頭鴨、熊貓鼠婦等）在環境濕度需求上有什麼顯著特點？"
      },
      "options": [
        {
          "type": "text",
          "content": "喜歡極度乾燥通風的環境"
        },
        {
          "type": "text",
          "content": "對濕度要求極高，通常需要高濕且穩定的環境"
        },
        {
          "type": "text",
          "content": "完全不需要水份只需食物"
        },
        {
          "type": "text",
          "content": "嚴格的乾濕分離區"
        }
      ],
      "correct": 1,
      "explanation": "Cubaris 屬對濕度要求極高，通常需要高濕且穩定的環境"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium 屬的鼠婦相較於 Cubaris 屬，對於通風與乾燥的耐受性如何？"
      },
      "options": [
        {
          "type": "text",
          "content": "耐受性較好，適應中等濕度"
        },
        {
          "type": "text",
          "content": "完全不能接觸任何空氣"
        },
        {
          "type": "text",
          "content": "比 Cubaris 更容易乾燥死亡"
        },
        {
          "type": "text",
          "content": "必須完全泡在水中"
        }
      ],
      "correct": 0,
      "explanation": "Armadillidium 屬對通風與乾燥的耐受性較好，適應中等濕度"
    },
    {
      "q": {
        "type": "text",
        "content": "Porcellio 屬（如希臘寬邊、檸檬黃鼠婦等）在佈置飼養盒時，最適宜採用哪種環境配置？"
      },
      "options": [
        {
          "type": "text",
          "content": "全盒保持潮濕"
        },
        {
          "type": "text",
          "content": "全盒保持乾燥少水"
        },
        {
          "type": "text",
          "content": "嚴格的乾濕分離區"
        },
        {
          "type": "text",
          "content": "看心情給水"
        }
      ],
      "correct": 2,
      "explanation": "Porcellio 屬最適宜採用嚴格的乾濕分離區，一端極濕、一端偏乾"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養環境中的 7 大關鍵環境因子分別為：通風、基質深度、基質濕度、落葉、木頭、墨魚骨以及什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "塑膠玩具"
        },
        {
          "type": "text",
          "content": "水苔 / Sphagnum moss"
        },
        {
          "type": "text",
          "content": "細沙石礫"
        },
        {
          "type": "text",
          "content": "人工化學肥料"
        }
      ],
      "correct": 1,
      "explanation": "飼養環境的 7 大關鍵環境因子包含水苔 / Sphagnum moss"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris sp. \"Rubber Ducky\"（黃頭鴨鼠婦）最著名的產地來自哪一個國家？"
      },
      "options": [
        {
          "type": "text",
          "content": "泰國"
        },
        {
          "type": "text",
          "content": "西班牙"
        },
        {
          "type": "text",
          "content": "義大利"
        },
        {
          "type": "text",
          "content": "日本"
        }
      ],
      "correct": 0,
      "explanation": "黃頭鴨鼠婦最著名的產地來自泰國"
    },
    {
      "q": {
        "type": "text",
        "content": "黃頭鴨鼠婦（Rubber Ducky）的頭部前端外觀因為神似哪一種動物而得名？"
      },
      "options": [
        {
          "type": "text",
          "content": "小黃鴨的嘴喙"
        },
        {
          "type": "text",
          "content": "兔子的大耳朵"
        },
        {
          "type": "text",
          "content": "貓咪的鬍鬚"
        },
        {
          "type": "text",
          "content": "大象的鼻子"
        }
      ],
      "correct": 0,
      "explanation": "橡膠鴨仔鼠婦因頭部前端外觀神似小黃鴨的嘴喙而得名"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris sp. \"Panda King\"（熊貓王鼠婦）的頭部與尾端具有什麼標誌性色彩？"
      },
      "options": [
        {
          "type": "text",
          "content": "全身純粹的金黃色"
        },
        {
          "type": "text",
          "content": "黑白相間，頭部有如熊貓黑眼圈的斑塊"
        },
        {
          "type": "text",
          "content": "螢光綠色的條紋"
        },
        {
          "type": "text",
          "content": "全透明的粉紅色"
        }
      ],
      "correct": 1,
      "explanation": "熊貓王鼠婦具有黑白相間、頭部有如熊貓黑眼圈的斑塊標誌性色彩"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium gestroi（法國四紋鼠婦）原產於哪裡？"
      },
      "options": [
        {
          "type": "text",
          "content": "義大利 / 地中海區域"
        },
        {
          "type": "text",
          "content": "南美洲雨林"
        },
        {
          "type": "text",
          "content": "北美洲沙漠"
        },
        {
          "type": "text",
          "content": "法國"
        }
      ],
      "correct": 0,
      "explanation": "法國四紋鼠婦原產於義大利等地中海區域"
    },
    {
      "q": {
        "type": "text",
        "content": "法國四紋鼠婦（Armadillidium gestroi）背甲上佈滿了什麼形狀的鮮黃色斑紋？"
      },
      "options": [
        {
          "type": "text",
          "content": "不規則的亮黃色斑塊或圓斑"
        },
        {
          "type": "text",
          "content": "整齊的方格條紋"
        },
        {
          "type": "text",
          "content": "星形閃爍斑點"
        },
        {
          "type": "text",
          "content": "直線狀斑馬紋"
        }
      ],
      "correct": 0,
      "explanation": "黃斑巨球鼠婦背甲佈滿不規則的亮黃色斑塊或圓斑"
    },
    {
      "q": {
        "type": "text",
        "content": "Porcellio屬鼠婦的體型在常見屬中具有什麼特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "體寬較寬、體型扁平、體型較大"
        },
        {
          "type": "text",
          "content": "極度細長如針狀"
        },
        {
          "type": "text",
          "content": "圓球狀完全無扁平感"
        },
        {
          "type": "text",
          "content": "微小如灰塵的尺寸"
        }
      ],
      "correct": 0,
      "explanation": "Porcellio屬鼠婦具有體寬較寬、體型扁平且體型較大的特徵"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium klugii（黑山白點）背甲有什麼鮮豔裝飾？"
      },
      "options": [
        {
          "type": "text",
          "content": "帶有橘紅色或黃色的小白點及邊緣色彩"
        },
        {
          "type": "text",
          "content": "純黑色的單調外殼"
        },
        {
          "type": "text",
          "content": "巨大如鹿角般的突起"
        },
        {
          "type": "text",
          "content": "透明無色的螢光"
        }
      ],
      "correct": 0,
      "explanation": "黑山白點鼠婦背甲帶有橘紅色或黃色的小白點及邊緣色彩"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的頭部附肢中，哪一對觸角特別發達且具有強烈的觸覺與嗅覺功能？"
      },
      "options": [
        {
          "type": "text",
          "content": "第一對觸角"
        },
        {
          "type": "text",
          "content": "第二對觸角"
        },
        {
          "type": "text",
          "content": "第三對觸角"
        },
        {
          "type": "text",
          "content": "所有的觸角都一樣"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦的第二對觸角特別發達且具有強烈的觸覺與嗅覺功能"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的第一對觸角在演化上呈現什麼狀態？"
      },
      "options": [
        {
          "type": "text",
          "content": "極度退化、短小"
        },
        {
          "type": "text",
          "content": "異常巨大且分岔"
        },
        {
          "type": "text",
          "content": "演化成翅膀構造"
        },
        {
          "type": "text",
          "content": "完全消失不見"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的第一對觸角在演化上呈現極度退化、短小的狀態"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的眼睛屬於哪一種結構？"
      },
      "options": [
        {
          "type": "text",
          "content": "單眼，視力極佳"
        },
        {
          "type": "text",
          "content": "複眼，但視力較差，主要依賴化學感覺與觸覺"
        },
        {
          "type": "text",
          "content": "完全沒有視覺器官"
        },
        {
          "type": "text",
          "content": "具有熱感應的脊椎眼"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦的眼睛屬於複眼，但視力較差，主要依賴化學感覺與觸覺"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦體表的幾丁質外骨骼含有哪一種成分來增加硬度？"
      },
      "options": [
        {
          "type": "text",
          "content": "碳酸鈣"
        },
        {
          "type": "text",
          "content": "氯化鈉"
        },
        {
          "type": "text",
          "content": "磷酸鐵"
        },
        {
          "type": "text",
          "content": "矽酸鹽"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦體表的幾丁質外骨骼含有碳酸鈣來增加硬度"
    },
    {
      "q": {
        "type": "text",
        "content": "脫殼時若鈣質攝取不足或濕度不對，鼠婦容易發生什麼致命狀況？"
      },
      "options": [
        {
          "type": "text",
          "content": "卡殼 / 舊殼無法順利脫落導致死亡"
        },
        {
          "type": "text",
          "content": "外殼瞬間變成金屬色"
        },
        {
          "type": "text",
          "content": "體型無限制膨脹"
        },
        {
          "type": "text",
          "content": "長出多餘的步足"
        }
      ],
      "correct": 0,
      "explanation": "脫殼時鈣質不足或濕度不對容易發生卡殼，導致舊殼無法順利脫落而死亡"
    },
    {
      "q": {
        "type": "text",
        "content": "什麼是鼠婦的「育兒囊（Marsupium）」？"
      },
      "options": [
        {
          "type": "text",
          "content": "頭部用來儲存食物的囊袋"
        },
        {
          "type": "text",
          "content": "由雌性腹面特化的育兒板組成的口袋狀結構"
        },
        {
          "type": "text",
          "content": "背部用來防禦的空氣室"
        },
        {
          "type": "text",
          "content": "尾節末端的排泄囊"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦的育兒囊是由雌性腹面特化的育兒板組成的口袋狀結構"
    },
    {
      "q": {
        "type": "text",
        "content": "雌鼠婦產卵後，卵會直接排入育兒囊中，幼體在其中孵化直到什麼時候離開？"
      },
      "options": [
        {
          "type": "text",
          "content": "發育至具備自由活動能力的幼體階段才釋出"
        },
        {
          "type": "text",
          "content": "卵剛產下幾分鐘就離開"
        },
        {
          "type": "text",
          "content": "長成成體並準備交配時才離開"
        },
        {
          "type": "text",
          "content": "完全不需要待在育兒囊中"
        }
      ],
      "correct": 0,
      "explanation": "幼體在育兒囊中孵化，直到發育至具備自由活動能力的幼體階段才釋出"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼有些野生鼠婦捕捉後在人工環境下極難適應而全數死亡？"
      },
      "options": [
        {
          "type": "text",
          "content": "對微氣候、共生菌群或壓力極度敏感"
        },
        {
          "type": "text",
          "content": "人工飼料太營養導致撐死"
        },
        {
          "type": "text",
          "content": "見到人類會產生焦慮抗拒進食"
        },
        {
          "type": "text",
          "content": "人工環境的重力與野外不同"
        }
      ],
      "correct": 0,
      "explanation": "野生個體對微氣候、共生菌群或壓力極度敏感，因此極難適應人工環境"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養箱中若出現大量小圓形的白色跳蟲（Collembola），對鼠婦飼養環境有什麼正面幫助？"
      },
      "options": [
        {
          "type": "text",
          "content": "分解排泄物、抑制黴菌滋生"
        },
        {
          "type": "text",
          "content": "把鼠婦全部吃掉以控制數量"
        },
        {
          "type": "text",
          "content": "提供鼠婦伙食來源"
        },
        {
          "type": "text",
          "content": "提高飼養箱的溫度"
        }
      ],
      "correct": 0,
      "explanation": "白色跳蟲能分解排泄物並抑制黴菌滋生，對飼養環境有正面幫助"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養箱中如果爆發有害的「粉蟎（Mites）」或「線蟲」，通常是由於環境出現了什麼問題？"
      },
      "options": [
        {
          "type": "text",
          "content": "過度潮濕、蛋白質食物腐敗未清理"
        },
        {
          "type": "text",
          "content": "飼養箱內部過度乾燥缺水"
        },
        {
          "type": "text",
          "content": "通風良好且溫度太低"
        },
        {
          "type": "text",
          "content": "墨魚骨放得太多"
        }
      ],
      "correct": 0,
      "explanation": "粉蟎或線蟲爆發通常是由於過度潮濕、蛋白質食物腐敗未清理"
    },
    {
      "q": {
        "type": "text",
        "content": "Porcellio hoffmannseggii（霍夫曼鼠婦）對水分過多的反應如何？"
      },
      "options": [
        {
          "type": "text",
          "content": "極度容易因為潮濕而死亡，偏好乾燥通風環境"
        },
        {
          "type": "text",
          "content": "非常喜歡泡水並會游泳"
        },
        {
          "type": "text",
          "content": "水分越多生長速度越快"
        },
        {
          "type": "text",
          "content": "完全不受水分多寡影響"
        }
      ],
      "correct": 0,
      "explanation": "西班牙藍寶石鼠婦極度容易因為潮濕而死亡，偏好乾燥通風環境"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris murina（車頭燈，如 Papaya 變異型）在繁殖速度上有什麼特色？"
      },
      "options": [
        {
          "type": "text",
          "content": "相較於其他 Cubaris 屬，繁殖速度快且適應力較強"
        },
        {
          "type": "text",
          "content": "繁殖速度極慢，一年才產二胎"
        },
        {
          "type": "text",
          "content": "只能單獨一隻生存無法繁殖"
        },
        {
          "type": "text",
          "content": "全部都是母的"
        }
      ],
      "correct": 0,
      "explanation": "車頭燈鼠婦相較於其他 Cubaris 屬，繁殖速度快且適應力較強"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium nasatum（聖塔鼠婦）的頭部額端有一個什麼樣的突起？"
      },
      "options": [
        {
          "type": "text",
          "content": "明顯的小鼻子狀突起 / 額突"
        },
        {
          "type": "text",
          "content": "尖銳的毒刺構造"
        },
        {
          "type": "text",
          "content": "發光的觸角燈泡"
        },
        {
          "type": "text",
          "content": "巨大的扇形耳朵"
        }
      ],
      "correct": 0,
      "explanation": "尖頭球鼠婦的頭部額端有一個明顯的小鼻子狀突起或額突"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的血液（血淋含液 Hemolymph）中含有哪種金屬離子來運輸氧氣，因而呈現透明或淡藍色？"
      },
      "options": [
        {
          "type": "text",
          "content": "鐵離子"
        },
        {
          "type": "text",
          "content": "銅離子"
        },
        {
          "type": "text",
          "content": "鎂離子"
        },
        {
          "type": "text",
          "content": "鈣離子"
        }
      ],
      "correct": 1,
      "explanation": "鼠婦血液含有銅離子（血藍蛋白 Hemocyanin）來運輸氧氣"
    },
    {
      "q": {
        "type": "text",
        "content": "與人類的血紅蛋白（含鐵）不同，鼠婦的血藍蛋白在結合氧氣後呈現什麼顏色？"
      },
      "options": [
        {
          "type": "text",
          "content": "帶氧時呈淡藍色，缺氧時無色"
        },
        {
          "type": "text",
          "content": "帶氧時呈鮮紅色，缺氧時黑色"
        },
        {
          "type": "text",
          "content": "帶氧時呈金黃色，缺氧時綠色"
        },
        {
          "type": "text",
          "content": "永遠呈現純白色"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的血藍蛋白在帶氧時呈淡藍色，缺氧時無色"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的步足基部具有什麼構造可以吸收空氣中的水分？"
      },
      "options": [
        {
          "type": "text",
          "content": "水分吸收構造 / 水分微管通道"
        },
        {
          "type": "text",
          "content": "小型抽水幫浦"
        },
        {
          "type": "text",
          "content": "化學過濾膜"
        },
        {
          "type": "text",
          "content": "毛髮狀儲水袋"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的步足基部具有水分吸收構造或水分微管通道"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼不能隨意將野外採集的鼠婦直接與高價的寵物鼠婦混養？"
      },
      "options": [
        {
          "type": "text",
          "content": "野外個體可能帶有寄生蟲、病毒或線蟲病原"
        },
        {
          "type": "text",
          "content": "野外鼠婦會欺負高價寵物鼠婦"
        },
        {
          "type": "text",
          "content": "野外鼠婦會教壞寵物鼠婦逃跑"
        },
        {
          "type": "text",
          "content": "兩者品種相同會直接融化"
        }
      ],
      "correct": 0,
      "explanation": "野外個體可能帶有寄生蟲、病毒或線蟲病原，不宜隨意混養"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養箱內的落葉以哪幾種樹木的落葉最受鼠婦喜愛且安全？"
      },
      "options": [
        {
          "type": "text",
          "content": "橡樹、山毛櫸、楓樹等闊葉樹"
        },
        {
          "type": "text",
          "content": "松樹、柏樹等針葉樹"
        },
        {
          "type": "text",
          "content": "香蕉葉"
        },
        {
          "type": "text",
          "content": "人工塑膠裝飾葉片"
        }
      ],
      "correct": 0,
      "explanation": "橡樹、山毛櫸、楓樹等闊葉樹的落葉最受鼠婦喜愛且安全"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼不能使用松樹、柏樹等針葉樹的落葉或木屑來飼養鼠婦？"
      },
      "options": [
        {
          "type": "text",
          "content": "含有天然精油與樹脂，對甲殼類具有毒性"
        },
        {
          "type": "text",
          "content": "顏色太難看影響觀賞"
        },
        {
          "type": "text",
          "content": "質地太硬完全無法咬碎"
        },
        {
          "type": "text",
          "content": "會吸引太多昆蟲王國的螞蟻"
        }
      ],
      "correct": 0,
      "explanation": "松柏等針葉樹含有天然精油與樹脂，對甲殼類具有毒性"
    },
    {
      "q": {
        "type": "text",
        "content": "繁殖高單價鼠婦（如特殊色系或稀有 Cubaris）時，適當的族群密度有何影響？"
      },
      "options": [
        {
          "type": "text",
          "content": "過度擁擠會增加緊迫，密度適中利於繁殖"
        },
        {
          "type": "text",
          "content": "越多擠在一起繁殖率越高"
        },
        {
          "type": "text",
          "content": "必須單獨一隻隔絕才能繁殖"
        },
        {
          "type": "text",
          "content": "密度對繁殖完全沒有任何影響"
        }
      ],
      "correct": 0,
      "explanation": "過度擁擠會增加緊迫，密度適中才利於繁殖"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦在夜間的活動行為通常有什麼轉變？"
      },
      "options": [
        {
          "type": "text",
          "content": "夜行性較強，會離開底土爬行覓食"
        },
        {
          "type": "text",
          "content": "夜間會進入深度冬眠狀態"
        },
        {
          "type": "text",
          "content": "夜晚會發出耀眼的螢光"
        },
        {
          "type": "text",
          "content": "夜間會集體爬到飼養盒頂部"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦夜行性較強，夜間會離開底土爬行覓食"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris sp. \"Amber\"（琥珀鼠婦）在強光或側光照射下呈現什麼特殊的半透明色澤？"
      },
      "options": [
        {
          "type": "text",
          "content": "溫潤的琥珀金黃色"
        },
        {
          "type": "text",
          "content": "刺眼的螢光霓虹綠"
        },
        {
          "type": "text",
          "content": "深不見底的墨黑色"
        },
        {
          "type": "text",
          "content": "純淨雪白的反光"
        }
      ],
      "correct": 0,
      "explanation": "琥珀鼠婦在強光或側光照射下呈現溫潤的琥珀金黃色"
    },
    {
      "q": {
        "type": "text",
        "content": "Porcellio scaber（糙瓷鼠婦）的體表質感有什麼特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "佈滿明顯的小顆粒與粗糙突起"
        },
        {
          "type": "text",
          "content": "光滑如鏡面般毫無紋理"
        },
        {
          "type": "text",
          "content": "長滿長長的動物毛髮"
        },
        {
          "type": "text",
          "content": "覆蓋一層黏稠的膠狀物"
        }
      ],
      "correct": 0,
      "explanation": "糙瓷鼠婦的體表質感佈滿明顯的小顆粒與粗糙突起"
    },
    {
      "q": {
        "type": "text",
        "content": "糙瓷鼠婦（Porcellio scaber）常見的基因變異型「Calico」外觀有何特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "白色、黃色、橘色與黑色交織的花斑"
        },
        {
          "type": "text",
          "content": "全身單一純黑毫無雜色"
        },
        {
          "type": "text",
          "content": "僅有藍白相間的斑馬紋"
        },
        {
          "type": "text",
          "content": "透明無色的身體"
        }
      ],
      "correct": 0,
      "explanation": "三花變異型具有白色、黃色、橘色與黑色交織的花斑"
    },
    {
      "q": {
        "type": "text",
        "content": "什麼是鼠婦的「假死」行為（Thanatosis）？"
      },
      "options": [
        {
          "type": "text",
          "content": "受到威脅時瞬間僵硬不動，裝死以躲避掠食者"
        },
        {
          "type": "text",
          "content": "主動向天敵釋放毒氣後逃跑"
        },
        {
          "type": "text",
          "content": "將身體膨脹大三倍嚇退敵人"
        },
        {
          "type": "text",
          "content": "快速鑽入地下深處藏匿"
        }
      ],
      "correct": 0,
      "explanation": "假死行為是指受到威脅時瞬間僵硬不動，裝死以躲避掠食者"
    },
    {
      "q": {
        "type": "text",
        "content": "陸生等足類（鼠婦）在地球歷史上大約是什麼時期開始登陸演化的？"
      },
      "options": [
        {
          "type": "text",
          "content": "古生代石炭紀或更早"
        },
        {
          "type": "text",
          "content": "新生代人類出現時期"
        },
        {
          "type": "text",
          "content": "中生代白堊紀恐龍時期"
        },
        {
          "type": "text",
          "content": "近代工業革命時期"
        }
      ],
      "correct": 0,
      "explanation": "陸生等足類大約在古生代石炭紀或更早開始登陸演化"
    },
    {
      "q": {
        "type": "text",
        "content": "檢視母鼠婦是否懷孕（帶卵）時，主要觀察牠們身體的哪一個部位？"
      },
      "options": [
        {
          "type": "text",
          "content": "腹面是否有膨大的乳白色育兒囊"
        },
        {
          "type": "text",
          "content": "頭部觸角的長短變化"
        },
        {
          "type": "text",
          "content": "尾節末端是否有卵粒外露"
        },
        {
          "type": "text",
          "content": "背部中央的斑紋顏色"
        }
      ],
      "correct": 0,
      "explanation": "檢視母鼠婦是否懷孕主要觀察腹面是否有膨大的乳白色育兒囊"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼在飼養盒中噴水時，不可以直接對著鼠婦身體狂噴？"
      },
      "options": [
        {
          "type": "text",
          "content": "水壓過大或瞬間濕度劇變會造成個體緊迫或溺水"
        },
        {
          "type": "text",
          "content": "水會洗掉鼠婦身上的外殼顏色"
        },
        {
          "type": "text",
          "content": "會讓鼠婦瞬間長大幾倍"
        },
        {
          "type": "text",
          "content": "鼠婦會因此學會游泳"
        }
      ],
      "correct": 0,
      "explanation": "直接對身體狂噴會因水壓過大或瞬間濕度劇變造成個體緊迫或溺水"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的腸道菌群對於牠們消化什麼物質扮演關鍵角色？"
      },
      "options": [
        {
          "type": "text",
          "content": "纖維素、木質素等難消化植物組織"
        },
        {
          "type": "text",
          "content": "純淨的糖分與水份"
        },
        {
          "type": "text",
          "content": "各類金屬礦石礦物質"
        },
        {
          "type": "text",
          "content": "人工塑膠合成物質"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的腸道菌群對消化纖維素、木質素等難消化植物組織扮演關鍵角色"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris的身體側面具有什麼獨特的物理結構？"
      },
      "options": [
        {
          "type": "text",
          "content": "明顯的收縮凹溝"
        },
        {
          "type": "text",
          "content": "發光的霓虹線條"
        },
        {
          "type": "text",
          "content": "長滿尖銳的防禦刺"
        },
        {
          "type": "text",
          "content": "透明的觀察視窗"
        }
      ],
      "correct": 0,
      "explanation": "Cubaris鼠婦的身體側面具有明顯的收縮凹溝"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼有些飼養者會在飼養箱中放置腐朽的白化朽木（Rotten wood）？"
      },
      "options": [
        {
          "type": "text",
          "content": "既是食物也是提供微氣候與產卵的極佳介質"
        },
        {
          "type": "text",
          "content": "單純為了裝飾飼養箱美觀"
        },
        {
          "type": "text",
          "content": "用來阻擋鼠婦四處逃跑"
        },
        {
          "type": "text",
          "content": "吸收飼養箱中的多餘空氣"
        }
      ],
      "correct": 0,
      "explanation": "腐朽白化朽木既是食物也是提供微氣候與產卵的極佳介質"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium vulgare \"Magic Potion\"（魔法藥水）具有什麼獨特的基因斑紋？"
      },
      "options": [
        {
          "type": "text",
          "content": "帶有複雜如彩釉般的淺色大理石紋"
        },
        {
          "type": "text",
          "content": "單一純白色的斑紋"
        },
        {
          "type": "text",
          "content": "幾何對稱的方形黑點"
        },
        {
          "type": "text",
          "content": "螢光綠色的圓形斑塊"
        }
      ],
      "correct": 0,
      "explanation": "魔法藥水帶有複雜如彩釉般的淺色大理石紋斑紋"
    },
    {
      "q": {
        "type": "text",
        "content": "當飼養環境的二氧化碳濃度過高時，鼠婦通常會出現什麼行為？"
      },
      "options": [
        {
          "type": "text",
          "content": "往高處爬或試圖逃逸"
        },
        {
          "type": "text",
          "content": "原地不動進入深眠"
        },
        {
          "type": "text",
          "content": "集體挖掘更深的地下巢穴"
        },
        {
          "type": "text",
          "content": "發出高頻的尖叫聲"
        }
      ],
      "correct": 0,
      "explanation": "二氧化碳濃度過高時，鼠婦通常會往高處爬或試圖逃逸"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的頭胸部（Pereon）由幾節無節合的體節組成？"
      },
      "options": [
        {
          "type": "text",
          "content": "胸部通常有 7 節，各有一對步足"
        },
        {
          "type": "text",
          "content": "胸部只有 3 節體節"
        },
        {
          "type": "text",
          "content": "胸部共有 12 節體節"
        },
        {
          "type": "text",
          "content": "胸部完全沒有分節"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦頭胸部（Pereon）通常有 7 節，各有一對步足"
    },
    {
      "q": {
        "type": "text",
        "content": "下列那一種不是車頭燈？"
      },
      "options": [
        {
          "type": "text",
          "content": "橘子"
        },
        {
          "type": "text",
          "content": "檸檬"
        },
        {
          "type": "text",
          "content": "木瓜"
        },
        {
          "type": "text",
          "content": "海葵"
        }
      ],
      "correct": 0,
      "explanation": "車頭燈有橘子、木瓜、冰川、海葵"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的腹部（Pleon）末端具有一對尾肢（Uropods），這對尾肢主要的功能是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "感覺器官、協助排泄與觸覺防衛"
        },
        {
          "type": "text",
          "content": "專門用來抓取食物送入口中"
        },
        {
          "type": "text",
          "content": "輔助身體在空中飛翔"
        },
        {
          "type": "text",
          "content": "發動攻擊的致命毒刺"
        }
      ],
      "correct": 0,
      "explanation": "尾肢主要作為感覺器官、協助排泄與觸覺防衛"
    }
  ],
  "hell": [
    {
      "q": {
        "type": "text",
        "content": "陸生等足類（Isopoda）在演化上為了適應陸地生活，其腹肢（Pleopods）內側演化出的呼吸構造「偽氣管（Pseudotrachea）」其功能原理與昆蟲的氣管有何本質上的不同？"
      },
      "options": [
        {
          "type": "text",
          "content": "偽氣管是高度血管化的外骨骼內陷腔室，依賴血淋巴進行氣體交換，而昆蟲氣管是直接將空氣輸送到組織"
        },
        {
          "type": "text",
          "content": "偽氣管是由外骨骼向外突出的管狀羽狀鰓，直接與外界水膜接觸進行氣體交換，而昆蟲氣管則是由體壁內陷形成的封閉式盲管"
        },
        {
          "type": "text",
          "content": "偽氣管是透過主動收縮腹部肌肉來灌注空氣的開放式氣囊，而昆蟲氣管則是依賴血淋巴中的血紅素來運送氧氣"
        },
        {
          "type": "text",
          "content": "偽氣管屬於中胚層發育而成的管網系統，能直接與神經系統進行氣體交換，而昆蟲氣管則是由外胚層發育並充滿體腔液"
        }
      ],
      "correct": 0,
      "explanation": "陸生等足類（Isopoda）在演化上為了適應陸地生活，其腹肢（Pleopods）內側演化出的呼吸構造「偽氣管（Pseudotrachea）」其功能原理與昆蟲的氣管有何本質上的不同？（偽氣管是高度血管化的外骨骼內陷腔室，依賴血淋巴進行氣體交換，而昆蟲氣管是直接將空氣輸送到組織）"
    },
    {
      "q": {
        "type": "text",
        "content": "感染「沃巴氏體（Wolbachia）」共生細菌的陸生鼠婦，會導致族群出現什麼奇特的性比失衡與性別決定機制扭曲？"
      },
      "options": [
        {
          "type": "text",
          "content": "將基因雄性轉化為雌性，導致族群中幾乎全為雌性以利母系垂直傳播"
        },
        {
          "type": "text",
          "content": "抑制雌性荷爾蒙的分泌，使所有受精卵皆發育為超雄性個體以加快族群擴散"
        },
        {
          "type": "text",
          "content": "破壞卵黃蛋白酶的合成，導致母體僅能產下不具繁殖能力的單性生殖雌性後代"
        },
        {
          "type": "text",
          "content": "誘導性染色體發生不對稱減數分裂，使基因型全數轉變為類似蜂類的單雙倍體決定系統"
        }
      ],
      "correct": 0,
      "explanation": "感染「沃巴氏體（Wolbachia）」共生細菌的陸生鼠婦，會導致族群出現什麼奇特的性比失衡與性別決定機制扭曲？（將基因雄性轉化為雌性，導致族群中幾乎全為雌性以利母系垂直傳播）"
    },
    {
      "q": {
        "type": "text",
        "content": "在 Armadillidium 屬中，某些種類的性別決定系統除了標準的 WZ/ZZ 染色體外，還受到什麼因素的強烈干擾？"
      },
      "options": [
        {
          "type": "text",
          "content": "受到共生細菌 Wolbachia 感染的表觀遺傳與環境性別決定因子影響"
        },
        {
          "type": "text",
          "content": "受到飼養環境中鈣離子濃度高低的直接誘發，高鈣環境會導致雌性基因型全數轉化"
        },
        {
          "type": "text",
          "content": "受到群體密度產生的費洛蒙濃度調控，高密度會自動啟動雄性化基因轉錄"
        },
        {
          "type": "text",
          "content": "受到日照長短（光週期）引發的內分泌失調，使體內保幼激素濃度決定性別分化"
        }
      ],
      "correct": 0,
      "explanation": "在 Armadillidium 屬中，某些種類的性別決定系統除了標準的 WZ/ZZ 染色體外，還受到什麼因素的強烈干擾？（受到共生細菌 Wolbachia 感染的表觀遺傳與環境性別決定因子影響）"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的血紅蛋白（Hemocyanin）在脫氧與帶氧狀態下的分子量級與結構複雜度大約是多少？"
      },
      "options": [
        {
          "type": "text",
          "content": "屬於巨型多聚體蛋白質，含有數十個銅原子結合位點"
        },
        {
          "type": "text",
          "content": "屬於單體小分子球蛋白，中心含有一個負責攜氧的血紅素鐵離子核心"
        },
        {
          "type": "text",
          "content": "屬於由四條胜肽鏈組成的四聚體結構，結構與脊椎動物的血紅素完全相同"
        },
        {
          "type": "text",
          "content": "屬於結合多個鋅離子的雙層圓盤狀結構，主要透過共價鍵與多醣體聚合"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的血紅蛋白（Hemocyanin）在脫氧與帶氧狀態下的分子量級與結構複雜度大約是多少？（屬於巨型多聚體蛋白質，含有數十個銅原子結合位點）"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris 屬在其原生棲息地的微環境（Microhabitat）通常具備什麼極端的地質特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "多數棲息於熱帶或亞熱帶喀斯特地形的石灰岩洞穴縫隙或石縫深處"
        },
        {
          "type": "text",
          "content": "主要分布於火山島嶼的強酸性玄武岩沉積層表面的腐質土中"
        },
        {
          "type": "text",
          "content": "高度適應乾旱沙漠地區的鹽鹼地，掘穴棲息於地下高溫的地下水脈周圍"
        },
        {
          "type": "text",
          "content": "專門生活在紅樹林潮間帶的泥炭沼澤，隨著漲潮垂直攀爬至樹幹高處避難"
        }
      ],
      "correct": 0,
      "explanation": "Cubaris 屬在其原生棲息地的微環境（Microhabitat）通常具備什麼極端的地質特徵？（多數棲息於熱帶或亞熱帶喀斯特地形的石灰岩洞穴縫隙或石縫深處）"
    },
    {
      "q": {
        "type": "text",
        "content": "喀斯特地貌（Karst topography）環境對 Cubaris 屬鼠婦的生存提供了哪兩個不可或缺的化學與物理條件？"
      },
      "options": [
        {
          "type": "text",
          "content": "極高且穩定的濕度，以及極度豐富的碳酸鈣來源"
        },
        {
          "type": "text",
          "content": "富含磷酸鐵的強酸性土壤，以及能提供恆溫環境的地熱溫泉水氣"
        },
        {
          "type": "text",
          "content": "含有大量有機質的沖積沙壤土，以及全年強烈日照帶來的紫外線殺菌防護"
        },
        {
          "type": "text",
          "content": "低溫乾燥的空氣流動條件，以及高濃度的游離態二氧化碳以協助外骨骼呼吸"
        }
      ],
      "correct": 0,
      "explanation": "喀斯特地貌（Karst topography）環境對 Cubaris 屬鼠婦的生存提供了哪兩個不可或缺的化學與物理條件？（極高且穩定的濕度，以及極度豐富的碳酸鈣來源）"
    },
    {
      "q": {
        "type": "text",
        "content": "試述 Porcellio haasi 或 Porcellio hoffmannseggii（霍夫曼鼠婦）在原生棲息地面對地中海型氣候時的夏眠（Aestivation）機制：當夏季高溫乾旱時，牠們會採取什麼生理策略？"
      },
      "options": [
        {
          "type": "text",
          "content": "深入地表深處岩縫或石塊下方，降低代謝率並封閉洞口以防止水分散失"
        },
        {
          "type": "text",
          "content": "集體移至灌木叢頂端進行群聚偽裝，提高體溫以加速體內水分蒸發降溫"
        },
        {
          "type": "text",
          "content": "分泌大量高濃度尿酸結晶包覆全身，進入類似假死的深度代謝停滯狀態"
        },
        {
          "type": "text",
          "content": "轉為日行性活動並大量攝食多汁植物，利用代謝水來對抗地表高溫乾旱"
        }
      ],
      "correct": 0,
      "explanation": "試述 Porcellio haasi 或 Porcellio hoffmannseggii（霍夫曼鼠婦）在原生棲息地面對地中海型氣候時的夏眠（Aestivation）機制：當夏季高溫乾旱時，牠們會採取什麼生理策略？（深入地表深處岩縫或石塊下方，降低代謝率並封閉洞口以防止水分散失）"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的內分泌系統中，負責控制蛻皮（Ecdysis）與生長的重要腺體是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "Y-器官 Y-organ 和大顎腺 Mandibular gland，受X-器官-竇腺複合體調控"
        },
        {
          "type": "text",
          "content": "前胸腺 Prothoracic gland 與體壁分泌細胞，直接受腦激素（BH）誘導分泌"
        },
        {
          "type": "text",
          "content": "觸角腺 Antennal gland 的近端分泌部，透過釋放保幼激素來啟動蛻皮程序"
        },
        {
          "type": "text",
          "content": "中腸壁的內分泌細胞群，主要依賴食物中的膽固醇濃度直接轉化為蛻皮素"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的內分泌系統中，負責控制蛻皮（Ecdysis）與生長的重要腺體是什麼？（Y-器官 Y-organ 和大顎腺 Mandibular gland，受X-器官-竇腺複合體調控）"
    },
    {
      "q": {
        "type": "text",
        "content": "當移除鼠婦的「鈣腺（Caecal glands / Sternal glands）」或當其功能受損時，對牠們的外殼硬化會產生什麼致命影響？"
      },
      "options": [
        {
          "type": "text",
          "content": "無法在脫殼前後有效調控體內鈣離子濃度，導致新外殼無法鈣化而軟化死亡"
        },
        {
          "type": "text",
          "content": "失去分泌幾丁質分解酶的能力，導致舊外殼無法順利從頭胸部剝離而卡殼悶死"
        },
        {
          "type": "text",
          "content": "體內滲透壓失衡引發血淋巴大量滲出，造成肌肉組織脫水萎縮而癱瘓"
        },
        {
          "type": "text",
          "content": "無法合成足夠的黑色素與結構蛋白，導致外骨骼失去韌性而輕易碎裂"
        }
      ],
      "correct": 0,
      "explanation": "當移除鼠婦的「鈣腺（Caecal glands / Sternal glands）」或當其功能受損時，對牠們的外殼硬化會產生什麼致命影響？（無法在脫殼前後有效調控體內鈣離子濃度，導致新外殼無法鈣化而軟化死亡）"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium granulatum 的外骨骼表面佈滿獨特的顆粒狀突起，這些突起在生物力學上對牠們在乾燥環境有什麼幫助？"
      },
      "options": [
        {
          "type": "text",
          "content": "增加表面積以利微量水分凝結吸附，並減少身體與乾燥表面的直接接觸摩擦"
        },
        {
          "type": "text",
          "content": "作為感覺外界微氣流變化的機械受器，能在濕度過低時提前引發負趨光逃避反應"
        },
        {
          "type": "text",
          "content": "內含豐富的腺體能分泌特殊油脂，在體表形成一層完全防水的蠟質保護膜"
        },
        {
          "type": "text",
          "content": "透過粗糙的表面結構來反射太陽光中的紅外線輻射，降低體表吸收的熱能"
        }
      ],
      "correct": 0,
      "explanation": "Armadillidium granulatum 的外骨骼表面佈滿獨特的顆粒狀突起，這些突起在生物力學上對牠們在乾燥環境有什麼幫助？（增加表面積以利微量水分凝結吸附，並減少身體與乾燥表面的直接接觸摩擦）"
    },
    {
      "q": {
        "type": "text",
        "content": "關於等足目的神經系統，鼠婦的腹神經索（Ventral nerve cord）呈現什麼典型的節肢動物梯形結構？"
      },
      "options": [
        {
          "type": "text",
          "content": "具備明顯的雙索神經節，胸部與腹部神經節在某些演化支系中出現不同程度的癒合"
        },
        {
          "type": "text",
          "content": "演化為單一條集中且無節狀膨大的中樞神經管，類似脊索動物的神經索構造"
        },
        {
          "type": "text",
          "content": "完全退化成散布在血淋巴腔室中的神經網，僅保留頭部的微型腦神經節"
        },
        {
          "type": "text",
          "content": "呈環繞消化道周圍的咽環神經系統，缺乏明顯的腹神經節與節段分化"
        }
      ],
      "correct": 0,
      "explanation": "關於等足目的神經系統，鼠婦的腹神經索（Ventral nerve cord）呈現什麼典型的節肢動物梯形結構？（具備明顯的雙索神經節，胸部與腹部神經節在某些演化支系中出現不同程度的癒合）"
    },
    {
      "q": {
        "type": "text",
        "content": "許多高難度的洞穴種鼠婦（例如部分分佈於巴爾幹半島洞穴系統的 Trachelipus 或 Alpioniscus 屬）通常演化出什麼顯著的生理退化特徵？"
      },
      "options": [
        {
          "type": "text",
          "content": "眼睛完全退化消失、無色素沉澱呈全透明或乳白色、觸角與步足異常延長以利觸覺導航"
        },
        {
          "type": "text",
          "content": "外骨骼完全鈣化消失並轉為肉質柔軟的體壁，改以體表直接吸收洞穴水中的有機物"
        },
        {
          "type": "text",
          "content": "呼吸器官由偽氣管退化回原始的鰓，必須完全浸泡在洞穴水體中才能存活"
        },
        {
          "type": "text",
          "content": "失去捲球防禦的能力，但演化出強大的毒刺與發光器官來嚇阻洞穴掠食者"
        }
      ],
      "correct": 0,
      "explanation": "許多高難度的洞穴種鼠婦（例如部分分佈於巴爾幹半島洞穴系統的 Trachelipus 或 Alpioniscus 屬）通常演化出什麼顯著的生理退化特徵？（眼睛完全退化消失、無色素沉澱呈全透明或乳白色、觸角與步足異常延長以利觸覺導航）"
    },
    {
      "q": {
        "type": "text",
        "content": "基因突變中，「Piebald」（花斑/雜色）與「Albino」（白化）在遺傳學機制上的差異為何？"
      },
      "options": [
        {
          "type": "text",
          "content": "Albino 是酪胺酸酶缺乏導致完全無法合成黑色素；Piebald 則是黑素細胞分化或分佈異常導致的局部色素缺失斑塊"
        },
        {
          "type": "text",
          "content": "Albino 是性聯顯性遺傳導致眼部紅色；Piebald 則是體染色體隱性造成的全身無色素"
        },
        {
          "type": "text",
          "content": "兩者基因位點完全相同，僅因飼養環境的紫外線強度不同而表現出不同的斑塊深淺"
        },
        {
          "type": "text",
          "content": "Albino 缺乏的是類胡蘿蔔素吸收能力；Piebald 則是外骨骼幾丁質結構發生物理性變異"
        }
      ],
      "correct": 0,
      "explanation": "基因突變中，「Piebald」（花斑/雜色）與「Albino」（白化）在遺傳學機制上的差異為何？（Albino 是酪胺酸酶缺乏導致完全無法合成黑色素；Piebald 則是黑素細胞分化或分佈異常導致的局部色素缺失斑塊）"
    },
    {
      "q": {
        "type": "text",
        "content": "在培育紅眼白化（Red-eyed Albino）突變型鼠婦時，除了缺乏黑色素外，通常還會伴隨視網膜什麼生理缺陷？"
      },
      "options": [
        {
          "type": "text",
          "content": "對強光高度敏感，視力與趨光反應嚴重受損"
        },
        {
          "type": "text",
          "content": "複眼數量減少一半，且無法辨識任何動態影像僅能感應光線有無"
        },
        {
          "type": "text",
          "content": "視神經纖維與腦部視葉完全中斷，導致個體完全失去光線感知能力"
        },
        {
          "type": "text",
          "content": "視網膜內含有過量的銅離子沉積，導致在微光環境下會產生幻覺性旋轉"
        }
      ],
      "correct": 0,
      "explanation": "在培育紅眼白化（Red-eyed Albino）突變型鼠婦時，除了缺乏黑色素外，通常還會伴隨視網膜什麼生理缺陷？（對強光高度敏感，視力與趨光反應嚴重受損）"
    },
    {
      "q": {
        "type": "text",
        "content": "試分析 Porcellio scaber 'Ghost' 或特定白化品系在遺傳學上屬於顯性（Dominant）、隱性（Recessive）還是性聯遺傳（Sex-linked）？"
      },
      "options": [
        {
          "type": "text",
          "content": "多數隱性白化基因需要雙親皆帶原或純合才會在後代表現"
        },
        {
          "type": "text",
          "content": "屬於完全顯性遺傳，只要單親帶有一個該基因，子代必定全數表現白化特徵"
        },
        {
          "type": "text",
          "content": "屬於嚴格的Y染色體伴性遺傳，僅會由父系垂直傳遞給所有的雄性後代"
        },
        {
          "type": "text",
          "content": "屬於母系細胞質粒遺傳，由卵細胞中的粒線體DNA突變所直接決定"
        }
      ],
      "correct": 0,
      "explanation": "試分析 Porcellio scaber 'Ghost' 或特定白化品系在遺傳學上屬於顯性（Dominant）、隱性（Recessive）還是性聯遺傳（Sex-linked）？（多數隱性白化基因需要雙親皆帶原或純合才會在後代表現）"
    },
    {
      "q": {
        "type": "text",
        "content": "在繁殖 Cubaris sp. \"Rubber Ducky\"（黃頭鴨）時，若飼養箱內的 pH 值過低（呈現酸性），會對牠們造成什麼長遠的生理傷害？"
      },
      "options": [
        {
          "type": "text",
          "content": "酸性環境會加速外殼碳酸鈣溶解，並破壞其微氣候的離子平衡"
        },
        {
          "type": "text",
          "content": "會促使體內共生細菌大量轉化為致病菌，引發嚴重的腸道發酵與腹瀉死亡"
        },
        {
          "type": "text",
          "content": "會導致血淋巴中的血紅素結構永久性變性，失去運送氧氣的生理活性"
        },
        {
          "type": "text",
          "content": "會強烈刺激其觸角末端的化學受器，使鼠婦陷入恐慌性拒食並加速脫水"
        }
      ],
      "correct": 0,
      "explanation": "在繁殖 Cubaris sp. \"Rubber Ducky\"（橡膠鴨仔）時，若飼養箱內的 pH 值過低（呈現酸性），會對牠們造成什麼長遠的生理傷害？（酸性環境會加速外殼碳酸鈣溶解，並破壞其微氣候的離子平衡）"
    },
    {
      "q": {
        "type": "text",
        "content": "陸生等足類的「血淋巴循環系統」屬於開放式循環（Open circulatory system），其心臟（Heart）位於身體的哪一個解剖位置？"
      },
      "options": [
        {
          "type": "text",
          "content": "位於腹部背側的多孔管狀心臟，透過心孔接收血淋巴並向前打出"
        },
        {
          "type": "text",
          "content": "位於頭胸部腹側的球狀肌肉心臟，透過主動脈直接將血淋巴打入觸角神經"
        },
        {
          "type": "text",
          "content": "位於尾節末端的雙腔室心臟，主要負責將血淋巴向後抽吸至尾肢進行排泄"
        },
        {
          "type": "text",
          "content": "鼠婦體內不具備真正的心臟，全靠步足肌肉的規律收縮來驅動血淋巴全身流動"
        }
      ],
      "correct": 0,
      "explanation": "陸生等足類的「血淋巴循環系統」屬於開放式循環（Open circulatory system），其心臟（Heart）位於身體的哪一個解剖位置？（位於腹部背側的多孔管狀心臟，透過心孔接收血淋巴並向前打出）"
    },
    {
      "q": {
        "type": "text",
        "content": "某些高階鼠婦品種（如 Merulanella 屬）原產於東南亞（如越南、泰國）的雨林底層，牠們對「空氣流動速度（Airflow）」與「悶熱（Stagnant air）」的敏感度有何極端表現？"
      },
      "options": [
        {
          "type": "text",
          "content": "極度需要高濕度但同時需要極高且溫和的通風，只要稍微悶熱就會在幾小時內全數融化死亡"
        },
        {
          "type": "text",
          "content": "極度畏懼任何空氣流動，必須生活在完全密閉且充滿二氧化碳的無風環境中"
        },
        {
          "type": "text",
          "content": "對空氣濕度完全不敏感，但對氣溫變化極為敏感，低於 25 度會立即進入冬眠"
        },
        {
          "type": "text",
          "content": "必須依賴強風吹拂來冷卻體溫，若置於無風箱體內會因體溫過高而主動自割步足"
        }
      ],
      "correct": 0,
      "explanation": "某些高階鼠婦品種（如 Merulanella 屬）原產於東南亞（如越南、泰國）的雨林底層，牠們對「空氣流動速度（Airflow）」與「悶熱（Stagnant air）」的敏感度有何極端表現？（極度需要高濕度但同時需要極高且溫和的通風，只要稍微悶熱就會在幾小時內全數融化死亡）"
    },
    {
      "q": {
        "type": "text",
        "content": "Merulanella sp. \"Red Sparkle\" 或 \"Ao Noi\" 等鼠婦，其背甲鮮豔的色彩（紅、藍、黃、黑交織）在生態學上屬於哪一種警戒或適應機制？"
      },
      "options": [
        {
          "type": "text",
          "content": "Aposematism 警戒色，或是針對熱帶雨林複雜光斑的迷彩偽裝"
        },
        {
          "type": "text",
          "content": "為了吸引同種異性進行求偶交配的性雙型色彩展示"
        },
        {
          "type": "text",
          "content": "透過吸收特定波段陽光來進行光合作用輔助能量代謝的色素沉積"
        },
        {
          "type": "text",
          "content": "為了吸收大量紫外線以防止外骨骼在強光下脆化的防禦性色素"
        }
      ],
      "correct": 0,
      "explanation": "Merulanella sp. \"Red Sparkle\" 或 \"Ao Noi\" 等高價彩虹鼠婦，其背甲鮮豔的色彩（紅、藍、黃、黑交織）在生態學上屬於哪一種警戒或適應機制？（Aposematism 警戒色，或是針對熱帶雨林複雜光斑的迷彩偽裝）"
    },
    {
      "q": {
        "type": "text",
        "content": "臨床或解剖學上，鼠婦體內的寄生線蟲或真菌感染（例如 Entomophthorales 類真菌）會引發什麼異常的行為改變？"
      },
      "options": [
        {
          "type": "text",
          "content": "誘導宿主在死亡前爬到高處或乾燥處，以利孢子傳播"
        },
        {
          "type": "text",
          "content": "誘導宿主主動跳入水中以利寄生蟲完成水生階段的幼蟲釋放"
        },
        {
          "type": "text",
          "content": "使鼠婦喪失防禦性捲球能力，並主動向群聚中心聚集以擴大感染範圍"
        },
        {
          "type": "text",
          "content": "刺激其瘋狂攝食同類屍體，加速病原體在整個族群內部的垂直傳播"
        }
      ],
      "correct": 0,
      "explanation": "臨床或解剖學上，鼠婦體內的寄生線蟲或真菌感染（例如 Entomophthorales 類真菌）會引發什麼異常的行為改變？（誘導宿主在死亡前爬到高處或乾燥處，以利孢子傳播）"
    },
    {
      "q": {
        "type": "text",
        "content": "鼠婦的「生殖孔（Genital pores）」在雌雄異體的分佈上有何解剖差異？"
      },
      "options": [
        {
          "type": "text",
          "content": "雄性的生殖孔開口位於第一對或第二對腹肢基部的生殖突起上；雌性的生殖孔則開口於第五胸節腹面"
        },
        {
          "type": "text",
          "content": "雄性生殖孔位於尾肢末端兩側；雌性生殖孔則位於頭胸部第一步足的基節上"
        },
        {
          "type": "text",
          "content": "雌雄雙方的生殖孔皆開口於頭部口器後方的同一個腹側凹陷腔室中"
        },
        {
          "type": "text",
          "content": "雄性具有對稱的雙生殖孔位於腹部末端；雌性則完全退化無生殖孔而改行孤雌生殖"
        }
      ],
      "correct": 0,
      "explanation": "鼠婦的「生殖孔（Genital pores）」在雌雄異體的分佈上有何解剖差異？（雄性的生殖孔開口位於第一對或第二對腹肢基部的生殖突起上；雌性的生殖孔則開口於第五胸節腹面）"
    },
    {
      "q": {
        "type": "text",
        "content": "關於等足目精子的轉移與受精機制，雄性鼠婦如何將精子送入雌體？"
      },
      "options": [
        {
          "type": "text",
          "content": "利用特化的第一、二對腹肢（交接器）將精莢送入雌性生殖孔內"
        },
        {
          "type": "text",
          "content": "透過口器分泌含精子的膠狀囊包，直接餵食給雌性完成體外受精"
        },
        {
          "type": "text",
          "content": "將精子直接釋放到潮濕的土壤表面，由雌性經過時利用腹端毛細現象吸入體內"
        },
        {
          "type": "text",
          "content": "利用尾肢末端的針狀構造刺入雌性背甲，將精液直接注射進血淋巴中"
        }
      ],
      "correct": 0,
      "explanation": "關於等足目精子的轉移與受精機制，雄性鼠婦如何將精子送入雌體？（利用特化的第一、二對腹肢（交接器）將精莢送入雌性生殖孔內）"
    },
    {
      "q": {
        "type": "text",
        "content": "某些野生物種在面臨嚴重脫水時，會利用尾肢（Uropods）周圍的毛細現象進行什麼特殊的生理補水行為？"
      },
      "options": [
        {
          "type": "text",
          "content": "逆向毛細現象吸收土壤或水苔表面的微量水分進入體內"
        },
        {
          "type": "text",
          "content": "透過尾肢末端的分泌腺吸收空氣中的游離氧並凝結水分提供代謝所需"
        },
        {
          "type": "text",
          "content": "將尾肢插入潮濕泥土中，利用滲透壓將體內的代謝廢物透過尾肢強力噴出"
        },
        {
          "type": "text",
          "content": "利用尾肢的快速拍打在體表形成微小水霧，達到降溫與局部加濕的效果"
        }
      ],
      "correct": 0,
      "explanation": "某些野生物種在面臨嚴重脫水時，會利用尾肢（Uropods）周圍的毛細現象進行什麼特殊的生理補水行為？（逆向毛細現象吸收土壤或水苔表面的微量水分進入體內）"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養高級品種時常使用「半地棲-半附生（Hemiepiphytic / Paludarium-style）」的造景配置，這種配置的核心精髓是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "模擬溪流邊緣或潮濕岩壁，結合活體苔蘚、流木與持續微滴灌或高濕度循環空氣"
        },
        {
          "type": "text",
          "content": "完全隔離土壤接觸，採用純無菌濾水棉與紫外線燈管營造無菌無塵的醫療級環境"
        },
        {
          "type": "text",
          "content": "打造全乾燥的沙漠微景觀，僅在單一角落提供微型水盆供其自由選擇浸泡"
        },
        {
          "type": "text",
          "content": "利用密閉高溫的溫室效應，促使腐木快速腐爛以提供源源不絕的單一纖維素食物源"
        }
      ],
      "correct": 0,
      "explanation": "飼養高級品種時常使用「半地棲-半附生（Hemiepiphytic / Paludarium-style）」的造景配置，這種配置的核心精髓是什麼？（模擬溪流邊緣或潮濕岩壁，結合活體苔蘚、流木與持續微滴灌或高濕度循環空氣）"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium vulgare 的「Orange Vigor」或特定黃化突變基因，在族群近親交配（Inbreeding depression）過度時會出現什麼典型的遺傳退化？"
      },
      "options": [
        {
          "type": "text",
          "content": "產卵量銳減、幼體畸形率激增、免疫力下降導致整槽崩潰"
        },
        {
          "type": "text",
          "content": "體長會出現異乎尋常的巨大化現象，但同時喪失所有外骨骼鈣化能力"
        },
        {
          "type": "text",
          "content": "性別比例會瞬間扭曲為 100% 雄性，導致族群在短時間內因缺乏雌性而自然絕滅"
        },
        {
          "type": "text",
          "content": "觸角與步足會發生嚴重的節段融合與數量減少，失去基本爬行能力"
        }
      ],
      "correct": 0,
      "explanation": "Armadillidium vulgare 的「Orange Vigor」或特定黃化突變基因，在族群近親交配（Inbreeding depression）過度時會出現什麼典型的遺傳退化？（產卵量銳減、幼體畸形率激增、免疫力下降導致整槽崩潰）"
    },
    {
      "q": {
        "type": "text",
        "content": "試述 Porcellionides pruinosus 的「自割（Autotomy）」或防禦釋放防禦性化學物質的分泌腺分佈在哪裡？"
      },
      "options": [
        {
          "type": "text",
          "content": "雖然多數等足類不具備強烈毒腺，但受驚嚇時會從體表腺體分泌帶有特殊氣味的微量防禦性醌類化合物"
        },
        {
          "type": "text",
          "content": "毒腺集中分佈在尾肢尖端，能向掠食者噴射具有腐蝕性的強酸液體"
        },
        {
          "type": "text",
          "content": "防禦腺體位於大顎基部，咬擊時會釋放麻痺神經的生物鹼毒素"
        },
        {
          "type": "text",
          "content": "該物種完全不具備任何化學防禦能力，其自割機制僅限於斷裂步足來轉移掠食者注意力"
        }
      ],
      "correct": 0,
      "explanation": "試述 Porcellionides pruinosus 的「自割（Autotomy）」或防禦釋放防禦性化學物質的分泌腺分佈在哪裡？（雖然多數等足類不具備強烈毒腺，但受驚嚇時會從體表腺體分泌帶有特殊氣味的微量防禦性醌類化合物）"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼在配置高端鼠婦飼養土時，必須加入「活性碳（Activated carbon）」或「麥飯石（Maifanshi）」？"
      },
      "options": [
        {
          "type": "text",
          "content": "吸附代謝產生的毒性氨氣與有機酸，並緩釋微量礦物質"
        },
        {
          "type": "text",
          "content": "提供土壤長效保溫效果，防止冬季夜晚溫度過低導致鼠婦凍傷死亡"
        },
        {
          "type": "text",
          "content": "作為主要的碳源食物供應鏈，供土壤中的好氧細菌進行快速繁殖"
        },
        {
          "type": "text",
          "content": "改變土壤的酸鹼值使其長期維持強酸性，以抑制線蟲與蟎類的滋生"
        }
      ],
      "correct": 0,
      "explanation": "為什麼在配置高端鼠婦飼養土時，必須加入「活性碳（Activated carbon）」或「麥飯石（Maifanshi）」？（吸附代謝產生的毒性氨氣與有機酸，並緩釋微量礦物質）"
    },
    {
      "q": {
        "type": "text",
        "content": "Schizidium 屬的鼠婦在分類學上與 Armadillidium 屬極為相似，其最主要的解剖鑑別特徵是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "頭部額板（Clypeus/Frontal shield）與頭頂突起的癒合形態及眼面結構的差異"
        },
        {
          "type": "text",
          "content": "腹部末端尾肢的長度比例與尾節呈現尖銳三角形還是圓弧形的差別"
        },
        {
          "type": "text",
          "content": "第一對步足演化成類似螯蝦的抓握構造，而 Armadillidium 則完全沒有"
        },
        {
          "type": "text",
          "content": "身體節段的數量多出兩節，且背甲表面不具備任何平滑或顆粒狀質感"
        }
      ],
      "correct": 0,
      "explanation": "Schizidium 屬的鼠婦在分類學上與 Armadillidium 屬極為相似，其最主要的解剖鑑別特徵是什麼？（頭部額板（Clypeus/Frontal shield）與頭頂突起的癒合形態及眼面結構的差異）"
    },
    {
      "q": {
        "type": "text",
        "content": "Platyarthrus hoffmannseggii 這種特殊的「蟻巢鼠婦（Myrmecophilous isopod）」擁有什麼不可思議的生態習性？"
      },
      "options": [
        {
          "type": "text",
          "content": "牠們專門生活在螞蟻巢穴內部，靠著舔舐螞蟻的分泌物或共生生活，且演化出能躲避螞蟻攻擊的化學偽裝"
        },
        {
          "type": "text",
          "content": "牠們會主動捕食螞蟻的幼蟲與卵，並將螞蟻巢穴作為自己產卵的產房"
        },
        {
          "type": "text",
          "content": "牠們會分泌強效毒氣將整窩螞蟻殺死，然後佔領其地下巢穴作為避難所"
        },
        {
          "type": "text",
          "content": "牠們與螞蟻存在互利共生關係，會替螞蟻搬運食物並將螞蟻的糞便作為主要食糧"
        }
      ],
      "correct": 0,
      "explanation": "Platyarthrus hoffmannseggii 這種特殊的「蟻巢鼠婦（Myrmecophilous isopod）」擁有什麼不可思議的生態習性？（牠們專門生活在螞蟻巢穴內部，靠著舔舐螞蟻的分泌物或共生生活，且演化出能躲避螞蟻攻擊的化學偽裝）"
    },
    {
      "q": {
        "type": "text",
        "content": "蟻巢鼠婦（Platyarthrus）的外觀通常呈現什麼極端的特徵來適應狹窄的蟻道？"
      },
      "options": [
        {
          "type": "text",
          "content": "極度扁平、無眼、色澤呈現乳白或淡黃色"
        },
        {
          "type": "text",
          "content": "身體呈現完美的圓球形，能像滾珠一樣在蟻道內快速滾動逃逸"
        },
        {
          "type": "text",
          "content": "體長極度細長如蚯蚓狀，並在每節體壁長滿倒刺以抓附蟻道壁"
        },
        {
          "type": "text",
          "content": "頭胸部異常巨大且具備強力大顎，能直接推開阻擋道路的工蟻"
        }
      ],
      "correct": 0,
      "explanation": "蟻巢鼠婦（Platyarthrus）的外觀通常呈現什麼極端的特徵來適應狹窄的蟻道？（極度扁平、無眼、色澤呈現乳白或淡黃色）"
    },
    {
      "q": {
        "type": "text",
        "content": "評估一個鼠婦飼養系統是否達到「生物活性平衡（Bioactive equilibrium）」的黃金指標是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "分解者（鼠婦、跳蟲、蚯蚓）與真菌、植物之間形成物質循環，無需人工頻繁換土且不產生惡臭"
        },
        {
          "type": "text",
          "content": "飼養箱內的濕度與溫度長年維持在絕對恆定的數值，且無任何植物生長"
        },
        {
          "type": "text",
          "content": "鼠婦的繁殖速度達到每週產卵數百隻，且飼養箱內完全沒有任何真菌或苔蘚存在"
        },
        {
          "type": "text",
          "content": "土壤表面完全被人工添加的化學肥料覆蓋，且每日需進行人工噴灑消毒液"
        }
      ],
      "correct": 0,
      "explanation": "評估一個鼠婦飼養系統是否達到「生物活性平衡（Bioactive equilibrium）」的黃金指標是什麼？（分解者（鼠婦、跳蟲、蚯蚓）與真菌、植物之間形成物質循環，無需人工頻繁換土且不產生惡臭）"
    },
    {
      "q": {
        "type": "text",
        "content": "影響陸生等足類分佈的「氣候限制因子（Climatic limiting factors）」中，為什麼「飽和水汽壓差（Vapor Pressure Deficit, VPD）」對牠們的生存至關重要？"
      },
      "options": [
        {
          "type": "text",
          "content": "VPD 過低會使空氣中的氧氣濃度驟降，引發鼠婦群體性的呼吸困難"
        },
        {
          "type": "text",
          "content": "VPD 直接控制了鼠婦體內血紅蛋白攜氧能力的強弱，高 VPD 會導致窒息"
        },
        {
          "type": "text",
          "content": "VPD 數值高低會直接決定雌性鼠婦產卵時的性別比例分化"
        },
        {
          "type": "text",
          "content": "VPD 決定了體表水分蒸發的速率，VPD 過高會導致鼠婦在數分鐘內因脫水而神經麻痺"
        }
      ],
      "correct": 3,
      "explanation": "影響陸生等足類分佈的「氣候限制因子（Climatic limiting factors）」中，為什麼「飽和水汽壓差（Vapor Pressure Deficit, VPD）」對牠們的生存至關重要？（VPD 決定了體表水分蒸發的速率，VPD 過高會導致鼠婦在數分鐘內因脫水而神經麻痺）"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養箱內若發生嚴重的「土壤線蟲（Nematodes）」氾濫，利用生物防治法可以引入哪一種天敵來控制？"
      },
      "options": [
        {
          "type": "text",
          "content": "噴灑高濃度的銅離子溶液來消滅線蟲，同時對鼠婦完全無害"
        },
        {
          "type": "text",
          "content": "引入大量大型捕食性步甲或蜈蚣來直接獵殺所有的土壤線蟲"
        },
        {
          "type": "text",
          "content": "捕食性蟎類如 Hypoaspis miles 或線蟲捕捉天敵"
        },
        {
          "type": "text",
          "content": "引入寄生性蜂類，專門將卵產在線蟲體內以達到生物滅絕效果"
        }
      ],
      "correct": 2,
      "explanation": "飼養箱內若發生嚴重的「土壤線蟲（Nematodes）」氾濫，利用生物防治法可以引入哪一種天敵來控制？（捕食性蟎類如 Hypoaspis miles 或線蟲捕捉天敵）"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium klugii 'Montenegro' 的背甲邊緣具有獨特的「鋸齒狀或外翻邊緣」，這在演化上對防禦掠食者有什麼物理作用？"
      },
      "options": [
        {
          "type": "text",
          "content": "能藉由肌肉收縮讓鋸齒互相摩擦發出高頻聲音，藉此嚇阻小型哺乳類掠食者"
        },
        {
          "type": "text",
          "content": "在爬行時能像輪胎花紋一樣抓地，防止在光滑的石灰岩壁上滑落摔傷"
        },
        {
          "type": "text",
          "content": "當捲成球體時，外翻邊緣能緊密咬合形成防護罩，防止掠食性昆蟲的口器刺入"
        },
        {
          "type": "text",
          "content": "作為太陽能集熱板，能快速吸收環境熱能來提高清晨的活動代謝率"
        }
      ],
      "correct": 2,
      "explanation": "Armadillidium klugii 'Montenegro' 的背甲邊緣具有獨特的「鋸齒狀或外翻邊緣」，這在演化上對防禦掠食者有什麼物理作用？（當捲成球體時，外翻邊緣能緊密咬合形成防護罩，防止掠食性昆蟲的口器刺入）"
    },
    {
      "q": {
        "type": "text",
        "content": "某些高海拔或寒帶分佈的等足類（例如某些 Trichoniscidae 科成員）演化出了什麼特殊的抗寒生理機制？"
      },
      "options": [
        {
          "type": "text",
          "content": "將體內的水分完全排乾，僅依靠體內殘存的油脂進行極低溫度的休眠"
        },
        {
          "type": "text",
          "content": "在冬季來臨時集體分泌厚重的繭將自己包裹，並進入完全無代謝的冷凍狀態"
        },
        {
          "type": "text",
          "content": "合成海藻糖（Trehalose）或抗凍蛋白以降低體液冰點"
        },
        {
          "type": "text",
          "content": "主動挖掘數公尺深的凍土地下道，靠著地熱維持夏季時的正常活動生理"
        }
      ],
      "correct": 2,
      "explanation": "某些高海拔或寒帶分佈的等足類（例如某些 Trichoniscidae 科成員）演化出了什麼特殊的抗寒生理機制？（合成海藻糖（Trehalose）或抗凍蛋白以降低體液冰點）"
    },
    {
      "q": {
        "type": "text",
        "content": "關於鼠婦的「視覺神經傳導」，雖然複眼結構簡單，但牠們對光譜中的哪一個波段最為敏感，飼養觀察時應避免使用該波段燈光？"
      },
      "options": [
        {
          "type": "text",
          "content": "對黃橘色光譜反應最強烈，夜間應全面採用藍光燈管進行低擾動觀察"
        },
        {
          "type": "text",
          "content": "對波長極短的紫外線波段最為敏感，觀察時必須使用防紫外線玻璃"
        },
        {
          "type": "text",
          "content": "對紅外線熱輻射波段極度敏感，任何白熾燈泡都會導致其視網膜永久燒毀"
        },
        {
          "type": "text",
          "content": "對藍綠光波段較敏感，夜間觀察建議使用紅光"
        }
      ],
      "correct": 3,
      "explanation": "關於鼠婦的「視覺神經傳導」，雖然複眼結構簡單，但牠們對光譜中的哪一個波段最為敏感，飼養觀察時應避免使用該波段燈光？（對藍綠光波段較敏感，夜間觀察建議使用紅光）"
    },
    {
      "q": {
        "type": "text",
        "content": "在高階鼠婦的商業繁殖中，為什麼「分槽隔離淘汰法（Line breeding）」是維持特殊基因表現量（如極致紅斑或高密度白色斑塊）的唯一途徑？"
      },
      "options": [
        {
          "type": "text",
          "content": "防止隱性基因被野生型基因稀釋，並持續淘汰劣質或表現型不穩定的個體"
        },
        {
          "type": "text",
          "content": "為了防止不同品種之間發生雜交導致基因庫遭到外來細菌感染"
        },
        {
          "type": "text",
          "content": "可以有效刺激雌性鼠婦的荷爾蒙分泌，將每胎產卵量提升至原本的三倍以上"
        },
        {
          "type": "text",
          "content": "能強制改變子代性染色體的排列順序，確保每一代都能產出 100% 的純雌性後代"
        }
      ],
      "correct": 0,
      "explanation": "在高階鼠婦的商業繁殖中，為什麼「分槽隔離淘汰法（Line breeding）」是維持特殊基因表現量（如極致紅斑或高密度白色斑塊）的唯一途徑？（防止隱性基因被野生型基因稀釋，並持續淘汰劣質或表現型不穩定的個體）"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris sp. \"Blue Pigeon\"（藍鴿鼠婦）的體色呈現特殊的灰藍色，其藍色調的物理成因是由於外骨骼表面的什麼結構產生的？"
      },
      "options": [
        {
          "type": "text",
          "content": "外骨骼表層沉積了大量的藍銅礦微粒，透過化學鍵結形成永久性藍色"
        },
        {
          "type": "text",
          "content": "奈米結構產生的物理性結構色 / Structural coloration，而非單純色素"
        },
        {
          "type": "text",
          "content": "表皮細胞中含有特殊的藍色螢光蛋白，在黑暗中會散發微弱藍光"
        },
        {
          "type": "text",
          "content": "由於長期攝取富含藍色藻類的食物，導致色素沉積在脂肪體內部透出外表"
        }
      ],
      "correct": 0,
      "explanation": "Cubaris sp. \"Blue Pigeon\"（藍鴿鼠婦）的體色呈現特殊的灰藍色，其藍色調的物理成因是由於外骨骼表面的什麼結構產生的？（奈米結構產生的物理性結構色 / Structural coloration，而非單純色素）"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼有些鼠婦在長期攝取單一食物（例如僅餵食單一種蔬菜）後會出現消化道堵塞或營養性死亡？"
      },
      "options": [
        {
          "type": "text",
          "content": "單一食物無法提供足夠的鈉離子，導致鼠婦的心臟肌肉因失去電解質而停止跳動"
        },
        {
          "type": "text",
          "content": "單一蔬菜中的硝酸鹽含量過高，會直接在鼠婦胃內產生化學反應形成結晶堵塞"
        },
        {
          "type": "text",
          "content": "缺乏木質素分解酶或必需脂肪酸，導致腸道菌群失衡"
        },
        {
          "type": "text",
          "content": "蔬菜表面的殘留水分過高，會直接導致鼠婦的胃部吸水膨脹破裂"
        }
      ],
      "correct": 2,
      "explanation": "為什麼有些鼠婦在長期攝取單一食物（例如僅餵食單一種蔬菜）後會出現消化道堵塞或營養性死亡？（缺乏木質素分解酶或必需脂肪酸，導致腸道菌群失衡）"
    },
    {
      "q": {
        "type": "text",
        "content": "當飼養箱內的濕度計顯示相對濕度高達 90% 以上但通風不良時，為什麼鼠婦仍然會出現脫水死亡的假象？"
      },
      "options": [
        {
          "type": "text",
          "content":"濕度過高會使外骨骼表面的水分張力過大，導致鼠婦無法順利張開口器進食而餓死"
        },
        {
          "type": "text",
          "content": "高濕度會加速空氣中的細菌繁殖，細菌會大量消耗氧氣導致鼠婦窒息而死"
        },
        {
          "type": "text",
          "content":  "因為空氣滯留導致偽氣管周圍局部微氣候的二氧化碳過高、氨氣中毒，引發神經系統麻痺而非單純脫水"
        },
        {
          "type": "text",
          "content": "高濕氣會破壞鼠婦體表的防水蠟質層，使體內水分以更快的速度向外蒸發流失"
        }
      ],
      "correct": 2,
      "explanation": "當飼養箱內的濕度計顯示相對濕度高達 90% 以上但通風不良時，為什麼鼠婦仍然會出現脫水死亡的假象？（因為空氣滯留導致偽氣管周圍局部微氣候的二氧化碳過高、氨氣中毒，引發神經系統麻痺而非單純脫水）"
    },
    {
      "q": {
        "type": "text",
        "content": "Armadillidium corcyraeum 或某些地中海特有種，其雄性個體的生殖附肢（Pleopodal exopodite I/II）在顯微鏡下具有什麼高階分類鑑別價值？"
      },
      "options": [
        {
          "type": "text",
          "content": "其長度比例直接對應其年齡與脫殼次數，能精準推算個體的壽命"
        },
        {
          "type": "text",
          "content": "其特化的交接刺結構與剛毛排列是區分近緣種的決定性依據"
        },
        {
          "type": "text",
          "content": "具備強大的抓握勾爪，專門用於在交配時將雌性牢牢固定在背部"
        },
        {
          "type": "text",
          "content": "內含能分泌費洛蒙的特殊腺體，其孔洞大小是區分地理亞種的唯一指標"
        }
      ],
      "correct": 1,
      "explanation": "Armadillidium corcyraeum 或某些地中海特有種，其雄性個體的生殖附肢（Pleopodal exopodite I/II）在顯微鏡下具有什麼高階分類鑑別價值？（其特化的交接刺結構與剛毛排列是區分近緣種的決定性依據）"
    },
    {
      "q": {
        "type": "text",
        "content": "試述鼠婦的「蛻皮激素（Ecdysone）」是由哪一個內分泌腺體釋放，並受抑制激素（Inhibiting hormone）如何調控？"
      },
      "options": [
        {
          "type": "text",
          "content": "由大顎腺分泌，受腦下垂體釋放的促甲狀腺素激發進行正回饋加速"
        },
        {
          "type": "text",
          "content": "由 Y-器官分泌，受來自眼柄/頭部竇腺複合體的蛻皮抑制激素（MIH）負回饋調控"
        },
        {
          "type": "text",
          "content": "由中腸壁分泌，受血淋巴中的鈣離子濃度高低進行直接物理性調控"
        },
        {
          "type": "text",
          "content": "由腹神經索的神經分泌細胞釋放，受環境光照強短的生理時鐘直接控制"
        }
      ],
      "correct": 1,
      "explanation": "試述鼠婦的「蛻皮激素（Ecdysone）」是由哪一個內分泌腺體釋放，並受抑制激素（Inhibiting hormone）如何調控？（由 Y-器官分泌，受來自眼柄/頭部竇腺複合體的蛻皮抑制激素（MIH）負回饋調控）"
    },
    {
      "q": {
        "type": "text",
        "content": "為什麼在佈置高濕度雨林屬（如 Cubaris 或 Merulanella）的飼養箱時，底土必須含有豐富的「泥炭苔與腐植質複合層」？"
      },
      "options": [
        {
          "type": "text",
          "content": "吸引大量土壤線蟲進駐，作為雨林鼠婦日常主要的蛋白質補充來源"
        },
        {
          "type": "text",
          "content": "提供高硬度的碳酸鈣顆粒，供鼠婦在隨時隨地進食以補充脫殼所需鈣質"
        },
        {
          "type": "text",
          "content": "形成完全不透水的物理隔離層，防止底層積水引發細菌滋生"
        },
        {
          "type": "text",
          "content": "維持穩定的弱酸性環境，並提供持續釋放腐殖酸與微生物的緩衝能力"
        }
      ],
      "correct": 3,
      "explanation": "為什麼在佈置高濕度雨林屬（如 Cubaris 或 Merulanella）的飼養箱時，底土必須含有豐富的「泥炭苔與腐植質複合層」？（維持穩定的弱酸性環境，並提供持續釋放腐殖酸與微生物的緩衝能力）"
    },
    {
      "q": {
        "type": "text",
        "content": "檢視陸生等足類的系統發育樹（Phylogenetic tree），牠們從水生轉為陸生的演化路徑中，哪一個生理系統的改造最為艱難？"
      },
      "options": [
        {
          "type": "text",
          "content": "神經系統從網狀神經完全集中為高度發達的大腦與小腦複合結構"
        },
        {
          "type": "text",
          "content": "呼吸系統從鰓演化為內部氣管/偽氣管，以及排泄系統由排泄氨改為陸生適應"
        },
        {
          "type": "text",
          "content": "消化系統由原先的肉食性徹底轉化為僅能依靠纖維素維生的草食性結構"
        },
        {
          "type": "text",
          "content": "運動系統從原本的游泳用胸肢全面轉化為飛行用的膜質翅膀構造"
        }
      ],
      "correct": 1,
      "explanation": "檢視陸生等足類的系統發育樹（Phylogenetic tree），牠們從水生轉為陸生的演化路徑中，哪一個生理系統的改造最為艱難？（呼吸系統從鰓演化為內部氣管/偽氣管，以及排泄系統由排泄氨改為陸生適應）"
    },
    {
      "q": {
        "type": "text",
        "content": "某些鼠婦品系在遭遇劇烈震動時會釋放微量的「揮發性防禦有機分子」，這些分子的主要化學結構通常包含哪一類化合物？"
      },
      "options": [
        {
          "type": "text",
          "content": "高濃度的強酸性鹽類水溶液，接觸皮膚會引起強烈灼燒感"
        },
        {
          "type": "text",
          "content": "劇毒性的類神經毒素蛋白質，能直接麻痺掠食性昆蟲的中樞神經"
        },
        {
          "type": "text",
          "content": "萜烯類或低分子量脂肪酸衍生物"
        },
        {
          "type": "text",
          "content": "帶有強烈腐臭味的硫化物氣體，主要用於模擬動物屍體以混淆視聽"
        }
      ],
      "correct": 2,
      "explanation": "某些鼠婦品系在遭遇劇烈震動時會釋放微量的「揮發性防禦有機分子」，這些分子的主要化學結構通常包含哪一類化合物？（萜烯類或低分子量脂肪酸衍生物）"
    },
    {
      "q": {
        "type": "text",
        "content": "飼養箱內的「生物碳循環」中，鼠婦將落葉分解為微細糞便後，下一階段主要依賴什麼生物將其轉化為植物可吸收的無機鹽？"
      },
      "options": [
        {
          "type": "text",
          "content": "飼養箱內種植的活體苔蘚根系直接吸收並轉化"
        },
        {
          "type": "text",
          "content": "大型土壤蚯蚓的再次吞食與消化道酵素分解"
        },
        {
          "type": "text",
          "content": "土壤細菌、放線菌與真菌群落"
        },
        {
          "type": "text",
          "content": "空氣中的紫外線照射進行光化學降解作用"
        }
      ],
      "correct": 2,
      "explanation": "飼養箱內的「生物碳循環」中，鼠婦將落葉分解為微細糞便後，下一階段主要依賴什麼生物將其轉化為植物可吸收的無機鹽？（土壤細菌、放線菌與真菌群落）"
    },
    {
      "q": {
        "type": "text",
        "content": "Cubaris sp. \"Pak Chong\"（帕克鼠婦）原產於泰國哪一種特殊地質區域？"
      },
      "options": [
        {
          "type": "text",
          "content": "巴衝縣的石灰岩山洞外圍森林及溶洞堆積區"
        },
        {
          "type": "text",
          "content": "位於泰國南部的熱帶紅樹林潮間帶泥灘地"
        },
        {
          "type": "text",
          "content": "泰國北部高海拔山區的常綠闊葉林腐木堆中"
        },
        {
          "type": "text",
          "content": "曼市近郊經年淹水的淡水沼澤區邊緣草叢"
        }
      ],
      "correct": 0,
      "explanation": "Cubaris sp. \"Pak Chong\"（巴衝鼠婦）原產於泰國哪一種特殊地質區域？（巴衝縣的石灰岩山洞外圍森林及溶洞堆積區）"
    },
    {
      "q": {
        "type": "text",
        "content": "基因突變中的「Leucistic」（黃化/體色退化但不影響眼球顏色）與「Albino」（白化且紅眼）在繁殖育種上的最大基因差異是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "Leucistic 屬於顯性遺傳，而 Albino 屬於性聯遺傳，兩者無法在同一品系共存"
        },
        {
          "type": "text",
          "content": "Leucistic 保留了眼部的黑色素，通常在視力與對光的適應力上遠優於 Albino"
        },
        {
          "type": "text",
          "content": "Leucistic 的基因突變位置發生在粒線體DNA上，而 Albino 則在性染色體上"
        },
        {
          "type": "text",
          "content": "Leucistic 個體完全不具備繁殖能力，而 Albino 則擁有超乎常人的產卵數"
        }
      ],
      "correct": 1,
      "explanation": "基因突變中的「Leucistic」（黃化/體色退化但不影響眼球顏色）與「Albino」（白化且紅眼）在繁殖育種上的最大基因差異是什麼？（Leucistic 保留了眼部的黑色素，通常在視力與對光的適應力上遠優於 Albino）"
    },
    {
      "q": {
        "type": "text",
        "content": "在建構一個完美的、可自主運作數年不需換土的頂級生物活性鼠婦飼養生態缸時，最核心的系統動態平衡公式是什麼？"
      },
      "options": [
        {
          "type": "text",
          "content": "「嚴格杜絕任何跳蟲與其他昆蟲進入，僅保留單一純種鼠婦以避免食物競爭」"
        },
        {
          "type": "text",
          "content": "「餵食量 = 鼠婦體重的兩倍」，並確保每週透過人工強制換水來排除所有代謝廢物"
        },
        {
          "type": "text",
          "content": "「濕度保持 100% 飽和，且每兩天補充一次化學合成的微量元素與維生素溶液」"
        },
        {
          "type": "text",
          "content": "「碳源輸入量 = 鼠婦與分解者消耗量 + 微生物降解率」，並嚴格鎖定 VPD、碳酸鈣補給與乾濕分區的動態恆定"
        }
      ],
      "correct": 3,
      "explanation": "在建構一個完美的、可自主運作數年不需換土的頂級生物活性鼠婦飼養生態缸時，最核心的系統動態平衡公式是什麼？（「碳源輸入量 = 鼠婦與分解者消耗量 + 微生物降解率」，並嚴格鎖定 VPD、碳酸鈣補給與乾濕分區的動態恆定）"
    }
  ]
};

// ===== 主组件 =====
const IsopodGameWithLeaderboard = () => {
  // ===== 所有 useState 在最上方 =====
  const [gameState, setGameState] = useState('start');
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [leaderboard, setLeaderboard] = useState({ easy: [], hard: [], hell: [] });
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState('easy');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [newUnlockedCards, setNewUnlockedCards] = useState([]);
  const [showCardUnlock, setShowCardUnlock] = useState(false);
  const [cardCollection] = useState(initializeCardCollection());
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
 

useEffect(() => {
    console.log('gameState:', gameState, 'showDifficultySelect:', showDifficultySelect);
  }, [gameState, showDifficultySelect]);
  // Firebase 初始化
  useEffect(() => {
    if (db && auth) {
      signInAnonymously(auth).catch(err => console.log('匿名登入失敗：', err));
      loadLeaderboard();
    }
  }, []);

  // 倒计时逻辑
  useEffect(() => {
  if (gameState !== 'playing') return;
  
  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        playSound('timeout');
        setAnswers([...answers, -1]);
        setTimeout(() => {
          if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
          } else {
            setGameState('results');
          }
        }, 500);
        return 60;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(timer);
}, [gameState, currentQuestion, questions.length, answers]);

 // 重置时间
useEffect(() => {
  if (gameState === 'playing') {
    setTimeLeft(60);
  }
}, [currentQuestion, gameState]);

  // 載入排行榜
const loadLeaderboard = async () => {
  if (!db) {
    console.log('db 为空，跳过加载排行榜');
    return;
  }
  try {
    console.log('开始加载排行榜...');
    const difficulties = ['easy', 'hard', 'hell'];
    const newLeaderboard = {};
    
    for (const diff of difficulties) {
      console.log('正在查询难度：', diff);
      const q = query(
        collection(db, 'leaderboard'),
        where('difficulty', '==', diff),
        orderBy('score', 'desc'),
        limit(15)
      );
      const snapshot = await getDocs(q);
      console.log(`难度 ${diff} 查询结果数：`, snapshot.docs.length);
      
      newLeaderboard[diff] = snapshot.docs.map(doc => ({
        name: doc.data().name,
        score: doc.data().score,
        date: doc.data().date
      }));
    }
    
    console.log('排行榜加载成功:', newLeaderboard);
    setLeaderboard(newLeaderboard);
  } catch (error) {
    console.error('載入排行榜失敗详细错误：', error);
    console.error('错误代码：', error.code);
    console.error('错误信息：', error.message);
  }
};

  // 上傳分數
  const uploadScore = async (name, diff, scorePercentage) => {
  if (!db) {
    console.error('db 为空，Firebase 未初始化');
    alert('排行榜功能未配置');
    return;
  }
  try {
    console.log('开始上传，参数：', { name, diff, scorePercentage });
    const docId = `${name}_${diff}`;
    await setDoc(doc(db, 'leaderboard', docId), {
      name: name,
      difficulty: diff,
      score: Math.round(scorePercentage),
      date: new Date().toLocaleDateString('zh-TW'),
      timestamp: new Date()
    });
    console.log('上传成功！');
    await loadLeaderboard();
    alert('分數已上傳！');
  } catch (error) {
    console.error('上傳失敗详细错误：', error);
    console.error('错误代码：', error.code);
    console.error('错误信息：', error.message);
    alert('上傳失敗，請檢查Firebase配置');
  }
};

  // 評級邏輯
  const getRating = (correct, diff) => {
    const percentage = (correct / 20) * 100;
    
    if (diff === 'easy') {
      if (percentage >= 90) return { level: '勝任者', emoji: '⭐⭐⭐', color: '#00ff88' };
      if (percentage >= 70) return { level: '初學者', emoji: '⭐⭐', color: '#00d9ff' };
      if (percentage >= 50) return { level: '新手', emoji: '⭐', color: '#808080' };
      return { level: '不合格', emoji: '❌', color: '#ff006e' };
    }
    if (diff === 'hard') {
      if (percentage >= 90) return { level: '精通者', emoji: '⭐⭐⭐⭐', color: '#00ff88' };
      if (percentage >= 70) return { level: '勝任者', emoji: '⭐⭐⭐', color: '#00ff88' };
      if (percentage >= 50) return { level: '初學者', emoji: '⭐⭐', color: '#00d9ff' };
      return { level: '不合格', emoji: '❌', color: '#ff006e' };
    }
    if (diff === 'hell') {
      if (percentage >= 90) return { level: '專家', emoji: '🏆', color: '#00ff88' };
      if (percentage >= 80) return { level: '精通者', emoji: '⭐⭐⭐⭐', color: '#00ff88' };
      if (percentage >= 60) return { level: '勝任者', emoji: '⭐⭐⭐', color: '#00ff88' };
      return { level: '不合格', emoji: '❌', color: '#ff006e' };
    }
  };

  const loadQuestions = (selectedDifficulty) => {
    const diffQuestions = defaultQuestions[selectedDifficulty];
    const shuffled = [...diffQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, 20));
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setGameState('playing');
    setShowDifficultySelect(false);
    setTimeLeft(60);
  };

  const handleAnswer = (optionIndex) => {
    // 如果已经答过这题，不再接受点击
  if (hasAnswered) return;
  
  setHasAnswered(true);  // ← 立即禁用再次点击
	const isCorrect = questions[currentQuestion].correct === optionIndex;
    playSound(isCorrect ? 'correct' : 'wrong');
    
    setAnswers([...answers, optionIndex]);
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setTimeout(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setHasAnswered(false);  // ← 下一题时重置
    } else {
      setGameState('results');
    }
  }, 500);
  };

  

  const resetGame = () => {
    setGameState('start');
    setShowDifficultySelect(false);
    setDifficulty(null);
    setCurrentQuestion(0);
    setScore(0);
    setAnswers([]);
    setQuestions([]);
    setShowNameInput(false);
    setTimeLeft(60);
    setShowCardUnlock(false);
    setNewUnlockedCards([]);
	 setHasAnswered(false); 
  };

  const handleAdminLogin = (password) => {
    const ADMIN_PASSWORD = 'admin123';
    if (password === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('密碼錯誤！');
      setAdminPassword('');
    }
  };

  // ===== 管理後台 =====
if (isAdminMode) {
  return <IsopodGameAdmin />;
}

  // ===== 開始畫面 =====
  if (gameState === 'start' && !showDifficultySelect) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }

          .neon-button {
            background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%);
            border: none;
            padding: 18px 60px;
            font-size: 20px;
            font-weight: 700;
            cursor: pointer;
            border-radius: 12px;
            color: #1a1a1a;
            transition: all 0.3s ease;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .neon-button:hover {
            transform: translateY(-5px);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 217, 255, 0.6);
          }

          .admin-badge {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-size: 12px;
            color: #00ff88;
            cursor: pointer;
            padding: 12px 16px;
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            border-radius: 8px;
            transition: all 0.3s;
          }

          .admin-badge:hover {
            background: rgba(0, 255, 136, 0.2);
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
          }

          .icon {
            font-size: 120px;
            animation: float 3s ease-in-out infinite;
            margin-bottom: 30px;
          }
        `}</style>

        <div className="icon">
          <img 
            src="/pic.png" 
            alt="isopod" 
            style={{ width: '300px', height: 'auto', borderRadius: '20px', boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '40px', width: '100%', maxWidth: '900px' }}>
         
		 <button
  className="neon-button"
  onClick={() => {
    console.log('按钮被点击了，showDifficultySelect:', !showDifficultySelect);
    setShowDifficultySelect(true);
  }}
>
  開始挑戰
</button>

          <button
            className="neon-button"
            onClick={() => setGameState('leaderboard')}
            style={{
              background: 'linear-gradient(135deg, #808080 0%, #606060 100%)',
              boxShadow: '0 0 20px rgba(128, 128, 128, 0.5)',
            }}
          >
            🏆 排行榜
          </button>

          <button
            className="neon-button"
            onClick={() => setGameState('cards')}
            style={{
              background: 'linear-gradient(135deg, #ffaa00 0%, #ff6600 100%)',
              boxShadow: '0 0 20px rgba(255, 170, 0, 0.5)',
            }}
          >
            🎴 卡片庫
          </button>
        </div>

        <div style={{ marginTop: '30px', color: '#00ff88', textAlign: 'center' }}>
          已收集卡片: {cardCollection.collected_cards.length} / {cardDefinitions.length}
        </div>

        <div className="admin-badge" onClick={() => setShowAdminLogin(!showAdminLogin)}>
          🔧 管理
        </div>

        {showAdminLogin && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#2a2a2a',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #00ff88',
            boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
            zIndex: 1000,
          }}>
            <h3 style={{ color: '#00ff88', marginBottom: '20px' }}>管理員登入</h3>
            <input
              type="password"
              placeholder="輸入密碼"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin(adminPassword)}
              style={{
                width: '200px',
                padding: '10px',
                marginBottom: '15px',
                border: '1px solid #00ff88',
                borderRadius: '6px',
                background: '#1a1a1a',
                color: '#00ff88',
              }}
              autoFocus
            />
            <br />
            <button
              onClick={() => handleAdminLogin(adminPassword)}
              style={{
                background: '#00ff88',
                color: '#1a1a1a',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '10px',
                fontWeight: '600',
              }}
            >
              登入
            </button>
            <button
              onClick={() => setShowAdminLogin(false)}
              style={{
                background: '#404040',
                color: '#00ff88',
                border: '1px solid #00ff88',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== 難度選擇 =====
  if (gameState === 'start' && showDifficultySelect) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          .difficulty-btn {
            padding: 40px 50px;
            border: none;
            border-radius: 16px;
            font-size: 20px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            color: white;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 15px;
            min-width: 250px;
          }

          .difficulty-btn:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 30px rgba(0, 255, 136, 0.6);
          }

          .btn-easy {
            background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%);
            color: #1a1a1a;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
          }

          .btn-hard {
            background: linear-gradient(135deg, #00d9ff 0%, #0099ff 100%);
            color: #1a1a1a;
            box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
          }

          .btn-hell {
            background: linear-gradient(135deg, #ff006e 0%, #ff4a00 100%);
            color: white;
            box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
          }

          .back-btn {
            position: absolute;
            top: 20px;
            left: 20px;
            background: #00ff88;
            color: #1a1a1a;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          }

          .back-btn:hover {
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          }
        `}</style>

        <button className="back-btn" onClick={() => setShowDifficultySelect(false)}>
          ← 返回
        </button>

        <h2 style={{ color: '#00ff88', fontSize: '32px', marginBottom: '50px', textShadow: '0 0 20px rgba(0, 255, 136, 0.6)' }}>
          選擇難度
        </h2>

        <button
          className="difficulty-btn btn-easy"
          onClick={() => {
            setDifficulty('easy');
            loadQuestions('easy');
          }}
        >
          ⭐ 簡單
        </button>

        <button
          className="difficulty-btn btn-hard"
          onClick={() => {
            setDifficulty('hard');
            loadQuestions('hard');
          }}
        >
          ⭐⭐⭐ 困難
        </button>

        <button
          className="difficulty-btn btn-hell"
          onClick={() => {
            setDifficulty('hell');
            loadQuestions('hell');
          }}
        >
          🔥 地獄
        </button>
      </div>
    );
  }

  // ===== 答題界面 =====
  if (gameState === 'playing' && questions.length > 0) {
    const q = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / 20) * 100;
    const timePercentage = (timeLeft / 60) * 100;

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          .game-container {
            max-width: 800px;
            margin: 0 auto;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(0, 255, 136, 0.2);
            border-radius: 10px;
            margin-bottom: 30px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00ff88, #00d9ff);
            border-radius: 10px;
            transition: width 0.3s ease;
          }

          .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            color: #00ff88;
          }

          .timer {
            font-size: 24px;
            font-weight: 700;
            color: ${timePercentage > 30 ? '#00ff88' : timePercentage > 10 ? '#ffaa00' : '#ff006e'};
            text-shadow: 0 0 10px currentColor;
          }

          .question-card {
            background: rgba(26, 26, 26, 0.8);
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
            margin-bottom: 30px;
            border: 1px solid rgba(0, 255, 136, 0.2);
          }

          .question-text {
            font-size: 20px;
            color: #fff;
            font-weight: 600;
            margin-bottom: 30px;
            line-height: 1.6;
          }

          .options {
            display: grid;
            gap: 12px;
          }

          .option-btn {
            padding: 16px 20px;
            border: 2px solid #00ff88;
            border-radius: 8px;
            background: transparent;
            color: #00ff88;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            font-weight: 500;
          }

          .option-btn:hover {
            background: rgba(0, 255, 136, 0.2);
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
          }
        `}</style>

        <div className="game-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="question-header">
            <span>第 {currentQuestion + 1} / 20 題</span>
            <span className="timer">⏱️ {timeLeft}秒</span>
            <span>✓ {score}/{currentQuestion}</span>
          </div>

<div className="question-card">
  {/* 图片 */}
  {q.q.type === 'image' && (
    <img 
      src={q.q.content}
      alt="题目图片"
      style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', marginBottom: '20px' }}
    />
  )}
  
  {/* 说明文字 */}
  <div className="question-text">
    {q.q.type === 'text' ? q.q.content : (q.q.prompt || '请选择正确答案')}
  </div>
  
  {/* 选项 */}
 <div className="options" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
  {q.options.map((option, idx) => (
    <button
      key={idx}
      className="option-btn"
      onClick={() => handleAnswer(idx)}
	  disabled={hasAnswered} 
      style={{
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '150px'
      }}
    >
      {option.type === 'image' ? (
        <img 
          src={option.content}
          alt={`选项 ${String.fromCharCode(65 + idx)}`}
          style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
        />
      ) : (
        <>
          <span style={{ fontSize: '12px', marginBottom: '8px' }}>{String.fromCharCode(65 + idx)}</span>
          {option.content}
        </>
      )}
    </button>
  ))}
</div>
</div>
        </div>
      </div>
    );
  }

  // ===== 卡片解锁通知 =====
  if (showCardUnlock && newUnlockedCards.length > 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          @keyframes cardFlip {
            0% { transform: rotateY(0deg) scale(1); }
            50% { transform: rotateY(90deg) scale(1.1); }
            100% { transform: rotateY(0deg) scale(1); }
          }

          .card-unlock-container {
            background: rgba(26, 26, 26, 0.9);
            padding: 50px;
            border-radius: 16px;
            border: 2px solid #ffaa00;
            box-shadow: 0 0 50px rgba(255, 170, 0, 0.6);
            text-align: center;
            max-width: 600px;
          }

          .card-unlock-title {
            font-size: 36px;
            color: #ffaa00;
            margin-bottom: 30px;
            text-shadow: 0 0 20px rgba(255, 170, 0, 0.8);
          }

          .unlocked-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
          }

          .card-item {
            background: linear-gradient(135deg, #ffaa00 0%, #ff6600 100%);
            padding: 30px;
            border-radius: 12px;
            font-size: 48px;
            animation: cardFlip 0.8s ease-in-out;
            box-shadow: 0 0 20px rgba(255, 170, 0, 0.5);
          }

          .card-name {
            color: #fff;
            font-size: 14px;
            margin-top: 10px;
            font-weight: 600;
          }

          .continue-btn {
            background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%);
            color: #1a1a1a;
            border: none;
            padding: 15px 40px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
            transition: all 0.3s;
          }

          .continue-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
          }
        `}</style>

        <div className="card-unlock-container">
          <div className="card-unlock-title">🎉 獲得新卡片！</div>
          
          <div className="unlocked-cards">
            {newUnlockedCards.map(cardId => {
  const card = cardDefinitions.find(c => c.id === cardId);
  return (
    <div key={cardId} style={{ marginBottom: '15px', fontSize: '24px' }}>
      <img 
        src={`/cards/${card.image}`}
        alt={card.name}
        style={{ width: '80px', height: '80px', borderRadius: '8px', marginBottom: '10px' }}
      />
      <div style={{ fontSize: '18px', fontWeight: '600' }}>{card.name}</div>
      <div style={{ fontSize: '14px', color: '#00d9ff' }}>{card.description}</div>
    </div>
  );
})}
          </div>

          <button 
            className="continue-btn"
            onClick={() => setShowCardUnlock(false)}
          >
            繼續
          </button>
        </div>
      </div>
    );
  }

  // ===== 結果界面 =====
  if (gameState === 'results') {
    const rating = getRating(score, difficulty);
    const percentage = Math.round((score / 20) * 100);

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          .results-container {
            background: rgba(26, 26, 26, 0.8);
            padding: 50px;
            border-radius: 16px;
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
            text-align: center;
            max-width: 500px;
            margin-bottom: 30px;
            border: 2px solid #00ff88;
          }

          .rating-emoji {
            font-size: 80px;
            margin-bottom: 20px;
          }

          .rating-title {
            font-family: 'Playfair Display', serif;
            font-size: 48px;
            margin-bottom: 10px;
          }

          .score-text {
            font-size: 28px;
            color: #fff;
            margin: 20px 0;
            font-weight: 600;
          }

          .percentage {
            font-size: 48px;
            font-weight: 700;
            color: #00ff88;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
          }

          .button-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .result-btn {
            padding: 12px 28px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
          }

          .result-btn-primary {
            background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%);
            color: #1a1a1a;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
          }

          .result-btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.6);
          }

          .result-btn-secondary {
            background: transparent;
            color: #00ff88;
            border: 2px solid #00ff88;
          }

          .result-btn-secondary:hover {
            background: rgba(0, 255, 136, 0.1);
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
          }
        `}</style>

        <div className="results-container">
          <div className="rating-emoji">{rating.emoji}</div>
          <div className="rating-title" style={{ color: rating.color }}>{rating.level}</div>
          <div className="percentage">{percentage}%</div>
          <div className="score-text">
            你答對了 <strong>{score}</strong> / 20 題
          </div>
        </div>

        <div className="button-group">
          <button className="result-btn result-btn-primary" onClick={resetGame}>
            返回首頁
          </button>
          <button className="result-btn result-btn-primary" onClick={() => setShowNameInput(true)}>
            上傳分數
          </button>
          <button className="result-btn result-btn-secondary" onClick={() => setGameState('leaderboard')}>
            查看排行榜
          </button>
        </div>

        {showNameInput && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#2a2a2a',
            padding: '30px',
            borderRadius: '12px',
            border: '2px solid #00ff88',
            zIndex: 1000,
          }}>
            <h3 style={{ color: '#00ff88', marginBottom: '20px' }}>輸入你的名字</h3>
            <input
              type="text"
              placeholder="名字"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && playerName.trim()) {
                  uploadScore(playerName, difficulty, percentage);
                  setPlayerName('');
                  setShowNameInput(false);
                }
              }}
              style={{
                width: '200px',
                padding: '10px',
                marginBottom: '15px',
                border: '1px solid #00ff88',
                borderRadius: '6px',
                background: '#1a1a1a',
                color: '#00ff88',
              }}
              autoFocus
            />
            <br />
            <button
              onClick={() => {
                if (playerName.trim()) {
                  uploadScore(playerName, difficulty, percentage);
                  setPlayerName('');
                  setShowNameInput(false);
                }
              }}
              style={{
                background: '#00ff88',
                color: '#1a1a1a',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '10px',
                fontWeight: '600',
              }}
            >
              上傳
            </button>
            <button
              onClick={() => setShowNameInput(false)}
              style={{
                background: '#404040',
                color: '#00ff88',
                border: '1px solid #00ff88',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== 排行榜界面 =====
  if (gameState === 'leaderboard') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          .leaderboard-container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(26, 26, 26, 0.8);
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
            border: 2px solid #00ff88;
          }

          .leaderboard-title {
            font-family: 'Playfair Display', serif;
            font-size: 40px;
            color: #00ff88;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
          }

          .difficulty-tabs {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 30px;
          }

          .tab-btn {
            padding: 10px 20px;
            border: 2px solid #00ff88;
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            color: #00ff88;
            transition: all 0.3s;
          }

          .tab-btn.active {
            background: #00ff88;
            color: #1a1a1a;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
          }

          .leaderboard-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            border-bottom: 1px solid rgba(0, 255, 136, 0.2);
            font-size: 16px;
            color: #fff;
          }

          .rank {
            font-weight: 700;
            color: #00ff88;
            min-width: 40px;
            text-align: center;
          }

          .name {
            flex: 1;
            margin-left: 15px;
            color: #00d9ff;
            font-weight: 600;
          }

          .score {
            color: #00ff88;
            font-weight: 700;
            font-size: 18px;
          }
        `}</style>

        <div className="leaderboard-container">
          <div className="leaderboard-title">🏆 排行榜</div>

          <div className="difficulty-tabs">
            <button
              className={`tab-btn ${leaderboardDifficulty === 'easy' ? 'active' : ''}`}
              onClick={() => setLeaderboardDifficulty('easy')}
            >
              簡單
            </button>
            <button
              className={`tab-btn ${leaderboardDifficulty === 'hard' ? 'active' : ''}`}
              onClick={() => setLeaderboardDifficulty('hard')}
            >
              困難
            </button>
            <button
              className={`tab-btn ${leaderboardDifficulty === 'hell' ? 'active' : ''}`}
              onClick={() => setLeaderboardDifficulty('hell')}
            >
              地獄
            </button>
          </div>

          <div>
            {leaderboard[leaderboardDifficulty] && leaderboard[leaderboardDifficulty].length > 0 ? (
              leaderboard[leaderboardDifficulty].map((entry, idx) => (
                <div key={idx} className="leaderboard-item">
                  <div className="rank">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </div>
                  <div className="name">{entry.name}</div>
                  <div className="score">{entry.score}%</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
                暫無排行榜數據
              </div>
            )}
          </div>

          <button
            onClick={resetGame}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '12px',
              background: 'linear-gradient(135deg, #00ff88 0%, #00d9ff 100%)',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)',
            }}
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // ===== 卡片庫界面 =====
  if (gameState === 'cards') {
    const collectedCount = cardCollection.collected_cards.length;
    const totalCount = cardDefinitions.length;

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0f2419 100%)',
        padding: '20px',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}>
        <style>{`
          .card-library-container {
            max-width: 1000px;
            margin: 0 auto;
            background: rgba(26, 26, 26, 0.8);
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.3);
            border: 2px solid #ffaa00;
          }

          .library-title {
            font-family: 'Playfair Display', serif;
            font-size: 40px;
            color: #ffaa00;
            text-align: center;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(255, 170, 0, 0.6);
          }

          .progress-section {
            text-align: center;
            margin-bottom: 30px;
            color: #00ff88;
          }

          .progress-bar {
            width: 100%;
            height: 12px;
            background: rgba(0, 255, 136, 0.2);
            border-radius: 10px;
            margin: 15px 0;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #ffaa00, #ff6600);
            width: ${(collectedCount / totalCount) * 100}%;
            border-radius: 10px;
            transition: width 0.3s ease;
          }

          .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
          }

          .card-display {
            aspect-ratio: 1;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
          }

          .card-collected {
            background: linear-gradient(135deg, #ffaa00 0%, #ff6600 100%);
            box-shadow: 0 0 20px rgba(255, 170, 0, 0.5);
            border: 2px solid #ffaa00;
          }

          .card-collected:hover {
            transform: translateY(-5px);
            box-shadow: 0 0 30px rgba(255, 170, 0, 0.8);
          }

          .card-locked {
            background: rgba(128, 128, 128, 0.3);
            border: 2px solid rgba(128, 128, 128, 0.5);
            color: #808080;
          }

          .card-icon {
            font-size: 48px;
            margin-bottom: 5px;
          }

          .card-id {
            font-size: 14px;
            color: #fff;
            text-align: center;
            width: 100%;
          }

          .card-locked .card-id {
            color: #808080;
          }

          .card-tooltip {
            position: absolute;
            bottom: -50px;
            left: 50%;
            transform: translateX(-50%);
            background: #2a2a2a;
            color: #00ff88;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            border: 1px solid #00ff88;
            opacity: 0;
            transition: opacity 0.3s;
          }

          .card-display:hover .card-tooltip {
            opacity: 1;
          }

          .back-btn {
            background: linear-gradient(135deg, #00ff88 0%, #00d9ff 100%);
            color: #1a1a1a;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
            transition: all 0.3s;
            width: 100%;
          }

          .back-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.6);
          }
        `}</style>

        <div className="card-library-container">
          <div className="library-title">🎴 卡片庫</div>

          <div className="progress-section">
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              已收集 {collectedCount} / {totalCount} 張卡片
            </div>
            <div className="progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>

          <div className="cards-grid">
            {cardDefinitions.map(card => {
              const isCollected = cardCollection.collected_cards.includes(card.id);
              return (
                <div
  key={card.id}
  className={`card-item ${isCollected ? 'card-collected' : 'card-locked'}`}
  onClick={() => isCollected && setSelectedCardId(card.id)}
  style={{ cursor: isCollected ? 'pointer' : 'not-allowed' }}
>
                  {isCollected ? (
                    <img 
      src={`/cards/${card.image}`}
      alt={card.name}
      style={{ width: '120px', height: '180px', borderRadius: '8px', objectFit: 'cover' }}
    />
                  ) : (
                    <>
                      <div className="card-icon">❓</div>
                      <div className="card-id">{card.id}</div>
                    </>
                  )}
                  {isCollected && (
                    <div className="card-tooltip">
                      {card.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="back-btn" onClick={resetGame}>
            返回首頁
          </button>
        </div>
		{selectedCardId && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  }}>
    {(() => {
      const card = cardDefinitions.find(c => c.id === selectedCardId);
      return (
        <div style={{
          position: 'relative',
          textAlign: 'center',
        }}>
          {/* 关闭按钮 */}
          <button
            onClick={() => setSelectedCardId(null)}
            style={{
              position: 'absolute',
              top: '-50px',
              right: 0,
              background: '#ff006e',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '24px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            ✕
          </button>

          <img 
  src={`/cards/${card.image}`}
  alt={card.name}
  style={{ 
    maxWidth: '500px',
    maxHeight: '600px',
    height: 'auto',  // ← 加这行
    width: 'auto',   // ← 加这行
    borderRadius: '16px',
    boxShadow: '0 0 50px rgba(255, 149, 0, 0.8)',
    objectFit: 'contain',  // ← 改成 contain
  }}
/>
          <div style={{
            marginTop: '20px',
            color: '#fff',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', marginBottom: '10px' }}>
              {card.name}
            </div>
            <div style={{ fontSize: '16px', color: '#00d9ff', marginBottom: '5px' }}>
              {card.description}
            </div>
            <div style={{ fontSize: '14px', color: '#ff9500' }}>
              稀有度：{card.rarity}
            </div>
          </div>
        </div>
      );
    })()}
  </div>
)}
      </div>
    );
  }

  return null;
};

export default IsopodGameWithLeaderboard;