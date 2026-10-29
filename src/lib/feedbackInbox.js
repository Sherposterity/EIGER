// Founders' feedback inbox (hike migration 184, admin only on the server).
// feedback_admin_list() returns the app's Send feedback notes plus the older
// gear_list_reports rows, each with the sender's account email.
// feedback_set_status() marks a note answered, fixed or closed.
//
// /cybersecurity I1: every text field here is untrusted climber input. It is
// rendered as plain React text only, and it leaves this page only as an
// encodeURIComponent'd Gmail compose parameter (body), never in the
// recipient or the subject, and never as an href of its own.

export const REPLY_FROM = 'business@eiger014.com';
export const REPLY_SUBJECT = 'Re: your Eiger feedback';
export const PAGE_SIZE = 100;

export const FEEDBACK_STATUSES = ['open', 'answered', 'fixed', 'closed'];
export const STATUS_LABEL = {
  open: 'Open',
  answered: 'Answered',
  fixed: 'Fixed',
  closed: 'Closed',
  // gear_list_reports (migrations 162 and 166)
  new: 'New',
  reviewed: 'Reviewed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
};

export const TYPE_FILTERS = [
  ['all', 'All types'],
  ['bug', 'Bug'],
  ['info_wrong', 'Info wrong'],
  ['idea', 'Idea'],
  ['gear_report', 'Mountain gear report'],
];
export const TYPE_LABEL = { bug: 'Bug', info_wrong: 'Info wrong', idea: 'Idea' };

export const STATUS_FILTERS = [
  ['open', 'Open'],
  ['answered', 'Answered'],
  ['fixed', 'Fixed'],
  ['closed', 'Closed'],
  ['all', 'Any status'],
];

export const SOURCE_LABEL = {
  settings: 'Settings',
  mountain_flag: 'Mountain page flag',
  friction_error: 'Error card',
  friction_purchase: 'Purchase card',
  friction_unverified: 'Unverified mountain card',
  friction_missing_stats: 'Missing stats card',
  friction_onboarding: 'Onboarding card',
  gear_list_report: 'Mountain gear report',
};

export const isGearReport = (row) => row?.origin === 'gear_list_reports';

// A gear report that is still 'new' counts as open in the inbox.
export const inboxStatus = (row) => (isGearReport(row) && row.status === 'new' ? 'open' : row.status);

export function rowMatches(row, statusFilter, typeFilter) {
  if (statusFilter !== 'all' && inboxStatus(row) !== statusFilter) return false;
  if (typeFilter === 'all') return true;
  if (typeFilter === 'gear_report') return isGearReport(row);
  return !isGearReport(row) && row.type === typeFilter;
}

export const typeText = (row) => (isGearReport(row) ? `Gear report (${row.type || 'other'})` : TYPE_LABEL[row.type] || row.type || '');

// "iOS 18.1, iPhone15,2" or what is known of it.
export function deviceText(row) {
  const os = row.platform ? `${row.platform === 'ios' ? 'iOS' : 'Android'}${row.os_version ? ` ${row.os_version}` : ''}` : row.os_version || '';
  return [os, row.device_model].filter(Boolean).join(', ');
}

// Loose check for the recipient: one address, no spaces, separators or
// control characters, so a stored value can never add a second recipient.
const EMAIL_RE = /^[^\s@,;<>"'()[\]\\]+@[^\s@,;<>"'()[\]\\]+\.[^\s@,;<>"'()[\]\\]+$/;
const isControl = (ch) => {
  const n = ch.codePointAt(0);
  return n < 32 || (n >= 127 && n <= 159);
};
export const replyableEmail = (email) =>
  typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email) && ![...email].some(isControl);

// Each line of the note prefixed with "> ".
export const quoteNote = (body) =>
  String(body ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n');

export function replyBody(row, dateText) {
  const said = dateText ? `On ${dateText} you wrote:` : 'You wrote:';
  return `Hi,\n\n\n\n${said}\n${quoteNote(row.body)}\n`;
}

// Gmail compose in business@'s session. Every parameter goes through
// encodeURIComponent; only the body carries climber text. Returns null when
// the sender has no usable address.
export function gmailReplyUrl(row, dateText = '') {
  if (!replyableEmail(row?.email)) return null;
  const params = [
    ['authuser', REPLY_FROM],
    ['view', 'cm'],
    ['fs', '1'],
    ['to', row.email],
    ['su', REPLY_SUBJECT],
    ['body', replyBody(row, dateText)],
  ];
  return `https://mail.google.com/mail/?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

export const INBOX_ERROR_COPY = {
  not_authorized: 'Only founders can open the feedback inbox.',
  invalid_status: 'That status is not allowed.',
  feedback_not_found: 'That note no longer exists. Reload the list.',
  reply_too_long: 'The reply is too long to record.',
};

export const inboxMessage = (message) => INBOX_ERROR_COPY[message] || 'Something went wrong. Please try again.';

// RPC layer; client is the signed-in Supabase client. The server re-checks
// is_review_admin() on both calls, so a non-admin gets not_authorized and no rows.
export function createInboxApi(client) {
  const call = async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) {
      const e = new Error(inboxMessage(error.message));
      e.serverMessage = error.message;
      throw e;
    }
    return data;
  };
  return {
    list: async (before = null) => (await call('feedback_admin_list', { p_limit: PAGE_SIZE, p_before: before })) || [],
    setStatus: (id, status) => {
      if (!FEEDBACK_STATUSES.includes(status)) return Promise.reject(new Error(INBOX_ERROR_COPY.invalid_status));
      return call('feedback_set_status', { p_id: id, p_status: status });
    },
  };
}
