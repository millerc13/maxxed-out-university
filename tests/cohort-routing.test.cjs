const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the real route, assignment, scoring, SMS and Slack implementations.
// Only framework scheduling, persistence, settings and HTTP transports are
// replaced. No .env files, live database clients or network fetch are loaded.
const ROOT = path.resolve(__dirname, '..');
const copy = (value) => JSON.parse(JSON.stringify(value));
const APPLICATION = {
  name: 'Routing Test Applicant', phone: '2025550101', email: 'routing@example.invalid',
  state: 'Ohio', readiness: 'ready_now', investment: 'over_10k', work: 'owns_business',
  consentText: 'Test consent',
};
const JACKIE = {
  id: 'recipient-jackie', label: 'Jackie', phone: '+12025550102',
  active: true, notifyOnLead: true, notifyOnSale: true,
  sources: ['medicaid-cohort'], ghlContactId: 'contact-jackie',
};

function harness(options = {}) {
  const calls = { creates: [], updates: [], queries: [], http: [], logs: [], vip: 0 };
  const afterCallbacks = [];
  const recipients = options.recipients || [JACKIE, {
    ...JACKIE, id: 'recipient-unrelated', label: 'Another staff member',
    phone: '+12025550103', sources: [], ghlContactId: 'contact-unrelated',
  }];
  const settings = {
    internalNotificationsEnabled: 'true', testPhoneOverride: '',
    cohortNotificationRecipientId: JACKIE.id, ...options.settings,
  };
  const prisma = {
    cohortApplication: {
      create: async ({ data }) => {
        calls.creates.push(copy(data));
        return { id: 'application-test', ...data };
      },
      update: async (args) => { calls.updates.push(copy(args)); return args.data; },
    },
    notificationRecipient: {
      findMany: async (args) => {
        calls.queries.push(copy(args));
        const w = args.where;
        return recipients.filter((r) => r.active === w.active &&
          (!w.notifyOnLead || r.notifyOnLead) && (!w.notifyOnSale || r.notifyOnSale) &&
          (!w.id || w.id.in.includes(r.id)));
      },
      update: async () => { throw new Error('Unexpected recipient cache write'); },
    },
    slackChannel: {
      findMany: async () => [{
        id: 'channel-config', name: 'cohort-applications', sources: ['medicaid-cohort'],
        webhookUrl: 'https://slack.test/cohort-webhook',
      }],
    },
    webhookLog: {
      create: async ({ data }) => { calls.logs.push(copy(data)); return data; },
      createMany: async ({ data }) => { calls.logs.push(...copy(data)); return { count: data.length }; },
    },
  };
  const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
  const fakeFetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.http.push({ url: String(url), body });
    if (url === 'https://services.leadconnectorhq.com/contacts/upsert') {
      if (options.holdGhl) await options.holdGhl;
      return options.ghlFails ? jsonResponse({ message: 'Test failure' }, 503)
        : jsonResponse({ contact: { id: 'contact-applicant' } });
    }
    if (url === 'https://services.leadconnectorhq.com/conversations/messages') {
      if (options.staffFails && body.contactId === JACKIE.ghlContactId) {
        return jsonResponse({ message: 'Test SMS rejection' }, 503);
      }
      return jsonResponse({ messageId: `message-${body.contactId}` });
    }
    if (url === 'https://slack.com/api/chat.postMessage') {
      return options.slackBotFails ? jsonResponse({ ok: false, error: 'not_in_channel' })
        : jsonResponse({ ok: true, channel: 'slack-cohort', ts: '123.456' });
    }
    if (url === 'https://slack.test/cohort-webhook') {
      return options.slackWebhookFails ? jsonResponse({}, 503) : jsonResponse({ ok: true });
    }
    throw new Error(`Unexpected HTTP request (network disabled): ${url}`);
  };
  const context = vm.createContext({
    process: { env: {
      GHL_API_KEY: 'test-key', GHL_LOCATION_ID: 'location-test',
      GHL_USER_JACKIE_ID: 'ghl-jackie-user',
      SLACK_BOT_TOKEN: 'test-slack-token', SLACK_COHORT_CHANNEL_ID: 'slack-cohort',
      COHORT_ACTION_SECRET: 'test-signing-secret', ...options.env,
    } },
    console: { log() {}, warn() {}, error() {} },
    fetch: fakeFetch, AbortSignal, Buffer, URL, setTimeout, clearTimeout,
  });
  const mocks = {
    'next/server': {
      NextResponse: { json: (body, init) => ({ status: init?.status || 200, json: async () => copy(body) }) },
      after: (callback) => afterCallbacks.push(callback),
    },
    '@/lib/prisma': { prisma }, './prisma': { prisma },
    '@/lib/settings': {
      getSetting: async (key, fallback) => settings[key] ?? fallback,
      getSettingBool: async (key, fallback) => key in settings ? settings[key] === 'true' : fallback,
    },
    '@/lib/cohort-vip': { isVipBuyer: async () => { calls.vip++; return false; } },
    '@/lib/slack-verify': { slackSigningSecret: () => '' },
    '@/lib/cohort-checkout': {
      cohortPriceLabel: () => '$10,000', cohortPromoPriceLabel: () => '$8,500', COHORT_PROMO_CODE: 'TEST',
    },
    '@/lib/cohort-payment-plan': { PLAN_PAYMENT_DOLLARS: 3500, planPriceLabel: () => '$10,500' },
  };
  mocks['./settings'] = mocks['@/lib/settings'];
  const allowed = new Set([
    'src/app/api/cohort-application/route.ts', 'src/lib/cohort-assign.ts',
    'src/lib/cohort-scoring.ts', 'src/lib/sms.ts', 'src/lib/slack.ts', 'src/lib/slack-bot.ts',
  ]);
  const modules = new Map();
  function load(relative) {
    if (!allowed.has(relative)) throw new Error(`Unmocked module blocked: ${relative}`);
    if (modules.has(relative)) return modules.get(relative).exports;
    const module = { exports: {} };
    modules.set(relative, module);
    const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
    } }).outputText;
    const requireMock = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === 'crypto' || id === 'zod') return require(id);
      if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`);
      throw new Error(`Unmocked dependency blocked: ${id}`);
    };
    new vm.Script(`(function(require, module, exports) { ${compiled}\n})`, { filename: relative })
      .runInContext(context)(requireMock, module, module.exports);
    return module.exports;
  }
  const route = load('src/app/api/cohort-application/route.ts');
  return {
    calls, afterCallbacks, load,
    submit: (data = APPLICATION) => route.POST({ json: async () => data }),
    malformed: () => route.POST({ json: async () => { throw new Error('Malformed JSON'); } }),
    drain: async () => { for (const callback of afterCallbacks) await callback(); },
  };
}

const smsCalls = (h) => h.calls.http.filter((r) => r.url.endsWith('/conversations/messages'));
const staffSms = (h) => smsCalls(h).filter((r) => r.body.contactId === JACKIE.ghlContactId);
const slackCalls = (h) => h.calls.http.filter((r) => r.url === 'https://slack.com/api/chat.postMessage');
const event = (h, name) => h.calls.logs.find((r) => r.event === `cohort:${name}`);

test('new application is assigned locally and in GHL to Jackie, mentions her in Slack and texts only her', async () => {
  const h = harness();
  const response = await h.submit();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, id: 'application-test', tier: 'A', score: 28 });
  assert.equal(h.calls.creates[0].assignedTo, 'Jackie');
  assert.equal(h.calls.http.length, 0, 'external work remains scheduled after the response');
  await h.drain();
  const contactWrite = h.calls.http.find((r) => r.url.endsWith('/contacts/upsert'));
  assert.equal(contactWrite.body.assignedTo, 'ghl-jackie-user');
  assert.equal(contactWrite.body.source, 'Medicaid 12-Week Cohort');
  assert.equal(staffSms(h).length, 1);
  assert.equal(smsCalls(h).length, 2, 'one applicant receipt plus one Jackie notification');
  assert.match(staffSms(h)[0].body.message, /assigned to Jackie/);
  assert.match(staffSms(h)[0].body.message, /Routing Test Applicant/);
  assert.deepEqual(h.calls.queries[0].where.id.in, ['recipient-jackie']);
  assert.equal(smsCalls(h).some((r) => r.body.contactId === 'contact-unrelated'), false);
  assert.equal(slackCalls(h).length, 1);
  assert.match(JSON.stringify(slackCalls(h)[0].body), /<@U0BJZSKHB36>/);
  assert.equal(event(h, 'staff-sms').payload.messageId, 'message-contact-jackie');
  assert.equal(event(h, 'ghl-assignment').status, 'success');
  assert.equal(event(h, 'slack').status, 'success');
  assert.ok(h.calls.updates.every((r) => r.where.id === 'application-test' && !('assignedTo' in r.data)),
    'only the new row receives link metadata; no historical owners are rewritten');
});

test('staff SMS rejection is recorded without preventing applicant sync or Slack', async () => {
  const h = harness({ staffFails: true });
  await h.submit(); await h.drain();
  assert.equal(event(h, 'staff-sms').status, 'failed');
  assert.equal(event(h, 'ghl-assignment').status, 'success');
  assert.equal(event(h, 'slack').status, 'success');
});

test('GHL rejection is recorded while independent Jackie SMS and Slack still succeed', async () => {
  const h = harness({ ghlFails: true });
  await h.submit(); await h.drain();
  assert.equal(event(h, 'ghl-assignment').status, 'failed');
  assert.equal(event(h, 'staff-sms').status, 'success');
  assert.equal(event(h, 'slack').status, 'success');
});

test('Jackie assignment falls back to the verified user ID when the environment override is blank', async () => {
  const h = harness({ env: { GHL_USER_JACKIE_ID: '   ' } });
  const assignment = h.load('src/lib/cohort-assign.ts');
  assert.equal(await assignment.nextCohortCloser(), 'Jackie');
  assert.equal(assignment.cohortGhlAssigneeId(), 'IhMt70Bb1ofSoWRfVj3A');
  assert.equal(assignment.closerMention('Jackie'), '<@U0BJZSKHB36>');
});

test('Slack bot rejection uses the webhook fallback without duplicating staff SMS', async () => {
  const h = harness({ slackBotFails: true });
  await h.submit(); await h.drain();
  assert.equal(staffSms(h).length, 1);
  assert.equal(h.calls.http.filter((r) => r.url === 'https://slack.test/cohort-webhook').length, 1);
  assert.equal(event(h, 'slack').payload.transport, 'webhook');
  assert.equal(event(h, 'slack').status, 'success');
});

test('failure of both Slack transports does not prevent Jackie SMS', async () => {
  const h = harness({ slackBotFails: true, slackWebhookFails: true });
  await h.submit(); await h.drain();
  assert.equal(event(h, 'slack').status, 'failed');
  assert.equal(event(h, 'staff-sms').status, 'success');
});

test('slow GHL assignment does not delay Jackie SMS or Slack', async () => {
  let release;
  const holdGhl = new Promise((resolve) => { release = resolve; });
  const h = harness({ holdGhl });
  await h.submit();
  const completion = h.drain();
  try {
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(staffSms(h).length, 1);
    assert.equal(slackCalls(h).length, 1);
    assert.equal(event(h, 'ghl-assignment'), undefined, 'GHL is still pending');
  } finally { release(); await completion; }
});

test('missing or nonmatching staff configuration records failure and preserves Slack', async (t) => {
  for (const [name, options] of [
    ['missing setting', { settings: { cohortNotificationRecipientId: '' } }],
    ['inactive target', { recipients: [{ ...JACKIE, active: false }] }],
    ['source mismatch', { recipients: [{ ...JACKIE, sources: ['another-source'] }] }],
  ]) await t.test(name, async () => {
    const h = harness(options);
    await h.submit(); await h.drain();
    assert.equal(staffSms(h).length, 0);
    assert.equal(event(h, 'staff-sms').status, 'failed');
    assert.equal(event(h, 'slack').status, 'success');
  });
});

test('notification kill switch leaves applicant sync active but skips staff SMS and Slack', async () => {
  const h = harness({ settings: { internalNotificationsEnabled: 'false' } });
  await h.submit(); await h.drain();
  assert.equal(staffSms(h).length, 0);
  assert.equal(slackCalls(h).length, 0);
  assert.equal(event(h, 'ghl-assignment').status, 'success');
  assert.equal(event(h, 'applicant-sms').status, 'success');
});

test('SMS helper keeps source filtering and honors the test override with an explicit recipient scope', async () => {
  const h = harness({ settings: { testPhoneOverride: '+12025550104' } });
  const sms = h.load('src/lib/sms.ts');
  const results = await sms.notifyRecipients('lead', 'Test notification', 'medicaid-cohort', [JACKIE.id]);
  assert.equal(results.length, 1);
  assert.equal(results[0].recipientId, 'test-override');
  assert.deepEqual(h.calls.queries[0].where.id.in, [JACKIE.id]);
  assert.equal(staffSms(h).length, 0, 'override must not text the production staff contact');
  assert.equal(h.calls.http.find((r) => r.url.endsWith('/contacts/upsert')).body.phone, '+12025550104');
});

test('legacy SMS callers without recipient scope still notify their subscribed recipients', async () => {
  const h = harness();
  const sms = h.load('src/lib/sms.ts');
  const results = await sms.notifyRecipients('lead', 'Legacy caller', 'medicaid-cohort');
  assert.equal(results.length, 2);
  assert.equal(h.calls.queries[0].where.id, undefined);
  assert.equal(smsCalls(h).length, 2);
});

test('invalid input and malformed JSON have no persistence, scheduling or notification effects', async (t) => {
  for (const [name, submit] of [
    ['invalid email', (h) => h.submit({ ...APPLICATION, email: 'invalid' })],
    ['invalid phone', (h) => h.submit({ ...APPLICATION, phone: '123' })],
    ['invalid answer', (h) => h.submit({ ...APPLICATION, readiness: 'invented-answer' })],
    ['malformed JSON', (h) => h.malformed()],
  ]) await t.test(name, async () => {
    const h = harness();
    const response = await submit(h);
    assert.equal(response.status, 400);
    assert.equal(h.calls.creates.length, 0);
    assert.equal(h.calls.http.length, 0);
    assert.equal(h.calls.vip, 0);
    assert.equal(h.afterCallbacks.length, 0);
  });
});
