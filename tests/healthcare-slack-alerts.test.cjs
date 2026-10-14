const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Real webhook handler, Slack builder/fan-out, and mention/phone helpers.
// The only persistence and HTTP operations available are the fakes below.
// No production environment files or actual database clients are loaded.
const ROOT = path.resolve(__dirname, '..');
const copy = (value) => JSON.parse(JSON.stringify(value));
const CONTACT = {
  first_name: 'Example', last_name: 'Applicant', email: 'healthcare@example.invalid',
  phone: '+12025550101', contact_id: 'contact-test', assigned_to: 'Jackie',
};
const QUESTIONS = {
  current_business: 'Example Services', monthly_revenue: '$25,000',
  healthcare_interest: 'Build a healthcare services business',
};
// Proposed stable webhook keys only. These fixtures do not prove that the
// unsaved native GHL form is bound to the correct custom fields/merge tokens.
const REVISED_QUESTIONS = {
  readiness: 'Ready to move forward', investment_budget: '$50,000–$100,000',
  work_situation: 'I own a business now', state: 'Ohio',
  notes: 'I already have an operating partner.',
};

function harness(options = {}) {
  const calls = { queries: [], http: [], logs: [] };
  const channels = options.channels ?? [{
    id: 'dd-channel', name: 'DD Applications', sources: ['unrelated-source'],
    webhookUrl: 'https://slack.test/dd-channel',
  }];
  const prisma = {
    slackChannel: { findMany: async (query) => { calls.queries.push(copy(query)); return channels; } },
    webhookLog: { createMany: async ({ data }) => { calls.logs.push(...copy(data)); return { count: data.length }; } },
  };
  const context = vm.createContext({
    process: { env: {
      GHL_ALERT_WEBHOOK_SECRET: 'test-shared-secret', GHL_LOCATION_ID: 'location-test',
      ...options.env,
    } },
    console: { log() {}, warn() {}, error() {} },
    Buffer, URL,
    fetch: async (url, init) => {
      assert.ok(channels.some((c) => c.webhookUrl === url), `Unexpected HTTP request blocked: ${url}`);
      calls.http.push({ url, body: JSON.parse(init.body) });
      if (options.throwUrls?.includes(url)) throw new Error('Network unavailable');
      return new Response(options.failUrls?.includes(url) ? 'invalid_payload' : 'ok', {
        status: options.failUrls?.includes(url) ? 400 : 200,
      });
    },
  });
  const mocks = {
    'next/server': { NextResponse: {
      json: (body, init) => ({ status: init?.status ?? 200, json: async () => copy(body) }),
    } },
    '@/lib/prisma': { prisma }, './prisma': { prisma },
    './settings': { getSetting: async () => { throw new Error('Unexpected settings lookup'); } },
  };
  const allowed = new Set([
    'src/app/api/webhooks/ghl/alert/route.ts', 'src/lib/slack.ts',
    'src/lib/sms.ts', 'src/lib/cohort-assign.ts',
  ]);
  const cache = new Map();
  function load(relative) {
    assert.ok(allowed.has(relative), `Unmocked module blocked: ${relative}`);
    if (cache.has(relative)) return cache.get(relative).exports;
    const module = { exports: {} };
    cache.set(relative, module);
    const compiled = ts.transpileModule(fs.readFileSync(path.join(ROOT, relative), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    const requireMock = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === 'crypto') return require(id);
      if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`);
      throw new Error(`Unmocked dependency blocked: ${id}`);
    };
    new vm.Script(`(function(require, module, exports) { ${compiled}\n})`, { filename: relative })
      .runInContext(context)(requireMock, module, module.exports);
    return module.exports;
  }
  const route = load('src/app/api/webhooks/ghl/alert/route.ts');
  return {
    calls,
    submit: (body, requestOptions = {}) => {
      const url = new URL('https://university.test/api/webhooks/ghl/alert');
      url.searchParams.set('type', requestOptions.type ?? 'dd_application');
      url.searchParams.set('secret', requestOptions.secret ?? 'test-shared-secret');
      if (requestOptions.source) url.searchParams.set('source', requestOptions.source);
      return route.POST({
        nextUrl: url, headers: new Headers(),
        json: async () => {
          if (requestOptions.malformed) throw new Error('Invalid JSON');
          return body;
        },
      });
    },
  };
}

const fields = (h) => h.calls.http[0].body.blocks.filter((b) => b.fields).flatMap((b) => b.fields.map((f) => f.text));
const questionFields = (h) => fields(h).filter((f) => /^\*(Current Business|Monthly Revenue|Healthcare Interest):/.test(f));
const revisedFields = (h) => fields(h).filter((f) => /^\*(Readiness|Investment Budget|Work Situation|State|Additional Notes):/.test(f));

test('revised question contract shows every exact answer in order for top-level and Custom Data payloads', async (t) => {
  for (const container of ['top-level', 'customData', 'custom_data']) await t.test(container, async () => {
    const h = harness();
    const answers = container === 'top-level' ? REVISED_QUESTIONS : { [container]: REVISED_QUESTIONS };
    const response = await h.submit({ ...CONTACT, ...answers });
    assert.equal(response.status, 200);
    assert.deepEqual(revisedFields(h), [
      '*Readiness:*\nReady to move forward', '*Investment Budget:*\n$50,000–$100,000',
      '*Work Situation:*\nI own a business now', '*State:*\nOhio',
      '*Additional Notes:*\nI already have an operating partner.',
    ]);
    assert.equal(questionFields(h).length, 0);
    assert.match(JSON.stringify(h.calls.http[0].body), /<@U0BJZSKHB36>/);
    assert.match(JSON.stringify(h.calls.http[0].body), /contacts\/detail\/contact-test/);
  });
});

test('revised answers displace stale legacy answers and cannot be crowded out by unrelated custom data', async () => {
  const h = harness();
  const extras = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`other_${i}`, `extra ${i}`]));
  await h.submit({ ...CONTACT, ...QUESTIONS, customData: { ...extras, ...QUESTIONS, ...REVISED_QUESTIONS } });
  assert.equal(revisedFields(h).length, 5);
  assert.equal(questionFields(h).length, 0);
  const customBlock = h.calls.http[0].body.blocks.find((b) => b.fields?.some((f) => f.text.startsWith('*Readiness:')));
  assert.equal(customBlock.fields.length, 8);
  assert.deepEqual(customBlock.fields.slice(0, 5).map((f) => f.text), revisedFields(h));
  assert.doesNotMatch(JSON.stringify(h.calls.http[0].body), /Example Services|Build a healthcare services business/);
});

test('blank new answers do not restore old questions or stale nested notes', async () => {
  const h = harness();
  await h.submit({
    ...CONTACT, ...QUESTIONS, readiness: '', investment_budget: '', work_situation: '', notes: '',
    customData: { ...QUESTIONS, notes: 'Old contact notes must not be shown' },
  });
  assert.equal(questionFields(h).length, 0);
  assert.equal(revisedFields(h).length, 0);
  assert.doesNotMatch(JSON.stringify(h.calls.http[0].body), /Old contact notes/);
});

test('legacy form still renders its three answers when a standard contact state is present', async () => {
  const h = harness();
  await h.submit({ ...CONTACT, state: 'Ohio', customData: QUESTIONS });
  assert.equal(questionFields(h).length, 3);
  assert.equal(revisedFields(h).length, 0);
});

test('generic legacy notes preserve all three old answers and appear once as Additional Notes', async (t) => {
  for (const container of ['top-level', 'customData', 'custom_data']) await t.test(container, async () => {
    const h = harness();
    const answers = { ...QUESTIONS, notes: 'Please call after 5 p.m.' };
    const payload = container === 'top-level' ? answers : { [container]: answers };
    await h.submit({ ...CONTACT, state: 'Ohio', ...payload });
    assert.deepEqual(questionFields(h), [
      '*Current Business:*\nExample Services', '*Monthly Revenue:*\n$25,000',
      '*Healthcare Interest:*\nBuild a healthcare services business',
    ]);
    assert.deepEqual(revisedFields(h), ['*Additional Notes:*\nPlease call after 5 p.m.']);
    assert.equal(fields(h).filter((text) => text.includes('Please call after 5 p.m.')).length, 1);
    assert.equal(fields(h).filter((text) => text.startsWith('*Notes:')).length, 0);
  });
});

test('optional empty notes are omitted and a numeric budget preserves its exact value', async () => {
  const h = harness();
  await h.submit({ ...CONTACT, customData: { ...REVISED_QUESTIONS, investment_budget: 75000, notes: '' } });
  assert.equal(revisedFields(h).length, 4);
  assert.ok(revisedFields(h).includes('*Investment Budget:*\n75000'));
  assert.equal(revisedFields(h).some((text) => text.startsWith('*Additional Notes:')), false);
});

test('new notes are escaped and shortened without breaking the trusted Jackie mention', async () => {
  const h = harness();
  await h.submit({ ...CONTACT, customData: { ...REVISED_QUESTIONS, notes: '<!channel> & <@U123> '.repeat(250) } });
  const notes = revisedFields(h).find((text) => text.startsWith('*Additional Notes:'));
  assert.ok(notes.length <= 2000);
  assert.match(notes, /&lt;!channel&gt; &amp; &lt;@U123&gt;/);
  assert.doesNotMatch(notes, /<@|<!/);
  assert.match(notes, /…$/);
  assert.match(JSON.stringify(h.calls.http[0].body), /<@U0BJZSKHB36>/);
});

test('healthcare card mentions Jackie, includes contact actions and all three answers without envelope duplicates', async () => {
  const h = harness();
  const response = await h.submit({ ...CONTACT, customData: { ...CONTACT, ...QUESTIONS } });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, true);
  assert.equal(result.channelsAttempted, 1);
  assert.equal(result.channelsSent, 1);
  assert.equal(result.source, 'dd-healthcare');
  assert.equal(h.calls.queries[0].where.eventTypes.has, 'dd_application');
  assert.match(h.calls.http[0].body.text, /Healthcare Application — Example Applicant/);
  const card = JSON.stringify(h.calls.http[0].body);
  assert.match(card, /<@U0BJZSKHB36>/);
  assert.match(card, /<tel:\+12025550101\|/);
  assert.match(card, /location\/location-test\/contacts\/detail\/contact-test/);
  assert.deepEqual(questionFields(h), [
    '*Current Business:*\nExample Services', '*Monthly Revenue:*\n$25,000',
    '*Healthcare Interest:*\nBuild a healthcare services business',
  ]);
  assert.equal(fields(h).length, 7, 'four contact fields plus three questions');
  assert.equal(h.calls.logs[0].event, 'slack:dd_application');
  assert.equal(h.calls.logs[0].status, 'success');
});

test('contact and assignment fields fall back to each supported Custom Data container', async (t) => {
  for (const container of ['customData', 'custom_data']) await t.test(container, async () => {
    const h = harness();
    const response = await h.submit({ [container]: { ...CONTACT, assigned_to: '  JACKIE   POWERS ', ...QUESTIONS } });
    assert.equal(response.status, 200);
    assert.match(h.calls.http[0].body.text, /Example Applicant/);
    assert.match(JSON.stringify(h.calls.http[0].body), /<@U0BJZSKHB36>/);
    assert.match(JSON.stringify(h.calls.http[0].body), /contacts\/detail\/contact-test/);
    assert.equal(questionFields(h).length, 3);
    assert.equal(fields(h).length, 7);
  });
});

test('explicit top-level contact values win, while top-level healthcare answers are included', async () => {
  const h = harness();
  await h.submit({
    ...CONTACT, ...QUESTIONS,
    customData: { ...CONTACT, first_name: 'Wrong', email: 'wrong@example.invalid', assigned_to: 'Someone Else' },
  });
  const card = JSON.stringify(h.calls.http[0].body);
  assert.match(card, /Example Applicant/);
  assert.doesNotMatch(card, /Wrong|wrong@example|Someone Else/);
  assert.equal(questionFields(h).length, 3);
});

test('nested contact and standard assigned user fields are accepted without inventing missing answers', async () => {
  const h = harness();
  await h.submit({
    contact: { firstName: 'Nested', lastName: 'Applicant', email: CONTACT.email, phone: CONTACT.phone, id: CONTACT.contact_id },
    user: { firstName: 'Jackie', lastName: 'Powers' },
  });
  const card = JSON.stringify(h.calls.http[0].body);
  assert.match(card, /Nested Applicant/);
  assert.match(card, /<@U0BJZSKHB36>/);
  assert.equal(questionFields(h).length, 0);
});

test('absent assignment stays absent and an unknown closer is not changed to Jackie', async (t) => {
  for (const owner of [undefined, 'Another Closer']) await t.test(String(owner), async () => {
    const h = harness();
    await h.submit({ ...CONTACT, assigned_to: owner });
    const card = JSON.stringify(h.calls.http[0].body);
    assert.doesNotMatch(card, /U0BJZSKHB36/);
    if (owner) assert.match(card, /Another Closer/);
    else assert.doesNotMatch(card, /Assigned To/);
  });
});

test('all three known question fields remain first when additional custom fields exist', async () => {
  const h = harness();
  const extras = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`other_${i}`, `value ${i}`]));
  await h.submit({ ...CONTACT, customData: { ...extras, ...QUESTIONS, assigned_to: 'Jackie', email: CONTACT.email } });
  assert.equal(questionFields(h).length, 3);
  const customBlock = h.calls.http[0].body.blocks.find((b) => b.fields?.some((f) => f.text.startsWith('*Current Business:')));
  assert.equal(customBlock.fields.length, 8);
  assert.deepEqual(customBlock.fields.slice(0, 3).map((f) => f.text), questionFields(h));
});

test('long free-text answers fit Slack fields and cannot inject mentions or links', async () => {
  const h = harness();
  const hostile = '<@U123> <!channel> <https://example.invalid|click> & ';
  await h.submit({
    ...CONTACT, customData: {
      current_business: 'Business & Operations <@U123>', monthly_revenue: '$25,000',
      healthcare_interest: hostile.repeat(100),
      ['untrusted_<@U123>'.repeat(20)]: hostile.repeat(100),
    },
  });
  const customBlock = h.calls.http[0].body.blocks.find((b) => b.fields?.some((f) => f.text.startsWith('*Current Business:')));
  for (const field of customBlock.fields) {
    assert.ok(field.text.length <= 2000, 'rendered field includes its label within the Slack limit');
    assert.doesNotMatch(field.text, /<@|<!|<https:/);
  }
  const answers = customBlock.fields.map((f) => f.text).join('\n');
  assert.match(answers, /Business &amp; Operations &lt;@U123&gt;/);
  assert.match(answers, /&lt;!channel&gt;/);
  assert.match(answers, /…/);
  assert.match(JSON.stringify(h.calls.http[0].body), /<@U0BJZSKHB36>/, 'trusted Jackie mention remains active');
});

test('zero eligible channels is an explicit retryable healthcare failure', async () => {
  const h = harness({ channels: [] });
  const response = await h.submit(CONTACT);
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.equal(result.channelsAttempted, 0);
  assert.equal(result.channelsSent, 0);
  assert.match(result.error, /No active Slack channel/);
});

test('Slack rejection or network failure returns healthcare 503 and records failed delivery', async (t) => {
  for (const options of [
    { failUrls: ['https://slack.test/dd-channel'] },
    { throwUrls: ['https://slack.test/dd-channel'] },
  ]) await t.test(Object.keys(options)[0], async () => {
    const h = harness(options);
    const response = await h.submit(CONTACT);
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.equal(result.channelsSent, 0);
    assert.equal(result.failures.length, 1);
    assert.equal(h.calls.logs[0].status, 'failed');
  });
});

test('partial healthcare delivery returns 200 with ok false and explicit failures to avoid duplicate automatic retries', async () => {
  const h = harness({
    channels: [
      { id: 'one', name: 'Success', sources: [], webhookUrl: 'https://slack.test/one' },
      { id: 'two', name: 'Failure', sources: [], webhookUrl: 'https://slack.test/two' },
    ], failUrls: ['https://slack.test/two'],
  });
  const response = await h.submit(CONTACT);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.equal(result.channelsAttempted, 2);
  assert.equal(result.channelsSent, 1);
  assert.equal(result.failures[0].name, 'Failure');
  assert.equal(h.calls.logs.length, 2);
});

test('other event output and failure response semantics remain unchanged', async () => {
  const channel = { id: 'lead', name: 'Lead', sources: [], webhookUrl: 'https://slack.test/lead' };
  const h = harness({ channels: [channel], failUrls: [channel.webhookUrl] });
  const response = await h.submit({ ...CONTACT, customData: { assigned_to: 'Jackie', revenue: 'Existing field' } }, {
    type: 'lead', source: 'university',
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  const card = JSON.stringify(h.calls.http[0].body);
  assert.match(card, /New Lead — Example Applicant/);
  assert.doesNotMatch(card, /Healthcare Application|U0BJZSKHB36/);
  assert.match(card, /Existing field/);
  assert.match(card, /Assigned To:\*\\nJackie/);
});

test('authentication, malformed JSON and non-object bodies produce no notification side effects', async (t) => {
  const cases = [
    { name: 'wrong secret', body: CONTACT, request: { secret: 'wrong' }, status: 401 },
    { name: 'malformed JSON', body: null, request: { malformed: true }, status: 400 },
    ...[null, [], 'text', 42].map((body) => ({ name: JSON.stringify(body), body, status: 400 })),
  ];
  for (const item of cases) await t.test(item.name, async () => {
    const h = harness();
    const response = await h.submit(item.body, item.request);
    assert.equal(response.status, item.status);
    assert.equal(h.calls.queries.length, 0);
    assert.equal(h.calls.http.length, 0);
    assert.equal(h.calls.logs.length, 0);
  });
});
