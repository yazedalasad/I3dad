export const majorCatalog = [
  {
    key: 'computer_science',
    title: { ar: 'علوم الحاسوب', he: 'מדעי המחשב', en: 'Computer Science' },
    summary: {
      ar: 'مسار مناسب لمن يحب المنطق، البرمجة، وحل المشكلات التقنية.',
      he: 'מסלול שמתאים למי שאוהב לוגיקה, תכנות ופתרון בעיות טכנולוגיות.',
      en: 'A strong path for students who enjoy logic, coding, and technical problem solving.',
    },
    requiredSkills: ['computer_science', 'math', 'engineering'],
    relatedTags: {
      ar: ['التكنولوجيا', 'البرمجة', 'المنطق'],
      he: ['טכנולוגיה', 'תכנות', 'לוגיקה'],
      en: ['Technology', 'Coding', 'Logic'],
    },
    bagrutSubjects: {
      ar: ['رياضيات', 'إنجليزي', 'حاسوب أو فيزياء'],
      he: ['מתמטיקה', 'אנגלית', 'מחשבים או פיזיקה'],
      en: ['Math', 'English', 'Computer Science or Physics'],
    },
    careers: {
      ar: ['مطور برمجيات', 'محلل نظم', 'أمن سيبراني'],
      he: ['מפתח תוכנה', 'מנתח מערכות', 'סייבר'],
      en: ['Software Developer', 'Systems Analyst', 'Cybersecurity'],
    },
    institutions: ['Ben-Gurion University', 'SCE', 'Open University', 'Technion'],
    miniTaskKey: 'computer_science',
  },
  {
    key: 'nursing',
    title: { ar: 'تمريض', he: 'סיעוד', en: 'Nursing' },
    summary: {
      ar: 'مسار لمن يحب مساعدة الناس، العمل السريري، والانضباط.',
      he: 'מסלול למי שאוהב לעזור לאנשים, עבודה קלינית ומשמעת.',
      en: 'A path for students who enjoy helping people, clinical work, and discipline.',
    },
    requiredSkills: ['biology', 'medicine', 'hebrew'],
    relatedTags: {
      ar: ['المجال الطبي', 'الرعاية', 'التواصل'],
      he: ['תחום רפואי', 'טיפול', 'תקשורת'],
      en: ['Medical field', 'Care', 'Communication'],
    },
    bagrutSubjects: {
      ar: ['بيولوجيا', 'عبري', 'إنجليزي'],
      he: ['ביולוגיה', 'עברית', 'אנגלית'],
      en: ['Biology', 'Hebrew', 'English'],
    },
    careers: {
      ar: ['ممرض/ة', 'طوارئ', 'صحة مجتمع'],
      he: ['אח/ות', 'מיון', 'בריאות קהילה'],
      en: ['Nurse', 'Emergency Care', 'Community Health'],
    },
    institutions: ['Ben-Gurion University', 'Kaye College', 'Sapir'],
    miniTaskKey: 'nursing',
  },
  {
    key: 'medicine',
    title: { ar: 'طب', he: 'רפואה', en: 'Medicine' },
    summary: {
      ar: 'مسار عالي التحدي يحتاج فهم علمي، دقة، وصبر طويل.',
      he: 'מסלול מאתגר מאוד שדורש הבנה מדעית, דיוק וסבלנות ארוכה.',
      en: 'A highly demanding path that requires strong science, precision, and persistence.',
    },
    requiredSkills: ['biology', 'medicine', 'chemistry'],
    relatedTags: {
      ar: ['الصحة', 'التحليل الطبي', 'المسؤولية'],
      he: ['בריאות', 'חשיבה רפואית', 'אחריות'],
      en: ['Health', 'Medical reasoning', 'Responsibility'],
    },
    bagrutSubjects: {
      ar: ['بيولوجيا', 'كيمياء', 'رياضيات'],
      he: ['ביולוגיה', 'כימיה', 'מתמטיקה'],
      en: ['Biology', 'Chemistry', 'Math'],
    },
    careers: {
      ar: ['طبيب', 'باحث سريري', 'رعاية تخصصية'],
      he: ['רופא', 'חוקר קליני', 'רפואה מתקדמת'],
      en: ['Doctor', 'Clinical Researcher', 'Specialized Care'],
    },
    institutions: ['Ben-Gurion University', 'Technion'],
    miniTaskKey: 'medicine',
  },
  {
    key: 'engineering',
    title: { ar: 'هندسة', he: 'הנדסה', en: 'Engineering' },
    summary: {
      ar: 'مسار مناسب لمن يحب الفيزياء، التصميم العملي، وبناء الحلول.',
      he: 'מסלול שמתאים למי שאוהב פיזיקה, תכנון מעשי ובניית פתרונות.',
      en: 'A strong fit for students who enjoy physics, practical design, and building solutions.',
    },
    requiredSkills: ['physics', 'engineering', 'math'],
    relatedTags: {
      ar: ['فيزياء', 'تصميم', 'حل مشاكل'],
      he: ['פיזיקה', 'תכנון', 'פתרון בעיות'],
      en: ['Physics', 'Design', 'Problem solving'],
    },
    bagrutSubjects: {
      ar: ['رياضيات', 'فيزياء', 'إنجليزي'],
      he: ['מתמטיקה', 'פיזיקה', 'אנגלית'],
      en: ['Math', 'Physics', 'English'],
    },
    careers: {
      ar: ['مهندس كهرباء', 'مهندس ميكانيك', 'إنتاج'],
      he: ['מהנדס חשמל', 'מהנדס מכונות', 'תעשייה'],
      en: ['Electrical Engineer', 'Mechanical Engineer', 'Production'],
    },
    institutions: ['SCE', 'Ben-Gurion University', 'Technion', 'Sapir'],
    miniTaskKey: 'engineering',
  },
  {
    key: 'education',
    title: { ar: 'تربية', he: 'חינוך', en: 'Education' },
    summary: {
      ar: 'مسار مناسب لمن يحب العمل مع طلاب، الشرح، وبناء التأثير.',
      he: 'מסלול למי שאוהב לעבוד עם תלמידים, להסביר ולהשפיע.',
      en: 'A good path for students who like working with learners, explaining, and making impact.',
    },
    requiredSkills: ['education', 'arabic', 'psychology'],
    relatedTags: {
      ar: ['تعليم', 'تواصل', 'صبر'],
      he: ['חינוך', 'תקשורת', 'סבלנות'],
      en: ['Teaching', 'Communication', 'Patience'],
    },
    bagrutSubjects: {
      ar: ['لغة', 'تربية', 'إنجليزي'],
      he: ['שפה', 'חינוך', 'אנגלית'],
      en: ['Language', 'Education', 'English'],
    },
    careers: {
      ar: ['معلم', 'مرشد', 'تربية خاصة'],
      he: ['מורה', 'יועץ', 'חינוך מיוחד'],
      en: ['Teacher', 'Counselor', 'Special Education'],
    },
    institutions: ['Kaye College', 'Achva', 'Open University'],
    miniTaskKey: 'education',
  },
  {
    key: 'business',
    title: { ar: 'إدارة أعمال', he: 'מנהל עסקים', en: 'Business Administration' },
    summary: {
      ar: 'مسار جيد لمن يحب الإدارة، الأرقام، والتخطيط واتخاذ القرار.',
      he: 'מסלול טוב למי שאוהב ניהול, מספרים, תכנון וקבלת החלטות.',
      en: 'A solid path for students who enjoy management, numbers, planning, and decision making.',
    },
    requiredSkills: ['business', 'math', 'law'],
    relatedTags: {
      ar: ['إدارة', 'مال', 'قرارات'],
      he: ['ניהול', 'כסף', 'החלטות'],
      en: ['Management', 'Finance', 'Decisions'],
    },
    bagrutSubjects: {
      ar: ['رياضيات', 'إنجليزي', 'اقتصاد أو إدارة'],
      he: ['מתמטיקה', 'אנגלית', 'כלכלה או ניהול'],
      en: ['Math', 'English', 'Economics or Management'],
    },
    careers: {
      ar: ['إدارة مشاريع', 'محاسبة', 'تسويق'],
      he: ['ניהול פרויקטים', 'חשבונאות', 'שיווק'],
      en: ['Project Management', 'Accounting', 'Marketing'],
    },
    institutions: ['Sapir', 'Ben-Gurion University', 'Open University'],
    miniTaskKey: 'business',
  },
];

