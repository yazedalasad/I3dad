import {
  createGameLevel,
  createGameScene,
  createGameChoice,
  createLocalizedText,
} from '../shared';

const he = (value) => createLocalizedText({ he: value });

export const doctorSorokaGame = {
  id: 'doctor_soroka',
  title: 'רופא בסורוקה',
  domain: 'medicine',
  language: 'he',
  status: 'active',
};

export const doctorSorokaLevels = [
  createGameLevel({
    id: 'doctor_soroka_level_1',
    gameId: 'doctor_soroka',
    title: he('מיון פנימי — כאב בחזה וחום'),
    difficulty: 'beginner',
    estimatedMinutes: 8,
    scenes: [
      createGameScene({
        id: 'l1_intro',
        title: he('תחילת המשמרת'),
        body: he(
          'אתה רופא צעיר במיון של סורוקה. נכנס מטופל בן 67 עם חום, שיעול וכאב בחזה בזמן נשימה עמוקה. המטרה שלך היא לשאול נכון, להזמין בדיקות נכונות ולהגיע לאבחנה הסבירה ביותר.'
        ),
        image: require('../assets/level1-overview.png'),
        choices: [
          createGameChoice({
            id: 'l1_start_case',
            title: he('להתחיל את המקרה'),
            description: he('מעבר לקבלת המטופל ובדיקת הפתיחה'),
            nextSceneId: 'l1_triage',
            subjectWeights: {
              medicine: 2,
              biology: 1,
              psychology: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_triage',
        title: he('קבלת המטופל'),
        body: he(
          'המטופל מספר: "שלושה ימים יש לי חום ושיעול, והיום התחיל כאב חד בצד ימין של החזה כשאני נושם עמוק". המדדים: חום 38.5, דופק 104, סטורציה 93%. מה השלב הבא?'
        ),
        choices: [
          createGameChoice({
            id: 'l1_q_history',
            title: he('לשאול שאלות מכוונות על התסמינים'),
            description: he('משך השיעול, ליחה, קוצר נשימה, מחלות רקע ועישון'),
            nextSceneId: 'l1_history_answers',
            subjectWeights: {
              medicine: 4,
              biology: 2,
              psychology: 1,
            },
            isOptimal: true,
            metadata: { branch: 'history' },
          }),
          createGameChoice({
            id: 'l1_jump_ct',
            title: he('להזמין CT חזה מיד בלי בירור נוסף'),
            description: he('בדיקה מתקדמת לפני אנמנזה מסודרת'),
            nextSceneId: 'l1_ct_feedback',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: false,
            metadata: { branch: 'premature_test' },
          }),
          createGameChoice({
            id: 'l1_antibiotics_now',
            title: he('לתת אנטיביוטיקה מייד בלי בדיקה'),
            description: he('קפיצה לטיפול ללא איסוף נתונים'),
            nextSceneId: 'l1_treatment_feedback',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
            metadata: { branch: 'premature_treatment' },
          }),
        ],
      }),

      createGameScene({
        id: 'l1_history_answers',
        title: he('תשובות המטופל'),
        body: he(
          'המטופל מספר על שיעול עם ליחה צהובה, חולשה וקוצר נשימה במאמץ קטן. הוא מעשן לשעבר, ללא כאב מקרין ליד שמאל וללא הזעה קרה. בבדיקה יש חרחורים בבסיס ריאה ימין. מה תרצה עכשיו?'
        ),
        choices: [
          createGameChoice({
            id: 'l1_order_cxr',
            title: he('להזמין צילום חזה ובדיקות דם'),
            description: he('CBC, CRP וצילום חזה כשלב ראשון'),
            nextSceneId: 'l1_results_basic',
            subjectWeights: {
              medicine: 4,
              biology: 3,
              chemistry: 1,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l1_order_troponin_only',
            title: he('להזמין רק טרופונין ואק״ג'),
            description: he('התמקדות מיידית באירוע לבבי בלבד'),
            nextSceneId: 'l1_results_cardiac',
            subjectWeights: {
              medicine: 2,
            },
            isOptimal: false,
          }),
          createGameChoice({
            id: 'l1_discharge',
            title: he('לשחרר את המטופל עם משכך כאבים'),
            description: he('ללא המשך בירור למרות מדדים לא תקינים'),
            nextSceneId: 'l1_bad_discharge',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_ct_feedback',
        title: he('משוב ביניים'),
        body: he(
          'CT יכול להיות שימושי במצבים מסוימים, אבל במיון אתה אמור קודם לקחת אנמנזה טובה ולבחור את הבדיקות הראשונות בצורה יעילה. חזור לשלב בירור ממוקד.'
        ),
        choices: [
          createGameChoice({
            id: 'l1_back_to_history',
            title: he('לחזור ולשאול שאלות מכוונות'),
            nextSceneId: 'l1_history_answers',
            subjectWeights: {
              medicine: 1,
              psychology: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_treatment_feedback',
        title: he('משוב ביניים'),
        body: he(
          'לתת טיפול לפני בירור מסודר עלול להחמיץ אבחנה חשובה. כדאי לאסוף מידע ולבדוק את המטופל לפני החלטה טיפולית.'
        ),
        choices: [
          createGameChoice({
            id: 'l1_return_triage',
            title: he('לחזור ולקחת אנמנזה'),
            nextSceneId: 'l1_history_answers',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_results_basic',
        title: he('תוצאות הבדיקות'),
        body: he(
          'CBC מראה לויקוציטוזיס קל, CRP מוגבר. בצילום חזה יש תסנין באונה תחתונה ימנית. מהי האבחנה הסבירה ביותר?'
        ),
        choices: [
          createGameChoice({
            id: 'l1_dx_pneumonia',
            title: he('דלקת ריאות'),
            description: he('תואם חום, שיעול, ליחה, ממצא בצילום וסטורציה נמוכה'),
            nextSceneId: 'l1_treatment_choice',
            subjectWeights: {
              medicine: 6,
              biology: 3,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l1_dx_panic',
            title: he('התקף חרדה'),
            description: he('לא מסביר את החום והתסנין בצילום'),
            nextSceneId: 'l1_wrong_dx_feedback',
            subjectWeights: {
              psychology: 1,
            },
            isOptimal: false,
          }),
          createGameChoice({
            id: 'l1_dx_costochondritis',
            title: he('כאב שרירי-שלדי בדופן החזה'),
            description: he('לא מסביר את הממצאים המעבדתיים והצילום'),
            nextSceneId: 'l1_wrong_dx_feedback',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_results_cardiac',
        title: he('תוצאות חלקיות'),
        body: he(
          'אק״ג ללא איסכמיה חדה, טרופונין תקין. עדיין לא הסברת את החום, הליחה והחרחורים. מה עכשיו?'
        ),
        choices: [
          createGameChoice({
            id: 'l1_after_cardiac_cxr',
            title: he('להרחיב בירור לזיהום ריאתי עם צילום חזה ובדיקות דם'),
            nextSceneId: 'l1_results_basic',
            subjectWeights: {
              medicine: 3,
              biology: 2,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l1_send_home_after_cardiac',
            title: he('לשחרר כי אין עדות ללב'),
            nextSceneId: 'l1_bad_discharge',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_wrong_dx_feedback',
        title: he('האבחנה אינה מתאימה'),
        body: he(
          'כדאי לחבר בין הסיפור הקליני, המדדים, הממצאים בבדיקה הגופנית והצילום. חשוב לחשוב מה מסביר את כל הממצאים יחד.'
        ),
        choices: [
          createGameChoice({
            id: 'l1_try_dx_again',
            title: he('לבחור שוב את האבחנה'),
            nextSceneId: 'l1_results_basic',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_treatment_choice',
        title: he('בחירת הטיפול הראשוני'),
        body: he(
          'הגעת לדלקת ריאות. המטופל מבוגר, סטורציה מעט נמוכה ויש לו חולשה. מה הטיפול הראשוני המתאים ביותר במיון?'
        ),
        choices: [
          createGameChoice({
            id: 'l1_treat_admit',
            title: he('חמצן לפי צורך, אנטיביוטיקה מתאימה ואשפוז/השגחה'),
            description: he('גישה בטוחה בהתחשב בגיל, סטורציה ומצב קליני'),
            nextSceneId: 'l1_complete',
            subjectWeights: {
              medicine: 5,
              biology: 2,
              psychology: 1,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l1_treat_only_syrup',
            title: he('סירופ שיעול בלבד ושחרור'),
            nextSceneId: 'l1_bad_discharge',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_bad_discharge',
        title: he('סיום לא בטוח'),
        body: he(
          'השחרור במצב הזה אינו בטוח. במשחק הזה אנחנו רוצים לחשוב כמו רופא שמחבר סימפטומים, בדיקה גופנית ותוצאות בסיסיות לפני החלטה. נסה לחזור ולטפל מחדש.'
        ),
        choices: [
          createGameChoice({
            id: 'l1_restart_from_history',
            title: he('לחזור לשלב השאלות'),
            nextSceneId: 'l1_history_answers',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l1_complete',
        title: he('סיכום מקרה 1'),
        body: he(
          'כל הכבוד. זיהית דלקת ריאות בעזרת אנמנזה, בדיקה גופנית, צילום חזה ובדיקות דם. זהו בדיוק סוג החשיבה שהמשחק הזה רוצה לחזק: קודם להבין את התמונה, אחר כך לבחור בדיקות מתאימות ואז טיפול.'
        ),
        choices: [
          createGameChoice({
            id: 'l1_finish',
            title: he('לסיים את שלב 1'),
            description: he('מעבר למסך הסיכום'),
            subjectWeights: {
              medicine: 3,
              biology: 1,
            },
            isOptimal: true,
            metadata: { completesLevel: true },
          }),
        ],
      }),
    ],
  }),

  createGameLevel({
    id: 'doctor_soroka_level_2',
    gameId: 'doctor_soroka',
    title: he('מיון ילדים — כאב בטן חד'),
    difficulty: 'intermediate',
    estimatedMinutes: 9,
    scenes: [
      createGameScene({
        id: 'l2_intro',
        title: he('מקרה חדש'),
        body: he(
          'ילד בן 11 מגיע עם כאב בטן שהחל סביב הטבור ועבר לרביע ימני תחתון, עם בחילה וחום 37.9. ההורים לחוצים. המטרה שלך היא לברר נכון ולהחליט אם מדובר באפנדיציטיס או משהו אחר.'
        ),
        image: require('../assets/level2-overview.png'),
        choices: [
          createGameChoice({
            id: 'l2_start',
            title: he('להתחיל בבירור'),
            nextSceneId: 'l2_triage',
            subjectWeights: {
              medicine: 2,
              biology: 1,
              psychology: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_triage',
        title: he('שלב ראשון'),
        body: he(
          'הילד נראה לא נינוח אבל בהכרה מלאה. הכאב מחמיר בתנועה. מה תעשה קודם?'
        ),
        choices: [
          createGameChoice({
            id: 'l2_history_exam',
            title: he('אנמנזה מכוונת ובדיקה גופנית של הבטן'),
            description: he('שאלות על הקאות, שלשול, תיאבון, שתן, ובדיקה לרגישות וריבאונד'),
            nextSceneId: 'l2_history_answers',
            subjectWeights: {
              medicine: 4,
              biology: 2,
              psychology: 1,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l2_painkiller_home',
            title: he('לתת משכך כאבים ולשלוח הביתה'),
            nextSceneId: 'l2_feedback_bad',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
          }),
          createGameChoice({
            id: 'l2_ct_direct',
            title: he('להזמין CT מיד לכל ילד עם כאב בטן'),
            nextSceneId: 'l2_feedback_ct',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_history_answers',
        title: he('ממצאים מהבירור'),
        body: he(
          'אין שלשול. יש בחילה ואובדן תיאבון. בבדיקה יש רגישות ממוקדת ברביע ימני תחתון והגנת שרירים קלה. מה הצעד הבא?'
        ),
        choices: [
          createGameChoice({
            id: 'l2_order_labs_us',
            title: he('להזמין ספירה, CRP ואולטרסאונד בטן'),
            description: he('בירור מקובל ומתאים לחשד לאפנדיציטיס בילדים'),
            nextSceneId: 'l2_results',
            subjectWeights: {
              medicine: 5,
              biology: 2,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l2_focus_urine_only',
            title: he('להסתפק רק בבדיקת שתן'),
            nextSceneId: 'l2_feedback_partial',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: false,
          }),
          createGameChoice({
            id: 'l2_antibiotics_without_dx',
            title: he('להתחיל אנטיביוטיקה בלי אבחנה מספקת'),
            nextSceneId: 'l2_feedback_bad',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_feedback_ct',
        title: he('משוב ביניים'),
        body: he(
          'לא כל ילד עם כאב בטן צריך CT מיד. כדאי להשתמש תחילה באנמנזה, בדיקה גופנית ובדיקות מתאימות עם פחות קרינה.'
        ),
        choices: [
          createGameChoice({
            id: 'l2_back_to_exam',
            title: he('לחזור לבירור מסודר'),
            nextSceneId: 'l2_history_answers',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_feedback_partial',
        title: he('הבירור עדיין לא מספיק'),
        body: he(
          'בדיקת שתן יכולה לעזור בדיפרנציאל מסוים, אבל כאן יש תמונה קלאסית יותר של אפנדיציטיס. חשוב לבחור בירור שמקדם את האבחנה המרכזית.'
        ),
        choices: [
          createGameChoice({
            id: 'l2_go_to_labs_us',
            title: he('להזמין ספירה ו-US בטן'),
            nextSceneId: 'l2_results',
            subjectWeights: {
              medicine: 2,
              biology: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_results',
        title: he('תוצאות הבדיקות'),
        body: he(
          'בספירה יש לויקוציטוזיס, CRP מעט מוגבר. באולטרסאונד נראה תוספתן מורחב ולא דחיס. מהי האבחנה הסבירה ביותר?'
        ),
        choices: [
          createGameChoice({
            id: 'l2_dx_appendicitis',
            title: he('אפנדיציטיס'),
            description: he('תואם את סיפור הכאב, הבדיקה והממצאים ב-US'),
            nextSceneId: 'l2_treatment',
            subjectWeights: {
              medicine: 6,
              biology: 2,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l2_dx_gastroenteritis',
            title: he('גסטרואנטריטיס'),
            nextSceneId: 'l2_wrong_dx',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: false,
          }),
          createGameChoice({
            id: 'l2_dx_stress',
            title: he('כאב בטן על רקע סטרס'),
            nextSceneId: 'l2_wrong_dx',
            subjectWeights: {
              psychology: 1,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_wrong_dx',
        title: he('האבחנה לא מסבירה את כל התמונה'),
        body: he(
          'המיקום של הכאב, ההתקדמות שלו והממצא ב-US מכוונים יותר לאפנדיציטיס. חשוב לחפש את האבחנה שמסבירה את כל הנתונים יחד.'
        ),
        choices: [
          createGameChoice({
            id: 'l2_try_again',
            title: he('לבחור שוב את האבחנה'),
            nextSceneId: 'l2_results',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_treatment',
        title: he('החלטה טיפולית'),
        body: he(
          'זיהית אפנדיציטיס. מה הפעולה המתאימה ביותר עכשיו?'
        ),
        choices: [
          createGameChoice({
            id: 'l2_surgery_consult',
            title: he('להשאיר בצום, לתת נוזלים ולערב כירורג ילדים'),
            description: he('גישה בטוחה ונכונה למצב כזה'),
            nextSceneId: 'l2_complete',
            subjectWeights: {
              medicine: 5,
              biology: 1,
              psychology: 1,
            },
            isOptimal: true,
          }),
          createGameChoice({
            id: 'l2_home_observe',
            title: he('לשלוח הביתה להשגחה אצל ההורים'),
            nextSceneId: 'l2_feedback_bad',
            subjectWeights: {
              medicine: 0,
            },
            isOptimal: false,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_feedback_bad',
        title: he('הבחירה אינה בטוחה'),
        body: he(
          'במקרה כזה יש סימנים שמחייבים בירור טוב יותר או התערבות מהירה יותר. נסה שוב וחשוב אילו ממצאים מכוונים לאבחנה דחופה.'
        ),
        choices: [
          createGameChoice({
            id: 'l2_restart_path',
            title: he('לחזור לשלב הבירור'),
            nextSceneId: 'l2_history_answers',
            subjectWeights: {
              medicine: 1,
            },
            isOptimal: true,
          }),
        ],
      }),

      createGameScene({
        id: 'l2_complete',
        title: he('סיכום מקרה 2'),
        body: he(
          'יפה מאוד. במקרה הזה עבדת מסודר: שאלת, בדקת, בחרת בדיקות מתאימות והגעת לאפנדיציטיס. כך בונים חשיבה רפואית — לא רק לפי סימפטום אחד, אלא לפי התמונה כולה.'
        ),
        choices: [
          createGameChoice({
            id: 'l2_finish',
            title: he('לסיים את שלב 2'),
            description: he('מעבר למסך הסיכום'),
            subjectWeights: {
              medicine: 3,
              biology: 1,
            },
            isOptimal: true,
            metadata: { completesLevel: true },
          }),
        ],
      }),
    ],
  }),
];
