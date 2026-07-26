/** GitHub Pages ?¨è¨­å®šï??ƒæ?äº¤åˆ°?‰åº«ï¼?*/
export const CONFIG = {
  /** é¦–é?æ¨™é??å?å­—ç??¬ï?æ¯æ¬¡?¨é€æ›´?°è??å?ï¼Œä?ï¼?4.0 ??34.1ï¼?*/
  APP_VERSION: "39.30",

  /**
   * æ¶…æ? Rapfi å®Œæ•´ NNUE æ¬Šé?ï¼ˆç? 40 MBï¼‰å…¬?‹ä?è¼‰ç¶²?€??   * ?™ç©º?‡ç”¨ç«™å…§ engines/rapfi/full/rapfi.dataï¼ˆè? GitHub Pages ?Œæ?ï¼‰ã€?   * ?¥æ”¹??Firebase Storage ç­‰é›²ç«¯ï?è²¼ä? https://... ?¬é?????³å¯??   */
  RAPFI_NNUE_DATA_URL: "",
  SPREADSHEET_ID: "1CIkz0vH-Dp3xj9K3OUvXO_mfaFwq2-qzEJbQcIyWvPg",
  SHEETS_JSON_URL: "",

  /** ?ç¸¾å¯«å…¥ï¼šå?ä¸€è©¦ç?è¡¨éƒ¨ç½²ç? Apps Script ç¶²å?ï¼ˆè? docs/google-apps-script.gsï¼?*/
  SCORE_LOG_URL:
    "https://script.google.com/macros/s/AKfycbxo0gTXgN_WEaZjhfgPpvMMG5sONKYAkqJCkVN_JLoZ1iq_eBVmD7cwYXRlHPqn_bkRiw/exec",
  SHEET_ZH: "?‹è?",
  SHEET_EN: "?±è?",
  QUIZ_TYPES: ["?Ÿå?"],
  QUIZ_TYPES_ZH: ["?Ÿå?"],
  QUIZ_TYPES_EN: ["?®å?"],

  /** é¦–é??è¨­?Œæœ¬æ¬¡é??¸ã€ï??¯è¢«ä½¿ç”¨?…æ”¹?ç??¸æ?è¦†è?ï¼?*/
  QUIZ_COUNT_DEFAULT: 10,
  PARENT_PIN: "1234",
  CHILD_NAMES: {
    A: "?å?",
    B: "?å¦¤",
  },
  /** PaddleOCR.js ?–å?è¾¨è?ï¼ˆé?æ¬¡è??¥æ¨¡?‹è?ä¹…ï? */
  OCR_ENABLED: true,
  OCR_STRICT: false,
  /** è¾¨è??è??‡æ”¾å¤§ï?å»ºè­°ä¿æ? trueï¼?*/
  OCR_PREPROCESS: true,
  /** ?™å?ä»¥ä??¨ç™½?å–®ï¼›å–®å­—å¦è¦?OCR_WHITELIST_SINGLE_CHAR */
  OCR_USE_WHITELIST: true,
  /** falseï¼šå–®å­—ä???OCR çµæ?ï¼ˆã€Œè??ç?è¼ƒä??“è¢«æ´—æ?ç©ºç™½ï¼?*/
  OCR_WHITELIST_SINGLE_CHAR: false,
  /** è£å?å¾Œæ??­é??ç?ï¼ˆæ?å¤§æ?æº–ã€ç•¥?¢ï? */
  OCR_MIN_SIDE: 280,
  OCR_LENIENT_MIN_SIDE: 340,
  /** ?‹å¯«?¿æ?ä¼¯æ•¸å­—ï?ä¹ä?ä¹˜æ?ï¼?*/
  OCR_NUMERIC_MIN_SIDE: 400,
  OCR_NUMERIC_SINGLE_MIN_SIDE: 480,
  OCR_NUMERIC_CROP_PADDING: 0.28,
  /** ?‹å¯«ç­†ç•«ç²—ç´° */
  OCR_STROKE_WIDTH: 6,
  /** ?ŒéŸ³?“æ··?‚å??¸ä?ï¼›æ?é¡¯å¯«?¯å??´æ¥ç­”éŒ¯ä¸¦è??¥éŒ¯é¡Œæœ¬ */
  HOMOPHONE_PICKER: true,

  /** ç­†ç•«?‹å¯«è¾¨è?ï¼ˆhanzilookup-js ?‹æ?ï¼Œé?æ¬¡æ?ä¸‹è?å­—åº«ï¼?*/
  HANZI_STROKE_ENABLED: true,
  /** ç­†ç•«?™é¸?å¹¾?å…§?‰æ?æº–ç?æ¡ˆå³ç®—å¯«å°ï?æ¸›å? OCR èª¤åˆ¤ï¼?*/
  STROKE_TRUST_TOP_N: 8,
  /** ?¹åˆ¥å®¹æ?èª¤åˆ¤?„å–®å­—ï??¯å?? ï? */
  STROKE_EXTRA_LENIENT_CHARS: ["è¦?, "??],
  STROKE_EXTRA_LENIENT_TOP_N: 12,

  /** ç­”éŒ¯è¤‡å¯«ï¼šHanziWriter ?Šåœ¨?‹å¯«?¼å?å±¤ï?opacity ç´?0.32ï¼?*/
  STROKE_ORDER_ENABLED: true,
  STROKE_ORDER_DELAY: 500,

  /**
   * Firebase ?©å°?‹æ?å°æˆ°ï¼ˆè? docs/firebase-setup.mdï¼?   * ?ªå¡«å¯«æ??Œå…©?°æ?æ©Ÿã€æ?é¡¯ç¤ºè¨­å??™å­¸??   */
  FIREBASE: {
    apiKey: "AIzaSyCt1caYzi7PDeTXEvcES6Sct9q6Lffs2Kk",
    authDomain: "kid-quiz-online.firebaseapp.com",
    databaseURL:
      "https://kid-quiz-online-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kid-quiz-online",
    storageBucket: "kid-quiz-online.firebasestorage.app",
    messagingSenderId: "677976319036",
    appId: "1:677976319036:web:f8f9b0bef1dc877b5acf39",
  },
};