export const miniTaskCatalog = {
  computer_science: {
    title: { ar: 'لغز برمجي قصير', he: 'חידת קוד קצרה', en: 'Short coding puzzle' },
    prompt: {
      ar: 'إذا كان عندك تطبيق طلاب، ما أول ميزة تضيفها لتسهيل حياة الطالب؟',
      he: 'אם היה לך אפליקציית תלמידים, איזו תכונה היית מוסיף קודם כדי לעזור לתלמיד?',
      en: 'If you had a student app, what first feature would you add to make student life easier?',
    },
  },
  nursing: {
    title: { ar: 'قرار رعاية سريع', he: 'החלטת טיפול מהירה', en: 'Quick care decision' },
    prompt: {
      ar: 'مريض قلق جدًا قبل الفحص، ما أول خطوة إنسانية ومهنية تقوم بها؟',
      he: 'מטופל לחוץ מאוד לפני בדיקה, מהי הפעולה האנושית והמקצועית הראשונה שתעשה?',
      en: 'A patient is very anxious before an exam. What is the first humane and professional step you would take?',
    },
  },
  medicine: {
    title: { ar: 'تفكير سريري أولي', he: 'חשיבה קלינית ראשונית', en: 'Initial clinical reasoning' },
    prompt: {
      ar: 'طالب جاء بألم وصعوبة تنفس. ما المعلومات الأساسية التي تريد جمعها أولًا؟',
      he: 'מטופל הגיע עם כאב וקוצר נשימה. איזה מידע בסיסי תרצה לאסוף קודם?',
      en: 'A patient arrives with pain and shortness of breath. What core information would you gather first?',
    },
  },
  engineering: {
    title: { ar: 'حل هندسي قصير', he: 'פתרון הנדסי קצר', en: 'Short engineering challenge' },
    prompt: {
      ar: 'إذا كان الجسر يهتز أكثر من المتوقع، ما أول عامل فيزيائي ستراجعه؟',
      he: 'אם גשר רועד יותר מהצפוי, איזה גורם פיזיקלי תבדוק קודם?',
      en: 'If a bridge vibrates more than expected, what physical factor would you inspect first?',
    },
  },
  education: {
    title: { ar: 'موقف تربوي', he: 'סיטואציה חינוכית', en: 'Educational scenario' },
    prompt: {
      ar: 'طالب فقد تركيزه في الحصة. كيف تعيده للمشاركة بدون إحراجه؟',
      he: 'תלמיד איבד ריכוז בשיעור. איך תחזיר אותו להשתתפות בלי להביך אותו?',
      en: 'A student lost focus in class. How would you bring them back into participation without embarrassment?',
    },
  },
  business: {
    title: { ar: 'قرار تجاري', he: 'החלטה עסקית', en: 'Business decision' },
    prompt: {
      ar: 'عندك ميزانية محدودة لمنتج جديد. هل تبدأ بالتسويق أم تحسين الجودة أولًا، ولماذا؟',
      he: 'יש לך תקציב מוגבל למוצר חדש. האם להתחיל בשיווק או בשיפור האיכות קודם, ולמה?',
      en: 'You have a limited budget for a new product. Would you start with marketing or product quality first, and why?',
    },
  },
};

