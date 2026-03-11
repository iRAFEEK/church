import type { UserRole } from '@/types'

export interface HelpStep {
  text: string
  textAr: string
}

export interface DriverStep {
  element: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
}

export interface HelpItem {
  id: string
  title: string
  titleAr: string
  icon: string
  steps: HelpStep[]
  driverSteps?: DriverStep[]
}

interface HelpEntry {
  pattern: RegExp
  roles: UserRole[]
  items: HelpItem[]
}

const ALL_ROLES: UserRole[] = ['member', 'group_leader', 'ministry_leader', 'super_admin']
const LEADER_ROLES: UserRole[] = ['group_leader', 'ministry_leader', 'super_admin']
const ADMIN_ROLES: UserRole[] = ['ministry_leader', 'super_admin']

const HELP_REGISTRY: HelpEntry[] = [
  // Dashboard
  {
    pattern: /^\/(dashboard)?$/,
    roles: ['super_admin'],
    items: [
      {
        id: 'dashboard-kpis',
        title: 'View church health metrics',
        titleAr: 'عرض مؤشرات صحة الكنيسة',
        icon: 'BarChart3',
        steps: [
          { text: 'Your dashboard shows key metrics: active members, new visitors, attendance rate, and upcoming events.', textAr: 'لوحة التحكم تعرض مؤشرات رئيسية: الأعضاء النشطين، الزوار الجدد، نسبة الحضور، والفعاليات القادمة.' },
          { text: 'Cards with red or orange indicators need your attention — visitors awaiting follow-up or at-risk members.', textAr: 'البطاقات ذات المؤشرات الحمراء أو البرتقالية تحتاج انتباهك — زوار ينتظرون المتابعة أو أعضاء معرضون للخطر.' },
        ],
      },
      {
        id: 'dashboard-visitors',
        title: 'Check visitor pipeline',
        titleAr: 'تحقق من مسار الزوار',
        icon: 'UserPlus',
        steps: [
          { text: 'Go to the Visitors Queue from the sidebar to see all new visitors.', textAr: 'اذهب إلى قائمة الزوار من الشريط الجانبي لرؤية جميع الزوار الجدد.' },
          { text: 'Assign each visitor to a group leader for follow-up.', textAr: 'عيّن كل زائر لقائد مجموعة للمتابعة.' },
          { text: 'Track the status: pending, contacted, or joined.', textAr: 'تتبع الحالة: في الانتظار، تم التواصل، أو انضم.' },
        ],
      },
    ],
  },
  {
    pattern: /^\/(dashboard)?$/,
    roles: ['group_leader'],
    items: [
      {
        id: 'leader-dashboard',
        title: 'Check group attendance',
        titleAr: 'تحقق من حضور المجموعة',
        icon: 'Users',
        steps: [
          { text: 'Your dashboard shows your group\'s attendance rate and at-risk members.', textAr: 'لوحة التحكم تعرض نسبة حضور مجموعتك والأعضاء المعرضين للخطر.' },
          { text: 'Click on "My Group" in the sidebar to view full group details.', textAr: 'اضغط على "مجموعتي" في الشريط الجانبي لعرض تفاصيل المجموعة الكاملة.' },
        ],
      },
      {
        id: 'leader-gathering',
        title: 'Start a new gathering',
        titleAr: 'ابدأ اجتماعاً جديداً',
        icon: 'Calendar',
        steps: [
          { text: 'Go to your group page from the sidebar.', textAr: 'اذهب لصفحة مجموعتك من الشريط الجانبي.' },
          { text: 'Click "New Gathering" to start a meeting.', textAr: 'اضغط "اجتماع جديد" لبدء لقاء.' },
          { text: 'Set the date and topic, then take attendance.', textAr: 'حدد التاريخ والموضوع، ثم سجل الحضور.' },
        ],
      },
    ],
  },
  {
    pattern: /^\/(dashboard)?$/,
    roles: ['member'],
    items: [
      {
        id: 'member-events',
        title: 'View upcoming events',
        titleAr: 'عرض الفعاليات القادمة',
        icon: 'Calendar',
        steps: [
          { text: 'Go to Events from the bottom navigation or sidebar.', textAr: 'اذهب إلى الفعاليات من شريط التنقل السفلي أو الشريط الجانبي.' },
          { text: 'You can RSVP and sign up to serve at events.', textAr: 'يمكنك تأكيد حضورك والتسجيل للخدمة في الفعاليات.' },
        ],
      },
      {
        id: 'member-bible',
        title: 'Read the Bible',
        titleAr: 'اقرأ الكتاب المقدس',
        icon: 'BookOpen',
        steps: [
          { text: 'Tap "Bible" in the bottom navigation.', textAr: 'اضغط "الكتاب المقدس" في شريط التنقل السفلي.' },
          { text: 'Choose a book and chapter to start reading.', textAr: 'اختر سفراً وإصحاحاً لبدء القراءة.' },
          { text: 'Long-press a verse to bookmark or highlight it.', textAr: 'اضغط مطولاً على آية لوضع إشارة مرجعية أو تمييزها.' },
        ],
      },
      {
        id: 'member-serving',
        title: 'Sign up to serve',
        titleAr: 'سجّل للخدمة',
        icon: 'Heart',
        steps: [
          { text: 'Go to "Serving" from the sidebar or navigation.', textAr: 'اذهب إلى "الخدمة" من الشريط الجانبي أو التنقل.' },
          { text: 'Browse available serving slots and sign up.', textAr: 'تصفح فترات الخدمة المتاحة وسجّل.' },
        ],
      },
    ],
  },

  // Admin Groups
  {
    pattern: /^\/admin\/groups$/,
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'groups-create',
        title: 'Create a new group',
        titleAr: 'إنشاء مجموعة جديدة',
        icon: 'Users',
        steps: [
          { text: 'Click the "+" button or "New Group" to create a group.', textAr: 'اضغط زر "+" أو "مجموعة جديدة" لإنشاء مجموعة.' },
          { text: 'Enter the group name in Arabic and English.', textAr: 'أدخل اسم المجموعة بالعربية والإنجليزية.' },
          { text: 'Set the meeting day and time.', textAr: 'حدد يوم ووقت الاجتماع.' },
          { text: 'Assign a leader and co-leader.', textAr: 'عيّن قائداً ومساعد قائد.' },
        ],
      },
      {
        id: 'groups-manage',
        title: 'Manage group members',
        titleAr: 'إدارة أعضاء المجموعة',
        icon: 'UserPlus',
        steps: [
          { text: 'Click on a group to open its detail page.', textAr: 'اضغط على مجموعة لفتح صفحة تفاصيلها.' },
          { text: 'Use "Add Member" to add existing church members to the group.', textAr: 'استخدم "إضافة عضو" لإضافة أعضاء كنيسة حاليين للمجموعة.' },
        ],
      },
    ],
  },

  // Group Detail
  {
    pattern: /^\/groups\/[^/]+$/,
    roles: LEADER_ROLES,
    items: [
      {
        id: 'group-gathering',
        title: 'Start a gathering',
        titleAr: 'بدء اجتماع',
        icon: 'Calendar',
        steps: [
          { text: 'Click "New Gathering" to create a meeting session.', textAr: 'اضغط "اجتماع جديد" لإنشاء جلسة لقاء.' },
          { text: 'Set the date and optionally add a topic.', textAr: 'حدد التاريخ واختيارياً أضف موضوعاً.' },
          { text: 'Mark members as present or absent.', textAr: 'سجّل الأعضاء كحاضرين أو غائبين.' },
        ],
      },
      {
        id: 'group-health',
        title: 'View group health',
        titleAr: 'عرض صحة المجموعة',
        icon: 'BarChart3',
        steps: [
          { text: 'The group page shows attendance trends and member engagement.', textAr: 'صفحة المجموعة تعرض اتجاهات الحضور ومشاركة الأعضاء.' },
          { text: 'Members marked "at-risk" have missed multiple gatherings.', textAr: 'الأعضاء المعلمون "معرضون للخطر" غابوا عن اجتماعات متعددة.' },
        ],
      },
    ],
  },

  // Events
  {
    pattern: /^\/events/,
    roles: ALL_ROLES,
    items: [
      {
        id: 'events-view',
        title: 'Browse events',
        titleAr: 'تصفح الفعاليات',
        icon: 'Calendar',
        steps: [
          { text: 'This page lists all upcoming church events.', textAr: 'هذه الصفحة تعرض جميع فعاليات الكنيسة القادمة.' },
          { text: 'Tap an event to see details, RSVP, or sign up to serve.', textAr: 'اضغط على فعالية لرؤية التفاصيل، تأكيد الحضور، أو التسجيل للخدمة.' },
        ],
      },
    ],
  },
  {
    pattern: /^\/admin\/events/,
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'events-create',
        title: 'Create an event',
        titleAr: 'إنشاء فعالية',
        icon: 'Calendar',
        steps: [
          { text: 'Click "New Event" to create a church event.', textAr: 'اضغط "حدث جديد" لإنشاء فعالية كنسية.' },
          { text: 'Fill in the title, date, time, and description.', textAr: 'املأ العنوان والتاريخ والوقت والوصف.' },
          { text: 'Add service needs to request volunteers.', textAr: 'أضف احتياجات الخدمة لطلب متطوعين.' },
          { text: 'Publish the event to make it visible to members.', textAr: 'انشر الفعالية لجعلها مرئية للأعضاء.' },
        ],
      },
      {
        id: 'events-staffing',
        title: 'Manage volunteers',
        titleAr: 'إدارة المتطوعين',
        icon: 'Heart',
        steps: [
          { text: 'Open an event and go to the "Staffing" tab.', textAr: 'افتح فعالية واذهب إلى تبويب "التوظيف".' },
          { text: 'Add service needs (e.g., ushers, worship team).', textAr: 'أضف احتياجات خدمة (مثل المرحبين، فريق العبادة).' },
          { text: 'Assign volunteers or let them self-sign-up.', textAr: 'عيّن متطوعين أو اتركهم يسجلون ذاتياً.' },
        ],
      },
    ],
  },

  // Members
  {
    pattern: /^\/admin\/members/,
    roles: ALL_ROLES,
    items: [
      {
        id: 'members-browse',
        title: 'Search and filter members',
        titleAr: 'البحث وتصفية الأعضاء',
        icon: 'Users',
        steps: [
          { text: 'Use the search bar to find members by name.', textAr: 'استخدم شريط البحث للعثور على أعضاء بالاسم.' },
          { text: 'Filter by role, group, or status.', textAr: 'صفّي حسب الدور أو المجموعة أو الحالة.' },
          { text: 'Click on a member to view their full profile.', textAr: 'اضغط على عضو لعرض ملفه الشخصي الكامل.' },
        ],
      },
    ],
  },

  // Visitors
  {
    pattern: /^\/admin\/visitors/,
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'visitors-assign',
        title: 'Assign a visitor',
        titleAr: 'تعيين زائر',
        icon: 'UserPlus',
        steps: [
          { text: 'Find a new visitor in the queue.', textAr: 'ابحث عن زائر جديد في القائمة.' },
          { text: 'Click "Assign" to assign them to a group leader.', textAr: 'اضغط "تعيين" لتعيينه لقائد مجموعة.' },
          { text: 'The leader will be notified to follow up.', textAr: 'سيتم إشعار القائد للمتابعة.' },
        ],
      },
      {
        id: 'visitors-qr',
        title: 'Set up QR registration',
        titleAr: 'إعداد تسجيل QR',
        icon: 'QrCode',
        steps: [
          { text: 'Go to Admin > QR Code from the sidebar.', textAr: 'اذهب إلى الإدارة > رمز QR من الشريط الجانبي.' },
          { text: 'Print the QR code and place it at your church entrance.', textAr: 'اطبع رمز QR وضعه عند مدخل كنيستك.' },
          { text: 'Visitors scan it to register their info automatically.', textAr: 'الزوار يمسحونه لتسجيل بياناتهم تلقائياً.' },
        ],
      },
    ],
  },

  // Songs
  {
    pattern: /^\/admin\/songs/,
    roles: ALL_ROLES,
    items: [
      {
        id: 'songs-add',
        title: 'Add a new song',
        titleAr: 'إضافة ترنيمة جديدة',
        icon: 'Music',
        steps: [
          { text: 'Click "New Song" to add a song to the library.', textAr: 'اضغط "ترنيمة جديدة" لإضافة ترنيمة للمكتبة.' },
          { text: 'Enter the title, artist, and lyrics.', textAr: 'أدخل العنوان والمرنم والكلمات.' },
          { text: 'Separate slides with a blank line in the lyrics.', textAr: 'افصل الشرائح بسطر فارغ في الكلمات.' },
        ],
      },
      {
        id: 'songs-presenter',
        title: 'Open presenter mode',
        titleAr: 'فتح وضع العرض',
        icon: 'Monitor',
        steps: [
          { text: 'Open a song and click the presenter icon.', textAr: 'افتح ترنيمة واضغط أيقونة العرض.' },
          { text: 'Full-screen lyrics will display for projection.', textAr: 'ستظهر الكلمات بملء الشاشة للعرض.' },
          { text: 'Use arrow keys or swipe to navigate slides.', textAr: 'استخدم مفاتيح الأسهم أو اسحب للتنقل بين الشرائح.' },
        ],
      },
    ],
  },

  // Bible
  {
    pattern: /^\/bible/,
    roles: ALL_ROLES,
    items: [
      {
        id: 'bible-navigate',
        title: 'Navigate the Bible',
        titleAr: 'تصفح الكتاب المقدس',
        icon: 'BookOpen',
        steps: [
          { text: 'Select a book from the list, then choose a chapter.', textAr: 'اختر سفراً من القائمة، ثم اختر إصحاحاً.' },
          { text: 'Swipe left/right to move between chapters.', textAr: 'اسحب يميناً/يساراً للتنقل بين الإصحاحات.' },
        ],
      },
      {
        id: 'bible-bookmark',
        title: 'Bookmark & highlight',
        titleAr: 'إشارة مرجعية وتمييز',
        icon: 'Bookmark',
        steps: [
          { text: 'Tap on a verse to select it.', textAr: 'اضغط على آية لتحديدها.' },
          { text: 'Choose "Bookmark" to save it or "Highlight" to color it.', textAr: 'اختر "إشارة مرجعية" لحفظها أو "تمييز" لتلوينها.' },
          { text: 'View all bookmarks from the bookmarks page.', textAr: 'اعرض جميع الإشارات من صفحة الإشارات المرجعية.' },
        ],
      },
    ],
  },

  // Announcements
  {
    pattern: /^\/announcements/,
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'announcements-create',
        title: 'Create an announcement',
        titleAr: 'إنشاء إعلان',
        icon: 'Megaphone',
        steps: [
          { text: 'Click "New Announcement" to draft a message.', textAr: 'اضغط "إعلان جديد" لكتابة رسالة.' },
          { text: 'Write the title and body in Arabic (and optionally English).', textAr: 'اكتب العنوان والمحتوى بالعربية (واختيارياً بالإنجليزية).' },
          { text: 'Publish to send it to all members instantly.', textAr: 'انشر لإرساله لجميع الأعضاء فوراً.' },
        ],
      },
    ],
  },

  // Prayer
  {
    pattern: /^\/prayer/,
    roles: ALL_ROLES,
    items: [
      {
        id: 'prayer-submit',
        title: 'Submit a prayer request',
        titleAr: 'إرسال طلب صلاة',
        icon: 'HandHeart',
        steps: [
          { text: 'Type your prayer request in the form at the top.', textAr: 'اكتب طلب صلاتك في النموذج في الأعلى.' },
          { text: 'Choose whether to submit anonymously.', textAr: 'اختر إن كنت تريد الإرسال بشكل مجهول.' },
          { text: 'Your request will be shared with church leaders for prayer.', textAr: 'سيتم مشاركة طلبك مع قادة الكنيسة للصلاة.' },
        ],
      },
    ],
  },

  // Serving
  {
    pattern: /^\/serving/,
    roles: ALL_ROLES,
    items: [
      {
        id: 'serving-signup',
        title: 'Sign up to serve',
        titleAr: 'التسجيل للخدمة',
        icon: 'Heart',
        steps: [
          { text: 'Browse available serving slots on this page.', textAr: 'تصفح فترات الخدمة المتاحة في هذه الصفحة.' },
          { text: 'Click "Sign Up" on a slot that fits your schedule.', textAr: 'اضغط "تسجيل" على الفترة التي تناسب جدولك.' },
          { text: 'You\'ll receive a reminder before your serving time.', textAr: 'ستتلقى تذكيراً قبل وقت خدمتك.' },
        ],
      },
    ],
  },

  // Settings
  {
    pattern: /^\/admin\/settings/,
    roles: ['super_admin'],
    items: [
      {
        id: 'settings-qr',
        title: 'Configure QR code',
        titleAr: 'إعداد رمز QR',
        icon: 'QrCode',
        steps: [
          { text: 'Go to QR Code settings to generate your church\'s visitor QR code.', textAr: 'اذهب إلى إعدادات رمز QR لإنشاء رمز QR لزوار كنيستك.' },
          { text: 'Print it and display at your church entrance.', textAr: 'اطبعه وضعه عند مدخل كنيستك.' },
        ],
      },
      {
        id: 'settings-roles',
        title: 'Manage permissions',
        titleAr: 'إدارة الصلاحيات',
        icon: 'ShieldCheck',
        steps: [
          { text: 'Go to Role Permissions to customize what each role can do.', textAr: 'اذهب إلى صلاحيات الأدوار لتخصيص ما يمكن لكل دور فعله.' },
          { text: 'Toggle permissions on/off for each role.', textAr: 'فعّل/عطّل الصلاحيات لكل دور.' },
        ],
      },
    ],
  },
]

export function getHelpItems(pathname: string, role: UserRole): HelpItem[] {
  const items: HelpItem[] = []

  for (const entry of HELP_REGISTRY) {
    if (entry.pattern.test(pathname) && entry.roles.includes(role)) {
      items.push(...entry.items)
    }
  }

  return items
}
