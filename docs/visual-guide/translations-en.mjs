// ============================================================================
// English translations for the visual guide — mirrors manifest.mjs 1:1.
// EN_SECTIONS keys = section `n` from manifest.mjs; each `steps` array MUST be
// the same length and order as that section's steps (one sentence per step).
// Audio/video stay Arabic-only; only text localizes.
// Quoted button labels use the real English UI strings from messages/en.json.
// ============================================================================

export const EN_CATEGORIES = {
  welcome: 'Welcome',
  start: 'Getting Started',
  member: 'For Members',
  leader: 'For Group Leaders',
  admin: 'For Admins & Leaders',
  settings: 'Church Settings',
  ref: 'Quick Reference',
}

export const EN_SECTIONS = {
  // ─────────────────────────── PART I ───────────────────────────
  '1': { t: 'What is Ekklesia?', steps: [
    'This is the Ekklesia home page.',
    'Scroll down to see everything the app can do.',
  ]},
  '2': { t: 'The Four Roles in the App', steps: [
    'Every person has a role: member, group leader, ministry leader, or admin.',
  ]},
  // ─────────────────────────── PART II ───────────────────────────
  '3': { t: 'Registering Your Church (for Pastors)', steps: [
    'Tap the "Let\'s Go" button to start registering your church.',
    'Type your email address here.',
    'Type a new password, then type it again to confirm.',
    'Type your name and phone number so we can contact you.',
  ]},
  '4': { t: 'Creating an Account and Joining Your Church', steps: [
    'Type your church\'s name in the search box.',
    'Pick your church from the list that appears.',
  ]},
  '5': { t: 'Signing In', steps: [
    'Type your email address here.',
    'Type your password.',
    'Tap the "Sign In" button.',
    'Welcome! This is your home page.',
  ]},
  '5b': { t: 'Signing In with Your Phone (WhatsApp)', steps: [
    'Tap the "Phone" tab.',
    'Type your phone number with the country code, like +20 for Egypt.',
    'Tap this button, and a 6-digit code will arrive on WhatsApp.',
  ]},
  '6': { t: 'Forgot Your Password?', steps: [
    'Tap "Forgot password?".',
    'Type your email address.',
    'Tap "Send reset link", then open your email.',
  ]},
  '7': { t: 'Completing Your Profile the First Time', steps: [
    'The first time you sign in, you\'ll type your Arabic name and phone number here.',
    'Choose the notification method you prefer, then tap Save.',
  ]},
  '8': { t: 'Getting Around the App', steps: [
    'This side menu has every page in the app.',
    'This bell shows your new notifications.',
    'And from here you can sign out.',
  ]},
  '9': { t: 'Switching Between Arabic and English', steps: [
    'Tap the language button at the top to switch between Arabic and English.',
  ]},
  '10': { t: 'Turning On Notifications', steps: [
    'When this card appears, tap "Enable" so notifications reach your phone.',
  ]},
  '11': { t: 'More Than One Church with One Account', steps: [
    'If you belong to more than one church, tap the church name at the top to switch between them.',
  ]},
  // ─────────────────────────── PART III ───────────────────────────
  '12': { t: 'Your Home Page', steps: [
    'Here you can see your attendance, your groups, and your notifications.',
    'Below you\'ll find upcoming events and the latest announcements.',
  ]},
  '13': { t: 'Your Profile', steps: [
    'This is your profile with all your details.',
    'Tap the edit button to change your details or your photo.',
    'From here you can add or change your photo (5 MB max).',
    'When you\'re done, tap "Save Changes".',
  ]},
  '14': { t: 'Notifications', steps: [
    'Here are all your notifications — new ones are marked.',
    'Tap any notification to see its details.',
    'The "Mark all read" button clears all the marks at once.',
  ]},
  '15': { t: 'Events and Registering for Them', steps: [
    'These are all the upcoming events at your church.',
    'Tap any event to see its details.',
    'If there\'s a "Register" button, tap it to save your spot.',
  ]},
  '16': { t: 'Serving and Volunteering', steps: [
    'These are the serving times open for volunteers.',
    'Open any serving time and tap "Sign Up" to volunteer.',
    'Your signups appear below under "My Signups".',
  ]},
  '17': { t: 'Announcements', steps: [
    'Here is the latest church news and announcements — pinned ones show first.',
  ]},
  '18': { t: 'Prayer Requests', steps: [
    'Type your prayer request here.',
    'Choose who can see your request: everyone, anonymous, or leaders only.',
    'Tap "Submit Prayer".',
    'And tap "I\'m Praying" on other people\'s requests to encourage them.',
  ]},
  '19': { t: 'Reading the Bible', steps: [
    'Tap "Select a Book" and choose the book you want to read.',
    'Then choose the chapter.',
    'Tap any verse to highlight it, save it, or copy it.',
  ]},
  '20': { t: 'Agpeya, Readings, and Hymns', steps: [
    'From here you can open the Agpeya, today\'s readings, liturgies, and hymns.',
    'For example, tap "Agpeya" and choose the hour you want to pray.',
  ]},
  '21': { t: 'Songs', steps: [
    'Search for any song by its name or its lyrics.',
  ]},
  '22': { t: 'Booking a Room', steps: [
    'Choose the room and the day, and see the free time slots.',
    'Tap the booking button and enter a title and time for your booking.',
  ]},
  '23': { t: 'Church Needs', steps: [
    'Here, other churches are asking for help — and you can help them.',
    'Open any need, tap the offer-help button, and write your message.',
  ]},
  '24': { t: 'Groups and How to Join Them', steps: [
    'From the groups page you can see your groups and the open ones.',
    'Tap "Request to Join" and the leader will approve you.',
  ]},
  '25': { t: 'Church Invitations', steps: [
    'If a church invited you, a card will appear on your home page: accept or decline.',
  ]},
  // ─────────────────────────── PART IV ───────────────────────────
  '26': { t: 'My Group Page (for Leaders)', steps: [
    'This is your group\'s page: members, attendance, and gatherings.',
    'And here are the members who have missed a lot and need a follow-up visit.',
  ]},
  '27': { t: 'Creating a New Gathering', steps: [
    'Set the day and time of the gathering.',
    'Type the gathering\'s topic and location.',
    'Tap "Create Gathering".',
  ]},
  '28': { t: 'Taking Attendance', steps: [
    'Tap any member\'s name to change their status: present, late, or absent.',
    'Tap "Save Attendance" at any time.',
    'And when the gathering ends, tap "Complete Gathering".',
  ]},
  '29': { t: 'Group Prayers and Recording Answers', steps: [
    'From the prayer section, tap "Add Request" and write the request.',
    'And when God answers, tap the record-answer button.',
  ]},
  '30': { t: 'Approving Group Join Requests', steps: [
    'Join requests appear on your group\'s page: tap "Approve" or "Decline".',
  ]},
  '31': { t: 'Visitors Assigned to You', steps: [
    'These are the visitors the church asked you to follow up with.',
    'Call them, then tap "Log Contact" and write what happened.',
  ]},
  // ─────────────────────────── PART V ───────────────────────────
  '32': { t: 'The Admin Dashboard', steps: [
    'This is your whole church\'s health on one page: members, visitors, and attendance.',
    'The "Needs Attention" section shows you what to follow up on today.',
  ]},
  '33': { t: 'The Member Directory', steps: [
    'This is the directory of every church member.',
    'Type any name in the search and results appear instantly.',
    'Tap any member to open their profile.',
  ]},
  '34': { t: 'Adding a New Member', steps: [
    'Tap the "Add member" button.',
    'Type their name and phone number.',
    'Tap "Add member" — and they\'ll be able to sign in with WhatsApp right away.',
  ]},
  '35': { t: 'Managing a Member\'s Profile', steps: [
    'A member\'s profile has their details, spiritual milestones, and involvement.',
    'From the "Manage" tab you can change their role and permissions.',
  ]},
  '36': { t: 'The Visitor List and Follow-Up', steps: [
    'Every new visitor appears here, and overdue ones get a red alert.',
    'Tap "Assign" and choose a leader to follow up with the visitor.',
    'And when they\'re ready, tap "Convert to Member".',
  ]},
  '37': { t: 'The Visitor QR Code', steps: [
    'Print this code and put it at the church entrance.',
    'The "Download PNG" button downloads the image for printing.',
  ]},
  '38': { t: 'Managing Groups', steps: [
    'These are all the church\'s groups.',
    'Tap "New Group" to create one.',
    'Type the group\'s name and choose the leader and meeting day.',
  ]},
  '39': { t: 'Managing Ministries', steps: [
    'These are all the church\'s ministries — tap any one to see its team.',
    'The add-ministry button creates a new ministry with a name and a leader.',
  ]},
  '40': { t: 'Creating an Event (7 Steps)', steps: [
    'Step 1: type the event\'s name and choose its type.',
    'Step 2: set the date and time.',
    'Step 3: type the location.',
    'Step 4: turn on "Registration required" if you want people to reserve a spot.',
    'Step 5: choose who can see the event.',
    'Step 6: request serving teams if you need volunteers.',
    'Step 7: review everything and tap "Create Event".',
  ]},
  '41': { t: 'Event Templates', steps: [
    'Make a template for Sunday service once, and use it every week.',
    'From the events page tap "From Template" and everything fills in by itself.',
  ]},
  '42': { t: 'The Church Calendar', steps: [
    'All events, serving, and gatherings in one color-coded calendar.',
    'These buttons show and hide each type.',
  ]},
  '43': { t: 'Managing Serving Areas and Slots', steps: [
    'From the "Serving Areas" tab, create teams like welcome and sound.',
    'And from "Serving Slots", set the times people can sign up for.',
  ]},
  '44': { t: 'Managing Announcements', steps: [
    'Tap "New Announcement".',
    'Type the title and the content.',
    'Turn on "Pinned" for important announcements, then publish.',
  ]},
  '45': { t: 'Managing Prayer Requests', steps: [
    'All prayer requests are here: active, answered, and archived.',
    'The "Assign" button lets a specific person pray and follow up on the request.',
  ]},
  '46': { t: 'Managing Songs and the Presenter', steps: [
    'The "Add Song" button: name, lyrics, and a blank line between each slide.',
    'And the "Present" button opens the projector display.',
  ]},
  '47': { t: 'Outreach and Visits', steps: [
    'Here you track who has been visited at home and who needs a visit.',
    'After every visit, tap "Log Visit" and write what happened.',
  ]},
  '48': { t: 'Managing Rooms', steps: [
    'Add your church\'s rooms so people can book them.',
  ]},
  '49': { t: 'Sending a Notification to the Whole Church', steps: [
    'Choose who receives it: everyone, a group, or a specific ministry.',
    'Type the title and the message, and see how many people it will reach.',
    'Tap "Send Notification" and confirm.',
  ]},
  '50': { t: 'Approving Church Join Requests', steps: [
    'Anyone who asked to join your church appears here: tap "Approve" or "Decline".',
  ]},
  // ─────────────────────────── PART VI ───────────────────────────
  '51': { t: 'The Settings Page', steps: [
    'Four settings: QR code, notifications, privacy, and permissions.',
  ]},
  '52': { t: 'Permissions', steps: [
    'From here you decide what each role can do.',
    'And you can give one person an extra permission from their profile.',
  ]},
  '53': { t: 'Phone Number Privacy', steps: [
    'Choose who can see members\' phone numbers: everyone, leaders, or admins only.',
  ]},
  '54': { t: 'Notification Channels (WhatsApp)', steps: [
    'This switch turns on paid WhatsApp notifications — the free notifications are always on.',
  ]},
  // ─────────────────────────── PART VII+VIII ───────────────────────────
  '55': { t: 'Approving New Churches (for the Operator)', steps: [
    'The platform operator reviews every new church and calls its owner before activation.',
  ]},
  '56': { t: 'Quick Reference: Who Can Do What', steps: [
    'A member sees their own pages, a leader manages their group, and an admin manages everything.',
  ]},
  '57': { t: 'Shortcuts and Hidden Features', steps: [
    'In the presenter: arrow keys move between slides, and F goes full screen.',
  ]},
  '58': { t: 'Important Limits and Settings', steps: [
    'Photos are 5 MB max, passwords need at least 6 characters, and phone numbers must start with the country code.',
  ]},
  '59': { t: 'Fixing Common Problems', steps: [
    'If something isn\'t working: refresh the page, check your role, or ask your church admin.',
  ]},
}