export const institutionsCatalog = [
  {
    code: 'bgu',
    name: 'Ben-Gurion University',
    title: { ar: 'جامعة بن غوريون في النقب', he: 'אוניברסיטת בן-גוריון בנגב', en: 'Ben-Gurion University of the Negev' },
    city: 'Beer Sheva',
    cityLabel: { ar: 'بئر السبع', he: 'באר שבע', en: 'Beer Sheva' },
    type: 'University',
    typeKey: 'university',
    region: 'south',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.bgu.ac.il',
    summary: {
      ar: 'جامعة بحثية قوية في الجنوب مع حضور بارز في الطب والهندسة وعلوم الحاسوب.',
      he: 'אוניברסיטת מחקר חזקה בדרום עם נוכחות בולטת ברפואה, הנדסה ומדעי המחשב.',
      en: 'A strong southern research university with standout medicine, engineering, and computer science programs.',
    },
    fields: {
      ar: ['هندسة', 'علوم الحاسوب', 'طب', 'إدارة', 'علوم طبيعية'],
      he: ['הנדסה', 'מדעי המחשב', 'רפואה', 'ניהול', 'מדעי הטבע'],
      en: ['Engineering', 'Computer Science', 'Medicine', 'Management', 'Natural Sciences'],
    },
    majors: ['computer_science', 'engineering', 'medicine', 'nursing', 'business'],
    admission: {
      ar: 'مناسب غالبًا للطلاب ذوي التحصيل الجيد في الرياضيات والعلوم واللغة الإنجليزية.',
      he: 'מתאים בדרך כלל לתלמידים עם הישגים טובים במתמטיקה, מדעים ואנגלית.',
      en: 'Usually best for students with solid math, science, and English preparation.',
    },
  },
  {
    code: 'sce',
    name: 'SCE',
    title: { ar: 'كلية سامي شمعون للهندسة', he: 'המכללה האקדמית להנדסה סמי שמעון', en: 'Sami Shamoon College of Engineering' },
    city: 'Beer Sheva',
    cityLabel: { ar: 'بئر السبع', he: 'באר שבע', en: 'Beer Sheva' },
    type: 'College',
    typeKey: 'engineering_college',
    region: 'south',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.sce.ac.il',
    summary: {
      ar: 'كلية تطبيقية مناسبة للطلاب الذين يريدون مسارًا عمليًا في الهندسة والتكنولوجيا.',
      he: 'מכללה יישומית המתאימה לסטודנטים שרוצים מסלול מעשי בהנדסה וטכנולוגיה.',
      en: 'An applied college suited to students seeking a practical engineering and technology path.',
    },
    fields: {
      ar: ['هندسة برمجيات', 'هندسة كهرباء', 'هندسة ميكانيكا', 'هندسة صناعية'],
      he: ['הנדסת תוכנה', 'הנדסת חשמל', 'הנדסת מכונות', 'הנדסה תעשייתית'],
      en: ['Software Engineering', 'Electrical Engineering', 'Mechanical Engineering', 'Industrial Engineering'],
    },
    majors: ['computer_science', 'engineering'],
    admission: {
      ar: 'يفضل أساس جيد في الرياضيات والفيزياء لمسارات الهندسة.',
      he: 'מומלץ בסיס טוב במתמטיקה ובפיזיקה למסלולי הנדסה.',
      en: 'A solid base in math and physics is recommended for engineering tracks.',
    },
  },
  {
    code: 'sapir',
    name: 'Sapir',
    title: { ar: 'كلية سابير الأكاديمية', he: 'המכללה האקדמית ספיר', en: 'Sapir Academic College' },
    city: 'Shaar Hanegev',
    cityLabel: { ar: 'شاعر هنيغف', he: 'שער הנגב', en: 'Shaar HaNegev' },
    type: 'College',
    typeKey: 'academic_college',
    region: 'south',
    languages: ['ar', 'he'],
    website: 'https://www.sapir.ac.il',
    summary: {
      ar: 'كلية متعددة المجالات مناسبة للإدارة، الإعلام، والبرامج التطبيقية في الجنوب.',
      he: 'מכללה רב-תחומית המתאימה לניהול, תקשורת ותוכניות יישומיות בדרום.',
      en: 'A multidisciplinary southern college suited for management, media, and practical programs.',
    },
    fields: {
      ar: ['إدارة أعمال', 'إعلام', 'علوم اجتماعية', 'اقتصاد'],
      he: ['מנהל עסקים', 'תקשורת', 'מדעי החברה', 'כלכלה'],
      en: ['Business', 'Communication', 'Social Sciences', 'Economics'],
    },
    majors: ['engineering', 'education', 'business', 'nursing'],
    admission: {
      ar: 'مسارات جيدة للطلاب الذين يريدون دراسة قريبة ومرنة نسبيًا.',
      he: 'מסלולים טובים לסטודנטים המעוניינים בלימודים קרובים וגמישים יחסית.',
      en: 'A good fit for students looking for nearby and relatively flexible study options.',
    },
  },
  {
    code: 'kaye',
    name: 'Kaye College',
    title: { ar: 'كلية كي للتربية', he: 'המכללה האקדמית לחינוך ע"ש קיי', en: 'Kaye Academic College of Education' },
    city: 'Beer Sheva',
    cityLabel: { ar: 'بئر السبع', he: 'באר שבע', en: 'Beer Sheva' },
    type: 'College',
    typeKey: 'education_college',
    region: 'south',
    languages: ['ar', 'he'],
    website: 'https://kaye.ac.il',
    summary: {
      ar: 'كلية متخصصة في التربية وإعداد المعلمين في منطقة الجنوب.',
      he: 'מכללה המתמחה בחינוך ובהכשרת מורים באזור הדרום.',
      en: 'A college focused on education and teacher preparation in the south.',
    },
    fields: {
      ar: ['تربية', 'تعليم ابتدائي', 'تعليم خاص'],
      he: ['חינוך', 'הוראה יסודית', 'חינוך מיוחד'],
      en: ['Education', 'Elementary Teaching', 'Special Education'],
    },
    majors: ['education', 'nursing'],
    admission: {
      ar: 'مناسب لمن يحب العمل مع الأطفال والشرح والتأثير التربوي.',
      he: 'מתאים למי שאוהב עבודה עם ילדים, הסבר והשפעה חינוכית.',
      en: 'Well-suited to students who enjoy teaching, guiding, and working with children.',
    },
  },
  {
    code: 'achva',
    name: 'Achva',
    title: { ar: 'كلية أخفا الأكاديمية', he: 'המכללה האקדמית אחוה', en: 'Achva Academic College' },
    city: 'Kiryat Malakhi',
    cityLabel: { ar: 'كريات ملاخي', he: 'קריית מלאכי', en: 'Kiryat Malakhi' },
    type: 'College',
    typeKey: 'education_college',
    region: 'south',
    languages: ['ar', 'he'],
    website: 'https://new.achva.ac.il',
    summary: {
      ar: 'مؤسسة مناسبة للتربية والعلوم الاجتماعية وبعض البرامج متعددة التخصصات.',
      he: 'מוסד המתאים לחינוך, מדעי החברה ותוכניות רב-תחומיות.',
      en: 'An institution well-suited to education, social sciences, and multidisciplinary paths.',
    },
    fields: {
      ar: ['تربية', 'علم نفس', 'علوم اجتماعية'],
      he: ['חינוך', 'פסיכולוגיה', 'מדעי החברה'],
      en: ['Education', 'Psychology', 'Social Sciences'],
    },
    majors: ['education', 'business'],
    admission: {
      ar: 'ملائمة للطلاب الذين يفضلون بيئة أكاديمية أكثر قربًا ودعمًا.',
      he: 'מתאימה לסטודנטים המעדיפים סביבה אקדמית קרובה ותומכת.',
      en: 'A good fit for students who prefer a more supportive and close academic environment.',
    },
  },
  {
    code: 'open_university',
    name: 'Open University',
    title: { ar: 'الجامعة المفتوحة في إسرائيل', he: 'האוניברסיטה הפתוחה', en: 'The Open University of Israel' },
    city: 'Multiple',
    cityLabel: { ar: 'عدة مدن', he: 'מספר ערים', en: 'Multiple campuses' },
    type: 'University',
    typeKey: 'open_university',
    region: 'multiple',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.openu.ac.il',
    summary: {
      ar: 'جامعة مرنة جدًا تناسب الطلاب الذين يحتاجون تنظيم وقت ودراسة من عدة مناطق.',
      he: 'אוניברסיטה גמישה מאוד המתאימה לסטודנטים הזקוקים לניהול זמן ולימודים ממספר אזורים.',
      en: 'A highly flexible university for students who need adaptable schedules and multiple study locations.',
    },
    fields: {
      ar: ['علوم الحاسوب', 'إدارة', 'تربية', 'علوم اجتماعية'],
      he: ['מדעי המחשב', 'ניהול', 'חינוך', 'מדעי החברה'],
      en: ['Computer Science', 'Management', 'Education', 'Social Sciences'],
    },
    majors: ['computer_science', 'education', 'business'],
    admission: {
      ar: 'خيار ممتاز لمن يحتاج مرونة أو يفضّل التعلم الذاتي التدريجي.',
      he: 'אפשרות מצוינת למי שזקוק לגמישות או מעדיף למידה עצמית מדורגת.',
      en: 'An excellent option for students who need flexibility or prefer gradual independent learning.',
    },
  },
  {
    code: 'hebrew_university',
    name: 'Hebrew University of Jerusalem',
    title: { ar: 'الجامعة العبرية في القدس', he: 'האוניברסיטה העברית בירושלים', en: 'Hebrew University of Jerusalem' },
    city: 'Jerusalem',
    cityLabel: { ar: 'القدس', he: 'ירושלים', en: 'Jerusalem' },
    type: 'University',
    typeKey: 'university',
    region: 'jerusalem',
    languages: ['ar', 'he', 'en'],
    website: 'https://new.huji.ac.il',
    summary: {
      ar: 'جامعة بحثية رائدة مع برامج قوية في العلوم والطب والإنسانيات.',
      he: 'אוניברסיטת מחקר מובילה עם תוכניות חזקות במדעים, רפואה ומדעי הרוח.',
      en: 'A leading research university with strong science, medicine, and humanities programs.',
    },
    fields: {
      ar: ['طب', 'علوم', 'صيدلة', 'علوم إنسانية'],
      he: ['רפואה', 'מדעים', 'רוקחות', 'מדעי הרוח'],
      en: ['Medicine', 'Sciences', 'Pharmacy', 'Humanities'],
    },
    majors: ['medicine', 'nursing', 'computer_science'],
    admission: {
      ar: 'مستوى أكاديمي مرتفع ويحتاج استعدادًا قويًا خاصة في المسارات العلمية.',
      he: 'רמה אקדמית גבוהה ודורשת הכנה חזקה במיוחד במסלולים המדעיים.',
      en: 'A high academic level, especially for science-related paths.',
    },
  },
  {
    code: 'tau',
    name: 'Tel Aviv University',
    title: { ar: 'جامعة تل أبيب', he: 'אוניברסיטת תל אביב', en: 'Tel Aviv University' },
    city: 'Tel Aviv',
    cityLabel: { ar: 'تل أبيب', he: 'תל אביב', en: 'Tel Aviv' },
    type: 'University',
    typeKey: 'university',
    region: 'tel_aviv',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.tau.ac.il',
    summary: {
      ar: 'جامعة كبيرة ومتنوعة مناسبة للمسارات التكنولوجية والإدارية والصحية.',
      he: 'אוניברסיטה גדולה ומגוונת המתאימה למסלולים טכנולוגיים, ניהוליים ובריאותיים.',
      en: 'A large and diverse university suited to technology, management, and health paths.',
    },
    fields: {
      ar: ['علوم الحاسوب', 'إدارة', 'طب', 'هندسة'],
      he: ['מדעי המחשב', 'ניהול', 'רפואה', 'הנדסה'],
      en: ['Computer Science', 'Management', 'Medicine', 'Engineering'],
    },
    majors: ['computer_science', 'business', 'medicine', 'engineering'],
    admission: {
      ar: 'مناسب للطلاب ذوي الدافعية العالية والتحصيل القوي.',
      he: 'מתאים לסטודנטים עם מוטיבציה גבוהה והישגים חזקים.',
      en: 'Best suited to motivated students with strong academic performance.',
    },
  },
  {
    code: 'technion',
    name: 'Technion',
    title: { ar: 'التخنيون - المعهد الإسرائيلي للتكنولوجيا', he: 'הטכניון - מכון טכנולוגי לישראל', en: 'Technion - Israel Institute of Technology' },
    city: 'Haifa',
    cityLabel: { ar: 'حيفا', he: 'חיפה', en: 'Haifa' },
    type: 'University',
    typeKey: 'university',
    region: 'haifa',
    languages: ['he', 'en'],
    website: 'https://www.technion.ac.il',
    summary: {
      ar: 'واحدة من أقوى المؤسسات للهندسة والتكنولوجيا والعلوم الدقيقة.',
      he: 'אחד המוסדות החזקים ביותר להנדסה, טכנולוגיה ומדעים מדויקים.',
      en: 'One of the strongest institutions for engineering, technology, and exact sciences.',
    },
    fields: {
      ar: ['هندسة', 'علوم الحاسوب', 'فيزياء', 'طب'],
      he: ['הנדסה', 'מדעי המחשב', 'פיזיקה', 'רפואה'],
      en: ['Engineering', 'Computer Science', 'Physics', 'Medicine'],
    },
    majors: ['engineering', 'computer_science', 'medicine'],
    admission: {
      ar: 'يفضل للطلاب الأقوياء جدًا في الرياضيات والفيزياء والمنطق.',
      he: 'מומלץ לסטודנטים חזקים מאוד במתמטיקה, פיזיקה ולוגיקה.',
      en: 'Ideal for students who are especially strong in math, physics, and logic.',
    },
  },
  {
    code: 'bar_ilan',
    name: 'Bar-Ilan University',
    title: { ar: 'جامعة بار إيلان', he: 'אוניברסיטת בר-אילן', en: 'Bar-Ilan University' },
    city: 'Ramat Gan',
    cityLabel: { ar: 'رمات غان', he: 'רמת גן', en: 'Ramat Gan' },
    type: 'University',
    typeKey: 'university',
    region: 'center',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.biu.ac.il',
    summary: {
      ar: 'جامعة مناسبة للحاسوب، التربية، والعلوم الاجتماعية.',
      he: 'אוניברסיטה המתאימה למדעי המחשב, חינוך ומדעי החברה.',
      en: 'A university well-suited to computer science, education, and social sciences.',
    },
    fields: {
      ar: ['علوم الحاسوب', 'تربية', 'علم نفس', 'علوم اجتماعية'],
      he: ['מדעי המחשב', 'חינוך', 'פסיכולוגיה', 'מדעי החברה'],
      en: ['Computer Science', 'Education', 'Psychology', 'Social Sciences'],
    },
    majors: ['computer_science', 'education', 'business'],
    admission: {
      ar: 'خيار متوازن بين المسارات العلمية والتربوية والاجتماعية.',
      he: 'בחירה מאוזנת בין מסלולים מדעיים, חינוכיים וחברתיים.',
      en: 'A balanced choice across scientific, educational, and social tracks.',
    },
  },
  {
    code: 'haifa_university',
    name: 'University of Haifa',
    title: { ar: 'جامعة حيفا', he: 'אוניברסיטת חיפה', en: 'University of Haifa' },
    city: 'Haifa',
    cityLabel: { ar: 'حيفا', he: 'חיפה', en: 'Haifa' },
    type: 'University',
    typeKey: 'university',
    region: 'haifa',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.haifa.ac.il',
    summary: {
      ar: 'جامعة متعددة المجالات مناسبة للإدارة، التربية، والمجالات الاجتماعية.',
      he: 'אוניברסיטה רב-תחומית המתאימה לניהול, חינוך ותחומים חברתיים.',
      en: 'A multidisciplinary university suited to management, education, and social fields.',
    },
    fields: {
      ar: ['إدارة', 'تربية', 'خدمات صحية', 'علوم اجتماعية'],
      he: ['ניהול', 'חינוך', 'שירותי בריאות', 'מדעי החברה'],
      en: ['Management', 'Education', 'Health Services', 'Social Sciences'],
    },
    majors: ['business', 'education', 'nursing'],
    admission: {
      ar: 'يلائم الطلاب الذين يريدون مؤسسة كبيرة متعددة الخيارات في الشمال.',
      he: 'מתאים לסטודנטים המעוניינים במוסד גדול עם מגוון אפשרויות בצפון.',
      en: 'A good fit for students seeking a large northern institution with diverse options.',
    },
  },
  {
    code: 'ariel',
    name: 'Ariel University',
    title: { ar: 'جامعة أريئيل', he: 'אוניברסיטת אריאל', en: 'Ariel University' },
    city: 'Ariel',
    cityLabel: { ar: 'أريئيل', he: 'אריאל', en: 'Ariel' },
    type: 'University',
    typeKey: 'university',
    region: 'center',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.ariel.ac.il',
    summary: {
      ar: 'جامعة تقدم برامج في الهندسة والعلوم الصحية والعلوم الاجتماعية.',
      he: 'אוניברסיטה המציעה תוכניות בהנדסה, מדעי הבריאות ומדעי החברה.',
      en: 'A university offering engineering, health sciences, and social science programs.',
    },
    fields: {
      ar: ['هندسة', 'علوم صحية', 'علوم اجتماعية'],
      he: ['הנדסה', 'מדעי הבריאות', 'מדעי החברה'],
      en: ['Engineering', 'Health Sciences', 'Social Sciences'],
    },
    majors: ['engineering', 'nursing', 'business'],
    admission: {
      ar: 'قد يناسب الطلاب الذين يريدون برامج تطبيقية مع بيئة جامعية متوسطة الحجم.',
      he: 'יכול להתאים לסטודנטים המעוניינים בתוכניות יישומיות בסביבה אוניברסיטאית בינונית.',
      en: 'Can suit students looking for applied programs in a mid-sized university environment.',
    },
  },
  {
    code: 'reichman',
    name: 'Reichman University',
    title: { ar: 'جامعة رايخمان', he: 'אוניברסיטת רייכמן', en: 'Reichman University' },
    city: 'Herzliya',
    cityLabel: { ar: 'هرتسليا', he: 'הרצליה', en: 'Herzliya' },
    type: 'University',
    typeKey: 'university',
    region: 'center',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.runi.ac.il',
    summary: {
      ar: 'جامعة معروفة ببرامج الإدارة وريادة الأعمال والحاسوب.',
      he: 'אוניברסיטה המוכרת בתוכניות ניהול, יזמות ומדעי המחשב.',
      en: 'A university known for management, entrepreneurship, and computer science.',
    },
    fields: {
      ar: ['إدارة أعمال', 'ريادة أعمال', 'علوم الحاسوب', 'قانون'],
      he: ['מנהל עסקים', 'יזמות', 'מדעי המחשב', 'משפטים'],
      en: ['Business', 'Entrepreneurship', 'Computer Science', 'Law'],
    },
    majors: ['business', 'computer_science'],
    admission: {
      ar: 'مناسب للطلاب ذوي الدافعية العالية والاهتمام بالقيادة أو الأعمال.',
      he: 'מתאים לסטודנטים עם מוטיבציה גבוהה ועניין בהובלה או עסקים.',
      en: 'A strong fit for motivated students interested in leadership or business.',
    },
  },
  {
    code: 'hit',
    name: 'Holon Institute of Technology',
    title: { ar: 'معهد حولون للتكنولوجيا', he: 'המכון הטכנולוגי חולון', en: 'Holon Institute of Technology' },
    city: 'Holon',
    cityLabel: { ar: 'حولون', he: 'חולון', en: 'Holon' },
    type: 'College',
    typeKey: 'engineering_college',
    region: 'center',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.hit.ac.il',
    summary: {
      ar: 'معهد تطبيقي يجمع بين التكنولوجيا والتصميم والهندسة.',
      he: 'מכון יישומי המשלב טכנולוגיה, עיצוב והנדסה.',
      en: 'An applied institute that combines technology, design, and engineering.',
    },
    fields: {
      ar: ['هندسة', 'تصميم تكنولوجي', 'علوم حاسوب'],
      he: ['הנדסה', 'טכנולוגיות עיצוב', 'מדעי המחשב'],
      en: ['Engineering', 'Design Technology', 'Computer Science'],
    },
    majors: ['engineering', 'computer_science', 'business'],
    admission: {
      ar: 'مناسب للطلاب الذين يحبون الإبداع مع التطبيق العملي.',
      he: 'מתאים לסטודנטים שאוהבים יצירתיות יחד עם יישום מעשי.',
      en: 'A good match for students who like creativity with practical application.',
    },
  },
  {
    code: 'afeka',
    name: 'Afeka College of Engineering',
    title: { ar: 'كلية أفيكا للهندسة', he: 'המכללה האקדמית להנדסה אפקה', en: 'Afeka Academic College of Engineering' },
    city: 'Tel Aviv',
    cityLabel: { ar: 'تل أبيب', he: 'תל אביב', en: 'Tel Aviv' },
    type: 'College',
    typeKey: 'engineering_college',
    region: 'tel_aviv',
    languages: ['ar', 'he', 'en'],
    website: 'https://www.afeka.ac.il',
    summary: {
      ar: 'كلية هندسة مناسبة للطلاب الذين يريدون مسارًا تطبيقيًا في وسط البلاد.',
      he: 'מכללת הנדסה המתאימה לסטודנטים המחפשים מסלול יישומי במרכז הארץ.',
      en: 'An engineering college suited to students seeking an applied path in central Israel.',
    },
    fields: {
      ar: ['هندسة برمجيات', 'هندسة كهرباء', 'هندسة صناعية'],
      he: ['הנדסת תוכנה', 'הנדסת חשמל', 'הנדסה תעשייתית'],
      en: ['Software Engineering', 'Electrical Engineering', 'Industrial Engineering'],
    },
    majors: ['engineering', 'computer_science'],
    admission: {
      ar: 'خيار جيد لمن يحب التكنولوجيا ويريد كلية هندسية تطبيقية.',
      he: 'אפשרות טובה למי שאוהב טכנולוגיה ורוצה מכללה הנדסית יישומית.',
      en: 'A good option for students who like technology and want an applied engineering college.',
    },
  },
];

export function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

export function localizeField(field, language) {
  if (Array.isArray(field)) return field;
  const normalizedLanguage = normalizeLanguage(language);
  return field?.[normalizedLanguage] || field?.en || field?.ar || field?.he || '';
}

export function findMajorByName(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  return (
    majorCatalog.find((major) =>
      [major.title.ar, major.title.he, major.title.en, major.key]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === normalized)
    ) || null
  );
}

export function findInstitutionByName(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  return (
    institutionsCatalog.find((institution) =>
      [institution.name, institution.title?.ar, institution.title?.he, institution.title?.en, institution.code]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === normalized)
    ) || null
  );
}
