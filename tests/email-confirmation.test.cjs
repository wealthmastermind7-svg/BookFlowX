const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

// Isolate the real handlers from startup imports so tests never touch Postmark,
// Stripe, the database, push notifications, or other live integrations.
const quietConsole = { log() {}, error() {} };
function evaluate(source, mocks = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sandbox = { exports: {}, console: quietConsole, Date, ...mocks };
  vm.runInNewContext(compiled, sandbox);
  return sandbox;
}
function findNode(file, predicate) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let found;
  function visit(node) {
    if (!found && predicate(node)) found = node;
    if (!found) ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, `Expected handler in ${file}`);
  return found.getText(source);
}
const bookingHandler = findNode("server/routes.ts", node =>
  ts.isCallExpression(node) && node.expression.getText() === "app.post"
  && node.arguments[0]?.text === "/api/businesses/:businessId/bookings");
const emailWorkflow = findNode("server/workflowEngine.ts", node =>
  ts.isFunctionDeclaration(node) && node.name?.text === "executeEmailAction");
function loadEmail(sendEmail) {
  return evaluate(fs.readFileSync("server/email.ts", "utf8"), {
    process: { env: { POSTMARK_SERVER_TOKEN: "isolated-test-placeholder" } },
    require(name) {
      assert.equal(name, "postmark");
      return { ServerClient: class { sendEmail = sendEmail; } };
    },
  }).exports;
}
const bookingData = {
  id: "abcdef12-3456-7890-abcd-123456789012",
  customerId: "customer-fixture", serviceId: "service-fixture",
  date: "2026-10-10", time: "10:00", totalPrice: 2500,
  addons: JSON.stringify([{ name: "Property report", price: 500 }]),
};
const customer = { name: "Sample Buyer", email: "buyer@fixture.invalid" };
const service = { name: "Private viewing" };
const business = { name: "Sample Agency", currency: "NZD", notificationsEnabled: false };
const emailData = {
  customerName: customer.name, customerEmail: customer.email, serviceName: service.name,
  date: bookingData.date, time: bookingData.time, price: 2500,
  confirmationNumber: "ABCDEF12", businessName: business.name, currency: "NZD",
};
async function runBooking(send, blocked = false) {
  const events = [];
  const booking = { ...bookingData };
  let handler;
  let response;
  let payload;
  const sandbox = evaluate(`${bookingHandler};`, {
    app: { post(_path, callback) { handler = callback; } },
    insertBookingSchema: { parse(data) { return data; } },
    storage: {
      async createBooking() { events.push("save"); return booking; },
      async getBusiness() { return business; },
      async getService() { return service; },
      async getCustomer() { return customer; },
      async updateBooking(_id, updates) {
        assert.ok(updates.confirmationSentAt instanceof Date);
        events.push("mark"); return { ...booking, ...updates };
      },
      async getWorkflowsByTrigger() { return [{}]; },
    },
    async sendBookingConfirmation(data) { events.push("email"); payload = data; return send(data); },
    isBlockedBookingRecipient() { return blocked; },
    async triggerWorkflows() { events.push("workflow"); },
    async initializeIndustryBlueprints() { throw new Error("Unexpected blueprint creation"); },
    z: { ZodError: class extends Error {} },
  });
  await handler({ body: bookingData, params: { businessId: "business-fixture" } }, {
    status(code) { response = code; return this; },
    json() { events.push("response"); },
  });
  return { events, response, payload, sandbox, booking };
}
function runWorkflow(send, sentAt, delay = 0) {
  let deliveries = 0;
  let marks = 0;
  const sandbox = evaluate(`${emailWorkflow}\n globalThis.handler = executeEmailAction;`, {
    storage: { async getBooking() { return { ...bookingData, confirmationSentAt: sentAt }; } },
    async sendBookingConfirmation() { deliveries++; return send; },
    isBlockedBookingRecipient() { return false; },
    db: { update() { return { set() { marks++; return { async where() {} }; } }; } },
    bookings: { id: "id" }, eq() {},
  });
  return sandbox.handler({}, { booking: { ...bookingData }, customer, service, business }, delay)
    .then(result => ({ result, deliveries, marks }));
}

test("booking sends immediately after save, marks only success, then runs workflows", async () => {
  const result = await runBooking(() => true);
  assert.equal(result.response, 201);
  assert.deepEqual(result.events, ["save", "email", "mark", "workflow", "response"]);
  assert.equal(result.payload.confirmationNumber, "ABCDEF12");
  assert.equal(result.payload.isReminder, false);
  assert.equal(result.payload.currency, "NZD");
  assert.equal(result.payload.addons[0].name, "Property report");
});
test("false or thrown delivery failure does not lose the booking or mark it sent", async () => {
  for (const send of [() => false, () => { throw new Error("Postmark unavailable"); }]) {
    const result = await runBooking(send);
    assert.equal(result.response, 201);
    assert.ok(!result.events.includes("mark"));
    assert.ok(result.events.includes("workflow"));
  }
});
test("blocked recipient is never marked as delivered", async () => {
  const result = await runBooking(() => true, true);
  assert.equal(result.response, 201);
  assert.ok(!result.events.includes("mark"));
});
test("workflow checks confirmation before sending; reminders still send", async () => {
  const duplicate = await runWorkflow(true, new Date());
  assert.equal(duplicate.deliveries, 0);
  assert.equal(duplicate.marks, 0);
  const reminder = await runWorkflow(true, new Date(), -120);
  assert.equal(reminder.deliveries, 1);
  assert.equal(reminder.marks, 1);
});
test("workflow fallback marks success but not failed delivery", async () => {
  const fallback = await runWorkflow(true);
  assert.equal(fallback.deliveries, 1);
  assert.equal(fallback.marks, 1);
  const failed = await runWorkflow(false);
  assert.equal(failed.result.success, false);
  assert.equal(failed.marks, 0);
});
test("Postmark payload uses the property subject, sender and cream template", async () => {
  let payload;
  const email = loadEmail(async data => { payload = data; });
  assert.equal(await email.sendBookingConfirmation(emailData), true);
  assert.equal(payload.Subject, "Property Viewing Confirmed — Sample Agency");
  assert.equal(payload.From, "Sample Agency via BookFlow <bookings@confirmbooking.online>");
  assert.equal(payload.MessageStream, "outbound");
  for (const value of ["#FAF7F2", "#FFFFFF", "#E8DDD0", "#FFF8F0", "#C17F3E",
    "#1C1410", "#6B5744", "#8B6F47", "Viewing Confirmed",
    "https://bookflowx.cerolauto.store", "📱 SMS", "📞 Call", "💬 Chat"]) {
    assert.ok(payload.HtmlBody.includes(value), value);
  }
  assert.ok(!payload.HtmlBody.includes("#000000"));
  assert.equal(await email.sendBookingConfirmation({ ...emailData, isReminder: true }), true);
  assert.equal(payload.Subject, "Reminder: Your viewing with Sample Agency is coming up");
  assert.ok(payload.HtmlBody.includes("Viewing Reminder"));
});
test("Postmark blocks the original test domains and preserves failure handling", async () => {
  let deliveries = 0;
  const email = loadEmail(async () => { deliveries++; throw new Error("Delivery rejected"); });
  for (const address of ["demo@internal.bookflow.app", "demo@EXAMPLE.COM", "demo@resend.dev"]) {
    assert.equal(await email.sendBookingConfirmation({ ...emailData, customerEmail: address }), true);
  }
  assert.equal(deliveries, 0);
  assert.equal(await email.sendBookingConfirmation(emailData), false);
  assert.equal(deliveries, 1);
});