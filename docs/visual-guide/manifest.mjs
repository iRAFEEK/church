// ============================================================================
// Visual guide manifest — mirrors docs/USER_GUIDE.md section-for-section.
// Each section: { n, icon, t (Arabic title), persona, entry, video, steps[] }
// Each step: { icon, ar (one spoken-Arabic sentence), do[[action,sel,val]...], hi (highlight selector) }
//   - screenshot is taken BEFORE `do` runs, with `hi` highlighted (arrow points to it)
//   - `do` then performs the action; the section video is later split per-step.
// Selector helpers: "T:ns.key" = resolve Arabic text from messages/ar.json.
// personas: out | member | leader | admin
// ============================================================================
export const SECTIONS = [
// ───────────────────────────── PART I ─────────────────────────────
{ n:1, icon:'⛪', t:'ما هي إكليسيا؟', persona:'out', entry:'/welcome', video:true, steps:[
  { icon:'👋', ar:'دي الصفحة الرئيسية لتطبيق إكليسيا.', hi:null },
  { icon:'📜', ar:'انزل تحت تشوف كل حاجة التطبيق بيعملها.', do:[['scrollY','1200'],['wait','800']], hi:null },
]},
{ n:2, icon:'👥', t:'الأدوار الأربعة في التطبيق', persona:'admin', entry:'/dashboard', video:false, steps:[
  { icon:'🧑‍🤝‍🧑', ar:'كل شخص له دور: عضو، أو قائد مجموعة، أو قائد خدمة، أو مشرف.', hi:null },
]},
// ───────────────────────────── PART II ─────────────────────────────
{ n:3, icon:'🏛️', t:'تسجيل كنيستك (للرعاة)', persona:'out', entry:'/welcome/register', video:true, steps:[
  { icon:'🚀', ar:'اضغط زر "هيا نبدأ" علشان تبدأ تسجيل كنيستك.', do:[['wait','1500'],['click','T:registration.step0.cta'],['wait','1000']], hi:'T:registration.step0.cta' },
  { icon:'✉️', ar:'اكتب بريدك الإلكتروني هنا.', do:[['fill','input[type=email]','pastor.demo@vg.ekklesia.test']], hi:'input[type=email]' },
  { icon:'🔒', ar:'اكتب كلمة سر جديدة، وبعدين اكتبها تاني للتأكيد.', do:[['fillNth','input[type=password]','0','password123'],['fillNth','input[type=password]','1','password123']], hi:'input[type=password]' },
  { icon:'🙍', ar:'اكتب اسمك ورقم تليفونك علشان نتواصل معاك.', do:[['fillLast','input[type=text]','القس ديمو'],['fill','input[type=tel]','+201001234567']], hi:'input[type=tel]' },
]},
{ n:4, icon:'📝', t:'إنشاء حساب والانضمام لكنيستك', persona:'out', entry:'/signup', video:true, steps:[
  { icon:'🔎', ar:'اكتب اسم كنيستك في خانة البحث.', do:[['wait','1200'],['fill','input','St. Mark'],['wait','2500']], hi:'input' },
  { icon:'👆', ar:'اختار كنيستك من القائمة اللي هتظهر.', hi:null },
]},
{ n:5, icon:'🔑', t:'تسجيل الدخول', persona:'out', entry:'/login', video:true, steps:[
  { icon:'✉️', ar:'اكتب بريدك الإلكتروني هنا.', do:[['wait','1000'],['fill','input[type=email]','mina.salib.4913@sim.ekklesia.test']], hi:'input[type=email]' },
  { icon:'🔒', ar:'اكتب كلمة السر بتاعتك.', do:[['fill','input[type=password]','password123']], hi:'input[type=password]' },
  { icon:'👆', ar:'اضغط زر "دخول".', do:[['click','button[type=submit]'],['wait','6000']], hi:'button[type=submit]' },
  { icon:'🏠', ar:'أهلًا بيك! دي صفحتك الرئيسية.', hi:null },
]},
{ n:'5b', icon:'📱', t:'الدخول برقم التليفون (واتساب)', persona:'out', entry:'/login', video:true, steps:[
  { icon:'📲', ar:'اضغط على تبويب "الهاتف".', do:[['wait','1000'],['click','T:phoneAuth.phoneTab'],['wait','500']], hi:'T:phoneAuth.phoneTab' },
  { icon:'☎️', ar:'اكتب رقم تليفونك بكود الدولة، زي +20 لمصر.', do:[['fill','input[type=tel]','+201001112223']], hi:'input[type=tel]' },
  { icon:'💬', ar:'اضغط الزر ده، وهيوصلك كود من ٦ أرقام على واتساب.', hi:'T:phoneAuth.sendCodeButton' },
]},
{ n:6, icon:'🆘', t:'نسيت كلمة السر؟', persona:'out', entry:'/login', video:true, steps:[
  { icon:'👆', ar:'اضغط على "هل نسيت كلمة المرور؟".', do:[['wait','1000'],['click','T:auth.forgotPasswordLink'],['wait','1500']], hi:'T:auth.forgotPasswordLink' },
  { icon:'✉️', ar:'اكتب بريدك الإلكتروني.', do:[['fill','input[type=email]','mina.salib.4913@sim.ekklesia.test']], hi:'input[type=email]' },
  { icon:'📨', ar:'اضغط "إرسال رابط إعادة التعيين" وافتح بريدك بعدها.', do:[['click','button[type=submit]'],['wait','2500']], hi:'button[type=submit]' },
]},
{ n:7, icon:'🪪', t:'إكمال ملفك أول مرة', persona:'member', entry:'/profile/edit', video:false, steps:[
  { icon:'🖊️', ar:'أول مرة تدخل، هتكتب اسمك بالعربي ورقم تليفونك هنا.', hi:'input' },
  { icon:'🔔', ar:'اختار طريقة الإشعارات اللي تناسبك، وبعدين اضغط حفظ.', hi:null },
]},
{ n:8, icon:'🧭', t:'التنقل داخل التطبيق', persona:'member', entry:'/dashboard', video:true, steps:[
  { icon:'📋', ar:'القائمة الجانبية دي فيها كل صفحات التطبيق.', do:[['wait','1500']], hi:'nav' },
  { icon:'🔔', ar:'الجرس ده بيوريك الإشعارات الجديدة.', hi:'header button' },
  { icon:'🚪', ar:'ومن هنا تقدر تسجل الخروج.', hi:'T:sidebar.signOut' },
]},
{ n:9, icon:'🌐', t:'التبديل بين العربية والإنجليزية', persona:'member', entry:'/dashboard', video:true, steps:[
  { icon:'🔤', ar:'اضغط على زر اللغة اللي فوق علشان تبدّل بين العربي والإنجليزي.', do:[['wait','1200'],['click','txt:EN'],['wait','2500']], hi:'txt:EN' },
]},
{ n:10, icon:'🔕', t:'تفعيل الإشعارات', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'🔔', ar:'لما يظهرلك الكرت ده، اضغط "تفعيل" علشان توصلك الإشعارات على تليفونك.', hi:null },
]},
{ n:11, icon:'🏘️', t:'أكثر من كنيسة بحساب واحد', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'🔁', ar:'لو عندك أكتر من كنيسة، اضغط على اسم الكنيسة فوق علشان تبدّل بينهم.', hi:'aside a[href="/dashboard"], nav' },
]},
// ───────────────────────────── PART III ─────────────────────────────
{ n:12, icon:'🏠', t:'صفحتك الرئيسية', persona:'member', entry:'/dashboard', video:true, steps:[
  { icon:'📊', ar:'هنا بتشوف حضورك ومجموعاتك وإشعاراتك.', do:[['wait','1500']], hi:null },
  { icon:'📅', ar:'وتحت هتلاقي الفعاليات الجاية وآخر الإعلانات.', do:[['scrollY','700'],['wait','800']], hi:null },
]},
{ n:13, icon:'🪪', t:'ملفك الشخصي', persona:'member', entry:'/profile', video:true, steps:[
  { icon:'👀', ar:'ده ملفك الشخصي وفيه كل بياناتك.', do:[['wait','1500']], hi:null },
  { icon:'✏️', ar:'اضغط زر التعديل علشان تغيّر بياناتك أو صورتك.', do:[['goto','/profile/edit'],['wait','1800']], hi:'a[href="/profile/edit"]' },
  { icon:'📷', ar:'من هنا تضيف أو تغيّر صورتك (أقصى حجم ٥ ميجا).', hi:'input[type=file], button' },
  { icon:'💾', ar:'لما تخلص اضغط "حفظ التغييرات".', hi:'button[type=submit]' },
]},
{ n:14, icon:'🔔', t:'الإشعارات', persona:'member', entry:'/notifications', video:true, steps:[
  { icon:'📬', ar:'هنا كل إشعاراتك، والجديد عليه علامة.', do:[['wait','1800']], hi:null },
  { icon:'👆', ar:'اضغط على أي إشعار علشان تشوف تفاصيله.', hi:'main button' },
  { icon:'✅', ar:'وزر "تحديد الكل كمقروء" بيمسح كل العلامات مرة واحدة.', hi:'T:notificationsPage.markAllRead' },
]},
{ n:15, icon:'📅', t:'الفعاليات والتسجيل فيها', persona:'member', entry:'/events', video:true, steps:[
  { icon:'📋', ar:'دي كل الفعاليات الجاية في كنيستك.', do:[['wait','1800']], hi:null },
  { icon:'👆', ar:'اضغط على أي فعالية تشوف تفاصيلها.', do:[['clickFirst','main a[href^="/events/"]'],['wait','2500']], hi:'main a[href^="/events/"]' },
  { icon:'✍️', ar:'لو فيه زر "تسجيل"، اضغطه علشان تحجز مكانك.', hi:null },
]},
{ n:16, icon:'🤝', t:'الخدمة والتطوع', persona:'member', entry:'/serving', video:true, steps:[
  { icon:'📋', ar:'دي أوقات الخدمة المتاحة للتطوع.', do:[['wait','1800']], hi:null },
  { icon:'👆', ar:'افتح أي وقت خدمة واضغط "سجّل" علشان تتطوع.', do:[['scrollY','400'],['wait','800']], hi:'main button, main a[href^="/serving/"]' },
  { icon:'✅', ar:'اشتراكاتك بتظهر تحت في "اشتراكاتي".', hi:null },
]},
{ n:17, icon:'📢', t:'الإعلانات', persona:'member', entry:'/announcements', video:true, steps:[
  { icon:'📰', ar:'هنا آخر أخبار وإعلانات الكنيسة، والمثبّت بيظهر الأول.', do:[['wait','1800']], hi:null },
]},
{ n:18, icon:'🙏', t:'طلبات الصلاة', persona:'member', entry:'/prayer', video:true, steps:[
  { icon:'✍️', ar:'اكتب طلب صلاتك هنا.', do:[['wait','1500'],['fill','textarea','صلّوا من أجل شفاء والدتي 🙏']], hi:'textarea' },
  { icon:'👁️', ar:'اختار مين يشوف طلبك: الكل، أو من غير اسمك، أو القادة بس.', hi:'T:churchPrayer.visibilityAnonymous' },
  { icon:'📤', ar:'اضغط "إرسال الطلب".', do:[['click','T:churchPrayer.submitButton'],['wait','2500']], hi:'T:churchPrayer.submitButton' },
  { icon:'❤️', ar:'واضغط "أصلي" على طلبات غيرك علشان تشجعهم.', do:[['scrollY','500']], hi:'T:churchPrayer.imPraying' },
]},
{ n:19, icon:'📖', t:'قراءة الكتاب المقدس', persona:'member', entry:'/bible', video:true, steps:[
  { icon:'📚', ar:'اضغط "اختر سفرًا" واختار السفر اللي عايز تقراه.', do:[['wait','1500'],['clickNth','main button','1'],['wait','800'],['click','txt:تكوين'],['wait','1000']], hi:'main button' },
  { icon:'🔢', ar:'وبعدين اختار الإصحاح.', do:[['clickNth','main button','2'],['wait','800'],['clickFirst','[role=option]'],['wait','2500']], hi:'main button' },
  { icon:'🖍️', ar:'اضغط على أي آية علشان تظللها أو تحفظها أو تنسخها.', do:[['clickFirst','[data-verse-id]'],['wait','1000']], hi:'[data-verse-id]' },
]},
{ n:20, icon:'⛪', t:'الأجبية والقراءات والألحان', persona:'member', entry:'/liturgy', video:true, steps:[
  { icon:'🕐', ar:'من هنا تفتح الأجبية وقراءات اليوم والقداسات والألحان.', do:[['wait','1800']], hi:null },
  { icon:'📿', ar:'مثلًا اضغط "الأجبية" واختار الساعة اللي عايز تصليها.', do:[['goto','/liturgy/agpeya'],['wait','2000']], hi:'a[href="/liturgy/agpeya"]' },
]},
{ n:21, icon:'🎵', t:'الترانيم', persona:'member', entry:'/admin/songs', video:true, steps:[
  { icon:'🔎', ar:'دوّر على أي ترنيمة بالاسم أو بكلماتها.', do:[['wait','1800']], hi:'input' },
]},
{ n:22, icon:'🚪', t:'حجز قاعة', persona:'member', entry:'/bookings', video:true, steps:[
  { icon:'🏢', ar:'اختار القاعة واليوم، وشوف المواعيد الفاضية.', do:[['wait','1800']], hi:null },
  { icon:'➕', ar:'اضغط زر الحجز واكتب عنوان ووقت حجزك.', hi:'main button' },
]},
{ n:23, icon:'🤲', t:'احتياجات الكنائس', persona:'member', entry:'/community/needs', video:true, steps:[
  { icon:'📋', ar:'هنا كنائس تانية بتطلب مساعدة، وتقدر تساعدهم.', do:[['wait','2000']], hi:null },
  { icon:'💌', ar:'افتح أي احتياج واضغط "قدّم مساعدة" واكتب رسالتك.', hi:null },
]},
{ n:24, icon:'👨‍👩‍👧', t:'المجموعات والانضمام ليها', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'🔎', ar:'من صفحة المجموعات تشوف مجموعاتك والمجموعات المفتوحة.', hi:'a[href="/admin/groups"], nav' },
  { icon:'✋', ar:'اضغط "اطلب الانضمام" والقائد هيوافق عليك.', hi:null },
]},
{ n:25, icon:'💌', t:'دعوات الكنائس', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'✅', ar:'لو كنيسة دعتك، هيظهر كرت على صفحتك: اقبل أو ارفض.', hi:null },
]},
// ───────────────────────────── PART IV ─────────────────────────────
{ n:26, icon:'👨‍👩‍👧‍👦', t:'صفحة مجموعتي (للقائد)', persona:'leader', entry:'leaderGroup', video:true, steps:[
  { icon:'📊', ar:'دي صفحة مجموعتك: الأعضاء والحضور والاجتماعات.', do:[['wait','2000']], hi:null },
  { icon:'⚠️', ar:'وهنا الأعضاء اللي غابوا كتير ومحتاجين افتقاد.', do:[['scrollY','600'],['wait','500']], hi:null },
]},
{ n:27, icon:'🗓️', t:'إنشاء اجتماع جديد', persona:'leader', entry:'leaderGroupNewGathering', video:true, steps:[
  { icon:'🕐', ar:'حدد يوم وساعة الاجتماع.', do:[['wait','1500'],['fill','input[type="datetime-local"]','2026-07-20T19:00']], hi:'input[type="datetime-local"]' },
  { icon:'📝', ar:'اكتب موضوع الاجتماع ومكانه.', do:[['fillFirst','input[type=text]','درس كتاب — القيامة']], hi:'input[type=text]' },
  { icon:'✅', ar:'اضغط "إنشاء الاجتماع".', do:[['click','button[type=submit]'],['wait','2500']], hi:'button[type=submit]' },
]},
{ n:28, icon:'✅', t:'تسجيل الحضور', persona:'leader', entry:'leaderGathering', video:true, steps:[
  { icon:'👆', ar:'اضغط على اسم أي عضو علشان تغيّر حالته: حاضر، متأخر، غايب.', do:[['wait','2000'],['clickFirst','main li button, main [class*=roster] button'],['wait','600']], hi:'main button' },
  { icon:'💾', ar:'اضغط "حفظ الحضور" في أي وقت.', do:[['click','T:attendance.saveButton'],['wait','1500']], hi:'T:attendance.saveButton' },
  { icon:'🏁', ar:'ولما الاجتماع يخلص، اضغط "إنهاء الاجتماع".', hi:'T:attendance.completeButton' },
]},
{ n:29, icon:'🙏', t:'صلوات المجموعة وتسجيل الاستجابات', persona:'leader', entry:'leaderGroup', video:false, steps:[
  { icon:'➕', ar:'من قسم الصلاة اضغط "أضف طلبًا" واكتب الطلب.', hi:'T:prayer.addButton' },
  { icon:'🎉', ar:'ولما ربنا يستجيب، اضغط "سجّل الاستجابة".', hi:null },
]},
{ n:30, icon:'✋', t:'الموافقة على طلبات الانضمام للمجموعة', persona:'leader', entry:'leaderGroup', video:false, steps:[
  { icon:'✅', ar:'طلبات الانضمام بتظهر في صفحة مجموعتك: اضغط "موافقة" أو "رفض".', hi:null },
]},
{ n:31, icon:'📞', t:'الزوار المسندين ليك', persona:'leader', entry:'/visitors', video:true, steps:[
  { icon:'📋', ar:'دول الزوار اللي الكنيسة كلفتك تتابعهم.', do:[['wait','1800']], hi:null },
  { icon:'📞', ar:'اتصل بيهم، وبعدين اضغط "سجّل تواصل" واكتب اللي حصل.', hi:'main button' },
]},
// ───────────────────────────── PART V ─────────────────────────────
{ n:32, icon:'📊', t:'لوحة تحكم المشرف', persona:'admin', entry:'/dashboard', video:true, steps:[
  { icon:'📈', ar:'دي صحة كنيستك كلها في صفحة واحدة: الأعضاء والزوار والحضور.', do:[['wait','2500']], hi:null },
  { icon:'⚠️', ar:'قسم "يحتاج انتباه" بيوريك اللي لازم تتابعه النهارده.', do:[['scrollY','800'],['wait','600']], hi:null },
]},
{ n:33, icon:'📇', t:'دليل الأعضاء', persona:'admin', entry:'/admin/members', video:true, steps:[
  { icon:'📋', ar:'ده دليل كل أعضاء الكنيسة.', do:[['wait','2000']], hi:null },
  { icon:'🔎', ar:'اكتب أي اسم في البحث والنتايج هتظهر فورًا.', do:[['fill','input','mina'],['wait','2500']], hi:'input' },
  { icon:'👆', ar:'اضغط على أي عضو تفتح ملفه.', do:[['clickFirst','main [class*=dropdown] button, main a[href^="/admin/members/"]'],['wait','2500']], hi:null },
]},
{ n:34, icon:'➕', t:'إضافة عضو جديد', persona:'admin', entry:'/admin/members', video:true, steps:[
  { icon:'👆', ar:'اضغط زر "إضافة عضو".', do:[['wait','1500'],['click','T:addMember.addButton'],['wait','1000']], hi:'T:addMember.addButton' },
  { icon:'🖊️', ar:'اكتب اسمه ورقم تليفونه.', do:[['fillNth','[role=dialog] input','0','ديمو'],['fillNth','[role=dialog] input','1','تجريبي'],['fill','[role=dialog] input[type=tel]','+9647701234999']], hi:'[role=dialog] input' },
  { icon:'✅', ar:'اضغط "إضافة عضو" — وهو هيقدر يدخل بالواتساب على طول.', do:[['click','[role=dialog] button[type=submit]'],['wait','2500']], hi:'[role=dialog] button[type=submit]' },
]},
{ n:35, icon:'🗂️', t:'إدارة ملف عضو', persona:'admin', entry:'memberDetail', video:true, steps:[
  { icon:'📑', ar:'ملف العضو فيه بياناته ومحطاته الروحية ومشاركاته.', do:[['wait','2000']], hi:null },
  { icon:'⚙️', ar:'من تبويب "إدارة" تقدر تغيّر دوره وصلاحياته.', do:[['click','T:memberDetail.tabAdmin'],['wait','1200']], hi:'T:memberDetail.tabAdmin' },
]},
{ n:36, icon:'🚶', t:'قائمة الزوار ومتابعتهم', persona:'admin', entry:'/admin/visitors', video:true, steps:[
  { icon:'📋', ar:'كل زائر جديد بيظهر هنا، والمتأخر عليه تنبيه أحمر.', do:[['wait','2000']], hi:null },
  { icon:'🤝', ar:'اضغط "إسناد" واختار قائد يتابع الزائر.', hi:'T:visitors.queueAssignButton' },
  { icon:'🎉', ar:'ولما يبقى جاهز، اضغط "تحويل لعضو".', hi:'T:visitors.queueConvertButton' },
]},
{ n:37, icon:'📱', t:'كود QR للزوار', persona:'admin', entry:'/admin/settings/qr', video:true, steps:[
  { icon:'🖨️', ar:'اطبع الكود ده وحطه على باب الكنيسة.', do:[['wait','2000']], hi:'canvas, img' },
  { icon:'⬇️', ar:'زر "تحميل PNG" بينزّل الصورة للطباعة.', hi:'T:qr.downloadButton' },
]},
{ n:38, icon:'👨‍👩‍👧‍👦', t:'إدارة المجموعات', persona:'admin', entry:'/admin/groups', video:true, steps:[
  { icon:'📋', ar:'دي كل مجموعات الكنيسة.', do:[['wait','2000']], hi:null },
  { icon:'➕', ar:'اضغط "مجموعة جديدة" علشان تنشئ واحدة.', do:[['click','a[href="/admin/groups/new"]'],['wait','2000']], hi:'a[href="/admin/groups/new"]' },
  { icon:'🖊️', ar:'اكتب اسم المجموعة واختار القائد ويوم الاجتماع.', hi:'input' },
]},
{ n:39, icon:'🛠️', t:'إدارة الخدمات (الوزارات)', persona:'admin', entry:'/admin/ministries', video:true, steps:[
  { icon:'📋', ar:'دي كل خدمات الكنيسة، واضغط على أي خدمة تشوف فريقها.', do:[['wait','2000']], hi:null },
  { icon:'➕', ar:'زر "إضافة خدمة" بينشئ خدمة جديدة باسم وقائد.', hi:'main button' },
]},
{ n:40, icon:'🎪', t:'إنشاء فعالية (٧ خطوات)', persona:'admin', entry:'/admin/events/new', video:true, steps:[
  { icon:'🖊️', ar:'الخطوة ١: اكتب اسم الفعالية واختار نوعها.', do:[['wait','1500'],['fill','input','أمسية شكر — تجريبي'],['click','T:common.next'],['wait','800']], hi:'input' },
  { icon:'🕐', ar:'الخطوة ٢: حدد التاريخ والساعة.', do:[['fill','input[type="datetime-local"]','2026-07-28T19:00'],['click','T:common.next'],['wait','800']], hi:'input[type="datetime-local"]' },
  { icon:'📍', ar:'الخطوة ٣: اكتب المكان.', do:[['fillFirst','input','قاعة الكنيسة'],['click','T:common.next'],['wait','800']], hi:'input' },
  { icon:'⚙️', ar:'الخطوة ٤: فعّل "التسجيل مطلوب" لو عايز الناس تحجز.', do:[['click','T:common.next'],['wait','800']], hi:'[role=switch]' },
  { icon:'👥', ar:'الخطوة ٥: اختار مين يشوف الفعالية.', do:[['click','T:common.next'],['wait','800']], hi:null },
  { icon:'🤝', ar:'الخطوة ٦: اطلب فرق خدمة لو محتاج متطوعين.', do:[['click','T:common.next'],['wait','800']], hi:null },
  { icon:'✅', ar:'الخطوة ٧: راجع كل حاجة واضغط "إنشاء الفعالية".', do:[['clickLast','main button'],['wait','4000']], hi:'main button' },
]},
{ n:41, icon:'📋', t:'قوالب الفعاليات', persona:'admin', entry:'/admin/templates', video:true, steps:[
  { icon:'♻️', ar:'اعمل قالب لقداس الأحد مرة واحدة، واستخدمه كل أسبوع.', do:[['wait','2000']], hi:null },
  { icon:'▶️', ar:'من صفحة الفعاليات اضغط "من قالب" وهيتعبى كل حاجة لوحده.', hi:null },
]},
{ n:42, icon:'🗓️', t:'تقويم الكنيسة', persona:'admin', entry:'/admin/calendar', video:true, steps:[
  { icon:'📅', ar:'كل الفعاليات والخدمة والاجتماعات في تقويم واحد ملوّن.', do:[['wait','2500']], hi:null },
  { icon:'🎚️', ar:'الأزرار دي بتظهر وتخفي كل نوع.', hi:'main button' },
]},
{ n:43, icon:'🧹', t:'إدارة أماكن وأوقات الخدمة', persona:'admin', entry:'/serving', video:true, steps:[
  { icon:'📋', ar:'من تبويب "أماكن الخدمة" اعمل فرق زي الاستقبال والصوت.', do:[['wait','2000']], hi:null },
  { icon:'🕐', ar:'ومن "أوقات الخدمة" حدد المواعيد اللي الناس تسجل فيها.', do:[['click','T:serving.tabSlots'],['wait','1500']], hi:'T:serving.tabSlots' },
]},
{ n:44, icon:'📢', t:'إدارة الإعلانات', persona:'admin', entry:'/announcements', video:true, steps:[
  { icon:'➕', ar:'اضغط "إعلان جديد".', do:[['wait','1800'],['click','a[href="/admin/announcements/new"]'],['wait','2000']], hi:'a[href="/admin/announcements/new"]' },
  { icon:'🖊️', ar:'اكتب العنوان والمحتوى.', do:[['fillFirst','input','إعلان تجريبي — أهلًا بكم'],['fillFirst','textarea','تفاصيل الإعلان هنا.']], hi:'input' },
  { icon:'📌', ar:'فعّل "تثبيت" للإعلانات المهمة، وبعدين انشر.', hi:'[role=switch]' },
]},
{ n:45, icon:'🙏', t:'إدارة طلبات الصلاة', persona:'admin', entry:'/admin/prayers', video:true, steps:[
  { icon:'📋', ar:'كل طلبات الصلاة هنا: نشطة، ومستجابة، ومؤرشفة.', do:[['wait','2000']], hi:null },
  { icon:'🤝', ar:'زر "إسناد" بيخلّي حد معيّن يصلي ويتابع الطلب.', hi:null },
]},
{ n:46, icon:'🎵', t:'إدارة الترانيم والعرض', persona:'admin', entry:'/admin/songs', video:true, steps:[
  { icon:'➕', ar:'زر "إضافة ترنيمة": الاسم، الكلمات، وسطر فاضي بين كل شريحة.', do:[['wait','1800']], hi:'a[href="/admin/songs/new"]' },
  { icon:'📽️', ar:'وزر "عرض" بيفتح شاشة العرض للبروجيكتور.', hi:null },
]},
{ n:47, icon:'🏡', t:'الافتقاد والزيارات', persona:'admin', entry:'/admin/outreach', video:true, steps:[
  { icon:'📋', ar:'هنا بتتابع مين اتزار في بيته ومين محتاج زيارة.', do:[['wait','2000']], hi:null },
  { icon:'📝', ar:'بعد كل زيارة اضغط "سجّل زيارة" واكتب اللي حصل.', hi:null },
]},
{ n:48, icon:'🏢', t:'إدارة القاعات', persona:'admin', entry:'/admin/locations', video:true, steps:[
  { icon:'➕', ar:'ضيف قاعات كنيستك علشان الناس تقدر تحجزها.', do:[['wait','2000']], hi:'main button' },
]},
{ n:49, icon:'📣', t:'إرسال إشعار لكل الكنيسة', persona:'admin', entry:'/notifications', video:true, steps:[
  { icon:'🎯', ar:'اختار مين يستلم: الكل، أو مجموعة، أو خدمة معينة.', do:[['wait','2000']], hi:null },
  { icon:'🖊️', ar:'اكتب العنوان والرسالة، وشوف عدد اللي هيوصلهم.', hi:null },
  { icon:'📤', ar:'اضغط "إرسال الإشعار" وأكّد.', hi:null },
]},
{ n:50, icon:'✋', t:'الموافقة على طلبات الانضمام للكنيسة', persona:'admin', entry:'/admin/join-requests', video:true, steps:[
  { icon:'✅', ar:'اللي طلب ينضم لكنيستك بيظهر هنا: اضغط "موافقة" أو "رفض".', do:[['wait','2000']], hi:null },
]},
// ───────────────────────────── PART VI ─────────────────────────────
{ n:51, icon:'⚙️', t:'صفحة الإعدادات', persona:'admin', entry:'/admin/settings', video:true, steps:[
  { icon:'🗂️', ar:'أربع إعدادات: كود QR، الإشعارات، الخصوصية، والصلاحيات.', do:[['wait','2000']], hi:null },
]},
{ n:52, icon:'🛡️', t:'الصلاحيات', persona:'admin', entry:'/admin/settings/roles', video:true, steps:[
  { icon:'🎚️', ar:'من هنا بتحدد كل دور يقدر يعمل إيه.', do:[['wait','2500']], hi:null },
  { icon:'👤', ar:'وتقدر تدي شخص واحد صلاحية زيادة من ملفه.', hi:null },
]},
{ n:53, icon:'🔒', t:'خصوصية أرقام التليفونات', persona:'admin', entry:'/admin/settings/privacy', video:true, steps:[
  { icon:'👁️', ar:'اختار مين يشوف أرقام تليفونات الأعضاء: الكل، القادة، أو المشرفين بس.', do:[['wait','2000']], hi:'main [class*=card], main label' },
]},
{ n:54, icon:'💬', t:'قنوات الإشعارات (واتساب)', persona:'admin', entry:'/admin/settings/notifications', video:true, steps:[
  { icon:'🎚️', ar:'المفتاح ده بيشغّل إشعارات الواتساب المدفوعة — والإشعارات المجانية شغالة دايمًا.', do:[['wait','2000']], hi:'[role=switch]' },
]},
// ───────────────────────────── PART VII+VIII ─────────────────────────────
{ n:55, icon:'🏛️', t:'موافقة الكنائس الجديدة (للمشغّل)', persona:'out', entry:'/welcome', video:false, steps:[
  { icon:'✅', ar:'مشغّل المنصة بيراجع كل كنيسة جديدة ويتصل بصاحبها قبل التفعيل.', hi:null },
]},
{ n:56, icon:'📖', t:'مرجع سريع: مين يقدر يعمل إيه', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'ℹ️', ar:'العضو بيشوف صفحاته، والقائد بيدير مجموعته، والمشرف بيدير كل حاجة.', hi:null },
]},
{ n:57, icon:'⌨️', t:'اختصارات ومميزات خفية', persona:'member', entry:'/bible', video:false, steps:[
  { icon:'💡', ar:'في شاشة العرض: الأسهم بتنقّل، وحرف F للشاشة الكاملة.', hi:null },
]},
{ n:58, icon:'📏', t:'حدود وإعدادات مهمة', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'ℹ️', ar:'الصور أقصاها ٥ ميجا، وكلمة السر ٦ حروف على الأقل، ورقم التليفون لازم يبدأ بكود الدولة.', hi:null },
]},
{ n:59, icon:'🩹', t:'حل المشاكل الشائعة', persona:'member', entry:'/dashboard', video:false, steps:[
  { icon:'❓', ar:'لو حاجة مش شغالة: حدّث الصفحة، وتأكد من دورك، أو اسأل مشرف كنيستك.', hi:null },
]},
]
