// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// =============================================================================
// 📦 الموارد - جميع ترجمات التطبيق
// =============================================================================

const resources = {
  ar: {
    translation: {
      // ==================== عام ====================
      common: {
        loading: "جاري التحميل...",
        error: "حدث خطأ",
        success: "تمت العملية بنجاح",
        save: "حفظ",
        cancel: "إلغاء",
        delete: "حذف",
        edit: "تعديل",
        add: "إضافة",
        minutes: "دقيقة",
        km: "كم",
        calories: "سعرة",
        refresh: "تحديث",
        noDate: "لا يوجد تاريخ",
        recommendation: "توصية",
        suggestions: "اقتراحات",
        dismiss: "إغلاق"
      },

      // ==================== النشاط البدني ====================
      activities: {
        title: "تسجيل النشاط البدني",
        description: "سجّل تفاصيل التمارين الرياضية التي قمت بها اليوم.",
        activityType: "نوع النشاط",
        selectActivity: "اختر نوع النشاط",
        duration: "المدة",
        durationPlaceholder: "بالدقائق",
        calories: "السعرات المحروقة",
        caloriesPlaceholder: "تقريبًا",
        distance: "المسافة",
        distancePlaceholder: "بالكيلومتر",
        startTime: "وقت البداية",
        notes: "ملاحظات إضافية",
        notesPlaceholder: "أي ملاحظات إضافية...",
        addActivity: "إضافة النشاط",
        successMessage: "✅ تم تسجيل النشاط البدني بنجاح!",
        submissionError: "فشل التسجيل. يرجى مراجعة البيانات المدخلة.",
        invalidStartTime: "تاريخ ووقت البداية غير صالح.",
        invalidDuration: "المدة المدخلة غير صالحة.",
        sessionExpired: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
        serverError: "خطأ في الخادم. يرجى المحاولة لاحقاً.",
        selectActivityError: "يرجى اختيار نوع النشاط.",
        durationError: "المدة يجب أن تكون على الأقل دقيقة واحدة.",
        startTimeError: "يرجى تحديد وقت البداية.",
        futureTimeError: "وقت البداية لا يمكن أن يكون في المستقبل.",
        walking: "مشي",
        running: "ركض",
        weightlifting: "رفع أثقال",
        swimming: "سباحة",
        yoga: "يوجا",
        pilates: "بيلاتس",
        cardio: "تمارين القلب",
        cycling: "ركوب الدراجة",
        football: "كرة القدم",
        basketball: "كرة السلة",
        tennis: "تنس",
        other: "غير ذلك",
        history: "📋 سجل النشاطات",
        count: "نشاط",
        estimatedCalories: "السعرات المحروقة المتوقعة",
            "durationTooLong": "⚠️ المدة طويلة جداً. الحد الأقصى 180 دقيقة",
    "durationHint": "من 1 إلى 180 دقيقة",
    "id": "معرف",
    "unknown": "غير معروف",
    "editCancelled": "تم إلغاء التعديل"
      },

      // ==================== الحالة المزاجية ====================
      mood: {
        title: "😊 تتبع الحالة المزاجية",
        yourMoodToday: "مزاجك اليوم",
        addToday: "➕ إضافة مزاج اليوم",
        updateToday: "✏️ تحديث مزاج اليوم",
        addNew: "إضافة مزاج جديد",
        chooseMood: "اختر مزاجك",
        factors: "العوامل المؤثرة",
        factorsPlaceholder: "مثال: العمل, العائلة, الطقس, النوم...",
        notes: "ملاحظات",
        notesPlaceholder: "اكتب ما تشعر به بالتفصيل...",
        saveMood: "💾 حفظ المزاج",
        autoRefresh: "التحديث التلقائي",
        lastUpdate: "آخر تحديث",
        recordedAt: "سجلت في",
        history: "📋 السجل التاريخي",
        noRecords: "لا توجد سجلات مزاجية سابقة",
        startRecording: "ابدأ بتسجيل مزاجك الأول لترى تحليلات رحلتك المزاجية",
        deleteConfirm: "هل أنت متأكد من حذف هذه المدخلة؟",
        fetchError: "❌ فشل في تحميل بيانات الحالة المزاجية. يرجى المحاولة مرة أخرى.",
        addError: "❌ فشل في إضافة المزاج. يرجى التحقق من البيانات والمحاولة مرة أخرى.",
        deleteError: "❌ فشل في حذف المدخلة.",
        excellent: "ممتاز",
        good: "جيد",
        neutral: "محايد",
        stressed: "مجهدة",
        anxious: "قلقة",
        sad: "حزين"
      },

      // ==================== العادات والأدوية ====================
      habits: {
        title: "العادات والأدوية",
        todayStats: "إحصائيات اليوم",
        newHabit: "تعريف عادة جديدة",
        habitName: "اسم العادة",
        namePlaceholder: "مثال: شرب 8 أكواب ماء",
        habitDescription: "وصف العادة والهدف منها",
        descriptionPlaceholder: "اشرح الهدف من هذه العادة، مثلاً: لتحسين الترطيب وزيادة الطاقة.",
        addHabitDefinition: "💾 إضافة تعريف العادة",
        todayTracking: "تتبع اليوم",
        habits: "عادة",
        loadingHabits: "جاري تحميل العادات...",
        noHabits: "لا يوجد عادات معرفة بعد. ابدأ بإضافة عادة جديدة.",
        of: "من",
        completed: "عادة مكتملة",
        completeToday: "✓ تم اليوم",
        undo: "↶ إلغاء",
        checkingAuth: "يرجى الانتظار، جاري التحقق من حالة تسجيل الدخول...",
        addSuccess: "✅ تم تعريف العادة \"{{name}}\" بنجاح!",
        addError: "❌ فشل إضافة العادة. تأكد من أن جميع الحقول صالحة.",
        fetchError: "❌ فشل جلب بيانات العادات.",
        authError: "❌ لا يمكن جلب العادات. يرجى تسجيل الدخول أولاً.",
        loginRequired: "❌ يجب تسجيل الدخول لإضافة عادات.",
        emptyFields: "❌ يجب ملء اسم العادة والوصف.",
        logAdded: "✅ تم تسجيل العادة بنجاح!",
        logRemoved: "✅ تم إلغاء تسجيل العادة.",
        updateError: "❌ فشل تحديث سجل العادة."
      },

      // ==================== النوم ====================
      sleep: {
        title: "تتبع النوم",
        startTime: "وقت بداية النوم",
        endTime: "وقت الاستيقاظ",
        quality: "جودة النوم",
        notes: "ملاحظات",
        optional: "اختياري",
        startTimeHelp: "استخدم صيغة 24 ساعة",
        notesPlaceholder: "مثال: أحلام، استيقاظ متكرر، ظروف النوم...",
        submitButton: "تسجيل جلسة النوم",
        resetButton: "إعادة تعيين",
        dismiss: "إغلاق",
        autoRefresh: "التحديث التلقائي",
        lastUpdate: "آخر تحديث",
        calculatedDuration: "مدة النوم المحسوبة",
        hours: "ساعات",
        excellent: "ممتاز",
        veryGood: "جيد جداً",
        average: "متوسط",
        poor: "ضعيف",
        bad: "سيئ",
        successMessage: "✅ تم تسجيل جلسة النوم بنجاح!",
        submissionError: "❌ فشل تسجيل جلسة النوم. تأكد من إدخال البيانات بشكل صحيح.",
        error: "خطأ",
        failed: "فشل",
        invalidData: "❌ بيانات غير صالحة. يرجى التحقق من التواريخ والأوقات.",
        sessionExpired: "❌ انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
        serverError: "❌ خطأ في الخادم. يرجى المحاولة لاحقاً.",
        requiredFields: "يرجى ملء وقت البداية والنهاية.",
        invalidEndTime: "وقت الاستيقاظ يجب أن يكون بعد وقت النوم.",
        futureTimeError: "لا يمكن تسجيل نوم في المستقبل.",
        longDurationError: "مدة النوم طويلة جداً. يرجى التحقق من التواريخ.",
        switchToLight: "التبديل إلى الوضع الفاتح",
        switchToDark: "التبديل إلى الوضع المظلم"
      },

      // ==================== التغذية ====================
      nutrition: {
        title: "إدارة التغذية",
        subtitle: "سجل وجباتك واتبع نظامك الغذائي",
        newMeal: "تسجيل وجبة جديدة",
        dashboard: "لوحة المتابعة",
        lastUpdate: "آخر تحديث",
        autoRefresh: "التحديث التلقائي",
        mealsLogged: "وجبة مسجلة",
        refresh: "تحديث",
        edit: "تعديل",
        delete: "حذف",
        save: "حفظ",
        cancel: "إلغاء",
        loading: "جاري تحميل بيانات التغذية...",
        noMeals: "لا توجد وجبات مسجلة بعد",
        addFirstMeal: "ابدأ بتسجيل وجبتك الأولى",
        mealAdded: "✅ تم إضافة الوجبة بنجاح",
        mealUpdated: "✅ تم تحديث الوجبة بنجاح",
        mealDeleted: "✅ تم حذف الوجبة بنجاح",
        errorLoading: "❌ فشل في تحميل بيانات التغذية",
        errorSaving: "❌ فشل في حفظ الوجبة",
        errorDeleting: "❌ فشل في حذف الوجبة",
        breakfast: "فطور",
        lunch: "غداء",
        dinner: "عشاء",
        snack: "وجبة خفيفة",
        other: "أخرى",
        calories: "السعرات الحرارية",
        protein: "البروتين",
        carbs: "الكربوهيدرات",
        fat: "الدهون",
        fiber: "الألياف",
        sugar: "السكر",
        caloriesUnit: "سعرة",
        gramUnit: "جرام",
        servingUnit: "حصة",
        totalCalories: "إجمالي السعرات",
        averageCalories: "متوسط السعرات",
        dailyGoal: "الهدف اليومي",
        remaining: "المتبقي",
        consumed: "المستهلك",
        tip1: "💡 احرص على شرب الماء مع كل وجبة",
        tip2: "💡 تناول الخضروات مع كل وجبة رئيسية",
        tip3: "💡 قلل من السكريات المضافة",
        tip4: "💡 تناول البروتين في كل وجبة",
        tip5: "💡 اختر الدهون الصحية مثل الأفوكادو والمكسرات",
        today: "اليوم",
        week: "أسبوع",
        month: "شهر",
        autoRefreshActive: "التحديث التلقائي نشط",
        avgProtein: "متوسط البروتين",
        todayCalories: "سعرات اليوم",
        dailyGoalsProgress: "تقدم الأهداف اليومية",
        mealDistribution: "توزيع الوجبات",
        loggedMeals: "الوجبات المسجلة",
        meals: "وجبة",
        ingredients: "المكونات",
        notes: "ملاحظات",
        smartRecommendations: "توصيات ذكية",
        recommendations: {
          caloriesGoal: "🎯 اقتربت من هدف السعرات اليومي! استمر في التوازن",
          moreProtein: "💪 حاول زيادة تناول البروتين في وجباتك (مصادر: دجاج، سمك، بيض)",
          lessCarbs: "🌾 قلل من الكربوهيدرات البسيطة واختر الحبوب الكاملة",
          balanceCalories: "⚖️ احرص على توازن السعرات الحرارية في وجباتك",
          eatBreakfast: "🌅 لا تنسى وجبة الفطور فهي مهمة للطاقة والتمثيل الغذائي",
          mealVariety: "🍎 جرب إضافة أنواع مختلفة من الوجبات لتحقيق تنوع غذائي أفضل",
          balancedDiet: "🎉 نظامك الغذائي متوازن! استمر في هذا النمط الصحي"
        },
        trackYourDiet: "سجل وجباتك اليومية لتتبع نظامك الغذائي",
        autoSave: "الحفظ التلقائي",
        lastSave: "آخر حفظ",
        nutritionSummary: "ملخص القيم الغذائية",
        mealType: "نوع الوجبة",
        mealTime: "وقت الوجبة",
        mealIngredients: "مكونات الوجبة",
        ingredient: "مكون",
        clearAll: "مسح الكل",
        deleteIngredient: "حذف المكون",
        ingredientName: "اسم المكون",
        ingredientPlaceholder: "اكتب اسم المكون...",
        quantity: "الكمية",
        unit: "الوحدة",
        additionalNotes: "ملاحظات إضافية (اختياري)",
        notesPlaceholder: "اكتب أي ملاحظات عن الوجبة...",
        clearForm: "مسح النموذج",
        saveMeal: "حفظ الوجبة",
        saving: "جاري التسجيل...",
        autoRestored: "💾 تم استعادة البيانات المحفوظة تلقائياً",
        formCleared: "🗑️ تم مسح النموذج",
        loginRequired: "❌ يجب تسجيل الدخول لإضافة وجبات",
        atLeastOneIngredient: "❌ يرجى إضافة مكون واحد على الأقل",
        failedToSave: "❌ فشل تسجيل الوجبة. تأكد من إدخال البيانات بشكل صحيح",
        invalidMealTime: "❌ وقت الوجبة غير صالح",
        invalidMealType: "❌ نوع الوجبة غير صالح",
        autoCalculated: "محسوب تلقائياً",
        addNewIngredient: "إضافة مكون جديد",
        advanced: {
          title: "📊 إحصائيات تغذوية متقدمة",
          low: "⚠️ منخفض",
          high: "⚠️ مرتفع",
          good: "✅ مناسب",
          veryLow: "منخفض جداً",
          veryHigh: "مرتفع جداً",
          analysis: "📊 تحليل غذائي",
          balance: "توازن السعرات",
          proteinRatio: "نسبة البروتين",
          variety: "تنوع الوجبات",
          types: "{{count}} أنواع",
          strengths: "✨ نقاط قوتك",
          weaknesses: "⚠️ تحتاج تحسين",
          mealsLogged: "✅ سجلت {{count}} وجبة حتى الآن",
          goodProtein: "نسبة بروتين جيدة",
          goodVariety: "تنوع جيد في الوجبات",
          fewMeals: "🔴 سجلت {{count}} وجبة فقط",
          lowCalories: "سعراتك منخفضة جداً",
          lowProtein: "تحتاج بروتين أكثر",
          noBreakfast: "لم تسجل وجبة إفطار"
        },
        patterns: {
          title: "🔍 أنماطك الغذائية",
          noData: "📊 لا توجد بيانات كافية",
          veryLow: "نظام غذائي منخفض السعرات",
          moderate: "نظام غذائي معتدل",
          balanced: "نظام غذائي متوازن",
          high: "نظام غذائي عالي السعرات",
          current: "النمط الحالي",
          meals: "🍽️ {{count}} وجبة",
          calories: "🔥 {{calories}} سعرة",
          protein: "🥩 {{protein}}g بروتين",
          last30Days: "آخر 30 يوم",
          mealCount: "{{count}} وجبة {{type}}",
          percentage: "{{percent}}% من الوجبات"
        },
        prediction: {
          title: "🔮 تنبؤات غذائية",
          current: "📊 حالتك الحالية",
          avgMeals: "متوسط الوجبات",
          mealsPerMonth: "{{count}} وجبة / شهر",
          avgCalories: "متوسط السعرات",
          caloriesPerMeal: "{{calories}} سعرة / وجبة",
          nextWeek: "📅 توقعات الأسبوع القادم",
          dailyExpected: "سعرات يومية متوقعة",
          weeklyExpected: "سعرات أسبوعية متوقعة",
          caloriesPerDay: "سعرة/يوم",
          caloriesPerWeek: "سعرة/أسبوع",
          needMoreData: "📊 سجل 3 وجبات على الأقل لبدء التنبؤات",
          note: "* التنبؤات تقريبية وتعتمد على متوسط سعراتك الحالية"
        },
        tabs: {
          basic: "أساسي",
          advanced: "متقدم",
          patterns: "أنماط",
          recommendations: "توصيات",
          prediction: "تنبؤات"
        },
        loading: {
          advanced: "جاري تحميل التحليلات المتقدمة...",
          patterns: "جاري تحميل الأنماط...",
          recommendations: "جاري تحميل التوصيات...",
          prediction: "جاري تحميل التنبؤات..."
        },
        "scanBarcode": "مسح الباركود",
        "enterBarcodeManually": "أدخل الباركود يدوياً",
        "enterBarcode": "أدخل رقم الباركود",
        "searchingProduct": "جاري البحث عن المنتج...",
        "productNotFound": "المنتج غير موجود في قاعدة البيانات",
        "productNotFoundAddManually": "المنتج غير موجود، يرجى إضافة القيم الغذائية يدوياً",
        "productAdded": "تم إضافة المنتج بنجاح",
        "customProduct": "منتج مخصص",
        "caloriesPer100g": "سعرة / 100 غرام",
        "networkError": "حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى",
        "cameraPermissionError": "الرجاء السماح بالوصول إلى الكاميرا",
        "barcodeNotSupported": "متصفحك لا يدعم مسح الباركود، يرجى استخدام متصفح حديث",
        "tryAgain": "حاول مرة أخرى"
      },

      // ==================== الصحة ====================
      health: {
        dashboard: {
          title: "لوحة المتابعة الصحية",
          latestReading: "أخر قراءة صحية مسجلة",
          status: {
            normal: "طبيعي",
            warning: "تحتاج مراجعة",
            no_data: "لا توجد بيانات"
          },
          weight: "الوزن",
          bloodPressure: "ضغط الدم",
          bloodGlucose: "جلوكوز الدم",
          systolic: "انقباضي",
          diastolic: "انبساطي",
          kg: "كجم",
          mgdl: "mg/dL",
          bodyWeight: "وزن الجسم",
          glucoseLevel: "مستوى الجلوكوز",
          loading: "جاري تحميل البيانات...",
          fetchError: "❌ فشل في جلب البيانات. يرجى التأكد من اتصال الخادم.",
          retry: "إعادة المحاولة",
          noData: "لم يتم تسجيل أي قراءات صحية بعد. يرجى البدء باستخدام النموذج أعلاه.",
          refresh: "تحديث البيانات",
          viewDetails: "عرض التفاصيل",
          healthAlerts: "تنبيهات صحية",
          weightHigh: "الوزن مرتفع، يوصى بالمتابعة مع أخصائي تغذية",
          bpHigh: "ضغط الدم مرتفع، يوصى بمراجعة الطبيب",
          glucoseHigh: "جلوكوز الدم مرتفع، يوصى بمراجعة الطبيب",
          consultDoctor: "يوصى بمراجعة الطبيب للمتابعة",
          recordedAt: "سجلت في",
          lastUpdated: "آخر تحديث",
          tip1: "سجل قراءاتك الصحية بانتظام لمتابعة حالتك",
          tip2: "يمكنك تحديث البيانات بالنقر على زر التحديث"
        },
        form: {
          title: "تسجيل قراءة صحية جديدة",
          subtitle: "أدخل قراءاتك الصحية الأساسية لمتابعة حالتك",
          autoSave: "الحفظ التلقائي",
          lastSave: "آخر حفظ",
          weight: "الوزن",
          weightPlaceholder: "أدخل الوزن",
          systolic: "الضغط الانقباضي",
          systolicPlaceholder: "أدخل الضغط الانقباضي",
          diastolic: "الضغط الانبساطي",
          diastolicPlaceholder: "أدخل الضغط الانبساطي",
          glucose: "جلوكوز الدم",
          glucosePlaceholder: "أدخل مستوى الجلوكوز",
          kg: "كجم",
          mgdl: "mg/dL",
          reset: "إعادة تعيين",
          save: "حفظ القراءة",
          saving: "جاري الإرسال...",
          healthIndicators: "مؤشرات الصحة",
          indicators: {
            weightHigh: "⚠️ الوزن مرتفع (فوق 100 كجم)",
            weightLow: "⚠️ الوزن منخفض (أقل من 50 كجم)",
            weightNormal: "✅ الوزن طبيعي (بين 50-100 كجم)",
            bpHigh: "⚠️ ضغط الدم مرتفع (أعلى من 140/90)",
            bpLow: "⚠️ ضغط الدم منخفض (أقل من 90/60)",
            bpNormal: "✅ ضغط الدم طبيعي (بين 90/60 - 140/90)",
            glucoseHigh: "⚠️ جلوكوز الدم مرتفع (أعلى من 140)",
            glucoseLow: "⚠️ جلوكوز الدم منخفض (أقل من 70)",
            glucoseNormal: "✅ جلوكوز الدم طبيعي (بين 70-140)",
                  "weightHint": "النطاق الطبيعي: 50-100 كجم",
      "systolicHint": "النطاق الطبيعي: 90-140 mmHg",
      "diastolicHint": "النطاق الطبيعي: 60-90 mmHg",
      "glucoseHint": "النطاق الطبيعي: 70-140 mg/dL (صائم)",
      "errors": {
        "invalidNumber": "الرجاء إدخال رقم صحيح",
        "range": "يجب أن يكون بين {{min}} و {{max}}"
          }},
          advice: {
            weightLow: "الوزن منخفض جداً، يُنصح بزيادة السعرات الحرارية",
            weightNormal: "وزنك مثالي، حافظ على نظامك الغذائي",
            weightHigh: "الوزن مرتفع، يُنصح باستشارة أخصائي تغذية",
            bpLow: "ضغط الدم منخفض، يُنصح بشرب المزيد من الماء ومراجعة الطبيب",
            bpNormal: "ضغط الدم طبيعي، استمر في نمط حياتك الصحي",
            bpHigh: "ضغط الدم مرتفع، يُنصح بمراجعة الطبيب",
            glucoseLow: "نسبة السكر منخفضة، يُنصح بتناول وجبة خفيفة",
            glucoseNormal: "مستوى السكر طبيعي، حافظ على نظامك",
            glucoseHigh: "مستوى السكر مرتفع، يُنصح بمراجعة الطبيب"
          },
          autoRestored: "💾 تم استعادة البيانات المحفوظة تلقائياً",
          formCleared: "🗑️ تم مسح النموذج",
          correctErrors: "❌ يرجى تصحيح الأخطاء في النموذج",
          submissionSuccess: "✅ تم تسجيل البيانات الصحية بنجاح!",
          submissionError: "❌ فشل في تسجيل البيانات. تأكد من أن جميع القيم المدخلة صحيحة.",
          sessionExpired: "❌ انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
          serverError: "❌ خطأ في الخادم. يرجى المحاولة لاحقاً.",
          errors: {
            weight: "الوزن غير منطقي. يجب أن يكون بين {{min}} و {{max}} كجم.",
            systolic: "الضغط الانقباضي غير منطقي. يجب أن يكون بين {{min}} و {{max}}.",
            diastolic: "الضغط الانبساطي غير منطقي. يجب أن يكون بين {{min}} و {{max}}.",
            glucose: "قراءة الجلوكوز غير منطقية. يجب أن تكون بين {{min}} و {{max}} mg/dL.",
            systolicGreater: "يجب أن يكون الضغط الانقباضي أكبر من الانبساطي.",
            invalidWeight: "❌ قيمة الوزن غير صالحة",
            invalidSystolic: "❌ قيمة الضغط الانقباضي غير صالحة",
            invalidDiastolic: "❌ قيمة الضغط الانبساطي غير صالحة",
            invalidGlucose: "❌ قيمة الجلوكوز غير صالحة"
          }
        }
      },

      // ==================== الرسوم البيانية ====================
      charts: {
        title: "تحليل البيانات الصحية",
        weightChartTitle: "تطور الوزن",
        bloodPressureTitle: "ضغط الدم",
        glucoseTitle: "جلوكوز الدم",
        refresh: "تحديث",
        reading: "قراءة",
        day: "يوم",
        weightLabel: "الوزن (كجم)",
        systolicLabel: "الضغط الانقباضي",
        diastolicLabel: "الضغط الانبساطي",
        glucoseLabel: "جلوكوز الدم (mg/dL)",
        weightLegend: "الوزن (كجم)",
        systolicLegend: "انقباضي",
        diastolicLegend: "انبساطي",
        glucoseLegend: "الجلوكوز (mg/dL)",
        loading: "جاري تحميل الرسوم البيانية...",
        fetchError: "❌ فشل في تحميل بيانات الرسوم البيانية.",
        sessionExpired: "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.",
        dataNotFound: "لم يتم العثور على بيانات للرسوم البيانية.",
        serverError: "خطأ في الخادم. يرجى المحاولة لاحقاً.",
        networkError: "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت.",
        showingStoredData: "يتم عرض البيانات المخزنة.",
        retry: "إعادة المحاولة",
        insufficientData: "بيانات غير كافية للعرض",
        minReadingsRequired: "يجب تسجيل قراءتين على الأقل لعرض الرسوم البيانية.",
        addMoreReadings: "قم بإضافة المزيد من القراءات الصحية لرؤية التحليلات.",
        invalidDataFormat: "تنسيق البيانات غير صالح",
        min: "الحد الأدنى",
        max: "الحد الأقصى",
        systolic: "الضغط الانقباضي",
        diastolic: "الضغط الانبساطي"
      },

      // ==================== السجل التاريخي ====================
      history: {
        title: "السجل التاريخي للقراءات",
        loading: "جاري تحميل السجلات التاريخية...",
        fetchError: "❌ فشل في تحميل السجل التاريخي. يرجى المحاولة مرة أخرى.",
        deleteError: "❌ فشل في حذف السجل. يرجى المحاولة مرة أخرى.",
        retry: "إعادة المحاولة",
        noRecords: "لا توجد سجلات صحية سابقة",
        startAdding: "ابدأ بإضافة قراءاتك الصحية الأولى لتظهر هنا",
        record: "سجل",
        weight: "وزن",
        pressure: "ضغط",
        date: "التاريخ",
        bloodPressure: "ضغط الدم",
        glucose: "الجلوكوز",
        status: "الحالة",
        actions: "الإجراءات",
        edit: "تعديل",
        editTooltip: "تعديل السجل",
        delete: "حذف",
        deleteTooltip: "حذف السجل",
        normal: "طبيعي",
        highBP: "ضغط مرتفع",
        highGlucose: "سكر مرتفع",
        deleteConfirmTitle: "تأكيد الحذف",
        deleteConfirmMessage: "هل أنت متأكد من أنك تريد حذف هذا السجل؟",
        irreversibleAction: "هذا الإجراء لا يمكن التراجع عنه.",
        confirmDelete: "نعم، احذف",
        searchPlaceholder: "بحث في السجلات...",
        lowBP: "ضغط منخفض",
        lowGlucose: "سكر منخفض",
        highWeight: "وزن مرتفع",
        lowWeight: "وزن منخفض"
      },

      // ==================== الملف الشخصي ====================
      profile: {
        title: "إدارة الحساب والأهداف",
        description: "ادخل معلوماتك الشخصية وحدد أهدافك الصحية",
        tabs: {
          profile: "الملف الشخصي",
          goals: "الأهداف الصحية",
          settings: "الإعدادات"
        },
        profile: {
          basicInfo: "المعلومات الأساسية",
          healthInfo: "المعلومات الصحية",
          username: "اسم المستخدم",
          email: "البريد الإلكتروني",
          birthDate: "تاريخ الميلاد",
          gender: "الجنس",
          selectGender: "اختر الجنس",
          male: "ذكر",
          female: "أنثى",
          phone: "رقم الهاتف",
          initialWeight: "الوزن الأولي (كجم)",
          height: "الطول (سم)",
          occupation: "الوضع الوظيفي",
          selectOccupation: "اختر الوضع",
          student: "طالب",
          fullTime: "موظف بدوام كامل",
          freelancer: "عمل حر",
          other: "أخرى",
          saveChanges: "💾 حفظ التغييرات",
          updated: "✅ تم تحديث الملف الشخصي بنجاح"
        },
        goals: {
          addNew: "🎯 إضافة هدف صحي جديد",
          title: "عنوان الهدف",
          titlePlaceholder: "مثال: خسارة الوزن، خفض الضغط...",
          targetValue: "القيمة المستهدفة",
          unit: "الوحدة",
          targetDate: "تاريخ المستهدف",
          addGoal: "➕ إضافة الهدف",
          totalGoals: "إجمالي الأهداف",
          completedGoals: "أهداف مكتملة",
          delayedGoals: "أهداف متأخرة",
          myGoals: "أهدافي الصحية",
          delete: "حذف الهدف",
          start: "البداية",
          target: "المستهدف",
          currentValuePlaceholder: "القيمة الحالية",
          pressEnter: "اضغط Enter لتحديث التقدم",
          achieved: "تم تحقيق الهدف",
          noGoals: "لا توجد أهداف حالياً",
          startAdding: "ابدأ بإضافة أول هدف صحي لك",
          added: "✅ تم إضافة الهدف بنجاح",
          progressUpdated: "✅ تم تحديث التقدم",
          deleted: "✅ تم حذف الهدف",
          deleteConfirm: "هل أنت متأكد من حذف هذا الهدف؟",
          requiredFields: "❌ يرجى ملء جميع الحقول المطلوبة"
        },
        units: {
          kg: "كجم",
          cm: "سم",
          point: "نقطة",
          minute: "دقيقة",
          kilo: "كيلو"
        },
        settings: {
          title: "إعدادات التطبيق",
          darkMode: "الوضع الليلي",
          darkModeDesc: "تفعيل الوضع المظلم",
          notifications: "الإشعارات",
          notificationsDesc: "استقبال إشعارات التذكير",
          language: "لغة التطبيق",
          arabic: "العربية",
          english: "English",
          updateInterval: "فترة التحديث (ثانية)",
          seconds: "ثواني",
          minute: "دقيقة",
          minutes: "دقائق",
          updateIntervalDesc: "فترة تحديث البيانات التلقائي",
          save: "💾 حفظ الإعدادات",
          applyOnSave: "اللغة سوف تتغير فوراً",
          saved: "✅ تم حفظ الإعدادات بنجاح",
          error: "❌ فشل في حفظ الإعدادات"
        },
        danger: {
          zone: "منطقة الخطر",
          warning: "الإجراءات في هذه المنطقة دائمة ولا يمكن التراجع عنها",
          exportData: "📤 تصدير جميع البيانات",
          deleteAccount: "🗑️ حذف الحساب",
          exportConfirm: "هل تريد تصدير جميع بياناتك الصحية؟",
          deleteAccountConfirm: "⚠️ تحذير: حذف الحساب نهائي ولا يمكن التراجع عنه!\n\nهل أنت متأكد من حذف حسابك؟",
          typeDelete: "اكتب \"حذف\" للتأكيد:",
          cancelled: "❌ تم إلغاء عملية الحذف",
          accountDeleted: "✅ تم حذف الحساب بنجاح",
          exportSuccess: "✅ تم تصدير البيانات بنجاح"
        },
        error: {
          fetchUser: "❌ فشل في تحميل بيانات الملف الشخصي",
          fetchGoals: "⚠️ لا يمكن تحميل الأهداف حالياً",
          updateProfile: "❌ فشل في تحديث البيانات",
          addGoal: "❌ فشل في إضافة الهدف",
          updateProgress: "❌ فشل في تحديث التقدم",
          deleteGoal: "❌ فشل في حذف الهدف",
          deleteAccount: "❌ فشل في حذف الحساب",
          exportData: "❌ فشل في تصدير البيانات"
        },
        backup: {
          title: "النسخ الاحتياطي",
          fullBackup: "نسخة احتياطية كاملة",
          fullBackupDesc: "تصدير جميع بياناتك (الملف الشخصي، الصحة، النوم، التغذية، العادات)",
          download: "تحميل النسخة",
          confirm: "هل أنت متأكد من إنشاء نسخة احتياطية؟",
          success: "✅ تم إنشاء النسخة الاحتياطية بنجاح",
          error: "❌ فشل في إنشاء النسخة الاحتياطية",
          latest: "الأحدث"
        },
        restore: {
          title: "استعادة نسخة",
          desc: "استعادة بياناتك من نسخة احتياطية سابقة",
          select: "اختر ملف النسخة",
          confirm: "⚠️ استعادة النسخة الاحتياطية ستحل محل بياناتك الحالية. هل أنت متأكد؟",
          success: "✅ تم استعادة النسخة الاحتياطية بنجاح",
          error: "❌ فشل في استعادة النسخة الاحتياطية"
        },
        export: {
          csv: "تصدير CSV",
          csvDesc: "تصدير البيانات بتنسيق CSV للتحليل في Excel",
          select: "اختر نوع البيانات",
          health: "البيانات الصحية",
          meals: "الوجبات",
          sleep: "النوم",
          activities: "النشاط البدني",
          mood: "الحالة المزاجية",
          habits: "تعريفات العادات",
          habitLogs: "سجلات العادات",
          goals: "الأهداف الصحية",
          notifications: "الإشعارات",
          noData: "لا توجد بيانات للتصدير",
          success: "✅ تم تصدير البيانات بنجاح",
          error: "❌ فشل في تصدير البيانات"
        },
        reset: {
          button: "إعادة ضبط جميع البيانات (حذف كل شيء)",
          confirm: "⚠️ هذا سيقوم بحذف جميع بياناتك نهائياً. اكتب \"حذف\" للتأكيد:",
          cancelled: "تم إلغاء العملية",
          progress: "جاري الحذف...",
          success: "✅ تم حذف جميع البيانات بنجاح",
          error: "❌ فشل في حذف البيانات"
        }
      },

      // ==================== لوحة التحكم ====================
      dashboard: {
        dailySummary: "📊 ملخص يوم",
        dashboard: "لوحة التحكم",
        healthTitle: "📊 ملخص يوم {{date}}",
        nutritionTitle: "🥗 إدارة التغذية",
        sleepTitle: "🌙 تتبع النوم",
        habitsTitle: "💊 العادات والأدوية",
        moodTitle: "😊 تتبع الحالة المزاجية",
        chatTitle: "💬 الدردشة الذكية",
        profileTitle: "👤 إدارة الحساب والأهداف",
        unavailable: "غير متوفر",
        lastWeight: "آخر وزن",
        bloodPressure: "ضغط الدم",
        bloodGlucose: "جلوكوز الدم",
        glucoseLevel: "مستوى الجلوكوز",
        kg: "كجم",
        sysDia: "انقباضي / انبساطي",
        loadingSummary: "جاري تحميل ملخص حالتك الصحية...",
        pleaseWait: "يرجى الانتظار قليلاً",
        fetchError: "❌ فشل في تحميل الملخص.",
        retry: "إعادة المحاولة",
        lastUpdated: "آخر تحديث",
        chatComingSoon: "الدردشة الذكية قريباً",
        chatDescription: "نعمل على تطوير مساعد ذكي لمساعدتك في رحلتك الصحية",
        switchToLight: "التبديل إلى الوضع الفاتح",
        switchToDark: "التبديل إلى الوضع المظلم",
            "noDataTitle": "لا توجد بيانات صحية",
    "noDataMessage": "أضف قراءاتك الصحية الأولى",
    "addFirstReading": "أضف قراءة",
    "switchToLight": "التبديل إلى الوضع الفاتح",
    "switchToDark": "التبديل إلى الوضع المظلم",
    "localData": "بيانات محلية",
    "autoRefreshActive": "التحديث التلقائي نشط"
      },

      // ==================== تطبيق ====================
      app: {
        title: "Livocare - العناية بصحتك",
        logout: "تسجيل الخروج",
        footer: "Livocare - تطبيق العناية الصحية الشخصية",
        switchToLight: "التبديل إلى الوضع الفاتح",
        switchToDark: "التبديل إلى الوضع المظلم"
      },

      // ==================== تسجيل الدخول ====================
      login: {
        title: "تسجيل الدخول",
        description: "أدخل بياناتك للوصول إلى لوحة التحكم الصحية",
        appSubtitle: "العناية بصحتك",
        username: "اسم المستخدم",
        usernamePlaceholder: "أدخل اسم المستخدم",
        password: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        loginButton: "تسجيل الدخول",
        loggingIn: "جاري تسجيل الدخول...",
        resetButton: "إعادة تعيين",
        dismiss: "إغلاق",
        success: "✅ تم تسجيل الدخول بنجاح!",
        failed: "❌ فشل تسجيل الدخول",
        emptyFields: "❌ يرجى ملء جميع الحقول",
        invalidCredentials: "❌ اسم المستخدم أو كلمة المرور غير صحيحة",
        unauthorized: "❌ غير مصرح بالدخول",
        serverNotFound: "❌ تعذر الاتصال بالخادم",
        serverError: "❌ خطأ في الخادم",
        networkError: "❌ تأكد من اتصال الإنترنت",
        tip: "نصيحة: استخدم بيانات الدخول التي تم تزويدك بها",
        demoInfo: "بيانات تجريبية: يمكنك استخدام test/test",
        featuresTitle: "ميزات Livocare",
        feature1: "تتبع الصحة الحيوية (وزن، ضغط، سكر)",
        feature2: "إدارة التغذية والوجبات اليومية",
        feature3: "مراقبة جودة وعدد ساعات النوم",
        feature4: "تتبع الحالة المزاجية والعوامل المؤثرة",
        feature5: "متابعة العادات الصحية والأدوية",
        version: "الإصدار",
        online: "متصل",
        switchToLight: "التبديل إلى الوضع الفاتح",
        switchToDark: "التبديل إلى الوضع المظلم",
        noAccount: "ليس لديك حساب؟",
        register: "إنشاء حساب جديد",
        rememberMe: "تذكرني",
        forgotPassword: "نسيت كلمة المرور؟",
        users: "مستخدم",
        rating: "تقييم"
      },

      // ==================== الشريط الجانبي ====================
      sidebar: {
        appName: "LivoCare",
        tagline: "العناية بصحتك",
        dashboard: "لوحة التحكم",
        activeSections: "أقسام نشطة",
        healthCoverage: "تغطية صحية",
        analytics: "التحليلات المتقدمة",
        analyticsDesc: "إحصائيات وتقارير صحتك",
        notifications: "الإشعارات",
        notificationsDesc: "آخر التحديثات والتنبيهات",
        extras: "إضافات",
        userName: "مستخدم Livocare",
        userRole: "مستخدم متميز",
        reports: "التقارير",
        reportsDesc: "تقارير صحية شاملة",
        sections: {
          health: { name: "الصحة الحيوية", description: "تتبع القياسات الحيوية" },
          nutrition: { name: "التغذية", description: "إدارة الوجبات والسعرات" },
          sleep: { name: "النوم", description: "جودة وعدد ساعات النوم" },
          mood: { name: "الحالة المزاجية", description: "تتبع المشاعر والعواطف" },
          habits: { name: "العادات والأدوية", description: "المكملات والروتين اليومي" },
          chat: { name: "الدردشة الذكية", description: "مساعد ذكي للصحة" },
          smart: { name: "الميزات الذكية", description: "توصيات وتحليلات متقدمة" },
          profile: { name: "إدارة المستخدم", description: "الإعدادات والأهداف" }
        }
      },

      // ==================== الرؤى الصحية المتقدمة ====================
      health_insights: {
        title: "🧠 الرؤى الصحية المتقدمة",
        subtitle: "تحليل ذكي يربط جميع جوانب صحتك",
        lastUpdate: "آخر تحديث",
        loading: "جاري تحليل بياناتك...",
        error: "فشل في تحميل التحليلات",
        retry: "إعادة المحاولة",
        vital_signs: {
          title: "العلامات الحيوية",
          current: "قراءاتك الحالية",
          weight: "الوزن",
          blood_pressure: "ضغط الدم",
          glucose: "الجلوكوز",
          pulse_pressure: "فرق الضغط",
          recorded_at: "سجلت في",
          insights: "تحليلات",
          alerts: "تنبيهات",
          weight_low: { message: "⚠️ وزنك منخفض جداً", details: "{weight} كجم أقل من المعدل الطبيعي", recommendation: "تحتاج لزيادة السعرات الحرارية والبروتين" },
          weight_high: { message: "⚠️ وزنك مرتفع", details: "{weight} كجم أعلى من المعدل", recommendation: "جرب المشي 30 دقيقة يومياً وقلل السكريات" },
          weight_normal: { message: "✅ وزنك في المعدل المثالي", recommendation: "حافظ على نظامك الحالي" },
          weight_activity_alert: { message: "⚡ وزنك منخفض مع نشاط عالي!", details: "مع {count} تمارين هذا الأسبوع، قد تفقد كتلة عضلية", recommendation: "زد كمية البروتين بعد التمرين مباشرة" },
          pulse_pressure_high: { message: "❤️‍🩹 فرق الضغط كبير جداً", details: "الفرق {value} مم زئبق (الطبيعي 40-60)", recommendation: "قد يشير لصلابة الشرايين، استشر طبيباً" },
          pulse_pressure_low: { message: "💓 فرق الضغط منخفض جداً!", details: "الفرق {value} مم زئبق فقط", recommendation: "قد يشير لضعف عضلة القلب أو مشاكل في الصمامات، استشر طبيباً فوراً" },
          bp_paradox: { message: "🫀 نمط ضغط غير طبيعي", details: "ضغط منخفض {systolic}/{diastolic}", recommendation: "هذا النمط نادر ويحتاج استشارة طبية فورية" },
          glucose_high: { message: "🩸 سكر الدم مرتفع", details: "{value} mg/dL أعلى من الطبيعي", recommendation: "قلل الكربوهيدرات البسيطة وامش 15 دقيقة" },
          glucose_low: { message: "🆘 سكر الدم منخفض!", details: "{value} mg/dL أقل من الطبيعي", recommendation: "تناول مصدر سكر سريع (عصير، تمر)" },
          meal_glucose_alert: { message: "🍚 الوجبة الأخيرة غنية بالكربوهيدرات", details: "الوجبة: {meal}", recommendation: "اختر بروتيناً أكثر في الوجبة التالية" }
        },
        activity_nutrition: {
          title: "النشاط والتغذية",
          total_activities: "إجمالي الأنشطة",
          analysis: "تحليل",
          warning: { message: "⚠️ عجز حراري كبير مع بروتين منخفض", details: "حرقت {burned} سعرة وأكلت {protein}g بروتين فقط", recommendation: "قد تخسر كتلة عضلية، زد البروتين بعد التمرين" },
          insight: { message: "💪 يوم ممتاز لبناء العضلات", details: "فائض {calories} سعرة مع {protein}g بروتين", recommendation: "استمر بهذا النظام" },
          summary: { more_warnings: "⚠️ تحتاج لتحسين التوازن بين طعامك ونشاطك", more_insights: "🌟 نظامك الغذائي متوازن مع نشاطك", balanced: "📊 بيانات كافية للتحليل، استمر بالتسجيل" }
        },
        sleep_mood: {
          title: "النوم والمزاج",
          correlations: "الارتباطات",
          patterns: { low_sleep_bad_mood: "قلة النوم → مزاج سيء", good_sleep_good_mood: "نوم كافٍ → مزاج جيد" },
          mood_average: "متوسط النوم حسب المزاج",
          recommendation: { good: "💤 النوم {hours} ساعات يرتبط بمزاجك الجيد", try: "🌙 حاول النوم {hours} ساعات لمزاج أفضل", keep_recording: "استمر بتسجيل نومك ومزاجك" }
        },
        weight_trends: {
          title: "اتجاهات الوزن",
          from: "من",
          to: "إلى",
          change: "التغير",
          daily_rate: "المعدل اليومي",
          days_analyzed: "أيام التحليل",
          trend: "الاتجاه",
          factors: "العوامل المؤثرة",
          prediction: "التنبؤ",
          increasing: "زيادة",
          decreasing: "نقصان",
          stable: "ثبات",
          factor_low_activity: { name: "قلة النشاط", impact: "قد يكون سبب زيادة الوزن" },
          factor_regular_activity: { name: "النشاط المنتظم", impact: "يساعد في خسارة {weight} كجم" },
          factor_high_calories: { name: "سعرات حرارية عالية", impact: "متوسط {calories} سعرة/يوم" },
          factor_low_calories: { name: "نظام غذائي منخفض", impact: "قد يكون قاسياً على المدى الطويل" },
          prediction_need_more_data: "تحتاج لبيانات أكثر للتنبؤ",
          prediction_stable: "وزنك مستقر، حافظ على نظامك",
          prediction_increase: "إذا استمر الوضع، قد تزيد {weight} كجم خلال شهر",
          prediction_decrease: "إذا استمر الوضع، قد تخسر {weight} كجم خلال شهر"
        },
        blood_pressure: {
          title: "تحليل ضغط الدم",
          average: "المتوسط",
          category: "التصنيف",
          patterns: "الأنماط",
          recommendation: "التوصية",
          categories: { ideal: "مثالي", normal: "طبيعي", stage1: "مرتفع - المرحلة 1", stage2: "مرتفع - المرحلة 2", unknown: "غير معروف" },
          pattern_low_sleep: { pattern: "قلة النوم → ارتفاع الضغط", description: "في {date}: نمت {sleep} ساعات فقط وزاد ضغطك {increase} نقاط" },
          recommendations: {
            insufficient_data: "لا توجد بيانات كافية",
            sleep_pattern: "نمط واضح: قلة النوم ترفع ضغطك. حاول النوم 7-8 ساعات",
            ideal: "ضغطك ممتاز، استمر بنظامك الصحي",
            normal: "ضغطك طبيعي، حافظ على نشاطك",
            stage1: "ضغطك بداية ارتفاع، جرب تمارين التنفس والمشي",
            stage2: "ضغطك مرتفع، استشر طبيباً"
          }
        },
        glucose_risks: {
          title: "تقييم مخاطر السكر",
          average: "المتوسط",
          range: "المدى",
          trend: "الاتجاه",
          risk_score: "درجة المخاطرة",
          risk_level: "مستوى المخاطرة",
          alerts: "تنبيهات",
          trends: { up: "تصاعدي", down: "تنازلي", stable: "مستقر" },
          risk_levels: { low: "منخفض", medium: "متوسط", high: "مرتفع" },
          alerts: {
            high_readings: { message: "⚠️ هناك قراءات سكر مرتفعة", details: "أعلى قراءة: {value} mg/dL", recommendation: "راجع نظامك الغذائي" },
            low_readings: { message: "🚨 إنخفاض حاد في السكر", details: "أقل قراءة: {value} mg/dL", recommendation: "احمل معك مصدر سكر دائماً" },
            upward_trend: { message: "📈 اتجاه تصاعدي في السكر", details: "ارتفاع بمعدل {value} mg/dL خلال أسبوع", recommendation: "قد تحتاج لفحص HbA1c" }
          }
        },
        holistic_recommendations: {
          title: "💡 توصيات شاملة",
          items: {
            weight_activity: { title: "توازن الوزن والنشاط", message: "وزنك منخفض مع نشاط رياضي", details: "قد تخسر كتلة عضلية بدلاً من الدهون", advice: "تناول وجبة غنية بالبروتين بعد التمرين مباشرة" },
            low_pressure_glucose: { title: "علامات الإرهاق", message: "ضغط وسكر منخفضان معاً", details: "قد يكون بسبب إجهاد أو وجبات غير كافية", advice: "تناول وجبة متوازنة واسترح قليلاً" },
            low_sleep: { title: "تأثير النوم على يومك", message: "نمتَ {hours} ساعات فقط", details: "قلة النوم تؤثر على التركيز والمزاج", advice: "خذ قيلولة 20 دقيقة بعد الظهر" },
            low_protein: { title: "البروتين والطاقة", message: "بروتينك اليوم {protein}g فقط", details: "قد تشعر بإرهاق سريع في التمرين", advice: "زد البروتين في وجبتك القادمة (بيض، دجاج، عدس)" },
            metabolic_signs: { title: "علامات استقلابية", message: "ارتفاع في الضغط الانبساطي والسكر", details: "قد يشير لمقاومة الأنسولين", advice: "قلل السكريات وزد النشاط البدني" }
          }
        },
        predictive_alerts: {
          title: "🔮 تنبؤات وقائية",
          items: {
            glucose_trend: { title: "📊 ارتفاع تدريجي في السكر", prediction: "إذا استمر الاتجاه، قد تصل لمرحلة ما قبل السكري خلال 3 أشهر", probability: "احتمال {value}%", action: "قلل الكربوهيدرات البسيطة وامش 30 دقيقة يومياً" },
            weight_increase: { title: "⚖️ زيادة سريعة في الوزن", prediction: "قد تزيد {weight} كجم خلال شهر إذا استمر الوضع", probability: "احتمال {value}%", action: "سجل طعامك وراجع السعرات الحرارية" },
            weight_decrease: { title: "⚖️ خسارة وزن سريعة", prediction: "قد تخسر {weight} كجم خلال شهر", probability: "احتمال {value}%", action: "تأكد من الحصول على بروتين كافٍ" },
            sleep_pattern: { title: "😴 نمط نوم غير منتظم", prediction: "قد تعاني من الأرق أو اضطراب النوم", probability: "احتمال {value}%", action: "حاول النوم في وقت ثابت يومياً" }
          }
        },
        activity_nutrition: { calories_burned_per_day: "سعرة محروقة/يوم", calories_consumed_per_day: "سعرة مستهلكة/يوم", daily_deficit: "عجز يومي", pre_exercise_recommendations: "توصيات قبل التمرين" },
        vital_signs: { normal_range: "الطبيعي", possible_causes: "الأسباب المحتملة" },
        predictive_alerts: { title: "🔮 تنبؤات مستقبلية", probability: "احتمال" }
      },

      // ==================== التحليلات ====================
      analytics: {
        common: {
          loading: "جاري التحميل...",
          error: "حدث خطأ",
          success: "تمت العملية بنجاح",
          save: "حفظ",
          cancel: "إلغاء",
          delete: "حذف",
          edit: "تعديل",
          add: "إضافة",
          minutes: "دقيقة",
          km: "كم",
          calories: "سعرة",
          refresh: "تحديث",
          noDate: "لا يوجد تاريخ",
          recommendation: "توصية",
          suggestions: "اقتراحات",
          dismiss: "إغلاق",
          health_insights: "🧠 رؤى صحية متقدمة",
          view_details: "عرض التفاصيل",
          based_on_data: "بناءً على تحليل {days} يوم",
          priority: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
                "noData": "لا توجد بيانات كافية للتحليل",
      "lastUpdate": "آخر تحديث"
        },
        activity: {
          title: "🧠 توصيات نشاطك الذكية",
          loading: "🧠 جاري تحليل عوامل نشاطك...",
          currentActivity: "📊 نشاطك الحالي",
          totalMinutes: "إجمالي الدقائق",
          totalCalories: "سعرة محروقة",
          activitiesCount: "نشاط",
          weekProgress: "{{progress}}% من هدفك",
          factors: {
            title: "🔍 عوامل تؤثر على نشاطك",
            sleep: "قلة النوم تؤثر على أدائك",
            mood: "مزاجك يؤثر على حماسك",
            nutrition: "طاقتك منخفضة بسبب الأكل",
            multiple: "عوامل متعددة تؤثر على جودة نشاطك",
                  "startTracking": "سجل بعض الأنشطة لبدء التحليل",
      "weekProgress": "{{progress}}% من هدفك الأسبوعي"
          },
          insights: {
            sleepImpact: "نومك القليل يؤثر على نشاطك",
            sleepImpactDetails: "تنام {{hours}} ساعات فقط، وهذا يقلل طاقتك للنشاط",
            moodImpact: "تحسين مزاجك قد يزيد نشاطك",
            moodImpactDetails: "مزاجك المنخفض قد يكون سبب قلة النشاط",
            nutritionImpact: "قلة الأكل تؤثر على طاقتك",
            nutritionImpactDetails: "تستهلك {{calories}} سعرة فقط، تحتاج طعام أكثر للنشاط",
            weightImpact: "النشاط مهم لوزنك",
            weightImpactDetails: "زيادة نشاطك تساعد في خفض وزنك",
            weightLowImpact: "النشاط يقوي عضلاتك",
            weightLowImpactDetails: "التمارين تساعد في بناء كتلة عضلية صحية",
            bpImpact: "النشاط يخفض ضغطك",
            bpImpactDetails: "المشي 30 دقيقة يومياً يساعد في خفض ضغط الدم",
            glucoseImpact: "النشاط ينظم سكرك",
            glucoseImpactDetails: "التمارين المنتظمة تحسن حساسية الأنسولين"
          },
          recommendations: {
            title: "💡 توصيات مخصصة لنشاطك",
            increaseActivity: { title: "زد نشاطك الأسبوعي", advice: "تحتاج {{minutes}} دقيقة إضافية هذا الأسبوع" },
            maintainActivity: { title: "ممتاز! حافظ على نشاطك", advice: "أنت تحقق المعدل الموصى به (150 دقيقة/أسبوع)", basedOn: "استمر في هذا المستوى الرائع", tip1: "🏃 نوّع تمارينك", tip2: "🧘 جرب تمارين جديدة", tip3: "👤 شارك مع أصدقائك" },
            improveQuality: { title: "حسن جودة نشاطك", advice: "يمكنك الاستفادة أكثر من تمارينك" },
            sleepTime: { title: "وقت النوم", advice: "الأفضل تأجيل النشاط للصباح", basedOn: "التمارين المسائية قد تؤثر على نومك", tip1: "😴 نم باكراً", tip2: "☀️ تمرن صباحاً", tip3: "🚶‍♂️ مشي خفيف فقط" }
          },
          reasons: {
            general: "لتحسين لياقتك وصحتك العامة",
            sleep: "لأن نومك القليل يحتاج لطاقة إضافية",
            nutrition: "لأن طعامك لا يكفي لطاقتك",
            weight: "لتحقيق وزن صحي",
            bp: "لتحسين ضغط الدم",
            glucose: "لتنظيم السكر"
          },
          tips: {
            walkDaily: "🚶‍♂️ امشِ {{minutes}} دقيقة يومياً لمدة 5 أيام",
            nap: "😴 خذ قيلولة 20 دقيقة قبل التمرين",
            music: "🎵 استمع لموسيقى تحبها أثناء التمرين",
            banana: "🍌 تناول موزة قبل التمرين بـ 30 دقيقة",
            gentleStart: "❤️ ابدأ بمشي خفيف وزد المدة تدريجياً"
          },
          qualityTips: {
            sleep: "😴 نم 7-8 ساعات لتحسين أدائك",
            nutrition: "🥗 كل وجبة خفيفة قبل التمرين",
            mood: "🧘 جرب تمارين التنفس قبل البدء",
            focus: "💪 ركز على جودة التمرين لا كميته"
          }
        },
        habit: {
          title: "💊 تحليلات العادات الذكية",
          loading: "🧠 جاري تحليل عاداتك...",
          noData: "لا توجد بيانات كافية للتحليل",
          noRecommendations: "💡 لا توجد توصيات متاحة",
          footer: { lastUpdate: "آخر تحديث" },
          tabs: { insights: "🧠 رؤى ذكية", patterns: "📊 أنماط مفصلة", recommendations: "💡 توصيات شاملة" },
          summary: {
            title: "📊 ملخص عاداتك",
            avgSleep: "متوسط النوم",
            dominantMood: "المزاج السائد",
            avgHabits: "العادات اليومية",
            avgCalories: "السعرات اليومية",
            hours: "ساعات",
            notAvailable: "غير متوفر"
          },
          correlations: { title: "🔗 العلاقات المكتشفة", strength: "القوة", basedOn: "بناءً على {days} أيام" },
          recommendations: {
            title: "🎯 توصيات مخصصة",
            target: "الهدف",
            basedOn: "بناءً على {based_on}",
            improvementChance: "فرصة التحسين {chance}%",
            water: { title: "اشرب المزيد من الماء", description: "الهدف: ترطيب الجسم وزيادة الطاقة", target: "8 أكواب" },
            sleep: { title: "نم بشكل كافٍ", description: "الهدف: تحسين المزاج والتركيز", target: "7-8 ساعات" },
            exercise: { title: "النشاط البدني", description: "الهدف: زيادة اللياقة والطاقة", target: "30 دقيقة" },
            nutrition: { title: "نظام غذائي متوازن", description: "الهدف: تحسين الصحة العامة", target: "5 حصص" },
            habits: { title: "التزم بعاداتك اليومية", description: "الهدف: بناء الاتساق والانضباط", target: "يومياً" },
            default: { title: "عادة صحية", description: "الهدف: تحسين جودة الحياة" }
          },
          patterns: { title: "📈 الأنماط المفصلة", consistency: "الانتظام", impact: "التأثير", insights: "رؤى", suggestions: "اقتراحات" },
          integrated: { title: "💡 توصيات متكاملة", footer: "طبق هذه التوصيات لمدة {days} أيام لترى النتائج" },
          predictions: { title: "🔮 توقعات الأسبوع القادم" }
        },
        mood: {
          title: "🧠 تحليل مزاجك الذكي",
          loading: "🧠 جاري تحليل مزاجك...",
          error: "حدث خطأ في جلب البيانات",
          retry: "إعادة المحاولة",
          noData: "📝 سجل مزاجك أولاً",
          invalidData: "بيانات المزاج غير صالحة",
          summary: {
            avgMood: "متوسط المزاج",
            days: "أيام",
            mostFrequent: "الأكثر",
            notFound: "لا يوجد",
            undefined: "غير محدد",
            trend: { label: "الاتجاه", improving: "تحسن", declining: "انخفاض", stable: "مستقر" }
          },
          prediction: { tomorrow: "🔮 غداً: {value}/5 {trend}" },
          factors: { title: "🎯 المؤثرات" },
          patterns: {
            title: "📊 أنماط مزاجك",
            days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
            bestWorst: "أفضل أيامك: {best} | أسوأ أيامك: {worst}",
            bestTime: "أفضل وقت: {time}",
            morning: "الصباح",
            afternoon: "الظهيرة",
            evening: "المساء",
            night: "الليل",
            dayPattern: "نمط أيام الأسبوع",
            timePattern: "أفضل وقت للمزاج",
            activityImpact: "النشاط يحسن مزاجك في نفس اليوم",
            sleepImpact: "النوم الجيد = مزاج أفضل في اليوم التالي",
            error: "خطأ في اكتشاف الأنماط:"
          },
          alerts: {
            title: "🧠 تنبيهات ذكية",
            decline: { title: "انخفاض المزاج", message: "لاحظنا انخفاض المزاج لمدة {days} أيام", tip1: "🚶 المشي 20 دقيقة", tip2: "💬 التحدث مع صديق", tip3: "😴 النوم مبكراً", tip4: "📝 كتابة المشاعر" },
            suggestions: "نقترح"
          },
          insights: {
            activityImpact: "تأثير النشاط على مزاجك",
            activityMessage: "النشاط البدني يحسن مزاجك بمقدار {diff} نقطة",
            activityRecommendation: "حافظ على نشاطك اليومي"
          },
          recommendations: {
            dayPatternAdvice: "أفضل أيامك: {bestDay} | أسوأ أيامك: {worstDay}",
            dayPatternTip1: "خطط لأنشطتك المهمة في أيامك الأفضل",
            dayPatternTip2: "كن لطيفاً مع نفسك في الأيام الأقل",
            timePatternAdvice: "أفضل وقت لمزاجك هو {bestTime}",
            timePatternTip1: "خطط لأنشطتك المهمة في هذا الوقت",
            timePatternTip2: "استغل هذا الوقت للإبداع والعمل المهم",
            start: { title: "ابدأ بتسجيل مزاجك", advice: "سجل مزاجك يومياً للحصول على تحليلات دقيقة", tips: ['سجل صباحاً ومساءً', 'أضف ملاحظات عن يومك'] },
            psychological: { title: "دعم نفسي", advice: "مزاجك منخفض، لا تتردد في طلب الدعم", tips: ['📞 تحدث مع صديق', '🧘 مارس التنفس العميق', '🚶 اخرج للنزهة'] },
            patternAdvice: "نظم يومك حسب هذا النمط",
            patternTips: ['خطط لأنشطتك المهمة في أيامك الأفضل'],
            default: { title: "مزاجك جيد", advice: "حافظ على روتينك الصحي", tips: ['استمر في تسجيل مزاجك', 'شارك إيجابيتك مع الآخرين'] }
          },
          tips: {
            default: ['ابدأ بخطوة صغيرة اليوم'],
            sleep: { title: "النوم", detail: "النوم الجيد يرفع مزاجك {points} نقطة", advice: "نم 7-8 ساعات يومياً", tips: ['⏰ نم في وقت ثابت', '📱 ابتعد عن الشاشات قبل النوم', '🌡️ اجعل غرفتك مظلمة'] },
            nutrition: { title: "التغذية", detail: "البروتين العالي يحسن مزاجك", advice: "أضف مصادر بروتين لوجباتك", tips: ['🥚 تناول بروتين مع كل وجبة', '🥑 أضف دهون صحية', '🌰 تناول المكسرات'] },
            activity: { title: "النشاط", detail: "النشاط يحسن مزاجك بـ +{points} نقطة", advice: "امشِ 30 دقيقة يومياً", tips: ['🚶 امشِ 30 دقيقة', '🧘 جرب تمارين التمدد', '🎵 استمع لموسيقى أثناء المشي'] },
            habits: { title: "العادات", detail: "العادات الإيجابية تحسن مزاجك", advice: "حافظ على روتينك اليومي", tips: ['📋 حدد 3 عادات يومية', '⭐ كافئ نفسك عند الإنجاز', '📱 استخدم تذكيرات'] },
            weight: { title: "الوزن", detail: "الوزن الزائد يؤثر على طاقتك", advice: "استشر مختص تغذية", tips: ['🥗 قلل السكريات', '💧 اشرب ماء كافياً', '🚶 زد نشاطك اليومي'] },
            pressure: { title: "الضغط", detail: "ضغطك مرتفع قليلاً", advice: "تابع ضغطك بانتظام", tips: ['🧘 مارس التأمل', '🧂 قلل الملح', '🚭 ابتعد عن المنبهات'] }
          },
          footer: { lastUpdate: "🕒 {time}" }
        },
        nutrition: {
          title: "🍽️ تحليل تغذوي ذكي",
          loading: "🍽️ جاري التحليل الغذائي الذكي...",
          analyzing: "🍽️ تحليل تغذوي ذكي...",
          summary: { totalMeals: "إجمالي الوجبات", totalCalories: "إجمالي السعرات", avgCalories: "متوسط السعرات", avgProtein: "متوسط البروتين" },
          healthScore: { title: "📊 Health Score", heartRate: "نبض القلب", normal: "طبيعي", sleep: "النوم", nutrition: "التغذية", mood: "المزاج", stable: "مستقر", activity: "النشاط", active: "نشط" },
          charts: {
            caloriesTitle: "📊 السعرات خلال الأسبوع",
            caloriesLabel: "السعرات الحرارية",
            proteinTitle: "📈 تطور البروتين",
            proteinLabel: "البروتين (جم)",
            carbsTitle: "🌾 تطور الكربوهيدرات",
            carbsLabel: "الكربوهيدرات (جم)",
            fatTitle: "🫒 تطور الدهون",
            fatLabel: "الدهون (جم)",
            distributionTitle: "📊 توزيع الوجبات",
            average: "المعدل"
          },
          lifePatterns: {
            title: "📊 تحليل أنماط حياتك",
            irregular: { title: "نمط غذائي غير منتظم", description: "تأكل أقل من 3 وجبات يومياً", advice: "حاول تقسيم طعامك إلى 3-5 وجبات صغيرة" },
            tooMany: { title: "تأكل كثيراً", description: "أكثر من 5 وجبات يومياً", advice: "حاول تقليل عدد الوجبات وزيادة كمية كل وجبة" },
            regular: { title: "نمط غذائي منتظم", description: "تأكل 3-5 وجبات يومياً", advice: "استمر على هذا النمط الممتاز" },
            lateEater: { title: "تأكل أكثر في الليل", description: "{{count}} وجبات بعد 10 مساءً", advice: "حاول تناول وجباتك في النهار لتحسين النوم والهضم" },
            lowProtein: { title: "البروتين منخفض طوال الأسبوع", description: "متوسط البروتين {{protein}}g فقط", advice: "أضف مصادر بروتين لكل وجبة" }
          },
          predictions: {
            title: "🔮 تنبؤات صحية",
            probability: "احتمال",
            weightGain: { title: "احتمال زيادة الوزن", prediction: "قد تزيد {{weight}} كجم خلال 30 يوم" },
            weightLoss: { title: "احتمال خسارة الوزن", prediction: "قد تخسر {{weight}} كجم خلال 30 يوم" },
            fatigue: { title: "نمط الأكل قد يسبب إرهاق", prediction: "نقص البروتين والسعرات يسبب تعب مستمر" }
          },
          moodFood: { title: "🧠 تحليل المزاج مقابل الطعام", insight: "📊 عندما تأكل سكريات أكثر، ينخفض مزاجك", details: "{{count}} من أصل {{total}} يوم كان مزاجك سيئاً بعد السكريات", advice: "قلل السكريات لتحسين مزاجك" },
          alerts: {
            title: "🔔 إنذارات صحية",
            noMealsToday: { message: "لم تسجل وجبات اليوم", action: "سجل وجباتك الآن" },
            poorSleep: { message: "لم تنم جيداً أمس", action: "حاول النوم 7-8 ساعات" },
            lowProtein: { message: "مستوى البروتين منخفض", action: "تناول أطعمة غنية بالبروتين" },
            lateMeals: { message: "تأكل في وقت متأخر", action: "تجنب الأكل بعد 10 مساءً" }
          },
          score: { title: "📊 درجة تغذيتك", excellent: "ممتاز", good: "جيد", fair: "مقبول", needsImprovement: "يحتاج تحسين" },
          issues: {
            title: "⚠️ تحتاج تحسين",
            lowCalories: { message: "⚠️ سعراتك الحرارية منخفضة جداً", details: "متوسط سعراتك {{calories}} سعرة (الحد الأدنى 1500)" },
            highCalories: { message: "⚠️ سعراتك الحرارية مرتفعة", details: "متوسط سعراتك {{calories}} سعرة" },
            lowProtein: { message: "⚠️ البروتين منخفض", details: "متوسط البروتين {{protein}}g (يحتاج 50g+)" },
            lateMeals: { message: "⚠️ تأكل في وقت متأخر", details: "{{count}} وجبات بعد 10 مساءً تؤثر على النوم" },
            noBreakfast: { message: "⚠️ تفوت وجبة الإفطار", details: "الإفطار مهم للطاقة والتمثيل الغذائي" }
          },
          recommendations: {
            title: "💡 توصيات غذائية ذكية",
            why: "لماذا؟",
            tips: "نصائح:",
            defaultReason: "للوصول إلى وزن صحي ومستوى طاقة أفضل",
            increaseCalories: { title: "تحتاج سعرات أكثر", advice: "أضف {{calories}} سعرة يومياً", tips: ["🥑 أضف وجبة خفيفة غنية بالطاقة", "🥜 تناول المكسرات والفواكه المجففة", "🥛 أضف زبادي أو حليب لوجباتك", "🍌 تناول موزة مع زبدة الفول السوداني"] },
            decreaseCalories: { title: "خفض سعراتك قليلاً", advice: "قلل {{calories}} سعرة يومياً", tips: ["🥗 زد كمية الخضروات في وجباتك", "🥤 استبدل المشروبات السكرية بالماء", "🍽️ استخدم أطباق أصغر حجماً", "🏃 زد نشاطك البدني"] },
            increaseProtein: { title: "تحتاج بروتين أكثر", advice: "أضف {{protein}}g بروتين يومياً", reasons: ["البروتين ضروري لبناء العضلات", "يساعد على الشعور بالشبع لفترة أطول", "يُحسن التمثيل الغذائي"], tips: ["🥚 بيضة = 6g بروتين", "🍗 صدر دجاج (100g) = 31g بروتين", "🥛 كوب حليب = 8g بروتين", "🫘 كوب عدس = 18g بروتين"] },
            avoidLateMeals: { title: "تجنب الأكل المتأخر", advice: "توقف عن الأكل بعد الساعة 10 مساءً", reasons: ["الأكل المتأخر يضر بجودة النوم", "يسبب زيادة في تخزين الدهون", "يؤثر على هرمونات الجوع"], tips: ["⏰ حدد وقتاً نهائياً للأكل", "🌿 اشرب شاي أعشاب بدلاً من الطعام", "🍎 إذا جعت، كل تفاحة أو خضار"] },
            eatBreakfast: { title: "لا تفوت الإفطار", advice: "تناول وجبة إفطار متوازنة", reasons: ["الإفطار يحسن التمثيل الغذائي", "يزيد التركيز والطاقة صباحاً", "يساعد على التحكم بالوزن"], tips: ["🥣 شوفان مع فواكه = إفطار مثالي", "🍳 بيض مع خبز أسمر = بروتين وطاقة", "🥑 توست مع أفوكادو = دهون صحية"] },
            sleepBetter: { title: "نم أفضل لتأكل أفضل", advice: "حسن نومك لتحسين شهيتك", tips: ["⏰ نم 7-8 ساعات يومياً", "🚫 تجنب الكافيين بعد العصر", "📱 ابتعد عن الشاشات قبل النوم"] },
            good: { title: "نظامك الغذائي ممتاز", advice: "سعراتك الحرارية متوازنة", reasons: ["مستوى السعرات مثالي", "استمر على هذا النظام"], tips: ["🥗 حافظ على تنوع الطعام", "💧 اشرب الماء بانتظام", "🚶 استمر في النشاط البدني", "😴 نم 7-8 ساعات"] }
          },
          correlations: {
            sleepCalories: { insight: "😴 قلة النوم قد تقلل شهيتك للأكل", recommendation: "حسن نومك لتحسين شهيتك" },
            activityCalories: { insight: "🏃 نشاطك العالي يحتاج سعرات أكثر", recommendation: "زد سعراتك لتعويض النشاط" },
            moodCalories: { insight: "😊 قلة الأكل تؤثر على مزاجك", recommendation: "تناول وجبات منتظمة لتحسين مزاجك" },
            weightCalories: { insight: "⚖️ سعراتك العالية تزيد وزنك", recommendation: "قلل السعرات لإنقاص الوزن" }
          },
          distribution: { title: "📊 توزيع وجباتك", meal: "وجبة" }
        },
        sleep: {
          title: "🌙 تحليل نوم ذكي",
          loading: "🌙 جاري تحليل نومك الذكي...",
          analyzing: "🌙 تحليل نوم ذكي...",
          summary: { avgHours: "متوسط النوم", avgQuality: "الجودة", bedtime: "موعد النوم", waketime: "الاستيقاظ", hoursUnit: "س" },
          score: { title: "📊 درجة نومك", excellent: "ممتاز", good: "جيد", fair: "مقبول", needsImprovement: "يحتاج تحسين" },
          issues: {
            title: "⚠️ تحتاج تحسين",
            lowSleep: { message: "لا تنام كفاية", details: "تنام {hours} ساعات فقط (تحتاج 7-8)" },
            highSleep: { message: "تنام كثيراً", details: "{hours} ساعات أكثر من المعدل" },
            poorQuality: { message: "جودة نومك منخفضة", details: "{quality}/5 نجوم" },
            lateBedtime: { message: "تسهر كثيراً", detailsWithTime: "تنام في {time}:00", detailsNoTime: "موعد نوم غير منتظم" },
            noData: { message: "لا توجد سجلات نوم كافية", details: "سجل نومك لبضعة أيام لتحصل على تحليلات دقيقة" }
          },
          correlations: {
            title: "🔗 اكتشفنا",
            sleepMood: { strong: "نومك الجيد يحسن مزاجك بشكل ملحوظ", normal: "نومك يؤثر على مزاجك", recommendation: "حسن نومك لتحسين مزاجك" },
            sleepActivity: { insight: "النوم الجيد يزيد نشاطك في اليوم التالي", recommendation: "نم جيداً لتنشط أكثر" }
          },
          patterns: { title: "🔄 أنماط نومك", weekendRecovery: { insight: "تنام أكثر في عطلة نهاية الأسبوع", details: "هذا يعني أنك مرهق خلال الأسبوع" } },
          recommendations: {
            title: "💡 توصيات ذكية لنومك",
            why: "لماذا؟",
            how: "كيف؟",
            defaultReason: "للوصول إلى نوم مثالي وصحة أفضل",
            sleepMore: { title: "نم أكثر", advice: "تحتاج {hours} ساعات نوم إضافية", tips: ["⏱️ نم قبل 11 مساءً", "📱 ابتعد عن الشاشات قبل النوم بساعة", "🌡️ حافظ على غرفة مظلمة وباردة", "🧘 مارس التأمل 10 دقائق"] },
            improveQuality: { title: "حسن جودة نومك", advice: "نومك ليس عميقاً كفاية", tips: ["🚫 تجنب الكافيين بعد العصر", "🛏️ استخدم فراش مريح", "🌙 أطفئ جميع الأضواء", "🎵 استمع لأصوات مريحة"] },
            earlyBedtime: {
              title: "بكر في نومك",
              adviceWithTime: "نم قبل {ideal}:00 بدلاً من {current}:00",
              adviceNoTime: "حاول النوم قبل 10 مساءً",
              reasons: ["النوم المبكر يحسن جودة النوم", "يساعد على الاستيقاظ نشيطاً", "ينظم هرمونات الجسم"],
              tips: ["⏰ قلل وقت النوم تدريجياً 15 دقيقة كل يوم", "☀️ تعرض لضوء الشمس صباحاً", "🚫 تجنب القيلولة الطويلة"]
            },
            moreActivity: { title: "تحرك أكثر لتنام أفضل", advice: "النشاط البدني يحسن النوم", reasons: ["الرياضة تزيد إفراز هرمونات النوم", "تقلل التوتر والقلق", "تحسن جودة النوم العميق"], tips: ["🚶‍♂️ امشِ 30 دقيقة يومياً", "🧘 جرب اليوجا قبل النوم", "🌅 تمرن صباحاً لنتائج أفضل"] },
            sleepForMood: { title: "نم أفضل لتتحسن معنوياتك", advice: "النوم الجيد يحسن المزاج", reasons: ["النوم الجيد يحسن الصحة النفسية", "يقلل التوتر والقلق", "يزيد الطاقة الإيجابية"], tips: ["📝 دوّن أفكارك قبل النوم", "🎵 استمع لموسيقى هادئة", "💬 تحدث مع شخص قريب"] },
            startRecording: { title: "ابدأ بتسجيل نومك", advice: "سجل نومك لبضعة أيام لتحصل على تحليلات دقيقة", reason: "التحليل الذكي يحتاج بيانات", tips: ["😴 سجل وقت نومك واستيقاظك", "⭐ قيم جودة نومك", "📝 أضف ملاحظات عن أحلامك"] }
          },
          debug: {
            title: "🔍 ========== تشخيص بنية بيانات النوم ==========",
            type: "📊 نوع sleep:",
            isArray: "📊 هل sleep مصفوفة:",
            length: "📊 طول sleep:",
            availableFields: "🔍 القيم المتاحة:",
            sleepStart: "   - sleep_start:",
            sleepEnd: "   - sleep_end:",
            startTime: "   - start_time:",
            endTime: "   - end_time:",
            start: "   - start:",
            end: "   - end:",
            duration: "   - duration:",
            durationHours: "   - duration_hours:",
            receivedData: "🔍 ========== تحليل النوم ==========",
            sleepCount: "😴 عدد سجلات النوم:",
            hasData: "✅ hasSleepData:",
            firstThree: "📊 أول 3 سجلات نوم:",
            processing: "🔍 معالجة سجل {id}:",
            calculatedHours: "✅ المدة المحسوبة لسجل {id}: {hours} ساعات",
            processedRecords: "💾 sleepRecords بعد المعالجة:",
            totalHours: "✅ totalSleepHours:",
            avgHours: "✅ avgSleepHours:"
          }
        }
      },

      // ==================== الإشعارات ====================
      notifications: {
        title: "🔔 الإشعارات",
        loading: "جاري تحميل الإشعارات...",
        all: "الكل",
        unread: "غير مقروء",
        read: "مقروء",
        markAllRead: "تحديد الكل كمقروء",
        markRead: "تحديد كمقروء",
        noNotifications: "لا توجد إشعارات",
        noNotificationsDesc: "ستظهر هنا الإشعارات والتذكيرات المهمة",
        justNow: "الآن",
        minutesAgo: "منذ {{count}} دقيقة",
        hoursAgo: "منذ {{count}} ساعة",
        daysAgo: "منذ {{count}} يوم",
        view: "عرض التفاصيل",
        suggestions: "اقتراحات",
        total: "إجمالي الإشعارات",
        deleteConfirm: "هل أنت متأكد من حذف هذا الإشعار؟",
        deleteAllReadConfirm: "هل أنت متأكد من حذف جميع الإشعارات المقروءة؟",
        deleteAllRead: "حذف المقروء",
        stats: "إحصائيات",
        priority: { urgent: "عاجل", high: "مهم", medium: "متوسط", low: "عادي" },
        types: { health: "صحي", nutrition: "تغذوي", sleep: "نوم", mood: "مزاج", habit: "عادة", alert: "تنبيه", reminder: "تذكير", achievement: "إنجاز", tip: "نصيحة" }
      },
  "smartDashboard": {
    "title": "تحليلات وتوصيات ذكية",
    "loading": "جاري تحليل بياناتك...",
    "error": "حدث خطأ في جلب التحليلات الذكية",
    "retry": "إعادة المحاولة",
    "foodSelected": "تم اختيار",
    "calories": "السعرات",
    "caloriesUnit": "سعرة",
    "factors": {
      "sleep": "النوم",
      "hours": "ساعات",
      "mood": "المزاج",
      "activity": "النشاط البدني",
      "minutesPerWeek": "دقيقة/أسبوع",
      "nutrition": "التغذية",
      "caloriesPerDay": "سعرة/يوم",
      "habits": "العادات"
    },
    "healthScore": {
      "title": "درجة صحتك الشخصية",
      "footer": "حافظ على عاداتك الصحية لتحسين درجتك"
    },
    "foodSearch": {
      "title": "بحث الطعام"
    },
    "correlations": {
      "title": "علاقات مهمة في بياناتك",
      "strength": "قوة",
      "sleepMood": "النوم والمزاج",
      "sleepLow": "عندما تنام أقل من 6 ساعات",
      "goodSleep": "نوم جيد (7-8 س)",
      "poorSleep": "نوم قليل (4-5 س)",
      "basedOn": "بناءً على آخر",
      "days": "يوم",
      "activityPressure": "النشاط البدني والضغط",
      "walkingDays": "في الأيام التي تمشي فيها",
      "withWalking": "مع المشي",
      "withoutWalking": "بدون مشي",
      "caffeineSleep": "الكافيين والنوم",
      "caffeineAfter": "تناول الكافيين بعد الساعة 4 عصراً",
      "discoveredIn": "تم اكتشافه في",
      "outOf": "من أصل"
    },
    "recommendations": {
      "title": "خطة متكاملة لتحسين صحتك",
      "urgent": "عاجل",
      "sleepMore": "نم أكثر لتحسين مزاجك",
      "sleepMoreDesc": "الليلة، حاول النوم قبل 11 مساءً. غداً ستشعر بتحسن في مزاجك بنسبة 60%",
      "basedOn": "بناءً على",
      "sleepCorrelation": "نومك 4.5 ساعات ↔️ مزاجك 3/5",
      "important": "مهم",
      "regularActivity": "نشاط بدني منتظم",
      "regularActivityDesc": "مشي 20 دقيقة يومياً يحسن ضغطك ويقلل وزنك",
      "expected": "توقع",
      "kgInTwoWeeks": "-2 كجم في أسبوعين",
      "suggestion": "اقتراح",
      "balancedNutrition": "نظام غذائي متوازن",
      "balancedNutritionDesc": "في الأيام التي تتناول فيها البروتين، نومك أعمق بنسبة 25%",
      "addEgg": "أضف بيضة إلى فطورك",
      "greekYogurt": "تناول زبادي يوناني قبل النوم"
    },
    "predictions": {
      "title": "توقعات للأسبوع القادم",
      "weight": "الوزن",
      "kg": "كجم",
      "systolic": "الضغط الانقباضي",
      "stable": "مستقر",
      "sleep": "النوم",
      "hours": "ساعات",
      "hour": "ساعة",
      "mood": "المزاج",
      "good": "جيد",
      "improvement": "تحسن",
      "note": "هذه التوقعات بناءً على التزامك بالتوصيات المقترحة"
    }
  
},
  "foodSearch": {
    "placeholder": "ابحث عن طعام...",
    "searchFailed": "فشل البحث",
    "searchError": "حدث خطأ في البحث. حاول مرة أخرى",
    "noResults": "لا توجد نتائج. حاول بكلمات مختلفة",
    "calories": "سعرة",
    "protein": "بروتين",
    "carbs": "كربوهيدرات",
    "fat": "دهون",
    "fiber": "ألياف",
    "servingSize": "حصة"
}
,
  "smartRecommendations": {
    "title": "🧠 توصياتك الذكية",
    "loading": "🧠 جاري تحليل بياناتك لتوصيات ذكية...",
    "error": "حدث خطأ في جلب البيانات",
    "retry": "إعادة المحاولة",
    "refresh": "تحديث",
    "tip": "نصيحة",
    "suggestions": "اقتراحات",
    "lastUpdate": "آخر تحديث",
    "priority": {
      "urgent": "عاجل",
      "high": "مهم",
      "medium": "متوسط",
      "low": "عادي"
    },
    "categories": {
      "health": "الصحة",
      "nutrition": "التغذية",
      "sleep": "النوم",
      "mood": "المزاج",
      "habits": "العادات",
      "activity": "النشاط",
      "routine": "الروتين"
    },
    "noRecommendations": {
      "title": "✨ كل شيء على ما يرام!",
      "subtitle": "لا توجد توصيات خاصة حالياً"
    },
    "health": {
      "weightHigh": {
        "title": "وزنك يحتاج عناية",
        "message": "مؤشر كتلة جسمك {{bmi}} (زيادة وزن)",
        "advice": "ركز على الأكل الصحي وزد نشاطك",
        "actions": [
          "🥗 قلل السكريات والنشويات",
          "🚶 امشِ 30 دقيقة يومياً",
          "💧 اشرب 8 أكواب ماء",
          "🥩 زد البروتين في وجباتك"
        ],
        "basedOn": "تحليل الوزن والطول"
      },
      "weightLow": {
        "title": "وزنك أقل من الطبيعي",
        "message": "مؤشر كتلة جسمك {{bmi}} (نقص وزن)",
        "advice": "تحتاج تغذية غنية بالسعرات",
        "actions": [
          "🥑 أضف دهون صحية لوجباتك",
          "🥜 تناول المكسرات والفواكه المجففة",
          "🍚 زد كمية الأرز والمكرونة",
          "🥛 اشرب حليب كامل الدسم"
        ],
        "basedOn": "تحليل الوزن والطول"
      },
      "bpHigh": {
        "title": "ضغطك مرتفع قليلاً",
        "advice": "تابع ضغطك بانتظام",
        "actions": [
          "🧂 قلل الملح في الطعام",
          "🚭 ابتعد عن المنبهات",
          "🧘 مارس التأمل يومياً",
          "🥗 كل موز وأفوكادو"
        ],
        "basedOn": "آخر قياس للضغط"
      },
      "glucoseHigh": {
        "title": "سكر الدم مرتفع",
        "advice": "راقب مستوى السكر",
        "actions": [
          "🍬 قلل السكريات البسيطة",
          "🥗 زد الألياف في وجباتك",
          "🚶 امشِ بعد الأكل",
          "⏰ لا تؤجل الوجبات"
        ],
        "basedOn": "آخر قياس للسكر"
      },
      "glucoseLow": {
        "title": "سكر الدم منخفض",
        "advice": "تناول وجبة خفيفة",
        "actions": [
          "🍌 كل موزة أو تمر",
          "🥤 اشرب عصير فواكه",
          "🍪 تناول قطعة صغيرة من الحلويات",
          "⏰ لا تتأخر في وجباتك"
        ],
        "basedOn": "آخر قياس للسكر"
      }
    },
    "nutrition": {
      "breakfast": {
        "title": "🌅 وقت الإفطار",
        "message": "وجبة الصباح تبدأ طاقتك",
        "advice": "لا تفوت وجبة الإفطار",
        "actions": [
          "🥚 بيض مع خبز أسمر = بروتين + طاقة",
          "🥣 شوفان مع فواكه = ألياف + فيتامينات",
          "🥑 توست مع أفوكادو = دهون صحية",
          "☕ قهوة أو شاي أخضر = منبه طبيعي"
        ],
        "basedOn": "الساعة {{hour}}:00 - وقت الإفطار المثالي"
      },
      "lunch": {
        "title": "☀️ وجبة الغداء",
        "message": "وجبة منتصف اليوم تمدك بالطاقة",
        "advice": "اجعلها متوازنة",
        "actions": [
          "🍗 صدر دجاج أو سمك = بروتين",
          "🥗 سلطة خضراء = ألياف وفيتامينات",
          "🍚 أرز أو برغل = كربوهيدرات",
          "🥣 شوربة = ترطيب + دفء"
        ],
        "basedOn": "وقت الغداء المثالي"
      },
      "dinner": {
        "title": "🌙 وجبة العشاء",
        "message": "وجبة خفيفة قبل النوم",
        "advice": "لا تثقل معدتك",
        "actions": [
          "🥗 زبادي مع خيار = سهل الهضم",
          "🍎 تفاح أو فاكهة = سكريات طبيعية",
          "🥛 كوب حليب دافئ = يساعد على النوم",
          "🌿 شاي أعشاب = مهدئ طبيعي"
        ],
        "basedOn": "وقت العشاء المثالي"
      },
      "season": {
        "winter": {
          "title": "🍵 أكلات الشتاء",
          "message": "الجو بارد، جسمك يحتاج دفء",
          "advice": "أضف الأطعمة الدافئة",
          "actions": [
            "🥣 شوربة عدس أو خضار يومياً",
            "🍯 زنجبيل مع عسل = مناعة",
            "🍠 بطاطا حلوة مشوية = طاقة",
            "☕ مشروبات ساخنة = تدفئة"
          ],
          "basedOn": "فصل الشتاء"
        },
        "summer": {
          "title": "🥤 ترطيب الصيف",
          "message": "الجو حار، تفقد سوائل",
          "advice": "ركز على الأطعمة المرطبة",
          "actions": [
            "💧 اشرب 10 أكواب ماء يومياً",
            "🍉 بطيخ وخيار = ترطيب طبيعي",
            "🥗 سلطات منعشة = فيتامينات",
            "🧃 عصائر طبيعية بدون سكر"
          ],
          "basedOn": "فصل الصيف"
        }
      }
    },
    "sleep": {
      "bedtime": {
        "title": "استعد للنوم",
        "message": "حان وقت النوم",
        "messageWithData": "آخر نوم: {{hours}} ساعات",
        "advice": "جهز نفسك لنوم هادئ",
        "actions": [
          "📱 ابتعد عن الشاشات قبل النوم بساعة",
          "🌡️ اجعل غرفتك مظلمة وباردة",
          "🧘 مارس التنفس العميق 5 دقائق",
          "📝 دوّن أفكار الغد"
        ],
        "basedOn": "الوقت المثالي للنوم"
      },
      "sleepMore": {
        "title": "تنام قليلاً",
        "message": "معدل نومك {{hours}} ساعات",
        "advice": "جسمك يحتاج راحة أكثر",
        "actions": [
          "⏰ نم قبل 11 مساءً",
          "🚫 تجنب الكافيين بعد العصر",
          "🌙 خفف الأضواء مساءً",
          "🎵 استمع لأصوات مريحة"
        ],
        "basedOn": "تحليل ساعات نومك"
      },
      "quality": {
        "title": "جودة نومك منخفضة",
        "message": "{{quality}}/5 نجوم",
        "advice": "نومك ليس عميقاً كفاية",
        "actions": [
          "🛏️ استخدم فراش مريح",
          "🌡️ درجة حرارة الغرفة 20-22 درجة",
          "🚫 لا تأكل قبل النوم بساعتين",
          "🧘 جرب التأمل قبل النوم"
        ],
        "basedOn": "تقييم جودة نومك"
      }
    },
    "mood": {
      "low": {
        "title": "مزاجك منخفض",
        "message": "معدل مزاجك {{avg}}/5",
        "advice": "اهتم بنفسك أكثر",
        "actions": [
          "🚶 اخرج للمشي في الطبيعة",
          "🎵 استمع لموسيقى تحبها",
          "📞 اتصل بصديق مقرب",
          "🧘 مارس التأمل 10 دقائق"
        ],
        "basedOn": "تحليل مزاجك الأخير"
      },
      "weather": {
        "rainy": {
          "title": "يوم ممطر",
          "message": "المطر قد يسبب الكآبة",
          "advice": "حافظ على طاقتك الإيجابية",
          "actions": [
            "☕ اشرب مشروبك المفضل",
            "📖 اقرأ كتاباً ممتعاً",
            "🎬 شاهد فيلماً كوميدياً",
            "🧘 تأمل واستمع للمطر"
          ],
          "basedOn": "حالة الطقس: ممطر"
        },
        "sunny": {
          "title": "يوم مشمس",
          "message": "استغل الشمس لتحسين مزاجك",
          "advice": "التعرض للشمس يفرز السيروتونين",
          "actions": [
            "🚶 امشِ 20 دقيقة في الشمس",
            "🌿 اجلس في الهواء الطلق",
            "🏃‍♂️ مارس رياضة خارجية",
            "🌱 اهتم بزراعة النباتات"
          ],
          "basedOn": "حالة الطقس: مشمس"
        }
      }
    },
    "habits": {
      "pending": {
        "title": "عادات اليوم",
        "message": "لديك {{count}} عادات متبقية",
        "advice": "أنهي عاداتك اليومية",
        "basedOn": "عاداتك اليومية"
      },
      "medicine": {
        "title": "حان وقت {{name}}",
        "message": "لا تنس جرعتك",
        "advice": "تناول الدواء الآن",
        "actions": [
          "💧 اشرب ماء مع الدواء",
          "⏰ سجل أنك تناولته",
          "📱 ضع تذكير للجرعة القادمة"
        ],
        "basedOn": "موعد الدواء المحدد"
      },
      "defaultName": "عادة"
    },
    "activity": {
      "more": {
        "title": "تحتاج نشاط أكثر",
        "message": "هذا الأسبوع: {{minutes}} دقيقة فقط",
        "advice": "تحتاج {{remaining}} دقيقة إضافية",
        "actions": [
          "🚶 امشِ 20 دقيقة يومياً",
          "🧘 جرب تمارين منزلية",
          "🚴 استخدم الدراجة للتنقل",
          "👥 تمرن مع صديق"
        ],
        "basedOn": "معدل نشاطك الأسبوعي"
      },
      "weather": {
        "hot": {
          "title": "جو حار جداً",
          "advice": "تجنب الرياضة في الحر",
          "actions": [
            "🏊 سباحة = أفضل نشاط في الحر",
            "🌅 تمرن الصباح الباكر أو المساء",
            "💧 اشرب ماء أكثر أثناء الرياضة",
            "🏠 جرب تمارين داخلية"
          ],
          "basedOn": "درجة الحرارة الحالية"
        },
        "cold": {
          "title": "جو بارد",
          "advice": "تمرن بحذر",
          "actions": [
            "🧥 ارتدِ ملابس دافئة",
            "🏃 إحماء جيد قبل الرياضة",
            "🏠 تمارين داخلية مناسبة",
            "☕ اشرب دافئاً بعد الرياضة"
          ],
          "basedOn": "درجة الحرارة الحالية"
        }
      }
    },
    "routine": {
      "morning": {
        "title": "صباح النشاط",
        "message": "بداية يومك تحدد نشاطك",
        "advice": "ابدأ يومك بنشاط",
        "actions": [
          "☀️ تعرض لضوء الشمس 10 دقائق",
          "💧 اشرب كوب ماء دافئ مع ليمون",
          "🧘 تمارين تمدد خفيفة",
          "📝 خطط ليومك"
        ],
        "basedOn": "الروتين الصباحي المثالي"
      },
      "night": {
        "title": "استعداد للنوم",
        "message": "جهز نفسك لنوم هادئ",
        "advice": "روتين مسائي مريح",
        "actions": [
          "📵 ابتعد عن الشاشات",
          "📖 اقرأ كتاباً ورقيًا",
          "🌿 اشرب شاي أعشاب",
          "🧘 تأمل 5 دقائق"
        ],
        "basedOn": "الروتين المسائي"
      }
    }
  },
  "weather": {
    "title": "🌤️ الطقس في",
    "loading": "جاري تحميل الطقس...",
    "error": "فشل تحميل بيانات الطقس",
    "fetchError": "فشل تحميل بيانات الطقس. تحقق من الاتصال",
    "retry": "إعادة المحاولة",
    "refresh": "تحديث",
    "changeCity": "تغيير المدينة",
    "cityPlaceholder": "أدخل اسم المدينة...",
    "save": "حفظ",
    "cancel": "إلغاء",
    "humidity": "الرطوبة",
    "windSpeed": "الرياح",
    "pressure": "الضغط الجوي",
    "uvIndex": "مؤشر الأشعة فوق البنفسجية",
    "recommendation": "توصية",
    "activitySuggestion": "اقتراح نشاط",
    "clothingSuggestion": "اقتراح ملابس",
    "lastUpdate": "آخر تحديث",
    "recommendations": {
      "extremeHeat": "🌡️ حرارة شديدة! تجنب الخروج في منتصف النهار. اشرب ماء كثيراً وارتدِ ملابس خفيفة.",
      "hot": "☀️ الجو حار. اشرب ماء كثيراً وتجنب التعرض الطويل للشمس.",
      "freezing": "❄️ جو بارد جداً! ارتدِ ملابس ثقيلة وتجنب الخروج الطويل.",
      "cold": "🧥 الجو بارد. ارتدِ ملابس دافئة واشرب مشروبات ساخنة.",
      "rainy": "☔ يوم ممطر. لا تنسَ المظلة وارتدِ ملابس مناسبة.",
      "windy": "🌬️ رياح قوية. كن حذراً في الأماكن المكشوفة.",
      "highHumidity": "💧 رطوبة عالية. اشرب ماء كثيراً وارتاح في مكان مكيف.",
      "sunny": "☀️ جو مشمس. استمتع بالطقس الجميل ولكن احرص على استخدام واقي الشمس.",
      "perfect": "🌿 طقس مثالي! استمتع بالخروج والأنشطة الخارجية."
    },
    "activities": {
      "rainy": "☔ الطقس ممطر - مناسب للقراءة في المنزل أو الذهاب للمقهى.",
      "hot": "🌡️ الجو حار - أفضل نشاط: السباحة أو البقاء في أماكن مكيفة.",
      "cold": "❄️ الجو بارد - مناسب للمشي السريع أو التمارين المنزلية.",
      "sunny": "☀️ جو مشمس - ممتاز للمشي في الطبيعة أو ممارسة الرياضة.",
      "perfect": "🌿 طقس مثالي للتنزه والمشي وممارسة الأنشطة الخارجية."
    },
    "clothing": {
      "rainy": "☔ ملابس مقاومة للمطر وجاكيت خفيف.",
      "hot": "👕 ملابس قطنية خفيفة وألوان فاتحة.",
      "warm": "👚 ملابس صيفية خفيفة وقبعة لحماية الرأس.",
      "freezing": "🧥 ملابس شتوية ثقيلة ومعطف وقفازات.",
      "cool": "🧣 ملابس خريفية مع جاكيت خفيف."
    }
  },
  "reports": {
    "title": "التقارير الصحية الشاملة",
    "loading": "جاري تحميل التقارير...",
    "error": "حدث خطأ في جلب التقارير",
    "retry": "إعادة المحاولة",
    "period": "الفترة",
    "days": "أيام",
    "to": "إلى",
    "types": {
      "weekly": "تقرير أسبوعي",
      "monthly": "تقرير شهري",
      "yearly": "تقرير سنوي",
      "custom": "تقرير مخصص"
    },
    "tabs": {
      "summary": "الملخص",
      "health": "الصحة",
      "nutrition": "التغذية",
      "sleep": "النوم",
      "mood": "المزاج",
      "activity": "النشاط",
      "habits": "العادات"
    },
    "export": {
      "pdfComingSoon": "سيتم إضافة ميزة تصدير PDF قريباً",
      "csvComingSoon": "سيتم إضافة ميزة تصدير CSV قريباً"
    },
    "summary": {
      "title": "ملخص الفترة",
      "strengthsTitle": "نقاط القوة",
      "weaknessesTitle": "يحتاج تحسين",
      "recommendationsTitle": "توصيات مخصصة",
      "quickStats": "إحصائيات سريعة",
      "strengths": {
        "weightNormal": "⚖️ وزنك في المعدل الطبيعي",
        "bpIdeal": "❤️ ضغط الدم مثالي",
        "sleepIdeal": "🌙 نومك مثالي",
        "moodPositive": "😊 مزاجك إيجابي",
        "nutritionBalanced": "🥗 تغذيتك متوازنة",
        "activityExcellent": "🏃 نشاطك ممتاز",
        "habitsHigh": "✅ التزامك بالعادات عالي"
      },
      "weaknesses": {
        "weightHigh": "⚖️ وزنك أعلى من المعدل الطبيعي",
        "weightLow": "⚖️ وزنك أقل من المعدل الطبيعي",
        "bpHigh": "❤️ ضغط الدم مرتفع",
        "sleepLow": "🌙 تعاني من قلة النوم",
        "sleepHigh": "🌙 تنام أكثر من اللازم",
        "moodLow": "😊 مزاجك منخفض",
        "caloriesLow": "🥗 سعراتك الحرارية منخفضة",
        "caloriesHigh": "🥗 سعراتك الحرارية مرتفعة",
        "activityLow": "🏃 نشاطك قليل",
        "habitsLow": "✅ تحتاج تحسين الالتزام بالعادات"
      },
      "recommendations": {
        "sleepMore": "🌙 نم قبل 11 مساءً لتحسين جودة النوم",
        "moodImprove": "😊 مارس تمارين التنفس العميق يومياً",
        "activityMore": "🏃 زد نشاطك اليومي إلى 30 دقيقة مشي",
        "proteinMore": "🥚 أضف مصادر بروتين لكل وجبة",
        "bpMonitor": "❤️ قلل الملح وراقب ضغطك يومياً",
        "habitsStart": "✅ ابدأ بعادة صغيرة وسهلة يومياً"
      },
      "stats": {
        "habitsCompleted": "✅ العادات المنجزة",
        "avgSleep": "🌙 متوسط النوم",
        "totalCalories": "🥗 إجمالي السعرات",
        "activityMinutes": "🏃 دقائق النشاط",
        "hours": "س"
      }
    },
    "health": {
      "title": "تقرير الصحة الحيوية",
      "noData": "لا توجد بيانات صحية في هذه الفترة",
      "currentWeight": "الوزن الحالي",
      "avgWeight": "متوسط الوزن",
      "minWeight": "أقل وزن",
      "maxWeight": "أعلى وزن",
      "systolic": "الضغط الانقباضي",
      "diastolic": "الضغط الانبساطي",
      "avgGlucose": "متوسط السكر",
      "records": "عدد القراءات"
    },
    "nutrition": {
      "title": "تقرير التغذية",
      "noData": "لا توجد بيانات تغذية في هذه الفترة",
      "totalMeals": "إجمالي الوجبات",
      "totalCalories": "إجمالي السعرات",
      "totalProtein": "إجمالي البروتين",
      "totalCarbs": "إجمالي الكربوهيدرات",
      "avgPerMeal": "متوسط الوجبة الواحدة",
      "calories": "السعرات",
      "protein": "البروتين",
      "carbs": "الكربوهيدرات",
      "fat": "الدهون",
      "mealDistribution": "توزيع الوجبات",
      "breakfast": "فطور",
      "lunch": "غداء",
      "dinner": "عشاء",
      "snacks": "وجبات خفيفة",
      "topFoods": "الأطعمة الأكثر استهلاكاً",
      "times": "مرة"
    },
    "sleep": {
      "title": "تقرير النوم",
      "noData": "لا توجد بيانات نوم في هذه الفترة",
      "avgSleep": "متوسط النوم",
      "totalSleep": "إجمالي النوم",
      "minSleep": "أقل نوم",
      "maxSleep": "أكثر نوم",
      "sleepQuality": "جودة النوم",
      "excellentNights": "ليالي ممتازة",
      "goodNights": "ليالي جيدة",
      "poorNights": "ليالي سيئة",
      "hours": "ساعة"
    },
    "mood": {
      "title": "تقرير المزاج",
      "noData": "لا توجد بيانات مزاج في هذه الفترة",
      "avgMood": "متوسط المزاج",
      "dominant": "الحالة الأكثر",
      "records": "عدد التسجيلات",
      "trend": "الاتجاه",
      "improving": "تحسن",
      "declining": "تراجع",
      "distribution": "توزيع الحالات المزاجية"
    },
    "activity": {
      "title": "تقرير النشاط البدني",
      "noData": "لا توجد بيانات نشاط في هذه الفترة",
      "totalMinutes": "إجمالي الدقائق",
      "totalCalories": "إجمالي السعرات",
      "avgMinutes": "متوسط الدقائق/يوم",
      "totalActivities": "عدد التمارين"
    },
    "habits": {
      "title": "تقرير العادات",
      "noData": "لا توجد بيانات عادات في هذه الفترة",
      "totalHabits": "إجمالي العادات",
      "completed": "العادات المنجزة",
      "completionRate": "نسبة الإنجاز"
    }
  },
  // ==================== التسجيل ====================
register: {
  title: "إنشاء حساب جديد",
  subtitle: "انضم إلى LivoCare وابدأ رحلتك الصحية",
  description: "أدخل بياناتك لإنشاء حساب جديد والاستفادة من جميع ميزات التطبيق",
  firstName: "الاسم الأول",
  firstNamePlaceholder: "أدخل اسمك الأول",
  lastName: "اسم العائلة",
  lastNamePlaceholder: "أدخل اسم العائلة",
  username: "اسم المستخدم",
  usernamePlaceholder: "مثال: testuser123",
  email: "البريد الإلكتروني",
  emailPlaceholder: "example@email.com",
  password: "كلمة المرور",
  passwordPlaceholder: "••••••••••",
  passwordStrong: "يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، رقم، رمز",
  confirmPassword: "تأكيد كلمة المرور",
  confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
  registerButton: "إنشاء حساب",
  termsPrefix: "بالضغط على 'إنشاء حساب'، فإنك توافق على ",
  termsOfService: "شروط الخدمة",
  and: " و ",
  privacyPolicy: "سياسة الخصوصية",
  haveAccount: "لديك حساب بالفعل؟",
  login: "تسجيل الدخول",
  
  // فوائد التسجيل
  benefitsTitle: "🌟 لماذا تنضم إلى LivoCare؟",
  benefit1: "📊 تتبع شامل للعلامات الحيوية",
  benefit2: "🥗 خطط تغذية ذكية مخصصة",
  benefit3: "🌙 تحليل عمق النوم وجودته",
  benefit4: "😊 تسجيل الحالة المزاجية والعوامل المؤثرة",
  benefit5: "💊 متابعة العادات والأدوية اليومية",
  
  // شهادة مستخدم
  testimonial: '"منذ استخدام LivoCare، تحسنت صحتي بشكل ملحوظ وأصبحت أكثر وعياً بعاداتي اليومية"',
  testimonialAuthor: "أحمد السيد - مستخدم مميز",
  
  // رسائل الخطأ
  errors: {
    firstNameRequired: "الاسم الأول مطلوب",
    lastNameRequired: "اسم العائلة مطلوب",
    usernameRequired: "اسم المستخدم مطلوب",
    usernameMinLength: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    usernameMaxLength: "اسم المستخدم يجب ألا يزيد عن 20 حرفاً",
    usernameInvalid: "اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام",
    usernameTaken: "اسم المستخدم موجود بالفعل",
    emailRequired: "البريد الإلكتروني مطلوب",
    emailInvalid: "البريد الإلكتروني غير صالح",
    emailTaken: "البريد الإلكتروني مسجل بالفعل",
    passwordRequired: "كلمة المرور مطلوبة",
    passwordMinLength: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    passwordUppercase: "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل",
    passwordLowercase: "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل",
    passwordNumber: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل",
    passwordSymbol: "كلمة المرور يجب أن تحتوي على رمز واحد على الأقل",
    passwordsDoNotMatch: "كلمتا المرور غير متطابقتين",
    termsRequired: "يجب الموافقة على الشروط وسياسة الخصوصية",
    registerFailed: "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى",
    networkError: "خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى",
    serverError: "خطأ في الخادم. حاول لاحقاً"
  },
  
  // رسائل النجاح
  success: {
    accountCreated: "✅ تم إنشاء حسابك بنجاح!",
    redirecting: "جاري تحويلك إلى لوحة التحكم...",
    verificationEmailSent: "تم إرسال رابط التفعيل إلى بريدك الإلكتروني"
  },
  
  // متطلبات كلمة المرور
  passwordRequirements: {
    title: "متطلبات كلمة المرور:",
    minLength: "✔ 8 أحرف على الأقل",
    uppercase: "✔ حرف كبير (A-Z)",
    lowercase: "✔ حرف صغير (a-z)",
    number: "✔ رقم (0-9)",
    symbol: "✔ رمز (!@#$%^&*)"
  },
  
  // حالة التحقق من كلمة المرور
  passwordStrength: {
    weak: "ضعيفة",
    fair: "مقبولة",
    good: "جيدة",
    strong: "قوية جداً",
    title: "قوة كلمة المرور:"
  },
  
  // Social login
  socialLogin: {
    title: "أو سجل باستخدام",
    google: "Google",
    facebook: "Facebook",
    apple: "Apple"
  }
}
    }
  },

  en: {
    translation: {
      // ==================== عام ====================
      common: {
        loading: "Loading...",
        error: "An error occurred",
        success: "Operation completed successfully",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        minutes: "minutes",
        km: "km",
        calories: "calories",
        refresh: "Refresh",
        noDate: "No date",
        recommendation: "Recommendation",
        suggestions: "Suggestions",
        dismiss: "Dismiss"
      },

      // ==================== النشاط البدني ====================
      activities: {
        title: "Record Physical Activity",
        description: "Log details of the exercises you did today.",
        activityType: "Activity Type",
        selectActivity: "Select activity type",
        duration: "Duration",
        durationPlaceholder: "in minutes",
        calories: "Calories Burned",
        caloriesPlaceholder: "approx.",
        distance: "Distance",
        distancePlaceholder: "in kilometers",
        startTime: "Start Time",
        notes: "Additional Notes",
        notesPlaceholder: "Any additional notes...",
        addActivity: "Add Activity",
        successMessage: "✅ Physical activity recorded successfully!",
        submissionError: "Registration failed. Please check the entered data.",
        invalidStartTime: "Invalid start date and time.",
        invalidDuration: "Invalid duration entered.",
        sessionExpired: "Session expired. Please log in again.",
        serverError: "Server error. Please try again later.",
        selectActivityError: "Please select an activity type.",
        durationError: "Duration must be at least 1 minute.",
        startTimeError: "Please specify the start time.",
        futureTimeError: "Start time cannot be in the future.",
        walking: "Walking",
        running: "Running",
        weightlifting: "Weightlifting",
        swimming: "Swimming",
        yoga: "Yoga",
        pilates: "Pilates",
        cardio: "Cardio",
        cycling: "Cycling",
        football: "Football",
        basketball: "Basketball",
        tennis: "Tennis",
        other: "Other",
        history: "📋 Activities History",
        count: "activities",
        estimatedCalories: "Estimated calories burned",
        minutes: "minutes",
        calories: "calories",
            "durationTooLong": "⚠️ Duration is too long. Maximum is 180 minutes",
    "durationHint": "From 1 to 180 minutes",
    "id": "ID",
    "unknown": "Unknown",
    "editCancelled": "Edit cancelled"
      },

      // ==================== الحالة المزاجية ====================
      mood: {
        title: "😊 Mood Tracker",
        yourMoodToday: "Your Mood Today",
        addToday: "➕ Add Today's Mood",
        updateToday: "✏️ Update Today's Mood",
        addNew: "Add New Mood",
        chooseMood: "Choose Your Mood",
        factors: "Influencing Factors",
        factorsPlaceholder: "Example: Work, Family, Weather, Sleep...",
        notes: "Notes",
        notesPlaceholder: "Write how you feel in detail...",
        saveMood: "💾 Save Mood",
        autoRefresh: "Auto Refresh",
        lastUpdate: "Last Update",
        recordedAt: "Recorded at",
        history: "📋 History",
        noRecords: "No mood records found",
        startRecording: "Start recording your first mood to see mood journey analytics",
        deleteConfirm: "Are you sure you want to delete this entry?",
        fetchError: "❌ Failed to load mood data. Please try again.",
        addError: "❌ Failed to add mood. Please check data and try again.",
        deleteError: "❌ Failed to delete entry.",
        excellent: "Excellent",
        good: "Good",
        neutral: "Neutral",
        stressed: "Stressed",
        anxious: "Anxious",
        sad: "Sad"
      },

      // ==================== العادات والأدوية ====================
      habits: {
        title: "Habits & Medications",
        todayStats: "Today's Statistics",
        newHabit: "Define New Habit",
        habitName: "Habit Name",
        namePlaceholder: "Example: Drink 8 glasses of water",
        habitDescription: "Habit Description and Goal",
        descriptionPlaceholder: "Explain the goal of this habit, e.g., to improve hydration and increase energy.",
        addHabitDefinition: "💾 Add Habit Definition",
        todayTracking: "Today's Tracking",
        habits: "habit",
        loadingHabits: "Loading habits...",
        noHabits: "No habits defined yet. Start by adding a new habit.",
        of: "of",
        completed: "habits completed",
        completeToday: "✓ Done Today",
        undo: "↶ Undo",
        checkingAuth: "Please wait, checking login status...",
        addSuccess: "✅ Successfully defined habit \"{{name}}\"!",
        addError: "❌ Failed to add habit. Make sure all fields are valid.",
        fetchError: "❌ Failed to fetch habit data.",
        authError: "❌ Cannot fetch habits. Please log in first.",
        loginRequired: "❌ Must be logged in to add habits.",
        emptyFields: "❌ Must fill habit name and description.",
        logAdded: "✅ Successfully logged habit!",
        logRemoved: "✅ Habit log removed.",
        updateError: "❌ Failed to update habit log.",
        addFirstHabit: "Add your first habit"
      },

      // ==================== النوم ====================
      sleep: {
        title: "Sleep Tracker",
        startTime: "Sleep Start Time",
        endTime: "Wake Up Time",
        quality: "Sleep Quality",
        notes: "Notes",
        startTimeHelp: "use 24",
        optional: "optional",
        notesPlaceholder: "Example: Dreams, frequent waking, sleep conditions...",
        submitButton: "Log Sleep Session",
        resetButton: "Reset",
        dismiss: "Dismiss",
        autoRefresh: "Auto Refresh",
        lastUpdate: "Last Update",
        calculatedDuration: "Calculated Sleep Duration",
        hours: "hours",
        excellent: "Excellent",
        veryGood: "Very Good",
        average: "Average",
        poor: "Poor",
        bad: "Bad",
        successMessage: "✅ Sleep session logged successfully!",
        submissionError: "❌ Failed to log sleep session. Please check your input.",
        error: "Error",
        failed: "Failed",
        invalidData: "❌ Invalid data. Please check dates and times.",
        sessionExpired: "❌ Session expired. Please log in again.",
        serverError: "❌ Server error. Please try again later.",
        requiredFields: "Please fill in start and end times.",
        invalidEndTime: "Wake up time must be after sleep start time.",
        futureTimeError: "Cannot log sleep in the future.",
        longDurationError: "Sleep duration is too long. Please check dates.",
        switchToLight: "Switch to Light Mode",
        switchToDark: "Switch to Dark Mode"
      },

      // ==================== التغذية ====================
      nutrition: {
        title: "Nutrition Management",
        subtitle: "Log your meals and track your diet",
        newMeal: "Log New Meal",
        dashboard: "Dashboard",
        lastUpdate: "Last Update",
        autoRefresh: "Auto Refresh",
        mealsLogged: "meals logged",
        refresh: "Refresh",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        loading: "Loading nutrition data...",
        noMeals: "No meals logged yet",
        addFirstMeal: "Start by logging your first meal",
        mealAdded: "✅ Meal added successfully",
        mealUpdated: "✅ Meal updated successfully",
        mealDeleted: "✅ Meal deleted successfully",
        errorLoading: "❌ Failed to load nutrition data",
        errorSaving: "❌ Failed to save meal",
        errorDeleting: "❌ Failed to delete meal",
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        snack: "Snack",
        other: "Other",
        calories: "Calories",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat",
        fiber: "Fiber",
        sugar: "Sugar",
        caloriesUnit: "cal",
        gramUnit: "g",
        servingUnit: "serving",
        totalCalories: "Total Calories",
        averageCalories: "Average Calories",
        dailyGoal: "Daily Goal",
        remaining: "Remaining",
        consumed: "Consumed",
        tip1: "💡 Drink water with every meal",
        tip2: "💡 Include vegetables in every main meal",
        tip3: "💡 Reduce added sugars",
        tip4: "💡 Include protein in every meal",
        tip5: "💡 Choose healthy fats like avocado and nuts",
        today: "Today",
        week: "Week",
        month: "Month",
        autoRefreshActive: "Auto Refresh Active",
        avgProtein: "Avg Protein",
        todayCalories: "Today's Calories",
        dailyGoalsProgress: "Daily Goals Progress",
        mealDistribution: "Meal Distribution",
        loggedMeals: "Logged Meals",
        meals: "meal",
        ingredients: "Ingredients",
        notes: "Notes",
        smartRecommendations: "Smart Recommendations",
        recommendations: {
          caloriesGoal: "🎯 You're close to your daily calorie goal! Keep it balanced",
          moreProtein: "💪 Try to increase protein intake in your meals (sources: chicken, fish, eggs)",
          lessCarbs: "🌾 Reduce simple carbs and choose whole grains",
          balanceCalories: "⚖️ Maintain calorie balance in your meals",
          eatBreakfast: "🌅 Don't forget breakfast, it's important for energy and metabolism",
          mealVariety: "🍎 Try adding different types of meals for better nutritional diversity",
          balancedDiet: "🎉 Your diet is balanced! Keep up this healthy pattern",
          mealsHistory: "Meals History",
          meals: "meals",
          meal: "meal",
          gram: "gram",
          grams: "grams"
        },
        trackYourDiet: "Log your daily meals to track your diet",
        autoSave: "Auto Save",
        lastSave: "Last save",
        nutritionSummary: "Nutrition Summary",
        mealType: "Meal Type",
        mealTime: "Meal Time",
        mealIngredients: "Meal Ingredients",
        ingredient: "ingredient",
        clearAll: "Clear All",
        deleteIngredient: "Delete Ingredient",
        ingredientName: "Ingredient Name",
        ingredientPlaceholder: "Enter ingredient name...",
        quantity: "Quantity",
        unit: "Unit",
        additionalNotes: "Additional Notes (optional)",
        notesPlaceholder: "Write any notes about the meal...",
        clearForm: "Clear Form",
        saveMeal: "Save Meal",
        saving: "Saving...",
        autoRestored: "💾 Auto-saved data restored",
        formCleared: "🗑️ Form cleared",
        loginRequired: "❌ Must be logged in to add meals",
        atLeastOneIngredient: "❌ Please add at least one ingredient",
        failedToSave: "❌ Failed to log meal. Please check your input",
        invalidMealTime: "❌ Invalid meal time",
        invalidMealType: "❌ Invalid meal type",
        autoCalculated: "Auto Calculated",
        addNewIngredient: "Add New Ingredient",
        advanced: {
          title: "📊 Advanced Nutrition Statistics",
          low: "⚠️ Low",
          high: "⚠️ High",
          good: "✅ Good",
          veryLow: "Very Low",
          veryHigh: "Very High",
          analysis: "📊 Nutritional Analysis",
          balance: "Calorie Balance",
          proteinRatio: "Protein Ratio",
          variety: "Meal Variety",
          types: "{{count}} types",
          strengths: "✨ Your Strengths",
          weaknesses: "⚠️ Needs Improvement",
          mealsLogged: "✅ You've logged {{count}} meals so far",
          goodProtein: "Good protein ratio",
          goodVariety: "Good meal variety",
          fewMeals: "🔴 You've only logged {{count}} meals",
          lowCalories: "Your calories are too low",
          lowProtein: "You need more protein",
          noBreakfast: "You haven't logged breakfast"
        },
        patterns: {
          title: "🔍 Your Eating Patterns",
          noData: "📊 Insufficient data",
          veryLow: "Very low calorie diet",
          moderate: "Moderate calorie diet",
          balanced: "Balanced diet",
          high: "High calorie diet",
          current: "Current Pattern",
          meals: "🍽️ {{count}} meals",
          calories: "🔥 {{calories}} calories",
          protein: "🥩 {{protein}}g protein",
          last30Days: "Last 30 days",
          mealCount: "{{count}} {{type}} meals",
          percentage: "{{percent}}% of meals"
        },
        prediction: {
          title: "🔮 Nutrition Predictions",
          current: "📊 Your Current Status",
          avgMeals: "Average Meals",
          mealsPerMonth: "{{count}} meals / month",
          avgCalories: "Average Calories",
          caloriesPerMeal: "{{calories}} calories / meal",
          nextWeek: "📅 Next Week Predictions",
          dailyExpected: "Expected daily calories",
          weeklyExpected: "Expected weekly calories",
          caloriesPerDay: "cal/day",
          caloriesPerWeek: "cal/week",
          needMoreData: "📊 Log at least 3 meals to start predictions",
          note: "* Predictions are approximate and based on your average calories"
        },
        tabs: {
          basic: "Basic",
          advanced: "Advanced",
          patterns: "Patterns",
          recommendations: "Recommendations",
          prediction: "Predictions"
        },
        loading: {
          advanced: "Loading advanced analytics...",
          patterns: "Loading patterns...",
          recommendations: "Loading recommendations...",
          prediction: "Loading predictions..."
        }
      },

      // ==================== الصحة ====================
      health: {
        dashboard: {
          title: "Health Dashboard",
          latestReading: "Latest Health Reading",
          status: { normal: "Normal", warning: "Needs Review", no_data: "No Data" },
          weight: "Weight",
          bloodPressure: "Blood Pressure",
          bloodGlucose: "Blood Glucose",
          systolic: "Systolic",
          diastolic: "Diastolic",
          kg: "kg",
          mgdl: "mg/dL",
          bodyWeight: "Body Weight",
          glucoseLevel: "Glucose Level",
          loading: "Loading data...",
          fetchError: "❌ Failed to fetch data. Please check server connection.",
          retry: "Retry",
          noData: "No health readings recorded yet. Please start using the form above.",
          refresh: "Refresh Data",
          viewDetails: "View Details",
          healthAlerts: "Health Alerts",
          weightHigh: "Weight is high, recommended to follow up with a nutritionist",
          bpHigh: "Blood pressure is high, recommended to consult a doctor",
          glucoseHigh: "Blood glucose is high, recommended to consult a doctor",
          consultDoctor: "Recommended to consult a doctor for follow-up",
          recordedAt: "Recorded at",
          lastUpdated: "Last Updated",
          tip1: "Record your health readings regularly to track your condition",
          tip2: "You can update data by clicking the refresh button"
        },
        form: {
          title: "Record New Health Reading",
          subtitle: "Enter your basic health readings to track your condition",
          autoSave: "Auto Save",
          lastSave: "Last save",
          weight: "Weight",
          weightPlaceholder: "Enter weight",
          systolic: "Systolic Pressure",
          systolicPlaceholder: "Enter systolic pressure",
          diastolic: "Diastolic Pressure",
          diastolicPlaceholder: "Enter diastolic pressure",
          glucose: "Blood Glucose",
          glucosePlaceholder: "Enter glucose level",
          kg: "kg",
          mgdl: "mg/dL",
          reset: "Reset",
          save: "Save Reading",
          saving: "Saving...",
          healthIndicators: "Health Indicators",
          indicators: {
            weightHigh: "⚠️ Weight is high (above 100 kg)",
            weightLow: "⚠️ Weight is low (below 50 kg)",
            weightNormal: "✅ Weight is normal (50-100 kg)",
            bpHigh: "⚠️ Blood pressure is high (above 140/90)",
            bpLow: "⚠️ Blood pressure is low (below 90/60)",
            bpNormal: "✅ Blood pressure is normal (90/60 - 140/90)",
            glucoseHigh: "⚠️ Blood glucose is high (above 140)",
            glucoseLow: "⚠️ Blood glucose is low (below 70)",
            glucoseNormal: "✅ Blood glucose is normal (70-140)",
                  "weightHint": "Normal range: 50-100 kg",
      "systolicHint": "Normal range: 90-140 mmHg",
      "diastolicHint": "Normal range: 60-90 mmHg",
      "glucoseHint": "Normal range: 70-140 mg/dL (fasting)",
      "errors": {
        "invalidNumber": "Please enter a valid number",
        "range": "Must be between {{min}} and {{max}}"
      }
          },
          advice: {
            weightLow: "Very low weight, recommended to increase calorie intake",
            weightNormal: "Your weight is ideal, maintain your diet",
            weightHigh: "Weight is high, recommended to consult a nutritionist",
            bpLow: "Low blood pressure, recommended to drink more water and consult a doctor",
            bpNormal: "Blood pressure is normal, maintain your healthy lifestyle",
            bpHigh: "Blood pressure is high, recommended to consult a doctor",
            glucoseLow: "Low blood sugar, recommended to eat a light snack",
            glucoseNormal: "Blood sugar is normal, maintain your routine",
            glucoseHigh: "Blood sugar is high, recommended to consult a doctor"
          },
          autoRestored: "💾 Auto-saved data restored",
          formCleared: "🗑️ Form cleared",
          correctErrors: "❌ Please correct errors in the form",
          submissionSuccess: "✅ Health data recorded successfully!",
          submissionError: "❌ Failed to record data. Make sure all values are correct.",
          sessionExpired: "❌ Session expired. Please log in again.",
          serverError: "❌ Server error. Please try again later.",
          errors: {
            weight: "Weight is not logical. Should be between {{min}} and {{max}} kg.",
            systolic: "Systolic pressure is not logical. Should be between {{min}} and {{max}}.",
            diastolic: "Diastolic pressure is not logical. Should be between {{min}} and {{max}}.",
            glucose: "Glucose reading is not logical. Should be between {{min}} and {{max}} mg/dL.",
            systolicGreater: "Systolic pressure must be greater than diastolic.",
            invalidWeight: "❌ Invalid weight value",
            invalidSystolic: "❌ Invalid systolic value",
            invalidDiastolic: "❌ Invalid diastolic value",
            invalidGlucose: "❌ Invalid glucose value"
          }
        }
      },

      // ==================== الرسوم البيانية ====================
      charts: {
        title: "Health Data Analysis",
        weightChartTitle: "Weight Evolution",
        bloodPressureTitle: "Blood Pressure",
        glucoseTitle: "Blood Glucose",
        refresh: "Refresh",
        reading: "reading",
        day: "day",
        weightLabel: "Weight (kg)",
        systolicLabel: "Systolic Pressure",
        diastolicLabel: "Diastolic Pressure",
        glucoseLabel: "Blood Glucose (mg/dL)",
        weightLegend: "Weight (kg)",
        systolicLegend: "Systolic",
        diastolicLegend: "Diastolic",
        glucoseLegend: "Glucose (mg/dL)",
        loading: "Loading charts...",
        fetchError: "❌ Failed to load chart data.",
        sessionExpired: "Session expired. Please log in again.",
        dataNotFound: "No chart data found.",
        serverError: "Server error. Please try again later.",
        networkError: "Unable to connect to server. Check internet connection.",
        showingStoredData: "Showing stored data.",
        retry: "Retry",
        insufficientData: "Insufficient data to display",
        minReadingsRequired: "At least two readings are required to display charts.",
        addMoreReadings: "Add more health readings to see analytics.",
        invalidDataFormat: "Invalid data format",
        min: "Min",
        max: "Max",
        systolic: "Systolic",
        diastolic: "Diastolic",
        reading: "reading",
        day: "day"
      },

      // ==================== السجل التاريخي ====================
      history: {
        title: "Health Readings History",
        loading: "Loading historical records...",
        fetchError: "❌ Failed to load history. Please try again.",
        deleteError: "❌ Failed to delete record. Please try again.",
        retry: "Retry",
        noRecords: "No previous health records found",
        startAdding: "Start by adding your first health readings to appear here",
        record: "record",
        weight: "weight",
        pressure: "pressure",
        date: "Date",
        bloodPressure: "Blood Pressure",
        glucose: "Glucose",
        status: "Status",
        actions: "Actions",
        edit: "Edit",
        editTooltip: "Edit record",
        delete: "Delete",
        deleteTooltip: "Delete record",
        normal: "Normal",
        highBP: "High BP",
        highGlucose: "High Glucose",
        deleteConfirmTitle: "Confirm Deletion",
        deleteConfirmMessage: "Are you sure you want to delete this record?",
        irreversibleAction: "This action cannot be undone.",
        confirmDelete: "Yes, Delete",
        searchPlaceholder: "Search records...",
        lowBP: "Low BP",
        lowGlucose: "Low Glucose",
        highWeight: "High Weight",
        lowWeight: "Low Weight",
        record: "record"
      },

      // ==================== الملف الشخصي ====================
      profile: {
        title: "Account & Goals Management",
        description: "Enter your personal information and set your health goals",
        tabs: { profile: "Profile", goals: "Health Goals", settings: "Settings" },
        profile: {
          basicInfo: "Basic Information",
          healthInfo: "Health Information",
          username: "Username",
          email: "Email",
          birthDate: "Birth Date",
          gender: "Gender",
          selectGender: "Select Gender",
          male: "Male",
          female: "Female",
          phone: "Phone Number",
          initialWeight: "Initial Weight (kg)",
          height: "Height (cm)",
          occupation: "Occupation Status",
          selectOccupation: "Select Status",
          student: "Student",
          fullTime: "Full-Time",
          freelancer: "Freelancer",
          other: "Other",
          saveChanges: "💾 Save Changes",
          updated: "✅ Profile updated successfully"
        },
        goals: {
          addNew: "🎯 Add New Health Goal",
          title: "Goal Title",
          titlePlaceholder: "Example: Weight loss, Lower blood pressure...",
          targetValue: "Target Value",
          unit: "Unit",
          targetDate: "Target Date",
          addGoal: "➕ Add Goal",
          totalGoals: "Total Goals",
          completedGoals: "Completed Goals",
          delayedGoals: "Delayed Goals",
          myGoals: "My Health Goals",
          delete: "Delete Goal",
          start: "Start",
          target: "Target",
          currentValuePlaceholder: "Current Value",
          pressEnter: "Press Enter to update progress",
          achieved: "Goal Achieved",
          noGoals: "No goals yet",
          startAdding: "Start by adding your first health goal",
          added: "✅ Goal added successfully",
          progressUpdated: "✅ Progress updated",
          deleted: "✅ Goal deleted",
          deleteConfirm: "Are you sure you want to delete this goal?",
          requiredFields: "❌ Please fill all required fields"
        },
        units: { kg: "kg", cm: "cm", point: "point", minute: "minute", kilo: "kilo" },
        settings: {
          title: "Application Settings",
          darkMode: "Dark Mode",
          darkModeDesc: "Enable dark theme",
          notifications: "Notifications",
          notificationsDesc: "Receive reminder notifications",
          language: "Application Language",
          arabic: "Arabic",
          english: "English",
          updateInterval: "Update Interval (seconds)",
          seconds: "seconds",
          minute: "minute",
          minutes: "minutes",
          updateIntervalDesc: "Auto data refresh interval",
          save: "💾 Save Settings",
          applyOnSave: "Language will be applied immediately",
          saved: "✅ Settings saved successfully",
          error: "❌ Failed to save settings"
        },
        danger: {
          zone: "Danger Zone",
          warning: "Actions in this area are permanent and cannot be undone",
          exportData: "📤 Export All Data",
          deleteAccount: "🗑️ Delete Account",
          exportConfirm: "Do you want to export all your health data?",
          deleteAccountConfirm: "⚠️ Warning: Account deletion is permanent and cannot be undone!\n\nAre you sure you want to delete your account?",
          typeDelete: "Type \"delete\" to confirm:",
          cancelled: "❌ Deletion cancelled",
          accountDeleted: "✅ Account deleted successfully",
          exportSuccess: "✅ Data exported successfully"
        },
        error: {
          fetchUser: "❌ Failed to load profile data",
          fetchGoals: "⚠️ Cannot load goals at the moment",
          updateProfile: "❌ Failed to update data",
          addGoal: "❌ Failed to add goal",
          updateProgress: "❌ Failed to update progress",
          deleteGoal: "❌ Failed to delete goal",
          deleteAccount: "❌ Failed to delete account",
          exportData: "❌ Failed to export data"
        },
        backup: {
          title: "Backup",
          fullBackup: "Full Backup",
          fullBackupDesc: "Export all your data (profile, health, sleep, nutrition, habits)",
          download: "Download Backup",
          confirm: "Are you sure you want to create a backup?",
          success: "✅ Backup created successfully",
          error: "❌ Failed to create backup",
          latest: "Latest"
        },
        restore: {
          title: "Restore Backup",
          desc: "Restore your data from a previous backup file",
          select: "Select Backup File",
          confirm: "⚠️ Restoring a backup will replace your current data. Are you sure?",
          success: "✅ Backup restored successfully",
          error: "❌ Failed to restore backup"
        },
        export: {
          csv: "Export CSV",
          csvDesc: "Export data as CSV for analysis in Excel",
          select: "Select Data Type",
          health: "Health Data",
          meals: "Meals",
          sleep: "Sleep",
          activities: "Activities",
          mood: "Mood",
          habits: "Habit Definitions",
          habitLogs: "Habit Logs",
          goals: "Health Goals",
          notifications: "Notifications",
          noData: "No data to export",
          success: "✅ Data exported successfully",
          error: "❌ Failed to export data"
        },
        reset: {
          button: "Reset All Data (Delete Everything)",
          confirm: "⚠️ This will permanently delete all your data. Type \"DELETE\" to confirm:",
          cancelled: "Operation cancelled",
          progress: "Deleting...",
          success: "✅ All data deleted successfully",
          error: "❌ Failed to delete data"
        }
      },

      // ==================== لوحة التحكم ====================
      dashboard: {
        dailySummary: "📊 Daily Summary",
        dashboard: "Dashboard",
        healthTitle: "📊 Daily Summary {{date}}",
        nutritionTitle: "🥗 Nutrition Management",
        sleepTitle: "🌙 Sleep Tracker",
        habitsTitle: "💊 Habits & Medications",
        moodTitle: "😊 Mood Tracker",
        chatTitle: "💬 Smart Chat",
        profileTitle: "👤 Account & Goals Management",
        unavailable: "Unavailable",
        lastWeight: "Last Weight",
        bloodPressure: "Blood Pressure",
        bloodGlucose: "Blood Glucose",
        glucoseLevel: "Glucose Level",
        kg: "kg",
        sysDia: "Systolic / Diastolic",
        loadingSummary: "Loading your health summary...",
        pleaseWait: "Please wait a moment",
        fetchError: "❌ Failed to load summary.",
        retry: "Retry",
        lastUpdated: "Last Updated",
        chatComingSoon: "Smart Chat Coming Soon",
        chatDescription: "We're developing an intelligent assistant to help you in your health journey",
        switchToLight: "Switch to Light Mode",
        switchToDark: "Switch to Dark Mode",
            "noDataTitle": "No health data",
    "noDataMessage": "Add your first health readings",
    "addFirstReading": "Add Reading",
    "switchToLight": "Switch to Light Mode",
    "switchToDark": "Switch to Dark Mode",
    "localData": "Local Data",
    "autoRefreshActive": "Auto Refresh Active"
      },

      // ==================== تطبيق ====================
      app: {
        title: "Livocare - Your Health Care",
        logout: "Logout",
        footer: "Livocare - Personal Health Care Application",
        switchToLight: "Switch to Light Mode",
        switchToDark: "Switch to Dark Mode"
      },

      // ==================== تسجيل الدخول ====================
      login: {
        title: "Login",
        description: "Enter your credentials to access your health dashboard",
        appSubtitle: "Your Health Care",
        username: "Username",
        usernamePlaceholder: "Enter your username",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        loginButton: "Login",
        loggingIn: "Logging in...",
        resetButton: "Reset",
        dismiss: "Dismiss",
        success: "✅ Login successful!",
        failed: "❌ Login failed",
        emptyFields: "❌ Please fill all fields",
        invalidCredentials: "❌ Invalid username or password",
        unauthorized: "❌ Unauthorized access",
        serverNotFound: "❌ Could not connect to server",
        serverError: "❌ Server error",
        networkError: "❌ Check your internet connection",
        tip: "Tip: Use the login credentials provided to you",
        demoInfo: "Demo info: You can use test/test",
        featuresTitle: "Livocare Features",
        feature1: "Track biometrics (weight, blood pressure, glucose)",
        feature2: "Manage nutrition and daily meals",
        feature3: "Monitor sleep quality and duration",
        feature4: "Track mood and influencing factors",
        feature5: "Follow health habits and medications",
        version: "Version",
        online: "Online",
        switchToLight: "Switch to Light Mode",
        switchToDark: "Switch to Dark Mode",
        noAccount: "Don't have an account?",
        register: "Create new account",
        rememberMe: "Remember me",
        forgotPassword: "Forgot password?",
        users: "users",
        rating: "rating"
      },

      // ==================== الشريط الجانبي ====================
      sidebar: {
        appName: "LivoCare",
        tagline: "Your Health Care",
        dashboard: "Dashboard",
        activeSections: "Active Sections",
        healthCoverage: "Health Coverage",
        analytics: "Advanced Analytics",
        analyticsDesc: "Health statistics and reports",
        notifications: "Notifications",
        notificationsDesc: "Latest updates and alerts",
        extras: "Extras",
        userName: "Livocare User",
        userRole: "Premium User",
        reports: "Reports",
        reportsDesc: "Health reports and analytics",
        sections: {
          health: { name: "Vital Health", description: "Track biometric measurements" },
          nutrition: { name: "Nutrition", description: "Manage meals and calories" },
          sleep: { name: "Sleep", description: "Sleep quality and hours" },
          mood: { name: "Mood", description: "Track emotions and feelings" },
          habits: { name: "Habits & Medications", description: "Supplements and daily routine" },
          chat: { name: "Smart Chat", description: "Intelligent health assistant" },
          smart: { name: "Smart Features", description: "Advanced recommendations & analytics" },
          profile: { name: "User Management", description: "Settings and goals" }
        }
      },

      // ==================== الرؤى الصحية المتقدمة ====================
      health_insights: {
        title: "🧠 Advanced Health Insights",
        subtitle: "Smart analysis connecting all aspects of your health",
        lastUpdate: "Last updated",
        loading: "Analyzing your data...",
        error: "Failed to load insights",
        retry: "Retry",
        vital_signs: {
          title: "Vital Signs",
          current: "Your Current Readings",
          weight: "Weight",
          blood_pressure: "Blood Pressure",
          glucose: "Glucose",
          pulse_pressure: "Pulse Pressure",
          recorded_at: "Recorded at",
          insights: "Insights",
          alerts: "Alerts",
          weight_low: { message: "⚠️ Your weight is very low", details: "{weight} kg below normal range", recommendation: "You need to increase calories and protein", normal_range: "Normal range", possible_causes: "Possible causes" },
          weight_high: { message: "⚠️ Your weight is high", details: "{weight} kg above normal range", recommendation: "Try walking 30 minutes daily and reduce sugars" },
          weight_normal: { message: "✅ Your weight is ideal", recommendation: "Maintain your current routine" },
          weight_activity_alert: { message: "⚡ Low weight with high activity!", details: "With {count} exercises this week, you may lose muscle mass", recommendation: "Increase protein intake immediately after exercise" },
          pulse_pressure_high: { message: "❤️‍🩹 Pulse pressure is very high", details: "Difference {value} mmHg (normal 40-60)", recommendation: "May indicate arterial stiffness, consult a doctor" },
          pulse_pressure_low: { message: "💓 Pulse pressure is low", details: "Difference {value} mmHg", recommendation: "May indicate heart weakness, monitor symptoms" },
          bp_paradox: { message: "🫀 Abnormal blood pressure pattern", details: "Low pressure {systolic}/{diastolic}", recommendation: "This rare pattern needs immediate medical consultation" },
          glucose_high: { message: "🩸 Blood sugar is high", details: "{value} mg/dL above normal", recommendation: "Reduce simple carbs and walk 15 minutes" },
          glucose_low: { message: "🆘 Blood sugar is low!", details: "{value} mg/dL below normal", recommendation: "Eat a quick sugar source (juice, dates)" },
          meal_glucose_alert: { message: "🍚 Last meal was high in carbs", details: "Meal: {meal}", recommendation: "Choose more protein in your next meal" }
        },
        activity_nutrition: {
          title: "Activity & Nutrition",
          total_activities: "Total Activities",
          analysis: "Analysis",
          warning: { message: "⚠️ Large calorie deficit with low protein", details: "You burned {burned} calories but ate only {protein}g protein", recommendation: "You may lose muscle mass, increase protein after exercise" },
          insight: { message: "💪 Excellent day for muscle building", details: "Surplus {calories} calories with {protein}g protein", recommendation: "Continue this pattern" },
          summary: { more_warnings: "⚠️ You need to balance your food and activity", more_insights: "🌟 Your diet is balanced with your activity", balanced: "📊 Sufficient data for analysis, keep recording" }
        },
        sleep_mood: {
          title: "Sleep & Mood",
          correlations: "Correlations",
          patterns: { low_sleep_bad_mood: "Low sleep → Bad mood", good_sleep_good_mood: "Good sleep → Good mood" },
          mood_average: "Average sleep by mood",
          recommendation: { good: "💤 Sleeping {hours} hours is linked to your good mood", try: "🌙 Try sleeping {hours} hours for better mood", keep_recording: "Keep recording your sleep and mood" }
        },
        weight_trends: {
          title: "Weight Trends",
          from: "From",
          to: "To",
          change: "Change",
          daily_rate: "Daily rate",
          days_analyzed: "Days analyzed",
          trend: "Trend",
          factors: "Factors",
          prediction: "Prediction",
          increasing: "Increasing",
          decreasing: "Decreasing",
          stable: "Stable",
          factor_low_activity: { name: "Low activity", impact: "May be causing weight gain" },
          factor_regular_activity: { name: "Regular activity", impact: "Helps lose {weight} kg" },
          factor_high_calories: { name: "High calories", impact: "Average {calories} calories/day" },
          factor_low_calories: { name: "Low calorie diet", impact: "May be unsustainable long-term" },
          prediction_need_more_data: "Need more data for prediction",
          prediction_stable: "Your weight is stable, maintain your routine",
          prediction_increase: "If this continues, you may gain {weight} kg in a month",
          prediction_decrease: "If this continues, you may lose {weight} kg in a month"
        },
        blood_pressure: {
          title: "Blood Pressure Analysis",
          average: "Average",
          category: "Category",
          patterns: "Patterns",
          recommendation: "Recommendation",
          categories: { ideal: "Ideal", normal: "Normal", stage1: "High - Stage 1", stage2: "High - Stage 2", unknown: "Unknown" },
          pattern_low_sleep: { pattern: "Low sleep → High pressure", description: "On {date}: You slept only {sleep} hours and your pressure increased by {increase} points" },
          recommendations: {
            insufficient_data: "Insufficient data",
            sleep_pattern: "Clear pattern: Lack of sleep raises your pressure. Try sleeping 7-8 hours",
            ideal: "Your pressure is excellent, maintain your healthy routine",
            normal: "Your pressure is normal, maintain your activity",
            stage1: "Your pressure is starting to rise, try breathing exercises and walking",
            stage2: "Your pressure is high, consult a doctor"
          }
        },
        glucose_risks: {
          title: "Glucose Risk Assessment",
          average: "Average",
          range: "Range",
          trend: "Trend",
          risk_score: "Risk Score",
          risk_level: "Risk Level",
          alerts: "Alerts",
          trends: { up: "Upward", down: "Downward", stable: "Stable" },
          risk_levels: { low: "Low", medium: "Medium", high: "High" },
          alerts: {
            high_readings: { message: "⚠️ There are high glucose readings", details: "Highest reading: {value} mg/dL", recommendation: "Review your diet" },
            low_readings: { message: "🚨 Severe drop in glucose", details: "Lowest reading: {value} mg/dL", recommendation: "Always carry a sugar source" },
            upward_trend: { message: "📈 Upward trend in glucose", details: "Increase of {value} mg/dL over a week", recommendation: "You may need HbA1c test" }
          }
        },
        holistic_recommendations: {
          title: "💡 Holistic Recommendations",
          items: {
            weight_activity: { title: "Weight & Activity Balance", message: "Low weight with physical activity", details: "You may lose muscle mass instead of fat", advice: "Eat a protein-rich meal immediately after exercise" },
            low_pressure_glucose: { title: "Fatigue Signs", message: "Low pressure and glucose together", details: "May be due to stress or insufficient meals", advice: "Eat a balanced meal and rest" },
            low_sleep: { title: "Sleep Impact on Your Day", message: "You slept only {hours} hours", details: "Lack of sleep affects focus and mood", advice: "Take a 20-minute nap in the afternoon" },
            low_protein: { title: "Protein & Energy", message: "Only {protein}g protein today", details: "You may feel quick fatigue during exercise", advice: "Increase protein in your next meal (eggs, chicken, lentils)" },
            metabolic_signs: { title: "Metabolic Signs", message: "High diastolic pressure and glucose", details: "May indicate insulin resistance", advice: "Reduce sugars and increase physical activity" }
          }
        },
        predictive_alerts: {
          title: "🔮 Predictive Alerts",
          probability: "probability",
          items: {
            glucose_trend: { title: "📊 Gradual Rise in Glucose", prediction: "If trend continues, you may reach pre-diabetes in 3 months", probability: "{value}% probability", action: "Reduce simple carbs and walk 30 minutes daily" },
            weight_increase: { title: "⚖️ Rapid Weight Gain", prediction: "You may gain {weight} kg in a month if this continues", probability: "{value}% probability", action: "Log your food and review calories" },
            weight_decrease: { title: "⚖️ Rapid Weight Loss", prediction: "You may lose {weight} kg in a month", probability: "{value}% probability", action: "Ensure adequate protein intake" },
            sleep_pattern: { title: "😴 Irregular Sleep Pattern", prediction: "You may have insomnia or sleep disorder", probability: "{value}% probability", action: "Try to sleep at a fixed time daily" }
          }
        },
        activity_nutrition: { calories_burned_per_day: "calories burned/day", calories_consumed_per_day: "calories consumed/day", daily_deficit: "daily deficit", pre_exercise_recommendations: "Pre-exercise recommendations" },
        vital_signs: { normal_range: "Normal range", possible_causes: "Possible causes" },
        predictive_alerts: { title: "🔮 Predictive alerts", probability: "probability" }
      },

      // ==================== التحليلات ====================
      analytics: {
        common: {
          loading: "Loading...",
          error: "Failed to load analytics",
          retry: "Retry",
          noData: "Insufficient data for analysis",
          refresh: "Refresh",
          lastUpdate: "Last updated",
          now: "now",
          loginRequired: "Please login first",
          notFound: "URL not found - check server",
          recommendations: "💡 Personalized Recommendations",
          recommendation: "Recommendation",
          suggestions: "Suggestions",
          trend: { label: "Trend", improving: "Improving", declining: "Needs improvement", stable: "Stable", insufficient: "Insufficient data" },
          health_insights: "🧠 Advanced Health Insights",
          view_details: "View Details",
          based_on_data: "Based on analysis of {days} days",
          priority: { high: "High", medium: "Medium", low: "Low" },
                "noData": "Insufficient data for analysis",
      "lastUpdate": "Last updated"
        },
        activity: {
          title: "🧠 Smart Activity Recommendations",
          loading: "🧠 Analyzing your activity factors...",
          currentActivity: "📊 Your Current Activity",
          totalMinutes: "Total Minutes",
          totalCalories: "Calories Burned",
          activitiesCount: "Activities",
          weekProgress: "{{progress}}% of your weekly goal",
          factors: {
            title: "🔍 Factors Affecting Your Activity",
            sleep: "Your lack of sleep affects your performance",
            mood: "Your mood affects your motivation",
            nutrition: "Your energy is low due to diet",
            multiple: "Multiple factors affect your activity quality",
                  "startTracking": "Log some activities to start analysis",
      "weekProgress": "{{progress}}% of your weekly goal"
          },
          insights: {
            sleepImpact: "Your low sleep affects your activity",
            sleepImpactDetails: "You only sleep {{hours}} hours, which reduces your energy for activity",
            moodImpact: "Improving your mood may increase your activity",
            moodImpactDetails: "Your low mood might be why you're inactive",
            nutritionImpact: "Low food intake affects your energy",
            nutritionImpactDetails: "You only consume {{calories}} calories, you need more food for energy",
            weightImpact: "Activity is important for your weight",
            weightImpactDetails: "Increasing your activity helps lower your weight",
            weightLowImpact: "Activity strengthens your muscles",
            weightLowImpactDetails: "Exercise helps build healthy muscle mass",
            bpImpact: "Activity lowers your blood pressure",
            bpImpactDetails: "Walking 30 minutes daily helps lower blood pressure",
            glucoseImpact: "Activity regulates your blood sugar",
            glucoseImpactDetails: "Regular exercise improves insulin sensitivity"
          },
          recommendations: {
            title: "💡 Personalized Activity Recommendations",
            increaseActivity: { title: "Increase Your Weekly Activity", advice: "You need {{minutes}} extra minutes this week" },
            maintainActivity: { title: "Excellent! Maintain Your Activity", advice: "You're achieving the recommended rate (150 minutes/week)", basedOn: "Keep up this great level", tip1: "🏃 Vary your exercises", tip2: "🧘 Try new exercises", tip3: "👤 Exercise with friends" },
            improveQuality: { title: "Improve Your Activity Quality", advice: "You can benefit more from your exercises" },
            sleepTime: { title: "Sleep Time", advice: "Better to postpone activity until morning", basedOn: "Evening exercises may affect your sleep", tip1: "😴 Sleep early", tip2: "☀️ Exercise in the morning", tip3: "🚶‍♂️ Only light walking" }
          },
          reasons: {
            general: "To improve your fitness and general health",
            sleep: "Because your lack of sleep needs extra energy",
            nutrition: "Because your food isn't enough for your energy",
            weight: "To achieve a healthy weight",
            bp: "To improve blood pressure",
            glucose: "To regulate blood sugar"
          },
          tips: {
            walkDaily: "🚶‍♂️ Walk {{minutes}} minutes daily for 5 days",
            nap: "😴 Take a 20-minute nap before exercise",
            music: "🎵 Listen to music you like while exercising",
            banana: "🍌 Eat a banana 30 minutes before exercise",
            gentleStart: "❤️ Start with light walking and gradually increase duration"
          },
          qualityTips: {
            sleep: "😴 Sleep 7-8 hours to improve your performance",
            nutrition: "🥗 Eat a light meal before exercise",
            mood: "🧘 Try breathing exercises before starting",
            focus: "💪 Focus on quality over quantity"
          }
        },
        habit: {
          title: "💊 Smart Habit Analytics",
          loading: "🧠 Analyzing your habits...",
          noData: "Insufficient data for analysis",
          noRecommendations: "💡 No recommendations available",
          footer: { lastUpdate: "Last updated" },
          tabs: { insights: "🧠 Smart Insights", patterns: "📊 Detailed Patterns", recommendations: "💡 Comprehensive Recommendations" },
          summary: {
            title: "📊 Your Habits Summary",
            avgSleep: "Average Sleep",
            dominantMood: "Dominant Mood",
            avgHabits: "Daily Habits",
            avgCalories: "Daily Calories",
            hours: "hours",
            notAvailable: "Not available"
          },
          correlations: { title: "🔗 Discovered Relationships", strength: "Strength", basedOn: "Based on {days} days" },
          recommendations: {
            title: "🎯 Personalized Recommendations",
            target: "Target",
            basedOn: "Based on {based_on}",
            improvementChance: "Improvement chance {chance}%",
            water: { title: "Drink More Water", description: "Goal: Hydrate your body and boost energy", target: "8 glasses" },
            sleep: { title: "Get Enough Sleep", description: "Goal: Improve mood and focus", target: "7-8 hours" },
            exercise: { title: "Physical Activity", description: "Goal: Increase fitness and energy", target: "30 minutes" },
            nutrition: { title: "Balanced Nutrition", description: "Goal: Improve overall health", target: "5 servings" },
            habits: { title: "Stick to Daily Habits", description: "Goal: Build consistency and discipline", target: "Daily" },
            default: { title: "Healthy Habit", description: "Goal: Improve quality of life" }
          },
          patterns: { title: "📈 Detailed Patterns", consistency: "Consistency", impact: "Impact", insights: "Insights", suggestions: "Suggestions" },
          integrated: { title: "💡 Integrated Recommendations", footer: "Apply these recommendations for {days} days to see results" },
          predictions: { title: "🔮 Next Week Predictions" }
        },
        mood: {
          title: "🧠 Smart Mood Analysis",
          loading: "🧠 Analyzing your mood...",
          error: "Error fetching data",
          retry: "Retry",
          noData: "📝 Record your mood first",
          invalidData: "Invalid mood data",
          summary: {
            avgMood: "Average Mood",
            days: "Days",
            mostFrequent: "Most Frequent",
            notFound: "Not found",
            undefined: "Undefined",
            trend: { label: "Trend", improving: "Improving", declining: "Declining", stable: "Stable" }
          },
          prediction: { tomorrow: "🔮 Tomorrow: {value}/5 {trend}" },
          factors: { title: "🎯 Influencing Factors" },
          patterns: {
            title: "📊 Your Mood Patterns",
            days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            bestWorst: "Best day: {best} | Worst day: {worst}",
            bestTime: "Best time: {time}",
            morning: "Morning",
            afternoon: "Afternoon",
            evening: "Evening",
            night: "Night",
            dayPattern: "Weekday Pattern",
            timePattern: "Best Time for Mood",
            activityImpact: "Exercise improves your mood on the same day",
            sleepImpact: "Good sleep = Better mood next day",
            error: "Error detecting patterns:"
          },
          alerts: {
            title: "🧠 Smart Alerts",
            decline: { title: "Mood Decline", message: "We noticed your mood has been low for {days} days", tip1: "🚶 Walk 20 minutes", tip2: "💬 Talk to a friend", tip3: "😴 Sleep early", tip4: "📝 Write down your feelings" },
            suggestions: "We suggest"
          },
          insights: {
            activityImpact: "Impact of Activity on Your Mood",
            activityMessage: "Physical activity improves your mood by {diff} points",
            activityRecommendation: "Maintain your daily activity"
          },
          recommendations: {
            dayPatternAdvice: "Your best day: {bestDay} | Your worst day: {worstDay}",
            dayPatternTip1: "Plan important activities on your best days",
            dayPatternTip2: "Be kind to yourself on lower days",
            timePatternAdvice: "Your best time for mood is {bestTime}",
            timePatternTip1: "Plan important activities during this time",
            timePatternTip2: "Use this time for creativity and important work",
            start: { title: "Start recording your mood", advice: "Record your mood daily for accurate analysis", tips: ['Record morning and evening', 'Add notes about your day'] },
            psychological: { title: "Psychological Support", advice: "Your mood is low, don't hesitate to seek support", tips: ['📞 Talk to a friend', '🧘 Practice deep breathing', '🚶 Go for a walk'] },
            patternAdvice: "Organize your day according to this pattern",
            patternTips: ['Plan important activities on your best days'],
            default: { title: "Your mood is good", advice: "Maintain your healthy routine", tips: ['Keep recording your mood', 'Share your positivity with others'] }
          },
          tips: {
            default: ['Start with a small step today'],
            sleep: { title: "Sleep", detail: "Good sleep improves your mood by {points} points", advice: "Sleep 7-8 hours daily", tips: ['⏰ Sleep at a fixed time', '📱 Avoid screens before bed', '🌡️ Keep your room dark'] },
            nutrition: { title: "Nutrition", detail: "High protein improves your mood", advice: "Add protein sources to your meals", tips: ['🥚 Eat protein with every meal', '🥑 Add healthy fats', '🌰 Eat nuts'] },
            activity: { title: "Activity", detail: "Exercise improves your mood by +{points} points", advice: "Walk 30 minutes daily", tips: ['🚶 Walk 30 minutes', '🧘 Try stretching exercises', '🎵 Listen to music while walking'] },
            habits: { title: "Habits", detail: "Positive habits improve your mood", advice: "Maintain your daily routine", tips: ['📋 Set 3 daily habits', '⭐ Reward yourself', '📱 Use reminders'] },
            weight: { title: "Weight", detail: "Excess weight affects your energy", advice: "Consult a nutritionist", tips: ['🥗 Reduce sugar', '💧 Drink enough water', '🚶 Increase daily activity'] },
            pressure: { title: "Blood Pressure", detail: "Your blood pressure is slightly high", advice: "Monitor your pressure regularly", tips: ['🧘 Practice meditation', '🧂 Reduce salt', '🚭 Avoid stimulants'] }
          },
          footer: { lastUpdate: "🕒 {time}" }
        },
        nutrition: {
          title: "🍽️ Smart Nutrition Analytics",
          loading: "🍽️ Analyzing your nutrition...",
          analyzing: "🍽️ Smart nutrition analysis...",
          summary: { totalMeals: "Total Meals", totalCalories: "Total Calories", avgCalories: "Average Calories", avgProtein: "Average Protein" },
          healthScore: { title: "📊 Health Score", heartRate: "Heart Rate", normal: "Normal", sleep: "Sleep", nutrition: "Nutrition", mood: "Mood", stable: "Stable", activity: "Activity", active: "Active" },
          charts: {
            caloriesTitle: "📊 Weekly Calories",
            caloriesLabel: "Calories",
            proteinTitle: "📈 Protein Trend",
            proteinLabel: "Protein (g)",
            carbsTitle: "🌾 Carbs Trend",
            carbsLabel: "Carbs (g)",
            fatTitle: "🫒 Fat Trend",
            fatLabel: "Fat (g)",
            distributionTitle: "📊 Meal Distribution",
            average: "Average"
          },
          lifePatterns: {
            title: "📊 Your Life Patterns Analysis",
            irregular: { title: "Irregular Eating Pattern", description: "You eat less than 3 meals per day", advice: "Try to divide your food into 3-5 small meals" },
            tooMany: { title: "Eating Too Much", description: "More than 5 meals per day", advice: "Try to reduce meal frequency and increase portion size" },
            regular: { title: "Regular Eating Pattern", description: "You eat 3-5 meals per day", advice: "Continue this excellent pattern" },
            lateEater: { title: "Eating More at Night", description: "{{count}} meals after 10 PM", advice: "Try to eat during the day to improve sleep and digestion" },
            lowProtein: { title: "Low Protein All Week", description: "Average protein {{protein}}g only", advice: "Add protein sources to every meal" }
          },
          predictions: {
            title: "🔮 Health Predictions",
            probability: "probability",
            weightGain: { title: "Possible Weight Gain", prediction: "You may gain {{weight}} kg in 30 days" },
            weightLoss: { title: "Possible Weight Loss", prediction: "You may lose {{weight}} kg in 30 days" },
            fatigue: { title: "Eating Pattern May Cause Fatigue", prediction: "Low protein and calories cause constant fatigue" }
          },
          moodFood: { title: "🧠 Mood vs Food Analysis", insight: "📊 When you eat more sugar, your mood drops", details: "{{count}} out of {{total}} days your mood was bad after sugar", advice: "Reduce sugar to improve your mood" },
          alerts: {
            title: "🔔 Health Alerts",
            noMealsToday: { message: "No meals recorded today", action: "Log your meals now" },
            poorSleep: { message: "You didn't sleep well last night", action: "Try to sleep 7-8 hours" },
            lowProtein: { message: "Protein level is low", action: "Eat protein-rich foods" },
            lateMeals: { message: "Eating late at night", action: "Avoid eating after 10 PM" }
          },
          score: { title: "📊 Your Nutrition Score", excellent: "Excellent", good: "Good", fair: "Fair", needsImprovement: "Needs Improvement" },
          issues: {
            title: "⚠️ Needs Improvement",
            lowCalories: { message: "⚠️ Your calorie intake is too low", details: "Average calories: {{calories}} (minimum 1500)" },
            highCalories: { message: "⚠️ Your calorie intake is high", details: "Average calories: {{calories}}" },
            lowProtein: { message: "⚠️ Low protein intake", details: "Average protein: {{protein}}g (need 50g+)" },
            lateMeals: { message: "⚠️ Eating late at night", details: "{{count}} meals after 10 PM affect sleep" },
            noBreakfast: { message: "⚠️ You skip breakfast", details: "Breakfast is important for energy and metabolism" }
          },
          recommendations: {
            title: "💡 Smart Nutrition Recommendations",
            why: "Why?",
            tips: "Tips:",
            defaultReason: "To achieve healthy weight and better energy levels",
            increaseCalories: { title: "Need More Calories", advice: "Add {{calories}} calories daily", tips: ["🥑 Add energy-rich snacks", "🥜 Eat nuts and dried fruits", "🥛 Add yogurt or milk to meals", "🍌 Eat banana with peanut butter"] },
            decreaseCalories: { title: "Reduce Calories Slightly", advice: "Reduce {{calories}} calories daily", tips: ["🥗 Increase vegetables in meals", "🥤 Replace sugary drinks with water", "🍽️ Use smaller plates", "🏃 Increase physical activity"] },
            increaseProtein: {
              title: "Need More Protein",
              advice: "Add {{protein}}g protein daily",
              reasons: ["Protein is essential for muscle building", "Helps you feel full longer", "Improves metabolism"],
              tips: ["🥚 1 egg = 6g protein", "🍗 Chicken breast (100g) = 31g protein", "🥛 1 cup milk = 8g protein", "🫘 1 cup lentils = 18g protein"]
            },
            avoidLateMeals: {
              title: "Avoid Late Eating",
              advice: "Stop eating after 10 PM",
              reasons: ["Late eating harms sleep quality", "Increases fat storage", "Affects hunger hormones"],
              tips: ["⏰ Set a cutoff time for eating", "🌿 Drink herbal tea instead of food", "🍎 If hungry, eat an apple or vegetables"]
            },
            eatBreakfast: {
              title: "Don't Skip Breakfast",
              advice: "Eat a balanced breakfast",
              reasons: ["Breakfast improves metabolism", "Increases focus and morning energy", "Helps with weight control"],
              tips: ["🥣 Oatmeal with fruits = ideal breakfast", "🍳 Eggs with whole wheat bread = protein + energy", "🥑 Avocado toast = healthy fats"]
            },
            sleepBetter: { title: "Sleep Better to Eat Better", advice: "Improve your sleep to enhance appetite", tips: ["⏰ Sleep 7-8 hours daily", "🚫 Avoid caffeine after 4 PM", "📱 Stay away from screens before bed"] },
            good: { title: "Your Diet is Excellent", advice: "Your calorie intake is balanced", reasons: ["Calorie level is ideal", "Continue this pattern"], tips: ["🥗 Maintain food variety", "💧 Drink water regularly", "🚶 Continue physical activity", "😴 Sleep 7-8 hours"] }
          },
          correlations: {
            sleepCalories: { insight: "😴 Lack of sleep may reduce your appetite", recommendation: "Improve your sleep to enhance appetite" },
            activityCalories: { insight: "🏃 Your high activity needs more calories", recommendation: "Increase calories to compensate for activity" },
            moodCalories: { insight: "😊 Low food intake affects your mood", recommendation: "Eat regular meals to improve your mood" },
            weightCalories: { insight: "⚖️ High calories increase your weight", recommendation: "Reduce calories for weight loss" }
          },
          distribution: { title: "📊 Your Meal Distribution", meal: "meal" }
        },
        sleep: {
          title: "🌙 Smart Sleep Analytics",
          loading: "🌙 Analyzing your sleep...",
          analyzing: "🌙 Smart sleep analysis...",
          summary: { avgHours: "Average Sleep", avgQuality: "Quality", bedtime: "Bedtime", waketime: "Wake Time", hoursUnit: "h" },
          score: { title: "📊 Your Sleep Score", excellent: "Excellent", good: "Good", fair: "Fair", needsImprovement: "Needs Improvement" },
          issues: {
            title: "⚠️ Needs Improvement",
            lowSleep: { message: "You don't sleep enough", details: "You sleep {hours} hours only (need 7-8)" },
            highSleep: { message: "You sleep too much", details: "{hours} hours above average" },
            poorQuality: { message: "Your sleep quality is low", details: "{quality}/5 stars" },
            lateBedtime: { message: "You stay up late", detailsWithTime: "You sleep at {time}:00", detailsNoTime: "Irregular bedtime" },
            noData: { message: "Not enough sleep records", details: "Record your sleep for a few days to get accurate analysis" }
          },
          correlations: {
            title: "🔗 We Discovered",
            sleepMood: { strong: "Good sleep significantly improves your mood", normal: "Your sleep affects your mood", recommendation: "Improve your sleep to enhance your mood" },
            sleepActivity: { insight: "Good sleep increases your activity next day", recommendation: "Sleep well to be more active" }
          },
          patterns: { title: "🔄 Your Sleep Patterns", weekendRecovery: { insight: "You sleep more on weekends", details: "This means you're exhausted during the week" } },
          recommendations: {
            title: "💡 Smart Sleep Recommendations",
            why: "Why?",
            how: "How?",
            defaultReason: "To achieve ideal sleep and better health",
            sleepMore: { title: "Sleep More", advice: "You need {hours} more hours of sleep", tips: ["⏱️ Sleep before 11 PM", "📱 Avoid screens 1 hour before bed", "🌡️ Keep your room dark and cool", "🧘 Meditate for 10 minutes"] },
            improveQuality: { title: "Improve Sleep Quality", advice: "Your sleep isn't deep enough", tips: ["🚫 Avoid caffeine after 4 PM", "🛏️ Use comfortable bedding", "🌙 Turn off all lights", "🎵 Listen to relaxing sounds"] },
            earlyBedtime: {
              title: "Go to Bed Earlier",
              adviceWithTime: "Sleep before {ideal}:00 instead of {current}:00",
              adviceNoTime: "Try to sleep before 10 PM",
              reasons: ["Early sleep improves sleep quality", "Helps you wake up refreshed", "Regulates body hormones"],
              tips: ["⏰ Reduce bedtime gradually by 15 minutes daily", "☀️ Get morning sunlight", "🚫 Avoid long naps"]
            },
            moreActivity: { title: "Move More to Sleep Better", advice: "Physical activity improves sleep", reasons: ["Exercise increases sleep hormones", "Reduces stress and anxiety", "Improves deep sleep quality"], tips: ["🚶‍♂️ Walk 30 minutes daily", "🧘 Try yoga before bed", "🌅 Exercise in the morning for best results"] },
            sleepForMood: { title: "Sleep Better for Better Mood", advice: "Good sleep improves mood", reasons: ["Good sleep improves mental health", "Reduces stress and anxiety", "Increases positive energy"], tips: ["📝 Write down your thoughts before bed", "🎵 Listen to calm music", "💬 Talk to someone close"] },
            startRecording: { title: "Start Recording Your Sleep", advice: "Record your sleep for a few days to get accurate analysis", reason: "Smart analysis needs data", tips: ["😴 Record your sleep and wake times", "⭐ Rate your sleep quality", "📝 Add notes about your dreams"] }
          },
          debug: {
            title: "🔍 ========== Sleep Data Structure Diagnosis ==========",
            type: "📊 Sleep type:",
            isArray: "📊 Is sleep array:",
            length: "📊 Sleep length:",
            availableFields: "🔍 Available values:",
            sleepStart: "   - sleep_start:",
            sleepEnd: "   - sleep_end:",
            startTime: "   - start_time:",
            endTime: "   - end_time:",
            start: "   - start:",
            end: "   - end:",
            duration: "   - duration:",
            durationHours: "   - duration_hours:",
            receivedData: "🔍 ========== Sleep Analysis ==========",
            sleepCount: "😴 Number of sleep records:",
            hasData: "✅ hasSleepData:",
            firstThree: "📊 First 3 sleep records:",
            processing: "🔍 Processing record {id}:",
            calculatedHours: "✅ Calculated duration for record {id}: {hours} hours",
            processedRecords: "💾 Processed sleep records:",
            totalHours: "✅ totalSleepHours:",
            avgHours: "✅ avgSleepHours:"
          }
        }
      },

      // ==================== الإشعارات ====================
      notifications: {
        title: "🔔 Notifications",
        loading: "Loading notifications...",
        all: "All",
        unread: "Unread",
        read: "Read",
        markAllRead: "Mark all as read",
        markRead: "Mark as read",
        noNotifications: "No notifications",
        noNotificationsDesc: "Important notifications and reminders will appear here",
        justNow: "Just now",
        minutesAgo: "{{count}} minutes ago",
        hoursAgo: "{{count}} hours ago",
        daysAgo: "{{count}} days ago",
        view: "View details",
        suggestions: "Suggestions",
        total: "Total notifications",
        deleteConfirm: "Are you sure you want to delete this notification?",
        deleteAllReadConfirm: "Are you sure you want to delete all read notifications?",
        deleteAllRead: "Delete read",
        stats: "Statistics",
        priority: { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" },
        types: { health: "Health", nutrition: "Nutrition", sleep: "Sleep", mood: "Mood", habit: "Habit", alert: "Alert", reminder: "Reminder", achievement: "Achievement", tip: "Tip" }
      },
  "smartDashboard": {
    "title": "Smart Analytics & Recommendations",
    "loading": "Analyzing your data...",
    "error": "Error fetching smart insights",
    "retry": "Retry",
    "foodSelected": "Selected",
    "calories": "Calories",
    "caloriesUnit": "cal",
    "factors": {
      "sleep": "Sleep",
      "hours": "hours",
      "mood": "Mood",
      "activity": "Physical Activity",
      "minutesPerWeek": "min/week",
      "nutrition": "Nutrition",
      "caloriesPerDay": "cal/day",
      "habits": "Habits"
    },
    "healthScore": {
      "title": "Your Health Score",
      "footer": "Maintain healthy habits to improve your score"
    },
    "foodSearch": {
      "title": "Food Search"
    },
    "correlations": {
      "title": "Important Relationships in Your Data",
      "strength": "Strength",
      "sleepMood": "Sleep & Mood",
      "sleepLow": "When you sleep less than 6 hours",
      "goodSleep": "Good sleep (7-8h)",
      "poorSleep": "Poor sleep (4-5h)",
      "basedOn": "Based on last",
      "days": "days",
      "activityPressure": "Physical Activity & Blood Pressure",
      "walkingDays": "On days you walk",
      "withWalking": "With walking",
      "withoutWalking": "Without walking",
      "caffeineSleep": "Caffeine & Sleep",
      "caffeineAfter": "Having caffeine after 4 PM",
      "discoveredIn": "Discovered in",
      "outOf": "out of"
    },
    "recommendations": {
      "title": "Integrated Plan to Improve Your Health",
      "urgent": "Urgent",
      "sleepMore": "Sleep More to Improve Your Mood",
      "sleepMoreDesc": "Tonight, try to sleep before 11 PM. Tomorrow you'll feel a 60% improvement in your mood",
      "basedOn": "Based on",
      "sleepCorrelation": "Your sleep 4.5h ↔️ Your mood 3/5",
      "important": "Important",
      "regularActivity": "Regular Physical Activity",
      "regularActivityDesc": "Walking 20 minutes daily improves your blood pressure and reduces weight",
      "expected": "Expected",
      "kgInTwoWeeks": "-2 kg in two weeks",
      "suggestion": "Suggestion",
      "balancedNutrition": "Balanced Nutrition",
      "balancedNutritionDesc": "On days you eat protein, your sleep is 25% deeper",
      "addEgg": "Add an egg to your breakfast",
      "greekYogurt": "Eat Greek yogurt before bed"
    },
    "predictions": {
      "title": "Next Week Predictions",
      "weight": "Weight",
      "kg": "kg",
      "systolic": "Systolic",
      "stable": "Stable",
      "sleep": "Sleep",
      "hours": "hours",
      "hour": "hour",
      "mood": "Mood",
      "good": "Good",
      "improvement": "Improvement",
      "note": "* These predictions are based on following the suggested recommendations"
    
  }
},
  "foodSearch": {
    "placeholder": "Search for food...",
    "searchFailed": "Search failed",
    "searchError": "An error occurred while searching. Please try again",
    "noResults": "No results found. Try different keywords",
    "calories": "cal",
    "protein": "protein",
    "carbs": "carbs",
    "fat": "fat",
    "fiber": "fiber",
    "servingSize": "Serving size"
  },
  "smartRecommendations": {
    "title": "🧠 Smart Recommendations",
    "loading": "🧠 Analyzing your data for smart recommendations...",
    "error": "Error fetching data",
    "retry": "Retry",
    "refresh": "Refresh",
    "tip": "Tip",
    "suggestions": "Suggestions",
    "lastUpdate": "Last updated",
    "priority": {
      "urgent": "Urgent",
      "high": "High",
      "medium": "Medium",
      "low": "Low"
    },
    "categories": {
      "health": "Health",
      "nutrition": "Nutrition",
      "sleep": "Sleep",
      "mood": "Mood",
      "habits": "Habits",
      "activity": "Activity",
      "routine": "Routine"
    },
    "noRecommendations": {
      "title": "✨ Everything looks great!",
      "subtitle": "No specific recommendations at the moment"
    },
    "health": {
      "weightHigh": {
        "title": "Your weight needs attention",
        "message": "Your BMI is {{bmi}} (overweight)",
        "advice": "Focus on healthy eating and increase activity",
        "actions": [
          "🥗 Reduce sugars and starches",
          "🚶 Walk 30 minutes daily",
          "💧 Drink 8 glasses of water",
          "🥩 Increase protein in your meals"
        ],
        "basedOn": "Weight and height analysis"
      },
      "weightLow": {
        "title": "Your weight is below normal",
        "message": "Your BMI is {{bmi}} (underweight)",
        "advice": "You need calorie-rich nutrition",
        "actions": [
          "🥑 Add healthy fats to meals",
          "🥜 Eat nuts and dried fruits",
          "🍚 Increase rice and pasta portions",
          "🥛 Drink whole milk"
        ],
        "basedOn": "Weight and height analysis"
      },
      "bpHigh": {
        "title": "Your blood pressure is slightly high",
        "advice": "Monitor your pressure regularly",
        "actions": [
          "🧂 Reduce salt in food",
          "🚭 Avoid stimulants",
          "🧘 Meditate daily",
          "🥗 Eat bananas and avocados"
        ],
        "basedOn": "Latest blood pressure reading"
      },
      "glucoseHigh": {
        "title": "Your blood sugar is high",
        "advice": "Monitor your sugar level",
        "actions": [
          "🍬 Reduce simple sugars",
          "🥗 Increase fiber in meals",
          "🚶 Walk after meals",
          "⏰ Don't skip meals"
        ],
        "basedOn": "Latest glucose reading"
      },
      "glucoseLow": {
        "title": "Your blood sugar is low",
        "advice": "Have a light snack",
        "actions": [
          "🍌 Eat a banana or dates",
          "🥤 Drink fruit juice",
          "🍪 Have a small sweet treat",
          "⏰ Don't delay meals"
        ],
        "basedOn": "Latest glucose reading"
      }
    },
    "nutrition": {
      "breakfast": {
        "title": "🌅 Breakfast Time",
        "message": "Morning meal starts your energy",
        "advice": "Don't skip breakfast",
        "actions": [
          "🥚 Eggs with whole wheat bread = protein + energy",
          "🥣 Oatmeal with fruits = fiber + vitamins",
          "🥑 Avocado toast = healthy fats",
          "☕ Coffee or green tea = natural stimulant"
        ],
        "basedOn": "{hour}:00 - Ideal breakfast time"
      },
      "lunch": {
        "title": "☀️ Lunch Time",
        "message": "Midday meal fuels your energy",
        "advice": "Make it balanced",
        "actions": [
          "🍗 Chicken breast or fish = protein",
          "🥗 Green salad = fiber and vitamins",
          "🍚 Rice or bulgur = carbohydrates",
          "🥣 Soup = hydration + warmth"
        ],
        "basedOn": "Ideal lunch time"
      },
      "dinner": {
        "title": "🌙 Dinner Time",
        "message": "Light meal before sleep",
        "advice": "Don't eat heavy",
        "actions": [
          "🥗 Yogurt with cucumber = easy to digest",
          "🍎 Apple or fruit = natural sugars",
          "🥛 Warm milk = helps sleep",
          "🌿 Herbal tea = natural relaxant"
        ],
        "basedOn": "Ideal dinner time"
      },
      "season": {
        "winter": {
          "title": "🍵 Winter Foods",
          "message": "It's cold, your body needs warmth",
          "advice": "Add warm foods",
          "actions": [
            "🥣 Lentil or vegetable soup daily",
            "🍯 Ginger with honey = immunity",
            "🍠 Baked sweet potato = energy",
            "☕ Hot drinks = warming"
          ],
          "basedOn": "Winter season"
        },
        "summer": {
          "title": "🥤 Summer Hydration",
          "message": "It's hot, you lose fluids",
          "advice": "Focus on hydrating foods",
          "actions": [
            "💧 Drink 10 glasses of water daily",
            "🍉 Watermelon and cucumber = natural hydration",
            "🥗 Fresh salads = vitamins",
            "🧃 Natural juices without sugar"
          ],
          "basedOn": "Summer season"
        }
      }
    },
    "sleep": {
      "bedtime": {
        "title": "Prepare for sleep",
        "message": "Time for sleep",
        "messageWithData": "Last sleep: {{hours}} hours",
        "advice": "Get ready for restful sleep",
        "actions": [
          "📱 Avoid screens 1 hour before bed",
          "🌡️ Keep room dark and cool",
          "🧘 Deep breathing for 5 minutes",
          "📝 Write down tomorrow's thoughts"
        ],
        "basedOn": "Ideal sleep time"
      },
      "sleepMore": {
        "title": "You sleep too little",
        "message": "Your average sleep is {{hours}} hours",
        "advice": "Your body needs more rest",
        "actions": [
          "⏰ Sleep before 11 PM",
          "🚫 Avoid caffeine after 4 PM",
          "🌙 Dim lights in the evening",
          "🎵 Listen to relaxing sounds"
        ],
        "basedOn": "Sleep hours analysis"
      },
      "quality": {
        "title": "Your sleep quality is low",
        "message": "{{quality}}/5 stars",
        "advice": "Your sleep isn't deep enough",
        "actions": [
          "🛏️ Use comfortable bedding",
          "🌡️ Room temperature 68-72°F",
          "🚫 Don't eat 2 hours before bed",
          "🧘 Try meditation before sleep"
        ],
        "basedOn": "Sleep quality rating"
      }
    },
    "mood": {
      "low": {
        "title": "Your mood is low",
        "message": "Your average mood is {{avg}}/5",
        "advice": "Take care of yourself",
        "actions": [
          "🚶 Walk in nature",
          "🎵 Listen to music you love",
          "📞 Call a close friend",
          "🧘 Meditate for 10 minutes"
        ],
        "basedOn": "Recent mood analysis"
      },
      "weather": {
        "rainy": {
          "title": "Rainy day",
          "message": "Rain might affect your mood",
          "advice": "Stay positive",
          "actions": [
            "☕ Have your favorite drink",
            "📖 Read an enjoyable book",
            "🎬 Watch a comedy movie",
            "🧘 Meditate and listen to rain"
          ],
          "basedOn": "Weather: Rainy"
        },
        "sunny": {
          "title": "Sunny day",
          "message": "Use sunlight to boost your mood",
          "advice": "Sun exposure releases serotonin",
          "actions": [
            "🚶 Walk 20 minutes in the sun",
            "🌿 Sit outdoors",
            "🏃‍♂️ Exercise outside",
            "🌱 Take care of plants"
          ],
          "basedOn": "Weather: Sunny"
        }
      }
    },
    "habits": {
      "pending": {
        "title": "Today's habits",
        "message": "You have {{count}} habits remaining",
        "advice": "Complete your daily habits",
        "basedOn": "Your daily habits"
      },
      "medicine": {
        "title": "Time for {{name}}",
        "message": "Don't forget your dose",
        "advice": "Take your medication now",
        "actions": [
          "💧 Drink water with medication",
          "⏰ Mark that you took it",
          "📱 Set reminder for next dose"
        ],
        "basedOn": "Scheduled medication time"
      },
      "defaultName": "habit"
    },
    "activity": {
      "more": {
        "title": "Need more activity",
        "message": "This week: {{minutes}} minutes only",
        "advice": "You need {{remaining}} more minutes",
        "actions": [
          "🚶 Walk 20 minutes daily",
          "🧘 Try home exercises",
          "🚴 Use bike for transportation",
          "👥 Exercise with a friend"
        ],
        "basedOn": "Your weekly activity rate"
      },
      "weather": {
        "hot": {
          "title": "Very hot weather",
          "advice": "Avoid exercising in heat",
          "actions": [
            "🏊 Swimming = best activity in heat",
            "🌅 Exercise early morning or evening",
            "💧 Drink more water during exercise",
            "🏠 Try indoor exercises"
          ],
          "basedOn": "Current temperature"
        },
        "cold": {
          "title": "Cold weather",
          "advice": "Exercise carefully",
          "actions": [
            "🧥 Wear warm clothes",
            "🏃 Warm up well before exercise",
            "🏠 Suitable indoor exercises",
            "☕ Drink warm after exercise"
          ],
          "basedOn": "Current temperature"
        }
      }
    },
    "routine": {
      "morning": {
        "title": "Active morning",
        "message": "How you start your day determines your energy",
        "advice": "Start your day actively",
        "actions": [
          "☀️ Get sunlight for 10 minutes",
          "💧 Drink warm water with lemon",
          "🧘 Light stretching exercises",
          "📝 Plan your day"
        ],
        "basedOn": "Ideal morning routine"
      },
      "night": {
        "title": "Prepare for sleep",
        "message": "Get ready for restful sleep",
        "advice": "Relaxing evening routine",
        "actions": [
          "📵 Stay away from screens",
          "📖 Read a physical book",
          "🌿 Drink herbal tea",
          "🧘 Meditate for 5 minutes"
        ],
        "basedOn": "Evening routine"
      }
    }
  },
  "weather": {
    "title": "🌤️ Weather in",
    "loading": "Loading weather...",
    "error": "Failed to load weather data",
    "fetchError": "Failed to load weather data. Check your connection",
    "retry": "Retry",
    "refresh": "Refresh",
    "changeCity": "Change city",
    "cityPlaceholder": "Enter city name...",
    "save": "Save",
    "cancel": "Cancel",
    "humidity": "Humidity",
    "windSpeed": "Wind",
    "pressure": "Pressure",
    "uvIndex": "UV Index",
    "recommendation": "Recommendation",
    "activitySuggestion": "Activity Suggestion",
    "clothingSuggestion": "Clothing Suggestion",
    "lastUpdate": "Last updated",
    "recommendations": {
      "extremeHeat": "🌡️ Extreme heat! Avoid going out at midday. Drink plenty of water and wear light clothing.",
      "hot": "☀️ Hot weather. Drink plenty of water and avoid prolonged sun exposure.",
      "freezing": "❄️ Freezing cold! Wear heavy clothing and avoid going out for long periods.",
      "cold": "🧥 Cold weather. Wear warm clothes and drink hot beverages.",
      "rainy": "☔ Rainy day. Don't forget your umbrella and wear appropriate clothing.",
      "windy": "🌬️ Strong winds. Be careful in open areas.",
      "highHumidity": "💧 High humidity. Drink plenty of water and rest in air-conditioned spaces.",
      "sunny": "☀️ Sunny weather. Enjoy the beautiful weather but don't forget sunscreen.",
      "perfect": "🌿 Perfect weather! Enjoy going out and outdoor activities."
    },
    "activities": {
      "rainy": "☔ Rainy weather - perfect for reading at home or going to a café.",
      "hot": "🌡️ Hot weather - best activity: swimming or staying in air-conditioned places.",
      "cold": "❄️ Cold weather - suitable for brisk walking or indoor exercises.",
      "sunny": "☀️ Sunny weather - great for walking in nature or exercising outdoors.",
      "perfect": "🌿 Perfect weather for walking, hiking, and outdoor activities."
    },
    "clothing": {
      "rainy": "☔ Waterproof clothing and a light jacket.",
      "hot": "👕 Light cotton clothing and light colors.",
      "warm": "👚 Summer light clothing and a hat for sun protection.",
      "freezing": "🧥 Heavy winter clothing, coat, and gloves.",
      "cool": "🧣 Autumn clothing with a light jacket."
    }
  }
  ,
  "reports": {
    "title": "Comprehensive Health Reports",
    "loading": "Loading reports...",
    "error": "Error fetching reports",
    "retry": "Retry",
    "period": "Period",
    "days": "days",
    "to": "to",
    "types": {
      "weekly": "Weekly Report",
      "monthly": "Monthly Report",
      "yearly": "Yearly Report",
      "custom": "Custom Report"
    },
    "tabs": {
      "summary": "Summary",
      "health": "Health",
      "nutrition": "Nutrition",
      "sleep": "Sleep",
      "mood": "Mood",
      "activity": "Activity",
      "habits": "Habits"
    },
    "export": {
      "pdfComingSoon": "PDF export feature coming soon",
      "csvComingSoon": "CSV export feature coming soon"
    },
    "summary": {
      "title": "Period Summary",
      "strengthsTitle": "Strengths",
      "weaknessesTitle": "Needs Improvement",
      "recommendationsTitle": "Personalized Recommendations",
      "quickStats": "Quick Statistics",
      "strengths": {
        "weightNormal": "⚖️ Your weight is within normal range",
        "bpIdeal": "❤️ Your blood pressure is ideal",
        "sleepIdeal": "🌙 Your sleep is ideal",
        "moodPositive": "😊 Your mood is positive",
        "nutritionBalanced": "🥗 Your nutrition is balanced",
        "activityExcellent": "🏃 Your activity is excellent",
        "habitsHigh": "✅ Your habit adherence is high"
      },
      "weaknesses": {
        "weightHigh": "⚖️ Your weight is above normal range",
        "weightLow": "⚖️ Your weight is below normal range",
        "bpHigh": "❤️ Your blood pressure is high",
        "sleepLow": "🌙 You suffer from sleep deprivation",
        "sleepHigh": "🌙 You sleep too much",
        "moodLow": "😊 Your mood is low",
        "caloriesLow": "🥗 Your calorie intake is low",
        "caloriesHigh": "🥗 Your calorie intake is high",
        "activityLow": "🏃 Your activity is low",
        "habitsLow": "✅ Need to improve habit adherence"
      },
      "recommendations": {
        "sleepMore": "🌙 Sleep before 11 PM to improve sleep quality",
        "moodImprove": "😊 Practice deep breathing exercises daily",
        "activityMore": "🏃 Increase daily activity to 30 minutes of walking",
        "proteinMore": "🥚 Add protein sources to every meal",
        "bpMonitor": "❤️ Reduce salt and monitor your blood pressure daily",
        "habitsStart": "✅ Start with a small, easy habit daily"
      },
      "stats": {
        "habitsCompleted": "✅ Habits Completed",
        "avgSleep": "🌙 Average Sleep",
        "totalCalories": "🥗 Total Calories",
        "activityMinutes": "🏃 Activity Minutes",
        "hours": "h"
      }
    },
    "health": {
      "title": "Health Report",
      "noData": "No health data available for this period",
      "currentWeight": "Current Weight",
      "avgWeight": "Average Weight",
      "minWeight": "Minimum Weight",
      "maxWeight": "Maximum Weight",
      "systolic": "Systolic Pressure",
      "diastolic": "Diastolic Pressure",
      "avgGlucose": "Average Glucose",
      "records": "Number of Readings"
    },
    "nutrition": {
      "title": "Nutrition Report",
      "noData": "No nutrition data available for this period",
      "totalMeals": "Total Meals",
      "totalCalories": "Total Calories",
      "totalProtein": "Total Protein",
      "totalCarbs": "Total Carbohydrates",
      "avgPerMeal": "Average Per Meal",
      "calories": "Calories",
      "protein": "Protein",
      "carbs": "Carbohydrates",
      "fat": "Fat",
      "mealDistribution": "Meal Distribution",
      "breakfast": "Breakfast",
      "lunch": "Lunch",
      "dinner": "Dinner",
      "snacks": "Snacks",
      "topFoods": "Most Consumed Foods",
      "times": "times"
    },
    "sleep": {
      "title": "Sleep Report",
      "noData": "No sleep data available for this period",
      "avgSleep": "Average Sleep",
      "totalSleep": "Total Sleep",
      "minSleep": "Minimum Sleep",
      "maxSleep": "Maximum Sleep",
      "sleepQuality": "Sleep Quality",
      "excellentNights": "Excellent Nights",
      "goodNights": "Good Nights",
      "poorNights": "Poor Nights",
      "hours": "hours"
    },
    "mood": {
      "title": "Mood Report",
      "noData": "No mood data available for this period",
      "avgMood": "Average Mood",
      "dominant": "Most Frequent",
      "records": "Number of Records",
      "trend": "Trend",
      "improving": "Improving",
      "declining": "Declining",
      "distribution": "Mood Distribution"
    },
    "activity": {
      "title": "Physical Activity Report",
      "noData": "No activity data available for this period",
      "totalMinutes": "Total Minutes",
      "totalCalories": "Total Calories Burned",
      "avgMinutes": "Average Minutes/Day",
      "totalActivities": "Number of Activities"
    },
    "habits": {
      "title": "Habits Report",
      "noData": "No habit data available for this period",
      "totalHabits": "Total Habits",
      "completed": "Completed Habits",
      "completionRate": "Completion Rate"
    }
  },// ==================== Registration ====================
register: {
  title: "Create New Account",
  subtitle: "Join LivoCare and start your health journey",
  description: "Enter your details to create a new account and enjoy all app features",
  firstName: "First Name",
  firstNamePlaceholder: "Enter your first name",
  lastName: "Last Name",
  lastNamePlaceholder: "Enter your last name",
  username: "Username",
  usernamePlaceholder: "e.g., testuser123",
  email: "Email",
  emailPlaceholder: "example@email.com",
  password: "Password",
  passwordPlaceholder: "••••••••••",
  passwordStrong: "Must contain at least 8 characters, uppercase, number, symbol",
  confirmPassword: "Confirm Password",
  confirmPasswordPlaceholder: "Re-enter your password",
  registerButton: "Create Account",
  termsPrefix: "By clicking 'Create Account', you agree to our ",
  termsOfService: "Terms of Service",
  and: " and ",
  privacyPolicy: "Privacy Policy",
  haveAccount: "Already have an account?",
  login: "Login",
  
  // Registration benefits
  benefitsTitle: "🌟 Why Join LivoCare?",
  benefit1: "📊 Complete vital signs tracking",
  benefit2: "🥗 Personalized smart nutrition plans",
  benefit3: "🌙 Sleep depth and quality analysis",
  benefit4: "😊 Mood tracking and influencing factors",
  benefit5: "💊 Daily habits and medications tracking",
  
  // User testimonial
  testimonial: '"Since using LivoCare, my health has improved significantly and I\'ve become more aware of my daily habits"',
  testimonialAuthor: "Ahmed El-Sayed - Premium User",
  
  // Error messages
  errors: {
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    usernameRequired: "Username is required",
    usernameMinLength: "Username must be at least 3 characters",
    usernameMaxLength: "Username must not exceed 20 characters",
    usernameInvalid: "Username can only contain letters and numbers",
    usernameTaken: "Username is already taken",
    emailRequired: "Email is required",
    emailInvalid: "Invalid email address",
    emailTaken: "Email is already registered",
    passwordRequired: "Password is required",
    passwordMinLength: "Password must be at least 8 characters",
    passwordUppercase: "Password must contain at least one uppercase letter",
    passwordLowercase: "Password must contain at least one lowercase letter",
    passwordNumber: "Password must contain at least one number",
    passwordSymbol: "Password must contain at least one symbol",
    passwordsDoNotMatch: "Passwords do not match",
    termsRequired: "You must agree to the terms and privacy policy",
    registerFailed: "Registration failed. Please try again",
    networkError: "Network error. Check your internet and try again",
    serverError: "Server error. Please try later"
  },
  
  // Success messages
  success: {
    accountCreated: "✅ Your account has been created successfully!",
    redirecting: "Redirecting you to the dashboard...",
    verificationEmailSent: "Verification link has been sent to your email"
  },
  
  // Password requirements
  passwordRequirements: {
    title: "Password requirements:",
    minLength: "✔ At least 8 characters",
    uppercase: "✔ Uppercase letter (A-Z)",
    lowercase: "✔ Lowercase letter (a-z)",
    number: "✔ Number (0-9)",
    symbol: "✔ Symbol (!@#$%^&*)"
  },
  
  // Password strength indicator
  passwordStrength: {
    weak: "Weak",
    fair: "Fair",
    good: "Good",
    strong: "Very Strong",
    title: "Password strength:"
  },
  
  // Social login
  socialLogin: {
    title: "Or sign up with",
    google: "Google",
    facebook: "Facebook",
    apple: "Apple"
  }
}

    }
  }
};

// =============================================================================
// 🚀 تهيئة i18n
// =============================================================================

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    lng: localStorage.getItem('language') || 'ar',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// تحديث لغة التطبيق
export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('language', lng);
  localStorage.setItem('livocare_language', lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  
  window.dispatchEvent(new CustomEvent('languageChanged', { 
    detail: { language: lng } 
  }));
  
  console.log('🌍 Language changed to:', lng);
};

export default i18n;